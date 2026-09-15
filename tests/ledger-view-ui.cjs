// Fresh headless browser. All URLs are intercepted, all storage is synthetic.
// No browser profile, IndexedDB, live Firebase or user backup is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.LEDGER_TEST_PLAYWRIGHT_PATH || 'playwright');
const {data, bankCode, viewCode, bindCode, monthClickCode} = require('./ledger-harness.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

(async () => {
  const browser = await chromium.launch({headless: true, channel: 'msedge'});
  try {
    const context = await browser.newContext({serviceWorkers: 'block'});
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let cases = 0;
    for (const entry of ['index.html', 'ToDoList.html']) {
      // Preserve the actual header/main-wrapper/content-area hierarchy and ledger markup.
      await page.setContent(read(entry).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<link\b[^>]*>/gi, ''));
      // Use the normal fallback fonts; an offline test must not fetch Google Fonts.
      await page.addStyleTag({content: (read('css/style.css') + read('css/animations.css'))
        .replace(/@import\s+url\([^)]*\);/g, '')});
      await page.evaluate(data => {
        window.testWrites = [];
        Object.defineProperty(window, 'localStorage', {configurable: true, value: {
          getItem: () => null,
          setItem: (key, value) => { testWrites.push({key, value}); throw Error('View attempted a storage write'); }
        }});
        window.fetch = () => { throw Error('View attempted a network request'); };
        window.INITIAL_HONEYMOON_DATA = {};
        window.store = {honeymoonData: structuredClone(data), selectedLedgerMonth: 9,
          ledgerFiles: [], subscriptions: [], save() { throw Error('View attempted Store.save'); }};
        window.UI = {};
        window.formatKRW = value => (Number(value) || 0).toLocaleString('ko-KR') + '원';
        window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,
          char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
        for (const child of document.querySelector('.content-area').children) child.style.display = 'none';
        document.getElementById('ledger-view-container').style.display = 'flex';
      }, data);
      await page.addScriptTag({content: '(()=>{' + bankCode + viewCode + bindCode +
        '\nbindBankAnalyzerEvents();UI.renderLedger();' +
        '\ndocument.addEventListener("click", e => {' + monthClickCode + '});})()'});
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        for (const width of [320, 390, 640, 992, 1280]) {
          await page.setViewportSize({width, height: 900});
          for (const [id, amount] of Object.entries({'stat-val-income-total': '8,000,000원',
            'stat-val-expense-total': '775,000원', 'stat-val-savings-total': '1,000,000원',
            'stat-val-remaining-total': '6,225,000원', 'col-total-fixed': '650,000원'})) {
            const el = page.locator('#' + id);
            assert.equal(await el.textContent(), amount, `${entry}/${theme}/${width}/${id} amount`);
            assert.equal(await el.isVisible(), true, `${entry}/${theme}/${width}/${id} visible`);
            const dimensions = await el.evaluate(el => {
              const r = el.getBoundingClientRect();
              const range = document.createRange(); range.selectNodeContents(el);
              const t = range.getBoundingClientRect();
              return {left: r.left, right: r.right, width: innerWidth,
                textInside: t.left >= r.left - 1 && t.right <= r.right + 1};
            });
            assert.ok(dimensions.left >= -1 && dimensions.right <= dimensions.width + 1 && dimensions.textInside,
              `${entry}/${theme}/${width}/${id} clipped: ${JSON.stringify(dimensions)}`);
          }
          assert.equal(await page.locator('.ledger-chart-card').isVisible(), width > 992);
          assert.match(await page.locator('#list-items-variable').textContent(), /125,000원/);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
            `${entry}/${theme}/${width} horizontal overflow`);
          cases++;
        }
      }
      await page.setViewportSize({width: 390, height: 900});
      await page.locator('.l-m-tab[data-l-month="10"]').click();
      assert.match(await page.locator('#ledger-month-data-status').textContent(), /10월에는 저장된 내역이 없습니다/);
      assert.equal(await page.evaluate(() => store.selectedLedgerMonth), 10);
      await page.locator('.l-m-tab[data-l-month="9"]').click();
      assert.equal(await page.locator('#stat-val-income-total').textContent(), '8,000,000원');
      assert.equal(await page.locator('#ledger-month-data-status').isVisible(), false);
      assert.deepEqual(await page.evaluate(() => store.honeymoonData), data);
      assert.deepEqual(await page.evaluate(() => testWrites), []);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${cases} full-layout cases, synced totals without bank raw data, month clicks, no storage/network writes`);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
