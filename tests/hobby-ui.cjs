// Real entry pages and scripts, isolated browser storage, synthetic notes only.
// All remote requests are intercepted. Never opens a user profile or Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4183';
const key = 'todolist_jy_data_v39';
const snapshots = {};
const baselinePath = process.env.HOBBY_BASELINE_PATH;
const baseline = baselinePath && fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const initialData={tasks:[],notes:[{id:'unrelated',content:'Keep original'}],aiStudyNotes:[],photos:[],sites:[],wishlist:[],healthNotes:[],projects:[],subscriptions:[],ledgerFiles:[],vacations:[],
  hobbyFolders:[{id:'all',name:'전체보기',icon:'🎨'},{id:'workout',name:'운동',icon:'🏃'},
    {id:'general',name:'기타취미',icon:'✨'},{id:'hfolder-test',name:'개인 <폴더>',icon:'📁'}],
  hobbyNotes:[{id:'hnb-one',folder:'hfolder-test',title:'Original <title>',date:'2026-09-01',place:'Park',duration:'30 minutes',content:'Original <content>',createdAt:1},
    {id:'hnb-two',folder:'workout',title:'Exercise',date:'2026-09-02',place:'Gym',duration:'1 hour',content:'Exercise content',createdAt:2}],
  deletedItemIds:[],updatedAt:100,syncRevision:1};
const viewsOnly=process.env.HOBBY_VIEWS_ONLY==='1';

async function openApp(browser, entry, width, localFile = false, sharedServer = null, seed = initialData) {
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
  }, {key, initialData:seed});
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
      .find(([,value]) => value.items.some(item => item.id === 'hobby'))[0]);
    await page.locator('.mobile-nav-btn[data-group="' + group + '"]').click();
    await page.locator('.quick-popover-item[data-filter="hobby"]').click();
  } else await page.locator('.nav-item[data-filter="hobby"]').first().click();
  await page.evaluate(() => UI.renderSidebar());
  assert.equal(await page.locator('#hobby-view-container').isVisible(), true);
}

async function capture(page, name, selector) {
  snapshots[name] = await page.locator(selector).evaluate(el => ({html:el.outerHTML,
    width:Math.round(el.getBoundingClientRect().width), height:Math.round(el.getBoundingClientRect().height)}));
  if (baseline) assert.deepEqual(snapshots[name], baseline[name], name + ': changed from pre-refactor UI');
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const card=(page,id='hnb-one')=>page.locator('.hobby-note-card[data-hobby-note-id="'+id+'"]');
const folder=(page,id)=>page.locator('.hobby-folder-tab[data-hobby-folder-id="'+id+'"]');
const focused=page=>page.waitForFunction(()=>document.activeElement.id==='hobby-input-title');
const closeNote=page=>page.locator('#hobby-note-modal [data-close-hobby-modal]').first().click();
const closeFolder=page=>page.locator('#hobby-folder-modal [data-close-hobby-folder-modal]').first().click();
const editFolder=(page,id='hfolder-test')=>folder(page,id).locator('[data-action="open-edit-hobby-folder"]').click();
const submitNote=page=>page.locator('#hobby-note-form button[type="submit"]').click();
const submitFolder=page=>page.locator('#hobby-folder-form button[type="submit"]').click();
const viewState=page=>page.evaluate(key=>({raw:localStorage.getItem(key),writes:fixtureState.writes,
  notes:JSON.stringify(store.hobbyNotes),folders:JSON.stringify(store.hobbyFolders)}),key);
async function checkViews(app,entry,width) {
  const {page,server}=app,before=await viewState(page);await navigate(page,width);
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const prefix=entry+'-'+width+'-'+theme;
    await capture(page,prefix+'-list','#hobby-view-container');
    await card(page).locator('[data-action="edit-hobby-note"]').click();await focused(page);
    assert.equal(await page.locator('#hobby-input-content').inputValue(),'Original <content>');
    await capture(page,prefix+'-edit','#hobby-note-modal');await closeNote(page);
    await page.locator('#btn-open-add-hobby-note').click();await focused(page);
    assert.equal(await page.locator('#hobby-input-folder').inputValue(),'workout');
    await capture(page,prefix+'-new','#hobby-note-modal');await closeNote(page);
    await editFolder(page);await capture(page,prefix+'-folder-edit','#hobby-folder-modal');
    assert.equal(await page.locator('#btn-delete-hobby-folder').isVisible(),true);await closeFolder(page);
    await editFolder(page,'general');assert.equal(await page.locator('#btn-delete-hobby-folder').isVisible(),false);await closeFolder(page);
    await page.locator('#btn-open-add-hobby-folder').click();await capture(page,prefix+'-folder-new','#hobby-folder-modal');await closeFolder(page);
    await folder(page,'general').click();assert.equal(await page.locator('#hobby-empty-state').isVisible(),true);
    await capture(page,prefix+'-empty','#hobby-view-container');await folder(page,'all').click();
    await card(page).locator('.hobby-item-checkbox').check();await capture(page,prefix+'-selected','#hobby-view-container');
    await card(page).locator('.hobby-item-checkbox').uncheck();
  }
  await page.evaluate(()=>{fixtureState.opens=0;const original=UI.openHobbyNoteModal;UI.openHobbyNoteModal=function(...args){fixtureState.opens++;return original.apply(this,args);};});
  for(let i=0;i<3;i++){await card(page).locator('[data-action="edit-hobby-note"]').click();await focused(page);await closeNote(page);}
  assert.equal(await page.evaluate(()=>fixtureState.opens),3);assert.deepEqual(await viewState(page),before);assert.equal(server.requests,0);
}
async function checkFailures(app) {
  const {page}=app;
  await page.evaluate(()=>{fixtureState.toasts=[];const original=UI.showToast;UI.showToast=function(...args){fixtureState.toasts.push(args[0]);return original.apply(this,args);};});
  for(const mode of ['new','edit','folder-new','folder-edit','folder-delete','delete','batch-move','batch-delete','quick-move']) {
    if(mode==='new'){await page.locator('#btn-open-add-hobby-note').click();await focused(page);}
    if(mode==='edit'){await card(page).locator('[data-action="edit-hobby-note"]').click();await focused(page);}
    if(mode==='folder-new')await page.locator('#btn-open-add-hobby-folder').click();
    if(['folder-edit','folder-delete'].includes(mode))await editFolder(page);
    if(['new','edit'].includes(mode))await page.locator('#hobby-input-title').fill('Unsaved draft');
    if(['folder-new','folder-edit'].includes(mode))await page.locator('#hobby-input-folder-name').fill('Unsaved folder');
    if(mode.startsWith('batch'))await card(page).locator('.hobby-item-checkbox').check();
    if(mode==='batch-move')await page.locator('#hobby-batch-target-folder').selectOption('general');
    const before=await viewState(page),selected=await page.evaluate(()=>[...store.selectedHobbyNotes]);
    await page.evaluate(()=>{fixtureState.failSave=true;fixtureState.toasts=[];});
    if(['new','edit'].includes(mode)){await submitNote(page);assert.equal(await page.locator('#hobby-note-modal').isVisible(),true);assert.equal(await page.locator('#hobby-input-title').inputValue(),'Unsaved draft');}
    else if(['folder-new','folder-edit'].includes(mode)){await submitFolder(page);assert.equal(await page.locator('#hobby-folder-modal').isVisible(),true);assert.equal(await page.locator('#hobby-input-folder-name').inputValue(),'Unsaved folder');}
    else if(mode==='folder-delete'){await page.locator('#btn-delete-hobby-folder').click();assert.equal(await page.locator('#hobby-folder-modal').isVisible(),true);}
    else if(mode==='delete')await card(page).locator('[data-action="delete-hobby-note"]').click();
    else if(mode.startsWith('batch'))await page.locator('[data-action="'+mode+'-hobby-notes"]').click();
    else {await page.evaluate(()=>window.prompt=()=> '3');await card(page).locator('[data-action="quick-move-hobby-note"]').click();}
    const after=await viewState(page);assert.equal(after.raw,before.raw,mode);assert.equal(after.notes,before.notes,mode);assert.equal(after.folders,before.folders,mode);
    assert.deepEqual(await page.evaluate(()=>[...store.selectedHobbyNotes]),selected,mode);
    assert.equal(await page.evaluate(()=>fixtureState.toasts.some(t=>/등록되었|수정되었|추가되었|이동되었|삭제되었/.test(t))),false,mode);
    await page.evaluate(()=>fixtureState.failSave=false);
    if(['new','edit'].includes(mode))await closeNote(page);if(mode.startsWith('folder'))await closeFolder(page);
    if(mode.startsWith('batch'))await card(page).locator('.hobby-item-checkbox').uncheck();
  }
}
async function checkEdits(app,width) {
  const {page}=app,original=(await saved(page)).notes;
  await page.locator('#btn-open-add-hobby-folder').click();await page.locator('#hobby-input-folder-name').fill('Created folder');
  await page.locator('[data-hobby-emoji="📷"]').click();await submitFolder(page);
  const newFolder=(await saved(page)).hobbyFolders.find(f=>f.name==='Created folder');assert.equal(newFolder.icon,'📷');
  await folder(page,newFolder.id).click();await page.locator('#btn-open-add-hobby-note').click();await focused(page);
  await page.locator('#hobby-input-title').fill('Created note');await page.locator('#hobby-input-content').fill('Created content');await submitNote(page);
  const created=(await saved(page)).hobbyNotes.find(n=>n.title==='Created note');assert.equal(created.folder,newFolder.id);
  await card(page,created.id).locator('[data-action="edit-hobby-note"]').click();await focused(page);
  await page.locator('#hobby-input-content').fill('Edited content');await submitNote(page);
  await card(page,created.id).locator('[data-action="copy-hobby-note"]').click();
  assert.ok((await page.evaluate(()=>fixtureState.copied)).some(t=>t.includes('Edited content')));
  await editFolder(page,newFolder.id);await page.locator('#hobby-input-folder-name').fill('Renamed folder');await submitFolder(page);
  await editFolder(page,newFolder.id);await page.locator('#btn-delete-hobby-folder').click();
  assert.equal((await saved(page)).hobbyNotes.find(n=>n.id===created.id).folder,'general');
  assert.ok((await saved(page)).deletedItemIds.includes('hobby-folder:'+newFolder.id));
  // Selections from a different tab must not be acted on invisibly.
  await folder(page,'all').click();await card(page,'hnb-two').locator('.hobby-item-checkbox').check();
  await folder(page,'hfolder-test').click();assert.deepEqual(await page.evaluate(()=>[...store.selectedHobbyNotes]),[]);
  await page.evaluate(()=>{store.selectedHobbyNotes.add('hnb-two');UI.renderHobby();});
  await card(page).locator('.hobby-item-checkbox').check();
  await page.locator('#hobby-batch-target-folder').selectOption('general');await page.locator('[data-action="batch-move-hobby-notes"]').click();
  assert.equal((await saved(page)).hobbyNotes.find(n=>n.id==='hnb-two').folder,'workout');
  assert.equal((await saved(page)).hobbyNotes.find(n=>n.id==='hnb-one').folder,'general');
  await folder(page,'all').click();await card(page,'hnb-two').locator('.hobby-item-checkbox').check();
  await folder(page,'general').click();assert.deepEqual(await page.evaluate(()=>[...store.selectedHobbyNotes]),[]);
  await page.evaluate(()=>{store.selectedHobbyNotes.add('hnb-two');UI.renderHobby();});
  await page.locator('#hobby-check-all').check();await page.locator('[data-action="batch-delete-hobby-notes"]').click();
  assert.deepEqual((await saved(page)).hobbyNotes.map(n=>n.id),['hnb-two']);
  await folder(page,'workout').click();await page.evaluate(()=>window.prompt=()=> '2');await card(page,'hnb-two').locator('[data-action="quick-move-hobby-note"]').click();
  assert.equal((await saved(page)).hobbyNotes[0].folder,'general');
  await page.reload();await ready(page);await navigate(page,width);assert.equal(await card(page,'hnb-two').count(),1);
  await card(page,'hnb-two').locator('[data-action="delete-hobby-note"]').click();assert.equal((await saved(page)).hobbyNotes.length,0);
  assert.deepEqual((await saved(page)).notes,original);
}
async function checkLegacy(browser,entry) {
  const seed={...initialData,hobbyFolders:[],hobbyNotes:[initialData.hobbyNotes[0]]};
  const app=await openApp(browser,entry,390,false,null,seed);const {page}=app;
  try {
    const before=await viewState(page);await navigate(page,390);assert.equal(await card(page).count(),1);
    await page.evaluate(()=>{store.activeHobbyFolder='removed-remotely';UI.renderHobby();});assert.equal(await card(page).count(),1);
    await card(page).locator('[data-action="edit-hobby-note"]').click();await focused(page);
    assert.equal(await page.locator('#hobby-input-folder').inputValue(),'hfolder-test');await closeNote(page);
    assert.deepEqual(await viewState(page),before);
    await page.locator('#btn-open-add-hobby-note').click();await focused(page);await page.locator('#hobby-input-title').fill('No destination');await submitNote(page);
    assert.equal(await page.locator('#hobby-note-modal').isVisible(),true);assert.deepEqual(await viewState(page),before);await closeNote(page);
    assert.deepEqual(app.errors,[]);
  } finally {await app.context.close();}
}
async function checkSync(browser,entry) {
  const server={requests:0,puts:0,body:null,version:1,failGET:false};
  const a=await openApp(browser,entry,1280,false,server),b=await openApp(browser,entry,390,false,server);
  const sync=async page=>assert.equal(await page.evaluate(()=>cloudSync.requestManualSync()),true);
  try {
    await sync(a.page);await sync(b.page);await navigate(a.page,1280);await navigate(b.page,390);
    await card(a.page).locator('[data-action="edit-hobby-note"]').click();await focused(a.page);
    await a.page.locator('#hobby-input-content').fill('Remote original');await submitNote(a.page);await sync(a.page);await sync(b.page);
    assert.match(await card(b.page).textContent(),/Remote original/);
    await editFolder(b.page);await b.page.locator('#btn-delete-hobby-folder').click();await sync(b.page);await sync(a.page);
    assert.equal(await folder(a.page,'hfolder-test').count(),0);assert.match(await card(a.page).textContent(),/기타취미/);
    await card(a.page).locator('[data-action="delete-hobby-note"]').click();await sync(a.page);await sync(b.page);assert.equal(await card(b.page).count(),0);
    assert.deepEqual((await saved(a.page)).hobbyNotes,(await saved(b.page)).hobbyNotes);assert.ok(server.body.isEncrypted);
    assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
  } finally {await a.context.close();await b.context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      for(const width of [1280,390]) {
        const app=await openApp(browser,entry,width);
        try{await checkViews(app,entry,width);if(!viewsOnly){await checkFailures(app);await checkEdits(app,width);}assert.deepEqual(app.errors,[]);}
        finally{await app.context.close();}
      }
      const app=await openApp(browser,entry,390,true);
      try{await navigate(app.page,390);await card(app.page).locator('[data-action="edit-hobby-note"]').click();await focused(app.page);
        assert.equal(await app.page.locator('#hobby-input-content').inputValue(),'Original <content>');await closeNote(app.page);assert.deepEqual(app.errors,[]);
      }finally{await app.context.close();}
      if(!viewsOnly){await checkLegacy(browser,entry);await checkSync(browser,entry);}
    }
    if(baselinePath&&!baseline){fs.mkdirSync(path.dirname(baselinePath),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify(snapshots,null,2));}
    console.log('PASS: hobby '+(viewsOnly?'view characterization':'views, failed-save drafts/selection, CRUD/restart, scoped batch actions, legacy folders, encrypted two-device sync')+
      '; both HTML entries, PC/mobile, light/dark, file://; '+Object.keys(snapshots).length+' snapshots'+(baseline?'; baseline unchanged':''));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
