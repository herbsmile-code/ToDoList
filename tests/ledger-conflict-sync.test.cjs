const test = require('node:test');
const assert = require('node:assert/strict');
const {server, client, saved, sync, clone, key, localData} = require('./ai-sync-harness.cjs');
const {ledgerHarness, data} = require('./ledger-harness.cjs');
const stamp = (s,h) => {s.data.ledgerAuthority={source:'desktop-web',hash:h.context.protocol.hash(s.data.honeymoonData)};};

test('unrelated edits automatically resolve while receiving and displaying PC ledger without bank files', async () => {
  const h=ledgerHarness({months:{}}),s=server(saved(h));s.attach(h);await sync(h);
  h.store.totalVacationDays=16;h.store.saveLocalOnly();
  s.data.totalVacationDays=20;s.data.honeymoonData=clone(data);stamp(s,h);s.rev++;
  assert.equal(await sync(h),true);assert.deepEqual(saved(h).honeymoonData,data);
  assert.equal(saved(h).localSync.pending.length,0);assert.equal(h.store.saveStatus,'confirmed');
  assert.ok(saved(h).localSync.recovery.some(r=>r.local.totalVacationDays===16 && r.remote.totalVacationDays===20));
  h.context.UI.renderLedger();assert.equal(h.elements.get('stat-val-income-total').textContent,'8,000,000원');
  const reboot=client(s,h.values.get(key));assert.equal(reboot.store.localSyncInvalid,false);
  assert.equal(await sync(reboot),true);assert.deepEqual(saved(reboot).honeymoonData,data);
});

test('missing local ledger can display untagged legacy server data but cannot claim it was authored on PC', async () => {
  const s=server({...localData(),honeymoonData:data}),h=client(s);
  for(let n=0;n<3;n++){assert.equal(await sync(h),false);assert.equal(h.store.saveStatus,'pending');}
  assert.deepEqual(saved(h).honeymoonData,data);assert.equal(s.data.ledgerAuthority,undefined);
});

test('existing PC web ledger and pending PC edits override untagged server amounts with originals archived', async () => {
  for(const known of [true,false]) {
    const initial={...localData(),honeymoonData:{7:clone(data[7])}},s=server(initial),h=client(s,JSON.stringify(initial));
    if(known){await sync(h);h.store.honeymoonData[7].income.total=2345;h.store.saveLocalOnly();}
    const before=clone(h.store.honeymoonData);s.data.honeymoonData=clone(data);s.data.honeymoonData[7].income.total=6789;s.rev++;
    assert.equal(await sync(h),true);assert.deepEqual(saved(h).honeymoonData,before);assert.deepEqual(s.data.honeymoonData,before);
    assert.ok(saved(h).localSync.recovery.some(r=>r.remote.honeymoonData?.[7]?.income.total===6789));
    assert.equal(saved(h).localSync.pending.length,0);
  }
});

test('local persistence failure cannot replace in-memory or durable ledger', async () => {
  const initial={...localData(),honeymoonData:{}},s=server(initial),h=client(s,JSON.stringify(initial));await sync(h);
  s.data.honeymoonData=clone(data);stamp(s,h);s.rev++;
  const raw=h.values.get(key),before=clone(h.store.honeymoonData);h.context.localStorage.setItem=()=>{throw Error('quota');};
  assert.equal(await sync(h),false);assert.equal(h.values.get(key),raw);assert.deepEqual(clone(h.store.honeymoonData),before);
});

test('old pending zero template is archived before PC amounts replace it, then rendering never saves', async () => {
  const h=ledgerHarness({months:{}}),vm=require('node:vm');
  h.store.honeymoonData=vm.runInContext('JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA))',h.context);h.store.saveLocalOnly();
  const metadata=clone(h.store.localSync);for(const p of metadata.pending){delete p.source;delete p.changedAt;}
  h.store.commitLocal(h.store._committedData,metadata);
  const s=server({...saved(h),honeymoonData:clone(data)});delete s.data.localSync;stamp(s,h);s.attach(h);
  const original=clone(saved(h).honeymoonData);assert.equal(await sync(h),true);
  assert.deepEqual(saved(h).honeymoonData,data);assert.ok(saved(h).localSync.recovery.some(r=>JSON.stringify(r.local.honeymoonData)===JSON.stringify(original)));
  const raw=h.values.get(key),requests=h.requests.length;h.context.UI.renderLedger();
  assert.equal(h.elements.get('stat-val-income-total').textContent,'8,000,000원');
  assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,requests);assert.equal(h.store.localSync.pending.length,0);
});

test('ledger view uses the saved active data, including recorded zero amounts',()=>{
  for(const months of [data,{9:{hasData:true,income:{total:0,items:[]}}}]) {
    const h=ledgerHarness({months});h.store.localSync.conflicts=[{key:'["honeymoonData",null]',remote:data}];
    assert.deepEqual(clone(h.context.UI.getLedgerDisplayData().data),months);
  }
});
