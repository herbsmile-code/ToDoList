/* One-time, file-backed memo transfer. Business state remains in the existing Store. */
(function (root) {
  'use strict';
  const KEY = 'todolist_jy_data_v39';
  const FORMAT = 'todolist-memo-export';
  const records = ['notes', 'aiStudyNotes', 'healthNotes', 'hobbyNotes', 'sites'];
  const folders = {healthNotes:'healthFolders', hobbyNotes:'hobbyFolders', sites:'siteFolders'};

  function validate(data, p) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('백업 데이터 형식을 확인할 수 없습니다.');
    p.slots(data); // Reject duplicate IDs and malformed lists instead of dropping items.
    if (data.deletedItemIds !== undefined && (!Array.isArray(data.deletedItemIds) || data.deletedItemIds.some(id => typeof id !== 'string'))) {
      throw new Error('삭제 기록 형식을 확인할 수 없습니다.');
    }
    return data;
  }

  function exportFile(raw, p, targetFingerprint = null) {
    if (typeof raw !== 'string') throw new Error('저장된 원본이 없습니다. 메모 저장 상태를 먼저 확인해 주세요.');
    validate(JSON.parse(raw), p);
    return {format:FORMAT, version:1, storageKey:KEY, createdAt:new Date().toISOString(),
      targetFingerprint, raw, checksum:p.hash(raw)};
  }

  function parseFile(value, p) {
    const bundle = typeof value === 'string' ? JSON.parse(value) : p.clone(value);
    if (!bundle || bundle.format !== FORMAT || bundle.version !== 1 || bundle.storageKey !== KEY ||
        typeof bundle.raw !== 'string' || bundle.checksum !== p.hash(bundle.raw) ||
        (bundle.targetFingerprint !== null && !/^[a-f0-9]{64}$/.test(bundle.targetFingerprint))) {
      throw new Error('메모 백업 파일이 아니거나 파일 내용이 손상되었습니다.');
    }
    return {bundle, data:validate(JSON.parse(bundle.raw), p)};
  }

  function counts(data) {
    return Object.fromEntries(records.map(field => [field, (data[field] || []).length]));
  }

  // First input wins the original ID. Other bodies get deterministic copy IDs.
  // A repeated import reuses those IDs; tombstones are never cleared.
  function union(field, inputs, deleted, p) {
    const rows = new Map(), mappings = inputs.map(() => new Map());
    const occupied = new Map(inputs.flat().map(row => [row.id, row]));
    const equal = (a,b) => p.hash({...a,id:null}) === p.hash({...b,id:null});
    inputs.forEach((input,index) => input.forEach(item => {
      let id = item.id;
      if (deleted.has(id) || (rows.has(id) && !equal(rows.get(id),item))) {
        const base = 'memo-copy-' + p.hash([field,item]);
        id = base;
        let suffix = 0;
        while (deleted.has(id) || (rows.has(id) && !equal(rows.get(id),item)) ||
               (occupied.has(id) && !equal(occupied.get(id),item))) id = base + '-' + (++suffix);
      }
      if (!rows.has(id)) rows.set(id,{...p.clone(item),id});
      mappings[index].set(item.id,id);
    }));
    return {rows:[...rows.values()], mappings};
  }

  function plan(web, remote, source, meta, p) {
    [web,remote,source].forEach(data => validate(data,p));
    const merged = p.merge(web,remote,meta);
    const data = merged.data;
    const memoFields = new Set([...records,...Object.values(folders)]);
    const otherConflicts = [];
    // The user chooses these separately after seeing the conflict count.
    // Both complete versions are also kept in the required protection file.
    for (const conflict of merged.conflicts) {
      const [field,id] = JSON.parse(conflict.key);
      if (memoFields.has(field)) continue;
      otherConflicts.push(field);
      if (p.lists.includes(field)) {
        const own = (web[field] || []).find(row => row.id === id);
        data[field] = (data[field] || []).filter(row => row.id !== id);
        if (own) data[field].push(p.clone(own));
      } else if (Object.hasOwn(web,field)) data[field] = p.clone(web[field]);
      else delete data[field];
    }
    const deleted = new Set([...(web.deletedItemIds || []),...(remote.deletedItemIds || [])]);
    data.deletedItemIds = [...deleted];
    const allDeleted = new Set([...deleted,...(source.deletedItemIds || [])]);
    const inputs = [source,web,remote];
    for (const field of records) {
      const folderField = folders[field];
      let maps;
      if (folderField) {
        const result = union(folderField,inputs.map(d => d[folderField] || []),allDeleted,p);
        data[folderField] = result.rows; maps = result.mappings;
      }
      const lists = inputs.map((d,i) => (d[field] || []).map(row => {
        const copy = p.clone(row);
        if (maps?.[i].has(copy.folder)) copy.folder = maps[i].get(copy.folder);
        return copy;
      }));
      data[field] = union(field,lists,allDeleted,p).rows;
    }
    validate(data,p);
    return {data, summary:{source:counts(source), before:counts(web), after:counts(data),
      otherConflicts:[...new Set(otherConflicts)]}};
  }

  async function writeVerified(handle, text) {
    const writable = await handle.createWritable();
    try { await writable.write(text); await writable.close(); }
    catch (error) { try { await writable.abort(); } catch (_) {} throw error; }
    if (await (await handle.getFile()).text() !== text) throw new Error('백업 파일을 다시 읽어 확인하지 못했습니다. 이전을 중단했습니다.');
  }

  function bind({store,cloud,p,key}) {
    const byId = id => document.getElementById(id);
    const exportButton = byId('btn-memo-file-export'), input = byId('memo-transfer-input');
    const applyButton = byId('btn-memo-file-apply'), status = byId('memo-transfer-status');
    if (!exportButton || exportButton.dataset.bound) return;
    exportButton.dataset.bound = 'true';
    let selected = null, selectionVersion = 0;
    const tell = message => { status.textContent = message; };
    const total = counts => Object.values(counts).reduce((a,b)=>a+b,0);
    const picker = name => {
      if (!root.showSaveFilePicker) throw new Error('파일 저장 확인을 위해 PC의 최신 Edge 또는 Chrome에서 진행해 주세요.');
      return root.showSaveFilePicker({suggestedName:name, types:[{description:'메모 백업 JSON',accept:{'application/json':['.json']}}]});
    };
    exportButton.addEventListener('click', async () => {
      try {
        // Read exactly the existing key. Export performs no Store or cloud writes.
        const raw = localStorage.getItem(key);
        const target = cloud.spaceId && cloud.pin ? p.hash([cloud.activeUrl,cloud.getStorageKey()]) : null;
        const bundle = exportFile(raw,p,target);
        const handle = await picker('todolist-local-memos-' + Date.now() + '.json');
        await writeVerified(handle,JSON.stringify(bundle,null,2));
        if (localStorage.getItem(key) !== raw) {
          tell('백업 파일은 저장했지만 그 사이 데이터가 변경되었습니다. 최신 내용을 포함하도록 ① 백업을 다시 저장해 주세요.');
          return;
        }
        tell('원본 백업 저장·확인 완료 (' + total(counts(JSON.parse(raw))) + '개). 웹사이트에서 이 파일을 가져오세요.');
      } catch (error) { tell(error.name === 'AbortError' ? '파일 저장을 취소했습니다. 원본은 변경하지 않았습니다.' : error.message); }
    });
    input.addEventListener('change', async () => {
      const version = ++selectionVersion;
      selected = null; applyButton.disabled = true;
      try {
        const file = input.files[0]; if (!file) return;
        const parsed = parseFile(await file.text(),p);
        if (version !== selectionVersion) return;
        selected = parsed.bundle;
        const c = counts(parsed.data);
        tell('선택한 백업: 메모 ' + c.notes + ' / AI 스터디 ' + c.aiStudyNotes + ' / 건강 ' + c.healthNotes + ' / 취미 ' + c.hobbyNotes + ' / 사이트 ' + c.sites + '개.');
        applyButton.disabled = false;
      } catch (error) { if (version === selectionVersion) tell(error.message); }
    });
    applyButton.addEventListener('click', async () => {
      if (!selected) return;
      applyButton.disabled = true; input.disabled = true;
      try {
        if (root.location.protocol !== 'https:' || root.location.hostname !== 'herbsmile-code.github.io' || !root.location.pathname.startsWith('/ToDoList/')) {
          throw new Error('가져오기는 GitHub 웹사이트에서 진행해 주세요. 로컬 원본은 그대로 보존합니다.');
        }
        const source = selected;
        const handle = await picker('todolist-before-transfer-' + Date.now() + '.json');
        tell('웹·서버 원본을 확인하고 보호 백업을 저장하고 있습니다.');
        const result = await cloud.requestMemoTransfer(source, async protection => {
          if (protection.summary.otherConflicts.length && !root.confirm('메모 외 다른 항목에도 충돌이 있습니다 (' + protection.summary.otherConflicts.length + '종류). 현재 웹에서 보이는 값을 유지하고 서버 원본은 보호 백업에 보관할까요? 취소하면 어떤 데이터도 변경하지 않습니다.')) {
            throw new Error('이전을 취소했습니다. 원본은 변경하지 않았습니다.');
          }
          const text = JSON.stringify(protection,null,2);
          await writeVerified(handle,text);
          return p.hash(text);
        });
        tell('웹에 메모 가져오기·저장 확인 완료 (' + total(result.summary.after) + '개). Firebase 저장을 확인하고 있습니다.');
        const confirmed = await cloud.requestManualSync();
        tell(confirmed ? '메모 이전 및 Firebase 저장 확인 완료. 이제 웹사이트에서 작성하세요. 두 백업 파일은 보관해 주세요.' :
          '웹의 이 브라우저에는 이전·저장되었습니다. Firebase 저장은 아직 확인되지 않았습니다. 백업과 미전송 기록을 유지하며, 상단 동기화 상태를 확인해 주세요.');
        try { root.UI.renderTasks(); root.UI.renderSidebar(); } catch (_) {}
      } catch (error) { tell(error.name === 'AbortError' ? '이전을 취소했습니다. 원본은 변경하지 않았습니다.' : error.message); }
      finally { applyButton.disabled = !selected; input.disabled = false; }
    });
  }
  root.MemoTransfer = {exportFile,parseFile,plan,writeVerified,bind};
})(typeof window !== 'undefined' ? window : globalThis);
