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

test('a rejected response option automatically retries a plain PUT with the same condition and encrypted bytes',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),fetch=h.context.fetch,attempts=[];
  h.context.fetch=async(url,options)=>{
    if(options.method==='PUT') {
      attempts.push({url,condition:options.headers['if-match'],body:options.body});
      if(new URL(url).searchParams.has('print'))return {ok:false,status:400,headers:{get:()=>null},json:async()=>({error:'Unsupported query parameter print'})};
    }
    return fetch(url,options);
  };
  const note=h.store.addNote('Synthetic compatibility edit');
  assert.equal(await sync(h),true);
  assert.equal(attempts.length,2);assert.equal(attempts[0].condition,attempts[1].condition);assert.equal(attempts[0].body,attempts[1].body);
  assert.ok(s.data.notes.some(n=>n.id===note.id));
  h.store.addNote('Second edit');assert.equal(await sync(h),true);
  assert.equal(new URL(attempts.at(-1).url).search,'');
});

test('a permanent size rejection retains pending data and reports a safe reason without server text',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),fetch=h.context.fetch;
  h.context.fetch=async(url,options)=>options.method==='PUT'?
    {ok:false,status:400,headers:{get:()=>null},json:async()=>({error:'Data size exceeds the maximum size; private-fixture-detail'})}:fetch(url,options);
  const note=h.store.addNote('Pending original');assert.equal(await sync(h),false);
  assert.ok(h.store.localSync.pending.length);assert.ok(h.store.notes.some(n=>n.id===note.id));
  assert.match(h.store.saveMessage,/크기 제한/);assert.doesNotMatch(h.store.saveMessage,/private-fixture-detail/);
  assert.equal(h.context.cloudSync.lastSyncFailure.kind,'size-limit');
});

test('a concurrent server edit during the compatible retry still gets 412 and is merged on retry',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),fetch=h.context.fetch;
  h.context.fetch=async(url,options)=>options.method==='PUT'&&new URL(url).searchParams.has('print')?
    {ok:false,status:400,headers:{get:()=>null},json:async()=>({error:'Unsupported print'})}:fetch(url,options);
  s.beforePUT=()=>{s.data.notes.push({id:'other-device',content:'Concurrent original'});s.rev++;};
  const note=h.store.addNote('Local original');assert.equal(await sync(h),false);
  assert.ok(h.store.localSync.pending.length);
  assert.equal(await sync(h),true);
  for(const id of [note.id,'other-device'])assert.ok(s.data.notes.some(n=>n.id===id));
});

test('a new local edit after rejected options cannot be acknowledged by the old fallback request',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),fetch=h.context.fetch;let puts=0;
  h.context.fetch=async(url,options)=>{
    if(options.method==='PUT'&&++puts===1){
      h.store.addNote('Late original');
      return {ok:false,status:400,headers:{get:()=>null},json:async()=>({error:'Unsupported print'})};
    }
    return fetch(url,options);
  };
  h.store.addNote('First original');assert.equal(await sync(h),false);assert.equal(puts,1);
  assert.ok(h.store.localSync.pending.length);assert.equal(await sync(h),true);
  for(const content of ['First original','Late original'])assert.ok(s.data.notes.some(n=>n.content===content));
});
