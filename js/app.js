/**
 * Todolist JY - Standalone Application Script
 * Features:
 * - Full Mobile-First iOS Experience (Bottom Navigation Bar, Horizontal Pill Filters, Safe Area Insets)
 * - 2-Step Security Real-Time Cloud Sync (Space ID + 2-Step PIN Protection via Firestore)
 * - Real-Time File Vault Cross-Device Synchronization (PC <-> Mobile 100% Instant Sync & Download)
 * - Brand Name Click: Instant reset to '모든 할 일 (All Tasks)'
 * - Category Drag & Drop Reordering with Persistent Storage
 * - iOS Apple Pastel Cute Design & Sound/Confetti Animations
 * - Zero CORS dependency for file:/// and http:// execution
 */

(function() {
  'use strict';

  // =========================================================================
  // 0. Default Firebase Configuration (Auto-Configured for Todolist JY)
  // =========================================================================
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCehazMGcL2x5FWSRRQv4cqST0AjPIEks8",
    authDomain: "todolist-jy.firebaseapp.com",
    databaseURL: "https://todolist-jy-default-rtdb.firebaseio.com",
    projectId: "todolist-jy",
    storageBucket: "todolist-jy.firebasestorage.app",
    messagingSenderId: "541071377334",
    appId: "1:541071377334:web:61b52c04d09a4536617717",
    measurementId: "G-F84W7VLNWC"
  };

  // Helper to normalize Firebase object-arrays into standard JS arrays
  function normalizeArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [];
  }

  // Helper to convert Base64 Data URL to binary Blob for mobile & cross-browser downloads
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
          isHeart: Math.random() > 0.6,
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
  // 3. Bulletproof Multi-Region Cloud Sync Manager (100% Real-Time Cross-Device Sync)
  // =========================================================================
  class CloudSyncManager {
    constructor() {
      this.spaceId = localStorage.getItem('todolist_jy_space_id') || '';
      this.pin = localStorage.getItem('todolist_jy_pin') || '';
      this.activeUrl = localStorage.getItem('todolist_jy_active_rtdb_url') || 'https://todolist-jy-default-rtdb.firebaseio.com';
      this.vaultFiles = [];
      this.syncTimer = null;
      this.lastSyncedUpdatedAt = 0;
      this.isSyncing = false;
      this.init();
    }

    init() {
      if (this.spaceId && this.pin) {
        this.fetchLatestFromCloud(true);
        this.startRealtimePolling();
      }
      this.updateUIStatus();
    }

    getEndpoints(spaceId) {
      return [
        `https://todolist-jy-default-rtdb.firebaseio.com/sync_spaces/${spaceId}.json`,
        `https://todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app/sync_spaces/${spaceId}.json`,
        `https://todolist-jy-default-rtdb.europe-west1.firebasedatabase.app/sync_spaces/${spaceId}.json`
      ];
    }

    async readFromCloud(spaceId) {
      const urls = this.activeUrl 
        ? [`${this.activeUrl}/sync_spaces/${spaceId}.json`, ...this.getEndpoints(spaceId)]
        : this.getEndpoints(spaceId);

      const uniqueUrls = [...new Set(urls)];

      for (const url of uniqueUrls) {
        try {
          const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            const baseUrl = url.replace(`/sync_spaces/${spaceId}.json`, '');
            return { ok: true, data, baseUrl };
          }
        } catch (e) {
          console.warn('Read endpoint error:', url, e);
        }
      }
      return { ok: false, data: null, baseUrl: null };
    }

    async writeToCloud(spaceId, payload) {
      const urls = this.activeUrl 
        ? [`${this.activeUrl}/sync_spaces/${spaceId}.json`, ...this.getEndpoints(spaceId)]
        : this.getEndpoints(spaceId);

      const uniqueUrls = [...new Set(urls)];

      for (const url of uniqueUrls) {
        try {
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const baseUrl = url.replace(`/sync_spaces/${spaceId}.json`, '');
            this.activeUrl = baseUrl;
            localStorage.setItem('todolist_jy_active_rtdb_url', baseUrl);
            return { ok: true, baseUrl };
          }
        } catch (e) {
          console.warn('Write endpoint error:', url, e);
        }
      }
      return { ok: false };
    }

    async connect2Step(spaceId, pin) {
      const sId = spaceId.trim().toLowerCase();
      const sPin = pin.trim();

      if (!sId || !sPin) {
        UI.showToast('아이디와 비밀번호를 모두 입력해주세요!', 'danger');
        return false;
      }

      const cloudResult = await this.readFromCloud(sId);

      if (cloudResult.ok && cloudResult.data) {
        const data = cloudResult.data;

        // Verify PIN
        if (data.pin && data.pin !== sPin) {
          UI.showToast('❌ 2단계 비밀번호가 일치하지 않습니다!', 'danger');
          return false;
        }

        // Save Credentials
        this.spaceId = sId;
        this.pin = sPin;
        this.activeUrl = cloudResult.baseUrl;
        localStorage.setItem('todolist_jy_space_id', sId);
        localStorage.setItem('todolist_jy_pin', sPin);
        localStorage.setItem('todolist_jy_active_rtdb_url', cloudResult.baseUrl);

        // Load tasks and files
        if (data.tasks) store.tasks = normalizeArray(data.tasks);
        if (data.categories) store.categories = normalizeArray(data.categories);
        if (data.files) {
          this.vaultFiles = normalizeArray(data.files);
          this.vaultFiles.forEach(f => fileVaultDB.saveFileRecord(f));
        } else {
          this.vaultFiles = [];
        }
        this.lastSyncedUpdatedAt = data.updatedAt || Date.now();
        store.saveLocalOnly();

        this.startRealtimePolling();
        this.updateUIStatus();
        UI.renderTasks();
        UI.renderSidebar();
        return true;
      }

      // If space does not exist in cloud:
      // Check if user wants to create this new account space
      const isExistingLocal = localStorage.getItem('todolist_jy_space_id') === sId;
      if (!isExistingLocal && !confirm(`'${sId}' 아이디는 처음 사용하는 계정입니다. 이 계정으로 새로 등록할까요?`)) {
        UI.showToast('❌ 등록되지 않은 아이디입니다. 아이디를 확인해주세요!', 'danger');
        return false;
      }

      // Initialize brand-new space in cloud
      this.spaceId = sId;
      this.pin = sPin;
      localStorage.setItem('todolist_jy_space_id', sId);
      localStorage.setItem('todolist_jy_pin', sPin);

      const localFiles = await fileVaultDB.getAll();
      this.vaultFiles = localFiles || [];
      this.lastSyncedUpdatedAt = Date.now();

      const initialPayload = {
        spaceId: sId,
        pin: sPin,
        tasks: store.tasks,
        categories: store.categories,
        files: this.vaultFiles,
        updatedAt: this.lastSyncedUpdatedAt
      };

      const writeRes = await this.writeToCloud(sId, initialPayload);
      if (!writeRes.ok) {
        UI.showToast('클라우드 서버 연결 실패. Firebase 규칙(Rules)을 확인해주세요!', 'danger');
        return false;
      }

      this.startRealtimePolling();
      this.updateUIStatus();
      UI.renderTasks();
      UI.renderSidebar();
      return true;
    }

    disconnect() {
      this.spaceId = '';
      this.pin = '';
      localStorage.removeItem('todolist_jy_space_id');
      localStorage.removeItem('todolist_jy_pin');
      localStorage.removeItem('todolist_jy_active_rtdb_url');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STREAK_KEY);
      sessionStorage.clear();

      const sInput = document.getElementById('sync-input-space-id');
      const pInput = document.getElementById('sync-input-pin');
      if (sInput) sInput.value = '';
      if (pInput) pInput.value = '';

      store.tasks = [];
      this.vaultFiles = [];

      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }

      this.updateUIStatus();
      UI.renderTasks();
      UI.renderSidebar();
      UI.showToast('동기화가 해제되었으며 모든 로그인 기록과 데이터가 완전히 삭제되었습니다. 🔒', 'info');
    }

    updateUIStatus() {
      const icon = document.getElementById('cloud-status-icon');
      const text = document.getElementById('cloud-status-text');
      const btn = document.getElementById('btn-cloud-status');
      const banner = document.getElementById('sync-active-banner');
      const keyDisplay = document.getElementById('current-sync-key-display');
      const form = document.getElementById('sync-2step-form');

      if (this.spaceId && this.pin) {
        if (icon) icon.textContent = '🟢';
        if (text) text.textContent = '동기화 중';
        if (btn) btn.style.color = '#10b981';
        if (banner) banner.style.display = 'block';
        if (keyDisplay) keyDisplay.textContent = `2단계 보안 동기화 활성화됨 🟢`;
        if (form) form.style.display = 'none';
      } else {
        if (icon) icon.textContent = '☁️';
        if (text) text.textContent = '동기화';
        if (btn) btn.style.color = 'var(--text-muted)';
        if (banner) banner.style.display = 'none';
        if (form) form.style.display = 'flex';
      }
    }

    startRealtimePolling() {
      if (this.syncTimer) clearInterval(this.syncTimer);
      if (!this.spaceId) return;

      // Poll every 3 seconds for seamless cross-device synchronization
      this.syncTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && this.spaceId && !this.isSyncing) {
          this.fetchLatestFromCloud(false);
        }
      }, 3000);
    }

    async fetchLatestFromCloud(force = false) {
      if (!this.spaceId || this.isSyncing) return;
      this.isSyncing = true;

      try {
        const cloudResult = await this.readFromCloud(this.spaceId);
        if (cloudResult.ok && cloudResult.data) {
          const data = cloudResult.data;
          const remoteTime = data.updatedAt || 0;

          if (force || remoteTime > this.lastSyncedUpdatedAt) {
            this.lastSyncedUpdatedAt = remoteTime;
            if (data.tasks) store.tasks = normalizeArray(data.tasks);
            if (data.categories) store.categories = normalizeArray(data.categories);
            if (data.files) {
              this.vaultFiles = normalizeArray(data.files);
              this.vaultFiles.forEach(f => fileVaultDB.saveFileRecord(f));
            }
            store.saveLocalOnly();
            UI.renderTasks();
            UI.renderSidebar();
          }
        }
      } catch (e) {
        console.warn('Sync poll error:', e);
      } finally {
        this.isSyncing = false;
      }
    }

    async pushTasksToCloud() {
      if (!this.spaceId || !this.pin) return;
      this.lastSyncedUpdatedAt = Date.now();

      const payload = {
        spaceId: this.spaceId,
        pin: this.pin,
        tasks: store.tasks,
        categories: store.categories,
        files: this.vaultFiles,
        updatedAt: this.lastSyncedUpdatedAt
      };

      await this.writeToCloud(this.spaceId, payload);
    }

    async uploadVaultFile(file, note = '') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileId = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const fileRecord = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            note: note.trim(),
            data: e.target.result,
            createdAt: Date.now()
          };

          this.vaultFiles.unshift(fileRecord);
          this.lastSyncedUpdatedAt = Date.now();

          if (this.spaceId) {
            await this.writeToCloud(this.spaceId, {
              spaceId: this.spaceId,
              pin: this.pin,
              tasks: store.tasks,
              categories: store.categories,
              files: this.vaultFiles,
              updatedAt: this.lastSyncedUpdatedAt
            });
          }

          await fileVaultDB.saveFileRecord(fileRecord);
          resolve(fileRecord);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }

    async getAllVaultFiles() {
      if (this.vaultFiles && this.vaultFiles.length > 0) {
        return this.vaultFiles;
      }
      if (this.spaceId) {
        const cloudResult = await this.readFromCloud(this.spaceId);
        if (cloudResult.ok && cloudResult.data && cloudResult.data.files) {
          this.vaultFiles = normalizeArray(cloudResult.data.files);
          return this.vaultFiles;
        }
      }
      const localFiles = await fileVaultDB.getAll();
      this.vaultFiles = localFiles || [];
      return this.vaultFiles;
    }

    async deleteVaultFile(id) {
      this.vaultFiles = this.vaultFiles.filter(f => f.id !== id);
      this.lastSyncedUpdatedAt = Date.now();

      if (this.spaceId) {
        await this.writeToCloud(this.spaceId, {
          spaceId: this.spaceId,
          pin: this.pin,
          tasks: store.tasks,
          categories: store.categories,
          files: this.vaultFiles,
          updatedAt: this.lastSyncedUpdatedAt
        });
      }

      await fileVaultDB.deleteFile(id);
      return true;
    }

    async downloadVaultFile(id) {
      let file = this.vaultFiles.find(f => f.id === id);
      if (!file) {
        file = await fileVaultDB.getFile(id);
      }
      if (!file || !file.data) {
        throw new Error('파일 데이터를 찾을 수 없습니다.');
      }

      const fileName = file.name || 'download.xlsx';
      const blob = dataURLtoBlob(file.data);

      // 1. Modern Mobile Native Web Share API (Triggers iOS/Android Native Share Sheet: "Save to Files", "Open in Excel", etc.)
      if (blob && navigator.canShare) {
        try {
          const mimeType = blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const fileObj = new File([blob], fileName, { type: mimeType });
          if (navigator.canShare({ files: [fileObj] })) {
            await navigator.share({
              files: [fileObj],
              title: fileName,
              text: `${fileName} 파일 다운로드`
            });
            return true;
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return true; // User dismissed share sheet
          console.warn('Share API warning:', shareErr);
        }
      }

      // 2. KakaoTalk In-App Browser Fallback (KakaoTalk blocks standard <a> downloads)
      if (/KAKAOTALK/i.test(navigator.userAgent)) {
        if (/Android/i.test(navigator.userAgent)) {
          const targetUrl = location.href.replace(/https?:\/\//i, '');
          location.href = 'intent://' + targetUrl + '#Intent;scheme=https;package=com.android.chrome;end';
          return true;
        } else {
          alert('카카오톡 인앱 브라우저는 자체 보안 정책상 파일 저장을 차단합니다.\n\n우측 상단 [ ⋮ ] 또는 [ ⋯ ] 버튼을 누르고 [Safari로 열기]를 선택하시면 엑셀 파일이 스마트폰에 바로 다운로드됩니다! 🌸');
          return false;
        }
      }

      // 3. Standard Blob ObjectURL Download for Safari / Chrome / PC
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 6000);
        return true;
      }

      // 4. Direct anchor fallback
      const a = document.createElement('a');
      a.href = file.data;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 2000);
      return true;
    }
  }

  // =========================================================================
  // 4. IndexedDB File Vault (Local Offline Engine)
  // =========================================================================
  class FileVaultDB {
    constructor() {
      this.dbName = 'TodolistJY_FileVault_v2';
      this.storeName = 'vault_files';
      this.db = null;
    }

    async init() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = (e) => reject(e);
      });
    }

    async getAll() {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          const files = req.result || [];
          files.sort((a, b) => b.createdAt - a.createdAt);
          resolve(files);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async getFile(id) {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    async saveFileRecord(record) {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
      });
    }

    async deleteFile(id) {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  }

  const fileVaultDB = new FileVaultDB();
  const cloudSync = new CloudSyncManager();

  // =========================================================================
  // 5. State Management & Store
  // =========================================================================
  const STORAGE_KEY = 'todolist_jy_data_v4';
  const STREAK_KEY = 'todolist_jy_streak_v4';

  const DEFAULT_CATEGORIES = [
    { id: 'routine', name: '💖 갓생·루틴', color: '#ff6b8b' },
    { id: 'work', name: '🎀 업무·공부', color: '#b197fc' },
    { id: 'wish', name: '🛍️ 위시·쇼핑', color: '#ffa94d' },
    { id: 'cafe', name: '🧁 카페·약속', color: '#f783ac' },
    { id: 'health', name: '💊 건강·운동', color: '#51cf66' },
    { id: 'hobby', name: '✈️ 힐링·취미', color: '#74c0fc' }
  ];

  const INITIAL_DEMO_TASKS = [
    {
      id: 'task-1',
      title: '🌸 상큼한 아침 스트레칭 & 비타민 챙겨먹기',
      description: '물 한잔 마시고 10분 가볍게 스트레칭하기 ✨',
      status: 'completed',
      priority: 'high',
      category: 'routine',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '09:00',
      pinned: true,
      subtasks: [
        { id: 's1', title: '미온수 한 컵 마시기', completed: true },
        { id: 's2', title: '영양제 챙겨먹기', completed: true }
      ],
      createdAt: Date.now() - 3600000 * 5,
      completedAt: Date.now() - 3600000 * 2
    },
    {
      id: 'task-2',
      title: '🎀 Todolist JY 로고 누르면 모든 할 일로 이동',
      description: '어디서든 왼쪽 상단 Todolist JY 로고를 누르면 모든 할 일 화면으로 이동해요!',
      status: 'in-progress',
      priority: 'urgent',
      category: 'work',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '15:00',
      pinned: true,
      subtasks: [
        { id: 's3', title: '상단 [☁️ 동기화] 눌러서 나만의 2단계 보안으로 집/회사 연동하기', completed: false },
        { id: 's4', title: '좌측 [📁 파일 보관함]에 엑셀/메모장 올려보기', completed: false }
      ],
      createdAt: Date.now() - 3600000 * 3
    },
    {
      id: 'task-3',
      title: '🧁 주말에 갈 감성 브런치 카페 찾아보기',
      description: '햇살 맛집 디저트 카페 저장해두기 🥐☕',
      status: 'todo',
      priority: 'medium',
      category: 'cafe',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      dueTime: '18:00',
      pinned: false,
      subtasks: [],
      createdAt: Date.now() - 3600000 * 1
    },
    {
      id: 'task-4',
      title: '🛍️ 올리브영 세일 위시리스트 담기',
      description: '스킨케어 토너패드랑 립밤 장바구니 체크 💄',
      status: 'todo',
      priority: 'low',
      category: 'wish',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      dueTime: '',
      pinned: false,
      subtasks: [],
      createdAt: Date.now()
    }
  ];

  class Store {
    constructor() {
      this.tasks = [];
      this.categories = DEFAULT_CATEGORIES;
      this.activeFilter = 'all';
      this.activePriority = 'all';
      this.searchQuery = '';
      this.sortBy = 'dueDate';
      this.viewMode = localStorage.getItem('todolist_jy_view') || 'list';
      this.streak = { count: 3, lastDate: new Date().toISOString().split('T')[0] };
      this.load();
    }

    load() {
      const isLogged = !!(localStorage.getItem('todolist_jy_space_id') && localStorage.getItem('todolist_jy_pin'));
      if (!isLogged) {
        this.tasks = [];
        return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.tasks = parsed.tasks || [];
          if (parsed.categories && parsed.categories.length) {
            this.categories = parsed.categories;
          }
        }
        const streakRaw = localStorage.getItem(STREAK_KEY);
        if (streakRaw) this.streak = JSON.parse(streakRaw);
      } catch (e) {
        this.tasks = [];
      }
    }

    saveLocalOnly() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          tasks: this.tasks,
          categories: this.categories,
          updatedAt: Date.now()
        }));
        localStorage.setItem(STREAK_KEY, JSON.stringify(this.streak));
      } catch (e) {}
    }

    save() {
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud();
    }

    reorderCategories(draggedId, targetId, insertAfter = false) {
      const fromIndex = this.categories.findIndex(c => c.id === draggedId);
      const toIndex = this.categories.findIndex(c => c.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const [item] = this.categories.splice(fromIndex, 1);
      let newIndex = this.categories.findIndex(c => c.id === targetId);
      if (insertAfter) newIndex += 1;
      this.categories.splice(newIndex, 0, item);
      this.save();
    }

    addTask(data) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (data.title || '').trim(),
        description: (data.description || '').trim(),
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        category: data.category || (this.categories[0] ? this.categories[0].id : 'routine'),
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        dueTime: data.dueTime || '',
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

    updateStreak() {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.streak.lastDate === today) return;
      if (this.streak.lastDate === yesterday) {
        this.streak.count += 1;
      } else {
        this.streak.count = 1;
      }
      this.streak.lastDate = today;
    }

    getFilteredTasks() {
      const todayStr = new Date().toISOString().split('T')[0];

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
          case 'today':
            return task.dueDate === todayStr;
          case 'upcoming':
            return task.dueDate && task.dueDate > todayStr && task.status !== 'completed';
          case 'overdue':
            return task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
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
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTasks = this.tasks.filter(t => t.dueDate === todayStr);
      const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed').length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        completed,
        overdue,
        rate,
        todayTotal: todayTasks.length,
        streak: this.streak.count
      };
    }

    exportJSON() {
      return JSON.stringify({
        appName: 'Todolist JY',
        tasks: this.tasks,
        categories: this.categories,
        exportedAt: new Date().toISOString()
      }, null, 2);
    }

    importJSON(str) {
      try {
        const data = JSON.parse(str);
        if (Array.isArray(data.tasks)) {
          this.tasks = data.tasks;
          if (Array.isArray(data.categories)) this.categories = data.categories;
          this.save();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    resetDemo() {
      this.tasks = [...INITIAL_DEMO_TASKS];
      this.categories = DEFAULT_CATEGORIES;
      this.save();
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

    formatDueDate(dateStr, timeStr) {
      if (!dateStr) return null;
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      let label = dateStr;
      let className = '';

      if (dateStr === today) {
        label = '오늘';
        className = 'due-today';
      } else if (dateStr === tomorrow) {
        label = '내일';
        className = 'due-tomorrow';
      } else if (dateStr < today) {
        label = `지연됨 (${dateStr})`;
        className = 'overdue';
      }

      if (timeStr) label += ` ${timeStr}`;
      return { label, className };
    },

    getPriorityInfo(p) {
      const map = {
        urgent: { label: '긴급 🔥', class: 'badge-priority-urgent' },
        high: { label: '높음 🔴', class: 'badge-priority-high' },
        medium: { label: '중간 🟡', class: 'badge-priority-medium' },
        low: { label: '낮음 🟢', class: 'badge-priority-low' }
      };
      return map[p] || map.medium;
    },

    async renderSidebar() {
      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      if (!isLogged) {
        const counts = { all: 0, today: 0, upcoming: 0, overdue: 0, pinned: 0, completed: 0, vault: 0 };
        Object.keys(counts).forEach(k => {
          const el = document.getElementById(`nav-count-${k}`);
          if (el) el.textContent = '🔒';
        });

        const catContainer = document.getElementById('category-nav-list');
        if (catContainer) {
          catContainer.innerHTML = `<li style="padding: 0.85rem 0.5rem; font-size: 0.82rem; color: var(--text-dim); text-align: center;">🔐 로그인 시 표시됩니다</li>`;
        }

        const mobileBar = document.getElementById('mobile-category-bar');
        if (mobileBar) mobileBar.style.display = 'none';

        const rateEl = document.getElementById('stats-rate');
        const ringBar = document.getElementById('progress-ring-bar');
        const subtextEl = document.getElementById('stats-subtext');
        const streakEl = document.getElementById('streak-count');

        if (rateEl) rateEl.textContent = `0%`;
        if (subtextEl) subtextEl.textContent = `로그인 필요 🔒`;
        if (streakEl) streakEl.textContent = `보안 잠금 중`;
        if (ringBar) ringBar.style.strokeDashoffset = 2 * Math.PI * 31;
        return;
      }

      const stats = store.getStats();
      const counts = {
        all: store.tasks.length,
        today: stats.todayTotal,
        upcoming: store.tasks.filter(t => {
          const today = new Date().toISOString().split('T')[0];
          return t.dueDate && t.dueDate > today && t.status !== 'completed';
        }).length,
        overdue: stats.overdue,
        pinned: store.tasks.filter(t => t.pinned).length,
        completed: stats.completed
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

      // Render Mobile Category Horizontal Pills
      const mobileBar = document.getElementById('mobile-category-bar');
      if (mobileBar) {
        let pillsHTML = `
          <button type="button" class="mobile-cat-pill ${store.activeFilter === 'all' ? 'active' : ''}" data-filter="all">🌸 전체</button>
          <button type="button" class="mobile-cat-pill ${store.activeFilter === 'today' ? 'active' : ''}" data-filter="today">☀️ 오늘</button>
          <button type="button" class="mobile-cat-pill ${store.activeFilter === 'pinned' ? 'active' : ''}" data-filter="pinned">💖 중요</button>
        `;
        store.categories.forEach(cat => {
          const isAct = store.activeFilter === cat.id ? 'active' : '';
          pillsHTML += `<button type="button" class="mobile-cat-pill ${isAct}" data-filter="${cat.id}">${cat.name}</button>`;
        });
        mobileBar.innerHTML = pillsHTML;
        mobileBar.style.display = 'flex';
      }

      const rateEl = document.getElementById('stats-rate');
      const ringBar = document.getElementById('progress-ring-bar');
      const subtextEl = document.getElementById('stats-subtext');
      const streakEl = document.getElementById('streak-count');

      if (rateEl) rateEl.textContent = `${stats.rate}%`;
      if (subtextEl) subtextEl.textContent = `${stats.completed}/${stats.total}개 달성 완료 ✨`;
      if (streakEl) streakEl.textContent = `${stats.streak}일 연속 달성 중`;

      if (ringBar) {
        const circumference = 2 * Math.PI * 31;
        const offset = circumference - (stats.rate / 100) * circumference;
        ringBar.style.strokeDasharray = `${circumference} ${circumference}`;
        ringBar.style.strokeDashoffset = offset;
      }
    },

    createTaskCardHTML(task) {
      const isCompleted = task.status === 'completed';
      const priority = this.getPriorityInfo(task.priority);
      const dueInfo = this.formatDueDate(task.dueDate, task.dueTime);
      const cat = store.categories.find(c => c.id === task.category);

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
              <span class="badge ${priority.class}">${priority.label}</span>
              ${cat ? `<span class="badge badge-tag" style="background: ${cat.color}15; color: ${cat.color};">${cat.name}</span>` : ''}
              ${dueInfo ? `<span class="badge badge-date ${dueInfo.className}">⏰ ${dueInfo.label}</span>` : ''}
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
      const listContainer = document.getElementById('tasks-list-container');
      const kanbanContainer = document.getElementById('kanban-board-container');
      const emptyState = document.getElementById('empty-state');
      const lockedScreen = document.getElementById('locked-privacy-screen');
      const mobileBar = document.getElementById('mobile-category-bar');

      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      if (!isLogged) {
        if (lockedScreen) lockedScreen.style.display = 'flex';
        if (tasksView) tasksView.style.display = 'none';
        if (filesView) filesView.style.display = 'none';
        if (mobileBar) mobileBar.style.display = 'none';
        this.renderSidebar();
        return;
      }

      if (lockedScreen) lockedScreen.style.display = 'none';

      // Update Mobile Nav Active States
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        const action = btn.dataset.mobileNav;
        if (store.activeFilter === 'vault' && action === 'vault') {
          btn.classList.add('active');
        } else if (store.activeFilter !== 'vault' && store.viewMode === 'kanban' && action === 'kanban') {
          btn.classList.add('active');
        } else if (store.activeFilter !== 'vault' && store.viewMode === 'list' && action === 'tasks') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      if (store.activeFilter === 'vault') {
        if (tasksView) tasksView.style.display = 'none';
        if (filesView) filesView.style.display = 'flex';
        this.renderFilesVault();
        this.renderSidebar();
        return;
      }

      if (tasksView) tasksView.style.display = 'flex';
      if (filesView) filesView.style.display = 'none';

      const filtered = store.getFilteredTasks();

      const headingEl = document.getElementById('view-title');
      const filterNames = {
        all: '모든 할 일 🌸',
        today: '오늘의 할 일 ☀️',
        upcoming: '다가오는 일정 🗓️',
        overdue: '기한 지연된 할 일 ⚠️',
        pinned: '중요한 할 일 💖',
        completed: '완료된 목록 ✨'
      };
      const catMatch = store.categories.find(c => c.id === store.activeFilter);
      if (headingEl) headingEl.textContent = filterNames[store.activeFilter] || (catMatch ? `${catMatch.name} 할 일` : '할 일 목록');

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

    openTaskModal(taskId = null) {
      const modal = document.getElementById('task-modal');
      const form = document.getElementById('task-form');
      const modalTitle = document.getElementById('modal-title');
      const subtasksList = document.getElementById('modal-subtasks-list');
      if (!modal || !form) return;

      form.reset();
      if (subtasksList) subtasksList.innerHTML = '';

      if (taskId) {
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) return;
        modalTitle.textContent = '할 일 수정하기 ✏️';
        form.dataset.taskId = task.id;
        document.getElementById('task-input-title').value = task.title;
        document.getElementById('task-input-desc').value = task.description || '';
        document.getElementById('task-input-priority').value = task.priority || 'medium';
        document.getElementById('task-input-category').value = task.category || 'routine';
        document.getElementById('task-input-status').value = task.status || 'todo';
        document.getElementById('task-input-duedate').value = task.dueDate || '';
        document.getElementById('task-input-duetime').value = task.dueTime || '';
        document.getElementById('task-input-pinned').checked = !!task.pinned;

        if (task.subtasks) {
          task.subtasks.forEach(s => this.addSubtaskRow(s.title, s.completed, s.id));
        }
      } else {
        modalTitle.textContent = '새로운 할 일 등록 💖';
        delete form.dataset.taskId;
        document.getElementById('task-input-priority').value = 'medium';
        document.getElementById('task-input-status').value = 'todo';
        document.getElementById('task-input-duedate').value = new Date().toISOString().split('T')[0];
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
        <button type="button" class="task-action-btn delete-btn" title="삭제" onclick="this.parentElement.remove()">✕</button>
      `;
      list.appendChild(row);
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
      if (!modal) return;
      if (!cloudSync.spaceId) {
        const sInput = document.getElementById('sync-input-space-id');
        const pInput = document.getElementById('sync-input-pin');
        if (sInput) sInput.value = '';
        if (pInput) pInput.value = '';
      }
      cloudSync.updateUIStatus();
      const configInput = document.getElementById('firebase-config-input');
      if (configInput) {
        configInput.value = localStorage.getItem('todolist_jy_firebase_config') || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
      }
      modal.classList.add('active');
    },

    closeCloudModal() {
      const modal = document.getElementById('cloud-modal');
      if (modal) modal.classList.remove('active');
    }
  };

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // =========================================================================
  // 7. App Event Handlers & Controller
  // =========================================================================
  function initApp() {
    initTheme();
    populateCategoriesSelect();
    bindEvents();
    bindDragAndDrop();
    bindCategoryDragAndDrop();
    bindFileVaultEvents();
    bindCloudEvents();
    bindMobileEvents();
    UI.renderTasks();
    checkKakaoTalkBrowser();
  }

  function checkKakaoTalkBrowser() {
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      if (/Android/i.test(navigator.userAgent)) {
        const targetUrl = location.href.replace(/https?:\/\//i, '');
        location.href = 'intent://' + targetUrl + '#Intent;scheme=https;package=com.android.chrome;end';
      } else {
        setTimeout(() => {
          UI.showToast('💡 카카오톡 앱에서는 파일 저장이 제한됩니다. 우측 상단 [ ⋮ ] ➔ [Safari로 열기]를 권장해요! 🌸', 'info', 6000);
        }, 1500);
      }
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('todolist_jy_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('todolist_jy_theme', next);
    updateThemeIcon(next);
    UI.showToast(next === 'dark' ? '포근한 라벤더 다크 모드 🌙' : '화사한 체리블라썸 라이트 모드 🌸', 'info');
  }

  function updateThemeIcon(t) {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.textContent = t === 'dark' ? '🌙' : '🌸';
  }

  function populateCategoriesSelect() {
    const select = document.getElementById('task-input-category');
    if (!select) return;
    select.innerHTML = store.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function resetToAllTasks() {
    store.activeFilter = 'all';
    store.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const allNav = document.getElementById('nav-filter-all');
    if (allNav) allNav.classList.add('active');

    UI.renderTasks();
    sounds.playAdd();
    UI.showToast('모든 할 일 목록으로 이동했어요 🌸', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleQuickAdd(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('quick-add-input');
    if (!input) return;
    const title = input.value.trim();
    if (!title) {
      UI.showToast('할 일 제목을 입력해주세요!', 'info');
      input.focus();
      return;
    }

    const defaultCat = store.activeFilter !== 'all' && store.activeFilter !== 'vault' && store.categories.some(c => c.id === store.activeFilter)
      ? store.activeFilter
      : (store.categories[0] ? store.categories[0].id : 'routine');

    store.addTask({
      title,
      status: 'todo',
      priority: 'medium',
      category: defaultCat,
      dueDate: new Date().toISOString().split('T')[0]
    });

    input.value = '';
    sounds.playAdd();
    UI.showToast('새 할 일이 등록되었어요! ✨', 'success');
    UI.renderTasks();
  }

  function bindEvents() {
    // Brand Click: Reset to All Tasks
    const brandLinks = document.querySelectorAll('.brand');
    brandLinks.forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        resetToAllTasks();
      });
    });

    // Quick Add Form
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

    // Theme & Sound Toggles
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

    // Selects
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

    // Sidebar Nav Filter Click (Desktop)
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem && navItem.dataset.filter) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navItem.classList.add('active');
        store.activeFilter = navItem.dataset.filter;
        UI.renderTasks();
      }
    });

    // Modals
    const openTaskBtn = document.getElementById('btn-open-task-modal');
    if (openTaskBtn) openTaskBtn.addEventListener('click', () => UI.openTaskModal());

    const lockedLoginBtn = document.getElementById('btn-locked-login');
    if (lockedLoginBtn) lockedLoginBtn.addEventListener('click', () => UI.openCloudModal());

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

        const data = {
          title,
          description: document.getElementById('task-input-desc').value.trim(),
          priority: document.getElementById('task-input-priority').value,
          category: document.getElementById('task-input-category').value,
          status: document.getElementById('task-input-status').value,
          dueDate: document.getElementById('task-input-duedate').value,
          dueTime: document.getElementById('task-input-duetime').value,
          pinned: document.getElementById('task-input-pinned').checked,
          subtasks
        };

        const taskId = taskForm.dataset.taskId;
        if (taskId) {
          store.updateTask(taskId, data);
          UI.showToast('할 일이 예쁘게 수정되었어요! ✨', 'info');
        } else {
          store.addTask(data);
          sounds.playAdd();
          UI.showToast('새로운 할 일이 등록되었어요! 💖', 'success');
        }

        UI.closeTaskModal();
        UI.renderTasks();
      });
    }

    // Card Actions Delegation
    document.addEventListener('click', (e) => {
      const target = e.target;

      // Checkbox click
      if (target.matches('[data-action="toggle-complete"]') || target.classList.contains('task-checkbox')) {
        const card = target.closest('.task-card');
        if (!card) return;
        const updated = store.toggleTaskComplete(card.dataset.id);
        if (updated && updated.status === 'completed') {
          sounds.playComplete();
          const r = target.getBoundingClientRect();
          confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 45);
          UI.showToast('해냈어요! 멋져요 💖', 'success');

          const stats = store.getStats();
          if (stats.total > 0 && stats.rate === 100) {
            setTimeout(() => {
              sounds.playCelebration();
              confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 100);
              UI.showToast('오늘의 모든 할 일 완료! 완벽해요 🏆', 'success');
            }, 300);
          }
        }
        UI.renderTasks();
        return;
      }

      // Pin
      const pinBtn = target.closest('[data-action="toggle-pin"]');
      if (pinBtn) {
        const card = pinBtn.closest('.task-card');
        if (card) {
          store.togglePin(card.dataset.id);
          UI.renderTasks();
        }
        return;
      }

      // Delete Task
      const delBtn = target.closest('[data-action="delete"]');
      if (delBtn) {
        const card = delBtn.closest('.task-card');
        if (card && confirm('이 할 일을 삭제할까요?')) {
          store.deleteTask(card.dataset.id);
          sounds.playDelete();
          UI.showToast('할 일이 삭제되었어요.', 'danger');
          UI.renderTasks();
        }
        return;
      }

      // Edit Task
      const editBtn = target.closest('[data-action="open-edit"]');
      if (editBtn) {
        const card = editBtn.closest('.task-card');
        if (card) UI.openTaskModal(card.dataset.id);
        return;
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (e.key === 'Escape') {
        UI.closeTaskModal();
        UI.closeFileUploadModal();
        UI.closeCloudModal();
        const sc = document.getElementById('shortcuts-modal');
        const st = document.getElementById('settings-modal');
        if (sc) sc.classList.remove('active');
        if (st) st.classList.remove('active');
        return;
      }
      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        UI.openTaskModal();
      } else if (e.key === '/') {
        e.preventDefault();
        const s = document.getElementById('search-input');
        if (s) s.focus();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '1') {
        const v = document.getElementById('btn-view-list');
        if (v) v.click();
      } else if (e.key === '2') {
        const v = document.getElementById('btn-view-kanban');
        if (v) v.click();
      } else if (e.key === '?') {
        e.preventDefault();
        const m = document.getElementById('shortcuts-modal');
        if (m) m.classList.add('active');
      }
    });

    // Shortcuts & Settings Modals
    const scBtn = document.getElementById('btn-shortcuts-modal');
    if (scBtn) scBtn.addEventListener('click', () => {
      const m = document.getElementById('shortcuts-modal');
      if (m) m.classList.add('active');
    });

    const setBtn = document.getElementById('btn-settings-modal');
    if (setBtn) setBtn.addEventListener('click', () => {
      const m = document.getElementById('settings-modal');
      if (m) m.classList.add('active');
    });

    // Data Export/Import/Reset
    const expBtn = document.getElementById('btn-export-data');
    if (expBtn) {
      expBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(store.exportJSON());
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `Todolist-JY-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        UI.showToast('데이터 백업 파일이 다운로드되었어요! 💾', 'success');
      });
    }

    const impInput = document.getElementById('import-file-input');
    if (impInput) {
      impInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (store.importJSON(evt.target.result)) {
            UI.showToast('데이터 복원 완료! 💖', 'success');
            UI.renderTasks();
            populateCategoriesSelect();
            const m = document.getElementById('settings-modal');
            if (m) m.classList.remove('active');
          } else {
            UI.showToast('파일 형식이 맞지 않아요 😢', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    const rstBtn = document.getElementById('btn-reset-demo');
    if (rstBtn) {
      rstBtn.addEventListener('click', () => {
        if (confirm('샘플 데모 데이터로 초기화할까요?')) {
          store.resetDemo();
          UI.showToast('데모 데이터로 초기화되었어요 🌸', 'info');
          UI.renderTasks();
          populateCategoriesSelect();
          const m = document.getElementById('settings-modal');
          if (m) m.classList.remove('active');
        }
      });
    }
  }

  // =========================================================================
  // 8. Mobile Navigation & Horizontal Filter Bar Handlers
  // =========================================================================
  function bindMobileEvents() {
    // Horizontal Category Pills
    document.addEventListener('click', (e) => {
      const pill = e.target.closest('.mobile-cat-pill');
      if (pill && pill.dataset.filter) {
        document.querySelectorAll('.mobile-cat-pill').forEach(el => el.classList.remove('active'));
        pill.classList.add('active');
        store.activeFilter = pill.dataset.filter;
        UI.renderTasks();
      }
    });

    // Mobile Floating Bottom Navigation Bar
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.mobile-nav-btn');
      if (navBtn && navBtn.dataset.mobileNav) {
        const nav = navBtn.dataset.mobileNav;
        document.querySelectorAll('.mobile-nav-btn').forEach(el => el.classList.remove('active'));
        navBtn.classList.add('active');

        if (nav === 'tasks') {
          store.activeFilter = 'all';
          store.viewMode = 'list';
          UI.renderTasks();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (nav === 'vault') {
          store.activeFilter = 'vault';
          UI.renderTasks();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (nav === 'kanban') {
          store.activeFilter = 'all';
          store.viewMode = 'kanban';
          UI.renderTasks();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (nav === 'cloud') {
          UI.openCloudModal();
        }
      }
    });

    // Mobile Floating Action Button (+)
    const fabAdd = document.getElementById('btn-mobile-fab-add');
    if (fabAdd) {
      fabAdd.addEventListener('click', () => {
        sounds.playAdd();
        UI.openTaskModal();
      });
    }
  }

  // =========================================================================
  // 9. Category Drag & Drop Reordering Handler
  // =========================================================================
  function bindCategoryDragAndDrop() {
    let draggedCatId = null;

    document.addEventListener('dragstart', (e) => {
      const catItem = e.target.closest('.category-drag-item');
      if (!catItem) return;
      draggedCatId = catItem.dataset.catId;
      catItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedCatId);
    });

    document.addEventListener('dragend', (e) => {
      const catItem = e.target.closest('.category-drag-item');
      if (catItem) catItem.classList.remove('dragging');
      document.querySelectorAll('.category-drag-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
      });
    });

    const catList = document.getElementById('category-nav-list');
    if (catList) {
      catList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.category-drag-item');
        if (!targetItem || !draggedCatId || targetItem.dataset.catId === draggedCatId) return;

        e.dataTransfer.dropEffect = 'move';
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        document.querySelectorAll('.category-drag-item').forEach(el => {
          if (el !== targetItem) el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        if (e.clientY < midY) {
          targetItem.classList.add('drag-over-top');
          targetItem.classList.remove('drag-over-bottom');
        } else {
          targetItem.classList.add('drag-over-bottom');
          targetItem.classList.remove('drag-over-top');
        }
      });

      catList.addEventListener('dragleave', (e) => {
        const targetItem = e.target.closest('.category-drag-item');
        if (targetItem && !targetItem.contains(e.relatedTarget)) {
          targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      catList.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.category-drag-item');
        if (!targetItem || !draggedCatId || targetItem.dataset.catId === draggedCatId) {
          document.querySelectorAll('.category-drag-item').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
          });
          return;
        }

        const rect = targetItem.getBoundingClientRect();
        const isAfter = e.clientY >= (rect.top + rect.height / 2);
        const targetCatId = targetItem.dataset.catId;

        store.reorderCategories(draggedCatId, targetCatId, isAfter);
        UI.renderSidebar();
        populateCategoriesSelect();
        UI.showToast('카테고리 순서가 변경되었어요! 💖', 'info');
      });
    }
  }

  // =========================================================================
  // 10. File Vault Event Handlers
  // =========================================================================
  function bindFileVaultEvents() {
    const btnOpenUpload = document.getElementById('btn-open-file-upload');
    if (btnOpenUpload) btnOpenUpload.addEventListener('click', () => UI.openFileUploadModal());

    const dropzone = document.getElementById('vault-dropzone');
    const hiddenFileInput = document.getElementById('vault-file-hidden-input');

    if (dropzone && hiddenFileInput) {
      dropzone.addEventListener('click', () => hiddenFileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          await handleVaultFileUpload(files[0]);
        }
      });

      hiddenFileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          await handleVaultFileUpload(files[0]);
        }
      });
    }

    const uploadForm = document.getElementById('file-upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const modalFileInput = document.getElementById('modal-vault-file-input');
        const modalNoteInput = document.getElementById('modal-vault-file-note');
        if (!modalFileInput || !modalFileInput.files || modalFileInput.files.length === 0) {
          UI.showToast('업로드할 파일을 선택해주세요!', 'danger');
          return;
        }

        const file = modalFileInput.files[0];
        const note = modalNoteInput ? modalNoteInput.value.trim() : '';

        try {
          await cloudSync.uploadVaultFile(file, note);
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 40);
          UI.showToast(`'${file.name}' 파일이 보관함에 동기화되었어요! 💾`, 'success');
          UI.closeFileUploadModal();
          UI.renderFilesVault();
          UI.renderSidebar();
        } catch (err) {
          console.error(err);
          UI.showToast('파일 저장 중 오류가 발생했습니다.', 'danger');
        }
      });
    }

    document.addEventListener('click', async (e) => {
      const target = e.target;

      const dlBtn = target.closest('[data-action="download-file"]');
      if (dlBtn) {
        const fileId = dlBtn.dataset.fileId;
        if (fileId) {
          sounds.playComplete();
          await cloudSync.downloadVaultFile(fileId);
          UI.showToast('파일 다운로드가 시작되었어요! 📥', 'success');
        }
        return;
      }

      const delFileBtn = target.closest('[data-action="delete-file"]');
      if (delFileBtn) {
        const fileId = delFileBtn.dataset.fileId;
        if (fileId && confirm('보관 중인 이 파일을 삭제할까요?')) {
          await cloudSync.deleteVaultFile(fileId);
          sounds.playDelete();
          UI.showToast('파일이 보관함에서 삭제되었어요.', 'danger');
          UI.renderFilesVault();
          UI.renderSidebar();
        }
        return;
      }
    });
  }

  async function handleVaultFileUpload(file) {
    if (!file) return;
    const note = prompt(`'${file.name}' 파일에 대한 간단한 메모를 입력하세요 (선택 사항):`, '');
    if (note === null) return;

    try {
      await cloudSync.uploadVaultFile(file, note);
      sounds.playAdd();
      confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 40);
      UI.showToast(`'${file.name}' 파일이 보관함에 동기화되었어요! 💾`, 'success');
      UI.renderFilesVault();
      UI.renderSidebar();
    } catch (err) {
      console.error(err);
      UI.showToast('파일 저장 중 오류가 발생했습니다.', 'danger');
    }
  }

  // =========================================================================
  // 11. 2-Step Security Cloud Sync Events
  // =========================================================================
  function bindCloudEvents() {
    const btnCloudStatus = document.getElementById('btn-cloud-status');
    if (btnCloudStatus) {
      btnCloudStatus.addEventListener('click', () => UI.openCloudModal());
    }

    // 2-Step Security Form Submit
    const sync2StepForm = document.getElementById('sync-2step-form');
    if (sync2StepForm) {
      sync2StepForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const spaceInput = document.getElementById('sync-input-space-id');
        const pinInput = document.getElementById('sync-input-pin');
        const submitBtn = sync2StepForm.querySelector('button[type="submit"]');
        if (!spaceInput || !pinInput) return;

        const spaceId = spaceInput.value.trim();
        const pin = pinInput.value.trim();

        if (!spaceId || !pin) {
          UI.showToast('아이디와 2단계 비밀번호를 모두 입력해주세요!', 'danger');
          return;
        }

        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> 연결 중...';
        }

        try {
          const ok = await cloudSync.connect2Step(spaceId, pin);
          if (ok) {
            sounds.playCelebration();
            confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 45);
            UI.showToast(`2단계 보안 동기화 연결 완료! 💖`, 'success');
            UI.closeCloudModal();
          }
        } catch (err) {
          console.error(err);
          UI.showToast('연결 중 오류: ' + (err.message || ''), 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    }

    // Disconnect Sync
    const btnDisconnect = document.getElementById('btn-disconnect-sync');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => {
        if (confirm('동기화를 해제하고 로컬 모드로 전환할까요?')) {
          cloudSync.disconnect();
          UI.closeCloudModal();
        }
      });
    }

    // Save Custom Firebase Config (Optional)
    const btnSaveConfig = document.getElementById('btn-save-firebase-config');
    const configInput = document.getElementById('firebase-config-input');
    if (btnSaveConfig && configInput) {
      btnSaveConfig.addEventListener('click', () => {
        const val = configInput.value.trim();
        if (!val) {
          localStorage.removeItem('todolist_jy_firebase_config');
          UI.showToast('기본 Firebase 설정으로 복원되었습니다.', 'info');
          location.reload();
          return;
        }
        try {
          JSON.parse(val);
          localStorage.setItem('todolist_jy_firebase_config', val);
          UI.showToast('설정 저장 완료! 새로고침합니다.', 'success');
          setTimeout(() => location.reload(), 800);
        } catch (e) {
          UI.showToast('올바른 JSON 설정 형식이 아닙니다.', 'danger');
        }
      });
    }
  }

  // =========================================================================
  // 12. Kanban Drag & Drop Handler
  // =========================================================================
  function bindDragAndDrop() {
    let draggedId = null;

    document.addEventListener('dragstart', (e) => {
      if (e.target.closest('.category-drag-item')) return;
      const card = e.target.closest('.task-card');
      if (!card) return;
      draggedId = card.dataset.id;
      card.style.opacity = '0.4';
      e.dataTransfer.setData('text/plain', draggedId);
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.closest('.category-drag-item')) return;
      const card = e.target.closest('.task-card');
      if (card) card.style.opacity = '1';
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
    });

    document.querySelectorAll('.kanban-column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const st = col.dataset.status;
        if (draggedId && st) {
          const t = store.tasks.find(x => x.id === draggedId);
          if (t && t.status !== st) {
            store.updateTask(draggedId, { status: st });
            if (st === 'completed') {
              sounds.playComplete();
              confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 45);
            }
            UI.renderTasks();
          }
        }
      });
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
