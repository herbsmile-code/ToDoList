// Immutable encrypted records/files + a small, conditionally replaced manifest.
// The central manager owns the outbox, merge, acknowledgement and retries.
(function(window) {
  'use strict';
  const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
  const validHash=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
  const fail=message=>Object.assign(new Error(message),{kind:'integrity'});
  async function pool(values,run) {
    let index=0;const results=new Array(values.length);
    await Promise.all(Array.from({length:Math.min(4,values.length)},async()=>{
      while(index<values.length){const i=index++;results[i]=await run(values[i],i);}
    }));return results;
  }
  window.createSyncObjectTransport=function({protocol:p,crypto:security,request}) {
    const manifests=new Map(),keyCache=new Map(),objects=new Map();let cacheBytes=0;
    function check(ctx) {if(ctx.current && !ctx.current())throw Object.assign(new Error('Local state changed'),{syncStale:true});}
    function refValid(ref) {return ref && validHash(ref.id) && validHash(ref.digest);}
    function objectUrl(ctx,id) {
      if(!validHash(id))throw fail('Invalid object reference');
      // Same database and account namespace as the existing snapshot; no URL
      // or path is ever accepted from an untrusted manifest.
      return ctx.base+'/sync_objects/'+ctx.space+'/'+id+'.json';
    }
    async function objectId(ctx,digest) {
      if(!keyCache.has(ctx.pin))keyCache.set(ctx.pin,(async()=>{
        const subtle=window.crypto.subtle;
        const material=await subtle.importKey('raw',new TextEncoder().encode(ctx.pin+'_e2ee_pepper_2026'),'PBKDF2',false,['deriveKey']);
        return subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('todolist_sync_object_ids_v1'),iterations:100000,hash:'SHA-256'},
          material,{name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
      })().catch(error=>{keyCache.delete(ctx.pin);throw error;}));
      return hex(await window.crypto.subtle.sign('HMAC',await keyCache.get(ctx.pin),new TextEncoder().encode(ctx.target+':'+digest)));
    }
    function remember(ctx,ref,value) {
      const key=ctx.target+':'+ref.id,bytes=JSON.stringify(value).length*2;
      if(objects.has(key)){cacheBytes-=objects.get(key).bytes;objects.delete(key);}
      if(bytes>32*1024*1024)return;
      objects.set(key,{digest:ref.digest,value,bytes});cacheBytes+=bytes;
      // A cache only; durable originals stay in the application's existing stores.
      while(objects.size>128 || cacheBytes>32*1024*1024) {const oldest=objects.keys().next().value;cacheBytes-=objects.get(oldest).bytes;objects.delete(oldest);}
    }
    async function get(ctx,ref,fresh=false) {
      check(ctx);if(!refValid(ref))throw fail('Invalid object reference');
      const cached=objects.get(ctx.target+':'+ref.id);
      if(!fresh && cached?.digest===ref.digest)return cached.value;
      const response=await request(objectUrl(ctx,ref.id),{timeoutMs:60000});
      if(!response.ok)throw Object.assign(new Error('Object read failed'),{httpStatus:response.status,kind:response.errorKind});
      const encrypted=await response.json();
      if(!encrypted?.isEncrypted || ![2,3].includes(encrypted.v))throw fail('Missing encrypted object');
      const decoded=await security.decrypt(encrypted,ctx.pin);check(ctx);
      if(decoded?.format!=='todolist-sync-object-v1' || await p.hashAsync(decoded.value)!==ref.digest)throw fail('Object digest mismatch');
      remember(ctx,ref,decoded.value);return decoded.value;
    }
    async function put(ctx,value,known) {
      check(ctx);const digest=await p.hashAsync(value);
      if(known.has(digest))return known.get(digest);
      const work=(async()=>{
      const id=await objectId(ctx,digest),ref={id,digest};
      const encrypted=await security.encrypt({format:'todolist-sync-object-v1',value},ctx.pin);
      if(!encrypted?.isEncrypted)throw fail('Object encryption failed');
      check(ctx);
      const response=await request(objectUrl(ctx,id),{method:'PUT',headers:{'Content-Type':'application/json','if-match':'null_etag'},
        body:JSON.stringify(encrypted),timeoutMs:60000,current:ctx.current});
      if(response.status===412) {
        // Another device or a lost response may have created it. Verify every
        // existing byte before publishing a reference; never overwrite it.
        await get(ctx,ref,true);
      } else if(!response.ok)throw Object.assign(new Error('Object write failed'),{httpStatus:response.status,kind:response.errorKind});
      check(ctx);remember(ctx,ref,value);return ref;
      })();
      known.set(digest,work);
      try {const ref=await work;known.set(digest,ref);return ref;}
      catch(error){known.delete(digest);throw error;}
    }
    function strings(value,run,path=[]) {
      if(typeof value==='string'){if(value.length>=32768 && value.startsWith('data:'))run(value,path);return;}
      if(value && typeof value==='object')for(const key of Object.keys(value))strings(value[key],run,[...path,key]);
    }
    function replace(root,path,value) {
      if(!Array.isArray(path) || path.some(k=>typeof k!=='string' || ['__proto__','constructor','prototype'].includes(k)))throw fail('Invalid attachment path');
      if(!path.length)return value;
      let target=root;
      for(const key of path.slice(0,-1)) {if(!target || !Object.hasOwn(target,key))throw fail('Missing attachment path');target=target[key];}
      if(!target || !Object.hasOwn(target,path.at(-1)))throw fail('Missing attachment path');
      target[path.at(-1)]=value;return root;
    }
    function slotRows(data) {
      const rows=Object.entries(p.slots(data)).map(([key,value])=>({key:JSON.parse(key),value}));
      if(data.vaultFiles!==undefined) {
        if(!Array.isArray(data.vaultFiles) || data.vaultFiles.some(v=>!v || typeof v.id!=='string' || !v.id || v.id==='$order') ||
          new Set(data.vaultFiles.map(v=>v.id)).size!==data.vaultFiles.length)throw fail('Invalid vault list');
        rows.push({key:['vaultFiles','$order'],value:data.vaultFiles.map(v=>v.id)});
        for(const file of data.vaultFiles)rows.push({key:['vaultFiles',file.id],value:file});
      }
      return rows;
    }
    async function legacyBackup(ctx,wire) {
      if(wire===null)return null;
      // Retain the exact old encrypted envelope independently of the new head.
      // A legacy plaintext snapshot is encrypted before leaving this method.
      const encrypted=wire.isEncrypted?wire:await security.encrypt(wire,ctx.pin);
      if(!encrypted?.isEncrypted)throw fail('Legacy backup encryption failed');
      const digest=await p.hashAsync(encrypted),id=await objectId(ctx,'legacy:'+digest);
      check(ctx);
      const response=await request(objectUrl(ctx,id),{method:'PUT',headers:{'Content-Type':'application/json','if-match':'null_etag'},
        body:JSON.stringify(encrypted),timeoutMs:60000,current:ctx.current});
      if(response.status===412) {
        const existing=await request(objectUrl(ctx,id),{timeoutMs:60000});
        if(!existing.ok || await p.hashAsync(await existing.json())!==digest)throw fail('Legacy backup mismatch');
      } else if(!response.ok)throw Object.assign(new Error('Legacy backup failed'),{httpStatus:response.status,kind:response.errorKind});
      return {id,digest};
    }
    function validateManifest(m) {
      if(m?.format!=='todolist-sync-manifest-v1' || !Array.isArray(m.records) || !Array.isArray(m.attachments) ||
          m.records.length>100000 || m.attachments.length>100000 || !m.metadata || typeof m.metadata!=='object' || Array.isArray(m.metadata) ||
          !Number.isSafeInteger(m.metadata.revision) || m.metadata.revision<0 || !Number.isSafeInteger(m.metadata.updatedAt) || m.metadata.updatedAt<0 ||
          !p.validVersions(m.metadata.syncVersions))throw fail('Invalid manifest');
      const seen=new Set();
      for(const row of m.records) {
        if(!row || !Array.isArray(row.key) || row.key.length!==2 || !refValid(row) || !validHash(row.sourceHash) || !Array.isArray(row.attachments))throw fail('Invalid record reference');
        const [field,id]=row.key,list=p.lists.includes(field)||field==='vaultFiles';
        if((!p.fields.includes(field)&&field!=='vaultFiles') || (list ? typeof id!=='string'||!id : id!==null))throw fail('Invalid record key');
        const key=JSON.stringify(row.key);if(seen.has(key))throw fail('Duplicate record reference');seen.add(key);
      }
      const attachments=new Map();
      for(const ref of m.attachments) {if(!refValid(ref)||attachments.has(ref.digest))throw fail('Invalid attachment reference');attachments.set(ref.digest,ref);}
      for(const row of m.records)for(const digest of row.attachments)if(!attachments.has(digest))throw fail('Missing attachment reference');
      if(m.legacySnapshot!==null && !refValid(m.legacySnapshot))throw fail('Invalid legacy reference');
      return attachments;
    }
    async function read(wire,ctx,local={}) {
      if(wire?.v!==4)return wire===null?{}:security.decrypt(wire,ctx.pin);
      if(!wire.isEncrypted || !wire.payload?.manifest?.isEncrypted || wire.iv!==wire.payload.manifest.iv)throw fail('Invalid manifest envelope');
      const manifest=await security.decrypt(wire.payload.manifest,ctx.pin),attachments=validateManifest(manifest);
      check(ctx);
      const localRows=new Map(slotRows(local).map(row=>[JSON.stringify(row.key),row.value]));
      let localAttachments;
      async function localFiles() {
        if(!localAttachments)localAttachments=(async()=>{
          const texts=new Set();strings(local,text=>texts.add(text));const map=new Map();
          await pool([...texts],async text=>map.set(await p.hashAsync({type:'attachment',text}),text));return map;
        })();return localAttachments;
      }
      const rows=await pool(manifest.records,async ref=>{
        const key=JSON.stringify(ref.key),localValue=localRows.get(key);
        if(localRows.has(key) && await p.hashAsync(localValue)===ref.sourceHash)return {key:ref.key,value:p.clone(localValue)};
        const object=await get(ctx,ref);
        if(object?.type!=='record' || !Array.isArray(object.attachments))throw fail('Invalid record object');
        let value=p.clone(object.body);const seen=new Set();
        for(const entry of object.attachments) {
          if(!entry || !attachments.has(entry.digest) || !ref.attachments.includes(entry.digest))throw fail('Invalid file reference');
          const path=JSON.stringify(entry.path);if(seen.has(path))throw fail('Duplicate attachment path');seen.add(path);
          let text=(await localFiles()).get(entry.digest);
          if(text===undefined) {const file=await get(ctx,attachments.get(entry.digest));if(file?.type!=='attachment' || typeof file.text!=='string')throw fail('Invalid attachment object');text=file.text;}
          value=replace(value,entry.path,text);
        }
        if(await p.hashAsync(value)!==ref.sourceHash)throw fail('Record digest mismatch');
        return {key:ref.key,value};
      });
      const slots=new Map(rows.map(row=>[JSON.stringify(row.key),row.value])),data={};
      for(const field of [...p.fields,'vaultFiles']) {
        if(p.lists.includes(field)||field==='vaultFiles') {
          const order=slots.get(JSON.stringify([field,'$order'])),items=rows.filter(row=>row.key[0]===field && row.key[1]!=='$order');
          if(order===undefined && !items.length)continue;
          if(!Array.isArray(order)||new Set(order).size!==order.length||order.length!==items.length)throw fail('Invalid record order');
          data[field]=order.map(id=>{const row=slots.get(JSON.stringify([field,id]));if(!row || row.id!==id)throw fail('Missing ordered record');return row;});
        } else if(slots.has(JSON.stringify([field,null])))data[field]=slots.get(JSON.stringify([field,null]));
      }
      // Only known protocol metadata can cross this boundary. localSync is local.
      for(const field of ['revision','updatedAt','syncVersions','ledgerAuthority'])if(Object.hasOwn(manifest.metadata,field))data[field]=p.clone(manifest.metadata[field]);
      check(ctx);manifests.set(ctx.target,manifest);return data;
    }
    async function prepare(data,wire,ctx) {
      check(ctx);const previous=wire?.v===4?manifests.get(ctx.target):null;
      if(wire?.v===4 && !previous)throw fail('Read manifest before writing');
      const known=new Map((previous?.attachments || []).map(ref=>[ref.digest,ref]));
      const oldRows=new Map((previous?.records || []).map(ref=>[JSON.stringify(ref.key),ref]));
      const records=await pool(slotRows(data),async row=>{
        const sourceHash=await p.hashAsync(row.value),old=oldRows.get(JSON.stringify(row.key));
        if(old?.sourceHash===sourceHash)return old;
        const found=[];strings(row.value,(text,path)=>found.push({text,path}));
        found.sort((a,b)=>JSON.stringify(a.path)<JSON.stringify(b.path)?-1:JSON.stringify(a.path)>JSON.stringify(b.path)?1:0);
        let body=p.clone(row.value);const entries=[];
        for(const {text,path} of found) {
          const ref=await put(ctx,{type:'attachment',text},known);body=replace(body,path,null);entries.push({path,digest:ref.digest});
        }
        const ref=await put(ctx,{type:'record',body,attachments:entries},known);
        return {...ref,key:row.key,sourceHash,attachments:[...new Set(entries.map(e=>e.digest))]};
      });
      const used=new Set(records.flatMap(row=>row.attachments));
      const metadata={};for(const key of ['revision','updatedAt','syncVersions','ledgerAuthority'])if(Object.hasOwn(data,key))metadata[key]=p.clone(data[key]);
      const manifest={format:'todolist-sync-manifest-v1',records,attachments:[...used].map(digest=>known.get(digest)),metadata,
        legacySnapshot:previous?previous.legacySnapshot:await legacyBackup(ctx,wire)};
      validateManifest(manifest);check(ctx);
      const encrypted=await security.encrypt(manifest,ctx.pin);
      if(!encrypted?.isEncrypted)throw fail('Manifest encryption failed');check(ctx);
      // Old clients reject the object payload instead of interpreting a partial
      // snapshot as empty and overwriting it. Reload gives them the new reader.
      return {isEncrypted:true,v:4,iv:encrypted.iv,payload:{manifest:encrypted},updatedAt:data.updatedAt};
    }
    return {read,prepare};
  };
})(window);
