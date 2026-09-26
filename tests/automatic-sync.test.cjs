// Synthetic storage/server only. No production profiles, data or Firebase.
const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./sync-harness.cjs');
const {server,client,saved,sync,clone,key,puts}=require('./ai-sync-harness.cjs');
const epoch=1900000000000;
const initial=()=>({...clone(fixture),totalVacationDays:15,
  healthFolders:[{id:'all',name:'All'},{id:'general',name:'General'}],
  honeymoonData:{9:{hasData:true,income:{total:100}}}});
function device(s,data,kind='desktop-web',time=epoch) {
  const h=client(s,typeof data==='string'?data:JSON.stringify(data));
  h.context.protocol.clientKind=()=>kind;h.context.Date.now=()=>time;
  h.context.cloudSync.pushTasksToCloud=()=>false;return h;
}
async function pair() {
  const data=initial(),s=server(data),pc=device(s,data);assert.equal(await sync(pc),true);
  return {s,pc,mobile:device(s,pc.values.get(key),'mobile',epoch+10000)};
}
test('PC web ledger is authoritative; a newer mobile amount is archived and cannot overwrite it',async()=>{
  const {s,pc,mobile}=await pair();
  pc.store.honeymoonData[9].income.total=900;pc.store.saveLocalOnly();
  mobile.store.honeymoonData[9].income.total=9999;mobile.store.saveLocalOnly();
  assert.equal(await sync(pc),true);assert.equal(await sync(mobile),true);
  assert.equal(s.data.honeymoonData[9].income.total,900);assert.equal(mobile.store.honeymoonData[9].income.total,900);
  assert.ok(saved(mobile).localSync.recovery.some(r=>r.local?.honeymoonData?.[9]?.income.total===9999));
  assert.equal(saved(mobile).localSync.pending.length,0);
  assert.equal(s.data.ledgerAuthority.source,'desktop-web');
});
test('untagged cloud ledger is not mistaken for a PC original; existing PC amounts establish the source',async()=>{
  const pcData=initial(),remote={...clone(pcData),honeymoonData:{9:{hasData:true,income:{total:22}}}};
  const s=server(remote),mobile=device(s,remote,'mobile'),pc=device(s,pcData);
  await sync(mobile);assert.equal(s.data.ledgerAuthority,undefined);
  await sync(pc);await sync(mobile);
  assert.equal(s.data.honeymoonData[9].income.total,100);assert.equal(mobile.store.honeymoonData[9].income.total,100);
  assert.ok(saved(pc).localSync.recovery.some(r=>r.remote?.honeymoonData?.[9]?.income.total===22));
});
test('new mobile memos and health records synchronize while mobile ledger differences are preserved automatically',async()=>{
  const {s,pc,mobile}=await pair();
  mobile.store.honeymoonData[9].income.total=222;mobile.store.saveLocalOnly();
  const note=mobile.store.addNote('Mobile memo');const health=mobile.store.addHealthNote({title:'Mobile health',folder:'general',content:'Original'});
  assert.equal(await sync(mobile),true);assert.equal(await sync(pc),true);
  assert.ok(pc.store.notes.some(n=>n.id===note.id));assert.ok(pc.store.healthNotes.some(n=>n.id===health.id));
  assert.equal(s.data.honeymoonData[9].income.total,100);
});

test('a second PC with unversioned old amounts cannot replace the established PC ledger',async()=>{
  const {s,pc}=await pair();
  const old=initial();old.honeymoonData[9].income.total=9999;
  const second=device(s,old,'desktop-web');await sync(second);await sync(pc);
  assert.equal(second.store.honeymoonData[9].income.total,100);
  assert.equal(s.data.honeymoonData[9].income.total,100);
  assert.ok(saved(second).localSync.recovery.some(r=>r.local.honeymoonData?.[9]?.income.total===9999));
});
test('concurrent memo edits select the later record edit and archive both complete originals without a prompt',async()=>{
  const {s,pc,mobile}=await pair();
  pc.store.updateNote('user-note',{content:'Earlier PC original'});
  mobile.store.updateNote('user-note',{content:'Later mobile original'});
  await sync(pc);assert.equal(await sync(mobile),true);await sync(pc);
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'Later mobile original');
  assert.equal(pc.store.notes.find(n=>n.id==='user-note').content,'Later mobile original');
  assert.ok(saved(mobile).localSync.recovery.some(r=>r.local?.notes?.[0]?.content==='Later mobile original' && r.remote?.notes?.[0]?.content==='Earlier PC original'));
  assert.equal(saved(mobile).localSync.conflicts.length,0);
});
test('legacy differing settings and new notes do not block either direction',async()=>{
  const data=initial(),s=server({...data,totalVacationDays:20});
  const pc=device(s,data),mobile=device(s,{...data,totalVacationDays:18},'mobile');
  const a=pc.store.addNote('PC'),b=mobile.store.addNote('Mobile');
  await sync(pc);await sync(mobile);await sync(pc);
  for(const h of [pc,mobile]) {assert.ok(h.store.notes.some(n=>n.id===a.id));assert.ok(h.store.notes.some(n=>n.id===b.id));assert.equal(h.store.saveStatus,'confirmed');}
  assert.equal(pc.store.totalVacationDays,mobile.store.totalVacationDays);
});
test('archive persistence failure blocks overwrite and upload, preserving originals and pending',async()=>{
  const {s,pc,mobile}=await pair();pc.store.updateNote('user-note',{content:'PC'});mobile.store.updateNote('user-note',{content:'Mobile'});await sync(pc);
  const raw=mobile.values.get(key),count=puts(mobile).length;
  mobile.context.localStorage.setItem=()=>{throw Error('Quota');};
  assert.equal(await sync(mobile),false);assert.equal(mobile.values.get(key),raw);assert.equal(puts(mobile).length,count);
  assert.equal(mobile.store.notes.find(n=>n.id==='user-note').content,'Mobile');
});
test('failed upload and restart retain latest memo plus archived alternatives until server acknowledgement',async()=>{
  const {s,pc,mobile}=await pair();pc.store.updateNote('user-note',{content:'PC'});mobile.store.updateNote('user-note',{content:'Mobile latest'});await sync(pc);s.failPUT=true;
  assert.equal(await sync(mobile),false);assert.ok(saved(mobile).localSync.pending.length);
  const reboot=device(s,mobile.values.get(key),'mobile',epoch+20000);assert.equal(reboot.store.localSyncInvalid,false);
  s.failPUT=false;assert.equal(await sync(reboot),true);
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'Mobile latest');assert.ok(saved(reboot).localSync.recovery.length);
  assert.equal(Object.hasOwn(s.data,'localSync'),false);
});

test('mobile waiting for the original PC never reports confirmation through an idle cache and other records still sync',async()=>{
  const data=initial(),s=server(data),mobile=device(s,data,'mobile');
  const added=mobile.store.addNote('Waiting for PC');
  for(let i=0;i<4;i++) {assert.equal(await sync(mobile),false);assert.equal(mobile.store.saveStatus,'pending');}
  assert.ok(s.data.notes.some(n=>n.id===added.id));assert.equal(s.data.ledgerAuthority,undefined);
  const pc=device(s,data);assert.equal(await sync(pc),true);assert.equal(await sync(mobile),true);
});

test('after receiving a later clock, a new local edit advances beyond it despite a slow device clock',async()=>{
  const {s,pc,mobile}=await pair();mobile.store.updateNote('user-note',{content:'Received future version'});await sync(mobile);await sync(pc);
  const received=s.data.syncVersions['["notes","user-note"]'].at;
  pc.store.updateNote('user-note',{content:'PC edit after receipt'});
  assert.ok(saved(pc).localSync.pending.find(p=>p.key==='["notes","user-note"]').changedAt>received);
  await sync(pc);
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'PC edit after receipt');
});

test('a later unrelated record does not cause a stale memo body to beat the newer memo edit',async()=>{
  const {s,pc,mobile}=await pair();pc.store.updateNote('user-note',{content:'Earlier same-record edit'});
  mobile.store.updateNote('user-note',{content:'Later same-record edit'});await sync(mobile);
  pc.context.Date.now=()=>epoch+100000;pc.store.addNote('Later unrelated addition');await sync(pc);
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'Later same-record edit');
  assert.ok(saved(pc).localSync.recovery.some(r=>r.local.notes?.[0]?.content==='Earlier same-record edit'));
});

test('lost conditional PUT response retries without duplicate recovery or duplicate records',async()=>{
  const {s,pc,mobile}=await pair();pc.store.updateNote('user-note',{content:'PC'});mobile.store.updateNote('user-note',{content:'Mobile latest'});await sync(pc);
  const fetch=mobile.context.fetch;let lost=false;
  mobile.context.fetch=async(url,options)=>{const response=await fetch(url,options);if(options.method==='PUT' && !lost){lost=true;throw Error('Lost acknowledgement');}return response;};
  assert.equal(await sync(mobile),false);const archives=clone(saved(mobile).localSync.recovery);
  const reboot=device(s,mobile.values.get(key),'mobile');assert.equal(await sync(reboot),true);
  assert.deepEqual(saved(reboot).localSync.recovery,archives);assert.equal(saved(reboot).localSync.pending.length,0);
  assert.equal(s.data.notes.filter(n=>n.id==='user-note').length,1);
});

test('old unresolved server originals are archived even when the current server record has changed again',async()=>{
  const {s,pc,mobile}=await pair();
  const metadata=clone(pc.store.localSync);metadata.conflicts=[{key:'["notes","user-note"]',remote:{id:'user-note',content:'Previous server original'}}];
  pc.store.commitLocal(pc.store._committedData,metadata);mobile.store.updateNote('user-note',{content:'Current server version'});await sync(mobile);await sync(pc);
  assert.ok(saved(pc).localSync.recovery.some(r=>r.remote.notes?.[0]?.content==='Previous server original'));
  assert.equal(pc.store.notes.find(n=>n.id==='user-note').content,'Current server version');
});

test('identical legacy deleted health rows retain complete originals without revival',async()=>{
  const data=initial();data.deletedItemIds.push('user-health');data.healthNotes[0].fileUrl='data:application/pdf;base64,T0xE';
  const s=server(data),pc=device(s,data);await sync(pc);
  assert.equal(s.data.healthNotes.length,0);
  assert.ok(saved(pc).localSync.recovery.some(r=>r.local.healthNotes?.[0]?.fileUrl===data.healthNotes[0].fileUrl && r.remote.healthNotes?.[0]?.fileUrl===data.healthNotes[0].fileUrl));
});

test('vault differences no longer block memos; both original file bodies survive in recovery',async()=>{
  const data=initial(),local={id:'file-one',name:'Local',dataUrl:'data:text/plain;base64,TE9DQUw=',updatedAt:epoch};
  const remote={id:'file-one',name:'Remote',dataUrl:'data:text/plain;base64,UkVNT1RF',updatedAt:epoch+100};
  const s=server({...data,vaultFiles:[remote]}),pc=device(s,data);let files=[local];
  pc.context.cloudSync.getAllVaultFiles=async()=>clone(files);pc.context.cloudSync.saveVaultFiles=async next=>{files=clone(next);};
  const note=pc.store.addNote('Independent memo');assert.equal(await sync(pc),true);
  assert.ok(s.data.notes.some(n=>n.id===note.id));assert.equal(files[0].dataUrl,remote.dataUrl);
  assert.ok(saved(pc).localSync.recovery.some(r=>r.local.vaultFiles?.[0]?.dataUrl===local.dataUrl && r.remote.vaultFiles?.[0]?.dataUrl===remote.dataUrl));
});

test('metadata-only vault updates retain local file bytes and archive previous metadata',async()=>{
  const data=initial(),local={id:'file-one',name:'Local',dataUrl:'data:text/plain;base64,TE9DQUw=',updatedAt:1};
  const s=server({...data,vaultFiles:[{id:'file-one',name:'Renamed',updatedAt:2}]}),pc=device(s,data);let files=[local];
  pc.context.cloudSync.getAllVaultFiles=async()=>clone(files);pc.context.cloudSync.saveVaultFiles=async next=>{files=clone(next);};
  assert.equal(await sync(pc),true);assert.equal(files[0].name,'Renamed');assert.equal(files[0].dataUrl,local.dataUrl);
  assert.equal(s.data.vaultFiles[0].dataUrl,local.dataUrl);
});

for(const phase of ['encrypt','PUT']) test('vault changes during '+phase+' keep new bytes and pending edits for the retry',async()=>{
  const data=initial(),s=server({...data,vaultFiles:[{id:'remote-file',dataUrl:'data:remote'}]}),pc=device(s,data);
  let files=[];const added={id:'new-local-file',dataUrl:'data:new-local-original'};
  pc.context.cloudSync.getAllVaultFiles=async()=>clone(files);pc.context.cloudSync.saveVaultFiles=async next=>{files=clone(next);};
  const mutate=()=>{files.push(added);pc.context.cloudSync._vaultChangeVersion++;};
  if(phase==='PUT')s.beforePUT=mutate;
  else {const encrypt=pc.context.E2EESecurityEngine.encrypt;let changed=false;
    pc.context.E2EESecurityEngine.encrypt=async data=>{if(!changed){changed=true;mutate();}return encrypt(data);};}
  pc.store.addNote('Still pending');assert.equal(await sync(pc),false);
  assert.ok(files.some(f=>f.id===added.id && f.dataUrl===added.dataUrl));assert.ok(saved(pc).localSync.pending.length);
  assert.equal(await sync(pc),true);assert.ok(s.data.vaultFiles.some(f=>f.id===added.id && f.dataUrl===added.dataUrl));
  assert.ok(files.some(f=>f.id==='remote-file'));
});

test('malformed local or remote version metadata blocks replacement and preserves originals',async()=>{
  const {s,pc}=await pair(),data=saved(pc);data.localSync.itemVersions={'["notes","user-note"]':{hash:'bad',at:1}};
  const broken=device(s,data);assert.equal(broken.store.localSyncInvalid,true);assert.equal(await sync(broken),false);
  s.data.syncVersions={'["notes","user-note"]':{hash:'bad',at:1}};const raw=pc.values.get(key),count=puts(pc).length;
  assert.equal(await sync(pc),false);assert.equal(pc.values.get(key),raw);assert.equal(puts(pc).length,count);
});

test('device role uses mobile identity and URL, never desktop viewport size',()=>{
  const {source}=require('./sync-harness.cjs'),vm=require('node:vm');
  const method=source.match(/clientKind\(\) \{[\s\S]*?\n    \}/)[0];
  for(const [protocol,userAgent,maxTouchPoints,kind] of [
    ['https:','Mozilla Windows',0,'desktop-web'],['https:','Android',5,'mobile'],
    ['https:','iPhone',5,'mobile'],['https:','Macintosh',5,'mobile'],['file:','Windows',0,'local-file']]) {
    assert.equal(vm.runInNewContext('({'+method+'}).clientKind()',{window:{innerWidth:320,location:{protocol},navigator:{userAgent,maxTouchPoints}}}),kind);
  }
});

test('mobile bank analysis cannot rewrite synchronized PC monthly amounts',()=>{
  const {ledgerHarness,julyBank}=require('./ledger-harness.cjs'),h=ledgerHarness({bank:julyBank});
  h.context.protocol.clientKind=()=> 'mobile';const raw=h.values.get(key),data=clone(h.store.honeymoonData);
  h.context.syncBankToHoneymoonData();assert.deepEqual(clone(h.store.honeymoonData),data);assert.equal(h.values.get(key),raw);
});
