const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {harness,fixture,key} = require('./sync-harness.cjs');
const code = fs.readFileSync(path.join(__dirname,'../js/memo-transfer.js'),'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

// Only in-memory storage, fake files, fake encryption and fake Firebase are used.
function setup(raw=JSON.stringify(fixture), remote=fixture) {
  const h = harness(raw);
  h.context.location={protocol:'https:',hostname:'herbsmile-code.github.io',pathname:'/ToDoList/'};
  vm.runInContext(code,h.context);
  const server = {data:clone(remote),rev:1,failGET:false,failPUT:false,beforePUT:null};
  h.context.fetch = async (url,options={}) => {
    h.requests.push({url,options});
    const put = options.method === 'PUT';
    if (put && server.beforePUT) { const fn=server.beforePUT;server.beforePUT=null;await fn(); }
    const status = put ? server.failPUT ? 503 : options.headers['if-match'] !== String(server.rev) ? 412 : 200 : server.failGET ? 503 : 200;
    if (put && status === 200) {
      const body=JSON.parse(options.body); assert.equal(body.isEncrypted,true);
      server.data=JSON.parse(body.payload);server.rev++;
      assert.equal(Object.hasOwn(server.data,'localSync'),false);
    }
    const data=clone(server.data),etag=String(server.rev);
    return {ok:status===200,status,headers:{get:()=>etag},json:async()=>data};
  };
  const p=h.context.protocol, tool=h.context.MemoTransfer, cloud=h.context.cloudSync;
  const makeFile = data => tool.exportFile(JSON.stringify(data),p,p.hash([cloud.activeUrl,cloud.getStorageKey()]));
  const backups=[];
  const backup = async value => { backups.push(clone(value));return p.hash(JSON.stringify(value,null,2)); };
  return Object.assign(h,{server,p,tool,cloud,makeFile,backup,backups});
}
const putCount = h => h.requests.filter(r=>r.options.method==='PUT').length;
const saved = h => JSON.parse(h.values.get(key));
const addD = () => ({...clone(fixture),notes:[...clone(fixture.notes),{id:'D',content:'Latest local memo'}]});

test('export: exact existing raw bytes and all original fields are preserved without writes', () => {
  const raw=JSON.stringify({...fixture,unknownOldField:{keep:true},localSync:{damaged:true}},null,2);
  const h=setup(raw),before=[...h.values],writes=h.writes.length;
  const bundle=h.tool.exportFile(raw,h.p);
  assert.equal(bundle.raw,raw);
  assert.equal(h.tool.parseFile(JSON.stringify(bundle),h.p).bundle.raw,raw);
  assert.deepEqual([...h.values],before);assert.equal(h.writes.length,writes);assert.equal(h.requests.length,0);
  assert.equal(Object.hasOwn(bundle,'pin'),false);
});

test('invalid/corrupt files and duplicate IDs fail before any import', async () => {
  const h=setup(),raw=h.values.get(key),count=h.writes.length;
  for(const data of [null,[],{notes:null},{notes:[{id:'x'},{id:'x'}]},{notes:[{id:'$order'}]},{deletedItemIds:[1]}]) {
    assert.throws(()=>h.makeFile(data));
  }
  const file=h.makeFile(addD());file.raw+=' ';
  await assert.rejects(h.cloud.requestMemoTransfer(file,h.backup));
  assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,count);assert.equal(h.requests.length,0);
});

test('plan: local primary, web-only and remote-only notes and all differing originals survive; repeat is idempotent', () => {
  const h=setup();
  const local={notes:[{id:'same',content:'LOCAL'},{id:'D',content:'D'}]};
  const web={notes:[{id:'same',content:'WEB'},{id:'E',content:'E'}]};
  const remote={notes:[{id:'same',content:'SERVER'},{id:'F',content:'F'}]};
  const originals=JSON.stringify([local,web,remote]);
  const plan=h.tool.plan(web,remote,local,h.p.empty(),h.p);
  assert.equal(plan.data.notes.find(n=>n.id==='same').content,'LOCAL');
  assert.deepEqual(new Set(plan.data.notes.map(n=>n.content)),new Set(['LOCAL','WEB','SERVER','D','E','F']));
  const repeated=h.tool.plan(plan.data,plan.data,local,h.p.empty(),h.p);
  assert.equal(repeated.data.notes.length,6);
  assert.equal(JSON.stringify([local,web,remote]),originals);
});

test('tombstones and folder collisions: preserve deletion history and copy bodies with valid folder links', () => {
  const h=setup();
  const source={healthFolders:[{id:'f',name:'Local folder'}],healthNotes:[{id:'n',folder:'f',content:'Local'}],deletedItemIds:['old-local']};
  const web={healthFolders:[{id:'f',name:'Web folder'}],healthNotes:[{id:'n',folder:'f',content:'Web'}],deletedItemIds:['n']};
  const result=h.tool.plan(web,{deletedItemIds:['f']},source,h.p.empty(),h.p).data;
  assert.deepEqual(new Set(result.deletedItemIds),new Set(['n','f']));
  assert.equal(result.healthNotes.length,2);
  for(const note of result.healthNotes) {
    assert.notEqual(note.id,'n'); assert.notEqual(note.folder,'f');
    const folder=result.healthFolders.find(f=>f.id===note.folder);assert.ok(folder);
    assert.equal(folder.name,note.content==='Local'?'Local folder':'Web folder');
  }
});

test('copy-ID collisions never replace an unrelated existing memo', () => {
  const h=setup(),local={id:'same',content:'Local'},other={id:'same',content:'Other'};
  const collision={id:'memo-copy-'+h.p.hash(['notes',other]),content:'Unrelated original'};
  const result=h.tool.plan({notes:[other,collision]},{},{notes:[local]},h.p.empty(),h.p).data;
  assert.equal(result.notes.length,3);
  assert.equal(result.notes.find(n=>n.id===collision.id).content,collision.content);
});

test('successful transfer: backup proof precedes one local commit; only ordinary manual sync performs PUT and clears pending', async () => {
  const h=setup(JSON.stringify({...fixture,unknownOldField:'retain'}));
  const raw=h.values.get(key),writes=h.writes.length;
  const bundle=h.makeFile({...addD(),localSync:{damaged:'source metadata is never imported'}});
  await h.cloud.requestMemoTransfer(bundle,async protection=>{
    assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,writes);assert.equal(putCount(h),0);
    assert.equal(protection.webRaw,raw);assert.equal(protection.source.raw,bundle.raw);
    assert.deepEqual(clone(protection.server.decoded),fixture);
    return h.backup(protection);
  });
  assert.equal(putCount(h),0);assert.equal(saved(h).unknownOldField,'retain');
  assert.ok(saved(h).localSync.pending.length);assert.equal(h.store.saveStatus,'pending');
  assert.ok(saved(h).notes.some(n=>n.id==='D'));
  assert.equal(await h.cloud.requestManualSync(),true);
  assert.equal(putCount(h),1);assert.equal(saved(h).localSync.pending.length,0);
  assert.ok(h.server.data.notes.some(n=>n.id==='D'));assert.equal(h.store.saveStatus,'confirmed');
});

for(const [name,backup] of [
  ['cancelled backup',async()=>{throw Error('cancelled');}],
  ['failed file write',async()=>{throw Error('disk full');}],
  ['missing file readback proof',async()=>undefined],
  ['invalid file readback proof',async()=>'incorrect']
]) test(name+': no local mutation or upload',async()=>{
  const h=setup(),raw=h.values.get(key),writes=h.writes.length;
  await assert.rejects(h.cloud.requestMemoTransfer(h.makeFile(addD()),backup));
  assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,writes);assert.equal(putCount(h),0);
  assert.equal(h.store.notes.some(n=>n.id==='D'),false);
});

test('verified file: close and readback required; mismatched bytes or failed write reject',async()=>{
  const h=setup();let stored='',closed=false;
  const handle={createWritable:async()=>({write:async s=>{stored=s;},close:async()=>{closed=true;},abort:async()=>{}}),
    getFile:async()=>({text:async()=>{assert.ok(closed);return stored;}})};
  await h.tool.writeVerified(handle,'원본 💖');assert.equal(stored,'원본 💖');
  handle.getFile=async()=>({text:async()=> 'damaged'});
  await assert.rejects(h.tool.writeVerified(handle,'original'));
});

test('local quota failure after verified backup: no Store replacement and no PUT',async()=>{
  const h=setup(),raw=h.values.get(key);
  const set=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');set(k,v);};
  await assert.rejects(h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup));
  assert.equal(h.values.get(key),raw);assert.equal(h.store.notes.some(n=>n.id==='D'),false);
  assert.equal(putCount(h),0);assert.equal(h.backups.length,1);
});

test('Firebase failure, browser restart, stale remote and retry keep transferred originals and pending',async()=>{
  const h=setup();await h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup);
  h.server.failPUT=true;assert.equal(await h.cloud.requestManualSync(),false);
  const persisted=h.values.get(key),pending=clone(saved(h).localSync.pending);
  const reopened=setup(persisted,h.server.data);reopened.server.failPUT=true;
  assert.equal(await reopened.cloud.requestManualSync(),false);
  assert.deepEqual(saved(reopened).localSync.pending,pending);
  assert.ok(saved(reopened).notes.some(n=>n.id==='D'));
  reopened.server.failPUT=false;assert.equal(await reopened.cloud.requestManualSync(),true);
  assert.equal(saved(reopened).localSync.pending.length,0);
  assert.ok(reopened.server.data.notes.some(n=>n.id==='D'));
});

test('different server edit during backup remains a conflict, never a silent overwrite',async()=>{
  const h=setup(),source=addD();source.notes[0].content='Local priority';
  await h.cloud.requestMemoTransfer(h.makeFile(source),async protection=>{
    h.server.data.notes[0].content='Another PC changed this during backup';h.server.rev++;
    return h.backup(protection);
  });
  assert.equal(await h.cloud.requestManualSync(),false);assert.equal(putCount(h),0);
  assert.equal(h.server.data.notes[0].content,'Another PC changed this during backup');
  assert.ok(saved(h).notes.some(n=>n.content==='Local priority'));
  assert.ok(saved(h).localSync.conflicts.length);
});

test('server 412 during subsequent PUT preserves local import and newer server data',async()=>{
  const h=setup();await h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup);
  h.server.beforePUT=()=>{h.server.data.notes.push({id:'E',content:'Other PC'});h.server.rev++;};
  assert.equal(await h.cloud.requestManualSync(),false);
  assert.ok(saved(h).notes.some(n=>n.id==='D'));assert.ok(h.server.data.notes.some(n=>n.id==='E'));
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(await h.cloud.requestManualSync(),true);
  assert.ok(h.server.data.notes.some(n=>n.id==='D'));assert.ok(h.server.data.notes.some(n=>n.id==='E'));
});

for(const [name,change] of [
  ['live edit',h=>{h.store.notes[0].content='Typed during backup';}],
  ['other tab write',h=>h.values.set(key,'external newer raw')],
  ['account change',h=>{h.cloud.pin='different';}],
  ['lost writer lock',h=>{h.store.writerBlocked=true;}],
  ['vault change',h=>{h.cloud._vaultChangeVersion++;}]
]) test(name+' during backup aborts local apply and PUT',async()=>{
  const h=setup();let expected;
  await assert.rejects(h.cloud.requestMemoTransfer(h.makeFile(addD()),async protection=>{
    change(h);expected=h.values.get(key);return h.backup(protection);
  }));
  assert.equal(h.values.get(key),expected);assert.equal(putCount(h),0);
  assert.equal(h.store.notes.some(n=>n.id==='D'),false);
});

test('wrong target or damaged web metadata blocks the transfer before network',async()=>{
  for(const damaged of [false,true]) {
    const h=setup(JSON.stringify({...fixture,...(damaged?{localSync:{invalid:true}}:{})}));
    const file=h.makeFile(addD());if(!damaged)file.targetFingerprint='f'.repeat(64);
    const raw=h.values.get(key);
    await assert.rejects(h.cloud.requestMemoTransfer(file,h.backup));
    assert.equal(h.requests.length,0);assert.equal(h.values.get(key),raw);
  }
});

test('import is refused on the local HTML origin without reading or writing Firebase',async()=>{
  const h=setup(),raw=h.values.get(key),writes=h.writes.length;
  h.context.location={protocol:'file:',hostname:'',pathname:'/example/index.html'};
  await assert.rejects(h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup));
  assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,writes);assert.equal(h.requests.length,0);
});

test('manual clicks and automatic polling cannot race transfer; repeat clicks share one operation',async()=>{
  const h=setup();let release,entered;
  const ready=new Promise(r=>{entered=r;}),hold=new Promise(r=>{release=r;});
  const work=h.cloud.requestMemoTransfer(h.makeFile(addD()),async protection=>{entered();await hold;return h.backup(protection);});
  assert.equal(h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup),work);
  await ready;
  assert.equal(await h.cloud.requestManualSync(),false);
  assert.equal(await h.cloud.fetchLatestFromCloud(true),false);
  assert.equal(h.requests.length,1);release();await work;
  assert.equal(await h.cloud.requestManualSync(),true);
});

test('non-memo conflicts are reported for explicit selection; every original remains in protection backup',async()=>{
  const web={...fixture,customMenuNames:{notes:'WEB'}};
  const remote={...fixture,customMenuNames:{notes:'SERVER'}};
  const h=setup(JSON.stringify(web),remote);
  await h.cloud.requestMemoTransfer(h.makeFile(addD()),h.backup);
  assert.ok(h.backups[0].summary.otherConflicts.includes('customMenuNames'));
  assert.equal(JSON.parse(h.backups[0].webRaw).customMenuNames.notes,'WEB');
  assert.equal(h.backups[0].server.decoded.customMenuNames.notes,'SERVER');
  assert.equal(saved(h).customMenuNames.notes,'WEB');
  assert.equal(await h.cloud.requestManualSync(),true);
});
