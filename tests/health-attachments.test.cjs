// Deterministic reader races and fake DOM only; no files, network or user storage.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/features/health/attachments.js'),'utf8');
const original={fileName:'original.pdf',fileSize:8,fileType:'application/pdf',fileUrl:'data:application/pdf;base64,JVBERi0xLjQ=',fileMemo:'Original memo'};
const file=(name='new.pdf',type='application/pdf',size=8)=>({name,type,size});
function setup(note=original) {
  const elements=new Map(),readers=[],messages=[];
  const el=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},textContent:'',files:[]});return elements.get(id);};
  el('health-input-folder').value='checkup';
  class Reader {
    readAsDataURL(file){this.readyState=1;this.file=file;readers.push(this);this.finish=this.onload;this.fail=this.onerror;}
    abort(){this.readyState=2;this.onabort?.();}
  }
  const context={document:{getElementById:el},FileReader:Reader};context.window=context;vm.createContext(context);vm.runInContext(source,context);
  const api=context.createHealthAttachments({showError:m=>messages.push(m)});api.open(note);
  const choose=value=>{el('health-input-file').files=value?[value]:[];el('health-input-file').onchange();};
  const finish=(i,url='data:application/pdf;base64,TkVXIQ==')=>{readers[i].result=url;readers[i].readyState=2;readers[i].finish();};
  return {el,api,choose,finish,readers,messages,context};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('opening and cancelling preserve exact legacy fields without manufacturing replacements',()=>{
  for(const note of [original,{fileUrl:original.fileUrl},{fileName:'Metadata only'},{},null]) {
    const h=setup(note);assert.deepEqual(plain(h.api.changes()),{});h.choose(null);assert.deepEqual(plain(h.api.changes()),{});
    h.api.close();assert.equal(h.api.changes(),null);
  }
});
test('pending read blocks submit and keeps original hidden fields until a validated result arrives',()=>{
  const h=setup();h.choose(file());assert.equal(h.api.changes(),null);assert.equal(h.el('health-file-data-url').value,original.fileUrl);
  h.finish(0);assert.equal(h.api.changes().fileName,'new.pdf');assert.equal(h.api.changes().fileUrl,'data:application/pdf;base64,TkVXIQ==');
  assert.match(h.el('health-file-preview-status').textContent,/아직 저장 전/);
});
test('later selection wins even when cancelled readers deliver late callbacks',()=>{
  const h=setup();h.choose(file('first.pdf'));h.choose(file('second.pdf'));h.finish(1);h.finish(0,original.fileUrl);
  assert.equal(h.api.changes().fileName,'second.pdf');assert.equal(h.api.changes().fileUrl,'data:application/pdf;base64,TkVXIQ==');
});
test('clear while reading invalidates late completion; removal remains only a draft',()=>{
  const h=setup();h.choose(file());h.el('btn-health-clear-file').onclick();h.finish(0);
  assert.deepEqual(plain(h.api.changes()),{fileName:'',fileSize:0,fileType:'',fileUrl:'',fileMemo:''});
  assert.equal(original.fileName,'original.pdf');
});
test('close and reopen for another record rejects a previous reader and its late errors',()=>{
  const h=setup();h.choose(file());h.api.close();h.api.open({...original,fileName:'other.pdf'});h.finish(0);h.readers[0].fail();
  assert.equal(h.el('health-file-data-name').value,'other.pdf');assert.deepEqual(plain(h.api.changes()),{});
});
test('read errors and malformed results preserve originals, block misleading save and allow retry',()=>{
  for(const mode of ['error','abort','malformed','throw']) {
    const h=setup();if(mode==='throw')h.context.FileReader=class{readAsDataURL(){throw Error('Fixture read failure');}};
    h.choose(file());if(mode==='error')h.readers[0].onerror();if(mode==='abort')h.readers[0].onabort();if(mode==='malformed')h.finish(0,'javascript:alert(1)');
    assert.equal(h.api.changes(),null,mode);assert.equal(h.el('health-file-data-url').value,original.fileUrl,mode);
    h.el('btn-health-clear-file').onclick();assert.equal(h.api.changes().fileUrl,'');
  }
  const h=setup();h.choose(file());h.readers[0].onerror();h.choose(file('retry.pdf'));h.finish(1);assert.equal(h.api.changes().fileName,'retry.pdf');
});
test('unsupported and oversized files cannot replace an existing draft',()=>{
  for(const candidate of [file('page.html','text/html'),file('report.pdf','image/svg+xml'),file('large.pdf','application/pdf',15*1024*1024+1)]) {
    const h=setup();h.choose(candidate);assert.equal(h.readers.length,0);assert.equal(h.api.changes(),null);assert.equal(h.el('health-file-data-url').value,original.fileUrl);
  }
});
test('safe download URLs exclude executable or external URLs without changing stored data',()=>{
  const h=setup();
  for(const value of ['javascript:alert(1)','https://example.invalid/file','data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml;base64,PHN2Zz4=',original.fileUrl+'" onclick="alert(1)','data:application/pdf;base64,!@#$'])assert.equal(h.context.safeHealthAttachmentUrl(value),'');
  for(const mime of ['application/pdf','image/png','image/jpeg','application/octet-stream','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) {
    const url='data:'+mime+';base64,AA==';assert.equal(h.context.safeHealthAttachmentUrl(url),url);
  }
  const large='data:application/pdf;base64,'+'A'.repeat(4*1024*1024);assert.equal(h.context.safeHealthAttachmentUrl(large),large);
});
test('moved attachments stay visible outside checkup; unchanged fields and memo stay original',()=>{
  const h=setup();h.el('health-input-folder').value='general';h.el('health-input-folder').onchange();
  assert.equal(h.el('health-checkup-file-section').style.display,'block');assert.deepEqual(plain(h.api.changes()),{});
  h.el('health-input-file-memo').value='Edited memo';assert.deepEqual(plain(h.api.changes()),{fileMemo:'Edited memo'});
});
