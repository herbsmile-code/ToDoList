const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {harness,fixture}=require('./sync-harness.cjs'),{server,sync}=require('./ai-sync-harness.cjs');
const code=fs.readFileSync(path.join(__dirname,'../js/sync/diagnostics.js'),'utf8');
const install=h=>{vm.runInContext(code,h.context);return h.context.SyncDiagnostics;};
test('diagnostics survive reload, cap history and exclude arbitrary/private fields',()=>{
  const h=harness(JSON.stringify(fixture)),d=install(h);
  for(let i=0;i<75;i++)d.record({outcome:'failed',stage:'upload',kind:'timeout',status:503,attempt:i,pin:'PRIVATE',url:'PRIVATE',message:'PRIVATE',content:'PRIVATE'});
  const exported=JSON.stringify(install(h).report());assert.equal(exported.includes('PRIVATE'),false);
  const events=JSON.parse(exported).events;assert.equal(events.length,60);assert.equal(events[0].attempt,15);
  h.values.set('todolist_jy_sync_diagnostics_v1',JSON.stringify([{outcome:'failed',stage:'PRIVATE',kind:'PRIVATE',status:'PRIVATE',content:'PRIVATE'}]));
  assert.equal(JSON.stringify(d.report()).includes('PRIVATE'),false);
});
test('diagnostic storage failure cannot stop sync and preserves an in-memory report',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),d=install(h),write=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(key,value)=>{if(key==='todolist_jy_sync_diagnostics_v1')throw Error('quota');write(key,value);};
  s.failPUT=true;h.store.addNote('Original input');assert.equal(await sync(h),false);
  assert.equal(d.report().events.at(-1).outcome,'failed');
  s.failPUT=false;assert.equal(await sync(h),true);assert.equal(d.report().events.at(-1).outcome,'recovered');
  assert.equal(h.store.localSync.pending.length,0);
});
test('an idle successful check does not continuously grow diagnostic history',async()=>{
  const s=server(fixture),h=s.attach(harness(JSON.stringify(fixture))),d=install(h);await sync(h);await sync(h);
  const count=d.report().events.length;await sync(h);await sync(h);assert.equal(d.report().events.length,count);
});
