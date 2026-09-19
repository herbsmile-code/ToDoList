/** Development-log views. The existing UI owns events and shared state. */
(function(window) {
  'use strict';

  // Called once while app.js builds UI; methods retain UI as their receiver.
  window.createDevLogView = ({ DEVLOG_DATA }) => ({
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
    },
  });
})(window);
