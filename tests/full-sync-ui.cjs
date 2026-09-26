// Three disposable browser profiles, real crypto/IndexedDB/SSE, synthetic server.
// No production endpoint, existing profile or personal backup is accessed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {fixture,key}=require('./sync-harness.cjs');
const root=path.resolve(__dirname,'..');
const streams=new Set();
let body,revision,puts,failNextPut=false;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/backend/')) {
    if(url.pathname.endsWith('/iv.json')) {
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
      streams.add(res);req.on('close',()=>streams.delete(res));
      res.write('event: put\ndata: '+JSON.stringify({path:'/',data:body?.iv || null})+'\n\n');return;
    }
    if(req.method==='PUT') {
      let text='';for await(const part of req)text+=part;
      if(failNextPut) {failNextPut=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('null');return;}
      if(req.headers['if-match']!==String(revision)) {res.writeHead(412,{'Content-Type':'application/json'});res.end('null');return;}
      body=JSON.parse(text);assert.equal(body.isEncrypted,true);revision++;puts++;
      for(const stream of streams)stream.write('event: put\ndata: '+JSON.stringify({path:'/',data:body.iv})+'\n\n');
      assert.equal(url.searchParams.get('print'),'silent');res.writeHead(204);res.end();return;
    }
    res.writeHead(200,{'Content-Type':'application/json',ETag:String(revision)});res.end(JSON.stringify(body));return;
  }
  if(url.pathname==='/seed'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Synthetic fixture</title>');return;}
  const filename=path.resolve(root,'.'+url.pathname);
  if(!filename.startsWith(root+path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(filename)] || 'application/octet-stream'});
  fs.createReadStream(filename).pipe(res);
});
async function open(browser,origin,entry,label,mobile=false) {
  const context=await browser.newContext({viewport:{width:mobile?390:1280,height:900},serviceWorkers:'block',
    ...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin ? route.continue() : route.fulfill({body:''}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/seed');
  const data={...structuredClone(fixture),totalVacationDays:label==='pc'?15:18,
    honeymoonData:{9:{hasData:true,income:{total:label==='pc'?100:9999,items:[]}}}};
  for(const f of ['tasks','notes','aiStudyNotes','healthNotes','hobbyNotes','wishlist','photos','sites','vacations','projects','subscriptions','ledgerFiles']) {
    data[f].push({id:f+'-'+label,title:label,content:label,category:'personal',folder:'general',type:'todo'});
  }
  // Previously tests received large files into an empty profile. Existing
  // devices must also start automatically with a nearly full legacy snapshot.
  if(label==='pc') {
    data.photos.at(-1).dataUrl='data:image/png;base64,'+'A'.repeat(2400000);
    data.ledgerFiles.at(-1).dataUrl='data:application/pdf;base64,'+'B'.repeat(2200000);
  }
  await page.evaluate(async({data,key,origin,label})=>{
    localStorage.setItem(key,JSON.stringify(data));
    localStorage.setItem('todolist_jy_active_rtdb_url',origin+'/backend');
    localStorage.setItem('todolist_jy_space_id','fixture-user');localStorage.setItem('todolist_jy_pin','fixture-pin');
    for(const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1'])localStorage.setItem('todolist_jy_'+name,'true');
    localStorage.setItem('zentask_treasures',JSON.stringify([{id:'treasure-'+label,title:label,desc:'Original',createdAt:1}]));
    localStorage.setItem('ledgerBankStatements',JSON.stringify([{date:'2026-09-26',bank:'shinhan',desc:label,out:10}]));
    localStorage.setItem('ledgerCategoryRules',JSON.stringify([{keyword:label,bank:'shinhan',category:'food'}]));
    await new Promise((resolve,reject)=>{
      const request=indexedDB.open('todolist_jy_vault_idb',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('vault_files',{keyPath:'id'});
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('vault_files','readwrite');
        tx.objectStore('vault_files').put({id:'file-'+label,name:label+'.bin',createdAt:1,
          dataUrl:'data:application/octet-stream;base64,'+'A'.repeat(label==='pc'?700000:100)});
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
      };
    });
  },{data,key,origin,label});
  await page.goto(origin+'/'+entry);
  return {page,context,errors};
}
async function consistent(apps,expected) {
  await Promise.all(apps.map(({page})=>page.waitForFunction(expected=>{
    const fields=['tasks','notes','aiStudyNotes','healthNotes','hobbyNotes','wishlist','photos','sites','vacations','projects','subscriptions','ledgerFiles'];
    return store.saveStatus==='confirmed' && !store.localSync.pending.length &&
      fields.every(f=>['pc','mobile','second-pc'].every(label=>store[f].filter(row=>row.id===f+'-'+label).length===1)) &&
      store.treasures.length===expected && store.ledgerBankStatements.length===3 && store.ledgerCategoryRules.length===3;
  },expected,{timeout:30000})));
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      body={...structuredClone(fixture),totalVacationDays:20};revision=1;puts=0;
      const pc=await open(browser,origin,entry,'pc');
      await pc.page.waitForFunction(()=>store.saveStatus==='confirmed');
      const mobile=await open(browser,origin,entry,'mobile',true);
      const second=await open(browser,origin,entry,'second-pc');
      const apps=[pc,mobile,second];await consistent(apps,3);
      for(const app of apps) {
        assert.equal(await app.page.evaluate(()=>store.honeymoonData[9].income.total),100);
        assert.deepEqual(await app.page.evaluate(key=>({photo:store.photos.find(r=>r.id==='photos-pc').dataUrl.length,
          ledger:store.ledgerFiles.find(r=>r.id==='ledgerFiles-pc').dataUrl.length,compact:localStorage.getItem(key).length<100000}),key),
          {photo:2400022,ledger:2200028,compact:true});
        const sizes=await app.page.evaluate(async()=>Object.fromEntries((await cloudSync.getAllVaultFiles(true,true)).map(f=>[f.id,f.dataUrl?.length])));
        assert.ok(sizes['file-pc']>700000);assert.ok(sizes['file-mobile']);assert.ok(sizes['file-second-pc']);
        const originals=await app.page.evaluate(()=>SyncOriginals.getAll());assert.equal(originals.length,2);
        assert.ok(originals.find(x=>x.mainRaw)?.auxiliary.treasures);
      }
      // Live SSE delivery without a manual sync or polling tick.
      const start=Date.now();
      const added=await mobile.page.evaluate(()=>store.addTask({title:'Automatic live mobile schedule',type:'schedule'}).id);
      await pc.page.waitForFunction(id=>store.tasks.some(row=>row.id===id),added);
      const elapsed=Date.now()-start;
      failNextPut=true;
      await mobile.page.evaluate(()=>treasureVault.add('Retry treasure','Preserve original input'));
      await consistent(apps,4);assert.ok(puts>0);
      // Reload cannot resurrect deleted migrated records from old separate keys.
      await mobile.page.evaluate(()=>treasureVault.delete('treasure-mobile'));
      await consistent(apps,3);
      await mobile.page.reload();await consistent(apps,3);
      assert.equal(await mobile.page.evaluate(()=>store.treasures.some(row=>row.id==='treasure-mobile')),false);
      for(const app of apps) {assert.deepEqual(app.errors,[]);await app.context.close();}
      console.log('PASS '+entry+': 3 devices, all collections, full file bytes, SSE '+elapsed+'ms, automatic retry, originals and restart');
    }
  } finally {
    await browser.close();for(const stream of streams)stream.end();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
