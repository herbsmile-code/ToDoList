// Synthetic devices/server only. Never opens a user profile, backup, or Firebase.
const assert = require('node:assert/strict');
const {harness, fixture, key, source} = require('./sync-harness.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const localData = () => ({...clone(fixture), aiStudyNotes: [], totalVacationDays: 15});
const remoteData = () => ({...clone(fixture), aiStudyNotes: [{id:'remote-ai', title:'Fake AI note',
  content:'Original remote AI body', category:'llm', summary:'Fake summary', tags:[], createdAt:1}], totalVacationDays:20});
function server(data = remoteData()) {
  return {data:clone(data), rev:1, failGET:false, failPUT:false, beforeGET:null, beforePUT:null,
    auth:{pinHash:'fake-auth-hash'}, authStatus:200, registerStatus:200,
    attach(h) {
      h.context.cloudSync.hashPin = async () => 'fake-auth-hash';
      h.context.cloudSync.startRealtimePolling = () => {};
      h.context.fetch = async (url, options = {}) => {
        h.requests.push({url, options});
        if (url.includes('/auth_registry/')) {
          const put = options.method === 'PUT';
          if (put) assert.equal(options.headers['if-match'], 'auth-1');
          const status = put ? this.registerStatus : this.authStatus;
          const data = clone(this.auth);
          return {ok:status===200, status, headers:{get:()=>'auth-1'}, json:async()=>data};
        }
        const put = options.method === 'PUT';
        if (!put && this.beforeGET) {const fn=this.beforeGET;this.beforeGET=null;await fn(h);}
        if (put && this.beforePUT) {const fn=this.beforePUT;this.beforePUT=null;await fn(h);}
        const status = put ? this.failPUT ? 503 : options.headers['if-match'] !== String(this.rev) ? 412 : 200 : this.failGET ? 503 : 200;
        if (put && status===200) {
          const body=JSON.parse(options.body);assert.equal(body.isEncrypted,true);
          this.data=JSON.parse(body.payload);this.rev++;
          assert.equal(Object.hasOwn(this.data,'localSync'),false);
        }
        const body={isEncrypted:true,iv:'fake',payload:JSON.stringify(this.data)},etag=String(this.rev);
        return {ok:status===200,status,headers:{get:()=>etag},json:async()=>body};
      };
      return h;
    }
  };
}
const client = (s, raw = JSON.stringify(localData())) => s.attach(harness(raw));
const saved = h => JSON.parse(h.values.get(key));
const puts = h => h.requests.filter(r => r.options.method==='PUT' && r.url.includes('/spaces/'));
const sync = h => {h.context.cloudSync.retryAfter=0;return h.context.cloudSync.fetchLatestFromCloud(true);};
module.exports = {server,client,saved,puts,sync,clone,key,source,localData,remoteData};
