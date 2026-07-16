async function loadExercises() {
  const res = await fetch('data/anatomy-exercises.json');
  return res.json();
}

function fillList(ul, items) {
  ul.innerHTML = '';
  items.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

function renderExercises(exercises, category = 'all') {
  const grid = document.getElementById('exercise-grid');
  const tpl = document.getElementById('exercise-card-tpl');
  grid.innerHTML = '';

  exercises
    .filter((ex) => category === 'all' || ex.category === category)
    .forEach((ex) => {
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector('.exercise-card');
      card.dataset.category = ex.category;

      node.querySelector('.badge-cat').textContent = ex.category;
      node.querySelector('.ex-name').textContent = ex.name;
      node.querySelector('.ex-en').textContent = ex.nameEn;
      node.querySelector('.ex-pattern').textContent = ex.pattern;

      const mapMode = ['Push'].includes(ex.category) ? 'front' : 'back';
      // snatch / squat show useful on back-ish; bench front
      const mode = ex.id === 'bench' || ex.id === 'squat' ? (ex.id === 'bench' ? 'front' : 'front') : mapMode;
      node.querySelector('.body-map').appendChild(createBodyMap(ex.highlight || [], mode));

      fillList(node.querySelector('.primary-list'), ex.primary);
      fillList(node.querySelector('.secondary-list'), ex.secondary);

      const joints = node.querySelector('.joint-list');
      joints.innerHTML = '';
      ex.joints.forEach((j) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${j.joint}</strong> — ${j.action}`;
        joints.appendChild(li);
      });

      node.querySelector('.why-text').textContent = ex.why;
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
    renderExercises(allExercises);
  })
  .catch((err) => {
    document.getElementById('exercise-grid').innerHTML =
      `<div class="card"><p>해부학 데이터를 불러오지 못했습니다. 로컬 서버로 열어주세요.</p><pre>${err}</pre></div>`;
  });
