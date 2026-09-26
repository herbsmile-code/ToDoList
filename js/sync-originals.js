// Device-local originals only. No credentials, network calls or user prompts.
(function () {
  'use strict';
  let database;
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('todolist_jy_sync_originals', 1);
      let settled = false;
      const fail = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Original backup unavailable')); } };
      const timer = setTimeout(fail,15000);
      request.onupgradeneeded = () => {
        if (settled) { request.transaction?.abort(); return; }
        request.result.createObjectStore('originals', {keyPath:'id'});
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true; clearTimeout(timer);
        request.result.onversionchange = () => { request.result.close(); database = null; };
        resolve(request.result);
      };
      request.onerror = request.onblocked = fail;
    }).catch(error => { database = null; throw error; });
    return database;
  }
  window.SyncOriginals = {
    async preserve(snapshot) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('originals', 'readwrite');
        let settled = false;
        const finish = error => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          if (error) reject(error); else resolve(true);
        };
        const timer = setTimeout(() => {
          try { tx.abort(); } catch {}
          finish(new Error('Original backup timed out'));
        },15000);
        const originals = tx.objectStore('originals');
        const request = originals.get(snapshot.id);
        // Never overwrite the originals captured on this device's first merge.
        request.onsuccess = () => { if (!settled && !request.result) originals.add(snapshot); };
        tx.oncomplete = () => finish();
        tx.onerror = tx.onabort = () => finish(new Error('Original backup not saved'));
      });
    },
    async getAll() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('originals', 'readonly');
        const request = tx.objectStore('originals').getAll();
        const timer = setTimeout(() => { try { tx.abort(); } catch {} reject(new Error('Original backup timed out')); },15000);
        tx.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
        tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(new Error('Original backup unreadable')); };
      });
    }
  };
})();
