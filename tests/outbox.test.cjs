const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {harness, fixture, key} = require('./sync-harness.cjs');
const clone = x => JSON.parse(JSON.stringify(x));

// No real fetch implementation is available to the sandbox.
function server(initial = {}) {
  return { data:clone(initial), rev:1, failGET:false, failPUT:false, beforePUT:null, afterPUT:null,
    attach(h) {
      h.context.fetch = async (url, options = {}) => {
        h.requests.push({url,options});
        const put = options.method === 'PUT';
        if (put && this.beforePUT) { const fn=this.beforePUT; this.beforePUT=null; await fn(); }
        let status = put ? this.failPUT ? 503 : options.headers['if-match'] !== String(this.rev) ? 412 : 200 : this.failGET ? 503 : 200;
        if (put && status === 200) {
          const wire=JSON.parse(options.body);
          assert.equal(wire.isEncrypted,true);
          this.data=JSON.parse(wire.payload); this.rev++;
          if (this.afterPUT) await this.afterPUT();
        }
        const data=clone(this.data), etag=String(this.rev);
        return {ok:status===200,status,headers:{get:()=>etag},json:async()=>data};
      };
      return h;
    }
  };
}
async function sync(h) { h.context.cloudSync.retryAfter=0; return h.context.cloudSync.pushTasksToCloud(true); }
function restart(h,s) { return s.attach(harness(h.values.get(key))); }
function saved(h) {return JSON.parse(h.values.get(key));}

test('SHA-256 fingerprints match Node for Unicode, long content and stable object order', () => {
  const h=harness(JSON.stringify(fixture));
  for(const v of ['메모 💖', {b:2,a:1}, 'x'.repeat(10000)]) {
    assert.equal(h.context.protocol.hash(v),createHash('sha256').update(h.context.protocol.canonical(v)).digest('hex'));
  }
  assert.equal(h.context.protocol.hash({a:1,b:2}),h.context.protocol.hash({b:2,a:1}));
});

test('1: memo commits locally with outbox before any network; successful server response clears it', async () => {
  const s=server(), h=s.attach(harness(JSON.stringify(fixture)));
  const note=h.store.addNote('D');
  assert.ok(note);
  assert.equal(h.requests.length,0);
  assert.ok(saved(h).notes.some(n=>n.id===note.id));
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(await sync(h),true);
  assert.ok(s.data.notes.some(n=>n.content==='D'));
  assert.equal(saved(h).localSync.pending.length,0);
  assert.equal(h.store.saveStatus,'confirmed');
});

test('2/3/4/5: failed PUT, restart, stale server, recovery preserve D until acknowledgement', async () => {
  const s=server(), h=s.attach(harness(JSON.stringify(fixture)));
  assert.equal(await sync(h),true); // Establish the real A/B/C baseline.
  const old=clone(s.data);
  const note=h.store.addNote('D'); s.failPUT=true;
  assert.equal(await sync(h),false);
  assert.ok(saved(h).notes.some(n=>n.id===note.id));
  assert.ok(saved(h).localSync.pending.length);
  const reopened=restart(h,s);
  assert.ok(reopened.store.notes.some(n=>n.id===note.id));
  const pendingBefore=clone(saved(reopened).localSync.pending);
  await reopened.context.cloudSync.fetchLatestFromCloud(true);
  assert.deepEqual(saved(reopened).localSync.pending,pendingBefore);
  assert.ok(saved(reopened).notes.some(n=>n.id===note.id));
  assert.deepEqual(s.data,old);
  s.failPUT=false;
  assert.equal(await sync(reopened),true);
  assert.ok(s.data.notes.some(n=>n.id===note.id));
  assert.equal(saved(reopened).localSync.pending.length,0);
});

test('6/8: missing metadata preserves legacy bytes; damaged metadata blocks writes without losing memo', async () => {
  for(const meta of [undefined,null,{version:1,pending:[]},{version:99},'broken']) {
    const data=clone(fixture);if(meta!==undefined)data.localSync=meta;
    const raw=JSON.stringify(data),s=server(),h=s.attach(harness(raw));
    assert.equal(h.values.get(key),raw);
    assert.deepEqual(clone(h.store.notes),fixture.notes);
    if(meta!==undefined){
      assert.equal(await sync(h),false);
      assert.equal(h.store.addNote('must not pretend saved'),null);
      assert.equal(h.values.get(key),raw);
      assert.equal(h.requests.length,0);
    } else assert.equal(await sync(h),true);
  }
});

test('7: localSync is excluded BEFORE encryption and remote localSync never replaces ours', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));
  const encrypt=h.context.E2EESecurityEngine.encrypt;
  h.context.E2EESecurityEngine.encrypt=async data=>{ assert.equal(Object.hasOwn(data,'localSync'),false);return encrypt(data); };
  assert.equal(await sync(h),true);
  assert.equal(Object.hasOwn(s.data,'localSync'),false);
  s.data.localSync={version:999,pending:['another PC']};
  assert.equal(await sync(h),true);
  assert.equal(h.store.localSync.version,1);
  assert.notDeepEqual(clone(h.store.localSync),s.data.localSync);
});

test('A pending D plus B added E both survive', async () => {
  const s=server(),a=s.attach(harness(JSON.stringify(fixture)));
  await sync(a);
  const b=restart(a,s);
  const d=a.store.addNote('D'),e=b.store.addNote('E');
  await sync(b);await sync(a);
  assert.ok(s.data.notes.some(n=>n.id===d.id));
  assert.ok(s.data.notes.some(n=>n.id===e.id));
});

test('same-note conflict retains local body, server body and durable conflict copy', async () => {
  const s=server(),a=s.attach(harness(JSON.stringify(fixture))); await sync(a);
  const b=restart(a,s);
  a.store.updateNote('user-note',{content:'A version'});
  b.store.updateNote('user-note',{content:'B version'});await sync(b);
  assert.equal(await sync(a),false);
  assert.equal(saved(a).notes.find(n=>n.id==='user-note').content,'A version');
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'B version');
  assert.ok(saved(a).localSync.conflicts.some(c=>c.remote?.content==='B version'));
  assert.ok(saved(a).localSync.pending.length);
});

test('conditional PUT rejects a B edit made after A GET; retry preserves both', async () => {
  const s=server(),a=s.attach(harness(JSON.stringify(fixture)));await sync(a);
  const d=a.store.addNote('D');
  s.beforePUT=()=>{s.data.notes.push({id:'E',content:'E'});s.rev++;};
  assert.equal(await sync(a),false);
  assert.ok(saved(a).localSync.pending.length);
  assert.equal(await sync(a),true);
  assert.ok(s.data.notes.some(n=>n.id==='E'));
  assert.ok(s.data.notes.some(n=>n.id===d.id));
});

test('new edit during PUT is not acknowledged by an older success', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D1');
  s.beforePUT=()=>{h.store.updateNote(d.id,{content:'D2'});};
  await sync(h);
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(saved(h).notes.find(n=>n.id===d.id).content,'D2');
  // A previously sent D1 must be recognised as the base of D2 on retry.
  assert.equal(await sync(h),true);
  assert.equal(s.data.notes.find(n=>n.id===d.id).content,'D2');
  assert.equal(saved(h).localSync.pending.length,0);
});

test('local quota failure retains input and original Store data; no upload', async () => {
  const h=harness(JSON.stringify(fixture)),raw=h.values.get(key);
  h.context.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
  const before=clone(h.store.notes);
  assert.equal(h.store.addNote('D'),null);
  assert.deepEqual(clone(h.store.notes),before);
  assert.equal(h.values.get(key),raw);
  assert.equal(h.store.saveStatus,'failed');
  assert.equal(h.requests.length,0);
  const textarea={value:'D'},elements={'note-composer-input':textarea};
  h.context.document.getElementById=id=>elements[id] || null;
  h.context.document.querySelector=()=>null;
  const {source}=require('./sync-harness.cjs'),vm=require('node:vm');
  vm.runInContext(source.slice(source.indexOf('  function handleQuickNote()'),source.indexOf('  function bindEvents()')),h.context);
  h.context.handleQuickNote();
  assert.equal(textarea.value,'D');
});

test('lost PUT response keeps pending; next GET confirms existing record without duplication', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D');
  s.afterPUT=()=>{throw Error('response lost');};
  assert.equal(await sync(h),false);
  assert.ok(saved(h).localSync.pending.length);
  s.afterPUT=null;
  assert.equal(await sync(h),true);
  assert.equal(s.data.notes.filter(n=>n.id===d.id).length,1);
  assert.equal(saved(h).localSync.pending.length,0);
});

test('plaintext fallback is refused; local content and pending survive', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));
  h.store.addNote('D');h.context.E2EESecurityEngine.encrypt=async x=>x;
  assert.equal(await sync(h),false);
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
  assert.ok(saved(h).localSync.pending.length);
});

test('failed GET followed by restart retains notes and pending, without any PUT', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));
  const d=h.store.addNote('D');s.failGET=true;
  assert.equal(await sync(h),false);
  const reboot=restart(h,s);
  assert.ok(reboot.store.notes.some(n=>n.id===d.id));
  assert.ok(saved(reboot).localSync.pending.length);
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
});

test('valid-shaped but tampered pending hashes fail closed', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  h.store.addNote('D');const original=saved(h);
  original.localSync.pending[0].localHash='0'.repeat(64);
  const raw=JSON.stringify(original),reboot=s.attach(harness(raw));
  assert.equal(await sync(reboot),false);
  assert.equal(reboot.values.get(key),raw);
  assert.ok(reboot.store.notes.some(n=>n.content==='D'));
});

test('loss of pending list alone cannot silently permit replacement of D', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  h.store.addNote('D');const original=saved(h);original.localSync.pending=[];
  const raw=JSON.stringify(original),reboot=s.attach(harness(raw));
  assert.equal(reboot.store.localSyncInvalid,true);
  assert.equal(await sync(reboot),false);
  assert.equal(reboot.values.get(key),raw);
});

test('loss of all metadata treats local originals as unconfirmed and preserves D', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  h.store.addNote('D');const original=saved(h);delete original.localSync;
  const reboot=s.attach(harness(JSON.stringify(original)));
  assert.equal(await sync(reboot),true);
  assert.ok(s.data.notes.some(n=>n.content==='D'));
});

test('server acknowledgement followed by local failure does not erase durable outbox', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  h.store.addNote('D');
  s.afterPUT=()=>{h.context.localStorage.setItem=()=>{throw Error('quota');};};
  assert.equal(await sync(h),false);
  assert.ok(saved(h).localSync.pending.length);
  assert.ok(s.data.notes.some(n=>n.content==='D'));
  s.afterPUT=null;const reboot=restart(h,s);
  assert.equal(await sync(reboot),true);
  assert.equal(saved(reboot).localSync.pending.length,0);
});

test('different account target cannot receive pending data', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));
  h.store.addNote('D');h.context.cloudSync.pin='different-fixture-pin';
  assert.equal(await sync(h),false);
  assert.equal(h.requests.length,0);
  assert.ok(saved(h).localSync.pending.length);
});

test('account change during encryption cannot write into old account', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));h.store.addNote('D');
  const encrypt=h.context.E2EESecurityEngine.encrypt;
  h.context.E2EESecurityEngine.encrypt=async data=>{h.context.cloudSync.pin='other';return encrypt(data);};
  assert.equal(await sync(h),false);
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
});

test('AI study add/edit preserve original body and open form on local failure', () => {
  const h=harness(JSON.stringify(fixture)),raw=h.values.get(key);
  h.context.localStorage.setItem=()=>{throw Error('quota');};
  assert.equal(h.store.addAiStudyNote({title:'D'}),null);
  assert.equal(h.store.updateAiStudyNote('user-ai',{content:'new',tags:'a,b'}),null);
  assert.equal(h.store.aiStudyNotes.find(n=>n.id==='user-ai').content,'Study content');
  assert.equal(h.values.get(key),raw);
});

test('stale tab refuses to overwrite a newer persisted snapshot', () => {
  const h=harness(JSON.stringify(fixture));const newer=JSON.stringify({...fixture,notes:[...fixture.notes,{id:'other',content:'other tab'}]});
  h.values.set(key,newer);
  assert.equal(h.store.addNote('D'),null);
  assert.equal(h.values.get(key),newer);
});

test('UI startup without browser writer lock fails closed', () => {
  const h=harness(JSON.stringify(fixture));h.context.navigator={};
  h.context.initApp();
  assert.equal(h.body.inert,true);
  assert.equal(h.store.writerBlocked,true);
  assert.equal(h.store.addNote('D'),null);
});

test('a second browser window denied the writer lock cannot save', async () => {
  const h=harness(JSON.stringify(fixture));
  h.context.addEventListener=()=>{};
  h.context.navigator={locks:{request:async(name,opts,cb)=>cb(null)}};
  h.context.initApp();await Promise.resolve();
  assert.equal(h.body.inert,true);
  assert.equal(h.store.writerBlocked,true);
  assert.equal(h.store.addNote('D'),null);
});

test('vault read failure cannot turn into an empty cloud upload', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));h.store.addNote('D');
  h.context.cloudSync.getAllVaultFiles=async()=>{throw Error('fake IDB failure');};
  assert.equal(await sync(h),false);
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
  assert.ok(saved(h).localSync.pending.length);
});

test('metadata-only cloud vault cannot replace local file contents', async () => {
  const s=server({vaultFiles:[{id:'f',name:'file',size:2}]}),h=s.attach(harness(JSON.stringify(fixture)));
  const file={id:'f',name:'file',size:2,dataUrl:'data:fake-local-content'};
  h.context.cloudSync.getAllVaultFiles=async()=>[file];
  h.context.cloudSync.saveVaultFiles=async items=>{assert.equal(items[0].dataUrl,file.dataUrl);};
  assert.equal(await sync(h),true);
  assert.equal(s.data.vaultFiles[0].dataUrl,file.dataUrl);
});

test('full application script loads with fake DOM and keeps existing storage bytes', () => {
  const {source}=require('./sync-harness.cjs'),vm=require('node:vm');
  const h=harness(JSON.stringify(fixture)),raw=h.values.get(key);
  h.context.document.readyState='loading';
  h.context.document.addEventListener=()=>{};
  h.context.addEventListener=()=>{};
  vm.runInContext(source,h.context);
  assert.equal(h.values.get(key),raw);
  assert.equal(typeof h.context.UI.openAiStudyModal,'function');
  assert.equal(h.context.store.notes[0].content,fixture.notes[0].content);
});

test('AI form remains open and no success message appears on failed local commit', () => {
  const {source}=require('./sync-harness.cjs'),vm=require('node:vm');
  const h=harness(JSON.stringify(fixture));let submit,closed=false,toasts=0;
  const elements={
    'aistudy-modal-form':{addEventListener:(event,callback)=>{submit=callback;}},
    'aistudy-modal-title':{value:'D'},'aistudy-modal-content':{value:'Unsaved draft'}
  };
  h.context.document.getElementById=id=>elements[id]||null;
  h.context.UI.closeAiStudyModal=()=>{closed=true;};
  h.context.UI.showToast=()=>{toasts++;};
  h.context.localStorage.setItem=()=>{throw Error('quota');};
  vm.runInContext(source.slice(source.indexOf("    const aiModalForm ="),source.indexOf('    // 5. Card Actions Delegation')),h.context);
  submit({preventDefault(){}});
  assert.equal(closed,false);assert.equal(toasts,0);
  assert.equal(elements['aistudy-modal-content'].value,'Unsaved draft');
});

test('hanging request is aborted and leaves durable pending data for later retry', async () => {
  const h=harness(JSON.stringify(fixture));h.store.addNote('D');
  const timeouts=[];
  h.context.setTimeout=(callback,delay)=>{timeouts.push({callback,delay});return timeouts.length;};
  h.context.fetch=(url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))));
  const work=sync(h);
  assert.equal(timeouts[0].delay,15000);timeouts[0].callback();
  assert.equal(await work,false);
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(h.context.cloudSync.isPushing,false);
});

test('readback failure does not report success and retains draft', () => {
  const h=harness(JSON.stringify(fixture)),get=h.context.localStorage.getItem;
  let reads=0;h.context.localStorage.getItem=k=>{if(k===key && ++reads===2)throw Error('readback failed');return get(k);};
  assert.equal(h.store.addNote('D'),null);
  assert.equal(h.store.saveStatus,'failed');
  assert.equal(h.requests.length,0);
  // The write may have succeeded: the durable candidate still contains its outbox.
  assert.ok(saved(h).notes.some(n=>n.content==='D'));
  assert.ok(saved(h).localSync.pending.length);
});

test('new browser does not treat built-in defaults as conflicting user edits', async () => {
  const s=server(),a=s.attach(harness(null));await sync(a);
  s.data.projects[0].name='Edited on A';s.rev++;
  const fresh=s.attach(harness(null));
  assert.equal(await sync(fresh),true);
  assert.equal(fresh.store.projects[0].name,'Edited on A');
});

// Manual controls use only this fake DOM and the in-memory server above.
function mountSyncControls(h) {
  const elements = {};
  for (const id of ['btn-manual-sync','manual-sync-state','local-save-status','btn-export-data']) {
    elements[id] = {attributes:{}, setAttribute(k,v){this.attributes[k]=v;},
      addEventListener(event,fn){this[event]=fn;}};
  }
  h.context.document.getElementById = id => elements[id] || null;
  const toasts = [];
  h.context.UI.showToast = (message,type) => toasts.push({message,type});
  h.store.renderSaveStatus();
  return {elements,toasts};
}
const puts = h => h.requests.filter(r => r.options.method === 'PUT');
const deferred = () => {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('manual: top button and settings bind to one entry point; both HTML entry pages match', async () => {
  const {source}=require('./sync-harness.cjs'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
  const h=harness(JSON.stringify(fixture)),{elements}=mountSyncControls(h);let called=0;
  h.context.cloudSync.requestManualSync=async()=>{called++;};
  vm.runInContext(source.slice(source.indexOf('    // Both entry points use'),source.indexOf('    const importInput =')),h.context);
  await elements['btn-manual-sync'].click();await elements['btn-export-data'].click();
  assert.equal(called,2);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.equal(html,fs.readFileSync(path.join(__dirname,'../ToDoList.html'),'utf8'));
  assert.equal((html.match(/id="btn-manual-sync"/g)||[]).length,1);
  assert.ok(html.indexOf('id="btn-force-reload"') < html.indexOf('id="btn-manual-sync"'));
  assert.ok(html.indexOf('id="btn-manual-sync"') < html.indexOf('id="btn-cloud-status"'));
});

test('manual: equal server GET still requires an actual conditional PUT before success', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const {elements,toasts}=mountSyncControls(h),entered=deferred(),release=deferred();
  const before=puts(h).length;
  s.beforePUT=async()=>{entered.resolve();await release.promise;};
  const work=h.context.cloudSync.requestManualSync();await entered.promise;
  assert.equal(elements['btn-manual-sync'].disabled,true);
  assert.equal(elements['manual-sync-state'].textContent,'동기화 중');
  assert.equal(toasts.length,0);
  release.resolve();assert.equal(await work,true);
  assert.equal(puts(h).length,before+1);
  assert.ok(puts(h).at(-1).options.headers['if-match']);
  assert.equal(elements['btn-manual-sync'].disabled,false);
  assert.equal(elements['manual-sync-state'].textContent,'동기화 완료');
  assert.deepEqual(toasts,[{message:'동기화 성공',type:'success'}]);
});

test('manual: PUT failure keeps local body and exact pending records, restart and retry succeed', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('Newest D'),pending=clone(saved(h).localSync.pending),before=clone(s.data);
  const {elements,toasts}=mountSyncControls(h);s.failPUT=true;
  const start=h.requests.length;
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.deepEqual(h.requests.slice(start).map(r=>r.options.method||'GET'),['GET','PUT']);
  assert.equal(elements['manual-sync-state'].textContent,'동기화 실패');
  assert.equal(toasts.at(-1).message,'동기화 실패 · 이 기기에는 안전하게 저장되어 있습니다');
  assert.deepEqual(saved(h).localSync.pending,pending);assert.deepEqual(s.data,before);
  const reboot=restart(h,s);
  assert.equal(reboot.store.notes.find(n=>n.id===d.id).content,'Newest D');
  assert.deepEqual(saved(reboot).localSync.pending,pending);
  assert.equal(await reboot.context.cloudSync.requestManualSync(),false);
  s.failPUT=false;
  // The manual retry bypasses the automatic retry delay, without clearing pending first.
  assert.ok(reboot.context.cloudSync.retryAfter > reboot.context.Date.now());
  assert.equal(await reboot.context.cloudSync.requestManualSync(),true);
  assert.equal(s.data.notes.find(n=>n.id===d.id).content,'Newest D');
  assert.equal(saved(reboot).localSync.pending.length,0);
});

test('manual: local quota failure blocks GET/PUT and never claims the device copy is safe', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));h.store.addNote('D');
  const raw=h.values.get(key),{elements,toasts}=mountSyncControls(h);
  h.context.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,0);
  assert.equal(elements['manual-sync-state'].textContent,'로컬 저장 실패');
  assert.ok(toasts.every(t=>!t.message.includes('안전하게') && t.type!=='success'));
});

test('manual: existing local write failure keeps draft and blocks upload', async () => {
  const h=harness(JSON.stringify(fixture));h.store.localWriteFailed=true;
  const {toasts}=mountSyncControls(h),raw=h.values.get(key);
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.equal(h.requests.length,0);assert.equal(h.values.get(key),raw);
  assert.equal(toasts.at(-1).type,'warning');assert.equal(h.store.saveStatus,'failed');
});

test('manual: automatic in-flight sync and rapid clicks serialize, then send latest D2 once', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D1'),entered=deferred(),release=deferred();
  const {toasts}=mountSyncControls(h),before=puts(h).length;
  s.beforePUT=async()=>{entered.resolve();await release.promise;};
  const automatic=sync(h);await entered.promise;
  const manual=h.context.cloudSync.requestManualSync();
  assert.equal(h.context.cloudSync.requestManualSync(),manual);
  h.store.updateNote(d.id,{content:'D2'});
  const polling=h.context.cloudSync.fetchLatestFromCloud();
  await Promise.resolve();assert.equal(puts(h).length,before+1);
  release.resolve();await automatic;await polling;
  assert.equal(await manual,true);
  assert.equal(puts(h).length,before+2);
  assert.equal(s.data.notes.find(n=>n.id===d.id).content,'D2');
  assert.equal(toasts.filter(t=>t.type==='success').length,1);
  assert.equal(saved(h).localSync.pending.length,0);
});

test('manual: queued automatic debounce is cancelled; polling cannot overtake manual work', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture))),cancelled=[];
  h.context.clearTimeout=id=>cancelled.push(id);h.store.addNote('D');
  const scheduled=h.context.cloudSync.pushDebounceTimer;
  const work=h.context.cloudSync.requestManualSync();
  assert.ok(cancelled.includes(scheduled));
  assert.equal(h.context.cloudSync.pushDebounceTimer,null);
  assert.equal(await h.context.cloudSync.fetchLatestFromCloud(),false);
  assert.equal(await work,true);assert.equal(puts(h).length,1);
});

test('manual: new edit during its own PUT stays pending and cannot show success', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D1'),{elements,toasts}=mountSyncControls(h);
  s.beforePUT=()=>h.store.updateNote(d.id,{content:'D2'});
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.equal(s.data.notes.find(n=>n.id===d.id).content,'D1');
  assert.equal(saved(h).notes.find(n=>n.id===d.id).content,'D2');
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(elements['manual-sync-state'].textContent,'동기화 필요');
  assert.ok(toasts.every(t=>t.type!=='success'));
  assert.equal(await h.context.cloudSync.requestManualSync(),true);
  assert.equal(s.data.notes.find(n=>n.id===d.id).content,'D2');
});

test('manual: server 412 preserves a different device edit, retry merges both additions', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D');s.beforePUT=()=>{s.data.notes.push({id:'E',content:'PC B'});s.rev++;};
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.ok(saved(h).localSync.pending.length);assert.ok(s.data.notes.some(n=>n.id==='E'));
  assert.equal(await h.context.cloudSync.requestManualSync(),true);
  assert.ok(s.data.notes.some(n=>n.id===d.id));assert.ok(s.data.notes.some(n=>n.id==='E'));
});

test('manual: same-note conflict does not upload or discard either device version', async () => {
  const s=server(),a=s.attach(harness(JSON.stringify(fixture)));await sync(a);
  const b=restart(a,s);a.store.updateNote('user-note',{content:'A'});
  b.store.updateNote('user-note',{content:'B'});await sync(b);
  const before=puts(a).length,{toasts}=mountSyncControls(a);
  assert.equal(await a.context.cloudSync.requestManualSync(),false);
  assert.equal(puts(a).length,before);
  assert.equal(saved(a).notes.find(n=>n.id==='user-note').content,'A');
  assert.equal(s.data.notes.find(n=>n.id==='user-note').content,'B');
  assert.ok(saved(a).localSync.pending.length);assert.ok(saved(a).localSync.conflicts.length);
  assert.ok(toasts.every(t=>t.type!=='success'));
});

test('manual: damaged metadata and read failure preserve original bytes and block network', async () => {
  for (const raw of ['{broken',JSON.stringify({...fixture,localSync:{version:999}})]) {
    const h=harness(raw);mountSyncControls(h);
    assert.equal(await h.context.cloudSync.requestManualSync(),false);
    assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,0);
  }
});

test('manual: legacy data uploads with localSync excluded before encryption and on download', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture))),encrypt=h.context.E2EESecurityEngine.encrypt;
  s.data.localSync={version:999,pending:['other-device']};
  h.context.E2EESecurityEngine.encrypt=async data=>{assert.equal('localSync' in data,false);return encrypt(data);};
  assert.equal(await h.context.cloudSync.requestManualSync(),true);
  assert.equal(saved(h).localSync.version,1);assert.equal('localSync' in s.data,false);
  assert.deepEqual(saved(h).notes,fixture.notes);
});

test('manual: lost response preserves outbox, another click repeats PUT before success', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));await sync(h);
  const d=h.store.addNote('D');s.afterPUT=()=>{throw Error('response lost');};
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.ok(saved(h).localSync.pending.length);const before=puts(h).length;s.afterPUT=null;
  assert.equal(await h.context.cloudSync.requestManualSync(),true);
  assert.equal(puts(h).length,before+1);
  assert.equal(s.data.notes.filter(n=>n.id===d.id).length,1);
});

test('manual: server success followed by local acknowledgement failure cannot show success', async () => {
  const s=server(),h=s.attach(harness(JSON.stringify(fixture)));h.store.addNote('D');
  const {elements,toasts}=mountSyncControls(h);
  s.afterPUT=()=>{h.context.localStorage.setItem=()=>{throw Error('quota');};};
  assert.equal(await h.context.cloudSync.requestManualSync(),false);
  assert.ok(saved(h).localSync.pending.length);
  assert.equal(elements['manual-sync-state'].textContent,'로컬 저장 실패');
  assert.ok(toasts.every(t=>t.type!=='success'));
});

test('manual: signed-out and changed-account requests do not send device data', async () => {
  for (const pin of ['', 'another-account']) {
    const h=harness(JSON.stringify(fixture));h.store.addNote('D');h.context.cloudSync.pin=pin;
    const pending=clone(saved(h).localSync.pending);mountSyncControls(h);
    assert.equal(await h.context.cloudSync.requestManualSync(),false);
    assert.equal(h.requests.length,0);assert.deepEqual(saved(h).localSync.pending,pending);
  }
});
