/** Hobby views. The existing Store and shared events own saving and synchronization. */
(function(window) {
  'use strict';

  window.createHobbyView = ({ store, DEFAULT_HOBBY_FOLDERS, HOBBY_EMOJI_LIST, getRealTodayStr, escapeHTML }) => ({
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
        if (folderSelect) {
          const originalFolder = note.folder || '';
          if (!Array.from(folderSelect.options).some(option => option.value === originalFolder)) {
            const option = document.createElement('option');
            option.value = originalFolder; option.textContent = '기존 폴더 (현재 목록에 없음)';
            folderSelect.appendChild(option);
          }
          folderSelect.value = originalFolder;
        }
        if (dateInput) dateInput.value = note.date || getRealTodayStr();
        if (titleInput) titleInput.value = note.title || '';
        if (placeInput) placeInput.value = note.place || '';
        if (durationInput) durationInput.value = note.duration || '';
        if (contentInput) contentInput.value = note.content || '';
      } else {
        if (titleEl) titleEl.textContent = '🎨 취미 기록 작성 💖';
        if (editIdEl) editIdEl.value = '';
        if (folderSelect) {
          const preferred = (store.activeHobbyFolder && store.activeHobbyFolder !== 'all') ? store.activeHobbyFolder : 'workout';
          folderSelect.value = store.isHobbyDestination(preferred) ? preferred : (folderSelect.options[0]?.value || '');
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
  });
})(window);
