// Full HTML with actual login/sync/AI renderer, fresh browser, fake storage/server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const {source, localData, remoteData, key} = require('./ai-sync-harness.cjs');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function section(start,end) {
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a);return source.slice(a,b);
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    let cases=0;
    for(const entry of ['index.html','ToDoList.html']) {
      const context=await browser.newContext({serviceWorkers:'block'});
      await context.route('**/*',route=>route.abort());
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.setContent(read(entry).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,''));
      await page.addStyleTag({content:read('css/style.css').replace(/@import\s+url\([^)]*\);/g,'')});
      await page.evaluate(({local,remote,key})=>{
        const values=new Map(Object.entries({[key]:JSON.stringify(local),
          todolist_jy_active_rtdb_url:'https://example.invalid',todolist_jy_projects_seeded_v3:'true',
          todolist_jy_aistudy_seeded_v1:'true',todolist_jy_subscriptions_seeded_v1:'true'}));
        window.testState={values,remote,failGET:true,puts:0,toasts:[],bursts:0};
        Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))}});
        window.fetch=async(url,options={})=>{
          if(url.includes('/auth_registry/')) {
            if(options.method==='PUT')throw Error('Unexpected account registration');
            return {ok:true,status:200,headers:{get:()=>'auth-1'},json:async()=>({pinHash:'fake-auth-hash'})};
          }
          if(options.method==='PUT'){testState.puts++;throw Error('Conflict must not upload');}
          const status=testState.failGET?503:200;
          return {ok:status===200,status,headers:{get:()=>'1'},json:async()=>({isEncrypted:true,iv:'fake',payload:JSON.stringify(testState.remote)})};
        };
        window.E2EESecurityEngine={encrypt:async data=>({isEncrypted:true,iv:'fake',payload:JSON.stringify(data)}),decrypt:async data=>JSON.parse(data.payload)};
        window.normalizeArray=value=>Array.isArray(value)?value:[];
        window.escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        window.UI={renderSidebar(){},showToast(message,type){testState.toasts.push({message,type});},closeCloudModal(){}};
        window.sounds={playAdd(){},playDelete(){}};
        window.confetti={burst(){testState.bursts++;}};
        for(const el of document.querySelector('.content-area').children)el.style.display='none';
        document.getElementById('aistudy-view-container').style.display='flex';
      },{local:localData(),remote:remoteData(),key});
      await page.addScriptTag({content:read('js/utils/constants.js')});
      await page.addScriptTag({content:'(()=>{'+
        section('  const LocalSyncProtocol','  // IndexedDB Vault Storage Engine')+
        '\nconst cloudSync=new CloudSyncManager();window.cloudSync=cloudSync;'+
        section('  const INITIAL_HONEYMOON_DATA','  // 6. UI View Engine')+
        '\nstore.writerBlocked=false;store.activeFilter="aistudy";cloudSync.startRealtimePolling=()=>{};cloudSync.hashPin=async()=>"fake-auth-hash";'+
        '\ncloudSync.getAllVaultFiles=()=>{throw Error("Unexpected vault read during conflict");};'+
        '\nObject.assign(UI,{'+section('    renderAiStudyEmptyState()','    openAiStudyModal(')+'});'+
        '\nUI.renderTasks=()=>UI.renderAiStudy();UI.renderAiStudy();'+
        section('    // 2-Step Cloud Sync Form Submit','    const disconnectSyncBtn =')+'})()'});
      // The real form handler must report pending data rather than login+sync success.
      await page.evaluate(()=>{
        document.getElementById('sync-input-space-id').value='on3257';
        document.getElementById('sync-input-pin').value='fake-test-pin';
        document.getElementById('sync-2step-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      });
      await page.waitForFunction(()=>testState.toasts.length===1);
      assert.equal(await page.evaluate(()=>testState.toasts[0].type),'warning');
      assert.match(await page.evaluate(()=>testState.toasts[0].message),/아직 완료되지/);
      assert.equal(await page.evaluate(()=>testState.bursts),0);
      assert.equal(await page.locator('#manual-sync-state').textContent(),'동기화 실패');
      assert.match(await page.locator('#aistudy-empty-description').textContent(),/서버 확인이 완료되지/);
      // Network recovers but vacation conflict remains: receive AI, keep conflict visible.
      await page.evaluate(async()=>{testState.failGET=false;await cloudSync.requestManualSync();});
      assert.equal(await page.locator('#manual-sync-state').textContent(),'동기화 필요');
      assert.equal(await page.evaluate(()=>store.localSync.conflicts.length),1);
      for(const width of [320,390,768,1280]) {
        await page.setViewportSize({width,height:900});
        assert.equal(await page.locator('.aistudy-card').count(),1);
        assert.equal(await page.locator('.aistudy-card').isVisible(),true);
        assert.equal(await page.locator('#aistudy-count-badge').textContent(),'총 1개');
        assert.equal(await page.locator('#aistudy-empty-state').isVisible(),false);
        cases++;
      }
      await page.evaluate(()=>{store.aiStudySearchQuery='does-not-exist';UI.renderAiStudy();});
      assert.match(await page.locator('#aistudy-empty-title').textContent(),/검색 조건/);
      await page.evaluate(()=>{store.aiStudySearchQuery='';UI.renderAiStudy();});
      assert.equal(await page.locator('.aistudy-card').count(),1);
      const saved=await page.evaluate(key=>JSON.parse(testState.values.get(key)),key);
      assert.deepEqual(saved.aiStudyNotes,remoteData().aiStudyNotes);
      assert.equal(saved.totalVacationDays,15);
      assert.equal(await page.evaluate(()=>testState.puts),0);
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log(`PASS: ${cases} AI layouts; real login handler failure warning; recovery receives AI during unrelated conflict; search empty state; zero server writes`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
