/** Site views. The existing UI owns shared events and the single Store. */
(function(window) {
  'use strict';

  // Define methods only; app.js supplies live dependencies and the UI receiver.
  window.createSitesView = ({ store, DEFAULT_SITE_FOLDERS, SITE_EMOJI_LIST, escapeHTML }) => ({
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
