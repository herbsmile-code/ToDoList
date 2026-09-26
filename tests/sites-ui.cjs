// Real entry pages and scripts, isolated browser storage, synthetic notes only.
// All remote requests are intercepted. Never opens a user profile or Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4181';
const key = 'todolist_jy_data_v39';
const snapshots = {};
const baselinePath = process.env.SITES_BASELINE_PATH;
const baseline = baselinePath && fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const site = {id:'site-fixture',title:'검증 <사이트>',url:'https://example.invalid/reference',folder:'sfolder-fixture',memo:'보존할 & 메모'};
const initialData = {tasks:[], notes:[], aiStudyNotes:[], photos:[],
  siteFolders:[{id:'all',name:'전체보기',icon:'🌐'},{id:'portal',name:'포털',icon:'🔍'},
    {id:'finance',name:'금융',icon:'🏦'},{id:'work',name:'업무',icon:'💼'},
    {id:'sfolder-fixture',name:'검증 폴더',icon:'⭐'}],
  sites:[site,{id:'site-work',title:'업무 사이트',url:'https://example.invalid/work',folder:'work',memo:''}],
  wishlist:[], vacations:[], healthNotes:[], hobbyNotes:[], projects:[], subscriptions:[],
  ledgerFiles:[], deletedItemIds:[], updatedAt:100, syncRevision:1};

async function openApp(browser, entry, width, localFile = false, sharedServer = null) {
  const context = await browser.newContext({viewport:{width,height:900}, serviceWorkers:'block',
    isMobile:width < 600, hasTouch:width < 600, timezoneId:'Asia/Seoul'});
  const errors = [], loaded = [];
  const server = sharedServer || {requests:0, puts:0, body:null, version:1, failGET:true};
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.protocol === 'file:') {
      assert.ok(fileURLToPath(url).startsWith(root + path.sep));
      return route.continue();
    }
    if (url.origin === 'https://sync.example.invalid' && url.pathname.startsWith('/spaces/')) {
      server.requests++;
      if (request.method() === 'GET' && server.failGET) {
        return route.fulfill({status:503, contentType:'application/json', body:'null'});
      }
      if (request.method() === 'PUT') {
        assert.equal(request.headers()['if-match'], '"' + server.version + '"');
        server.body = request.postDataJSON(); server.version++; server.puts++;
      } else assert.equal(request.method(), 'GET');
      return route.fulfill({status:200, contentType:'application/json',
        headers:{ETag:'"' + server.version + '"', 'Access-Control-Expose-Headers':'ETag'},
        body:JSON.stringify(server.body)});
    }
    if (url.origin === origin) {
      const filename = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      assert.ok(filename.startsWith(root + path.sep));
      const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css'};
      return route.fulfill({body:fs.readFileSync(filename),
        contentType:types[path.extname(filename)] || 'application/octet-stream'});
    }
    if (['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname)) {
      return route.fulfill({status:200, contentType:url.hostname === 'fonts.googleapis.com'
        ? 'text/css' : 'application/javascript', body:''});
    }
    if (url.origin === 'https://example.invalid') return route.fulfill({status:200,contentType:'text/html',body:'<p>Synthetic destination</p>'});
    errors.push('Unexpected request: ' + url.origin + url.pathname);
    return route.abort();
  });
  await context.addInitScript(({key, initialData}) => {
    // Preserve writes across reload; only seed this isolated origin once.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(initialData));
    localStorage.setItem('todolist_jy_active_rtdb_url', 'https://sync.example.invalid');
    for (const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1']) {
      localStorage.setItem('todolist_jy_' + name, 'true');
    }
    const setItem = Storage.prototype.setItem;
    window.fixtureState = {writes:0, failSave:false, copied:[], failClipboard:false};
    Storage.prototype.setItem = function(name, value) {
      if (name === key) {
        fixtureState.writes++;
        if (fixtureState.failSave) throw new DOMException('Fixture quota exceeded', 'QuotaExceededError');
      }
      return setItem.call(this, name, value);
    };
    Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async text => {
      if (fixtureState.failClipboard) throw Error('Fixture clipboard denied');
      fixtureState.copied.push(text);
    }}});
  }, {key, initialData});
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.on('request', request => {
    const url = new URL(request.url());
    const relative = url.protocol === 'file:'
      ? path.relative(root, fileURLToPath(url)).replace(/\\/g,'/')
      : url.origin === origin ? url.pathname.replace(/^\/+/, '') : '';
    if (relative.startsWith('js/') && relative.endsWith('.js')) loaded.push(relative);
  });
  await page.clock.setFixedTime(new Date('2026-09-19T03:00:00Z'));
  await page.goto(localFile ? pathToFileURL(path.join(root, entry)).href : origin + '/' + entry);
  await ready(page);
  const expected = [...fs.readFileSync(path.join(root, entry),'utf8')
    .matchAll(/<script\b[^>]*src="(js\/[^"?]+)[^"]*"/g)].map(match => match[1]);
  assert.deepEqual(loaded, expected, 'Actual HTML script order');
  return {context, page, errors, server};
}

async function ready(page) {
  await page.waitForFunction(() => window.store?.writerLockHeld && window.UI && !document.body.inert);
  await page.evaluate(() => {
    // Bypass authentication only; UI, local writes and the sync engine remain real.
    cloudSync.spaceId = 'fixture-user'; cloudSync.pin = 'fixture-pin';
    return UI.renderSidebar();
  });
}

async function navigate(page, width) {
  if (width < 600) {
    const group = await page.evaluate(() => Object.entries(UI.getQuickMenuGroups())
      .find(([,value]) => value.items.some(item => item.id === 'sites'))[0]);
    await page.locator('.mobile-nav-btn[data-group="' + group + '"]').click();
    await page.locator('.quick-popover-item[data-filter="sites"]').click();
  } else await page.locator('.nav-item[data-filter="sites"]').first().click();
  await page.evaluate(() => UI.renderSidebar());
  assert.equal(await page.locator('#sites-view-container').isVisible(), true);
}

async function capture(page, name, selector) {
  snapshots[name] = await page.locator(selector).evaluate(el => ({html:el.outerHTML,
    width:Math.round(el.getBoundingClientRect().width), height:Math.round(el.getBoundingClientRect().height)}));
  if (baseline) assert.deepEqual(snapshots[name], baseline[name], name + ': changed from pre-refactor UI');
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const card = page => page.locator('.site-card[data-site-id="site-fixture"]');
const folder = (page,id) => page.locator('.site-folder-tab[data-id="' + id + '"]');
const focused = (page,id) => page.waitForFunction(id => document.activeElement.id === id, id);

async function openFolder(page,id) {
  await folder(page,id).locator('.site-folder-edit-btn').click();
  await focused(page,'site-folder-input-name');
}
async function checkViews(app,entry,width) {
  const {page,server}=app;
  const before=await page.evaluate(key=>({raw:localStorage.getItem(key),writes:fixtureState.writes}),key);
  await navigate(page,width);
  assert.equal(await page.locator('.site-card').count(),2);
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    const prefix=entry+'-'+width+'-'+theme;
    await capture(page,prefix+'-list','#sites-view-container');
    await folder(page,'sfolder-fixture').click();
    assert.equal(await page.locator('.site-card').count(),1);
    assert.equal(await page.locator('#site-count-badge').textContent(),'총 1건');
    assert.equal(await card(page).locator('.site-title-text').textContent(),site.title);
    await card(page).locator('[data-action="edit-site"]').click();
    await focused(page,'site-input-title');
    for(const [field,value] of Object.entries({title:site.title,url:site.url,folder:site.folder,memo:site.memo})) {
      assert.equal(await page.locator('#site-input-'+field).inputValue(),value);
    }
    await capture(page,prefix+'-edit','#site-modal');
    await page.locator('#btn-cancel-site-modal').click();
    await page.locator('#btn-open-add-site-modal').click();
    await focused(page,'site-input-title');
    assert.equal(await page.locator('#site-input-folder').inputValue(),'sfolder-fixture');
    assert.equal(await page.locator('#site-input-title').inputValue(),'');
    await capture(page,prefix+'-new','#site-modal');
    await page.locator('#btn-close-site-modal').click();
    await openFolder(page,'sfolder-fixture');
    assert.equal(await page.locator('#site-folder-input-name').inputValue(),'검증 폴더');
    await capture(page,prefix+'-folder','#site-folder-modal');
    await page.locator('#btn-close-site-folder-modal').click();
    await folder(page,'finance').click();
    assert.equal(await page.locator('#sites-empty-state').isVisible(),true);
    await capture(page,prefix+'-empty','#sites-view-container');
    await folder(page,'all').click();
  }
  // Inline click and delegated click must not both open/reset the modal.
  await page.evaluate(()=>{
    fixtureState.folderOpens=0;const original=UI.openSiteFolderModal;
    UI.openSiteFolderModal=function(...args){fixtureState.folderOpens++;return original.apply(this,args);};
  });
  for(let i=0;i<3;i++) {
    await openFolder(page,'sfolder-fixture');
    await page.locator('#site-folder-emoji-picker [data-emoji="🚀"]').click();
    assert.equal(await page.locator('#site-folder-selected-icon').inputValue(),'🚀');
    assert.equal(await page.locator('#site-folder-emoji-picker .selected').count(),1);
    assert.equal(await page.evaluate(()=>store.activeSiteFolder),'all');
    await page.locator('#btn-cancel-site-folder-modal').click();
  }
  assert.equal(await page.evaluate(()=>fixtureState.folderOpens),3);
  await openFolder(page,'portal');
  assert.equal(await page.locator('#btn-delete-site-folder').isDisabled(),true);
  await page.locator('#btn-close-site-folder-modal').click();
  await openFolder(page,'sfolder-fixture');
  assert.equal(await page.locator('#btn-delete-site-folder').isDisabled(),false);
  await page.locator('#btn-close-site-folder-modal').click();
  const link=card(page).locator('.site-url-link');
  assert.equal(await link.getAttribute('target'),'_blank');
  assert.match(await link.getAttribute('rel'),/noopener/);
  const popupPromise=page.context().waitForEvent('page');
  await link.click();const popup=await popupPromise;
  await popup.waitForURL(site.url);assert.equal(await popup.locator('p').textContent(),'Synthetic destination');
  await popup.close();
  await card(page).locator('[data-action="copy-site-url"]').click();
  assert.deepEqual(await page.evaluate(()=>fixtureState.copied),[site.url]);
  await page.evaluate(()=>fixtureState.failClipboard=true);
  await card(page).locator('[data-action="copy-site-url"]').click();
  await page.waitForFunction(()=>document.getElementById('toast-container').textContent.includes('주소 복사에 실패'));
  assert.deepEqual(await page.evaluate(key=>({raw:localStorage.getItem(key),writes:fixtureState.writes}),key),before);
  assert.equal(server.requests,0);
}

async function checkFailure(app) {
  const {page}=app;
  // All form variants exercise the actual event handlers and local commit.
  for(const type of ['site-new','site-edit','folder-new','folder-edit']) {
    const isFolder=type.startsWith('folder'),edit=type.endsWith('edit');
    if(isFolder) {
      if(edit)await openFolder(page,'sfolder-fixture');
      else {await page.locator('#btn-open-add-site-folder').click();await focused(page,'site-folder-input-name');}
      await page.locator('#site-folder-input-name').fill('실패해도 보존할 폴더');
    } else {
      if(edit)await card(page).locator('[data-action="edit-site"]').click();
      else await page.locator('#btn-open-add-site-modal').click();
      await focused(page,'site-input-title');
      await page.locator('#site-input-title').fill('실패해도 보존할 제목');
      await page.locator('#site-input-url').fill('https://example.invalid/draft');
      await page.locator('#site-input-memo').fill('입력 원문');
    }
    const before=await saved(page);
    await page.evaluate(()=>{fixtureState.failSave=true;document.getElementById('toast-container').innerHTML='';});
    await page.locator(isFolder?'#site-folder-form button[type="submit"]':'#site-form button[type="submit"]').click();
    assert.equal(await page.locator(isFolder?'#site-folder-modal':'#site-modal').isVisible(),true);
    assert.equal(await page.locator(isFolder?'#site-folder-input-name':'#site-input-title').inputValue(),
      isFolder?'실패해도 보존할 폴더':'실패해도 보존할 제목');
    assert.equal(await page.locator('.toast-success, .toast-info').count(),0);
    assert.deepEqual(await saved(page),before);
    await page.evaluate(()=>fixtureState.failSave=false);
    await page.locator(isFolder?'#btn-cancel-site-folder-modal':'#btn-cancel-site-modal').click();
  }
  for(const isFolder of [false,true]) {
    if(isFolder)await openFolder(page,'sfolder-fixture');
    const before=await saved(page);
    await page.evaluate(()=>{fixtureState.failSave=true;document.getElementById('toast-container').innerHTML='';});
    if(isFolder)await page.locator('#btn-delete-site-folder').click();
    else await card(page).locator('[data-action="delete-site"]').click();
    assert.deepEqual(await saved(page),before);
    assert.equal(await card(page).count(),1);
    assert.equal(await page.locator('#toast-container .toast').count(),0);
    if(isFolder)assert.equal(await page.locator('#site-folder-modal').isVisible(),true);
    await page.evaluate(()=>fixtureState.failSave=false);
    if(isFolder)await page.locator('#btn-cancel-site-folder-modal').click();
  }
}

async function checkEdits(app,width) {
  const {page}=app;
  await page.locator('#btn-open-add-site-folder').click();await focused(page,'site-folder-input-name');
  await page.locator('#site-folder-input-name').fill('새 폴더');
  await page.locator('#site-folder-emoji-picker [data-emoji="🚀"]').click();
  await page.locator('#site-folder-form button[type="submit"]').click();
  let data=await saved(page);
  assert.equal(data.siteFolders.filter(f=>f.name==='새 폴더').length,1);
  const created=data.siteFolders.find(f=>f.name==='새 폴더');assert.equal(created.icon,'🚀');
  await folder(page,created.id).click();
  await page.locator('#btn-open-add-site-modal').click();await focused(page,'site-input-title');
  await page.locator('#site-input-title').fill('새 사이트');
  await page.locator('#site-input-url').fill('https://example.invalid/new');
  await page.locator('#site-input-memo').fill('새 메모');
  await page.locator('#site-form button[type="submit"]').click();
  data=await saved(page);assert.equal(data.sites.filter(s=>s.title==='새 사이트').length,1);
  const added=data.sites.find(s=>s.title==='새 사이트');assert.equal(added.folder,created.id);
  await page.locator('.site-card [data-action="edit-site"]').click();await focused(page,'site-input-title');
  await page.locator('#site-input-memo').fill('수정된 메모');
  await page.locator('#site-form button[type="submit"]').click();
  await openFolder(page,created.id);await page.locator('#site-folder-input-name').fill('수정 폴더');
  await page.locator('#site-folder-form button[type="submit"]').click();
  const pending=(await saved(page)).localSync.pending;assert.ok(pending.length);
  await page.reload();await ready(page);await navigate(page,width);
  data=await saved(page);assert.deepEqual(data.localSync.pending,pending);
  assert.equal(data.sites.find(s=>s.id===added.id).memo,'수정된 메모');
  await folder(page,created.id).click();await openFolder(page,created.id);
  await page.locator('#btn-delete-site-folder').click();
  data=await saved(page);assert.equal(data.siteFolders.some(f=>f.id===created.id),false);
  assert.equal(data.sites.find(s=>s.id===added.id).folder,'portal');
  assert.equal(await page.evaluate(()=>store.activeSiteFolder),'all');
  await page.locator('.site-card[data-site-id="'+added.id+'"] [data-action="delete-site"]').click();
  data=await saved(page);assert.equal(data.sites.some(s=>s.id===added.id),false);assert.ok(data.deletedItemIds.includes(added.id));
  await page.reload();await ready(page);await navigate(page,width);
  assert.equal(await folder(page,created.id).count(),0);
  assert.equal((await saved(page)).sites.some(s=>s.id===added.id),false);
}

async function checkSync(browser,entry) {
  const server={requests:0,puts:0,body:null,version:1,failGET:false};
  const a=await openApp(browser,entry,1280,false,server),b=await openApp(browser,entry,390,false,server);
  const sync=async page=>assert.equal(await page.evaluate(()=>cloudSync.requestManualSync()),true);
  try {
    await sync(a.page);await sync(b.page);await navigate(a.page,1280);await navigate(b.page,390);
    await a.page.evaluate(()=>store.updateSite('site-fixture',{memo:'수신된 원문'}));
    await sync(a.page);await sync(b.page);
    await card(b.page).locator('[data-action="edit-site"]').click();await focused(b.page,'site-input-title');
    assert.equal(await b.page.locator('#site-input-memo').inputValue(),'수신된 원문');
    await b.page.locator('#site-input-memo').fill('모바일 수정');
    await b.page.locator('#site-form button[type="submit"]').click();
    await sync(b.page);await sync(a.page);
    assert.match(await card(a.page).locator('.site-memo-box').textContent(),/모바일 수정/);
    await folder(b.page,'sfolder-fixture').click();
    await openFolder(a.page,'sfolder-fixture');await a.page.locator('#btn-delete-site-folder').click();
    await sync(a.page);await sync(b.page);
    assert.equal(await folder(b.page,'sfolder-fixture').count(),0);
    assert.equal(await b.page.evaluate(()=>store.activeSiteFolder),'all');
    assert.equal(await card(b.page).isVisible(),true);
    assert.equal((await saved(b.page)).sites.find(s=>s.id==='site-fixture').folder,'portal');
    assert.deepEqual((await saved(a.page)).sites,(await saved(b.page)).sites);
    assert.ok(server.body.isEncrypted);assert.ok(server.puts>0);
    assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
  } finally {await a.context.close();await b.context.close();}
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      for(const width of [1280,390]) {
        const app=await openApp(browser,entry,width);
        try {
          await checkViews(app,entry,width);await checkFailure(app);await checkEdits(app,width);
          assert.deepEqual(app.errors,[]);
        } finally {await app.context.close();}
      }
      const app=await openApp(browser,entry,390,true);
      try {
        await navigate(app.page,390);await card(app.page).locator('[data-action="edit-site"]').click();
        await focused(app.page,'site-input-title');assert.equal(await app.page.locator('#site-input-title').inputValue(),site.title);
        await app.page.locator('#btn-close-site-modal').click();await openFolder(app.page,'sfolder-fixture');
        assert.equal(await app.page.locator('#site-folder-modal').isVisible(),true);
        await app.page.locator('#btn-close-site-folder-modal').click();assert.deepEqual(app.errors,[]);
      } finally {await app.context.close();}
      await checkSync(browser,entry);
    }
    if(baselinePath&&!baseline){fs.mkdirSync(path.dirname(baselinePath),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify(snapshots,null,2));}
    console.log('PASS: both HTML entries; PC/mobile/file; list/modals/emoji/copy/link; no display writes; save-failure drafts; CRUD/reload; two-device site/folder sync'+(baseline?'; pre-extraction DOM/layout unchanged':''));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
