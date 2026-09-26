// Real HTML + real crypto in isolated browsers; all network requests intercepted.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {fixture,key}=require('./sync-harness.cjs');
const root=path.resolve(__dirname,'..'),origin='http://localhost:4199';
const cryptoContext={crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,console};cryptoContext.window=cryptoContext;
vm.runInNewContext(fs.readFileSync(path.join(root,'js/services/crypto.js'),'utf8'),cryptoContext);
const seed={...fixture,totalVacationDays:15,healthFolders:[{id:'all',name:'전체'},{id:'general',name:'일반'}],honeymoonData:{9:{hasData:true,income:{total:100,items:[]}}}};
async function open(browser,entry,width,server,file=false,mobile=false,initial=seed) {
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',acceptDownloads:true,...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
  const errors=[];
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.protocol==='file:'){assert.ok(fileURLToPath(url).startsWith(root+path.sep));return route.continue();}
    if(url.origin==='https://sync.example.invalid') {
      if(req.method()==='PUT') {
        if(server.failPUT)return route.fulfill({status:503,contentType:'application/json',body:'null'});
        if(req.headers()['if-match']!==String(server.rev))return route.fulfill({status:412,contentType:'application/json',body:'null'});
        server.body=req.postDataJSON();assert.equal(server.body.isEncrypted,true);
        const plain=await cryptoContext.E2EESecurityEngine.decrypt(server.body,'fixture-pin');
        assert.equal(Object.hasOwn(plain,'localSync'),false);server.rev++;server.puts++;
      }
      return route.fulfill({status:200,contentType:'application/json',headers:{ETag:String(server.rev),'Access-Control-Expose-Headers':'ETag'},body:JSON.stringify(server.body)});
    }
    if(url.origin===origin){const filename=path.resolve(root,url.pathname.slice(1));assert.ok(filename.startsWith(root+path.sep));
      return route.fulfill({body:fs.readFileSync(filename),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(filename)]||'text/plain'});}
    if(['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname))return route.fulfill({contentType:'text/plain',body:''});
    return route.abort();
  });
  await context.addInitScript(({seed,key})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
    localStorage.setItem('todolist_jy_active_rtdb_url','https://sync.example.invalid');
    for(const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1'])localStorage.setItem('todolist_jy_'+name,'true');
    window.fixtureFailSave=false;
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key && window.fixtureFailSave)throw Error('Synthetic quota');return set.call(this,k,v);};
  },{seed:initial,key});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='warning' && message.text().includes('Cloud sync deferred'))console.log(message.text());});
  await page.goto(file?pathToFileURL(path.join(root,entry)).href:origin+'/'+entry);
  await page.waitForFunction(()=>window.store?.writerLockHeld && window.UI);
  await page.evaluate(()=>{cloudSync.spaceId='fixture-user';cloudSync.pin='fixture-pin';cloudSync.pushTasksToCloud=()=>false;cloudSync.updateUIStatus();UI.renderTasks();UI.renderSidebar();});
  return {context,page,errors};
}
const sync=page=>page.evaluate(()=>{cloudSync.retryAfter=0;return cloudSync.fetchLatestFromCloud(true);});
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      const server={body:structuredClone(seed),rev:1,puts:0};
      // A narrow desktop viewport remains a PC. Device identity is not width.
      const pc=await open(browser,entry,390,server),mobileSeed=structuredClone(seed);
      mobileSeed.honeymoonData[9].income.total=9999;
      const mobile=await open(browser,entry,390,server,false,true,mobileSeed);
      assert.equal(await sync(pc.page),true);assert.equal(await sync(mobile.page),true);
      let plain=await cryptoContext.E2EESecurityEngine.decrypt(server.body,'fixture-pin');
      assert.equal(plain.ledgerAuthority.source,'desktop-web');assert.equal(plain.honeymoonData[9].income.total,100);
      assert.equal(await mobile.page.evaluate(()=>store.honeymoonData[9].income.total),100);
      assert.ok(await mobile.page.evaluate(()=>store.localSync.recovery.some(r=>r.local.honeymoonData?.[9]?.income.total===9999)));
      assert.equal(await mobile.page.locator('#btn-sync-conflicts,#sync-conflicts-modal').count(),0);
      await mobile.page.evaluate(()=>{store.activeFilter='ledger';UI.renderTasks();});
      assert.equal(await mobile.page.locator('#btn-open-ledger-upload').isVisible(),false);
      assert.match(await mobile.page.locator('#ledger-month-data-status').innerText(),/PC 웹 기준/);
      await pc.page.evaluate(()=>{store.updateNote('user-note',{content:'Earlier PC memo'});store.honeymoonData[9].income.total=500;store.saveLocalOnly();});
      await mobile.page.evaluate(()=>{store.updateNote('user-note',{content:'Latest mobile memo'});store.addHealthNote({title:'Mobile health',folder:'general',content:'Preserve attachment',fileUrl:'data:application/pdf;base64,SEVBTFRI'});});
      assert.equal(await sync(pc.page),true);assert.equal(await sync(mobile.page),true);assert.equal(await sync(pc.page),true);
      for(const app of [pc,mobile]) {
        assert.equal(await app.page.evaluate(()=>store.notes.find(n=>n.id==='user-note').content),'Latest mobile memo');
        assert.equal(await app.page.evaluate(()=>store.honeymoonData[9].income.total),500);
        assert.ok(await app.page.evaluate(()=>store.healthNotes.some(n=>n.title==='Mobile health' && n.fileUrl==='data:application/pdf;base64,SEVBTFRI')));
        assert.equal(await app.page.evaluate(()=>store.saveStatus),'confirmed');
      }
      // Failure to archive a new pair of originals prevents both replacement and PUT.
      await pc.page.evaluate(()=>store.updateNote('user-note',{content:'PC before quota failure'}));
      await mobile.page.evaluate(()=>store.updateNote('user-note',{content:'Mobile before quota failure'}));
      assert.equal(await sync(pc.page),true);
      const raw=await mobile.page.evaluate(key=>localStorage.getItem(key),key),puts=server.puts;
      await mobile.page.evaluate(()=>{fixtureFailSave=true;});
      assert.equal(await sync(mobile.page),false);assert.equal(server.puts,puts);
      assert.equal(await mobile.page.evaluate(key=>localStorage.getItem(key),key),raw);
      await mobile.page.reload();await mobile.page.waitForFunction(()=>window.store?.writerLockHeld && window.UI);
      await mobile.page.evaluate(()=>{cloudSync.spaceId='fixture-user';cloudSync.pin='fixture-pin';cloudSync.pushTasksToCloud=()=>false;});
      assert.equal(await sync(mobile.page),true);assert.equal(await mobile.page.evaluate(()=>store.localSyncInvalid),false);
      // The optional settings export contains original versions, without a choice dialog.
      await mobile.page.locator('#btn-cloud-status').click();
      await mobile.page.locator('#btn-open-data-settings').click();
      const downloadEvent=mobile.page.waitForEvent('download');await mobile.page.locator('#btn-export-sync-recovery').click();
      const download=await downloadEvent,bundle=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
      assert.equal(bundle.format,'todolist-sync-recovery');assert.ok(bundle.localSync.recovery.some(r=>r.local.notes?.[0]?.content==='Latest mobile memo'));
      assert.equal(Object.hasOwn(bundle,'pin'),false);
      assert.ok(await mobile.page.locator('#settings-modal .modal-card').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      if(entry==='index.html'){fs.mkdirSync(path.join(root,'scratch'),{recursive:true});await mobile.page.screenshot({path:path.join(root,'scratch/automatic-sync-mobile.png'),animations:'disabled'});}
      const file=await open(browser,entry,1280,server,true,false,mobileSeed);
      assert.equal(await sync(file.page),true);assert.equal(await file.page.evaluate(()=>store.honeymoonData[9].income.total),500);
      for(const app of [pc,mobile,file]){assert.deepEqual(app.errors,[]);await app.context.close();}
      console.log('PASS: '+entry+' PC/mobile/file, real encrypted convergence, quota failure, restart and original export');
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
