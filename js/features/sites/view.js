/** Site views. The existing UI owns shared events and the single Store. */
(function(window) {
  'use strict';

  // Define methods only; app.js supplies live dependencies and the UI receiver.
  window.createSitesView = ({ store, DEFAULT_SITE_FOLDERS, SITE_EMOJI_LIST, escapeHTML }) => ({
    renderSites() {
      const tabsBar = document.getElementById('site-folder-tabs');
      const grid = document.getElementById('sites-grid-container');
      const emptyEl = document.getElementById('sites-empty-state');
      const curFolderBadge = document.getElementById('site-cur-folder-badge');
      const curFolderDesc = document.getElementById('site-cur-folder-desc');
      const countBadge = document.getElementById('site-count-badge');
      if (!grid) return;

      const folders = store.siteFolders || DEFAULT_SITE_FOLDERS;
      let activeFolder = store.activeSiteFolder || 'all';
      if (activeFolder !== 'all' && !folders.some(folder => folder.id === activeFolder)) {
        // A remote deletion can remove the selected folder. Only reset the
        // transient selection; rendering must never save or move business data.
        activeFolder = 'all';
        store.activeSiteFolder = 'all';
      }
      const allSites = store.sites || [];

      // 1. Render Folder Tabs
      if (tabsBar) {
        tabsBar.innerHTML = folders.map(f => {
          const isActive = (f.id === activeFolder);
          const count = f.id === 'all'
            ? allSites.length
            : allSites.filter(s => (s.folder || 'portal') === f.id).length;

          const editBtn = (f.id !== 'all')
            ? `<span class="site-folder-edit-btn" data-action="open-edit-site-folder" data-id="${f.id}" onclick="event.stopPropagation(); UI.openSiteFolderModal('${f.id}');" title="폴더 수정/삭제">✏️</span>`
            : '';

          return `
            <button type="button" class="site-folder-tab ${isActive ? 'active' : ''}" data-action="select-site-folder" data-id="${f.id}">
              <span class="folder-tab-icon">${f.icon || '📁'}</span>
              <span class="folder-tab-name">${escapeHTML(f.name)}</span>
              <span class="folder-tab-count">${count}</span>
              ${editBtn}
            </button>
          `;
        }).join('');
      }

      // 2. Filter Sites based on activeFolder
      const filteredSites = (activeFolder === 'all')
        ? allSites
        : allSites.filter(s => (s.folder || 'portal') === activeFolder);

      // 3. Update Summary Bar
      const currentFolderObj = folders.find(f => f.id === activeFolder) || { name: '전체보기', icon: '🌐' };
      if (curFolderBadge) {
        curFolderBadge.innerHTML = `${currentFolderObj.icon || '📁'} ${escapeHTML(currentFolderObj.name)}`;
      }
      if (curFolderDesc) {
        curFolderDesc.textContent = activeFolder === 'all'
          ? `총 ${filteredSites.length}개의 사이트 바로가기가 등록되어 있습니다.`
          : `'${currentFolderObj.name}' 폴더에 ${filteredSites.length}개의 사이트가 보관 중입니다.`;
      }
      if (countBadge) {
        countBadge.textContent = `총 ${filteredSites.length}건`;
      }

      // 4. Render Grid / Empty State
      if (filteredSites.length === 0) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
      } else {
        if (emptyEl) emptyEl.style.display = 'none';
        grid.innerHTML = filteredSites.map(site => {
          let hostname = '';
          try {
            hostname = new URL(site.url).hostname;
          } catch (e) {
            hostname = site.url;
          }

          const siteFolder = folders.find(f => f.id === (site.folder || 'portal')) || { name: '포털/검색', icon: '🔍' };

          return `
            <div class="site-card" data-site-id="${site.id}">
              <div class="site-card-header">
                <div class="site-title-box">
                  <div class="site-favicon-bubble">${siteFolder.icon || '🌐'}</div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                      <h4 class="site-title-text">${escapeHTML(site.title)}</h4>
                      <span class="badge" style="font-size: 0.68rem; padding: 2px 6px; background: rgba(255, 107, 139, 0.12); color: var(--primary); font-weight: 700; border-radius: 6px;">${siteFolder.icon || '📁'} ${escapeHTML(siteFolder.name)}</span>
                    </div>
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
      const inputFolder = document.getElementById('site-input-folder');
      const inputMemo = document.getElementById('site-input-memo');
      if (!modal || !form) return;

      form.reset();

      // Populate Folder select options
      if (inputFolder) {
        const folders = (store.siteFolders || DEFAULT_SITE_FOLDERS).filter(f => f.id !== 'all');
        inputFolder.innerHTML = folders.map(f => `
          <option value="${f.id}">${f.icon || '📁'} ${escapeHTML(f.name)}</option>
        `).join('');
      }

      if (siteId) {
        const site = store.sites.find(s => s.id === siteId);
        if (!site) return;
        if (titleEl) titleEl.textContent = '🌐 사이트 바로가기 수정 💖';
        if (hiddenId) hiddenId.value = site.id;
        if (inputTitle) inputTitle.value = site.title || '';
        if (inputUrl) inputUrl.value = site.url || '';
        if (inputFolder) inputFolder.value = site.folder || 'portal';
        if (inputMemo) inputMemo.value = site.memo || '';
      } else {
        if (titleEl) titleEl.textContent = '🌐 새 사이트 바로가기 등록 💖';
        if (hiddenId) hiddenId.value = '';
        if (inputFolder) inputFolder.value = (store.activeSiteFolder && store.activeSiteFolder !== 'all') ? store.activeSiteFolder : 'portal';
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

    openSiteFolderModal(folderId = null) {
      const modal = document.getElementById('site-folder-modal');
      const titleEl = document.getElementById('site-folder-modal-title');
      const hiddenId = document.getElementById('site-folder-edit-id');
      const nameInput = document.getElementById('site-folder-input-name');
      const iconInput = document.getElementById('site-folder-selected-icon');
      const deleteBtn = document.getElementById('btn-delete-site-folder');
      const emojiContainer = document.getElementById('site-folder-emoji-picker');

      if (!modal) return;

      let selectedIcon = '📁';
      if (folderId) {
        const folder = store.siteFolders.find(f => f.id === folderId);
        if (!folder) return;
        if (titleEl) titleEl.textContent = '📁 사이트 폴더 수정';
        if (hiddenId) hiddenId.value = folder.id;
        if (nameInput) nameInput.value = folder.name;
        selectedIcon = folder.icon || '📁';
        if (deleteBtn) {
          const protectedFolder = folder.id === 'all' || folder.id === 'portal';
          deleteBtn.style.display = 'inline-block';
          deleteBtn.disabled = protectedFolder;
          deleteBtn.textContent = protectedFolder ? '기본 이동 폴더 · 삭제 불가' : '🗑️ 폴더 삭제';
          deleteBtn.title = protectedFolder ? '다른 폴더를 삭제할 때 사이트가 이동하는 기본 폴더입니다.' : '폴더 삭제';
        }
      } else {
        if (titleEl) titleEl.textContent = '📁 새 사이트 폴더 추가';
        if (hiddenId) hiddenId.value = '';
        if (nameInput) nameInput.value = '';
        selectedIcon = '🌐';
        if (deleteBtn) deleteBtn.style.display = 'none';
      }

      if (iconInput) iconInput.value = selectedIcon;

      // Render emoji picker grid
      if (emojiContainer) {
        emojiContainer.innerHTML = SITE_EMOJI_LIST.map(emoji => `
          <button type="button" class="vault-emoji-option-btn ${emoji === selectedIcon ? 'selected' : ''}" data-emoji="${emoji}">
            ${emoji}
          </button>
        `).join('');

        emojiContainer.querySelectorAll('.vault-emoji-option-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            emojiContainer.querySelectorAll('.vault-emoji-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (iconInput) iconInput.value = btn.dataset.emoji;
          });
        });
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (nameInput) setTimeout(() => nameInput.focus(), 80);
    },

    closeSiteFolderModal() {
      const modal = document.getElementById('site-folder-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

  });
})(window);
