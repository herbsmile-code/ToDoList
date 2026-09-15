const test = require('node:test');
const assert = require('node:assert/strict');
const {harness,fixture,key} = require('./sync-harness.cjs');

test('normal legacy data: startup preserves original bytes and memo objects', () => {
  const raw = JSON.stringify(fixture), h = harness(raw);
  assert.equal(h.store.localLoadFailed,false);
  assert.equal(h.values.get(key),raw);
  assert.equal(h.writes.includes(key),false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.store.notes)),fixture.notes);
  assert.deepEqual(JSON.parse(JSON.stringify(h.store.aiStudyNotes)),fixture.aiStudyNotes);
  assert.equal(h.store.localSync.baseline.known,false);
});

test('normal data: explicit save and cloud upload still work', async () => {
  const h = harness(JSON.stringify(fixture));
  h.store.addNote('New memo');
  assert.equal(JSON.parse(h.values.get(key)).notes[0].content, 'New memo');
  await h.context.cloudSync.pushTasksToCloud(true);
  assert.equal(h.requests.filter(r => r.options?.method === 'PUT').length, 1);
});

for (const [label, raw, options] of [
  ['missing key (new user)', null, {}],
  ['older data with missing optional fields', '{"notes":[]}', {}]
]) {
  test(label + ' remains supported', () => {
    const h = harness(raw, options);
    assert.equal(h.store.localLoadFailed, false);
    if (raw === null) assert.ok(h.writes.includes(key));
    else assert.equal(h.values.get(key),raw);
  });
}

for (const [label, raw, options] of [
  ['broken JSON', '{broken', {}], ['empty string', '', {}],
  ['null root', 'null', {}], ['array root', '[]', {}],
  ['scalar root', '42', {}],
  ['unreadable notes list', '{"notes":{"content":"Keep me"}}', {}],
  ['unreadable AI study list', '{"aiStudyNotes":null}', {}],
  ['storage read exception', JSON.stringify(fixture), { failRead: true }]
]) {
  test(label + ': original data survives all central save/sync entry points', async () => {
    const h = harness(raw, options);
    const snapshot = [...h.values];
    assert.equal(h.store.localLoadFailed, true);
    assert.deepEqual(h.writes, []);
    assert.equal(h.store.saveLocalOnly(), false);
    assert.equal(h.store.save(true), false);
    await h.context.cloudSync.pushTasksToCloud();
    await h.context.cloudSync.pushTasksToCloud(true);
    await h.context.cloudSync._executePushTasksToCloud();
    await h.context.cloudSync.fetchLatestFromCloud(true);
    assert.deepEqual([...h.values], snapshot);
    assert.equal(h.values.get(key), raw);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.requests, []);
    assert.deepEqual(h.timers, []);
    h.context.initApp();
    assert.equal(h.body.inert, true);
    assert.match(h.body.banner.textContent, /입력·저장·동기화를 중단/);
    assert.equal(h.context.bound, undefined);
    assert.equal(h.context.bankBound, undefined);
  });
}

test('a previously queued upload is blocked if a later read fails', async () => {
  const h = harness(JSON.stringify(fixture));
  await h.context.cloudSync.pushTasksToCloud();
  assert.equal(h.timers.length, 1);
  h.values.set(key, '{broken');
  assert.throws(() => h.store.loadLocalOnly());
  h.writes.length = 0;
  await h.timers[0]();
  await Promise.resolve();
  assert.equal(h.values.get(key), '{broken');
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.requests, []);
});

test('failure during encryption prevents a pending PUT', async () => {
  const h = harness(JSON.stringify(fixture));
  h.context.E2EESecurityEngine.encrypt = async data => {
    h.values.set(key, '{broken');
    assert.throws(() => h.store.loadLocalOnly());
    h.writes.length = 0;
    return data;
  };
  h.writes.length = 0;
  await h.context.cloudSync.pushTasksToCloud(true);
  assert.equal(h.requests.filter(r => r.options?.method === 'PUT').length, 0);
  assert.deepEqual(h.writes, []);
  assert.equal(h.context.cloudSync.isPushing, false);
});
