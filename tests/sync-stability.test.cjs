// Synthetic devices only. No existing browser or production data is read.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,fixture}=require('./sync-harness.cjs');
const {server,sync,clone}=require('./ai-sync-harness.cjs');

test('the same deletion set in different device orders converges without repeated writes',async()=>{
  const a={...clone(fixture),deletedItemIds:['deleted-a','deleted-b']};
  const b={...clone(fixture),deletedItemIds:['deleted-b','deleted-a']};
  const s=server(a),pc=s.attach(harness(JSON.stringify(a))),mobile=s.attach(harness(JSON.stringify(b)));
  await sync(pc);await sync(mobile);await sync(pc);await sync(mobile);
  const revision=s.rev;
  for(let i=0;i<3;i++){assert.equal(await sync(pc),true);assert.equal(await sync(mobile),true);}
  assert.equal(s.rev,revision,'unchanged deletion sets must not ping-pong full encrypted snapshots');
  assert.deepEqual([...pc.store.deletedItemIds],[...mobile.store.deletedItemIds]);
});

function nonceDevice() {
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture)));
  let nonce=Buffer.alloc(12,1).toString('base64'),counter=2;
  const next=()=>Buffer.alloc(12,counter++).toString('base64');
  h.context.E2EESecurityEngine.encrypt=async data=>({isEncrypted:true,iv:next(),payload:JSON.stringify(data)});
  const fetch=h.context.fetch;
  h.context.fetch=async(url,options={})=>{
    if(url.endsWith('/iv.json')) {
      h.requests.push({url,options});
      const value=nonce;
      if(h.onProbe){const fn=h.onProbe;h.onProbe=null;await fn();}
      return {ok:true,status:200,headers:{get:()=>null},json:async()=>value};
    }
    if(options.method==='PUT' && h.onUpload) h.onUpload(JSON.parse(options.body).iv);
    const response=await fetch(url,options),body=await response.json();
    if(options.method==='PUT' && response.ok) nonce=JSON.parse(options.body).iv;
    if(h.loseResponse && options.method==='PUT' && response.ok){h.loseResponse=false;throw Error('lost acknowledgement');}
    return {...response,json:async()=>({...body,iv:nonce})};
  };
  return {s,h,cloud:h.context.cloudSync,nonce:()=>nonce,advance:()=>{nonce=next();s.rev++;}};
}
function listen(h) {
  const events={};
  h.context.EventSource=class {addEventListener(name,fn){events[name]=fn;}close(){}};
  h.context.cloudSync.startRemoteListener();return events;
}
const notice=iv=>({data:JSON.stringify({path:'/',data:iv})});

test('confirmed idle checks read only the nonce, with no full download, merge or file read',async()=>{
  const {h,cloud}=nonceDevice();assert.equal(await sync(h),true);
  const raw=h.store._lastLocalRaw;h.requests.length=0;
  h.context.E2EESecurityEngine.decrypt=()=>{throw Error('unexpected decrypt');};
  cloud.getAllVaultFiles=()=>{throw Error('unexpected file read');};
  for(let i=0;i<3;i++)assert.equal(await cloud.fetchLatestFromCloud(false),true);
  assert.equal(h.requests.length,3);assert.ok(h.requests.every(r=>r.url.endsWith('/iv.json')));
  assert.equal(h.store._lastLocalRaw,raw);assert.equal(h.store.saveStatus,'confirmed');
});

test('a changed nonce receives a foreign edit and periodic validation still reads the full body',async()=>{
  const {s,h,cloud,advance}=nonceDevice();await sync(h);h.requests.length=0;
  s.data.notes.push({id:'foreign',content:'New on another device'});advance();
  assert.equal(await cloud.fetchLatestFromCloud(false),true);
  assert.ok(h.store.notes.some(r=>r.id==='foreign'));
  assert.ok(h.requests.some(r=>!r.url.endsWith('/iv.json') && r.options.method!=='PUT'));
  cloud._idleSyncCache.checkedAt-=300000;h.requests.length=0;
  assert.equal(await cloud.fetchLatestFromCloud(false),true);
  assert.ok(h.requests.some(r=>!r.url.endsWith('/iv.json')));
});

test('own PUT echoes and repeated SSE values do not trigger another full synchronization',async()=>{
  const {h,cloud,nonce}=nonceDevice(),events=listen(h);
  h.onUpload=iv=>events.put(notice(iv));
  assert.equal(await sync(h),true);
  assert.equal(cloud._syncAgain,false);assert.equal(cloud._remoteNoticeTimer,null);
  events.put(notice(nonce()));events.patch(notice(nonce()));
  assert.equal(cloud._remoteNoticeTimer,null);
  let checks=0;cloud.fetchLatestFromCloud=async()=>{checks++;};
  events.put(notice(Buffer.alloc(12,99).toString('base64')));await h.timers.at(-1)();
  assert.equal(checks,1);
});

test('an own SSE echo is never treated as a PUT acknowledgement; lost responses retain the outbox',async()=>{
  const {h,cloud,nonce}=nonceDevice(),events=listen(h);await sync(h);
  const added=h.store.addNote('Keep this after a lost response');
  h.onUpload=iv=>events.put(notice(iv));h.loseResponse=true;
  assert.equal(await sync(h),false);
  assert.ok(h.store.localSync.pending.length);assert.equal(cloud._uploadNonce,null);
  assert.notEqual(h.store.saveStatus,'confirmed');
  events.put(notice(nonce()));assert.ok(cloud._remoteNoticeTimer);
  assert.equal(await sync(h),true);
  assert.equal(h.store.notes.filter(r=>r.id===added.id).length,1);assert.equal(h.store.localSync.pending.length,0);
});

for(const mode of ['saved edit','live edit','vault write','writer lost','account changed','local failure','durable bytes replaced']) {
  test('nonce check cannot acknowledge stale local state: '+mode,async()=>{
    const {h,cloud}=nonceDevice();await sync(h);const before=h.store._lastLocalRaw;
    h.onProbe=()=>{
      if(mode==='saved edit')h.store.addNote('Changed during the nonce check');
      if(mode==='live edit')h.store.notes[0].content='Unsaved newer text';
      if(mode==='vault write')cloud.beginVaultWrite()();
      if(mode==='writer lost')h.store.writerBlocked=true;
      if(mode==='account changed')cloud.pin='another-fixture-pin';
      if(mode==='local failure'){h.store.localWriteFailed=true;h.store.setSaveStatus('failed');}
      if(mode==='durable bytes replaced')h.values.set('todolist_jy_data_v39',before+' ');
    };
    assert.equal(await cloud.fetchLatestFromCloud(false),false);
    if(mode==='saved edit'){assert.ok(h.store.localSync.pending.length);assert.ok(h.store.notes.some(n=>n.content==='Changed during the nonce check'));}
    if(mode==='live edit')assert.equal(h.store.notes[0].content,'Unsaved newer text');
    assert.equal(cloud._uploadNonce,null);
  });
}

test('native asynchronous digest retains canonical SHA-256 compatibility and slot cache notices nested edits',async()=>{
  const h=harness(JSON.stringify(fixture)),p=h.context.protocol;
  h.context.crypto=require('node:crypto').webcrypto;
  for(const value of [null,{},['한글','🙂'],{z:0,a:'A'.repeat(2000000)}])assert.equal(await p.hashAsync(value),p.hash(value));
  const slots=p.slots({notes:[{id:'memo',content:'before'}]}),key='["notes","memo"]';
  const before=p.state(slots,key);slots[key].content='after';
  assert.notEqual(p.state(slots,key),before);assert.equal(p.state(slots,key),p.hash(slots[key]));
});

test('an edit during asynchronous comparison stays pending until a fresh merge uploads it',async()=>{
  const {s,h,cloud}=nonceDevice();await sync(h);
  const hash=h.context.protocol.hashAsync;let once=true;
  h.context.protocol.hashAsync=async function(value){
    const result=await hash.call(this,value);
    if(once){once=false;h.store.addNote('Edited while comparing');}return result;
  };
  const rev=s.rev;assert.equal(await sync(h),false);assert.equal(s.rev,rev);
  assert.ok(h.store.localSync.pending.length);
  assert.equal(await sync(h),true);assert.ok(s.data.notes.some(n=>n.content==='Edited while comparing'));
  assert.equal(cloud._uploadNonce,null);
});

test('equal vault bytes in a different listing order do not rewrite IndexedDB',async()=>{
  const files=[{id:'a',createdAt:1,dataUrl:'data:original-a'},{id:'b',createdAt:2,dataUrl:'data:original-b'}];
  const s=server({...clone(fixture),vaultFiles:[...files].reverse()}),h=s.attach(harness(JSON.stringify(fixture)));
  h.context.cloudSync.getAllVaultFiles=async()=>clone(files);
  h.context.cloudSync.saveVaultFiles=()=>{throw Error('an order-only difference must not rewrite files');};
  assert.equal(await sync(h),true);assert.equal(await sync(h),true);
});

test('a file write during durable acknowledgement cannot seed an idle cache or clear newer work',async()=>{
  const {h,cloud}=nonceDevice();await sync(h);h.store.addNote('New pending memo');
  const commit=cloud.commitSyncLocal.bind(cloud);let once=true;
  cloud.commitSyncLocal=async(data,meta,guard)=>{
    if(guard && once){once=false;cloud.beginVaultWrite()();}
    return commit(data,meta,guard);
  };
  assert.equal(await sync(h),false);assert.equal(cloud._idleSyncCache,null);
  assert.ok(h.store.localSync.pending.length);
  assert.equal(await sync(h),true);assert.equal(h.store.localSync.pending.length,0);
});

test('native large-record priming preserves synchronous hashes and cannot hide later edits',async()=>{
  const h=harness(JSON.stringify(fixture)),p=h.context.protocol;h.context.crypto=require('node:crypto').webcrypto;
  const data={notes:[{id:'large',content:'본문'.repeat(30000)}]};const before=p.hash(data.notes[0]);
  await p.primeHashes(data);assert.equal(p.hash(data.notes[0]),before);assert.ok(p._largeHashes.size);
  data.notes[0].content+=' changed';assert.notEqual(p.hash(data.notes[0]),before);
  const after=p.hash(data.notes[0]);await p.primeHashes(data);assert.equal(p.hash(data.notes[0]),after);
});
