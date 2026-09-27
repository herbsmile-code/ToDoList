// Disposable Edge contexts, synthetic records, fully intercepted network.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH||'playwright');
const {openApp,ready,initialData}=require('./health-ui.cjs');
const common={title:'Synthetic',content:'Synthetic content',createdAt:1};
const pair=(field,extra={})=>[{...common,...extra,id:field+'-old',createdAt:1,updatedAt:999},
  {...common,...extra,id:field+'-new',createdAt:2}];
const seed={...initialData,
  tasks:pair('tasks',{status:'todo',category:'work',priority:'medium',subtasks:[],dueDate:'2026-09-19'}),
  notes:pair('notes',{color:'pink'}),photos:pair('photos',{imageDataUrl:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',date:'2026-09-19',caption:'Synthetic'}),
  wishlist:pair('wishlist',{category:'all',name:'Synthetic',price:'1000'}),
  sites:pair('sites',{folder:'portal',url:'https://example.invalid'}),siteFolders:[{id:'all',name:'All'},{id:'portal',name:'Portal'}],
  aiStudyNotes:pair('aiStudyNotes',{category:'llm',summary:'Summary',tags:[]}),
  healthNotes:pair('healthNotes',{folder:'general',date:'2026-09-19'}),
  hobbyNotes:pair('hobbyNotes',{folder:'general',date:'2026-09-19'}),hobbyFolders:[{id:'all',name:'All'},{id:'general',name:'General'}],
  vacations:pair('vacations',{date:'2026-09-19',type:'full',reason:'Synthetic',amount:1}),
  subscriptions:pair('subscriptions',{name:'Synthetic',isActive:true,amount:1000,payDay:20,billingCycle:'monthly',icon:'📦'}),
  projects:pair('projects',{icon:'🎯',milestones:[],deadline:'2026-12-01'}),
  ledgerFiles:pair('ledgerFiles',{name:'Synthetic.pdf',size:10,type:'application/pdf',dataUrl:'data:application/pdf;base64,JVBERg=='}),
  treasures:pair('treasures',{desc:'Synthetic',code:'',category:'study'})};
const configs=[
  ['tasks','all','#tasks-list-container','.task-card','data-id'],
  ['notes','notes','#notes-grid-container','.note-card','data-note-id'],
  ['photos','photos','#photos-grid-container','.polaroid-card','data-photo-id'],
  ['wishlist','wishlist','#wishlist-grid-container','.wish-card','data-wish-id'],
  ['sites','sites','#sites-grid-container','.site-card','data-site-id'],
  ['aiStudyNotes','aistudy','#aistudy-grid-container','.aistudy-card','data-aistudy-id'],
  ['healthNotes','health','#health-notes-grid-container','.health-note-card','data-health-note-id'],
  ['hobbyNotes','hobby','#hobby-notes-grid-container','.hobby-note-card','data-hobby-note-id'],
  ['vacations','vacation','#vacation-history-list','.vacation-item-card','data-vacation-id'],
  ['subscriptions','ledger','#subscriptions-grid','.subscription-card','data-sub-id'],
  ['projects','project','#project-tabs-container','.project-tab-pill','data-id'],
  ['ledgerFiles','ledger','#ledger-files-grid','.file-card','data-ledger-id'],
  ['treasures',null,'#tr-grid-container','.tr-item-card','data-id']
];
async function show(page,filter,field){
  await page.evaluate(({filter,field})=>{
    if(field==='treasures'){treasureVault.refreshFromStore();treasureVault.openModal();return;}
    store.activeFilter=filter;store.activeLedgerSubtab=field==='subscriptions'?'subscriptions':'budget';
    store.activeHealthFolder=store.activeHobbyFolder=store.activeSiteFolder='all';
    store.selectedVacationMonth=store.selectedVacationYear='all';UI.renderTasks();
    // This legacy section is intentionally hidden in the product; expose only in the fixture.
    if(field==='ledgerFiles')document.getElementById('stored-ledger-files-section').style.display='block';
  },{filter,field});
}
const readOrder=(page,field)=>page.evaluate(field=>store[field].map(x=>x.id),field);
async function checkMenus(page){
  await page.evaluate(()=>{cloudSync.pushTasksToCloud=()=>false;});
  for(const [field,filter,root,selector,attr] of configs){
    await show(page,filter,field);const cards=page.locator(root+' '+selector),select=page.locator('#list-order-'+field+' select');
    assert.deepEqual(await cards.evaluateAll((els,attr)=>els.map(x=>x.getAttribute(attr)),attr),[field+'-new',field+'-old'],field+' newest first');
    const before=await page.evaluate(()=>fixtureState.writes);
    await select.selectOption('manual');assert.equal(await page.evaluate(()=>fixtureState.writes),before,field+' preference must not write business data');
    await page.locator(root+' [data-order-step="1"]').first().click();
    assert.deepEqual(await readOrder(page,field),[field+'-new',field+'-old'],field+' saved manual');
    await select.selectOption('latest');assert.equal(await cards.locator('[data-order-handle]').count(),0);
    if(field==='treasures')await page.evaluate(()=>treasureVault.closeModal());
  }
}
async function checkDrag(page,width){
  await show(page,'health','healthNotes');await page.locator('#list-order-healthNotes select').selectOption('manual');
  const cards=page.locator('#health-notes-grid-container .health-note-card');
  const source=cards.nth(1).locator('[data-order-handle]'),target=cards.nth(0);
  if(width>600){await source.dragTo(target,{targetPosition:{x:30,y:20}});}
  else {
    await source.scrollIntoViewIfNeeded();const from=await source.boundingBox(),to=await target.boundingBox();
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+15,y:from.y+15}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x+30,y:to.y+5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }
  assert.deepEqual(await readOrder(page,'healthNotes'),['healthNotes-old','healthNotes-new'],'native drag');
  await page.evaluate(()=>fixtureState.failSave=true);
  await cards.first().locator('[data-order-step="1"]').click();
  assert.deepEqual(await readOrder(page,'healthNotes'),['healthNotes-old','healthNotes-new'],'failed save rollback');
  await page.evaluate(()=>fixtureState.failSave=false);
  await cards.first().locator('[data-order-handle]').focus();await page.keyboard.press('ArrowDown');
  assert.deepEqual(await readOrder(page,'healthNotes'),['healthNotes-new','healthNotes-old'],'keyboard order');
  await page.reload();await ready(page);await show(page,'health','healthNotes');
  assert.equal(await page.locator('#list-order-healthNotes select').inputValue(),'manual');
  assert.deepEqual(await readOrder(page,'healthNotes'),['healthNotes-new','healthNotes-old']);
  assert.equal(await page.locator('.health-item-checkbox,#health-check-all').count(),0);
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    for(const entry of ['index.html','ToDoList.html'])for(const width of [1280,390]){
      const app=await openApp(browser,entry,width,false,null,seed);
      try{await checkMenus(app.page);await checkDrag(app.page,width);assert.deepEqual(app.errors,[]);
        if(process.env.ORDER_SCREENSHOT_DIR)await app.page.screenshot({path:require('node:path').join(process.env.ORDER_SCREENSHOT_DIR,entry+'-'+width+'.png')});
        console.log('PASS menus, newest/manual, native drag, save failure, keyboard, restart:',entry,width);
      }finally{await app.context.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
