/**
 * Textbook-style anatomical figure (educational, not a medical atlas).
 * Highlight keys: lats, midBack, rearDelt, erectors, glutes, hamstrings,
 * biceps, triceps, chest, frontDelt, shoulders, core, quads
 */
function createBodyMap(highlightKeys = [], mode = 'back') {
  const wrap = document.createElement('div');
  wrap.className = `body-map-svg body-map-svg--${mode}`;

  const uid = `bm-${Math.random().toString(36).slice(2, 8)}`;
  const on = (key) => highlightKeys.includes(key);

  const fill = (key, tier = 'primary') => {
    if (!on(key)) return `url(#${uid}-idle)`;
    return tier === 'primary' ? `url(#${uid}-hot)` : `url(#${uid}-warm)`;
  };

  const stroke = (key) => (on(key) ? `url(#${uid}-edge)` : '#4a5d78');
  const opacity = (key) => (on(key) ? '1' : '0.42');

  const back = `
    <!-- Head / neck -->
    <ellipse cx="100" cy="28" rx="18" ry="22" fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M88 48 C90 56 110 56 112 48 L108 62 L92 62 Z" fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="0.8"/>

    <!-- Torso shell -->
    <path d="M62 58
      C58 72 56 96 60 128
      L70 168 L90 176 L110 168 L130 128
      C134 96 132 72 128 58
      C118 52 110 50 100 50
      C90 50 82 52 72 58 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1.2"/>

    <!-- Arms -->
    <path d="M62 64 C48 78 34 108 28 138 L42 142 C48 116 58 90 70 76 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M138 64 C152 78 166 108 172 138 L158 142 C152 116 142 90 130 76 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M28 138 C24 158 26 178 34 198 L48 192 C42 174 40 156 42 142 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M172 138 C176 158 174 178 166 198 L152 192 C158 174 160 156 158 142 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>

    <!-- Legs -->
    <path d="M78 168 C74 198 72 230 76 268 L96 268 C98 232 98 200 100 176 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M122 168 C126 198 128 230 124 268 L104 268 C102 232 102 200 100 176 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>

    <!-- Traps / mid-back -->
    <path d="M78 58 C88 54 112 54 122 58 L118 78 C110 72 90 72 82 78 Z"
      fill="${fill('midBack')}" stroke="${stroke('midBack')}" stroke-width="1" opacity="${opacity('midBack')}"/>
    <path d="M86 76 C94 74 106 74 114 76 L110 102 L90 102 Z"
      fill="${fill('midBack')}" stroke="${stroke('midBack')}" stroke-width="1" opacity="${opacity('midBack')}"/>

    <!-- Rear delts -->
    <path d="M64 62 C56 68 52 78 54 86 C62 84 70 76 74 68 Z"
      fill="${fill('rearDelt')}" stroke="${stroke('rearDelt')}" stroke-width="1" opacity="${opacity('rearDelt')}"/>
    <path d="M136 62 C144 68 148 78 146 86 C138 84 130 76 126 68 Z"
      fill="${fill('rearDelt')}" stroke="${stroke('rearDelt')}" stroke-width="1" opacity="${opacity('rearDelt')}"/>

    <!-- Shoulders (upper) -->
    <path d="M68 56 C60 58 56 66 58 74 C66 72 74 66 78 60 Z"
      fill="${fill('shoulders', 'secondary')}" stroke="${stroke('shoulders')}" stroke-width="0.8" opacity="${opacity('shoulders')}"/>
    <path d="M132 56 C140 58 144 66 142 74 C134 72 126 66 122 60 Z"
      fill="${fill('shoulders', 'secondary')}" stroke="${stroke('shoulders')}" stroke-width="0.8" opacity="${opacity('shoulders')}"/>

    <!-- Lats (wing shape) -->
    <path d="M76 78
      C68 92 64 112 68 138
      C74 148 84 152 92 148
      L94 118 C92 100 88 86 84 78 Z"
      fill="${fill('lats')}" stroke="${stroke('lats')}" stroke-width="1.2" opacity="${opacity('lats')}"/>
    <path d="M124 78
      C132 92 136 112 132 138
      C126 148 116 152 108 148
      L106 118 C108 100 112 86 116 78 Z"
      fill="${fill('lats')}" stroke="${stroke('lats')}" stroke-width="1.2" opacity="${opacity('lats')}"/>

    <!-- Erectors -->
    <path d="M94 104 C96 130 96 150 98 168 L100 168 L102 168 C104 150 104 130 106 104 L100 100 Z"
      fill="${fill('erectors', 'secondary')}" stroke="${stroke('erectors')}" stroke-width="0.8" opacity="${opacity('erectors')}"/>

    <!-- Glutes -->
    <path d="M78 160 C74 170 76 182 88 186 C96 184 100 176 100 168 C94 164 86 160 78 160 Z"
      fill="${fill('glutes')}" stroke="${stroke('glutes')}" stroke-width="1" opacity="${opacity('glutes')}"/>
    <path d="M122 160 C126 170 124 182 112 186 C104 184 100 176 100 168 C106 164 114 160 122 160 Z"
      fill="${fill('glutes')}" stroke="${stroke('glutes')}" stroke-width="1" opacity="${opacity('glutes')}"/>

    <!-- Hamstrings -->
    <path d="M80 188 C78 210 78 235 82 262 L94 262 C96 236 96 212 96 192 C90 190 84 188 80 188 Z"
      fill="${fill('hamstrings')}" stroke="${stroke('hamstrings')}" stroke-width="1" opacity="${opacity('hamstrings')}"/>
    <path d="M120 188 C122 210 122 235 118 262 L106 262 C104 236 104 212 104 192 C110 190 116 188 120 188 Z"
      fill="${fill('hamstrings')}" stroke="${stroke('hamstrings')}" stroke-width="1" opacity="${opacity('hamstrings')}"/>

    <!-- Biceps (arm flexors visible from back-oblique) -->
    <path d="M40 100 C34 112 32 126 34 138 L46 136 C46 122 48 110 50 100 Z"
      fill="${fill('biceps', 'secondary')}" stroke="${stroke('biceps')}" stroke-width="0.8" opacity="${opacity('biceps')}"/>
    <path d="M160 100 C166 112 168 126 166 138 L154 136 C154 122 152 110 150 100 Z"
      fill="${fill('biceps', 'secondary')}" stroke="${stroke('biceps')}" stroke-width="0.8" opacity="${opacity('biceps')}"/>

    <!-- Triceps -->
    <path d="M52 88 C46 104 42 122 40 138 L50 140 C54 122 58 104 60 90 Z"
      fill="${fill('triceps', 'secondary')}" stroke="${stroke('triceps')}" stroke-width="0.8" opacity="${opacity('triceps')}"/>
    <path d="M148 88 C154 104 158 122 160 138 L150 140 C146 122 142 104 140 90 Z"
      fill="${fill('triceps', 'secondary')}" stroke="${stroke('triceps')}" stroke-width="0.8" opacity="${opacity('triceps')}"/>
  `;

  const front = `
    <ellipse cx="100" cy="28" rx="18" ry="22" fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M88 48 C90 56 110 56 112 48 L108 62 L92 62 Z" fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="0.8"/>

    <path d="M64 58
      C60 78 58 108 64 140
      L78 170 L100 176 L122 170 L136 140
      C142 108 140 78 136 58
      C124 50 112 48 100 48
      C88 48 76 50 64 58 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1.2"/>

    <path d="M64 64 C50 80 36 110 30 140 L44 144 C50 116 60 88 72 74 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M136 64 C150 80 164 110 170 140 L156 144 C150 116 140 88 128 74 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M30 140 C26 160 28 180 36 200 L50 194 C44 176 42 158 44 144 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M170 140 C174 160 172 180 164 200 L150 194 C156 176 158 158 156 144 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>

    <path d="M78 168 C74 200 72 232 76 268 L96 268 C98 234 98 202 100 176 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>
    <path d="M122 168 C126 200 128 232 124 268 L104 268 C102 234 102 202 100 176 Z"
      fill="url(#${uid}-skin)" stroke="#5a6f8c" stroke-width="1"/>

    <!-- Chest -->
    <path d="M72 62 C78 78 86 90 100 94 C114 90 122 78 128 62 L118 58 C110 68 90 68 82 58 Z"
      fill="${fill('chest')}" stroke="${stroke('chest')}" stroke-width="1.2" opacity="${opacity('chest')}"/>
    <path d="M74 64 C70 72 78 84 92 88 L96 72 C88 70 80 66 74 64 Z"
      fill="${fill('chest')}" stroke="${stroke('chest')}" stroke-width="0.6" opacity="${opacity('chest')}"/>
    <path d="M126 64 C130 72 122 84 108 88 L104 72 C112 70 120 66 126 64 Z"
      fill="${fill('chest')}" stroke="${stroke('chest')}" stroke-width="0.6" opacity="${opacity('chest')}"/>

    <!-- Front delts -->
    <path d="M66 58 C58 64 54 74 56 84 C66 80 74 70 78 62 Z"
      fill="${fill('frontDelt')}" stroke="${stroke('frontDelt')}" stroke-width="1" opacity="${opacity('frontDelt')}"/>
    <path d="M134 58 C142 64 146 74 144 84 C134 80 126 70 122 62 Z"
      fill="${fill('frontDelt')}" stroke="${stroke('frontDelt')}" stroke-width="1" opacity="${opacity('frontDelt')}"/>
    <path d="M66 58 C58 64 54 74 56 84 C66 80 74 70 78 62 Z"
      fill="${fill('shoulders')}" stroke="${stroke('shoulders')}" stroke-width="0" opacity="${on('shoulders') && !on('frontDelt') ? opacity('shoulders') : '0'}"/>
    <path d="M134 58 C142 64 146 74 144 84 C134 80 126 70 122 62 Z"
      fill="${fill('shoulders')}" stroke="${stroke('shoulders')}" stroke-width="0" opacity="${on('shoulders') && !on('frontDelt') ? opacity('shoulders') : '0'}"/>

    <!-- Core -->
    <path d="M88 96 L112 96 L110 148 L90 148 Z"
      fill="${fill('core', 'secondary')}" stroke="${stroke('core')}" stroke-width="0.8" opacity="${opacity('core')}"/>
    <path d="M100 96 L100 148" stroke="#5a6f8c" stroke-width="0.6" opacity="0.5"/>

    <!-- Biceps -->
    <path d="M44 92 C38 108 36 124 38 140 L52 138 C52 120 54 106 56 94 Z"
      fill="${fill('biceps')}" stroke="${stroke('biceps')}" stroke-width="1" opacity="${opacity('biceps')}"/>
    <path d="M156 92 C162 108 164 124 162 140 L148 138 C148 120 146 106 144 94 Z"
      fill="${fill('biceps')}" stroke="${stroke('biceps')}" stroke-width="1" opacity="${opacity('biceps')}"/>

    <!-- Triceps -->
    <path d="M56 86 C50 104 46 122 44 140 L54 142 C58 122 62 104 64 88 Z"
      fill="${fill('triceps', 'secondary')}" stroke="${stroke('triceps')}" stroke-width="0.8" opacity="${opacity('triceps')}"/>
    <path d="M144 86 C150 104 154 122 156 140 L146 142 C142 122 138 104 136 88 Z"
      fill="${fill('triceps', 'secondary')}" stroke="${stroke('triceps')}" stroke-width="0.8" opacity="${opacity('triceps')}"/>

    <!-- Quads -->
    <path d="M80 176 C78 205 78 235 82 262 L96 262 C98 232 98 204 98 184 C92 180 84 176 80 176 Z"
      fill="${fill('quads')}" stroke="${stroke('quads')}" stroke-width="1" opacity="${opacity('quads')}"/>
    <path d="M120 176 C122 205 122 235 118 262 L104 262 C102 232 102 204 102 184 C108 180 116 176 120 176 Z"
      fill="${fill('quads')}" stroke="${stroke('quads')}" stroke-width="1" opacity="${opacity('quads')}"/>

    <!-- Glute/hip hint -->
    <path d="M78 164 C86 172 114 172 122 164 L118 174 L82 174 Z"
      fill="${fill('glutes', 'secondary')}" stroke="${stroke('glutes')}" stroke-width="0.8" opacity="${opacity('glutes')}"/>

    <!-- Lat side wings -->
    <path d="M68 78 C62 100 62 122 68 142 L78 138 C74 118 74 96 76 82 Z"
      fill="${fill('lats', 'secondary')}" stroke="${stroke('lats')}" stroke-width="0.8" opacity="${opacity('lats')}"/>
    <path d="M132 78 C138 100 138 122 132 142 L122 138 C126 118 126 96 124 82 Z"
      fill="${fill('lats', 'secondary')}" stroke="${stroke('lats')}" stroke-width="0.8" opacity="${opacity('lats')}"/>
  `;

  wrap.innerHTML = `
  <svg viewBox="0 0 200 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${mode === 'back' ? '후면' : '전면'} 근육도">
    <defs>
      <linearGradient id="${uid}-skin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d7c4b0"/>
        <stop offset="45%" stop-color="#c4ad97"/>
        <stop offset="100%" stop-color="#a8907c"/>
      </linearGradient>
      <linearGradient id="${uid}-hot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff7b72"/>
        <stop offset="100%" stop-color="#e11d48"/>
      </linearGradient>
      <linearGradient id="${uid}-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <linearGradient id="${uid}-idle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8aa0bc"/>
        <stop offset="100%" stop-color="#5d7391"/>
      </linearGradient>
      <linearGradient id="${uid}-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fecaca"/>
        <stop offset="100%" stop-color="#fb7185"/>
      </linearGradient>
      <filter id="${uid}-soft" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="200" height="290" rx="16" fill="#121a24"/>
    <g filter="url(#${uid}-soft)">
      ${mode === 'back' ? back : front}
    </g>
    <text x="100" y="282" text-anchor="middle" fill="#8b9cb3" font-size="10" font-family="system-ui,sans-serif">
      ${mode === 'back' ? 'Posterior view' : 'Anterior view'}
    </text>
  </svg>`;

  return wrap;
}

window.createBodyMap = createBodyMap;
