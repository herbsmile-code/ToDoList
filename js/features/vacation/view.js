/** Vacation views. Storage, calculations and shared events stay in the existing Store/UI. */
(function(window) {
  'use strict';

  window.createVacationView = ({ store, getRealTodayStr, escapeHTML }) => ({
    openVacationModal(vacationId = null) {
      const modal = document.getElementById('vacation-modal');
      const form = document.getElementById('vacation-form');
      const titleEl = document.getElementById('vacation-modal-title');
      const hiddenId = document.getElementById('vacation-edit-id');
      const typeSelect = document.getElementById('vacation-input-type');
      const dateInput = document.getElementById('vacation-input-date');
      const reasonInput = document.getElementById('vacation-input-reason');
      const submitBtn = document.getElementById('btn-submit-vacation');
      if (!modal || !form) return;
      form.reset();

      if (vacationId) {
        const vac = (store.vacations || []).find(v => v.id === vacationId);
        if (!vac) return;
        if (titleEl) titleEl.textContent = '🏖️ 연차 / 반차 내역 수정 💖';
        if (hiddenId) hiddenId.value = vac.id;
        if (typeSelect) typeSelect.value = vac.type || 'full';
        if (dateInput) dateInput.value = vac.date || getRealTodayStr();
        if (reasonInput) reasonInput.value = vac.reason || '';
        if (submitBtn) submitBtn.textContent = '연차 내역 수정하기 💾';
      } else {
        if (titleEl) titleEl.textContent = '🏖️ 연차 / 반차 등록 💖';
        if (hiddenId) hiddenId.value = '';
        if (dateInput) dateInput.value = getRealTodayStr();
        if (submitBtn) submitBtn.textContent = '연차 등록하기 💖';
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      if (dateInput) setTimeout(() => dateInput.focus(), 60);
    },

    closeVacationModal() {
      const modal = document.getElementById('vacation-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    openTotalVacationModal() {
      const modal = document.getElementById('total-vacation-modal');
      const input = document.getElementById('input-total-vacation-days');
      if (!modal) return;
      if (input) input.value = store.getVacationStats().total;
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeTotalVacationModal() {
      const modal = document.getElementById('total-vacation-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

  });
})(window);
