// Synthetic stores only. No existing browser profile or production access.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,fixture}=require('./sync-harness.cjs');
const {server,sync}=require('./ai-sync-harness.cjs');

test('cloud sync starts even if unrelated screen event binding fails',async()=>{
  const h=server(fixture).attach(harness(JSON.stringify(fixture)));
  h.context.bindBankAnalyzerEvents=()=>{throw Error('Synthetic screen failure');};
  h.context.initApp();
  assert.ok(h.context.cloudSync._syncPromise,'screen initialization must not gate synchronization');
  await h.context.cloudSync._syncPromise;
  assert.equal(h.store.saveStatus,'confirmed');
  assert.ok(h.body.banner,'screen error remains visible');
});

test('an outstanding download shows the current stage instead of generic pending',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture)));
  let resume,started;
  const reached=new Promise(resolve=>{started=resolve;});
  s.beforeGET=async()=>{started();await new Promise(resolve=>{resume=resolve;});};
  const work=sync(h);await reached;
  assert.equal(h.store.saveStatus,'syncing');
  assert.match(h.store.saveMessage,/서버.*받/);
  resume();assert.equal(await work,true);
});

test('a concurrent edit during download has a visible retry reason and preserves the edit',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture)));
  s.beforeGET=()=>h.store.addNote('Synthetic edit while downloading');
  assert.equal(await sync(h),false);
  assert.equal(h.store.saveStatus,'pending');
  assert.match(h.store.saveMessage,/재시도/);
  assert.ok(h.context.cloudSync._retryTimer);
  assert.equal(await sync(h),true);
  assert.ok(s.data.notes.some(n=>n.content==='Synthetic edit while downloading'));
});

test('conditional upload accepts an empty 204 acknowledgement without downloading the full payload again',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),fetch=h.context.fetch;
  h.context.fetch=async(url,options)=>{
    const response=await fetch(url,options);
    if(options.method==='PUT'&&response.ok) {
      assert.equal(new URL(url).searchParams.get('print'),'silent');
      assert.ok(options.headers['if-match']);
      return {...response,status:204,json:async()=>{throw Error('204 has no body');}};
    }
    return response;
  };
  const note=h.store.addNote('Synthetic silent upload');
  assert.equal(await sync(h),true);
  assert.ok(s.data.notes.some(n=>n.id===note.id));
  assert.equal(h.store.localSync.pending.length,0);
});
