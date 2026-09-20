/**
 * Inline SVG chart builders. No libraries — every chart here is a handful of
 * paths computed from the data, which keeps them sharp at any zoom and lets
 * them inherit the interface palette.
 */

const NS = 'http://www.w3.org/2000/svg';

export const AX = 'rgba(150,170,196,.40)';
export const GRID = 'rgba(120,150,190,.13)';
export const INK = 'rgba(198,214,236,.72)';
export const ACCENT = '#8fc6ff';
export const HOT = '#ffd48a';
export const LIVE = '#7dffb2';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Wrap chart markup with a caption and a horizontal scroll guard. */
export function figure(title, svg, caption) {
  return `
    <figure class="chart">
      <figcaption class="chart-title">${esc(title)}</figcaption>
      <div class="chart-scroll">${svg}</div>
      ${caption ? `<p class="chart-note">${caption}</p>` : ''}
    </figure>`;
}

/* ── logarithmic timeline ────────────────────────────────────────────── */

/**
 * The universe's history spans 60 orders of magnitude in time, so only a log
 * axis can show the first second and the last ten billion years at once.
 * @param {Array} events [{t: seconds, label, sub, color}]
 */
export function logTimeline(events, {
  min = 1e-44, max = 4.35e17, w = 980, lanes = 7,
  tickStep = 6, tickFormat = null, axisLabel = 'TIME SINCE THE BIG BANG →',
} = {}) {
  const padL = 14, padR = 14, padT = 16, padB = 44;
  const laneH = 18;
  const h = padT + lanes * laneH + padB + 16;
  const iw = w - padL - padR;
  const lmin = Math.log10(min), lmax = Math.log10(max);
  const x = (t) => padL + ((Math.log10(t) - lmin) / (lmax - lmin)) * iw;
  const baseY = h - padB;

  let decades = '';
  for (let e = Math.ceil(lmin); e <= Math.floor(lmax); e += tickStep) {
    const px = x(Math.pow(10, e));
    const anchor = px < 30 ? 'start' : px > w - 34 ? 'end' : 'middle';
    decades += `<line x1="${px.toFixed(1)}" y1="${padT}" x2="${px.toFixed(1)}" y2="${baseY}" stroke="${GRID}"/>
      <text x="${px.toFixed(1)}" y="${baseY + 15}" fill="${AX}" font-size="8.5" text-anchor="${anchor}"
        font-family="var(--mono)">${tickFormat ? tickFormat(e) : `10${sup(e)} s`}</text>`;
  }

  /*
   * Late events crowd into the last few percent of a log axis, so a fixed
   * row rotation guarantees overlaps. Instead each label claims the first
   * lane whose previous label has cleared it — and flips to right-aligned
   * near the edge rather than running off the chart.
   */
  const CH = 5.35;                                  // monospace advance at 9.5px
  const laneEnd = new Array(lanes).fill(-Infinity);
  let marks = '';

  for (const ev of events) {
    const px = x(ev.t);
    const textW = Math.max(ev.label.length, ev.sub.length) * CH + 12;
    const flip = px + textW > w - padR;
    const left = flip ? px - textW : px;
    const right = flip ? px : px + textW;

    let lane = 0;
    while (lane < lanes - 1 && laneEnd[lane] > left - 6) lane++;
    laneEnd[lane] = right;

    const ty = padT + 10 + lane * laneH;
    const col = ev.color || ACCENT;
    const tx = flip ? px - 5 : px + 5;
    const anchor = flip ? 'end' : 'start';
    marks += `
      <line x1="${px.toFixed(1)}" y1="${(ty + 3).toFixed(1)}" x2="${px.toFixed(1)}" y2="${baseY}"
        stroke="${col}" stroke-opacity=".34"/>
      <circle cx="${px.toFixed(1)}" cy="${baseY}" r="2.6" fill="${col}"/>
      <text x="${tx.toFixed(1)}" y="${ty}" fill="${INK}" font-size="9.5" text-anchor="${anchor}"
        font-family="var(--mono)">${esc(ev.label)}</text>
      <text x="${tx.toFixed(1)}" y="${(ty + 9).toFixed(1)}" fill="${AX}" font-size="8" text-anchor="${anchor}"
        font-family="var(--mono)">${esc(ev.sub)}</text>`;
  }

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">
    ${decades}
    <line x1="${padL}" y1="${baseY}" x2="${w - padR}" y2="${baseY}" stroke="${AX}"/>
    ${marks}
    <text x="${padL}" y="${h - 8}" fill="${AX}" font-size="8" font-family="var(--mono)"
      letter-spacing="1.6">${esc(axisLabel)}</text>
  </svg>`;
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function sup(n) {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

/* ── donut ───────────────────────────────────────────────────────────── */

export function donut(segments, { size = 240, thickness = 26 } = {}) {
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let angle = -Math.PI / 2;
  let arcs = '';
  for (const seg of segments) {
    const sweep = (seg.value / total) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * r, y1 = cy + Math.sin(angle) * r;
    const x2 = cx + Math.cos(angle + sweep) * r, y2 = cy + Math.sin(angle + sweep) * r;
    const large = sweep > Math.PI ? 1 : 0;
    arcs += `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
      fill="none" stroke="${seg.color}" stroke-width="${thickness}" stroke-linecap="butt"/>`;
    angle += sweep;
  }
  const legend = segments.map((s) => `
    <li><i style="background:${s.color}"></i>
      <b>${s.value}%</b><span>${esc(s.label)}</span>
      <em>${esc(s.detail || '')}</em></li>`).join('');

  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">${arcs}</svg>
    <ul class="donut-legend">${legend}</ul>
  </div>`;
}

/* ── line chart ──────────────────────────────────────────────────────── */

/**
 * @param {Array} series [{points:[[x,y]...], color, label, dashed}]
 * Axes may be linear or log independently.
 */
export function lineChart(series, {
  w = 640, h = 300, xLog = false, yLog = false,
  xLabel = '', yLabel = '', xTicks = [], yTicks = [],
  xMin, xMax, yMin, yMax, annotations = [], legendAlign = 'end',
} = {}) {
  const padL = 58, padR = 18, padT = 16, padB = 40;
  const iw = w - padL - padR, ih = h - padT - padB;
  const all = series.flatMap((s) => s.points);
  xMin = xMin ?? Math.min(...all.map((p) => p[0]));
  xMax = xMax ?? Math.max(...all.map((p) => p[0]));
  yMin = yMin ?? Math.min(...all.map((p) => p[1]));
  yMax = yMax ?? Math.max(...all.map((p) => p[1]));

  const fx = (v) => {
    const t = xLog
      ? (Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))
      : (v - xMin) / (xMax - xMin);
    return padL + t * iw;
  };
  const fy = (v) => {
    const t = yLog
      ? (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))
      : (v - yMin) / (yMax - yMin);
    return padT + (1 - t) * ih;
  };

  let grid = '';
  for (const [v, label] of yTicks) {
    const py = fy(v);
    grid += `<line x1="${padL}" y1="${py.toFixed(1)}" x2="${w - padR}" y2="${py.toFixed(1)}" stroke="${GRID}"/>
      <text x="${padL - 7}" y="${(py + 3).toFixed(1)}" fill="${AX}" font-size="8.5" text-anchor="end"
        font-family="var(--mono)">${esc(label)}</text>`;
  }
  for (const [v, label] of xTicks) {
    const px = fx(v);
    grid += `<line x1="${px.toFixed(1)}" y1="${padT}" x2="${px.toFixed(1)}" y2="${padT + ih}" stroke="${GRID}"/>
      <text x="${px.toFixed(1)}" y="${padT + ih + 15}" fill="${AX}" font-size="8.5" text-anchor="middle"
        font-family="var(--mono)">${esc(label)}</text>`;
  }

  let paths = '';
  for (const s of series) {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'} ${fx(p[0]).toFixed(2)} ${fy(p[1]).toFixed(2)}`).join(' ');
    paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="1.8"
      ${s.dashed ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/>`;
  }

  let notes = '';
  for (const a of annotations) {
    const px = fx(a.x), py = fy(a.y);
    notes += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${a.color || HOT}"/>
      <text x="${(px + (a.flip ? -6 : 6)).toFixed(1)}" y="${(py - 6).toFixed(1)}" fill="${a.color || HOT}"
        font-size="8.5" font-family="var(--mono)" text-anchor="${a.flip ? 'end' : 'start'}">${esc(a.label)}</text>`;
  }

  const lx = legendAlign === 'start' ? padL + 10 : w - padR;
  const legend = series.filter((s) => s.label).map((s, i) => `
    <text x="${lx}" y="${padT + 12 + i * 13}" fill="${s.color}" font-size="9"
      text-anchor="${legendAlign}" font-family="var(--mono)">${s.dashed ? '– – ' : '——— '}${esc(s.label)}</text>`).join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">
    ${grid}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + ih}" stroke="${AX}"/>
    <line x1="${padL}" y1="${padT + ih}" x2="${w - padR}" y2="${padT + ih}" stroke="${AX}"/>
    ${paths}${notes}${legend}
    <text x="${padL + iw / 2}" y="${h - 6}" fill="${AX}" font-size="8" text-anchor="middle"
      font-family="var(--mono)" letter-spacing="1.4">${esc(xLabel)}</text>
    <text x="12" y="${padT + ih / 2}" fill="${AX}" font-size="8" text-anchor="middle"
      font-family="var(--mono)" letter-spacing="1.4"
      transform="rotate(-90 12 ${padT + ih / 2})">${esc(yLabel)}</text>
  </svg>`;
}

/* ── horizontal bars, log scale ──────────────────────────────────────── */

export function logBars(rows, { w = 640, barH = 26, min, max, unit = '' } = {}) {
  const padL = 152, padR = 90, padT = 8;
  const h = padT * 2 + rows.length * barH;
  const iw = w - padL - padR;
  min = min ?? Math.min(...rows.map((r) => r.value)) * 0.7;
  max = max ?? Math.max(...rows.map((r) => r.value)) * 1.15;
  const lo = Math.log10(min), hi = Math.log10(max);

  let out = '';
  rows.forEach((r, i) => {
    const y = padT + i * barH;
    const len = ((Math.log10(r.value) - lo) / (hi - lo)) * iw;
    out += `
      <text x="${padL - 9}" y="${y + barH / 2 + 3}" fill="${INK}" font-size="9.5" text-anchor="end"
        font-family="var(--mono)">${esc(r.label)}</text>
      <rect x="${padL}" y="${y + 5}" width="${Math.max(2, len).toFixed(1)}" height="${barH - 13}"
        fill="${r.color || ACCENT}" fill-opacity=".55" rx="1"/>
      <text x="${padL + Math.max(2, len) + 7}" y="${y + barH / 2 + 3}" fill="${AX}" font-size="8.5"
        font-family="var(--mono)">${esc(r.display)}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">${out}</svg>`;
}

/* ── blackbody colour ────────────────────────────────────────────────── */

/**
 * Approximate sRGB of a blackbody at a given temperature (Tanner Helland's
 * fit to the Planckian locus). This is what drives both the spectrum bar and
 * the star discs, so the colours on the page are physical, not decorative.
 */
export function blackbodyRGB(kelvin) {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const cl = (v) => Math.max(0, Math.min(255, v));
  let r, g, b;
  if (t <= 66) r = 255;
  else r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661;
  else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [cl(r), cl(g), cl(b)];
}

export function blackbodyCSS(kelvin) {
  const [r, g, b] = blackbodyRGB(kelvin);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
