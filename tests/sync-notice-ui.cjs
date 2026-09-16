// Isolated browser, synthetic status only; no user profile/storage or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    const context = await browser.newContext({serviceWorkers:'block', viewport:{width:390,height:844}});
    await context.route('**/*', r => r.abort());
    const page = await context.newPage();
    await page.setContent('<button id="manual-sync-state">동기화 필요</button><div id="local-save-status" data-sync-notice="true" data-save-status="conflict" style="position:fixed;bottom:12px">충돌 안내</div>');
    await page.addStyleTag({content:fs.readFileSync('css/style.css','utf8').replace(/@import\s+url\([^)]*\);/g,'')});
    const notice = page.locator('#local-save-status');
    assert.equal(await notice.evaluate(el=>el.getBoundingClientRect().top),64);
    assert.equal(await notice.isVisible(),true);
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('local-save-status')).visibility==='hidden');
    assert.equal(await page.locator('#manual-sync-state').isVisible(),true);
    await notice.evaluate(el=>{el.textContent='충돌 안내';el.setAttribute('data-save-status','conflict');});
    assert.equal(await notice.isVisible(),false); // Same polling result must not flash again.
    await notice.evaluate(el=>{el.dataset.syncNotice='false';el.dataset.saveStatus='failed';el.textContent='로컬 저장 실패';});
    assert.equal(await notice.isVisible(),true); // Storage safety errors remain visible.
    console.log('PASS: mobile notice at top, dismissed after 3s, repeated status stays hidden, header and local failure remain visible');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
