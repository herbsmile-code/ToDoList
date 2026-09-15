// Actual ledger functions, with only synthetic storage and DOM supplied by tests.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {harness, fixture, key, source} = require('./sync-harness.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Ledger test section: ${start}`);
  return source.slice(from, to);
}
const bankCode = section('  const BANK_RULES_KEY', '  // PDF 텍스트 추출') +
  section('  function bankNormalizeDate', '  async function bankLearnFromExcel') +
  section('  function resolveTxBank', '  function bankMergeAndSaveStatements') +
  section('  function syncBankToHoneymoonData()', '  // 전체 월 엑셀 내보내기 헬퍼');
const viewCode = 'Object.assign(UI, {' + section('    getLedgerAvailableMonths(data)', '    renderSubscriptions()') + '});';
const bindCode = section('  function bindBankAnalyzerEvents()', '  // 8. Event Handlers & Initializers');
const monthClickCode = section('      // Ledger Month Tab Click', '      // Ledger Bar Column Click');
const data = {
  7: {hasData: true, income: {total: 1000, items: [{name: '가짜 7월 급여', amount: 1000}]},
    fixed: {total: 0, items: []}, variable: {total: 0, items: []}},
  9: {hasData: true, income: {total: 8000000, items: [{name: '가짜 9월 급여', amount: 8000000}]},
    fixed: {total: 650000, items: [{name: '가짜 월세', amount: 650000}]},
    variable: {total: 125000, items: [{name: '가짜 생활비', amount: 125000}]},
    expense: {total: 775000, fixed: 650000, variable: 125000, etc: 0},
    savings: {total: 1000000, cheongyak: 100000, installment: 900000, stockExtra: 0}, remaining: 6225000}
};
const julyBank = [{date: '2026-07-15', bank: 'shinhan', desc: '가짜 월급', in: 1000, out: 0, balance: 1000,
  category: '월급', mainCategory: '수입', subCategory: '급여'}];
function ledgerHarness({bank = [], months = data, rawBank = JSON.stringify(bank)} = {}) {
  const h = harness(JSON.stringify({...fixture, ledgerFiles: [], honeymoonData: clone(months)}),
    {extras: {ledgerBankStatements: rawBank}});
  const elements = new Map();
  h.context.document.getElementById = id => {
    if (!elements.has(id)) elements.set(id, {textContent: '', innerHTML: '', hidden: false,
      style: {}, dataset: {}, setAttribute() {}, addEventListener() {}, classList: {add() {}, remove() {}}});
    return elements.get(id);
  };
  h.context.document.querySelectorAll = () => [];
  h.context.formatKRW = value => (Number(value) || 0).toLocaleString('ko-KR') + '원';
  h.context.escapeHTML = value => String(value ?? '');
  vm.runInContext(bankCode + viewCode + bindCode, h.context);
  return Object.assign(h, {elements});
}
module.exports = {ledgerHarness, data, julyBank, bankCode, viewCode, bindCode, monthClickCode, clone, key};
