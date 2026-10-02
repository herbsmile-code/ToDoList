// Real pages in a fresh browser; only synthetic data and intercepted local assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.AI_TEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:4188';
const key = 'todolist_jy_data_v39';
const longText = '모바일에서도 긴 제목과 사유를 끝까지 확인할 수 있는 기록입니다 ' + 'LongUnbrokenText'.repeat(6);
const record = {title:longText, content:longText, createdAt:1789700400000, date:'2026-09-19'};
const data = {
  tasks:[{...record,id:'layout-task',category:'work',priority:'medium',description:longText,completed:false}],
  notes:[{...record,id:'layout-note',color:'pink'}],
  vacations:['full','half-am','half-pm','holiday'].map((type,i)=>({id:'layout-vac-'+i,type,
    amount:type==='holiday'?0:type==='full'?1:0.5,date:'2026-09-19',reason:longText,createdAt:i+1})),
  totalVacationDays:15,
  healthNotes:[{...record,id:'layout-health',folder:'general',hospital:longText,status:'in-progress'}],
  hobbyNotes:[{...record,id:'layout-hobby',folder:'general',place:longText,duration:'1시간 30분'}],
  sites:[{id:'layout-site',title:longText,memo:longText,url:'https://'+ 'long-domain-'.repeat(5)+'example.invalid',folder:'portal'}],
  aiStudyNotes:[{...record,id:'layout-ai',summary:longText,category:'prompt',tags:[]}],
  wishlist:[{...record,id:'layout-wish',name:longText,category:'bucket',memo:longText}],
  subscriptions:[{id:'layout-sub',name:longText,memo:longText,isActive:true,amount:10000,payDay:20,billingCycle:'monthly',icon:'📦'}],
  photos:[],projects:[],ledgerFiles:[],deletedItemIds:[],updatedAt:100,syncRevision:1
};

async function clippedText(page) {
  return page.evaluate(() => {
    const issues=[];
    const walker=document.createTreeWalker(document.querySelector('.content-area'),NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode, el=node.parentElement;
      if(!node.textContent.trim() || ['STYLE','SCRIPT','OPTION'].includes(el.tagName) || !el.getClientRects().length) continue;
      // Horizontal navigation and calendar grids intentionally have their own scrolling/compact previews.
      if(el.closest('.mobile-category-bar, .cal-days-grid, .cal-week-grid, .site-folders-bar, .health-folders-bar, .hobby-folders-bar, .aistudy-category-tabs, .vacation-month-tabs-bar')) continue;
      let left=0,right=innerWidth;
      for(let a=el;a;a=a.parentElement) {
        const css=getComputedStyle(a), box=a.getBoundingClientRect();
        if(['hidden','clip','auto','scroll'].includes(css.overflowX)) {
          left=Math.max(left,box.left);right=Math.min(right,box.right);
        }
      }
      const range=document.createRange();range.selectNodeContents(node);
      if([...range.getClientRects()].some(r=>r.width && (r.left<left-2 || r.right>right+2))) {
        issues.push({element:el.id||el.className||el.tagName,text:node.textContent.trim().slice(0,55)});
      }
    }
    return issues;
  });
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const audit=process.env.MOBILE_LAYOUT_AUDIT==='1';
  let cases=0;
  try {
    for(const entry of ['index.html','ToDoList.html']) {
      const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',timezoneId:'Asia/Seoul'});
      const errors=[];
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin) return route.fulfill({status:200,body:'',contentType:url.hostname==='fonts.googleapis.com'?'text/css':'application/javascript'});
        const filename=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\/+/,''));
        assert.ok(filename.startsWith(root+path.sep));
        const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
        return route.fulfill({body:fs.readFileSync(filename),contentType:types[path.extname(filename)]||'application/octet-stream'});
      });
      await context.addInitScript(({key,data})=>{
        localStorage.setItem(key,JSON.stringify(data));
        localStorage.setItem('todolist_jy_active_rtdb_url','https://sync.example.invalid');
        for(const name of ['projects_seeded_v3','aistudy_seeded_v1','subscriptions_seeded_v1']) localStorage.setItem('todolist_jy_'+name,'true');
      },{key,data});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-09-19T03:00:00Z'));
      await page.goto(origin+'/'+entry);
      await page.waitForFunction(()=>window.store?.writerLockHeld && window.UI && !document.body.inert);
      await page.addStyleTag({content:'*,*::before,*::after {animation:none !important;transition:none !important;}'});
      await page.evaluate(()=>{cloudSync.spaceId='layout-fixture';cloudSync.pin='fixture';store.selectedVacationYear='2026';store.selectedVacationMonth='9';});
      const before=await page.evaluate(key=>localStorage.getItem(key),key);
      for(const width of (audit?[320,390]:[320,360,390,430,768,1280])) {
        await page.setViewportSize({width,height:900});
        for(const theme of (audit?['light']:['light','dark'])) {
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          for(const filter of ['vacation','all','notes','sites','health','hobby','aistudy','wishlist','ledger']) {
            await page.evaluate(filter=>{store.activeFilter=filter;UI.renderTasks();},filter);
            const issues=await clippedText(page);
            const label=`${entry}/${width}/${theme}/${filter}`;
            if(audit) {if(issues.length) console.log(label,JSON.stringify(issues));}
            else assert.deepEqual(issues,[],label+' clipped text');
            if(filter==='vacation' && !audit) {
              for(const badge of await page.locator('.vacation-type-badge').all()) {
                assert.ok(await badge.evaluate(el=>{
                  const range=document.createRange();range.selectNodeContents(el);
                  return range.getBoundingClientRect().height<parseFloat(getComputedStyle(el).lineHeight)*1.5;
                }),label+' vacation badge wrapped vertically');
              }
            }
            cases++;
          }
        }
      }
      // Ordering controls share the vacation card: they must not squeeze its badge or reason.
      await page.setViewportSize({width:320,height:900});
      await page.evaluate(()=>{store.activeFilter='vacation';UI.renderTasks();});
      await page.locator('#list-order-vacations select').selectOption('manual');
      assert.equal(await page.locator('.vacation-item-card > .list-order-tools').count(),4);
      assert.deepEqual(await clippedText(page),[],'320px manual vacation ordering');
      await page.locator('#list-order-vacations select').selectOption('latest');
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before,'Rendering must not rewrite records');
      assert.deepEqual(errors,[]);
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>{document.documentElement.dataset.theme='light';store.activeFilter='vacation';UI.renderTasks();});
      fs.mkdirSync(path.join(root,'scratch','mobile-layout'),{recursive:true});
      await page.screenshot({path:path.join(root,'scratch','mobile-layout',entry+'.png'),fullPage:true});
      await page.locator('#vacation-history-list').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,'scratch','mobile-layout',entry+'-cards.png')});
      await context.close();
    }
    console.log(`PASS: ${cases} layout cases; synthetic storage preserved`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
