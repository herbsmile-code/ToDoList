// Three disposable browser profiles, real crypto/IndexedDB/SSE, synthetic server.
// No production endpoint, existing profile or personal backup is accessed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {fixture,key}=require('./sync-harness.cjs');
const root=path.resolve(__dirname,'..');
const streams=new Set(),repro=process.env.PAYLOAD_REPRO_BEFORE==='1',objectMode=process.env.SYNC_OBJECTS_TEST==='1';
const rejectPrint=process.env.SYNC_REJECT_PRINT==='1';let rejectedOptions=0;
const oldCrypto=repro?require('node:child_process').execFileSync('git',['show','2d56cb7:js/services/crypto.js'],{encoding:'utf8'}):null;
function largestString(value){return typeof value==='string'?Buffer.byteLength(value):value&&typeof value==='object'?Math.max(0,...Object.values(value).map(largestString)):0;}
const objects=new Map();let objectGets=0,uploadedBytes=0,downloadedBytes=0;
let body,revision,puts,fullGets=0,probes=0,failNextPut=false;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/backend/')) {
    if(url.pathname.startsWith('/backend/sync_objects/')) {
      if(req.method==='PUT') {
        assert.equal(req.headers['if-match'],'null_etag');let text='';for await(const part of req)text+=part;
        uploadedBytes+=Buffer.byteLength(text);const value=JSON.parse(text);assert.ok(largestString(value)<=1024*1024*10);
        if(rejectPrint && url.searchParams.has('print')) {rejectedOptions++;res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Unsupported query parameter print'}));return;}
        if(objects.has(url.pathname)){res.writeHead(412,{'Content-Type':'application/json'});res.end('null');return;}
        assert.equal(value.isEncrypted,true);objects.set(url.pathname,value);
        if(url.searchParams.has('print')){res.writeHead(204);res.end();}
        else {downloadedBytes+=Buffer.byteLength(text);res.writeHead(200,{'Content-Type':'application/json'});res.end(text);}return;
      }
      objectGets++;const text=JSON.stringify(objects.get(url.pathname)||null);downloadedBytes+=Buffer.byteLength(text);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(text);return;
    }
    if(url.pathname.endsWith('/iv.json')) {
      if(!req.headers.accept?.includes('text/event-stream')) {
        probes++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(body?.iv || null));return;
      }
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
      streams.add(res);req.on('close',()=>streams.delete(res));
      res.write('event: put\ndata: '+JSON.stringify({path:'/',data:body?.iv || null})+'\n\n');return;
    }
    if(req.method==='PUT') {
      let text='';for await(const part of req)text+=part;
      uploadedBytes+=Buffer.byteLength(text);
      if(rejectPrint && url.searchParams.has('print')) {rejectedOptions++;res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Unsupported query parameter print'}));return;}
      if(largestString(JSON.parse(text))>10*1024*1024) {
        res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Data size exceeds the maximum size of 10485760 bytes.'}));return;
      }
      if(failNextPut) {failNextPut=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('null');return;}
      if(req.headers['if-match']!==String(revision)) {res.writeHead(412,{'Content-Type':'application/json'});res.end('null');return;}
      body=JSON.parse(text);assert.equal(body.isEncrypted,true);revision++;puts++;
      for(const stream of streams)stream.write('event: put\ndata: '+JSON.stringify({path:'/',data:body.iv})+'\n\n');
      if(url.searchParams.has('print')){res.writeHead(204);res.end();}
      else {downloadedBytes+=Buffer.byteLength(text);res.writeHead(200,{'Content-Type':'application/json'});res.end(text);}return;
    }
    fullGets++;const text=JSON.stringify(body);downloadedBytes+=Buffer.byteLength(text);
    res.writeHead(200,{'Content-Type':'application/json',ETag:String(revision)});res.end(text);return;
  }
  if(url.pathname==='/seed'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Synthetic fixture</title>');return;}
  const filename=path.resolve(root,'.'+url.pathname);
  if(!filename.startsWith(root+path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(filename)] || 'application/octet-stream'});
  if(repro&&url.pathname==='/js/services/crypto.js'){res.end(oldCrypto);return;}
  fs.createReadStream(filename).pipe(res);
});
async function open(browser,origin,entry,label,mobile=false) {
  const context=await browser.newContext({viewport:{width:mobile?390:1280,height:900},serviceWorkers:'block',
    ...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin ? route.continue() : route.fulfill({body:''}));
  await context.addInitScript(({enabled,profile})=>{
    window.SyncObjectTransportEnabled=enabled;
    if(profile)Object.defineProperty(window,'createLocalSyncProtocol',{configurable:true,set(fn){
      Object.defineProperty(window,'createLocalSyncProtocol',{configurable:true,writable:true,value:args=>{const p=fn(args);window.fixtureProtocol=p;return p;}});
    }});
  },{enabled:objectMode,profile:process.env.PROFILE_SYNC==='1'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/seed');
  const data={...structuredClone(fixture),totalVacationDays:label==='pc'?15:18,
    deletedItemIds:label==='mobile'?['deleted-b','deleted-a']:['deleted-a','deleted-b'],
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
          dataUrl:'data:application/octet-stream;base64,'+'A'.repeat(label==='pc'?700000:label==='mobile'?12100000:100)});
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
    return window.store?.saveStatus==='confirmed' && !store.localSync.pending.length &&
      fields.every(f=>['pc','mobile','second-pc'].every(label=>store[f].filter(row=>row.id===f+'-'+label).length===1)) &&
      store.treasures.length===expected && store.ledgerBankStatements.length===3 && store.ledgerCategoryRules.length===3;
  },expected,{timeout:30000})));
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of (process.env.SYNC_ENTRY_ONLY?[process.env.SYNC_ENTRY_ONLY]:['index.html','ToDoList.html'])) {
      body={...structuredClone(fixture),totalVacationDays:20};revision=1;puts=0;objects.clear();uploadedBytes=0;downloadedBytes=0;rejectedOptions=0;
      const pc=await open(browser,origin,entry,'pc');
      await pc.page.waitForFunction(()=>store.saveStatus==='confirmed');
      const mobile=await open(browser,origin,entry,'mobile',true);
      if(repro) {
        await mobile.page.waitForFunction(()=>cloudSync.lastSyncFailure?.kind==='size-limit');
        assert.equal(await mobile.page.evaluate(()=>store.notes.some(r=>r.id==='notes-mobile')),true);
        assert.equal(await mobile.page.evaluate(()=>cloudSync.lastSyncFailure.status),400);
        assert.equal(body.v,2);await mobile.context.close();await pc.context.close();
        console.log('REPRO '+entry+': legacy single ciphertext is rejected with HTTP 400 after device union; local original retained');continue;
      }
      const second=await open(browser,origin,entry,'second-pc');
      const apps=[pc,mobile,second];await consistent(apps,3);
      if(process.env.SYNC_HEALTH_UPLOAD_TEST==='1') {
        const fileUrl='data:application/pdf;base64,'+Buffer.alloc(4.5*1024*1024,65).toString('base64');
        assert.ok(await pc.page.evaluate(fileUrl=>store.saveHealthNoteWithAttachment('healthNotes-pc',{
          fileUrl,fileName:'synthetic-health.pdf',fileType:'application/pdf',fileSize:4.5*1024*1024,status:'completed'
        }),fileUrl));
        await Promise.all(apps.map(({page})=>page.waitForFunction(fileUrl=>store.saveStatus==='confirmed' &&
          store.healthNotes.find(n=>n.id==='healthNotes-pc')?.fileUrl===fileUrl,fileUrl,{timeout:30000})));
        for(const app of apps)assert.equal(await app.page.evaluate(()=>store.healthNotes.find(n=>n.id==='healthNotes-pc').status),'completed');
        await mobile.page.reload();
        await mobile.page.waitForFunction(fileUrl=>window.store?.healthNotes.find(n=>n.id==='healthNotes-pc')?.fileUrl===fileUrl,fileUrl);
        console.log('PASS '+entry+': new 4.5 MiB health file and progress status, encrypted v4 three-device receive and mobile restart');
      }
      assert.equal(body.v,objectMode?4:3);assert.ok(largestString(body)<=1024*1024);
      const encryptedBytes=Buffer.byteLength(JSON.stringify(body))+(objectMode?[...objects.values()].reduce((n,v)=>n+Buffer.byteLength(JSON.stringify(v)),0):0);
      assert.ok(encryptedBytes>23000000);
      if(objectMode)assert.ok(Buffer.byteLength(JSON.stringify(body))<150000);
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
      await Promise.all(apps.map(({page})=>page.waitForFunction(()=>!cloudSync._syncPromise)));
      if(process.env.PROFILE_SYNC==='1')await Promise.all(apps.map(({page})=>page.evaluate(()=>{
        window.syncProfile={};
        function wrap(obj,key,label){const fn=obj[key];obj[key]=function(...args){const start=performance.now();const done=()=>{const row=syncProfile[label]||={ms:0,count:0};row.ms+=performance.now()-start;row.count++;};
          const value=fn.apply(this,args);if(value?.then)return value.finally(done);done();return value;};}
        for(const key of ['automaticPlan','baseline','hashAsync'])wrap(fixtureProtocol,key,'protocol.'+key);
        for(const key of ['commitSyncLocal','requestCloud','getAllVaultFiles'])wrap(cloudSync,key,'cloud.'+key);
        for(const key of ['saveLocalOnly','commitLocal','buildLocalData'])wrap(store,key,'store.'+key);
        for(const key of ['read','prepare'])wrap(cloudSync.objectTransport,key,'transport.'+key);
      })));
      const traffic={up:uploadedBytes,down:downloadedBytes};
      const start=Date.now();
      const added=await mobile.page.evaluate(()=>store.addTask({title:'Automatic live mobile schedule',type:'schedule'}).id);
      await pc.page.waitForFunction(id=>store.tasks.some(row=>row.id===id),added);
      const elapsed=Date.now()-start;
      await Promise.all(apps.map(({page})=>page.waitForFunction(id=>store.tasks.some(row=>row.id===id) && store.saveStatus==='confirmed' && !cloudSync._syncPromise,added)));
      const delta={upload:uploadedBytes-traffic.up,download:downloadedBytes-traffic.down};
      if(process.env.PROFILE_SYNC==='1')console.log('PROFILE '+JSON.stringify(await Promise.all(apps.map(({page})=>page.evaluate(()=>syncProfile)))));
      if(objectMode){assert.ok(delta.upload<150000,JSON.stringify(delta));assert.ok(delta.download<500000,JSON.stringify(delta));}
      failNextPut=true;
      await mobile.page.evaluate(()=>treasureVault.add('Retry treasure','Preserve original input'));
      await consistent(apps,4);assert.ok(puts>0);
      // Reload cannot resurrect deleted migrated records from old separate keys.
      await mobile.page.evaluate(()=>treasureVault.delete('treasure-mobile'));
      await consistent(apps,3);
      await mobile.page.reload();await consistent(apps,3);
      assert.equal(await mobile.page.evaluate(()=>store.treasures.some(row=>row.id==='treasure-mobile')),false);
      // Once converged, replays and return-to-tab checks must neither upload nor
      // download 23 MB again. A changed nonce above still delivered every edit.
      await Promise.all(apps.map(({page})=>page.waitForFunction(()=>store.saveStatus==='confirmed' && !cloudSync._syncPromise && !cloudSync._remoteNoticeTimer)));
      const quiet={puts,fullGets,probes,objectGets};
      for(const stream of streams)stream.write('event: put\ndata: '+JSON.stringify({path:'/',data:body.iv})+'\n\n');
      await Promise.all(apps.map(({page})=>page.evaluate(()=>cloudSync.fetchLatestFromCloud(false))));
      await new Promise(resolve=>setTimeout(resolve,2500));
      assert.equal(puts,quiet.puts,'idle devices must not ping-pong snapshots');
      assert.equal(fullGets,quiet.fullGets,'own/duplicate events and nonce checks must avoid full downloads');
      assert.equal(probes,quiet.probes+3);
      assert.equal(objectGets,quiet.objectGets);
      await pc.page.locator('#btn-settings-modal').click();
      const download=pc.page.waitForEvent('download');await pc.page.locator('#btn-export-sync-diagnostics').click();
      const chunks=[];for await(const chunk of await (await download).createReadStream())chunks.push(chunk);
      const report=JSON.parse(Buffer.concat(chunks).toString());assert.equal(report.format,'todolist-sync-diagnostics');
      assert.ok(report.events.length<=60);assert.equal(JSON.stringify(report).includes('fixture-pin'),false);
      const mobileReport=await mobile.page.evaluate(()=>SyncDiagnostics.report());
      assert.ok(mobileReport.events.some(e=>e.outcome==='failed'&&e.status===503));assert.ok(mobileReport.events.some(e=>e.outcome==='recovered'));
      for(const app of apps) {assert.deepEqual(app.errors,[]);await app.context.close();}
      if(rejectPrint)assert.ok(rejectedOptions>0,'must actually exercise HTTP 400 option rejection');
      console.log('PASS '+entry+': '+(objectMode?'v4 objects':'v3 legacy')+', 3 devices, '+encryptedBytes+' encrypted bytes, SSE '+elapsed+'ms, delta '+JSON.stringify(delta)+', retry and restart; idle: 0 PUT, 0 full GET, 3 nonce checks');
    }
  } finally {
    await browser.close();for(const stream of streams)stream.end();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
