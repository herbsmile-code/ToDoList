// Central synchronization lifecycle. Dependencies resolve the existing Store/UI.
(function(window){
  'use strict';
  window.createCloudSyncManager = function({LocalSyncProtocol,mainStorage,STORAGE_KEY,E2EESecurityEngine,getStore,getUI,getVault}) {
  class CloudSyncManager {
    constructor() {
      this.spaceId = localStorage.getItem('todolist_jy_space_id') || '';
      this.pin = localStorage.getItem('todolist_jy_pin') || '';
      let savedUrl = localStorage.getItem('todolist_jy_active_rtdb_url');
      if (!savedUrl || savedUrl.includes('todolist-jy-default-rtdb.firebaseio.com')) {
        savedUrl = 'https://todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app';
        localStorage.setItem('todolist_jy_active_rtdb_url', savedUrl);
      }
      this.activeUrl = savedUrl;
      this.syncTimer = null;
      this.pushDebounceTimer = null;

      // Always restore true local timestamp and revision from localStorage to prevent clock drift issues!
      let localTs = 0;
      let localRev = 0;
      try {
        const raw = mainStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.updatedAt) localTs = Number(parsed.updatedAt) || 0;
          if (parsed && parsed.syncRevision) localRev = Number(parsed.syncRevision) || 0;
        }
      } catch (e) {}
      this.lastSyncedUpdatedAt = localTs;
      this.lastSyncedRevision = localRev;
      this.isPushing = false;
      this._vaultFilesCache = null;
      // Disposable verification cache, never a source of user data or persisted state.
      this._idleSyncCache = null;
      this._vaultChangeVersion = 0;
      this._vaultWritesInFlight = 0;
      this.objectTransport = window.createSyncObjectTransport?.({protocol:LocalSyncProtocol,crypto:E2EESecurityEngine,
        request:(url,options)=>options?.method==='PUT' ? this.conditionalPut(url,options) : this.requestCloud(url,options)});
    }

    init() {
      if (this._initialized) return;
      this._initialized = true;
      if (this.spaceId && this.pin) {
        this.fetchLatestFromCloud(true);
        this.startRealtimePolling();
      }
      this.updateUIStatus();
    }

    setSyncStage(stage) {
      this._syncStage = stage;
      if (!this._showSyncProgress || getStore().localWriteFailed) return;
      const message = {originals:'기기 원문을 보관하고 있습니다',download:'서버 자료를 받고 있습니다',
        decrypt:'받은 자료를 확인하고 있습니다',merge:'양쪽 기록을 합치고 있습니다',
        files:'첨부파일 원문을 확인하고 있습니다',upload:'서버에 변경을 보내고 있습니다',
        'local-save':'이 기기에 저장하고 있습니다'}[stage];
      if (message) getStore().setSaveStatus('syncing', '동기화 중 · ' + message + '.');
    }

    async hashPin(pin) {
      if (window.crypto && window.crypto.subtle) {
        try {
          const msgBuffer = new TextEncoder().encode(pin + '_salt_jy_2026');
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {}
      }
      let hash = 0;
      const str = pin + '_salt_jy_2026';
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 'h_' + Math.abs(hash).toString(16);
    }

    async verifyAndLogin(spaceId, pin) {
      if (!spaceId || !pin) {
        return { success: false, message: '아이디와 비밀번호를 모두 입력해 주세요 🌸' };
      }

      const inputId = spaceId.trim().toLowerCase();
      if (inputId !== 'on3257') {
        return {
          success: false,
          message: '⚠️ 등록되지 않은 아이디입니다! 오직 전용 아이디(on3257)로만 접근할 수 있어요 🔒'
        };
      }

      const sKey = 'on3257';
      const cleanPin = pin.trim();
      const hashed = await this.hashPin(cleanPin);
      const LOCAL_HASH_KEY = 'todolist_jy_master_pinhash';

      // 1. Cloud Auth Registry Check (중앙 클라우드 실시간 검증)
      const authUrl = `${this.activeUrl}/auth_registry/${sKey}.json`;
      let cloudRegistered, authEtag;
      try {
        const res = await this.requestCloud(authUrl, {headers:{'X-Firebase-ETag':'true'}});
        if (!res.ok) throw new Error('Account verification failed');
        cloudRegistered = await res.json();
        authEtag = res.headers.get('ETag');
        if (cloudRegistered !== null && (typeof cloudRegistered !== 'object' ||
            typeof cloudRegistered.pinHash !== 'string' || !cloudRegistered.pinHash)) throw new Error('Invalid account record');
      } catch (err) {
        console.warn('Cloud Auth check warning:', err);
        return {success:false, message:'계정 확인 서버에 연결하지 못했습니다. 기존 계정과 데이터를 유지합니다. 잠시 후 다시 로그인해 주세요.'};
      }

      // 2. 검증 분기
      if (cloudRegistered) {
        // 이미 클라우드에 등록된 비밀번호가 있는 경우 엄격하게 비교
        if (cloudRegistered.pinHash !== hashed) {
          return {
            success: false,
            message: '⚠️ 비밀번호가 일치하지 않습니다! 🔒'
          };
        }
      } else {
        // Only a successful, empty response can permit first registration.
        try {
          if (!authEtag) throw new Error('Account version missing');
          const registered = await this.requestCloud(authUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'if-match':authEtag },
            body: JSON.stringify({
              spaceId: 'on3257',
              pinHash: hashed,
              registeredAt: Date.now()
            })
          });
          if (!registered.ok) throw new Error('Account registration not confirmed');
        } catch (e) {
          console.warn('Failed to register initial pin on cloud:', e);
          return {success:false, message:'계정 등록을 확인하지 못했습니다. 기존 데이터를 유지합니다. 다시 로그인해 주세요.'};
        }
      }

      // 3. 로컬 스토리지 해시 및 로그인 세션 저장
      localStorage.setItem(LOCAL_HASH_KEY, hashed);
      this.spaceId = 'on3257';
      this.pin = cleanPin;
      localStorage.setItem('todolist_jy_space_id', 'on3257');
      localStorage.setItem('todolist_jy_pin', cleanPin);

      this.updateUIStatus();
      // Login and data synchronization are separate outcomes.
      this.retryAfter = 0;
      const synced = await this.fetchLatestFromCloud(true);
      // 2. Start realtime polling
      this.startRealtimePolling();
      return { success:true, synced:!!synced, message:synced
        ? '로그인 및 데이터 동기화가 완료되었습니다.'
        : '로그인은 완료됐지만 데이터 동기화는 아직 완료되지 않았습니다. 상단 동기화 상태를 확인해 주세요.' };
    }

    sanitizeKey(str) {
      if (!str) return 'anonymous';
      return encodeURIComponent(str.trim().toLowerCase()).replace(/\./g, '%2E').replace(/\$/g, '%24').replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/#/g, '%23').replace(/\//g, '%2F');
    }

    getStorageKey() {
      return `space_${this.sanitizeKey(this.spaceId)}_${this.sanitizeKey(this.pin)}`;
    }

    updateUIStatus() {
      const statusIcon = document.getElementById('cloud-status-icon');
      const statusText = document.getElementById('cloud-status-text');
      const banner = document.getElementById('sync-active-banner');
      const displayKey = document.getElementById('current-sync-key-display');
      const lockedScreen = document.getElementById('locked-privacy-screen');
      const views = [
        'tasks-view-container', 'files-view-container', 'wishlist-view-container',
        'photos-view-container', 'notes-view-container', 'ledger-view-container',
        'calendar-month-view-container', 'calendar-week-view-container',
        'vacation-view-container', 'sites-view-container', 'aistudy-view-container', 'devlog-view-container'
      ].map(id => document.getElementById(id));

      const isLogged = !!(this.spaceId && this.pin);

      if (isLogged) {
        if (statusIcon) statusIcon.textContent = '🔒';
        if (statusText) statusText.textContent = '암호화 연결';
        if (banner) banner.style.display = 'flex';
        if (displayKey) displayKey.textContent = 'on3257 (E2EE AES-256)';
        if (lockedScreen) lockedScreen.style.display = 'none';
      } else {
        if (statusIcon) statusIcon.textContent = '☁️';
        if (statusText) statusText.textContent = '비동기화';
        if (banner) banner.style.display = 'none';
        if (lockedScreen) lockedScreen.style.display = 'flex';
        views.forEach(v => { if (v) v.style.display = 'none'; });
      }
    }

    renderAllViews() {
      // renderTasks dispatches to the active screen; hidden views render on entry.
      try { getUI().renderTasks(); } catch (e) {}
      try { getUI().renderSidebar(); } catch (e) {}
    }

    async fetchLatestFromCloud(force = false) {
      if (force) this._idleSyncCache = null;
      return this._executePushTasksToCloud();
    }

    beginVaultWrite() {
      this._idleSyncCache = null;
      this._vaultChangeVersion++;
      this._vaultWritesInFlight++;
      return () => {
        this._vaultWritesInFlight--;
        this._idleSyncCache = null;
      };
    }

    vaultMetadataStamp() {
      return JSON.stringify([localStorage.getItem('todolist_jy_vault_meta'),
        localStorage.getItem('todolist_jy_vault_files')]);
    }

    canUseIdleCache(cached, target, raw) {
      return cached && this._idleSyncCache === cached && cached.target === target && cached.raw === raw &&
        getStore()._lastLocalRaw === raw && !getStore().localLoadFailed && !getStore().localWriteFailed && !getStore().localSyncInvalid && !getStore().writerBlocked &&
        target === LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) &&
        cached.vaultVersion === this._vaultChangeVersion && cached.vaultStamp === this.vaultMetadataStamp() && !this._vaultWritesInFlight &&
        Date.now() >= cached.checkedAt && Date.now() - cached.checkedAt < 300000 && getStore().localSync.baseline.known &&
        !getStore().localSync.waitingForDesktop && !getStore().localSync.pending.length && !getStore().localSync.conflicts.length;
    }

    async requestCloud(url, options = {}) {
      const controller = new AbortController();
      const {timeoutMs = 15000, ...requestOptions} = options;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const traffic=this._syncTraffic;
        if(traffic && typeof requestOptions.body==='string')traffic.uploadBytes+=requestOptions.body.length;
        const response = await fetch(url, {...requestOptions, signal:controller.signal});
        const body = response.status === 204 ? null : await response.json();
        if(traffic && body!==null)traffic.downloadBytes+=JSON.stringify(body).length;
        // Classify only known server reasons. Raw error messages may include a
        // path or submitted value, so they must never become user-facing logs.
        const message = typeof body?.error === 'string' ? body.error : '';
        const errorKind = /too (large|big|long)|size exceeds|maximum size|WRITE_TOO_BIG/i.test(message) ? 'size-limit' :
          /query parameter|print=silent|unsupported.*print/i.test(message) ? 'request-option' :
          /permission|denied|unauthoriz/i.test(message) ? 'permission' :
          /invalid.*(json|data)|parse/i.test(message) ? 'invalid-data' : 'unknown';
        return {ok:response.ok,status:response.status,errorKind,headers:response.headers,json:async () => body};
      }
      finally { clearTimeout(timer); }
    }

    objectContext(pin,current) {
      return {base:this.activeUrl,space:this.getStorageKey(),pin,target:LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]),current};
    }

    async conditionalPut(url, options) {
      const {current,...requestOptions}=options;
      if(requestOptions.method!=='PUT' || !requestOptions.headers?.['if-match'])throw new Error('Conditional PUT required');
      const target=LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]);
      const check=()=>{
        if(current && !current() || LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()])!==target)
          throw Object.assign(new Error('Local state changed'),{syncStale:true});
      };
      check();
      const plain=this._plainPutTarget===target;
      let response=await this.requestCloud(url+(plain?'':'?print=silent'),requestOptions);
      if(response.status===400 && !plain && response.errorKind!=='size-limit') {
        // Every write uses the same compatibility path: retain encrypted bytes
        // and the ETag condition, removing only the response-format option.
        this._plainPutTarget=target;check();
        response=await this.requestCloud(url,requestOptions);
      }
      return response;
    }

    async pushTasksToCloud(immediate = false) {
      if (getStore().localLoadFailed || getStore().localSyncInvalid) return false;
      if (this.pushDebounceTimer) clearTimeout(this.pushDebounceTimer);
      this.pushDebounceTimer = null;
      if (immediate) return this._executePushTasksToCloud();
      this.pushDebounceTimer = setTimeout(() => {
        this.pushDebounceTimer = null;
        this._executePushTasksToCloud();
      }, 350);
      return false; // Scheduling is not a server acknowledgement.
    }

    requestManualSync() {
      if (this._transferPromise) return Promise.resolve(false);
      if (this._manualPromise) return this._manualPromise;
      if (this.pushDebounceTimer) clearTimeout(this.pushDebounceTimer);
      this.pushDebounceTimer = null;
      // Join an existing automatic request, then send the latest snapshot once.
      // Rapid clicks and the settings button share this same promise.
      this._manualPromise = Promise.resolve().then(async () => {
        if (this._syncPromise) await this._syncPromise;
        this.retryAfter = 0;
        const acknowledged = await this._executePushTasksToCloud({manual:true, forceWrite:true});
        const ok = acknowledged && getStore().saveStatus === 'confirmed' &&
          !getStore().localSync.pending.length && getStore().hasConfirmedLocalData();
        if (acknowledged && !ok && getStore().saveStatus === 'confirmed') getStore().setSaveStatus('failed');
        if (getUI() && getUI().showToast) {
          getUI().showToast(ok ? '동기화 성공' : getStore().saveMessage, ok ? 'success' : 'warning');
        }
        return ok;
      }).finally(() => {
        this._manualPromise = null;
        getStore().renderSaveStatus();
      });
      getStore().renderSaveStatus();
      return this._manualPromise;
    }

    _executePushTasksToCloud(options = {}) {
      if (this._syncPromise) { this._syncAgain = true; return this._syncPromise; }
      if (this._transferPromise && !options.manual) return Promise.resolve(false);
      // The queued manual request owns the next turn; polling must not overtake it.
      if (this._manualPromise && !options.manual) return Promise.resolve(false);
      if (this._retryTimer) clearTimeout(this._retryTimer);
      this._retryTimer = null;
      this._syncAgain = false;
      const work = this._syncOnce(options);
      this._syncPromise = work;
      const release = () => {
        if (this._syncPromise !== work) return;
        this._syncPromise = null;
        const blocked = getStore().localLoadFailed || getStore().localSyncInvalid || getStore().writerBlocked;
        const waitingOnly = getStore().localSync?.waitingForDesktop &&
          getStore().localSync.pending.every(entry => entry.key === '["honeymoonData",null]');
        if (!blocked && this.spaceId && this.pin && (this._syncAgain || this.retryAfter ||
            getStore().saveStatus === 'pending' && !waitingOnly)) {
          const delay = Math.max(150, (this.retryAfter || 0) - Date.now());
          this._retryTimer = setTimeout(() => { this._retryTimer = null; this._executePushTasksToCloud(); }, delay);
        }
      };
      work.then(release, release);
      return work;
    }

    async compactRecovery(meta) {
      let compacted = meta;
      for (let index = 0; index < (meta.recovery || []).length; index++) {
        const entry = meta.recovery[index];
        if (new TextEncoder().encode(JSON.stringify(entry)).byteLength <= 32768) continue;
        // Keep large originals out of the limited synchronous getStore(). This is
        // a verified move into the existing originals DB, never a truncation.
        const archiveId = 'recovery-v1-' + LocalSyncProtocol.hash(entry);
        if (await window.SyncOriginals.preserve({id:archiveId,version:1,recovery:entry}) !== true) {
          throw new Error('Recovery original backup not confirmed');
        }
        if (compacted === meta) compacted = LocalSyncProtocol.clone(meta);
        compacted.recovery[index] = {id:entry.id,key:entry.key,at:entry.at,
          reason:entry.reason,winner:entry.winner,archiveId};
      }
      return compacted;
    }

    async commitSyncLocal(data, meta, guard = () => true) {
      const raw = getStore()._lastLocalRaw;
      this.setSyncStage('originals');
      const compacted = await this.compactRecovery(meta);
      if (window.MainStorage) await window.MainStorage.prepare({...data,localSync:compacted});
      if (raw !== getStore()._lastLocalRaw || getStore().writerBlocked || getStore().localLoadFailed || !guard()) return false;
      this.setSyncStage('local-save');
      return getStore().commitLocal(data,compacted);
    }

    async prepareDeviceData(target) {
      if (this._preparedTarget === target) {
        const raw = getStore()._lastLocalRaw;
        const compacted = await this.compactRecovery(getStore().localSync);
        if (raw !== getStore()._lastLocalRaw) return false;
        if (compacted === getStore().localSync) return true;
        const live = getStore().buildLocalData();
        return getStore().commitLocal(live,LocalSyncProtocol.track(getStore()._committedData,live,compacted));
      }
      const raw = getStore()._lastLocalRaw;
      const auxiliary = Object.fromEntries(Object.entries(LocalSyncProtocol.legacyKeys)
        .map(([field,key]) => [field,localStorage.getItem(key)]));
      const vaultVersion = this._vaultChangeVersion;
      const vaultFiles = await this.getAllVaultFiles(true,true);
      if (!window.SyncOriginals) throw new Error('Original backup module unavailable');
      const protectedOriginal = await window.SyncOriginals.preserve({id:'device-before-union-v1-' + target, version:1,
        createdAt:new Date().toISOString(), mainRaw:raw, auxiliary, vaultFiles});
      if (protectedOriginal !== true) throw new Error('Original backup not confirmed');
      if (raw !== getStore()._lastLocalRaw || mainStorage.getItem(STORAGE_KEY) !== raw ||
          vaultVersion !== this._vaultChangeVersion || this._vaultWritesInFlight ||
          target !== LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()])) return false;
      this.setSyncStage('merge');
      const data = getStore().buildLocalData(), meta = LocalSyncProtocol.clone(getStore().localSync);
      const imported = {...meta.legacyImported};
      for (const [field,text] of Object.entries(auxiliary)) {
        if (imported[field]) continue;
        if (text !== null) {
          const value = JSON.parse(text);
          const original = field === 'streak' ? value : LocalSyncProtocol.legacyRows(field,value);
          if (field === 'streak' && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('Invalid legacy streak');
          if (!Object.hasOwn(data,field) || field === 'streak' && !Object.hasOwn(getStore()._committedData,field)) data[field] = original;
          else if (field !== 'streak') {
            const combined = [...data[field]];
            for (const row of original) {
              const existing = combined.find(item => item.id === row.id);
              if (!existing) combined.push(row);
              else if (LocalSyncProtocol.canonical(existing) !== LocalSyncProtocol.canonical(row)) {
                // Preserve distinct legacy originals as visible records, once.
                const copy = {...row,id:field + '-original-' + LocalSyncProtocol.hash(row)};
                if (!combined.some(item => item.id === copy.id)) combined.push(copy);
              }
            }
            data[field] = combined;
          }
        }
        imported[field] = true;
      }
      const tracked = LocalSyncProtocol.track(getStore()._committedData,data,meta);
      const migratedSlots = LocalSyncProtocol.slots(data);
      for (const entry of tracked.pending) {
        const [field] = JSON.parse(entry.key);
        if (Object.hasOwn(auxiliary,field) && !meta.pending.some(old => old.key === entry.key)) {
          // Moving old storage is not a fresh user edit. Retain an actual row
          // timestamp if present; never make an old import win by migration time.
          entry.changedAt = LocalSyncProtocol.versionTime(migratedSlots,entry.key,meta.itemVersions);
        }
      }
      tracked.legacyImported = imported;
      if (!await this.commitSyncLocal(data,tracked)) return false;
      this._preparedTarget = target;
      window.treasureVault?.refreshFromStore();
      return true;
    }

    requestMemoTransfer(sourceFile, saveProtectionFile) {
      if (this._transferPromise) return this._transferPromise;
      // Share the central synchronization boundary; this preparation only GETs.
      // The existing manual sync performs encryption and conditional PUT later.
      this._transferPromise = Promise.resolve().then(async () => {
        if (this._manualPromise) await this._manualPromise;
        if (this._syncPromise) await this._syncPromise;
        const p = LocalSyncProtocol;
        const parsed = window.MemoTransfer.parseFile(sourceFile,p);
        if (window.location?.protocol !== 'https:' || window.location.hostname !== 'herbsmile-code.github.io' || !window.location.pathname.startsWith('/ToDoList/')) {
          throw new Error('가져오기는 GitHub 웹사이트에서 진행해 주세요. 로컬 원본은 변경하지 않습니다.');
        }
        if (!this.spaceId || !this.pin) throw new Error('웹사이트에서 기존 계정으로 로그인해 주세요.');
        const target = p.hash([this.activeUrl,this.getStorageKey()]);
        if ([parsed.bundle.targetFingerprint,parsed.data.localSync?.targetFingerprint,getStore().localSync?.targetFingerprint]
            .some(value => value && value !== target)) throw new Error('백업과 웹의 동기화 계정이 다릅니다. 이전을 중단했습니다.');
        const raw = getStore()._lastLocalRaw;
        const live = getStore().buildLocalData();
        const liveText = JSON.stringify(live), metaText = JSON.stringify(getStore().localSync);
        const vaultVersion = this._vaultChangeVersion;
        const check = () => {
          if (getStore().localLoadFailed || getStore().localWriteFailed || getStore().localSyncInvalid || getStore().writerBlocked ||
              this._vaultWritesInFlight || this._vaultChangeVersion !== vaultVersion ||
              getStore()._lastLocalRaw !== raw || mainStorage.getItem(STORAGE_KEY) !== raw ||
              JSON.stringify(getStore().buildLocalData()) !== liveText || JSON.stringify(getStore().localSync) !== metaText ||
              p.hash([this.activeUrl,this.getStorageKey()]) !== target) {
            throw new Error('데이터 또는 편집 상태가 달라져 이전을 중단했습니다. 최신 상태에서 다시 시도해 주세요.');
          }
        };
        check();
        const pin = this.pin;
        const response = await this.requestCloud(this.activeUrl + '/spaces/' + this.getStorageKey() + '.json',
          {headers:{'X-Firebase-ETag':'true'}});
        if (!response.ok || !response.headers.get('ETag')) throw new Error('서버 원본을 확인하지 못해 이전을 중단했습니다. 잠시 후 다시 시도해 주세요.');
        const encrypted = await response.json();
        if (encrypted?.isEncrypted && (!encrypted.iv || !encrypted.payload)) throw new Error('서버 암호화 데이터가 불완전합니다.');
        const decoded = this.objectTransport ? await this.objectTransport.read(encrypted,this.objectContext(pin,()=>{check();return true;}),
          {...live,vaultFiles:await this.getAllVaultFiles(true,true)}) : encrypted === null ? {} : await E2EESecurityEngine.decrypt(encrypted,pin);
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('서버 원본을 해독하지 못했습니다.');
        check();
        const remote = p.select(decoded);
        const plan = window.MemoTransfer.plan(live,remote,parsed.data,getStore().localSync,p);
        const protection = {format:'todolist-before-memo-transfer',version:1,createdAt:new Date().toISOString(),
          source:parsed.bundle,webRaw:raw,webLive:live,
          server:{encrypted,decoded,etag:response.headers.get('ETag')},summary:plan.summary};
        const proof = await saveProtectionFile(protection);
        if (proof !== p.hash(JSON.stringify(protection,null,2))) throw new Error('보호 백업 저장을 확인하지 못해 이전을 중단했습니다.');
        check();
        const next = {...live,...plan.data,
          updatedAt:Math.max(Date.now(),(Number(live.updatedAt)||0)+1,(Number(decoded.updatedAt)||0)+1),
          syncRevision:Math.max(Number(live.syncRevision)||0,Number(decoded.revision)||0)+1};
        // A real GET supplies the comparison base. All differences remain pending
        // until the ordinary sync sees a matching base and receives a PUT ack.
        const base = {...p.empty(),targetFingerprint:target,baseline:p.baseline(remote)};
        for (const field of ['recovery','conflicts','editClock','itemVersions','ledgerAuthority','unverifiedLedgerHash','waitingForDesktop']) {
          if (Object.hasOwn(getStore().localSync,field)) base[field] = p.clone(getStore().localSync[field]);
        }
        const pending = p.track(remote,p.select(next),base);
        if (!getStore().commitLocal(next,pending)) throw new Error('웹 브라우저 저장 성공을 확인하지 못했습니다. 보호 백업을 보관해 주세요.');
        this._idleSyncCache = null;
        getStore().setSaveStatus('pending');
        return {summary:plan.summary};
      }).finally(() => { this._transferPromise = null; getStore().renderSaveStatus(); });
      getStore().renderSaveStatus();
      return this._transferPromise;
    }

    async _syncOnce({forceWrite = false} = {}) {
      if (getStore().localLoadFailed || getStore().localSyncInvalid || getStore().writerBlocked) {
        getStore().setSaveStatus('conflict', '저장 데이터 또는 편집 권한을 확인해야 합니다. 기존 데이터를 유지하며 동기화를 중단했습니다.');
        return false;
      }
      if (!this.spaceId || !this.pin) {
        getStore().setSaveStatus('login', '동기화 필요 · 클라우드에 로그인해 주세요.');
        return false;
      }
      if (this.retryAfter && Date.now() < this.retryAfter) return false;
      this.isPushing = true;
      this._showSyncProgress = forceWrite || getStore().saveStatus !== 'confirmed';
      const target = LocalSyncProtocol.hash([this.activeUrl, this.getStorageKey()]);
      const sessionPin = this.pin;
      const startedAt = Date.now(), retryAttempt = this.failures || 0;
      this._lastUploadBytes = 0;
      this._syncTraffic = {uploadBytes:0,downloadBytes:0};
      const url = this.activeUrl + '/spaces/' + this.getStorageKey() + '.json';
      try {
        if (getStore().localSync.targetFingerprint && getStore().localSync.targetFingerprint !== target) {
          getStore().setSaveStatus('conflict'); return false;
        }
        this.setSyncStage('originals');
        if (!await this.prepareDeviceData(target)) return false;
        // Persist unsaved mutations/outbox before ANY network request.
        // Routine checks keep the last visible status until there is work or an error.
        this.setSyncStage('local-save');
        if (!getStore().saveLocalOnly(null, null, {showPending:false, skipUnchanged:!forceWrite})) return false;
        if (forceWrite) getStore().setSaveStatus('syncing');
        else if (getStore().localSync.pending.length && getStore().saveStatus === 'confirmed') getStore().setSaveStatus('pending');
        let capturedRaw = getStore()._lastLocalRaw;
        const objectVaultVersion=this._vaultChangeVersion;
        const objectContext=this.objectTransport ? this.objectContext(sessionPin,()=>getStore()._lastLocalRaw===capturedRaw &&
          !getStore().localLoadFailed && !getStore().localWriteFailed && !getStore().writerBlocked &&
          this._vaultChangeVersion===objectVaultVersion && !this._vaultWritesInFlight &&
          LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()])===target) : null;
        const cached = this._idleSyncCache;
        this.setSyncStage('download');
        if (!forceWrite && /^[A-Za-z0-9+/]{16}$/.test(cached?.iv || '') && this.canUseIdleCache(cached,target,capturedRaw)) {
          // Every supported encrypted write uses a fresh 96-bit GCM nonce.
          // Checking it avoids downloading/merging an unchanged large snapshot.
          // This never acknowledges pending edits or supplies an ETag for a PUT.
          const probe = await this.requestCloud(url.replace(/\.json$/,'/iv.json'));
          if (!probe.ok) throw Object.assign(new Error('Cloud check failed: ' + probe.status),{httpStatus:probe.status,kind:probe.errorKind});
          const nonce = await probe.json();
          this._lastRemoteCheckAt = Date.now();
          if (!this.canUseIdleCache(cached,target,capturedRaw)) return false;
          if (nonce === cached.iv) {
            if (!getStore().hasConfirmedLocalData()) {
              this._idleSyncCache = null;
              getStore().setSaveStatus('pending','동기화 필요 · 변경된 로컬 데이터를 다시 확인합니다.');
              return false;
            }
            this.failures = 0; this.retryAfter = 0;
            if (getStore().saveStatus !== 'confirmed') getStore().setSaveStatus('confirmed');
            return true;
          }
        }
        const response = await this.requestCloud(url, { headers: { 'X-Firebase-ETag': 'true' }, timeoutMs:60000 });
        this._lastRemoteCheckAt = Date.now();
        if (!response.ok) throw Object.assign(new Error('Cloud GET failed: ' + response.status),{httpStatus:response.status,kind:response.errorKind});
        const etag = response.headers.get('ETag');
        if (!etag) throw new Error('Cloud ETag missing');
        const encrypted = await response.json();
        if (encrypted?.isEncrypted && (!encrypted.iv || !encrypted.payload)) throw new Error('Incomplete encrypted response');
        if (getStore().localLoadFailed || getStore().localSyncInvalid || getStore().localWriteFailed || getStore().writerBlocked || getStore()._lastLocalRaw !== capturedRaw) return false;
        if (LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) !== target) return false;
        const wire = JSON.stringify(encrypted);
        if (!forceWrite && this.canUseIdleCache(cached,target,capturedRaw) && cached.etag === etag && cached.wire === wire) {
          // Check durable bytes AND live Store values again after the network await.
          // This path acknowledges no pending changes and performs no data writes.
          if (!getStore().hasConfirmedLocalData()) {
            this._idleSyncCache = null;
            getStore().setSaveStatus('pending', '동기화 필요 · 변경된 로컬 데이터를 다시 확인합니다.');
            return false;
          }
          this.failures = 0; this.retryAfter = 0;
          if (getStore().saveStatus !== 'confirmed') getStore().setSaveStatus('confirmed');
          return true;
        }
        const captured = LocalSyncProtocol.clone(getStore()._committedData);
        const meta = LocalSyncProtocol.clone(getStore().localSync);
        const local = LocalSyncProtocol.select(captured);
        this.setSyncStage('decrypt');
        const receivedVault = encrypted?.v===4 && this.objectTransport ? await this.getAllVaultFiles(true,true) : null;
        const receivedVaultVersion = this._vaultChangeVersion;
        const decoded = this.objectTransport ? await this.objectTransport.read(encrypted,objectContext,
          {...local,...(receivedVault?{vaultFiles:receivedVault}:{})}) : encrypted === null ? {} : await E2EESecurityEngine.decrypt(encrypted, sessionPin);
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('Invalid cloud object');
        if (getStore().localLoadFailed || getStore()._lastLocalRaw !== capturedRaw || getStore().localWriteFailed || getStore().writerBlocked ||
            LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) !== target) return false;
        const remote = LocalSyncProtocol.select(decoded); // NEVER import remote.localSync.
        this.setSyncStage('originals');
        if (this._protectedRemoteTarget !== target) {
          const protectedOriginal = await window.SyncOriginals.preserve({id:'server-before-union-v1-' + target,version:1,
            createdAt:new Date().toISOString(),data:decoded});
          if (protectedOriginal !== true) throw new Error('Server original backup not confirmed');
          if (getStore()._lastLocalRaw !== capturedRaw || getStore().localWriteFailed || getStore().writerBlocked) return false;
          this._protectedRemoteTarget = target;
        }
        this.setSyncStage('merge');
        await LocalSyncProtocol.primeHashes(local,remote);
        if(getStore()._lastLocalRaw!==capturedRaw || getStore().localLoadFailed || getStore().localWriteFailed || getStore().writerBlocked ||
            LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()])!==target)return false;
        const result = LocalSyncProtocol.automaticPlan(local, remote, meta, decoded);
        if (JSON.stringify(meta.recovery || []) !== JSON.stringify(result.recovery)) {
          // Preserve both originals durably BEFORE changing the active copy or
          // issuing a conditional upload. Failure leaves the outbox untouched.
          meta.recovery = result.recovery;
          if (!await this.commitSyncLocal(captured,meta)) return false;
          meta.recovery = LocalSyncProtocol.clone(getStore().localSync.recovery || []);
          capturedRaw = getStore()._lastLocalRaw;
        }
        // Vault original bytes stay coordinated with IndexedDB. Never replace them
        // with a cloud metadata-only list. Existing file helpers own IDB writes.
        const readVaultVersion = this._vaultChangeVersion;
        this.setSyncStage('files');
        const vaultUnchanged = () => this._vaultChangeVersion === readVaultVersion && !this._vaultWritesInFlight;
        if (!vaultUnchanged()) { getStore().setSaveStatus('pending'); return false; }
        const localVault = receivedVault && receivedVaultVersion===readVaultVersion ? receivedVault : await this.getAllVaultFiles(true, true);
        if (getStore()._lastLocalRaw !== capturedRaw || getStore().localLoadFailed || !vaultUnchanged()) return false;
        const remoteVault = decoded.vaultFiles || [];
        if (!Array.isArray(remoteVault) || remoteVault.some(f=>!f || typeof f.id !== 'string') ||
            new Set(remoteVault.map(f=>f.id)).size !== remoteVault.length) throw new Error('Invalid vault records');
        const vaultMap = new Map(remoteVault.map(f => [f.id,f]));
        const archiveVault = (id,local,remote) => {
          const original = {key:JSON.stringify(['vaultFiles',id]),local:{vaultFiles:local ? [local] : []},remote:{vaultFiles:remote ? [remote] : []}};
          const archiveId = 'auto-' + LocalSyncProtocol.hash(original);
          if (!(meta.recovery || []).some(entry=>entry.id===archiveId)) {
            (meta.recovery ||= []).push({...original,id:archiveId,at:new Date().toISOString(),reason:'vault-original'});
          }
        };
        for (const f of localVault) {
          if (!f || !f.id) continue;
          const previous = vaultMap.get(f.id);
          if (!previous) vaultMap.set(f.id,f);
          else if (LocalSyncProtocol.hash({...previous, dataUrl:null}) !== LocalSyncProtocol.hash({...f, dataUrl:null}) ||
              previous.dataUrl && f.dataUrl && previous.dataUrl !== f.dataUrl) {
            archiveVault(f.id,f,previous);
            const winner = (Number(f.updatedAt || f.createdAt)||0) > (Number(previous.updatedAt || previous.createdAt)||0) ? f : previous;
            // A metadata-only response never removes bytes available on this device.
            vaultMap.set(f.id,{...winner,...(!winner.dataUrl && (f.dataUrl || previous.dataUrl) ? {dataUrl:f.dataUrl || previous.dataUrl} : {})});
          } else if (!previous.dataUrl && f.dataUrl) vaultMap.set(f.id,f);
        }
        for (const f of vaultMap.values()) if ((result.data.deletedItemIds || []).includes(f.id)) {
          archiveVault(f.id,localVault.find(local=>local.id===f.id),remoteVault.find(remote=>remote.id===f.id));
        }
        if (JSON.stringify(getStore().localSync.recovery || []) !== JSON.stringify(meta.recovery || [])) {
          if (!await this.commitSyncLocal(captured,meta)) return false;
          meta.recovery = LocalSyncProtocol.clone(getStore().localSync.recovery || []);
          capturedRaw = getStore()._lastLocalRaw;
        }
        const vaultFiles = [...vaultMap.values()].filter(f => !(result.data.deletedItemIds || []).includes(f.id));
        const rawPayload = {...LocalSyncProtocol.select(result.data), vaultFiles,syncVersions:result.versions,
          revision: Math.max(Number(decoded.revision)||0, getStore().syncRevision||0) + 1,
          updatedAt: Math.max(Date.now(), (Number(decoded.updatedAt)||0)+1, getStore().lastUpdatedAt||0)};
        if (result.ledgerAuthority) rawPayload.ledgerAuthority = result.ledgerAuthority;
        const byId = rows => [...rows].sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        const [remoteHash, mergedHash, localVaultHash, mergedVaultHash, localHash, resultHash] = await Promise.all([
          LocalSyncProtocol.hashAsync({...remote, vaultFiles:decoded.vaultFiles || [],syncVersions:decoded.syncVersions || {},ledgerAuthority:decoded.ledgerAuthority || null}),
          LocalSyncProtocol.hashAsync({...result.data, vaultFiles,syncVersions:result.versions,ledgerAuthority:result.ledgerAuthority}),
          LocalSyncProtocol.hashAsync(byId(localVault)),LocalSyncProtocol.hashAsync(byId(vaultFiles)),
          LocalSyncProtocol.hashAsync(local),LocalSyncProtocol.hashAsync(result.data)
        ]);
        if (getStore().localLoadFailed || getStore().localWriteFailed || getStore().writerBlocked || getStore()._lastLocalRaw !== capturedRaw ||
            !vaultUnchanged() || LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) !== target) return false;
        const useObjects = this.objectTransport && (encrypted?.v===4 || window.SyncObjectTransportEnabled!==false);
        const shouldWrite = remoteHash !== mergedHash || forceWrite || useObjects && encrypted?.v!==4;
        let confirmedIv = encrypted?.iv;
        if (shouldWrite) {
          this._showSyncProgress = true;
          this.setSyncStage('upload');
          const encryptedBody = useObjects ? await this.objectTransport.prepare(rawPayload,encrypted,objectContext) :
            await E2EESecurityEngine.encrypt(rawPayload, sessionPin);
          if (!encryptedBody?.isEncrypted || !encryptedBody.payload || !encryptedBody.iv) throw new Error('Encryption failed; plaintext upload blocked');
          if (getStore().localLoadFailed || getStore()._lastLocalRaw !== capturedRaw || getStore().localWriteFailed || getStore().writerBlocked) return false;
          if (!vaultUnchanged()) { getStore().setSaveStatus('pending'); return false; }
          if (LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) !== target) {
            getStore().setSaveStatus('conflict', '동기화 계정이 변경되어 전송을 중단했습니다. 기존 데이터를 유지합니다.');
            return false;
          }
          // Keep the conditional write; ask only for its acknowledgement instead
          // of receiving the entire multi-megabyte encrypted payload again.
          const options = {method:'PUT',headers:{'Content-Type':'application/json','if-match':etag},
            body:JSON.stringify(encryptedBody),timeoutMs:60000};
          this._lastUploadBytes = options.body.length; // Encrypted envelope is ASCII.
          this._uploadNonce = {target,iv:encryptedBody.iv};
          const put = await this.conditionalPut(url,{...options,current:()=>getStore()._lastLocalRaw===capturedRaw &&
            !getStore().localLoadFailed && !getStore().localWriteFailed && !getStore().writerBlocked && vaultUnchanged()});
          if (put.status === 412) {
            window.SyncDiagnostics?.record({outcome:'deferred',stage:'upload',status:412,attempt:retryAttempt,
              durationMs:Date.now()-startedAt,uploadBytes:this._lastUploadBytes});
            this._syncAgain = true;
            getStore().setSaveStatus('pending');
            return false; // Another device saved first: re-read and merge automatically.
          }
          if (!put.ok) throw Object.assign(new Error('Cloud PUT failed: ' + put.status),{httpStatus:put.status,kind:put.errorKind});
          confirmedIv = encryptedBody.iv;
        }
        // A GET matching our contents also confirms a previously lost PUT response.
        // An older response must never clear a newer edit's outbox.
        if (getStore().localLoadFailed || getStore().localWriteFailed) return false;
        if (!vaultUnchanged()) { getStore().setSaveStatus('pending'); return false; }
        if (LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) !== target) {
          getStore().setSaveStatus('conflict', '동기화 계정이 변경되어 완료 처리를 중단했습니다. 미전송 기록을 유지합니다.');
          return false;
        }
        if (getStore()._lastLocalRaw !== capturedRaw) {
          // The acknowledged snapshot is older than a local edit. Keep that edit
          // pending, but advance its comparison base to the version just accepted.
          const latestMeta = LocalSyncProtocol.clone(getStore().localSync);
          latestMeta.editClock = Object.values(result.versions).reduce((clock,v)=>Math.max(clock,v.at),Number(latestMeta.editClock)||0);
          const confirmedSlots = LocalSyncProtocol.slots(result.data);
          for (const p of latestMeta.pending) {
            const sent = meta.pending.find(old => old.key === p.key);
            if (sent) p.base = LocalSyncProtocol.state(confirmedSlots,p.key);
          }
          if (!await this.commitSyncLocal(getStore()._committedData,latestMeta)) return false;
          getStore().setSaveStatus('pending', '동기화 필요 · 전송 중 추가된 변경이 있습니다. 최신 데이터는 이 기기에 저장되어 있습니다.');
          return false;
        }
        const confirmed = shouldWrite ? rawPayload : {...result.data, updatedAt:decoded.updatedAt, revision:decoded.revision};
        const next = {...captured, ...result.data,
          updatedAt:Number(confirmed.updatedAt)||captured.updatedAt,
          syncRevision:Number(confirmed.revision)||captured.syncRevision};
        const acknowledged = {...meta,version:1,targetFingerprint:target,baseline:LocalSyncProtocol.baseline(result.data),pending:[],conflicts:[],
          itemVersions:result.versions,ledgerAuthority:result.ledgerAuthority,waitingForDesktop:result.waitingForDesktop,
          editClock:Object.values(result.versions).reduce((clock,v)=>Math.max(clock,v.at),Number(meta.editClock)||0)};
        delete acknowledged.conflictScopes;
        if (!result.ledgerAuthority && !Object.hasOwn(captured,'honeymoonData') && Object.hasOwn(result.data,'honeymoonData')) {
          acknowledged.unverifiedLedgerHash = LocalSyncProtocol.hash(result.data.honeymoonData);
        } else if (result.ledgerAuthority) delete acknowledged.unverifiedLedgerHash;
        if (result.waitingForDesktop && Object.hasOwn(captured,'honeymoonData')) {
          next.honeymoonData = LocalSyncProtocol.clone(captured.honeymoonData);
          const key = '["honeymoonData",null]', hash = LocalSyncProtocol.hash(next.honeymoonData);
          if (hash !== (acknowledged.baseline.itemHashes[key] || 'absent')) {
            const original = meta.pending.find(entry => entry.key === key);
            acknowledged.pending.push(original || {key,changeId:'ledger-awaiting-desktop',base:'unknown',localHash:hash});
          }
        }
        const mergedVault = [...vaultMap.values()].filter(f => !(result.data.deletedItemIds || []).includes(f.id));
        if (localVaultHash !== mergedVaultHash) {
          this.setSyncStage('files');
          await this.saveVaultFiles(mergedVault, true, () =>
            this._vaultChangeVersion === readVaultVersion + 1 && this._vaultWritesInFlight === 1);
          if (getStore()._lastLocalRaw !== capturedRaw || getStore().localLoadFailed || getStore().writerBlocked) return false;
          if (this._vaultChangeVersion > readVaultVersion + 1 || this._vaultWritesInFlight) { getStore().setSaveStatus('pending'); return false; }
        }
        this.setSyncStage('local-save');
        const commitVaultVersion = this._vaultChangeVersion;
        if (!await this.commitSyncLocal(next, acknowledged, () => !this._vaultWritesInFlight && this._vaultChangeVersion === commitVaultVersion &&
            LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]) === target)) return false;
        window.treasureVault?.refreshFromStore();
        // Cache only after server acknowledgement AND durable local commit. A
        // PUT supplies a nonce, never a guessed ETag. Full validation still runs
        // every five minutes and whenever local data/files or the nonce change.
        this._idleSyncCache = !result.waitingForDesktop && !this._vaultWritesInFlight &&
          (!shouldWrite || /^[A-Za-z0-9+/]{16}$/.test(confirmedIv || ''))
          ? {target, raw:getStore()._lastLocalRaw, etag:shouldWrite ? null : etag, wire:shouldWrite ? null : wire, iv:confirmedIv,
            vaultVersion:this._vaultChangeVersion, vaultStamp:this.vaultMetadataStamp(), checkedAt:Date.now()} : null;
        this._confirmedRemoteNonce = {target,iv:confirmedIv};
        this.lastSyncedUpdatedAt = getStore().lastUpdatedAt;
        this.lastSyncedRevision = getStore().syncRevision;
        this.failures = 0; this.retryAfter = 0;
        this.lastSyncFailure = null;
        if (shouldWrite || retryAttempt) window.SyncDiagnostics?.record({outcome:retryAttempt?'recovered':'saved',stage:'local-save',
          attempt:retryAttempt,durationMs:Date.now()-startedAt,...this._syncTraffic});
        getStore()._localSaveFailures = 0;
        if (result.waitingForDesktop) {
          getStore().setSaveStatus('pending','다른 기록은 동기화했습니다. 가계부는 원본이 있는 PC 웹에서 접속하면 자동으로 맞춰집니다.');
        } else if (getStore().saveStatus !== 'confirmed' || forceWrite) {
          getStore().setSaveStatus('confirmed', forceWrite ? '동기화 성공' : undefined);
        }
        // Do not render hidden ledger views: their renderer currently saves data.
        if (getUI() && localHash !== resultHash) {
          getUI().renderTasks(); getUI().renderSidebar();
        }
        return !result.waitingForDesktop;
      } catch (e) {
        this._idleSyncCache = null;
        if(e?.syncStale) {this._syncAgain=true;getStore().setSaveStatus('pending');return false;}
        this.failures = (this.failures || 0) + 1;
        this.retryAfter = Date.now() + Math.min(60000, 1000 * 2 ** Math.min(this.failures,6));
        let reason = {originals:'복구 원문 보관을 확인하지 못했습니다',download:'서버 데이터를 받지 못했습니다',
          decrypt:'서버 데이터의 암호를 확인하지 못했습니다',merge:'기존 항목 형식을 확인하지 못했습니다',
          upload:'서버 저장 응답을 확인하지 못했습니다',files:'첨부파일 원문을 읽지 못했습니다',
          'local-save':'기기 저장을 확인하지 못했습니다'}[this._syncStage] || '처리를 완료하지 못했습니다';
        const httpStatus = e?.httpStatus || /^Cloud (?:GET|PUT) failed: (\d{3})$/.exec(e?.message || '')?.[1];
        const kind = e?.kind || (e?.name === 'AbortError' ? 'timeout' : 'unknown');
        this.lastSyncFailure = {stage:this._syncStage,status:Number(httpStatus)||0,kind,at:Date.now(),
          uploadBytes:this._syncStage === 'upload' ? this._lastUploadBytes || 0 : 0};
        window.SyncDiagnostics?.record({...this.lastSyncFailure,outcome:'failed',attempt:this.failures,durationMs:Date.now()-startedAt,...this._syncTraffic});
        if (kind === 'size-limit') reason = '서버가 전송 자료의 크기 제한으로 저장을 거절했습니다';
        else if (kind === 'request-option') reason = '서버가 전송 요청 옵션을 거절했습니다';
        else if (kind === 'permission') reason = '서버가 데이터 접근 권한을 거절했습니다';
        else if (kind === 'invalid-data') reason = '서버가 전송 자료 형식을 거절했습니다';
        else if (kind === 'integrity') reason = '기록 또는 첨부파일 원문을 확인하지 못했습니다';
        if (e?.name === 'AbortError') reason += ' (서버 응답 제한시간 초과)';
        else if (httpStatus) reason += ' (서버 응답 ' + httpStatus + ')';
        else if (e?.name === 'TypeError' && ['download','upload'].includes(this._syncStage)) reason += ' (네트워크 연결 오류)';
        getStore().setSaveStatus(getStore().localWriteFailed ? 'failed' : 'syncFailed', getStore().localWriteFailed ? undefined :
          '동기화 재시도 중 · ' + reason + '. 기존 원문을 유지합니다.');
        // Do not log request URLs, credentials or record contents.
        console.warn('Cloud sync deferred; automatic retry scheduled.');
        return false;
      } finally {
        this._syncTraffic = null;
        this._uploadNonce = null;
        this.isPushing = false;
        if (getStore().saveStatus === 'syncing' || getStore().saveStatus === 'pending' && !getStore().localSync.waitingForDesktop) {
          const stage = {originals:'원문 보관',download:'서버 수신',decrypt:'자료 확인',merge:'기록 병합',
            files:'첨부파일 확인',upload:'서버 전송','local-save':'기기 저장'}[this._syncStage] || '최신 자료 확인';
          getStore().setSaveStatus('pending', '자동 재시도 중 · ' + stage + ' 단계가 완료되지 않았습니다. 기존 원문과 미전송 변경을 유지합니다.');
        }
        this._showSyncProgress = false;
      }
    }

    stopRemoteListener() {
      this._remoteStream?.close();
      this._remoteStream = null;
      this._streamConnected = false;
      if (this._remoteNoticeTimer) clearTimeout(this._remoteNoticeTimer);
      this._remoteNoticeTimer = null;
    }

    startRemoteListener() {
      if (!window.EventSource || !this.spaceId || !this.pin || document.hidden) return;
      // Observe only the encryption nonce. Every encrypted commit changes it;
      // the large encrypted data is fetched once through the existing CAS flow.
      const url = this.activeUrl + '/spaces/' + this.getStorageKey() + '/iv.json';
      if (this._remoteStream && this._remoteStreamUrl === url) return;
      this.stopRemoteListener();
      try {
        const stream = new window.EventSource(url);
        this._remoteStream = stream; this._remoteStreamUrl = url;
        const current = () => this._remoteStream === stream &&
          url === this.activeUrl + '/spaces/' + this.getStorageKey() + '/iv.json';
        const changed = event => {
          if (!current()) { stream.close(); return; }
          this._streamConnected = true;
          let nonce;
          try { const message = JSON.parse(event?.data); if (message.path === '/') nonce = message.data; } catch {}
          const target = LocalSyncProtocol.hash([this.activeUrl,this.getStorageKey()]);
          if (typeof nonce === 'string' && /^[A-Za-z0-9+/]{16}$/.test(nonce) &&
              [this._confirmedRemoteNonce,this._uploadNonce].some(known=>known?.target === target && known.iv === nonce)) return;
          if (this._remoteNoticeTimer) clearTimeout(this._remoteNoticeTimer);
          this._remoteNoticeTimer = setTimeout(() => {
            this._remoteNoticeTimer = null;
            if (current()) this.fetchLatestFromCloud(false);
          },100);
        };
        stream.addEventListener('put',changed);
        stream.addEventListener('patch',changed);
        stream.addEventListener('error',() => { if (current()) this._streamConnected = false; });
        for (const event of ['cancel','auth_revoked']) stream.addEventListener(event,() => {
          if (current()) this.stopRemoteListener();
        });
      } catch { this._streamConnected = false; }
    }

    startRealtimePolling() {
      if (this.syncTimer) clearInterval(this.syncTimer);
      this.startRemoteListener();
      this.syncTimer = setInterval(() => {
        if (!document.hidden && (!this._streamConnected || Date.now() - (this._lastRemoteCheckAt || 0) > 300000)) {
          this.startRemoteListener();
          this.fetchLatestFromCloud(false);
        }
      }, 30000);

      if (this._pollEventsBound) return;
      this._pollEventsBound = true;
      const wake = () => {
        if (!this.spaceId || !this.pin) return;
        // Visibility and focus often fire together. Share one check on return.
        const now = Date.now();
        if (this._lastWakeSyncAt !== undefined && now - this._lastWakeSyncAt < 1000) return;
        this._lastWakeSyncAt = now;
        this.retryAfter = 0;
        this.startRemoteListener();
        this.fetchLatestFromCloud(false);
      };
      window.addEventListener('online', wake);

      // 모바일 앱/화면 복귀 시 즉시 동기화
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) wake();
        else this.stopRemoteListener();
      });
      window.addEventListener('focus', () => {
        if (!document.hidden) wake();
      });
    }

    async saveFileToVault(fileObj, note = '', folder = 'personal') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const fileItem = {
              id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              name: fileObj.name,
              size: fileObj.size,
              type: fileObj.type,
              note: note || '',
              folder: folder || 'personal',
              createdAt: Date.now(),
              dataUrl: e.target.result
            };

            const files = await this.getAllVaultFiles();
            files.unshift(fileItem);
            await this.saveVaultFiles(files);
            await this.pushTasksToCloud(true);
            resolve(fileItem);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });
    }

    async getAllVaultFiles(forceRefresh = false, strict = false) {
      if (!forceRefresh && Array.isArray(this._vaultFilesCache)) {
        return this._vaultFilesCache;
      }
      try {
        const idbFiles = await getVault().getAll(strict);
        if (strict) return idbFiles; // Never start legacy migration during a sync read.
        // Return indexedDB files directly (if empty, it means 0 files)
        if (Array.isArray(idbFiles) && idbFiles.length > 0) {
          this._vaultFilesCache = idbFiles;
          return idbFiles;
        }

        // Legacy 1-time migration only if never migrated
        const migratedKey = 'todolist_jy_vault_migrated_v2';
        if (!localStorage.getItem(migratedKey)) {
          localStorage.setItem(migratedKey, 'true');
          const raw = localStorage.getItem('todolist_jy_vault_files');
          const lsFiles = raw ? JSON.parse(raw) : [];
          if (lsFiles.length > 0) {
            await getVault().saveAll(lsFiles);
            this._vaultFilesCache = lsFiles;
            return lsFiles;
          }
        }
        this._vaultFilesCache = [];
        return [];
      } catch (e) {
        console.warn('getAllVaultFiles error:', e);
        if (strict) throw e;
        return this._vaultFilesCache || [];
      }
    }

    async addVaultFiles(newItems) {
      if (!Array.isArray(newItems) || !newItems.length) return [];
      try {
        await getVault().addFiles(newItems);
        const all = await this.getAllVaultFiles(true);
        await this.saveVaultFiles(all);
        this.pushTasksToCloud(true);
        return all;
      } catch (e) {
        console.error('addVaultFiles error:', e);
        return [];
      }
    }

    async saveVaultFiles(files, strict = false, canSave = null) {
      try {
        const saved = await getVault().saveAll(files || [], canSave);
        if (saved !== true) throw new Error('Vault save failed');
        this._vaultFilesCache = Array.isArray(files) ? files.slice() : [];
        const metaOnly = (files || []).map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          note: f.note,
          folder: f.folder || 'personal',
          createdAt: f.createdAt
        }));
        localStorage.setItem('todolist_jy_vault_meta', JSON.stringify(metaOnly));
        localStorage.setItem('todolist_jy_vault_files', JSON.stringify(metaOnly));
      } catch (e) {
        console.warn('saveVaultFiles error:', e);
        if (strict) throw e;
      }
    }

    async deleteVaultFile(fileId) {
      try {
        getStore().deletedItemIds.add(fileId);
        if (!getStore().saveLocalOnly()) return;
        await getVault().delete(fileId);
        if (this._vaultFilesCache) {
          this._vaultFilesCache = this._vaultFilesCache.filter(f => f && f.id !== fileId);
        }
        // Clean localStorage backups immediately
        try {
          const raw = localStorage.getItem('todolist_jy_vault_files');
          if (raw) {
            const list = JSON.parse(raw).filter(f => f && f.id !== fileId);
            localStorage.setItem('todolist_jy_vault_files', JSON.stringify(list));
          }
          const rawMeta = localStorage.getItem('todolist_jy_vault_meta');
          if (rawMeta) {
            const mList = JSON.parse(rawMeta).filter(f => f && f.id !== fileId);
            localStorage.setItem('todolist_jy_vault_meta', JSON.stringify(mList));
          }
        } catch (e) {}

        const remaining = await this.getAllVaultFiles(true);
        await this.saveVaultFiles(remaining);

        this.lastSyncedUpdatedAt = Date.now();
        this.pushTasksToCloud(true);
      } catch (e) {
        console.error('deleteVaultFile error:', e);
      }
    }

    async moveVaultFiles(fileIds, targetFolder) {
      if (!Array.isArray(fileIds) || !fileIds.length || !targetFolder) return 0;
      try {
        const files = await this.getAllVaultFiles();
        let count = 0;
        files.forEach(f => {
          if (fileIds.includes(f.id)) {
            f.folder = targetFolder;
            f.updatedAt = Date.now();
            count++;
          }
        });
        await this.saveVaultFiles(files);
        this.lastSyncedUpdatedAt = Date.now();
        this.pushTasksToCloud(true);
        return count;
      } catch (e) {
        console.error('moveVaultFiles error:', e);
        return 0;
      }
    }

    async deleteVaultFilesBatch(fileIds) {
      if (!Array.isArray(fileIds) || !fileIds.length) return 0;
      try {
        fileIds.forEach(id => getStore().deletedItemIds.add(id));
        if (!getStore().saveLocalOnly()) return 0;
        for (const fId of fileIds) {
          await getVault().delete(fId);
        }
        if (this._vaultFilesCache) {
          this._vaultFilesCache = this._vaultFilesCache.filter(f => f && !fileIds.includes(f.id));
        }
        // Clean localStorage backups
        try {
          const raw = localStorage.getItem('todolist_jy_vault_files');
          if (raw) {
            const list = JSON.parse(raw).filter(f => f && !fileIds.includes(f.id));
            localStorage.setItem('todolist_jy_vault_files', JSON.stringify(list));
          }
          const rawMeta = localStorage.getItem('todolist_jy_vault_meta');
          if (rawMeta) {
            const mList = JSON.parse(rawMeta).filter(f => f && !fileIds.includes(f.id));
            localStorage.setItem('todolist_jy_vault_meta', JSON.stringify(mList));
          }
        } catch (e) {}

        const remaining = await this.getAllVaultFiles(true);
        await this.saveVaultFiles(remaining);

        this.lastSyncedUpdatedAt = Date.now();
        this.pushTasksToCloud(true);
        return fileIds.length;
      } catch (e) {
        console.error('deleteVaultFilesBatch error:', e);
        return 0;
      }
    }
  }

    return CloudSyncManager;
  };
})(window);
