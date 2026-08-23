/**
 * ZenTask UI Renderer & View Engine
 */
import { store } from './store.js';

export const UI = {
  // --- Toast Notifications ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-scale-in`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '🗑️';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  },

  // --- Date Formatting Helper ---
  formatDueDate(dateStr, timeStr) {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let label = dateStr;
    let className = '';

    if (dateStr === today) {
      label = '오늘';
      className = 'due-today';
    } else if (dateStr === tomorrow) {
      label = '내일';
      className = 'due-tomorrow';
    } else if (dateStr < today) {
      label = `지연됨 (${dateStr})`;
      className = 'overdue';
    }

    if (timeStr) {
      label += ` ${timeStr}`;
    }

    return { label, className };
  },

  // --- Priority Label Helper ---
  getPriorityInfo(priority) {
    const map = {
      urgent: { label: '긴급 🔥', class: 'badge-priority-urgent' },
      high: { label: '높음 🔴', class: 'badge-priority-high' },
      medium: { label: '중간 🟡', class: 'badge-priority-medium' },
      low: { label: '낮음 🟢', class: 'badge-priority-low' }
    };
    return map[priority] || map.medium;
  },

  // --- Render Navigation & Stats in Sidebar ---
  renderSidebar() {
    const stats = store.getStats();

    // 1. Update Nav Counts
    const counts = {
      all: store.tasks.length,
      today: stats.todayTotal,
      upcoming: store.tasks.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.dueDate && t.dueDate > today && t.status !== 'completed';
      }).length,
      overdue: stats.overdue,
      pinned: store.tasks.filter(t => t.pinned).length,
      completed: stats.completed
    };

    Object.keys(counts).forEach(key => {
      const el = document.getElementById(`nav-count-${key}`);
      if (el) el.textContent = counts[key];
    });

    // 2. Render Categories in Sidebar
    const catContainer = document.getElementById('category-nav-list');
    if (catContainer) {
      catContainer.innerHTML = store.categories.map(cat => {
        const catCount = store.tasks.filter(t => t.category === cat.id).length;
        const isActive = store.activeFilter === cat.id ? 'active' : '';
        return `
          <li class="nav-item ${isActive}" data-filter="${cat.id}">
            <div class="nav-item-left">
              <span class="category-dot" style="background-color: ${cat.color};"></span>
              <span>${cat.name}</span>
            </div>
            <span class="nav-count">${catCount}</span>
          </li>
        `;
      }).join('');
    }

    // 3. Update Progress Ring & Stats
    const rateEl = document.getElementById('stats-rate');
    const ringBar = document.getElementById('progress-ring-bar');
    const subtextEl = document.getElementById('stats-subtext');
    const streakEl = document.getElementById('streak-count');

    if (rateEl) rateEl.textContent = `${stats.rate}%`;
    if (subtextEl) subtextEl.textContent = `${stats.completed}/${stats.total}개 완료됨`;
    if (streakEl) streakEl.textContent = `${stats.streak}일 연속`;

    if (ringBar) {
      const circumference = 2 * Math.PI * 30; // r=30
      const offset = circumference - (stats.rate / 100) * circumference;
      ringBar.style.strokeDasharray = `${circumference} ${circumference}`;
      ringBar.style.strokeDashoffset = offset;
    }
  },

  // --- Render Task Item Card ---
  createTaskCardHTML(task) {
    const isCompleted = task.status === 'completed';
    const priority = this.getPriorityInfo(task.priority);
    const dueInfo = this.formatDueDate(task.dueDate, task.dueTime);
    const categoryObj = store.categories.find(c => c.id === task.category);

    // Subtasks summary
    let subtasksHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSub = task.subtasks.filter(s => s.completed).length;
      const totalSub = task.subtasks.length;
      const percent = Math.round((completedSub / totalSub) * 100);
      subtasksHTML = `
        <div class="task-subtasks-preview" title="하위 항목 ${completedSub}/${totalSub}">
          <i class="icon">☑️</i>
          <span>${completedSub}/${totalSub}</span>
          <div class="subtasks-bar-track">
            <div class="subtasks-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="task-card ${isCompleted ? 'completed' : ''} ${task.pinned ? 'pinned' : ''} animate-fade-in" 
           id="${task.id}" data-id="${task.id}" draggable="true">
        
        <div class="task-checkbox-container">
          <input type="checkbox" class="task-checkbox" id="chk-${task.id}" ${isCompleted ? 'checked' : ''} 
                 title="완료 여부 토글" data-action="toggle-complete">
        </div>

        <div class="task-body" data-action="open-edit">
          <div class="task-header-row">
            <h4 class="task-title">${escapeHTML(task.title)}</h4>
          </div>

          ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
          ${subtasksHTML}

          <div class="task-meta-row">
            <span class="badge ${priority.class}">${priority.label}</span>

            ${categoryObj ? `
              <span class="badge badge-tag" style="border-color: ${categoryObj.color}40; color: ${categoryObj.color}; background: ${categoryObj.color}15;">
                🏷️ ${categoryObj.name}
              </span>
            ` : ''}

            ${dueInfo ? `
              <span class="badge badge-date ${dueInfo.className}">
                ⏰ ${dueInfo.label}
              </span>
            ` : ''}
          </div>
        </div>

        <div class="task-actions">
          <button class="task-action-btn pin-btn ${task.pinned ? 'active' : ''}" 
                  data-action="toggle-pin" title="${task.pinned ? '고정 해제' : '상단 고정'}">
            📌
          </button>
          <button class="task-action-btn edit-btn" data-action="open-edit" title="수정">
            ✏️
          </button>
          <button class="task-action-btn delete-btn" data-action="delete" title="삭제">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  // --- Render Tasks (List or Kanban) ---
  renderTasks() {
    const listContainer = document.getElementById('tasks-list-container');
    const kanbanContainer = document.getElementById('kanban-board-container');
    const emptyState = document.getElementById('empty-state');
    const filteredTasks = store.getFilteredTasks();

    // Set heading text
    const headingEl = document.getElementById('view-title');
    const filterNames = {
      all: '모든 할 일',
      today: '오늘 할 일',
      upcoming: '다가오는 할 일',
      overdue: '기한 지연된 할 일',
      pinned: '중요 표시된 할 일',
      completed: '완료된 할 일'
    };
    const catMatch = store.categories.find(c => c.id === store.activeFilter);
    const titleText = filterNames[store.activeFilter] || (catMatch ? `${catMatch.name} 할 일` : '할 일 목록');
    if (headingEl) headingEl.textContent = titleText;

    if (store.viewMode === 'list') {
      if (listContainer) listContainer.style.display = 'flex';
      if (kanbanContainer) kanbanContainer.style.display = 'none';

      if (filteredTasks.length === 0) {
        if (listContainer) listContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        if (listContainer) {
          listContainer.innerHTML = filteredTasks.map(t => this.createTaskCardHTML(t)).join('');
        }
      }
    } else {
      // Kanban Mode
      if (listContainer) listContainer.style.display = 'none';
      if (kanbanContainer) kanbanContainer.style.display = 'grid';
      if (emptyState) emptyState.style.display = 'none';

      const columns = {
        'todo': document.getElementById('kanban-col-todo'),
        'in-progress': document.getElementById('kanban-col-inprogress'),
        'completed': document.getElementById('kanban-col-completed')
      };

      const counts = { 'todo': 0, 'in-progress': 0, 'completed': 0 };

      // Clear columns
      Object.keys(columns).forEach(status => {
        if (columns[status]) columns[status].innerHTML = '';
      });

      filteredTasks.forEach(task => {
        const col = columns[task.status] || columns['todo'];
        counts[task.status = task.status || 'todo']++;
        if (col) {
          col.insertAdjacentHTML('beforeend', this.createTaskCardHTML(task));
        }
      });

      // Update Column Count Badges
      const bTodo = document.getElementById('badge-count-todo');
      const bInp = document.getElementById('badge-count-inprogress');
      const bComp = document.getElementById('badge-count-completed');
      if (bTodo) bTodo.textContent = counts['todo'];
      if (bInp) bInp.textContent = counts['in-progress'];
      if (bComp) bComp.textContent = counts['completed'];
    }

    this.renderSidebar();
  },

  // --- Task Modal Handlers ---
  openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const subtasksList = document.getElementById('modal-subtasks-list');
    if (!modal || !form) return;

    form.reset();
    subtasksList.innerHTML = '';

    if (taskId) {
      const task = store.tasks.find(t => t.id === taskId);
      if (!task) return;

      modalTitle.textContent = '할 일 수정';
      form.dataset.taskId = task.id;
      document.getElementById('task-input-title').value = task.title;
      document.getElementById('task-input-desc').value = task.description || '';
      document.getElementById('task-input-priority').value = task.priority || 'medium';
      document.getElementById('task-input-category').value = task.category || 'work';
      document.getElementById('task-input-status').value = task.status || 'todo';
      document.getElementById('task-input-duedate').value = task.dueDate || '';
      document.getElementById('task-input-duetime').value = task.dueTime || '';
      document.getElementById('task-input-pinned').checked = !!task.pinned;

      // Populate subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(sub => {
          this.addSubtaskRow(sub.title, sub.completed, sub.id);
        });
      }
    } else {
      modalTitle.textContent = '새로운 할 일 등록';
      delete form.dataset.taskId;
      document.getElementById('task-input-priority').value = 'medium';
      document.getElementById('task-input-status').value = 'todo';
      const defaultCat = store.activeFilter !== 'all' && store.categories.some(c => c.id === store.activeFilter)
        ? store.activeFilter
        : 'work';
      document.getElementById('task-input-category').value = defaultCat;
    }

    modal.classList.add('active');
    document.getElementById('task-input-title').focus();
  },

  closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('active');
  },

  addSubtaskRow(title = '', completed = false, id = null) {
    const list = document.getElementById('modal-subtasks-list');
    if (!list) return;

    const subId = id || 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const row = document.createElement('div');
    row.className = 'checklist-item-row animate-scale-in';
    row.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''} data-sub-chk="${subId}">
      <input type="text" class="checklist-item-input" value="${escapeHTML(title)}" placeholder="하위 항목 입력..." data-sub-id="${subId}">
      <button type="button" class="task-action-btn delete-btn" title="항목 삭제" onclick="this.parentElement.remove()">✕</button>
    `;
    list.appendChild(row);
  }
};

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
