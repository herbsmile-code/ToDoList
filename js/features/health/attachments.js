/** Health attachment drafts only. Durable data and upload remain in the central Store. */
(function(window) {
  'use strict';
  const allowedTypes = new Set(['application/pdf','image/png','image/jpeg','application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-hwp','application/haansofthwp','application/vnd.hancom.hwp','application/hwp','application/octet-stream']);
  const allowedNames = /\.(pdf|png|jpe?g|xlsx?|docx?|hwp)$/i;
  const safeUrl = value => {
    if (typeof value !== 'string') return '';
    const comma = value.indexOf(',');
    if (comma < 0 || comma > 160) return '';
    const header = /^data:([^;,]+);base64$/i.exec(value.slice(0,comma));
    if (!header || !allowedTypes.has(header[1].toLowerCase())) return '';
    const body = value.slice(comma+1);
    return body.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(body) ? value : '';
  };
  window.safeHealthAttachmentUrl = safeUrl;
  window.createHealthAttachments = ({showError}) => {
    let session = null, generation = 0, reader = null;
    const el = id => document.getElementById(id);
    const cancelRead = () => {
      generation++;
      const old = reader; reader = null;
      if (old && old.readyState === 1) { try { old.abort(); } catch {} }
    };
    const syncFields = () => {
      if (!session) return;
      const file = session.draft || session.original;
      for (const [suffix,key] of [['name','fileName'],['size','fileSize'],['type','fileType'],['url','fileUrl']]) {
        const field = el('health-file-data-'+suffix); if (field) field.value = file[key] || '';
      }
      const clear = el('btn-health-clear-file');
      if (clear) clear.style.display = file.fileName || file.fileUrl || session.reading || session.error ? 'inline-flex' : 'none';
      updateSection();
    };
    const updateSection = () => {
      if (!session) return;
      const file = session.draft || session.original, section = el('health-checkup-file-section');
      if (section) section.style.display = el('health-input-folder')?.value === 'checkup' || file.fileName || file.fileUrl || session.reading || session.error ? 'block' : 'none';
    };
    const status = message => {
      const preview = el('health-file-preview-status');
      if (preview) { preview.textContent = message; preview.style.display = message ? 'block' : 'none'; }
    };
    const fail = message => {
      if (!session) return;
      session.reading = false; session.error = true; syncFields();
      status(message); showError(message);
    };
    const close = () => { session = null; cancelRead(); };
    return {
      open(note = null) {
        close();
        session = {original:note || {}, draft:null, reading:false, error:false};
        const input = el('health-input-file'), memo = el('health-input-file-memo');
        if (input) input.value = '';
        if (memo) memo.value = note?.fileMemo || '';
        status(note?.fileName ? '현재 첨부: 📑 ' + note.fileName : '');
        syncFields();
        const folder = el('health-input-folder');
        if (folder) folder.onchange = updateSection;
        const clear = el('btn-health-clear-file');
        if (clear) clear.onclick = () => {
          if (!session) return;
          cancelRead();
          session.draft = {fileName:'',fileSize:0,fileType:'',fileUrl:'',fileMemo:''};
          session.reading = false; session.error = false;
          if (input) input.value = ''; if (memo) memo.value = '';
          syncFields(); status('첨부 제거 예정 · 저장하면 반영됩니다.');
        };
        if (input) input.onchange = () => {
          if (!session) return;
          const file = input.files && input.files[0];
          if (!file) return; // Cancelling the picker preserves the current draft.
          cancelRead(); session.reading = false; session.error = false;
          if (!allowedNames.test(file.name) || (file.type && !allowedTypes.has(file.type.toLowerCase()))) {
            input.value = ''; fail('지원하지 않는 첨부 형식입니다. 기존 첨부는 유지됩니다. 다른 파일을 선택해 주세요.'); return;
          }
          if (file.size > 15 * 1024 * 1024) {
            input.value = ''; fail('15MB를 넘는 파일은 선택할 수 없습니다. 실제 저장은 브라우저의 남은 공간에 따라 제한됩니다.'); return;
          }
          const token = generation, activeSession = session;
          const current = () => session === activeSession && token === generation;
          session.reading = true; syncFields(); status('파일 읽는 중 · 완료 후 저장할 수 있습니다.');
          try {
            const pending = new FileReader(); reader = pending;
            pending.onload = () => {
              if (!current()) return;
              reader = null;
              if (!safeUrl(pending.result)) { fail('첨부파일 내용을 읽지 못했습니다. 기존 첨부는 유지됩니다. 다시 선택해 주세요.'); return; }
              session.draft = {fileName:file.name,fileSize:file.size,fileType:file.type,fileUrl:pending.result};
              session.reading = false; session.error = false; syncFields();
              status('선택됨: 📑 ' + file.name + ' (' + (file.size/1024).toFixed(1) + ' KB) · 아직 저장 전입니다. 전체 저장 공간에 따라 저장이 제한될 수 있습니다.');
            };
            pending.onerror = pending.onabort = () => {
              if (!current()) return;
              reader = null; fail('첨부파일 읽기가 중단되었습니다. 기존 첨부는 유지됩니다. 다시 선택해 주세요.');
            };
            pending.readAsDataURL(file);
          } catch {
            if (current()) { reader = null; fail('첨부파일을 읽지 못했습니다. 기존 첨부는 유지됩니다. 다시 선택해 주세요.'); }
          }
        };
      },
      changes() {
        if (!session) return null;
        if (session.reading || session.error) {
          showError(session.reading ? '첨부파일을 읽고 있습니다. 완료 후 저장해 주세요.' : '첨부파일을 다시 선택하거나 제거한 뒤 저장해 주세요.');
          return null;
        }
        const changes = session.draft ? {...session.draft} : {};
        const memo = el('health-input-file-memo')?.value || '';
        if (session.draft || memo !== (session.original.fileMemo || '')) changes.fileMemo = memo;
        return changes;
      },
      close
    };
  };
})(window);
