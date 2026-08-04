const TYPE_COLOR = {
  Pull: '#1d4ed8',
  Push: '#be123c',
  Leg: '#0f766e',
  Run: '#b45309',
};

function formatSets(sets) {
  if (!sets || !sets.length) return '—';
  return sets.map((s) => (s.kg === 0 ? `${s.reps}회` : `${s.kg}×${s.reps}`)).join(' · ');
}

function paceFromSec(distanceKm, timeSec) {
  if (!distanceKm || !timeSec) return '—';
  const secPerKm = timeSec / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

/* ---- Tabs ---- */
document.querySelectorAll('.canvas-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.canvas-tabs .tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('main > .panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
  });
});

/* ---- PLAN ---- */
function renderPlan(plan) {
  const week = plan.thisWeek;
  document.getElementById('week-note').textContent = `${week.label} — ${week.note}`;
  document.getElementById('week-checklist').innerHTML = week.sessions
    .map((s) => {
      const checks = (s.checkpoints || [])
        .map(
          (c) =>
            `<li class="check-point ${s.done ? 'is-done' : ''}"><span class="check-point__mark">${s.done ? '✓' : '○'}</span>${c}</li>`
        )
        .join('');
      const actual = s.actual
        ? `<p class="check-actual">기록: ${s.actual}</p>`
        : '';
      const status = s.skipped ? '스킵' : s.done ? '완료' : '예정';
      return `
    <div class="check-item ${s.done ? 'check-item--done' : 'check-item--todo'} ${s.skipped ? 'check-item--skip' : ''}">
      <span class="check-box">${s.done && !s.skipped ? '✓' : ''}</span>
      <div>
        <strong>${s.day} · ${s.date.slice(5)}${s.focus ? ` · ${s.focus}` : ''}</strong>
        <p class="check-plan">${s.plan}</p>
        ${checks ? `<ul class="check-points">${checks}</ul>` : ''}
        ${actual}
      </div>
      <span class="check-status">${status}</span>
    </div>`;
    })
    .join('');

  document.getElementById('week-skeleton').innerHTML = plan.weeklySkeleton
    .map(
      (d) => `
    <div class="skel-day ${d.snatch ? 'skel-day--snatch' : ''}">
      <strong>${d.day}</strong>
      <span class="skel-focus">${d.focus}</span>
      <span class="hint">${d.detail}</span>
    </div>`
    )
    .join('');

  document.getElementById('principles').innerHTML = plan.principles.map((p) => `<li>${p}</li>`).join('');

  const road = (items) =>
    items
      .map(
        (p, idx) => `
      <div class="road-item road-item--${p.status}">
        <div class="road-phase">${typeof p.phase === 'number' ? p.phase : idx + 1}</div>
        <div>
          <strong>${p.title || p.phase}</strong>
          <span class="hint">${p.window}</span>
          <p>${p.target}</p>
        </div>
      </div>`
      )
      .join('');

  document.getElementById('snatch-roadmap').innerHTML = road(plan.snatchRoadmap);
  document.getElementById('run-roadmap').innerHTML = road(plan.runRoadmap);

  document.getElementById('next-gym-when').textContent = plan.nextGymPrescription.when;
  const ng = plan.nextGymPrescription;
  let items = ng.items;
  if (!items) {
    items = [];
    if (ng.session) {
      items = ng.session.map((s) =>
        typeof s === 'string' ? s : `${s.name}: ${s.scheme}${s.note ? ' — ' + s.note : ''}`
      );
    }
    if (ng.B_tech) items = items.concat(ng.B_tech.map((s) => `[테크] ${s.name}: ${s.scheme}`));
    if (ng.C_pull_rotation_B) items = items.concat(ng.C_pull_rotation_B.map((s) => `[등] ${s.name}: ${s.scheme}`));
    if (ng.A_warmup_functional) items = ng.A_warmup_functional.map((s) => `[워밍업] ${s}`).concat(items);
    if (ng.avoid) items.push('피하기: ' + ng.avoid.join(', '));
  }
  document.getElementById('next-gym-items').innerHTML = items.map((i) => `<li>${i}</li>`).join('');
}

function renderInsights(insights) {
  const root = document.getElementById('coaching-insights');
  if (!root || !insights) return;
  const dates = Object.keys(insights.sessionReviews || {}).sort().reverse();
  const latest = dates[0];
  const rev = latest ? insights.sessionReviews[latest] : null;
  const trendHtml = Object.values(insights.trends || {})
    .map(
      (t) => `
      <div class="insight-trend">
        <strong>${t.title}</strong>
        <p>${t.verdict}</p>
      </div>`
    )
    .join('');
  const exHtml = (rev?.exercises || [])
    .slice(0, 4)
    .map(
      (ex) => `
      <details class="insight-ex">
        <summary><strong>${ex.name}</strong> — 왜?</summary>
        <p><em>원리</em> ${ex.why}</p>
        <p><em>오늘</em> ${ex.whatHappened}</p>
        <p><em>아쉬운 점</em> ${ex.couldImprove}</p>
        <p><em>다음</em> ${ex.next}</p>
      </details>`
    )
    .join('');
  root.innerHTML = `
    <p class="hint">기준: ${(insights.coachingStandard || []).join(' · ')}</p>
    ${
      rev
        ? `<div class="insight-latest">
      <strong>최근 세션 ${latest}</strong> · ${rev.grade}
      <p>${rev.direction}</p>
      ${exHtml}
      ${rev.missedFunctional ? `<p class="hint">${rev.missedFunctional}</p>` : ''}
    </div>`
        : ''
    }
    <div class="insight-trends">${trendHtml}</div>
  `;
}

/* ---- PROFILE ---- */
function renderProfile(profile) {
  document.getElementById('body-stats').innerHTML = `
    <div class="pill"><span>체중</span><strong>${profile.body.weightKg} kg</strong></div>
    <div class="pill"><span>골격근</span><strong>${profile.body.skeletalMuscleKg} kg</strong></div>
    <div class="pill"><span>체지방</span><strong>${profile.body.bodyFatKg} kg</strong></div>
    <div class="pill"><span>체지방률</span><strong>${profile.body.bodyFatPercent}%</strong></div>
  `;

  const other = Math.max(
    0,
    profile.body.weightKg - profile.body.skeletalMuscleKg - profile.body.bodyFatKg
  );
  Charts.donutChart(document.getElementById('chart-bodycomp'), [
    { label: '골격근', value: profile.body.skeletalMuscleKg, color: '#0f766e' },
    { label: '체지방', value: profile.body.bodyFatKg, color: '#b45309' },
    { label: '기타', value: Math.round(other * 10) / 10, color: '#94a3b8' },
  ]);

  Charts.hBarChart(document.getElementById('chart-prs'), {
    labels: ['벤치', '스쿼트', '데드', 'P.스내치', 'C&J'],
    values: [
      profile.prs.benchPress,
      profile.prs.squat,
      profile.prs.deadlift,
      profile.prs.powerSnatch,
      profile.prs.cleanAndJerk,
    ],
    maxRef: 200,
    colors: ['#be123c', '#0f766e', '#1d4ed8', '#0d9488', '#b45309'],
  });

  document.getElementById('pr-stats').innerHTML = `
    <div class="pill"><span>10k 베스트</span><strong>${(profile.prs.tenKBest.timeDisplay || (profile.prs.tenKBest.timeMin + '분'))}</strong></div>
    <div class="pill"><span>스내치 목표</span><strong>${profile.prs.snatchGoal}kg</strong></div>
  `;

  document.getElementById('profile-notes').textContent =
    `${profile.notes.split} · 헬스 ${profile.notes.gym} · 역도 ${profile.notes.weightlifting} · ${profile.notes.injury}`;
}

/* ---- RESULTS ---- */
function collectHighlights(gymLog) {
  const items = [];
  gymLog.sessions
    .slice()
    .reverse()
    .forEach((s) => {
      (s.exercises || []).forEach((ex) => {
        if (ex.workingHighlight) {
          items.push({
            date: s.date,
            type: s.type,
            name: ex.name,
            highlight: ex.workingHighlight,
            overload: !!ex.overload,
          });
        }
      });
    });
  return items.slice(0, 8);
}

function renderHighlights(items) {
  document.getElementById('highlights').innerHTML = items
    .map(
      (i) => `
    <div class="hl-card ${i.overload ? 'hl-card--up' : ''}">
      <span class="hl-date">${i.date.slice(5)} · ${i.type}</span>
      <strong>${i.name}</strong>
      <span class="hl-val">${i.highlight}${i.overload ? ' ↑' : ''}</span>
    </div>`
    )
    .join('');
}

function renderKpis(gymLog, runLog, profile) {
  const gymSessions = gymLog.sessions.length;
  const runSessions = runLog.sessions.length;
  const lastPull = [...gymLog.sessions].reverse().find((s) => s.type === 'Pull');
  const pullUps = lastPull?.exercises?.find((e) => e.name.includes('풀'));
  const longestRun = Math.max(...runLog.sessions.map((r) => r.distanceKm), 0);

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi"><span>헬스 세션</span><strong>${gymSessions}</strong></div>
    <div class="kpi"><span>러닝 세션</span><strong>${runSessions}</strong></div>
    <div class="kpi"><span>최근 풀업</span><strong>${pullUps?.workingHighlight || '—'}</strong></div>
    <div class="kpi"><span>최장 런</span><strong>${longestRun} km</strong></div>
    <div class="kpi"><span>파워스내치</span><strong>${profile.prs.powerSnatch}</strong></div>
    <div class="kpi"><span>10k 베스트</span><strong>${(profile.prs.tenKBest.timeDisplay || (profile.prs.tenKBest.timeMin + '분'))}</strong></div>
  `;
}

function shortDate(d) {
  return d.slice(5).replace('-', '/');
}

const LIFT_PRESETS = [
  '바벨 행 스내치',
  '바벨 오버헤드 스쿼트',
  '벤치 프레스',
  '스쿼트',
  '데드리프트',
  '풀 업',
  '바벨 로우',
  '바벨 오버헤드 프레스',
];

const LIFT_STORAGE_KEY = 'lab-lift-progress';
const LIFT_METRIC_KEY = 'lab-lift-metric';

function listExercises(gymLog) {
  const map = new Map();
  gymLog.sessions.forEach((s) => {
    (s.exercises || []).forEach((ex) => {
      const name = ex.name;
      if (!name) return;
      const cur = map.get(name) || { name, count: 0, lastDate: '', types: {} };
      cur.count += 1;
      if (s.date > cur.lastDate) cur.lastDate = s.date;
      const t = s.type || '기타';
      cur.types[t] = (cur.types[t] || 0) + 1;
      map.set(name, cur);
    });
  });
  return [...map.values()]
    .map((e) => {
      const primary =
        Object.entries(e.types).sort((a, b) => b[1] - a[1])[0]?.[0] || '기타';
      return { ...e, primary };
    })
    .sort((a, b) => b.count - a.count || (a.name > b.name ? 1 : -1));
}

function topKgFromExercise(ex) {
  const kgs = (ex.sets || [])
    .filter((s) => (s.kg || 0) > 0 && (s.reps || 0) > 0)
    .map((s) => s.kg);
  if (kgs.length) return Math.max(...kgs);
  const any = (ex.sets || []).map((s) => s.kg || 0).filter((k) => k > 0);
  return any.length ? Math.max(...any) : null;
}

function volumeFromExercise(ex) {
  const vol = (ex.sets || []).reduce((sum, s) => sum + (s.kg || 0) * (s.reps || 0), 0);
  return vol > 0 ? Math.round(vol) : null;
}

function bestRepsFromExercise(ex) {
  const reps = (ex.sets || []).map((s) => s.reps || 0).filter((r) => r > 0);
  return reps.length ? Math.max(...reps) : null;
}

function totalRepsFromExercise(ex) {
  const total = (ex.sets || []).reduce((sum, s) => sum + (s.reps || 0), 0);
  return total > 0 ? total : null;
}

function exerciseHasLoad(gymLog, name) {
  return gymLog.sessions.some((s) =>
    (s.exercises || []).some(
      (ex) => ex.name === name && (ex.sets || []).some((set) => (set.kg || 0) > 0)
    )
  );
}

function seriesForExercise(gymLog, name, metric, hasLoad) {
  let pick;
  if (metric === 'volume') {
    pick = hasLoad ? volumeFromExercise : totalRepsFromExercise;
  } else {
    pick = hasLoad ? topKgFromExercise : bestRepsFromExercise;
  }
  return extractLiftSeries(gymLog, (n) => n === name, pick);
}

function formatLiftDelta(rows, unit) {
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1].value;
  const prev = rows[rows.length - 2].value;
  const d = last - prev;
  if (d > 0) return `이전 대비 +${d}${unit}`;
  if (d < 0) return `이전 대비 ${d}${unit}`;
  return '이전과 동일';
}

function renderLiftProgress(gymLog, name, metric) {
  const select = document.getElementById('dash-lift-select');
  const chartEl = document.getElementById('dash-lift-chart');
  const metaEl = document.getElementById('dash-lift-meta');
  if (!select || !chartEl || !metaEl) return;

  if (select.value !== name) select.value = name;

  const hasLoad = exerciseHasLoad(gymLog, name);
  document.querySelectorAll('#dash-lift-presets .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.lift === name);
  });
  document.querySelectorAll('#dash-lift-metric .metric-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.metric === metric);
    if (b.dataset.metric === 'topKg') {
      b.textContent = hasLoad ? '상한 kg' : '최고 횟수';
    } else if (b.dataset.metric === 'volume') {
      b.textContent = hasLoad ? '세션 볼륨' : '총 횟수';
    }
  });

  const rows = seriesForExercise(gymLog, name, metric, hasLoad);
  if (!rows.length) {
    chartEl.innerHTML = '<p class="hint">이 종목 기록이 아직 없습니다.</p>';
    metaEl.textContent = '';
    return;
  }

  const values = rows.map((r) => r.value);
  const labels = rows.map((r) => shortDate(r.date));
  const unit =
    metric === 'volume' ? (hasLoad ? 'kg·reps' : '총 reps') : hasLoad ? 'kg' : 'reps';
  const unitShort = metric === 'volume' ? (hasLoad ? '' : '') : hasLoad ? ' kg' : '회';
  const yPad = Math.max(...values) * 0.08 || 1;
  const yMin = Math.max(0, Math.floor(Math.min(...values) - yPad));
  const yMax = Math.ceil(Math.max(...values) + yPad);

  Charts.lineChart(chartEl, {
    labels,
    series: [{ values, color: '#0f766e' }],
    yMin,
    yMax,
    unit,
  });

  const last = rows[rows.length - 1];
  const best = Math.max(...values);
  const delta = formatLiftDelta(rows, hasLoad && metric === 'topKg' ? 'kg' : '');
  const metricLabel =
    metric === 'volume' ? (hasLoad ? '세션 볼륨' : '총 횟수') : hasLoad ? '상한' : '최고 세트';
  const lastDisp =
    metric === 'volume' && hasLoad
      ? last.value.toLocaleString()
      : `${last.value}${unitShort}`;
  const bestDisp =
    metric === 'volume' && hasLoad ? best.toLocaleString() : `${best}${unitShort}`;
  metaEl.innerHTML = `
    <strong>${name}</strong> · ${rows.length}회 기록 ·
    최근 ${metricLabel} <strong>${lastDisp}</strong>
    (${shortDate(last.date)}) · 최고 ${bestDisp}
    ${delta ? ` · ${delta}` : ''}
  `;
}

function setupLiftProgress(gymLog) {
  const exercises = listExercises(gymLog);
  const select = document.getElementById('dash-lift-select');
  const presetsEl = document.getElementById('dash-lift-presets');
  const metricEl = document.getElementById('dash-lift-metric');
  const countEl = document.getElementById('dash-lift-count');
  if (!select || !presetsEl || !metricEl) return;

  const names = new Set(exercises.map((e) => e.name));
  const groupOrder = ['Push', 'Pull', 'Leg', 'Olympic', '기타'];
  const byGroup = {};
  exercises.forEach((e) => {
    const g = groupOrder.includes(e.primary) ? e.primary : '기타';
    (byGroup[g] ||= []).push(e);
  });
  select.innerHTML = groupOrder
    .filter((g) => byGroup[g]?.length)
    .map((g) => {
      const opts = byGroup[g]
        .map((e) => `<option value="${e.name}">${e.name} · ${e.count}회</option>`)
        .join('');
      return `<optgroup label="${g}">${opts}</optgroup>`;
    })
    .join('');
  if (countEl) {
    countEl.textContent = `로그에 있는 종목 ${exercises.length}개 · 드롭다운에서 고르세요`;
  }

  const presetNames = LIFT_PRESETS.filter((n) => names.has(n));
  const extras = exercises.filter((e) => !presetNames.includes(e.name)).slice(0, 4);
  const chips = [
    ...presetNames.map((n) => ({
      name: n,
      short: n.replace(/^바벨 |^머신 |^덤벨 |^케이블 /, ''),
    })),
    ...extras.map((e) => ({
      name: e.name,
      short: e.name.replace(/^바벨 |^머신 |^덤벨 |^케이블 /, '').slice(0, 10),
    })),
  ];
  presetsEl.innerHTML = chips
    .map((c) => `<button type="button" class="chip" data-lift="${c.name}">${c.short}</button>`)
    .join('');

  let selected =
    localStorage.getItem(LIFT_STORAGE_KEY) ||
    (names.has('벤치 프레스') ? '벤치 프레스' : exercises[0]?.name);
  if (!names.has(selected)) selected = exercises[0]?.name;
  let metric = localStorage.getItem(LIFT_METRIC_KEY) || 'topKg';
  if (metric !== 'topKg' && metric !== 'volume') metric = 'topKg';

  const paint = () => {
    localStorage.setItem(LIFT_STORAGE_KEY, selected);
    localStorage.setItem(LIFT_METRIC_KEY, metric);
    renderLiftProgress(gymLog, selected, metric);
  };

  select.onchange = () => {
    selected = select.value;
    paint();
  };
  presetsEl.onclick = (e) => {
    const chip = e.target.closest('[data-lift]');
    if (!chip) return;
    selected = chip.dataset.lift;
    paint();
  };
  metricEl.onclick = (e) => {
    const btn = e.target.closest('[data-metric]');
    if (!btn) return;
    metric = btn.dataset.metric;
    paint();
  };

  paint();
}

function extractLiftSeries(gymLog, nameMatch, pick) {
  const rows = [];
  gymLog.sessions
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .forEach((s) => {
      (s.exercises || []).forEach((ex) => {
        if (!nameMatch(ex.name || '')) return;
        const v = pick(ex, s);
        if (v != null) rows.push({ date: s.date, value: v, ex });
      });
    });
  return rows;
}

function renderDashboard(profile, gymLog, runLog, insights, album) {
  const hangSq = profile.prs.hangSquatSnatch || 0;
  const goal = profile.prs.snatchGoal || 100;
  const updated = insights?.updated || profile.updated || '';
  document.getElementById('dash-updated').textContent = updated ? `데이터 ${updated}` : '';

  setupLiftProgress(gymLog);

  const hang = extractLiftSeries(
    gymLog,
    (n) => n.includes('행 스내치'),
    (ex) => {
      const kgs = (ex.sets || []).map((s) => s.kg || 0).filter((k) => k > 0);
      return kgs.length ? Math.max(...kgs) : null;
    }
  );
  const oh = extractLiftSeries(
    gymLog,
    (n) => n.includes('오버헤드 스쿼트'),
    (ex) => {
      const kgs = (ex.sets || []).map((s) => s.kg || 0).filter((k) => k > 0);
      return kgs.length ? Math.max(...kgs) : null;
    }
  );

  const benchRows = [];
  gymLog.sessions
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .forEach((s) => {
      (s.exercises || []).forEach((ex) => {
        if (ex.name !== '벤치 프레스') return;
        const at130 = (ex.sets || []).filter((x) => (x.kg || 0) >= 130 && (x.reps || 0) > 0);
        if (!at130.length) return;
        const bestReps = Math.max(...at130.filter((x) => x.kg === 130).map((x) => x.reps || 0), 0);
        benchRows.push({
          date: s.date,
          reps: bestReps || Math.max(...at130.map((x) => x.reps || 0)),
        });
      });
    });

  const runs = [...runLog.sessions]
    .filter((r) => r.avgHr)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  const lastRun = runs[runs.length - 1];
  const easyOk = lastRun ? lastRun.avgHr <= 145 : null;
  const hangPrev = hang.length > 1 ? hang[hang.length - 2].value : null;
  const hangDelta = hangPrev != null ? hangSq - hangPrev : null;
  const benchLast = benchRows.length ? benchRows[benchRows.length - 1].reps : null;
  const benchPrev = benchRows.length > 1 ? benchRows[benchRows.length - 2].reps : null;

  const deltaHtml = (d, unit = '') => {
    if (d == null) return `<span class="hero-metric__delta flat">기준점 수집 중</span>`;
    if (d > 0) return `<span class="hero-metric__delta up">▲ +${d}${unit} 상승</span>`;
    if (d < 0) return `<span class="hero-metric__delta down">▼ ${d}${unit}</span>`;
    return `<span class="hero-metric__delta flat">→ 유지</span>`;
  };

  document.getElementById('dash-hero').innerHTML = `
    <article class="hero-metric hero-metric--primary">
      <span class="hero-metric__label">스쿼트 스내치 (행)</span>
      <div><span class="hero-metric__value">${hangSq}</span><span class="hero-metric__unit">/ ${goal} kg</span></div>
      ${deltaHtml(hangDelta, 'kg')}
      <p class="hero-metric__note">깊이 있는 리시브가 목표의 핵심 지표입니다.</p>
    </article>
    <article class="hero-metric">
      <span class="hero-metric__label">벤치 130 작업</span>
      <div><span class="hero-metric__value">${benchLast ?? '—'}</span><span class="hero-metric__unit">reps</span></div>
      ${deltaHtml(benchLast != null && benchPrev != null ? benchLast - benchPrev : null, '')}
      <p class="hero-metric__note">서브맥스 반복 · 4회가 최근 목표선</p>
    </article>
    <article class="hero-metric">
      <span class="hero-metric__label">최근 이지 런</span>
      <div><span class="hero-metric__value">${lastRun ? lastRun.avgHr : '—'}</span><span class="hero-metric__unit">bpm</span></div>
      <span class="hero-metric__delta ${easyOk === true ? 'up' : easyOk === false ? 'down' : 'flat'}">
        ${easyOk === true ? '이지 밴드 안' : easyOk === false ? '너무 높음 · 135–145 목표' : '기록 없음'}
      </span>
      <p class="hero-metric__note">${lastRun ? `${lastRun.distanceKm}km · ${lastRun.pacePerKm || ''}` : '다음 런부터 HR이 점수'}</p>
    </article>
  `;

  Charts.lineChart(document.getElementById('dash-hang-snatch'), {
    labels: hang.map((h) => shortDate(h.date)),
    series: [{ values: hang.map((h) => h.value), color: '#0f766e' }],
    yMin: 30,
    yMax: 110,
    targetLine: 100,
    unit: 'kg',
  });
  const hangVerdict = document.getElementById('dash-hang-verdict');
  hangVerdict.textContent = insights?.trends?.hangSnatchDeep?.verdict || '행 깊은 리시브 추세';
  hangVerdict.className = 'verdict';

  Charts.barChart(document.getElementById('dash-oh-squat'), {
    labels: oh.map((h) => shortDate(h.date)),
    values: oh.map((h) => h.value),
    colors: oh.map(() => '#148f86'),
    unit: 'kg',
  });

  Charts.barChart(document.getElementById('dash-bench-130'), {
    labels: benchRows.map((b) => shortDate(b.date)),
    values: benchRows.map((b) => b.reps),
    colors: benchRows.map((b) => (b.reps >= 4 ? '#047857' : '#1d4ed8')),
    targetLine: 4,
    unit: 'reps @ 130',
  });
  document.getElementById('dash-bench-verdict').textContent =
    insights?.trends?.bench130?.verdict || '';

  Charts.lineChart(document.getElementById('dash-run-hr'), {
    labels: runs.map((r) => shortDate(r.date)),
    series: [{ values: runs.map((r) => r.avgHr), color: '#be123c' }],
    yMin: 120,
    yMax: 190,
    band: [135, 145],
    unit: 'avg HR',
  });
  const runVerdict = document.getElementById('dash-run-verdict');
  runVerdict.textContent = insights?.trends?.easyRun?.verdict || '';
  if (insights?.trends?.easyRun?.verdict?.includes('실패')) {
    runVerdict.style.color = '#9f1239';
  }

  const longest = Math.max(...runLog.sessions.map((r) => r.distanceKm || 0), 0);
  const gauges = document.getElementById('dash-gauges');
  gauges.innerHTML = '';
  Charts.gauge(gauges, {
    label: '스내치',
    pct: Math.min(100, Math.round((hangSq / goal) * 100)),
    sub: `깊은 행 ${hangSq} → ${goal}`,
  });
  Charts.gauge(gauges, {
    label: '10km',
    pct: Math.min(100, Math.round((longest / 10) * 100)),
    sub: `최장 ${longest}km · 이지 HR이 병목`,
  });
  Charts.gauge(gauges, {
    label: '벤치130',
    pct: benchLast != null ? Math.min(100, Math.round((benchLast / 5) * 100)) : 0,
    sub: `최근 130×${benchLast ?? '—'}`,
  });

  const dates = Object.keys(insights?.sessionReviews || {}).sort().reverse();
  const latest = dates[0];
  const rev = latest ? insights.sessionReviews[latest] : null;
  document.getElementById('dash-latest-coach').innerHTML = rev
    ? `<strong>최근 코칭 · ${latest}</strong> · ${rev.grade}<div style="margin-top:0.35rem;color:var(--text-muted)">${rev.direction}</div>`
    : '<strong>최근 코칭</strong><div style="margin-top:0.35rem;color:var(--text-muted)">세션 리뷰 없음</div>';

  if (album) {
    document.getElementById('dash-album-kpi').innerHTML = `
      <div class="kpi"><span>사진</span><strong>${album.totalPhotos}</strong></div>
      <div class="kpi"><span>촬영일</span><strong>${album.uniqueDates}</strong></div>
      <div class="kpi"><span>로그 세션</span><strong>${album.gymLogSessions}</strong></div>
    `;
    const months = Object.entries(album.byMonth || {}).slice(-12);
    document.getElementById('dash-album-months').innerHTML = months
      .map(([m, n]) => `<div class="album-month"><strong>${m}</strong><span>${n}장</span></div>`)
      .join('');
  }
}

function renderCharts(gymLog, runLog, profile) {
  const gymSorted = [...gymLog.sessions]
    .filter((s) => s.totalVolumeKg)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const volEl = document.getElementById('chart-gym-volume');
  if (volEl) {
    Charts.barChart(volEl, {
      labels: gymSorted.map((s) => s.date.slice(5)),
      values: gymSorted.map((s) => Math.round(s.totalVolumeKg / 1000)),
      colors: gymSorted.map((s) => TYPE_COLOR[s.type] || '#3b82f6'),
      unit: '단위: 천 kg',
    });
  }

  const runEl = document.getElementById('chart-run-distance');
  if (runEl) {
    const runs = [...runLog.sessions].sort((a, b) => (a.date > b.date ? 1 : -1));
    Charts.barChart(runEl, {
      labels: runs.map((s) => s.date.slice(5)),
      values: runs.map((s) => s.distanceKm),
      colors: runs.map(() => TYPE_COLOR.Run),
      targetLine: 7,
      unit: 'km',
    });
  }
}

function buildTimeline(gymLog, runLog) {
  const gym = gymLog.sessions.map((s) => ({ kind: 'gym', ...s }));
  const run = runLog.sessions.map((s) => ({ kind: 'run', type: 'Run', ...s }));
  return [...gym, ...run].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderTimeline(items, filter = 'all') {
  const filtered = items.filter((i) => filter === 'all' || i.type === filter);
  const countEl = document.getElementById('session-count');
  if (countEl) countEl.textContent = `${filtered.length}세션`;

  document.getElementById('timeline').innerHTML = filtered
    .map((s) => {
      if (s.kind === 'run') {
        return `
        <article class="tl-card tl-card--run">
          <div class="tl-head">
            <span class="badge-cat">Run</span>
            <strong>${s.date}</strong>
            <span>${s.distanceKm} km · ${formatDuration(s.timeSec)} · ${s.pacePerKm || paceFromSec(s.distanceKm, s.timeSec)}</span>
          </div>
          <p class="hint">${s.coachNote || ''}</p>
        </article>`;
      }

      const exHtml = (s.exercises || [])
        .map(
          (ex) => `
        <div class="tl-ex">
          <div class="tl-ex__name">${ex.name}${ex.overload ? ' <span class="up">↑</span>' : ''}</div>
          <div class="tl-ex__sets">${ex.workingHighlight ? `<em>${ex.workingHighlight}</em>` : formatSets(ex.sets)}</div>
        </div>`
        )
        .join('');

      return `
      <article class="tl-card tl-card--${(s.type || '').toLowerCase()}">
        <div class="tl-head">
          <span class="badge-cat">${s.type}</span>
          <strong>${s.date}</strong>
          <span>${s.durationMin ? s.durationMin + '분' : ''} ${s.totalVolumeKg ? '· ' + s.totalVolumeKg.toLocaleString() + 'kg' : ''} ${s.grade ? '· ' + s.grade : ''}</span>
        </div>
        <div class="tl-ex-list">${exHtml}</div>
        <p class="hint">${s.coachNote || ''}</p>
      </article>`;
    })
    .join('');
}

let timelineItems = [];

document.getElementById('result-filters')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#result-filters .chip').forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  renderTimeline(timelineItems, btn.dataset.type);
});

Promise.all([
  loadJSON('data/athlete-profile.json'),
  loadJSON('data/sessions/gym-log.json'),
  loadJSON('data/sessions/run-log.json'),
  loadJSON('data/plan.json'),
  loadJSON('data/coaching-insights.json'),
  loadJSON('data/album-inventory.json').catch(() => null),
])
  .then(([profile, gymLog, runLog, plan, insights, album]) => {
    renderDashboard(profile, gymLog, runLog, insights, album);
    renderPlan(plan);
    renderProfile(profile);
    renderKpis(gymLog, runLog, profile);
    renderCharts(gymLog, runLog, profile);
    renderHighlights(collectHighlights(gymLog));
    renderInsights(insights);
    timelineItems = buildTimeline(gymLog, runLog);
    renderTimeline(timelineItems);
  })
  .catch((err) => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<pre style="color:#f87171;padding:1rem">로드 실패: ${err}\npython3 -m http.server 8080 으로 열어주세요.</pre>`
    );
  });
