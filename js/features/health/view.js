/** Health views. The existing Store and shared events own persistence and synchronization. */
(function(window) {
  'use strict';

  window.createHealthView = ({ store, DEFAULT_HEALTH_FOLDERS, HEALTH_EMOJI_LIST, getRealTodayStr, escapeHTML }) => ({
    openHealthNoteModal(noteId = null) {
      const modal = document.getElementById('health-note-modal');
      const form = document.getElementById('health-note-form');
      if (!modal || !form) return;
      this.healthAttachments.close();
      form.reset();
      const titleEl = document.getElementById('health-note-modal-title');
      const editIdEl = document.getElementById('health-note-edit-id');
      const folderSelect = document.getElementById('health-input-folder');
      const dateInput = document.getElementById('health-input-date');
      const titleInput = document.getElementById('health-input-title');
      const hospitalInput = document.getElementById('health-input-hospital');
      const costInput = document.getElementById('health-input-cost');
      const contentInput = document.getElementById('health-input-content');
      const statusInput = document.getElementById('health-input-status');
      const folders = (store.healthFolders || DEFAULT_HEALTH_FOLDERS).filter(f => f.id !== 'all');
      if (folderSelect) folderSelect.innerHTML = folders.map(f => `
          <option value="${f.id}">${f.icon || '📁'} ${escapeHTML(f.name)}</option>
        `).join('');
      const note = noteId ? store.healthNotes.find(n => n.id === noteId) : null;
      if (noteId && !note) return;
      this._healthNoteEditSnapshot = noteId ? store.getHealthNoteFingerprint(noteId) : null;
      if (note) {
        if (titleEl) titleEl.textContent = '🏥 건강 메모 수정 💖';
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
        if (hospitalInput) hospitalInput.value = note.hospital || '';
        if (costInput) costInput.value = note.cost || '';
        if (contentInput) contentInput.value = note.content || '';
        if (statusInput) statusInput.value = note.status === 'completed' ? 'completed' : 'in-progress';
      } else {
        if (titleEl) titleEl.textContent = '🏥 건강 메모 작성 💖';
        if (editIdEl) editIdEl.value = '';
        const preferred = (store.activeHealthFolder && store.activeHealthFolder !== 'all') ? store.activeHealthFolder : 'obgyn';
        if (folderSelect) folderSelect.value = store.isHealthDestination(preferred) ? preferred : (folderSelect.options[0]?.value || '');
        if (dateInput) dateInput.value = getRealTodayStr();
      }
      this.healthAttachments.open(note);
      modal.style.display = 'flex';
      modal.classList.add('active');
      if (titleInput) setTimeout(() => titleInput.focus(), 60);
      if (window.sounds && window.sounds.playAdd) window.sounds.playAdd();
    },

    closeHealthNoteModal() {
      this.healthAttachments.close();
      const modal = document.getElementById('health-note-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openHealthFolderModal(folderId = null) {
      const modal = document.getElementById('health-folder-modal');
      const form = document.getElementById('health-folder-form');
      const titleEl = document.getElementById('health-folder-modal-title');
      const editIdEl = document.getElementById('health-folder-edit-id');
      const iconInput = document.getElementById('health-input-folder-icon');
      const nameInput = document.getElementById('health-input-folder-name');
      const grid = document.getElementById('health-folder-emoji-grid');
      const deleteBtn = document.getElementById('btn-delete-health-folder');
      const submitBtn = document.getElementById('btn-submit-health-folder');

      if (!modal || !form) return;
      form.reset();

      let currentIcon = '🩺';
      let currentName = '';

      if (folderId) {
        const folder = (store.healthFolders || DEFAULT_HEALTH_FOLDERS).find(f => f.id === folderId);
        if (!folder) return;
        currentIcon = folder.icon || '🩺';
        currentName = folder.name || '';
        if (titleEl) titleEl.textContent = '📁 건강 폴더 수정 & 삭제 💖';
        if (editIdEl) editIdEl.value = folder.id;
        if (nameInput) nameInput.value = currentName;
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) {
          // Navigation and the fallback destination remain available.
          const isProtected = (folder.id === 'all' || folder.id === 'general');
          deleteBtn.style.display = isProtected ? 'none' : 'inline-flex';
          deleteBtn.dataset.id = folder.id;
        }
        if (submitBtn) submitBtn.textContent = '수정 완료 ✨';
      } else {
        if (titleEl) titleEl.textContent = '📁 새 건강 폴더 추가';
        if (editIdEl) editIdEl.value = '';
        if (nameInput) nameInput.value = '';
        if (iconInput) iconInput.value = currentIcon;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '폴더 생성 📁';
      }

      // Render 24 Emoji Picker Buttons
      if (grid) {
        grid.innerHTML = HEALTH_EMOJI_LIST.map(emoji => {
          const isSel = (emoji === currentIcon);
          return `
            <button type="button" class="health-emoji-option-btn ${isSel ? 'selected' : ''}" data-emoji="${emoji}" title="${emoji}">
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

    closeHealthFolderModal() {
      const modal = document.getElementById('health-folder-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    renderHealth() {
      const tabsBar = document.getElementById('health-folder-tabs');
      const gridContainer = document.getElementById('health-notes-grid-container');
      const emptyState = document.getElementById('health-empty-state');
      const curFolderBadge = document.getElementById('health-cur-folder-badge');
      const curFolderDesc = document.getElementById('health-cur-folder-desc');
      const notesCountBadge = document.getElementById('health-notes-count-badge');

      if (!gridContainer) return;

      const folders = store.healthFolders || DEFAULT_HEALTH_FOLDERS;
      const activeFolder = folders.some(f => f.id === store.activeHealthFolder) ? store.activeHealthFolder : 'all';
      const allNotes = store.healthNotes || [];

      // 1. Render Folder Tabs (with edit pencil icon for editable folders)
      if (tabsBar) {
        tabsBar.innerHTML = (folders.some(f => f.id === 'all') ? folders : [DEFAULT_HEALTH_FOLDERS[0], ...folders]).map(f => {
          const isActive = (f.id === activeFolder);
          const count = f.id === 'all'
            ? allNotes.length
            : allNotes.filter(n => n.folder === f.id).length;

          const editBtn = (f.id !== 'all')
            ? `<span class="health-folder-edit-btn" data-action="open-edit-health-folder" data-id="${f.id}" title="폴더 이름/아이콘 수정 및 삭제">✏️</span>`
            : '';

          return `
            <button type="button" class="health-folder-tab ${isActive ? 'active' : ''}" data-health-folder-id="${f.id}">
              <span>${f.icon || '📁'}</span>
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

      const activeFolderObj = folders.find(f => f.id === activeFolder) || DEFAULT_HEALTH_FOLDERS[0];
      if (curFolderBadge) {
        curFolderBadge.textContent = `${activeFolderObj.icon || '📁'} ${activeFolderObj.name}`;
      }
      if (curFolderDesc) {
        curFolderDesc.textContent = activeFolder === 'all'
          ? `총 ${allNotes.length}개의 건강 기록 메모가 보관 중입니다.`
          : `'${activeFolderObj.name}' 폴더에 ${filtered.length}건의 진료 및 건강 메모가 있습니다.`;
      }
      if (notesCountBadge) {
        notesCountBadge.textContent = `총 ${filtered.length}건`;
      }

      // 3. Render Large Notes Grid
      if (filtered.length === 0) {
        gridContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        const cardsHTML = window.ListOrder.sort('healthNotes', filtered).map(note => {
          const noteFolder = folders.find(f => f.id === note.folder) || { name: '일반/기타', icon: '💊' };
          const attachmentUrl = window.safeHealthAttachmentUrl(note.fileUrl);
          const dateFormatted = note.date ? note.date.replace(/-/g, '.') : '';
          const completed = note.status === 'completed';

          return `
            <div class="health-note-card" data-health-note-id="${note.id}">
              <div class="health-note-header">
                <div class="health-note-top-row">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="health-status-badge ${completed ? 'is-completed' : 'is-progress'}">${completed ? '진행완료' : '진행중'}</span>
                    <span class="health-folder-badge">
                      <span>${noteFolder.icon || '🩺'}</span>
                      <span>${escapeHTML(noteFolder.name)}</span>
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <!-- 퀵 폴더 이동 버튼 -->
                    <button type="button" class="task-action-btn move-folder-btn" data-action="quick-move-health-note" data-id="${note.id}" title="다른 폴더로 이동">📁⇄</button>
                    <button type="button" class="task-action-btn edit-btn" data-action="edit-health-note" data-id="${note.id}" title="메모 수정">✏️</button>
                    <button type="button" class="task-action-btn delete-btn" data-action="delete-health-note" data-id="${note.id}" title="메모 삭제">🗑️</button>
                  </div>
                </div>

                <h3 class="health-note-title">${escapeHTML(note.title)}</h3>

                <div class="health-note-submeta">
                  <span>📅 ${dateFormatted}</span>
                  ${note.hospital ? `<span>🏥 ${escapeHTML(note.hospital)}</span>` : ''}
                  ${note.cost ? `<span class="health-cost-chip">💳 ${escapeHTML(note.cost)}</span>` : ''}
                </div>
              </div>

              <div class="health-note-body">${escapeHTML(note.content)}</div>

              ${note.fileName || note.fileUrl ? `
                <div class="health-file-badge-card">
                  <div class="health-file-info-left">
                    <span class="health-file-name">📑 ${escapeHTML(note.fileName || '이름 없는 첨부')}</span>
                    ${note.fileMemo ? `<span class="health-file-memo-text">💬 ${escapeHTML(note.fileMemo)}</span>` : ''}
                  </div>
                  ${attachmentUrl ? `
                    <a href="${escapeHTML(attachmentUrl)}" download="${escapeHTML(note.fileName)}" class="btn btn-sm" style="font-size: 0.74rem; background: #10b981; color: #fff; padding: 4px 9px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="결과표 다운로드/열기">
                      <span>📥 다운로드</span>
                    </a>
                  ` : (note.fileUrl ? '<span>첨부 주소 형식을 확인할 수 없어 다운로드를 차단했습니다. 원본은 보존됩니다.</span>' : '')}
                </div>
              ` : ''}

              <div class="health-note-footer">
                <span>등록일: ${new Date(note.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                <button type="button" class="btn btn-sm" style="font-size: 0.72rem; padding: 2px 7px; background: rgba(0,0,0,0.04); color: var(--primary);" data-action="copy-health-note" data-id="${note.id}" title="내용 복사">
                  📋 복사
                </button>
              </div>
            </div>
          `;
        }).join('');

        gridContainer.innerHTML = cardsHTML;
      }

      this.renderSidebar();
    },
  });
})(window);
