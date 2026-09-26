// Central Store persistence adapter. Business records and cloud payloads retain
// their existing shape; only large, verified attachment bytes live in IndexedDB.
(function () {
  'use strict';
  const key = 'todolist_jy_data_v39', marker = '__todolistLocalStorage';
  const values = new Map(), hashes = new Map();
  let database, lastPhysical, lastExpanded;
  function open() {
    if (database) return database;
    database = new Promise((resolve,reject) => {
      const request = indexedDB.open('todolist_jy_payloads',1);
      let done = false;
      const fail = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error('Attachment storage unavailable')); } };
      const timer = setTimeout(fail,15000);
      request.onupgradeneeded = () => {
        if (done) { request.transaction?.abort(); return; }
        request.result.createObjectStore('blobs',{keyPath:'id'});
      };
      request.onerror = request.onblocked = fail;
      request.onsuccess = () => {
        if (done) { request.result.close(); return; }
        done = true; clearTimeout(timer);
        request.result.onversionchange = () => { request.result.close(); database = null; };
        resolve(request.result);
      };
    }).catch(error => { database = null; throw error; });
    return database;
  }
  async function digest(value) {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function transaction(db,mode,run) {
    return new Promise((resolve,reject) => {
      const tx = db.transaction('blobs',mode);
      let failure, done = false;
      const finish = error => {
        if (done) return;
        done = true; clearTimeout(timer);
        if (error) reject(error); else resolve();
      };
      const timer = setTimeout(() => { failure = new Error('Attachment storage timed out');try {tx.abort();} catch {}finish(failure); },15000);
      tx.oncomplete = () => finish(failure);
      tx.onerror = tx.onabort = () => finish(failure || new Error('Attachment storage not confirmed'));
      try { run(tx.objectStore('blobs'),error=>{failure=error;tx.abort();}); }
      catch (error) { failure=error;try {tx.abort();} catch {}finish(error); }
    });
  }
  function visit(value,callback,path=[]) {
    if (typeof value === 'string') { callback(value,path); return; }
    if (value && typeof value === 'object') for (const name of Object.keys(value)) visit(value[name],callback,[...path,name]);
  }
  function putPath(root,path,value) {
    if (!Array.isArray(path) || !path.length || path.some(k=>['__proto__','constructor','prototype'].includes(k))) throw new Error('Invalid attachment reference');
    let target = root;
    for (const name of path.slice(0,-1)) {
      if (!target || !Object.hasOwn(target,name)) throw new Error('Missing attachment reference');
      target = target[name];
    }
    if (!target || !Object.hasOwn(target,path.at(-1))) throw new Error('Missing attachment reference');
    target[path.at(-1)] = value;
  }
  function expand(raw) {
    if (raw === null) return null;
    let data;
    try { data=JSON.parse(raw); } catch { return raw; } // Store owns malformed JSON handling.
    if (!data || data[marker]?.format !== 1) return raw;
    const metadata = data[marker];
    if (!Array.isArray(metadata.blobs)) throw new Error('Attachment references unreadable');
    for (const ref of metadata.blobs) {
      if (!values.has(ref.id)) throw new Error('Attachment original unavailable');
      putPath(data,ref.path,values.get(ref.id));
    }
    if (metadata.hasLocalSync) data.localSync = metadata.localSync; else delete data.localSync;
    delete data[marker];
    return JSON.stringify(data);
  }
  async function initialize() {
    const raw = localStorage.getItem(key);
    let data;
    try { data=JSON.parse(raw); } catch { return; }
    if (data?.[marker]?.format !== 1) return;
    const refs = data[marker].blobs;
    if (!Array.isArray(refs)) throw new Error('Attachment references unreadable');
    const loaded = new Map(),db=await open();
    await transaction(db,'readonly',(store,fail) => {
      for (const id of new Set(refs.map(r=>r.id))) {
        const request=store.get(id);
        request.onsuccess=()=>{
          if (!request.result || typeof request.result.value!=='string') {fail(new Error('Attachment original missing'));return;}
          loaded.set(id,request.result.value);
        };
      }
    });
    for (const [id,value] of loaded) {
      if (await digest(value) !== id) throw new Error('Attachment verification failed');
      values.set(id,value);hashes.set(value,id);
    }
    if (localStorage.getItem(key)!==raw) return initialize();
    lastPhysical=raw;lastExpanded=expand(raw);
  }
  async function prepare(data) {
    const pending=new Map();
    visit(data,(value,path)=>{if(path[0]!=='localSync' && value.length>=32768 && value.startsWith('data:') && !hashes.has(value))pending.set(value,null);});
    if (!pending.size) return;
    for (const value of pending.keys()) pending.set(value,await digest(value));
    const db=await open();
    await transaction(db,'readwrite',(store,fail) => {
      for (const [value,id] of pending) {
        const request=store.get(id);
        request.onsuccess=()=>{
          if (request.result && request.result.value!==value) {fail(new Error('Attachment original mismatch'));return;}
          if (!request.result) store.add({id,value});
        };
      }
    });
    // A transaction success is the only event that makes references writable.
    for (const [value,id] of pending) { values.set(id,value);hashes.set(value,id); }
  }
  window.MainStorage = {
    initialize,prepare,
    getItem(name) {
      if (name!==key) return localStorage.getItem(name);
      const physical=localStorage.getItem(key);
      if (physical===lastPhysical) return lastExpanded;
      const expanded=expand(physical);lastPhysical=physical;lastExpanded=expanded;return expanded;
    },
    setItem(name,raw) {
      if (name!==key) return localStorage.setItem(name,raw);
      const data=JSON.parse(raw),refs=[];
      visit(data,(value,path)=>{if(path[0]!=='localSync' && hashes.has(value))refs.push({id:hashes.get(value),path});});
      if (refs.length) {
        const metadata={format:1,hasLocalSync:Object.hasOwn(data,'localSync'),localSync:data.localSync,blobs:refs};
        for (const ref of refs) putPath(data,ref.path,null);
        // Old clients must fail closed instead of uploading attachment markers.
        data.localSync={version:0,requiresAttachmentStorage:true};
        data[marker]=metadata;
      }
      const physical=refs.length?JSON.stringify(data):raw;
      localStorage.setItem(key,physical);
      if (localStorage.getItem(key)!==physical) throw new Error('Local save verification failed');
      lastPhysical=physical;lastExpanded=raw;
    }
  };
})();
