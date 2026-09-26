// Real entry HTML + native FileReader/download + controlled late reads.
// Every context and file is synthetic; all outbound requests are intercepted.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.AI_TEST_PLAYWRIGHT_PATH||'playwright');
const {openApp,ready,navigate,saved,card,folder,focused,closeNote,submitNote,initialData}=require('./health-ui.cjs');
const bytes=Buffer.from('%PDF-1.4\nSynthetic health attachment\n%%EOF');
const dataUrl='data:application/pdf;base64,'+bytes.toString('base64');
const seed={...initialData,healthFolders:[...initialData.healthFolders,{id:'checkup',name:'건강검진',icon:'🩺'}],
  healthNotes:initialData.healthNotes.map((n,i)=>({...n,folder:'checkup',fileName:i?'other.pdf':'original.pdf',fileSize:bytes.length,
    fileType:'application/pdf',fileUrl:dataUrl,fileMemo:'Original memo'}))};
const note=async(page,id='hnote-one')=>(await saved(page)).healthNotes.find(n=>n.id===id);
const open=async(page,id='hnote-one')=>{await card(page,id).locator('[data-action="edit-health-note"]').click();await focused(page);};
const choose=(page,name='replacement.pdf',buffer=bytes,mimeType='application/pdf')=>page.locator('#health-input-file').setInputFiles({name,mimeType,buffer});
const fileValue=page=>page.locator('#health-file-data-url').inputValue();
const raw=page=>page.evaluate(()=>localStorage.getItem('todolist_jy_data_v39'));
async function checkNative(app,width) {
  const {page}=app;await navigate(page,width);const original=await note(page);
  // Text-only edit and folder move must retain the complete original file.
  await open(page);await page.locator('#health-input-title').fill('Edited text');await submitNote(page);
  assert.equal((await note(page)).fileUrl,dataUrl);await open(page);
  await page.locator('#health-input-folder').selectOption('general');assert.equal(await page.locator('#health-checkup-file-section').isVisible(),true);
  await submitNote(page);assert.equal((await note(page)).fileUrl,dataUrl);
  const downloadWait=page.waitForEvent('download');await card(page).locator('a[download]').click();const download=await downloadWait;
  assert.equal(download.suggestedFilename(),'original.pdf');const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  assert.deepEqual(Buffer.concat(chunks),bytes);
  // Replacement is a draft until save; quota failure keeps both draft and original.
  await open(page);await choose(page,'new.pdf',Buffer.from('%PDF-1.4\nNew bytes'));
  await page.waitForFunction(()=>document.getElementById('health-file-data-name').value==='new.pdf');
  const replacement=await fileValue(page);assert.notEqual(replacement,dataUrl);
  await page.evaluate(()=>fixtureState.failSave=true);await submitNote(page);
  assert.equal(await page.locator('#health-note-modal').isVisible(),true);assert.equal((await note(page)).fileUrl,dataUrl);assert.equal(await fileValue(page),replacement);
  await page.evaluate(()=>fixtureState.failSave=false);await submitNote(page);assert.equal((await note(page)).fileUrl,replacement);
  await page.reload();await ready(page);await navigate(page,width);await open(page);assert.equal(await fileValue(page),replacement);
  // Remove/cancel does not erase a durable file. Remove/save does.
  await page.locator('#btn-health-clear-file').click();await closeNote(page);assert.equal((await note(page)).fileUrl,replacement);
  await open(page);await page.locator('#btn-health-clear-file').click();await page.evaluate(()=>fixtureState.failSave=true);await submitNote(page);
  assert.equal((await note(page)).fileUrl,replacement);assert.equal(await page.locator('#health-note-modal').isVisible(),true);
  await page.evaluate(()=>fixtureState.failSave=false);await submitNote(page);assert.equal((await note(page)).fileUrl,'');
  // Real browser quota, not the injected failure flag: 6 MiB encoded data exceeds localStorage.
  await open(page);await page.locator('#health-input-folder').selectOption('checkup');
  const before=await raw(page);await choose(page,'large.pdf',Buffer.alloc(6*1024*1024,65));
  await page.waitForFunction(()=>document.getElementById('health-file-data-name').value==='large.pdf');await submitNote(page);
  assert.equal(await page.locator('#health-note-modal').isVisible(),true);assert.equal(await raw(page),before);
  assert.equal(await page.locator('#health-file-data-name').inputValue(),'large.pdf');await closeNote(page);
  // A remote edit arriving while this form is open cannot be overwritten by its older draft.
  await open(page);await page.locator('#health-input-content').fill('Unsubmitted local draft');
  await page.evaluate(()=>store.updateHealthNote('hnote-one',{content:'Received remote content',fileUrl:'data:application/pdf;base64,UkVNT1RF',fileName:'remote.pdf'}));
  await submitNote(page);assert.equal(await page.locator('#health-note-modal').isVisible(),true);
  assert.equal(await page.locator('#health-input-content').inputValue(),'Unsubmitted local draft');
  assert.equal((await note(page)).content,'Received remote content');await closeNote(page);
  assert.equal((await saved(page)).notes[0].content,'Keep original');assert.equal(original.fileUrl,dataUrl);
}
async function checkRaces(app,width) {
  const {page}=app;await navigate(page,width);
  await page.evaluate(()=>{
    window.fixtureReaders=[];
    window.FileReader=class {
      readAsDataURL(file){this.file=file;this.readyState=1;this.finish=this.onload;this.fail=this.onerror;fixtureReaders.push(this);}
      abort(){this.readyState=2;this.onabort?.();}
    };
  });
  const finish=(i,url=dataUrl)=>page.evaluate(({i,url})=>{const reader=fixtureReaders[i];reader.result=url;reader.readyState=2;reader.finish();},{i,url});
  await open(page);const before=await raw(page);await choose(page,'pending.pdf');await submitNote(page);
  assert.equal(await page.locator('#health-note-modal').isVisible(),true);assert.equal(await raw(page),before);
  await closeNote(page);await open(page,'hnote-two');await finish(0);
  assert.equal(await page.locator('#health-file-data-name').inputValue(),'other.pdf');
  await choose(page,'first.pdf');await choose(page,'second.pdf');await finish(2);await finish(1,'data:application/pdf;base64,T0xEIQ==');
  assert.equal(await page.locator('#health-file-data-name').inputValue(),'second.pdf');assert.equal(await fileValue(page),dataUrl);
  await choose(page,'removed.pdf');await page.locator('#btn-health-clear-file').click();await finish(3);assert.equal(await fileValue(page),'');
  await closeNote(page);await open(page);await choose(page,'unreadable.pdf');await page.evaluate(()=>fixtureReaders[4].fail());
  await submitNote(page);assert.equal(await page.locator('#health-note-modal').isVisible(),true);assert.equal(await fileValue(page),dataUrl);
  await closeNote(page);await open(page);await choose(page,'bad.html',Buffer.from('<script>fixture</script>'),'text/html');
  await submitNote(page);assert.equal(await page.locator('#health-note-modal').isVisible(),true);assert.equal(await fileValue(page),dataUrl);
  assert.equal(await raw(page),before);await closeNote(page);
}
async function checkLegacyAndUnsafe(browser,entry) {
  const custom={...seed,healthNotes:[{...seed.healthNotes[0],fileName:undefined},
    {...seed.healthNotes[1],fileUrl:'javascript:window.fixtureExecuted=true',fileName:'unsafe.pdf'}]};
  const app=await openApp(browser,entry,390,false,null,custom),{page}=app;
  try {await navigate(page,390);assert.equal(await card(page,'hnote-two').locator('a[download]').count(),0);
    assert.match(await card(page,'hnote-two').textContent(),/차단/);assert.equal((await note(page,'hnote-two')).fileUrl,custom.healthNotes[1].fileUrl);
    await open(page);await page.locator('#health-input-content').fill('Legacy edited');await submitNote(page);
    assert.equal((await note(page)).fileName,undefined);assert.equal((await note(page)).fileUrl,dataUrl);assert.deepEqual(app.errors,[]);
  }finally{await app.context.close();}
}
async function checkSync(browser,entry) {
  const server={requests:0,puts:0,body:null,version:1,failGET:false};
  const a=await openApp(browser,entry,1280,false,server,seed),b=await openApp(browser,entry,390,false,server,seed);
  const sync=async page=>assert.equal(await page.evaluate(()=>cloudSync.requestManualSync()),true);
  try {
    await sync(a.page);await sync(b.page);await navigate(a.page,1280);await navigate(b.page,390);
    await open(a.page);await choose(a.page,'synced.pdf',Buffer.from('%PDF-1.4\nEncrypted round trip'));
    await a.page.waitForFunction(()=>document.getElementById('health-file-data-name').value==='synced.pdf');await submitNote(a.page);
    await sync(a.page);await sync(b.page);assert.equal((await note(b.page)).fileUrl,(await note(a.page)).fileUrl);
    await open(b.page);assert.equal(await fileValue(b.page),(await note(a.page)).fileUrl);await closeNote(b.page);
    assert.ok(server.body.isEncrypted);assert.ok(!JSON.stringify(server.body).includes('synced.pdf'));assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
  } finally {await a.context.close();await b.context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      for(const width of [1280,390]) {
        const app=await openApp(browser,entry,width,false,null,seed);
        try{await checkNative(app,width);assert.deepEqual(app.errors,[]);}finally{await app.context.close();}
      }
      const app=await openApp(browser,entry,390,false,null,seed);
      try{await checkRaces(app,390);assert.deepEqual(app.errors,[]);}finally{await app.context.close();}
      await checkLegacyAndUnsafe(browser,entry);await checkSync(browser,entry);
      const fileApp=await openApp(browser,entry,390,true,null,seed);
      try{await navigate(fileApp.page,390);await open(fileApp.page);assert.equal(await fileValue(fileApp.page),dataUrl);await closeNote(fileApp.page);assert.deepEqual(fileApp.errors,[]);}
      finally{await fileApp.context.close();}
    }
    console.log('PASS: health attachments; native byte-for-byte download, replacement/removal/cancel/restart, actual quota failure, stale form guard, delayed reads, unsupported links, legacy preservation, encrypted two-device transfer; both HTML, PC/mobile/file.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
