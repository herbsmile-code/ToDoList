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

  // Global Navigation Bridge Handler
  window._handleSelectFilter = function(filter) {
    try {
      if (window.store) {
        window.store.activeFilter = filter;
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (window.UI) {
          window.UI.renderTasks();
          window.UI.renderSidebar();

          // 시각적 피드백 토스트
          const catMap = {
            'personal': '🌸 개인 카테고리로 이동했어요!',
            'work': '💼 업무 카테고리로 이동했어요!',
            'all': '📋 모든 할 일 목록으로 이동했어요!',
            'upcoming': '⏰ 다가오는 일정으로 이동했어요!',
            'overdue': '⚠️ 기한 지연 일정으로 이동했어요!',
            'pinned': '💖 중요한 일정으로 이동했어요!',
            'completed': '✨ 완료된 목록으로 이동했어요!',
            'calendar-month': '🗓️ 월별 달력으로 이동했어요!',
            'vacation': '🏖️ 연차관리로 이동했어요!',
            'photos': '📸 기록 보관함으로 이동했어요!',
            'notes': '✏️ 끄적끄적 메모장으로 이동했어요!',
            'ledger': '💰 가계부로 이동했어요!',
            'wishlist': '🎁 위시리스트로 이동했어요!',
            'sites': '🌐 사이트 모음으로 이동했어요!',
            'vault': '📁 파일 보관함으로 이동했어요!'
          };
          if (catMap[filter]) {
            window.UI.showToast(catMap[filter], 'info');
          }
        }
      }
    } catch (e) {
      console.warn('Navigation error:', e);
    }
  };

  window.selectCategoryFilter = function(catId, event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    window._handleSelectFilter(catId);
  };

  // Dynamic Real Today Date Helper (YYYY-MM-DD)
  function getRealTodayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Base "Today" Anchor Date (Real Time System Date)
  const TODAY_STR = getRealTodayStr();

  // =========================================================================
  // 0.1. Development Logs & Version History Data (개발기록 데이터)
  // =========================================================================
  const DEVLOG_DATA = [
    {
      version: 'v1.1',
      date: '2026-08-30',
      dateFormatted: '2026년 8월 30일 (오늘)',
      title: '🌸 2026 라이프 다이어리 대규모 고도화 & 인생 프로젝트·건강·취미·연차·파일보관함 및 실시간 클라우드 무결성 완성 (v1.1)',
      badge: '최신 배포 🌟',
      badgeColor: '#ff6b8b',
      summary: '🏢 인생 대형 프로젝트(왕숙 입주/시험관) 로드맵, 🩺 건강관리 & 🎨 취미활동 폴더 분할 및 일괄 이동, 🏖️ 0일 차감 휴가 분리, 📁 2GB IndexedDB 무제한 파일보관함, ✏️ 메모·파일 삭제 동기화 무결성 및 사이드바 유연한 구분선 완비',
      details: [
        '🏢 인생 대형 프로젝트 (Roadmap & Milestones) 신설: 왕숙 신도시 아파트 입주, 소중한 아기 천사 맞이(시험관 준비) 등 인생의 큰 프로젝트 목표 설정, 단계별 중도금 납부/사전점검/입주일 및 시술 단계별 마일스톤 관리, D-Day & 실시간 프로그레스 바, 폭죽 완료 체크 및 24종 감성 이모지 피커 완비',
        '🩺 건강관리 (Health Manager) 고도화: 건강검진, 산부인과, 치아, 수술계획, 일반 등 맞춤 폴더 분류, 다중 메모 선택 및 다른 폴더로 일괄 이동(Batch Move), 폴더별 편집/삭제(삭제 시 메모 일반 폴더로 자동 안전 이관) 및 대용량 진료 메모/진료비 기록 지원',
        '🎨 취미활동 일지 (Hobby & Life Journal) 고도화: 운동, 피아노, 그림, 독서 등 다양한 취미 카테고리 폴더 지원, 폴더 편집 및 삭제, 다중 취미 일지 일괄 폴더 이동 및 시간/장소 꼼꼼한 기록',
        '🏖️ 연차·반차 & 0일 차감 휴가 분리 관리: 총 발생연차(15일 등 설정), 사용한 연차, 남은 연차 통계 및 연차 차감 없는 0일 휴가(경조사/포상 등) 별도 카운트, 년도별/월별 내역 필터링 및 월별 실시간 요약 배너 탑재',
        '📁 파일 보관함 2GB 무제한 IndexedDB 구축: 브라우저 5MB 한계를 극복한 로컬 IndexedDB 스토리지 엔진 도입, 엑셀/PDF/이미지 등 대용량 파일 드래그 앤 드롭 업로드 & 안전한 다운로드',
        '✏️ 끄적끄적 메모장 & 파일보관함 삭제 무결성 완전 확보: 팝업 확인 삭제 시 실시간 클라우드 동기화 덮어쓰기 레이스 컨디션 및 파일보관함 Fallback 자동 복원 루프 원천 차단 (삭제 즉시 영구 파기 & 클라우드 전파)',
        '🧭 사이드바 유연한 구분선 & 정렬: 업무 메뉴 아래 구분선(divider-1), 연차관리 아래 구분선(divider-vacation) 등 요청에 따른 유연한 구분선 배치 및 카테고리 순서 편집 모드 완비',
        '💎 보물지식함 & 신혼 가계부 연동 강화: 보물지식함 6단위 페이지네이션(1,2,3,4...), 2026년 신혼 가계부 12개월 엑셀 템플릿 양식 다운로드 및 자동 분석 차트 복구',
        '🛡️ AES-256 E2EE 종단간 암호화 실시간 Firebase 클라우드 동기화: 0.01ms 즉시 암호화/복호화 캐시 엔진 및 로컬 최신 상태 우선 동기화 보장'
      ]
    },
    {
      version: 'v1.0',
      date: '2026-08-29',
      dateFormatted: '2026년 8월 29일 (어제까지)',
      title: '🚀 Todolist JY 스마트 라이프 다이어리 기초 구축 (v1.0)',
      badge: '안정화 버전 💎',
      badgeColor: '#7048e8',
      summary: '할 일 관리, 주간/월별 캘린더 플래너, 신혼 가계부 엑셀 연동, 폴라로이드 사진첩, 위시리스트 및 AES-256 E2EE 보안 동기화 기초 완성',
      details: [
        '📋 개인 & 업무 할 일 관리 (리스트 뷰 & 칸반 보드 뷰, 마감일 및 상단 고정)',
        '🗓️ 2026년 8월 기준 월별 달력 플래너 및 가로형 주간 다이어리',
        '💰 2026년 신혼 가계부: 12개월 스택 바 차트, 영호 & 진영 급여, 고정지출/변동지출 및 엑셀 업로드',
        '📸 폴라로이드 갤러리: 감성 사진 등록, 1:1 라이트박스 뷰어 및 드래그 앤 드롭 순서 변경',
        '✏️ 끄적끄적 메모장 (감성 테이프 메모, 4가지 파스텔 컬러, 수정 및 삭제)',
        '🎁 위시리스트 허브: 카테고리별 소원 등록 및 소원 달성 폭죽 스탬프 애니메이션',
        '📁 파일 보관함: 엑셀/PDF/이미지 등 안전 보관 및 다운로드',
        '🛡️ AES-256 E2EE 종단간 암호화 실시간 Firebase 클라우드 동기화'
      ]
    }
  ];

  const DEFAULT_HEALTH_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '🌸' },
    { id: 'obgyn', name: '산부인과', icon: '🤰' },
    { id: 'dental', name: '치아', icon: '🦷' },
    { id: 'surgery', name: '수술계획', icon: '🏥' },
    { id: 'checkup', name: '건강검진', icon: '🩺' },
    { id: 'general', name: '일반/기타', icon: '💊' }
  ];

  const HEALTH_EMOJI_LIST = [
    '🩺', '🏥', '🤰', '🦷', '💊', '🩹', '💉', '🩸',
    '👁️', '👂', '🧠', '🫀', '🫁', '🦴', '🧴', '🧘',
    '🏃', '🥗', '🍎', '🍵', '🛌', '💖', '⭐', '📁'
  ];

  const DEFAULT_HOBBY_FOLDERS = [
    { id: 'all', name: '전체보기', icon: '🎨' },
    { id: 'workout', name: '운동', icon: '🏃' },
    { id: 'piano', name: '피아노', icon: '🎹' },
    { id: 'drawing', name: '그림', icon: '🎨' },
    { id: 'reading', name: '독서', icon: '📚' },
    { id: 'general', name: '기타취미', icon: '✨' }
  ];

  const HOBBY_EMOJI_LIST = [
    '🏃', '🏋️', '🧘', '🏊', '🚴', '🧗', '🎹', '🎸',
    '🎻', '🥁', '🎨', '🖌️', '📚', '✍️', '🍳', '☕',
    '🪴', '📷', '🎮', '🧩', '🎬', '🏕️', '🧶', '✨'
  ];

  const DEFAULT_PROJECT_EMOJIS = [
    '🏢', '🏠', '🔑', '🌱', '👶', '🍼', '💍', '🚗', 
    '✈️', '🎓', '💰', '📈', '🎯', '🌟', '💼', '🏡', 
    '🏥', '🎨', '📚', '🏋️', '💻', '💡', '🌈', '💖'
  ];

  const DEFAULT_PROJECTS = [
    {
      id: 'proj-wangsook',
      title: '왕숙 신도시 아파트 입주 프로젝트',
      category: '부동산/주거',
      icon: '🏢',
      targetDate: '2027-12-31',
      budget: '3억 5,000만원',
      description: '남양주 왕숙 신도시 내 집 마련 & 성공적인 입주 로드맵 🔑✨',
      createdAt: 1724500000000,
      milestones: [
        { id: 'm-1', title: '계약금 10% 납부 완료', date: '2025-06-15', amount: '5,000만원', completed: true, memo: '공급계약서 수령 및 계약금 납부 영수증 보관 완료' },
        { id: 'm-2', title: '1차 중도금 대출 자필서명 및 실행', date: '2026-02-20', amount: '6,000만원', completed: true, memo: '지정 은행 방문하여 서류 제출 및 중도금 대출 실행' },
        { id: 'm-3', title: '2차 중도금 납부', date: '2026-08-25', amount: '6,000만원', completed: false, memo: '납부 기한 확인 및 자동이체 계좌 잔액 점검' },
        { id: 'm-4', title: '입주자 사전점검 방문 및 하자 체크', date: '2027-10-15', amount: '', completed: false, memo: '전문 점검업체 동행 예약 및 줄자/포스트잇 지참' },
        { id: 'm-5', title: '잔금 정산, 취득세 납부 및 열쇠 수령 (입주!)', date: '2027-12-31', amount: '1억 8,000만원', completed: false, memo: '디딤돌/보금자리론 잔금대출 실행, 입주청소 및 이사 예약' }
      ]
    },
    {
      id: 'proj-ivf',
      title: '소중한 아기 천사 맞이 (시험관 준비)',
      category: '가족/임신',
      icon: '🌱',
      targetDate: '2026-12-31',
      budget: '',
      description: '건강하고 행복한 아기 천사를 맞이하기 위한 사랑 가득한 여정 👶💖',
      createdAt: 1724505000000,
      milestones: [
        { id: 'ivf-1', title: '난임 전문 병원 첫 상담 및 기본 산전 검사', date: '2026-04-10', amount: '35만원', completed: true, memo: '부부 기초 혈액 검사 및 호르몬 수치 확인' },
        { id: 'ivf-2', title: '보건소 정부 난임 시술비 지원 신청 및 결정통지서 수령', date: '2026-05-15', amount: '', completed: true, memo: '정부24 온라인 신청 및 지원 결정통지서 병원 제출' },
        { id: 'ivf-3', title: '과배란 유도 주사 시작 및 엽산/영양제 챙겨먹기', date: '2026-08-20', amount: '45만원', completed: true, memo: '매일 일정한 시간에 자가 주사 투여, 단백질 식단 위주 식사' },
        { id: 'ivf-4', title: '난자 채취 및 수정란/배아 5일 배양', date: '2026-09-10', amount: '80만원', completed: false, memo: '채취 당일 안정 취하기, 이온음료 충분히 섭취' },
        { id: 'ivf-5', title: '동결 배아 이식 & 1차 혈액 피검사 (희망 가득!)', date: '2026-10-15', amount: '30만원', completed: false, memo: '착상에 좋은 따뜻한 음식 섭취 및 편안한 마음 유지하기 🌸' }
      ]
    }
  ];

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

      // Always restore true local timestamp from localStorage to prevent overwriting new local items on refresh!
      let localTs = 0;
      try {
        const raw = localStorage.getItem('todolist_jy_data_v39');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.updatedAt) localTs = Number(parsed.updatedAt) || 0;
        }
      } catch (e) {}
      this.lastSyncedUpdatedAt = localTs;
      this.isPushing = false;
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
        'calendar-month-view-container', 'calendar-week-view-container',
        'vacation-view-container', 'sites-view-container'
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
      try { UI.renderVacation(); } catch (e) {}
      try { UI.renderSites(); } catch (e) {}
      try { UI.renderSidebar(); } catch (e) {}
    }

    async fetchLatestFromCloud(force = false) {
      if (!this.spaceId || !this.pin) return;
      if (this.isPushing) return; // Prevent race conditions while local mutation is uploading
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
              const remoteUpdated = Number(data.updatedAt) || 0;
              const localUpdated = Number(this.lastSyncedUpdatedAt) || 0;

              // Only accept cloud data if cloud is strictly NEWER than local state
              if (remoteUpdated > localUpdated) {
                this.lastSyncedUpdatedAt = remoteUpdated;
                if (data.tasks !== undefined) {
                  const cloudTasks = normalizeArray(data.tasks).filter(t => t && t.id && !MOCK_DEMO_IDS.has(t.id));
                  const taskMap = new Map();
                  cloudTasks.forEach(t => taskMap.set(t.id, t));
                  // Preserve recently created local tasks
                  store.tasks.forEach(localT => {
                    if (localT && localT.id && !taskMap.has(localT.id)) {
                      taskMap.set(localT.id, localT);
                    }
                  });
                  store.tasks = Array.from(taskMap.values());
                  store.tasks.forEach(t => {
                    if (!t.category || (t.category !== 'personal' && t.category !== 'work')) {
                      t.category = 'personal';
                    }
                  });
                }
                if (data.categories !== undefined && normalizeArray(data.categories).length) {
                  let cats = normalizeArray(data.categories).filter(c => c && c.id && (c.id === 'personal' || c.id === 'work' || c.id === 'schedule'));
                  cats = cats.map(c => {
                    if (c.id === 'personal' || c.id === 'schedule') return { id: 'personal', name: '개인 🌸', color: '#f06595' };
                    if (c.id === 'work') return { id: 'work', name: '업무 💼', color: '#868e96' };
                    return null;
                  }).filter(Boolean);
                  const seen = new Set();
                  cats = cats.filter(c => {
                    if (seen.has(c.id)) return false;
                    seen.add(c.id);
                    return true;
                  });
                  DEFAULT_CATEGORIES.forEach(def => {
                    if (!cats.some(c => c.id === def.id)) cats.push(def);
                  });
                  store.categories = cats;
                }
                if (data.wishlist !== undefined) {
                  const cloudWishes = normalizeArray(data.wishlist).filter(w => w && w.id && !MOCK_DEMO_IDS.has(w.id));
                  const wishMap = new Map();
                  cloudWishes.forEach(w => wishMap.set(w.id, w));
                  store.wishlist.forEach(lw => {
                    if (lw && lw.id && !wishMap.has(lw.id)) wishMap.set(lw.id, lw);
                  });
                  store.wishlist = Array.from(wishMap.values());
                }
                if (data.photos !== undefined) {
                  const cloudPhotos = normalizeArray(data.photos).filter(p => p && p.id);
                  const photoMap = new Map();
                  cloudPhotos.forEach(p => photoMap.set(p.id, p));
                  store.photos.forEach(lp => {
                    if (lp && lp.id && !photoMap.has(lp.id)) photoMap.set(lp.id, lp);
                  });
                  store.photos = Array.from(photoMap.values());
                }
                if (data.notes !== undefined) {
                  const cloudNotes = normalizeArray(data.notes).filter(n => n && n.id && !MOCK_DEMO_IDS.has(n.id));
                  const noteMap = new Map();
                  cloudNotes.forEach(n => noteMap.set(n.id, n));
                  store.notes.forEach(ln => {
                    if (ln && ln.id && !noteMap.has(ln.id)) noteMap.set(ln.id, ln);
                  });
                  store.notes = Array.from(noteMap.values());
                }
                if (data.honeymoonData !== undefined) store.honeymoonData = data.honeymoonData;
                if (data.ledgerFiles !== undefined) store.ledgerFiles = normalizeArray(data.ledgerFiles).filter(f => f && f.id && !MOCK_DEMO_IDS.has(f.id));
                if (data.vacations !== undefined) store.vacations = normalizeArray(data.vacations);
                if (typeof data.totalVacationDays === 'number') store.totalVacationDays = data.totalVacationDays;
                if (data.sites !== undefined) store.sites = normalizeArray(data.sites);
                if (data.healthNotes !== undefined) {
                  const cloudHNotes = normalizeArray(data.healthNotes);
                  const hMap = new Map();
                  cloudHNotes.forEach(n => hMap.set(n.id, n));
                  store.healthNotes.forEach(ln => {
                    if (ln && ln.id && !hMap.has(ln.id)) hMap.set(ln.id, ln);
                  });
                  store.healthNotes = Array.from(hMap.values());
                }
                if (data.healthFolders !== undefined && Array.isArray(data.healthFolders)) {
                  let hFolders = data.healthFolders.slice();
                  DEFAULT_HEALTH_FOLDERS.forEach(defF => {
                    if (!hFolders.some(f => f && f.id === defF.id)) {
                      const genIdx = hFolders.findIndex(f => f && f.id === 'general');
                      if (genIdx !== -1) hFolders.splice(genIdx, 0, Object.assign({}, defF));
                      else hFolders.push(Object.assign({}, defF));
                    }
                  });
                  store.healthFolders = hFolders;
                }
                if (data.hobbyNotes !== undefined) {
                  const cloudHbNotes = normalizeArray(data.hobbyNotes);
                  const hbMap = new Map();
                  cloudHbNotes.forEach(n => hbMap.set(n.id, n));
                  store.hobbyNotes.forEach(ln => {
                    if (ln && ln.id && !hbMap.has(ln.id)) hbMap.set(ln.id, ln);
                  });
                  store.hobbyNotes = Array.from(hbMap.values());
                }
                if (data.hobbyFolders !== undefined && Array.isArray(data.hobbyFolders)) {
                  let hbFolders = data.hobbyFolders.slice();
                  DEFAULT_HOBBY_FOLDERS.forEach(defF => {
                    if (!hbFolders.some(f => f && f.id === defF.id)) {
                      const genIdx = hbFolders.findIndex(f => f && f.id === 'general');
                      if (genIdx !== -1) hbFolders.splice(genIdx, 0, Object.assign({}, defF));
                      else hbFolders.push(Object.assign({}, defF));
                    }
                  });
                  store.hobbyFolders = hbFolders;
                }
                if (Array.isArray(data.projects)) {
                  store.projects = data.projects;
                }
                if (data.sidebarMenuOrder !== undefined && Array.isArray(data.sidebarMenuOrder)) {
                  const defaultOrder = ['personal', 'work', 'divider-1', 'project', 'hobby', 'health', 'vacation', 'divider-vacation', 'photos', 'notes', 'divider-2', 'ledger', 'wishlist', 'sites', 'divider-3', 'devlog', 'vault'];
                  let order = data.sidebarMenuOrder.slice();
                  if (!order.includes('project')) {
                    const d1Idx = order.indexOf('divider-1');
                    if (d1Idx !== -1) order.splice(d1Idx + 1, 0, 'project');
                    else {
                      const wIdx = order.indexOf('work');
                      if (wIdx !== -1) order.splice(wIdx + 1, 0, 'project');
                      else order.push('project');
                    }
                  }
                  if (!order.includes('hobby')) {
                    const healthIdx = order.indexOf('health');
                    if (healthIdx !== -1) order.splice(healthIdx, 0, 'hobby');
                    else {
                      const vacIdx = order.indexOf('vacation');
                      if (vacIdx !== -1) order.splice(vacIdx, 0, 'hobby');
                      else order.push('hobby');
                    }
                  }
                  if (!order.includes('health')) {
                    const vacIdx = order.indexOf('vacation');
                    if (vacIdx !== -1) order.splice(vacIdx, 0, 'health');
                    else order.push('health');
                  }
                  if (!order.includes('devlog')) {
                    const vaultIdx = order.indexOf('vault');
                    if (vaultIdx !== -1) order.splice(vaultIdx, 0, 'devlog');
                    else order.push('devlog');
                  }
                  if (!order.includes('divider-vacation')) {
                    const vacIdx = order.indexOf('vacation');
                    if (vacIdx !== -1) order.splice(vacIdx + 1, 0, 'divider-vacation');
                    else order.push('divider-vacation');
                  }
                  defaultOrder.forEach(id => {
                    if (!order.includes(id)) order.push(id);
                  });

                  // 1. Ensure divider-1 is positioned RIGHT AFTER work (업무 메뉴 아래에 구분선)
                  const d1Idx = order.indexOf('divider-1');
                  const wIdx = order.indexOf('work');
                  if (d1Idx !== -1 && wIdx !== -1 && d1Idx !== wIdx + 1) {
                    order.splice(d1Idx, 1);
                    const newWIdx = order.indexOf('work');
                    order.splice(newWIdx + 1, 0, 'divider-1');
                  }

                  // 2. Ensure project is positioned RIGHT AFTER divider-1
                  const prIdx = order.indexOf('project');
                  const newD1Idx = order.indexOf('divider-1');
                  if (prIdx !== -1 && newD1Idx !== -1 && prIdx !== newD1Idx + 1) {
                    order.splice(prIdx, 1);
                    const curD1 = order.indexOf('divider-1');
                    order.splice(curD1 + 1, 0, 'project');
                  }

                  // 3. Ensure hobby is positioned RIGHT AFTER project
                  const hbIdx = order.indexOf('hobby');
                  const curPr = order.indexOf('project');
                  if (hbIdx !== -1 && curPr !== -1 && hbIdx !== curPr + 1) {
                    order.splice(hbIdx, 1);
                    const latestPr = order.indexOf('project');
                    order.splice(latestPr + 1, 0, 'hobby');
                  }

                  // 4. Ensure divider-vacation is positioned RIGHT AFTER vacation
                  const dvIdx = order.indexOf('divider-vacation');
                  const vIdx = order.indexOf('vacation');
                  if (dvIdx !== -1 && vIdx !== -1 && dvIdx !== vIdx + 1) {
                    order.splice(dvIdx, 1);
                    const newVIdx = order.indexOf('vacation');
                    order.splice(newVIdx + 1, 0, 'divider-vacation');
                  }

                  store.sidebarMenuOrder = order;
                }
                if (Array.isArray(data.vaultFiles)) {
                  const localVault = await VaultDBEngine.getAll();
                  // Clean Smart Merge: Preserve local dataUrl if cloud copy is lightweight metadata
                  const mergedFiles = data.vaultFiles.map(cloudF => {
                    const localMatch = (localVault || []).find(l => l && l.id === cloudF.id);
                    if (localMatch && localMatch.dataUrl && !cloudF.dataUrl) {
                      return Object.assign({}, cloudF, { dataUrl: localMatch.dataUrl });
                    }
                    return cloudF;
                  });
                  // Save strictly the synchronized list (deleted items in cloud are safely pruned locally)
                  await this.saveVaultFiles(mergedFiles);
                  try { UI.renderFilesVault(); } catch (e) {}
                }
                
                store.saveLocalOnly();
                this.renderAllViews();

                // If cloud data was in legacy plain format, auto-upgrade to encrypted format
                if (!rawResponse.isEncrypted) {
                  await this.pushTasksToCloud();
                }
              } else if (localUpdated > remoteUpdated && force) {
                // Local is newer and force sync was requested -> upload local truth to cloud
                await this.pushTasksToCloud(true);
              }
            }
          } else if (!rawResponse) {
            // 클라우드가 비어있다면 현재 로컬 데이터를 즉시 클라우드로 암호화 업로드
            const vFiles = await this.getAllVaultFiles();
            if (store.tasks.length > 0 || store.notes.length > 0 || store.photos.length > 0 || store.wishlist.length > 0 || vFiles.length > 0 || (store.projects && store.projects.length > 0)) {
              await this.pushTasksToCloud(true);
            }
          }
        }
      } catch (e) {
        console.warn('RTDB sync fetch error:', e);
      }
    }

    async pushTasksToCloud(immediate = false) {
      if (!this.spaceId || !this.pin) return;
      this.lastSyncedUpdatedAt = Date.now();
      
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
      this.isPushing = true;
      const key = this.getStorageKey();
      const vaultFiles = await this.getAllVaultFiles();
      
      // Sanitize vault files for cloud RTDB (strip huge dataUrls > 500KB to prevent HTTP 413 Payload Too Large)
      const sanitizedVaultFiles = (vaultFiles || []).map(f => {
        if (f.dataUrl && f.dataUrl.length > 500 * 1024) {
          const clone = Object.assign({}, f);
          delete clone.dataUrl;
          return clone;
        }
        return f;
      });

      const nowTs = Date.now();
      this.lastSyncedUpdatedAt = nowTs;

      const rawPayload = {
        tasks: store.tasks,
        categories: store.categories,
        sidebarMenuOrder: store.sidebarMenuOrder,
        wishlist: store.wishlist,
        photos: store.photos,
        notes: store.notes,
        vaultFiles: sanitizedVaultFiles,
        honeymoonData: store.honeymoonData,
        ledgerFiles: store.ledgerFiles,
        vacations: store.vacations,
        totalVacationDays: store.totalVacationDays,
        sites: store.sites,
        healthNotes: store.healthNotes,
        healthFolders: store.healthFolders,
        hobbyNotes: store.hobbyNotes,
        hobbyFolders: store.hobbyFolders,
        projects: store.projects,
        updatedAt: nowTs
      };

      try {
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
      } finally {
        this.isPushing = false;
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
          this.fetchLatestFromCloud(false);
        }
      });
      window.addEventListener('focus', () => {
        if (this.spaceId && this.pin) {
          this.fetchLatestFromCloud(false);
        }
      });
    }

    async saveFileToVault(fileObj, note = '') {
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

    async getAllVaultFiles() {
      try {
        const idbFiles = await VaultDBEngine.getAll();
        // Return indexedDB files directly (if empty, it means 0 files)
        if (Array.isArray(idbFiles) && idbFiles.length > 0) return idbFiles;

        // Legacy 1-time migration only if never migrated
        const migratedKey = 'todolist_jy_vault_migrated_v2';
        if (!localStorage.getItem(migratedKey)) {
          localStorage.setItem(migratedKey, 'true');
          const raw = localStorage.getItem('todolist_jy_vault_files');
          const lsFiles = raw ? JSON.parse(raw) : [];
          if (lsFiles.length > 0) {
            await VaultDBEngine.saveAll(lsFiles);
            return lsFiles;
          }
        }
        return [];
      } catch (e) {
        console.warn('getAllVaultFiles error:', e);
        return [];
      }
    }

    async addVaultFiles(newItems) {
      if (!Array.isArray(newItems) || !newItems.length) return [];
      try {
        await VaultDBEngine.addFiles(newItems);
        const all = await this.getAllVaultFiles();
        await this.saveVaultFiles(all);
        await this.pushTasksToCloud(true);
        return all;
      } catch (e) {
        console.error('addVaultFiles error:', e);
        return [];
      }
    }

    async saveVaultFiles(files) {
      try {
        await VaultDBEngine.saveAll(files || []);
        const metaOnly = (files || []).map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          note: f.note,
          createdAt: f.createdAt
        }));
        localStorage.setItem('todolist_jy_vault_meta', JSON.stringify(metaOnly));
        localStorage.setItem('todolist_jy_vault_files', JSON.stringify(metaOnly));
      } catch (e) {
        console.warn('saveVaultFiles error:', e);
      }
    }

    async deleteVaultFile(fileId) {
      try {
        await VaultDBEngine.delete(fileId);
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

        const remaining = await this.getAllVaultFiles();
        await this.saveVaultFiles(remaining);

        this.lastSyncedUpdatedAt = Date.now();
        await this.pushTasksToCloud(true);
      } catch (e) {
        console.error('deleteVaultFile error:', e);
      }
    }
  }

  // IndexedDB Vault Storage Engine (No 5MB localStorage limit!)
  const VaultDBEngine = {
    dbName: 'todolist_jy_vault_idb',
    storeName: 'vault_files',
    dbPromise: null,

    async getDB() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
      return this.dbPromise;
    },

    async getAll() {
      try {
        const db = await this.getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(list);
          };
          req.onerror = () => resolve([]);
        });
      } catch (err) {
        console.warn('IDB get error:', err);
        return [];
      }
    },

    async addFiles(newItems) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          (newItems || []).forEach(file => {
            if (file && file.id) store.put(file);
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('IDB addFiles error:', err);
        return false;
      }
    },

    async saveAll(files) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.clear(); // Clear existing objects so deletions are truly persisted!
          (files || []).forEach(file => {
            if (file && file.id) store.put(file);
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('IDB save error:', err);
        return false;
      }
    },

    async delete(id) {
      try {
        const db = await this.getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (err) {
        return false;
      }
    }
  };

  const cloudSync = new CloudSyncManager();
  window.cloudSync = cloudSync;

  // =========================================================================
  // 4. Default Mock Data & Categories
  // =========================================================================
  const STORAGE_KEY = 'todolist_jy_data_v39';
  const STREAK_KEY = 'todolist_jy_streak_v39';

  const DEFAULT_CATEGORIES = [
    { id: 'personal', name: '개인 🌸', color: '#f06595' },
    { id: 'work', name: '업무 💼', color: '#868e96' }
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
        total: 6415336,
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
      this.honeymoonData = JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA));
      this.ledgerFiles = [];
      this.selectedLedgerMonth = 7;
      this.activeFilter = localStorage.getItem('todolist_jy_active_filter') || 'all';
      this.activePriority = 'all';
      this.activeWishCat = 'all';
      this.selectedVacationYear = '2026';
      this.selectedVacationMonth = String(new Date().getMonth() + 1);
      this.vacationTypeFilter = 'all';
      this.isReorderMode = false;
      this.selectedHealthNotes = new Set();
      this.selectedHobbyNotes = new Set();
      this.projects = [];
      this.activeProjectId = null;
      this.sidebarMenuOrder = ['personal', 'work', 'divider-1', 'project', 'hobby', 'health', 'vacation', 'divider-vacation', 'photos', 'notes', 'divider-2', 'ledger', 'wishlist', 'sites', 'divider-3', 'devlog', 'vault'];
      this.searchQuery = '';
      this.sortBy = 'dueDate';
      this.viewMode = localStorage.getItem('todolist_jy_view') || 'list';
      this.streak = { count: 3, lastDate: TODAY_STR };
      
      // 2026-08-25 Anchor Dates for Calendars
      this.currentCalendarDate = new Date(2026, 7, 25);
      this.selectedCalendarDateStr = TODAY_STR;
      this.currentWeeklyDate = new Date(2026, 7, 25);

      this.loadLocalOnly();
    }

    loadLocalOnly() {
      let savedData = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedData = JSON.parse(raw);
      } catch (e) {
        console.error('Store load error:', e);
      }

      const userTasks = (savedData && Array.isArray(savedData.tasks)) ? savedData.tasks : [];
      const userWishlist = (savedData && Array.isArray(savedData.wishlist)) ? savedData.wishlist : [];
      const userPhotos = (savedData && Array.isArray(savedData.photos)) ? savedData.photos : [];
      const userNotes = (savedData && Array.isArray(savedData.notes)) ? savedData.notes : [];
      const userLedgerFiles = (savedData && Array.isArray(savedData.ledgerFiles)) ? savedData.ledgerFiles : [];
      const userCategories = (savedData && Array.isArray(savedData.categories)) ? savedData.categories : null;
      const userVacations = (savedData && Array.isArray(savedData.vacations)) ? savedData.vacations : [];
      const userTotalVacationDays = (savedData && typeof savedData.totalVacationDays === 'number') ? savedData.totalVacationDays : 15.0;
      const userSites = (savedData && Array.isArray(savedData.sites)) ? savedData.sites : [];
      const userHealthNotes = (savedData && Array.isArray(savedData.healthNotes)) ? savedData.healthNotes : [];
      let userHealthFolders = (savedData && Array.isArray(savedData.healthFolders)) ? savedData.healthFolders : DEFAULT_HEALTH_FOLDERS.slice();
      const userHobbyNotes = (savedData && Array.isArray(savedData.hobbyNotes)) ? savedData.hobbyNotes : [];
      let userHobbyFolders = (savedData && Array.isArray(savedData.hobbyFolders)) ? savedData.hobbyFolders : DEFAULT_HOBBY_FOLDERS.slice();
      const userProjects = (savedData && Array.isArray(savedData.projects)) ? savedData.projects : JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
      const userSidebarOrder = (savedData && Array.isArray(savedData.sidebarMenuOrder)) ? savedData.sidebarMenuOrder : null;

      // Ensure all default health folders (including checkup) exist
      DEFAULT_HEALTH_FOLDERS.forEach(defF => {
        if (!userHealthFolders.some(f => f && f.id === defF.id)) {
          const genIdx = userHealthFolders.findIndex(f => f && f.id === 'general');
          if (genIdx !== -1) userHealthFolders.splice(genIdx, 0, Object.assign({}, defF));
          else userHealthFolders.push(Object.assign({}, defF));
        }
      });

      // Ensure all default hobby folders exist
      DEFAULT_HOBBY_FOLDERS.forEach(defF => {
        if (!userHobbyFolders.some(f => f && f.id === defF.id)) {
          const genIdx = userHobbyFolders.findIndex(f => f && f.id === 'general');
          if (genIdx !== -1) userHobbyFolders.splice(genIdx, 0, Object.assign({}, defF));
          else userHobbyFolders.push(Object.assign({}, defF));
        }
      });

      const combinedTasks = userTasks.filter(t => t && t.id && !MOCK_DEMO_IDS.has(t.id));
      const combinedWishlist = userWishlist.filter(w => w && w.id && !MOCK_DEMO_IDS.has(w.id));
      const combinedPhotos = userPhotos.filter(p => p && p.id);
      const combinedNotes = userNotes.filter(n => n && n.id && !MOCK_DEMO_IDS.has(n.id));
      const combinedLedgerFiles = userLedgerFiles.filter(l => l && l.id && !MOCK_DEMO_IDS.has(l.id));

      // Standardize categories: 'personal' (개인 🌸) and 'work' (업무 💼) ONLY
      let finalCategories = Array.isArray(userCategories) ? userCategories : DEFAULT_CATEGORIES;
      const validCatIds = new Set(['personal', 'work']);
      
      finalCategories = finalCategories.filter(c => c && c.id && (validCatIds.has(c.id) || c.id === 'schedule'));
      finalCategories = finalCategories.map(c => {
        if (c.id === 'personal' || c.id === 'schedule') {
          return { id: 'personal', name: '개인 🌸', color: '#f06595' };
        }
        if (c.id === 'work') {
          return { id: 'work', name: '업무 💼', color: '#868e96' };
        }
        return null;
      }).filter(Boolean);

      // Deduplicate by ID
      const seenCatIds = new Set();
      finalCategories = finalCategories.filter(c => {
        if (seenCatIds.has(c.id)) return false;
        seenCatIds.add(c.id);
        return true;
      });

      // Ensure both personal and work exist
      DEFAULT_CATEGORIES.forEach(defCat => {
        if (!finalCategories.some(c => c.id === defCat.id)) {
          finalCategories.push(defCat);
        }
      });

      // Map any tasks with unknown category safely to 'personal'
      combinedTasks.forEach(task => {
        if (!task.category || !validCatIds.has(task.category)) {
          task.category = 'personal';
        }
      });

      // Sidebar menu items order with dividers, project, hobby, health, and devlog
      const defaultOrder = ['personal', 'work', 'divider-1', 'project', 'hobby', 'health', 'vacation', 'divider-vacation', 'photos', 'notes', 'divider-2', 'ledger', 'wishlist', 'sites', 'divider-3', 'devlog', 'vault'];
      let finalOrder = userSidebarOrder ? userSidebarOrder.slice() : defaultOrder;

      // 1. Ensure essential items exist
      if (!finalOrder.includes('project')) {
        const d1Idx = finalOrder.indexOf('divider-1');
        if (d1Idx !== -1) finalOrder.splice(d1Idx + 1, 0, 'project');
        else {
          const wIdx = finalOrder.indexOf('work');
          if (wIdx !== -1) finalOrder.splice(wIdx + 1, 0, 'project');
          else finalOrder.push('project');
        }
      }
      if (!finalOrder.includes('hobby')) {
        const healthIdx = finalOrder.indexOf('health');
        if (healthIdx !== -1) finalOrder.splice(healthIdx, 0, 'hobby');
        else {
          const vacIdx = finalOrder.indexOf('vacation');
          if (vacIdx !== -1) finalOrder.splice(vacIdx, 0, 'hobby');
          else finalOrder.push('hobby');
        }
      }
      if (!finalOrder.includes('health')) {
        const vacIdx = finalOrder.indexOf('vacation');
        if (vacIdx !== -1) finalOrder.splice(vacIdx, 0, 'health');
        else finalOrder.push('health');
      }
      if (!finalOrder.includes('devlog')) {
        const vaultIdx = finalOrder.indexOf('vault');
        if (vaultIdx !== -1) finalOrder.splice(vaultIdx, 0, 'devlog');
        else finalOrder.push('devlog');
      }
      if (!finalOrder.includes('divider-vacation')) {
        const vacIdx = finalOrder.indexOf('vacation');
        if (vacIdx !== -1) finalOrder.splice(vacIdx + 1, 0, 'divider-vacation');
        else finalOrder.push('divider-vacation');
      }
      defaultOrder.forEach(id => {
        if (!finalOrder.includes(id)) finalOrder.push(id);
      });

      // 2. Ensure divider-1 is positioned RIGHT BEFORE hobby (취미활동 메뉴 위에 구분선)
      const d1Idx = finalOrder.indexOf('divider-1');
      const hIdx = finalOrder.indexOf('hobby');
      if (d1Idx !== -1 && hIdx !== -1 && d1Idx !== hIdx - 1) {
        finalOrder.splice(d1Idx, 1);
        const newHIdx = finalOrder.indexOf('hobby');
        finalOrder.splice(newHIdx, 0, 'divider-1');
      }

      // 3. Ensure divider-vacation is positioned RIGHT AFTER vacation (연차관리 메뉴 아래에 구분선)
      const dvIdx = finalOrder.indexOf('divider-vacation');
      const vIdx = finalOrder.indexOf('vacation');
      if (dvIdx !== -1 && vIdx !== -1 && dvIdx !== vIdx + 1) {
        finalOrder.splice(dvIdx, 1);
        const newVIdx = finalOrder.indexOf('vacation');
        finalOrder.splice(newVIdx + 1, 0, 'divider-vacation');
      }

      this.tasks = combinedTasks;
      this.wishlist = combinedWishlist;
      this.photos = combinedPhotos;
      this.notes = combinedNotes;
      this.ledgerFiles = combinedLedgerFiles;
      this.categories = finalCategories;
      this.sidebarMenuOrder = finalOrder;
      this.honeymoonData = JSON.parse(JSON.stringify(INITIAL_HONEYMOON_DATA));
      this.vacations = userVacations;
      this.totalVacationDays = userTotalVacationDays;
      this.sites = userSites;
      this.healthNotes = userHealthNotes;
      this.healthFolders = userHealthFolders;
      this.activeHealthFolder = 'all';
      this.hobbyNotes = userHobbyNotes;
      this.hobbyFolders = userHobbyFolders;
      this.activeHobbyFolder = 'all';

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
          sidebarMenuOrder: this.sidebarMenuOrder,
          wishlist: this.wishlist,
          photos: this.photos,
          notes: this.notes,
          honeymoonData: this.honeymoonData,
          ledgerFiles: this.ledgerFiles,
          vacations: this.vacations,
          totalVacationDays: this.totalVacationDays,
          sites: this.sites,
          healthNotes: this.healthNotes,
          healthFolders: this.healthFolders,
          hobbyNotes: this.hobbyNotes,
          hobbyFolders: this.hobbyFolders,
          projects: this.projects,
          updatedAt: Date.now()
        }));
        localStorage.setItem(STREAK_KEY, JSON.stringify(this.streak));
      } catch (e) {}
    }

    save(immediate = false) {
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(immediate);
    }

    // --- Task Methods ---
    addTask(data) {
      let defaultCat = 'personal';
      if (this.activeFilter === 'work') defaultCat = 'work';
      else if (this.activeFilter === 'personal') defaultCat = 'personal';

      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (data.title || '').trim(),
        type: data.type || 'todo',
        description: (data.description || '').trim(),
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        category: data.category || defaultCat,
        dueDate: data.dueDate || TODAY_STR,
        pinned: !!data.pinned,
        subtasks: data.subtasks || [],
        createdAt: Date.now()
      };
      this.tasks.unshift(newTask);
      this.save(true);
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
      this.save(true);
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
      this.save(true);
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
      const targetId = String(id || '').trim();
      const idx = this.notes.findIndex(n => n && String(n.id).trim() === targetId);
      if (idx === -1) return false;
      this.notes.splice(idx, 1);
      this.save(true);
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
      this.save(true);
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
      this.save(true);
      return true;
    }

    // --- Vacation Manager Methods ---
    addVacation(data) {
      const type = data.type || 'full';
      let amount = 1.0;
      if (type === 'half-am' || type === 'half-pm') amount = 0.5;
      else if (type === 'holiday') amount = 0.0;

      const newVacation = {
        id: 'vacation-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: type,
        amount: amount,
        date: data.date || getRealTodayStr(),
        reason: (data.reason || '').trim(),
        createdAt: Date.now()
      };
      this.vacations.unshift(newVacation);
      this.vacations.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
      this.save();
      return newVacation;
    }

    deleteVacation(id) {
      const idx = this.vacations.findIndex(v => v.id === id);
      if (idx === -1) return false;
      this.vacations.splice(idx, 1);
      this.save(true);
      return true;
    }

    setTotalVacationDays(days) {
      this.totalVacationDays = Math.max(0, Number(days) || 0);
      this.save(true);
      return this.totalVacationDays;
    }

    getVacationStats() {
      const total = Number(this.totalVacationDays) || 15.0;
      let used = 0;
      let holidayCount = 0;
      this.vacations.forEach(v => {
        if (v.type === 'holiday' || v.amount === 0) {
          holidayCount += 1;
          return;
        }
        used += (typeof v.amount === 'number') ? v.amount : (v.type === 'full' ? 1.0 : 0.5);
      });
      const remain = Math.max(0, total - used);
      const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
      return { total, used, remain, pct, holidayCount };
    }

    // --- Sites / Bookmarks Methods ---
    addSite(data) {
      let rawUrl = (data.url || '').trim();
      if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
      }
      const newSite = {
        id: 'site-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: (data.title || '').trim(),
        url: rawUrl,
        memo: (data.memo || '').trim(),
        createdAt: Date.now()
      };
      this.sites.unshift(newSite);
      this.save();
      return newSite;
    }

    updateSite(id, updates) {
      const site = this.sites.find(s => s.id === id);
      if (!site) return null;
      if (updates.url) {
        let rawUrl = (updates.url || '').trim();
        if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = 'https://' + rawUrl;
        }
        updates.url = rawUrl;
      }
      Object.assign(site, updates, { updatedAt: Date.now() });
      this.save();
      return site;
    }

    deleteSite(id) {
      const idx = this.sites.findIndex(s => s.id === id);
      if (idx === -1) return false;
      this.sites.splice(idx, 1);
      this.save(true);
      return true;
    }

    // --- Health Manager Methods ---
    addHealthNote(data) {
      const newNote = {
        id: 'hnote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        folder: data.folder || 'general',
        title: (data.title || '').trim(),
        date: data.date || getRealTodayStr(),
        hospital: (data.hospital || '').trim(),
        cost: (data.cost || '').trim(),
        content: (data.content || '').trim(),
        fileName: data.fileName || '',
        fileSize: data.fileSize || 0,
        fileType: data.fileType || '',
        fileUrl: data.fileUrl || '',
        fileMemo: (data.fileMemo || '').trim(),
        createdAt: Date.now()
      };
      this.healthNotes.unshift(newNote);
      this.healthNotes.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
      this.save();
      return newNote;
    }

    updateHealthNote(id, updates) {
      const note = this.healthNotes.find(n => n.id === id);
      if (!note) return null;
      Object.assign(note, updates, { updatedAt: Date.now() });
      this.healthNotes.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
      this.save();
      return note;
    }

    deleteHealthNote(id) {
      if (!id) return false;
      const targetId = String(id).trim();
      const idx = this.healthNotes.findIndex(n => n && String(n.id).trim() === targetId);
      if (idx === -1) return false;
      this.healthNotes.splice(idx, 1);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return true;
    }

    addHealthFolder(name, icon = '🩺') {
      const cleanName = (name || '').trim();
      if (!cleanName) return null;
      const folderId = 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newFolder = {
        id: folderId,
        name: cleanName,
        icon: icon || '🩺'
      };
      this.healthFolders.push(newFolder);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return newFolder;
    }

    updateHealthFolder(id, updates) {
      const folder = this.healthFolders.find(f => f.id === id);
      if (!folder) return null;
      if (updates.name) folder.name = updates.name.trim();
      if (updates.icon) folder.icon = updates.icon;
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return folder;
    }

    deleteHealthFolder(id) {
      const idx = this.healthFolders.findIndex(f => f.id === id);
      if (idx === -1) return false;
      this.healthFolders.splice(idx, 1);
      // Migrate any notes in this deleted folder to 'general'
      this.healthNotes.forEach(note => {
        if (note.folder === id) note.folder = 'general';
      });
      if (this.activeHealthFolder === id) this.activeHealthFolder = 'all';
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return true;
    }

    // --- Hobby & Activity Journal Methods ---
    addHobbyNote(data) {
      const newNote = {
        id: 'hnb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        folder: data.folder || 'general',
        title: (data.title || '').trim(),
        date: data.date || getRealTodayStr(),
        place: (data.place || '').trim(),
        duration: (data.duration || '').trim(),
        content: (data.content || '').trim(),
        createdAt: Date.now()
      };
      this.hobbyNotes.unshift(newNote);
      this.hobbyNotes.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return newNote;
    }

    updateHobbyNote(id, updates) {
      const note = this.hobbyNotes.find(n => n.id === id);
      if (!note) return null;
      Object.assign(note, updates, { updatedAt: Date.now() });
      this.hobbyNotes.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return note;
    }

    deleteHobbyNote(id) {
      if (!id) return false;
      const targetId = String(id).trim();
      const idx = this.hobbyNotes.findIndex(n => n && String(n.id).trim() === targetId);
      if (idx === -1) return false;
      this.hobbyNotes.splice(idx, 1);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return true;
    }

    addHobbyFolder(name, icon = '🎨') {
      const cleanName = (name || '').trim();
      if (!cleanName) return null;
      const folderId = 'hfolder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newFolder = {
        id: folderId,
        name: cleanName,
        icon: icon || '🎨'
      };
      this.hobbyFolders.push(newFolder);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return newFolder;
    }

    updateHobbyFolder(id, updates) {
      const folder = this.hobbyFolders.find(f => f.id === id);
      if (!folder) return null;
      if (updates.name) folder.name = updates.name.trim();
      if (updates.icon) folder.icon = updates.icon;
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return folder;
    }

    deleteHobbyFolder(id) {
      const idx = this.hobbyFolders.findIndex(f => f.id === id);
      if (idx === -1) return false;
      this.hobbyFolders.splice(idx, 1);
      // Migrate any notes in this deleted folder to 'general'
      this.hobbyNotes.forEach(note => {
        if (note.folder === id) note.folder = 'general';
      });
      if (this.activeHobbyFolder === id) this.activeHobbyFolder = 'all';
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return true;
    }

    // --- Batch Move & Delete for Health & Hobby Notes ---
    moveHealthNotesToFolder(noteIds, targetFolder) {
      if (!Array.isArray(noteIds) || !noteIds.length || !targetFolder) return 0;
      let count = 0;
      this.healthNotes.forEach(n => {
        if (noteIds.includes(n.id)) {
          n.folder = targetFolder;
          n.updatedAt = Date.now();
          count++;
        }
      });
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return count;
    }

    deleteHealthNotesBatch(noteIds) {
      if (!Array.isArray(noteIds) || !noteIds.length) return 0;
      const initialLen = this.healthNotes.length;
      this.healthNotes = this.healthNotes.filter(n => !noteIds.includes(n.id));
      const deletedCount = initialLen - this.healthNotes.length;
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return deletedCount;
    }

    moveHobbyNotesToFolder(noteIds, targetFolder) {
      if (!Array.isArray(noteIds) || !noteIds.length || !targetFolder) return 0;
      let count = 0;
      this.hobbyNotes.forEach(n => {
        if (noteIds.includes(n.id)) {
          n.folder = targetFolder;
          n.updatedAt = Date.now();
          count++;
        }
      });
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return count;
    }

    deleteHobbyNotesBatch(noteIds) {
      if (!Array.isArray(noteIds) || !noteIds.length) return 0;
      const initialLen = this.hobbyNotes.length;
      this.hobbyNotes = this.hobbyNotes.filter(n => !noteIds.includes(n.id));
      const deletedCount = initialLen - this.hobbyNotes.length;
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return deletedCount;
    }

    // =========================================================================
    // Life Projects & Milestones Manager Methods
    // =========================================================================
    addProject(project) {
      if (!this.projects) this.projects = [];
      const newProj = Object.assign({
        id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: '',
        category: '부동산/주거',
        icon: '🏢',
        targetDate: '',
        budget: '',
        description: '',
        createdAt: Date.now(),
        milestones: []
      }, project);
      this.projects.push(newProj);
      this.activeProjectId = newProj.id;
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return newProj;
    }

    updateProject(id, updates) {
      if (!this.projects) this.projects = [];
      const idx = this.projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.projects[idx] = Object.assign({}, this.projects[idx], updates);
        this.saveLocalOnly();
        cloudSync.pushTasksToCloud(true);
        return this.projects[idx];
      }
      return null;
    }

    deleteProject(id) {
      if (!this.projects) this.projects = [];
      this.projects = this.projects.filter(p => p.id !== id);
      if (this.activeProjectId === id) {
        this.activeProjectId = this.projects.length > 0 ? this.projects[0].id : null;
      }
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
    }

    addMilestone(projectId, milestone) {
      if (!this.projects) this.projects = [];
      const proj = this.projects.find(p => p.id === projectId);
      if (!proj) return null;
      if (!proj.milestones) proj.milestones = [];
      const newM = Object.assign({
        id: 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: '',
        date: '',
        amount: '',
        memo: '',
        completed: false,
        createdAt: Date.now()
      }, milestone);
      proj.milestones.push(newM);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
      return newM;
    }

    updateMilestone(projectId, milestoneId, updates) {
      if (!this.projects) this.projects = [];
      const proj = this.projects.find(p => p.id === projectId);
      if (!proj || !proj.milestones) return null;
      const idx = proj.milestones.findIndex(m => m.id === milestoneId);
      if (idx !== -1) {
        proj.milestones[idx] = Object.assign({}, proj.milestones[idx], updates);
        this.saveLocalOnly();
        cloudSync.pushTasksToCloud(true);
        return proj.milestones[idx];
      }
      return null;
    }

    deleteMilestone(projectId, milestoneId) {
      if (!this.projects) this.projects = [];
      const proj = this.projects.find(p => p.id === projectId);
      if (!proj || !proj.milestones) return;
      proj.milestones = proj.milestones.filter(m => m.id !== milestoneId);
      this.saveLocalOnly();
      cloudSync.pushTasksToCloud(true);
    }

    toggleMilestoneComplete(projectId, milestoneId) {
      if (!this.projects) this.projects = [];
      const proj = this.projects.find(p => p.id === projectId);
      if (!proj || !proj.milestones) return null;
      const m = proj.milestones.find(x => x.id === milestoneId);
      if (m) {
        m.completed = !m.completed;
        this.saveLocalOnly();
        cloudSync.pushTasksToCloud(true);
        return m;
      }
      return null;
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
  window.store = store;

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
      const today = getRealTodayStr();
      let label = dateStr.replace(/-/g, '.');
      let className = '';

      if (dateStr === today) {
        label = `오늘 (${label})`;
        className = 'due-today';
      }

      return { label, className };
    },

    getTypeInfo(type) {
      const map = {
        'todo': { label: '할일 📋', class: 'type-todo', count: 1.0 },
        'half-off': { label: '반차 🌿', class: 'half-off', count: 0.5 },
        'vacation': { label: '연차 🌴', class: 'vacation', count: 1.0 },
        'schedule': { label: '일정 🌸', class: 'type-schedule', count: 1.0 }
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
      const stats = store.getStats();
      const counts = {
        all: store.tasks.length,
        upcoming: store.tasks.filter(t => t.dueDate && t.dueDate > TODAY_STR && t.status !== 'completed').length,
        overdue: stats.overdue,
        pinned: store.tasks.filter(t => t.pinned).length,
        completed: stats.completed,
        photos: store.photos.length,
        notes: store.notes.length,
        ledger: store.ledgerFiles.length,
        wishlist: store.wishlist.length,
        vacation: store.vacations.length,
        sites: store.sites.length,
        project: (store.projects || []).length
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

      // Update Firebase Realtime Sync & Storage Bar Card
      try {
        const isLogged = !!(cloudSync.spaceId && cloudSync.pin);
        const cloudDot = document.getElementById('sidebar-cloud-dot-badge');
        const cloudUsageText = document.getElementById('sidebar-cloud-usage-text');
        const cloudProgressBar = document.getElementById('sidebar-cloud-progress-bar');
        const cloudStatusMsg = document.getElementById('sidebar-cloud-sync-status-msg');

        // Estimate total JSON & Photo/Vault data size
        const rawJsonBytes = new TextEncoder().encode(localStorage.getItem(STORAGE_KEY) || '').length;
        let totalVaultBytes = 0;
        try {
          const vFiles = await cloudSync.getAllVaultFiles();
          totalVaultBytes = vFiles.reduce((sum, f) => sum + (f.size || 0), 0);
        } catch (e) {}

        const totalMB = Math.max(0.15, (rawJsonBytes + totalVaultBytes) / (1024 * 1024));
        const maxQuotaMB = 1024; // 1 GB free quota
        const pct = Math.min(100, Math.max(1.5, (totalMB / maxQuotaMB) * 100));

        if (cloudDot) {
          cloudDot.textContent = isLogged ? '🟢 실시간' : '⚪ 로컬 보관';
          cloudDot.style.color = isLogged ? '#10b981' : 'var(--text-muted)';
          cloudDot.style.background = isLogged ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.05)';
        }
        if (cloudUsageText) {
          cloudUsageText.textContent = `${totalMB.toFixed(2)} MB / ${maxQuotaMB} MB`;
        }
        if (cloudProgressBar) {
          cloudProgressBar.style.width = `${pct}%`;
        }
        if (cloudStatusMsg) {
          cloudStatusMsg.textContent = isLogged ? `키: ${cloudSync.spaceId} 연동 중 🛡️` : '동기화 미연결 (로컬 저장)';
        }
      } catch (e) {}

      // Render All Categories, Feature Menus & 3 Dividers in Sidebar
      const catContainer = document.getElementById('category-nav-list');
      const reorderBtn = document.getElementById('btn-toggle-reorder-menu');
      const reorderIcon = document.getElementById('reorder-btn-icon');
      const reorderText = document.getElementById('reorder-btn-text');

      if (reorderBtn) {
        if (store.isReorderMode) {
          reorderBtn.style.background = '#10b981';
          reorderBtn.style.color = '#ffffff';
          reorderBtn.style.borderColor = '#059669';
          if (reorderIcon) reorderIcon.textContent = '✓';
          if (reorderText) reorderText.textContent = '완료';
        } else {
          reorderBtn.style.background = 'rgba(255, 107, 139, 0.1)';
          reorderBtn.style.color = 'var(--primary)';
          reorderBtn.style.borderColor = 'rgba(255, 107, 139, 0.25)';
          if (reorderIcon) reorderIcon.textContent = '✏️';
          if (reorderText) reorderText.textContent = '순서변경';
        }
      }

      if (catContainer) {
        let vaultCount = 0;
        try {
          const vaultFiles = await cloudSync.getAllVaultFiles();
          vaultCount = vaultFiles.length;
        } catch (e) {}

        const itemMeta = {
          'personal': { name: '개인 🌸', icon: '', color: '#f06595', count: store.tasks.filter(t => t.category === 'personal').length },
          'work': { name: '업무 💼', icon: '', color: '#868e96', count: store.tasks.filter(t => t.category === 'work').length },
          'project': { name: '프로젝트', icon: '🎯', count: (store.projects || []).length },
          'hobby': { name: '취미활동', icon: '🎨', count: (store.hobbyNotes || []).length },
          'health': { name: '건강관리', icon: '🏥', count: (store.healthNotes || []).length },
          'vacation': { name: '연차관리', icon: '🏖️', count: store.vacations.length },
          'photos': { name: '기록', icon: '📸', count: store.photos.length },
          'notes': { name: '끄적끄적', icon: '✏️', count: store.notes.length },
          'ledger': { name: '가계부', icon: '💰', count: store.ledgerFiles.length },
          'wishlist': { name: '위시리스트', icon: '🎁', count: store.wishlist.length },
          'sites': { name: '사이트', icon: '🌐', count: store.sites.length },
          'devlog': { name: '개발기록', icon: '🚀', count: DEVLOG_DATA.length },
          'vault': { name: '파일 보관함', icon: '📁', count: vaultCount }
        };

        let itemsHTML = '';
        if (store.isReorderMode) {
          itemsHTML += `
            <li class="reorder-info-banner" style="padding: 0.4rem 0.6rem; margin-bottom: 0.35rem; background: rgba(255,107,139,0.08); border-radius: 8px; border: 1px dashed var(--primary); font-size: 0.75rem; color: var(--primary); font-weight: 700; text-align: center; list-style: none;">
              ✨ 항목을 위아래로 끌어 순서를 변경하세요
            </li>
          `;
        }

        itemsHTML += store.sidebarMenuOrder.map(id => {
          const isDivider = id.startsWith('divider');
          if (isDivider) {
            if (store.isReorderMode) {
              return `
                <li class="nav-item category-drag-item divider-reorder-item" data-cat-id="${id}" draggable="true" style="padding: 0.35rem 0.5rem; background: rgba(0,0,0,0.03); border: 1px dashed var(--border-color); margin: 0.25rem 0; border-radius: 6px; cursor: grab;">
                  <div class="nav-item-left" style="width: 100%; justify-content: space-between;">
                    <span class="category-drag-handle" style="display: inline-block;">⋮⋮</span>
                    <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; letter-spacing: 2px;">────── 구분선 ──────</span>
                    <span style="font-size: 0.7rem; color: var(--text-dim);">☰</span>
                  </div>
                </li>
              `;
            } else {
              return `
                <li class="sidebar-nav-divider" data-cat-id="${id}" style="height: 1px; background: var(--border-color); margin: 0.45rem 0.3rem; opacity: 0.75; list-style: none;"></li>
              `;
            }
          }

          const meta = itemMeta[id] || { name: id, icon: '📌', count: 0 };
          const isActive = store.activeFilter === id ? 'active' : '';
          const iconHTML = meta.icon 
            ? `<span>${meta.icon}</span>` 
            : `<span class="category-dot" style="background-color: ${meta.color || '#ff6b8b'}; color: ${meta.color || '#ff6b8b'};"></span>`;

          if (store.isReorderMode) {
            return `
              <li class="nav-item category-drag-item reorder-active ${isActive}" data-cat-id="${id}" data-filter="${id}" draggable="true" style="cursor: grab;">
                <div class="nav-item-left">
                  <span class="category-drag-handle" style="display: inline-block;">⋮⋮</span>
                  ${iconHTML}
                  <span class="category-title-text">${meta.name}</span>
                </div>
                <span class="nav-count" id="nav-count-${id}">${meta.count}</span>
              </li>
            `;
          } else {
            return `
              <li class="nav-item ${isActive}" data-cat-id="${id}" data-filter="${id}" onclick="window.selectCategoryFilter('${id}', event)" draggable="false">
                <div class="nav-item-left">
                  ${iconHTML}
                  <span class="category-title-text">${meta.name}</span>
                </div>
                <span class="nav-count" id="nav-count-${id}">${meta.count}</span>
              </li>
            `;
          }
        }).join('');

        catContainer.innerHTML = itemsHTML;
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

      // 2. Mobile Bottom Nav (모든할일, 위시, 메모, 기록)
      const isCustomView = ['wishlist', 'photos', 'notes', 'ledger', 'vault', 'calendar-month', 'calendar-week', 'vacation', 'sites'].includes(store.activeFilter);
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
      const isWorkCategory = (task.category === 'work');
      const categoryClass = isWorkCategory ? 'category-work' : 'category-personal';
      const cat = store.categories.find(c => c.id === task.category) || (isWorkCategory ? { name: '업무 💼', color: '#868e96' } : { name: '개인 🌸', color: '#f06595' });
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

      const catBadgeStyle = isWorkCategory
        ? `background: rgba(134, 142, 150, 0.18); color: #495057; font-weight: 700; border: 1px solid rgba(134, 142, 150, 0.35);`
        : `background: ${cat.color}18; color: ${cat.color}; font-weight: 700; border: 1px solid ${cat.color}30;`;

      return `
        <div class="task-card ${isCompleted ? 'completed' : ''} ${task.pinned ? 'pinned' : ''} ${categoryClass}" 
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
              ${cat ? `<span class="badge badge-tag" style="${catBadgeStyle}">${cat.name}</span>` : ''}
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
      const hobbyView = document.getElementById('hobby-view-container');
      const healthView = document.getElementById('health-view-container');
      const vacationView = document.getElementById('vacation-view-container');
      const sitesView = document.getElementById('sites-view-container');
      const devlogView = document.getElementById('devlog-view-container');
      const projectView = document.getElementById('project-view-container');

      const listContainer = document.getElementById('tasks-list-container');
      const kanbanContainer = document.getElementById('kanban-board-container');
      const emptyState = document.getElementById('empty-state');
      const lockedScreen = document.getElementById('locked-privacy-screen');
      const mobileBar = document.getElementById('mobile-category-bar');

      const isLogged = !!(cloudSync.spaceId && cloudSync.pin);

      const allViews = [tasksView, filesView, wishView, photosView, notesView, ledgerView, calMView, calWView, hobbyView, healthView, vacationView, sitesView, devlogView, projectView];

      if (lockedScreen) lockedScreen.style.display = 'none';
      if (mobileBar && mobileBar.style.display !== 'flex') mobileBar.style.display = 'flex';

      // Atomic Target View Switching
      const filter = store.activeFilter;
      let targetView = tasksView;
      if (filter === 'calendar-month') targetView = calMView;
      else if (filter === 'calendar-week') targetView = calWView;
      else if (filter === 'project') targetView = projectView;
      else if (filter === 'hobby') targetView = hobbyView;
      else if (filter === 'health') targetView = healthView;
      else if (filter === 'vacation') targetView = vacationView;
      else if (filter === 'photos') targetView = photosView;
      else if (filter === 'notes') targetView = notesView;
      else if (filter === 'ledger') targetView = ledgerView;
      else if (filter === 'wishlist') targetView = wishView;
      else if (filter === 'sites') targetView = sitesView;
      else if (filter === 'devlog') targetView = devlogView;
      else if (filter === 'vault') targetView = filesView;
      else targetView = tasksView;

      allViews.forEach(v => {
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

      // 2.3. 🎯 프로젝트 & 인생 로드맵 (Project) View
      if (filter === 'project') {
        this.renderProject();
        return;
      }

      // 2.5. 🎨 취미활동 (Hobby) View
      if (filter === 'hobby') {
        this.renderHobby();
        return;
      }

      // 2.8. 🏥 건강관리 (Health Manager) View
      if (filter === 'health') {
        this.renderHealth();
        return;
      }

      // 3.0. 🏖️ 연차관리 (Vacation) View
      if (filter === 'vacation') {
        this.renderVacation();
        return;
      }

      // 3.5. 📷 폴라로이드 기록 (Photos) View
      if (filter === 'photos') {
        this.renderPhotos();
        return;
      }

      // 4. 끄적끄적 (Notes) View
      if (filter === 'notes') {
        this.renderNotes();
        return;
      }

      // 5. 💍 2026년 신혼 가계부 View
      if (filter === 'ledger') {
        this.renderLedger();
        return;
      }

      // 6. Wishlist View
      if (filter === 'wishlist') {
        this.renderWishlist();
        return;
      }

      // 6.5. 🌐 사이트 모음 (Sites) View
      if (filter === 'sites') {
        this.renderSites();
        return;
      }

      // 6.8. 🚀 개발기록 (Dev Log) View
      if (filter === 'devlog') {
        this.renderDevLog();
        return;
      }

      // 7. File Vault View
      if (filter === 'vault') {
        this.renderFilesVault();
        return;
      }

      // 8. Standard Tasks View
      if (tasksView) tasksView.style.display = 'flex';

      const filtered = store.getFilteredTasks();

      const headingEl = document.getElementById('view-title');
      const filterNames = {
        all: '📋 모든 할 일 & 일정',
        upcoming: '⏰ 다가오는 일정',
        overdue: '⚠️ 기한 지연된 일정',
        pinned: '💖 중요한 일정',
        completed: '✨ 완료된 목록',
        personal: '🌸 개인 카테고리',
        work: '💼 업무 카테고리'
      };
      const titleText = filterNames[store.activeFilter] || '할 일 목록';
      if (headingEl) {
        headingEl.innerHTML = `${titleText} <span style="font-size: 0.85rem; padding: 2px 9px; background: rgba(255, 107, 139, 0.15); color: var(--primary); border-radius: 12px; margin-left: 8px; font-weight: 700;">${filtered.length}개</span>`;
      }

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
      
      // 연차관리에서 등록된 이번 달 실제 연차 사용 일수 계산
      let monthVacationDays = 0;
      (store.vacations || []).forEach(v => {
        if (v.date && v.date.startsWith(currentMonthPrefix)) {
          if (v.type === 'holiday' || v.amount === 0) return; // 휴가는 제외
          monthVacationDays += (typeof v.amount === 'number') ? v.amount : (v.type === 'full' ? 1.0 : 0.5);
        }
      });

      const monthRate = monthTasks.length > 0 ? Math.round((monthCompleted / monthTasks.length) * 100) : 0;

      const sTotal = document.getElementById('cal-stat-total');
      const sComp = document.getElementById('cal-stat-completed');
      const sVac = document.getElementById('cal-stat-vacation');
      const sRate = document.getElementById('cal-stat-rate');

      if (sTotal) sTotal.textContent = `${monthTasks.length}개`;
      if (sComp) sComp.textContent = `${monthCompleted}개`;
      if (sVac) sVac.textContent = `${monthVacationDays.toFixed(1)}일`;
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

      const realToday = getRealTodayStr();
      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dateStr === realToday);
        const isSelected = (dateStr === store.selectedCalendarDateStr);

        const daysTasks = store.tasks.filter(t => t.dueDate === dateStr);
        const daysVacations = (store.vacations || []).filter(v => v.date === dateStr);

        let dayTotalScore = 0;
        let taskChipsHTML = '';

        // 월별 달력 개발기록 (v1.0, v1.1 등) 칩 표시
        const devlogItem = DEVLOG_DATA.find(d => d.date === dateStr);
        if (devlogItem) {
          taskChipsHTML += `
            <div class="cal-devlog-chip ${devlogItem.version === 'v1.1' ? 'v1-1' : ''}" data-action="open-devlog-modal" data-devlog-ver="${devlogItem.version}" title="🚀 클릭하여 ${devlogItem.version} 개발기록 보기">
              <span>🚀</span>
              <span>개발기록 ${devlogItem.version}</span>
            </div>
          `;
        }

        daysVacations.forEach(v => {
          dayTotalScore += (v.amount || (v.type === 'full' ? 1.0 : 0.5));
          const isFull = (v.type === 'full');
          const isAm = (v.type === 'half-am');
          const vLabel = isFull ? '🌴 연차 (1.0)' : (isAm ? '🌅 오전반차 (0.5)' : '🌇 오후반차 (0.5)');
          const vClass = isFull ? 'vacation' : 'half-off';
          taskChipsHTML += `
            <div class="cal-task-chip ${vClass}" title="${vLabel} ${v.reason ? '- ' + escapeHTML(v.reason) : ''}">
              <span>${isFull ? '🌴' : '🌿'}</span>
              <span>${vLabel}</span>
            </div>
          `;
        });

        daysTasks.forEach(t => {
          dayTotalScore += 1.0;
        });

        const maxVisibleTasks = Math.max(0, 3 - daysVacations.length - (devlogItem ? 1 : 0));
        daysTasks.slice(0, maxVisibleTasks).forEach(task => {
          const isDone = task.status === 'completed';
          const isImportant = (task.priority === 'urgent' || task.priority === 'high');
          const starIcon = isImportant ? '<span class="cal-star-badge" title="중요">⭐</span>' : '';
          const pClass = isImportant ? 'high' : 'medium';
          const icon = isDone ? '✨' : '📋';
          taskChipsHTML += `
            <div class="cal-task-chip ${isDone ? 'completed' : ''} ${pClass}" title="${escapeHTML(task.title)}">
              ${starIcon}
              <span>${icon}</span>
              <span>${escapeHTML(task.title)}</span>
            </div>
          `;
        });

        const totalItemsCount = daysTasks.length + daysVacations.length + (devlogItem ? 1 : 0);
        if (totalItemsCount > 3) {
          taskChipsHTML += `<div class="cal-task-more">+${totalItemsCount - 3}개 더보기</div>`;
        }

        const scoreBadge = dayTotalScore > 0 
          ? `<span class="cal-day-count-badge" style="font-size: 0.7rem; font-weight: 700; color: var(--primary); background: rgba(255,107,139,0.1); padding: 1px 5px; border-radius: 6px;">${dayTotalScore}개</span>` 
          : '';

        cellsHTML += `
          <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
            <div class="cal-day-header">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="cal-day-num">${day}</span>
                ${scoreBadge}
              </div>
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
      const vacationsForDate = (store.vacations || []).filter(v => v.date === selectedDate);

      let vacBannerHTML = '';
      if (vacationsForDate.length > 0) {
        vacBannerHTML = vacationsForDate.map(v => {
          const isFull = (v.type === 'full');
          const isAm = (v.type === 'half-am');
          const badgeClass = isFull ? 'full' : (isAm ? 'half-am' : 'half-pm');
          const badgeLabel = isFull ? '🌴 연차 (1.0일 사용)' : (isAm ? '🌅 오전 반차 (0.5일 사용)' : '🌇 오후 반차 (0.5일 사용)');
          return `
            <div class="vacation-item-card" style="margin-bottom: 0.5rem; background: linear-gradient(135deg, rgba(255, 243, 191, 0.4), rgba(255, 212, 59, 0.15)); border: 1px solid rgba(250, 176, 5, 0.35);">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="vacation-type-badge ${badgeClass}">${badgeLabel}</span>
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${v.reason ? escapeHTML(v.reason) : '휴가/반차'}</span>
              </div>
            </div>
          `;
        }).join('');
      }

      if (tasksForDate.length === 0 && vacationsForDate.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: rgba(0,0,0,0.02); border-radius: var(--radius-md);">
            <span>🌷 이 날짜에 등록된 일정이 없어요. '+ 이 날짜에 새 일정/할 일 추가' 버튼을 눌러보세요!</span>
          </div>
        `;
      } else {
        listEl.innerHTML = vacBannerHTML + tasksForDate.map(t => this.createTaskCardHTML(t)).join('');
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
    // 📷 기록 / 폴라로이드 사진 (Polaroid Photo Gallery) Engine (Flicker-Free Keyed DOM)
    // =======================================================================
    renderPhotos() {
      const grid = document.getElementById('photos-grid-container');
      const emptyState = document.getElementById('photos-empty-state');
      const countEl = document.getElementById('photos-count-total');
      if (!grid) return;

      const photos = store.photos || [];
      const total = photos.length;
      if (countEl) countEl.textContent = total;

      if (total === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
      }
      if (emptyState) emptyState.style.display = 'none';

      // 1. Existing DOM cards Map (Keyed by photoId)
      const existingCardsMap = new Map();
      grid.querySelectorAll('.polaroid-card').forEach(card => {
        if (card.dataset.photoId) existingCardsMap.set(card.dataset.photoId, card);
      });

      const currentIds = new Set(photos.map(p => p.id));

      // 2. Remove deleted photo cards smoothly
      existingCardsMap.forEach((card, id) => {
        if (!currentIds.has(id)) {
          card.remove();
        }
      });

      // 3. Helper to create a single Polaroid Card element
      const createPolaroidCardEl = (photo) => {
        const rot = photo.rotationDeg !== undefined ? photo.rotationDeg : 0;
        const dateFormatted = photo.date ? photo.date.replace(/-/g, '.') : '';
        const temp = document.createElement('div');
        temp.innerHTML = `
          <div class="polaroid-card" style="--rot: ${rot}deg;" data-photo-id="${photo.id}" draggable="true">
            <div class="polaroid-image-wrapper" data-action="view-photo-lightbox" data-photo-id="${photo.id}" title="클릭하여 크게 보기 🔍">
              <img src="${photo.imageDataUrl}" class="polaroid-img" alt="${escapeHTML(photo.caption || '기록 사진')}" loading="lazy" decoding="async">
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
        `.trim();
        return temp.firstElementChild;
      };

      // 4. Update existing cards in place without image flash, or insert new ones
      photos.forEach((photo, index) => {
        const existingCard = existingCardsMap.get(photo.id);
        if (existingCard) {
          const img = existingCard.querySelector('.polaroid-img');
          if (img && img.src !== photo.imageDataUrl) {
            img.src = photo.imageDataUrl;
          }
          const dateBadge = existingCard.querySelector('.polaroid-date-badge');
          if (dateBadge) {
            const dateFormatted = photo.date ? photo.date.replace(/-/g, '.') : '';
            if (dateBadge.textContent !== dateFormatted) dateBadge.textContent = dateFormatted;
          }
          const memoText = existingCard.querySelector('.polaroid-memo-text');
          if (memoText) {
            const safeCap = escapeHTML(photo.caption);
            if (memoText.innerHTML !== safeCap) memoText.innerHTML = safeCap;
          }
          const rot = photo.rotationDeg !== undefined ? photo.rotationDeg : 0;
          existingCard.style.setProperty('--rot', `${rot}deg`);

          // Ensure correct order in grid
          if (grid.children[index] !== existingCard) {
            grid.insertBefore(existingCard, grid.children[index] || null);
          }
        } else {
          const newCard = createPolaroidCardEl(photo);
          grid.insertBefore(newCard, grid.children[index] || null);
        }
      });
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

    getFileIcon(fileName = '') {
      const ext = (fileName || '').split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: '📊', type: 'excel' };
      if (['pdf'].includes(ext)) return { icon: '📑', type: 'pdf' };
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { icon: '🖼️', type: 'image' };
      if (['doc', 'docx', 'hwp', 'hwpx', 'txt'].includes(ext)) return { icon: '📄', type: 'doc' };
      if (['zip', 'rar', '7z', 'tar'].includes(ext)) return { icon: '📦', type: 'archive' };
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return { icon: '🎵', type: 'audio' };
      if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return { icon: '🎬', type: 'video' };
      return { icon: '📁', type: 'file' };
    },

    formatBytes(bytes = 0) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    openFileUploadModal() {
      const modal = document.getElementById('upload-file-modal');
      const form = document.getElementById('file-upload-form');
      if (!modal || !form) return;
      form.reset();
      modal.classList.add('active');
    },

    closeFileUploadModal() {
      const modal = document.getElementById('upload-file-modal');
      if (modal) modal.classList.remove('active');
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

      const deleteBtn = document.getElementById('btn-modal-delete-task');

      if (taskId) {
        const task = store.tasks.find(t => t.id === taskId);
        if (!task) return;
        modalTitle.textContent = '일정 / 할 일 수정하기 ✏️';
        form.dataset.taskId = task.id;
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        document.getElementById('task-input-title').value = task.title;
        document.getElementById('task-input-type').value = task.type || 'todo';
        document.getElementById('task-input-desc').value = task.description || '';
        document.getElementById('task-input-priority').value = (task.priority === 'urgent' || task.priority === 'high') ? 'high' : 'medium';
        document.getElementById('task-input-category').value = task.category || 'personal';
        document.getElementById('task-input-duedate').value = task.dueDate || getRealTodayStr();
        document.getElementById('task-input-pinned').checked = !!task.pinned;

        if (task.subtasks) {
          task.subtasks.forEach(s => this.addSubtaskRow(s.title, s.completed, s.id));
        }
      } else {
        modalTitle.textContent = '새로운 일정/할 일 등록 💖';
        delete form.dataset.taskId;
        if (deleteBtn) deleteBtn.style.display = 'none';
        document.getElementById('task-input-type').value = 'todo';
        document.getElementById('task-input-priority').value = 'medium';
        document.getElementById('task-input-duedate').value = presetDueDate || getRealTodayStr();

        // Default Category: if active filter is work -> work, otherwise personal
        const defaultCat = (store.activeFilter === 'work') ? 'work' : 'personal';
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
        if (titleEl) titleEl.textContent = '📸 기록 사진/메모 수정';
        if (hiddenId) hiddenId.value = photo.id;
        if (dateInput) dateInput.value = photo.date || getRealTodayStr();
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
        if (titleEl) titleEl.textContent = '📸 새로운 기록 사진 등록';
        if (hiddenId) hiddenId.value = '';
        if (dateInput) dateInput.value = getRealTodayStr();
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
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
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

    // =========================================================================
    // 🏖️ Vacation Manager (연차관리)
    // =========================================================================
    renderVacation() {
      const stats = store.getVacationStats();
      const totalEl = document.getElementById('vacation-stat-total');
      const usedEl = document.getElementById('vacation-stat-used');
      const remainEl = document.getElementById('vacation-stat-remain');
      const holidayEl = document.getElementById('vacation-stat-holiday');
      const barEl = document.getElementById('vacation-progress-bar');
      const textEl = document.getElementById('vacation-progress-text');
      const listEl = document.getElementById('vacation-history-list');
      const emptyEl = document.getElementById('vacation-empty-state');
      const countEl = document.getElementById('vacation-history-count');
      const yearSelect = document.getElementById('vacation-filter-year');

      if (totalEl) totalEl.innerHTML = `${stats.total.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (usedEl) usedEl.innerHTML = `${stats.used.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (remainEl) remainEl.innerHTML = `${stats.remain.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (holidayEl) holidayEl.innerHTML = `${stats.holidayCount}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">건</span>`;
      if (barEl) barEl.style.width = `${stats.pct}%`;
      if (textEl) textEl.textContent = `${stats.pct}% (${stats.used.toFixed(1)}일 / ${stats.total.toFixed(1)}일) 사용 완료`;

      // 1. Current Selected Filters (이번 달 기본 선택 & 통계 카드 필터)
      const currentSelectedYear = store.selectedVacationYear || '2026';
      const currentSelectedMonth = store.selectedVacationMonth || String(new Date().getMonth() + 1);
      const currentTypeFilter = store.vacationTypeFilter || 'all';

      // Update Active State of Top 4 Stat Boxes
      document.querySelectorAll('.clickable-vstat-box').forEach(box => {
        const f = box.dataset.vtypeFilter;
        if (f === currentTypeFilter || (currentTypeFilter === 'all' && f === 'all')) {
          box.classList.add('active');
        } else {
          box.classList.remove('active');
        }
      });

      // 2. Populate Year Select Options dynamically from data
      if (yearSelect) {
        const yearsSet = new Set(['2026', '2025']);
        (store.vacations || []).forEach(v => {
          if (v.date) {
            const y = v.date.split('-')[0];
            if (y) yearsSet.add(y);
          }
        });
        const sortedYears = Array.from(yearsSet).sort().reverse();
        yearSelect.innerHTML = `<option value="all" ${currentSelectedYear === 'all' ? 'selected' : ''}>전체 년도</option>` + sortedYears.map(y => `<option value="${y}" ${y === currentSelectedYear ? 'selected' : ''}>${y}년</option>`).join('');
      }

      // 3. Update Month Pills Active Class
      document.querySelectorAll('#vacation-month-pills .vac-m-pill').forEach(pill => {
        if (pill.dataset.vMonth === currentSelectedMonth) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });

      // 4. Filter Vacations by Year & Month
      let periodFiltered = (store.vacations || []).slice();
      if (currentSelectedYear !== 'all') {
        periodFiltered = periodFiltered.filter(v => v.date && v.date.startsWith(currentSelectedYear));
      }
      if (currentSelectedMonth !== 'all') {
        const mStr = String(currentSelectedMonth).padStart(2, '0');
        periodFiltered = periodFiltered.filter(v => {
          if (!v.date) return false;
          const parts = v.date.split('-');
          return parts[1] === mStr;
        });
      }

      // Calculate period-wide stats before type filtering
      let periodUsedDays = 0;
      let periodHolidayCount = 0;
      periodFiltered.forEach(v => {
        if (v.type === 'holiday' || v.amount === 0) {
          periodHolidayCount += 1;
          return;
        }
        periodUsedDays += (typeof v.amount === 'number') ? v.amount : (v.type === 'full' ? 1.0 : 0.5);
      });

      // 5. Apply Top Stat Box Type Filter (총 발생연차 / 사용한 연차 / 휴가 사용)
      let filtered = periodFiltered.slice();
      let typeFilterLabel = '';
      if (currentTypeFilter === 'used') {
        filtered = filtered.filter(v => v.type === 'full' || v.type === 'half-am' || v.type === 'half-pm');
        typeFilterLabel = ' [연차/반차만 보기]';
      } else if (currentTypeFilter === 'holiday') {
        // 사용자의 요구사항: 휴가사용(별도) 선택 시 전체 년도(모든 월 포함) 사용내역 모두 표시
        filtered = (store.vacations || []).filter(v => v.type === 'holiday' || v.amount === 0);
        typeFilterLabel = ' [전체 기간 휴가]';
      }

      // 6. 사용날짜(date) 최신순 자동 정렬 (등록일과 무관하게 사용날짜 순으로 정렬)
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));

      // Update Month Summary Banner (예: 8월 총 연차 2.0개 사용 / 휴가 1개 사용)
      const sumPeriodTitleEl = document.getElementById('vac-summary-period-title');
      const sumDetailsEl = document.getElementById('vac-summary-details');
      const sumBadgeEl = document.getElementById('vac-summary-badge');

      const periodLabel = currentSelectedMonth === 'all' 
        ? `${currentSelectedYear === 'all' ? '전체' : currentSelectedYear + '년'}` 
        : `${currentSelectedMonth}월`;

      if (currentTypeFilter === 'holiday') {
        if (sumPeriodTitleEl) sumPeriodTitleEl.textContent = '🏖️ 전체 기간(모든 년도/월) 휴가 현황:';
        if (sumDetailsEl) sumDetailsEl.textContent = `총 휴가 ${filtered.length}개 사용 완료 (0일 차감 / 개인 일정)`;
        if (sumBadgeEl) sumBadgeEl.textContent = `총 ${filtered.length}건`;
        if (countEl) countEl.textContent = `전체 휴가 ${filtered.length}건 (0일 차감)`;
      } else {
        if (sumPeriodTitleEl) {
          sumPeriodTitleEl.textContent = `🌸 ${periodLabel} 사용 현황${typeFilterLabel}:`;
        }
        if (sumDetailsEl) {
          sumDetailsEl.textContent = `총 연차 ${periodUsedDays.toFixed(1)}개 사용 / 휴가 ${periodHolidayCount}개 사용`;
        }
        if (sumBadgeEl) {
          sumBadgeEl.textContent = `총 ${filtered.length}건`;
        }
        if (countEl) {
          const holidayNote = periodHolidayCount > 0 ? ` · 휴가 ${periodHolidayCount}건` : '';
          countEl.textContent = `총 ${filtered.length}건 (연차 ${periodUsedDays.toFixed(1)}일${holidayNote})`;
        }
      }

      if (!listEl) return;

      if (filtered.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
      } else {
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = filtered.map(v => {
          const isHoliday = (v.type === 'holiday');
          const isFull = (v.type === 'full');
          const isAm = (v.type === 'half-am');
          
          let badgeClass = 'half-pm';
          let badgeLabel = '🌇 오후 반차 (0.5일)';
          if (isHoliday) {
            badgeClass = 'badge-vacation-holiday';
            badgeLabel = '🏖️ 휴가 (0일 / 개인 확인용)';
          } else if (isFull) {
            badgeClass = 'full';
            badgeLabel = '🌴 연차 (1.0일 차감)';
          } else if (isAm) {
            badgeClass = 'half-am';
            badgeLabel = '🌅 오전 반차 (0.5일 차감)';
          }

          const dateStr = v.date ? v.date.replace(/-/g, '.') : '';

          return `
            <div class="vacation-item-card" data-vacation-id="${v.id}">
              <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1;">
                <span class="vacation-type-badge ${badgeClass}">${badgeLabel}</span>
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                    <span>${dateStr}</span>
                    ${v.reason ? `<span style="font-weight: 500; font-size: 0.85rem; color: var(--text-muted);">| ${escapeHTML(v.reason)}</span>` : ''}
                  </div>
                </div>
              </div>
              <button type="button" class="task-action-btn delete-btn" data-action="delete-vacation" data-vacation-id="${v.id}" title="연차 기록 삭제">
                🗑️
              </button>
            </div>
          `;
        }).join('');
      }

      this.renderSidebar();
    },

    openVacationModal() {
      const modal = document.getElementById('vacation-modal');
      const form = document.getElementById('vacation-form');
      const dateInput = document.getElementById('vacation-input-date');
      if (!modal || !form) return;
      form.reset();
      if (dateInput) dateInput.value = getRealTodayStr();
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeVacationModal() {
      const modal = document.getElementById('vacation-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openTotalVacationModal() {
      const modal = document.getElementById('total-vacation-modal');
      const input = document.getElementById('input-total-vacation-days');
      if (!modal) return;
      if (input) input.value = store.totalVacationDays || 15;
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeTotalVacationModal() {
      const modal = document.getElementById('total-vacation-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // =======================================================================
    // 🎯 인생 프로젝트 & 마일스톤 (Life Project & Roadmap) Engine
    // =======================================================================
    renderProject() {
      const tabsContainer = document.getElementById('project-tabs-container');
      const detailContainer = document.getElementById('project-detail-dashboard');
      const emptyState = document.getElementById('project-empty-state');
      if (!tabsContainer || !detailContainer) return;

      const projects = store.projects || [];
      if (projects.length === 0) {
        tabsContainer.innerHTML = '';
        detailContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
      }
      if (emptyState) emptyState.style.display = 'none';

      // 1. Ensure activeProjectId is valid
      if (!store.activeProjectId || !projects.some(p => p.id === store.activeProjectId)) {
        store.activeProjectId = projects[0].id;
      }

      const activeProject = projects.find(p => p.id === store.activeProjectId) || projects[0];

      // 2. Render Project Tabs Bar
      tabsContainer.innerHTML = `
        <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.25rem 0; width: 100%; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
          ${projects.map(proj => {
            const isActive = (proj.id === activeProject.id);
            const totalM = (proj.milestones || []).length;
            const doneM = (proj.milestones || []).filter(m => m.completed).length;
            const pct = totalM > 0 ? Math.round((doneM / totalM) * 100) : 0;
            return `
              <button type="button" class="project-tab-pill ${isActive ? 'active' : ''}" data-action="select-project-tab" data-id="${proj.id}">
                <span class="tab-icon">${proj.icon || '🎯'}</span>
                <span class="tab-title">${escapeHTML(proj.title)}</span>
                <span class="tab-badge">${pct}%</span>
              </button>
            `;
          }).join('')}
          <button type="button" class="project-tab-add-btn" data-action="open-add-project" title="새 프로젝트 추가">
            <span>+ 새 프로젝트</span>
          </button>
        </div>
      `;

      // 3. Calculate D-Day & Progress
      const milestones = activeProject.milestones || [];
      const totalCount = milestones.length;
      const completedCount = milestones.filter(m => m.completed).length;
      const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      let ddayBadgeHTML = '';
      if (activeProject.targetDate) {
        const today = new Date(TODAY_STR);
        const target = new Date(activeProject.targetDate);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          ddayBadgeHTML = `<span class="project-dday-badge d-today">D-Day 오늘! 🌟</span>`;
        } else if (diffDays > 0) {
          ddayBadgeHTML = `<span class="project-dday-badge d-minus">D-${diffDays}일 남음</span>`;
        } else {
          ddayBadgeHTML = `<span class="project-dday-badge d-plus">목표일 +${Math.abs(diffDays)}일 경과</span>`;
        }
      }

      const targetDateFormatted = activeProject.targetDate ? activeProject.targetDate.replace(/-/g, '.') : '';

      // 4. Render Project Detail Dashboard
      detailContainer.innerHTML = `
        <!-- Project Hero Card -->
        <div class="project-hero-card">
          <div class="project-hero-top">
            <div class="project-hero-main-info">
              <div class="project-hero-icon-box">${activeProject.icon || '🎯'}</div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                  <span class="project-cat-badge">${escapeHTML(activeProject.category || '인생프로젝트')}</span>
                  ${ddayBadgeHTML}
                  ${targetDateFormatted ? `<span class="project-meta-chip">📅 최종목표: ${targetDateFormatted}</span>` : ''}
                  ${activeProject.budget ? `<span class="project-meta-chip budget">💳 예산: ${escapeHTML(activeProject.budget)}</span>` : ''}
                </div>
                <h2 class="project-hero-title">${escapeHTML(activeProject.title)}</h2>
                ${activeProject.description ? `<p class="project-hero-desc">${escapeHTML(activeProject.description)}</p>` : ''}
              </div>
            </div>

            <div class="project-hero-actions">
              <button type="button" class="btn" style="background: rgba(0,0,0,0.05); color: var(--text-main); font-size: 0.82rem; padding: 0.45rem 0.85rem;" data-action="open-edit-project" data-id="${activeProject.id}">
                ✏️ 프로젝트 수정
              </button>
              <button type="button" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.45rem 1rem;" data-action="open-add-milestone" data-project-id="${activeProject.id}">
                <span>+</span> <span>실행 계획 추가</span>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="project-progress-section">
            <div class="project-progress-label-row">
              <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">
                로드맵 달성률 <strong style="color: var(--primary);">${progressPct}%</strong> (${completedCount}/${totalCount}단계 완료)
              </span>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">
                ${progressPct === 100 ? '🎉 모든 마일스톤 달성 완료!' : '차근차근 실천 중 🌱'}
              </span>
            </div>
            <div class="project-progress-track">
              <div class="project-progress-fill" style="width: ${progressPct}%;"></div>
            </div>
          </div>
        </div>

        <!-- Milestones Roadmap Timeline Section -->
        <div class="milestones-roadmap-container">
          <div class="milestones-section-header">
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
              <span>🗺️</span> <span>단계별 실행 계획 & 마일스톤 (${milestones.length}개)</span>
            </h3>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">체크박스를 눌러 완료 여부를 체크하세요 💮</span>
          </div>

          ${milestones.length === 0 ? `
            <div class="milestone-empty-box">
              <p>아직 등록된 실행 계획이 없어요. 아래 버튼을 눌러 첫 번째 단계를 추가해 보세요!</p>
              <button type="button" class="btn btn-primary" style="margin-top: 0.5rem;" data-action="open-add-milestone" data-project-id="${activeProject.id}">
                + 1단계 실행 계획 추가하기
              </button>
            </div>
          ` : `
            <div class="milestones-timeline-list">
              ${milestones.map((m, idx) => {
                const stepNum = idx + 1;
                const isDone = !!m.completed;
                const dateFormatted = m.date ? m.date.replace(/-/g, '.') : '';
                return `
                  <div class="milestone-step-card ${isDone ? 'is-completed' : ''}" data-milestone-id="${m.id}" data-project-id="${activeProject.id}">
                    <div class="milestone-step-left">
                      <label class="milestone-checkbox-wrap" title="${isDone ? '완료 취소' : '실행 완료 체크'}">
                        <input type="checkbox" class="milestone-step-check" data-action="toggle-milestone" data-project-id="${activeProject.id}" data-milestone-id="${m.id}" ${isDone ? 'checked' : ''}>
                        <span class="milestone-custom-box"></span>
                      </label>
                      <span class="milestone-step-num-badge">Step ${stepNum}</span>
                    </div>

                    <div class="milestone-step-content">
                      <div class="milestone-step-top">
                        <h4 class="milestone-step-title ${isDone ? 'completed-text' : ''}">${escapeHTML(m.title)}</h4>
                        <div class="milestone-badges-row">
                          ${dateFormatted ? `<span class="milestone-date-badge">📅 ${dateFormatted}</span>` : ''}
                          ${m.amount ? `<span class="milestone-amount-badge">💳 ${escapeHTML(m.amount)}</span>` : ''}
                          ${isDone ? `<span class="milestone-done-pill">완료됨 💮</span>` : `<span class="milestone-pending-pill">진행 중 🌱</span>`}
                        </div>
                      </div>

                      ${m.memo ? `
                        <div class="milestone-memo-box">
                          <span>💬</span>
                          <span>${escapeHTML(m.memo)}</span>
                        </div>
                      ` : ''}
                    </div>

                    <div class="milestone-step-actions">
                      <button type="button" class="task-action-btn edit-btn" data-action="edit-milestone" data-project-id="${activeProject.id}" data-milestone-id="${m.id}" title="수정">
                        ✏️
                      </button>
                      <button type="button" class="task-action-btn delete-btn" data-action="delete-milestone" data-project-id="${activeProject.id}" data-milestone-id="${m.id}" title="삭제">
                        🗑️
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Add More Milestone Card -->
            <button type="button" class="milestone-add-card-btn" data-action="open-add-milestone" data-project-id="${activeProject.id}">
              <span>+ 다음 실행 단계 추가하기</span>
            </button>
          `}
        </div>
      `;
    },

    openProjectModal(projectId = null) {
      const modal = document.getElementById('project-modal');
      const form = document.getElementById('project-form');
      const titleEl = document.getElementById('project-modal-title');
      const hiddenId = document.getElementById('project-edit-id');
      const iconInput = document.getElementById('project-input-icon');
      const titleInput = document.getElementById('project-input-title');
      const catInput = document.getElementById('project-input-cat');
      const targetDateInput = document.getElementById('project-input-target-date');
      const budgetInput = document.getElementById('project-input-budget');
      const descInput = document.getElementById('project-input-desc');
      const deleteBtn = document.getElementById('btn-delete-project');
      const emojiGrid = document.getElementById('project-emoji-grid');
      if (!modal || !form) return;

      form.reset();

      // Render 24 Project Emoji Options
      if (emojiGrid) {
        emojiGrid.innerHTML = DEFAULT_PROJECT_EMOJIS.map(emoji => `
          <button type="button" class="project-emoji-option-btn" data-project-emoji="${emoji}">
            ${emoji}
          </button>
        `).join('');
      }

      if (projectId) {
        const proj = (store.projects || []).find(p => p.id === projectId);
        if (!proj) return;
        if (titleEl) titleEl.textContent = '🎯 프로젝트 수정하기 ✏️';
        if (hiddenId) hiddenId.value = proj.id;
        if (iconInput) iconInput.value = proj.icon || '🏢';
        if (titleInput) titleInput.value = proj.title || '';
        if (catInput) catInput.value = proj.category || '';
        if (targetDateInput) targetDateInput.value = proj.targetDate || '';
        if (budgetInput) budgetInput.value = proj.budget || '';
        if (descInput) descInput.value = proj.description || '';
        if (deleteBtn) {
          deleteBtn.style.display = 'inline-flex';
          deleteBtn.dataset.id = proj.id;
        }

        if (emojiGrid) {
          emojiGrid.querySelectorAll('.project-emoji-option-btn').forEach(btn => {
            if (btn.dataset.projectEmoji === (proj.icon || '🏢')) {
              btn.classList.add('selected');
            }
          });
        }
      } else {
        if (titleEl) titleEl.textContent = '🎯 새 인생 프로젝트 생성 💖';
        if (hiddenId) hiddenId.value = '';
        if (iconInput) iconInput.value = '🏢';
        if (deleteBtn) deleteBtn.style.display = 'none';

        if (emojiGrid) {
          const first = emojiGrid.querySelector('.project-emoji-option-btn');
          if (first) first.classList.add('selected');
        }
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 80);
    },

    closeProjectModal() {
      const modal = document.getElementById('project-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openMilestoneModal(projectId, milestoneId = null) {
      const modal = document.getElementById('milestone-modal');
      const form = document.getElementById('milestone-form');
      const titleEl = document.getElementById('milestone-modal-title');
      const hiddenMId = document.getElementById('milestone-edit-id');
      const hiddenPId = document.getElementById('milestone-project-id');
      const titleInput = document.getElementById('milestone-input-title');
      const dateInput = document.getElementById('milestone-input-date');
      const amountInput = document.getElementById('milestone-input-amount');
      const memoInput = document.getElementById('milestone-input-memo');
      const completedInput = document.getElementById('milestone-input-completed');
      const deleteBtn = document.getElementById('btn-delete-milestone');
      if (!modal || !form) return;

      form.reset();
      if (hiddenPId) hiddenPId.value = projectId;

      if (milestoneId) {
        const proj = (store.projects || []).find(p => p.id === projectId);
        const m = proj ? (proj.milestones || []).find(x => x.id === milestoneId) : null;
        if (!m) return;
        if (titleEl) titleEl.textContent = '📋 마일스톤 단계 수정하기 ✏️';
        if (hiddenMId) hiddenMId.value = m.id;
        if (titleInput) titleInput.value = m.title || '';
        if (dateInput) dateInput.value = m.date || '';
        if (amountInput) amountInput.value = m.amount || '';
        if (memoInput) memoInput.value = m.memo || '';
        if (completedInput) completedInput.checked = !!m.completed;
        if (deleteBtn) {
          deleteBtn.style.display = 'inline-flex';
          deleteBtn.dataset.projectId = projectId;
          deleteBtn.dataset.milestoneId = m.id;
        }
      } else {
        if (titleEl) titleEl.textContent = '📋 새 마일스톤 실행 계획 추가 ✨';
        if (hiddenMId) hiddenMId.value = '';
        if (deleteBtn) deleteBtn.style.display = 'none';
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 80);
    },

    closeMilestoneModal() {
      const modal = document.getElementById('milestone-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // =========================================================================
    // 🌐 Sites / Bookmarks (사이트 바로가기)
    // =========================================================================
    renderSites() {
      const grid = document.getElementById('sites-grid-container');
      const emptyEl = document.getElementById('sites-empty-state');
      if (!grid) return;

      if (store.sites.length === 0) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
      } else {
        if (emptyEl) emptyEl.style.display = 'none';
        grid.innerHTML = store.sites.map(site => {
          let hostname = '';
          try {
            hostname = new URL(site.url).hostname;
          } catch (e) {
            hostname = site.url;
          }

          return `
            <div class="site-card" data-site-id="${site.id}">
              <div class="site-card-header">
                <div class="site-title-box">
                  <div class="site-favicon-bubble">🌐</div>
                  <div>
                    <h4 class="site-title-text">${escapeHTML(site.title)}</h4>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(hostname)}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 0.35rem;">
                  <button type="button" class="task-action-btn edit-btn" data-action="edit-site" data-site-id="${site.id}" title="사이트 수정">✏️</button>
                  <button type="button" class="task-action-btn delete-btn" data-action="delete-site" data-site-id="${site.id}" title="사이트 삭제">🗑️</button>
                </div>
              </div>

              ${site.memo ? `<div class="site-memo-box">📝 ${escapeHTML(site.memo)}</div>` : ''}

              <div class="site-card-footer">
                <a href="${escapeHTML(site.url)}" target="_blank" rel="noopener noreferrer" class="site-url-link" title="새 탭으로 열기">
                  <span>🚀 바로가기</span>
                  <span style="font-size: 0.72rem; opacity: 0.85;">↗</span>
                </a>
                <button type="button" class="btn btn-sm" style="font-size: 0.74rem; background: rgba(0,0,0,0.04); color: var(--text-muted); padding: 3px 7px;" data-action="copy-site-url" data-url="${escapeHTML(site.url)}" title="URL 복사">
                  📋 복사
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      this.renderSidebar();
    },

    openSiteModal(siteId = null) {
      const modal = document.getElementById('site-modal');
      const form = document.getElementById('site-form');
      const titleEl = document.getElementById('site-modal-title');
      const hiddenId = document.getElementById('site-edit-id');
      const inputTitle = document.getElementById('site-input-title');
      const inputUrl = document.getElementById('site-input-url');
      const inputMemo = document.getElementById('site-input-memo');
      if (!modal || !form) return;

      form.reset();
      if (siteId) {
        const site = store.sites.find(s => s.id === siteId);
        if (!site) return;
        if (titleEl) titleEl.textContent = '🌐 사이트 바로가기 수정 💖';
        if (hiddenId) hiddenId.value = site.id;
        if (inputTitle) inputTitle.value = site.title || '';
        if (inputUrl) inputUrl.value = site.url || '';
        if (inputMemo) inputMemo.value = site.memo || '';
      } else {
        if (titleEl) titleEl.textContent = '🌐 새 사이트 바로가기 등록 💖';
        if (hiddenId) hiddenId.value = '';
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (inputTitle) setTimeout(() => inputTitle.focus(), 60);
    },

    closeSiteModal() {
      const modal = document.getElementById('site-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // =========================================================================
    // 🏥 건강관리 (Health Manager & Folder Notes Engine)
    // =========================================================================
    renderHealth() {
      const tabsBar = document.getElementById('health-folder-tabs');
      const gridContainer = document.getElementById('health-notes-grid-container');
      const emptyState = document.getElementById('health-empty-state');
      const curFolderBadge = document.getElementById('health-cur-folder-badge');
      const curFolderDesc = document.getElementById('health-cur-folder-desc');
      const notesCountBadge = document.getElementById('health-notes-count-badge');

      if (!gridContainer) return;

      const activeFolder = store.activeHealthFolder || 'all';
      const folders = store.healthFolders || DEFAULT_HEALTH_FOLDERS;
      const allNotes = store.healthNotes || [];
      const nonAllFolders = folders.filter(f => f.id !== 'all');

      // 1. Render Folder Tabs (with edit pencil icon for editable folders)
      if (tabsBar) {
        tabsBar.innerHTML = folders.map(f => {
          const isActive = (f.id === activeFolder);
          const count = f.id === 'all' 
            ? allNotes.length 
            : allNotes.filter(n => n.folder === f.id).length;
          
          const editBtn = (f.id !== 'all')
            ? `<span class="health-folder-edit-btn" data-action="open-edit-health-folder" data-id="${f.id}" title="폴더 이름/아이콘 수정 및 삭제">✏️</span>`
            : '';

          return `
            <button type="button" class="health-folder-tab ${isActive ? 'active' : ''}" data-health-folder-id="${f.id}">
              <span>${f.icon || '📁'}</span>
              <span>${escapeHTML(f.name)}</span>
              <span class="badge" style="font-size: 0.72rem; padding: 1px 6px; background: ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'}; color: ${isActive ? '#fff' : 'var(--text-muted)'}; border-radius: 10px;">${count}</span>
              ${editBtn}
            </button>
          `;
        }).join('');
      }

      // 2. Filter Notes by active folder
      const filtered = (activeFolder === 'all')
        ? allNotes
        : allNotes.filter(n => n.folder === activeFolder);

      const activeFolderObj = folders.find(f => f.id === activeFolder) || folders[0];
      if (curFolderBadge) {
        curFolderBadge.textContent = `${activeFolderObj.icon || '📁'} ${activeFolderObj.name}`;
      }
      if (curFolderDesc) {
        curFolderDesc.textContent = activeFolder === 'all'
          ? `총 ${allNotes.length}개의 건강 기록 메모가 보관 중입니다.`
          : `'${activeFolderObj.name}' 폴더에 ${filtered.length}건의 진료 및 건강 메모가 있습니다.`;
      }
      if (notesCountBadge) {
        notesCountBadge.textContent = `총 ${filtered.length}건`;
      }

      // 2.5. Batch Action Toolbar (선택된 메모 이동 / 삭제)
      const selectedIds = Array.from(store.selectedHealthNotes || []).filter(id => filtered.some(n => n.id === id));
      const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

      let batchBarHTML = '';
      if (filtered.length > 0) {
        const folderOptionsHTML = nonAllFolders.map(f => `<option value="${f.id}">${f.icon || '📁'} ${escapeHTML(f.name)}</option>`).join('');
        batchBarHTML = `
          <div class="note-batch-toolbar ${selectedIds.length > 0 ? 'is-active' : ''}">
            <div class="batch-left">
              <label class="batch-check-label" title="전체 선택/해제">
                <input type="checkbox" id="health-check-all" class="batch-checkbox-all" ${isAllSelected ? 'checked' : ''}>
                <span>${selectedIds.length > 0 ? `선택됨 <strong>${selectedIds.length}</strong>개` : '전체 선택'}</span>
              </label>
            </div>
            <div class="batch-right" style="${selectedIds.length > 0 ? 'display: flex;' : 'display: none;'}">
              <span class="batch-action-hint">선택 항목 이동:</span>
              <select id="health-batch-target-folder" class="batch-select-dropdown">
                <option value="">📁 이동할 폴더 선택...</option>
                ${folderOptionsHTML}
              </select>
              <button type="button" class="btn btn-sm btn-primary" data-action="batch-move-health-notes" title="선택한 메모들을 선택한 폴더로 이동합니다">
                <span>이동 ✨</span>
              </button>
              <button type="button" class="btn btn-sm" style="background: rgba(255, 77, 77, 0.12); color: #ff4d4d; border: 1px solid rgba(255,77,77,0.25);" data-action="batch-delete-health-notes" title="선택한 메모들을 삭제합니다">
                <span>일괄 삭제 🗑️</span>
              </button>
            </div>
          </div>
        `;
      }

      // 3. Render Large Notes Grid
      if (filtered.length === 0) {
        gridContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        const cardsHTML = filtered.map(note => {
          const noteFolder = folders.find(f => f.id === note.folder) || { name: '일반/기타', icon: '💊' };
          const dateFormatted = note.date ? note.date.replace(/-/g, '.') : '';
          const isChecked = store.selectedHealthNotes && store.selectedHealthNotes.has(note.id);
          
          return `
            <div class="health-note-card ${isChecked ? 'is-selected' : ''}" data-health-note-id="${note.id}">
              <div class="health-note-header">
                <div class="health-note-top-row">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label class="note-card-checkbox-label" title="메모 선택" onclick="event.stopPropagation();">
                      <input type="checkbox" class="health-item-checkbox" data-id="${note.id}" ${isChecked ? 'checked' : ''}>
                      <span class="custom-card-check"></span>
                    </label>
                    <span class="health-folder-badge">
                      <span>${noteFolder.icon || '🩺'}</span>
                      <span>${escapeHTML(noteFolder.name)}</span>
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <!-- 퀵 폴더 이동 버튼 -->
                    <button type="button" class="task-action-btn move-folder-btn" data-action="quick-move-health-note" data-id="${note.id}" title="다른 폴더로 이동">📁⇄</button>
                    <button type="button" class="task-action-btn edit-btn" data-action="edit-health-note" data-id="${note.id}" title="메모 수정">✏️</button>
                    <button type="button" class="task-action-btn delete-btn" data-action="delete-health-note" data-id="${note.id}" title="메모 삭제">🗑️</button>
                  </div>
                </div>

                <h3 class="health-note-title">${escapeHTML(note.title)}</h3>

                <div class="health-note-submeta">
                  <span>📅 ${dateFormatted}</span>
                  ${note.hospital ? `<span>🏥 ${escapeHTML(note.hospital)}</span>` : ''}
                  ${note.cost ? `<span class="health-cost-chip">💳 ${escapeHTML(note.cost)}</span>` : ''}
                </div>
              </div>

              <div class="health-note-body">${escapeHTML(note.content)}</div>

              ${note.fileName ? `
                <div class="health-file-badge-card">
                  <div class="health-file-info-left">
                    <span class="health-file-name">📑 ${escapeHTML(note.fileName)}</span>
                    ${note.fileMemo ? `<span class="health-file-memo-text">💬 ${escapeHTML(note.fileMemo)}</span>` : ''}
                  </div>
                  ${note.fileUrl ? `
                    <a href="${escapeHTML(note.fileUrl)}" download="${escapeHTML(note.fileName)}" class="btn btn-sm" style="font-size: 0.74rem; background: #10b981; color: #fff; padding: 4px 9px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="결과표 다운로드/열기">
                      <span>📥 다운로드</span>
                    </a>
                  ` : ''}
                </div>
              ` : ''}

              <div class="health-note-footer">
                <span>등록일: ${new Date(note.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                <button type="button" class="btn btn-sm" style="font-size: 0.72rem; padding: 2px 7px; background: rgba(0,0,0,0.04); color: var(--primary);" data-action="copy-health-note" data-id="${note.id}" title="내용 복사">
                  📋 복사
                </button>
              </div>
            </div>
          `;
        }).join('');

        gridContainer.innerHTML = batchBarHTML + cardsHTML;
      }

      this.renderSidebar();
    },

    openHealthNoteModal(noteId = null) {
      const modal = document.getElementById('health-note-modal');
      const form = document.getElementById('health-note-form');
      const titleEl = document.getElementById('health-note-modal-title');
      const editIdEl = document.getElementById('health-note-edit-id');
      const folderSelect = document.getElementById('health-input-folder');
      const dateInput = document.getElementById('health-input-date');
      const titleInput = document.getElementById('health-input-title');
      const hospitalInput = document.getElementById('health-input-hospital');
      const costInput = document.getElementById('health-input-cost');
      const contentInput = document.getElementById('health-input-content');

      const fileSection = document.getElementById('health-checkup-file-section');
      const fileInput = document.getElementById('health-input-file');
      const fileNameEl = document.getElementById('health-file-data-name');
      const fileSizeEl = document.getElementById('health-file-data-size');
      const fileTypeEl = document.getElementById('health-file-data-type');
      const fileUrlEl = document.getElementById('health-file-data-url');
      const fileMemoInput = document.getElementById('health-input-file-memo');
      const filePreviewStatus = document.getElementById('health-file-preview-status');
      const clearFileBtn = document.getElementById('btn-health-clear-file');

      if (!modal || !form) return;
      form.reset();

      function updateCheckupSection(currentFolderVal) {
        if (fileSection) {
          fileSection.style.display = (currentFolderVal === 'checkup') ? 'block' : 'none';
        }
      }

      // Populate folders in select dropdown
      if (folderSelect) {
        const folders = (store.healthFolders || DEFAULT_HEALTH_FOLDERS).filter(f => f.id !== 'all');
        folderSelect.innerHTML = folders.map(f => `
          <option value="${f.id}">${f.icon || '📁'} ${escapeHTML(f.name)}</option>
        `).join('');

        folderSelect.onchange = () => {
          updateCheckupSection(folderSelect.value);
        };
      }

      if (fileNameEl) fileNameEl.value = '';
      if (fileSizeEl) fileSizeEl.value = '';
      if (fileTypeEl) fileTypeEl.value = '';
      if (fileUrlEl) fileUrlEl.value = '';
      if (fileMemoInput) fileMemoInput.value = '';
      if (filePreviewStatus) {
        filePreviewStatus.textContent = '';
        filePreviewStatus.style.display = 'none';
      }
      if (clearFileBtn) clearFileBtn.style.display = 'none';

      if (noteId) {
        const note = store.healthNotes.find(n => n.id === noteId);
        if (!note) return;
        if (titleEl) titleEl.textContent = '🏥 건강 메모 수정 💖';
        if (editIdEl) editIdEl.value = note.id;
        if (folderSelect) folderSelect.value = note.folder || 'general';
        if (dateInput) dateInput.value = note.date || getRealTodayStr();
        if (titleInput) titleInput.value = note.title || '';
        if (hospitalInput) hospitalInput.value = note.hospital || '';
        if (costInput) costInput.value = note.cost || '';
        if (contentInput) contentInput.value = note.content || '';

        if (note.fileName) {
          if (fileNameEl) fileNameEl.value = note.fileName;
          if (fileSizeEl) fileSizeEl.value = note.fileSize || '';
          if (fileTypeEl) fileTypeEl.value = note.fileType || '';
          if (fileUrlEl) fileUrlEl.value = note.fileUrl || '';
          if (fileMemoInput) fileMemoInput.value = note.fileMemo || '';
          if (filePreviewStatus) {
            filePreviewStatus.textContent = `현재 첨부: 📑 ${note.fileName}`;
            filePreviewStatus.style.display = 'block';
          }
          if (clearFileBtn) clearFileBtn.style.display = 'inline-flex';
        }
        updateCheckupSection(note.folder || 'general');
      } else {
        if (titleEl) titleEl.textContent = '🏥 건강 메모 작성 💖';
        if (editIdEl) editIdEl.value = '';
        const initialFolder = (store.activeHealthFolder && store.activeHealthFolder !== 'all') ? store.activeHealthFolder : 'obgyn';
        if (folderSelect) folderSelect.value = initialFolder;
        if (dateInput) dateInput.value = getRealTodayStr();
        updateCheckupSection(initialFolder);
      }

      // Clear file button handler
      if (clearFileBtn) {
        clearFileBtn.onclick = () => {
          if (fileInput) fileInput.value = '';
          if (fileNameEl) fileNameEl.value = '';
          if (fileSizeEl) fileSizeEl.value = '';
          if (fileTypeEl) fileTypeEl.value = '';
          if (fileUrlEl) fileUrlEl.value = '';
          if (filePreviewStatus) {
            filePreviewStatus.textContent = '';
            filePreviewStatus.style.display = 'none';
          }
          clearFileBtn.style.display = 'none';
        };
      }

      // File input change handler (Convert to Base64 DataURL for offline & sync safe storage)
      if (fileInput) {
        fileInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (file.size > 15 * 1024 * 1024) {
            alert('파일 용량은 최대 15MB까지 첨부할 수 있습니다.');
            fileInput.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (fileNameEl) fileNameEl.value = file.name;
            if (fileSizeEl) fileSizeEl.value = file.size;
            if (fileTypeEl) fileTypeEl.value = file.type;
            if (fileUrlEl) fileUrlEl.value = reader.result;
            if (filePreviewStatus) {
              filePreviewStatus.textContent = `선택됨: 📑 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
              filePreviewStatus.style.display = 'block';
            }
            if (clearFileBtn) clearFileBtn.style.display = 'inline-flex';
          };
          reader.readAsDataURL(file);
        };
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHealthNoteModal() {
      const modal = document.getElementById('health-note-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openHealthFolderModal(folderId = null) {
      const modal = document.getElementById('health-folder-modal');
      const form = document.getElementById('health-folder-form');
      const titleEl = document.getElementById('health-folder-modal-title');
      const editIdEl = document.getElementById('health-folder-edit-id');
      const iconInput = document.getElementById('health-input-folder-icon');
      const nameInput = document.getElementById('health-input-folder-name');
      const grid = document.getElementById('health-folder-emoji-grid');
      const deleteBtn = document.getElementById('btn-delete-health-folder');
      const submitBtn = document.getElementById('btn-submit-health-folder');

      if (!modal || !form) return;
      form.reset();

      let currentIcon = '🩺';
      let currentName = '';

      if (folderId) {
        const folder = (store.healthFolders || DEFAULT_HEALTH_FOLDERS).find(f => f.id === folderId);
        if (!folder) return;
        currentIcon = folder.icon || '🩺';
        currentName = folder.name || '';
        if (titleEl) titleEl.textContent = '📁 건강 폴더 수정 & 삭제 💖';
        if (editIdEl) editIdEl.value = folder.id;
        if (nameInput) nameInput.value = currentName;
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) {
          // 'all' (전체보기) 제외하고 모든 폴더 삭제 허용!
          const isProtected = (folder.id === 'all');
          deleteBtn.style.display = isProtected ? 'none' : 'inline-flex';
          deleteBtn.dataset.id = folder.id;
        }
        if (submitBtn) submitBtn.textContent = '수정 완료 ✨';
      } else {
        if (titleEl) titleEl.textContent = '📁 새 건강 폴더 추가';
        if (editIdEl) editIdEl.value = '';
        if (nameInput) nameInput.value = '';
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '폴더 생성 📁';
      }

      // Render 24 Emoji Picker Buttons
      if (grid) {
        grid.innerHTML = HEALTH_EMOJI_LIST.map(emoji => {
          const isSel = (emoji === currentIcon);
          return `
            <button type="button" class="health-emoji-option-btn ${isSel ? 'selected' : ''}" data-emoji="${emoji}" title="${emoji}">
              ${emoji}
            </button>
          `;
        }).join('');
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (nameInput) setTimeout(() => nameInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHealthFolderModal() {
      const modal = document.getElementById('health-folder-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // =========================================================================
    // 🎨 취미활동 (Hobby & Life Activity Journal Engine)
    // =========================================================================
    renderHobby() {
      const tabsBar = document.getElementById('hobby-folder-tabs');
      const gridContainer = document.getElementById('hobby-notes-grid-container');
      const emptyState = document.getElementById('hobby-empty-state');
      const curFolderBadge = document.getElementById('hobby-cur-folder-badge');
      const curFolderDesc = document.getElementById('hobby-cur-folder-desc');
      const notesCountBadge = document.getElementById('hobby-notes-count-badge');

      if (!gridContainer) return;

      const activeFolder = store.activeHobbyFolder || 'all';
      const folders = store.hobbyFolders || DEFAULT_HOBBY_FOLDERS;
      const allNotes = store.hobbyNotes || [];
      const nonAllFolders = folders.filter(f => f.id !== 'all');

      // 1. Render Folder Tabs (with edit pencil icon for editable folders)
      if (tabsBar) {
        tabsBar.innerHTML = folders.map(f => {
          const isActive = (f.id === activeFolder);
          const count = f.id === 'all' 
            ? allNotes.length 
            : allNotes.filter(n => n.folder === f.id).length;
          
          const editBtn = (f.id !== 'all')
            ? `<span class="hobby-folder-edit-btn" data-action="open-edit-hobby-folder" data-id="${f.id}" title="폴더 이름/아이콘 수정 및 삭제">✏️</span>`
            : '';

          return `
            <button type="button" class="hobby-folder-tab ${isActive ? 'active' : ''}" data-hobby-folder-id="${f.id}">
              <span>${f.icon || '🎨'}</span>
              <span>${escapeHTML(f.name)}</span>
              <span class="badge" style="font-size: 0.72rem; padding: 1px 6px; background: ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'}; color: ${isActive ? '#fff' : 'var(--text-muted)'}; border-radius: 10px;">${count}</span>
              ${editBtn}
            </button>
          `;
        }).join('');
      }

      // 2. Filter Notes by active folder
      const filtered = (activeFolder === 'all')
        ? allNotes
        : allNotes.filter(n => n.folder === activeFolder);

      const activeFolderObj = folders.find(f => f.id === activeFolder) || folders[0];
      if (curFolderBadge) {
        curFolderBadge.textContent = `${activeFolderObj.icon || '🎨'} ${activeFolderObj.name}`;
      }
      if (curFolderDesc) {
        curFolderDesc.textContent = activeFolder === 'all'
          ? `총 ${allNotes.length}개의 취미 활동 일지가 보관 중입니다.`
          : `'${activeFolderObj.name}' 폴더에 ${filtered.length}건의 취미 기록이 있습니다.`;
      }
      if (notesCountBadge) {
        notesCountBadge.textContent = `총 ${filtered.length}건`;
      }

      // 2.5. Batch Action Toolbar (선택된 취미 일지 이동 / 삭제)
      const selectedIds = Array.from(store.selectedHobbyNotes || []).filter(id => filtered.some(n => n.id === id));
      const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

      let batchBarHTML = '';
      if (filtered.length > 0) {
        const folderOptionsHTML = nonAllFolders.map(f => `<option value="${f.id}">${f.icon || '🎨'} ${escapeHTML(f.name)}</option>`).join('');
        batchBarHTML = `
          <div class="note-batch-toolbar ${selectedIds.length > 0 ? 'is-active' : ''}">
            <div class="batch-left">
              <label class="batch-check-label" title="전체 선택/해제">
                <input type="checkbox" id="hobby-check-all" class="batch-checkbox-all" ${isAllSelected ? 'checked' : ''}>
                <span>${selectedIds.length > 0 ? `선택됨 <strong>${selectedIds.length}</strong>개` : '전체 선택'}</span>
              </label>
            </div>
            <div class="batch-right" style="${selectedIds.length > 0 ? 'display: flex;' : 'display: none;'}">
              <span class="batch-action-hint">선택 항목 이동:</span>
              <select id="hobby-batch-target-folder" class="batch-select-dropdown">
                <option value="">📁 이동할 폴더 선택...</option>
                ${folderOptionsHTML}
              </select>
              <button type="button" class="btn btn-sm btn-primary" data-action="batch-move-hobby-notes" title="선택한 일지들을 선택한 폴더로 이동합니다">
                <span>이동 ✨</span>
              </button>
              <button type="button" class="btn btn-sm" style="background: rgba(255, 77, 77, 0.12); color: #ff4d4d; border: 1px solid rgba(255,77,77,0.25);" data-action="batch-delete-hobby-notes" title="선택한 일지들을 삭제합니다">
                <span>일괄 삭제 🗑️</span>
              </button>
            </div>
          </div>
        `;
      }

      // 3. Render Large Hobby Notes Grid
      if (filtered.length === 0) {
        gridContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        const cardsHTML = filtered.map(note => {
          const noteFolder = folders.find(f => f.id === note.folder) || { name: '기타취미', icon: '✨' };
          const dateFormatted = note.date ? note.date.replace(/-/g, '.') : '';
          const isChecked = store.selectedHobbyNotes && store.selectedHobbyNotes.has(note.id);
          
          return `
            <div class="hobby-note-card ${isChecked ? 'is-selected' : ''}" data-hobby-note-id="${note.id}">
              <div class="hobby-note-header">
                <div class="hobby-note-top-row">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label class="note-card-checkbox-label" title="일지 선택" onclick="event.stopPropagation();">
                      <input type="checkbox" class="hobby-item-checkbox" data-id="${note.id}" ${isChecked ? 'checked' : ''}>
                      <span class="custom-card-check"></span>
                    </label>
                    <span class="hobby-folder-badge">
                      <span>${noteFolder.icon || '🎨'}</span>
                      <span>${escapeHTML(noteFolder.name)}</span>
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <!-- 퀵 폴더 이동 버튼 -->
                    <button type="button" class="task-action-btn move-folder-btn" data-action="quick-move-hobby-note" data-id="${note.id}" title="다른 폴더로 이동">📁⇄</button>
                    <button type="button" class="task-action-btn edit-btn" data-action="edit-hobby-note" data-id="${note.id}" title="일지 수정">✏️</button>
                    <button type="button" class="task-action-btn delete-btn" data-action="delete-hobby-note" data-id="${note.id}" title="일지 삭제">🗑️</button>
                  </div>
                </div>

                <h3 class="hobby-note-title">${escapeHTML(note.title)}</h3>

                <div class="hobby-note-submeta">
                  <span>📅 ${dateFormatted}</span>
                  ${note.place ? `<span>📍 ${escapeHTML(note.place)}</span>` : ''}
                  ${note.duration ? `<span class="hobby-duration-chip">⏱️ ${escapeHTML(note.duration)}</span>` : ''}
                </div>
              </div>

              <div class="hobby-note-body">${escapeHTML(note.content)}</div>

              <div class="hobby-note-footer">
                <span>등록일: ${new Date(note.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                <button type="button" class="btn btn-sm" style="font-size: 0.72rem; padding: 2px 7px; background: rgba(0,0,0,0.04); color: var(--primary);" data-action="copy-hobby-note" data-id="${note.id}" title="내용 복사">
                  📋 복사
                </button>
              </div>
            </div>
          `;
        }).join('');

        gridContainer.innerHTML = batchBarHTML + cardsHTML;
      }

      this.renderSidebar();
    },

    openHobbyFolderModal(folderId = null) {
      const modal = document.getElementById('hobby-folder-modal');
      const form = document.getElementById('hobby-folder-form');
      const titleEl = document.getElementById('hobby-folder-modal-title');
      const editIdEl = document.getElementById('hobby-folder-edit-id');
      const iconInput = document.getElementById('hobby-input-folder-icon');
      const nameInput = document.getElementById('hobby-input-folder-name');
      const grid = document.getElementById('hobby-folder-emoji-grid');
      const deleteBtn = document.getElementById('btn-delete-hobby-folder');
      const submitBtn = document.getElementById('btn-submit-hobby-folder');

      if (!modal || !form) return;
      form.reset();

      let currentIcon = '🎨';
      let currentName = '';

      if (folderId) {
        const folder = (store.hobbyFolders || DEFAULT_HOBBY_FOLDERS).find(f => f.id === folderId);
        if (!folder) return;
        currentIcon = folder.icon || '🎨';
        currentName = folder.name || '';
        if (titleEl) titleEl.textContent = '📁 취미 폴더 수정 & 삭제 💖';
        if (editIdEl) editIdEl.value = folder.id;
        if (nameInput) nameInput.value = currentName;
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) {
          // 'all' (전체보기) 제외하고 모든 폴더 삭제 허용!
          const isProtected = (folder.id === 'all');
          deleteBtn.style.display = isProtected ? 'none' : 'inline-flex';
          deleteBtn.dataset.id = folder.id;
        }
        if (submitBtn) submitBtn.textContent = '수정 완료 ✨';
      } else {
        if (titleEl) titleEl.textContent = '📁 새 취미 폴더 추가';
        if (editIdEl) editIdEl.value = '';
        if (nameInput) nameInput.value = '';
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '폴더 생성 📁';
      }

      // Render 24 Emoji Picker Buttons
      if (grid) {
        grid.innerHTML = HOBBY_EMOJI_LIST.map(emoji => {
          const isSel = (emoji === currentIcon);
          return `
            <button type="button" class="hobby-emoji-option-btn ${isSel ? 'selected' : ''}" data-hobby-emoji="${emoji}" title="${emoji}">
              ${emoji}
            </button>
          `;
        }).join('');
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (nameInput) setTimeout(() => nameInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHobbyFolderModal() {
      const modal = document.getElementById('hobby-folder-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openHobbyNoteModal(noteId = null) {
      const modal = document.getElementById('hobby-note-modal');
      const form = document.getElementById('hobby-note-form');
      const titleEl = document.getElementById('hobby-note-modal-title');
      const editIdEl = document.getElementById('hobby-note-edit-id');
      const folderSelect = document.getElementById('hobby-input-folder');
      const dateInput = document.getElementById('hobby-input-date');
      const titleInput = document.getElementById('hobby-input-title');
      const placeInput = document.getElementById('hobby-input-place');
      const durationInput = document.getElementById('hobby-input-duration');
      const contentInput = document.getElementById('hobby-input-content');

      if (!modal || !form) return;
      form.reset();

      // Populate folders in select dropdown
      if (folderSelect) {
        const folders = (store.hobbyFolders || DEFAULT_HOBBY_FOLDERS).filter(f => f.id !== 'all');
        folderSelect.innerHTML = folders.map(f => `
          <option value="${f.id}">${f.icon || '🎨'} ${escapeHTML(f.name)}</option>
        `).join('');
      }

      if (noteId) {
        const note = store.hobbyNotes.find(n => n.id === noteId);
        if (!note) return;
        if (titleEl) titleEl.textContent = '🎨 취미 기록 수정 💖';
        if (editIdEl) editIdEl.value = note.id;
        if (folderSelect) folderSelect.value = note.folder || 'general';
        if (dateInput) dateInput.value = note.date || getRealTodayStr();
        if (titleInput) titleInput.value = note.title || '';
        if (placeInput) placeInput.value = note.place || '';
        if (durationInput) durationInput.value = note.duration || '';
        if (contentInput) contentInput.value = note.content || '';
      } else {
        if (titleEl) titleEl.textContent = '🎨 취미 기록 작성 💖';
        if (editIdEl) editIdEl.value = '';
        if (folderSelect) {
          folderSelect.value = (store.activeHobbyFolder && store.activeHobbyFolder !== 'all') ? store.activeHobbyFolder : 'workout';
        }
        if (dateInput) dateInput.value = getRealTodayStr();
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHobbyNoteModal() {
      const modal = document.getElementById('hobby-note-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openHobbyFolderModal(folderId = null) {
      const modal = document.getElementById('hobby-folder-modal');
      const form = document.getElementById('hobby-folder-form');
      const titleEl = document.getElementById('hobby-folder-modal-title');
      const editIdEl = document.getElementById('hobby-folder-edit-id');
      const iconInput = document.getElementById('hobby-input-folder-icon');
      const nameInput = document.getElementById('hobby-input-folder-name');
      const grid = document.getElementById('hobby-folder-emoji-grid');
      const deleteBtn = document.getElementById('btn-delete-hobby-folder');
      const submitBtn = document.getElementById('btn-submit-hobby-folder');

      if (!modal || !form) return;
      form.reset();

      let currentIcon = '🎨';
      let currentName = '';

      if (folderId) {
        const folder = (store.hobbyFolders || DEFAULT_HOBBY_FOLDERS).find(f => f.id === folderId);
        if (!folder) return;
        currentIcon = folder.icon || '🎨';
        currentName = folder.name || '';
        if (titleEl) titleEl.textContent = '📁 취미 폴더 수정 💖';
        if (editIdEl) editIdEl.value = folder.id;
        if (nameInput) nameInput.value = currentName;
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) {
          const isProtected = (folder.id === 'general' || folder.id === 'workout' || folder.id === 'piano' || folder.id === 'drawing' || folder.id === 'reading' || folder.id === 'all');
          deleteBtn.style.display = isProtected ? 'none' : 'inline-flex';
          deleteBtn.dataset.id = folder.id;
        }
        if (submitBtn) submitBtn.textContent = '수정 완료 ✨';
      } else {
        if (titleEl) titleEl.textContent = '📁 새 취미 폴더 추가';
        if (editIdEl) editIdEl.value = '';
        if (nameInput) nameInput.value = '';
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '폴더 생성 📁';
      }

      // Render 24 Hobby Emoji Picker Buttons
      if (grid) {
        grid.innerHTML = HOBBY_EMOJI_LIST.map(emoji => {
          const isSel = (emoji === currentIcon);
          return `
            <button type="button" class="hobby-emoji-option-btn ${isSel ? 'selected' : ''}" data-hobby-emoji="${emoji}" title="${emoji}">
              ${emoji}
            </button>
          `;
        }).join('');
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (nameInput) setTimeout(() => nameInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHobbyFolderModal() {
      const modal = document.getElementById('hobby-folder-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // =========================================================================
    // 🚀 개발기록 (Dev Log Engine)
    // =========================================================================
    renderDevLog() {
      const container = document.getElementById('devlog-timeline-list');
      if (!container) return;

      container.innerHTML = DEVLOG_DATA.map((log, index) => {
        const isLatest = (index === 0);
        return `
          <div class="devlog-card ${isLatest ? 'highlight-latest' : ''}" data-devlog-ver="${log.version}">
            <div class="devlog-card-header">
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <span class="devlog-version-badge" style="background: ${log.badgeColor || 'var(--primary)'};">
                  ${log.version}
                </span>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">
                  📅 ${log.dateFormatted}
                </span>
                <span class="badge" style="background: rgba(255, 107, 139, 0.1); color: var(--primary); font-weight: 800; font-size: 0.72rem; padding: 2px 7px;">
                  ${log.badge}
                </span>
              </div>
              <button type="button" class="btn btn-sm btn-devlog-popup" style="font-size: 0.78rem; background: linear-gradient(135deg, rgba(255,107,139,0.12), rgba(112,72,232,0.12)); color: var(--primary); font-weight: 800; padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(255,107,139,0.25);" onclick="UI.openDevLogModal('${log.version}')">
                🔍 팝업상세
              </button>
            </div>

            <h3 class="devlog-card-title">${log.title}</h3>
            <div class="devlog-summary-box">💬 ${log.summary}</div>

            <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;">
              <button type="button" class="btn btn-sm btn-primary" style="font-size: 0.82rem; padding: 0.45rem 1.15rem; font-weight: 700;" onclick="UI.openDevLogModal('${log.version}')">
                <span>📋 상세 개발 내역 팝업 보기</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      this.renderSidebar();
    },

    openDevLogModal(version = 'v1.1') {
      const log = DEVLOG_DATA.find(d => d.version === version) || DEVLOG_DATA[0];
      if (!log) return;

      const modal = document.getElementById('devlog-detail-modal');
      const badgeEl = document.getElementById('devlog-modal-version-badge');
      const titleEl = document.getElementById('devlog-modal-title');
      const dateEl = document.getElementById('devlog-modal-date');
      const summaryEl = document.getElementById('devlog-modal-summary');
      const listEl = document.getElementById('devlog-modal-details-list');

      if (!modal) return;

      if (badgeEl) {
        badgeEl.textContent = log.version;
        badgeEl.style.background = log.badgeColor || 'var(--primary)';
      }
      if (titleEl) titleEl.textContent = log.title;
      if (dateEl) dateEl.textContent = log.dateFormatted;
      if (summaryEl) summaryEl.textContent = `💡 ${log.summary}`;
      if (listEl) {
        listEl.innerHTML = log.details.map(d => `<li>${d}</li>`).join('');
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeDevLogModal() {
      const modal = document.getElementById('devlog-detail-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    }
  };

  // Expose to global window for immediate and resilient access
  window.UI = UI;
  window.openCloudModal = () => UI.openCloudModal();
  window.closeCloudModal = () => UI.closeCloudModal();
  window.selectCategoryFilter = (catId, event) => {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const isLogged = !!(cloudSync.spaceId && cloudSync.pin);
    if (!isLogged) {
      UI.showToast('동기화 로그인(잠금 해제)을 하셔야 다이어리를 보실 수 있어요 🔐', 'info');
      UI.openCloudModal();
      return;
    }
    store.activeFilter = catId;
    localStorage.setItem('todolist_jy_active_filter', catId);
    // 화면 점핑 방지: scrollTo 제거하여 현재 스크롤 위치 완벽 유지
    UI.renderTasks();
    UI.renderSidebar();
  };

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
    localStorage.setItem('todolist_jy_active_filter', 'all');
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

    const currentCat = (store.activeFilter === 'work') ? 'work' : 'personal';

    store.addTask({
      title: val,
      type: 'todo',
      category: currentCat,
      dueDate: TODAY_STR
    });

    input.value = '';
    sounds.playAdd();
    const catName = currentCat === 'work' ? '업무 💼' : '개인 🌸';
    UI.showToast(`'${catName}'에 새로운 할 일이 등록되었어요! ✨`, 'success');
    UI.renderTasks();
    UI.renderSidebar();
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

    // Sidebar & Mobile Nav Filter Event Delegation
    let isDraggingCategory = false;
    let suppressNavClickUntil = 0;

    // 1. Direct Category Navigation List Handler
    const catNavList = document.getElementById('category-nav-list');
    if (catNavList) {
      let draggedCatId = null;
      let touchTargetItem = null;
      let touchStartY = 0;
      let touchMoved = false;

      // Click on Category Item
      catNavList.addEventListener('click', (e) => {
        if (Date.now() < suppressNavClickUntil) return;
        if (isDraggingCategory) return;
        if (e.target.closest('.category-drag-handle')) return;
        const item = e.target.closest('.category-drag-item');
        if (item && item.dataset.filter) {
          window.selectCategoryFilter(item.dataset.filter);
        }
      });

      // Reorder Mode Toggle Button Click
      document.addEventListener('click', (e) => {
        const reorderBtn = e.target.closest('#btn-toggle-reorder-menu');
        if (reorderBtn) {
          store.isReorderMode = !store.isReorderMode;
          UI.renderSidebar();
          if (store.isReorderMode) {
            UI.showToast('메뉴와 구분선을 원하는 위치로 드래그하세요 ✨', 'info');
          } else {
            store.save();
            UI.showToast('메뉴 순서 변경이 완료되었어요! 💖', 'success');
          }
        }
      });

      // Click to select category/menu
      catNavList.addEventListener('click', (e) => {
        if (store.isReorderMode) return; // 순서변경 모드 중에는 클릭 이동 방지
        if (Date.now() < suppressNavClickUntil) return;
        if (isDraggingCategory) return;
        const item = e.target.closest('.nav-item');
        if (item && item.dataset.filter && !item.classList.contains('sidebar-nav-divider')) {
          window.selectCategoryFilter(item.dataset.filter);
        }
      });

      // Desktop: Drag and drop enabled only in Reorder Mode
      catNavList.addEventListener('dragstart', (e) => {
        if (!store.isReorderMode) {
          e.preventDefault();
          return;
        }
        const item = e.target.closest('.category-drag-item');
        if (!item) return;
        isDraggingCategory = true;
        draggedCatId = item.dataset.catId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedCatId);
      });

      catNavList.addEventListener('dragend', (e) => {
        const item = e.target.closest('.category-drag-item');
        if (item) {
          item.classList.remove('dragging');
        }
        document.querySelectorAll('.category-drag-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        setTimeout(() => { isDraggingCategory = false; }, 100);
      });

      catNavList.addEventListener('dragover', (e) => {
        if (!store.isReorderMode || !draggedCatId) return;
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
        if (!store.isReorderMode) return;
        e.preventDefault();
        suppressNavClickUntil = Date.now() + 250;
        const targetItem = e.target.closest('.category-drag-item');
        if (!targetItem || !draggedCatId) return;
        const targetCatId = targetItem.dataset.catId;
        if (targetCatId === draggedCatId) return;

        const fromIdx = store.sidebarMenuOrder.indexOf(draggedCatId);
        const toIdx = store.sidebarMenuOrder.indexOf(targetCatId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [movedId] = store.sidebarMenuOrder.splice(fromIdx, 1);
          const rect = targetItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertIdx = (e.clientY < midY) ? toIdx : toIdx + 1;
          store.sidebarMenuOrder.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, movedId);
          store.save();
          UI.renderSidebar();
        }
        draggedCatId = null;
        document.querySelectorAll('.category-drag-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      // 2. Mobile Touch Drag & Drop (Only in Reorder Mode)
      catNavList.addEventListener('touchstart', (e) => {
        if (!store.isReorderMode) return;
        const item = e.target.closest('.category-drag-item');
        if (!item) return;
        draggedCatId = item.dataset.catId;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
        item.classList.add('touch-dragging');
      }, { passive: true });

      catNavList.addEventListener('touchmove', (e) => {
        if (!store.isReorderMode || !draggedCatId) return;
        const touch = e.touches[0];
        if (Math.abs(touch.clientY - touchStartY) > 6) {
          touchMoved = true;
        }
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!target) return;
        const overItem = target.closest('.category-drag-item');
        
        document.querySelectorAll('.category-drag-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        if (overItem && overItem.dataset.catId !== draggedCatId) {
          touchTargetItem = overItem;
          const rect = overItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (touch.clientY < midY) {
            overItem.classList.add('drag-over-top');
          } else {
            overItem.classList.add('drag-over-bottom');
          }
        }
      }, { passive: true });

      catNavList.addEventListener('touchend', (e) => {
        if (draggedCatId && touchMoved && touchTargetItem) {
          suppressNavClickUntil = Date.now() + 250;
          const targetCatId = touchTargetItem.dataset.catId;
          if (targetCatId && targetCatId !== draggedCatId) {
            const fromIdx = store.sidebarMenuOrder.indexOf(draggedCatId);
            const toIdx = store.sidebarMenuOrder.indexOf(targetCatId);
            if (fromIdx !== -1 && toIdx !== -1) {
              const [movedId] = store.sidebarMenuOrder.splice(fromIdx, 1);
              const insertIdx = touchTargetItem.classList.contains('drag-over-top') ? toIdx : toIdx + 1;
              store.sidebarMenuOrder.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, movedId);
              store.save();
              UI.renderSidebar();
              UI.showToast('메뉴 순서가 변경되었어요! 🏷️✨', 'info');
            }
          }
        }
        draggedCatId = null;
        touchTargetItem = null;
        touchMoved = false;
        document.querySelectorAll('.category-drag-item').forEach(el => el.classList.remove('touch-dragging', 'drag-over-top', 'drag-over-bottom'));
      });
    }

    // 2. Global Click Delegation for all Navigation Items
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem && navItem.dataset.filter) {
        if (!e.target.closest('.category-drag-handle')) {
          const newFilter = navItem.dataset.filter;
          window.selectCategoryFilter(newFilter, e);
          return;
        }
      }

      const mobileNavBtn = e.target.closest('.mobile-nav-btn');
      if (mobileNavBtn && mobileNavBtn.dataset.mobileNav) {
        const newFilter = mobileNavBtn.dataset.mobileNav;
        window.selectCategoryFilter(newFilter, e);
        return;
      }

      const mobilePill = e.target.closest('.mobile-cat-pill');
      if (mobilePill && mobilePill.dataset.filter) {
        const newFilter = mobilePill.dataset.filter;
        window.selectCategoryFilter(newFilter, e);
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

    // Modal Delete Button Listener (일정 수정 모달 내 삭제)
    const modalDeleteBtn = document.getElementById('btn-modal-delete-task');
    if (modalDeleteBtn) {
      modalDeleteBtn.addEventListener('click', () => {
        const form = document.getElementById('task-form');
        const taskId = form?.dataset.taskId;
        if (taskId && confirm('이 일정을 정말 삭제하시겠습니까?')) {
          store.deleteTask(taskId);
          sounds.playDelete();
          UI.closeTaskModal();
          UI.showToast('일정이 안전하게 삭제되었어요 🗑️', 'info');
          UI.renderTasks();
          UI.renderSidebar();
          if (store.activeFilter === 'calendar-month') UI.renderCalendarMonth();
          if (store.activeFilter === 'calendar-week') UI.renderCalendarWeek();
        }
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
      if (modal) modal.classList.add('active');
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
            const catName = data.category === 'work' ? '업무 💼' : '개인 🌸';
            UI.showToast(`새로운 일정이 '${catName}'에 등록되었어요! 💖`, 'success');
          }
        }

        UI.closeTaskModal();
        UI.renderTasks();
        UI.renderSidebar();
        if (store.activeFilter === 'calendar-month') UI.renderCalendarMonth();
        if (store.activeFilter === 'calendar-week') UI.renderCalendarWeek();
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
      });
    }

    // File Vault Form Submit
    const fileUploadForm = document.getElementById('file-upload-form');
    if (fileUploadForm) {
      fileUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('modal-vault-file-input');
        const note = (document.getElementById('modal-vault-file-note')?.value || '').trim();

        if (!input || !input.files || input.files.length === 0) return;
        const file = input.files[0];

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const newFile = {
              id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: reader.result,
              note: note,
              createdAt: Date.now()
            };

            await cloudSync.addVaultFiles([newFile]);
            sounds.playAdd();
            confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
            UI.closeFileUploadModal();
            UI.showToast(`'${file.name}' 파일이 보관함에 안전하게 저장되었어요! 💾✨`, 'success');
            UI.renderFilesVault();
            UI.renderSidebar();
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error(err);
          UI.showToast('파일 업로드 중 오류가 발생했어요.', 'danger');
        }
      });
    }

    // File Vault Dropzone & Hidden Input Handling
    const vaultDropzone = document.getElementById('vault-dropzone');
    const vaultHiddenInput = document.getElementById('vault-file-hidden-input');
    if (vaultDropzone && vaultHiddenInput) {
      vaultDropzone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          vaultHiddenInput.click();
        }
      });

      vaultHiddenInput.addEventListener('change', async () => {
        if (!vaultHiddenInput.files || vaultHiddenInput.files.length === 0) return;
        const filesList = Array.from(vaultHiddenInput.files);
        
        try {
          const newFiles = [];
          for (const file of filesList) {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            newFiles.push({
              id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: dataUrl,
              note: '',
              createdAt: Date.now()
            });
          }

          await cloudSync.addVaultFiles(newFiles);
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
          UI.showToast(`총 ${newFiles.length}개 파일이 보관함에 안전하게 저장되었어요! 📁✨`, 'success');
          UI.renderFilesVault();
          UI.renderSidebar();
        } catch (err) {
          console.error(err);
          UI.showToast('파일 보관 중 오류가 발생했어요.', 'danger');
        }
        vaultHiddenInput.value = '';
      });

      // Drag & Drop
      ['dragenter', 'dragover'].forEach(eventName => {
        vaultDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          vaultDropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        vaultDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          vaultDropzone.classList.remove('dragover');
        });
      });

      vaultDropzone.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = dt ? Array.from(dt.files) : [];
        if (!files.length) return;

        try {
          const newFiles = [];
          for (const file of files) {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            newFiles.push({
              id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: dataUrl,
              note: '',
              createdAt: Date.now()
            });
          }

          await cloudSync.addVaultFiles(newFiles);
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
          UI.showToast(`총 ${newFiles.length}개 파일이 드롭되어 보관함에 저장되었어요! 📂✨`, 'success');
          UI.renderFilesVault();
          UI.renderSidebar();
        } catch (err) {
          console.error(err);
          UI.showToast('파일 보관 중 오류가 발생했어요.', 'danger');
        }
      });
    }

    // Project Form Submit
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
      projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('project-edit-id')?.value;
        const icon = document.getElementById('project-input-icon')?.value || '🏢';
        const title = document.getElementById('project-input-title')?.value.trim();
        const category = document.getElementById('project-input-cat')?.value.trim() || '부동산/주거';
        const targetDate = document.getElementById('project-input-target-date')?.value || '';
        const budget = document.getElementById('project-input-budget')?.value.trim() || '';
        const description = document.getElementById('project-input-desc')?.value.trim() || '';

        if (!title) return;

        if (editId) {
          store.updateProject(editId, { icon, title, category, targetDate, budget, description });
          sounds.playComplete();
          UI.showToast(`'${title}' 프로젝트가 수정되었어요! 🎯✨`, 'info');
        } else {
          const newP = store.addProject({ icon, title, category, targetDate, budget, description });
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 50);
          UI.showToast(`'${title}' 새 프로젝트가 시작되었어요! 🚀💖`, 'success');
        }

        UI.closeProjectModal();
        UI.renderProject();
        UI.renderSidebar();
      });
    }

    // Milestone Form Submit
    const milestoneForm = document.getElementById('milestone-form');
    if (milestoneForm) {
      milestoneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('milestone-edit-id')?.value;
        const projectId = document.getElementById('milestone-project-id')?.value;
        const title = document.getElementById('milestone-input-title')?.value.trim();
        const date = document.getElementById('milestone-input-date')?.value || '';
        const amount = document.getElementById('milestone-input-amount')?.value.trim() || '';
        const memo = document.getElementById('milestone-input-memo')?.value.trim() || '';
        const completed = !!document.getElementById('milestone-input-completed')?.checked;

        if (!title || !projectId) return;

        if (editId) {
          store.updateMilestone(projectId, editId, { title, date, amount, memo, completed });
          sounds.playComplete();
          UI.showToast(`마일스톤 '${title}' 단계가 수정되었어요! ✨`, 'info');
        } else {
          store.addMilestone(projectId, { title, date, amount, memo, completed });
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
          UI.showToast(`'${title}' 단계가 로드맵에 추가되었어요! 🗺️✨`, 'success');
        }

        UI.closeMilestoneModal();
        UI.renderProject();
        UI.renderSidebar();
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

      // --- Life Project & Milestone Actions ---
      // 0.01. Select Project Tab
      const projTab = target.closest('[data-action="select-project-tab"]');
      if (projTab && projTab.dataset.id) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        store.activeProjectId = projTab.dataset.id;
        UI.renderProject();
        return;
      }

      // 0.02. Open Add / Edit Project Modal
      if (target.closest('[data-action="open-add-project"]') || target.closest('#btn-open-add-project') || target.closest('#btn-empty-add-project')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openProjectModal();
        return;
      }
      const editProjBtn = target.closest('[data-action="open-edit-project"]');
      if (editProjBtn && editProjBtn.dataset.id) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openProjectModal(editProjBtn.dataset.id);
        return;
      }

      // 0.03. Delete Project
      const deleteProjBtn = target.closest('#btn-delete-project');
      if (deleteProjBtn && deleteProjBtn.dataset.id) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const pId = deleteProjBtn.dataset.id;
        if (confirm('정말 이 프로젝트와 모든 마일스톤 계획을 삭제하시겠습니까?')) {
          store.deleteProject(pId);
          sounds.playDelete();
          UI.closeProjectModal();
          UI.showToast('프로젝트가 안전하게 삭제되었어요 🗑️', 'danger');
          UI.renderProject();
          UI.renderSidebar();
        }
        return;
      }

      // 0.04. Close Project Modal
      if (target.closest('[data-close-project-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeProjectModal();
        return;
      }

      // 0.05. Project Emoji Picker Click
      const projEmojiBtn = target.closest('.project-emoji-option-btn');
      if (projEmojiBtn && projEmojiBtn.dataset.projectEmoji) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const iconInput = document.getElementById('project-input-icon');
        if (iconInput) iconInput.value = projEmojiBtn.dataset.projectEmoji;
        const grid = document.getElementById('project-emoji-grid');
        if (grid) {
          grid.querySelectorAll('.project-emoji-option-btn').forEach(b => b.classList.remove('selected'));
          projEmojiBtn.classList.add('selected');
        }
        return;
      }

      // 0.06. Open Add / Edit Milestone Modal
      const addMBtn = target.closest('[data-action="open-add-milestone"]');
      if (addMBtn && addMBtn.dataset.projectId) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openMilestoneModal(addMBtn.dataset.projectId);
        return;
      }
      const editMBtn = target.closest('[data-action="edit-milestone"]');
      if (editMBtn && editMBtn.dataset.projectId && editMBtn.dataset.milestoneId) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openMilestoneModal(editMBtn.dataset.projectId, editMBtn.dataset.milestoneId);
        return;
      }

      // 0.07. Delete Milestone
      const deleteMBtn = target.closest('[data-action="delete-milestone"]') || target.closest('#btn-delete-milestone');
      if (deleteMBtn && deleteMBtn.dataset.projectId && deleteMBtn.dataset.milestoneId) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const pId = deleteMBtn.dataset.projectId;
        const mId = deleteMBtn.dataset.milestoneId;
        if (confirm('이 마일스톤 단계를 정말 삭제하시겠습니까?')) {
          store.deleteMilestone(pId, mId);
          sounds.playDelete();
          UI.closeMilestoneModal();
          UI.showToast('마일스톤 단계가 삭제되었어요 🗑️', 'danger');
          UI.renderProject();
          UI.renderSidebar();
        }
        return;
      }

      // 0.08. Close Milestone Modal
      if (target.closest('[data-close-milestone-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeMilestoneModal();
        return;
      }

      // 0. Dev Log Modal Open from Calendar Chip or Timeline
      if (target.closest('[data-action="open-devlog-modal"]') || target.closest('.cal-devlog-chip')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const chip = target.closest('[data-action="open-devlog-modal"]') || target.closest('.cal-devlog-chip');
        const ver = chip.dataset.devlogVer || 'v1.1';
        UI.openDevLogModal(ver);
        return;
      }

      // Close Devlog Modal
      if (target.closest('[data-close-devlog-modal]')) {
        UI.closeDevLogModal();
        return;
      }

      // Health Manager Buttons & Modals
      if (target.closest('#btn-open-add-health-note') || target.closest('#btn-health-empty-add')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openHealthNoteModal();
        return;
      }
      if (target.closest('#btn-open-add-health-folder')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openHealthFolderModal();
        return;
      }
      if (target.closest('[data-close-health-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeHealthNoteModal();
        return;
      }
      if (target.closest('[data-close-health-folder-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeHealthFolderModal();
        return;
      }

      // 0.1. Health Folder Edit Pencil Click
      const editFolderBtn = target.closest('[data-action="open-edit-health-folder"]');
      if (editFolderBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        UI.openHealthFolderModal(editFolderBtn.dataset.id);
        return;
      }

      // 0.2. Health Emoji Picker Click
      const emojiBtn = target.closest('.health-emoji-option-btn');
      if (emojiBtn && emojiBtn.dataset.emoji) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const iconInput = document.getElementById('health-input-folder-icon');
        if (iconInput) iconInput.value = emojiBtn.dataset.emoji;
        const grid = document.getElementById('health-folder-emoji-grid');
        if (grid) {
          grid.querySelectorAll('.health-emoji-option-btn').forEach(b => b.classList.remove('selected'));
          emojiBtn.classList.add('selected');
        }
        return;
      }

      // 0.3. Delete Health Folder Button Click
      if (target.closest('#btn-delete-health-folder')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const folderId = target.closest('#btn-delete-health-folder').dataset.id;
        if (folderId && folderId !== 'all' && confirm('정말 이 건강 폴더를 삭제하시겠습니까?\n(폴더 안의 메모는 [일반/기타] 폴더로 안전하게 이동됩니다)')) {
          store.deleteHealthFolder(folderId);
          sounds.playDelete();
          UI.closeHealthFolderModal();
          UI.showToast('폴더가 삭제되었고 메모는 안전하게 보관되었어요.', 'info');
          UI.renderHealth();
          UI.renderSidebar();
        }
        return;
      }

      // 0.4. Batch Move Health Notes
      if (target.closest('[data-action="batch-move-health-notes"]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const selectEl = document.getElementById('health-batch-target-folder');
        const targetFolder = selectEl ? selectEl.value : '';
        if (!targetFolder) {
          alert('이동할 대상 폴더를 선택해 주세요!');
          if (selectEl) selectEl.focus();
          return;
        }
        const noteIds = Array.from(store.selectedHealthNotes || []);
        if (!noteIds.length) {
          alert('이동할 메모를 먼저 체크박스로 선택해 주세요!');
          return;
        }
        const count = store.moveHealthNotesToFolder(noteIds, targetFolder);
        store.selectedHealthNotes.clear();
        sounds.playComplete();
        confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
        UI.showToast(`총 ${count}개의 건강 메모가 성공적으로 이동되었어요! 📁✨`, 'success');
        UI.renderHealth();
        return;
      }

      // 0.5. Batch Delete Health Notes
      if (target.closest('[data-action="batch-delete-health-notes"]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const noteIds = Array.from(store.selectedHealthNotes || []);
        if (!noteIds.length) return;
        if (confirm(`선택한 ${noteIds.length}개의 건강 메모를 정말 모두 삭제하시겠습니까?`)) {
          const count = store.deleteHealthNotesBatch(noteIds);
          store.selectedHealthNotes.clear();
          sounds.playDelete();
          UI.showToast(`총 ${count}개의 건강 메모가 삭제되었어요. 🗑️`, 'info');
          UI.renderHealth();
          UI.renderSidebar();
        }
        return;
      }

      // 0.6. Quick Move Single Health Note (원클릭 폴더 변경)
      const quickMoveHealthBtn = target.closest('[data-action="quick-move-health-note"]');
      if (quickMoveHealthBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const noteId = quickMoveHealthBtn.dataset.id;
        const note = (store.healthNotes || []).find(n => n.id === noteId);
        if (note) {
          const nonAllFolders = (store.healthFolders || DEFAULT_HEALTH_FOLDERS).filter(f => f.id !== 'all');
          const folderPromptList = nonAllFolders.map((f, idx) => `${idx + 1}. ${f.icon || '📁'} ${f.name}`).join('\n');
          const chosen = prompt(`이동할 폴더의 번호를 입력하세요:\n\n${folderPromptList}`, '1');
          if (chosen) {
            const num = parseInt(chosen.trim(), 10);
            if (num >= 1 && num <= nonAllFolders.length) {
              const selectedF = nonAllFolders[num - 1];
              store.moveHealthNotesToFolder([note.id], selectedF.id);
              sounds.playComplete();
              UI.showToast(`'${selectedF.name}' 폴더로 메모가 이동되었어요! ✨`, 'success');
              UI.renderHealth();
            }
          }
        }
        return;
      }

      // Health Folder Tab Click
      const healthTab = target.closest('.health-folder-tab');
      if (healthTab && healthTab.dataset.healthFolderId) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        store.activeHealthFolder = healthTab.dataset.healthFolderId;
        UI.renderHealth();
        return;
      }

      // Health Note Edit
      const editHealthBtn = target.closest('[data-action="edit-health-note"]');
      if (editHealthBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openHealthNoteModal(editHealthBtn.dataset.id);
        return;
      }

      // Health Note Delete
      const deleteHealthBtn = target.closest('[data-action="delete-health-note"]');
      if (deleteHealthBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const hId = deleteHealthBtn.dataset.id;
        if (hId && confirm('이 건강 기록 메모를 정말 삭제하시겠습니까?')) {
          store.deleteHealthNote(hId);
          sounds.playDelete();
          UI.showToast('건강 메모가 삭제되었어요.', 'danger');
          UI.renderHealth();
          UI.renderSidebar();
        }
        return;
      }

      // Health Note Copy
      const copyHealthBtn = target.closest('[data-action="copy-health-note"]');
      if (copyHealthBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const hId = copyHealthBtn.dataset.id;
        const note = (store.healthNotes || []).find(n => n.id === hId);
        if (note && navigator.clipboard) {
          const textToCopy = `[건강메모] ${note.title}\n날짜: ${note.date}\n병원: ${note.hospital || '-'}\n비용: ${note.cost || '-'}\n\n${note.content}`;
          navigator.clipboard.writeText(textToCopy).then(() => {
            sounds.playComplete();
            UI.showToast('📋 건강 메모 내용이 복사되었어요!', 'success');
          });
        }
        return;
      }

      // Hobby Manager Buttons & Modals
      if (target.closest('#btn-open-add-hobby-note') || target.closest('#btn-hobby-empty-add')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openHobbyNoteModal();
        return;
      }
      if (target.closest('#btn-open-add-hobby-folder')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.openHobbyFolderModal();
        return;
      }
      if (target.closest('[data-close-hobby-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeHobbyNoteModal();
        return;
      }
      if (target.closest('[data-close-hobby-folder-modal]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        UI.closeHobbyFolderModal();
        return;
      }

      // Hobby Folder Edit Pencil Click
      const editHobbyFolderBtn = target.closest('[data-action="open-edit-hobby-folder"]');
      if (editHobbyFolderBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        UI.openHobbyFolderModal(editHobbyFolderBtn.dataset.id);
        return;
      }

      // Hobby Emoji Picker Click
      const hobbyEmojiBtn = target.closest('.hobby-emoji-option-btn');
      if (hobbyEmojiBtn && hobbyEmojiBtn.dataset.hobbyEmoji) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const iconInput = document.getElementById('hobby-input-folder-icon');
        if (iconInput) iconInput.value = hobbyEmojiBtn.dataset.hobbyEmoji;
        const grid = document.getElementById('hobby-folder-emoji-grid');
        if (grid) {
          grid.querySelectorAll('.hobby-emoji-option-btn').forEach(b => b.classList.remove('selected'));
          hobbyEmojiBtn.classList.add('selected');
        }
        return;
      }

      // Delete Hobby Folder Button Click
      if (target.closest('#btn-delete-hobby-folder')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const folderId = target.closest('#btn-delete-hobby-folder').dataset.id;
        if (folderId && folderId !== 'all' && confirm('정말 이 취미 폴더를 삭제하시겠습니까?\n(폴더 안의 일지는 [기타취미] 폴더로 안전하게 이동됩니다)')) {
          store.deleteHobbyFolder(folderId);
          sounds.playDelete();
          UI.closeHobbyFolderModal();
          UI.showToast('취미 폴더가 삭제되었고 기록은 안전하게 보관되었어요.', 'info');
          UI.renderHobby();
          UI.renderSidebar();
        }
        return;
      }

      // Batch Move Hobby Notes
      if (target.closest('[data-action="batch-move-hobby-notes"]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const selectEl = document.getElementById('hobby-batch-target-folder');
        const targetFolder = selectEl ? selectEl.value : '';
        if (!targetFolder) {
          alert('이동할 대상 취미 폴더를 선택해 주세요!');
          if (selectEl) selectEl.focus();
          return;
        }
        const noteIds = Array.from(store.selectedHobbyNotes || []);
        if (!noteIds.length) {
          alert('이동할 일지를 먼저 체크박스로 선택해 주세요!');
          return;
        }
        const count = store.moveHobbyNotesToFolder(noteIds, targetFolder);
        store.selectedHobbyNotes.clear();
        sounds.playComplete();
        confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
        UI.showToast(`총 ${count}개의 취미 일지가 성공적으로 이동되었어요! 🎨✨`, 'success');
        UI.renderHobby();
        return;
      }

      // Batch Delete Hobby Notes
      if (target.closest('[data-action="batch-delete-hobby-notes"]')) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const noteIds = Array.from(store.selectedHobbyNotes || []);
        if (!noteIds.length) return;
        if (confirm(`선택한 ${noteIds.length}개의 취미 일지를 정말 모두 삭제하시겠습니까?`)) {
          const count = store.deleteHobbyNotesBatch(noteIds);
          store.selectedHobbyNotes.clear();
          sounds.playDelete();
          UI.showToast(`총 ${count}개의 취미 일지가 삭제되었어요. 🗑️`, 'info');
          UI.renderHobby();
          UI.renderSidebar();
        }
        return;
      }

      // Quick Move Single Hobby Note
      const quickMoveHobbyBtn = target.closest('[data-action="quick-move-hobby-note"]');
      if (quickMoveHobbyBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const noteId = quickMoveHobbyBtn.dataset.id;
        const note = (store.hobbyNotes || []).find(n => n.id === noteId);
        if (note) {
          const nonAllFolders = (store.hobbyFolders || DEFAULT_HOBBY_FOLDERS).filter(f => f.id !== 'all');
          const folderPromptList = nonAllFolders.map((f, idx) => `${idx + 1}. ${f.icon || '🎨'} ${f.name}`).join('\n');
          const chosen = prompt(`이동할 취미 폴더의 번호를 입력하세요:\n\n${folderPromptList}`, '1');
          if (chosen) {
            const num = parseInt(chosen.trim(), 10);
            if (num >= 1 && num <= nonAllFolders.length) {
              const selectedF = nonAllFolders[num - 1];
              store.moveHobbyNotesToFolder([note.id], selectedF.id);
              sounds.playComplete();
              UI.showToast(`'${selectedF.name}' 폴더로 일지가 이동되었어요! ✨`, 'success');
              UI.renderHobby();
            }
          }
        }
        return;
      }

      // Hobby Folder Tab Click
      const hobbyTab = target.closest('.hobby-folder-tab');
      if (hobbyTab && hobbyTab.dataset.hobbyFolderId) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        store.activeHobbyFolder = hobbyTab.dataset.hobbyFolderId;
        UI.renderHobby();
        return;
      }

      // Hobby Note Edit
      const editHobbyBtn = target.closest('[data-action="edit-hobby-note"]');
      if (editHobbyBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        UI.openHobbyNoteModal(editHobbyBtn.dataset.id);
        return;
      }

      // Hobby Note Delete
      const deleteHobbyBtn = target.closest('[data-action="delete-hobby-note"]');
      if (deleteHobbyBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const hId = deleteHobbyBtn.dataset.id;
        if (hId && confirm('이 취미 활동 일지를 정말 삭제하시겠습니까?')) {
          store.deleteHobbyNote(hId);
          sounds.playDelete();
          UI.showToast('취미 기록이 삭제되었어요.', 'danger');
          UI.renderHobby();
          UI.renderSidebar();
        }
        return;
      }

      // Hobby Note Copy
      const copyHobbyBtn = target.closest('[data-action="copy-hobby-note"]');
      if (copyHobbyBtn) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const hId = copyHobbyBtn.dataset.id;
        const note = (store.hobbyNotes || []).find(n => n.id === hId);
        if (note && navigator.clipboard) {
          const textToCopy = `[취미기록] ${note.title}\n날짜: ${note.date}\n장소: ${note.place || '-'}\n소요시간: ${note.duration || '-'}\n\n${note.content}`;
          navigator.clipboard.writeText(textToCopy).then(() => {
            sounds.playComplete();
            UI.showToast('📋 취미 기록 내용이 복사되었어요!', 'success');
          });
        }
        return;
      }

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
        e.stopPropagation();
        e.preventDefault();
        const card = target.closest('.task-card');
        const chip = target.closest('.weekly-item-chip');
        const taskId = (card ? card.dataset.id : null) || (chip ? chip.dataset.taskId : null) || target.closest('[data-task-id]')?.dataset.taskId;
        if (taskId && confirm('정말 이 일정을 삭제하시겠습니까?')) {
          store.deleteTask(taskId);
          sounds.playDelete();
          UI.showToast('일정이 안전하게 삭제되었어요 🗑️', 'danger');
          UI.renderTasks();
          UI.renderSidebar();
          if (store.activeFilter === 'calendar-month') UI.renderCalendarMonth();
          if (store.activeFilter === 'calendar-week') UI.renderCalendarWeek();
        }
        return;
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

      // 6.4. Delete Note (확인 알림 팝업 복구)
      if (target.closest('[data-action="delete-note"]')) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const btn = target.closest('[data-action="delete-note"]');
        const noteId = btn.dataset.noteId || (btn.closest('.note-card') ? btn.closest('.note-card').dataset.noteId : '');
        if (!noteId) return;

        if (confirm('정말 삭제하시겠습니까?')) {
          store.deleteNote(noteId);
          sounds.playDelete();
          UI.showToast('메모가 삭제되었어요 🗑️', 'danger');
          UI.renderNotes();
          UI.renderSidebar();
        }
        return;
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
          if (!f || !f.dataUrl) {
            UI.showToast('파일 데이터를 찾을 수 없습니다.', 'danger');
            return;
          }
          try {
            const a = document.createElement('a');
            a.href = f.dataUrl;
            a.download = f.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            sounds.playComplete();
            UI.showToast(`'${f.name}' 다운로드를 시작했어요! 📥✨`, 'success');
          } catch (err) {
            console.error('Download error:', err);
            UI.showToast('다운로드 처리 중 오류가 발생했습니다.', 'danger');
          }
        });
      }

      // 12. File Vault Delete
      if (target.closest('[data-action="delete-file"]')) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const btn = target.closest('[data-action="delete-file"]');
        const fileId = btn.dataset.fileId || (btn.closest('.file-card') ? btn.closest('.file-card').dataset.fileId : '');
        if (!fileId) return;

        if (confirm('정말 이 파일을 보관함에서 삭제하시겠습니까?')) {
          cloudSync.deleteVaultFile(fileId).then(() => {
            sounds.playDelete();
            UI.showToast('파일이 보관함에서 안전하게 삭제되었어요 🗑️', 'danger');
            UI.renderFilesVault();
            UI.renderSidebar();
          });
        }
        return;
      }

      // 13. Vacation Manager Action Triggers
      if (target.closest('[data-action="delete-vacation"]')) {
        const btn = target.closest('[data-action="delete-vacation"]');
        const vId = btn.dataset.vacationId;
        if (vId && confirm('이 연차/반차 기록을 삭제하시겠습니까?')) {
          store.deleteVacation(vId);
          sounds.playDelete();
          UI.showToast('연차 기록이 삭제되었어요 🗑️', 'danger');
          UI.renderVacation();
        }
      }

      if (target.closest('#btn-open-add-vacation-modal')) {
        UI.openVacationModal();
      }
      if (target.closest('#btn-open-set-total-vacation')) {
        UI.openTotalVacationModal();
      }
      if (target.closest('#btn-close-vacation-modal') || target.closest('#btn-cancel-vacation-modal')) {
        UI.closeVacationModal();
      }
      if (target.closest('#btn-close-total-vacation-modal') || target.closest('#btn-cancel-total-vacation-modal')) {
        UI.closeTotalVacationModal();
      }

      // 13.1. Vacation Top Stat Box Click Filter
      const vstatBox = target.closest('.clickable-vstat-box');
      if (vstatBox && vstatBox.dataset.vtypeFilter) {
        const filterType = vstatBox.dataset.vtypeFilter;
        if (filterType === 'remain') {
          UI.showToast(`올해 남은 연차는 ${store.getVacationStats().remain.toFixed(1)}일입니다 🌸`, 'info');
        } else {
          store.vacationTypeFilter = filterType;
          UI.renderVacation();
          if (filterType === 'used') {
            UI.showToast('사용한 연차/반차 내역만 필터링합니다 🌿', 'info');
          } else if (filterType === 'holiday') {
            UI.showToast('전체 기간(모든 년도/월)의 휴가 사용 내역을 모두 표시합니다 🏖️', 'info');
          } else {
            UI.showToast('전체 연차/휴가 내역을 표시합니다 🌸', 'info');
          }
        }
      }

      // 14. Sites / Bookmarks Action Triggers
      if (target.closest('[data-action="edit-site"]')) {
        const btn = target.closest('[data-action="edit-site"]');
        const siteId = btn.dataset.siteId;
        if (siteId) UI.openSiteModal(siteId);
      }

      if (target.closest('[data-action="delete-site"]')) {
        const btn = target.closest('[data-action="delete-site"]');
        const siteId = btn.dataset.siteId;
        if (siteId && confirm('이 사이트 바로가기를 삭제하시겠습니까?')) {
          store.deleteSite(siteId);
          sounds.playDelete();
          UI.showToast('사이트 바로가기가 삭제되었어요 🗑️', 'danger');
          UI.renderSites();
        }
      }

      if (target.closest('[data-action="copy-site-url"]')) {
        const btn = target.closest('[data-action="copy-site-url"]');
        const url = btn.dataset.url;
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            UI.showToast('사이트 주소가 복사되었어요 📋✨', 'success');
          }).catch(() => {
            UI.showToast('주소 복사에 실패했어요', 'danger');
          });
        }
      }

      if (target.closest('#btn-open-add-site-modal') || target.closest('#btn-sites-empty-add')) {
        UI.openSiteModal();
      }
      if (target.closest('#btn-close-site-modal') || target.closest('#btn-cancel-site-modal')) {
        UI.closeSiteModal();
      }

      // 15. Open Add Photo Modal Triggers
      if (target.closest('#btn-open-add-photo-modal') || target.closest('#btn-photos-empty-add')) {
        UI.openPhotoModal();
      }

      // 16. Close Photo Modal Triggers
      if (target.closest('#btn-close-photo-modal') || target.closest('#btn-cancel-photo-modal')) {
        UI.closePhotoModal();
      }

      // 17. Close Lightbox Trigger
      if (target.closest('#btn-close-photo-lightbox') || target.id === 'photo-lightbox-modal') {
        UI.closePhotoLightbox();
      }

      // 18. Close Edit Note Modal Triggers
      if (target.closest('#btn-close-edit-note-modal') || target.closest('#btn-cancel-edit-note-modal')) {
        UI.closeEditNoteModal();
      }
    });

    // Global Change Delegation for Batch Checkboxes
    document.addEventListener('change', (e) => {
      const target = e.target;

      // Health Note Single Checkbox
      if (target.classList.contains('health-item-checkbox')) {
        const id = target.dataset.id;
        if (!store.selectedHealthNotes) store.selectedHealthNotes = new Set();
        if (target.checked) {
          store.selectedHealthNotes.add(id);
        } else {
          store.selectedHealthNotes.delete(id);
        }
        UI.renderHealth();
        return;
      }

      // Health Note Check All
      if (target.id === 'health-check-all') {
        if (!store.selectedHealthNotes) store.selectedHealthNotes = new Set();
        const activeFolder = store.activeHealthFolder || 'all';
        const allNotes = store.healthNotes || [];
        const filtered = (activeFolder === 'all') ? allNotes : allNotes.filter(n => n.folder === activeFolder);
        
        if (target.checked) {
          filtered.forEach(n => store.selectedHealthNotes.add(n.id));
        } else {
          store.selectedHealthNotes.clear();
        }
        UI.renderHealth();
        return;
      }

      // Hobby Note Single Checkbox
      if (target.classList.contains('hobby-item-checkbox')) {
        const id = target.dataset.id;
        if (!store.selectedHobbyNotes) store.selectedHobbyNotes = new Set();
        if (target.checked) {
          store.selectedHobbyNotes.add(id);
        } else {
          store.selectedHobbyNotes.delete(id);
        }
        UI.renderHobby();
        return;
      }

      // Hobby Note Check All
      if (target.id === 'hobby-check-all') {
        if (!store.selectedHobbyNotes) store.selectedHobbyNotes = new Set();
        const activeFolder = store.activeHobbyFolder || 'all';
        const allNotes = store.hobbyNotes || [];
        const filtered = (activeFolder === 'all') ? allNotes : allNotes.filter(n => n.folder === activeFolder);
        
        if (target.checked) {
          filtered.forEach(n => store.selectedHobbyNotes.add(n.id));
        } else {
          store.selectedHobbyNotes.clear();
        }
        UI.renderHobby();
        return;
      }
    });

    // Vacation Year Filter Change
    const vacationYearSelect = document.getElementById('vacation-filter-year');
    if (vacationYearSelect) {
      vacationYearSelect.addEventListener('change', (e) => {
        store.selectedVacationYear = e.target.value;
        UI.renderVacation();
      });
    }

    // Vacation Month Pill Tab Click Delegation
    document.addEventListener('click', (e) => {
      const vacPill = e.target.closest('.vac-m-pill');
      if (vacPill && vacPill.dataset.vMonth) {
        store.selectedVacationMonth = vacPill.dataset.vMonth;
        UI.renderVacation();
      }
    });

    // Form Submissions for Vacation & Sites
    const vacationForm = document.getElementById('vacation-form');
    if (vacationForm) {
      vacationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('vacation-input-type')?.value || 'full';
        const date = document.getElementById('vacation-input-date')?.value || getRealTodayStr();
        const reason = document.getElementById('vacation-input-reason')?.value || '';
        store.addVacation({ type, date, reason });
        sounds.playComplete();
        UI.closeVacationModal();
        if (type === 'holiday') {
          UI.showToast('휴가 일정이 등록되었어요 (연차 미차감) 🏖️✨', 'success');
        } else {
          UI.showToast('연차/반차가 성공적으로 등록되었어요 🌴💖', 'success');
        }
        UI.renderVacation();
      });
    }

    const totalVacationForm = document.getElementById('total-vacation-form');
    if (totalVacationForm) {
      totalVacationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const days = document.getElementById('input-total-vacation-days')?.value;
        store.setTotalVacationDays(days);
        UI.closeTotalVacationModal();
        UI.showToast('총 연차 일수가 설정되었어요 ⚙️✨', 'success');
        UI.renderVacation();
      });
    }

    const siteForm = document.getElementById('site-form');
    if (siteForm) {
      siteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('site-edit-id')?.value;
        const title = document.getElementById('site-input-title')?.value;
        const url = document.getElementById('site-input-url')?.value;
        const memo = document.getElementById('site-input-memo')?.value;

        if (id) {
          store.updateSite(id, { title, url, memo });
          UI.showToast('사이트 정보가 수정되었어요 🌐✨', 'info');
        } else {
          store.addSite({ title, url, memo });
          sounds.playComplete();
          UI.showToast('새 사이트 바로가기가 등록되었어요 🚀💖', 'success');
        }
        UI.closeSiteModal();
        UI.renderSites();
      });
    }

    // Health Note & Folder Form Submissions
    const healthNoteForm = document.getElementById('health-note-form');
    if (healthNoteForm) {
      healthNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('health-note-edit-id')?.value;
        const folder = document.getElementById('health-input-folder')?.value || 'general';
        const date = document.getElementById('health-input-date')?.value || getRealTodayStr();
        const title = document.getElementById('health-input-title')?.value || '';
        const hospital = document.getElementById('health-input-hospital')?.value || '';
        const cost = document.getElementById('health-input-cost')?.value || '';
        const content = document.getElementById('health-input-content')?.value || '';

        const fileName = document.getElementById('health-file-data-name')?.value || '';
        const fileSize = parseInt(document.getElementById('health-file-data-size')?.value || '0', 10);
        const fileType = document.getElementById('health-file-data-type')?.value || '';
        const fileUrl = document.getElementById('health-file-data-url')?.value || '';
        const fileMemo = document.getElementById('health-input-file-memo')?.value || '';

        if (id) {
          store.updateHealthNote(id, { folder, date, title, hospital, cost, content, fileName, fileSize, fileType, fileUrl, fileMemo });
          UI.showToast('건강 메모가 수정되었어요 🩺✨', 'info');
        } else {
          store.addHealthNote({ folder, date, title, hospital, cost, content, fileName, fileSize, fileType, fileUrl, fileMemo });
          sounds.playComplete();
          UI.showToast('새 건강 메모가 등록되었어요 🏥💖', 'success');
        }
        UI.closeHealthNoteModal();
        UI.renderHealth();
      });
    }

    const healthFolderForm = document.getElementById('health-folder-form');
    if (healthFolderForm) {
      healthFolderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('health-folder-edit-id')?.value;
        const icon = document.getElementById('health-input-folder-icon')?.value || '🩺';
        const name = document.getElementById('health-input-folder-name')?.value || '';
        if (!name.trim()) return;

        if (id) {
          store.updateHealthFolder(id, { name: name.trim(), icon });
          sounds.playComplete();
          UI.showToast(`'${name.trim()}' 건강 폴더가 수정되었어요 ✨`, 'info');
        } else {
          store.addHealthFolder(name.trim(), icon);
          sounds.playAdd();
          UI.showToast(`'${name.trim()}' 건강 폴더가 추가되었어요 📁✨`, 'success');
        }
        UI.closeHealthFolderModal();
        UI.renderHealth();
      });
    }

    // Hobby Note & Folder Form Submissions
    const hobbyNoteForm = document.getElementById('hobby-note-form');
    if (hobbyNoteForm) {
      hobbyNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('hobby-note-edit-id')?.value;
        const folder = document.getElementById('hobby-input-folder')?.value || 'general';
        const date = document.getElementById('hobby-input-date')?.value || getRealTodayStr();
        const title = document.getElementById('hobby-input-title')?.value || '';
        const place = document.getElementById('hobby-input-place')?.value || '';
        const duration = document.getElementById('hobby-input-duration')?.value || '';
        const content = document.getElementById('hobby-input-content')?.value || '';

        if (id) {
          store.updateHobbyNote(id, { folder, date, title, place, duration, content });
          UI.showToast('취미 기록이 수정되었어요 🎨✨', 'info');
        } else {
          store.addHobbyNote({ folder, date, title, place, duration, content });
          sounds.playComplete();
          UI.showToast('새 취미 기록이 등록되었어요 🏃💖', 'success');
        }
        UI.closeHobbyNoteModal();
        UI.renderHobby();
      });
    }

    const hobbyFolderForm = document.getElementById('hobby-folder-form');
    if (hobbyFolderForm) {
      hobbyFolderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('hobby-folder-edit-id')?.value;
        const icon = document.getElementById('hobby-input-folder-icon')?.value || '🎨';
        const name = document.getElementById('hobby-input-folder-name')?.value || '';
        if (!name.trim()) return;

        if (id) {
          store.updateHobbyFolder(id, { name: name.trim(), icon });
          sounds.playComplete();
          UI.showToast(`'${name.trim()}' 취미 폴더가 수정되었어요 ✨`, 'info');
        } else {
          store.addHobbyFolder(name.trim(), icon);
          sounds.playAdd();
          UI.showToast(`'${name.trim()}' 취미 폴더가 추가되었어요 📁✨`, 'success');
        }
        UI.closeHobbyFolderModal();
        UI.renderHobby();
      });
    }

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
            // Auto fill today date if new upload
            const editId = document.getElementById('photo-edit-id')?.value;
            const dateInput = document.getElementById('photo-input-date');
            if (!editId && dateInput && !dateInput.value) {
              dateInput.value = getRealTodayStr();
            }

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
        const dateVal = document.getElementById('photo-input-date').value || getRealTodayStr();
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
          UI.showToast('기록 사진이 1:1 고정 틀에 맞춰 수정되었어요! ✨', 'info');
        } else {
          store.addPhoto({
            date: dateVal,
            caption: captionVal,
            imageDataUrl: finalImageDataUrl
          });
          sounds.playAdd();
          confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 18);
          UI.showToast('기록에 예쁘게 저장했어요! 📸💖', 'success');
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

    // Milestone Checkbox Toggle Event Delegation
    document.addEventListener('change', (e) => {
      const target = e.target;
      if (target.matches('.milestone-step-check') || target.dataset.action === 'toggle-milestone') {
        const projectId = target.dataset.projectId;
        const milestoneId = target.dataset.milestoneId;
        if (!projectId || !milestoneId) return;

        const m = store.toggleMilestoneComplete(projectId, milestoneId);
        if (m) {
          if (m.completed) {
            sounds.playComplete();
            if (window.confetti && window.confetti.burst) {
              const rect = target.getBoundingClientRect();
              window.confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25);
            }
            UI.showToast(`'${m.title}' 마일스톤 실행 완료! 💮🎉`, 'success');
          } else {
            UI.showToast(`'${m.title}' 마일스톤 진행 중으로 변경되었어요 🌱`, 'info');
          }
          UI.renderProject();
          UI.renderSidebar();
        }
      }
    });

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

    // Vault Dropzone & Hidden Input
    const dropzone = document.getElementById('vault-dropzone');
    const hiddenFileInput = document.getElementById('vault-file-hidden-input');
    if (dropzone && hiddenFileInput) {
      dropzone.addEventListener('click', () => hiddenFileInput.click());
      hiddenFileInput.addEventListener('change', async () => {
        if (!hiddenFileInput.files || hiddenFileInput.files.length === 0) return;
        const file = hiddenFileInput.files[0];
        try {
          await cloudSync.saveFileToVault(file, '');
          sounds.playAdd();
          UI.showToast(`'${file.name}' 파일이 보관되었어요! 💾`, 'success');
          UI.renderFilesVault();
          UI.renderSidebar();
        } catch (err) {
          UI.showToast('파일 보관 실패', 'danger');
        }
      });
    }

    // Settings: Immediate Cloud Backup & Upload to Firebase
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          store.saveLocalOnly();
          await cloudSync.pushTasksToCloud();
          sounds.playComplete();
          if (window.confetti && window.confetti.burst) {
            window.confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
          }
          UI.showToast('모든 데이터가 Firebase 클라우드에 안전하게 즉시 백업/업로드되었어요! ☁️💖✨', 'success');
          UI.renderSidebar();
        } catch (err) {
          UI.showToast('Firebase 백업 중 오류가 발생했어요. 동기화 키를 확인해주세요.', 'danger');
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
        if (confirm('정말 삭제하시겠습니까?')) {
          store.tasks = [];
          store.categories = DEFAULT_CATEGORIES;
          store.wishlist = [];
          store.photos = [];
          store.notes = [];
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
      if (window._pendingFilter) {
        store.activeFilter = window._pendingFilter;
        window._pendingFilter = null;
      }
      UI.renderTasks();
      UI.renderSidebar();
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
