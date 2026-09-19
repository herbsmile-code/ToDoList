/** AI study views. The existing UI owns events and the single Store. */
(function(window) {
  'use strict';

  // Define methods only; UI is their receiver after app.js composes the view.
  window.createAiStudyView = ({ store, DEFAULT_AI_STUDY_CATEGORIES, escapeHTML, showToast }) => ({
    renderAiStudyEmptyState() {
      const empty = document.getElementById('aistudy-empty-state');
      if (!empty || empty.style.display !== 'flex') return;
      const title = document.getElementById('aistudy-empty-title');
      const description = document.getElementById('aistudy-empty-description');
      const filtered = (store.activeAiStudyCategory || 'all') !== 'all' || !!store.aiStudySearchQuery?.trim();
      const unconfirmed = store.saveStatus !== 'confirmed';
      if (title) title.textContent = filtered ? '검색 조건에 맞는 AI 노트가 없어요'
        : unconfirmed ? 'AI 노트의 동기화 확인이 필요해요' : '등록된 AI 스터디 노트가 없어요';
      if (description) description.textContent = filtered
        ? '전체 탭을 선택하거나 검색어를 지우면 다른 노트를 확인할 수 있습니다.'
        : unconfirmed ? '서버 확인이 완료되지 않아 노트가 없는 것으로 단정할 수 없습니다. 상단 동기화 상태를 확인하고 다시 시도해 주세요.'
        : '자주 쓰는 프롬프트, AI 팁, 코드 스니펫을 첫 번째 노트로 기록해보세요 ✨';
    },

    renderAiStudy() {
      const tabsBar = document.getElementById('aistudy-category-tabs');
      const gridContainer = document.getElementById('aistudy-grid-container');
      const emptyState = document.getElementById('aistudy-empty-state');
      const countBadge = document.getElementById('aistudy-count-badge');
      const searchInput = document.getElementById('aistudy-search-input');

      if (!gridContainer) return;

      const activeCat = store.activeAiStudyCategory || 'all';
      const categories = DEFAULT_AI_STUDY_CATEGORIES;
      const allNotes = store.aiStudyNotes || [];
      const filteredNotes = store.getFilteredAiStudyNotes();

      // 1. Render Category Tabs
      if (tabsBar) {
        tabsBar.innerHTML = categories.map(cat => {
          const isActive = (cat.id === activeCat);
          const count = (cat.id === 'all')
            ? allNotes.length
            : allNotes.filter(n => n.category === cat.id).length;

          return `
            <button type="button" class="aistudy-cat-tab ${isActive ? 'active' : ''}" data-aistudy-cat="${cat.id}">
              <span>${cat.icon}</span>
              <span>${escapeHTML(cat.name)}</span>
              <span class="badge" style="font-size: 0.72rem; padding: 1px 6px; background: ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'}; color: ${isActive ? '#fff' : 'var(--text-muted)'}; border-radius: 10px;">${count}</span>
            </button>
          `;
        }).join('');
      }

      if (countBadge) {
        countBadge.textContent = `총 ${filteredNotes.length}개`;
      }

      if (searchInput && searchInput.value !== (store.aiStudySearchQuery || '')) {
        searchInput.value = store.aiStudySearchQuery || '';
      }

      // 2. Empty State
      if (filteredNotes.length === 0) {
        if (gridContainer) gridContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        this.renderAiStudyEmptyState();
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      // 3. Render Cards
      const dateFormatter = new Intl.DateTimeFormat('ko-KR', {year:'numeric', month:'short', day:'numeric'});
      gridContainer.innerHTML = filteredNotes.map(note => {
        const catObj = categories.find(c => c.id === note.category) || categories[1];
        const date = new Date(note.updatedAt || note.createdAt || Date.now());
        const dateStr = Number.isNaN(date.getTime()) ? 'Invalid Date' : dateFormatter.format(date);
        // Full code, tags and source links are rendered only in the detail modal.

        return `
          <div class="aistudy-card ${note.pinned ? 'is-pinned' : ''}" data-aistudy-id="${note.id}" role="button" tabindex="0" aria-label="${escapeHTML(note.title)} 상세 보기">
            <div class="aistudy-card-header">
              <div class="aistudy-card-meta">
                <span class="aistudy-cat-badge" style="background: ${catObj.color}15; color: ${catObj.color}; border: 1px solid ${catObj.color}35;">
                  ${catObj.icon} ${escapeHTML(catObj.name)}
                </span>
                <span class="aistudy-date">📅 ${dateStr}</span>
                ${note.pinned ? `<span class="aistudy-pin-badge" title="상단 고정됨">📌 고정</span>` : ''}
              </div>
              <div class="aistudy-card-actions">
                <button type="button" class="aistudy-action-btn ${note.pinned ? 'active' : ''}" data-action="toggle-pin-aistudy" data-id="${note.id}" title="${note.pinned ? '고정 해제' : '상단 고정'}">
                  📌
                </button>
                <button type="button" class="aistudy-action-btn" data-action="edit-aistudy" data-id="${note.id}" title="수정">
                  ✏️
                </button>
                <button type="button" class="aistudy-action-btn delete-btn" data-action="delete-aistudy" data-id="${note.id}" title="삭제">
                  🗑️
                </button>
              </div>
            </div>

            <h3 class="aistudy-card-title">${escapeHTML(note.title)}</h3>

            ${note.summary ? `
              <div class="aistudy-summary-box">
                <span class="aistudy-summary-icon">💡</span>
                <div class="aistudy-summary-text">${escapeHTML(note.summary)}</div>
              </div>
            ` : ''}

            <span class="aistudy-detail-hint">자세히 보기 →</span>
          </div>
        `;
      }).join('');

      this.renderSidebar();
    },

    openAiStudyModal(noteId = null) {
      const modal = document.getElementById('aistudy-modal');
      const titleInput = document.getElementById('aistudy-modal-title');
      const catSelect = document.getElementById('aistudy-modal-category');
      const summaryInput = document.getElementById('aistudy-modal-summary');
      const contentInput = document.getElementById('aistudy-modal-content');
      const codeInput = document.getElementById('aistudy-modal-code');
      const langSelect = document.getElementById('aistudy-modal-lang');
      const tagsInput = document.getElementById('aistudy-modal-tags');
      const urlInput = document.getElementById('aistudy-modal-url');
      const pinCheckbox = document.getElementById('aistudy-modal-pinned');
      const modalHeaderTitle = document.getElementById('aistudy-modal-header-title');
      const editIdHidden = document.getElementById('aistudy-modal-edit-id');

      if (!modal) return;

      if (noteId) {
        const note = (store.aiStudyNotes || []).find(n => n.id === noteId);
        if (!note) return;
        if (modalHeaderTitle) modalHeaderTitle.textContent = '✏️ AI 스터디 노트 수정';
        if (editIdHidden) editIdHidden.value = note.id;
        if (titleInput) titleInput.value = note.title || '';
        if (catSelect) catSelect.value = note.category || 'llm';
        if (summaryInput) summaryInput.value = note.summary || '';
        if (contentInput) contentInput.value = note.content || '';
        if (codeInput) codeInput.value = note.codeSnippet || '';
        if (langSelect) langSelect.value = note.snippetLang || 'Prompt';
        if (tagsInput) tagsInput.value = Array.isArray(note.tags) ? note.tags.join(', ') : (note.tags || '');
        if (urlInput) urlInput.value = note.refUrl || '';
        if (pinCheckbox) pinCheckbox.checked = !!note.pinned;
      } else {
        if (modalHeaderTitle) modalHeaderTitle.textContent = '💡 새 AI 스터디 노트 작성';
        if (editIdHidden) editIdHidden.value = '';
        if (titleInput) titleInput.value = '';
        if (catSelect) catSelect.value = store.activeAiStudyCategory !== 'all' ? store.activeAiStudyCategory : 'llm';
        if (summaryInput) summaryInput.value = '';
        if (contentInput) contentInput.value = '';
        if (codeInput) codeInput.value = '';
        if (langSelect) langSelect.value = 'Prompt';
        if (tagsInput) tagsInput.value = '';
        if (urlInput) urlInput.value = '';
        if (pinCheckbox) pinCheckbox.checked = false;
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeAiStudyModal() {
      const modal = document.getElementById('aistudy-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openAiStudyDetailModal(noteId) {
      const note = (store.aiStudyNotes || []).find(n => n.id === noteId);
      const modal = document.getElementById('aistudy-detail-modal');
      const titleEl = document.getElementById('aistudy-detail-modal-title');
      const contentEl = document.getElementById('aistudy-detail-modal-content');
      if (!note || !modal || !titleEl || !contentEl) return;

      const category = DEFAULT_AI_STUDY_CATEGORIES.find(item => item.id === note.category) || DEFAULT_AI_STUDY_CATEGORIES[0];
      const date = new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const tagsHtml = Array.isArray(note.tags) && note.tags.length
        ? `<div class="aistudy-detail-tags">${note.tags.map(tag => `<span class="aistudy-tag-chip">${escapeHTML(tag)}</span>`).join('')}</div>`
        : '';
      const codeHtml = note.codeSnippet && note.codeSnippet.trim()
        ? `<section class="aistudy-detail-section"><h4>💻 ${escapeHTML(note.snippetLang || 'Code')}</h4><pre class="aistudy-detail-code"><code>${escapeHTML(note.codeSnippet)}</code></pre></section>`
        : '';
      const linkHtml = note.refUrl && note.refUrl.trim()
        ? `<a href="${escapeHTML(note.refUrl.trim())}" target="_blank" rel="noopener noreferrer" class="aistudy-detail-link">🔗 참고 문서 열기</a>`
        : '';

      titleEl.textContent = note.title || 'AI 스터디 노트';
      contentEl.innerHTML = `
        <div class="aistudy-detail-meta">
          <span class="aistudy-cat-badge" style="background: ${category.color}15; color: ${category.color}; border: 1px solid ${category.color}35;">${category.icon} ${escapeHTML(category.name)}</span>
          <span>📅 ${date}</span>
          ${note.pinned ? '<span>📌 고정</span>' : ''}
        </div>
        ${note.summary ? `<section class="aistudy-detail-section"><h4>💡 핵심 요약</h4><p>${escapeHTML(note.summary)}</p></section>` : ''}
        ${note.content ? `<section class="aistudy-detail-section"><h4>📝 상세 메모</h4><p class="aistudy-detail-text">${escapeHTML(note.content).replace(/\n/g, '<br>')}</p></section>` : ''}
        ${codeHtml}
        ${tagsHtml}
        ${linkHtml}
      `;
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeAiStudyDetailModal() {
      const modal = document.getElementById('aistudy-detail-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    async copyAiStudySnippet(noteId, targetBtn) {
      const note = (store.aiStudyNotes || []).find(n => n.id === noteId);
      if (!note || !note.codeSnippet) return;

      try {
        await navigator.clipboard.writeText(note.codeSnippet);
        if (targetBtn) {
          const originalHTML = targetBtn.innerHTML;
          targetBtn.innerHTML = '<span>✓</span><span>복사됨!</span>';
          targetBtn.classList.add('copied');
          setTimeout(() => {
            targetBtn.innerHTML = originalHTML;
            targetBtn.classList.remove('copied');
          }, 1800);
        }
        showToast('프롬프트/코드가 클립보드에 복사되었어요! 📋✨', 'success');
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = note.codeSnippet;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('프롬프트/코드가 클립보드에 복사되었어요! 📋✨', 'success');
      }
    },

  });
})(window);
