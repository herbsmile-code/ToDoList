// Pure record merge and outbox rules; the application still owns one Store.
(function(window){
  'use strict';
  window.createLocalSyncProtocol = function({getInitialLedger}) {
  const LocalSyncProtocol = {
    fields: ['tasks', 'categories', 'sidebarMenuOrder', 'wishlist', 'photos', 'notes',
      'vaultFolders', 'deletedItemIds', 'honeymoonData', 'ledgerFiles', 'vacations',
      'totalVacationDays', 'sites', 'siteFolders', 'healthNotes', 'healthFolders',
      'hobbyNotes', 'hobbyFolders', 'aiStudyNotes', 'subscriptions', 'projects',
      'customMenuNames', 'customTheme', 'treasures', 'ledgerBankStatements', 'ledgerCategoryRules', 'streak'],
    lists: ['tasks', 'categories', 'wishlist', 'photos', 'notes', 'vaultFolders',
      'ledgerFiles', 'vacations', 'sites', 'siteFolders', 'healthNotes', 'healthFolders',
      'hobbyNotes', 'hobbyFolders', 'aiStudyNotes', 'subscriptions', 'projects',
      'treasures', 'ledgerBankStatements', 'ledgerCategoryRules'],
    legacyKeys: {treasures:'zentask_treasures', ledgerBankStatements:'ledgerBankStatements',
      ledgerCategoryRules:'ledgerCategoryRules', streak:'todolist_jy_streak_v39'},
    legacyRows(field, rows) {
      if (!Array.isArray(rows)) throw new Error('Invalid legacy list: ' + field);
      const seen = new Map();
      rows.forEach(row => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid legacy record');
        const copy = this.clone(row);
        if (typeof copy.id !== 'string' || !copy.id) {
          const identity = field === 'ledgerCategoryRules' && row.keyword ?
            [row.bank || 'shinhan',row.owner || '',row.keyword] :
            field === 'ledgerBankStatements' && row.date ?
            [row.bank || 'shinhan',row.owner || '',row.date,row.desc || '',row.out || 0,row.in || 0,row.balance || 0] : row;
          copy.id = field + '-' + this.hash(identity);
        }
        // Older imports can contain the same ID with different original contents.
        if (seen.has(copy.id) && this.canonical(seen.get(copy.id)) !== this.canonical(copy)) {
          copy.id = field + '-original-' + this.hash(row);
        }
        seen.set(copy.id,copy);
      });
      return [...seen.values()];
    },
    clone(value) { return JSON.parse(JSON.stringify(value)); },
    _largeHashes: new Map(),
    _largeHashChars: 0,
    rememberHash(text,hash) {
      if(typeof text!=='string' || text.length<32768 || text.length>32*1024*1024)return;
      if(this._largeHashes.has(text))return;
      this._largeHashes.set(text,hash);this._largeHashChars+=text.length;
      while(this._largeHashChars>32*1024*1024) {
        const key=this._largeHashes.keys().next().value;this._largeHashes.delete(key);this._largeHashChars-=key.length;
      }
    },
    async primeHashes(...snapshots) {
      if(!globalThis.crypto?.subtle)return;
      const values=[];
      for(const data of snapshots)for(const field of this.fields) {
        if(!Object.hasOwn(data,field))continue;
        const rows=this.lists.includes(field)?(Array.isArray(data[field])?data[field]:[]):[data[field]];
        for(const value of rows)if(JSON.stringify(value)?.length>=32768)values.push(value);
      }
      await Promise.all(values.map(value=>this.hashAsync(value,true)));
    },
    canonical(value) {
      if (Array.isArray(value)) return '[' + value.map(v => this.canonical(v)).join(',') + ']';
      if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
        .map(k => JSON.stringify(k) + ':' + this.canonical(value[k])).join(',') + '}';
      return JSON.stringify(value);
    },
    // Synchronous SHA-256 permits data + outbox to use ONE localStorage write.
    hash(value) {
      const text=this.canonical(value),cached=this._largeHashes.get(text);
      if(cached)return cached;
      const bytes = new TextEncoder().encode(text);
      const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
      const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
      padded.set(bytes); padded[bytes.length] = 128;
      const view = new DataView(padded.buffer);
      view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
      view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
      const rotate = (x, n) => (x >>> n) | (x << (32 - n));
      const w = new Uint32Array(64);
      for (let offset = 0; offset < padded.length; offset += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
        for (let i = 16; i < 64; i++) {
          const x = w[i - 15], y = w[i - 2];
          w[i] = (w[i - 16] + (rotate(x,7)^rotate(x,18)^(x>>>3)) + w[i - 7] + (rotate(y,17)^rotate(y,19)^(y>>>10))) >>> 0;
        }
        let [a,b,c,d,e,f,g,z] = h;
        for (let i = 0; i < 64; i++) {
          const t = (z + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + k[i] + w[i]) >>> 0;
          const u = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0;
          z=g; g=f; f=e; e=(d+t)>>>0; d=c; c=b; b=a; a=(t+u)>>>0;
        }
        [a,b,c,d,e,f,g,z].forEach((v,i) => { h[i] = (h[i]+v)>>>0; });
      }
      return h.map(v => v.toString(16).padStart(8,'0')).join('');
    },
    async hashAsync(value,remember=false) {
      // Large cloud comparisons need no synchronous outbox transaction. Use
      // native SHA-256 so hashing attachment bytes does not run in a JS loop.
      if (!globalThis.crypto?.subtle) return this.hash(value);
      const text=this.canonical(value),cached=this._largeHashes.get(text);
      if(cached)return cached;
      const bytes = new TextEncoder().encode(text);
      const digest = await globalThis.crypto.subtle.digest('SHA-256',bytes);
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      if(remember)this.rememberHash(text,hash);return hash;
    },
    select(data) {
      const result = {};
      for (const field of this.fields) if (Object.prototype.hasOwnProperty.call(data, field)) result[field] = this.clone(data[field]);
      return result;
    },
    slots(data, strictDuplicates = false) {
      const slots = {};
      for (const [field, value] of Object.entries(this.select(data))) {
        if (this.lists.includes(field)) {
          if (!Array.isArray(value)) throw new Error('Invalid sync list: ' + field);
          const seen = new Map();
          value.forEach(item => {
            if (!item || typeof item.id !== 'string' || !item.id) throw new Error('Invalid sync item: ' + field);
            if (seen.has(item.id)) {
              if (strictDuplicates || this.canonical(seen.get(item.id)) !== this.canonical(item)) throw new Error('Duplicate sync item: ' + field);
              return; // Identical repeats are the same record, never a global sync blocker.
            }
            seen.set(item.id,item);
            if (item.id === '$order') throw new Error('Reserved sync item id');
            slots[JSON.stringify([field,item.id])] = item;
          });
          slots[JSON.stringify([field,'$order'])] = [...seen.keys()];
        } else slots[JSON.stringify([field,null])] = value;
      }
      return slots;
    },
    _slotStates: new WeakMap(),
    state(slots, key) {
      if (!Object.hasOwn(slots,key)) return 'absent';
      // Slot maps are short-lived. Reuse a digest within one merge, but check
      // serialized bytes so even a caller mutating a nested record is safe.
      let cache = this._slotStates.get(slots);
      if (!cache) { cache = new Map(); this._slotStates.set(slots,cache); }
      const raw = JSON.stringify(slots[key]), previous = cache.get(key);
      if (previous?.raw === raw) return previous.hash;
      const hash = this.hash(slots[key]);
      cache.set(key,{raw,hash});return hash;
    },
    baseline(data) {
      const hashes = {};
      for (const [key,value] of Object.entries(this.slots(data))) hashes[key] = this.hash(value);
      return { known: true, itemHashes: hashes };
    },
    isLedger(value) { return !!value && typeof value === 'object' && !Array.isArray(value); },
    clientKind() {
      const nav = window.navigator;
      if (!['https:','http:'].includes(window.location?.protocol) || !nav?.userAgent) return 'local-file';
      return nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(nav.userAgent) ||
        (/Macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1) ? 'mobile' : 'desktop-web';
    },
    empty() { return { version: 1, targetFingerprint: null, baseline: { known: false, itemHashes: {} }, pending: [], conflicts: [] }; },
    valid(meta) {
      const hash = v => v === 'absent' || /^[a-f0-9]{64}$/.test(v);
      const slot = k => { try { const [f,id] = JSON.parse(k); return this.fields.includes(f) && (id === null || typeof id === 'string'); } catch { return false; } };
      return !!meta && meta.version === 1 && (meta.targetFingerprint === null || /^[a-f0-9]{64}$/.test(meta.targetFingerprint)) &&
        meta.baseline && typeof meta.baseline.known === 'boolean' && meta.baseline.itemHashes && !Array.isArray(meta.baseline.itemHashes) &&
        typeof meta.baseline.itemHashes === 'object' && Object.entries(meta.baseline.itemHashes).every(([k,v]) => slot(k) && hash(v)) &&
        Array.isArray(meta.pending) && new Set(meta.pending.map(p => p?.key)).size === meta.pending.length &&
        meta.pending.every(p => p && slot(p.key) && typeof p.changeId === 'string' && (p.base === 'unknown' || hash(p.base)) && hash(p.localHash)) &&
        Array.isArray(meta.conflicts) && (meta.recovery === undefined || Array.isArray(meta.recovery)) &&
        (meta.editClock === undefined || Number.isSafeInteger(meta.editClock) && meta.editClock >= 0) &&
        (meta.itemVersions === undefined || this.validVersions(meta.itemVersions)) &&
        meta.pending.every(p => p.changedAt === undefined || Number.isSafeInteger(p.changedAt) && p.changedAt >= 0);
    },
    validVersions(versions) {
      return this.isLedger(versions) && Object.values(versions).every(v=>v && Number.isSafeInteger(v.at) && v.at >= 0 &&
        (v.hash === 'absent' || typeof v.hash === 'string' && /^[a-f0-9]{64}$/.test(v.hash)));
    },
    track(previous, next, meta) {
      const result = this.clone(meta), before = this.slots(previous), after = this.slots(next);
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        // Equal serialized values need no SHA-256 calculation; changed values
        // still use the original canonical hashes for outbox compatibility.
        if (JSON.stringify(after[key]) === JSON.stringify(before[key])) continue;
        const current = this.state(after,key);
        if (current === this.state(before,key)) continue;
        const old = result.pending.find(p => p.key === key);
        const base = old ? old.base : result.baseline.known ? (result.baseline.itemHashes[key] || 'absent') : 'unknown';
        result.pending = result.pending.filter(p => p.key !== key);
        result.editClock = Math.max(Date.now(),(Number(result.editClock) || 0)+1);
        const entry = { key, changeId: 'change-' + Date.now() + '-' + Math.random().toString(36).slice(2), base, localHash: current,
          changedAt:result.editClock,source:this.clientKind() };
        result.pending.push(entry);
      }
      return result;
    },
    merge(local, remote, meta) {
      const l = this.slots(local), r = this.slots(remote), merged = this.clone(r), conflicts = [];
      const pending = new Map(meta.pending.map(p => [p.key,p]));
      const deleted = new Set([...(local.deletedItemIds || []), ...(remote.deletedItemIds || [])]);
      for (const key of new Set([...Object.keys(l), ...Object.keys(r), ...Object.keys(meta.baseline.itemHashes)])) {
        const [field,id] = JSON.parse(key);
        if (id === '$order') continue;
        const lh = this.state(l,key), rh = this.state(r,key), p = pending.get(key);
        const base = p ? p.base : meta.baseline.known ? (meta.baseline.itemHashes[key] || 'absent') : 'unknown';
        // Folder IDs such as "work" also exist in other collections. Scope only
        // their deletion marker; keep existing item tombstones compatible.
        const isDeleted = deleted.has(id) || (field === 'siteFolders' && deleted.has('site-folder:' + id)) ||
          (field === 'hobbyFolders' && deleted.has('hobby-folder:' + id)) ||
          (field === 'healthFolders' && deleted.has('health-folder:' + id));
        if (field === 'deletedItemIds') { merged[key] = Array.from(deleted).sort(); continue; }
        if (lh === rh) {
          // Older clients can keep a row alongside its deletion marker. Equal
          // stale copies do not constitute a new edit or undo that deletion.
          if ((field === 'sites' || field === 'siteFolders' || field === 'vacations' || field === 'hobbyNotes' || field === 'hobbyFolders' || field === 'healthNotes' || field === 'healthFolders') && isDeleted) delete merged[key];
          continue;
        }
        // An acknowledged deletion must not silently accept a stale/new remote
        // row with the same ID. Preserve that original for conflict resolution.
        if ((field === 'sites' || field === 'siteFolders' || field === 'vacations' || field === 'hobbyNotes' || field === 'hobbyFolders' || field === 'healthNotes' || field === 'healthFolders') && isDeleted &&
            lh === 'absent' && rh !== 'absent' && !p) {
          conflicts.push({ key, base, localHash: lh, remoteHash: rh, remote: this.clone(r[key]), reason:'deleted-item' });
          continue;
        }
        if (!p && base !== 'unknown' && lh === base) {
          // Absence alone is not a deletion instruction, even after a prior ack.
          if (rh === 'absent' && lh !== 'absent' && !isDeleted) merged[key] = this.clone(l[key]);
          continue;
        }
        // A locally present legacy item missing remotely is retained, never inferred deleted.
        const canApply = rh === base || (rh === 'absent' && lh !== 'absent' && !isDeleted);
        if (canApply && !(id && isDeleted && lh !== 'absent')) {
          if (lh === 'absent') delete merged[key]; else merged[key] = this.clone(l[key]);
        } else if (lh === 'absent' && base === 'unknown' && !p) {
          // No local copy is not an instruction to delete an older server item.
        } else conflicts.push({ key, base, localHash: lh, remoteHash: rh, remote: Object.hasOwn(r,key) ? this.clone(r[key]) : null,
          reason:base === 'unknown' ? 'unknown-base' : isDeleted ? 'deleted-item' : 'both-changed' });
      }
      const data = {};
      for (const field of this.fields) {
        if (this.lists.includes(field)) {
          const orderKey = JSON.stringify([field,'$order']);
          const order = pending.has(orderKey) ? [...(l[orderKey] || []), ...(r[orderKey] || [])] : [...(r[orderKey] || []), ...(l[orderKey] || [])];
          const ids = [...new Set(order)];
          const rows = ids.filter(id => Object.hasOwn(merged,JSON.stringify([field,id])))
            .map(id => merged[JSON.stringify([field,id])]);
          if (Object.hasOwn(local,field) || Object.hasOwn(remote,field)) data[field] = rows;
        } else {
          const key = JSON.stringify([field,null]);
          if (Object.hasOwn(merged,key)) data[field] = merged[key];
        }
      }
      return { data, conflicts };
    },
    replaceSlot(data, key, source) {
      const [field,id] = JSON.parse(key);
      if (this.lists.includes(field)) {
        if (id === '$order') return;
        const row = (source[field] || []).find(item => item.id === id);
        const index = (data[field] || []).findIndex(item => item.id === id);
        if (index >= 0) { if (row) data[field][index] = this.clone(row); else data[field].splice(index,1); }
        else if (row) (data[field] ||= []).push(this.clone(row));
      } else if (Object.hasOwn(source,field)) data[field] = this.clone(source[field]);
      else delete data[field];
    },
    versionTime(slots, key, versions, pending) {
      const hash = this.state(slots,key), recorded = versions?.[key];
      if (pending?.localHash === hash && Number.isSafeInteger(pending.changedAt)) return pending.changedAt;
      if (recorded?.hash === hash && Number.isSafeInteger(recorded.at) && recorded.at >= 0) return recorded.at;
      const time = Number(slots[key]?.updatedAt || slots[key]?.createdAt);
      return Number.isSafeInteger(time) && time >= 0 ? time : 0;
    },
    automaticPlan(local, remote, meta, decoded) {
      const result = this.merge(local,remote,meta), data = result.data;
      const l = this.slots(local), r = this.slots(remote), pending = new Map(meta.pending.map(p => [p.key,p]));
      const remoteVersions = decoded.syncVersions || {};
      if (!this.validVersions(remoteVersions)) throw new Error('Invalid record version metadata');
      const recovery = this.clone(meta.recovery || []), ids = new Set(recovery.map(entry => entry.id));
      const scope = (key, source) => {
        const [field,id] = JSON.parse(key);
        return {[field]:this.lists.includes(field) ? this.clone((source[field] || []).filter(row => row.id === id)) :
          Object.hasOwn(source,field) ? this.clone(source[field]) : null};
      };
      const archive = (key,reason,winner) => {
        const original = {key,local:scope(key,local),remote:scope(key,remote)};
        const id = 'auto-' + this.hash(original);
        if (!ids.has(id)) {
          recovery.push({...original,id,at:new Date().toISOString(),reason,winner,
            localDeleted:this.clone(local.deletedItemIds || []),remoteDeleted:this.clone(remote.deletedItemIds || [])});
          ids.add(id);
        }
      };
      // Older versions stopped on conflicts. Retain their captured server
      // originals as well, even if that server record has changed since then.
      for (const conflict of meta.conflicts || []) {
        if (!conflict?.key || !Object.hasOwn(conflict,'remote')) continue;
        let field,id;
        try { [field,id] = JSON.parse(conflict.key); } catch { continue; }
        if (!this.fields.includes(field) || id === '$order') continue;
        const original = {key:conflict.key,local:scope(conflict.key,local),remote:{[field]:
          this.lists.includes(field) ? (conflict.remote ? [this.clone(conflict.remote)] : []) : this.clone(conflict.remote)}};
        const archiveId = 'legacy-' + this.hash(original);
        if (!ids.has(archiveId)) { recovery.push({...original,id:archiveId,at:new Date().toISOString(),reason:'previous-conflict'});ids.add(archiveId); }
      }
      const deleted = new Set([...(local.deletedItemIds || []),...(remote.deletedItemIds || [])]);
      const prefixes = {healthFolders:'health-folder:',hobbyFolders:'hobby-folder:',siteFolders:'site-folder:'};
      const removed = (field,id) => id && (deleted.has(id) || (prefixes[field] && deleted.has(prefixes[field]+id)));
      for (const conflict of result.conflicts) {
        const [field,id] = JSON.parse(conflict.key);
        if (field === 'honeymoonData') continue;
        const localTime = this.versionTime(l,conflict.key,meta.itemVersions,pending.get(conflict.key));
        const remoteTime = this.versionTime(r,conflict.key,remoteVersions);
        // A missing legacy timestamp cannot outrank a known edit. Equal/unknown
        // times retain the current server version; both originals are archived.
        const choice = removed(field,id) ? 'deleted' : localTime > remoteTime ? 'local' : 'remote';
        archive(conflict.key,conflict.reason || 'concurrent-edit',choice);
        this.replaceSlot(data,conflict.key,choice === 'local' ? local : choice === 'remote' ? remote : {[field]:[]});
      }
      // Tombstones are a set. Device insertion order is not a new deletion and
      // must not make identical clients repeatedly overwrite each other.
      data.deletedItemIds = [...deleted].sort();
      for (const field of this.lists) for (const row of [...(local[field] || []),...(remote[field] || [])]) {
        if (removed(field,row.id)) archive(JSON.stringify([field,row.id]),'deleted-original','deleted');
      }
      for (const field of this.lists) if (data[field]) {
        data[field] = data[field].filter(row => {
          if (!removed(field,row.id)) return true;
          archive(JSON.stringify([field,row.id]),'deleted-original','deleted');return false;
        });
      }
      // Folder deletion and movement stay in the same confirmed snapshot. A
      // stale edit cannot recreate a deleted folder or leave its records orphaned.
      for (const [notes,folders,fallback] of [['healthNotes','healthFolders','general'],['hobbyNotes','hobbyFolders','general'],['sites','siteFolders','portal']]) {
        for (const row of data[notes] || []) if (removed(folders,row.folder)) {
          archive(JSON.stringify([notes,row.id]),'deleted-folder','moved');row.folder = fallback;
          if (!(data[folders] || []).some(folder => folder.id === fallback)) {
            const original = [...(local[folders] || []),...(remote[folders] || [])].find(folder => folder.id === fallback);
            (data[folders] ||= []).push(original ? this.clone(original) : {id:fallback,name:folders === 'siteFolders' ? '포털' : '일반/기타',icon:'📁'});
          }
        }
      }
      const ledgerKey = '["honeymoonData",null]', ledgerPending = pending.get(ledgerKey);
      const remoteAuthority = decoded.ledgerAuthority;
      const authoritative = this.isLedger(remote.honeymoonData) && remoteAuthority?.source === 'desktop-web' &&
        remoteAuthority.hash === this.hash(remote.honeymoonData);
      const desktop = this.clientKind() === 'desktop-web';
      const placeholder = !this.isLedger(local.honeymoonData) || Object.keys(local.honeymoonData).length === 0 ||
        this.canonical(local.honeymoonData) === this.canonical(getInitialLedger());
      const hasPcOriginal = this.isLedger(local.honeymoonData) && (!placeholder || ledgerPending?.source === 'desktop-web');
      let ledgerAuthority = authoritative ? this.clone(remoteAuthority) : null, waitingForDesktop = false;
      const receivedUnverified = meta.unverifiedLedgerHash === this.state(l,ledgerKey) && !ledgerPending;
      if (desktop && hasPcOriginal && !receivedUnverified && (!authoritative || ledgerPending || !meta.baseline.known)) {
        const localTime = this.versionTime(l,ledgerKey,meta.itemVersions,ledgerPending);
        const remoteTime = this.versionTime(r,ledgerKey,remoteVersions);
        const chooseLocal = !authoritative ||
          this.state(r,ledgerKey) === (ledgerPending?.base || meta.baseline.itemHashes[ledgerKey]) || localTime > remoteTime;
        data.honeymoonData = this.clone(chooseLocal ? local.honeymoonData : remote.honeymoonData);
        ledgerAuthority = {source:'desktop-web',hash:this.hash(data.honeymoonData)};
        if (this.state(l,ledgerKey) !== this.state(r,ledgerKey) && this.isLedger(remote.honeymoonData)) archive(ledgerKey,'desktop-ledger',chooseLocal ? 'local' : 'remote');
      } else if (authoritative) {
        data.honeymoonData = this.clone(remote.honeymoonData);
        if (this.isLedger(local.honeymoonData) && this.state(l,ledgerKey) !== this.state(r,ledgerKey)) archive(ledgerKey,'desktop-ledger','remote');
      } else {
        // A mobile/local-file client cannot promote its ledger to the PC source.
        if (Object.hasOwn(remote,'honeymoonData')) data.honeymoonData = this.clone(remote.honeymoonData);else delete data.honeymoonData;
        waitingForDesktop = hasPcOriginal || this.isLedger(remote.honeymoonData) && Object.keys(remote.honeymoonData).length > 0;
      }
      const output = this.slots(data), versions = {};
      for (const key of new Set([...Object.keys(l),...Object.keys(r),...Object.keys(output)])) {
        const hash = this.state(output,key);
        const at = Math.max(hash === this.state(l,key) ? this.versionTime(l,key,meta.itemVersions,pending.get(key)) : 0,
          hash === this.state(r,key) ? this.versionTime(r,key,remoteVersions) : 0);
        if (at) versions[key] = {hash,at};
      }
      return {data,recovery,versions,ledgerAuthority,waitingForDesktop};
    }
  };

    return LocalSyncProtocol;
  };
})(window);
