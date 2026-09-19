// Synthetic storage/server only. Never reads user profiles, backups or Firebase.
const test = require('node:test');
const assert = require('node:assert/strict');
const {harness, fixture, key} = require('./sync-harness.cjs');
const {server, sync, saved, clone} = require('./ai-sync-harness.cjs');
const data = () => ({...clone(fixture), totalVacationDays:15,
  vacations:[{id:'vac-full',type:'full',amount:1,date:'2026-09-01',reason:'Original',createdAt:1},
    {id:'vac-half',type:'half-am',amount:0.5,date:'2025-08-01',reason:'Half',createdAt:2},
    {id:'vac-holiday',type:'holiday',amount:0,date:'2026-09-02',reason:'Holiday',createdAt:3}],
  unknownLegacyField:{original:'Keep this'}});
const local = (raw=JSON.stringify(data())) => harness(raw,
  {extras:{todolist_jy_space_id:'',todolist_jy_pin:''}});
const device = (s,raw=JSON.stringify(data())) => {
  const h=s.attach(harness(raw));
  h.context.cloudSync.pushTasksToCloud=()=>false; // Explicitly order races; sync() uses real engine.
  return h;
};
const state = h => clone({vacations:h.store.vacations,total:h.store.totalVacationDays,
  deleted:[...(h.store.deletedItemIds||[])],meta:h.store.localSync});
const operations = {
  add:h=>h.store.addVacation({type:'half-pm',date:'2026-09-03',reason:'Draft'}),
  update:h=>h.store.updateVacation('vac-full',{type:'holiday',reason:'Changed'}),
  delete:h=>h.store.deleteVacation('vac-full'),
  total:h=>h.store.setTotalVacationDays(20)
};
for(const [name,operation] of Object.entries(operations)) {
  test(name+': failed persistence preserves memory, originals and pending edits',()=>{
    const h=local(),before=state(h),raw=h.values.get(key);
    h.context.localStorage.setItem=()=>{throw Error('Synthetic quota');};
    assert.equal(operation(h),name==='delete'?false:null);
    assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);
    assert.equal(h.requests.length,0);assert.equal(h.store.saveStatus,'failed');
  });
  test(name+': a successful edit preserves every unrelated persisted field',()=>{
    const h=local(),before=saved(h);assert.ok(operation(h));
    const after=saved(h);
    for(const field of Object.keys(before)) {
      if(['vacations','totalVacationDays','deletedItemIds','updatedAt','syncRevision','localSync'].includes(field))continue;
      assert.deepEqual(after[field],before[field],field);
    }
    assert.equal(h.writes.filter(k=>k===key).length,1);
    assert.ok(after.localSync.pending.length);
  });
}
test('zero entitlement remains zero through save, statistics and restart',()=>{
  const h=local();assert.equal(h.store.setTotalVacationDays(0),0);
  const restarted=local(h.values.get(key));
  assert.equal(restarted.store.totalVacationDays,0);
  assert.deepEqual(clone(restarted.store.getVacationStats()),{total:0,used:1.5,remain:0,pct:0,holidayCount:1});
});
test('vacation edits cannot persist startup normalization of unrelated legacy tasks',()=>{
  const d=data();d.tasks=[{id:'legacy-task',title:'No category'},{id:'old-category',category:'retired-category',title:'Keep category'}];
  const h=local(JSON.stringify(d));assert.deepEqual(clone(h.store.tasks),d.tasks);
  assert.ok(h.store.addVacation({type:'full',date:'2026-09-03'}));
  assert.deepEqual(saved(h).tasks,d.tasks);
});
test('vacation edits cannot reseed removed health/hobby/vault folders',()=>{
  for(const field of ['healthFolders','hobbyFolders','vaultFolders']) {
    for(const folders of [[],[{id:'custom-only',name:'Original folder',icon:'⭐'}]]) {
      const d=data();d[field]=folders;const raw=JSON.stringify(d),h=local(raw);
      assert.deepEqual(clone(h.store[field]),folders,field+' on read');
      assert.equal(h.values.get(key),raw);
      assert.ok(h.store.updateVacation('vac-full',{reason:'Edit'}));
      assert.deepEqual(saved(h)[field],folders,field+' on unrelated edit');
    }
  }
});
test('invalid entitlement input cannot replace existing saved data',()=>{
  for(const value of ['',null,undefined,'invalid',Infinity,-1]) {
    const h=local(),raw=h.values.get(key),before=state(h);
    assert.equal(h.store.setTotalVacationDays(value),null);
    assert.equal(h.values.get(key),raw);assert.deepEqual(state(h),before);
  }
});
test('full/half/holiday edits use 1/0.5/0, preserve IDs and survive restart',()=>{
  const h=local();
  for(const [type,amount] of [['full',1],['half-am',0.5],['half-pm',0.5],['holiday',0]]) {
    const created=h.store.addVacation({type,date:'2026-09-03',reason:'  Note  '});
    assert.equal(created.amount,amount);assert.equal(created.reason,'Note');
    const updated=h.store.updateVacation(created.id,{type,reason:'Edit'});
    assert.equal(updated.id,created.id);assert.equal(updated.amount,amount);
    assert.equal(local(h.values.get(key)).store.vacations.find(v=>v.id===created.id).reason,'Edit');
  }
});
test('legacy missing amounts and zero-day holidays are calculated without rewriting originals',()=>{
  const d=data();d.vacations=[{id:'a',type:'full'},{id:'b',type:'half-pm'},{id:'c',type:'holiday'},
    {id:'d',type:'full',amount:0}];
  const raw=JSON.stringify(d),h=local(raw);
  assert.deepEqual(clone(h.store.getVacationStats()),{total:15,used:1.5,remain:13.5,pct:10,holidayCount:2});
  assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,0);
});
test('delete persists the record removal and tombstone together and survives restart',()=>{
  const h=local();assert.equal(h.store.deleteVacation('vac-full'),true);
  const d=saved(h);assert.equal(d.vacations.some(v=>v.id==='vac-full'),false);
  assert.ok(d.deletedItemIds.includes('vac-full'));assert.equal(h.writes.filter(k=>k===key).length,1);
  assert.equal(local(h.values.get(key)).store.vacations.some(v=>v.id==='vac-full'),false);
});
test('read failure, invalid outbox and another writer block all vacation mutations',()=>{
  for(const mode of ['read','outbox','writer'])for(const operation of Object.values(operations)) {
    const raw=mode==='read'?'{broken':JSON.stringify({...data(),...(mode==='outbox'?{localSync:{version:999}}:{})});
    const h=local(raw);if(mode==='writer')h.store.writerBlocked=true;
    const before=state(h);assert.ok(!operation(h));
    assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,0);
  }
});
test('another window changing storage cannot be overwritten by vacation edits',()=>{
  for(const operation of Object.values(operations)) {
    const h=local(),before=state(h),other=JSON.stringify({...data(),notes:[{id:'other',content:'Other window'}]});
    h.values.set(key,other);assert.ok(!operation(h));assert.equal(h.values.get(key),other);
    assert.deepEqual(state(h),before);
  }
});
test('readback failure preserves memory and leaves durable candidate/outbox recoverable',()=>{
  const h=local(),before=state(h),get=h.context.localStorage.getItem,set=h.context.localStorage.setItem;
  let written=false;
  h.context.localStorage.setItem=(k,v)=>{set(k,v);if(k===key)written=true;};
  h.context.localStorage.getItem=k=>{if(k===key&&written)throw Error('Readback denied');return get(k);};
  assert.equal(h.store.updateVacation('vac-full',{reason:'Durable edit'}),null);
  assert.deepEqual(state(h),before);assert.equal(h.requests.length,0);
  const restarted=local(h.values.get(key));assert.equal(restarted.store.localSyncInvalid,false);
  assert.equal(restarted.store.vacations.find(v=>v.id==='vac-full').reason,'Durable edit');
  assert.ok(restarted.store.localSync.pending.length);
});
test('failed upload, restart, stale receive and retry preserve vacation edits',async()=>{
  const s=server(data()),a=device(s);assert.equal(await sync(a),true);s.failPUT=true;
  a.store.updateVacation('vac-full',{reason:'Pending original'});assert.equal(await sync(a),false);
  const pending=saved(a).localSync.pending,b=device(s,a.values.get(key));
  assert.deepEqual(saved(b).localSync.pending,pending);assert.equal(await sync(b),false);
  assert.equal(saved(b).vacations.find(v=>v.id==='vac-full').reason,'Pending original');
  s.failPUT=false;assert.equal(await sync(b),true);
  assert.equal(s.data.vacations.find(v=>v.id==='vac-full').reason,'Pending original');
  assert.equal(saved(b).localSync.pending.length,0);
});
for(const kind of ['edit/edit','delete/edit','total']) {
  test(kind+': concurrent changes keep local and remote originals across restart',async()=>{
    const s=server(data()),a=device(s);await sync(a);const b=device(s,a.values.get(key));
    if(kind==='total'){a.store.setTotalVacationDays(0);b.store.setTotalVacationDays(20);}
    else {if(kind==='delete/edit')a.store.deleteVacation('vac-full');else a.store.updateVacation('vac-full',{reason:'Local'});
      b.store.updateVacation('vac-full',{reason:'Remote'});}
    assert.equal(await sync(b),true);const before=saved(a);assert.equal(await sync(a),false);
    const after=saved(a);assert.deepEqual(after.vacations,before.vacations);
    assert.equal(after.totalVacationDays,before.totalVacationDays);
    assert.deepEqual(after.localSync.pending,before.localSync.pending);
    assert.ok(after.localSync.conflicts.some(c=>kind==='total'?c.remote===20:c.remote?.reason==='Remote'));
    assert.deepEqual(saved(device(s,a.values.get(key))).localSync.conflicts,after.localSync.conflicts);
  });
}
test('acknowledged deletion rejects stale remote vacation resurrection and keeps conflict original',async()=>{
  const s=server(data()),h=device(s);await sync(h);const old=clone(s.data);
  h.store.deleteVacation('vac-full');assert.equal(await sync(h),true);
  s.data=old;s.rev++;const puts=h.requests.filter(r=>r.options.method==='PUT').length;
  assert.equal(await sync(h),false);assert.equal(saved(h).vacations.some(v=>v.id==='vac-full'),false);
  assert.ok(saved(h).localSync.conflicts.some(c=>c.remote?.id==='vac-full'));
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,puts);
});
test('equal legacy vacation rows cannot override a retained deletion marker',async()=>{
  const d=data();d.deletedItemIds.push('vac-full');const s=server(d),h=device(s,JSON.stringify(d));
  assert.equal(await sync(h),true);assert.equal(saved(h).vacations.some(v=>v.id==='vac-full'),false);
  assert.equal(s.data.vacations.some(v=>v.id==='vac-full'),false);
});
