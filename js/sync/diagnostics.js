// Bounded local diagnostics. Never accepts messages, URLs, IDs or user content.
(function(window) {
  'use strict';
  const key='todolist_jy_sync_diagnostics_v1', limit=60;
  const stages=['originals','download','decrypt','merge','files','upload','local-save','idle'];
  const kinds=['unknown','size-limit','request-option','permission','invalid-data','timeout','integrity','compatibility'];
  let memory=[], volatile=false;
  const number=value=>Number.isFinite(value) ? Math.max(0,Math.min(1e12,Math.floor(value))) : 0;
  function clean(value) {
    if(!value || !['failed','recovered','saved','deferred'].includes(value.outcome))return null;
    return {at:number(value.at),outcome:value.outcome,stage:stages.includes(value.stage)?value.stage:'idle',
      kind:kinds.includes(value.kind)?value.kind:'unknown',status:number(value.status),attempt:number(value.attempt),
      durationMs:number(value.durationMs),uploadBytes:number(value.uploadBytes),downloadBytes:number(value.downloadBytes)};
  }
  function read() {
    if(volatile)return memory.slice();
    try { const rows=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(rows))return rows.map(clean).filter(Boolean).slice(-limit); } catch {}
    return memory.slice();
  }
  window.SyncDiagnostics={
    record(value) {
      const entry=clean({...value,at:Date.now()});if(!entry)return;
      memory=[...read(),entry].slice(-limit);
      try {localStorage.setItem(key,JSON.stringify(memory));volatile=false;} catch {volatile=true;} // Never block user saves.
    },
    report() {return {format:'todolist-sync-diagnostics',version:1,createdAt:new Date().toISOString(),events:read()};},
    download() {
      const url=URL.createObjectURL(new Blob([JSON.stringify(this.report(),null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='todolist-sync-diagnostics-'+Date.now()+'.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  };
})(window);
