const test = require('node:test');
const assert = require('node:assert/strict');
const {server, client, saved, sync, clone, key, localData} = require('./ai-sync-harness.cjs');
const {ledgerHarness, data} = require('./ledger-harness.cjs');

test('unrelated conflict receives unchanged ledger and renders server amounts without bank files', async () => {
  const h = ledgerHarness({months: {}}), s = server(saved(h)); s.attach(h);
  assert.equal(await sync(h), true);
  h.store.totalVacationDays = 16; h.store.saveLocalOnly();
  const pending = clone(saved(h).localSync.pending);
  s.data.totalVacationDays = 20; s.data.honeymoonData = clone(data); s.rev++;
  assert.equal(await sync(h), false);
  assert.deepEqual(saved(h).honeymoonData, data);
  assert.deepEqual(saved(h).localSync.pending, pending);
  assert.equal(h.store.saveStatus, 'conflict');
  h.context.UI.renderLedger();
  assert.equal(h.elements.get('stat-val-income-total').textContent, '8,000,000원');
  assert.equal(h.elements.get('stat-val-expense-total').textContent, '775,000원');
  const reboot = client(s, h.values.get(key));
  assert.equal(reboot.store.localSyncInvalid, false);
  await sync(reboot);
  assert.deepEqual(saved(reboot).honeymoonData, data);
});

test('legacy missing ledger receives server ledger despite unrelated conflict', async () => {
  const s = server({...localData(), totalVacationDays: 20, honeymoonData: data}), h = client(s);
  assert.equal(await sync(h), false);
  assert.deepEqual(saved(h).honeymoonData, data);
});

test('a ledger with pending changes or unknown differing originals is never replaced', async () => {
  for (const known of [true, false]) {
    const initial = {...localData(), honeymoonData: {7: data[7]}}, s = server(initial), h = client(s, JSON.stringify(initial));
    if (known) {
      assert.equal(await sync(h), true);
      h.store.honeymoonData[7].income.total = 2345; h.store.saveLocalOnly();
    }
    h.store.saveLocalOnly();
    const before = clone(saved(h).honeymoonData), pending = clone(h.store.localSync.pending);
    s.data.honeymoonData = clone(data); s.data.totalVacationDays = 20; s.rev++;
    assert.equal(await sync(h), false);
    assert.deepEqual(saved(h).honeymoonData, before);
    assert.deepEqual(saved(h).localSync.pending, pending);
    assert.ok(saved(h).localSync.conflicts.some(c => c.key === '["honeymoonData",null]'));
  }
});

test('local persistence failure cannot replace the in-memory or durable ledger', async () => {
  const initial = {...localData(), honeymoonData: {}}, s = server(initial), h = client(s, JSON.stringify(initial));
  await sync(h); h.store.totalVacationDays = 16; h.store.saveLocalOnly();
  s.data.totalVacationDays = 20; s.data.honeymoonData = data; s.rev++;
  const raw = h.values.get(key), before = clone(h.store.honeymoonData);
  h.context.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(await sync(h), false);
  assert.equal(h.values.get(key), raw);
  assert.deepEqual(clone(h.store.honeymoonData), before);
});
