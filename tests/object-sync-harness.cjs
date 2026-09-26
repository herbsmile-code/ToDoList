// Isolated synthetic RTDB contract, native AES-GCM, no external requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {harness,fixture}=require('./sync-harness.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
function backend(data=fixture) {
  const s={body:clone(data),rev:1,objects:new Map(),requests:[],failObjects:false,failHead:false,loseHead:false,beforeHead:null,beforeObject:null};
  s.attach=(data=fixture,{vault=[],objects=true}={})=>{
    const h=harness(JSON.stringify(data)),c=h.context,cloud=c.cloudSync;h.vault=clone(vault);
    Object.assign(c,{crypto:webcrypto,TextDecoder,btoa,atob});
    for(const f of ['js/services/crypto.js','js/sync/object-transport.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);
    c.fetch=async(url,options={})=>{
      const put=options.method==='PUT',isObject=url.includes('/sync_objects/'),probe=url.endsWith('/iv.json');
      const key=new URL(url).pathname;
      s.requests.push({url,put,isObject,probe,bytes:options.body?.length||0});
      let status=200,body;
      if(isObject) {
        if(put && s.beforeObject){const fn=s.beforeObject;s.beforeObject=null;await fn(h);}
        if(put){
          if(options.headers['if-match']!=='null_etag')throw Error('Unconditional object write');
          status=s.failObjects?503:s.objects.has(key)?412:204;
          if(status===204)s.objects.set(key,JSON.parse(options.body));
        }
        body=s.objects.get(key)||null;
      } else if(probe)body=s.body?.iv||null;
      else {
        if(put && s.beforeHead){const fn=s.beforeHead;s.beforeHead=null;await fn(h);}
        if(put) {
          if(!options.headers['if-match'])throw Error('Unconditional head write');
          status=s.failHead?503:options.headers['if-match']!==String(s.rev)?412:204;
          if(status===204){s.body=JSON.parse(options.body);s.rev++;}
          if(s.loseHead && status===204){s.loseHead=false;throw Error('Lost head acknowledgement');}
        }
        body=s.body;
      }
      return {ok:status>=200&&status<300,status,headers:{get:()=>String(s.rev)},json:async()=>clone(body)};
    };
    cloud.getAllVaultFiles=async()=>clone(h.vault);
    cloud.saveVaultFiles=async(files,strict,guard)=>{const done=cloud.beginVaultWrite();try{if(guard&&!guard())throw Error('Stale files');h.vault=clone(files);}finally{done();}};
    if(objects)cloud.objectTransport=c.createSyncObjectTransport({protocol:c.protocol,crypto:c.E2EESecurityEngine,request:(...args)=>cloud.requestCloud(...args)});
    return h;
  };
  return s;
}
const sync=h=>{h.context.cloudSync.retryAfter=0;return h.context.cloudSync.fetchLatestFromCloud(true);};
const manifest=(s,h)=>h.context.E2EESecurityEngine.decrypt(s.body.payload.manifest,'fixture-pin');
module.exports={backend,sync,manifest,fixture,clone};
