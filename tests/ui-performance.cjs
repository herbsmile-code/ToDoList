// Synthetic UI benchmark/regression check. No user data or real network/IDB.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {harness,fixture,source}=require('./sync-harness.cjs');
const before=execFileSync('git',['show','21a47af:js/app.js'],{encoding:'utf8'});
function section(code,start,end) {
  const a=code.indexOf(start),b=code.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a);return code.slice(a,b);
}
function setup(code) {
  const h=harness(JSON.stringify(fixture),{code}),elements=new Map();
  h.context.document.getElementById=id=>{
    if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){}},innerHTML:'',textContent:'',value:''});
    return elements.get(id);
  };
  h.context.document.querySelector=()=>null;
  h.context.document.querySelectorAll=()=>[];
  h.context.UI.updateNavHighlight=()=>{};
  h.context.escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  h.reads=0;
  h.context.cloudSync.getAllVaultFiles=async()=>{h.reads++;return[{id:'fake-file',size:1000}];};
  const start=code.includes('    renderSidebar() {')?'    renderSidebar() {':'    async renderSidebar() {';
  vm.runInContext('Object.assign(UI,{'+section(code,start,'    // --- 5-Emoji Quick Menu Engine ---')+'});',h.context);
  if (code.includes('...window.createAiStudyView(')) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/features/ai-study/view.js'),'utf8'),h.context);
    vm.runInContext('Object.assign(UI,createAiStudyView({store,DEFAULT_AI_STUDY_CATEGORIES,escapeHTML,showToast:(...args)=>UI.showToast(...args)}));',h.context);
  }
  if (code.includes('    renderAiStudyEmptyState()')) {
    vm.runInContext('Object.assign(UI,{'+section(code,'    renderAiStudyEmptyState()','    openAiStudyModal(')+'});',h.context);
  }
  if (code.includes('    openAiStudyDetailModal(')) {
    vm.runInContext('Object.assign(UI,{'+section(code,'    openAiStudyDetailModal(','    closeAiStudyDetailModal(')+'});',h.context);
  }
  h.elements=elements;return h;
}
async function sidebar(code) {
  const h=setup(code),raw=[...h.values];
  await Promise.all(Array.from({length:10},()=>h.context.UI.renderSidebar()));
  assert.deepEqual([...h.values],raw);
  return {h,reads:h.reads,html:h.elements.get('category-nav-list').innerHTML};
}
function ai(code) {
  const h=setup(code);h.context.UI.renderSidebar=()=>{};
  h.store.aiStudyNotes=Array.from({length:200},(_,i)=>({id:'fake-'+i,title:'Note '+i,
    category:'llm',summary:'Fake summary',content:'Keep body',codeSnippet:'<&>'.repeat(3000),
    tags:['test'],refUrl:'https://example.invalid',createdAt:i+1}));
  const original=JSON.stringify(h.store.aiStudyNotes),times=[];
  h.context.UI.renderAiStudy(); // Warm-up.
  for(let i=0;i<7;i++){
    const start=performance.now();h.context.UI.renderAiStudy();times.push(performance.now()-start);
  }
  h.context.UI.openAiStudyDetailModal('fake-0');
  assert.match(h.elements.get('aistudy-detail-modal-content').innerHTML,/&lt;&amp;&gt;/);
  assert.match(h.elements.get('aistudy-detail-modal-content').innerHTML,/Keep body/);
  assert.match(h.elements.get('aistudy-detail-modal-content').innerHTML,/example.invalid/);
  assert.equal(JSON.stringify(h.store.aiStudyNotes),original);
  return {medianMs:+times.sort((a,b)=>a-b)[3].toFixed(2),html:h.elements.get('aistudy-grid-container').innerHTML};
}
(async()=>{
  const oldSidebar=await sidebar(before),newSidebar=await sidebar(source);
  assert.equal(oldSidebar.html,newSidebar.html);
  assert.equal(oldSidebar.reads,30);assert.equal(newSidebar.reads,1);
  // A state change while a read is pending must trigger a final fresh render.
  const h=setup(source);let release;
  h.context.cloudSync.getAllVaultFiles=()=>{
    h.reads++;return h.reads===1?new Promise(r=>{release=r;}):Promise.resolve([]);
  };
  const work=h.context.UI.renderSidebar();await Promise.resolve();
  h.store.notes.push({id:'new',content:'Latest'});h.context.UI.renderSidebar();release([]);
  await work;
  assert.equal(h.reads,2);assert.equal(h.elements.get('nav-count-notes').textContent,2);
  h.context.cloudSync.getAllVaultFiles=async()=>{throw Error('Fake IDB error');};
  await h.context.UI.renderSidebar();
  assert.match(h.elements.get('category-nav-list').innerHTML,/끄적끄적|My notes/);
  // Only the active view dispatcher and sidebar run after login.
  const calls=[];
  for(const name of ['renderTasks','renderSidebar','renderPhotos','renderNotes','renderWishlist','renderLedger',
    'renderSubscriptions','renderCalendarMonth','renderCalendarWeek','renderVacation','renderSites','renderAiStudy'])h.context.UI[name]=()=>calls.push(name);
  h.context.cloudSync.renderAllViews();assert.deepEqual(calls,['renderTasks','renderSidebar']);
  const oldAI=ai(before),newAI=ai(source);assert.equal(oldAI.html,newAI.html);
  console.log(JSON.stringify({fixture:'200 AI notes, 9000-character snippets',
    beforeMedianMs:oldAI.medianMs,afterMedianMs:newAI.medianMs,
    sidebarReadsFor10Requests:{before:oldSidebar.reads,after:newSidebar.reads},
    checks:'identical list HTML, full detail retained, concurrent refresh, failed vault read, active view only, no storage writes'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
