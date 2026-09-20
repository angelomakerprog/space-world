import { AX, INK, ACCENT, HOT, LIVE } from './charts.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * The expansion cone — the funnel most people picture when they hear
 * "Big Bang". Time runs left to right; the vertical extent is how far apart
 * two points now inside the observable universe were at that moment.
 *
 * It shows two things a logarithmic axis cannot: that inflation was a
 * near-vertical flare, and that the widening speeds up again at the right-hand
 * end. Everything after inflation is drawn from the real flat-ΛCDM scale
 * factor, so the bell of the trumpet is computed, not sketched.
 */
export function expansionCone({ w = 1180, h = 480 } = {}) {
  const padL = 104, padR = 158, padT = 84, padB = 78;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const midY = padT + ih / 2;

  const Om = 0.3111, Ol = 0.6889;
  const H0 = 67.66 * 1.02271e-3;                  // km/s/Mpc -> per Gyr
  const AGE = 13.787;
  const aOf = (t) => Math.pow(Om / Ol, 1 / 3)
    * Math.pow(Math.sinh(1.5 * Math.sqrt(Ol) * H0 * Math.max(t, 1e-6)), 2 / 3);
  const aNow = aOf(AGE);

  // x: a short compressed strip for inflation, then linear in Gyr
  const INFL = 0.13;
  const xAt = (gyr) => padL + INFL * iw + (gyr / AGE) * (1 - INFL) * iw;
  const xIn0 = padL;
  const xIn1 = padL + INFL * iw;

  const rMax = ih / 2;
  const rAt = (gyr) => 0.10 * rMax + 0.90 * rMax * (aOf(gyr) / aNow);

  const top = [], bot = [];
  for (let i = 0; i <= 170; i++) {
    const t = (i / 170) * AGE;
    top.push(`${xAt(t).toFixed(1)} ${(midY - rAt(t)).toFixed(1)}`);
    bot.push(`${xAt(t).toFixed(1)} ${(midY + rAt(t)).toFixed(1)}`);
  }
  const rSeed = 0.05 * rMax;
  const rPost = rAt(0);

  const body = `M ${xIn0} ${midY - rSeed}
    C ${xIn0 + iw * 0.05} ${midY - rSeed}, ${xIn1 - iw * 0.04} ${midY - rPost}, ${xIn1} ${midY - rPost}
    L ${top.join(' L ')}
    L ${xAt(AGE)} ${midY + rAt(AGE)}
    L ${bot.slice().reverse().join(' L ')}
    C ${xIn1 - iw * 0.04} ${midY + rPost}, ${xIn0 + iw * 0.05} ${midY + rSeed}, ${xIn0} ${midY + rSeed} Z`;

  const band = (t0, t1, fill, op) => {
    const pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * (i / n);
      pts.push(`${xAt(t).toFixed(1)} ${(midY - rAt(t)).toFixed(1)}`);
    }
    for (let i = n; i >= 0; i--) {
      const t = t0 + (t1 - t0) * (i / n);
      pts.push(`${xAt(t).toFixed(1)} ${(midY + rAt(t)).toFixed(1)}`);
    }
    return `<path d="M ${pts.join(' L ')} Z" fill="${fill}" fill-opacity="${op}"/>`;
  };

  const tCMB = 0.00038, tStars = 0.18, tReion = 1.0, tAccel = 7.7;

  /*
   * The first billion years all land within a few percent of the width, so
   * the callouts need a horizontal offset as well as a stagger — otherwise
   * recombination, first light and reionisation print on top of each other.
   */
  const marker = (t, label, sub, colour, side, lift, dx = 0) => {
    const x = xAt(t), r = rAt(t);
    const y0 = midY + side * r;
    const y1 = y0 + side * (24 + lift);
    const tx = x + dx;
    const ty = y1 + (side < 0 ? -6 : 14);
    const sy = ty + (side < 0 ? -10 : 10);
    return `
      <path d="M ${x.toFixed(1)} ${y0.toFixed(1)} L ${x.toFixed(1)} ${(y1 + side * -6).toFixed(1)}
               L ${tx.toFixed(1)} ${y1.toFixed(1)}"
        fill="none" stroke="${colour}" stroke-opacity=".5"/>
      <circle cx="${x.toFixed(1)}" cy="${y0.toFixed(1)}" r="3" fill="${colour}"/>
      <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${INK}" font-size="10"
        text-anchor="middle" font-family="var(--mono)">${esc(label)}</text>
      <text x="${tx.toFixed(1)}" y="${sy.toFixed(1)}" fill="${AX}" font-size="8"
        text-anchor="middle" font-family="var(--mono)">${esc(sub)}</text>`;
  };

  // contents: opaque plasma speckle before recombination, structure after
  let motes = '';
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 220; i++) {
    const t = Math.pow(rnd(), 0.5) * AGE;
    if (t < tCMB) continue;
    const r = rAt(t);
    const y = midY + (rnd() * 2 - 1) * r * 0.9;
    const x = xAt(t);
    if (t < tStars) {
      motes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + rnd()).toFixed(1)}"
        fill="#8a74e0" fill-opacity=".45"/>`;
    } else {
      const sz = (0.9 + rnd() * 1.8).toFixed(1);
      const q = rnd();
      const c = q < 0.35 ? '#a9cdff' : q < 0.62 ? '#ffd9a8' : '#ffffff';
      motes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz}"
        fill="${c}" fill-opacity="${(0.4 + rnd() * 0.5).toFixed(2)}"/>`;
    }
  }

  const ticks = [0, 2, 4, 6, 8, 10, 12, 13.787].map((t) => `
    <line x1="${xAt(t).toFixed(1)}" y1="${(h - 34).toFixed(1)}" x2="${xAt(t).toFixed(1)}" y2="${(h - 29).toFixed(1)}"
      stroke="${AX}" stroke-opacity=".5"/>
    <text x="${xAt(t).toFixed(1)}" y="${(h - 18).toFixed(1)}" fill="${AX}" font-size="8.5"
      text-anchor="middle" font-family="var(--mono)">${t === 13.787 ? 'now' : t}</text>`).join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">
    <defs>
      <linearGradient id="coneFill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#fff2cf" stop-opacity=".95"/>
        <stop offset="7%"   stop-color="#ffb765" stop-opacity=".78"/>
        <stop offset="17%"  stop-color="#c8567a" stop-opacity=".55"/>
        <stop offset="36%"  stop-color="#5b3f9e" stop-opacity=".42"/>
        <stop offset="64%"  stop-color="#243a72" stop-opacity=".34"/>
        <stop offset="100%" stop-color="#0f2145" stop-opacity=".30"/>
      </linearGradient>
      <linearGradient id="coneEdge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#ffd9a0" stop-opacity=".9"/>
        <stop offset="50%"  stop-color="#8fc6ff" stop-opacity=".5"/>
        <stop offset="100%" stop-color="#8fc6ff" stop-opacity=".85"/>
      </linearGradient>
    </defs>

    <path d="${body}" fill="url(#coneFill)"/>
    ${band(0, tCMB, '#ffffff', 0.18)}
    ${band(tCMB, tStars, '#000000', 0.32)}
    ${motes}
    <path d="${body}" fill="none" stroke="url(#coneEdge)" stroke-width="1.6"/>

    <line x1="${xAt(tCMB).toFixed(1)}" y1="${(midY - rAt(tCMB)).toFixed(1)}"
          x2="${xAt(tCMB).toFixed(1)}" y2="${(midY + rAt(tCMB)).toFixed(1)}"
          stroke="${LIVE}" stroke-width="2"/>

    ${marker(tCMB, 'RECOMBINATION', '380,000 yr · the CMB', LIVE, -1, 16, -46)}
    ${marker(tStars, 'FIRST STARS', 'the dark ages end', HOT, 1, 10, -18)}
    ${marker(tReion, 'REIONISATION', 'z ≈ 6 · 1 Gyr', ACCENT, -1, 74, 34)}
    ${marker(tAccel, 'ACCELERATION BEGINS', 'dark energy takes over', HOT, 1, 6, 0)}
    ${marker(9.2, 'SOLAR SYSTEM', '4.57 Gya', '#cfd8e6', -1, 8, 0)}

    <text x="${(xIn0 + 2).toFixed(1)}" y="${(midY - rSeed - 96).toFixed(1)}" fill="${HOT}"
      font-size="10" font-family="var(--mono)">INFLATION</text>
    <text x="${(xIn0 + 2).toFixed(1)}" y="${(midY - rSeed - 85).toFixed(1)}" fill="${AX}"
      font-size="8" font-family="var(--mono)">10⁻³⁶ – 10⁻³² s · ×10²⁶</text>
    <path d="M ${(xIn0 + 22).toFixed(1)} ${(midY - rSeed - 79).toFixed(1)}
             L ${((xIn0 + xIn1) / 2).toFixed(1)} ${(midY - rPost * 0.7 - 8).toFixed(1)}"
      stroke="${HOT}" stroke-opacity=".45" stroke-dasharray="3 3"/>

    <text x="${(padL - 12).toFixed(1)}" y="${(midY - 7).toFixed(1)}" fill="#fff"
      font-size="11.5" text-anchor="end" font-family="var(--mono)">BIG BANG</text>
    <text x="${(padL - 12).toFixed(1)}" y="${(midY + 7).toFixed(1)}" fill="${AX}"
      font-size="8.5" text-anchor="end" font-family="var(--mono)">t = 0</text>

    <text x="${(w - padR + 14).toFixed(1)}" y="${(midY - 7).toFixed(1)}" fill="#fff"
      font-size="11.5" font-family="var(--mono)">TODAY</text>
    <text x="${(w - padR + 14).toFixed(1)}" y="${(midY + 7).toFixed(1)}" fill="${AX}"
      font-size="8.5" font-family="var(--mono)">13.787 Gyr</text>
    <text x="${(w - padR + 14).toFixed(1)}" y="${(midY + 27).toFixed(1)}" fill="${HOT}"
      font-size="9" font-family="var(--mono)">→ expanding,</text>
    <text x="${(w - padR + 14).toFixed(1)}" y="${(midY + 39).toFixed(1)}" fill="${HOT}"
      font-size="9" font-family="var(--mono)">   ever faster</text>

    <line x1="${padL}" y1="${(h - 34).toFixed(1)}" x2="${(w - padR).toFixed(1)}" y2="${(h - 34).toFixed(1)}"
      stroke="${AX}" stroke-opacity=".5"/>
    ${ticks}
    <text x="${(padL + iw / 2).toFixed(1)}" y="${(h - 4).toFixed(1)}" fill="${AX}" font-size="8"
      text-anchor="middle" font-family="var(--mono)" letter-spacing="1.6">BILLIONS OF YEARS SINCE THE BIG BANG →</text>
    <text x="${xIn1.toFixed(1)}" y="${(h - 18).toFixed(1)}" fill="${HOT}" font-size="7.5"
      text-anchor="middle" font-family="var(--mono)">↑ compressed</text>
  </svg>`;
}
