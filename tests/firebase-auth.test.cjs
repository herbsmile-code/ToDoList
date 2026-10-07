const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {harness, fixture, key} = require('./sync-harness.cjs');
const base = 'https://todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app';
const source = fs.readFileSync(path.join(__dirname,'../js/services/firebase-auth.js'),'utf8');

async function setup(signedIn = true) {
  const h = harness(JSON.stringify(fixture));
  h.context.URL = URL;
  vm.runInContext(source,h.context);
  const state = {token:'test-only-token',version:0,calls:0};
  const user = {uid:'fixture-owner',email:'owner@example.invalid',emailVerified:true,getIdToken:async()=>{state.calls++; return state.token;}};
  const auth = {currentUser:signedIn ? user : null,authStateReady:async()=>{}};
  let listener;
  const sdk = {initializeApp:()=>({}),getAuth:()=>auth,
    onIdTokenChanged:(a,fn)=>{listener=fn;},
    GoogleAuthProvider:class {setCustomParameters(){}},
    signInWithPopup:async()=>{auth.currentUser=user;listener(user);return {user};},
    signOut:async()=>{auth.currentUser=null;listener(null);}};
  const gate = h.context.createCloudFirebaseAuth(async()=>sdk,'fixture-owner');
  h.context.CloudFirebaseAuth=gate;
  h.context.cloudSync.activeUrl=base;
  await gate.ready();
  return {h,gate,state,user,sdk,change:value=>{auth.currentUser=value;listener(value);}};
}

test('saved encryption credentials cannot authorize an unauthenticated request or erase local data',async()=>{
  const {h,gate}=await setup(false),before=[...h.values];
  assert.equal(await h.context.cloudSync.fetchLatestFromCloud(true),false);
  await assert.rejects(h.context.cloudSync.requestCloud(base+'/spaces/fixture.json'));
  assert.equal((await h.context.cloudSync.verifyAndLogin('on3257','test-pin')).success,false);
  assert.equal(gate.getUser(),null);assert.equal(h.requests.length,0);
  assert.deepEqual([...h.values],before);
});

test('GET and conditional PUT retain their options and use the latest ID token without redirects',async()=>{
  const {h,state}=await setup();
  await h.context.cloudSync.requestCloud(base+'/spaces/fixture.json',{headers:{'X-Firebase-ETag':'true'}});
  state.token='refreshed-test-token';
  await h.context.cloudSync.conditionalPut(base+'/spaces/fixture.json',{
    method:'PUT',headers:{'if-match':'version-1'},body:'{"isEncrypted":true}'});
  const [get,put]=h.requests;
  assert.equal(new URL(get.url).searchParams.get('auth'),'test-only-token');
  assert.equal(new URL(put.url).searchParams.get('auth'),'refreshed-test-token');
  assert.equal(new URL(put.url).searchParams.get('print'),'silent');
  assert.equal(put.options.headers['if-match'],'version-1');
  assert.equal(get.options.headers['X-Firebase-ETag'],'true');
  assert.equal(get.options.redirect,'error');assert.equal(put.options.referrerPolicy,'no-referrer');
});

test('custom database URLs cannot receive tokens, even when a user is signed in',async()=>{
  const {h,state}=await setup();
  for(const url of ['https://attacker.invalid/fixture.json',base+'.attacker.invalid/fixture.json',
    'http://todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app/a.json',base+'/a.json#fragment',
    'https://user:password@todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app/a.json']) {
    await assert.rejects(h.context.cloudSync.requestCloud(url));
  }
  assert.equal(h.requests.length,0);assert.equal(state.calls,0);
});

test('sign-out while waiting for a token sends no request and retains local originals',async()=>{
  const {h,gate,user}=await setup(),before=[...h.values];let resolveToken;
  user.getIdToken=()=>new Promise(resolve=>{resolveToken=resolve;});
  const request=h.context.cloudSync.requestCloud(base+'/spaces/fixture.json');
  while(!resolveToken)await Promise.resolve();
  await gate.signOut();resolveToken('obsolete-test-token');
  await assert.rejects(request);assert.equal(h.requests.length,0);assert.deepEqual([...h.values],before);
});

test('account change during a response prevents importing remote data into the current session',async()=>{
  const {h,change}=await setup(),before=[...h.values];
  h.context.fetch=async()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>{
    change({uid:'different-user'});return {tasks:[]};
  }});
  await assert.rejects(h.context.cloudSync.requestCloud(base+'/spaces/fixture.json'),e=>e.syncStale===true);
  assert.deepEqual([...h.values],before);
});

test('Firebase permission denial never registers a replacement password or reports successful login',async()=>{
  const {h}=await setup(),before=[...h.values];
  h.context.fetch=async(url,options)=>{h.requests.push({url,options});return {
    ok:false,status:401,headers:{get:()=>null},json:async()=>({error:'Permission denied'})};};
  const result=await h.context.cloudSync.verifyAndLogin('on3257','test-pin');
  assert.equal(result.success,false);assert.match(result.message,/접근 권한/);
  assert.equal(h.requests.length,1);assert.notEqual(h.requests[0].options.method,'PUT');
  assert.deepEqual([...h.values],before);
});

test('SSE uses an ID token and a stopped pending listener cannot reopen after sign-out',async()=>{
  const {h,user,gate}=await setup();const streams=[];
  h.context.EventSource=class {constructor(url){streams.push(url);}addEventListener(){} close(){}};
  await h.context.cloudSync.startRemoteListener();
  assert.equal(new URL(streams[0]).searchParams.get('auth'),'test-only-token');
  assert.match(new URL(streams[0]).pathname,/\/iv\.json$/);
  h.context.cloudSync.stopRemoteListener();let resolveToken;
  user.getIdToken=()=>new Promise(resolve=>{resolveToken=resolve;});
  const pending=h.context.cloudSync.startRemoteListener();
  while(!resolveToken)await Promise.resolve();
  h.context.cloudSync.stopRemoteListener();await gate.signOut();resolveToken('obsolete-token');await pending;
  assert.equal(streams.length,1);
});

test('unavailable SDK fails closed without clearing encryption credentials or making database requests',async()=>{
  const {h}=await setup(),before=h.values.get(key);
  h.context.CloudFirebaseAuth=h.context.createCloudFirebaseAuth(async()=>{throw Error('offline');});
  await assert.rejects(h.context.cloudSync.requestCloud(base+'/spaces/fixture.json'));
  assert.equal(h.requests.length,0);assert.equal(h.values.get(key),before);
});

test('another Google account cannot unlock the local app or send authenticated database requests',async()=>{
  const {h,gate,change,state}=await setup(),before=[...h.values];
  change({uid:'not-the-owner',emailVerified:true,getIdToken:async()=>{state.calls++;return 'wrong-token';}});
  assert.equal(gate.getUser(),null);
  assert.equal(await h.context.cloudSync.fetchLatestFromCloud(true),false);
  await assert.rejects(h.context.cloudSync.requestCloud(base+'/spaces/fixture.json'));
  assert.equal(h.requests.length,0);assert.equal(state.calls,0);assert.deepEqual([...h.values],before);
});

test('auth changes during decryption preserve local records and do not upload the old response',async()=>{
  const {h,change}=await setup();
  const {server,remoteData}=require('./ai-sync-harness.cjs');
  server(remoteData()).attach(h);
  const original=h.context.E2EESecurityEngine.decrypt;
  let before;
  h.context.E2EESecurityEngine.decrypt=async (...args)=>{
    // Normal local metadata preparation happens before the remote decode.
    before=h.values.get(key);
    const decoded=await original(...args);change(null);return decoded;
  };
  assert.equal(await h.context.cloudSync.fetchLatestFromCloud(true),false);
  assert.notEqual(before,undefined);
  assert.equal(h.values.get(key),before);
  assert.equal(h.requests.filter(r=>r.options.method==='PUT').length,0);
});

test('a failed SDK sign-out never restores an old session through a late auth callback',async()=>{
  const {gate,sdk,change,user}=await setup();
  sdk.signOut=async()=>{throw Error('network');};
  await assert.rejects(gate.signOut());change(user);
  assert.equal(gate.getUser(),null);
  await assert.rejects(gate.authenticatedUrl(base+'/spaces/fixture.json'));
});
