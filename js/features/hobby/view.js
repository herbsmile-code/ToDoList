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
  });
})(window);
