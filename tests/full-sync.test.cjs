// Synthetic records and isolated storage only.
const test=require('node:test');
const assert=require('node:assert/strict');
const {harness,fixture,key}=require('./sync-harness.cjs');
const {server,sync,clone,saved}=require('./ai-sync-harness.cjs');
function device(s,role,extra={}) {
  const h=s.attach(harness(JSON.stringify({...clone(fixture),totalVacationDays:15}),{extras:extra}));
  h.context.protocol.clientKind=()=>role;
  return h;
}
test('every collection unions PC/mobile additions despite unrelated legacy differences; repeat delivery is idempotent',async()=>{
  const s=server({...clone(fixture),totalVacationDays:20}),pc=device(s,'desktop-web'),mobile=device(s,'mobile');
  const fields=pc.context.protocol.lists;
  for(const [h,label] of [[pc,'pc'],[mobile,'mobile']]) {
    for(const f of fields) {h.store[f] ||= [];h.store[f].push({id:f+'-'+label,title:label});}
    h.store.saveLocalOnly();
  }
  await sync(pc);await sync(mobile);await sync(pc);
  for(const h of [pc,mobile]) for(const f of fields) {
    assert.equal(h.store[f].filter(row=>row.id===f+'-pc').length,1,f);
    assert.equal(h.store[f].filter(row=>row.id===f+'-mobile').length,1,f);
  }
  const before=clone(s.data);await sync(mobile);await sync(pc);assert.deepEqual(s.data,before);
});
test('old separate storage migrates automatically once; original bytes and both bank and treasure records survive',async()=>{
  const s=server(clone(fixture));
  const extra=label=>({zentask_treasures:JSON.stringify([{id:'treasure-'+label,title:label}]),
    ledgerBankStatements:JSON.stringify([{date:'2026-09-26',desc:label,out:100,bank:'shinhan'}]),
    ledgerCategoryRules:JSON.stringify([{keyword:label,bank:'shinhan',category:'food'}])});
  const pc=device(s,'desktop-web',extra('pc')),mobile=device(s,'mobile',extra('mobile'));
  const archives=[];pc.context.SyncOriginals.preserve=async data=>{archives.push(clone(data));return true;};
  await sync(pc);await sync(mobile);await sync(pc);
  for(const f of ['treasures','ledgerBankStatements','ledgerCategoryRules']) {
    assert.equal(pc.store[f].length,2);assert.deepEqual(clone(pc.store[f]),clone(mobile.store[f]));
  }
  assert.equal(pc.values.get('zentask_treasures'),extra('pc').zentask_treasures);
  assert.equal(archives[0].auxiliary.treasures,extra('pc').zentask_treasures);
  assert.ok(archives[0].mainRaw);assert.equal(archives.length,2);
  pc.store.commitSyncedCollection('treasures',pc.store.treasures.filter(t=>t.title!=='pc'));await sync(pc);
  const reboot=s.attach(harness(pc.values.get(key),{extras:extra('pc')}));await sync(reboot);
  assert.equal(reboot.store.treasures.some(t=>t.title==='pc'),false);
  assert.equal(Object.hasOwn(s.data,'localSync'),false);
});
test('original backup failure blocks upload and main overwrite; retry resumes automatically',async()=>{
  const s=server(clone(fixture)),h=device(s,'desktop-web');const raw=h.values.get(key);
  h.context.SyncOriginals.preserve=async()=>{throw Error('quota');};
  assert.equal(await sync(h),false);assert.equal(h.requests.length,0);assert.equal(h.values.get(key),raw);
  assert.ok(h.context.cloudSync._retryTimer);
  h.context.SyncOriginals.preserve=async()=>true;assert.equal(await sync(h),true);
});
test('unreadable legacy collection is never replaced by an empty synchronized list',async()=>{
  const s=server(clone(fixture)),h=device(s,'desktop-web',{zentask_treasures:'broken JSON'});
  const raw=h.values.get(key);assert.equal(await sync(h),false);
  assert.equal(h.requests.length,0);assert.equal(h.values.get(key),raw);assert.equal(h.values.get('zentask_treasures'),'broken JSON');
});
test('full vault bytes over former 500KB cutoff reach server and other device',async()=>{
  const s=server(clone(fixture)),pc=device(s,'desktop-web'),mobile=device(s,'mobile');
  const file={id:'large-file',name:'original.bin',dataUrl:'data:application/octet-stream;base64,'+'A'.repeat(700000)};
  pc.context.cloudSync.getAllVaultFiles=async()=>[file];let received;
  mobile.context.cloudSync.saveVaultFiles=async list=>{received=clone(list);};
  assert.equal(await sync(pc),true);assert.equal(s.data.vaultFiles[0].dataUrl,file.dataUrl);
  assert.equal(await sync(mobile),true);assert.equal(received[0].dataUrl,file.dataUrl);
});
test('queued change during upload is automatically drained without manual sync or polling',async()=>{
  const s=server(clone(fixture)),h=device(s,'desktop-web');await sync(h);
  let newer;s.beforePUT=async()=>{newer=h.store.addNote('During upload');};
  h.store.addNote('Before upload');assert.equal(await sync(h),false);
  const timer=h.context.cloudSync._retryTimer;assert.ok(timer);
  await h.timers[timer-1]();await h.context.cloudSync._syncPromise;
  assert.ok(s.data.notes.some(n=>n.id===newer.id));assert.equal(h.store.localSync.pending.length,0);
});
test('conditional-write race schedules automatic read/merge rather than a permanent stop',async()=>{
  const s=server(clone(fixture)),h=device(s,'desktop-web');await sync(h);
  s.beforePUT=async()=>{s.data.notes.push({id:'other-device',content:'Other'});s.rev++;};
  const added=h.store.addNote('Local');assert.equal(await sync(h),false);
  const timer=h.context.cloudSync._retryTimer;assert.ok(timer);await h.timers[timer-1]();await h.context.cloudSync._syncPromise;
  assert.ok(s.data.notes.some(n=>n.id===added.id));assert.ok(h.store.notes.some(n=>n.id==='other-device'));
});
test('encrypted change listener watches only the nonce, coalesces notices and rejects an obsolete account stream',async()=>{
  const h=device(server(clone(fixture)),'desktop-web'),events={};let closed=false,url,checks=0;
  h.context.EventSource=class {constructor(value){url=value;}addEventListener(name,fn){events[name]=fn;}close(){closed=true;}};
  h.context.cloudSync.fetchLatestFromCloud=async()=>{checks++;};
  h.context.cloudSync.startRemoteListener();assert.ok(url.endsWith('/iv.json'));
  events.put();await h.timers.at(-1)();assert.equal(checks,1);
  h.context.cloudSync.pin='new-fixture-pin';events.put();assert.equal(closed,true);assert.equal(checks,1);
});
test('new centralized writes fail atomically and keep original bank and treasure input',async()=>{
  const h=device(server(clone(fixture)),'desktop-web');await sync(h);
  const raw=h.values.get(key);h.context.localStorage.setItem=()=>{throw Error('quota');};
  for(const field of ['treasures','ledgerBankStatements','ledgerCategoryRules']) {
    assert.equal(h.store.commitSyncedCollection(field,[{id:'new',title:'Input'}]),false);
    assert.equal(h.values.get(key),raw);assert.equal(h.store[field]?.some(row=>row.id==='new'),undefined);
  }
});

test('identical repeated IDs on either legacy device collapse to one without blocking new records',async()=>{
  const initial=clone(fixture);initial.notes.push(clone(initial.notes[0]));
  const s=server(initial),h=s.attach(harness(JSON.stringify(initial)));
  h.store.addNote('New alongside repeated original');assert.equal(await sync(h),true);
  assert.equal(h.store.notes.filter(row=>row.id==='user-note').length,1);
  assert.equal(s.data.notes.filter(row=>row.id==='user-note').length,1);
  assert.ok(s.data.notes.some(row=>row.content==='New alongside repeated original'));
});
