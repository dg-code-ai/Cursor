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
const HERO_STORAGE_KEY = 'lab-hero-slots';
const DEFAULT_HERO_SLOTS = ['hangSnatch', 'bench130', 'easyRunHr'];
const BODY_PART_ORDER = ['역도', '하체', '가슴', '등', '어깨', '팔', '코어', '기타'];

function bodyPartForExercise(name) {
  const n = name || '';
  if (/스내치|클린|저크|오버헤드 스쿼트|스내치 밸런스|판다|인상|용상/.test(n)) return '역도';
  if (/풀 업|랫|로우|풀 다운|스트레이트 암|리어 플라이|페이스 풀/.test(n)) return '등';
  if (/벤치|체스트|플라이|펙|딥스/.test(n)) return '가슴';
  if (/스쿼트|레그|데드|힙|런지|카프|수평 레그|점프/.test(n)) return '하체';
  if (/숄더|오버헤드 프레스|레터럴|사이드/.test(n)) return '어깨';
  if (/컬|푸시 다운|트라이|해머|킥백|스컬/.test(n)) return '팔';
  if (/행잉|코어|플랭크|캐리/.test(n)) return '코어';
  return '기타';
}

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
      return { ...e, primary, bodyPart: bodyPartForExercise(e.name) };
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
  if (d > 0) return { text: `▲ +${d}${unit}`, cls: 'up' };
  if (d < 0) return { text: `▼ ${d}${unit}`, cls: 'down' };
  return { text: '→ 유지', cls: 'flat' };
}

function seriesBounds(values) {
  if (!values.length) return { yMin: 0, yMax: 1 };
  const yPad = Math.max(...values) * 0.08 || 1;
  return {
    yMin: Math.max(0, Math.floor(Math.min(...values) - yPad)),
    yMax: Math.ceil(Math.max(...values) + yPad),
  };
}

function renderLiftProgress(gymLog, name) {
  const select = document.getElementById('dash-lift-select');
  const topEl = document.getElementById('dash-lift-chart-top');
  const volEl = document.getElementById('dash-lift-chart-vol');
  const statsEl = document.getElementById('dash-lift-stats');
  const metaEl = document.getElementById('dash-lift-meta');
  const topTitle = document.getElementById('dash-lift-top-title');
  const volTitle = document.getElementById('dash-lift-vol-title');
  if (!select || !topEl || !volEl || !metaEl) return;

  if (select.value !== name) select.value = name;
  document.querySelectorAll('#dash-lift-presets .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.lift === name);
  });

  const hasLoad = exerciseHasLoad(gymLog, name);
  const topRows = seriesForExercise(gymLog, name, 'topKg', hasLoad);
  const volRows = seriesForExercise(gymLog, name, 'volume', hasLoad);
  const part = bodyPartForExercise(name);

  if (topTitle) topTitle.textContent = hasLoad ? '상한 kg' : '최고 횟수';
  if (volTitle) volTitle.textContent = hasLoad ? '세션 볼륨 (kg×reps)' : '총 횟수';

  if (!topRows.length && !volRows.length) {
    topEl.innerHTML = '<p class="hint">이 종목 기록이 아직 없습니다.</p>';
    volEl.innerHTML = '';
    if (statsEl) statsEl.innerHTML = '';
    metaEl.textContent = '';
    return;
  }

  if (topRows.length) {
    const values = topRows.map((r) => r.value);
    const { yMin, yMax } = seriesBounds(values);
    Charts.lineChart(topEl, {
      labels: topRows.map((r) => shortDate(r.date)),
      series: [{ values, color: '#0f766e' }],
      yMin,
      yMax,
      unit: hasLoad ? 'kg' : 'reps',
    });
  } else {
    topEl.innerHTML = '<p class="hint">상한 기록 없음</p>';
  }

  if (volRows.length) {
    Charts.barChart(volEl, {
      labels: volRows.map((r) => shortDate(r.date)),
      values: volRows.map((r) => r.value),
      colors: volRows.map(() => '#1d4ed8'),
      unit: hasLoad ? 'kg·reps' : 'reps',
    });
  } else {
    volEl.innerHTML = '<p class="hint">볼륨 기록 없음</p>';
  }

  const topLast = topRows[topRows.length - 1];
  const volLast = volRows[volRows.length - 1];
  const topBest = topRows.length ? Math.max(...topRows.map((r) => r.value)) : null;
  const volBest = volRows.length ? Math.max(...volRows.map((r) => r.value)) : null;
  const topDelta = formatLiftDelta(topRows, hasLoad ? 'kg' : '');
  const volDelta = formatLiftDelta(volRows, '');
  const topUnit = hasLoad ? ' kg' : '회';
  const volFmt = (v) => (hasLoad ? Number(v).toLocaleString() : `${v}회`);

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="progress-stat">
        <span>최근 ${hasLoad ? '상한' : '최고'}</span>
        <strong>${topLast ? `${topLast.value}${topUnit}` : '—'}</strong>
        <em class="${topDelta?.cls || ''}">${topDelta?.text || '—'}</em>
      </div>
      <div class="progress-stat">
        <span>최고 ${hasLoad ? '상한' : '세트'}</span>
        <strong>${topBest != null ? `${topBest}${topUnit}` : '—'}</strong>
        <em>${topLast ? shortDate(topLast.date) : ''}</em>
      </div>
      <div class="progress-stat">
        <span>최근 볼륨</span>
        <strong>${volLast ? volFmt(volLast.value) : '—'}</strong>
        <em class="${volDelta?.cls || ''}">${volDelta?.text || '—'}</em>
      </div>
      <div class="progress-stat">
        <span>최고 볼륨</span>
        <strong>${volBest != null ? volFmt(volBest) : '—'}</strong>
        <em>${volLast ? shortDate(volLast.date) : ''}</em>
      </div>
    `;
  }

  metaEl.innerHTML = `
    <strong>${name}</strong> · ${part} · ${Math.max(topRows.length, volRows.length)}회 기록
    ${hasLoad ? ' · 상한 + 세션 볼륨' : ' · 횟수 기준 (체중 종목)'}
  `;
}

function setupLiftProgress(gymLog) {
  const exercises = listExercises(gymLog);
  const select = document.getElementById('dash-lift-select');
  const presetsEl = document.getElementById('dash-lift-presets');
  const countEl = document.getElementById('dash-lift-count');
  if (!select || !presetsEl) return;

  const names = new Set(exercises.map((e) => e.name));
  const byPart = {};
  exercises.forEach((e) => {
    (byPart[e.bodyPart] ||= []).push(e);
  });
  select.innerHTML = BODY_PART_ORDER.filter((g) => byPart[g]?.length)
    .map((g) => {
      const opts = byPart[g]
        .map((e) => `<option value="${e.name}">${e.name} · ${e.count}회</option>`)
        .join('');
      return `<optgroup label="${g}">${opts}</optgroup>`;
    })
    .join('');

  if (countEl) {
    const parts = BODY_PART_ORDER.filter((g) => byPart[g]?.length)
      .map((g) => `${g} ${byPart[g].length}`)
      .join(' · ');
    countEl.textContent = `총 ${exercises.length}종목 · ${parts}`;
  }

  const presetNames = LIFT_PRESETS.filter((n) => names.has(n));
  presetsEl.innerHTML = presetNames
    .map((n) => {
      const short = n.replace(/^바벨 |^머신 |^덤벨 |^케이블 /, '');
      return `<button type="button" class="chip" data-lift="${n}">${short}</button>`;
    })
    .join('');

  let selected =
    localStorage.getItem(LIFT_STORAGE_KEY) ||
    (names.has('벤치 프레스') ? '벤치 프레스' : exercises[0]?.name);
  if (!names.has(selected)) selected = exercises[0]?.name;

  const paint = () => {
    localStorage.setItem(LIFT_STORAGE_KEY, selected);
    renderLiftProgress(gymLog, selected);
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

  paint();
}

function liftTopSeries(gymLog, nameExact) {
  return extractLiftSeries(gymLog, (n) => n === nameExact, topKgFromExercise);
}

function liftNameIncludesSeries(gymLog, needle) {
  return extractLiftSeries(
    gymLog,
    (n) => n.includes(needle),
    (ex) => topKgFromExercise(ex) ?? bestRepsFromExercise(ex)
  );
}

function bench130Series(gymLog) {
  const rows = [];
  gymLog.sessions
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .forEach((s) => {
      (s.exercises || []).forEach((ex) => {
        if (ex.name !== '벤치 프레스') return;
        const at130 = (ex.sets || []).filter((x) => (x.kg || 0) >= 130 && (x.reps || 0) > 0);
        if (!at130.length) return;
        const bestReps = Math.max(...at130.filter((x) => x.kg === 130).map((x) => x.reps || 0), 0);
        rows.push({
          date: s.date,
          value: bestReps || Math.max(...at130.map((x) => x.reps || 0)),
        });
      });
    });
  return rows;
}

function pullupTotalSeries(gymLog) {
  return extractLiftSeries(gymLog, (n) => n === '풀 업', totalRepsFromExercise);
}

function buildHeroCatalog(profile, gymLog, runLog) {
  const goal = profile.prs.snatchGoal || 100;
  const hang = liftNameIncludesSeries(gymLog, '행 스내치');
  const oh = liftNameIncludesSeries(gymLog, '오버헤드 스쿼트');
  const squat = liftTopSeries(gymLog, '스쿼트');
  const dead = liftTopSeries(gymLog, '데드리프트');
  const bench = liftTopSeries(gymLog, '벤치 프레스');
  const bench130 = bench130Series(gymLog);
  const pull = pullupTotalSeries(gymLog);
  const row = liftTopSeries(gymLog, '바벨 로우');
  const runs = [...runLog.sessions]
    .filter((r) => r.avgHr)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  const lastRun = runs[runs.length - 1];
  const longest = Math.max(...runLog.sessions.map((r) => r.distanceKm || 0), 0);
  const hangPr = profile.prs.hangSquatSnatch || hang[hang.length - 1]?.value || null;

  const fromSeries = (rows, unit, note, opts = {}) => {
    const last = opts.lastOverride != null ? opts.lastOverride : rows[rows.length - 1]?.value ?? null;
    const prev = rows.length >= 2 ? rows[rows.length - 2].value : null;
    const delta = last != null && prev != null ? last - prev : null;
    return { value: last, unit, delta, deltaUnit: opts.deltaUnit ?? unit, note, suffix: opts.suffix };
  };

  return [
    {
      id: 'hangSnatch',
      label: '행 스쿼트 스내치',
      ...fromSeries(hang, 'kg', '깊이 있는 리시브가 목표의 핵심 지표입니다.', {
        lastOverride: hangPr,
        suffix: `/ ${goal}`,
      }),
    },
    {
      id: 'ohSquat',
      label: 'OH 스쿼트',
      ...fromSeries(oh, 'kg', '오버헤드 안정 상한'),
    },
    {
      id: 'bench130',
      label: '벤치 130 작업',
      ...fromSeries(bench130, 'reps', '서브맥스 반복 · 4회가 최근 목표선', { deltaUnit: '' }),
    },
    {
      id: 'benchTop',
      label: '벤치 상한',
      ...fromSeries(bench, 'kg', '세션 최고 중량'),
    },
    {
      id: 'squatTop',
      label: '스쿼트 상한',
      ...fromSeries(squat, 'kg', '세션 최고 중량'),
    },
    {
      id: 'deadTop',
      label: '데드 상한',
      ...fromSeries(dead, 'kg', '세션 최고 중량'),
    },
    {
      id: 'pullupTotal',
      label: '풀업 총횟수',
      ...fromSeries(pull, '회', '세션 총 반복', { deltaUnit: '' }),
    },
    {
      id: 'rowTop',
      label: '바벨 로우 상한',
      ...fromSeries(row, 'kg', '등 메인 상한'),
    },
    {
      id: 'easyRunHr',
      label: '최근 이지 런',
      value: lastRun?.avgHr ?? null,
      unit: 'bpm',
      delta: null,
      deltaUnit: '',
      note: lastRun
        ? `${lastRun.distanceKm}km · ${lastRun.pacePerKm || ''}`
        : '다음 런부터 HR이 점수',
      status:
        lastRun == null ? null : lastRun.avgHr <= 145 ? '이지 밴드 안' : '너무 높음 · 135–145 목표',
      statusOk: lastRun == null ? null : lastRun.avgHr <= 145,
    },
    {
      id: 'longestRun',
      label: '최장 런',
      value: longest || null,
      unit: 'km',
      delta: null,
      deltaUnit: '',
      note: '시즌 최장 거리',
    },
    {
      id: 'bodyWeight',
      label: '체중',
      value: profile.body?.weightKg ?? null,
      unit: 'kg',
      delta: null,
      deltaUnit: '',
      note: '유지 구간 105–107 참고',
    },
    {
      id: 'snatchGoal',
      label: '스내치 목표 진행',
      value: hangPr != null ? Math.round((hangPr / goal) * 100) : null,
      unit: '%',
      delta: null,
      deltaUnit: '',
      note: `${hangPr ?? '—'} → ${goal} kg`,
      suffix: '',
    },
  ];
}

function loadHeroSlots(catalog) {
  let slots;
  try {
    slots = JSON.parse(localStorage.getItem(HERO_STORAGE_KEY) || 'null');
  } catch {
    slots = null;
  }
  if (!Array.isArray(slots) || slots.length !== 3) slots = [...DEFAULT_HERO_SLOTS];
  const ids = new Set(catalog.map((c) => c.id));
  return slots.map((id, i) => (ids.has(id) ? id : DEFAULT_HERO_SLOTS[i]));
}

function setupHeroMetrics(profile, gymLog, runLog) {
  const root = document.getElementById('dash-hero');
  if (!root) return;
  const catalog = buildHeroCatalog(profile, gymLog, runLog);
  const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));

  const paint = () => {
    const slots = loadHeroSlots(catalog);
    const options = catalog
      .map((c) => `<option value="${c.id}">${c.label}</option>`)
      .join('');

    root.innerHTML = slots
      .map((id, i) => {
        const m = byId[id] || catalog[0];
        let deltaHtml;
        if (m.status != null) {
          const cls = m.statusOk === true ? 'up' : m.statusOk === false ? 'down' : 'flat';
          deltaHtml = `<span class="hero-metric__delta ${cls}">${m.status}</span>`;
        } else if (m.delta == null) {
          deltaHtml = `<span class="hero-metric__delta flat">기준점 수집 중</span>`;
        } else if (m.delta > 0) {
          deltaHtml = `<span class="hero-metric__delta up">▲ +${m.delta}${m.deltaUnit || ''} 상승</span>`;
        } else if (m.delta < 0) {
          deltaHtml = `<span class="hero-metric__delta down">▼ ${m.delta}${m.deltaUnit || ''}</span>`;
        } else {
          deltaHtml = `<span class="hero-metric__delta flat">→ 유지</span>`;
        }

        const unitBits = [
          m.suffix ? `<span class="hero-metric__unit">${m.suffix}</span>` : '',
          m.unit ? `<span class="hero-metric__unit">${m.unit}</span>` : '',
        ].join(' ');

        return `
      <article class="hero-metric ${i === 0 ? 'hero-metric--primary' : ''}">
        <label class="hero-metric__pick">
          <select data-slot="${i}" aria-label="지표 ${i + 1} 선택">${options}</select>
        </label>
        <div><span class="hero-metric__value">${m.value ?? '—'}</span>${unitBits}</div>
        ${deltaHtml}
        <p class="hero-metric__note">${m.note || ''}</p>
      </article>`;
      })
      .join('');

    root.querySelectorAll('select[data-slot]').forEach((sel) => {
      sel.value = slots[Number(sel.dataset.slot)];
      sel.onchange = () => {
        const next = loadHeroSlots(catalog);
        next[Number(sel.dataset.slot)] = sel.value;
        localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(next));
        paint();
      };
    });
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

const GOALS_STORAGE_KEY = 'lab-goals-custom';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseISODate(s) {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  const ms = 86400000;
  return Math.round((b - a) / ms);
}

function formatRunTime(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatGoalValue(goal, value) {
  if (value == null) return '—';
  const k = goal.kind;
  if (k === 'run_time_sec') return formatRunTime(value);
  if (k === 'run_distance_km') return `${value} km`;
  if (k === 'bench_reps') return `${value}회`;
  if (k === 'lift_kg') return `${value} kg`;
  return String(value);
}

function loadGoalOverrides() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCustomGoals(customList) {
  const store = loadGoalOverrides();
  store.custom = customList;
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(store));
}

function mergeGoals(goalsData) {
  const base = (goalsData?.goals || []).map((g) => ({ ...g, source: 'default' }));
  const store = loadGoalOverrides();
  const byId = Object.fromEntries(base.map((g) => [g.id, { ...g }]));
  Object.entries(store.overrides || {}).forEach(([id, patch]) => {
    if (byId[id]) Object.assign(byId[id], patch);
  });
  (store.custom || []).forEach((g) => {
    byId[g.id] = { ...g, source: 'custom' };
  });
  return Object.values(byId).sort((a, b) => (a.deadline > b.deadline ? 1 : -1));
}

function currentForGoal(goal, profile, gymLog, runLog) {
  const store = loadGoalOverrides();
  const manual = store.current?.[goal.id];
  if (manual != null && goal.kind === 'custom') return manual;

  const k = goal.kind;
  if (k === 'lift_kg') {
    const match = goal.track?.exerciseMatch || '';
    const rows = extractLiftSeries(gymLog, (n) => n.includes(match), topKgFromExercise);
    if (rows.length) return rows[rows.length - 1].value;
    if (match.includes('행') && profile.prs?.hangSquatSnatch) return profile.prs.hangSquatSnatch;
    return null;
  }
  if (k === 'bench_reps') {
    const w = goal.track?.weightKg || 130;
    const rows = extractLiftSeries(
      gymLog,
      (n) => n === '벤치 프레스',
      (ex) => {
        const at = (ex.sets || []).filter((s) => (s.kg || 0) >= w && (s.reps || 0) > 0);
        if (!at.length) return null;
        const atW = at.filter((s) => s.kg === w);
        return Math.max(...(atW.length ? atW : at).map((s) => s.reps || 0));
      }
    );
    return rows.length ? rows[rows.length - 1].value : null;
  }
  if (k === 'run_distance_km') {
    return Math.max(...runLog.sessions.map((r) => r.distanceKm || 0), 0) || null;
  }
  if (k === 'run_time_sec') {
    const best = profile.prs?.tenKBest;
    if (best?.timeMin) return Math.round(best.timeMin * 60);
    if (best?.timeSec) return best.timeSec;
    return null;
  }
  if (k === 'custom') {
    return manual ?? goal.currentValue ?? null;
  }
  return null;
}

function computeGoalProgress(goal, profile, gymLog, runLog) {
  const current = currentForGoal(goal, profile, gymLog, runLog);
  const baseline = goal.baseline?.value ?? current ?? 0;
  const target = goal.target?.value;
  const startDate = parseISODate(goal.baseline?.date || goal.startDate || todayISO());
  const deadline = parseISODate(goal.deadline);
  const today = parseISODate(todayISO());

  let achievePct = 0;
  const lowerBetter = goal.kind === 'run_time_sec';
  if (current != null && target != null && baseline != null) {
    if (lowerBetter) {
      const span = baseline - target;
      achievePct = span > 0 ? ((baseline - current) / span) * 100 : current <= target ? 100 : 0;
    } else {
      const span = target - baseline;
      achievePct = span > 0 ? ((current - baseline) / span) * 100 : current >= target ? 100 : 0;
    }
  }
  achievePct = Math.max(0, Math.min(100, Math.round(achievePct)));

  let timePct = 0;
  let daysLeft = null;
  if (startDate && deadline && today) {
    const total = daysBetween(startDate, deadline);
    const elapsed = daysBetween(startDate, today);
    daysLeft = daysBetween(today, deadline);
    timePct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    timePct = Math.max(0, Math.min(100, timePct));
  }

  const done = lowerBetter
    ? current != null && target != null && current <= target
    : current != null && target != null && current >= target;
  const overdue = deadline && today && today > deadline && !done;

  let status = '순조';
  let statusClass = 'ok';
  if (done) {
    status = '달성';
    statusClass = 'done';
  } else if (overdue) {
    status = '기한 지남';
    statusClass = 'late';
  } else if (achievePct + 8 < timePct) {
    status = '지연';
    statusClass = 'late';
  } else if (achievePct + 15 < timePct) {
    status = '주의';
    statusClass = 'warn';
  }

  const deadlineLabel = goal.deadline ? goal.deadline.replace(/-/g, '.').slice(2) : '';
  const daysLabel =
    daysLeft == null
      ? ''
      : daysLeft < 0
        ? `${Math.abs(daysLeft)}일 지남`
        : daysLeft === 0
          ? '오늘까지'
          : `${daysLeft}일 남음`;

  return {
    current,
    baseline,
    target,
    achievePct,
    timePct,
    done,
    overdue,
    status,
    statusClass,
    deadlineLabel,
    daysLabel,
    currentLabel: formatGoalValue(goal, current),
    targetLabel: goal.target?.label || formatGoalValue(goal, target),
    baselineLabel: goal.baseline?.label || formatGoalValue(goal, baseline),
  };
}

function renderGoalTracker(goalsData, profile, gymLog, runLog) {
  const root = document.getElementById('dash-goals');
  if (!root) return;
  const goals = mergeGoals(goalsData);
  if (!goals.length) {
    root.innerHTML = '<p class="hint">등록된 목표가 없습니다.</p>';
    return;
  }

  root.innerHTML = goals
    .map((g) => {
      const p = computeGoalProgress(g, profile, gymLog, runLog);
      return `
    <article class="goal-track ${p.done ? 'goal-track--done' : p.statusClass === 'late' ? 'goal-track--late' : ''}">
      <div class="goal-track__head">
        <h3>${g.title}</h3>
        <span class="goal-track__badge goal-track__badge--${p.statusClass}">${p.status}</span>
      </div>
      <div class="goal-track__values">
        <span>현재 <strong>${p.currentLabel}</strong></span>
        <span>→ 목표 <strong>${p.targetLabel}</strong></span>
      </div>
      <p class="goal-track__deadline">기한 ${p.deadlineLabel}${p.daysLabel ? ` · ${p.daysLabel}` : ''}</p>
      <div class="goal-bar-row">
        <span><em>달성</em><em>${p.achievePct}%</em></span>
        <div class="goal-bar goal-bar--achieve"><i style="width:${p.achievePct}%"></i></div>
      </div>
      <div class="goal-bar-row">
        <span><em>기간 경과</em><em>${p.timePct}%</em></span>
        <div class="goal-bar goal-bar--time"><i style="width:${p.timePct}%"></i></div>
      </div>
      ${g.note ? `<p class="goal-track__note">${g.note}</p>` : ''}
    </article>`;
    })
    .join('');
}

function setupGoalForm(goalsData, profile, gymLog, runLog, onUpdate) {
  const form = document.getElementById('goal-form');
  const kindSel = form?.querySelector('[name="kind"]');
  if (!form) return;

  const toggleFields = () => {
    const kind = kindSel.value;
    form.querySelectorAll('[data-show]').forEach((el) => {
      el.style.display = el.dataset.show === kind ? '' : 'none';
    });
  };
  kindSel?.addEventListener('change', toggleFields);
  toggleFields();

  if (!form.dataset.defaultDeadline) {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    form.querySelector('[name="deadline"]').value = d.toISOString().slice(0, 10);
    form.dataset.defaultDeadline = '1';
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const kind = fd.get('kind');
    const title = String(fd.get('title')).trim();
    const targetValue = Number(fd.get('targetValue'));
    const deadline = fd.get('deadline');
    const baselineValue = fd.get('baselineValue');
    const baselineDate = fd.get('baselineDate') || todayISO();
    const note = String(fd.get('note') || '').trim();
    const id = `custom-${Date.now()}`;

    const goal = {
      id,
      title,
      kind,
      baseline: {
        value: baselineValue !== '' ? Number(baselineValue) : 0,
        date: baselineDate,
      },
      target: { value: targetValue },
      deadline,
      note,
    };

    if (kind === 'lift_kg') {
      goal.track = { exerciseMatch: String(fd.get('exerciseMatch') || title).trim() };
      goal.target.unit = 'kg';
    } else if (kind === 'run_distance_km') {
      goal.track = { type: 'longest' };
      goal.target.unit = 'km';
    } else if (kind === 'run_time_sec') {
      goal.track = { distanceKm: 10 };
      goal.target.unit = 'sec';
      goal.target.label = formatRunTime(targetValue);
    } else if (kind === 'bench_reps') {
      goal.track = { weightKg: Number(fd.get('weightKg') || 130) };
      goal.target.unit = 'reps';
    } else if (kind === 'custom') {
      goal.currentValue = baselineValue !== '' ? Number(baselineValue) : 0;
    }

    const store = loadGoalOverrides();
    const custom = store.custom || [];
    custom.push(goal);
    saveCustomGoals(custom);
    form.reset();
    toggleFields();
    if (onUpdate) onUpdate();
    document.getElementById('goal-form-panel')?.removeAttribute('open');
  };
}

function renderDashboard(profile, gymLog, runLog, insights, album, goalsData) {
  const goal = profile.prs.snatchGoal || 100;
  const updated = insights?.updated || profile.updated || '';
  document.getElementById('dash-updated').textContent = updated ? `데이터 ${updated}` : '';

  setupHeroMetrics(profile, gymLog, runLog);
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

  const benchRows = bench130Series(gymLog).map((r) => ({ date: r.date, reps: r.value }));
  const runs = [...runLog.sessions]
    .filter((r) => r.avgHr)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

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

  const refreshGoals = () => renderGoalTracker(goalsData, profile, gymLog, runLog);
  refreshGoals();
  setupGoalForm(goalsData, profile, gymLog, runLog, refreshGoals);

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
  loadJSON('data/goals.json'),
  loadJSON('data/album-inventory.json').catch(() => null),
])
  .then(([profile, gymLog, runLog, plan, insights, goalsData, album]) => {
    renderDashboard(profile, gymLog, runLog, insights, album, goalsData);
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
