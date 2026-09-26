// Disposable synthetic stores only; no personal data or production endpoint.
const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,harness,key}=require('./sync-harness.cjs');
const {server,sync,clone}=require('./ai-sync-harness.cjs');

test('a temporary local write failure automatically retries and merges both devices',async()=>{
  const s=server(clone(fixture)),h=s.attach(harness(JSON.stringify(fixture)));
  await sync(h);
  const note=h.store.addNote('Already saved PC memo');
  s.data.notes.push({id:'mobile-new',content:'Mobile original'});s.rev++;
  const set=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(k,v)=>{if(k===key)throw Object.assign(Error('Synthetic storage failure'),{name:'QuotaExceededError'});return set(k,v);};
  assert.equal(await sync(h),false);
  assert.equal(h.store.localWriteFailed,true);
  assert.ok(h.context.cloudSync._retryTimer,'local write failure must schedule a retry');
  const raw=h.values.get(key);
  assert.ok(JSON.parse(raw).notes.some(n=>n.id===note.id));
  h.context.localStorage.setItem=set;
  assert.equal(await sync(h),true,'restored local storage must not remain latched off');
  assert.ok(h.store.notes.some(n=>n.id==='mobile-new'));
  assert.ok(s.data.notes.some(n=>n.id===note.id));
});

test('large recovery originals are retained in IndexedDB before compact references reach localStorage',async()=>{
  const initial=clone(fixture),s=server(initial),h=s.attach(harness(JSON.stringify(initial)));
  await sync(h);
  const huge='Z'.repeat(300000),archives=[];
  h.context.SyncOriginals.preserve=async value=>{archives.push(clone(value));return true;};
  const meta=clone(h.store.localSync);
  meta.recovery=[{id:'auto-existing',key:'["vaultFiles","old"]',reason:'vault-original',local:{vaultFiles:[{id:'old',dataUrl:huge}]},remote:{vaultFiles:[]}}];
  assert.equal(h.store.commitLocal(h.store._committedData,meta),true);
  const set=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(k,v)=>{if(k===key&&v.length>50000)throw Object.assign(Error('Synthetic quota'),{name:'QuotaExceededError'});return set(k,v);};
  h.context.cloudSync._preparedTarget=null;
  assert.equal(await sync(h),true);
  assert.ok(h.values.get(key).length<50000);
  assert.ok(archives.some(value=>value.recovery?.local?.vaultFiles?.[0]?.dataUrl===huge));
  assert.ok(h.store.localSync.recovery.some(value=>value.id==='auto-existing'&&value.archiveId));
  assert.ok(s.data.notes.some(n=>n.id==='user-note'));
});

test('failed backup cannot discard an oversized recovery original or perform an upload',async()=>{
  const h=harness(JSON.stringify(fixture)),s=server(clone(fixture));s.attach(h);await sync(h);
  const meta=clone(h.store.localSync);meta.recovery=[{id:'auto-keep',local:{notes:[{id:'original',content:'K'.repeat(100000)}]},remote:{}}];
  h.store.commitLocal(h.store._committedData,meta);
  const raw=h.values.get(key);h.requests.length=0;h.context.cloudSync._preparedTarget=null;
  h.context.SyncOriginals.preserve=async()=>{throw Error('Synthetic IDB failure');};
  assert.equal(await sync(h),false);assert.equal(h.values.get(key),raw);
  assert.equal(h.requests.length,0);
});
