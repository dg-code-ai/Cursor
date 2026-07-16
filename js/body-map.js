/** Simple front/back body SVG with highlightable muscle regions */
function createBodyMap(highlightKeys = [], mode = 'back') {
  const wrap = document.createElement('div');
  wrap.className = `body-map-svg body-map-svg--${mode}`;

  const isOn = (key) => highlightKeys.includes(key);
  const cls = (key, tier = 'primary') =>
    isOn(key) ? (tier === 'primary' ? 'm-on' : 'm-sec') : 'm-off';

  // Educational silhouette — not a medical atlas
  wrap.innerHTML = `
  <svg viewBox="0 0 120 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="근육 실루엣">
    <defs>
      <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a4a63"/>
        <stop offset="100%" stop-color="#2a3548"/>
      </linearGradient>
    </defs>
    <!-- torso base -->
    <ellipse cx="60" cy="22" rx="14" ry="16" fill="url(#skin)"/>
    <path d="M38 40 C34 70 34 100 40 125 L50 125 C48 95 48 70 52 48 Z" fill="url(#skin)"/>
    <path d="M82 40 C86 70 86 100 80 125 L70 125 C72 95 72 70 68 48 Z" fill="url(#skin)"/>
    <path d="M45 38 L75 38 L78 95 L70 130 L50 130 L42 95 Z" fill="url(#skin)"/>

    <!-- legs base -->
    <path d="M50 130 L48 200 L56 200 L60 135 Z" fill="url(#skin)"/>
    <path d="M70 130 L72 200 L64 200 L60 135 Z" fill="url(#skin)"/>

    <!-- arms base -->
    <path d="M38 48 L18 95 L26 98 L44 58 Z" fill="url(#skin)"/>
    <path d="M82 48 L102 95 L94 98 L76 58 Z" fill="url(#skin)"/>

    ${mode === 'back' ? `
      <!-- lats -->
      <path class="${cls('lats')}" d="M46 55 C40 75 40 100 48 118 L58 110 C54 90 54 70 56 58 Z"/>
      <path class="${cls('lats')}" d="M74 55 C80 75 80 100 72 118 L62 110 C66 90 66 70 64 58 Z"/>
      <!-- mid back / rhomboids -->
      <path class="${cls('midBack')}" d="M52 52 L68 52 L66 78 L54 78 Z"/>
      <!-- rear delt -->
      <ellipse class="${cls('rearDelt')}" cx="40" cy="50" rx="8" ry="6"/>
      <ellipse class="${cls('rearDelt')}" cx="80" cy="50" rx="8" ry="6"/>
      <!-- erectors -->
      <path class="${cls('erectors', 'secondary')}" d="M56 80 L60 120 L64 80 Z"/>
      <!-- glutes -->
      <ellipse class="${cls('glutes')}" cx="52" cy="138" rx="10" ry="8"/>
      <ellipse class="${cls('glutes')}" cx="68" cy="138" rx="10" ry="8"/>
      <!-- hamstrings -->
      <path class="${cls('hamstrings')}" d="M48 148 L50 185 L56 185 L58 150 Z"/>
      <path class="${cls('hamstrings')}" d="M72 148 L70 185 L64 185 L62 150 Z"/>
      <!-- biceps (side of arms when pulling) -->
      <path class="${cls('biceps', 'secondary')}" d="M28 70 L22 88 L28 90 L32 74 Z"/>
      <path class="${cls('biceps', 'secondary')}" d="M92 70 L98 88 L92 90 L88 74 Z"/>
      <!-- shoulders (upper) -->
      <ellipse class="${cls('shoulders', 'secondary')}" cx="42" cy="46" rx="7" ry="5"/>
      <ellipse class="${cls('shoulders', 'secondary')}" cx="78" cy="46" rx="7" ry="5"/>
    ` : `
      <!-- chest -->
      <path class="${cls('chest')}" d="M48 50 C50 62 54 70 60 72 C66 70 70 62 72 50 L68 48 L52 48 Z"/>
      <!-- front delt -->
      <ellipse class="${cls('frontDelt')}" cx="42" cy="48" rx="8" ry="6"/>
      <ellipse class="${cls('frontDelt')}" cx="78" cy="48" rx="8" ry="6"/>
      <!-- shoulders general -->
      <ellipse class="${cls('shoulders')}" cx="42" cy="48" rx="8" ry="6"/>
      <ellipse class="${cls('shoulders')}" cx="78" cy="48" rx="8" ry="6"/>
      <!-- biceps -->
      <path class="${cls('biceps')}" d="M30 68 L24 88 L30 92 L34 72 Z"/>
      <path class="${cls('biceps')}" d="M90 68 L96 88 L90 92 L86 72 Z"/>
      <!-- triceps -->
      <path class="${cls('triceps', 'secondary')}" d="M34 70 L28 90 L34 92 L38 74 Z"/>
      <path class="${cls('triceps', 'secondary')}" d="M86 70 L92 90 L86 92 L82 74 Z"/>
      <!-- core / abs -->
      <path class="${cls('core', 'secondary')}" d="M54 78 L66 78 L64 118 L56 118 Z"/>
      <!-- quads -->
      <path class="${cls('quads')}" d="M48 140 L50 185 L58 185 L58 145 Z"/>
      <path class="${cls('quads')}" d="M72 140 L70 185 L62 185 L62 145 Z"/>
      <!-- glutes hint from front (hips) -->
      <ellipse class="${cls('glutes', 'secondary')}" cx="60" cy="132" rx="14" ry="6"/>
      <!-- lats side hint -->
      <path class="${cls('lats', 'secondary')}" d="M44 60 L40 100 L46 100 Z"/>
      <path class="${cls('lats', 'secondary')}" d="M76 60 L80 100 L74 100 Z"/>
    `}
  </svg>`;

  return wrap;
}

window.createBodyMap = createBodyMap;
