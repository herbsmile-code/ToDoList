// Real entry pages and scripts, isolated browser storage, synthetic notes only.
// All remote requests are intercepted. Never opens a user profile or Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4182';
const key = 'todolist_jy_data_v39';
const snapshots = {};
const baselinePath = process.env.VACATION_BASELINE_PATH;
const baseline = baselinePath && fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const initialData = {tasks:[{id:'task-vac',title:'Separate task',type:'vacation',dueDate:'2026-09-01'}],
  notes:[{id:'note-original',content:'Unrelated original'}], aiStudyNotes:[], photos:[], sites:[],
  wishlist:[], healthNotes:[], hobbyNotes:[], projects:[], subscriptions:[], ledgerFiles:[],
  vacations:[{id:'vac-full',type:'full',amount:1,date:'2026-09-01',reason:'Original <reason>',createdAt:1},
    {id:'vac-am',type:'half-am',amount:0.5,date:'2026-09-02',reason:'AM',createdAt:2},
    {id:'vac-pm',type:'half-pm',amount:0.5,date:'2026-09-03',reason:'PM',createdAt:3},
    {id:'vac-holiday',type:'holiday',amount:0,date:'2025-08-01',reason:'Holiday',createdAt:4}],
  totalVacationDays:15,deletedItemIds:[],updatedAt:100,syncRevision:1};
const viewsOnly=process.env.VACATION_VIEWS_ONLY==='1';

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
      .find(([,value]) => value.items.some(item => item.id === 'vacation'))[0]);
    await page.locator('.mobile-nav-btn[data-group="' + group + '"]').click();
    await page.locator('.quick-popover-item[data-filter="vacation"]').click();
  } else await page.locator('.nav-item[data-filter="vacation"]').first().click();
  await page.evaluate(() => UI.renderSidebar());
  assert.equal(await page.locator('#vacation-view-container').isVisible(), true);
}

async function capture(page, name, selector) {
  snapshots[name] = await page.locator(selector).evaluate(el => ({html:el.outerHTML,
    width:Math.round(el.getBoundingClientRect().width), height:Math.round(el.getBoundingClientRect().height)}));
  if (baseline) assert.deepEqual(snapshots[name], baseline[name], name + ': changed from pre-refactor UI');
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const card=(page,id='vac-full')=>page.locator('#vacation-history-list .vacation-item-card[data-vacation-id="'+id+'"]');
const focused=page=>page.waitForFunction(()=>document.activeElement.id==='vacation-input-date');
const month=(page,value)=>page.locator('#vacation-month-pills [data-v-month="'+value+'"]');
const type=(page,value)=>page.locator('.clickable-vstat-box[data-vtype-filter="'+value+'"]');
const viewState=page=>page.evaluate(key=>({raw:localStorage.getItem(key),writes:fixtureState.writes,
  vacations:JSON.stringify(store.vacations)}),key);

async function checkViews(app,entry,width) {
  const {page,server}=app,before=await viewState(page);
  await navigate(page,width);
  assert.equal(await card(page).count(),1);
  assert.match(await page.locator('#vacation-stat-used').textContent(),/^2\.0/);
  assert.match(await page.locator('#vacation-stat-remain').textContent(),/^13\.0/);
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    const prefix=entry+'-'+width+'-'+theme;
    await capture(page,prefix+'-list','#vacation-view-container');
    assert.deepEqual(await page.locator('#vacation-history-list .vacation-item-card').evaluateAll(es=>es.map(e=>e.dataset.vacationId)),['vac-pm','vac-am','vac-full']);
    await card(page).locator('[data-action="edit-vacation"]').click();await focused(page);
    assert.equal(await page.locator('#vacation-input-reason').inputValue(),'Original <reason>');
    assert.equal(await page.locator('#vacation-input-type').inputValue(),'full');
    await capture(page,prefix+'-edit','#vacation-modal');
    await page.locator('#btn-cancel-vacation-modal').click();
    await page.locator('#btn-open-add-vacation-modal').click();await focused(page);
    assert.equal(await page.locator('#vacation-input-date').inputValue(),'2026-09-19');
    assert.equal(await page.locator('#vacation-input-reason').inputValue(),'');
    await capture(page,prefix+'-new','#vacation-modal');
    await page.locator('#btn-close-vacation-modal').click();
    await page.locator('#btn-open-set-total-vacation').click();
    assert.equal(await page.locator('#input-total-vacation-days').inputValue(),'15');
    await capture(page,prefix+'-total','#total-vacation-modal');
    await page.locator('#btn-cancel-total-vacation-modal').click();
    await type(page,'holiday').click();assert.equal(await card(page,'vac-holiday').count(),1);
    assert.match(await page.locator('#vacation-history-count').textContent(),/전체 휴가 1건/);
    await capture(page,prefix+'-holiday','#vacation-view-container');
    await type(page,'used').click();assert.equal(await page.locator('#vacation-history-list .vacation-item-card').count(),3);
    await type(page,'all').click();await month(page,'1').click();
    assert.equal(await page.locator('#vacation-empty-state').isVisible(),true);
    await capture(page,prefix+'-empty','#vacation-view-container');
    await month(page,'9').click();
    await page.locator('#vacation-filter-year').selectOption('all');await month(page,'all').click();
    assert.equal(await page.locator('#vacation-history-list .vacation-item-card').count(),4);
    await page.locator('#vacation-filter-year').selectOption('2026');await month(page,'9').click();
  }
  await page.evaluate(()=>{fixtureState.opens=0;const original=UI.openVacationModal;
    UI.openVacationModal=function(...args){fixtureState.opens++;return original.apply(this,args);};});
  for(let i=0;i<3;i++){await card(page).locator('[data-action="edit-vacation"]').click();await focused(page);await page.locator('#btn-close-vacation-modal').click();}
  assert.equal(await page.evaluate(()=>fixtureState.opens),3);
  assert.deepEqual(await viewState(page),before);assert.equal(server.requests,0);
}

async function checkFailures(app) {
  const {page}=app;
  for(const mode of ['new','edit','total','delete']) {
    if(mode==='new'){await page.locator('#btn-open-add-vacation-modal').click();await focused(page);}
    if(mode==='edit'){await card(page).locator('[data-action="edit-vacation"]').click();await focused(page);}
    if(mode==='total')await page.locator('#btn-open-set-total-vacation').click();
    if(mode==='new'||mode==='edit')await page.locator('#vacation-input-reason').fill('보존할 실패 입력');
    if(mode==='total')await page.locator('#input-total-vacation-days').fill('0');
    const before=await saved(page),memory=await page.evaluate(()=>JSON.stringify({v:store.vacations,t:store.totalVacationDays}));
    await page.evaluate(()=>{fixtureState.failSave=true;document.getElementById('toast-container').innerHTML='';});
    await (mode==='delete'?card(page).locator('[data-action="delete-vacation"]'):
      page.locator(mode==='total'?'#total-vacation-form button[type="submit"]':'#vacation-form button[type="submit"]')).click();
    assert.deepEqual(await saved(page),before);
    assert.equal(await page.evaluate(()=>JSON.stringify({v:store.vacations,t:store.totalVacationDays})),memory);
    assert.equal(await page.locator('#toast-container .toast').count(),0);
    if(mode!=='delete') {
      assert.equal(await page.locator(mode==='total'?'#total-vacation-modal':'#vacation-modal').isVisible(),true);
      assert.equal(await page.locator(mode==='total'?'#input-total-vacation-days':'#vacation-input-reason').inputValue(),mode==='total'?'0':'보존할 실패 입력');
    }
    await page.evaluate(()=>fixtureState.failSave=false);
    if(mode!=='delete')await page.locator(mode==='total'?'#btn-cancel-total-vacation-modal':'#btn-cancel-vacation-modal').click();
  }
}

async function checkEdits(app,width) {
  const {page}=app;
  await page.locator('#btn-open-add-vacation-modal').click();await focused(page);
  await page.locator('#vacation-input-type').selectOption('holiday');
  await page.locator('#vacation-input-date').fill('2026-09-20');
  await page.locator('#vacation-input-reason').fill('새 휴가');
  await page.locator('#vacation-form button[type="submit"]').click();
  let d=await saved(page),added=d.vacations.find(v=>v.reason==='새 휴가');
  assert.ok(added);assert.equal(added.amount,0);assert.equal(d.vacations.filter(v=>v.reason==='새 휴가').length,1);
  await card(page,added.id).locator('[data-action="edit-vacation"]').click();await focused(page);
  await page.locator('#vacation-input-type').selectOption('half-pm');await page.locator('#vacation-input-reason').fill('수정 반차');
  await page.locator('#vacation-form button[type="submit"]').click();
  await page.locator('#btn-open-set-total-vacation').click();await page.locator('#input-total-vacation-days').fill('0');
  await page.locator('#total-vacation-form button[type="submit"]').click();
  assert.equal(await page.locator('#total-vacation-modal').isVisible(),false);
  assert.match(await page.locator('#vacation-stat-total').textContent(),/^0\.0/);
  const pending=(await saved(page)).localSync.pending;assert.ok(pending.length);
  await page.reload();await ready(page);await navigate(page,width);
  d=await saved(page);assert.deepEqual(d.localSync.pending,pending);
  assert.equal(d.totalVacationDays,0);assert.equal(d.vacations.find(v=>v.id===added.id).amount,0.5);
  await page.locator('#btn-open-set-total-vacation').click();assert.equal(await page.locator('#input-total-vacation-days').inputValue(),'0');
  await page.locator('#btn-close-total-vacation-modal').click();
  await card(page,added.id).locator('[data-action="delete-vacation"]').click();
  d=await saved(page);assert.ok(d.deletedItemIds.includes(added.id));assert.equal(d.vacations.some(v=>v.id===added.id),false);
  assert.deepEqual(d.notes,initialData.notes);assert.deepEqual(d.tasks,initialData.tasks);
  await page.reload();await ready(page);await navigate(page,width);assert.equal(await card(page,added.id).count(),0);
}

async function checkConnectedViews(app) {
  const {page}=app,before=await viewState(page);
  await page.evaluate(()=>{store.currentCalendarDate=new Date('2026-09-01T12:00:00');store.activeFilter='calendar-month';UI.renderTasks();});
  assert.equal(await page.locator('#cal-stat-vacation').textContent(),'2.0일');
  // Actual rule-based assistant must match the same Store statistics.
  await page.evaluate(()=>UI.sendChatbotQuery('오늘 남은 할 일 몇 개야?'));
  await page.waitForFunction(()=>document.querySelector('#chatbot-messages-container .bot-bubble-content strong')!==null);
  assert.match(await page.locator('#chatbot-messages-container .bot-bubble-content').last().textContent(),/13\.0일/);
  await page.evaluate(()=>document.getElementById('chatbot-modal-window').style.display='none');
  await page.evaluate(()=>{store.currentCalendarDate=new Date('2025-08-01T12:00:00');store.selectedCalendarDateStr='2025-08-01';UI.renderCalendarMonth();UI.renderSelectedDayTasks();});
  assert.match(await page.locator('#cal-day-modal-list').textContent(),/0일/);
  assert.equal(await page.locator('#cal-stat-vacation').textContent(),'0.0일');
  assert.match(await page.locator('.cal-task-chip[data-date="2025-08-01"]').textContent(),/0일/);
  // No record is needed in a future year to keep the default filter coherent.
  await page.clock.setFixedTime(new Date('2027-01-05T03:00:00Z'));
  await page.evaluate(()=>{store.selectedVacationYear='2027';store.selectedVacationMonth='1';store.activeFilter='vacation';UI.renderTasks();});
  assert.equal(await page.locator('#vacation-filter-year').inputValue(),'2027');
  assert.equal(await page.locator('#vacation-empty-state').isVisible(),true);
  assert.deepEqual(await viewState(page),before);
}

async function checkSync(browser,entry) {
  const server={requests:0,puts:0,body:null,version:1,failGET:false};
  const a=await openApp(browser,entry,1280,false,server),b=await openApp(browser,entry,390,false,server);
  const sync=async page=>assert.equal(await page.evaluate(()=>cloudSync.requestManualSync()),true);
  try {
    await sync(a.page);await sync(b.page);await navigate(a.page,1280);await navigate(b.page,390);
    await a.page.evaluate(()=>store.updateVacation('vac-full',{reason:'수신 원문'}));await sync(a.page);await sync(b.page);
    await card(b.page).locator('[data-action="edit-vacation"]').click();await focused(b.page);
    assert.equal(await b.page.locator('#vacation-input-reason').inputValue(),'수신 원문');
    await b.page.locator('#vacation-input-type').selectOption('half-am');
    await b.page.locator('#vacation-input-reason').fill('모바일 수정');
    await b.page.locator('#vacation-form button[type="submit"]').click();await sync(b.page);await sync(a.page);
    assert.match(await card(a.page).textContent(),/모바일 수정/);
    await a.page.evaluate(()=>store.setTotalVacationDays(0));await sync(a.page);await sync(b.page);
    assert.match(await b.page.locator('#vacation-stat-total').textContent(),/^0\.0/);
    await card(a.page).locator('[data-action="delete-vacation"]').click();await sync(a.page);await sync(b.page);
    assert.equal(await card(b.page).count(),0);
    assert.deepEqual((await saved(a.page)).vacations,(await saved(b.page)).vacations);
    assert.ok(server.body.isEncrypted);assert.ok(server.puts>0);assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
  } finally {await a.context.close();await b.context.close();}
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      for(const width of [1280,390]) {
        const app=await openApp(browser,entry,width);
        try{await checkViews(app,entry,width);if(!viewsOnly){await checkFailures(app);await checkConnectedViews(app);
          await app.page.clock.setFixedTime(new Date('2026-09-19T03:00:00Z'));
          await app.page.evaluate(()=>{store.selectedVacationYear='2026';store.selectedVacationMonth='9';UI.renderVacation();});
          await checkEdits(app,width);}assert.deepEqual(app.errors,[]);
        }finally{await app.context.close();}
      }
      const app=await openApp(browser,entry,390,true);
      try{await navigate(app.page,390);await card(app.page).locator('[data-action="edit-vacation"]').click();await focused(app.page);
        assert.equal(await app.page.locator('#vacation-input-reason').inputValue(),'Original <reason>');
        await app.page.locator('#btn-close-vacation-modal').click();assert.deepEqual(app.errors,[]);
      }finally{await app.context.close();}
      if(!viewsOnly)await checkSync(browser,entry);
    }
    if(baselinePath&&!baseline){fs.mkdirSync(path.dirname(baselinePath),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify(snapshots,null,2));}
    console.log('PASS: vacation '+(viewsOnly?'view characterization only':'views, failed-save drafts, CRUD/restart, zero entitlement, calendar/chatbot/year filters, encrypted two-device sync')+
      '; both HTML entries, PC/mobile, light/dark, file://; '+Object.keys(snapshots).length+' snapshots'+(baseline?'; existing baseline unchanged':''));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
