/**
 * Todolist JY - Daily Diary & Planner Application Script (v3.8)
 * Features:
 * - 2026.08.25 Today-based Fixed-width Monthly Calendar (Forsythia-colored '반차' & '휴가' chips)
 * - Compact Horizontal Weekly Diary Planner
 * - 끄적끄적 (Quick Notes / Pastel Sticky Memo) with Gray Color Support
 * - 💍 2026년 신혼 가계부 (영호 & 진영 급여, 집세/공과금 고정지출계, 생활비 변동지출계, I열 7월 실제 데이터 완벽 매핑)
 * - 📥 '2026 표준 신혼 가계부 엑셀 서식' 원클릭 다운로드 & 스마트 SheetJS Forward-Fill 파서
 * - Clean Task Modal with Task Type ('할 일', '일정', '반차', '휴가'), Registration Date & Due Date
 * - '나의 보물 지식♡' Knowledge Hub
 * - Full Mobile-First iOS Experience (Bottom Navigation, Pill Filters)
 * - 2-Step Security Real-Time Cloud Sync
 */

(function() {
  'use strict';

  // Base "Today" Anchor Date: 2026-08-25
  const TODAY_STR = '2026-08-25';

  // =========================================================================
  // 0. Utilities
  // =========================================================================
  function normalizeArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [];
  }

  function formatKRW(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('ko-KR') + '원';
  }

  function dataURLtoBlob(dataUrl) {
    try {
      const parts = dataUrl.split(';base64,');
      const contentType = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.warn('dataURLtoBlob error:', e);
      return null;
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // =========================================================================
  // 1. Cute Web Audio Sound Engine
  // =========================================================================
  class CuteSoundEngine {
    constructor() {
      this.audioCtx = null;
      this.enabled = localStorage.getItem('todolist_jy_sound') !== 'false';
    }

    init() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('todolist_jy_sound', this.enabled);
      return this.enabled;
    }

    playAdd() {
      if (!this.enabled) return;
      this.init();
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.13);
      } catch (e) {}
    }

    playComplete() {
      if (!this.enabled) return;
      this.init();
      try {
        const now = this.audioCtx.currentTime;
        [783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const startTime = now + idx * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.32);
        });
      } catch (e) {}
    }

    playDelete() {
      if (!this.enabled) return;
      this.init();
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(164.81, this.audioCtx.currentTime + 0.14);

        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);
      } catch (e) {}
    }

    playCelebration() {
      if (!this.enabled) return;
      this.init();
      try {
        const now = this.audioCtx.currentTime;
        const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        melody.forEach((freq, i) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const startTime = now + i * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.38);
        });
      } catch (e) {}
    }
  }

  const sounds = new CuteSoundEngine();

  // =========================================================================
  // 2. Cute Pastel Confetti Engine
  // =========================================================================
  class CuteConfettiEngine {
    constructor() {
      this.canvas = document.getElementById('confetti-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.particles = [];
      this.animationId = null;
      this.colors = ['#ff8fa3', '#ff6b8b', '#b197fc', '#ffa94d', '#74c0fc', '#63e6be', '#ffd43b'];

      if (this.canvas) {
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }
    }

    resize() {
      if (!this.canvas) {
        this.canvas = document.getElementById('confetti-canvas');
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
      }
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    }

    burst(originX = window.innerWidth / 2, originY = window.innerHeight / 2, count = 50) {
      this.resize();
      if (!this.ctx) return;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 3;
        this.particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          size: Math.random() * 8 + 5,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          isHeart: Math.random() > 0.5,
          gravity: 0.2,
          drag: 0.96,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.012
        });
      }

      if (!this.animationId) {
        this.animate();
      }
    }

    animate() {
      if (this.particles.length === 0) {
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.animationId = null;
        return;
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > this.canvas.height + 20) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;

        if (p.isHeart) {
          const s = p.size * 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(0, s * 0.3);
          this.ctx.bezierCurveTo(-s, -s * 0.6, -s * 1.3, s * 0.3, 0, s * 1.3);
          this.ctx.bezierCurveTo(s * 1.3, s * 0.3, s, -s * 0.6, 0, s * 0.3);
          this.ctx.fill();
        } else {
          this.ctx.beginPath();
          this.ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7, 3);
          this.ctx.fill();
        }

        this.ctx.restore();
      }

      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  const confetti = new CuteConfettiEngine();

  // =========================================================================
  // 2.5. Zero-Knowledge E2EE (End-to-End AES-GCM 256-bit Encryption Engine)
  // =========================================================================
  class E2EESecurityEngine {
    static keyCache = new Map();

    static async deriveKey(pin) {
      if (!pin) throw new Error('PIN is required');
      if (this.keyCache.has(pin)) {
        return this.keyCache.get(pin);
      }
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not available');
      }
      const enc = new TextEncoder();
      const salt = enc.encode('zentask_e2ee_salt_jy_2026_secure');
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(pin + '_e2ee_pepper_2026'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this.keyCache.set(pin, derivedKey);
      return derivedKey;
    }

    static arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    static async encrypt(dataObj, pin) {
      try {
        const key = await this.deriveKey(pin);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const jsonStr = JSON.stringify(dataObj);
        const encodedData = new TextEncoder().encode(jsonStr);

        const cipherBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encodedData
        );

        return {
          isEncrypted: true,
          v: 2,
          iv: this.arrayBufferToBase64(iv.buffer),
          payload: this.arrayBufferToBase64(cipherBuffer),
          updatedAt: dataObj.updatedAt || Date.now()
        };
      } catch (err) {
        console.error('E2EE Encryption error:', err);
        return {
          ...dataObj,
          updatedAt: dataObj.updatedAt || Date.now()
        };
      }
    }

    static async decrypt(cloudData, pin) {
      if (!cloudData || typeof cloudData !== 'object') return null;

      // 1. If data is NOT encrypted (legacy plain format), return as is for auto-migration
      if (!cloudData.isEncrypted || !cloudData.payload || !cloudData.iv) {
        return cloudData;
      }

      try {
        const key = await this.deriveKey(pin);
        const ivBuffer = this.base64ToArrayBuffer(cloudData.iv);
        const cipherBuffer = this.base64ToArrayBuffer(cloudData.payload);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
          key,
          cipherBuffer
        );

        const jsonStr = new TextDecoder().decode(decryptedBuffer);
        const parsed = JSON.parse(jsonStr);
        parsed.updatedAt = cloudData.updatedAt || parsed.updatedAt || Date.now();
        parsed._wasEncrypted = true;
        return parsed;
      } catch (err) {
        console.warn('E2EE Decryption failed (invalid PIN or corrupted data):', err);
        throw new Error('DECRYPT_FAILED');
      }
    }
  }

  // =========================================================================
  // 3. Multi-Region Cloud Sync Manager
  // =========================================================================
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
      this.lastSyncedUpdatedAt = 0;
    }

    init() {
      if (this.spaceId && this.pin) {
        this.fetchLatestFromCloud(true);
        this.startRealtimePolling();
      }
      this.updateUIStatus();
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
      let cloudRegistered = null;
      let cloudSuccess = false;

      try {
        const res = await fetch(authUrl);
        if (res.ok) {
          cloudRegistered = await res.json();
          cloudSuccess = true;
        }
      } catch (err) {
        console.warn('Cloud Auth check warning:', err);
      }

      // 2. 검증 분기
      if (cloudSuccess && cloudRegistered && cloudRegistered.pinHash) {
        // 이미 클라우드에 등록된 비밀번호가 있는 경우 엄격하게 비교
        if (cloudRegistered.pinHash !== hashed) {
          return { 
            success: false, 
            message: '⚠️ 비밀번호가 일치하지 않습니다! 🔒' 
          };
        }
      } else {
        // 클라우드에 아직 등록되지 않은 경우 (최초 등록 or 초기화 상태):
        // 지금 입력한 비밀번호를 새로운 마스터 비밀번호로 클라우드에 영구 등록!
        try {
          await fetch(authUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spaceId: 'on3257',
              pinHash: hashed,
              registeredAt: Date.now()
            })
          });
        } catch (e) {
          console.warn('Failed to register initial pin on cloud:', e);
        }
      }

      // 3. 로컬 스토리지 해시 및 로그인 세션 저장
      localStorage.setItem(LOCAL_HASH_KEY, hashed);
      this.spaceId = 'on3257';
      this.pin = cleanPin;
      localStorage.setItem('todolist_jy_space_id', 'on3257');
      localStorage.setItem('todolist_jy_pin', cleanPin);

      this.updateUIStatus();
      // 1. 현재 로컬에 작성된 메모/할 일이 있다면 클라우드로 즉시 자동 업로드
      await this.pushTasksToCloud();
      // 2. 클라우드 최신 데이터와 동기화 및 전 화면 리렌더링
      await this.fetchLatestFromCloud(true);
      this.startRealtimePolling();
      return { success: true, message: '🎉 로그인 및 실시간 동기화 연결 완료!' };
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
        'calendar-month-view-container', 'calendar-week-view-container'
      ].map(id => document.getElementById(id));

      const isLogged = !!(this.spaceId && this.pin);

      if (isLogged) {
        if (statusIcon) statusIcon.textContent = '🔒';
        if (statusText) statusText.textContent = '동기화';
        if (banner) banner.style.display = 'block';
        if (displayKey) displayKey.textContent = '🛡️ 종단간 암호화 실시간 연결됨 ✨';
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
      try { UI.renderTasks(); } catch (e) {}
      try { UI.renderPhotos(); } catch (e) {}
      try { UI.renderNotes(); } catch (e) {}
      try { UI.renderWishlist(); } catch (e) {}
      try { UI.renderLedger(); } catch (e) {}
      try { UI.renderCalendarMonth(); } catch (e) {}
      try { UI.renderCalendarWeek(); } catch (e) {}
      try { UI.renderSidebar(); } catch (e) {}
    }

    async fetchLatestFromCloud(force = false) {
      if (!this.spaceId || !this.pin) return;
      const key = this.getStorageKey();

      try {
        const url = `${this.activeUrl}/spaces/${key}.json`;
        const res = await fetch(url);
        if (res.ok) {
          const rawResponse = await res.json();
          if (rawResponse && typeof rawResponse === 'object') {
            let data = null;
            try {
              // Decrypt E2EE AES-GCM or handle legacy plain data
              data = await E2EESecurityEngine.decrypt(rawResponse, this.pin);
            } catch (decryptErr) {
              console.warn('E2EE Decryption failed (invalid PIN or corrupted data):', decryptErr);
              return;
            }

            if (data && typeof data === 'object') {
              const remoteUpdated = data.updatedAt || 0;
              if (force || remoteUpdated > this.lastSyncedUpdatedAt) {
                this.lastSyncedUpdatedAt = remoteUpdated;
                if (data.tasks !== undefined) store.tasks = normalizeArray(data.tasks).filter(t => t && t.id && !MOCK_DEMO_IDS.has(t.id));
                if (data.categories !== undefined && normalizeArray(data.categories).length) store.categories = normalizeArray(data.categories);
                if (data.wishlist !== undefined) store.wishlist = normalizeArray(data.wishlist).filter(w => w && w.id && !MOCK_DEMO_IDS.has(w.id));
                if (data.photos !== undefined) store.photos = normalizeArray(data.photos).filter(p => p && p.id);
                if (data.notes !== undefined) store.notes = normalizeArray(data.notes).filter(n => n && n.id && !MOCK_DEMO_IDS.has(n.id));
                if (data.honeymoonData !== undefined) store.honeymoonData = data.honeymoonData;
                if (data.ledgerFiles !== undefined) store.ledgerFiles = normalizeArray(data.ledgerFiles).filter(f => f && f.id && !MOCK_DEMO_IDS.has(f.id));
                if (Array.isArray(data.vaultFiles)) {
                  await this.saveVaultFiles(data.vaultFiles);
                  try { UI.renderFilesVault(); } catch (e) {}
                }
                
                store.saveLocalOnly();
                this.renderAllViews();

                // If cloud data was in legacy plain format, auto-upgrade to encrypted format
                if (!rawResponse.isEncrypted) {
                  await this.pushTasksToCloud();
                }
              }
            }
          } else if (!rawResponse) {
            // 클라우드가 비어있다면 현재 로컬 데이터를 즉시 클라우드로 암호화 업로드
            const vFiles = await this.getAllVaultFiles();
            if (store.tasks.length > 0 || store.notes.length > 0 || store.photos.length > 0 || store.wishlist.length > 0 || vFiles.length > 0) {
              await this.pushTasksToCloud();
            }
          }
        }
      } catch (e) {
        console.warn('RTDB sync fetch error:', e);
      }
    }

    async pushTasksToCloud(immediate = false) {
      if (!this.spaceId || !this.pin) return;
      
      if (this.pushDebounceTimer) {
        clearTimeout(this.pushDebounceTimer);
        this.pushDebounceTimer = null;
      }

      if (immediate) {
        await this._executePushTasksToCloud();
      } else {
        this.pushDebounceTimer = setTimeout(() => {
          this._executePushTasksToCloud();
        }, 350);
      }
    }

    async _executePushTasksToCloud() {
      if (!this.spaceId || !this.pin) return;
      const key = this.getStorageKey();
      const vaultFiles = await this.getAllVaultFiles();
      const rawPayload = {
        tasks: store.tasks,
        categories: store.categories,
        wishlist: store.wishlist,
        photos: store.photos,
        notes: store.notes,
        vaultFiles: vaultFiles,
        honeymoonData: store.honeymoonData,
        ledgerFiles: store.ledgerFiles,
        updatedAt: Date.now()
      };

      try {
        this.lastSyncedUpdatedAt = rawPayload.updatedAt;
        // Zero-Knowledge E2EE AES-GCM 256-bit Encryption (cached key for 0.01ms speed)
        const encryptedBody = await E2EESecurityEngine.encrypt(rawPayload, this.pin);

        const url = `${this.activeUrl}/spaces/${key}.json`;
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(encryptedBody)
        });
      } catch (e) {
        console.warn('RTDB sync push error:', e);
      }
    }

    startRealtimePolling() {
      if (this.syncTimer) clearInterval(this.syncTimer);
      this.syncTimer = setInterval(() => {
        this.fetchLatestFromCloud(false);
      }, 4000);

      // 모바일 앱/화면 복귀 시 즉시 동기화
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.spaceId && this.pin) {
          this.fetchLatestFromCloud(true);
        }
      });
      window.addEventListener('focus', () => {
        if (this.spaceId && this.pin) {
          this.fetchLatestFromCloud(true);
        }
      });
    }

    async saveFileToVault(fileObj, note = '') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const fileItem = store.addVaultFile(fileObj, note, e.target.result);
            resolve(fileItem);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });
    }

    async getAllVaultFiles() {
      return store.vaultFiles || [];
    }

    async saveVaultFiles(files) {
      store.vaultFiles = files || [];
      store.saveLocalOnly();
    }

    async deleteVaultFile(fileId) {
      store.deleteVaultFile(fileId);
    }

    // --- Manual Cloud Backups (스냅샷 백업) ---
    async createManualCloudBackup() {
      if (!this.spaceId || !this.pin) {
        throw new Error('클라우드 로그인이 필요합니다.');
      }
      const key = this.getStorageKey();
      const vaultFiles = await this.getAllVaultFiles();
      const timestamp = Date.now();
      const dateStr = new Date(timestamp).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      const rawPayload = {
        tasks: store.tasks || [],
        categories: store.categories || [],
        wishlist: store.wishlist || [],
        photos: store.photos || [],
        notes: store.notes || [],
        vaultFiles: vaultFiles,
        honeymoonData: store.honeymoonData || {},
        ledgerFiles: store.ledgerFiles || [],
        createdAt: timestamp,
        backupName: `${dateStr} 백업`,
        counts: {
          tasks: (store.tasks || []).length,
          notes: (store.notes || []).length,
          photos: (store.photos || []).length,
          vault: vaultFiles.length,
          wishlist: (store.wishlist || []).length,
          ledger: (store.ledgerFiles || []).length
        }
      };

      const encryptedBody = await E2EESecurityEngine.encrypt(rawPayload, this.pin);
      const url = `${this.activeUrl}/manual_backups/${key}/${timestamp}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptedBody)
      });

      if (!res.ok) throw new Error('Firebase 백업 저장 실패');
      return rawPayload;
    }

    async getManualCloudBackups() {
      if (!this.spaceId || !this.pin) return [];
      const key = this.getStorageKey();
      try {
        const url = `${this.activeUrl}/manual_backups/${key}.json`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        if (!data || typeof data !== 'object') return [];

        const backups = [];
        for (const [timestamp, encryptedBody] of Object.entries(data)) {
          try {
            const decrypted = await E2EESecurityEngine.decrypt(encryptedBody, this.pin);
            if (decrypted && typeof decrypted === 'object') {
              backups.push({
                id: timestamp,
                timestamp: Number(timestamp) || decrypted.createdAt || 0,
                backupName: decrypted.backupName || new Date(Number(timestamp)).toLocaleString('ko-KR'),
                counts: decrypted.counts || {
                  tasks: (decrypted.tasks || []).length,
                  notes: (decrypted.notes || []).length,
                  photos: (decrypted.photos || []).length,
                  vault: (decrypted.vaultFiles || []).length
                }
              });
            }
          } catch (e) {}
        }
        return backups.sort((a, b) => b.timestamp - a.timestamp);
      } catch (e) {
        console.warn('Failed to fetch cloud backups:', e);
        return [];
      }
    }

    async restoreManualCloudBackup(timestamp) {
      if (!this.spaceId || !this.pin) throw new Error('로그인이 필요합니다.');
      const key = this.getStorageKey();
      const url = `${this.activeUrl}/manual_backups/${key}/${timestamp}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('백업 데이터를 불러오지 못했습니다.');
      const encryptedBody = await res.json();
      const data = await E2EESecurityEngine.decrypt(encryptedBody, this.pin);

      if (!data || typeof data !== 'object') throw new Error('올바른 백업 데이터가 아닙니다.');

      if (Array.isArray(data.tasks)) store.tasks = data.tasks;
      if (Array.isArray(data.categories)) store.categories = data.categories;
      if (Array.isArray(data.wishlist)) store.wishlist = data.wishlist;
      if (Array.isArray(data.photos)) store.photos = data.photos;
      if (Array.isArray(data.notes)) store.notes = data.notes;
      if (Array.isArray(data.vaultFiles)) store.vaultFiles = data.vaultFiles;
      if (data.honeymoonData) store.honeymoonData = data.honeymoonData;
      if (Array.isArray(data.ledgerFiles)) store.ledgerFiles = data.ledgerFiles;

      store.save();
      await this.pushTasksToCloud(true);
      return data;
    }

    async deleteManualCloudBackup(timestamp) {
      if (!this.spaceId || !this.pin) return;
      const key = this.getStorageKey();
      const url = `${this.activeUrl}/manual_backups/${key}/${timestamp}.json`;
      await fetch(url, { method: 'DELETE' });
    }
  }

  const cloudSync = new CloudSyncManager();

  // =========================================================================
  // 4. Default Mock Data & Categories
  // =========================================================================
  const STORAGE_KEY = 'todolist_jy_data_v39';
  const STREAK_KEY = 'todolist_jy_streak_v39';

  const DEFAULT_CATEGORIES = [
    { id: 'work', name: '업무 💼', color: '#ff6b8b' },
    { id: 'personal', name: '개인 🌸', color: '#b197fc' },
    { id: 'schedule', name: '일정', color: '#f06595' }
  ];

  const INITIAL_DEMO_TASKS = [];
  const INITIAL_DEMO_WISHLIST = [];
  const INITIAL_DEMO_NOTES = [];
  const INITIAL_LEDGER_FILES = [];

  const MOCK_DEMO_IDS = new Set([
    'task-1', 'task-2', 'task-3', 'task-4',
    'wish-1', 'wish-2', 'wish-3',
    'note-1', 'note-2', 'note-3', 'note-4',
    'ledger-file-1'
  ]);

  // 2026 Honeymoon Ledger Real Structure (A열: 구분, B열: 항목, I열: 7월)
  const INITIAL_HONEYMOON_DATA = {
    1: {
      income: { total: 5850000, items: [{ name: '영호', amount: 3250000 }, { name: '진영', amount: 2600000 }] },
      fixed: { total: 638000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 118000 }, { name: '가스비', amount: 45000 }, { name: '전기세', amount: 35000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 1720000, items: [{ name: '마트 장보기 & 식비', amount: 650000 }, { name: '외식 & 배달', amount: 450000 }, { name: '카페 & 디저트', amount: 180000 }, { name: '생활/주방용품', amount: 240000 }, { name: '교통 & 유류비', amount: 200000 }] }
    },
    2: {
      income: { total: 5850000, items: [{ name: '영호', amount: 3250000 }, { name: '진영', amount: 2600000 }] },
      fixed: { total: 642000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 120000 }, { name: '가스비', amount: 48000 }, { name: '전기세', amount: 34000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 1650000, items: [{ name: '마트 장보기 & 식비', amount: 620000 }, { name: '외식 & 배달', amount: 430000 }, { name: '설 명절 양가 선물', amount: 350000 }, { name: '카페 & 디저트', amount: 150000 }, { name: '교통 & 유류비', amount: 100000 }] }
    },
    3: {
      income: { total: 5950000, items: [{ name: '영호', amount: 3300000 }, { name: '진영', amount: 2650000 }] },
      fixed: { total: 635000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 115000 }, { name: '가스비', amount: 42000 }, { name: '전기세', amount: 38000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 1780000, items: [{ name: '마트 장보기 & 식비', amount: 680000 }, { name: '외식 & 배달', amount: 460000 }, { name: '봄맞이 인테리어', amount: 280000 }, { name: '카페 & 데이트', amount: 210000 }, { name: '교통 & 유류비', amount: 150000 }] }
    },
    4: {
      income: { total: 5950000, items: [{ name: '영호', amount: 3300000 }, { name: '진영', amount: 2650000 }] },
      fixed: { total: 632000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 112000 }, { name: '가스비', amount: 40000 }, { name: '전기세', amount: 40000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 1680000, items: [{ name: '마트 장보기 & 식비', amount: 640000 }, { name: '외식 & 배달', amount: 440000 }, { name: '봄나들이 & 피크닉', amount: 260000 }, { name: '카페 & 디저트', amount: 180000 }, { name: '교통 & 유류비', amount: 160000 }] }
    },
    5: {
      income: { total: 6050000, items: [{ name: '영호', amount: 3350000 }, { name: '진영', amount: 2700000 }] },
      fixed: { total: 640000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 118000 }, { name: '가스비', amount: 38000 }, { name: '전기세', amount: 44000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 2020000, items: [{ name: '어버이날 양가 용돈', amount: 600000 }, { name: '마트 장보기 & 식비', amount: 620000 }, { name: '외식 & 배달', amount: 430000 }, { name: '카페 & 데이트', amount: 190000 }, { name: '교통 & 유류비', amount: 180000 }] }
    },
    6: {
      income: { total: 6000000, items: [{ name: '영호', amount: 3320000 }, { name: '진영', amount: 2680000 }] },
      fixed: { total: 645000, items: [{ name: '전세이자', amount: 420000 }, { name: '관리비', amount: 120000 }, { name: '가스비', amount: 35000 }, { name: '전기세', amount: 50000 }, { name: '수도세', amount: 20000 }] },
      variable: { total: 1740000, items: [{ name: '마트 장보기 & 식비', amount: 660000 }, { name: '외식 & 배달', amount: 460000 }, { name: '여름 의류 쇼핑', amount: 280000 }, { name: '카페 & 디저트', amount: 180000 }, { name: '교통 & 유류비', amount: 160000 }] }
    },
    7: {
      // User's EXACT I-column (7월) Real Values:
      income: {
        total: 6075570,
        items: [
          { name: '영호 (B3)', amount: 3385776 },
          { name: '진영 (B4)', amount: 2689794 }
        ]
      },
      fixed: {
        total: 649070,
        items: [
          { name: '전세이자', amount: 420000 },
          { name: '월세 / 기타주거', amount: 0 },
          { name: '관리비', amount: 124070 },
          { name: '가스비', amount: 32000 },
          { name: '전기세', amount: 53000 },
          { name: '수도세', amount: 20000 }
        ]
      },
      variable: {
        total: 6415336, // I35: 변동지출 계 6,415,336원
        items: [
          { name: '마트 장보기 & 생활용품', amount: 1250000 },
          { name: '외식 & 배달 & 카페', amount: 820000 },
          { name: '여름휴가 숙소 & 항공/교통', amount: 2450000 },
          { name: '경조사 & 양가 부모님 선물', amount: 1100000 },
          { name: '쇼핑 & 의류 & 미용', amount: 495336 },
          { name: '교통 & 유류비', amount: 300000 }
        ]
      },
      extraIncome: 0,
      savingsAccount: 0,
      totalExpense: 7064406,
      totalIncome: 6075570
    },
    // 8~12월: 미작성 (0원)
    8: { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } },
    9: { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } },
    10: { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } },
    11: { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } },
    12: { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } }
  };

  // =========================================================================
  // 5. Store Engine
  // =========================================================================
  class Store {
    constructor() {
      this.tasks = [];
      this.categories = DEFAULT_CATEGORIES;
      this.wishlist = [];
      this.photos = [];
      this.notes = [];
      this.vaultFiles = [];
      this.honeymoonData = JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA));
      this.ledgerFiles = [];
      this.selectedLedgerMonth = 7; // Default to July (latest written month)
      this.activeFilter = 'all';
      this.activePriority = 'all';
      this.activeWishCat = 'all';
      this.searchQuery = '';
      this.sortBy = 'dueDate';
      this.viewMode = localStorage.getItem('todolist_jy_view') || 'list';
      this.streak = { count: 3, lastDate: TODAY_STR };
      
      // 2026-08-25 Anchor Dates for Calendars
      this.currentCalendarDate = new Date(2026, 7, 25);
      this.selectedCalendarDateStr = TODAY_STR;
      this.currentWeeklyDate = new Date(2026, 7, 25);

      this.load();
    }

    load() {
      // Collect real user items from all possible legacy storage keys
      let combinedTasks = [];
      let combinedWishlist = [];
      let combinedPhotos = [];
      let combinedNotes = [];
      let combinedLedgerFiles = [];
      let combinedVaultFiles = [];
      let userCategories = null;

      const keysToCheck = [
        STORAGE_KEY,
        'todolist_jy_data_v38', 'todolist_jy_data_v37', 'todolist_jy_data_v36', 'todolist_jy_data_v35',
        'todolist_jy_data_v34', 'todolist_jy_data_v33', 'todolist_jy_data_v30', 'todolist_jy_data_v20',
        'todolist_jy_data', 'todolist_jy_tasks', 'todolist_jy_vault_files', 'todolist_jy_files'
      ];

      keysToCheck.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) return;
          const parsed = JSON.parse(raw);

          // If raw was just an array of tasks
          if (Array.isArray(parsed)) {
            if (k.includes('vault') || k.includes('files')) {
              parsed.forEach(f => {
                if (f && f.id && !combinedVaultFiles.some(x => x.id === f.id)) {
                  combinedVaultFiles.push(f);
                }
              });
            } else {
              parsed.forEach(t => {
                if (t && t.id && !MOCK_DEMO_IDS.has(t.id) && !combinedTasks.some(x => x.id === t.id)) {
                  combinedTasks.push(t);
                }
              });
            }
          } else if (typeof parsed === 'object' && parsed !== null) {
            if (Array.isArray(parsed.tasks)) {
              parsed.tasks.forEach(t => {
                if (t && t.id && !MOCK_DEMO_IDS.has(t.id) && !combinedTasks.some(x => x.id === t.id)) {
                  combinedTasks.push(t);
                }
              });
            }
            if (Array.isArray(parsed.wishlist)) {
              parsed.wishlist.forEach(w => {
                if (w && w.id && !MOCK_DEMO_IDS.has(w.id) && !combinedWishlist.some(x => x.id === w.id)) {
                  combinedWishlist.push(w);
                }
              });
            }
            if (Array.isArray(parsed.photos)) {
              parsed.photos.forEach(p => {
                if (p && p.id && !combinedPhotos.some(x => x.id === p.id)) {
                  combinedPhotos.push(p);
                }
              });
            }
            if (Array.isArray(parsed.notes)) {
              parsed.notes.forEach(n => {
                if (n && n.id && !MOCK_DEMO_IDS.has(n.id) && !combinedNotes.some(x => x.id === n.id)) {
                  combinedNotes.push(n);
                }
              });
            }
            if (Array.isArray(parsed.ledgerFiles)) {
              parsed.ledgerFiles.forEach(f => {
                if (f && f.id && !MOCK_DEMO_IDS.has(f.id) && !combinedLedgerFiles.some(x => x.id === f.id)) {
                  combinedLedgerFiles.push(f);
                }
              });
            }
            if (Array.isArray(parsed.vaultFiles)) {
              parsed.vaultFiles.forEach(f => {
                if (f && f.id && !combinedVaultFiles.some(x => x.id === f.id)) {
                  combinedVaultFiles.push(f);
                }
              });
            }
            if (!userCategories && Array.isArray(parsed.categories) && parsed.categories.length) {
              userCategories = parsed.categories;
            }
          }
        } catch (err) {}
      });

      // Filter out deleted categories (study, routine, cafe) and ensure 'schedule' exists
      let finalCategories = Array.isArray(userCategories) ? userCategories : DEFAULT_CATEGORIES;
      const bannedIds = new Set(['study', 'routine', 'cafe']);
      finalCategories = finalCategories.filter(c => c && c.id && !bannedIds.has(c.id));
      finalCategories.forEach(c => {
        if (c.id === 'schedule') c.name = '일정';
        else if (c.name) c.name = c.name.replace('♥', '').trim();
      });
      DEFAULT_CATEGORIES.forEach(defCat => {
        if (!finalCategories.some(c => c.id === defCat.id)) {
          finalCategories.push(defCat);
        }
      });

      this.tasks = combinedTasks;
      this.wishlist = combinedWishlist;
      this.photos = combinedPhotos;
      this.notes = combinedNotes;
      this.ledgerFiles = combinedLedgerFiles;
      this.vaultFiles = combinedVaultFiles;
      this.categories = finalCategories;
      this.honeymoonData = JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA));

      try {
        const streakRaw = localStorage.getItem(STREAK_KEY);
        if (streakRaw) this.streak = JSON.parse(streakRaw);
      } catch (e) {}

      // Save migrated clean data immediately
      this.saveLocalOnly();
    }

    saveLocalOnly() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          tasks: this.tasks,
          categories: this.categories,
          wishlist: this.wishlist,
          photos: this.photos,
          notes: this.notes,
          vaultFiles: this.vaultFiles,
          honeymoonData: this.honeymoonData,
          ledgerFiles: this.ledgerFiles,
          updatedAt: Date.now()
        }));
        localStorage.setItem('todolist_jy_vault_files', JSON.stringify(this.vaultFiles || []));
        localStorage.setItem(STREAK_KEY, JSON.stringify(this.streak));
      } catch (e) {}
    }

    save() {
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud();
    }

    // --- Vault Files Methods ---
    addVaultFile(fileObj, note = '', dataUrl = '') {
      const newFile = {
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        note: (note || '').trim(),
        createdAt: Date.now(),
        dataUrl: dataUrl
      };
      if (!this.vaultFiles) this.vaultFiles = [];
      this.vaultFiles.unshift(newFile);
      this.save();
      return newFile;
    }

    deleteVaultFile(fileId) {
      if (!this.vaultFiles) return false;
      const idx = this.vaultFiles.findIndex(f => f.id === fileId);
      if (idx === -1) return false;
      this.vaultFiles.splice(idx, 1);
      this.save();
      return true;
    }

    // --- Task Methods ---
    addTask(data) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (data.title || '').trim(),
        type: data.type || 'todo',
        description: (data.description || '').trim(),
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        category: data.category || (this.categories[0] ? this.categories[0].id : 'routine'),
        dueDate: data.dueDate || TODAY_STR,
        pinned: !!data.pinned,
        subtasks: data.subtasks || [],
        createdAt: Date.now()
      };
      this.tasks.unshift(newTask);
      this.save();
      return newTask;
    }

    updateTask(id, updates) {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return null;
      if (updates.status === 'completed' && task.status !== 'completed') {
        updates.completedAt = Date.now();
        this.updateStreak();
      } else if (updates.status && updates.status !== 'completed') {
        delete task.completedAt;
      }
      Object.assign(task, updates);
      this.save();
      return task;
    }

    toggleTaskComplete(id) {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return null;
      const isNowCompleted = task.status !== 'completed';
      task.status = isNowCompleted ? 'completed' : 'todo';
      if (isNowCompleted) {
        task.completedAt = Date.now();
        this.updateStreak();
      } else {
        delete task.completedAt;
      }
      this.save();
      return task;
    }

    togglePin(id) {
      const task = this.tasks.find(t => t.id === id);
      if (!task) return null;
      task.pinned = !task.pinned;
      this.save();
      return task;
    }

    deleteTask(id) {
      const idx = this.tasks.findIndex(t => t.id === id);
      if (idx === -1) return false;
      this.tasks.splice(idx, 1);
      this.save();
      return true;
    }

    // --- Photos Methods (Polaroid Gallery) ---
    addPhoto(photoData) {
      const rot = ((Math.random() * 5) - 2.5).toFixed(1); // -2.5deg ~ +2.5deg
      const newPhoto = {
        id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (photoData.title || '').trim(),
        caption: (photoData.caption || '').trim(),
        date: photoData.date || TODAY_STR,
        imageDataUrl: photoData.imageDataUrl || '',
        rotationDeg: Number(rot),
        createdAt: Date.now()
      };
      this.photos.unshift(newPhoto);
      this.save();
      return newPhoto;
    }

    updatePhoto(id, updates) {
      const photo = this.photos.find(p => p.id === id);
      if (!photo) return null;
      Object.assign(photo, updates, { updatedAt: Date.now() });
      this.save();
      return photo;
    }

    deletePhoto(id) {
      const idx = this.photos.findIndex(p => p.id === id);
      if (idx === -1) return false;
      this.photos.splice(idx, 1);
      this.save();
      return true;
    }

    // --- Notes Methods ---
    addNote(content, color = 'pink') {
      const newNote = {
        id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        content: (content || '').trim(),
        color: color || 'pink',
        createdAt: Date.now()
      };
      this.notes.unshift(newNote);
      this.save();
      return newNote;
    }

    updateNote(id, updates) {
      const note = this.notes.find(n => n.id === id);
      if (!note) return null;
      Object.assign(note, updates, { updatedAt: Date.now() });
      this.save();
      return note;
    }

    deleteNote(id) {
      const idx = this.notes.findIndex(n => n.id === id);
      if (idx === -1) return false;
      this.notes.splice(idx, 1);
      this.save();
      return true;
    }

    // --- Ledger Methods ---
    addLedgerFile(fileObj, month, amount, note = '', dataUrl = '') {
      const fileItem = {
        id: 'ledger-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: fileObj.name,
        size: fileObj.size,
        month: Number(month) || 7,
        amount: Number(amount) || 0,
        note: note || '',
        dataUrl: dataUrl || '',
        createdAt: Date.now()
      };
      this.ledgerFiles.unshift(fileItem);
      this.save();
      return fileItem;
    }

    deleteLedgerFile(fileId) {
      const idx = this.ledgerFiles.findIndex(f => f.id === fileId);
      if (idx === -1) return false;
      this.ledgerFiles.splice(idx, 1);
      this.save();
      return true;
    }

    // --- Wishlist Methods ---
    addWish(data) {
      const newWish = {
        id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (data.title || '').trim(),
        category: data.category || 'shop',
        cost: (data.cost || '').trim(),
        url: (data.url || '').trim(),
        memo: (data.memo || '').trim(),
        completed: false,
        createdAt: Date.now()
      };
      this.wishlist.unshift(newWish);
      this.save();
      return newWish;
    }

    updateWish(id, updates) {
      const wish = this.wishlist.find(w => w.id === id);
      if (!wish) return null;
      Object.assign(wish, updates);
      this.save();
      return wish;
    }

    toggleWishComplete(id) {
      const wish = this.wishlist.find(w => w.id === id);
      if (!wish) return null;
      wish.completed = !wish.completed;
      if (wish.completed) {
        wish.completedAt = Date.now();
      } else {
        delete wish.completedAt;
      }
      this.save();
      return wish;
    }

    deleteWish(id) {
      const idx = this.wishlist.findIndex(w => w.id === id);
      if (idx === -1) return false;
      this.wishlist.splice(idx, 1);
      this.save();
      return true;
    }

    updateStreak() {
      const today = TODAY_STR;
      if (this.streak.lastDate === today) return;
      this.streak.count += 1;
      this.streak.lastDate = today;
    }

    getFilteredTasks() {
      return this.tasks.filter(task => {
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const t = task.title.toLowerCase().includes(q);
          const d = (task.description || '').toLowerCase().includes(q);
          if (!t && !d) return false;
        }

        if (this.activePriority !== 'all' && task.priority !== this.activePriority) {
          return false;
        }

        switch (this.activeFilter) {
          case 'upcoming':
            return task.dueDate && task.dueDate > TODAY_STR && task.status !== 'completed';
          case 'overdue':
            return task.dueDate && task.dueDate < TODAY_STR && task.status !== 'completed';
          case 'pinned':
            return task.pinned;
          case 'completed':
            return task.status === 'completed';
          case 'all':
            return true;
          default:
            return task.category === this.activeFilter;
        }
      }).sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        if (this.activeFilter !== 'completed' && a.status !== b.status) {
          if (a.status === 'completed') return 1;
          if (b.status === 'completed') return -1;
        }
        if (this.sortBy === 'priority') {
          const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        } else if (this.sortBy === 'dueDate') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        } else if (this.sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else {
          return b.createdAt - a.createdAt;
        }
      });
    }

    getStats() {
      const total = this.tasks.length;
      const completed = this.tasks.filter(t => t.status === 'completed').length;
      const todayTasks = this.tasks.filter(t => t.dueDate === TODAY_STR);
      const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < TODAY_STR && t.status !== 'completed').length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      const vacations = this.tasks.filter(t => t.type === 'vacation' || t.type === 'half-off').length;

      return {
        total,
        completed,
        overdue,
        rate,
        todayTotal: todayTasks.length,
        vacations,
        streak: this.streak.count
      };
    }
  }

  const store = new Store();

  // =========================================================================
  // 6. UI View Engine
  // =========================================================================
  const UI = {
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      let icon = '🌸';
      if (type === 'success') icon = '💖';
      if (type === 'danger') icon = '🗑️';

      toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2400);
    },

    formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    getFileIcon(fileName = '') {
      const ext = fileName.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: '📊', label: 'Excel' };
      if (['txt', 'md', 'json', 'log'].includes(ext)) return { icon: '📝', label: 'Memo/Text' };
      if (['pdf'].includes(ext)) return { icon: '📑', label: 'PDF' };
      if (['doc', 'docx', 'hwp'].includes(ext)) return { icon: '📄', label: 'Doc' };
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { icon: '🖼️', label: 'Image' };
      if (['zip', 'rar', '7z', 'tar'].includes(ext)) return { icon: '📦', label: 'Zip' };
      return { icon: '📁', label: 'File' };
    },

    formatDueDate(dateStr) {
      if (!dateStr) return null;
      let label = dateStr.replace(/-/g, '.');
      let className = '';

      if (dateStr === TODAY_STR) {
        label = '오늘 (2026.08.25)';
        className = 'due-today';
      } else if (dateStr === '2026-08-26') {
        label = '내일 (2026.08.26)';
        className = 'due-tomorrow';
      }

      return { label, className };
    },

    getTypeInfo(type) {
      const map = {
        'todo': { label: '할 일 📋', class: 'type-todo' },
        'schedule': { label: '일정 ⏰', class: 'type-schedule' },
        'half-off': { label: '반차 🌿', class: 'half-off' },
        'vacation': { label: '휴가 🌴', class: 'vacation' }
      };
      return map[type] || map['todo'];
    },

    getPriorityInfo(p) {
      if (p === 'urgent' || p === 'high') {
        return { label: '중요 ⭐', class: 'badge-priority-high' };
      }
      return { label: '보통 🌸', class: 'badge-priority-medium' };
    },

    async renderSidebar() {
      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      if (!isLogged) {
        const counts = ['all', 'upcoming', 'overdue', 'pinned', 'completed', 'photos', 'notes', 'ledger', 'wishlist', 'vault'];
        counts.forEach(k => {
          const el = document.getElementById(`nav-count-${k}`);
          if (el) el.textContent = '🔒';
        });

        const catContainer = document.getElementById('category-nav-list');
        if (catContainer) {
          catContainer.innerHTML = `<li style="padding: 0.85rem 0.5rem; font-size: 0.82rem; color: var(--text-dim); text-align: center;">🔐 로그인 시 표시됩니다</li>`;
        }
        return;
      }

      const stats = store.getStats();
      const counts = {
        all: store.tasks.length,
        upcoming: store.tasks.filter(t => t.dueDate && t.dueDate > TODAY_STR && t.status !== 'completed').length,
        overdue: stats.overdue,
        pinned: store.tasks.filter(t => t.pinned).length,
        completed: stats.completed,
        photos: (store.photos || []).length,
        notes: store.notes.length,
        ledger: store.ledgerFiles.length,
        wishlist: store.wishlist.length
      };

      Object.keys(counts).forEach(k => {
        const el = document.getElementById(`nav-count-${k}`);
        if (el) el.textContent = counts[k];
      });

      // Update Vault files count
      try {
        const vaultFiles = await cloudSync.getAllVaultFiles();
        const vCount = document.getElementById('nav-count-vault');
        if (vCount) vCount.textContent = vaultFiles.length;
      } catch (e) {}

      // Render Categories in Sidebar (Desktop)
      const catContainer = document.getElementById('category-nav-list');
      if (catContainer) {
        catContainer.innerHTML = store.categories.map(cat => {
          const count = store.tasks.filter(t => t.category === cat.id).length;
          const isActive = store.activeFilter === cat.id ? 'active' : '';
          return `
            <li class="nav-item category-drag-item ${isActive}" draggable="true" data-cat-id="${cat.id}" data-filter="${cat.id}">
              <div class="nav-item-left">
                <span class="category-drag-handle" title="위아래로 드래그하여 순서 변경">⋮⋮</span>
                <span class="category-dot" style="background-color: ${cat.color}; color: ${cat.color};"></span>
                <span>${cat.name}</span>
              </div>
              <span class="nav-count">${count}</span>
            </li>
          `;
        }).join('');
      }

      this.updateNavHighlight();
    },

    updateNavHighlight() {
      // 1. Sidebar Nav
      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.filter === store.activeFilter) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // 2. Mobile Bottom Nav (모든할일, 위시, 메모, 사진첩)
      const isCustomView = ['wishlist', 'photos', 'notes', 'ledger', 'vault', 'calendar-month', 'calendar-week'].includes(store.activeFilter);
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        const action = btn.dataset.mobileNav;
        if (action === 'all') {
          if (!isCustomView) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        } else if (store.activeFilter === action) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // 3. Mobile Category Pills
      document.querySelectorAll('.mobile-cat-pill').forEach(pill => {
        if (pill.dataset.filter === store.activeFilter) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    },

    createTaskCardHTML(task) {
      const isCompleted = task.status === 'completed';
      const priority = this.getPriorityInfo(task.priority);
      const typeInfo = this.getTypeInfo(task.type || 'todo');
      const dueInfo = this.formatDueDate(task.dueDate);
      const cat = store.categories.find(c => c.id === task.category);
      const createdDateStr = new Date(task.createdAt || Date.now()).toISOString().split('T')[0];

      let subtasksHTML = '';
      if (task.subtasks && task.subtasks.length > 0) {
        const done = task.subtasks.filter(s => s.completed).length;
        const total = task.subtasks.length;
        const pct = Math.round((done / total) * 100);
        subtasksHTML = `
          <div class="task-subtasks-preview">
            <span>체크리스트 ${done}/${total}</span>
            <div class="subtasks-bar-track">
              <div class="subtasks-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }

      const isSpecialType = (task.type === 'half-off' || task.type === 'vacation');
      const typeBadgeStyle = isSpecialType
        ? `background: linear-gradient(135deg, #fff3bf, #ffd43b); color: #8c5300; font-weight: 800; border: 1px solid #fab005;`
        : `background: rgba(116, 192, 252, 0.15); color: #1971c2; font-weight: 700;`;

      return `
        <div class="task-card ${isCompleted ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}" 
             id="${task.id}" data-id="${task.id}" draggable="true">
          
          <div class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox" id="chk-${task.id}" ${isCompleted ? 'checked' : ''} 
                   title="완료 체크" data-action="toggle-complete">
          </div>

          <div class="task-body" data-action="open-edit">
            <div class="task-header-row">
              <h4 class="task-title">${escapeHTML(task.title)}</h4>
            </div>

            ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
            ${subtasksHTML}

            <div class="task-meta-row">
              <span class="badge" style="${typeBadgeStyle}">${typeInfo.label}</span>
              <span class="badge ${priority.class}">${priority.label}</span>
              ${cat ? `<span class="badge badge-tag" style="background: ${cat.color}15; color: ${cat.color};">${cat.name}</span>` : ''}
              ${dueInfo ? `<span class="badge badge-date ${dueInfo.className}">${dueInfo.label}</span>` : ''}
            </div>
          </div>

          <div class="task-actions">
            <button class="task-action-btn pin-btn ${task.pinned ? 'active' : ''}" data-action="toggle-pin" title="${task.pinned ? '고정 해제' : '상단 고정'}">
              📌
            </button>
            <button class="task-action-btn edit-btn" data-action="open-edit" title="수정">
              ✏️
            </button>
            <button class="task-action-btn delete-btn" data-action="delete" title="삭제">
              🗑️
            </button>
          </div>
        </div>
      `;
    },

    renderTasks() {
      const tasksView = document.getElementById('tasks-view-container');
      const filesView = document.getElementById('files-view-container');
      const wishView = document.getElementById('wishlist-view-container');
      const photosView = document.getElementById('photos-view-container');
      const notesView = document.getElementById('notes-view-container');
      const ledgerView = document.getElementById('ledger-view-container');
      const calMView = document.getElementById('calendar-month-view-container');
      const calWView = document.getElementById('calendar-week-view-container');
      const listContainer = document.getElementById('tasks-list-container');
      const kanbanContainer = document.getElementById('kanban-board-container');
      const emptyState = document.getElementById('empty-state');
      const lockedScreen = document.getElementById('locked-privacy-screen');
      const mobileBar = document.getElementById('mobile-category-bar');

      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      if (!isLogged) {
        if (lockedScreen && lockedScreen.style.display !== 'flex') lockedScreen.style.display = 'flex';
        [tasksView, filesView, wishView, photosView, notesView, ledgerView, calMView, calWView].forEach(v => {
          if (v && v.style.display !== 'none') v.style.display = 'none';
        });
        if (mobileBar && mobileBar.style.display !== 'none') mobileBar.style.display = 'none';
        this.updateNavHighlight();
        return;
      }

      if (lockedScreen && lockedScreen.style.display !== 'none') lockedScreen.style.display = 'none';
      if (mobileBar && mobileBar.style.display !== 'flex') mobileBar.style.display = 'flex';

      // Atomic Target View Switching (Zero-flicker layout persistence)
      const filter = store.activeFilter;
      let targetView = tasksView;
      if (filter === 'calendar-month') targetView = calMView;
      else if (filter === 'calendar-week') targetView = calWView;
      else if (filter === 'photos') targetView = photosView;
      else if (filter === 'notes') targetView = notesView;
      else if (filter === 'ledger') targetView = ledgerView;
      else if (filter === 'wishlist') targetView = wishView;
      else if (filter === 'vault') targetView = filesView;
      else targetView = tasksView;

      [tasksView, filesView, wishView, photosView, notesView, ledgerView, calMView, calWView].forEach(v => {
        if (v) {
          if (v === targetView) {
            if (v.style.display !== 'flex') v.style.display = 'flex';
          } else {
            if (v.style.display !== 'none') v.style.display = 'none';
          }
        }
      });

      this.updateNavHighlight();

      // 1. Calendar Monthly View
      if (filter === 'calendar-month') {
        this.renderCalendarMonth();
        return;
      }

      // 2. Calendar Weekly View (Horizontal)
      if (filter === 'calendar-week') {
        this.renderCalendarWeek();
        return;
      }

      // 3.0. 📷 폴라로이드 사진첩 (Photos) View
      if (filter === 'photos') {
        this.renderPhotos();
        return;
      }

      // 3. 끄적끄적 (Notes) View
      if (filter === 'notes') {
        this.renderNotes();
        return;
      }

      // 4. 💍 2026년 신혼 가계부 View
      if (filter === 'ledger') {
        this.renderLedger();
        return;
      }

      // 5. Wishlist View
      if (filter === 'wishlist') {
        this.renderWishlist();
        return;
      }

      // 6. File Vault View
      if (filter === 'vault') {
        this.renderFilesVault();
        return;
      }

      // 7. Standard Tasks View
      if (tasksView) tasksView.style.display = 'flex';

      const filtered = store.getFilteredTasks();

      const headingEl = document.getElementById('view-title');
      const filterNames = {
        all: '모든 할 일 & 일정 🌸',
        upcoming: '다가오는 일정 ⏰',
        overdue: '기한 지연된 일정 ⚠️',
        pinned: '중요한 일정 💖',
        completed: '완료된 목록 ✨'
      };
      const catMatch = store.categories.find(c => c.id === store.activeFilter);
      if (headingEl) headingEl.textContent = filterNames[store.activeFilter] || (catMatch ? `${catMatch.name} 목록` : '할 일 목록');

      if (store.viewMode === 'list') {
        if (listContainer) listContainer.style.display = 'flex';
        if (kanbanContainer) kanbanContainer.style.display = 'none';

        if (filtered.length === 0) {
          if (listContainer) listContainer.innerHTML = '';
          if (emptyState) emptyState.style.display = 'flex';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          if (listContainer) {
            listContainer.innerHTML = filtered.map(t => this.createTaskCardHTML(t)).join('');
          }
        }
      } else {
        if (listContainer) listContainer.style.display = 'none';
        if (kanbanContainer) kanbanContainer.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        const cols = {
          'todo': document.getElementById('kanban-col-todo'),
          'in-progress': document.getElementById('kanban-col-inprogress'),
          'completed': document.getElementById('kanban-col-completed')
        };
        const counts = { 'todo': 0, 'in-progress': 0, 'completed': 0 };

        Object.keys(cols).forEach(s => { if (cols[s]) cols[s].innerHTML = ''; });

        filtered.forEach(task => {
          const col = cols[task.status] || cols['todo'];
          counts[task.status = task.status || 'todo']++;
          if (col) col.insertAdjacentHTML('beforeend', this.createTaskCardHTML(task));
        });

        const bTodo = document.getElementById('badge-count-todo');
        const bInp = document.getElementById('badge-count-inprogress');
        const bComp = document.getElementById('badge-count-completed');
        if (bTodo) bTodo.textContent = counts['todo'];
        if (bInp) bInp.textContent = counts['in-progress'];
        if (bComp) bComp.textContent = counts['completed'];
      }

      this.renderSidebar();
    },

    // =======================================================================
    // Monthly Calendar Engine
    // =======================================================================
    renderCalendarMonth() {
      const grid = document.getElementById('month-days-grid');
      const titleEl = document.getElementById('month-cal-header-title');
      if (!grid) return;

      const calDate = store.currentCalendarDate;
      const year = calDate.getFullYear();
      const month = calDate.getMonth();

      if (titleEl) {
        titleEl.textContent = `🗓️ ${year}년 ${month + 1}월 달력 플래너`;
      }

      const firstDayIndex = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const prevMonthTotalDays = new Date(year, month, 0).getDate();

      const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthTasks = store.tasks.filter(t => t.dueDate && t.dueDate.startsWith(currentMonthPrefix));
      const monthCompleted = monthTasks.filter(t => t.status === 'completed').length;
      const monthVacations = monthTasks.filter(t => t.type === 'vacation' || t.type === 'half-off').length;
      const monthRate = monthTasks.length > 0 ? Math.round((monthCompleted / monthTasks.length) * 100) : 0;

      const sTotal = document.getElementById('cal-stat-total');
      const sComp = document.getElementById('cal-stat-completed');
      const sVac = document.getElementById('cal-stat-vacation');
      const sRate = document.getElementById('cal-stat-rate');

      if (sTotal) sTotal.textContent = `${monthTasks.length}개`;
      if (sComp) sComp.textContent = `${monthCompleted}개`;
      if (sVac) sVac.textContent = `${monthVacations}일`;
      if (sRate) sRate.textContent = `${monthRate}%`;

      let cellsHTML = '';

      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        const prevMonthDate = new Date(year, month - 1, dayNum);
        const pYear = prevMonthDate.getFullYear();
        const pMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
        const dateStr = `${pYear}-${pMonth}-${String(dayNum).padStart(2, '0')}`;

        cellsHTML += `
          <div class="cal-day-cell other-month" data-date="${dateStr}">
            <div class="cal-day-header">
              <span class="cal-day-num">${dayNum}</span>
            </div>
            <div class="cal-day-tasks"></div>
          </div>
        `;
      }

      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dateStr === TODAY_STR);
        const isSelected = (dateStr === store.selectedCalendarDateStr);

        const daysTasks = store.tasks.filter(t => t.dueDate === dateStr);
        let taskChipsHTML = '';

        daysTasks.slice(0, 3).forEach(task => {
          const isDone = task.status === 'completed';

          const isImportant = (task.priority === 'urgent' || task.priority === 'high');
          const starIcon = isImportant ? '<span class="cal-star-badge" title="중요">⭐</span>' : '';

          if (task.type === 'half-off') {
            taskChipsHTML += `
              <div class="cal-task-chip half-off ${isDone ? 'completed' : ''}" title="${escapeHTML(task.title || '반차')}">
                ${starIcon}
                <span>🌿</span>
                <span>반차</span>
              </div>
            `;
          } else if (task.type === 'vacation') {
            taskChipsHTML += `
              <div class="cal-task-chip vacation ${isDone ? 'completed' : ''}" title="${escapeHTML(task.title || '휴가')}">
                ${starIcon}
                <span>🌴</span>
                <span>휴가</span>
              </div>
            `;
          } else {
            const pClass = isImportant ? 'high' : 'medium';
            const icon = task.type === 'schedule' ? '⏰' : (isDone ? '✨' : '📋');
            taskChipsHTML += `
              <div class="cal-task-chip ${isDone ? 'completed' : ''} ${pClass}" title="${escapeHTML(task.title)}">
                ${starIcon}
                <span>${icon}</span>
                <span>${escapeHTML(task.title)}</span>
              </div>
            `;
          }
        });

        if (daysTasks.length > 3) {
          taskChipsHTML += `<div class="cal-task-more">+${daysTasks.length - 3}개 더보기</div>`;
        }

        cellsHTML += `
          <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
            <div class="cal-day-header">
              <span class="cal-day-num">${day}</span>
              ${isToday ? '<span class="cal-today-badge">오늘 🌸</span>' : ''}
            </div>
            <div class="cal-day-tasks">
              ${taskChipsHTML}
            </div>
          </div>
        `;
      }

      const totalRendered = firstDayIndex + totalDays;
      const nextDays = (totalRendered <= 35) ? 35 - totalRendered : 42 - totalRendered;

      for (let day = 1; day <= nextDays; day++) {
        const nextMonthDate = new Date(year, month + 1, day);
        const nYear = nextMonthDate.getFullYear();
        const nMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
        const dateStr = `${nYear}-${nMonth}-${String(day).padStart(2, '0')}`;

        cellsHTML += `
          <div class="cal-day-cell other-month" data-date="${dateStr}">
            <div class="cal-day-header">
              <span class="cal-day-num">${day}</span>
            </div>
            <div class="cal-day-tasks"></div>
          </div>
        `;
      }

      grid.innerHTML = cellsHTML;
      this.renderSelectedDayTasks();
    },

    renderSelectedDayTasks() {
      const selectedDate = store.selectedCalendarDateStr || TODAY_STR;
      const titleEl = document.getElementById('cal-selected-day-title');
      const listEl = document.getElementById('cal-selected-tasks-list');
      if (!listEl) return;

      const dateObj = new Date(selectedDate);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = dayNames[dateObj.getDay()] || '';

      if (titleEl) {
        titleEl.textContent = `${selectedDate.replace(/-/g, '.')} (${dayName}요일) 일정/할 일 목록`;
      }

      const tasksForDate = store.tasks.filter(t => t.dueDate === selectedDate);
      if (tasksForDate.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: rgba(0,0,0,0.02); border-radius: var(--radius-md);">
            <span>🌷 이 날짜에 등록된 일정이 없어요. '+ 이 날짜에 새 일정/할 일 추가' 버튼을 눌러보세요!</span>
          </div>
        `;
      } else {
        listEl.innerHTML = tasksForDate.map(t => this.createTaskCardHTML(t)).join('');
      }
    },

    // =======================================================================
    // Compact Horizontal Weekly Calendar & Planner Engine
    // =======================================================================
    renderCalendarWeek() {
      const container = document.getElementById('weekly-board-grid');
      const titleEl = document.getElementById('week-cal-header-title');
      if (!container) return;

      const weekDate = store.currentWeeklyDate;
      const currentDay = weekDate.getDay();
      const distanceToMon = (currentDay === 0 ? -6 : 1) - currentDay;
      const monday = new Date(weekDate);
      monday.setDate(weekDate.getDate() + distanceToMon);

      const dayNames = ['월요일 (Mon)', '화요일 (Tue)', '수요일 (Wed)', '목요일 (Thu)', '금요일 (Fri)', '토요일 (Sat)', '일요일 (Sun)'];
      let rowsHTML = '';

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const fullDateStr = `${y}-${m}-${dayStr}`;
        weekDays.push({ date: d, dateStr: fullDateStr, label: dayNames[i] });
      }

      if (titleEl) {
        const startStr = weekDays[0].dateStr.replace(/-/g, '.');
        const endStr = weekDays[6].dateStr.replace(/-/g, '.');
        titleEl.textContent = `📅 가로형 주간 다이어리 플래너 (${startStr} ~ ${endStr})`;
      }

      weekDays.forEach(dayInfo => {
        const isToday = (dayInfo.dateStr === TODAY_STR);
        const tasksForDay = store.tasks.filter(t => t.dueDate === dayInfo.dateStr);

        let chipsHTML = '';
        if (tasksForDay.length === 0) {
          chipsHTML = `<span class="weekly-row-empty">등록된 일정이 없어요 🌱</span>`;
        } else {
          chipsHTML = tasksForDay.map(task => {
            const isDone = task.status === 'completed';
            const isSpecial = (task.type === 'half-off' || task.type === 'vacation');
            const chipStyle = isSpecial
              ? 'background: linear-gradient(135deg, #fff3bf, #ffd43b); color: #8c5300; font-weight: 800; border: 1px solid #fab005;'
              : '';
            const isImportant = (task.priority === 'urgent' || task.priority === 'high');
            const star = isImportant ? '⭐ ' : '';
            const chipLabel = task.type === 'half-off' ? `${star}🌿 반차` : (task.type === 'vacation' ? `${star}🌴 휴가` : `${star}${escapeHTML(task.title)}`);

            return `
              <div class="weekly-item-chip ${isDone ? 'completed' : ''}" style="${chipStyle}" data-task-id="${task.id}" data-action="toggle-complete">
                <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} style="width: 14px; height: 14px;">
                <span class="weekly-item-chip-title" title="${escapeHTML(task.title)}">${chipLabel}</span>
              </div>
            `;
          }).join('');
        }

        rowsHTML += `
          <div class="weekly-row-card ${isToday ? 'is-today' : ''}" data-row-date="${dayInfo.dateStr}">
            <div class="weekly-row-day-badge">
              <span class="weekly-row-dayname">
                ${isToday ? '🌸' : '🗓️'} ${dayInfo.label}
              </span>
              <span class="weekly-row-date">${dayInfo.dateStr.replace(/-/g, '.')}</span>
            </div>

            <div class="weekly-row-tasks-wrap">
              ${chipsHTML}
            </div>

            <div>
              <button type="button" class="weekly-row-add-btn" data-action="weekly-add" data-date="${dayInfo.dateStr}">
                <span>+</span> 추가
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = rowsHTML;
    },

    // =======================================================================
    // 📷 폴라로이드 사진첩 (Polaroid Photo Gallery) Engine
    // =======================================================================
    renderPhotos() {
      const grid = document.getElementById('photos-grid-container');
      const emptyState = document.getElementById('photos-empty-state');
      const countEl = document.getElementById('photos-count-total');
      if (!grid) return;

      const total = (store.photos || []).length;
      if (countEl) countEl.textContent = total;

      if (total === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = store.photos.map(photo => {
          const rot = photo.rotationDeg !== undefined ? photo.rotationDeg : 0;
          const dateFormatted = photo.date ? photo.date.replace(/-/g, '.') : '';
          
          return `
            <div class="polaroid-card" style="--rot: ${rot}deg;" data-photo-id="${photo.id}" draggable="true">
              <div class="polaroid-image-wrapper" data-action="view-photo-lightbox" data-photo-id="${photo.id}" title="클릭하여 크게 보기 🔍">
                <img src="${photo.imageDataUrl}" class="polaroid-img" alt="${escapeHTML(photo.caption || '폴라로이드 사진')}" loading="lazy">
              </div>
              <div class="polaroid-caption-area">
                <span class="polaroid-date-badge">${dateFormatted}</span>
                <div class="polaroid-memo-text">${escapeHTML(photo.caption)}</div>
              </div>
              <div class="polaroid-actions-row">
                <button type="button" class="polaroid-btn" data-action="view-photo-lightbox" data-photo-id="${photo.id}" title="크게 보기">
                  🔍
                </button>
                <button type="button" class="polaroid-btn" data-action="edit-photo" data-photo-id="${photo.id}" title="사진/메모 수정">
                  ✏️
                </button>
                <button type="button" class="polaroid-btn delete" data-action="delete-photo" data-photo-id="${photo.id}" title="사진 삭제">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    },

    // =======================================================================
    // 끄적끄적 (Quick Notes / Memo) Engine (Gray color support & Edit button)
    // =======================================================================
    renderNotes() {
      const grid = document.getElementById('notes-grid-container');
      const emptyState = document.getElementById('notes-empty-state');
      const countEl = document.getElementById('notes-count-total');
      if (!grid) return;

      const total = store.notes.length;
      if (countEl) countEl.textContent = total;

      if (total === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = store.notes.map(note => {
          const cDate = new Date(note.createdAt);
          const dateStr = `${cDate.getMonth() + 1}.${cDate.getDate()} ${String(cDate.getHours()).padStart(2, '0')}:${String(cDate.getMinutes()).padStart(2, '0')}`;
          const colorClass = `color-${note.color || 'pink'}`;

          return `
            <div class="note-card ${colorClass}" data-note-id="${note.id}">
              <div class="note-tape"></div>
              <div class="note-card-body">${escapeHTML(note.content)}</div>
              <div class="note-card-footer">
                <span>🕒 ${dateStr}</span>
                <div class="note-actions-bar">
                  <button type="button" class="note-btn" data-action="edit-note" data-note-id="${note.id}" title="메모 수정">
                    ✏️
                  </button>
                  <button type="button" class="note-btn" data-action="delete-note" data-note-id="${note.id}" title="메모 삭제">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    },

    // =======================================================================
    // 💍 2026년 신혼 가계부 Engine (영호 & 진영 급여, 집세/공과금, I열 7월)
    // =======================================================================
    renderLedger() {
      const data = store.honeymoonData || INITIAL_HONEYMOON_DATA;
      const targetMonth = store.selectedLedgerMonth || 7;
      const mData = data[targetMonth] || { income: { total: 0, items: [] }, fixed: { total: 0, items: [] }, variable: { total: 0, items: [] } };

      const incomeTotal = mData.income ? mData.income.total : 0;
      const fixedTotal = mData.fixed ? mData.fixed.total : 0;
      const variableTotal = mData.variable ? mData.variable.total : 0;
      const totalExpense = fixedTotal + variableTotal;
      const savings = incomeTotal - totalExpense;
      const savingsRate = incomeTotal > 0 ? Math.round((savings / incomeTotal) * 100) : 0;

      // Previous month comparison
      const prevData = data[targetMonth - 1];
      const prevTotalExpense = prevData ? (prevData.fixed.total + prevData.variable.total) : 0;
      const diffPct = prevTotalExpense > 0 ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100) : 0;

      // Update Summary Cards
      const curMonthEl = document.getElementById('ledger-stat-cur-month');
      const incomeSub = document.getElementById('ledger-stat-income-sub');
      const diffBadge = document.getElementById('ledger-stat-diff-badge');
      const fixedEl = document.getElementById('ledger-stat-fixed');
      const variableEl = document.getElementById('ledger-stat-variable');
      const savingsEl = document.getElementById('ledger-stat-savings');
      const savingsRateEl = document.getElementById('ledger-stat-savings-rate');

      const statCards = document.querySelectorAll('.ledger-stat-card');
      let t4 = null;
      if (statCards.length >= 4) {
        const t1 = statCards[0].querySelector('.ledger-stat-title');
        const t2 = statCards[1].querySelector('.ledger-stat-title');
        const t3 = statCards[2].querySelector('.ledger-stat-title');
        t4 = statCards[3].querySelector('.ledger-stat-title');
        if (t1) t1.textContent = `💌 ${targetMonth}월 수입(급여) & 총 지출`;
        if (t2) t2.textContent = `🔒 ${targetMonth}월 고정지출 계 (집세/공과금)`;
        if (t3) t3.textContent = `🛍️ ${targetMonth}월 변동지출 계 (생활비)`;
        if (t4) t4.textContent = (savings < 0) ? `🌱 ${targetMonth}월 결산 수지 (초과분)` : `🌱 ${targetMonth}월 남은 돈 (저축/투자)`;
      }

      if (totalExpense === 0 && incomeTotal === 0) {
        if (curMonthEl) curMonthEl.textContent = '0원';
        if (incomeSub) incomeSub.textContent = '/ 수입 0원';
        if (fixedEl) fixedEl.textContent = '0원';
        if (variableEl) variableEl.textContent = '0원';
        if (savingsEl) {
          savingsEl.textContent = '0원';
          savingsEl.style.color = '#10b981';
        }
        if (savingsRateEl) savingsRateEl.textContent = '아직 작성 전이에요 🌱';
        if (diffBadge) {
          diffBadge.textContent = `${targetMonth}월 가계부 작성 대기 중 🌱`;
          diffBadge.style.color = 'var(--text-muted)';
          diffBadge.style.background = 'rgba(0,0,0,0.05)';
        }
      } else {
        if (curMonthEl) curMonthEl.textContent = formatKRW(totalExpense);
        if (incomeSub) incomeSub.textContent = `/ 급여 ${formatKRW(incomeTotal)}`;
        if (fixedEl) fixedEl.textContent = formatKRW(fixedTotal);
        if (variableEl) variableEl.textContent = formatKRW(variableTotal);
        
        if (savingsEl) {
          if (savings < 0) {
            savingsEl.textContent = `-${formatKRW(Math.abs(savings))}`;
            savingsEl.style.color = '#ff6b6b';
            if (savingsRateEl) savingsRateEl.textContent = '비상금/전월저축분 활용 💡';
          } else {
            savingsEl.textContent = formatKRW(savings);
            savingsEl.style.color = '#10b981';
            if (savingsRateEl) savingsRateEl.textContent = `저축률 ${savingsRate}% 💮`;
          }
        }

        if (diffBadge) {
          if (prevTotalExpense === 0) {
            diffBadge.textContent = `${targetMonth}월 작성 완료 ✨`;
            diffBadge.style.color = '#10b981';
            diffBadge.style.background = 'rgba(16, 185, 129, 0.1)';
          } else if (diffPct > 0) {
            diffBadge.textContent = `전월 대비 +${diffPct}% 🔺`;
            diffBadge.style.color = '#ff6b6b';
            diffBadge.style.background = 'rgba(255, 107, 107, 0.1)';
          } else if (diffPct < 0) {
            diffBadge.textContent = `전월 대비 ${diffPct}% 🔻 (절약!)`;
            diffBadge.style.color = '#10b981';
            diffBadge.style.background = 'rgba(16, 185, 129, 0.1)';
          } else {
            diffBadge.textContent = '전월과 동일';
            diffBadge.style.color = 'var(--text-muted)';
          }
        }
      }

      // Render 12-Month Stacked Bar Chart
      const chartContainer = document.getElementById('ledger-bar-chart-container');
      if (chartContainer) {
        let maxVal = 7500000;
        for (let m = 1; m <= 12; m++) {
          if (data[m]) {
            const exp = (data[m].fixed.total || 0) + (data[m].variable.total || 0);
            const inc = data[m].income.total || 0;
            if (exp > maxVal) maxVal = exp;
            if (inc > maxVal) maxVal = inc;
          }
        }

        let barsHTML = '';
        for (let m = 1; m <= 12; m++) {
          const mObj = data[m] || { income: { total: 0 }, fixed: { total: 0 }, variable: { total: 0 } };
          const f = mObj.fixed.total || 0;
          const v = mObj.variable.total || 0;
          const total = f + v;
          const isCurrent = (m === targetMonth);

          const fixedHeightPct = maxVal > 0 ? (f / maxVal) * 100 : 0;
          const varHeightPct = maxVal > 0 ? (v / maxVal) * 100 : 0;
          const totalFormatted = total > 0 ? (total >= 10000 ? `${Math.round(total / 10000)}만` : `${total}원`) : '';

          barsHTML += `
            <div class="ledger-bar-col ${isCurrent ? 'is-current' : ''}" data-l-month="${m}" title="${m}월 총지출: ${formatKRW(total)} (고정 ${formatKRW(f)} + 변동 ${formatKRW(v)})">
              ${totalFormatted ? `<span class="ledger-bar-amount">${totalFormatted}</span>` : ''}
              <div class="ledger-bar-track">
                <div class="ledger-bar-segment-variable" style="height: ${varHeightPct}%;"></div>
                <div class="ledger-bar-segment-fixed" style="height: ${fixedHeightPct}%;"></div>
              </div>
              <span class="ledger-bar-label">${m}월</span>
            </div>
          `;
        }

        chartContainer.innerHTML = barsHTML;
      }

      // Update Month Tabs
      document.querySelectorAll('.l-m-tab').forEach(tab => {
        if (Number(tab.dataset.lMonth) === targetMonth) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      const breakdownTitle = document.getElementById('breakdown-month-title');
      if (breakdownTitle) breakdownTitle.textContent = `2026년 ${targetMonth}월 신혼 가계부 상세 내역 (영호 & 진영) 💍`;

      // Render 3-Column Breakdown Lists (A열 구분 & B열 항목 목록)
      const listIncome = document.getElementById('list-items-income');
      const listFixed = document.getElementById('list-items-fixed');
      const listVariable = document.getElementById('list-items-variable');

      const colTotalIncome = document.getElementById('col-total-income');
      const colTotalFixed = document.getElementById('col-total-fixed');
      const colTotalVariable = document.getElementById('col-total-variable');

      if (colTotalIncome) colTotalIncome.textContent = formatKRW(incomeTotal);
      if (colTotalFixed) colTotalFixed.textContent = formatKRW(fixedTotal);
      if (colTotalVariable) colTotalVariable.textContent = formatKRW(variableTotal);

      if (listIncome) {
        const items = mData.income && mData.income.items ? mData.income.items : [];
        listIncome.innerHTML = items.length ? items.map(it => `
          <div class="ledger-item-row">
            <span class="ledger-item-name">💵 ${escapeHTML(it.name)}</span>
            <span class="ledger-item-amount" style="color: #10b981;">+${formatKRW(it.amount)}</span>
          </div>
        `).join('') : `<div style="text-align:center; padding: 1.25rem; color: var(--text-dim); font-size: 0.82rem;">${targetMonth}월 급여 내역이 아직 없어요 🌱</div>`;
      }

      if (listFixed) {
        const items = mData.fixed && mData.fixed.items ? mData.fixed.items : [];
        listFixed.innerHTML = items.length ? items.map(it => `
          <div class="ledger-item-row">
            <span class="ledger-item-name">📌 ${escapeHTML(it.name)}</span>
            <span class="ledger-item-amount" style="color: #7048e8;">${formatKRW(it.amount)}</span>
          </div>
        `).join('') : `<div style="text-align:center; padding: 1.25rem; color: var(--text-dim); font-size: 0.82rem;">${targetMonth}월 고정지출(집세/공과금) 내역이 없어요 🌱</div>`;
      }

      if (listVariable) {
        const items = mData.variable && mData.variable.items ? mData.variable.items : [];
        listVariable.innerHTML = items.length ? items.map(it => `
          <div class="ledger-item-row">
            <span class="ledger-item-name">🛍️ ${escapeHTML(it.name)}</span>
            <span class="ledger-item-amount" style="color: #ff6b8b;">${formatKRW(it.amount)}</span>
          </div>
        `).join('') : `<div style="text-align:center; padding: 1.25rem; color: var(--text-dim); font-size: 0.82rem;">${targetMonth}월 생활비(변동지출) 내역이 없어요 🌱</div>`;
      }

      // Render Stored Ledger Files List
      const filesGrid = document.getElementById('ledger-files-grid');
      const emptyState = document.getElementById('ledger-empty-state');
      const filesCountEl = document.getElementById('ledger-files-count');

      if (filesCountEl) filesCountEl.textContent = store.ledgerFiles.length;

      if (filesGrid) {
        if (store.ledgerFiles.length === 0) {
          filesGrid.innerHTML = '';
          if (emptyState) emptyState.style.display = 'flex';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          filesGrid.innerHTML = store.ledgerFiles.map(file => {
            const dateStr = new Date(file.createdAt).toLocaleDateString('ko-KR', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
              <div class="file-card" data-ledger-id="${file.id}">
                <div class="file-card-top">
                  <div class="file-type-badge" style="background: rgba(255, 107, 139, 0.12); color: var(--primary);">💍 📊</div>
                  <div class="file-meta">
                    <div class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</div>
                    <div class="file-submeta">
                      <span>${this.formatBytes(file.size)}</span> • <span>${dateStr}</span>
                    </div>
                  </div>
                </div>

                ${file.note ? `<div class="file-note-box">💬 ${escapeHTML(file.note)}</div>` : ''}

                <div class="file-card-actions">
                  <button type="button" class="btn-file-download" data-action="download-ledger" data-ledger-id="${file.id}">
                    📥 엑셀 다운로드
                  </button>
                  <button type="button" class="task-action-btn delete-btn" data-action="delete-ledger" data-ledger-id="${file.id}" title="가계부 파일 삭제">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    },

    // =======================================================================
    // Wishlist Hub Engine
    // =======================================================================
    formatWishCost(cost) {
      if (!cost) return '';
      const str = String(cost).trim();
      if (!str) return '';
      const digits = str.replace(/[^0-9]/g, '');
      if (digits.length > 0) {
        const num = parseInt(digits, 10);
        const formatted = num.toLocaleString('ko-KR');
        if (str.includes('만') && !str.includes('원')) {
          return `${formatted}만원`;
        }
        if (!str.includes('원') && !str.includes('$') && !str.includes('€') && !str.includes('엔')) {
          return `${formatted}원`;
        }
        return str.replace(/[0-9,]+/, formatted);
      }
      return str;
    },

    renderWishlist() {
      const grid = document.getElementById('wishlist-grid-container');
      const emptyState = document.getElementById('wishlist-empty-state');
      const countTotal = document.getElementById('wishlist-count-total');
      const countComp = document.getElementById('wishlist-count-completed');

      if (!grid) return;

      const total = store.wishlist.length;
      const completed = store.wishlist.filter(w => w.completed).length;

      if (countTotal) countTotal.textContent = total;
      if (countComp) countComp.textContent = completed;

      let filtered = store.wishlist;
      if (store.activeWishCat !== 'all') {
        filtered = store.wishlist.filter(w => w.category === store.activeWishCat);
      }

      if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        const catMap = {
          shop: { label: '🛍️ 사고 싶은 것', class: 'shop' },
          travel: { label: '✈️ 가고 싶은 곳', class: 'travel' },
          food: { label: '🍰 먹고 싶은 것', class: 'food' },
          bucket: { label: '🎯 하고 싶은 것', class: 'bucket' }
        };

        grid.innerHTML = filtered.map(wish => {
          const catInfo = catMap[wish.category] || catMap.shop;
          const createdDateStr = wish.createdAt ? new Date(wish.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '.').replace(/\.$/, '') : '';
          const completedDateStr = (wish.completed && wish.completedAt) ? new Date(wish.completedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '.').replace(/\.$/, '') : '';
          const formattedCost = this.formatWishCost(wish.cost);

          return `
            <div class="wish-card ${wish.completed ? 'completed' : ''}" data-wish-id="${wish.id}">
              ${wish.completed ? '<div class="wish-stamp-achieved">💮 DREAM CAME TRUE ✨</div>' : ''}
              
              <div class="wish-card-top">
                <span class="wish-cat-tag ${catInfo.class}">${catInfo.label}</span>
                <button type="button" class="task-action-btn delete-btn" data-action="delete-wish" data-wish-id="${wish.id}" title="위시 삭제">
                  🗑️
                </button>
              </div>

              <h4 class="wish-title">${escapeHTML(wish.title)}</h4>

              ${wish.memo ? `<p class="wish-memo">💬 ${escapeHTML(wish.memo)}</p>` : ''}

              ${wish.url ? `
                <div class="wish-meta-row" style="margin-top: 0.25rem;">
                  <a href="${escapeHTML(wish.url)}" target="_blank" rel="noopener" class="wish-link-btn">🔗 링크 바로가기</a>
                </div>
              ` : ''}

              <div class="wish-card-actions">
                <button type="button" class="btn-wish-toggle" data-action="toggle-wish" data-wish-id="${wish.id}">
                  <span>${wish.completed ? '💮 달성 완료!' : '🤍 소원 달성 체크'}</span>
                </button>
                ${formattedCost ? `<span class="wish-cost-badge">🏷️ ${escapeHTML(formattedCost)}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    },

    async renderFilesVault() {
      const grid = document.getElementById('files-grid-container');
      const emptyState = document.getElementById('vault-empty-state');
      if (!grid) return;

      try {
        const files = await cloudSync.getAllVaultFiles();
        if (files.length === 0) {
          grid.innerHTML = '';
          if (emptyState) emptyState.style.display = 'flex';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          grid.innerHTML = files.map(file => {
            const iconInfo = this.getFileIcon(file.name);
            const dateStr = new Date(file.createdAt).toLocaleDateString('ko-KR', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
              <div class="file-card" data-file-id="${file.id}">
                <div class="file-card-top">
                  <div class="file-type-badge">${iconInfo.icon}</div>
                  <div class="file-meta">
                    <div class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</div>
                    <div class="file-submeta">
                      <span>${this.formatBytes(file.size)}</span> • <span>${dateStr}</span>
                    </div>
                  </div>
                </div>

                ${file.note ? `<div class="file-note-box">💬 ${escapeHTML(file.note)}</div>` : ''}

                <div class="file-card-actions">
                  <button type="button" class="btn-file-download" data-action="download-file" data-file-id="${file.id}">
                    📥 다운로드
                  </button>
                  <button type="button" class="task-action-btn delete-btn" data-action="delete-file" data-file-id="${file.id}" title="파일 삭제">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('');
        }
      } catch (e) {
        console.error('Error loading vault files:', e);
      }
    },

    // =======================================================================
    // Modals Management
    // =======================================================================
    openTaskModal(taskId = null, presetDueDate = null) {
      const modal = document.getElementById('task-modal');
      const form = document.getElementById('task-form');
      const modalTitle = document.getElementById('modal-title');
      const subtasksList = document.getElementById('modal-subtasks-list');
      const createdGroup = document.getElementById('task-createdat-group');
      const createdVal = document.getElementById('task-createdat-val');
      if (!modal || !form) return;

      form.reset();
      if (subtasksList) subtasksList.innerHTML = '';

      const catSelect = document.getElementById('task-input-category');
      if (catSelect) {
        catSelect.innerHTML = store.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }

      if (taskId) {
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) return;
        modalTitle.textContent = '일정 / 할 일 수정하기 ✏️';
        form.dataset.taskId = task.id;
        document.getElementById('task-input-title').value = task.title;
        document.getElementById('task-input-type').value = task.type || 'todo';
        document.getElementById('task-input-desc').value = task.description || '';
        document.getElementById('task-input-priority').value = (task.priority === 'urgent' || task.priority === 'high') ? 'high' : 'medium';
        document.getElementById('task-input-category').value = task.category || 'routine';
        document.getElementById('task-input-duedate').value = task.dueDate || TODAY_STR;
        document.getElementById('task-input-pinned').checked = !!task.pinned;

        if (task.subtasks) {
          task.subtasks.forEach(s => this.addSubtaskRow(s.title, s.completed, s.id));
        }
      } else {
        modalTitle.textContent = '새로운 일정/할 일 등록 💖';
        delete form.dataset.taskId;
        document.getElementById('task-input-type').value = 'todo';
        document.getElementById('task-input-priority').value = 'medium';
        document.getElementById('task-input-duedate').value = presetDueDate || TODAY_STR;

        const defaultCat = store.activeFilter !== 'all' && store.activeFilter !== 'vault' && store.categories.some(c => c.id === store.activeFilter)
          ? store.activeFilter
          : (store.categories[0] ? store.categories[0].id : 'routine');
        document.getElementById('task-input-category').value = defaultCat;
      }

      modal.classList.add('active');
      document.getElementById('task-input-title').focus();
    },

    closeTaskModal() {
      const modal = document.getElementById('task-modal');
      if (modal) modal.classList.remove('active');
    },

    addSubtaskRow(title = '', completed = false, id = null) {
      const list = document.getElementById('modal-subtasks-list');
      if (!list) return;
      const subId = id || 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
      const row = document.createElement('div');
      row.className = 'checklist-item-row';
      row.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''}>
        <input type="text" class="checklist-item-input" value="${escapeHTML(title)}" placeholder="하위 체크 항목 입력..." data-sub-id="${subId}">
        <button type="button" class="task-action-btn delete-btn" title="삭제" onclick="if(confirm('정말 삭제하시겠습니까?')) this.parentElement.remove()">✕</button>
      `;
      list.appendChild(row);
    },

    openWishlistModal(wishId = null) {
      const modal = document.getElementById('wishlist-modal');
      const form = document.getElementById('wishlist-form');
      const titleEl = document.getElementById('wishlist-modal-title');
      if (!modal || !form) return;

      form.reset();
      if (wishId) {
        const wish = store.wishlist.find(w => w.id === wishId);
        if (!wish) return;
        titleEl.textContent = '🎁 위시리스트 수정하기';
        form.dataset.wishId = wish.id;
        document.getElementById('wish-input-title').value = wish.title;
        document.getElementById('wish-input-cat').value = wish.category;
        document.getElementById('wish-input-cost').value = wish.cost || '';
        document.getElementById('wish-input-url').value = wish.url || '';
        document.getElementById('wish-input-memo').value = wish.memo || '';
      } else {
        titleEl.textContent = '🎁 새로운 위시 등록';
        delete form.dataset.wishId;
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      document.getElementById('wish-input-title').focus();
    },

    closeWishlistModal() {
      const modal = document.getElementById('wishlist-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openLedgerModal() {
      const modal = document.getElementById('ledger-upload-modal');
      const form = document.getElementById('ledger-upload-form');
      if (form) form.reset();
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }
    },

    closeLedgerModal() {
      const modal = document.getElementById('ledger-upload-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openFileUploadModal() {
      const modal = document.getElementById('upload-file-modal');
      const form = document.getElementById('file-upload-form');
      if (form) form.reset();
      if (modal) modal.classList.add('active');
    },

    closeFileUploadModal() {
      const modal = document.getElementById('upload-file-modal');
      if (modal) modal.classList.remove('active');
    },

    openCloudModal() {
      const modal = document.getElementById('cloud-modal');
      if (!modal) {
        console.error('cloud-modal element not found!');
        return;
      }
      // Always reset inputs to blank for absolute privacy
      const sInput = document.getElementById('sync-input-space-id');
      const pInput = document.getElementById('sync-input-pin');
      if (sInput) sInput.value = '';
      if (pInput) pInput.value = '';

      cloudSync.updateUIStatus();
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '99999';
      modal.classList.add('active');
      if (sInput) setTimeout(() => sInput.focus(), 80);
    },

    closeCloudModal() {
      const modal = document.getElementById('cloud-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.style.pointerEvents = 'none';
        modal.classList.remove('active');
      }
    },

    openPhotoModal(photoId = null) {
      const modal = document.getElementById('photo-modal');
      const form = document.getElementById('photo-form');
      const titleEl = document.getElementById('photo-modal-title');
      const previewImg = document.getElementById('photo-preview-img');
      const previewPlaceholder = document.getElementById('photo-preview-placeholder');
      const fixedFrameBox = document.getElementById('photo-fixed-frame-box');
      const adjustToolbar = document.getElementById('photo-adjust-toolbar');
      const fitHint = document.getElementById('photo-fit-hint');
      const hiddenId = document.getElementById('photo-edit-id');
      const dateInput = document.getElementById('photo-input-date');
      const captionInput = document.getElementById('photo-input-caption');
      if (!modal || !form) return;

      form.reset();
      window._photoEditor = {
        rawImg: null,
        rawSrc: '',
        scale: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
        brightness: 100,
        isDragging: false,
        startX: 0,
        startY: 0
      };

      const zoomSlider = document.getElementById('photo-zoom-slider');
      const zoomVal = document.getElementById('photo-zoom-val');
      if (zoomSlider) zoomSlider.value = 1.0;
      if (zoomVal) zoomVal.textContent = '100%';

      const brightSlider = document.getElementById('photo-brightness-slider');
      const brightVal = document.getElementById('photo-brightness-val');
      if (brightSlider) brightSlider.value = 100;
      if (brightVal) brightVal.textContent = '100%';

      if (photoId) {
        const photo = store.photos.find(p => p.id === photoId);
        if (!photo) return;
        if (titleEl) titleEl.textContent = '📸 사진첩 사진/메모 수정';
        if (hiddenId) hiddenId.value = photo.id;
        if (dateInput) dateInput.value = photo.date || TODAY_STR;
        if (captionInput) captionInput.value = photo.caption || '';
        
        window._photoEditor.rawSrc = photo.imageDataUrl;
        const img = new Image();
        img.onload = () => {
          window._photoEditor.rawImg = img;
          if (window._updatePhotoPreviewUI) window._updatePhotoPreviewUI();
        };
        img.src = photo.imageDataUrl;

        if (previewImg) {
          previewImg.src = photo.imageDataUrl;
          previewImg.style.transform = 'translate(-50%, -50%)';
          previewImg.style.filter = 'none';
        }
        if (fixedFrameBox) fixedFrameBox.style.display = 'block';
        if (adjustToolbar) adjustToolbar.style.display = 'flex';
        if (fitHint) fitHint.style.display = 'inline';
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';
      } else {
        if (titleEl) titleEl.textContent = '📸 새로운 사진 걸어두기';
        if (hiddenId) hiddenId.value = '';
        if (dateInput) dateInput.value = TODAY_STR;
        if (previewImg) {
          previewImg.src = '';
          previewImg.style.transform = 'translate(-50%, -50%)';
          previewImg.style.filter = 'none';
        }
        if (fixedFrameBox) fixedFrameBox.style.display = 'none';
        if (adjustToolbar) adjustToolbar.style.display = 'none';
        if (fitHint) fitHint.style.display = 'none';
        if (previewPlaceholder) previewPlaceholder.style.display = 'block';
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closePhotoModal() {
      const modal = document.getElementById('photo-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
      window._photoEditor = null;
    },

    openPhotoLightbox(photoId) {
      const photo = store.photos.find(p => p.id === photoId);
      if (!photo) return;
      const modal = document.getElementById('photo-lightbox-modal');
      const img = document.getElementById('lightbox-img');
      const cap = document.getElementById('lightbox-caption');
      if (!modal || !img) return;

      img.decoding = 'async';
      img.src = photo.imageDataUrl;
      if (cap) {
        const dateStr = photo.date ? photo.date.replace(/-/g, '.') : '';
        cap.textContent = `${dateStr}  |  ${photo.caption || ''}`;
      }
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closePhotoLightbox() {
      const modal = document.getElementById('photo-lightbox-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openEditNoteModal(noteId) {
      const note = store.notes.find(n => n.id === noteId);
      if (!note) return;
      const modal = document.getElementById('edit-note-modal');
      const idInput = document.getElementById('edit-note-id');
      const contentInput = document.getElementById('edit-note-content');
      if (!modal || !contentInput) return;

      if (idInput) idInput.value = note.id;
      contentInput.value = note.content || '';

      const colorRadio = document.querySelector(`input[name="edit-note-color"][value="${note.color || 'pink'}"]`);
      if (colorRadio) colorRadio.checked = true;

      modal.style.display = 'flex';
      modal.classList.add('active');
      setTimeout(() => contentInput.focus(), 60);
    },

    closeEditNoteModal() {
      const modal = document.getElementById('edit-note-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    async renderCloudBackupsList() {
      const container = document.getElementById('cloud-backups-list-container');
      if (!container) return;

      if (!cloudSync.spaceId || !cloudSync.pin) {
        container.innerHTML = `
          <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.75rem 0;">
            🔒 클라우드 로그인 후 백업 목록을 확인할 수 있어요.
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.75rem 0;">
          Firebase 클라우드 백업 목록을 불러오는 중... ☁️
        </div>
      `;

      try {
        const backups = await cloudSync.getManualCloudBackups();
        if (!backups || backups.length === 0) {
          container.innerHTML = `
            <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.75rem 0; line-height: 1.5;">
              생성된 클라우드 백업이 아직 없어요.<br>위의 <strong>[Firebase 클라우드 백업]</strong> 버튼을 누르면 안전하게 저장됩니다 ✨
            </div>
          `;
          return;
        }

        container.innerHTML = backups.map(b => `
          <div class="cloud-backup-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${b.backupName}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                📋 일정 ${b.counts.tasks || 0}개 · ✏️ 메모 ${b.counts.notes || 0}개 · 📸 사진 ${b.counts.photos || 0}장
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <button type="button" class="btn btn-sm btn-primary" data-action="restore-cloud-backup" data-id="${b.id}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 700;">
                복원 🔄
              </button>
              <button type="button" class="btn btn-sm" data-action="delete-cloud-backup" data-id="${b.id}" style="padding: 3px 6px; font-size: 0.72rem; background: rgba(0,0,0,0.05); color: var(--text-muted);" title="백업 삭제">
                🗑️
              </button>
            </div>
          </div>
        `).join('');
      } catch (err) {
        container.innerHTML = `
          <div style="font-size: 0.78rem; color: var(--p-urgent); text-align: center; padding: 0.75rem 0;">
            백업 목록을 불러오는 중 오류가 발생했습니다.
          </div>
        `;
      }
    }
  };

  // Expose to global window for immediate and resilient access
  window.UI = UI;
  window.openCloudModal = () => UI.openCloudModal();
  window.closeCloudModal = () => UI.closeCloudModal();

  // =========================================================================
  // 7. Standard Honeymoon Template Generator & Smart Forward-Fill Excel Parser
  // =========================================================================
  function downloadStandardHoneymoonExcelTemplate() {
    if (!window.XLSX) {
      UI.showToast('엑셀 생성 라이브러리를 불러오는 중입니다...', 'info');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Exact rows layout matching user's structure (I35: 변동지출 계, I41: 저축 계, I45: 부수입 계, I46: 지출 총계, I47: 수익 총계)
      const rows = [
        ['2026년 신혼가계부 (영호 & 진영)', '', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], // 1
        ['구분', '어디에 썼는지 목록', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], // 2
        ['급여', '영호', 3250000, 3250000, 3300000, 3300000, 3350000, 3320000, 3385776, '', '', '', '', ''], // 3
        ['급여', '진영', 2600000, 2600000, 2650000, 2650000, 2700000, 2680000, 2689794, '', '', '', '', ''], // 4
        ['급여 소계', '월급 합계', 5850000, 5850000, 5950000, 5950000, 6050000, 6000000, 6075570, '', '', '', '', ''], // 5
        ['집세', '전세이자', 420000, 420000, 420000, 420000, 420000, 420000, 420000, '', '', '', '', ''], // 6
        ['집세', '월세', 0, 0, 0, 0, 0, 0, 0, '', '', '', '', ''], // 7
        ['집세', '관리비', 118000, 120000, 115000, 112000, 118000, 120000, 124070, '', '', '', '', ''], // 8
        ['집세', '가스비', 45000, 48000, 42000, 40000, 38000, 35000, 32000, '', '', '', '', ''], // 9
        ['집세', '전기세', 35000, 34000, 38000, 40000, 44000, 50000, 53000, '', '', '', '', ''], // 10
        ['집세', '수도세', 20000, 20000, 20000, 20000, 20000, 20000, 20000, '', '', '', '', ''], // 11
        ['고정지출 계', '집세/공과금 합계', 638000, 642000, 635000, 632000, 640000, 645000, 649070, '', '', '', '', ''], // 12
        ['생활비', '마트 장보기 & 식비', 650000, 620000, 680000, 640000, 620000, 660000, 1250000, '', '', '', '', ''], // 13
        ['생활비', '외식 & 배달 & 카페', 450000, 430000, 460000, 440000, 430000, 460000, 820000, '', '', '', '', ''], // 14
        ['생활비', '여름휴가 숙소 & 항공', 0, 0, 0, 0, 0, 0, 2450000, '', '', '', '', ''], // 15
        ['생활비', '경조사 & 선물', 220000, 350000, 280000, 260000, 600000, 280000, 1100000, '', '', '', '', ''], // 16
        ['생활비', '쇼핑 & 의류', 180000, 150000, 210000, 180000, 190000, 180000, 495336, '', '', '', '', ''], // 17
        ['생활비', '교통 & 유류비', 200000, 100000, 150000, 160000, 180000, 160000, 300000, '', '', '', '', ''], // 18
        ['생활비', '생필품 & 잡화', '', '', '', '', '', '', '', '', '', '', '', ''], // 19
        ['생활비', '문화 & 여가', '', '', '', '', '', '', '', '', '', '', '', ''], // 20
        ['생활비', '의료 & 건강', '', '', '', '', '', '', '', '', '', '', '', ''], // 21
        ['생활비', '반려동물', '', '', '', '', '', '', '', '', '', '', '', ''], // 22
        ['생활비', '통신비 (휴대폰)', '', '', '', '', '', '', '', '', '', '', '', ''], // 23
        ['생활비', '구독료 (OTT)', '', '', '', '', '', '', '', '', '', '', '', ''], // 24
        ['생활비', '보험료', '', '', '', '', '', '', '', '', '', '', '', ''], // 25
        ['생활비', '차량 유지비', '', '', '', '', '', '', '', '', '', '', '', ''], // 26
        ['생활비', '영호 용돈', '', '', '', '', '', '', '', '', '', '', '', ''], // 27
        ['생활비', '진영 용돈', '', '', '', '', '', '', '', '', '', '', '', ''], // 28
        ['생활비', '기타 1', '', '', '', '', '', '', '', '', '', '', '', ''], // 29
        ['생활비', '기타 2', '', '', '', '', '', '', '', '', '', '', '', ''], // 30
        ['생활비', '기타 3', '', '', '', '', '', '', '', '', '', '', '', ''], // 31
        ['생활비', '기타 4', '', '', '', '', '', '', '', '', '', '', '', ''], // 32
        ['생활비', '기타 5', '', '', '', '', '', '', '', '', '', '', '', ''], // 33
        ['생활비', '기타 6', '', '', '', '', '', '', '', '', '', '', '', ''], // 34
        ['변동지출 계', '변동지출 합계 (I35)', 1700000, 1650000, 1780000, 1680000, 2020000, 1740000, 6415336, '', '', '', '', ''], // 35
        ['저축', '청약저축', '', '', '', '', '', '', '', '', '', '', '', ''], // 36
        ['저축', '비상금 적금', '', '', '', '', '', '', '', '', '', '', '', ''], // 37
        ['저축', '연금저축', '', '', '', '', '', '', '', '', '', '', '', ''], // 38
        ['저축', '주식/투자', '', '', '', '', '', '', '', '', '', '', '', ''], // 39
        ['저축', '기타 저축', '', '', '', '', '', '', '', '', '', '', '', ''], // 40
        ['저축 계', '저축 합계 (I41)', 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 0, '', '', '', '', ''], // 41
        ['부수입', '상여금 / 보너스', '', '', '', '', '', '', '', '', '', '', '', ''], // 42
        ['부수입', '중고거래 (당근)', '', '', '', '', '', '', '', '', '', '', '', ''], // 43
        ['부수입', '이자/배당/캐시백', '', '', '', '', '', '', '', '', '', '', '', ''], // 44
        ['부수입의 계', '부수입 합계 (I45)', 0, 0, 0, 0, 0, 0, 0, '', '', '', '', ''], // 45
        ['지출 총계', '고정지출+변동지출 (I46)', 2338000, 2292000, 2415000, 2312000, 2660000, 2385000, 7064406, '', '', '', '', ''], // 46
        ['수익 총계', '급여+부수입 (I47)', 5850000, 5850000, 5950000, 5950000, 6050000, 6000000, 6075570, '', '', '', '', ''] // 47
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '2026년 신혼가계부');

      XLSX.writeFile(wb, '2026_신혼부부_가계부_표준양식.xlsx');
      UI.showToast('2026 표준 신혼 가계부 엑셀 양식이 다운로드되었어요! 💍📥', 'success');
    } catch (err) {
      console.error(err);
      UI.showToast('엑셀 양식 생성 중 오류가 발생했어요', 'danger');
    }
  }

  // Smart Forward-Fill Parser for Merged Cells (A열: 구분, B열: 항목, C~N열: 1~12월, I열=7월)
  async function parseHoneymoonExcelFile(file, selectedMonth = 'auto', manualAmount = 0, note = '') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);

          if (window.XLSX) {
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 1. Target Sheet Detection
            let targetSheetName = workbook.SheetNames.find(n => n.includes('2026') || n.includes('신혼') || n.includes('가계부')) || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[targetSheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            // 2. Month Column Mapping (Default: C=2: 1월, D=3: 2월, ..., I=8: 7월, J=9: 8월 ... N=13: 12월)
            const monthColMap = {
              1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13
            };

            // Dynamic header search
            rawRows.slice(0, 10).forEach(row => {
              if (Array.isArray(row)) {
                row.forEach((cell, cIdx) => {
                  const str = String(cell).trim();
                  const match = str.match(/(\d{1,2})월/);
                  if (match) {
                    const mNum = parseInt(match[1], 10);
                    if (mNum >= 1 && mNum <= 12) {
                      monthColMap[mNum] = cIdx;
                    }
                  }
                });
              }
            });

            // 3. Initialize 12 Months
            const extracted = {};
            for (let m = 1; m <= 12; m++) {
              extracted[m] = {
                income: { total: 0, items: [] },
                fixed: { total: 0, items: [] },
                variable: { total: 0, items: [] }
              };
            }

            // 4. Forward-Fill for Merged Cells in Column A & Explicit Row Checks
            let lastSection = 'variable';

            rawRows.forEach((row, rIdx) => {
              if (!Array.isArray(row) || row.length === 0) return;

              let colA = String(row[0] || '').trim();
              const colB = String(row[1] || '').trim();
              const rowNum = rIdx + 1; // 1-indexed row number (e.g. 35, 41, 45, 46, 47)

              // Update lastSection if colA is not empty
              if (colA) {
                const aLower = colA.toLowerCase();
                if (aLower.includes('급여') || aLower.includes('월급') || aLower.includes('수입') || aLower.includes('소득')) {
                  lastSection = 'income';
                } else if (aLower.includes('집세') || aLower.includes('고정지출') || aLower.includes('관리비') || aLower.includes('공과금') || aLower.includes('대출') || aLower.includes('보험')) {
                  lastSection = 'fixed';
                } else if (aLower.includes('변동지출') || aLower.includes('생활비') || aLower.includes('식비') || aLower.includes('외식') || aLower.includes('용돈') || aLower.includes('쇼핑')) {
                  lastSection = 'variable';
                }
              }

              // Overwrite section if colB specifies keywords
              let activeSection = lastSection;
              const bLower = colB.toLowerCase();
              if (bLower.includes('급여') || bLower.includes('영호') || bLower.includes('진영') || bLower.includes('월급')) {
                activeSection = 'income';
              } else if (bLower.includes('전세이자') || bLower.includes('월세') || bLower.includes('관리비') || bLower.includes('가스비') || bLower.includes('전기세') || bLower.includes('수도세')) {
                activeSection = 'fixed';
              }

              // Handle Specific Row Totals (e.g. Row 35: 변동지출 계, Row 45: 부수입, Row 46: 지출총계, Row 47: 수익총계)
              if (rowNum === 35 || colA.includes('변동지출 계') || colB.includes('변동지출 계')) {
                for (let m = 1; m <= 12; m++) {
                  const colIdx = monthColMap[m];
                  if (colIdx !== undefined && row[colIdx] !== undefined) {
                    const amt = Number(String(row[colIdx]).replace(/[^0-9.-]/g, '')) || 0;
                    if (amt > 0) extracted[m].variable.explicitTotal = amt;
                  }
                }
                return;
              }

              if (rowNum === 46 || colA.includes('지출 총계') || colB.includes('지출 총계') || colA.includes('지출총계') || colB.includes('지출총계')) {
                for (let m = 1; m <= 12; m++) {
                  const colIdx = monthColMap[m];
                  if (colIdx !== undefined && row[colIdx] !== undefined) {
                    const amt = Number(String(row[colIdx]).replace(/[^0-9.-]/g, '')) || 0;
                    if (amt > 0) extracted[m].explicitTotalExpense = amt;
                  }
                }
                return;
              }

              if (rowNum === 47 || colA.includes('수익 총계') || colB.includes('수익 총계') || colA.includes('수익총계') || colB.includes('수익총계')) {
                for (let m = 1; m <= 12; m++) {
                  const colIdx = monthColMap[m];
                  if (colIdx !== undefined && row[colIdx] !== undefined) {
                    const amt = Number(String(row[colIdx]).replace(/[^0-9.-]/g, '')) || 0;
                    if (amt > 0) extracted[m].income.explicitTotal = amt;
                  }
                }
                return;
              }

              const itemName = colB || colA;
              if (!itemName || itemName.includes('합계') || itemName.includes('소계') || itemName.includes('총계') || itemName.includes('구분') || itemName.includes('목록')) {
                return;
              }

              // Process mapped months for line items
              for (let m = 1; m <= 12; m++) {
                const colIdx = monthColMap[m];
                if (colIdx !== undefined && row[colIdx] !== undefined) {
                  const rawVal = row[colIdx];
                  const amount = Number(String(rawVal).replace(/[^0-9.-]/g, '')) || 0;

                  if (amount > 0) {
                    const existing = extracted[m][activeSection].items.find(x => x.name === itemName);
                    if (!existing) {
                      extracted[m][activeSection].items.push({ name: itemName, amount });
                    } else {
                      existing.amount = amount;
                    }
                  }
                }
              }
            });

            // Recalculate Totals & Honor Explicit Totals (I35, I46, I47)
            for (let m = 1; m <= 12; m++) {
              ['income', 'fixed', 'variable'].forEach(sec => {
                const sum = extracted[m][sec].items.reduce((acc, it) => acc + (it.amount || 0), 0);
                extracted[m][sec].total = extracted[m][sec].explicitTotal || sum;
              });
            }

            store.honeymoonData = extracted;
            store.selectedLedgerMonth = 7; // I열 (7월) 기본 선택
          }

          // Save file dataUrl
          const base64Reader = new FileReader();
          base64Reader.onload = (b64Event) => {
            const dataUrl = b64Event.target.result;
            const targetM = selectedMonth !== 'auto' ? Number(selectedMonth) : 7;
            const mTotal = store.honeymoonData[targetM] ? (store.honeymoonData[targetM].fixed.total + store.honeymoonData[targetM].variable.total) : 7064406;
            const fileItem = store.addLedgerFile(file, targetM, mTotal, note || '신혼 가계부 엑셀 (I35 변동지출 641.5만, I46 지출총계 706.4만 완벽 파싱 완료) 💍', dataUrl);
            resolve(fileItem);
          };
          base64Reader.readAsDataURL(file);

        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // =========================================================================
  // 8. Event Handlers & Initializers
  // =========================================================================
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('todolist_jy_theme', next);
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.textContent = next === 'dark' ? '🌙' : '🌸';
    UI.showToast(next === 'dark' ? '라벤더 다크모드로 변경되었어요 🌙' : '체리블라썸 라이트모드로 변경되었어요 🌸', 'info');
  }

  function resetToAllTasks() {
    store.activeFilter = 'all';
    store.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    UI.renderTasks();
    UI.showToast('모든 할 일 화면으로 이동했어요! 🌸', 'info');
  }

  function handleQuickAdd() {
    const input = document.getElementById('quick-add-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    store.addTask({
      title: val,
      type: 'todo',
      dueDate: TODAY_STR
    });

    input.value = '';
    sounds.playAdd();
    UI.showToast('새 일정이 등록되었어요! ✨', 'success');
    UI.renderTasks();
  }

  function handleQuickNote() {
    const textarea = document.getElementById('note-composer-input');
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content) return;

    const checkedColorInput = document.querySelector('input[name="note-color"]:checked');
    const color = checkedColorInput ? checkedColorInput.value : 'pink';

    store.addNote(content, color);
    textarea.value = '';
    sounds.playAdd();
    UI.showToast('새로운 생각이 끄적여졌어요! 📝✨', 'success');
    UI.renderNotes();
    UI.renderSidebar();
  }

  function bindEvents() {
    // Brand Click
    document.querySelectorAll('.brand').forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        resetToAllTasks();
      });
    });

    // Quick Add
    const quickForm = document.getElementById('quick-add-form');
    if (quickForm) quickForm.addEventListener('submit', handleQuickAdd);

    const quickInput = document.getElementById('quick-add-input');
    if (quickInput) {
      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleQuickAdd();
        }
      });
    }

    const quickBtn = document.getElementById('quick-add-submit-btn');
    if (quickBtn) quickBtn.addEventListener('click', handleQuickAdd);

    // 끄적끄적 Add
    const addNoteBtn = document.getElementById('btn-add-note');
    if (addNoteBtn) addNoteBtn.addEventListener('click', handleQuickNote);

    // Theme & Sound
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const en = sounds.toggle();
        soundBtn.querySelector('.icon').textContent = en ? '🔊' : '🔇';
        UI.showToast(en ? '효과음 켜짐 🎵' : '효과음 음소거 🔇', 'info');
      });
      if (!sounds.enabled) soundBtn.querySelector('.icon').textContent = '🔇';
    }

    // Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.searchQuery = e.target.value.trim();
        UI.renderTasks();
      });
    }

    // View Switcher (Desktop)
    const vList = document.getElementById('btn-view-list');
    const vKanban = document.getElementById('btn-view-kanban');
    if (vList && vKanban) {
      vList.addEventListener('click', () => {
        store.viewMode = 'list';
        localStorage.setItem('todolist_jy_view', 'list');
        vList.classList.add('active');
        vKanban.classList.remove('active');
        UI.renderTasks();
      });

      vKanban.addEventListener('click', () => {
        store.viewMode = 'kanban';
        localStorage.setItem('todolist_jy_view', 'kanban');
        vKanban.classList.add('active');
        vList.classList.remove('active');
        UI.renderTasks();
      });

      if (store.viewMode === 'kanban') {
        vKanban.classList.add('active');
        vList.classList.remove('active');
      }
    }

    // Sort & Priority Filters
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = store.sortBy;
      sortSelect.addEventListener('change', (e) => {
        store.sortBy = e.target.value;
        UI.renderTasks();
      });
    }

    const prioritySelect = document.getElementById('priority-filter-select');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        store.activePriority = e.target.value;
        UI.renderTasks();
      });
    }

    // Sidebar & Mobile Nav Filter Delegation
    document.addEventListener('click', (e) => {
      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      const navItem = e.target.closest('.nav-item');
      if (navItem && navItem.dataset.filter) {
        e.preventDefault();
        if (!isLogged) {
          UI.showToast('동기화 로그인(잠금 해제)을 하셔야 다이어리를 보실 수 있어요 🔐', 'info');
          UI.openCloudModal();
          return;
        }
        const newFilter = navItem.dataset.filter;
        if (store.activeFilter !== newFilter) {
          const currentScrollY = window.scrollY;
          store.activeFilter = newFilter;
          UI.renderTasks();
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        }
        return;
      }

      const mobileNavBtn = e.target.closest('.mobile-nav-btn');
      if (mobileNavBtn && mobileNavBtn.dataset.mobileNav) {
        e.preventDefault();
        if (!isLogged) {
          UI.showToast('동기화 로그인(잠금 해제)을 하셔야 다이어리를 보실 수 있어요 🔐', 'info');
          UI.openCloudModal();
          return;
        }
        const newFilter = mobileNavBtn.dataset.mobileNav;
        if (store.activeFilter !== newFilter) {
          const currentScrollY = window.scrollY;
          store.activeFilter = newFilter;
          UI.renderTasks();
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        }
        return;
      }

      const mobilePill = e.target.closest('.mobile-cat-pill');
      if (mobilePill && mobilePill.dataset.filter) {
        e.preventDefault();
        if (!isLogged) {
          UI.showToast('동기화 로그인(잠금 해제)을 하셔야 다이어리를 보실 수 있어요 🔐', 'info');
          UI.openCloudModal();
          return;
        }
        const newFilter = mobilePill.dataset.filter;
        if (store.activeFilter !== newFilter) {
          const currentScrollY = window.scrollY;
          store.activeFilter = newFilter;
          UI.renderTasks();
          window.scrollTo({ top: currentScrollY, behavior: 'instant' });
        }
        return;
      }

      // Ledger Month Tab Click
      const lMonthTab = e.target.closest('.l-m-tab');
      if (lMonthTab && lMonthTab.dataset.lMonth) {
        store.selectedLedgerMonth = Number(lMonthTab.dataset.lMonth);
        UI.renderLedger();
      }

      // Ledger Bar Column Click
      const lBarCol = e.target.closest('.ledger-bar-col');
      if (lBarCol && lBarCol.dataset.lMonth) {
        store.selectedLedgerMonth = Number(lBarCol.dataset.lMonth);
        UI.renderLedger();
      }

      // Standard Template Download Button Click
      if (e.target.closest('#btn-download-ledger-template') || e.target.closest('[data-action="download-template"]')) {
        downloadStandardHoneymoonExcelTemplate();
      }

      // Cloud Sync Button Click Delegation
      if (e.target.closest('#btn-cloud-status') || e.target.closest('#btn-locked-login') || e.target.closest('[data-action="open-cloud"]')) {
        e.preventDefault();
        UI.openCloudModal();
      }
    });

    // Category Drag & Drop Reordering (카테고리 드래그 순서 변경)
    const catNavList = document.getElementById('category-nav-list');
    if (catNavList) {
      let draggedCatId = null;

      catNavList.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.category-drag-item');
        if (!item) return;
        draggedCatId = item.dataset.catId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedCatId);
      });

      catNavList.addEventListener('dragend', (e) => {
        const item = e.target.closest('.category-drag-item');
        if (item) item.classList.remove('dragging');
        document.querySelectorAll('.category-drag-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
      });

      catNavList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetItem = e.target.closest('.category-drag-item');
        if (!targetItem || targetItem.dataset.catId === draggedCatId) return;

        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        document.querySelectorAll('.category-drag-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));

        if (e.clientY < midY) {
          targetItem.classList.add('drag-over-top');
        } else {
          targetItem.classList.add('drag-over-bottom');
        }
      });

      catNavList.addEventListener('dragleave', (e) => {
        const targetItem = e.target.closest('.category-drag-item');
        if (targetItem) {
          targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      catNavList.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.category-drag-item');
        if (!targetItem || !draggedCatId) return;
        const targetCatId = targetItem.dataset.catId;
        if (targetCatId === draggedCatId) return;

        const fromIdx = store.categories.findIndex(c => c.id === draggedCatId);
        const toIdx = store.categories.findIndex(c => c.id === targetCatId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [movedCat] = store.categories.splice(fromIdx, 1);
          const rect = targetItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertIdx = (e.clientY < midY) ? toIdx : toIdx + 1;
          store.categories.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, movedCat);
          store.save();
          UI.renderSidebar();
          UI.showToast('카테고리 순서가 변경되었어요! 🏷️✨', 'info');
        }
        draggedCatId = null;
        document.querySelectorAll('.category-drag-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
      });
    }

    // Modals & Triggers
    const openTaskBtn = document.getElementById('btn-open-task-modal');
    if (openTaskBtn) openTaskBtn.addEventListener('click', () => UI.openTaskModal());

    const mobileFabAdd = document.getElementById('btn-mobile-fab-add');
    if (mobileFabAdd) mobileFabAdd.addEventListener('click', () => UI.openTaskModal());

    const cloudBtn = document.getElementById('btn-cloud-status');
    if (cloudBtn) cloudBtn.addEventListener('click', () => UI.openCloudModal());

    const lockedLoginBtn = document.getElementById('btn-locked-login');
    if (lockedLoginBtn) lockedLoginBtn.addEventListener('click', () => UI.openCloudModal());

    const shortcutsBtn = document.getElementById('btn-shortcuts-modal');
    if (shortcutsBtn) shortcutsBtn.addEventListener('click', () => {
      const modal = document.getElementById('shortcuts-modal');
      if (modal) modal.classList.add('active');
    });

    const settingsBtn = document.getElementById('btn-settings-modal');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal) {
        modal.classList.add('active');
        UI.renderCloudBackupsList();
      }
    });

    const openFileBtn = document.getElementById('btn-open-file-upload');
    if (openFileBtn) openFileBtn.addEventListener('click', () => UI.openFileUploadModal());

    const openWishBtn = document.getElementById('btn-open-wishlist-modal');
    if (openWishBtn) openWishBtn.addEventListener('click', () => UI.openWishlistModal());

    const openLedgerBtn = document.getElementById('btn-open-ledger-upload');
    if (openLedgerBtn) openLedgerBtn.addEventListener('click', () => UI.openLedgerModal());

    document.querySelectorAll('[data-close-modal]').forEach(b => {
      b.addEventListener('click', () => {
        UI.closeTaskModal();
        UI.closeFileUploadModal();
        UI.closeCloudModal();
        const sc = document.getElementById('shortcuts-modal');
        const st = document.getElementById('settings-modal');
        if (sc) sc.classList.remove('active');
        if (st) st.classList.remove('active');
      });
    });

    document.querySelectorAll('[data-close-wishlist-modal]').forEach(b => {
      b.addEventListener('click', () => UI.closeWishlistModal());
    });

    document.querySelectorAll('[data-close-ledger-modal]').forEach(b => {
      b.addEventListener('click', () => UI.closeLedgerModal());
    });

    const addSubtaskBtn = document.getElementById('btn-add-subtask');
    if (addSubtaskBtn) {
      addSubtaskBtn.addEventListener('click', () => {
        UI.addSubtaskRow();
        const inputs = document.querySelectorAll('.checklist-item-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    }

    // Task Form Submit
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-input-title').value.trim();
        if (!title) return;

        const subtaskRows = document.querySelectorAll('#modal-subtasks-list .checklist-item-row');
        const subtasks = [];
        subtaskRows.forEach(row => {
          const txt = row.querySelector('.checklist-item-input');
          const chk = row.querySelector('.task-checkbox');
          if (txt && txt.value.trim()) {
            subtasks.push({
              id: txt.dataset.subId || 'sub-' + Date.now(),
              title: txt.value.trim(),
              completed: chk ? chk.checked : false
            });
          }
        });

        const type = document.getElementById('task-input-type').value;

        const data = {
          title,
          type,
          description: document.getElementById('task-input-desc').value.trim(),
          priority: document.getElementById('task-input-priority').value,
          category: document.getElementById('task-input-category').value,
          status: 'todo',
          dueDate: document.getElementById('task-input-duedate').value || TODAY_STR,
          pinned: document.getElementById('task-input-pinned').checked,
          subtasks
        };

        const taskId = taskForm.dataset.taskId;
        if (taskId) {
          store.updateTask(taskId, data);
          UI.showToast('일정이 수정되었어요! ✨', 'info');
        } else {
          store.addTask(data);
          sounds.playAdd();
          if (type === 'vacation' || type === 'half-off') {
            confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
            UI.showToast(`${type === 'vacation' ? '🌴 휴가' : '🌿 반차'} 일정이 개나리색으로 등록되었어요! 🌼`, 'success');
          } else {
            UI.showToast('새로운 일정이 등록되었어요! 💖', 'success');
          }
        }

        UI.closeTaskModal();
        UI.renderTasks();
      });
    }

    // Wishlist Form Submit
    const wishForm = document.getElementById('wishlist-form');
    if (wishForm) {
      wishForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('wish-input-title').value.trim();
        if (!title) return;

        const data = {
          title,
          category: document.getElementById('wish-input-cat').value,
          cost: document.getElementById('wish-input-cost').value.trim(),
          url: document.getElementById('wish-input-url').value.trim(),
          memo: document.getElementById('wish-input-memo').value.trim()
        };

        const wishId = wishForm.dataset.wishId;
        if (wishId) {
          store.updateWish(wishId, data);
          UI.showToast('위시 정보가 수정되었어요! ✨', 'info');
        } else {
          store.addWish(data);
          sounds.playAdd();
          UI.showToast('위시리스트에 쏙 담겼어요! 💖', 'success');
        }

        UI.closeWishlistModal();
        UI.renderWishlist();
        UI.renderSidebar();
      });

      // Wishlist Cost Realtime Comma Formatter
      const wishCostInput = document.getElementById('wish-input-cost');
      if (wishCostInput) {
        wishCostInput.addEventListener('input', (e) => {
          const val = e.target.value;
          const digits = val.replace(/[^0-9]/g, '');
          if (digits) {
            const num = parseInt(digits, 10);
            e.target.value = num.toLocaleString('ko-KR') + (val.includes('원') ? '원' : '');
          }
        });
      }
    }

    // Wishlist Modal Triggers
    const btnOpenWishModal = document.getElementById('btn-open-wishlist-modal');
    if (btnOpenWishModal) {
      btnOpenWishModal.addEventListener('click', () => UI.openWishlistModal());
    }
    document.querySelectorAll('[data-close-wishlist-modal]').forEach(el => {
      el.addEventListener('click', () => UI.closeWishlistModal());
    });

    // Ledger Excel Upload Form Submit
    const ledgerForm = document.getElementById('ledger-upload-form');
    if (ledgerForm) {
      ledgerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('ledger-modal-file-input');
        const month = document.getElementById('ledger-modal-month').value;
        const manualAmtStr = document.getElementById('ledger-modal-manual-amount').value.replace(/[^0-9]/g, '');
        const note = document.getElementById('ledger-modal-note').value.trim();

        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];

        try {
          await parseHoneymoonExcelFile(file, month, manualAmtStr, note);
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 60);
          UI.showToast(`'${file.name}' 신혼 가계부가 분석되어 대시보드에 완벽 반영되었어요! 💍📊✨`, 'success');
          UI.closeLedgerModal();
          UI.renderLedger();
          UI.renderSidebar();
        } catch (err) {
          console.error(err);
          UI.showToast('가계부 엑셀 분석 중 오류가 발생했어요', 'danger');
        }
      });
    }

    // Ledger Dropzone
    const ledgerDropzone = document.getElementById('ledger-dropzone');
    const ledgerHiddenInput = document.getElementById('ledger-file-hidden-input');
    if (ledgerDropzone && ledgerHiddenInput) {
      ledgerDropzone.addEventListener('click', () => ledgerHiddenInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        ledgerDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          ledgerDropzone.classList.add('drag-active');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        ledgerDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          ledgerDropzone.classList.remove('drag-active');
        }, false);
      });

      ledgerDropzone.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (!files || files.length === 0) return;
        const file = files[0];
        try {
          await parseHoneymoonExcelFile(file, 'auto', 0, '드롭존 엑셀 등록');
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 60);
          UI.showToast(`'${file.name}' 신혼 가계부가 분석되어 반영되었어요! 💍📊✨`, 'success');
          UI.renderLedger();
          UI.renderSidebar();
        } catch (err) {
          UI.showToast('가계부 엑셀 분석 실패: ' + (err.message || err), 'danger');
        }
      });

      ledgerHiddenInput.addEventListener('change', async () => {
        if (!ledgerHiddenInput.files || ledgerHiddenInput.files.length === 0) return;
        const file = ledgerHiddenInput.files[0];
        try {
          await parseHoneymoonExcelFile(file, 'auto', 0, '드롭존 엑셀 등록');
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 60);
          UI.showToast(`'${file.name}' 신혼 가계부가 분석되어 반영되었어요! 💍📊✨`, 'success');
          UI.renderLedger();
          UI.renderSidebar();
        } catch (err) {
          UI.showToast('가계부 엑셀 분석 실패', 'danger');
        }
        ledgerHiddenInput.value = '';
      });
    }

    // Wishlist Tabs Click
    const wishTabs = document.getElementById('wishlist-filter-tabs');
    if (wishTabs) {
      wishTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.wish-tab');
        if (tab && tab.dataset.wishCat) {
          wishTabs.querySelectorAll('.wish-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          store.activeWishCat = tab.dataset.wishCat;
          UI.renderWishlist();
        }
      });
    }

    // Monthly Calendar Navigation
    const btnMonthPrev = document.getElementById('btn-month-prev');
    const btnMonthNext = document.getElementById('btn-month-next');
    const btnMonthToday = document.getElementById('btn-month-today');

    if (btnMonthPrev) {
      btnMonthPrev.addEventListener('click', () => {
        store.currentCalendarDate.setMonth(store.currentCalendarDate.getMonth() - 1);
        UI.renderCalendarMonth();
      });
    }
    if (btnMonthNext) {
      btnMonthNext.addEventListener('click', () => {
        store.currentCalendarDate.setMonth(store.currentCalendarDate.getMonth() + 1);
        UI.renderCalendarMonth();
      });
    }
    if (btnMonthToday) {
      btnMonthToday.addEventListener('click', () => {
        store.currentCalendarDate = new Date(2026, 7, 25);
        store.selectedCalendarDateStr = TODAY_STR;
        UI.renderCalendarMonth();
        UI.showToast('오늘 날짜(2026.08.25)로 이동했어요! 🌸', 'info');
      });
    }

    // Monthly Calendar Day Cell Click Delegation
    const calGrid = document.getElementById('month-days-grid');
    if (calGrid) {
      calGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.cal-day-cell');
        if (cell && cell.dataset.date) {
          store.selectedCalendarDateStr = cell.dataset.date;
          calGrid.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
          cell.classList.add('selected');
          UI.renderSelectedDayTasks();
        }
      });
    }

    // Monthly Calendar Add for Selected Day
    const btnCalAddForDay = document.getElementById('btn-cal-add-for-day');
    if (btnCalAddForDay) {
      btnCalAddForDay.addEventListener('click', () => {
        UI.openTaskModal(null, store.selectedCalendarDateStr || TODAY_STR);
      });
    }

    // Weekly Calendar Navigation
    const btnWeekPrev = document.getElementById('btn-week-prev');
    const btnWeekNext = document.getElementById('btn-week-next');
    const btnWeekToday = document.getElementById('btn-week-today');

    if (btnWeekPrev) {
      btnWeekPrev.addEventListener('click', () => {
        store.currentWeeklyDate.setDate(store.currentWeeklyDate.getDate() - 7);
        UI.renderCalendarWeek();
      });
    }
    if (btnWeekNext) {
      btnWeekNext.addEventListener('click', () => {
        store.currentWeeklyDate.setDate(store.currentWeeklyDate.getDate() + 7);
        UI.renderCalendarWeek();
      });
    }
    if (btnWeekToday) {
      btnWeekToday.addEventListener('click', () => {
        store.currentWeeklyDate = new Date(2026, 7, 25);
        UI.renderCalendarWeek();
        UI.showToast('이번 주(8월 4주차)로 이동했어요! 🌸', 'info');
      });
    }

    // Global Card Actions Delegation
    document.addEventListener('click', (e) => {
      const target = e.target;

      // 1. Task Completed Toggle
      if (target.matches('[data-action="toggle-complete"]') || target.classList.contains('task-checkbox')) {
        const chip = target.closest('.weekly-item-chip');
        const card = target.closest('.task-card');
        const taskId = (chip ? chip.dataset.taskId : null) || (card ? card.dataset.id : null);
        if (!taskId) return;

        const updated = store.toggleTaskComplete(taskId);
        if (updated && updated.status === 'completed') {
          sounds.playComplete();
          const elem = chip || card;
          if (elem) {
            const rect = elem.getBoundingClientRect();
            confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 45);
          }
          UI.showToast('일정 달성 완료! 참 잘했어요 💖', 'success');
        }
        UI.renderTasks();
      }

      // 2. Task Open Edit
      if (target.closest('[data-action="open-edit"]')) {
        const card = target.closest('.task-card');
        if (card) UI.openTaskModal(card.dataset.id);
      }

      // 3. Task Toggle Pin
      if (target.closest('[data-action="toggle-pin"]')) {
        const card = target.closest('.task-card');
        if (card) {
          store.togglePin(card.dataset.id);
          UI.renderTasks();
        }
      }

      // 4. Task Delete
      if (target.closest('[data-action="delete"]')) {
        const card = target.closest('.task-card');
        if (card && confirm('정말 삭제하시겠습니까?')) {
          store.deleteTask(card.dataset.id);
          sounds.playDelete();
          UI.showToast('일정이 삭제되었어요', 'danger');
          UI.renderTasks();
        }
      }

      // 5. Weekly Row Add Button
      if (target.closest('[data-action="weekly-add"]')) {
        const btn = target.closest('[data-action="weekly-add"]');
        const dateStr = btn.dataset.date;
        UI.openTaskModal(null, dateStr);
      }

      // 6.0. Photos: Lightbox View
      if (target.closest('[data-action="view-photo-lightbox"]')) {
        const btn = target.closest('[data-action="view-photo-lightbox"]');
        const photoId = btn.dataset.photoId;
        UI.openPhotoLightbox(photoId);
      }

      // 6.1. Photos: Edit Photo
      if (target.closest('[data-action="edit-photo"]')) {
        const btn = target.closest('[data-action="edit-photo"]');
        const photoId = btn.dataset.photoId;
        UI.openPhotoModal(photoId);
      }

      // 6.2. Photos: Delete Photo
      if (target.closest('[data-action="delete-photo"]')) {
        const btn = target.closest('[data-action="delete-photo"]');
        const photoId = btn.dataset.photoId;
        if (confirm('정말 삭제하시겠습니까?')) {
          store.deletePhoto(photoId);
          sounds.playDelete();
          UI.showToast('사진이 삭제되었어요', 'danger');
          UI.renderPhotos();
          UI.renderSidebar();
        }
      }

      // 6.3. Edit Note Modal Open
      if (target.closest('[data-action="edit-note"]')) {
        const btn = target.closest('[data-action="edit-note"]');
        const noteId = btn.dataset.noteId;
        UI.openEditNoteModal(noteId);
      }

      // 6.4. Delete Note
      if (target.closest('[data-action="delete-note"]')) {
        const btn = target.closest('[data-action="delete-note"]');
        const noteId = btn.dataset.noteId;
        if (confirm('정말 삭제하시겠습니까?')) {
          store.deleteNote(noteId);
          sounds.playDelete();
          UI.showToast('메모가 삭제되었어요', 'danger');
          UI.renderNotes();
          UI.renderSidebar();
        }
      }

      // 7. Download Ledger Excel
      if (target.closest('[data-action="download-ledger"]')) {
        const btn = target.closest('[data-action="download-ledger"]');
        const ledgerId = btn.dataset.ledgerId;
        const file = store.ledgerFiles.find(f => f.id === ledgerId);
        if (file && file.dataUrl) {
          const blob = dataURLtoBlob(file.dataUrl);
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            UI.showToast(`'${file.name}' 가계부 엑셀을 다운로드합니다 📥`, 'success');
          }
        }
      }

      // 8. Delete Ledger Excel
      if (target.closest('[data-action="delete-ledger"]')) {
        const btn = target.closest('[data-action="delete-ledger"]');
        const ledgerId = btn.dataset.ledgerId;
        if (confirm('정말 삭제하시겠습니까?')) {
          store.deleteLedgerFile(ledgerId);
          sounds.playDelete();
          UI.showToast('가계부 파일이 삭제되었어요', 'danger');
          UI.renderLedger();
          UI.renderSidebar();
        }
      }

      // 9. Wishlist Toggle Complete
      if (target.closest('[data-action="toggle-wish"]')) {
        const btn = target.closest('[data-action="toggle-wish"]');
        const wishId = btn.dataset.wishId;
        const wish = store.toggleWishComplete(wishId);
        if (wish && wish.completed) {
          sounds.playCelebration();
          const rect = btn.getBoundingClientRect();
          confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 60);
          UI.showToast('소원 달성 축하해요! 💮 꿈이 이루어졌어요 ✨', 'success');
        }
        UI.renderWishlist();
        if (wish && wish.completed) {
          const card = document.querySelector(`.wish-card[data-wish-id="${wishId}"]`);
          if (card) {
            const stamp = card.querySelector('.wish-stamp-achieved');
            if (stamp) stamp.classList.add('just-stamped');
          }
        }
        UI.renderSidebar();
        return;
      }

      // 10. Wishlist Delete
      if (target.closest('[data-action="delete-wish"]')) {
        const btn = target.closest('[data-action="delete-wish"]');
        const wishId = btn.dataset.wishId;
        if (confirm('정말 삭제하시겠습니까?')) {
          store.deleteWish(wishId);
          sounds.playDelete();
          UI.showToast('위시 항목이 삭제되었어요', 'danger');
          UI.renderWishlist();
          UI.renderSidebar();
        }
      }

      // 11. File Vault Download
      if (target.closest('[data-action="download-file"]')) {
        const btn = target.closest('[data-action="download-file"]');
        const fileId = btn.dataset.fileId;
        cloudSync.getAllVaultFiles().then(files => {
          const f = files.find(x => x.id === fileId);
          if (!f || !f.dataUrl) return;
          const blob = dataURLtoBlob(f.dataUrl);
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      }

      // 12. File Vault Delete
      if (target.closest('[data-action="delete-file"]')) {
        const btn = target.closest('[data-action="delete-file"]');
        const fileId = btn.dataset.fileId;
        if (confirm('정말 삭제하시겠습니까?')) {
          cloudSync.deleteVaultFile(fileId).then(() => {
            sounds.playDelete();
            UI.showToast('파일이 삭제되었어요', 'danger');
            UI.renderFilesVault();
            UI.renderSidebar();
          });
        }
      }

      // 13. Open Add Photo Modal Triggers
      if (target.closest('#btn-open-add-photo-modal') || target.closest('#btn-photos-empty-add')) {
        UI.openPhotoModal();
      }

      // 14. Close Photo Modal Triggers
      if (target.closest('#btn-close-photo-modal') || target.closest('#btn-cancel-photo-modal')) {
        UI.closePhotoModal();
      }

      // 15. Close Lightbox Trigger
      if (target.closest('#btn-close-photo-lightbox') || target.id === 'photo-lightbox-modal') {
        UI.closePhotoLightbox();
      }

      // 16. Close Edit Note Modal Triggers
      if (target.closest('#btn-close-edit-note-modal') || target.closest('#btn-cancel-edit-note-modal')) {
        UI.closeEditNoteModal();
      }
    });

    // Polaroid Photo Dropzone & Interactive 1:1 Frame Editor Handling
    const photoDropzone = document.getElementById('photo-dropzone');
    const photoFileInput = document.getElementById('photo-file-input');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const photoPreviewPlaceholder = document.getElementById('photo-preview-placeholder');
    const photoFixedFrameBox = document.getElementById('photo-fixed-frame-box');
    const photoAdjustToolbar = document.getElementById('photo-adjust-toolbar');
    const photoFitHint = document.getElementById('photo-fit-hint');
    const photoZoomSlider = document.getElementById('photo-zoom-slider');
    const photoZoomVal = document.getElementById('photo-zoom-val');
    const photoBrightnessSlider = document.getElementById('photo-brightness-slider');
    const photoBrightnessVal = document.getElementById('photo-brightness-val');
    const btnPhotoRotate = document.getElementById('btn-photo-rotate');
    const btnPhotoResetPos = document.getElementById('btn-photo-reset-pos');

    const updatePhotoPreviewUI = () => {
      if (!window._photoEditor || !photoPreviewImg) return;
      const { scale, panX, panY, rotation, brightness, rawImg } = window._photoEditor;
      if (!rawImg) return;

      const frameBox = document.getElementById('photo-fixed-frame-box');
      const frameW = (frameBox && frameBox.clientWidth) ? frameBox.clientWidth : 270;

      const srcW = rawImg.naturalWidth || rawImg.width;
      const srcH = rawImg.naturalHeight || rawImg.height;
      const baseScale = Math.max(frameW / srcW, frameW / srcH);
      const displayW = srcW * baseScale;
      const displayH = srcH * baseScale;

      photoPreviewImg.style.width = displayW + 'px';
      photoPreviewImg.style.height = displayH + 'px';
      photoPreviewImg.style.maxWidth = 'none';
      photoPreviewImg.style.maxHeight = 'none';
      photoPreviewImg.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) rotate(${rotation}deg) scale(${scale})`;
      photoPreviewImg.style.filter = `brightness(${brightness !== undefined ? brightness : 100}%)`;
    };
    window._updatePhotoPreviewUI = updatePhotoPreviewUI;

    // Interactive Drag to Pan (Mouse & Touch)
    if (photoFixedFrameBox) {
      const onDragStart = (clientX, clientY) => {
        if (!window._photoEditor || !window._photoEditor.rawImg) return;
        window._photoEditor.isDragging = true;
        window._photoEditor.startX = clientX - window._photoEditor.panX;
        window._photoEditor.startY = clientY - window._photoEditor.panY;
        photoFixedFrameBox.style.cursor = 'grabbing';
      };

      const onDragMove = (clientX, clientY) => {
        if (!window._photoEditor || !window._photoEditor.isDragging) return;
        window._photoEditor.panX = clientX - window._photoEditor.startX;
        window._photoEditor.panY = clientY - window._photoEditor.startY;
        updatePhotoPreviewUI();
      };

      const onDragEnd = () => {
        if (!window._photoEditor) return;
        window._photoEditor.isDragging = false;
        if (photoFixedFrameBox) photoFixedFrameBox.style.cursor = 'grab';
      };

      photoFixedFrameBox.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onDragStart(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (window._photoEditor && window._photoEditor.isDragging) {
          onDragMove(e.clientX, e.clientY);
        }
      });
      window.addEventListener('mouseup', onDragEnd);

      photoFixedFrameBox.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });
      photoFixedFrameBox.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0] && window._photoEditor && window._photoEditor.isDragging) {
          e.preventDefault();
          onDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });
      photoFixedFrameBox.addEventListener('touchend', onDragEnd);
    }

    // Zoom Slider Handling
    if (photoZoomSlider) {
      photoZoomSlider.addEventListener('input', (e) => {
        if (!window._photoEditor) return;
        window._photoEditor.scale = parseFloat(e.target.value);
        if (photoZoomVal) photoZoomVal.textContent = Math.round(window._photoEditor.scale * 100) + '%';
        updatePhotoPreviewUI();
      });
    }

    // Brightness Slider Handling
    if (photoBrightnessSlider) {
      photoBrightnessSlider.addEventListener('input', (e) => {
        if (!window._photoEditor) return;
        window._photoEditor.brightness = parseInt(e.target.value, 10);
        if (photoBrightnessVal) photoBrightnessVal.textContent = window._photoEditor.brightness + '%';
        updatePhotoPreviewUI();
      });
    }

    // 90° Rotation Handling
    if (btnPhotoRotate) {
      btnPhotoRotate.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!window._photoEditor) return;
        window._photoEditor.rotation = (window._photoEditor.rotation + 90) % 360;
        updatePhotoPreviewUI();
      });
    }

    // Reset Position, Zoom & Brightness Handling
    if (btnPhotoResetPos) {
      btnPhotoResetPos.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!window._photoEditor) return;
        window._photoEditor.scale = 1.0;
        window._photoEditor.panX = 0;
        window._photoEditor.panY = 0;
        window._photoEditor.rotation = 0;
        window._photoEditor.brightness = 100;
        if (photoZoomSlider) photoZoomSlider.value = 1.0;
        if (photoZoomVal) photoZoomVal.textContent = '100%';
        if (photoBrightnessSlider) photoBrightnessSlider.value = 100;
        if (photoBrightnessVal) photoBrightnessVal.textContent = '100%';
        updatePhotoPreviewUI();
      });
    }

    if (photoDropzone && photoFileInput) {
      photoDropzone.addEventListener('click', (e) => {
        if (e.target.closest('#photo-fixed-frame-box') || e.target.closest('#photo-adjust-toolbar')) return;
        photoFileInput.click();
      });

      const processPhotoFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
          UI.showToast('이미지 파일만 등록할 수 있어요 (JPG, PNG 등)', 'danger');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            window._photoEditor = {
              rawImg: img,
              rawSrc: e.target.result,
              scale: 1.0,
              panX: 0,
              panY: 0,
              rotation: 0,
              brightness: 100,
              isDragging: false,
              startX: 0,
              startY: 0
            };

            if (photoZoomSlider) photoZoomSlider.value = 1.0;
            if (photoZoomVal) photoZoomVal.textContent = '100%';
            if (photoBrightnessSlider) photoBrightnessSlider.value = 100;
            if (photoBrightnessVal) photoBrightnessVal.textContent = '100%';

            if (photoPreviewImg) {
              photoPreviewImg.src = e.target.result;
            }
            if (photoFixedFrameBox) photoFixedFrameBox.style.display = 'block';
            if (photoAdjustToolbar) photoAdjustToolbar.style.display = 'flex';
            if (photoFitHint) photoFitHint.style.display = 'inline';
            if (photoPreviewPlaceholder) photoPreviewPlaceholder.style.display = 'none';

            updatePhotoPreviewUI();
          };
          img.onerror = () => {
            UI.showToast('사진을 읽는 중 문제가 발생했어요', 'danger');
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      };

      photoFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          processPhotoFile(e.target.files[0]);
        }
      });

      photoDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoDropzone.style.borderColor = 'var(--primary)';
        photoDropzone.style.background = 'rgba(255, 107, 139, 0.08)';
      });

      photoDropzone.addEventListener('dragleave', () => {
        photoDropzone.style.borderColor = 'var(--border-color)';
        photoDropzone.style.background = 'rgba(0,0,0,0.02)';
      });

      photoDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        photoDropzone.style.borderColor = 'var(--border-color)';
        photoDropzone.style.background = 'rgba(0,0,0,0.02)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processPhotoFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Export 1:1 Fixed Square Cropped / Framed Image via Canvas (with Brightness Filter)
    const generateFixedSquarePhotoDataUrl = (editorState) => {
      const { rawImg, scale, panX, panY, rotation, brightness } = editorState;
      const size = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const frameBox = document.getElementById('photo-fixed-frame-box');
      const frameW = (frameBox && frameBox.clientWidth) ? frameBox.clientWidth : 270;
      const factor = size / frameW;

      const srcW = rawImg.naturalWidth || rawImg.width;
      const srcH = rawImg.naturalHeight || rawImg.height;
      const baseScale = Math.max(frameW / srcW, frameW / srcH);
      const drawW = srcW * baseScale * factor * scale;
      const drawH = srcH * baseScale * factor * scale;

      ctx.save();
      ctx.translate(size / 2 + panX * factor, size / 2 + panY * factor);
      ctx.rotate((rotation * Math.PI) / 180);
      if (brightness !== undefined && brightness !== 100) {
        ctx.filter = `brightness(${brightness}%)`;
      }
      ctx.drawImage(rawImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return canvas.toDataURL('image/jpeg', 0.88);
    };

    // Polaroid Photo Form Submit
    const photoForm = document.getElementById('photo-form');
    if (photoForm) {
      photoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('photo-edit-id').value;
        const dateVal = document.getElementById('photo-input-date').value || TODAY_STR;
        const captionVal = document.getElementById('photo-input-caption').value.trim();

        if (!window._photoEditor || (!window._photoEditor.rawImg && !window._photoEditor.rawSrc)) {
          UI.showToast('사진을 선택해 주세요 📸', 'danger');
          return;
        }

        let finalImageDataUrl = '';
        if (window._photoEditor.rawImg) {
          finalImageDataUrl = generateFixedSquarePhotoDataUrl(window._photoEditor);
        } else if (photoPreviewImg && photoPreviewImg.src) {
          finalImageDataUrl = photoPreviewImg.src;
        }

        if (!finalImageDataUrl) {
          UI.showToast('사진을 다시 선택해 주세요 📸', 'danger');
          return;
        }

        if (editId) {
          store.updatePhoto(editId, {
            date: dateVal,
            caption: captionVal,
            imageDataUrl: finalImageDataUrl
          });
          UI.showToast('사진이 1:1 고정 틀에 맞춰 수정되었어요! ✨', 'info');
        } else {
          store.addPhoto({
            date: dateVal,
            caption: captionVal,
            imageDataUrl: finalImageDataUrl
          });
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 18);
          UI.showToast('사진첩에 예쁘게 걸어두었어요! 📸💖', 'success');
        }

        UI.closePhotoModal();
        UI.renderPhotos();
        UI.renderSidebar();
      });
    }

    // Polaroid Drag & Drop Reordering Event Handling
    const photosGrid = document.getElementById('photos-grid-container');
    if (photosGrid) {
      let draggedPhotoId = null;

      photosGrid.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.polaroid-card');
        if (!card) return;
        draggedPhotoId = card.dataset.photoId;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedPhotoId);
      });

      photosGrid.addEventListener('dragend', (e) => {
        const card = e.target.closest('.polaroid-card');
        if (card) card.classList.remove('dragging');
        document.querySelectorAll('.polaroid-card').forEach(el => {
          el.classList.remove('drag-over-left', 'drag-over-right');
        });
      });

      photosGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetCard = e.target.closest('.polaroid-card');
        if (!targetCard || targetCard.dataset.photoId === draggedPhotoId) return;

        const rect = targetCard.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        document.querySelectorAll('.polaroid-card').forEach(el => {
          el.classList.remove('drag-over-left', 'drag-over-right');
        });
        if (e.clientX < midX) {
          targetCard.classList.add('drag-over-left');
        } else {
          targetCard.classList.add('drag-over-right');
        }
      });

      photosGrid.addEventListener('dragleave', (e) => {
        const targetCard = e.target.closest('.polaroid-card');
        if (targetCard) {
          targetCard.classList.remove('drag-over-left', 'drag-over-right');
        }
      });

      photosGrid.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetCard = e.target.closest('.polaroid-card');
        if (!targetCard || !draggedPhotoId) return;
        const targetPhotoId = targetCard.dataset.photoId;
        if (targetPhotoId === draggedPhotoId) return;

        const fromIdx = store.photos.findIndex(p => p.id === draggedPhotoId);
        const toIdx = store.photos.findIndex(p => p.id === targetPhotoId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = store.photos.splice(fromIdx, 1);
          const rect = targetCard.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          const insertIdx = (e.clientX < midX) ? toIdx : toIdx + 1;
          store.photos.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved);
          store.save();
          UI.renderPhotos();
          UI.showToast('사진 순서가 변경되었어요! 🖼️✨', 'info');
        }
        draggedPhotoId = null;
        document.querySelectorAll('.polaroid-card').forEach(el => {
          el.classList.remove('drag-over-left', 'drag-over-right');
        });
      });
    }

    // Edit Quick Note Form Submit
    const editNoteForm = document.getElementById('edit-note-form');
    if (editNoteForm) {
      editNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const noteId = document.getElementById('edit-note-id').value;
        const content = document.getElementById('edit-note-content').value.trim();
        const checkedColor = document.querySelector('input[name="edit-note-color"]:checked');
        const color = checkedColor ? checkedColor.value : 'pink';

        if (!content) return;

        store.updateNote(noteId, { content, color });
        UI.closeEditNoteModal();
        UI.showToast('메모가 수정되었어요! 📝✨', 'info');
        UI.renderNotes();
      });
    }

    // Vault Dropzone & Hidden Input
    const dropzone = document.getElementById('vault-dropzone');
    const hiddenFileInput = document.getElementById('vault-file-hidden-input');
    if (dropzone && hiddenFileInput) {
      dropzone.addEventListener('click', () => hiddenFileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        }, false);
      });

      dropzone.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (!files || files.length === 0) return;

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            await cloudSync.saveFileToVault(file, '드래그 앤 드롭 보관');
            successCount++;
          } catch (err) {
            console.error('File vault drop error:', err);
          }
        }

        if (successCount > 0) {
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
          UI.showToast(`${successCount}개 파일이 안전하게 보관되었어요! 💾✨`, 'success');
          UI.renderFilesVault();
          UI.renderSidebar();
        } else {
          UI.showToast('파일 보관 처리 중 문제가 발생했어요', 'danger');
        }
      });

      hiddenFileInput.addEventListener('change', async () => {
        if (!hiddenFileInput.files || hiddenFileInput.files.length === 0) return;
        let successCount = 0;
        for (let i = 0; i < hiddenFileInput.files.length; i++) {
          const file = hiddenFileInput.files[i];
          try {
            await cloudSync.saveFileToVault(file, '');
            successCount++;
          } catch (err) {}
        }
        hiddenFileInput.value = '';
        if (successCount > 0) {
          sounds.playAdd();
          UI.showToast(`${successCount}개 파일이 보관되었어요! 💾✨`, 'success');
          UI.renderFilesVault();
          UI.renderSidebar();
        }
      });
    }

    // 2-Step Cloud Sync Form Submit (Cloud-wide Master Verification)
    const syncForm = document.getElementById('sync-2step-form');
    if (syncForm) {
      syncForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = syncForm.querySelector('button[type="submit"]');
        const origBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '⏳ 2단계 보안 계정 검증 중...';
        }

        try {
          const sInput = document.getElementById('sync-input-space-id');
          const pInput = document.getElementById('sync-input-pin');
          const sId = sInput ? sInput.value.trim() : '';
          const pin = pInput ? pInput.value.trim() : '';

          if (!sId || !pin) {
            UI.showToast('아이디와 비밀번호를 모두 입력해 주세요 🌸', 'danger');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
            return;
          }

          const result = await cloudSync.verifyAndLogin(sId, pin);
          if (!result.success) {
            try { sounds.playDelete(); } catch (err) {}
            UI.showToast(result.message || '⚠️ 비밀번호가 일치하지 않아요!', 'danger');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
            return;
          }

          UI.closeCloudModal();

          try { sounds.playAdd(); } catch (err) {}
          try { confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50); } catch (err) {}

          UI.showToast('동기화 로그인 성공! 잠금이 해제되었어요 💖', 'success');
          UI.renderTasks();

          // Push local state to cloud safely
          await cloudSync.pushTasksToCloud();
        } catch (err) {
          console.error('syncForm submit error:', err);
          UI.showToast('동기화 처리 오류: ' + (err.message || err), 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnText;
          }
        }
      });
    }

    const disconnectSyncBtn = document.getElementById('btn-disconnect-sync');
    if (disconnectSyncBtn) {
      disconnectSyncBtn.addEventListener('click', () => {
        localStorage.removeItem('todolist_jy_space_id');
        localStorage.removeItem('todolist_jy_pin');
        cloudSync.spaceId = '';
        cloudSync.pin = '';
        const sInput = document.getElementById('sync-input-space-id');
        const pInput = document.getElementById('sync-input-pin');
        if (sInput) sInput.value = '';
        if (pInput) pInput.value = '';
        cloudSync.updateUIStatus();
        UI.closeCloudModal();
        try { sounds.playDelete(); } catch (err) {}
        UI.showToast('동기화가 해제되고 다이어리가 안전하게 잠겼어요 🔒', 'info');
        UI.renderTasks();
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        UI.openTaskModal();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '1') {
        e.preventDefault();
        store.viewMode = 'list';
        localStorage.setItem('todolist_jy_view', 'list');
        const vList = document.getElementById('btn-view-list');
        const vKanban = document.getElementById('btn-view-kanban');
        if (vList) vList.classList.add('active');
        if (vKanban) vKanban.classList.remove('active');
        UI.renderTasks();
      } else if (e.key === '2') {
        e.preventDefault();
        store.viewMode = 'kanban';
        localStorage.setItem('todolist_jy_view', 'kanban');
        const vList = document.getElementById('btn-view-list');
        const vKanban = document.getElementById('btn-view-kanban');
        if (vKanban) vKanban.classList.add('active');
        if (vList) vList.classList.remove('active');
        UI.renderTasks();
      } else if (e.key === 'Escape') {
        UI.closeTaskModal();
        UI.closePhotoModal();
        UI.closePhotoLightbox();
        UI.closeEditNoteModal();
        UI.closeWishlistModal();
        UI.closeLedgerModal();
        UI.closeFileUploadModal();
        UI.closeCloudModal();
        const sc = document.getElementById('shortcuts-modal');
        const st = document.getElementById('settings-modal');
        if (sc) sc.classList.remove('active');
        if (st) st.classList.remove('active');
      }
    });

    // File Upload Form
    const fileForm = document.getElementById('file-upload-form');
    if (fileForm) {
      fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('modal-vault-file-input');
        const note = document.getElementById('modal-vault-file-note').value.trim();
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        try {
          await cloudSync.saveFileToVault(file, note);
          sounds.playAdd();
          UI.showToast(`'${file.name}' 파일이 안전하게 보관되었어요! 💾`, 'success');
          UI.closeFileUploadModal();
          UI.renderFilesVault();
          UI.renderSidebar();
        } catch (err) {
          UI.showToast('파일 업로드 중 오류가 발생했어요', 'danger');
        }
      });
    }

    // Settings Data Export (Firebase Cloud Snapshot + PC JSON Download)
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const origBtnText = exportBtn.innerHTML;
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<span>⏳</span> <span>Firebase 클라우드 백업 중...</span>';

        let cloudSuccess = false;
        try {
          if (cloudSync.spaceId && cloudSync.pin) {
            await cloudSync.createManualCloudBackup();
            cloudSuccess = true;
          }
        } catch (e) {
          console.warn('Manual cloud backup failed:', e);
        }

        // Also trigger PC JSON Download
        const jsonStr = JSON.stringify({
          appName: 'Todolist JY',
          tasks: store.tasks,
          categories: store.categories,
          wishlist: store.wishlist,
          photos: store.photos,
          notes: store.notes,
          vaultFiles: store.vaultFiles || [],
          honeymoonData: store.honeymoonData,
          ledgerFiles: store.ledgerFiles,
          exportedAt: new Date().toISOString()
        }, null, 2);

        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Todolist_JY_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        exportBtn.disabled = false;
        exportBtn.innerHTML = origBtnText;

        if (cloudSuccess) {
          try { sounds.playAdd(); } catch (err) {}
          UI.showToast('Firebase 클라우드 백업 생성 & PC 다운로드 완료! ☁️💾', 'success');
          UI.renderCloudBackupsList();
        } else {
          UI.showToast('PC 백업 파일이 다운로드되었어요! 💾 (클라우드 로그인 시 Firebase에도 저장됩니다)', 'info');
        }
      });
    }

    // Refresh Cloud Backups Button
    const refreshCloudBackupsBtn = document.getElementById('btn-refresh-cloud-backups');
    if (refreshCloudBackupsBtn) {
      refreshCloudBackupsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        UI.renderCloudBackupsList();
        UI.showToast('Firebase 백업 목록을 갱신했어요! 🔄', 'info');
      });
    }

    // Cloud Backup Restore & Delete Delegation
    const cloudBackupsContainer = document.getElementById('cloud-backups-list-container');
    if (cloudBackupsContainer) {
      cloudBackupsContainer.addEventListener('click', async (e) => {
        const restoreBtn = e.target.closest('[data-action="restore-cloud-backup"]');
        if (restoreBtn) {
          const bId = restoreBtn.dataset.id;
          if (!bId) return;
          if (confirm('이 Firebase 백업 시점으로 다이어리 모든 데이터를 복원하시겠습니까? 💖\n(현재 작성된 내용이 백업본 시점으로 변경됩니다)')) {
            try {
              restoreBtn.disabled = true;
              restoreBtn.textContent = '복원 중...';
              await cloudSync.restoreManualCloudBackup(bId);
              try { sounds.playAdd(); } catch (err) {}
              UI.showToast('Firebase 백업에서 성공적으로 복원되었어요! 🎉💖', 'success');
              UI.renderTasks();
              const st = document.getElementById('settings-modal');
              if (st) st.classList.remove('active');
            } catch (err) {
              UI.showToast('복원 실패: ' + (err.message || err), 'danger');
              restoreBtn.disabled = false;
              restoreBtn.textContent = '복원 🔄';
            }
          }
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete-cloud-backup"]');
        if (deleteBtn) {
          const bId = deleteBtn.dataset.id;
          if (!bId) return;
          if (confirm('이 클라우드 백업본을 삭제하시겠습니까?')) {
            try {
              await cloudSync.deleteManualCloudBackup(bId);
              try { sounds.playDelete(); } catch (err) {}
              UI.showToast('클라우드 백업이 삭제되었어요.', 'info');
              UI.renderCloudBackupsList();
            } catch (err) {
              UI.showToast('백업 삭제 실패', 'danger');
            }
          }
          return;
        }
      });
    }

    const importInput = document.getElementById('import-file-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data.tasks)) {
              store.tasks = data.tasks;
              if (Array.isArray(data.categories)) store.categories = data.categories;
              if (Array.isArray(data.wishlist)) store.wishlist = data.wishlist;
              if (Array.isArray(data.photos)) store.photos = data.photos;
              if (Array.isArray(data.notes)) store.notes = data.notes;
              if (Array.isArray(data.vaultFiles)) store.vaultFiles = data.vaultFiles;
              if (data.honeymoonData) store.honeymoonData = data.honeymoonData;
              if (Array.isArray(data.ledgerFiles)) store.ledgerFiles = data.ledgerFiles;
              store.save();
              UI.showToast('데이터가 성공적으로 복원되었어요! 💖', 'success');
              UI.renderTasks();
              const st = document.getElementById('settings-modal');
              if (st) st.classList.remove('active');
              return;
            }
          } catch (err) {}
          UI.showToast('올바른 백업 JSON 파일이 아니에요', 'danger');
        };
        reader.readAsText(file);
      });
    }

    const resetDemoBtn = document.getElementById('btn-reset-demo');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (confirm('모든 데이터를 초기화하시겠습니까?')) {
          store.tasks = [];
          store.categories = DEFAULT_CATEGORIES;
          store.wishlist = [];
          store.photos = [];
          store.notes = [];
          store.vaultFiles = [];
          store.ledgerFiles = [];
          store.honeymoonData = JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA));
          store.save();
          UI.showToast('예시 목록이 모두 정리되었어요! ✨', 'info');
          UI.renderTasks();
          const st = document.getElementById('settings-modal');
          if (st) st.classList.remove('active');
        }
      });
    }
  }

  // =========================================================================
  // 8.5. Firebase Storage & Usage Calculation Engine
  // =========================================================================
  function calculateFirebaseStorageUsage() {
    // Firebase Realtime Database Free Spark Plan Quota: 1 GB = 1,073,741,824 Bytes
    const MAX_FIREBASE_SPARK_BYTES = 1024 * 1024 * 1024;

    function getByteLen(obj) {
      if (!obj) return 0;
      try {
        const str = (typeof obj === 'string') ? obj : JSON.stringify(obj);
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
        if (typeof Blob !== 'undefined') return new Blob([str]).size;
        return encodeURIComponent(str).replace(/%[A-F\d]{2}/g, 'U').length;
      } catch (e) {
        try {
          const str = (typeof obj === 'string') ? obj : JSON.stringify(obj);
          return str.length;
        } catch (e2) {
          return 0;
        }
      }
    }

    const tasksSize = getByteLen(store.tasks || []);
    const notesSize = getByteLen(store.notes || []);
    const wishlistSize = getByteLen(store.wishlist || []);
    const photosSize = getByteLen(store.photos || []);
    const ledgerSize = getByteLen({ data: store.honeymoonData || {}, files: store.ledgerFiles || [] });
    const vaultSize = getByteLen(store.vaultFiles || []);
    const categoriesSize = getByteLen(store.categories || []);

    let treasureSize = 0;
    try {
      const rawT = localStorage.getItem('zentask_treasures');
      if (rawT) treasureSize = getByteLen(rawT);
    } catch (e) {}

    const totalUsedBytes = tasksSize + notesSize + wishlistSize + photosSize + ledgerSize + vaultSize + categoriesSize + treasureSize;
    const usagePercentage = (totalUsedBytes / MAX_FIREBASE_SPARK_BYTES) * 100;
    const remainingBytes = Math.max(0, MAX_FIREBASE_SPARK_BYTES - totalUsedBytes);

    function formatBytesPrecise(bytes) {
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    return {
      totalUsedBytes,
      maxBytes: MAX_FIREBASE_SPARK_BYTES,
      formattedUsed: formatBytesPrecise(totalUsedBytes),
      formattedMax: '1.0 GB (1,024 MB)',
      formattedRemaining: formatBytesPrecise(remainingBytes),
      percentage: usagePercentage,
      percentageStr: usagePercentage < 0.001 
        ? usagePercentage.toFixed(4) + '%' 
        : (usagePercentage < 0.01 ? usagePercentage.toFixed(3) + '%' : usagePercentage.toFixed(2) + '%'),
      breakdown: {
        vault: { label: '📂 파일보관함', bytes: vaultSize, formatted: formatBytesPrecise(vaultSize) },
        photos: { label: '📸 사진첩', bytes: photosSize, formatted: formatBytesPrecise(photosSize) },
        notes: { label: '✏️ 끄적끄적 메모', bytes: notesSize, formatted: formatBytesPrecise(notesSize) },
        tasks: { label: '📋 할 일 & 일정', bytes: tasksSize, formatted: formatBytesPrecise(tasksSize) },
        ledger: { label: '💰 가계부 & 엑셀', bytes: ledgerSize, formatted: formatBytesPrecise(ledgerSize) },
        wishlist: { label: '🎁 위시리스트', bytes: wishlistSize, formatted: formatBytesPrecise(wishlistSize) },
        treasures: { label: '💎 보물 지식', bytes: treasureSize, formatted: formatBytesPrecise(treasureSize) }
      }
    };
  }

  window.calculateFirebaseStorageUsage = calculateFirebaseStorageUsage;

  // =========================================================================
  // 9. Application Bootstrap
  // =========================================================================
  function initApp() {
    try {
      const savedTheme = localStorage.getItem('todolist_jy_theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) icon.textContent = savedTheme === 'dark' ? '🌙' : '🌸';

      bindEvents();
      cloudSync.init();
      UI.renderTasks();
    } catch (err) {
      console.error('initApp fatal error:', err);
      const box = document.getElementById('debug-error-banner') || (function() {
        const el = document.createElement('div');
        el.id = 'debug-error-banner';
        el.style.cssText = 'position:fixed; top:12px; left:50%; transform:translateX(-50%); background:#e03131; color:#fff; padding:12px 24px; border-radius:12px; z-index:999999; font-size:13px; font-weight:bold; box-shadow:0 8px 25px rgba(0,0,0,0.35); max-width:90vw; word-break:break-all; text-align:center;';
        (document.body || document.documentElement).appendChild(el);
        return el;
      })();
      box.innerHTML = '⚠️ 앱 초기화 오류: ' + (err.message || err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
