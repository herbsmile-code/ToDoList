// Synthetic CPU comparison only. No real storage, IndexedDB, network or encryption.
// Run: node tests/sync-performance.cjs
const {performance}=require('node:perf_hooks');
const {execFileSync}=require('node:child_process');
const {harness,fixture,key,source}=require('./sync-harness.cjs');
const baseline=execFileSync('git',['show','6923a51:js/app.js'],{encoding:'utf8'});

async function measure(code,count,chars,photoChars) {
  const data=JSON.parse(JSON.stringify(fixture));
  data.notes=Array.from({length:count},(_,i)=>({id:'bench-'+i,content:'x'.repeat(chars),color:'pink'}));
  if(photoChars)data.photos=[{id:'bench-photo',dataUrl:'data:image/png;base64,'+'A'.repeat(photoChars)}];
  const h=harness(JSON.stringify(data),{code});let remote=null,revision=1,vaultReads=0,hashCalls=0;
  h.context.fetch=async(url,options={})=>{
    if(options.method==='PUT'){remote=JSON.parse(JSON.parse(options.body).payload);revision++;}
    return {ok:true,status:200,headers:{get:()=>String(revision)},json:async()=>remote===null?null:JSON.parse(JSON.stringify(remote))};
  };
  h.context.cloudSync.getAllVaultFiles=async()=>{vaultReads++;return [];};
  // Initial upload and one full server confirmation are required for both versions.
  await h.context.cloudSync.fetchLatestFromCloud();await h.context.cloudSync.fetchLatestFromCloud();
  h.writes.length=0;vaultReads=0;
  const hash=h.context.protocol.hash;
  h.context.protocol.hash=function(value){hashCalls++;return hash.call(this,value);};
  const times=[];
  for(let i=0;i<3;i++){
    const start=performance.now();
    if(!await h.context.cloudSync.fetchLatestFromCloud())throw Error('Fake sync failed');
    times.push(+(performance.now()-start).toFixed(1));
  }
  const result={idleMs:times,hashCallsPerCheck:hashCalls/3,localWritesPerCheck:h.writes.filter(k=>k===key).length/3,
    vaultReadsPerCheck:vaultReads/3};
  const start=performance.now();if(!h.store.addNote('A new memo'))throw Error('Fake save failed');
  result.localMemoSaveMs=+(performance.now()-start).toFixed(1);
  return result;
}
(async()=>{
  for(const [notes,chars,photoChars] of [[10,500,0],[100,1000,0],[500,2000,0],[100,1000,1000000]]) {
    console.log(JSON.stringify({notes,chars,photoChars,before:await measure(baseline,notes,chars,photoChars),
      after:await measure(source,notes,chars,photoChars)}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
