// Synthetic encryption fixtures. No production request, credential, or record.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../js/services/crypto.js'),'utf8');
function engine(code=source){const c={crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,console:{error(){},warn(){}}};c.window=c;vm.runInNewContext(code,c);return c.E2EESecurityEngine;}
const crypto=engine(),pin='synthetic-only';
function largestString(value){if(typeof value==='string')return Buffer.byteLength(value);if(value&&typeof value==='object')return Math.max(0,...Object.values(value).map(largestString));return 0;}

test('large encrypted snapshot stays within Firebase string limits and restores every byte',async()=>{
  const data={updatedAt:123,notes:[{id:'pc',content:'Original PC note'},{id:'mobile',content:'Original mobile note'}],
    photos:[{id:'photo',dataUrl:'data:image/png;base64,'+'A'.repeat(4*1024*1024)}],
    vaultFiles:[{id:'file',dataUrl:'data:application/pdf;base64,'+'B'.repeat(4*1024*1024)}]};
  const wire=await crypto.encrypt(data,pin);
  assert.ok(largestString(wire)<=10*1024*1024,'Firebase rejects a single string over 10 MiB with HTTP 400');
  assert.equal(wire.v,3);assert.ok(Array.isArray(wire.payload));
  // The old v2 decoder passes payload directly to atob. Comma-separated
  // multiple parts must fail closed rather than decode into partial records.
  assert.throws(()=>atob(wire.payload));
  const restored=await crypto.decrypt(wire,pin);delete restored._wasEncrypted;
  assert.equal(JSON.stringify(restored),JSON.stringify(data));
  for(const corrupt of [
    {...wire,payload:wire.payload.slice(1)},
    {...wire,payload:[...wire.payload].reverse()},
    {...wire,payload:wire.payload.map((part,i)=>i===1?null:part)},
    {...wire,payloadLength:wire.payloadLength+4}
  ])await assert.rejects(crypto.decrypt(corrupt,pin),/DECRYPT_FAILED/);
  await assert.rejects(crypto.decrypt(wire,'incorrect-fixture-pin'),/DECRYPT_FAILED/);
});

test('small snapshots retain the existing v2 encryption representation',async()=>{
  const data={notes:[{id:'legacy',content:'Small original'}],updatedAt:100};
  const wire=await crypto.encrypt(data,pin);assert.equal(wire.v,2);assert.equal(typeof wire.payload,'string');
  const restored=await crypto.decrypt(wire,pin);delete restored._wasEncrypted;
  assert.equal(JSON.stringify(restored),JSON.stringify(data));
});

test('incomplete encrypted envelopes never become plain records',async()=>{
  for(const data of [{isEncrypted:true,v:3,payload:[],iv:'x'}, {isEncrypted:true,v:2,payload:'x'}])
    await assert.rejects(crypto.decrypt(data,pin),/DECRYPT_FAILED/);
});
