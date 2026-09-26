/** Vacation views. Storage, calculations and shared events stay in the existing Store/UI. */
(function(window) {
  'use strict';

  window.createVacationView = ({ store, getRealTodayStr, escapeHTML }) => ({
    renderVacation() {
      const stats = store.getVacationStats();
      const totalEl = document.getElementById('vacation-stat-total');
      const usedEl = document.getElementById('vacation-stat-used');
      const remainEl = document.getElementById('vacation-stat-remain');
      const holidayEl = document.getElementById('vacation-stat-holiday');
      const barEl = document.getElementById('vacation-progress-bar');
      const textEl = document.getElementById('vacation-progress-text');
      const listEl = document.getElementById('vacation-history-list');
      const emptyEl = document.getElementById('vacation-empty-state');
      const countEl = document.getElementById('vacation-history-count');
      const yearSelect = document.getElementById('vacation-filter-year');

      if (totalEl) totalEl.innerHTML = `${stats.total.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (usedEl) usedEl.innerHTML = `${stats.used.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (remainEl) remainEl.innerHTML = `${stats.remain.toFixed(1)}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">일</span>`;
      if (holidayEl) holidayEl.innerHTML = `${stats.holidayCount}<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-left: 2px;">건</span>`;
      if (barEl) barEl.style.width = `${stats.pct}%`;
      if (textEl) textEl.textContent = `${stats.pct}% (${stats.used.toFixed(1)}일 / ${stats.total.toFixed(1)}일) 사용 완료`;

      // 1. Current Selected Filters (이번 달 기본 선택 & 통계 카드 필터)
      const currentSelectedYear = store.selectedVacationYear || String(new Date().getFullYear());
      const currentSelectedMonth = store.selectedVacationMonth || String(new Date().getMonth() + 1);
      const currentTypeFilter = store.vacationTypeFilter || 'all';

      // Update Active State of Top 4 Stat Boxes
      document.querySelectorAll('.clickable-vstat-box').forEach(box => {
        const f = box.dataset.vtypeFilter;
        if (f === currentTypeFilter || (currentTypeFilter === 'all' && f === 'all')) {
          box.classList.add('active');
        } else {
          box.classList.remove('active');
        }
      });

      // 2. Populate Year Select Options dynamically from data
      if (yearSelect) {
        const yearsSet = new Set(['2026', '2025', String(new Date().getFullYear())]);
        if (currentSelectedYear !== 'all') yearsSet.add(currentSelectedYear);
        (store.vacations || []).forEach(v => {
          if (v.date) {
            const y = v.date.split('-')[0];
            if (y) yearsSet.add(y);
          }
        });
        const sortedYears = Array.from(yearsSet).sort().reverse();
        yearSelect.innerHTML = `<option value="all" ${currentSelectedYear === 'all' ? 'selected' : ''}>전체 년도</option>` + sortedYears.map(y => `<option value="${y}" ${y === currentSelectedYear ? 'selected' : ''}>${y}년</option>`).join('');
      }

      // 3. Update Month Pills Active Class
      document.querySelectorAll('#vacation-month-pills .vac-m-pill').forEach(pill => {
        if (pill.dataset.vMonth === currentSelectedMonth) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });

      // 4. Filter Vacations by Year & Month
      let periodFiltered = (store.vacations || []).slice();
      if (currentSelectedYear !== 'all') {
        periodFiltered = periodFiltered.filter(v => v.date && v.date.startsWith(currentSelectedYear));
      }
      if (currentSelectedMonth !== 'all') {
        const mStr = String(currentSelectedMonth).padStart(2, '0');
        periodFiltered = periodFiltered.filter(v => {
          if (!v.date) return false;
          const parts = v.date.split('-');
          return parts[1] === mStr;
        });
      }

      // Calculate period-wide stats before type filtering
      let periodUsedDays = 0;
      let periodHolidayCount = 0;
      periodFiltered.forEach(v => {
        if (v.type === 'holiday' || v.amount === 0) {
          periodHolidayCount += 1;
          return;
        }
        periodUsedDays += store.getVacationAmount(v);
      });

      // 5. Apply Top Stat Box Type Filter (총 발생연차 / 사용한 연차 / 휴가 사용)
      let filtered = periodFiltered.slice();
      let typeFilterLabel = '';
      if (currentTypeFilter === 'used') {
        filtered = filtered.filter(v => v.type === 'full' || v.type === 'half-am' || v.type === 'half-pm');
        typeFilterLabel = ' [연차/반차만 보기]';
      } else if (currentTypeFilter === 'holiday') {
        // 사용자의 요구사항: 휴가사용(별도) 선택 시 전체 년도(모든 월 포함) 사용내역 모두 표시
        filtered = (store.vacations || []).filter(v => v.type === 'holiday' || v.amount === 0);
        typeFilterLabel = ' [전체 기간 휴가]';
      }

      // 6. 사용날짜(date) 최신순 자동 정렬 (등록일과 무관하게 사용날짜 순으로 정렬)
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt));

      // Update Month Summary Banner (예: 8월 총 연차 2.0개 사용 / 휴가 1개 사용)
      const sumPeriodTitleEl = document.getElementById('vac-summary-period-title');
      const sumDetailsEl = document.getElementById('vac-summary-details');
      const sumBadgeEl = document.getElementById('vac-summary-badge');

      const periodLabel = currentSelectedMonth === 'all'
        ? `${currentSelectedYear === 'all' ? '전체' : currentSelectedYear + '년'}`
        : `${currentSelectedMonth}월`;

      if (currentTypeFilter === 'holiday') {
        if (sumPeriodTitleEl) sumPeriodTitleEl.textContent = '🏖️ 전체 기간(모든 년도/월) 휴가 현황:';
        if (sumDetailsEl) sumDetailsEl.textContent = `총 휴가 ${filtered.length}개 사용 완료 (0일 차감 / 개인 일정)`;
        if (sumBadgeEl) sumBadgeEl.textContent = `총 ${filtered.length}건`;
        if (countEl) countEl.textContent = `전체 휴가 ${filtered.length}건 (0일 차감)`;
      } else {
        if (sumPeriodTitleEl) {
          sumPeriodTitleEl.textContent = `🌸 ${periodLabel} 사용 현황${typeFilterLabel}:`;
        }
        if (sumDetailsEl) {
          sumDetailsEl.textContent = `총 연차 ${periodUsedDays.toFixed(1)}개 사용 / 휴가 ${periodHolidayCount}개 사용`;
        }
        if (sumBadgeEl) {
          sumBadgeEl.textContent = `총 ${filtered.length}건`;
        }
        if (countEl) {
          const holidayNote = periodHolidayCount > 0 ? ` · 휴가 ${periodHolidayCount}건` : '';
          countEl.textContent = `총 ${filtered.length}건 (연차 ${periodUsedDays.toFixed(1)}일${holidayNote})`;
        }
      }

      if (!listEl) return;

      if (filtered.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
      } else {
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = filtered.map(v => {
          const isHoliday = (v.type === 'holiday');
          const isFull = (v.type === 'full');
          const isAm = (v.type === 'half-am');

          let badgeClass = 'half-pm';
          let badgeLabel = '🌇 오후 반차 (0.5일)';
          if (isHoliday) {
            badgeClass = 'badge-vacation-holiday';
            badgeLabel = '🏖️ 휴가 (0일 / 개인 확인용)';
          } else if (isFull) {
            badgeClass = 'full';
            badgeLabel = '🌴 연차 (1.0일 차감)';
          } else if (isAm) {
            badgeClass = 'half-am';
            badgeLabel = '🌅 오전 반차 (0.5일 차감)';
          }

          const dateStr = v.date ? v.date.replace(/-/g, '.') : '';

          return `
            <div class="vacation-item-card" data-vacation-id="${v.id}">
              <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1;">
                <span class="vacation-type-badge ${badgeClass}">${badgeLabel}</span>
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                    <span>${dateStr}</span>
                    ${v.reason ? `<span style="font-weight: 500; font-size: 0.85rem; color: var(--text-muted);">| ${escapeHTML(v.reason)}</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <button type="button" class="task-action-btn edit-btn" data-action="edit-vacation" data-vacation-id="${v.id}" title="연차 기록 수정">
                  ✏️
                </button>
                <button type="button" class="task-action-btn delete-btn" data-action="delete-vacation" data-vacation-id="${v.id}" title="연차 기록 삭제">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      this.renderSidebar();
    },

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
