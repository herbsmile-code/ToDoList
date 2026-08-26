/**
 * My Treasure Vault (나의 보물 지식♡ / Study & Knowledge Hub)
 * 독립형 학습 노트 및 지식 보관소 모듈 (상세 보기 팝업 지원)
 */

const TREASURE_STORAGE_KEY = 'zentask_treasures';

const DEFAULT_TREASURES = [
  {
    id: 'treasure-scenario',
    title: '[실전 가이드] 1~5번 셋업 황금 사이클 & 단계별 실전 시나리오 🚀',
    category: 'setup',
    desc: `프로젝트 시작부터 마무리까지 가장 버그 없는 완벽한 5단계 황금 사이클!

1단계. 시작할 때 (환경 세팅) 👉 1번 셋업 (/setup-project)
• 🗣️ "새 프로젝트 만들 거야. 1번 셋업 시작해줘!"
• 초고속 UV 가상환경(.venv), .gitignore, Git 초기 상태를 1초 만에 자동 초기화.

2단계. 코딩하기 전 (설계 먼저!) 👉 5번 셋업 (/design-api)
• 🗣️ "회원가입이랑 주문 기능 만들 건데 5번 셋업으로 먼저 설계해줘."
• 데이터 테이블 표 구조와 API 명세서를 먼저 기획하여 엉뚱한 코딩 방지.

3단계. 나만의 전용 도구가 필요할 때 👉 2번 셋업 (/setup-skill)
• 🗣️ "첨부한 엑셀 파일 분석하는 기능 2번 스킬로 만들어줘."
• YAML 프론트매터와 자체 검수표를 갖춘 고품질 스킬 뚝딱 제작.

4단계. 기능 코딩이 끝났을 때 👉 3번 셋업 (/verify)
• 🗣️ "코드 다 짰어? 3번 셋업으로 자체 검증 돌려봐!"
• AI가 직접 프로그램을 돌려보고 에러를 스스로 고친 뒤 최종 보고.

5단계. 작업 마무리 & 퇴근할 때 👉 4번 셋업 (/commit)
• 🗣️ "오늘 작업한 거 4번 셋업으로 커밋해줘."
• 바뀐 내용을 분석해 Conventional Git 표준 메시지로 안전하게 영구 백업.`,
    code: `# 1~5번 셋업 호출 단축 명령어 모음
1번 셋업: /setup-project
5번 셋업: /design-api
2번 셋업: /setup-skill  (또는 '2번 스킬로 만들어줘')
3번 셋업: /verify
4번 셋업: /commit`,
    createdAt: Date.now()
  },
  {
    id: 'treasure-1',
    title: '[개발 용어] 패키지(Package)와 uv add란? 📦',
    category: 'terms',
    desc: '스마트폰에 앱을 깔거나 요리할 때 밀키트를 쓰듯, 전 세계 개발자들이 미리 만들어둔 완성형 도구 상자(python-docx, openpyxl 등)를 내 프로젝트 가상환경에 추가하는 명령어입니다.\npyproject.toml 장부에 자동 기록되어 관리가 매우 편리합니다.',
    code: 'uv add python-docx\nuv add openpyxl',
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: 'treasure-2',
    title: '[개발 용어] 웹 크롤링(Web Crawling)이란? 🕷️',
    category: 'terms',
    desc: '사람이 마우스로 복사(Ctrl+C)하고 엑셀에 붙여넣기(Ctrl+V)하던 웹사이트 정보 수집을 로봇이 1초 만에 싹 긁어모아 엑셀로 자동 정리해 주는 기술입니다.\n(쇼핑몰 최저가 비교, 부동산 실거래가 매물 모니터링 등)',
    code: '# 웹 크롤링 필수 패키지 설치\nuv add requests beautifulsoup4 playwright',
    createdAt: Date.now() - 3600000 * 4
  },
  {
    id: 'treasure-3',
    title: '[1~5번 셋업] 안티그래비티 전문 개발자 5대 셋업 체계 🚀',
    category: 'setup',
    desc: '실무 시니어 개발자들이 가장 필수적으로 사용하는 5단계 자동화 워크플로우:\n• 1번 /setup-project: UV 파이썬 가상환경 & Git 초기화\n• 2번 /setup-skill: YAML 프론트매터 + 표준 폴더 규격 스킬 제작\n• 3번 /verify: 코드 무결성 & 테스트 자체 검증\n• 4번 /commit: Conventional Git 표준 커밋 & 안전 백업\n• 5번 /design-api: API 명세 & 데이터 모델링 퍼스트 설계',
    code: '# 번호 또는 슬래시 명령어로 언제든 실행 가능\n/setup-project\n/setup-skill\n/verify\n/commit\n/design-api',
    createdAt: Date.now() - 3600000 * 3
  },
  {
    id: 'treasure-4',
    title: '[품질 규칙] 클린 코드 & 방어적 프로그래밍 상시 룰 (Clean Code) 📐',
    category: 'security',
    desc: 'AI가 코드를 작성할 때 항상 적용되는 품질 가이드라인:\n1. 함수 하나는 한 가지 일만 수행 (단일 책임 원칙)\n2. 매개변수와 반환값의 타입 힌트 명시 (def fn(x: int) -> str:)\n3. 프로그램 중단을 막는 try-except 방어적 예외 처리와 로깅\n4. 기존 설명 주석 및 메타데이터 무결성 보존',
    code: 'def calculate_total(price: int, count: int) -> int:\n    try:\n        return price * count\n    except Exception as e:\n        print(f"계산 에러: {e}")\n        return 0',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: 'treasure-5',
    title: '[보안 규칙] 민감 정보 & 보안 가드레일 상시 룰 (Security Guardrails) 🔒',
    category: 'security',
    desc: '비밀번호나 API 키 유출을 원천 차단하는 보안 가이드라인:\n1. API 키, DB 비밀번호, 인증 토큰은 소스코드에 하드코딩 절대 금지 ➡️ .env에 분리\n2. .gitignore에 .env, *.key 등이 등록되어 있는지 자동 점검\n3. 사용자 입력값 검증으로 SQL 인젝션 공격 사전 방지',
    code: '# .env 파일 설정 예시\nAPI_KEY=sk_live_secret_key_12345\nDATABASE_PASSWORD=my_secure_password\n\n# 파이썬에서 환경변수 로드\nimport os\napi_key = os.environ.get("API_KEY")',
    createdAt: Date.now() - 3600000 * 1
  }
];

class TreasureVaultManager {
  constructor() {
    this.treasures = [];
    this.activeCat = 'all';
    this.searchQuery = '';
    this.load();
    this.initDOM();
  }

  load() {
    try {
      const raw = localStorage.getItem(TREASURE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const existingIds = new Set(parsed.map(t => t.id));
        DEFAULT_TREASURES.forEach(defT => {
          if (!existingIds.has(defT.id)) {
            parsed.unshift(defT);
          } else {
            // Update default content if matches default IDs
            const idx = parsed.findIndex(p => p.id === defT.id);
            if (idx !== -1 && !parsed[idx].userModified) {
              parsed[idx] = defT;
            }
          }
        });
        this.treasures = parsed;
        this.save();
      } else {
        this.treasures = [...DEFAULT_TREASURES];
        this.save();
      }
    } catch (e) {
      this.treasures = [...DEFAULT_TREASURES];
    }
  }

  save() {
    try {
      localStorage.setItem(TREASURE_STORAGE_KEY, JSON.stringify(this.treasures));
    } catch (e) {}
    this.updateBadge();
  }

  add(title, desc, code = '', category = 'study') {
    const newTreasure = {
      id: 'treasure-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      desc: desc.trim(),
      code: (code || '').trim(),
      category: category || 'study',
      userModified: true,
      createdAt: Date.now()
    };
    this.treasures.unshift(newTreasure);
    this.save();
    this.render();
    return newTreasure;
  }

  delete(id) {
    const idx = this.treasures.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.treasures.splice(idx, 1);
      this.save();
      this.render();
      return true;
    }
    return false;
  }

  getFiltered() {
    return this.treasures.filter(t => {
      if (this.activeCat !== 'all' && t.category !== this.activeCat) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const mTitle = t.title.toLowerCase().includes(q);
        const mDesc = t.desc.toLowerCase().includes(q);
        const mCode = (t.code || '').toLowerCase().includes(q);
        if (!mTitle && !mDesc && !mCode) return false;
      }
      return true;
    });
  }

  updateBadge() {
    const badge = document.getElementById('nav-count-treasure');
    if (badge) {
      badge.textContent = this.treasures.length;
    }
  }

  openModal() {
    const modal = document.getElementById('treasure-vault-modal');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      this.render();
      if (window.sounds && window.sounds.playCelebration) {
        window.sounds.playCelebration();
      }
    }
  }

  closeModal() {
    const modal = document.getElementById('treasure-vault-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  openDetailModal(item) {
    const modal = document.getElementById('treasure-detail-modal');
    if (!modal || !item) return;

    const catLabels = {
      terms: '📚 개발 용어',
      setup: '🚀 1~5번 셋업',
      security: '🔒 보안 & 품질',
      study: '📝 내 공부 노트'
    };

    const dateStr = new Date(item.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('tr-detail-badge').textContent = catLabels[item.category] || '💎 지식';
    document.getElementById('tr-detail-date').textContent = dateStr;
    document.getElementById('tr-detail-title').textContent = item.title;
    document.getElementById('tr-detail-desc').textContent = item.desc;

    const codeBox = document.getElementById('tr-detail-code-box');
    const codeEl = document.getElementById('tr-detail-code');
    const copyBtn = document.getElementById('btn-detail-copy-code');

    if (item.code) {
      codeBox.style.display = 'block';
      codeEl.textContent = item.code;
      copyBtn.dataset.code = item.code;
    } else {
      codeBox.style.display = 'none';
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
    if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
  }

  closeDetailModal() {
    const modal = document.getElementById('treasure-detail-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  openAddModal() {
    const addModal = document.getElementById('treasure-add-modal');
    const form = document.getElementById('treasure-add-form');
    if (addModal) {
      if (form) form.reset();
      addModal.classList.add('active');
      addModal.style.display = 'flex';
      const titleInput = document.getElementById('tr-input-title');
      if (titleInput) titleInput.focus();
    }
  }

  closeAddModal() {
    const addModal = document.getElementById('treasure-add-modal');
    if (addModal) {
      addModal.classList.remove('active');
      addModal.style.display = 'none';
    }
  }

  render() {
    this.updateBadge();
    const grid = document.getElementById('tr-grid-container');
    const emptyState = document.getElementById('tr-empty-state');
    if (!grid) return;

    const items = this.getFiltered();
    if (items.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      const catLabels = {
        terms: '📚 개발 용어',
        setup: '🚀 1~5번 셋업',
        security: '🔒 보안 & 품질',
        study: '📝 내 공부 노트'
      };

      grid.innerHTML = items.map(item => {
        const dateStr = new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'short', day: 'numeric'
        });

        const escTitle = this.escape(item.title);
        const escDesc = this.escape(item.desc);
        const escCode = this.escape(item.code || '');

        return `
          <div class="tr-item-card" data-id="${item.id}">
            <div class="tr-item-header">
              <span class="tr-badge-tag">${catLabels[item.category] || '💎 지식'}</span>
              <button type="button" class="tr-btn-delete" data-action="delete-tr" data-id="${item.id}" title="보물 삭제">🗑️</button>
            </div>
            <h3 class="tr-item-title" data-action="open-detail" data-id="${item.id}">${escTitle}</h3>
            <p class="tr-item-desc tr-card-desc-clamp" data-action="open-detail" data-id="${item.id}">${escDesc}</p>
            
            <button type="button" class="btn-tr-expand" data-action="open-detail" data-id="${item.id}">
              <span>🔍 큰 화면으로 자세히 보기</span>
            </button>

            ${item.code ? `
              <div class="tr-code-box">
                <button type="button" class="tr-btn-copy" data-action="copy-tr-code" data-code="${escCode}">📋 복사</button>
                <pre><code>${escCode}</code></pre>
              </div>
            ` : ''}
            <div class="tr-item-footer">
              <span style="cursor: pointer;" data-action="open-detail" data-id="${item.id}">💎 소중한 개발 보물</span>
              <span>${dateStr}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  escape(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, t => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[t] || t));
  }

  initDOM() {
    this.updateBadge();

    // Event Delegation for clicks
    document.addEventListener('click', (e) => {
      // 1. Open Treasure Vault
      if (e.target.closest('#sidebar-treasure-card') || e.target.closest('#btn-open-treasure') || e.target.closest('[data-open-treasure]')) {
        e.preventDefault();
        this.openModal();
        return;
      }

      // 2. Close Modals
      if (e.target.closest('[data-close-treasure-modal]')) {
        e.preventDefault();
        this.closeModal();
        return;
      }
      if (e.target.closest('[data-close-treasure-detail-modal]')) {
        e.preventDefault();
        this.closeDetailModal();
        return;
      }
      if (e.target.closest('[data-close-treasure-add-modal]')) {
        e.preventDefault();
        this.closeAddModal();
        return;
      }

      // 3. Open Detail Modal
      const detailTarget = e.target.closest('[data-action="open-detail"]');
      if (detailTarget) {
        e.preventDefault();
        const tId = detailTarget.dataset.id;
        const found = this.treasures.find(t => t.id === tId);
        if (found) this.openDetailModal(found);
        return;
      }

      // 4. Open Add Modal
      if (e.target.closest('#btn-tr-open-add') || e.target.closest('#btn-tr-empty-add')) {
        e.preventDefault();
        this.openAddModal();
        return;
      }

      // 5. Copy Code
      const copyBtn = e.target.closest('[data-action="copy-tr-code"]') || e.target.closest('#btn-detail-copy-code');
      if (copyBtn) {
        const codeText = copyBtn.dataset.code || '';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(codeText).then(() => {
            if (window.sounds && window.sounds.playComplete) window.sounds.playComplete();
            const prevText = copyBtn.textContent;
            copyBtn.textContent = '✅ 복사됨!';
            setTimeout(() => { copyBtn.textContent = prevText; }, 2000);
            if (window.UI && window.UI.showToast) window.UI.showToast('📋 코드가 클립보드에 복사되었어요!', 'success');
          });
        }
        return;
      }

      // 6. Delete Item
      const delBtn = e.target.closest('[data-action="delete-tr"]');
      if (delBtn) {
        const tId = delBtn.dataset.id;
        if (tId && confirm('정말 삭제하시겠습니까?')) {
          this.delete(tId);
          if (window.sounds && window.sounds.playDelete) window.sounds.playDelete();
          if (window.UI && window.UI.showToast) window.UI.showToast('보물 노트가 삭제되었어요.', 'danger');
        }
        return;
      }

      // 7. Category Pill Filter
      const pill = e.target.closest('.tr-pill');
      if (pill) {
        document.querySelectorAll('.tr-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCat = pill.dataset.cat || 'all';
        this.render();
        if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
        return;
      }
    });

    // Search Input
    const searchInp = document.getElementById('tr-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Add Form Submit
    const addForm = document.getElementById('treasure-add-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = (document.getElementById('tr-input-title').value || '').trim();
        const cat = document.getElementById('tr-input-cat').value || 'study';
        const desc = (document.getElementById('tr-input-desc').value || '').trim();
        const code = (document.getElementById('tr-input-code').value || '').trim();

        if (!title || !desc) {
          if (window.UI && window.UI.showToast) window.UI.showToast('제목과 내용을 모두 입력해주세요!', 'danger');
          return;
        }

        this.add(title, desc, code, cat);
        if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
        if (window.confetti && window.confetti.burst) window.confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 40);
        if (window.UI && window.UI.showToast) window.UI.showToast(`💎 보물('${title}')이 안전하게 저장되었어요!`, 'success');
        this.closeAddModal();
      });
    }
  }
}

// Global initialization
let treasureVaultInstance = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    treasureVaultInstance = new TreasureVaultManager();
    window.treasureVault = treasureVaultInstance;
  });
} else {
  treasureVaultInstance = new TreasureVaultManager();
  window.treasureVault = treasureVaultInstance;
}

// Global helper for AI study notes injection
window.addTreasureStudy = function(title, desc, code = '', category = 'study') {
  if (!treasureVaultInstance) {
    treasureVaultInstance = new TreasureVaultManager();
    window.treasureVault = treasureVaultInstance;
  }
  const item = treasureVaultInstance.add(title, desc, code, category);
  if (window.UI && window.UI.showToast) {
    window.UI.showToast(`💎 보물함에 새로운 학습 노트('${title}')가 추가되었어요!`, 'success');
  }
  return item;
};
