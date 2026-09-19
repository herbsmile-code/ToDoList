// Synthetic storage and server only. Never opens user profiles or production data.
const test=require('node:test');
const assert=require('node:assert/strict');
const {harness,fixture,key}=require('./sync-harness.cjs');
const {server,sync,saved,clone}=require('./ai-sync-harness.cjs');
const data=()=>({...clone(fixture),
  hobbyFolders:[{id:'all',name:'전체',icon:'🎨'},{id:'general',name:'기타취미',icon:'✨'},
    {id:'workout',name:'운동',icon:'🏃'},{id:'hfolder-test',name:'개인',icon:'📁'}],
  hobbyNotes:[{id:'hnb-one',folder:'hfolder-test',title:'Original',date:'2026-09-01',content:'Original content',createdAt:1},
    {id:'hnb-two',folder:'workout',title:'Other',date:'2026-09-02',content:'Other content',createdAt:2}],
  healthFolders:[{id:'general',name:'Health original'}],vaultFolders:[{id:'general',name:'Vault original'}],
  unknownLegacyField:{original:'Keep this'}});
const local=(raw=JSON.stringify(data()))=>harness(raw,{extras:{todolist_jy_space_id:'',todolist_jy_pin:''}});
const device=(s,raw=JSON.stringify(data()))=>{const h=s.attach(harness(raw));h.context.cloudSync.pushTasksToCloud=()=>false;return h;};
const state=h=>clone({notes:h.store.hobbyNotes,folders:h.store.hobbyFolders,deleted:[...(h.store.deletedItemIds||[])],
  active:h.store.activeHobbyFolder,selected:[...(h.store.selectedHobbyNotes||[])],meta:h.store.localSync});
const operations={
  add:h=>h.store.addHobbyNote({title:'Draft',folder:'workout',content:'Draft content'}),
  update:h=>h.store.updateHobbyNote('hnb-one',{title:'Edit'}),
  delete:h=>h.store.deleteHobbyNote('hnb-one'),
  addFolder:h=>h.store.addHobbyFolder('New folder','⭐'),
  updateFolder:h=>h.store.updateHobbyFolder('hfolder-test',{name:'Edited folder'}),
  deleteFolder:h=>h.store.deleteHobbyFolder('hfolder-test'),
  moveBatch:h=>h.store.moveHobbyNotesToFolder(['hnb-one','hnb-two'],'general'),
  deleteBatch:h=>h.store.deleteHobbyNotesBatch(['hnb-one','hnb-two'])
};
for(const [name,operation] of Object.entries(operations)) {
  test(name+': failed write preserves memory, selection, durable data and outbox',()=>{
    const h=local();h.store.activeHobbyFolder='hfolder-test';h.store.selectedHobbyNotes=new Set(['hnb-one']);
    const before=state(h),raw=h.values.get(key);h.context.localStorage.setItem=()=>{throw Error('Synthetic quota');};
    assert.ok(!operation(h));assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);
    assert.equal(h.requests.length,0);assert.equal(h.store.saveStatus,'failed');
  });
  test(name+': commits once and preserves all unrelated fields',()=>{
    const h=local(),before=saved(h);assert.ok(operation(h));const after=saved(h);
    for(const field of Object.keys(before)) {
      if(['hobbyNotes','hobbyFolders','deletedItemIds','updatedAt','syncRevision','localSync'].includes(field))continue;
      assert.deepEqual(after[field],before[field],field);
    }
    assert.equal(h.writes.filter(k=>k===key).length,1);assert.ok(after.localSync.pending.length);
    const restarted=local(h.values.get(key));assert.deepEqual(clone(restarted.store.hobbyNotes),after.hobbyNotes);
    assert.deepEqual(clone(restarted.store.hobbyFolders),after.hobbyFolders);
  });
}
test('read failure, invalid outbox and another writer block all hobby edits',()=>{
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
  const h=local();h.store.activeHobbyFolder='hfolder-test';assert.equal(h.store.deleteHobbyFolder('hfolder-test'),true);
  assert.equal(h.store.activeHobbyFolder,'all');const d=saved(h);
  assert.equal(d.hobbyNotes.find(n=>n.id==='hnb-one').folder,'general');
  assert.ok(d.deletedItemIds.includes('hobby-folder:hfolder-test'));assert.ok(!d.deletedItemIds.includes('hfolder-test'));
  for(const id of ['all','general','workout','piano','drawing','reading']) {
    const before=h.values.get(key);assert.equal(h.store.deleteHobbyFolder(id),false);assert.equal(h.values.get(key),before);
  }
});
test('missing destination is restored only during explicit folder deletion; empty folder lists never reseed on read',()=>{
  const d=data();d.hobbyFolders=d.hobbyFolders.filter(f=>f.id!=='general');const h=local(JSON.stringify(d));
  assert.equal(h.store.hobbyFolders.some(f=>f.id==='general'),false);assert.equal(h.writes.length,0);
  assert.ok(h.store.deleteHobbyFolder('hfolder-test'));assert.ok(saved(h).hobbyFolders.some(f=>f.id==='general'));
  d.hobbyFolders=[];const empty=local(JSON.stringify(d));assert.deepEqual(clone(empty.store.hobbyFolders),[]);assert.equal(empty.writes.length,0);
});
test('batch IDs are deduplicated and validated without deleting unknown IDs or moving to missing folders',()=>{
  for(const target of ['all','missing','']) {
    const h=local(),raw=h.values.get(key);assert.equal(h.store.moveHobbyNotesToFolder(['hnb-one'],target),0);assert.equal(h.values.get(key),raw);
  }
  for(const method of ['moveHobbyNotesToFolder','deleteHobbyNotesBatch']) {
    const h=local(),raw=h.values.get(key);assert.equal(h.store[method](['hnb-one','missing'],'general'),0);assert.equal(h.values.get(key),raw);
    assert.equal(h.store[method](['hnb-one','hnb-one'],'general'),1);
  }
});
test('missing destination rejects new moves but editing an orphan preserves its existing folder and unknown fields',()=>{
  const d=data();d.hobbyNotes[0].folder='retired';d.hobbyNotes[0].legacy='Keep';const h=local(JSON.stringify(d));
  const raw=h.values.get(key);assert.equal(h.store.addHobbyNote({folder:'missing',title:'No'}),null);
  assert.equal(h.store.updateHobbyNote('hnb-two',{folder:'missing'}),null);assert.equal(h.values.get(key),raw);
  assert.ok(h.store.updateHobbyNote('hnb-one',{folder:'retired',title:'Edit'}));
  assert.equal(saved(h).hobbyNotes.find(n=>n.id==='hnb-one').legacy,'Keep');
});
test('readback failure preserves memory and leaves the durable candidate recoverable after restart',()=>{
  const h=local(),before=state(h),get=h.context.localStorage.getItem,set=h.context.localStorage.setItem;let written=false;
  h.context.localStorage.setItem=(k,v)=>{set(k,v);if(k===key)written=true;};
  h.context.localStorage.getItem=k=>{if(k===key&&written)throw Error('Readback denied');return get(k);};
  assert.equal(h.store.updateHobbyNote('hnb-one',{title:'Durable edit'}),null);assert.deepEqual(state(h),before);assert.equal(h.requests.length,0);
  const restarted=local(h.values.get(key));assert.equal(restarted.store.localSyncInvalid,false);
  assert.equal(restarted.store.hobbyNotes.find(n=>n.id==='hnb-one').title,'Durable edit');assert.ok(restarted.store.localSync.pending.length);
});
test('failed upload, restart, stale receive and retry preserve pending hobby edits',async()=>{
  const s=server(data()),a=device(s);await sync(a);s.failPUT=true;a.store.updateHobbyNote('hnb-one',{title:'Pending'});
  assert.equal(await sync(a),false);const b=device(s,a.values.get(key));assert.equal(await sync(b),false);
  assert.equal(saved(b).hobbyNotes.find(n=>n.id==='hnb-one').title,'Pending');s.failPUT=false;assert.equal(await sync(b),true);
  assert.equal(s.data.hobbyNotes.find(n=>n.id==='hnb-one').title,'Pending');assert.equal(saved(b).localSync.pending.length,0);
});
for(const kind of ['edit/edit','delete/edit','folder/edit','folder/note-move']) {
  test(kind+': conflicting originals survive restart without partial folder moves',async()=>{
    const s=server(data()),a=device(s);await sync(a);const b=device(s,a.values.get(key));
    if(kind.startsWith('folder')) {a.store.deleteHobbyFolder('hfolder-test');
      if(kind==='folder/edit')b.store.updateHobbyFolder('hfolder-test',{name:'Remote'});
      else b.store.moveHobbyNotesToFolder(['hnb-one'],'workout');
    } else {if(kind==='delete/edit')a.store.deleteHobbyNote('hnb-one');else a.store.updateHobbyNote('hnb-one',{title:'Local'});
      b.store.updateHobbyNote('hnb-one',{title:'Remote'});}
    await sync(b);const before=saved(a);assert.equal(await sync(a),false);const after=saved(a);
    assert.deepEqual(after.hobbyNotes,before.hobbyNotes);assert.deepEqual(after.hobbyFolders,before.hobbyFolders);
    assert.deepEqual(after.localSync.pending,before.localSync.pending);assert.ok(after.localSync.conflicts.some(c=>c.remote));
    assert.deepEqual(saved(device(s,a.values.get(key))).localSync.conflicts,after.localSync.conflicts);
  });
}
for(const kind of ['note','folder']) {
  test(kind+': deletion reaches an older device and rejects stale resurrection after acknowledgement',async()=>{
    const s=server(data()),a=device(s);await sync(a);const old=clone(s.data),b=device(s,a.values.get(key));
    if(kind==='note')a.store.deleteHobbyNote('hnb-one');else a.store.deleteHobbyFolder('hfolder-test');
    assert.equal(await sync(a),true);assert.equal(await sync(b),true);
    const field=kind==='note'?'hobbyNotes':'hobbyFolders',id=kind==='note'?'hnb-one':'hfolder-test';
    assert.equal(saved(b)[field].some(n=>n.id===id),false);assert.deepEqual(saved(b).healthFolders,data().healthFolders);
    s.data=old;s.rev++;const puts=a.requests.filter(r=>r.options.method==='PUT').length;assert.equal(await sync(a),false);
    assert.equal(saved(a)[field].some(n=>n.id===id),false);assert.ok(saved(a).localSync.conflicts.some(c=>c.remote?.id===id));
    assert.equal(a.requests.filter(r=>r.options.method==='PUT').length,puts);
  });
}
test('equal legacy rows respect scoped hobby markers without deleting matching IDs in other collections',async()=>{
  const d=data();d.deletedItemIds.push('hobby-folder:general','hnb-one');const s=server(d),h=device(s,JSON.stringify(d));
  assert.equal(await sync(h),true);assert.equal(saved(h).hobbyFolders.some(f=>f.id==='general'),false);
  assert.equal(saved(h).hobbyNotes.some(n=>n.id==='hnb-one'),false);assert.deepEqual(saved(h).healthFolders,d.healthFolders);
  assert.deepEqual(saved(h).vaultFolders,d.vaultFolders);
});
