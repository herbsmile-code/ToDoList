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

  });
})(window);
