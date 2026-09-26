// Device-local originals only. No credentials, network calls or user prompts.
(function () {
  'use strict';
  let database;
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('todolist_jy_sync_originals', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('originals', {keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Original backup unavailable'));
      request.onblocked = () => reject(new Error('Original backup blocked'));
    }).catch(error => { database = null; throw error; });
    return database;
  }
  window.SyncOriginals = {
    async preserve(snapshot) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('originals', 'readwrite');
        const originals = tx.objectStore('originals');
        const request = originals.get(snapshot.id);
        // Never overwrite the originals captured on this device's first merge.
        request.onsuccess = () => { if (!request.result) originals.add(snapshot); };
        tx.oncomplete = () => resolve(true);
        tx.onerror = tx.onabort = () => reject(new Error('Original backup not saved'));
      });
    },
    async getAll() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('originals', 'readonly');
        const request = tx.objectStore('originals').getAll();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(new Error('Original backup unreadable'));
      });
    }
  };
})();
