const test=require('node:test'),assert=require('node:assert/strict');
const {harness,fixture,key}=require('./sync-harness.cjs');
function setup(){const h=harness(JSON.stringify({...fixture,healthFolders:[{id:'general'}],healthNotes:[{id:'health',title:'Original',folder:'general',fileUrl:'old',createdAt:1}]}));h.context.cloudSync.pushTasksToCloud=()=>false;return h;}
test('attachment preparation completes before any record/outbox commit and cannot erase an existing file on failure',async()=>{
  const h=setup(),raw=h.values.get(key);let release;
  h.context.MainStorage={prepare:()=>new Promise(resolve=>release=resolve)};
  const saving=h.store.saveHealthNoteWithAttachment('health',{title:'New',fileUrl:'new'});
  assert.equal(h.values.get(key),raw);release();assert.ok(await saving);assert.equal(h.store.healthNotes[0].fileUrl,'new');
  const saved=h.values.get(key);h.context.MainStorage.prepare=async()=>{throw Error('File storage unavailable');};
  assert.equal(await h.store.saveHealthNoteWithAttachment('health',{fileUrl:'lost'}),null);assert.equal(h.values.get(key),saved);assert.equal(h.store.healthNotes[0].fileUrl,'new');
});
test('cancelled/replaced form or concurrent record edit during preparation rejects stale submit',async()=>{
  for(const kind of ['cancel','remote']){
    const h=setup();let release,current=true;h.context.MainStorage={prepare:()=>new Promise(resolve=>release=resolve)};
    const pending=h.store.saveHealthNoteWithAttachment('health',{fileUrl:'new'},()=>current);
    if(kind==='cancel')current=false;else h.store.updateHealthNote('health',{title:'Newer remote'});
    const before=h.values.get(key);release();assert.equal(await pending,null);assert.equal(h.values.get(key),before);assert.equal(h.store.healthNotes[0].fileUrl,'old');
  }
});
test('status round trip preserves attachments and registration date without modifying legacy rows on read',()=>{
  const h=setup();assert.equal(h.store.healthNotes[0].status,undefined);assert.equal(h.writes.length,0);
  assert.ok(h.store.updateHealthNote('health',{status:'completed'}));assert.equal(h.store.healthNotes[0].fileUrl,'old');assert.equal(h.store.healthNotes[0].createdAt,1);
  assert.equal(harness(h.values.get(key)).store.healthNotes[0].status,'completed');
  assert.equal(h.store.addHealthNote({folder:'general',title:'New'}).status,'in-progress');
});
