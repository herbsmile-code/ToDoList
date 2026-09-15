// Isolated browser UI test: fresh context, fake storage/files/Firebase, no real requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.MEMO_TEST_PLAYWRIGHT_PATH || 'playwright');
const {fixture,key} = require('./sync-harness.cjs');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const app = read('js/app.js'), html = read('index.html');
const section = html.match(/<section aria-labelledby="memo-transfer-heading"[\s\S]*?<\/section>/)[0];

(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*',route => route.request().isNavigationRequest()
      ? route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><style>'+read('css/style.css')+'</style><main style="max-width:460px;padding:16px">'+section+'</main><button id="btn-manual-sync"><span id="manual-sync-state"></span></button>'})
      : route.abort());
    const page = await context.newPage();
    await page.goto('https://herbsmile-code.github.io/ToDoList/'); // Fulfilled above; never fetched.
    await page.evaluate(({fixture,key}) => {
      window.testState={files:[],puts:0,failPUT:false,corruptBackup:false,server:structuredClone(fixture),rev:1};
      const values=new Map(Object.entries({[key]:JSON.stringify(fixture),
        todolist_jy_space_id:'fixture-user',todolist_jy_pin:'fixture-pin',todolist_jy_active_rtdb_url:'https://example.invalid',
        todolist_jy_projects_seeded_v3:'true',todolist_jy_aistudy_seeded_v1:'true',todolist_jy_subscriptions_seeded_v1:'true'}));
      window.testState.values=values;
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))}});
      window.UI={renderTasks(){},renderSidebar(){},showToast(){}};
      window.normalizeArray=v=>Array.isArray(v)?v:[];
      window.E2EESecurityEngine={encrypt:async data=>({isEncrypted:true,iv:'fake',payload:JSON.stringify(data)}),decrypt:async data=>data.isEncrypted?JSON.parse(data.payload):data};
      window.fetch=async (url,options={})=>{
        const s=window.testState,put=options.method==='PUT';
        const status=put && s.failPUT?503:200;
        if(put){s.puts++;if(status===200){if(options.headers['if-match']!==String(s.rev))throw Error('etag mismatch');s.server=JSON.parse(JSON.parse(options.body).payload);s.rev++;}}
        const data=structuredClone(s.server),etag=String(s.rev);
        return {ok:status===200,status,headers:{get:()=>etag},json:async()=>data};
      };
      window.showSaveFilePicker=async()=>{
        const file={text:'',closed:false};window.testState.files.push(file);
        return {createWritable:async()=>({write:async text=>{file.text=text;},close:async()=>{file.closed=true;},abort:async()=>{}}),
          getFile:async()=>({text:async()=>window.testState.corruptBackup?'damaged':file.text})};
      };
    },{fixture,key});
    await page.addScriptTag({content:read('js/utils/constants.js')});
    await page.addScriptTag({content:read('js/memo-transfer.js')});
    await page.addScriptTag({content:'(()=>{'+app.slice(app.indexOf('  const LocalSyncProtocol'),app.indexOf('  // IndexedDB Vault Storage Engine'))+
      '\nconst cloudSync=new CloudSyncManager();window.cloudSync=cloudSync;'+
      app.slice(app.indexOf('  const INITIAL_HONEYMOON_DATA'),app.indexOf('  // 6. UI View Engine'))+
      '\nstore.writerBlocked=false;store.writerLockHeld=true;cloudSync.getAllVaultFiles=async()=>[];'+
      'window.testProtocol=LocalSyncProtocol;MemoTransfer.bind({store,cloud:cloudSync,p:LocalSyncProtocol,key:STORAGE_KEY});})()'});
    await page.locator('#btn-memo-file-export').click();
    await page.waitForFunction(()=>document.querySelector('#memo-transfer-status').textContent.includes('원본 백업 저장·확인 완료'));
    const exported=await page.evaluate(()=>JSON.parse(testState.files[0].text));
    assert.equal(exported.raw,JSON.stringify(fixture));
    const source={...fixture,notes:[...fixture.notes,{id:'D',content:'Fake latest memo 💖'}]};
    const bundle=await page.evaluate(data=>MemoTransfer.exportFile(JSON.stringify(data),testProtocol),source);
    await page.locator('#memo-transfer-input').setInputFiles({name:'fake-export.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
    await page.locator('#btn-memo-file-apply').click();
    await page.waitForFunction(()=>document.querySelector('#memo-transfer-status').textContent.includes('메모 이전 및 Firebase 저장 확인 완료'));
    assert.equal(await page.evaluate(()=>testState.server.notes.some(n=>n.id==='D')),true);
    assert.equal(await page.evaluate(()=>store.localSync.pending.length),0);
    assert.equal(await page.evaluate(()=>testState.files[1].closed),true);
    const protection=await page.evaluate(()=>JSON.parse(testState.files[1].text));
    assert.equal(protection.webRaw,JSON.stringify(fixture));
    assert.equal(Object.hasOwn(await page.evaluate(()=>testState.server),'localSync'),false);
    // A second import fails at file verification, before touching the browser Store.
    const rawBefore=await page.evaluate(key=>testState.values.get(key),key);
    const putsBefore=await page.evaluate(()=>testState.puts);
    await page.evaluate(()=>{testState.corruptBackup=true;});
    await page.locator('#btn-memo-file-apply').click();
    await page.waitForFunction(()=>document.querySelector('#memo-transfer-status').textContent.includes('이전을 중단'));
    assert.equal(await page.evaluate(key=>testState.values.get(key),key),rawBefore);
    assert.equal(await page.evaluate(()=>testState.puts),putsBefore);
    for(const width of [390,1280]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.locator('#btn-memo-file-export').isVisible(),true);
      assert.equal(await page.locator('#memo-transfer-input').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    console.log('PASS: fake-file export, choose/import, backup readback, conditional sync, failed-backup guard, 390/1280px layout');
    await context.close();
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
