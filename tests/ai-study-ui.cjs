// Real entry pages and scripts, isolated browser storage, synthetic notes only.
// All remote requests are intercepted. Never opens a user profile or Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4180';
const key = 'todolist_jy_data_v39';
const snapshots = {};
const baselinePath = process.env.AI_STUDY_BASELINE_PATH;
const baseline = baselinePath && fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const note = {id:'fixture-ai', title:'검증용 <AI> 노트', category:'llm',
  summary:'요약 & 설명', content:'첫 줄 <본문>\n둘째 줄', codeSnippet:'const example = "<&>";',
  snippetLang:'JavaScript', tags:['#테스트','<태그>'], refUrl:'https://example.invalid/reference',
  pinned:false, createdAt:1789700400000, updatedAt:1789700400000};
const initialData = {tasks:[], notes:[], aiStudyNotes:[note], photos:[], sites:[],
  wishlist:[], vacations:[], healthNotes:[], hobbyNotes:[], projects:[], subscriptions:[],
  ledgerFiles:[], deletedItemIds:[], updatedAt:100, syncRevision:1};

async function openApp(browser, entry, width, localFile = false, sharedServer = null) {
  const context = await browser.newContext({viewport:{width,height:900}, serviceWorkers:'block',
    isMobile:width < 600, hasTouch:width < 600, timezoneId:'Asia/Seoul'});
  const errors = [], loaded = [];
  const server = sharedServer || {requests:0, puts:0, body:null, version:1, failGET:true};
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.protocol === 'file:') {
      assert.ok(fileURLToPath(url).startsWith(root + path.sep));
      return route.continue();
    }
    if (url.origin === 'https://sync.example.invalid' && url.pathname.startsWith('/spaces/')) {
      server.requests++;
      if (request.method() === 'GET' && server.failGET) {
        return route.fulfill({status:503, contentType:'application/json', body:'null'});
      }
      if (request.method() === 'PUT') {
        assert.equal(request.headers()['if-match'], '"' + server.version + '"');
        server.body = request.postDataJSON(); server.version++; server.puts++;
      } else assert.equal(request.method(), 'GET');
      return route.fulfill({status:200, contentType:'application/json',
        headers:{ETag:'"' + server.version + '"', 'Access-Control-Expose-Headers':'ETag'},
        body:JSON.stringify(server.body)});
    }
    if (url.origin === origin) {
      const filename = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      assert.ok(filename.startsWith(root + path.sep));
      const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css'};
      return route.fulfill({body:fs.readFileSync(filename),
        contentType:types[path.extname(filename)] || 'application/octet-stream'});
    }
    if (['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname)) {
      return route.fulfill({status:200, contentType:url.hostname === 'fonts.googleapis.com'
        ? 'text/css' : 'application/javascript', body:''});
    }
    errors.push('Unexpected request: ' + url.origin + url.pathname);
    return route.abort();
  });
  await context.addInitScript(({key, initialData}) => {
    // Preserve writes across reload; only seed this isolated origin once.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(initialData));
    localStorage.setItem('todolist_jy_active_rtdb_url', 'https://sync.example.invalid');
    for (const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1']) {
      localStorage.setItem('todolist_jy_' + name, 'true');
    }
    const setItem = Storage.prototype.setItem;
    window.fixtureState = {writes:0, failSave:false, copied:[], fallbackCopies:[], failClipboard:false};
    Storage.prototype.setItem = function(name, value) {
      if (name === key) {
        fixtureState.writes++;
        if (fixtureState.failSave) throw new DOMException('Fixture quota exceeded', 'QuotaExceededError');
      }
      return setItem.call(this, name, value);
    };
    Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async text => {
      if (fixtureState.failClipboard) throw Error('Fixture clipboard denied');
      fixtureState.copied.push(text);
    }}});
    document.execCommand = command => {
      if (command !== 'copy') throw Error('Unexpected execCommand');
      fixtureState.fallbackCopies.push(document.activeElement.value);
      return true;
    };
  }, {key, initialData});
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.on('request', request => {
    const url = new URL(request.url());
    const relative = url.protocol === 'file:'
      ? path.relative(root, fileURLToPath(url)).replace(/\\/g,'/')
      : url.origin === origin ? url.pathname.replace(/^\/+/, '') : '';
    if (relative.startsWith('js/') && relative.endsWith('.js')) loaded.push(relative);
  });
  await page.clock.setFixedTime(new Date('2026-09-19T03:00:00Z'));
  await page.goto(localFile ? pathToFileURL(path.join(root, entry)).href : origin + '/' + entry);
  await ready(page);
  const expected = [...fs.readFileSync(path.join(root, entry),'utf8')
    .matchAll(/<script\b[^>]*src="(js\/[^"?]+)[^"]*"/g)].map(match => match[1]);
  assert.deepEqual(loaded, expected, 'Actual HTML script order');
  return {context, page, errors, server};
}

async function ready(page) {
  await page.waitForFunction(() => window.store?.writerLockHeld && window.UI && !document.body.inert);
  await page.evaluate(() => {
    // Bypass authentication only; UI, local writes and the sync engine remain real.
    cloudSync.spaceId = 'fixture-user'; cloudSync.pin = 'fixture-pin';
    return UI.renderSidebar();
  });
}

async function navigate(page, width) {
  if (width < 600) {
    const group = await page.evaluate(() => Object.entries(UI.getQuickMenuGroups())
      .find(([,value]) => value.items.some(item => item.id === 'aistudy'))[0]);
    await page.locator('.mobile-nav-btn[data-group="' + group + '"]').click();
    await page.locator('.quick-popover-item[data-filter="aistudy"]').click();
  } else await page.locator('.nav-item[data-filter="aistudy"]').first().click();
  await page.evaluate(() => UI.renderSidebar());
  assert.equal(await page.locator('#aistudy-view-container').isVisible(), true);
}

async function capture(page, name, selector) {
  snapshots[name] = await page.locator(selector).evaluate(el => ({html:el.outerHTML,
    width:Math.round(el.getBoundingClientRect().width), height:Math.round(el.getBoundingClientRect().height)}));
  if (baseline) assert.deepEqual(snapshots[name], baseline[name], name + ': changed from pre-refactor UI');
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const card = page => page.locator('[data-aistudy-id="fixture-ai"]');
const modalReady = page => page.waitForFunction(() => document.activeElement.id === 'aistudy-modal-title');

async function checkViews(app, entry, width) {
  const {page, server} = app;
  const before = await page.evaluate(key => ({raw:localStorage.getItem(key), writes:fixtureState.writes}), key);
  await navigate(page, width);
  assert.equal(await page.locator('.aistudy-card').count(), 1);
  for (const theme of ['light','dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    const prefix = entry + '-' + width + '-' + theme;
    await capture(page, prefix + '-list', '#aistudy-view-container');
    await card(page).locator('.aistudy-card-title').click();
    assert.equal(await page.locator('#aistudy-detail-modal').isVisible(), true);
    assert.equal(await page.locator('#aistudy-detail-modal-title').textContent(), note.title);
    assert.equal(await page.locator('.aistudy-detail-code code').textContent(), note.codeSnippet);
    assert.equal(await page.locator('.aistudy-detail-text br').count(), 1);
    assert.equal(await page.locator('.aistudy-tag-chip').last().textContent(), '<태그>');
    assert.equal(await page.locator('.aistudy-detail-link').getAttribute('href'), note.refUrl);
    await capture(page, prefix + '-detail', '#aistudy-detail-modal');
    await page.locator('[data-close-aistudy-detail-modal]').first().click();
    assert.equal(await page.locator('#aistudy-detail-modal').isVisible(), false);
  }
  await card(page).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#aistudy-detail-modal').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#aistudy-detail-modal').isVisible(), false);
  // Copy has a public UI method; current cards intentionally have no copy button.
  await page.evaluate(async () => {
    const button = document.createElement('button'); button.id = 'fixture-copy'; button.textContent = 'Copy';
    document.body.appendChild(button);
    await UI.copyAiStudySnippet('fixture-ai', button);
  });
  assert.deepEqual(await page.evaluate(() => fixtureState.copied), [note.codeSnippet]);
  assert.equal(await page.locator('#fixture-copy').textContent(), '✓복사됨!');
  await page.waitForFunction(() => document.getElementById('fixture-copy').textContent === 'Copy');
  await page.evaluate(async () => {
    fixtureState.failClipboard = true;
    await UI.copyAiStudySnippet('fixture-ai');
    document.getElementById('fixture-copy').remove();
  });
  assert.deepEqual(await page.evaluate(() => fixtureState.fallbackCopies), [note.codeSnippet]);
  assert.equal(await page.locator('body > textarea').count(), 0);
  assert.match(await page.locator('#toast-container .toast').last().textContent(), /복사되었어요/);
  await page.locator('#aistudy-search-input').fill('no-such-note');
  assert.match(await page.locator('#aistudy-empty-title').textContent(), /검색 조건/);
  await page.locator('#aistudy-search-input').fill('');
  await page.locator('[data-aistudy-cat="vibe"]').click();
  assert.equal(await page.locator('.aistudy-card').count(), 0);
  await page.locator('#btn-open-aistudy-modal').click();
  assert.equal(await page.locator('#aistudy-modal-category').inputValue(), 'vibe');
  await page.waitForFunction(() => document.activeElement.id === 'aistudy-modal-title');
  await capture(page, entry + '-' + width + '-new', '#aistudy-modal');
  await page.locator('[data-close-aistudy-modal]').first().click();
  await page.locator('[data-aistudy-cat="all"]').click();
  await card(page).locator('[data-action="edit-aistudy"]').click();
  await modalReady(page);
  for (const [id, value] of Object.entries({title:note.title, content:note.content, code:note.codeSnippet,
    tags:note.tags.join(', '), url:note.refUrl, category:note.category, lang:note.snippetLang})) {
    assert.equal(await page.locator('#aistudy-modal-' + id).inputValue(), value);
  }
  await capture(page, entry + '-' + width + '-edit', '#aistudy-modal');
  await page.locator('[data-close-aistudy-modal]').first().click();
  // Empty-state distinction and replacement-array behavior without persistence.
  await page.evaluate(() => {store.aiStudyNotes = []; store.setSaveStatus('confirmed'); UI.renderAiStudy();});
  assert.match(await page.locator('#aistudy-empty-title').textContent(), /등록된 AI/);
  await capture(page, entry + '-' + width + '-empty', '#aistudy-view-container');
  await page.evaluate(() => store.setSaveStatus('pending'));
  assert.match(await page.locator('#aistudy-empty-title').textContent(), /동기화 확인/);
  await capture(page, entry + '-' + width + '-unconfirmed', '#aistudy-view-container');
  await page.evaluate(note => {store.aiStudyNotes = [note]; UI.renderAiStudy();}, note);
  assert.equal(await page.locator('#aistudy-count-badge').textContent(), '총 1개');
  assert.deepEqual(await page.evaluate(key => ({raw:localStorage.getItem(key), writes:fixtureState.writes}), key), before);
  assert.equal(server.requests, 0, 'Viewing must not start cloud requests');
}

async function checkEdits(app, width) {
  const {page, server} = app;
  // A click must fire only one handler: duplicate registration would toggle twice.
  await card(page).locator('[data-action="toggle-pin-aistudy"]').click();
  assert.equal((await saved(page)).aiStudyNotes[0].pinned, true);
  await card(page).locator('[data-action="edit-aistudy"]').click();
  await modalReady(page);
  await page.locator('#aistudy-modal-title').fill('수정된 검증 노트');
  await page.locator('#aistudy-modal-form button[type="submit"]').click();
  assert.equal(await page.locator('#aistudy-modal').isVisible(), false);
  assert.equal((await saved(page)).aiStudyNotes[0].title, '수정된 검증 노트');
  await page.locator('#btn-open-aistudy-modal').click();
  await modalReady(page);
  await page.locator('#aistudy-modal-title').fill('새 검증 노트');
  await page.locator('#aistudy-modal-content').fill('새 원문');
  await page.locator('#aistudy-modal-form button[type="submit"]').click();
  let data = await saved(page);
  assert.equal(data.aiStudyNotes.length, 2, 'One submit must create exactly one note');
  const added = data.aiStudyNotes.find(n => n.id !== 'fixture-ai');
  assert.equal(added.content, '새 원문');
  const pending = data.localSync.pending;
  assert.ok(pending.length);
  await page.reload(); await ready(page); await navigate(page, width);
  data = await saved(page);
  assert.equal(data.aiStudyNotes.length, 2);
  assert.deepEqual(data.localSync.pending, pending);
  await card(page).locator('[data-action="delete-aistudy"]').click();
  data = await saved(page);
  assert.equal(data.aiStudyNotes.length, 1);
  assert.ok(data.deletedItemIds.includes('fixture-ai'));
  await page.reload(); await ready(page); await navigate(page, width);
  assert.equal(await card(page).count(), 0);
  assert.equal((await saved(page)).aiStudyNotes[0].id, added.id);
  // Inject failure into the real storage entry point; preserve both new/edit drafts.
  for (const editing of [false,true]) {
    if (editing) await page.locator('[data-action="edit-aistudy"]').click();
    else await page.locator('#btn-open-aistudy-modal').click();
    await modalReady(page);
    await page.locator('#aistudy-modal-title').fill('저장 실패 원문');
    await page.locator('#aistudy-modal-content').fill('보존해야 하는 입력');
    const raw = await page.evaluate(key => localStorage.getItem(key), key);
    await page.evaluate(() => {fixtureState.failSave = true; document.getElementById('toast-container').innerHTML = '';});
    await page.locator('#aistudy-modal-form button[type="submit"]').click();
    assert.equal(await page.locator('#aistudy-modal').isVisible(), true);
    assert.equal(await page.locator('#aistudy-modal-content').inputValue(), '보존해야 하는 입력',
      JSON.stringify({width, editing, state:await page.evaluate(() => ({...fixtureState,
        status:store.saveStatus, title:document.getElementById('aistudy-modal-title').value,
        notes:store.aiStudyNotes.map(n => n.title)}))}));
    assert.equal(await page.locator('.toast-success, .toast-info').count(), 0);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw);
    await page.evaluate(() => {fixtureState.failSave = false;});
    await page.locator('[data-close-aistudy-modal]').first().click();
  }
  assert.equal(server.puts, 0, 'Failed server reads must preserve local outbox without uploads');
}

async function checkSync(browser, entry) {
  const server = {requests:0, puts:0, body:null, version:1, failGET:false};
  const desktop = await openApp(browser, entry, 1280, false, server);
  const mobile = await openApp(browser, entry, 390, false, server);
  const sync = async page => {
    const result = await page.evaluate(async () => ({ok:await cloudSync.requestManualSync(),
      status:store.saveStatus, conflicts:store.localSync.conflicts}));
    assert.equal(result.ok, true, JSON.stringify(result));
  };
  try {
    await sync(desktop.page); await sync(mobile.page);
    await navigate(desktop.page, 1280); await navigate(mobile.page, 390);
    await desktop.page.evaluate(() => store.addAiStudyNote({title:'다른 기기의 AI 노트', content:'수신 원문'}));
    await sync(desktop.page); await sync(mobile.page);
    assert.equal(await mobile.page.locator('.aistudy-card').count(), 2);
    const received = mobile.page.locator('.aistudy-card').filter({hasText:'다른 기기의 AI 노트'});
    await received.locator('.aistudy-card-title').click();
    assert.equal(await mobile.page.locator('.aistudy-detail-text').textContent(), '수신 원문');
    await mobile.page.locator('[data-close-aistudy-detail-modal]').first().click();
    await received.locator('[data-action="edit-aistudy"]').click();
    await modalReady(mobile.page);
    await mobile.page.locator('#aistudy-modal-content').fill('모바일에서 수정한 원문');
    await mobile.page.locator('#aistudy-modal-form button[type="submit"]').click();
    await sync(mobile.page); await sync(desktop.page);
    await desktop.page.locator('.aistudy-card').filter({hasText:'다른 기기의 AI 노트'}).locator('.aistudy-card-title').click();
    assert.equal(await desktop.page.locator('.aistudy-detail-text').textContent(), '모바일에서 수정한 원문');
    assert.deepEqual((await saved(desktop.page)).aiStudyNotes, (await saved(mobile.page)).aiStudyNotes);
    assert.ok(server.puts > 0 && server.body.isEncrypted);
    assert.deepEqual(desktop.errors, []); assert.deepEqual(mobile.errors, []);
  } finally { await desktop.context.close(); await mobile.context.close(); }
}

(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    for (const entry of ['index.html','ToDoList.html']) {
      for (const width of [1280,390]) {
        const app = await openApp(browser, entry, width);
        try {
          await checkViews(app, entry, width);
          await checkEdits(app, width);
          assert.deepEqual(app.errors, []);
        } finally { await app.context.close(); }
      }
      const app = await openApp(browser, entry, 390, true);
      try {
        await navigate(app.page, 390);
        await card(app.page).locator('.aistudy-card-title').click();
        assert.equal(await app.page.locator('#aistudy-detail-modal').isVisible(), true);
        await app.page.locator('[data-close-aistudy-detail-modal]').first().click();
        await app.page.locator('#btn-open-aistudy-modal').click();
        assert.equal(await app.page.locator('#aistudy-modal').isVisible(), true);
        await app.page.locator('[data-close-aistudy-modal]').first().click();
        assert.deepEqual(app.errors, []);
      } finally { await app.context.close(); }
      await checkSync(browser, entry);
    }
    if (baselinePath && !baseline) {
      fs.mkdirSync(path.dirname(baselinePath), {recursive:true});
      fs.writeFileSync(baselinePath, JSON.stringify(snapshots,null,2));
    }
    console.log('PASS: both real HTML entries; desktop/mobile navigation; light/dark list/detail; keyboard; clipboard/fallback; search/categories/empty states; create/edit/pin/delete/reload; failed-save drafts; no viewing writes; file:// loading; encrypted two-context AI sync and received-note editing' +
      (baseline ? '; pre-refactor DOM/layout unchanged' : ''));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
