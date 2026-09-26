// Actual disposable browser storage, synthetic 5.4M-character attachments.
// All requests are intercepted; no personal profile or production data is used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {fixture,key,harness}=require('./sync-harness.cjs');
const root=path.resolve(__dirname,'..'),origin='http://localhost:4197';
const cc={crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,console};cc.window=cc;
vm.runInNewContext(fs.readFileSync(path.join(root,'js/services/crypto.js'),'utf8'),cc);
const cipher=cc.E2EESecurityEngine;
async function open(browser,entry,server,label) {
  const context=await browser.newContext({viewport:{width:label==='mobile'?390:1280,height:900},serviceWorkers:'block',
    ...(label==='mobile'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='sync.example.invalid') {
      if(request.method()==='PUT') {
        if(request.headers()['if-match']!==String(server.rev))return route.fulfill({status:412,body:'null'});
        server.body=request.postDataJSON();server.rev++;server.puts++;
      }
      return route.fulfill({contentType:'application/json',headers:{ETag:String(server.rev),'Access-Control-Expose-Headers':'ETag'},body:JSON.stringify(server.body)});
    }
    if(url.origin===origin) {
      const filename=path.resolve(root,url.pathname.slice(1));assert.ok(filename.startsWith(root+path.sep));
      const body=process.env.STORAGE_REPRO_BEFORE==='1'&&url.pathname.endsWith('/main-storage.js')?'':fs.readFileSync(filename);
      return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(filename)]||'text/plain'});
    }
    return route.fulfill({body:''});
  });
  await context.addInitScript(({fixture,key,label})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({...fixture,notes:[...fixture.notes,{id:label+'-only',content:label+' original'}]}));
    localStorage.setItem('todolist_jy_active_rtdb_url','https://sync.example.invalid');
    for(const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1'])localStorage.setItem('todolist_jy_'+name,'true');
  },{fixture,key,label});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/'+entry);await ready(page);
  return {context,page,errors};
}
async function ready(page){await page.waitForFunction(()=>window.store?.writerLockHeld&&window.UI);await page.evaluate(()=>{cloudSync.spaceId='fixture-user';cloudSync.pin='fixture-pin';cloudSync.pushTasksToCloud=()=>false;});}
const sync=page=>page.evaluate(()=>{cloudSync.retryAfter=0;return cloudSync.fetchLatestFromCloud(true);});
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      const remote=structuredClone(fixture);
      remote.photos[0].dataUrl='data:image/png;base64,'+'A'.repeat(2700000);
      remote.ledgerFiles[0].dataUrl='data:application/pdf;base64,'+'B'.repeat(2700000);
      const server={body:await cipher.encrypt(remote,'fixture-pin'),rev:1,puts:0};
      const pc=await open(browser,entry,server,'pc');
      if(process.env.STORAGE_REPRO_BEFORE==='1') {
        assert.equal(await sync(pc.page),false);
        assert.equal(await pc.page.evaluate(()=>store.localSaveError?.code),'quota');
        console.log('REPRO: '+entry+' whole-snapshot localStorage write fails with actual QuotaExceededError');
        await pc.context.close();continue;
      }
      assert.equal(await sync(pc.page),true);
      const mobile=await open(browser,entry,server,'mobile');
      assert.equal(await sync(mobile.page),true);assert.equal(await sync(pc.page),true);
      const expected=['mobile-only','pc-only','user-note'];
      for(const app of [pc,mobile]) {
        const state=await app.page.evaluate(key=>({notes:store.notes.map(n=>n.id).sort(),photo:store.photos[0].dataUrl.length,
          ledger:store.ledgerFiles[0].dataUrl.length,physical:localStorage.getItem(key),expanded:MainStorage.getItem(key).length}),key);
        assert.deepEqual(state.notes,expected);assert.ok(state.photo>2700000&&state.ledger>2700000);
        assert.ok(state.physical.length<100000);assert.ok(state.expanded>5400000);
        const old=harness(state.physical);assert.equal(old.store.localSyncInvalid,true);assert.equal(old.store.addNote('old client write'),null);
      }
      const offlineId=await pc.page.evaluate(()=>store.addNote('Saved offline with full attachment originals').id);
      await pc.page.reload();await ready(pc.page);
      assert.equal(await pc.page.evaluate(id=>store.notes.some(n=>n.id===id),offlineId),true);
      assert.equal(await sync(pc.page),true);assert.equal(await sync(mobile.page),true);
      assert.equal(await mobile.page.evaluate(id=>store.notes.some(n=>n.id===id),offlineId),true);
      const cloud=await cipher.decrypt(server.body,'fixture-pin');
      assert.equal(cloud.photos[0].dataUrl,remote.photos[0].dataUrl);
      assert.equal(cloud.ledgerFiles[0].dataUrl,remote.ledgerFiles[0].dataUrl);
      assert.equal(cloud.__todolistLocalStorage,undefined);assert.equal(cloud.localSync,undefined);
      // A missing attachment is never treated as an empty record on restart.
      const before=await mobile.page.evaluate(key=>localStorage.getItem(key),key);
      await mobile.page.evaluate(()=>new Promise((resolve,reject)=>{
        const req=indexedDB.open('todolist_jy_payloads',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').clear();tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
      }));
      await mobile.page.reload();await mobile.page.waitForFunction(()=>document.getElementById('local-save-status')?.textContent.includes('첨부 원문 저장소'));
      assert.equal(await mobile.page.evaluate(key=>localStorage.getItem(key),key),before);
      assert.equal(await mobile.page.evaluate(()=>!!window.store),false);
      for(const app of [pc,mobile]){assert.deepEqual(app.errors,[]);await app.context.close();}
      console.log('PASS '+entry+': real quota exceeded before; verified blobs, identical notes, offline reload, full cloud bytes, old-client guard and missing-blob protection');
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
