// Display order preferences only. Record order is saved by the existing Store.
(function(window) {
  'use strict';
  const modes = new Map();
  const key = field => 'todolist_jy_list_order_' + field;
  const mode = field => {
    if (!modes.has(field)) {
      try { modes.set(field, localStorage.getItem(key(field)) === 'manual' ? 'manual' : 'latest'); }
      catch { modes.set(field, 'latest'); }
    }
    return modes.get(field);
  };
  const setMode = (field, value) => {
    const next = value === 'manual' ? 'manual' : 'latest';
    try { localStorage.setItem(key(field), next); } catch { return false; }
    modes.set(field, next); return true;
  };
  const registered = row => {
    const numeric = Number(row.createdAt);
    const value = Number.isFinite(numeric) ? numeric : Date.parse(row.createdAt);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const compareRegistered = (a,b) => registered(b) - registered(a);
  const latest = rows => (rows || []).slice().sort(compareRegistered);
  const sort = (field, rows) => mode(field) === 'manual' ? (rows || []).slice() : latest(rows);
  function mount({field,rootId,selector,idAttribute,render,tabItems=false}, store, UI) {
    const root = document.getElementById(rootId);
    if (!root) return;
    let toolbar = document.getElementById('list-order-' + field);
    if (!toolbar) {
      toolbar = document.createElement('div');toolbar.id = 'list-order-' + field;
      toolbar.className = 'list-order-toolbar';
      toolbar.innerHTML = '<label>자료 순서 <select aria-label="자료 정렬 방식"><option value="latest">최신 등록순</option><option value="manual">직접 정렬</option></select></label><span class="list-order-hint"></span><span class="list-order-result" role="status" aria-live="polite"></span>';
      root.before(toolbar);
      toolbar.querySelector('select').addEventListener('change', event => {
        if (!setMode(field,event.target.value)) {
          event.target.value = mode(field);UI.showToast('정렬 설정을 저장하지 못했습니다. 기존 설정을 유지합니다.','danger');return;
        }
        if (field === 'tasks') {
          store.sortBy = mode(field) === 'manual' ? 'manual' : 'createdAt';
          const select = document.getElementById('sort-select');if(select)select.value = store.sortBy;
        }
        render();
      });
    }
    const select = toolbar.querySelector('select');
    toolbar.querySelector('.list-order-result').textContent = '';
    const custom = field === 'tasks' && !['createdAt','manual'].includes(store.sortBy);
    if(field === 'tasks' && !select.querySelector('[value="custom"]')) {
      const option=document.createElement('option');option.value='custom';option.disabled=true;
      option.textContent='위에서 선택한 정렬';select.appendChild(option);
    }
    select.value = custom ? 'custom' : mode(field);
    const manual = mode(field) === 'manual' && (field !== 'tasks' || store.sortBy === 'manual');
    const hint = toolbar.querySelector('.list-order-hint');
    hint.textContent = manual ? '손잡이를 끌거나 위·아래 버튼으로 이동 · 정렬 방식은 이 기기에 적용' : custom ? '위에서 선택한 기준으로 정렬 중' : '처음 등록한 순서 · 수정해도 위치 유지';
    const cards = () => Array.from(root.querySelectorAll(selector)).filter(el => el.getAttribute(idAttribute));
    const ownerCard = control => control.closest(selector) || control.closest('.list-order-tab')?.querySelector(selector);
    const id = el => el?.getAttribute(idAttribute);
    const visibleIds = () => cards().map(id);
    let binding = root._listOrder;
    if (!binding) {
      binding = root._listOrder = {drag:null};
      const finish = (target,after) => {
        const drag = binding.drag;binding.clear();
        if (!drag || !target || drag.id === target) return;
        if (mode(field) !== 'manual' || JSON.stringify(visibleIds()) !== JSON.stringify(drag.ids) ||
            !store.reorderVisibleList(field,drag.ids,drag.id,target,after,drag.raw)) {
          UI.showToast(store.localSaveError?.message || '목록이 변경되어 순서를 저장하지 않았습니다. 최신 목록에서 다시 이동해 주세요.','danger');
          render();return;
        }
        render();
        toolbar.querySelector('.list-order-result').textContent = '순서 저장됨';
        const moved = cards().find(el => id(el) === drag.id);
        (tabItems ? moved?.parentElement : moved)?.querySelector('[data-order-handle]')?.focus({preventScroll:true});
      };
      binding.clear = () => {
        binding.drag = null;
        for(const card of cards()) card.classList.remove('list-order-dragging','list-order-before','list-order-after');
      };
      const begin = handle => {
        if (mode(field) !== 'manual') return false;
        const card = ownerCard(handle);if(!card)return false;
        binding.drag = {id:id(card),ids:visibleIds(),raw:store._lastLocalRaw};
        card.classList.add('list-order-dragging');return true;
      };
      const targetAt = (x,y) => {
        const hit = document.elementFromPoint(x,y);
        const card = hit && ownerCard(hit);
        if (!card || !root.contains(card)) return null;
        const rect = card.getBoundingClientRect();
        // Vertical placement works for rows and wrapped card grids.
        return {card,after:y > rect.top + rect.height / 2};
      };
      const mark = target => {
        for(const card of cards())card.classList.remove('list-order-before','list-order-after');
        if(target && id(target.card) !== binding.drag?.id)target.card.classList.add(target.after?'list-order-after':'list-order-before');
      };
      root.addEventListener('dragstart', event => {
        const handle=event.target.closest('[data-order-handle]');
        if(!handle || !begin(handle)){event.preventDefault();return;}
        event.stopPropagation();event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('application/x-todolist-order',field);
      });
      root.addEventListener('dragover', event => {
        if(!binding.drag)return;event.preventDefault();event.stopPropagation();
        event.dataTransfer.dropEffect='move';mark(targetAt(event.clientX,event.clientY));
      });
      root.addEventListener('drop', event => {
        if(!binding.drag)return;event.preventDefault();event.stopPropagation();
        const target=targetAt(event.clientX,event.clientY);finish(id(target?.card),target?.after);
      });
      root.addEventListener('dragend',()=>binding.clear());
      root.addEventListener('pointerdown',event=>{
        const handle=event.target.closest('[data-order-handle]');
        if(event.pointerType==='mouse'||!handle||!begin(handle))return;
        event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);
        binding.drag.pointer=event.pointerId;
      });
      root.addEventListener('pointermove',event=>{
        if(binding.drag?.pointer!==event.pointerId)return;
        event.preventDefault();mark(targetAt(event.clientX,event.clientY));
        const scroller=root.closest('.main-content') || document.scrollingElement;
        if(event.clientY<70)scroller.scrollBy(0,-18);
        else if(event.clientY>window.innerHeight-70)scroller.scrollBy(0,18);
      });
      root.addEventListener('pointerup',event=>{
        if(binding.drag?.pointer!==event.pointerId)return;
        const target=targetAt(event.clientX,event.clientY);finish(id(target?.card),target?.after);
      });
      // Native mouse drag emits pointercancel when HTML drag takes over.
      root.addEventListener('pointercancel',event=>{
        if(binding.drag?.pointer===event.pointerId)binding.clear();
      });
      root.addEventListener('click',event=>{
        const control=event.target.closest('[data-order-step],[data-order-handle]');if(!control)return;
        event.preventDefault();event.stopPropagation();
        if(!control.hasAttribute('data-order-step'))return;
        const rows=cards(),card=ownerCard(control),step=Number(control.dataset.orderStep);
        const target=rows[rows.indexOf(card)+step];
        if(target && begin(control))finish(id(target),step>0);
      },true);
      root.addEventListener('keydown',event=>{
        if(event.key==='Escape'){binding.clear();return;}
        const handle=event.target.closest('[data-order-handle]');
        if(!handle || !['ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();const rows=cards(),step=event.key==='ArrowUp'?-1:1;
        const target=rows[rows.indexOf(ownerCard(handle))+step];
        if(target&&begin(handle))finish(id(target),step>0);
      });
    }
    binding.clear();
    cards().forEach((card,index,rows)=>{
      card.removeAttribute('draggable');
      let owner=card;
      if(tabItems && manual) {
        owner=card.closest('.list-order-tab');
        if(!owner){owner=document.createElement('div');owner.className='list-order-tab';card.before(owner);owner.appendChild(card);}
      }
      let controls=owner.querySelector(':scope > .list-order-tools');
      if(!manual){controls?.remove();return;}
      if(!controls){
        controls=document.createElement('div');controls.className='list-order-tools';
        controls.innerHTML='<button type="button" data-order-handle draggable="true" aria-label="순서 이동 손잡이" title="끌어서 이동 · 키보드 위/아래로 이동">⠿</button><button type="button" data-order-step="-1" aria-label="위로 이동">↑</button><button type="button" data-order-step="1" aria-label="아래로 이동">↓</button>';
        if(tabItems)owner.appendChild(controls);else owner.prepend(controls);
      }
      controls.querySelector('[data-order-step="-1"]').disabled=index===0;
      controls.querySelector('[data-order-step="1"]').disabled=index===rows.length-1;
    });
  }
  const configs = [
    ['tasks','renderTasks','tasks-list-container','.task-card','data-id'],
    ['notes','renderNotes','notes-grid-container','.note-card','data-note-id'],
    ['photos','renderPhotos','photos-grid-container','.polaroid-card','data-photo-id'],
    ['wishlist','renderWishlist','wishlist-grid-container','.wish-card','data-wish-id'],
    ['sites','renderSites','sites-grid-container','.site-card','data-site-id'],
    ['aiStudyNotes','renderAiStudy','aistudy-grid-container','.aistudy-card','data-aistudy-id'],
    ['healthNotes','renderHealth','health-notes-grid-container','.health-note-card','data-health-note-id'],
    ['hobbyNotes','renderHobby','hobby-notes-grid-container','.hobby-note-card','data-hobby-note-id'],
    ['vacations','renderVacation','vacation-history-list','.vacation-item-card','data-vacation-id'],
    ['subscriptions','renderSubscriptions','subscriptions-grid','.subscription-card','data-sub-id'],
    ['projects','renderProject','project-tabs-container','.project-tab-pill','data-id',true],
    ['ledgerFiles','renderLedger','ledger-files-grid','.file-card','data-ledger-id']
  ];
  function install(UI,store) {
    for(const [field,method,rootId,selector,idAttribute,tabItems] of configs) {
      const original=UI[method];if(!original)continue;
      UI[method]=function(...args){
        const result=original.apply(this,args);
        const decorate=()=>{
          // Kanban keeps its status columns; direct ordering is performed in list view.
          if(field==='tasks' && store.viewMode!=='list'){
            const bar=document.getElementById('list-order-tasks');if(bar)bar.hidden=true;return;
          }
          mount({field,rootId,selector,idAttribute,tabItems,render:()=>UI[method]()},store,UI);
          const bar=document.getElementById('list-order-'+field);if(bar)bar.hidden=false;
        };
        if(result?.then)return result.then(value=>{decorate();return value;});
        decorate();return result;
      };
    }
  }
  window.ListOrder={sort,latest,compareRegistered,mode,setMode,mount,install};
})(window);
