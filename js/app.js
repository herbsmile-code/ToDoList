/**
 * ZenTask Main Application Controller
 */

import { store } from './store.js';
import { UI } from './ui.js';
import { sounds } from './sound.js';
import { confetti } from './confetti.js';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  initDragAndDrop();
  UI.renderTasks();
  initPopulateCategorySelect();
});

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('zentask_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('zentask_theme', next);
  updateThemeIcon(next);
  UI.showToast(`${next === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'info');
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

// --- Populate Category Dropdowns ---
function initPopulateCategorySelect() {
  const select = document.getElementById('task-input-category');
  if (!select) return;
  select.innerHTML = store.categories.map(c => `
    <option value="${c.id}">${c.name}</option>
  `).join('');
}

// --- Event Listeners Orchestrator ---
function initEventListeners() {
  // 1. Theme Toggle
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // 2. Sound Toggle
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const enabled = sounds.toggleSound();
      soundBtn.querySelector('.icon').textContent = enabled ? '🔊' : '🔇';
      UI.showToast(enabled ? '효과음이 켜졌습니다.' : '효과음이 음소거되었습니다.', 'info');
    });
    // Set initial icon
    if (!sounds.enabled) {
      soundBtn.querySelector('.icon').textContent = '🔇';
    }
  }

  // 3. Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.searchQuery = e.target.value.trim();
      UI.renderTasks();
    });
  }

  // 4. View Switcher (List vs Kanban)
  const viewListBtn = document.getElementById('btn-view-list');
  const viewKanbanBtn = document.getElementById('btn-view-kanban');

  if (viewListBtn && viewKanbanBtn) {
    viewListBtn.addEventListener('click', () => {
      store.viewMode = 'list';
      localStorage.setItem('zentask_view', 'list');
      viewListBtn.classList.add('active');
      viewKanbanBtn.classList.remove('active');
      UI.renderTasks();
    });

    viewKanbanBtn.addEventListener('click', () => {
      store.viewMode = 'kanban';
      localStorage.setItem('zentask_view', 'kanban');
      viewKanbanBtn.classList.add('active');
      viewListBtn.classList.remove('active');
      UI.renderTasks();
    });

    // Set initial active button
    if (store.viewMode === 'kanban') {
      viewKanbanBtn.classList.add('active');
      viewListBtn.classList.remove('active');
    }
  }

  // 5. Sort By Selector
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = store.sortBy;
    sortSelect.addEventListener('change', (e) => {
      store.sortBy = e.target.value;
      UI.renderTasks();
    });
  }

  // 6. Priority Filter Selector
  const priorityFilterSelect = document.getElementById('priority-filter-select');
  if (priorityFilterSelect) {
    priorityFilterSelect.addEventListener('change', (e) => {
      store.activePriority = e.target.value;
      UI.renderTasks();
    });
  }

  // 7. Navigation Filter Click (Sidebar & Categories)
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.filter) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      navItem.classList.add('active');
      store.activeFilter = navItem.dataset.filter;
      UI.renderTasks();
    }
  });

  // 8. Quick Add Form
  const quickForm = document.getElementById('quick-add-form');
  const quickInput = document.getElementById('quick-add-input');
  if (quickForm && quickInput) {
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = quickInput.value.trim();
      if (!title) return;

      const defaultCat = store.activeFilter !== 'all' && store.categories.some(c => c.id === store.activeFilter)
        ? store.activeFilter
        : 'work';

      store.addTask({
        title,
        status: 'todo',
        priority: 'medium',
        category: defaultCat,
        dueDate: new Date().toISOString().split('T')[0]
      });

      quickInput.value = '';
      sounds.playAdd();
      UI.showToast('새 할 일이 등록되었습니다!', 'success');
      UI.renderTasks();
    });
  }

  // 9. Open Modal Button (Top right "+ 할 일 추가")
  const openModalBtn = document.getElementById('btn-open-task-modal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => UI.openTaskModal());
  }

  // 10. Close Modal Buttons & Overlay Click
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.closeTaskModal();
      closeShortcutsModal();
      closeSettingsModal();
    });
  });

  // 11. Subtask Add Button in Modal
  const addSubtaskBtn = document.getElementById('btn-add-subtask');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', () => {
      UI.addSubtaskRow();
      const inputs = document.querySelectorAll('.checklist-item-input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
  }

  // 12. Task Modal Form Submission (Create or Edit)
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('task-input-title').value.trim();
      if (!title) return;

      // Extract subtasks
      const subtaskRows = document.querySelectorAll('#modal-subtasks-list .checklist-item-row');
      const subtasks = [];
      subtaskRows.forEach(row => {
        const txtInput = row.querySelector('.checklist-item-input');
        const chk = row.querySelector('.task-checkbox');
        const subTitle = txtInput ? txtInput.value.trim() : '';
        if (subTitle) {
          subtasks.push({
            id: txtInput.dataset.subId || 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            title: subTitle,
            completed: chk ? chk.checked : false
          });
        }
      });

      const taskData = {
        title,
        description: document.getElementById('task-input-desc').value.trim(),
        priority: document.getElementById('task-input-priority').value,
        category: document.getElementById('task-input-category').value,
        status: document.getElementById('task-input-status').value,
        dueDate: document.getElementById('task-input-duedate').value,
        dueTime: document.getElementById('task-input-duetime').value,
        pinned: document.getElementById('task-input-pinned').checked,
        subtasks
      };

      const taskId = taskForm.dataset.taskId;
      if (taskId) {
        store.updateTask(taskId, taskData);
        UI.showToast('할 일이 수정되었습니다.', 'info');
      } else {
        store.addTask(taskData);
        sounds.playAdd();
        UI.showToast('새로운 할 일이 추가되었습니다.', 'success');
      }

      UI.closeTaskModal();
      UI.renderTasks();
    });
  }

  // 13. Task Card Actions (Event Delegation for check, pin, edit, delete)
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Checkbox toggle
    if (target.matches('[data-action="toggle-complete"]') || target.classList.contains('task-checkbox')) {
      const card = target.closest('.task-card');
      if (!card) return;
      const taskId = card.dataset.id;
      const updated = store.toggleTaskComplete(taskId);

      if (updated && updated.status === 'completed') {
        sounds.playComplete();
        const rect = target.getBoundingClientRect();
        confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
        UI.showToast('작업을 완료했습니다! 🎉', 'success');

        // Check if all tasks done
        const stats = store.getStats();
        if (stats.total > 0 && stats.rate === 100) {
          setTimeout(() => {
            sounds.playCelebration();
            confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 120);
            UI.showToast('모든 할 일을 완료했습니다! 대단해요! 🏆', 'success');
          }, 400);
        }
      }
      UI.renderTasks();
      return;
    }

    // Pin toggle
    const pinBtn = target.closest('[data-action="toggle-pin"]');
    if (pinBtn) {
      const card = pinBtn.closest('.task-card');
      if (!card) return;
      store.togglePin(card.dataset.id);
      UI.renderTasks();
      return;
    }

    // Delete task
    const deleteBtn = target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const card = deleteBtn.closest('.task-card');
      if (!card) return;
      if (confirm('이 할 일을 삭제하시겠습니까?')) {
        store.deleteTask(card.dataset.id);
        sounds.playDelete();
        UI.showToast('할 일이 삭제되었습니다.', 'danger');
        UI.renderTasks();
      }
      return;
    }

    // Edit task (Click edit button or card body)
    const editBtn = target.closest('[data-action="open-edit"]');
    if (editBtn) {
      const card = editBtn.closest('.task-card');
      if (!card) return;
      UI.openTaskModal(card.dataset.id);
      return;
    }
  });

  // 14. Keyboard Shortcuts Setup
  document.addEventListener('keydown', (e) => {
    // If typing in input / textarea, ignore single-key shortcuts unless Esc
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if (e.key === 'Escape') {
      UI.closeTaskModal();
      closeShortcutsModal();
      closeSettingsModal();
      return;
    }

    if (isInput) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      UI.openTaskModal();
    } else if (e.key === '/') {
      e.preventDefault();
      const s = document.getElementById('search-input');
      if (s) s.focus();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleTheme();
    } else if (e.key === '1') {
      const viewListBtn = document.getElementById('btn-view-list');
      if (viewListBtn) viewListBtn.click();
    } else if (e.key === '2') {
      const viewKanbanBtn = document.getElementById('btn-view-kanban');
      if (viewKanbanBtn) viewKanbanBtn.click();
    } else if (e.key === '?') {
      e.preventDefault();
      openShortcutsModal();
    }
  });

  // 15. Shortcuts Modal Trigger
  const btnShortcuts = document.getElementById('btn-shortcuts-modal');
  if (btnShortcuts) {
    btnShortcuts.addEventListener('click', openShortcutsModal);
  }

  // 16. Settings Modal Trigger
  const btnSettings = document.getElementById('btn-settings-modal');
  if (btnSettings) {
    btnSettings.addEventListener('click', openSettingsModal);
  }

  // Settings Actions: Export, Import, Reset
  const btnExport = document.getElementById('btn-export-data');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(store.exportJSON());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `zentask-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      UI.showToast('데이터 백업 파일이 다운로드되었습니다.', 'success');
    });
  }

  const importFile = document.getElementById('import-file-input');
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = store.importJSON(event.target.result);
        if (success) {
          UI.showToast('데이터를 성공적으로 복원했습니다!', 'success');
          UI.renderTasks();
          initPopulateCategorySelect();
          closeSettingsModal();
        } else {
          UI.showToast('올바르지 않은 백업 파일 형식입니다.', 'danger');
        }
      };
      reader.readAsText(file);
    });
  }

  const btnReset = document.getElementById('btn-reset-demo');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('샘플 데모 데이터로 초기화하시겠습니까? 현재 작업 내용이 대체됩니다.')) {
        store.resetDemo();
        UI.showToast('데모 데이터로 초기화되었습니다.', 'info');
        UI.renderTasks();
        closeSettingsModal();
      }
    });
  }
}

// --- Drag and Drop for Kanban Columns & Reordering ---
function initDragAndDrop() {
  let draggedTaskId = null;

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    draggedTaskId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTaskId);
  });

  document.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
  });

  document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const targetStatus = col.dataset.status;
      if (draggedTaskId && targetStatus) {
        const task = store.tasks.find(t => t.id === draggedTaskId);
        if (task && task.status !== targetStatus) {
          store.updateTask(draggedTaskId, { status: targetStatus });
          if (targetStatus === 'completed') {
            sounds.playComplete();
            confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
          }
          UI.renderTasks();
        }
      }
    });
  });
}

// --- Shortcuts Modal Helpers ---
function openShortcutsModal() {
  const m = document.getElementById('shortcuts-modal');
  if (m) m.classList.add('active');
}

function closeShortcutsModal() {
  const m = document.getElementById('shortcuts-modal');
  if (m) m.classList.remove('active');
}

// --- Settings Modal Helpers ---
function openSettingsModal() {
  const m = document.getElementById('settings-modal');
  if (m) m.classList.add('active');
}

function closeSettingsModal() {
  const m = document.getElementById('settings-modal');
  if (m) m.classList.remove('active');
}
