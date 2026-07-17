const TYPE_COLOR = {
  Pull: '#60a5fa',
  Push: '#f87171',
  Leg: '#c084fc',
  Run: '#34d399',
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
  document.getElementById('week-note').textContent = `${plan.thisWeek.label} — ${plan.thisWeek.note}`;
  document.getElementById('week-checklist').innerHTML = plan.thisWeek.sessions
    .map(
      (s) => `
    <div class="check-item ${s.done ? 'check-item--done' : ''}">
      <span class="check-box">${s.done ? '✓' : ''}</span>
      <div>
        <strong>${s.day} · ${s.date.slice(5)}</strong>
        <p>${s.plan}</p>
      </div>
      <span class="check-status">${s.done ? '완료' : '예정'}</span>
    </div>`
    )
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
  document.getElementById('next-gym-items').innerHTML = plan.nextGymPrescription.items
    .map((i) => `<li>${i}</li>`)
    .join('');
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
    { label: '골격근', value: profile.body.skeletalMuscleKg, color: '#60a5fa' },
    { label: '체지방', value: profile.body.bodyFatKg, color: '#fbbf24' },
    { label: '기타', value: Math.round(other * 10) / 10, color: '#64748b' },
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
    colors: ['#f87171', '#c084fc', '#60a5fa', '#34d399', '#fbbf24'],
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

function renderCharts(gymLog, runLog, profile) {
  const gymSorted = [...gymLog.sessions]
    .filter((s) => s.totalVolumeKg)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  Charts.barChart(document.getElementById('chart-gym-volume'), {
    labels: gymSorted.map((s) => s.date.slice(5)),
    values: gymSorted.map((s) => Math.round(s.totalVolumeKg / 1000)),
    colors: gymSorted.map((s) => TYPE_COLOR[s.type] || '#3b82f6'),
    unit: '단위: 천 kg',
  });

  const runs = [...runLog.sessions].sort((a, b) => (a.date > b.date ? 1 : -1));
  Charts.barChart(document.getElementById('chart-run-distance'), {
    labels: runs.map((s) => s.date.slice(5)),
    values: runs.map((s) => s.distanceKm),
    colors: runs.map(() => TYPE_COLOR.Run),
    targetLine: 7,
    unit: 'km',
  });

  const gauges = document.getElementById('goal-gauges');
  gauges.innerHTML = '';
  // Snatch: power 85 toward squat 100 — technical progress approx 40% in phase 1
  Charts.gauge(gauges, {
    label: '스내치',
    pct: 40,
    sub: '파워 85 → 스쿼트 100 · Phase 1 (리시브)',
  });
  // 10k: distance rebuild — longest recent / 10
  const longest = Math.max(...runLog.sessions.map((r) => r.distanceKm), 0);
  Charts.gauge(gauges, {
    label: '10km',
    pct: Math.min(100, Math.round((longest / 10) * 100)),
    sub: `거리 복귀 ${longest}km / 10km · 페이스는 나중`,
  });
  // Time goal: 68 → 60, show how close on time once distance is back (informational)
  Charts.gauge(gauges, {
    label: '페이스 여력',
    pct: Math.min(100, Math.round(((90 - 68) / (90 - 60)) * 100)),
    sub: '5월 68분 베이스 있음 · 체중 유지 전략',
  });
}

function buildTimeline(gymLog, runLog) {
  const gym = gymLog.sessions.map((s) => ({ kind: 'gym', ...s }));
  const run = runLog.sessions.map((s) => ({ kind: 'run', type: 'Run', ...s }));
  return [...gym, ...run].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderTimeline(items, filter = 'all') {
  const filtered = items.filter((i) => filter === 'all' || i.type === filter);
  document.getElementById('session-count').textContent = `${filtered.length}세션`;

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

document.getElementById('result-filters').addEventListener('click', (e) => {
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
])
  .then(([profile, gymLog, runLog, plan]) => {
    renderPlan(plan);
    renderProfile(profile);
    renderKpis(gymLog, runLog, profile);
    renderCharts(gymLog, runLog, profile);
    renderHighlights(collectHighlights(gymLog));
    timelineItems = buildTimeline(gymLog, runLog);
    renderTimeline(timelineItems);
  })
  .catch((err) => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<pre style="color:#f87171;padding:1rem">로드 실패: ${err}\npython3 -m http.server 8080 으로 열어주세요.</pre>`
    );
  });
