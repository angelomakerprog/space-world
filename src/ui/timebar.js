import { jdToMs, msToJD } from '../core/orbits.js';
import { fmtDate, fmtTime, fmtRate } from './format.js';

const MIN = 1 / 1440, HR = 1 / 24, DAY = 1, MON = 30.4375, YR = 365.25;

/** Tick spacings that read as "round" to a human, in days. */
const STEPS = [
  1 / 86400, 5 / 86400, 15 / 86400, 30 / 86400,
  MIN, 2 * MIN, 5 * MIN, 15 * MIN, 30 * MIN,
  HR, 3 * HR, 6 * HR, 12 * HR,
  DAY, 2 * DAY, 5 * DAY, 10 * DAY,
  MON, 3 * MON, 6 * MON,
  YR, 2 * YR, 5 * YR, 10 * YR, 25 * YR, 50 * YR,
  100 * YR, 250 * YR, 500 * YR, 1000 * YR,
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labelFor(step, d) {
  if (step < HR) return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
  if (step < DAY) return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  if (step < MON * 0.9) return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  if (step < YR * 0.9) return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return String(d.getUTCFullYear());
}

function spanLabel(step) {
  if (step < MIN) return `${Math.round(step * 86400)} SEC / DIV`;
  if (step < HR) return `${Math.round(step * 1440)} MIN / DIV`;
  if (step < DAY) return `${Math.round(step * 24)} HR / DIV`;
  if (step < MON * 0.9) return `${Math.round(step)} DAY / DIV`;
  if (step < YR * 0.9) return `${Math.round(step / MON)} MON / DIV`;
  return `${Math.round(step / YR)} YR / DIV`;
}

export class TimeBar {
  constructor(canvas, playheadLabel, spanEl, rateEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playheadLabel = playheadLabel;
    this.spanEl = spanEl;
    this.rateEl = rateEl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(clock) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    // the visible window equals ~2 minutes of wall-clock at the current rate
    const span = Math.max(1 / 86400 * 30, clock.rate * 120);
    const perPx = span / w;

    // pick the finest spacing that still leaves the labels breathing room
    let step = STEPS[STEPS.length - 1];
    for (const s of STEPS) {
      if (s / perPx >= 86) { step = s; break; }
    }

    const jd = clock.jd;
    const left = jd - span / 2;
    const right = jd + span / 2;

    const baseY = h - 9;
    ctx.strokeStyle = 'rgba(120,150,190,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 0.5);
    ctx.lineTo(w, baseY + 0.5);
    ctx.stroke();

    // minor ticks at a fifth of the major spacing
    const minor = step / 5;
    ctx.strokeStyle = 'rgba(120,150,190,.16)';
    ctx.beginPath();
    let t0 = Math.ceil(left / minor) * minor;
    for (let t = t0; t <= right; t += minor) {
      const x = Math.round(((t - left) / span) * w) + 0.5;
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY - 3);
    }
    ctx.stroke();

    // major ticks + labels
    ctx.strokeStyle = 'rgba(160,196,236,.48)';
    ctx.fillStyle = 'rgba(198,214,236,.62)';
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.beginPath();
    let m0 = Math.ceil(left / step) * step;
    const labels = [];
    for (let t = m0; t <= right; t += step) {
      const x = Math.round(((t - left) / span) * w) + 0.5;
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY - 8);
      labels.push([x, t]);
    }
    ctx.stroke();

    for (const [x, t] of labels) {
      const d = new Date(jdToMs(t));
      if (!isFinite(d.getTime())) continue;
      // fade labels approaching the panels so nothing collides visually
      const edge = Math.min(x, w - x);
      ctx.globalAlpha = Math.min(1, edge / 70);
      ctx.fillText(labelFor(step, d), x, baseY - 12);
      ctx.globalAlpha = 1;
    }

    // horizon markers: today, and J2000
    for (const [mark, col, txt] of [[msToJD(Date.now()), 'rgba(125,255,178,.75)', 'NOW'], [2451545.0, 'rgba(143,198,255,.55)', 'J2000']]) {
      if (mark < left || mark > right) continue;
      const x = Math.round(((mark - left) / span) * w) + 0.5;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, 4);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.textAlign = x > w - 60 ? 'right' : 'left';
      ctx.fillText(txt, x + (x > w - 60 ? -4 : 4), 10);
      ctx.textAlign = 'center';
    }

    const d = clock.date;
    this.playheadLabel.textContent = isFinite(d.getTime())
      ? `${fmtDate(d)} · ${fmtTime(d)} UTC`
      : '—';
    this.spanEl.textContent = spanLabel(step);
    const [rv, ru] = fmtRate(clock.rate);
    this.rateEl.textContent = `${clock.paused ? 'HELD' : (clock.dir < 0 ? '◄ ' : '')}${rv} ${ru}`;
  }
}
