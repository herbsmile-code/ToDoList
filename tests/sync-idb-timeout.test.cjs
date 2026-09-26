const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),root=path.resolve(__dirname,'..');
function fakeDb() {
  const timers=new Map(),requests=[];let next=0,closed=0,aborted=0;
  const rowRequest={},tx={objectStore:()=>({get:()=>rowRequest,getAll:()=>rowRequest,add(){}}),abort(){aborted++;tx.onabort?.();}};
  const db={close(){closed++;},transaction:()=>tx,createObjectStore(){}};
  const c={console:{warn(){}},setTimeout(fn){const id=++next;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    indexedDB:{open(){const r={result:db};requests.push(r);return r;}}};c.window=c;
  vm.createContext(c);
  return {c,db,tx,rowRequest,requests,timers,get closed(){return closed;},get aborted(){return aborted;},expire(){const fn=[...timers.values()][0];assert.ok(fn);fn();}};
}
function originals(h){vm.runInContext(fs.readFileSync(path.join(root,'js/sync-originals.js'),'utf8'),h.c);return h.c.SyncOriginals;}
function vault(h){const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8');vm.runInContext(source.slice(source.indexOf('  const VaultDBEngine'),source.indexOf('  const cloudSync ='))+'\nglobalThis.vault=VaultDBEngine;',h.c);return h.c.vault;}
for(const type of ['originals','vault'])test(type+': a stalled IndexedDB open rejects, retries with a new connection and closes late success',async()=>{
  const h=fakeDb(),api=type==='originals'?originals(h):vault(h),read=()=>type==='originals'?api.getAll():api.getAll(true);
  const first=read(),rejected=assert.rejects(first);h.expire();await rejected;
  const second=read();assert.equal(h.requests.length,2);
  h.requests[0].onsuccess({target:{result:h.db}});assert.equal(h.closed,1);
  const secondRejected=assert.rejects(second);h.expire();await secondRejected;
});
test('a stalled original backup transaction is aborted and cannot confirm or append after timeout',async()=>{
  const h=fakeDb(),api=originals(h);let adds=0;
  h.tx.objectStore=()=>({get:()=>h.rowRequest,add(){adds++;}});
  const pending=api.preserve({id:'synthetic'});
  h.requests[0].onsuccess();await Promise.resolve();await Promise.resolve();
  const rejected=assert.rejects(pending);h.expire();await rejected;
  assert.equal(h.aborted,1);
  h.rowRequest.onsuccess();h.tx.oncomplete();assert.equal(adds,0);
});
test('a stalled vault read aborts instead of acknowledging an empty list',async()=>{
  const h=fakeDb(),api=vault(h),pending=api.getAll(true);
  h.requests[0].onsuccess({target:{result:h.db}});await Promise.resolve();await Promise.resolve();await Promise.resolve();
  const rejected=assert.rejects(pending);h.expire();await rejected;
  assert.equal(h.aborted,1);
});
