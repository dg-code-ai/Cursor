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

function renderProfile(profile) {
  const body = document.getElementById('body-stats');
  body.innerHTML = `
    <div class="pill"><span>체중</span><strong>${profile.body.weightKg} kg</strong></div>
    <div class="pill"><span>골격근</span><strong>${profile.body.skeletalMuscleKg} kg</strong></div>
    <div class="pill"><span>체지방</span><strong>${profile.body.bodyFatKg} kg (${profile.body.bodyFatPercent}%)</strong></div>
  `;

  const pr = document.getElementById('pr-stats');
  pr.innerHTML = `
    <div class="pill"><span>벤치</span><strong>${profile.prs.benchPress}</strong></div>
    <div class="pill"><span>스쿼트</span><strong>${profile.prs.squat}</strong></div>
    <div class="pill"><span>데드</span><strong>${profile.prs.deadlift}</strong></div>
    <div class="pill"><span>파워스내치</span><strong>${profile.prs.powerSnatch}</strong></div>
    <div class="pill"><span>C&J</span><strong>${profile.prs.cleanAndJerk}</strong></div>
    <div class="pill"><span>10k 베스트</span><strong>${profile.prs.tenKBest.timeMin}분</strong></div>
  `;

  document.getElementById('profile-notes').textContent =
    `${profile.notes.split} · 헬스 ${profile.notes.gym} · 역도 ${profile.notes.weightlifting} · ${profile.notes.injury}`;
}

function renderGoals(profile) {
  const board = document.getElementById('goals-board');
  board.innerHTML = profile.goals
    .map((g) => {
      const snatchProgress = g.id === 'snatch100' ? 85 / 100 : g.id === 'tenk60' ? 68 / 60 : 0;
      // for tenk lower time is better — show inverted visual as "gap closing" from recent short runs
      const pct =
        g.id === 'snatch100'
          ? Math.min(100, Math.round((85 / 100) * 100))
          : 40; // distance rebuild phase visual
      return `
      <div class="goal-card">
        <div class="goal-card__head">
          <h3>${g.title}</h3>
          <span class="badge-cat">${g.deadline}</span>
        </div>
        <p class="hint">현재: ${g.current}</p>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <p class="hint">Phase: ${g.phase}</p>
      </div>`;
    })
    .join('');
}

function renderWeekend(runLog) {
  const el = document.getElementById('weekend-plan');
  el.innerHTML = runLog.plan.thisWeekend
    .map(
      (d) => `
    <div class="weekend-item">
      <strong>${d.day}</strong>
      <span>${d.date}</span>
      <span>${d.target}</span>
    </div>`
    )
    .join('');
  document.getElementById('run-principle').textContent = runLog.plan.principle;
}

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
  return items.slice(0, 12);
}

function renderHighlights(items) {
  document.getElementById('highlights').innerHTML = items
    .map(
      (i) => `
    <div class="hl-item ${i.overload ? 'hl-item--up' : ''}">
      <span class="hl-date">${i.date.slice(5)} · ${i.type}</span>
      <strong>${i.name}</strong>
      <span>${i.highlight}${i.overload ? ' ↑' : ''}</span>
    </div>`
    )
    .join('');
}

function buildTimeline(gymLog, runLog) {
  const gym = gymLog.sessions.map((s) => ({ kind: 'gym', ...s }));
  const run = runLog.sessions.map((s) => ({ kind: 'run', type: 'Run', ...s }));
  return [...gym, ...run].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderTimeline(items, filter = 'all') {
  const filtered = items.filter((i) => filter === 'all' || i.type === filter);
  document.getElementById('session-count').textContent = `${filtered.length}세션`;

  const root = document.getElementById('timeline');
  root.innerHTML = filtered
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
          ${
            s.avgHr
              ? `<div class="tl-meta">HR ${s.avgHr} · Cadence ${s.avgCadence || '—'} · Power ${s.avgPower || '—'}W</div>`
              : ''
          }
        </article>`;
      }

      const exHtml = (s.exercises || [])
        .map(
          (ex) => `
        <div class="tl-ex">
          <div class="tl-ex__name">${ex.name}${ex.overload ? ' <span class="up">↑</span>' : ''}</div>
          <div class="tl-ex__sets">${ex.workingHighlight ? `<em>${ex.workingHighlight}</em> · ` : ''}${formatSets(ex.sets)}</div>
          ${ex.note ? `<div class="hint">${ex.note}</div>` : ''}
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

document.getElementById('type-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#type-filters .chip').forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  renderTimeline(timelineItems, btn.dataset.type);
});

Promise.all([
  loadJSON('data/athlete-profile.json'),
  loadJSON('data/sessions/gym-log.json'),
  loadJSON('data/sessions/run-log.json'),
])
  .then(([profile, gymLog, runLog]) => {
    renderProfile(profile);
    renderGoals(profile);
    renderWeekend(runLog);
    renderHighlights(collectHighlights(gymLog));
    timelineItems = buildTimeline(gymLog, runLog);
    renderTimeline(timelineItems);
  })
  .catch((err) => {
    document.getElementById('timeline').innerHTML =
      `<p>데이터를 불러오지 못했습니다. <code>python3 -m http.server 8080</code>으로 열어주세요.</p><pre>${err}</pre>`;
  });
