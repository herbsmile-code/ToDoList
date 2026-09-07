/**
 * ToDoList JY - Utility Helpers & Audio/Confetti Engines (helpers.js)
 * Phase 1 Modularization: Pure Helper Functions, Sound Engine, and Confetti Engine
 */

(function(window) {
  'use strict';

  // =========================================================================
  // 1. General Utility Functions
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
  // 2. Cute Web Audio Sound Engine
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

    playPop() {
      this.playAdd();
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
  // 3. Cute Pastel Confetti Engine
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

  // Export to Global Window Namespace
  window.normalizeArray = normalizeArray;
  window.formatKRW = formatKRW;
  window.dataURLtoBlob = dataURLtoBlob;
  window.escapeHTML = escapeHTML;
  window.CuteSoundEngine = CuteSoundEngine;
  window.sounds = sounds;
  window.CuteConfettiEngine = CuteConfettiEngine;
  window.confetti = confetti;

})(window);
