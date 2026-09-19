// Synthetic storage/server only. No browser profiles, backups or Firebase.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {harness, fixture, key, source} = require('./sync-harness.cjs');
const {server, sync, saved, clone} = require('./ai-sync-harness.cjs');
const data = () => ({...clone(fixture),
  siteFolders:[{id:'all',name:'전체',icon:'🌐'},{id:'portal',name:'포털',icon:'🔍'},
    {id:'work',name:'업무',icon:'💼'},{id:'sfolder-test',name:'개인 폴더',icon:'📁'}],
  sites:[{id:'site-test',title:'기존 사이트',url:'https://example.invalid',folder:'sfolder-test',memo:'원문'}]});
const local = raw => harness(raw || JSON.stringify(data()),
  {extras:{todolist_jy_space_id:'',todolist_jy_pin:''}});
const device = (s,raw=JSON.stringify(data())) => {
  const h=s.attach(harness(raw));
  // Keep race ordering explicit; sync() still runs the real central engine.
  h.context.cloudSync.pushTasksToCloud=()=>false;
  return h;
};
const state = h => clone({sites:h.store.sites, folders:h.store.siteFolders,
  deleted:[...(h.store.deletedItemIds || [])], active:h.store.activeSiteFolder, meta:h.store.localSync});
const operations = {
  addSite:h=>h.store.addSite({title:'새 사이트',url:'example.invalid/new'}),
  updateSite:h=>h.store.updateSite('site-test',{title:'수정',memo:'수정 원문'}),
  deleteSite:h=>h.store.deleteSite('site-test'),
  addFolder:h=>h.store.addSiteFolder('새 폴더','⭐'),
  updateFolder:h=>h.store.updateSiteFolder('sfolder-test',{name:'수정 폴더',icon:'⭐'}),
  deleteFolder:h=>h.store.deleteSiteFolder('sfolder-test')
};
for (const [name, operation] of Object.entries(operations)) {
  test(name + ': failed local write preserves memory, durable data and outbox', () => {
    const h=local();h.store.activeSiteFolder='sfolder-test';
    const before=state(h),raw=h.values.get(key);
    h.context.localStorage.setItem=()=>{throw Error('Fixture quota');};
    assert.ok(!operation(h), 'Must return failure');
    assert.deepEqual(state(h),before);
    assert.equal(h.values.get(key),raw);
    assert.equal(h.requests.length,0);
    assert.equal(h.store.saveStatus,'failed');
  });
}

test('site and folder forms keep drafts and show no success on failed save', () => {
  for (const editing of [false,true]) for (const folder of [false,true]) {
    const h=local(),listeners={},toasts=[];let closed=false;
    const fields=folder?{'site-folder-edit-id':editing?'sfolder-test':'',
      'site-folder-input-name':'폴더 원문','site-folder-selected-icon':'⭐'}:
      {'site-edit-id':editing?'site-test':'','site-input-title':'입력 원문','site-input-url':'https://example.invalid',
        'site-input-folder':'portal','site-input-memo':'보존 메모'};
    const elements=Object.fromEntries(Object.entries(fields).map(([id,value])=>[id,{value}]));
    elements[folder?'site-folder-form':'site-form']={addEventListener:(name,fn)=>{listeners[name]=fn;}};
    h.context.document.getElementById=id=>elements[id]||null;
    Object.assign(h.context.UI,{showToast:message=>toasts.push(message),renderSites(){},
      closeSiteModal(){closed=true;},closeSiteFolderModal(){closed=true;}});
    h.context.sounds={playComplete(){}};
    h.context.localStorage.setItem=()=>{throw Error('Fixture quota');};
    vm.runInContext(source.slice(source.indexOf('    const siteForm ='),source.indexOf('    const btnDeleteSiteFolder =')),h.context);
    listeners.submit({preventDefault(){}});
    assert.equal(closed,false);assert.deepEqual(toasts,[]);
    for(const [id,value] of Object.entries(fields))assert.equal(elements[id].value,value);
  }
});

test('delete folder moves sites and resets selection in one durable commit', () => {
  const h=local();h.store.activeSiteFolder='sfolder-test';
  assert.equal(h.store.deleteSiteFolder('sfolder-test'),true);
  const result=saved(h);
  assert.equal(result.sites[0].folder,'portal');
  assert.equal(result.siteFolders.some(f=>f.id==='sfolder-test'),false);
  assert.equal(h.store.activeSiteFolder,'all');
  assert.equal(h.writes.filter(k=>k===key).length,1);
  assert.equal(local(h.values.get(key)).store.siteFolders.some(f=>f.id==='sfolder-test'),false);
});

test('saved default-folder deletion is preserved across restart (no template resurrection)', () => {
  const h=local();h.store.deleteSiteFolder('work');
  const restarted=local(h.values.get(key));
  assert.equal(restarted.store.siteFolders.some(f=>f.id==='work'),false);
});

test('portal and all are protected routing folders; rejection preserves all data', () => {
  for(const id of ['all','portal']) {
    const h=local(),before=state(h),raw=h.values.get(key);
    assert.equal(h.store.deleteSiteFolder(id),false);
    assert.deepEqual(state(h),before);assert.equal(h.values.get(key),raw);
  }
});

test('folder deletion reaches an older device without reviving the folder or deleting work tasks/categories', async () => {
  for (const id of ['sfolder-test','work']) {
    const s=server(data()),a=device(s);
    assert.equal(await sync(a),true);
    const b=device(s,a.values.get(key));
    assert.equal(a.store.deleteSiteFolder(id),true);
    assert.equal(await sync(a),true);
    assert.equal(await sync(b),true);
    assert.equal(saved(b).siteFolders.some(f=>f.id===id),false);
    assert.equal(s.data.siteFolders.some(f=>f.id===id),false);
    assert.ok(s.data.tasks.some(t=>t.id==='user-task'&&t.category==='work'));
    assert.ok(s.data.categories.some(c=>c.id==='work'));
    assert.equal(s.data.deletedItemIds.includes('work'),false,'Folder tombstones must not target shared IDs');
  }
});

test('failed upload, restart, stale server and retry keep pending site edits', async () => {
  const s=server(data()),a=device(s);
  assert.equal(await sync(a),true);s.failPUT=true;
  assert.ok(a.store.updateSite('site-test',{memo:'미전송 원문'}));
  assert.equal(await sync(a),false);
  const before=saved(a),b=device(s,a.values.get(key));
  assert.deepEqual(saved(b).localSync.pending,before.localSync.pending);
  assert.equal(await sync(b),false);
  assert.equal(saved(b).sites[0].memo,'미전송 원문');
  s.failPUT=false;assert.equal(await sync(b),true);
  assert.equal(s.data.sites[0].memo,'미전송 원문');assert.equal(saved(b).localSync.pending.length,0);
});

test('acknowledged site or folder deletion is not silently revived by a stale server', async () => {
  for(const folder of [false,true]) {
    const s=server(data()),h=device(s);
    await sync(h);const old=clone(s.data);
    if(folder)h.store.deleteSiteFolder('sfolder-test');else h.store.deleteSite('site-test');
    assert.equal(await sync(h),true);
    // Old device sends its old rows; retained local deletion record must protect them.
    s.data=old;s.rev++;
    const putsBefore=h.requests.filter(r=>r.options.method==='PUT').length;
    assert.equal(await sync(h),false);
    const field=folder?'siteFolders':'sites',id=folder?'sfolder-test':'site-test';
    assert.equal(saved(h)[field].some(item=>item.id===id),false);
    assert.ok(saved(h).localSync.conflicts.some(c=>c.key===JSON.stringify([field,id])&&c.remote?.id===id));
    assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,putsBefore);
  }
});

test('folder delete versus rename preserves the remote name in a conflict', async () => {
  const s=server(data()),a=device(s);await sync(a);const b=device(s,a.values.get(key));
  a.store.deleteSiteFolder('sfolder-test');b.store.updateSiteFolder('sfolder-test',{name:'다른 기기의 폴더명'});
  await sync(b);assert.equal(await sync(a),false);
  assert.equal(saved(a).siteFolders.some(f=>f.id==='sfolder-test'),false);
  assert.ok(saved(a).localSync.conflicts.some(c=>c.remote?.name==='다른 기기의 폴더명'));
});

test('readback failure keeps memory unchanged and leaves the durable candidate recoverable', () => {
  const h=local(),before=state(h),get=h.context.localStorage.getItem;let written=false;
  const set=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(k,v)=>{set(k,v);if(k===key)written=true;};
  h.context.localStorage.getItem=k=>{if(k===key&&written)throw Error('Fixture readback denied');return get(k);};
  assert.equal(h.store.deleteSiteFolder('sfolder-test'),false);
  assert.deepEqual(state(h),before);assert.equal(h.requests.length,0);
  const restarted=local(h.values.get(key));
  assert.equal(restarted.store.localSyncInvalid,false);
  assert.equal(restarted.store.siteFolders.some(f=>f.id==='sfolder-test'),false);
  assert.equal(restarted.store.sites[0].folder,'portal');
  assert.ok(restarted.store.localSync.pending.length);
});

test('legacy missing portal is restored only during successful explicit folder deletion', () => {
  const legacy=data();legacy.siteFolders=legacy.siteFolders.filter(f=>f.id!=='portal');
  const raw=JSON.stringify(legacy),h=local(raw);
  assert.equal(h.values.get(key),raw);assert.equal(h.writes.length,0);
  assert.equal(h.store.siteFolders.some(f=>f.id==='portal'),false);
  assert.equal(h.store.deleteSiteFolder('sfolder-test'),true);
  assert.ok(saved(h).siteFolders.some(f=>f.id==='portal'));
  assert.equal(saved(h).sites[0].folder,'portal');
});

test('unreadable data and invalid outbox block site operations without changing originals', () => {
  for(const raw of ['{broken',JSON.stringify({...data(),localSync:{version:999}})]) {
    for(const operation of Object.values(operations)) {
      const h=local(raw),before=state(h);
      assert.ok(!operation(h));assert.deepEqual(state(h),before);
      assert.equal(h.values.get(key),raw);assert.equal(h.requests.length,0);
    }
  }
});

test('concurrent site edit versus deletion preserves the remote original as a conflict', async () => {
  const s=server(data()),a=device(s);await sync(a);
  const b=device(s,a.values.get(key));
  a.store.deleteSite('site-test');b.store.updateSite('site-test',{memo:'다른 기기 원문'});
  await sync(b);assert.equal(await sync(a),false);
  assert.equal(saved(a).sites.length,0);
  assert.ok(saved(a).localSync.conflicts.some(c=>c.remote?.memo==='다른 기기 원문'));
  assert.equal(s.data.sites[0].memo,'다른 기기 원문');
});
