const test=require('node:test'),assert=require('node:assert/strict');
const {backend,sync,manifest,fixture,clone}=require('./object-sync-harness.cjs');
test('legacy snapshot upgrades atomically and a new device receives every record and attachment',async()=>{
  const data=clone(fixture);data.notes[0].fileUrl='data:application/pdf;base64,'+'A'.repeat(100000);
  const file={id:'vault-original',dataUrl:'data:application/pdf;base64,'+'B'.repeat(120000)};
  const s=backend(data),a=s.attach(data,{vault:[file]});assert.equal(await sync(a),true);assert.equal(s.body.v,4);
  const m=await manifest(s,a);assert.ok(m.legacySnapshot);assert.equal(m.attachments.length,2);
  assert.ok(s.objects.has('/sync_objects/space_fixture-user_fixture-pin/'+m.legacySnapshot.id+'.json'));
  const b=s.attach({...clone(fixture),notes:[]});assert.equal(await sync(b),true);
  assert.equal(b.store.notes[0].fileUrl,data.notes[0].fileUrl);assert.equal(b.vault[0].dataUrl,file.dataUrl);
  assert.equal(JSON.stringify(s.body).includes('application/pdf'),false);
});
test('a memo edit transfers small changed objects and manifest, never the unchanged 12 MB attachment',async()=>{
  const data=clone(fixture),file={id:'big',dataUrl:'data:application/pdf;base64,'+'A'.repeat(12000000)};
  const s=backend(data),a=s.attach(data,{vault:[file]}),b=s.attach(data);await sync(a);await sync(b);
  s.requests.length=0;a.store.addNote('A small new memo');assert.equal(await sync(a),true);assert.equal(await sync(b),true);
  const uploads=s.requests.filter(r=>r.put);assert.ok(uploads.length<6);assert.ok(uploads.reduce((n,r)=>n+r.bytes,0)<100000);
  assert.ok(b.store.notes.some(n=>n.content==='A small new memo'));assert.equal(b.vault[0].dataUrl,file.dataUrl);
  // A restarted device proves unchanged records against its durable originals.
  const restarted=s.attach(clone(b.store._committedData),{vault:b.vault});s.requests.length=0;
  assert.equal(await sync(restarted),true);assert.equal(s.requests.filter(r=>r.isObject).length,0);
});
test('object write failure never publishes an incomplete manifest or clears pending input',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Pending original');const root=JSON.stringify(s.body);
  s.failObjects=true;assert.equal(await sync(h),false);assert.equal(JSON.stringify(s.body),root);assert.ok(h.store.localSync.pending.length);
  s.failObjects=false;assert.equal(await sync(h),true);assert.equal(h.store.localSync.pending.length,0);
});
test('head failure and restart preserve staged immutable objects and local edits until acknowledged',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Pending until head ack');s.failHead=true;
  assert.equal(await sync(h),false);assert.equal(s.body.v,undefined);const objects=s.objects.size;
  const restarted=s.attach(clone(h.store._committedData));s.failHead=false;assert.equal(await sync(restarted),true);
  assert.ok(s.objects.size>=objects);assert.ok(restarted.store.notes.some(n=>n.content==='Pending until head ack'));
});
test('a lost manifest response is confirmed by a fresh read without duplicate records',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Lost reply');s.loseHead=true;
  assert.equal(await sync(h),false);assert.equal(s.body.v,4);assert.ok(h.store.localSync.pending.length);
  const revision=s.rev;assert.equal(await sync(h),true);assert.equal(s.rev,revision);
  assert.equal(h.store.notes.filter(n=>n.content==='Lost reply').length,1);
});
test('competing head writes merge both devices after 412 instead of dropping either edit',async()=>{
  const s=backend(),a=s.attach(),b=s.attach();await sync(a);await sync(b);
  a.store.addNote('PC edit');b.store.addNote('Mobile edit');
  s.beforeHead=async()=>assert.equal(await sync(b),true);
  assert.equal(await sync(a),false);assert.ok(a.store.localSync.pending.length);
  assert.equal(await sync(a),true);assert.equal(await sync(b),true);
  for(const h of [a,b])for(const text of ['PC edit','Mobile edit'])assert.ok(h.store.notes.some(n=>n.content===text));
});
test('a local edit during object upload cannot acknowledge an older snapshot',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Before upload');
  s.beforeObject=async()=>h.store.addNote('During upload');
  assert.equal(await sync(h),false);assert.equal(s.body.v,undefined);assert.ok(h.store.localSync.pending.length);
  assert.equal(await sync(h),true);assert.ok(h.store.notes.some(n=>n.content==='During upload'));
});
for(const mode of ['missing record','missing attachment','corrupt ciphertext'])test(mode+' leaves receiving originals untouched',async()=>{
  const data=clone(fixture);data.notes[0].fileUrl='data:application/pdf;base64,'+'A'.repeat(40000);
  const s=backend(data),a=s.attach(data);await sync(a);const m=await manifest(s,a);
  const ref=mode==='missing attachment'?m.attachments[0]:m.records.find(r=>r.key[0]==='notes'&&r.key[1]==='user-note');
  const path='/sync_objects/space_fixture-user_fixture-pin/'+ref.id+'.json';
  if(mode==='corrupt ciphertext')s.objects.get(path).payload='invalid';else s.objects.delete(path);
  const b=s.attach({...clone(fixture),notes:[{id:'local-only',content:'Keep me'}]});const raw=b.store._lastLocalRaw,revision=s.rev;
  assert.equal(await sync(b),false);assert.equal(s.rev,revision);assert.ok(b.store.notes.some(n=>n.content==='Keep me'));
  assert.equal(b.store.notes.some(n=>n.id==='user-note'),false);assert.notEqual(b.store.saveStatus,'confirmed');
});
test('old readers fail closed on v4 and their pending edits merge after updating',async()=>{
  const s=backend(),a=s.attach();await sync(a);
  await assert.rejects(a.context.E2EESecurityEngine.decrypt(s.body,'fixture-pin'));
  const old=s.attach(fixture,{objects:false});old.store.addNote('Offline old-device edit');const rev=s.rev;
  assert.equal(await sync(old),false);assert.equal(s.rev,rev);assert.ok(old.store.localSync.pending.length);
  const updated=s.attach(clone(old.store._committedData));assert.equal(await sync(updated),true);
  assert.ok(updated.store.notes.some(n=>n.content==='Offline old-device edit'));
});

test('a staged object collision is read and verified again, even if the old value is cached',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Original staging input');s.failHead=true;
  assert.equal(await sync(h),false);const key=s.objects.keys().next().value;
  s.objects.set(key,{isEncrypted:true,v:2,iv:'invalid',payload:'invalid'});s.failHead=false;
  assert.equal(await sync(h),false);assert.equal(s.body.v,undefined);assert.ok(h.store.localSync.pending.length);
});

test('a vault change during object preparation is preserved and uploaded on the next attempt',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Original memo');
  s.beforeObject=async()=>{const finish=h.context.cloudSync.beginVaultWrite();h.vault.push({id:'new-file',dataUrl:'data:original-new-file'});finish();};
  assert.equal(await sync(h),false);assert.equal(s.body.v,undefined);
  assert.equal(await sync(h),true);const fresh=s.attach();assert.equal(await sync(fresh),true);
  assert.equal(fresh.vault.find(f=>f.id==='new-file').dataUrl,'data:original-new-file');
});

test('account change during object preparation cannot publish a head or send to the new account',async()=>{
  const s=backend(),h=s.attach();h.store.addNote('Old account pending');
  s.beforeObject=async()=>{h.context.cloudSync.pin='different-account';};
  assert.equal(await sync(h),false);assert.equal(s.body.v,undefined);assert.ok(h.store.localSync.pending.length);
  assert.ok(s.requests.every(r=>r.url.includes('space_fixture-user_fixture-pin')));
});
