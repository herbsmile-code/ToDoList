// Synthetic storage and server only. Never opens user profiles or production data.
const test=require('node:test');
const assert=require('node:assert/strict');
const {harness,fixture,key}=require('./sync-harness.cjs');
const {server,sync,saved,clone}=require('./ai-sync-harness.cjs');
const data=()=>({...clone(fixture),
  healthFolders:[{id:'all',name:'전체',icon:'🎨'},{id:'general',name:'기타취미',icon:'✨'},
    {id:'obgyn',name:'운동',icon:'🏃'},{id:'folder-test',name:'개인',icon:'📁'}],
  healthNotes:[{id:'hnote-one',folder:'folder-test',title:'Original',date:'2026-09-01',content:'Original content',fileName:'report.pdf',fileSize:8,fileType:'application/pdf',fileUrl:'data:application/pdf;base64,JVBERi0xLjQ=',fileMemo:'Original file memo',createdAt:1},
    {id:'hnote-two',folder:'obgyn',title:'Other',date:'2026-09-02',content:'Other content',createdAt:2}],
  hobbyFolders:[{id:'general',name:'Health original'}],vaultFolders:[{id:'general',name:'Vault original'}],
  unknownLegacyField:{original:'Keep this'}});
const local=(raw=JSON.stringify(data()))=>harness(raw,{extras:{todolist_jy_space_id:'',todolist_jy_pin:''}});
const device=(s,raw=JSON.stringify(data()))=>{const h=s.attach(harness(raw));h.context.cloudSync.pushTasksToCloud=()=>false;return h;};
const state=h=>clone({notes:h.store.healthNotes,folders:h.store.healthFolders,deleted:[...(h.store.deletedItemIds||[])],
  active:h.store.activeHealthFolder,selected:[...(h.store.selectedHealthNotes||[])],meta:h.store.localSync});
const operations={
  add:h=>h.store.addHealthNote({title:'Draft',folder:'obgyn',content:'Draft content'}),
  update:h=>h.store.updateHealthNote('hnote-one',{title:'Edit'}),
  delete:h=>h.store.deleteHealthNote('hnote-one'),
  addFolder:h=>h.store.addHealthFolder('New folder','⭐'),
  updateFolder:h=>h.store.updateHealthFolder('folder-test',{name:'Edited folder'}),
  deleteFolder:h=>h.store.deleteHealthFolder('folder-test'),
  moveBatch:h=>h.store.moveHealthNotesToFolder(['hnote-one','hnote-two'],'general'),
  deleteBatch:h=>h.store.deleteHealthNotesBatch(['hnote-one','hnote-two'])
};
for(const [name,operation] of Object.entries(operations)) {
  test(name+': failed write preserves memory, selection, durable data and outbox',()=>{
    const h=local();h.store.activeHealthFolder='folder-test';h.store.selectedHealthNotes=new Set(['hnote-one']);
    const before=state(h),raw=h.values.get(key);h.context.localStorage.setItem=()=>{throw Error('Synthetic quota');};
    assert.ok(!operation(h));assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);
    assert.equal(h.requests.length,0);assert.equal(h.store.saveStatus,'failed');
  });
  test(name+': commits once and preserves all unrelated fields',()=>{
    const h=local(),before=saved(h);assert.ok(operation(h));const after=saved(h);
    for(const field of Object.keys(before)) {
      if(['healthNotes','healthFolders','deletedItemIds','updatedAt','syncRevision','localSync'].includes(field))continue;
      assert.deepEqual(after[field],before[field],field);
    }
    assert.equal(h.writes.filter(k=>k===key).length,1);assert.ok(after.localSync.pending.length);
    const restarted=local(h.values.get(key));assert.deepEqual(clone(restarted.store.healthNotes),after.healthNotes);
    assert.deepEqual(clone(restarted.store.healthFolders),after.healthFolders);
  });
}
test('read failure, invalid outbox and another writer block all health edits',()=>{
  for(const mode of ['read','outbox','writer'])for(const operation of Object.values(operations)) {
    const raw=mode==='read'?'{broken':JSON.stringify({...data(),...(mode==='outbox'?{localSync:{version:999}}:{})});
    const h=local(raw);if(mode==='writer')h.store.writerBlocked=true;const before=state(h);
    assert.ok(!operation(h));assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,0);
  }
});
test('another window changing storage is not overwritten',()=>{
  for(const operation of Object.values(operations)) {
    const h=local(),before=state(h),other=JSON.stringify({...data(),notes:[{id:'other',content:'Other window'}]});
    h.values.set(key,other);assert.ok(!operation(h));assert.equal(h.values.get(key),other);assert.deepEqual(state(h),before);
  }
});
test('folder deletion, note moves and scoped marker commit together; default folders stay protected',()=>{
  const h=local();h.store.activeHealthFolder='folder-test';assert.equal(h.store.deleteHealthFolder('folder-test'),true);
  assert.equal(h.store.activeHealthFolder,'all');const d=saved(h);
  assert.equal(d.healthNotes.find(n=>n.id==='hnote-one').folder,'general');
  assert.ok(d.deletedItemIds.includes('health-folder:folder-test'));assert.ok(!d.deletedItemIds.includes('folder-test'));
  for(const id of ['all','general']) {
    const before=h.values.get(key);assert.equal(h.store.deleteHealthFolder(id),false);assert.equal(h.values.get(key),before);
  }
});
test('missing destination is restored only during explicit folder deletion; empty folder lists never reseed on read',()=>{
  const d=data();d.healthFolders=d.healthFolders.filter(f=>f.id!=='general');const h=local(JSON.stringify(d));
  assert.equal(h.store.healthFolders.some(f=>f.id==='general'),false);assert.equal(h.writes.length,0);
  assert.ok(h.store.deleteHealthFolder('folder-test'));assert.ok(saved(h).healthFolders.some(f=>f.id==='general'));
  d.healthFolders=[];const empty=local(JSON.stringify(d));assert.deepEqual(clone(empty.store.healthFolders),[]);assert.equal(empty.writes.length,0);
});
test('batch IDs are deduplicated and validated without deleting unknown IDs or moving to missing folders',()=>{
  for(const target of ['all','missing','']) {
    const h=local(),raw=h.values.get(key);assert.equal(h.store.moveHealthNotesToFolder(['hnote-one'],target),0);assert.equal(h.values.get(key),raw);
  }
  for(const method of ['moveHealthNotesToFolder','deleteHealthNotesBatch']) {
    const h=local(),raw=h.values.get(key);assert.equal(h.store[method](['hnote-one','missing'],'general'),0);assert.equal(h.values.get(key),raw);
    assert.equal(h.store[method](['hnote-one','hnote-one'],'general'),1);
  }
});
test('missing destination rejects new moves but editing an orphan preserves its existing folder and unknown fields',()=>{
  const d=data();d.healthNotes[0].folder='retired';d.healthNotes[0].legacy='Keep';const h=local(JSON.stringify(d));
  const raw=h.values.get(key);assert.equal(h.store.addHealthNote({folder:'missing',title:'No'}),null);
  assert.equal(h.store.updateHealthNote('hnote-two',{folder:'missing'}),null);assert.equal(h.values.get(key),raw);
  assert.ok(h.store.updateHealthNote('hnote-one',{folder:'retired',title:'Edit'}));
  assert.equal(saved(h).healthNotes.find(n=>n.id==='hnote-one').legacy,'Keep');
});
test('readback failure preserves memory and leaves the durable candidate recoverable after restart',()=>{
  const h=local(),before=state(h),get=h.context.localStorage.getItem,set=h.context.localStorage.setItem;let written=false;
  h.context.localStorage.setItem=(k,v)=>{set(k,v);if(k===key)written=true;};
  h.context.localStorage.getItem=k=>{if(k===key&&written)throw Error('Readback denied');return get(k);};
  assert.equal(h.store.updateHealthNote('hnote-one',{title:'Durable edit'}),null);assert.deepEqual(state(h),before);assert.equal(h.requests.length,0);
  const restarted=local(h.values.get(key));assert.equal(restarted.store.localSyncInvalid,false);
  assert.equal(restarted.store.healthNotes.find(n=>n.id==='hnote-one').title,'Durable edit');assert.ok(restarted.store.localSync.pending.length);
});
test('failed upload, restart, stale receive and retry preserve pending health edits',async()=>{
  const s=server(data()),a=device(s);await sync(a);s.failPUT=true;a.store.updateHealthNote('hnote-one',{title:'Pending'});
  assert.equal(await sync(a),false);const b=device(s,a.values.get(key));assert.equal(await sync(b),false);
  assert.equal(saved(b).healthNotes.find(n=>n.id==='hnote-one').title,'Pending');s.failPUT=false;assert.equal(await sync(b),true);
  assert.equal(s.data.healthNotes.find(n=>n.id==='hnote-one').title,'Pending');assert.equal(saved(b).localSync.pending.length,0);
});
for(const kind of ['edit/edit','delete/edit','folder/edit','folder/note-move']) {
  test(kind+': conflicting originals survive restart without partial folder moves',async()=>{
    const s=server(data()),a=device(s);await sync(a);const b=device(s,a.values.get(key));
    if(kind.startsWith('folder')) {a.store.deleteHealthFolder('folder-test');
      if(kind==='folder/edit')b.store.updateHealthFolder('folder-test',{name:'Remote'});
      else b.store.moveHealthNotesToFolder(['hnote-one'],'obgyn');
    } else {if(kind==='delete/edit')a.store.deleteHealthNote('hnote-one');else a.store.updateHealthNote('hnote-one',{title:'Local'});
      b.store.updateHealthNote('hnote-one',{title:'Remote'});}
    await sync(b);const before=saved(a),remote=clone(s.data);assert.equal(await sync(a),true);const after=saved(a);
    assert.deepEqual(after.healthNotes,s.data.healthNotes);assert.deepEqual(after.healthFolders,s.data.healthFolders);
    assert.equal(after.localSync.pending.length,0);assert.equal(after.localSync.conflicts.length,0);
    assert.ok(after.localSync.recovery.some(r=>r.remote.healthNotes?.some(row=>remote.healthNotes.some(other=>JSON.stringify(row)===JSON.stringify(other))) || r.remote.healthFolders?.some(row=>remote.healthFolders.some(other=>JSON.stringify(row)===JSON.stringify(other)))));
    for(const row of before.healthNotes) assert.ok(after.healthNotes.some(n=>JSON.stringify(n)===JSON.stringify(row)) || after.localSync.recovery.some(r=>r.local.healthNotes?.some(n=>JSON.stringify(n)===JSON.stringify(row))));
    assert.deepEqual(saved(device(s,a.values.get(key))).localSync.recovery,after.localSync.recovery);
  });
}
for(const kind of ['note','folder']) {
  test(kind+': deletion reaches an older device and rejects stale resurrection after acknowledgement',async()=>{
    const s=server(data()),a=device(s);await sync(a);const old=clone(s.data),b=device(s,a.values.get(key));
    if(kind==='note')a.store.deleteHealthNote('hnote-one');else a.store.deleteHealthFolder('folder-test');
    assert.equal(await sync(a),true);assert.equal(await sync(b),true);
    const field=kind==='note'?'healthNotes':'healthFolders',id=kind==='note'?'hnote-one':'folder-test';
    assert.equal(saved(b)[field].some(n=>n.id===id),false);assert.deepEqual(saved(b).hobbyFolders,data().hobbyFolders);
    s.data=old;s.rev++;const puts=a.requests.filter(r=>r.options.method==='PUT').length;assert.equal(await sync(a),true);
    assert.equal(saved(a)[field].some(n=>n.id===id),false);assert.ok(saved(a).localSync.recovery.some(c=>c.remote[field]?.some(row=>row.id===id)));
    assert.equal(a.requests.filter(r=>r.options.method==='PUT').length,puts+1);
  });
}
test('equal legacy rows respect scoped health markers without deleting matching IDs in other collections',async()=>{
  const d=data();d.deletedItemIds.push('health-folder:general','hnote-one');const s=server(d),h=device(s,JSON.stringify(d));
  assert.equal(await sync(h),true);assert.equal(saved(h).healthFolders.some(f=>f.id==='general'),false);
  assert.equal(saved(h).healthNotes.some(n=>n.id==='hnote-one'),false);assert.deepEqual(saved(h).hobbyFolders,d.hobbyFolders);
  assert.deepEqual(saved(h).vaultFolders,d.vaultFolders);
});

test('record edits, folder deletion and batch moves preserve every attachment byte and metadata field',()=>{
  for(const edit of [h=>h.store.updateHealthNote('hnote-one',{title:'Edit'}),h=>h.store.deleteHealthFolder('folder-test'),h=>h.store.moveHealthNotesToFolder(['hnote-one'],'obgyn')]) {
    const h=local(),original=saved(h).healthNotes[0];assert.ok(edit(h));const after=saved(h).healthNotes.find(n=>n.id==='hnote-one');
    for(const field of ['fileName','fileSize','fileType','fileUrl','fileMemo'])assert.equal(after[field],original[field],field);
  }
});
test('replacement and removal cannot publish attachment changes when persistence fails',()=>{
  for(const fileUrl of ['', 'data:application/pdf;base64,TkVXIQ==']) {
    const h=local(),before=state(h),raw=h.values.get(key);h.context.localStorage.setItem=()=>{throw Error('Quota');};
    assert.equal(h.store.updateHealthNote('hnote-one',{fileUrl,fileName:fileUrl?'new.pdf':''}),null);
    assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);
  }
});
test('concurrent attachment replacements keep both complete originals after restart',async()=>{
  const s=server(data()),a=device(s);await sync(a);const b=device(s,a.values.get(key));
  a.store.updateHealthNote('hnote-one',{fileName:'local.pdf',fileUrl:'data:application/pdf;base64,TE9DQUw='});
  b.store.updateHealthNote('hnote-one',{fileName:'remote.pdf',fileUrl:'data:application/pdf;base64,UkVNT1RF'});await sync(b);
  assert.equal(await sync(a),true);const restarted=device(s,a.values.get(key));
  assert.equal(saved(restarted).healthNotes.find(n=>n.id==='hnote-one').fileUrl,'data:application/pdf;base64,UkVNT1RF');
  assert.ok(saved(restarted).localSync.recovery.some(c=>c.local.healthNotes?.[0]?.fileUrl==='data:application/pdf;base64,TE9DQUw=' && c.remote.healthNotes?.[0]?.fileUrl==='data:application/pdf;base64,UkVNT1RF'));
});
