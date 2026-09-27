const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {harness,fixture,key}=require('./sync-harness.cjs');
const {server,sync,saved,clone}=require('./ai-sync-harness.cjs');
const fields=['tasks','notes','photos','wishlist','sites','aiStudyNotes','healthNotes','hobbyNotes','vacations','subscriptions','ledgerFiles','treasures','projects'];
const rows=[{id:'a',createdAt:10,title:'A'},{id:'hidden',createdAt:15,title:'Hidden'},{id:'b',createdAt:20,title:'B'},{id:'c',createdAt:30,title:'C'}];
const data=field=>({...clone(fixture),[field]:clone(rows)});
test('latest order copies arrays, ignores edit/business dates, retains legacy and tie order; preferences never write business data',()=>{
  const values=new Map(),ctx={window:null,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};ctx.window=ctx;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/list-order.js'),'utf8'),ctx);
  const list=[{id:'legacy'},{id:'old',createdAt:1,updatedAt:999,date:'2099-01-01'},{id:'new',createdAt:2},{id:'tie',createdAt:2},{id:'legacy2'}];
  assert.deepEqual(Array.from(ctx.ListOrder.sort('notes',list),x=>x.id),['new','tie','old','legacy','legacy2']);
  assert.equal(list[0].id,'legacy');assert.equal(values.size,0);ctx.ListOrder.setMode('notes','manual');
  assert.deepEqual(Array.from(ctx.ListOrder.sort('notes',list),x=>x.id),list.map(x=>x.id));assert.equal(values.has(key),false);
});
for(const field of fields)test(field+': reorder preserves hidden rows, exact record contents and restart state; failed/stale writes cannot publish',()=>{
  const h=harness(JSON.stringify(data(field)));h.context.cloudSync.pushTasksToCloud=()=>false;
  const original=clone(h.store[field]);
  assert.equal(h.store.reorderVisibleList(field,['a','b','c'],'c','a',false,h.store._lastLocalRaw),true);
  assert.deepEqual(clone(h.store[field]).map(x=>x.id),['c','hidden','a','b']);
  for(const row of h.store[field])assert.deepEqual(clone(row),original.find(x=>x.id===row.id));
  assert.deepEqual(clone(harness(h.values.get(key)).store[field]),clone(h.store[field]));
  const raw=h.store._lastLocalRaw,before=clone(h.store[field]);
  assert.equal(h.store.reorderVisibleList(field,['c','a','b'],'b','c',false,'stale'),false);
  h.context.localStorage.setItem=()=>{throw Error('Synthetic quota');};
  assert.equal(h.store.reorderVisibleList(field,['c','a','b'],'b','c',false,raw),false);
  assert.deepEqual(clone(h.store[field]),before);assert.equal(h.values.get(key),raw);
});
test('invalid visible lists cannot add, duplicate or delete rows',()=>{
  const h=harness(JSON.stringify(data('notes'))),raw=h.store._lastLocalRaw;
  for(const ids of [['a','a','b'],['a','missing'],['a']])assert.equal(h.store.reorderVisibleList('notes',ids,'a','b',false,raw),false);
  assert.equal(h.store.reorderVisibleList('honeymoonData',['a','b'],'a','b',false,raw),false);assert.equal(h.values.get(key),raw);
});
test('order-only edits use the existing outbox, survive offline restart, preserve concurrent content and converge across devices',async()=>{
  const s=server(data('healthNotes'));const make=raw=>{const h=s.attach(harness(raw));h.context.cloudSync.pushTasksToCloud=()=>false;return h;};
  const a=make(JSON.stringify(data('healthNotes')));await sync(a);const b=make(a.values.get(key));
  assert.equal(a.store.reorderVisibleList('healthNotes',['a','b','c'],'c','a',false,a.store._lastLocalRaw),true);
  s.failPUT=true;assert.equal(await sync(a),false);const restarted=make(a.values.get(key));
  s.failPUT=false;b.store.updateHealthNote('b',{title:'Mobile content'});await sync(b);await sync(restarted);await sync(b);
  assert.deepEqual(saved(restarted).healthNotes,saved(b).healthNotes);
  assert.deepEqual(saved(b).healthNotes.map(x=>x.id),['c','hidden','a','b']);
  assert.equal(saved(b).healthNotes.find(x=>x.id==='b').title,'Mobile content');
  // Simultaneous orders resolve through existing policy; neither can remove records.
  restarted.store.reorderVisibleList('healthNotes',['c','a','b'],'b','c',false,restarted.store._lastLocalRaw);
  b.store.reorderVisibleList('healthNotes',['c','a','b'],'a','b',true,b.store._lastLocalRaw);
  await sync(restarted);await sync(b);await sync(restarted);
  assert.deepEqual(saved(restarted).healthNotes,saved(b).healthNotes);assert.equal(saved(b).healthNotes.length,4);
});
