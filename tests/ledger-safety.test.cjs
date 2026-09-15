const test = require('node:test');
const assert = require('node:assert/strict');
const {ledgerHarness, data, julyBank, clone, key} = require('./ledger-harness.cjs');

test('viewing synced September totals with July-only bank files does not recalculate or save', () => {
  const h = ledgerHarness({bank: julyBank});
  const before = [...h.values], snapshot = clone(h.store.honeymoonData);
  h.store.selectedLedgerMonth = 9;
  h.context.UI.renderLedger();
  assert.equal(h.elements.get('stat-val-income-total').textContent, '8,000,000원');
  assert.match(h.elements.get('list-items-income').innerHTML, /8,000,000원/);
  assert.deepEqual(clone(h.store.honeymoonData), snapshot);
  assert.deepEqual([...h.values], before);
  assert.equal(h.writes.length, 0);
  assert.equal(h.requests.length, 0);
});

test('startup binding does not replace synced months from local bank files', () => {
  const h = ledgerHarness({bank: julyBank});
  const before = [...h.values], snapshot = clone(h.store.honeymoonData);
  h.context.bindBankAnalyzerEvents();
  assert.deepEqual(clone(h.store.honeymoonData), snapshot);
  assert.deepEqual([...h.values], before);
  assert.equal(h.writes.length, 0);
});

test('explicit bank recalculation updates July but preserves months absent from the bank file', () => {
  const h = ledgerHarness({bank: julyBank});
  h.context.syncBankToHoneymoonData();
  const saved = JSON.parse(h.values.get(key));
  assert.equal(saved.honeymoonData[7].income.total, 1000);
  assert.deepEqual(saved.honeymoonData[9], data[9]);
  assert.ok(saved.localSync.pending.length > 0);
  assert.equal(h.values.get('ledgerBankStatements'), JSON.stringify(julyBank));
});

test('mobile with no bank raw data still renders synced totals and grouped items', () => {
  const h = ledgerHarness();
  h.store.selectedLedgerMonth = 9;
  h.context.UI.renderLedger();
  for (const [id, amount] of Object.entries({'stat-val-income-total': '8,000,000원',
    'stat-val-expense-total': '775,000원', 'stat-val-savings-total': '1,000,000원',
    'stat-val-remaining-total': '6,225,000원', 'col-total-fixed': '650,000원'})) {
    assert.equal(h.elements.get(id).textContent, amount);
  }
  assert.match(h.elements.get('list-items-variable').innerHTML, /가짜 생활비/);
  assert.match(h.elements.get('bank-monthly-grid').innerHTML, /이 기기에는 은행 거래 원본이 없습니다/);
  assert.equal(h.writes.length, 0);
});

test('first view chooses an available month; later explicit empty month remains selected', () => {
  const h = ledgerHarness({months: {7: data[7]}});
  h.store.selectedLedgerMonth = 9;
  h.context.UI.renderLedger();
  assert.equal(h.store.selectedLedgerMonth, 7);
  assert.equal(h.elements.get('stat-val-income-total').textContent, '1,000원');
  h.context.UI.ledgerMonthInitialized = true;
  h.store.selectedLedgerMonth = 10;
  h.context.UI.renderLedger();
  assert.equal(h.store.selectedLedgerMonth, 10);
  assert.match(h.elements.get('ledger-month-data-status').textContent, /10월에는 저장된 내역이 없습니다/);
  assert.equal(h.writes.length, 0);
});

test('zero-valued recorded months and legacy item-only months count as available', () => {
  const h = ledgerHarness();
  const result = h.context.UI.getLedgerAvailableMonths({
    1: {hasData: true, income: {total: 0}},
    2: {income: {total: 0}}, 3: {fixed: {items: [{name: '가짜 항목', amount: 0}]}},
    4: {expense: {total: 123}}, 5: {income: {total: 'invalid'}}
  });
  assert.deepEqual(clone(result), [1, 3, 4]);
});

test('empty or unreadable bank files never overwrite synced amounts', () => {
  for (const rawBank of ['[]', '{broken', 'null', '{}']) {
    const h = ledgerHarness({rawBank}), before = [...h.values];
    h.context.syncBankToHoneymoonData();
    h.context.UI.renderLedger();
    assert.deepEqual(clone(h.store.honeymoonData), data);
    assert.deepEqual([...h.values], before);
    assert.equal(h.writes.length, 0);
  }
});

test('reading filtered or duplicate bank rows leaves raw bytes intact', () => {
  const rows = [...julyBank, ...julyBank, null, {date: 'account-no', in: 100},
    {date: '2026-07-01', in: 1000000000}, {date: '2026-07-02', desc: '12009', out: 10}];
  const h = ledgerHarness({bank: rows}), before = [...h.values];
  assert.deepEqual(clone(h.context.bankLoadStatements()), julyBank);
  assert.deepEqual([...h.values], before);
  assert.equal(h.writes.length, 0);
});

test('read/write protection flags also prevent bank recalculation from mutating memory', () => {
  for (const flag of ['localLoadFailed', 'localSyncInvalid', 'localWriteFailed', 'writerBlocked']) {
    const h = ledgerHarness({bank: julyBank}), before = [...h.values];
    h.store[flag] = true;
    h.context.syncBankToHoneymoonData();
    assert.deepEqual(clone(h.store.honeymoonData), data);
    assert.deepEqual([...h.values], before);
    assert.equal(h.writes.length, 0);
  }
});

test('a fresh empty view accepts later cloud data without persisting a zero replacement', async () => {
  const h = ledgerHarness({months: {}});
  let remote = {}, revision = 1, puts = 0;
  h.context.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') {
      assert.equal(options.headers['if-match'], String(revision));
      remote = JSON.parse(JSON.parse(options.body).payload); revision++; puts++;
    }
    const body = clone(remote), etag = String(revision);
    return {ok: true, status: 200, headers: {get: () => etag}, json: async () => body};
  };
  assert.equal(await h.context.cloudSync.pushTasksToCloud(true), true);
  h.context.UI.renderLedger();
  assert.match(h.elements.get('ledger-month-data-status').textContent, /아직/);
  remote.honeymoonData = clone(data); remote.syncRevision++; remote.updatedAt++; revision++;
  await h.context.cloudSync.fetchLatestFromCloud(true);
  const writesBefore = h.writes.length;
  h.context.UI.renderLedger();
  assert.equal(h.elements.get('stat-val-income-total').textContent, '8,000,000원');
  assert.deepEqual(clone(h.store.honeymoonData), data);
  assert.equal(h.store.localSync.pending.length, 0);
  assert.equal(puts, 1);
  assert.equal(h.writes.length, writesBefore);
});
