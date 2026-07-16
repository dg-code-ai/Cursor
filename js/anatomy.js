async function loadExercises() {
  const res = await fetch('data/anatomy-exercises.json');
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

function mapModeFor(ex) {
  if (ex.id === 'bench' || ex.id === 'squat' || ex.id === 'ezcurl') return 'front';
  if (ex.category === 'Push') return 'front';
  return 'back';
}

function renderExercises(exercises, category = 'all') {
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

      node.querySelector('.body-map').appendChild(
        createBodyMap(ex.highlight || [], mapModeFor(ex))
      );

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

      fillList(node.querySelector('.innervation-list'), ex.innervation && ex.innervation.length ? ex.innervation : ['(복합 — 주요 신경은 주동근 항목 참고)']);

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

document.getElementById('category-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#category-filters .chip').forEach((c) => c.classList.remove('active'));
  btn.classList.add('active');
  renderExercises(allExercises, btn.dataset.cat);
});

loadExercises()
  .then((data) => {
    allExercises = data.exercises;
    if (data.meta) {
      document.getElementById('meta-purpose').textContent = data.meta.purpose || '';
      document.getElementById('meta-disclaimer').textContent = data.meta.disclaimer || '';
    }
    renderExercises(allExercises);
  })
  .catch((err) => {
    document.getElementById('exercise-grid').innerHTML =
      `<div class="card"><p>해부학 데이터를 불러오지 못했습니다. 로컬 서버로 열어주세요.</p><pre>${err}</pre></div>`;
  });
