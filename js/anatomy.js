async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function fillList(ul, items) {
  ul.innerHTML = '';
  (items || []).forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

function renderExercises(exercises, manifest, category = 'all') {
  const grid = document.getElementById('exercise-grid');
  const tpl = document.getElementById('exercise-card-tpl');
  grid.innerHTML = '';

  exercises
    .filter((ex) => category === 'all' || ex.category === category)
    .forEach((ex) => {
      const node = tpl.content.cloneNode(true);

      node.querySelector('.badge-cat').textContent = ex.category;
      node.querySelector('.ex-name').textContent = ex.name;
      node.querySelector('.ex-en').textContent = ex.nameEn;
      node.querySelector('.ex-pattern').textContent = ex.pattern;
      node.querySelector('.ex-plane').textContent = ex.plane || '—';
      node.querySelector('.ex-chain').textContent = ex.chain || '—';

      const chips = node.querySelector('.primary-chips');
      chips.innerHTML = (ex.primary || [])
        .map((m) => `<span class="focus-chip">${m.split('(')[0].trim()}</span>`)
        .join('');

      const viewSrc =
        ex.view === 'anterior' ? manifest.files.anterior : manifest.files.posterior;
      const plateImg = node.querySelector('.ex-plate-img');
      plateImg.src = viewSrc;
      plateImg.alt = `${ex.name} — ${ex.view} overview`;
      node.querySelector('.ex-plate-cap').textContent =
        ex.view === 'anterior' ? 'OpenStax · Anterior' : 'OpenStax · Posterior';

      const d1 = manifest.detail[ex.detailKey];
      const img1 = node.querySelector('.detail-img-1');
      if (d1) {
        img1.src = d1;
        img1.alt = `${ex.name} detail`;
      } else {
        node.querySelector('.detail-plates').classList.add('hidden');
      }

      if (ex.detailKey2 && manifest.detail[ex.detailKey2]) {
        const wrap2 = node.querySelector('.detail-plate-2');
        wrap2.classList.remove('hidden');
        const img2 = node.querySelector('.detail-img-2');
        img2.src = manifest.detail[ex.detailKey2];
        img2.alt = `${ex.name} detail 2`;
      }

      fillList(node.querySelector('.primary-list'), ex.primary);
      fillList(node.querySelector('.secondary-list'), ex.secondary);

      const oi = node.querySelector('.oi-list');
      oi.innerHTML = '';
      if (ex.originInsertion && ex.originInsertion.length) {
        ex.originInsertion.forEach((row) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${row.muscle}</strong><br><span class="hint">기시: ${row.origin}<br>정지: ${row.insertion}</span>`;
          oi.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'hint';
        li.textContent = '복합 동작 — 단일 기시/정지보다 운동사슬·타이밍이 핵심';
        oi.appendChild(li);
      }

      fillList(
        node.querySelector('.innervation-list'),
        ex.innervation && ex.innervation.length
          ? ex.innervation
          : ['(복합 — 주요 신경은 주동근 항목 참고)']
      );

      const joints = node.querySelector('.joint-list');
      joints.innerHTML = '';
      ex.joints.forEach((j) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${j.joint}</strong> — ${j.action}`;
        joints.appendChild(li);
      });

      node.querySelector('.why-text').textContent = ex.why;
      node.querySelector('.exam-tip').textContent = ex.examTip || '';
      fillList(node.querySelector('.cue-list'), ex.cues);
      node.querySelector('.level-note').textContent = ex.levelNote || '';
      const mn = node.querySelector('.machine-note');
      if (ex.machineNote) mn.textContent = ex.machineNote;
      else mn.remove();

      grid.appendChild(node);
    });
}

let allExercises = [];
let manifest = null;

document.getElementById('category-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#category-filters .chip').forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  renderExercises(allExercises, manifest, btn.dataset.cat);
});

Promise.all([
  loadJSON('data/anatomy-exercises.json'),
  loadJSON('assets/anatomy/manifest.json'),
])
  .then(([data, man]) => {
    allExercises = data.exercises;
    manifest = man;
    if (data.meta) {
      document.getElementById('meta-purpose').textContent = data.meta.purpose || '';
      document.getElementById('meta-disclaimer').textContent = data.meta.disclaimer || '';
    }
    document.getElementById('meta-attribution').textContent =
      (man.attribution || []).join(' · ');
    renderExercises(allExercises, manifest);
  })
  .catch((err) => {
    document.getElementById('exercise-grid').innerHTML =
      `<div class="card"><p>해부학 데이터를 불러오지 못했습니다.</p><pre>${err}</pre></div>`;
  });
