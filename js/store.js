/**
 * ZenTask State & LocalStorage Store
 */

const STORAGE_KEY = 'zentask_data_v1';
const STREAK_KEY = 'zentask_streak_v1';

const DEFAULT_CATEGORIES = [
  { id: 'work', name: '업무', color: '#6366f1' },
  { id: 'personal', name: '개인', color: '#ec4899' },
  { id: 'study', name: '공부', color: '#8b5cf6' },
  { id: 'health', name: '건강', color: '#10b981' },
  { id: 'finance', name: '재정', color: '#f59e0b' }
];

const INITIAL_DEMO_TASKS = [
  {
    id: 'task-demo-1',
    title: '✨ ZenTask 프로젝트 둘러보기 및 사용법 익히기',
    description: '단축키(N: 새 작업, /: 검색, T: 테마 전환)와 칸반 보드 뷰를 테스트해 보세요!',
    status: 'in-progress', // 'todo' | 'in-progress' | 'completed'
    priority: 'high', // 'urgent' | 'high' | 'medium' | 'low'
    category: 'study',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '18:00',
    pinned: true,
    subtasks: [
      { id: 'sub-1', title: '체크박스 클릭해서 완료 효과음 및 폭죽 보기', completed: false },
      { id: 'sub-2', title: '상단 뷰 전환 버튼 눌러서 칸반 보드 드래그해보기', completed: true },
      { id: 'sub-3', title: '새로운 할 일 등록하기', completed: false }
    ],
    createdAt: Date.now() - 3600000 * 4
  },
  {
    id: 'task-demo-2',
    title: '🎨 모던 UI 디자인 시스템 점검 및 다크모드 확인',
    description: '글래스모피즘과 네온 액센트 컬러, 반응형 모바일 레이아웃 확인하기',
    status: 'completed',
    priority: 'medium',
    category: 'work',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '14:00',
    pinned: false,
    subtasks: [],
    createdAt: Date.now() - 3600000 * 8,
    completedAt: Date.now() - 3600000 * 2
  },
  {
    id: 'task-demo-3',
    title: '🔥 긴급: 주간 프로젝트 진행 보고서 작성',
    description: '주요 마일스톤 달성 현황 및 차주 계획 정리하여 공유하기',
    status: 'todo',
    priority: 'urgent',
    category: 'work',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dueTime: '17:00',
    pinned: true,
    subtasks: [
      { id: 'sub-4', title: '지표 데이터 수집', completed: true },
      { id: 'sub-5', title: '슬라이드 작성', completed: false }
    ],
    createdAt: Date.now() - 3600000 * 12
  },
  {
    id: 'task-demo-4',
    title: '🏃 저녁 가벼운 유산소 러닝 30분',
    description: '스트레칭 충분히 하고 페이스 유지하기',
    status: 'todo',
    priority: 'low',
    category: 'health',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    dueTime: '20:00',
    pinned: false,
    subtasks: [],
    createdAt: Date.now() - 3600000 * 24
  }
];

class Store {
  constructor() {
    this.tasks = [];
    this.categories = DEFAULT_CATEGORIES;
    this.activeFilter = 'all'; // 'all', 'today', 'upcoming', 'overdue', 'pinned', 'completed', or category id
    this.activePriority = 'all'; // 'all', 'urgent', 'high', 'medium', 'low'
    this.searchQuery = '';
    this.sortBy = 'dueDate'; // 'dueDate', 'priority', 'createdAt', 'title'
    this.viewMode = localStorage.getItem('zentask_view') || 'list'; // 'list' | 'kanban'
    this.streak = { count: 1, lastDate: new Date().toISOString().split('T')[0] };

    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.tasks = parsed.tasks || [];
        if (parsed.categories && parsed.categories.length) {
          this.categories = parsed.categories;
        }
      } else {
        this.tasks = [...INITIAL_DEMO_TASKS];
        this.save();
      }

      const streakData = localStorage.getItem(STREAK_KEY);
      if (streakData) {
        this.streak = JSON.parse(streakData);
      }
    } catch (e) {
      console.error('Failed to load tasks from localStorage:', e);
      this.tasks = [...INITIAL_DEMO_TASKS];
    }
  }

  save() {
    try {
      const data = {
        tasks: this.tasks,
        categories: this.categories,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STREAK_KEY, JSON.stringify(this.streak));
    } catch (e) {
      console.error('Failed to save tasks to localStorage:', e);
    }
  }

  addTask(taskData) {
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      category: taskData.category || 'work',
      dueDate: taskData.dueDate || '',
      dueTime: taskData.dueTime || '',
      pinned: !!taskData.pinned,
      subtasks: taskData.subtasks || [],
      createdAt: Date.now()
    };
    this.tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  updateTask(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    // Check if task status is changing to completed
    if (updates.status === 'completed' && task.status !== 'completed') {
      updates.completedAt = Date.now();
      this.updateStreak();
    } else if (updates.status && updates.status !== 'completed') {
      delete task.completedAt;
    }

    Object.assign(task, updates);
    this.save();
    return task;
  }

  toggleTaskComplete(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    const isNowCompleted = task.status !== 'completed';
    task.status = isNowCompleted ? 'completed' : 'todo';
    if (isNowCompleted) {
      task.completedAt = Date.now();
      // Auto complete subtasks if desired, or keep as is
      this.updateStreak();
    } else {
      delete task.completedAt;
    }
    this.save();
    return task;
  }

  togglePin(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.pinned = !task.pinned;
    this.save();
    return task;
  }

  deleteTask(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    this.save();
    return true;
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return null;
    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return null;
    subtask.completed = !subtask.completed;
    this.save();
    return task;
  }

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (this.streak.lastDate === today) {
      // already counted today
      return;
    }

    if (this.streak.lastDate === yesterday) {
      this.streak.count += 1;
    } else if (this.streak.lastDate !== today) {
      this.streak.count = 1;
    }
    this.streak.lastDate = today;
  }

  getFilteredTasks() {
    const todayStr = new Date().toISOString().split('T')[0];

    return this.tasks.filter(task => {
      // 1. Search Query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesCategory = (task.category || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCategory) return false;
      }

      // 2. Priority Filter
      if (this.activePriority !== 'all' && task.priority !== this.activePriority) {
        return false;
      }

      // 3. Navigation Filter
      switch (this.activeFilter) {
        case 'today':
          return task.dueDate === todayStr;
        case 'upcoming':
          return task.dueDate && task.dueDate > todayStr && task.status !== 'completed';
        case 'overdue':
          return task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
        case 'pinned':
          return task.pinned;
        case 'completed':
          return task.status === 'completed';
        case 'all':
          return true;
        default:
          // Category filter
          return task.category === this.activeFilter;
      }
    }).sort((a, b) => {
      // Pinned tasks first
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;

      // Completed tasks to bottom unless completed view
      if (this.activeFilter !== 'completed' && a.status !== b.status) {
        if (a.status === 'completed') return 1;
        if (b.status === 'completed') return -1;
      }

      if (this.sortBy === 'priority') {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      } else if (this.sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      } else if (this.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else {
        // createdAt
        return b.createdAt - a.createdAt;
      }
    });
  }

  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = this.tasks.filter(t => t.dueDate === todayStr);
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
    const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed').length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      inProgress,
      overdue,
      rate,
      todayTotal: todayTasks.length,
      todayCompleted,
      streak: this.streak.count
    };
  }

  exportJSON() {
    return JSON.stringify({
      tasks: this.tasks,
      categories: this.categories,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.tasks)) {
        this.tasks = data.tasks;
        if (Array.isArray(data.categories)) this.categories = data.categories;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid JSON import data', e);
      return false;
    }
  }

  resetDemo() {
    this.tasks = [...INITIAL_DEMO_TASKS];
    this.categories = DEFAULT_CATEGORIES;
    this.save();
  }
}

export const store = new Store();
