// Isolated browser storage and synthetic PDF only; all network is intercepted.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {openApp,ready,navigate,card,focused,submitNote,initialData} = require('./health-ui.cjs');
const key = 'todolist_jy_data_v39';
const bytes = Buffer.alloc(4.5 * 1024 * 1024, 65);
bytes.write('%PDF-1.4\nSynthetic upload regression\n');
const expected = 'data:application/pdf;base64,' + bytes.toString('base64');
const seed = {...initialData, healthFolders:[...initialData.healthFolders,{id:'checkup',name:'건강검진'}]};
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    for (const entry of ['index.html','ToDoList.html']) for (const width of [1280,390]) {
      const app = await openApp(browser,entry,width,false,null,seed), {page} = app;
      try {
        await navigate(page,width);
        await card(page).locator('[data-action="edit-health-note"]').click(); await focused(page);
        await page.locator('#health-input-folder').selectOption('checkup');
        await page.locator('#health-input-file').setInputFiles({name:'synthetic-large.pdf',mimeType:'application/pdf',buffer:bytes});
        await page.waitForFunction(()=>document.getElementById('health-file-data-name').value==='synthetic-large.pdf');
        await submitNote(page);
        await page.waitForFunction(()=>document.getElementById('health-note-modal').style.display==='none',null,{timeout:12000});
        assert.equal(await page.evaluate(()=>store.healthNotes.find(n=>n.id==='hnote-one').fileUrl),expected);
        assert.ok((await page.evaluate(key=>localStorage.getItem(key).length,key)) < 100000);
        await page.reload();await ready(page);await navigate(page,width);
        assert.equal(await page.evaluate(()=>store.healthNotes.find(n=>n.id==='hnote-one').fileUrl),expected);
        const pending=page.waitForEvent('download');await card(page).locator('a[download]').click();
        const download=await pending,chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
        assert.deepEqual(Buffer.concat(chunks),bytes);assert.deepEqual(app.errors,[]);
        console.log('PASS large health upload, restart and exact download:',entry,width);
      } finally {await app.context.close();}
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
