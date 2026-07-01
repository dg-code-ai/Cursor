const STORAGE_KEY = 'weightlifting-log-v1';

const LIFT_LABELS = {
  snatch: '스내치',
  cj: 'C&J',
  accessory: '보조',
};

let state = loadState();
let draftSession = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    tm: { snatch: 100, cj: 120 },
    sessions: [],
    weeklyAdjustments: {},
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function roundWeight(n) {
  return Math.round(n * 2) / 2;
}

function getTM(lift) {
  if (lift === 'snatch') return state.tm.snatch;
  if (lift === 'cj') return state.tm.cj;
  return 0;
}

function weightToPercent(lift, weight) {
  const tm = getTM(lift);
  if (!tm || !weight) return 0;
  return roundWeight((weight / tm) * 100);
}

function percentToWeight(lift, percent) {
  const tm = getTM(lift);
  if (!tm || !percent) return 0;
  return roundWeight((percent / 100) * tm);
}

function resultBadge(success, fail) {
  if (fail === 0) return { label: 'O', class: 'badge-success' };
  if (success === 0) return { label: 'X', class: 'badge-fail' };
  return { label: 'partial', class: 'badge-partial' };
}

function formatEntryDetail(entry) {
  const pct = entry.percent ? ` (${entry.percent}%)` : '';
  return `${entry.weight}kg${pct} · ${entry.sets}×${entry.reps} · ${entry.successReps}/${entry.sets * entry.reps} 성공`;
}

// --- Tabs ---
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'history') renderHistory();
    if (tab.dataset.tab === 'weekly') renderWeeklyReview();
  });
});

// --- Settings ---
function syncTMInputs() {
  document.getElementById('tm-snatch').value = state.tm.snatch;
  document.getElementById('tm-cj').value = state.tm.cj;
}

document.getElementById('save-tm').addEventListener('click', () => {
  state.tm.snatch = parseFloat(document.getElementById('tm-snatch').value) || 0;
  state.tm.cj = parseFloat(document.getElementById('tm-cj').value) || 0;
  saveState();
  updateComputedValue();
  alert('TM이 저장되었습니다.');
});

document.getElementById('clear-data').addEventListener('click', () => {
  if (confirm('모든 기록을 삭제할까요?')) {
    state = { tm: state.tm, sessions: [], weeklyAdjustments: {} };
    saveState();
    renderHistory();
    renderWeeklyReview();
    alert('삭제되었습니다.');
  }
});

// --- Log form ---
const logDate = document.getElementById('log-date');
const inputMode = document.getElementById('entry-input-mode');
const weightField = document.getElementById('weight-field');
const percentField = document.getElementById('percent-field');
const entryLift = document.getElementById('entry-lift');
const entryWeight = document.getElementById('entry-weight');
const entryPercent = document.getElementById('entry-percent');
const entrySets = document.getElementById('entry-sets');
const entryReps = document.getElementById('entry-reps');
const entrySuccess = document.getElementById('entry-success');
const entryFail = document.getElementById('entry-fail');
const computedValue = document.getElementById('computed-value');

logDate.value = todayISO();

function updateInputModeUI() {
  const isPercent = inputMode.value === 'percent';
  weightField.classList.toggle('hidden', isPercent);
  percentField.classList.toggle('hidden', !isPercent);
  updateComputedValue();
}

function updateComputedValue() {
  const lift = entryLift.value;
  if (lift === 'accessory') {
    computedValue.textContent = '보조 — TM 미적용';
    return;
  }
  if (inputMode.value === 'weight') {
    const w = parseFloat(entryWeight.value);
    if (w) computedValue.textContent = `${weightToPercent(lift, w)}%`;
    else computedValue.textContent = '—';
  } else {
    const p = parseFloat(entryPercent.value);
    if (p) computedValue.textContent = `${percentToWeight(lift, p)} kg`;
    else computedValue.textContent = '—';
  }
}

[inputMode, entryLift, entryWeight, entryPercent].forEach((el) => {
  el.addEventListener('input', updateInputModeUI);
  el.addEventListener('change', updateInputModeUI);
});

[entrySets, entryReps].forEach((el) => {
  el.addEventListener('input', () => {
    const total = (parseInt(entrySets.value, 10) || 0) * (parseInt(entryReps.value, 10) || 0);
    if (total && !entrySuccess.dataset.manual) {
      entrySuccess.value = total;
    }
  });
});

entrySuccess.addEventListener('input', () => {
  entrySuccess.dataset.manual = '1';
});

document.getElementById('fill-success').addEventListener('click', () => {
  const total = (parseInt(entrySets.value, 10) || 0) * (parseInt(entryReps.value, 10) || 0);
  entrySuccess.value = total;
  entryFail.value = 0;
  delete entrySuccess.dataset.manual;
});

function renderDraftSession() {
  const container = document.getElementById('session-preview');
  if (!draftSession.length) {
    container.classList.add('empty');
    container.textContent = '아직 추가된 세트가 없습니다.';
    return;
  }
  container.classList.remove('empty');
  container.innerHTML = draftSession
    .map(
      (entry, i) => {
        const badge = resultBadge(entry.successReps, entry.failReps);
        return `
          <div class="session-entry">
            <div class="session-entry__meta">
              <div class="session-entry__lift">${LIFT_LABELS[entry.lift]}</div>
              <div class="session-entry__detail">${formatEntryDetail(entry)}</div>
              ${entry.memo ? `<div class="session-entry__memo">${entry.memo}</div>` : ''}
            </div>
            <span class="badge ${badge.class}">${badge.label}</span>
            <button type="button" class="btn-remove" data-index="${i}" aria-label="삭제">×</button>
          </div>`;
      }
    )
    .join('');

  container.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      draftSession.splice(parseInt(btn.dataset.index, 10), 1);
      renderDraftSession();
    });
  });
}

document.getElementById('entry-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const lift = entryLift.value;
  const sets = parseInt(entrySets.value, 10);
  const reps = parseInt(entryReps.value, 10);
  const successReps = parseInt(entrySuccess.value, 10);
  const failReps = parseInt(entryFail.value, 10) || 0;
  const totalReps = sets * reps;

  if (successReps + failReps !== totalReps) {
    alert(`성공(${successReps}) + 실패(${failReps}) = ${successReps + failReps}, 총 rep(${totalReps})와 맞지 않습니다.`);
    return;
  }

  let weight = 0;
  let percent = 0;

  if (lift === 'accessory') {
    weight = parseFloat(entryWeight.value) || 0;
  } else if (inputMode.value === 'weight') {
    weight = parseFloat(entryWeight.value) || 0;
    percent = weightToPercent(lift, weight);
  } else {
    percent = parseFloat(entryPercent.value) || 0;
    weight = percentToWeight(lift, percent);
  }

  draftSession.push({
    lift,
    weight,
    percent,
    sets,
    reps,
    successReps,
    failReps,
    memo: document.getElementById('entry-memo').value.trim(),
  });

  document.getElementById('entry-memo').value = '';
  delete entrySuccess.dataset.manual;
  renderDraftSession();
});

document.getElementById('save-session').addEventListener('click', () => {
  if (!draftSession.length) {
    alert('저장할 세트를 먼저 추가하세요.');
    return;
  }
  state.sessions.push({
    date: logDate.value,
    condition: document.getElementById('log-condition').value.trim(),
    entries: [...draftSession],
    tmSnapshot: { ...state.tm },
  });
  state.sessions.sort((a, b) => b.date.localeCompare(a.date));
  saveState();
  draftSession = [];
  document.getElementById('log-condition').value = '';
  renderDraftSession();
  alert('세션이 저장되었습니다.');
});

// --- History ---
function renderHistory() {
  const filter = document.getElementById('filter-lift').value;
  const container = document.getElementById('history-list');

  const sessions = state.sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.entries.some((e) => e.lift === filter);
  });

  if (!sessions.length) {
    container.innerHTML = '<div class="empty-state">저장된 기록이 없습니다.<br>설정 탭에서 시범 데이터를 불러올 수 있습니다.</div>';
    return;
  }

  container.innerHTML = sessions
    .map((session) => {
      const entries = session.entries
        .filter((e) => filter === 'all' || e.lift === filter)
        .map((entry) => {
          const badge = resultBadge(entry.successReps, entry.failReps);
          return `
            <div class="session-entry">
              <div class="session-entry__meta">
                <div class="session-entry__lift">${LIFT_LABELS[entry.lift]}</div>
                <div class="session-entry__detail">${formatEntryDetail(entry)}</div>
                ${entry.memo ? `<div class="session-entry__memo">${entry.memo}</div>` : ''}
              </div>
              <span class="badge ${badge.class}">${badge.label}</span>
            </div>`;
        })
        .join('');

      if (!entries) return '';

      return `
        <div class="history-day">
          <div class="history-day__header">
            <span class="history-day__date">${session.date}</span>
            ${session.condition ? `<span class="history-day__condition">${session.condition}</span>` : ''}
          </div>
          ${entries}
        </div>`;
    })
    .join('');
}

document.getElementById('filter-lift').addEventListener('change', renderHistory);

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `weightlifting-log-${todayISO()}.json`);
}

function exportCSV() {
  const rows = [
    'date,lift,training_max_kg,weight_kg,percent,sets,reps,success_reps,fail_reps,result,memo,condition',
  ];
  state.sessions.forEach((session) => {
    session.entries.forEach((entry) => {
      const tm = entry.lift === 'snatch' ? session.tmSnapshot?.snatch ?? state.tm.snatch
        : entry.lift === 'cj' ? session.tmSnapshot?.cj ?? state.tm.cj : 0;
      const badge = resultBadge(entry.successReps, entry.failReps);
      rows.push(
        [
          session.date,
          entry.lift,
          tm,
          entry.weight,
          entry.percent || '',
          entry.sets,
          entry.reps,
          entry.successReps,
          entry.failReps,
          badge.label,
          `"${(entry.memo || '').replace(/"/g, '""')}"`,
          `"${(session.condition || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `weightlifting-log-${todayISO()}.csv`);
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('export-json').addEventListener('click', exportJSON);
document.getElementById('export-csv').addEventListener('click', exportCSV);

document.getElementById('import-json').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (imported.sessions) {
        state = imported;
        saveState();
        syncTMInputs();
        renderHistory();
        renderWeeklyReview();
        alert('가져오기 완료');
      }
    } catch (_) {
      alert('JSON 파일을 읽을 수 없습니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// --- Weekly review ---
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekStartInput = document.getElementById('week-start');
weekStartInput.value = getWeekStart(todayISO());

document.getElementById('prev-week').addEventListener('click', () => {
  weekStartInput.value = addDays(weekStartInput.value, -7);
  renderWeeklyReview();
});

document.getElementById('next-week').addEventListener('click', () => {
  weekStartInput.value = addDays(weekStartInput.value, 7);
  renderWeeklyReview();
});

weekStartInput.addEventListener('change', renderWeeklyReview);

function renderWeeklyReview() {
  const start = weekStartInput.value;
  const end = addDays(start, 6);

  let snatch80 = 0;
  let cj80 = 0;
  let snatchMaxPct = 0;
  let cjMaxPct = 0;
  const prs = [];
  const conditions = [];

  state.sessions
    .filter((s) => s.date >= start && s.date <= end)
    .forEach((session) => {
      if (session.condition) conditions.push({ date: session.date, text: session.condition });
      session.entries.forEach((entry) => {
        if (entry.lift === 'snatch') {
          if (entry.percent >= 80) snatch80 += entry.successReps;
          if (entry.percent > snatchMaxPct) snatchMaxPct = entry.percent;
          if (entry.memo && /PR|pr|테스트|test/i.test(entry.memo)) {
            prs.push({ date: session.date, lift: '스내치', detail: `${entry.weight}kg (${entry.percent}%) — ${entry.memo}` });
          }
        }
        if (entry.lift === 'cj') {
          if (entry.percent >= 80) cj80 += entry.successReps;
          if (entry.percent > cjMaxPct) cjMaxPct = entry.percent;
          if (entry.memo && /PR|pr|테스트|test/i.test(entry.memo)) {
            prs.push({ date: session.date, lift: 'C&J', detail: `${entry.weight}kg (${entry.percent}%) — ${entry.memo}` });
          }
        }
      });
    });

  document.getElementById('stat-snatch-80').textContent = snatch80;
  document.getElementById('stat-cj-80').textContent = cj80;
  document.getElementById('stat-snatch-max').textContent = snatchMaxPct ? `${snatchMaxPct}%` : '—';
  document.getElementById('stat-cj-max').textContent = cjMaxPct ? `${cjMaxPct}%` : '—';

  document.getElementById('weekly-prs').innerHTML = prs.length
    ? prs.map((p) => `<p><strong>${p.date}</strong> ${p.lift}: ${p.detail}</p>`).join('')
    : '<p class="hint">이번 주 PR/테스트 기록 없음</p>';

  document.getElementById('weekly-conditions').innerHTML = conditions.length
    ? conditions.map((c) => `<p><strong>${c.date}</strong> ${c.text}</p>`).join('')
    : '<p class="hint">컨디션 기록 없음</p>';

  const adjKey = start;
  document.getElementById('weekly-adjustment').value = state.weeklyAdjustments[adjKey] || '';

  const guide = [];
  if (snatch80 >= 20) guide.push('스내치 80%+ 볼륨 충분 — 다음 주 2.5kg 증량 또는 강도 유지 가능');
  else if (snatch80 > 0) guide.push('스내치 80%+ 볼륨 낮음 — 테크닉·70-75% 볼륨 보강 고려');
  else guide.push('이번 주 스내치 80%+ 기록 없음');

  if (cj80 >= 15) guide.push('C&J 80%+ 볼륨 충분 — 다음 주 프로그램 유지 또는 소폭 증량');
  else if (cj80 > 0) guide.push('C&J 80%+ 볼륨 보통 — 저크/클린 포지션 테크닉 위주 가능');
  else guide.push('이번 주 C&J 80%+ 기록 없음');

  if (snatch80 + cj80 > 40) guide.push('총 볼륨 높음 — deload 주 고려 (4-6주마다)');
  if (conditions.some((c) => /뻐|아|통|부|피/i.test(c.text))) {
    guide.push('컨디션 메모에 불편 언급 — 무게 증량보다 회복·mobility 우선');
  }

  document.getElementById('weekly-guide').innerHTML = guide.map((g) => `<li>${g}</li>`).join('');
}

document.getElementById('save-adjustment').addEventListener('click', () => {
  const key = weekStartInput.value;
  state.weeklyAdjustments[key] = document.getElementById('weekly-adjustment').value.trim();
  saveState();
  alert('조정 메모가 저장되었습니다.');
});

// --- Sample 2-week data ---
const SAMPLE_DATA = {
  tm: { snatch: 100, cj: 120 },
  weeklyAdjustments: {
    '2026-06-30': '1주차: 스내치 80%+ 볼륨 양호. C&J 저크 캐치 발 간격 집중. 다음 주 C&J 2.5kg 증량.',
    '2026-07-07': '2주차: 스내치 PR 87.5kg 성공. C&J 80%+ reps 충분. 다음 주 유지 후 3주차 소폭 증량.',
  },
  sessions: [
    {
      date: '2026-07-01',
      condition: '수면 7h, 어깨 약간 뻐근',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 70, percent: 70, sets: 1, reps: 3, successReps: 3, failReps: 0, memo: '워밍업 — 텐션 좋음' },
        { lift: 'snatch', weight: 80, percent: 80, sets: 1, reps: 2, successReps: 2, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 85, percent: 85, sets: 3, reps: 2, successReps: 6, failReps: 0, memo: '2rep째 무릎이 일찍 펴짐' },
        { lift: 'cj', weight: 90, percent: 75, sets: 5, reps: 1, successReps: 4, failReps: 1, memo: '저크 캐치에서 발 좁음' },
        { lift: 'accessory', weight: 100, percent: 0, sets: 3, reps: 5, successReps: 15, failReps: 0, memo: '백스쿼트' },
        { lift: 'accessory', weight: 80, percent: 0, sets: 3, reps: 8, successReps: 24, failReps: 0, memo: 'RDL' },
      ],
    },
    {
      date: '2026-07-03',
      condition: '컨디션 양호',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 75, percent: 75, sets: 1, reps: 2, successReps: 2, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 82.5, percent: 82.5, sets: 4, reps: 1, successReps: 4, failReps: 0, memo: '' },
        { lift: 'cj', weight: 96, percent: 80, sets: 3, reps: 2, successReps: 6, failReps: 0, memo: '' },
        { lift: 'accessory', weight: 105, percent: 0, sets: 3, reps: 5, successReps: 15, failReps: 0, memo: '프론트스쿼트' },
      ],
    },
    {
      date: '2026-07-05',
      condition: '수면 6h',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 70, percent: 70, sets: 1, reps: 3, successReps: 3, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 77.5, percent: 77.5, sets: 3, reps: 3, successReps: 9, failReps: 0, memo: '' },
        { lift: 'cj', weight: 84, percent: 70, sets: 4, reps: 2, successReps: 8, failReps: 0, memo: '' },
      ],
    },
    {
      date: '2026-07-07',
      condition: '컨디션 최고',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 80, percent: 80, sets: 5, reps: 2, successReps: 10, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 87.5, percent: 87.5, sets: 2, reps: 1, successReps: 2, failReps: 0, memo: 'PR 테스트 — 성공' },
        { lift: 'cj', weight: 102, percent: 85, sets: 3, reps: 1, successReps: 3, failReps: 0, memo: '' },
      ],
    },
    {
      date: '2026-07-09',
      condition: '어깨 약간 피로',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 75, percent: 75, sets: 1, reps: 2, successReps: 2, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 85, percent: 85, sets: 4, reps: 2, successReps: 7, failReps: 1, memo: '3세트째 2rep 실패' },
        { lift: 'cj', weight: 96, percent: 80, sets: 4, reps: 1, successReps: 4, failReps: 0, memo: '' },
      ],
    },
    {
      date: '2026-07-11',
      condition: 'deload 주',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 70, percent: 70, sets: 1, reps: 3, successReps: 3, failReps: 0, memo: 'deload' },
        { lift: 'cj', weight: 84, percent: 70, sets: 3, reps: 2, successReps: 6, failReps: 0, memo: 'deload' },
      ],
    },
    {
      date: '2026-07-13',
      condition: '수면 8h, 컨디션 회복',
      tmSnapshot: { snatch: 100, cj: 120 },
      entries: [
        { lift: 'snatch', weight: 72.5, percent: 72.5, sets: 1, reps: 3, successReps: 3, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 80, percent: 80, sets: 3, reps: 2, successReps: 6, failReps: 0, memo: '' },
        { lift: 'snatch', weight: 87.5, percent: 87.5, sets: 2, reps: 1, successReps: 2, failReps: 0, memo: '' },
        { lift: 'cj', weight: 96, percent: 80, sets: 4, reps: 2, successReps: 8, failReps: 0, memo: '' },
        { lift: 'accessory', weight: 100, percent: 0, sets: 3, reps: 5, successReps: 15, failReps: 0, memo: '백스쿼트' },
      ],
    },
  ],
};

document.getElementById('load-sample').addEventListener('click', () => {
  if (state.sessions.length && !confirm('기존 기록 위에 시범 데이터를 덮어씁니다. 계속할까요?')) return;
  state = JSON.parse(JSON.stringify(SAMPLE_DATA));
  saveState();
  syncTMInputs();
  renderHistory();
  renderWeeklyReview();
  alert('2주 시범 데이터가 로드되었습니다. 주간 리뷰 탭을 확인하세요.');
});

// --- Init ---
syncTMInputs();
updateInputModeUI();
renderDraftSession();
