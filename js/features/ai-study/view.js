/** AI study views. The existing UI owns events and the single Store. */
(function(window) {
  'use strict';

  // Define methods only; UI is their receiver after app.js composes the view.
  window.createAiStudyView = ({ store, DEFAULT_AI_STUDY_CATEGORIES, escapeHTML, showToast }) => ({
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
