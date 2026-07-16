/** Lightweight SVG charts — no external deps */

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function maxOf(arr, fallback = 1) {
  return Math.max(fallback, ...arr);
}

/** Vertical bar chart */
function barChart(container, { labels, values, colors, targetLine, unit = '' }) {
  container.innerHTML = '';
  const w = 360;
  const h = 180;
  const pad = { t: 16, r: 12, b: 36, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = maxOf([...values, targetLine || 0]);
  const n = values.length || 1;
  const gap = 6;
  const barW = Math.max(8, (innerW - gap * (n - 1)) / n);

  const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-svg', role: 'img' });

  // grid
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (innerH * i) / 3;
    const val = Math.round(max * (1 - i / 3));
    svg.appendChild(el('line', { x1: pad.l, y1: y, x2: w - pad.r, y2: y, stroke: '#2d3a4f', 'stroke-width': '1' }));
    svg.appendChild(el('text', { x: pad.l - 6, y: y + 3, fill: '#8b9cb3', 'font-size': '9', 'text-anchor': 'end' }, [String(val)]));
  }

  if (targetLine) {
    const ty = pad.t + innerH * (1 - targetLine / max);
    svg.appendChild(
      el('line', {
        x1: pad.l,
        y1: ty,
        x2: w - pad.r,
        y2: ty,
        stroke: '#34d399',
        'stroke-width': '1.5',
        'stroke-dasharray': '4 3',
      })
    );
  }

  values.forEach((v, i) => {
    const x = pad.l + i * (barW + gap);
    const bh = (v / max) * innerH;
    const y = pad.t + innerH - bh;
    svg.appendChild(
      el('rect', {
        x,
        y,
        width: barW,
        height: Math.max(bh, 1),
        rx: 4,
        fill: colors?.[i] || '#3b82f6',
      })
    );
    svg.appendChild(
      el('text', {
        x: x + barW / 2,
        y: h - 12,
        fill: '#8b9cb3',
        'font-size': '9',
        'text-anchor': 'middle',
      }, [labels[i] || ''])
    );
  });

  if (unit) {
    svg.appendChild(el('text', { x: pad.l, y: 12, fill: '#8b9cb3', 'font-size': '9' }, [unit]));
  }

  container.appendChild(svg);
}

/** Horizontal bar for PRs */
function hBarChart(container, { labels, values, maxRef, colors }) {
  container.innerHTML = '';
  const w = 360;
  const rowH = 28;
  const h = labels.length * rowH + 16;
  const padL = 72;
  const padR = 48;
  const max = maxRef || maxOf(values);
  const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-svg' });

  labels.forEach((label, i) => {
    const y = 12 + i * rowH;
    const bw = ((values[i] / max) * (w - padL - padR));
    svg.appendChild(el('text', { x: 4, y: y + 12, fill: '#8b9cb3', 'font-size': '11' }, [label]));
    svg.appendChild(el('rect', { x: padL, y: y, width: Math.max(bw, 2), height: 16, rx: 4, fill: colors?.[i] || '#3b82f6' }));
    svg.appendChild(
      el('text', { x: padL + bw + 6, y: y + 12, fill: '#e8edf4', 'font-size': '11' }, [String(values[i])])
    );
  });

  container.appendChild(svg);
}

/** Donut for body comp */
function donutChart(container, segments) {
  container.innerHTML = '';
  const size = 140;
  const cx = 70;
  const cy = 70;
  const r = 48;
  const stroke = 18;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const c = 2 * Math.PI * r;
  const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart-svg chart-svg--donut' });

  let offset = 0;
  segments.forEach((seg) => {
    const len = (seg.value / total) * c;
    svg.appendChild(
      el('circle', {
        cx,
        cy,
        r,
        fill: 'none',
        stroke: seg.color,
        'stroke-width': stroke,
        'stroke-dasharray': `${len} ${c - len}`,
        'stroke-dashoffset': -offset,
        transform: `rotate(-90 ${cx} ${cy})`,
      })
    );
    offset += len;
  });

  svg.appendChild(el('text', { x: cx, y: cy - 2, fill: '#e8edf4', 'font-size': '13', 'text-anchor': 'middle', 'font-weight': '700' }, ['106']));
  svg.appendChild(el('text', { x: cx, y: cy + 14, fill: '#8b9cb3', 'font-size': '9', 'text-anchor': 'middle' }, ['kg']));
  container.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  legend.innerHTML = segments
    .map((s) => `<span><i style="background:${s.color}"></i>${s.label} ${s.value}kg</span>`)
    .join('');
  container.appendChild(legend);
}

/** Circular gauge 0-100 */
function gauge(container, { label, pct, sub }) {
  const wrap = document.createElement('div');
  wrap.className = 'gauge';
  const size = 120;
  const r = 46;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = (clamped / 100) * c;
  wrap.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" class="chart-svg">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="#2d3a4f" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="#3b82f6" stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray="${filled} ${c - filled}"
        transform="rotate(-90 60 60)"/>
      <text x="60" y="56" text-anchor="middle" fill="#e8edf4" font-size="18" font-weight="700">${Math.round(clamped)}%</text>
      <text x="60" y="74" text-anchor="middle" fill="#8b9cb3" font-size="9">${label}</text>
    </svg>
    <p class="hint">${sub || ''}</p>
  `;
  container.appendChild(wrap);
}

window.Charts = { barChart, hBarChart, donutChart, gauge };
