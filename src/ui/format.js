const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0');

/** Works far outside the Date-safe range by falling back to a year figure. */
export function fmtDate(d) {
  const y = d.getUTCFullYear();
  return `${y < 0 ? '-' : ''}${pad(Math.abs(y), 4)}-${MONTHS[d.getUTCMonth()]}-${pad(d.getUTCDate())}`;
}
export function fmtTime(d) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
export function fmtDateTime(d) {
  return `${fmtDate(d)}  ${fmtTime(d)}`;
}

export function fmtNum(v, digits = 2) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e6 || (a < 1e-3 && a > 0)) {
    const exp = Math.floor(Math.log10(a));
    const mant = v / Math.pow(10, exp);
    return `${mant.toFixed(digits)} × 10${sup(exp)}`;
  }
  return v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function sup(n) {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

export function fmtKm(km) {
  if (km >= 1e6) return `${fmtNum(km, 3)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

export function fmtMass(kg) {
  return `${fmtNum(kg, 3)} kg`;
}

/** Days -> the most readable unit for that magnitude. */
export function fmtDuration(days) {
  const a = Math.abs(days);
  if (a < 1 / 1440) return `${(a * 86400).toFixed(1)} s`;
  if (a < 1 / 24) return `${(a * 1440).toFixed(1)} min`;
  if (a < 2) return `${(a * 24).toFixed(2)} h`;
  if (a < 400) return `${a.toFixed(2)} d`;
  const y = a / 365.25;
  if (y < 1000) return `${y.toFixed(2)} yr`;
  return `${fmtNum(y, 2)} yr`;
}

/** Rate readout: pick the unit that keeps the number in a legible range. */
export function fmtRate(daysPerSec) {
  const d = daysPerSec;
  if (d < 1 / 3600) return [(d * 86400).toFixed(2), 'sec / sec'];
  if (d < 1 / 24)   return [(d * 1440).toFixed(2), 'min / sec'];
  if (d < 1)        return [(d * 24).toFixed(2), 'hours / sec'];
  if (d < 60)       return [d.toFixed(2), 'days / sec'];
  if (d < 700)      return [(d / 30.4375).toFixed(2), 'months / sec'];
  return [(d / 365.25).toFixed(2), 'years / sec'];
}

export function fmtElapsed(days) {
  const neg = days < 0;
  let a = Math.abs(days);
  const y = Math.floor(a / 365.25);
  a -= y * 365.25;
  const d = Math.floor(a);
  const h = (a - d) * 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.floor((((h - hh) * 60) - mm) * 60);
  const ypart = y > 0 ? `${y}y ` : '';
  return `${neg ? '−' : '+'}${ypart}${d}d ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export function fmtLightTime(seconds) {
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
