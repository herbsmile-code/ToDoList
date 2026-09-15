// No browser profile, IndexedDB, Firebase, or recovery files are accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');


const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const constants = fs.readFileSync(path.join(root, 'js/utils/constants.js'), 'utf8');
const key = 'todolist_jy_data_v39';
const fixture = {
  tasks: [{ id: 'user-task', title: 'Task', category: 'work' }],
  notes: [{ id: 'user-note', content: 'Memo', color: 'pink' }],
  aiStudyNotes: [{ id: 'user-ai', title: 'Study', content: 'Study content' }],
  photos: [{ id: 'user-photo', dataUrl: 'data:image/png;base64,AA==' }],
  sites: [{ id: 'user-site', url: 'https://example.invalid' }],
  wishlist: [{ id: 'user-wish', title: 'Wish' }],
  vacations: [{ id: 'user-vacation', days: 1 }],
  healthNotes: [{ id: 'user-health', content: 'Health' }],
  hobbyNotes: [{ id: 'user-hobby', content: 'Hobby' }],
  projects: [{ id: 'user-project', milestones: [] }],
  subscriptions: [{ id: 'user-subscription', name: 'Subscription' }],
  ledgerFiles: [{ id: 'user-ledger-file', name: 'fixture.xlsx' }],
  deletedItemIds: ['previously-deleted'],
  customMenuNames: { notes: 'My notes' },
  updatedAt: 100, syncRevision: 3
};

function harness(raw, { code = source, failRead = false, extras = {} } = {}) {
  const values = new Map(Object.entries({
    todolist_jy_active_rtdb_url: 'https://example.invalid',
    todolist_jy_space_id: 'fixture-user', todolist_jy_pin: 'fixture-pin',
    todolist_jy_projects_seeded_v3: 'true',
    todolist_jy_aistudy_seeded_v1: 'true',
    todolist_jy_subscriptions_seeded_v1: 'true',
    todolist_jy_streak_v39: '{"count":4,"lastDate":"2026-09-15"}',
    ...extras
  }));
  if (raw !== null) values.set(key, raw);
  const writes = [], requests = [], timers = [], errors = [];
  const body = { inert: false, appendChild(el) { this.banner = el; } };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [1789470000000])); }
    static now() { return 1789470000000; }
  }
  const context = {
    Date: FixedDate, TextEncoder, AbortController,
    console: { error: (...args) => errors.push(args), warn() {} },
    localStorage: {
      getItem(k) { if (failRead && k === key) throw Error('Read denied'); return values.get(k) ?? null; },
      setItem(k, value) { values.set(k, String(value)); writes.push(k); }
    },
    document: {
      body, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {} }; },
      documentElement: { setAttribute() {}, style: { setProperty() {} } }
    },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    setInterval() { throw Error('Unexpected polling'); },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, headers:{get:()=> '"1"'}, json: async () => null }; },
    E2EESecurityEngine: { encrypt: async data => ({isEncrypted:true, iv:'fake',payload:JSON.stringify(data)}), decrypt: async data => data.isEncrypted ? JSON.parse(data.payload) : data },
    normalizeArray: value => Array.isArray(value) ? value : [],
    UI: { renderTasks() {}, renderSidebar() {}, initChatbot() {} },
    bindEvents() { context.bound = true; },
    bindBankAnalyzerEvents() { context.bankBound = true; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(constants, context);
  vm.runInContext(code.slice(code.indexOf('  const LocalSyncProtocol'), code.indexOf('  // IndexedDB Vault Storage Engine')) +
    '\nvar cloudSync = new CloudSyncManager();', context);
  vm.runInContext(code.slice(code.indexOf('  const INITIAL_HONEYMOON_DATA'), code.indexOf('  // 6. UI View Engine')), context);
  vm.runInContext(code.slice(code.indexOf('  function initApp()'), code.lastIndexOf("  if (document.readyState === 'loading')")), context);
  vm.runInContext('globalThis.subject = store; globalThis.protocol = LocalSyncProtocol;', context);
  context.cloudSync.getAllVaultFiles = async () => [];
  return { context, store: context.subject, values, writes, requests, timers, errors, body };
}


module.exports = {harness,fixture,key,source};
