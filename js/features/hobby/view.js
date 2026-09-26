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

    renderHobby() {
      const tabsBar = document.getElementById('hobby-folder-tabs');
      const gridContainer = document.getElementById('hobby-notes-grid-container');
      const emptyState = document.getElementById('hobby-empty-state');
      const curFolderBadge = document.getElementById('hobby-cur-folder-badge');
      const curFolderDesc = document.getElementById('hobby-cur-folder-desc');
      const notesCountBadge = document.getElementById('hobby-notes-count-badge');

      if (!gridContainer) return;

      const folders = store.hobbyFolders || DEFAULT_HOBBY_FOLDERS;
      const activeFolder = folders.some(f => f.id === store.activeHobbyFolder) ? store.activeHobbyFolder : 'all';
      const allNotes = store.hobbyNotes || [];
      const nonAllFolders = folders.filter(f => f.id !== 'all');

      // 1. Render Folder Tabs (with edit pencil icon for editable folders)
      if (tabsBar) {
        tabsBar.innerHTML = (folders.some(f => f.id === 'all') ? folders : [DEFAULT_HOBBY_FOLDERS[0], ...folders]).map(f => {
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

      const activeFolderObj = folders.find(f => f.id === activeFolder) || DEFAULT_HOBBY_FOLDERS[0];
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
  });
})(window);
