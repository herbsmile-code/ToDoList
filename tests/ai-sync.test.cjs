const test = require('node:test');
const assert = require('node:assert/strict');
const {server,client,saved,puts,sync,clone,key,localData,remoteData} = require('./ai-sync-harness.cjs');

test('reproduction: unrelated vacation conflict no longer blocks a new remote AI note', async () => {
  const s=server(),h=client(s),remoteBefore=clone(s.data),localBefore=localData();
  assert.equal(await sync(h),true);
  assert.deepEqual(saved(h).aiStudyNotes,s.data.aiStudyNotes);
  assert.deepEqual(saved(h).notes,localBefore.notes);
  assert.equal(saved(h).totalVacationDays,20);
  assert.ok(saved(h).localSync.recovery.some(r=>r.local.totalVacationDays===15 && r.remote.totalVacationDays===20));
  assert.equal(h.store.saveStatus,'confirmed');
  assert.deepEqual(s.data.aiStudyNotes,remoteBefore.aiStudyNotes);
});

test('partial receive persists across restart, repeats without duplication and keeps metadata valid', async () => {
  const s=server(),h=client(s);await sync(h);
  const reboot=client(s,h.values.get(key));
  assert.equal(reboot.store.localSyncInvalid,false);
  assert.equal(reboot.store.aiStudyNotes.length,1);
  await sync(reboot);await sync(reboot);
  assert.deepEqual(saved(reboot).aiStudyNotes,s.data.aiStudyNotes);
  assert.equal(puts(reboot).length,0);
});

async function knownConflict() {
  const s=server(localData()),h=client(s);
  assert.equal(await sync(h),true);
  h.store.totalVacationDays=16;
  h.store.aiStudyNotes.push({id:'local-D',title:'Unsent D',content:'Keep latest D'});
  assert.equal(h.store.saveLocalOnly(),true);
  s.data.totalVacationDays=20;s.data.aiStudyNotes=remoteData().aiStudyNotes;s.rev++;
  return {s,h};
}

test('known baseline: D and E converge, automatic choices archive originals and clear acknowledged pending', async () => {
  const {s,h}=await knownConflict(),pending=clone(h.store.localSync.pending),beforePuts=puts(h).length;
  assert.equal(await sync(h),true);
  const after=saved(h);
  assert.equal(after.aiStudyNotes.find(n=>n.id==='local-D').content,'Keep latest D');
  assert.equal(after.aiStudyNotes.find(n=>n.id==='remote-ai').content,'Original remote AI body');
  assert.equal(after.localSync.pending.length,0);
  assert.ok(s.data.aiStudyNotes.some(n=>n.id==='local-D'));
  assert.ok(after.localSync.recovery.some(r=>r.local.totalVacationDays===16 && r.remote.totalVacationDays===20));
  const reboot=client(s,h.values.get(key));
  assert.equal(reboot.store.localSyncInvalid,false);
  assert.equal(await sync(reboot),true);
  assert.equal(puts(h).length,beforePuts+1);assert.equal(puts(reboot).length,0);
});

test('same-ID AI conflict preserves both bodies while a different new note can arrive', async () => {
  const local=localData();local.aiStudyNotes=[{id:'remote-ai',title:'Local title',content:'Local original'}];
  const s=server();s.data.aiStudyNotes.push({id:'remote-E',title:'E',content:'New E'});
  const h=client(s,JSON.stringify(local));
  assert.equal(await sync(h),true);
  assert.equal(saved(h).aiStudyNotes.find(n=>n.id==='remote-ai').content,'Original remote AI body');
  assert.equal(saved(h).aiStudyNotes.find(n=>n.id==='remote-E').content,'New E');
  assert.ok(saved(h).localSync.recovery.some(c=>c.local.aiStudyNotes?.[0]?.content==='Local original' && c.remote.aiStudyNotes?.[0]?.content==='Original remote AI body'));
});

test('local and remote tombstones prevent resurrection of incoming notes', async () => {
  for(const side of ['local','remote']) {
    const local=localData(),s=server();
    (side==='local'?local:s.data).deletedItemIds.push('remote-ai');
    const h=client(s,JSON.stringify(local));await sync(h);
    assert.deepEqual(saved(h).aiStudyNotes,[]);
    assert.ok(saved(h).deletedItemIds.includes('remote-ai'));
    assert.ok(s.data.deletedItemIds.includes('remote-ai'));
    assert.ok(!s.data.aiStudyNotes.some(n=>n.id==='remote-ai'));
  }
});

test('an explicit pending removal is not inferred to be a missing downloaded note', async () => {
  const initial=localData();initial.aiStudyNotes=remoteData().aiStudyNotes;
  const s=server(initial),h=client(s,JSON.stringify(initial));await sync(h);
  h.store.aiStudyNotes=[];h.store.totalVacationDays=16;h.store.saveLocalOnly();
  s.data.totalVacationDays=20;s.rev++;
  assert.equal(await sync(h),true);
  assert.deepEqual(saved(h).aiStudyNotes,[]);
  assert.ok(!s.data.aiStudyNotes.some(n=>n.id==='remote-ai'));
  assert.ok(!saved(h).localSync.pending.some(p=>p.key==='["aiStudyNotes","remote-ai"]'));
});

test('partial local save failure leaves original memory, durable data and pending intact', async () => {
  const {s,h}=await knownConflict();
  const before=h.values.get(key),ai=clone(h.store.aiStudyNotes);
  s.beforeGET=()=>{h.context.localStorage.setItem=()=>{throw Error('QuotaExceededError');};};
  assert.equal(await sync(h),false);
  assert.equal(h.values.get(key),before);
  assert.deepEqual(clone(h.store.aiStudyNotes),ai);
  assert.equal(h.store.saveStatus,'failed');
});

test('failed GET and failed decryption cannot import notes or upload a replacement', async () => {
  for(const failure of ['GET','decrypt']) {
    const s=server(),h=client(s);
    if(failure==='GET')s.failGET=true;
    else h.context.E2EESecurityEngine.decrypt=async()=>{throw Error('DECRYPT_FAILED');};
    assert.equal(await sync(h),false);
    assert.deepEqual(saved(h).aiStudyNotes,[]);assert.equal(puts(h).length,0);
    assert.equal(h.store.saveStatus,'syncFailed');
  }
});

test('session change during decryption prevents partial receive into the wrong session', async () => {
  const s=server(),h=client(s),decrypt=h.context.E2EESecurityEngine.decrypt;
  h.context.E2EESecurityEngine.decrypt=async data=>{
    h.context.cloudSync.pin='different-fake-pin';return decrypt(data);
  };
  assert.equal(await sync(h),false);assert.deepEqual(saved(h).aiStudyNotes,[]);
  assert.equal(puts(h).length,0);
});

test('a local edit during GET defers partial receive without erasing the new edit', async () => {
  const s=server(),h=client(s);
  s.beforeGET=()=>{h.store.aiStudyNotes.push({id:'D',content:'During request'});h.store.saveLocalOnly();};
  assert.equal(await sync(h),false);
  assert.deepEqual(saved(h).aiStudyNotes,[{id:'D',content:'During request'}]);
  assert.equal(await sync(h),true);
  assert.equal(saved(h).aiStudyNotes.length,2);
  assert.equal(client(s,h.values.get(key)).store.localSyncInvalid,false);
});

test('after conflict resolution, failed PUT retains pending; confirmed retry syncs D and E once', async () => {
  const {s,h}=await knownConflict();await sync(h);
  h.store.aiStudyNotes.push({id:'new-pending',content:'Added after partial acknowledgement'});h.store.saveLocalOnly();
  s.data.totalVacationDays=16;s.rev++;s.failPUT=true;
  assert.equal(await sync(h),false);assert.ok(saved(h).localSync.pending.length);
  s.failPUT=false;
  assert.equal(await sync(h),true);
  assert.deepEqual(new Set(s.data.aiStudyNotes.map(n=>n.id)),new Set(['local-D','remote-ai','new-pending']));
  assert.equal(saved(h).localSync.pending.length,0);assert.equal(h.store.saveStatus,'confirmed');
  assert.equal(Object.hasOwn(s.data,'localSync'),false);
});

test('fresh browser still receives existing server AI notes through ordinary full sync', async () => {
  const s=server(),h=client(s,null);
  assert.equal(await sync(h),true);
  assert.ok(saved(h).aiStudyNotes.some(n=>n.id==='remote-ai'));
  assert.equal(h.store.saveStatus,'confirmed');
});

test('login distinguishes accepted credentials from failed data synchronization', async () => {
  const s=server(),h=client(s);s.failGET=true;
  const result=await h.context.cloudSync.verifyAndLogin('on3257','fake-test-pin');
  assert.equal(result.success,true);assert.equal(result.synced,false);
  assert.match(result.message,/아직 완료되지/);assert.equal(h.store.saveStatus,'syncFailed');
  assert.equal(puts(h).length,0);
});

test('login automatically preserves differing originals and confirms received AI notes', async () => {
  const s=server(),h=client(s);
  const result=await h.context.cloudSync.verifyAndLogin('on3257','fake-test-pin');
  assert.equal(result.success,true);assert.equal(result.synced,true);
  assert.deepEqual(saved(h).aiStudyNotes,s.data.aiStudyNotes);
});

test('only fully confirmed login returns synced true', async () => {
  const s=server(localData()),h=client(s);
  const result=await h.context.cloudSync.verifyAndLogin('on3257','fake-test-pin');
  assert.equal(result.success,true);assert.equal(result.synced,true);
  assert.equal(h.store.saveStatus,'confirmed');
});

test('auth read failure, malformed auth and wrong password leave session/data untouched; no registration PUT', async () => {
  for(const mode of ['503','network','invalid','password']) {
    const s=server(),h=client(s),before=[...h.values],pin=h.context.cloudSync.pin;
    if(mode==='503')s.authStatus=503;
    if(mode==='invalid')s.auth={};
    if(mode==='password')s.auth.pinHash='different-fake-hash';
    if(mode==='network')h.context.fetch=async()=>{throw Error('offline');};
    const result=await h.context.cloudSync.verifyAndLogin('on3257','fake-test-pin');
    assert.equal(result.success,false);assert.deepEqual([...h.values],before);
    assert.equal(h.context.cloudSync.pin,pin);
    assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
  }
});

test('first registration needs a successful empty GET and conditional PUT acknowledgement', async () => {
  for(const status of [200,412,503]) {
    const s=server(localData()),h=client(s),before=[...h.values];
    s.auth=null;s.registerStatus=status;
    const result=await h.context.cloudSync.verifyAndLogin('on3257','fake-test-pin');
    assert.equal(result.success,status===200);
    if(status!==200)assert.deepEqual([...h.values],before);
    const registration=h.requests.find(r=>r.url.includes('/auth_registry/') && r.options.method==='PUT');
    assert.equal(registration.options.headers['if-match'],'auth-1');
  }
});
