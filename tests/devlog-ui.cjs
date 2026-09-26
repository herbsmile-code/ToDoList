// Load both real entry pages and their script tags in isolated browser contexts.
// Only synthetic local/IndexedDB data and an intercepted cloud server are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4179';
const key = 'todolist_jy_data_v39';
const snapshots = {};
const baselinePath = process.env.DEVLOG_BASELINE_PATH;
const baseline = baselinePath && fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const originalFiles = new Set(['index.html','ToDoList.html','js/app.js']);
function readSource(relative) {
  return process.env.DEVLOG_SOURCE_REF && originalFiles.has(relative)
    ? execFileSync('git', ['show', process.env.DEVLOG_SOURCE_REF + ':' + relative], {cwd:root})
    : fs.readFileSync(path.join(root, relative));
}

async function openApp(browser, entry, width, server, localFile = false) {
  const context = await browser.newContext({viewport:{width,height:900},
    isMobile:width < 600, hasTouch:width < 600, serviceWorkers:'block', timezoneId:'Asia/Seoul'});
  const errors = [], loaded = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.protocol === 'file:') {
      assert.ok(fileURLToPath(url).startsWith(root + path.sep));
      return route.continue();
    }
    if (url.origin === 'https://sync.example.invalid' && url.pathname.startsWith('/spaces/')) {
      server.requests++;
      if (request.method() === 'PUT') {
        assert.equal(request.headers()['if-match'], '"' + server.version + '"');
        server.body = request.postDataJSON(); server.version++; server.puts++;
      } else assert.equal(request.method(), 'GET');
      return route.fulfill({status:200, contentType:'application/json',
        headers:{ETag:'"' + server.version + '"', 'Access-Control-Expose-Headers':'ETag'},
        body:JSON.stringify(server.body)});
    }
    if (url.origin === origin) {
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filename = path.resolve(root, relative);
      assert.ok(filename.startsWith(root + path.sep));
      if (!fs.existsSync(filename)) {
        errors.push('Missing resource: ' + relative);
        return route.fulfill({status:404, body:''});
      }
      const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css'};
      return route.fulfill({body:readSource(relative), contentType:types[path.extname(filename)] || 'application/octet-stream'});
    }
    // Fonts and the unchanged external PDF/Excel libraries are outside this check.
    if (['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname)) {
      return route.fulfill({status:200, contentType:url.hostname === 'fonts.googleapis.com'
        ? 'text/css' : 'application/javascript', body:''});
    }
    errors.push('Unexpected external request: ' + url.origin + url.pathname);
    return route.abort();
  });
  await context.addInitScript(({key}) => {
    localStorage.setItem(key, JSON.stringify({tasks:[],notes:[],aiStudyNotes:[],photos:[],sites:[],
      wishlist:[],vacations:[],healthNotes:[],hobbyNotes:[],projects:[],subscriptions:[],
      ledgerFiles:[],deletedItemIds:[],updatedAt:100,syncRevision:1}));
    localStorage.setItem('todolist_jy_active_rtdb_url', 'https://sync.example.invalid');
    for (const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1']) {
      localStorage.setItem('todolist_jy_' + name, 'true');
    }
  }, {key});
  const page = await context.newPage();
  page.on('request', request => {
    const url = new URL(request.url());
    const relative = url.protocol === 'file:'
      ? path.relative(root, fileURLToPath(url)).replace(/\\/g,'/')
      : url.origin === origin ? url.pathname.replace(/^\/+/, '') : '';
    if (relative.startsWith('js/') && relative.endsWith('.js')) loaded.push(relative);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning') console.warn('Fixture browser:', message.text());
  });
  page.setDefaultTimeout(7000);
  await page.clock.setFixedTime(new Date('2026-09-18T03:00:00Z'));
  await page.goto(localFile ? pathToFileURL(path.join(root, entry)).href : origin + '/' + entry);
  await page.waitForFunction(() => window.store?.writerLockHeld && window.UI && !document.body.inert);
  await page.evaluate(async () => {
    // Bypass authentication only; storage, crypto, sync, rendering and events are real.
    cloudSync.spaceId = 'fixture-user'; cloudSync.pin = 'fixture-pin';
    await UI.renderSidebar();
  });
  const html = localFile ? fs.readFileSync(path.join(root, entry), 'utf8') : readSource(entry).toString();
  const expectedScripts = [...html
    .matchAll(/<script\b[^>]*src="(js\/[^"?]+)[^"]*"/g)].map(match => match[1]);
  assert.deepEqual(loaded, expectedScripts, 'Actual entry-page scripts must load in order');
  return {context,page,errors};
}

async function navigate(page, filter, width) {
  if (width >= 600 && await page.locator('.nav-item[data-filter="' + filter + '"]').count()) {
    await page.locator('.nav-item[data-filter="' + filter + '"]').first().click();
  } else {
    const group = await page.evaluate(filter => Object.entries(UI.getQuickMenuGroups())
      .find(([,value]) => value.items.some(item => item.id === filter && !item.isSpecial))?.[0], filter);
    if (width < 600 && group) {
      await page.locator('.mobile-nav-btn[data-group="' + group + '"]').click();
      await page.locator('.quick-popover-item[data-filter="' + filter + '"]').click();
    } else if (width < 600 && await page.locator('.mobile-cat-pill[data-filter="' + filter + '"]').count()) {
      await page.locator('.mobile-cat-pill[data-filter="' + filter + '"]').click();
    } else {
      // Devlog/week have no mobile bottom-menu entry; retain the existing bridge.
      await page.evaluate(filter => window.selectCategoryFilter(filter), filter);
    }
  }
  await page.evaluate(() => UI.renderSidebar());
  assert.equal(await page.evaluate(() => store.activeFilter), filter);
}

async function capture(page, name, selector) {
  const node = page.locator(selector).first();
  snapshots[name] = await node.evaluate(element => ({html:element.outerHTML,
    width:Math.round(element.getBoundingClientRect().width),
    height:Math.round(element.getBoundingClientRect().height)}));
  if (baseline) assert.deepEqual(snapshots[name], baseline[name], name + ': UI changed');
  if (process.env.DEVLOG_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.DEVLOG_SCREENSHOT_DIR, {recursive:true});
    await page.mouse.move(0, 0);
    await page.screenshot({path:path.join(process.env.DEVLOG_SCREENSHOT_DIR,name + '.png'),animations:'disabled'});
  }
}

async function checkViews(app, entry, width, server) {
  const {page} = app;
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const requests = server.requests;
  const menuViews = {all:'tasks',personal:'tasks',work:'tasks','calendar-month':'calendar-month',
    'calendar-week':'calendar-week',project:'project',hobby:'hobby',health:'health',vacation:'vacation',
    photos:'photos',notes:'notes',ledger:'ledger',wishlist:'wishlist',sites:'sites',aistudy:'aistudy',
    devlog:'devlog',vault:'files'};
  for (const [filter,view] of Object.entries(menuViews)) {
    await navigate(page, filter, width);
    assert.equal(await page.locator('#' + view + '-view-container').isVisible(), true, filter);
  }
  await navigate(page, 'devlog', width);
  const count = await page.evaluate(() => DEVLOG_DATA.length);
  assert.equal(await page.locator('.devlog-card').count(), count);
  assert.equal(await page.locator('#nav-count-devlog').textContent(), String(count));
  for (const theme of ['light','dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    const name = entry.replace('.html','') + '-' + width + '-' + theme;
    await capture(page, name + '-list', '#devlog-view-container');
    const modal = page.locator('#devlog-detail-modal').first();
    for (const button of ['.btn-devlog-popup','.btn-primary']) {
      await page.locator('.devlog-card').first().locator(button).click();
      assert.equal(await modal.isVisible(), true);
      assert.equal(await page.locator('#devlog-modal-title').first().textContent(),
        await page.evaluate(() => DEVLOG_DATA[0].title));
      if (button === '.btn-devlog-popup') await capture(page, name + '-detail', '#devlog-detail-modal');
      await modal.locator('[data-close-devlog-modal]').nth(button === '.btn-devlog-popup' ? 0 : 1).click();
      assert.equal(await modal.isVisible(), false);
    }
  }
  await navigate(page, 'calendar-month', width);
  const chip = page.locator('#calendar-month-view-container .cal-devlog-chip').first();
  const version = await chip.getAttribute('data-devlog-ver');
  await chip.click();
  assert.equal(await page.locator('#devlog-detail-modal').first().isVisible(), true);
  assert.equal((await page.locator('#devlog-modal-version-badge').first().textContent()).trim(), version);
  await page.locator('#devlog-detail-modal').first().locator('[data-close-devlog-modal]').first().click();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), before,
    'Navigation and devlog display must preserve original business-data bytes');
  assert.equal(server.requests, requests, 'Display must not start cloud requests');
  assert.deepEqual(app.errors, []);
}

async function sync(page) {
  const result = await page.evaluate(async () => ({ok:await cloudSync.requestManualSync(),
    status:store.saveStatus, message:store.saveMessage, conflicts:store.localSync.conflicts}));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(await page.evaluate(() => store.localSync.pending.length), 0);
}

async function checkSync(desktop, mobile) {
  await sync(desktop.page); await sync(mobile.page);
  await navigate(mobile.page, 'devlog', 390);
  await desktop.page.evaluate(() => store.addNote('웹에서 보낸 가상 메모'));
  await sync(desktop.page); await sync(mobile.page);
  assert.equal(await mobile.page.evaluate(() => store.activeFilter), 'devlog');
  await navigate(mobile.page, 'notes', 390);
  assert.match(await mobile.page.locator('#notes-view-container').textContent(), /웹에서 보낸 가상 메모/);
  await mobile.page.evaluate(() => store.updateNote(store.notes[0].id, {content:'모바일에서 수정한 가상 메모'}));
  await sync(mobile.page);
  await navigate(desktop.page, 'devlog', 1280);
  await sync(desktop.page);
  assert.equal(await desktop.page.evaluate(() => store.activeFilter), 'devlog');
  await navigate(desktop.page, 'notes', 1280);
  assert.match(await desktop.page.locator('#notes-view-container').textContent(), /모바일에서 수정한 가상 메모/);
  const readNotes = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).notes, key);
  assert.deepEqual(await readNotes(desktop.page), await readNotes(mobile.page));
  assert.deepEqual(desktop.errors, []); assert.deepEqual(mobile.errors, []);
}

(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    for (const entry of ['index.html','ToDoList.html']) {
      const server = {body:null,version:1,requests:0,puts:0};
      const desktop = await openApp(browser, entry, 1280, server);
      const mobile = await openApp(browser, entry, 390, server);
      try {
        await checkViews(desktop, entry, 1280, server);
        await checkViews(mobile, entry, 390, server);
        await checkSync(desktop, mobile);
        assert.ok(server.puts > 0 && server.body.isEncrypted);
      } finally { await desktop.context.close(); await mobile.context.close(); }
      // The actual file:// entry must also resolve the new classic script.
      if (!process.env.DEVLOG_SOURCE_REF) {
        const file = await openApp(browser, entry, 390, server, true);
        try {
          await navigate(file.page, 'devlog', 390);
          await file.page.locator('.devlog-card .btn-devlog-popup').first().click();
          assert.equal(await file.page.locator('#devlog-detail-modal').first().isVisible(), true);
          await file.page.locator('#devlog-detail-modal').first().locator('[data-close-devlog-modal]').first().click();
          assert.equal(await file.page.locator('#devlog-detail-modal').first().isVisible(), false);
          assert.deepEqual(file.errors, []);
        } finally { await file.context.close(); }
      }
    }
    if (baselinePath && !baseline) {
      fs.mkdirSync(path.dirname(baselinePath), {recursive:true});
      fs.writeFileSync(baselinePath, JSON.stringify(snapshots,null,2));
    }
    console.log('PASS: both full HTML entries; desktop/mobile menu routes; devlog buttons/calendar; light/dark UI; no display writes; encrypted two-context memo sync while devlog is open' +
      (process.env.DEVLOG_SOURCE_REF ? '; reference source' : '; file:// entry loading') +
      (baseline ? '; baseline DOM/layout unchanged' : ''));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
