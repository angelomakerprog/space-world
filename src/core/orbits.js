/**
 * Keplerian propagation using JPL's approximate elements.
 * Accurate to a few arc-minutes across 1800–2050, which is far beyond what
 * the eye can resolve at this zoom — but it means the planets really are
 * where they should be on any given date.
 */

const DEG = Math.PI / 180;

export const J2000_JD = 2451545.0;
export const DAY_MS = 86400000;

/** Unix milliseconds -> Julian Day. */
export function msToJD(ms) {
  return ms / DAY_MS + 2440587.5;
}
/** Julian Day -> Unix milliseconds. */
export function jdToMs(jd) {
  return (jd - 2440587.5) * DAY_MS;
}
/** Julian centuries since J2000.0. */
export function centuriesSinceJ2000(jd) {
  return (jd - J2000_JD) / 36525;
}

function wrap180(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Newton solve of Kepler's equation, working in degrees like the JPL recipe. */
function eccentricAnomaly(Mdeg, e) {
  const eStar = (180 / Math.PI) * e;
  let E = Mdeg + eStar * Math.sin(Mdeg * DEG);
  for (let i = 0; i < 8; i++) {
    const dM = Mdeg - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/** Elements propagated to Julian century T. */
export function elementsAt(body, T) {
  const { el, rate } = body;
  return {
    a: el.a + rate.a * T,
    e: el.e + rate.e * T,
    i: el.i + rate.i * T,
    L: el.L + rate.L * T,
    lp: el.lp + rate.lp * T,
    node: el.node + rate.node * T,
  };
}

/**
 * Heliocentric position in the J2000 ecliptic frame, in AU.
 * Writes into `out` = {x, y, z}.
 */
export function heliocentric(body, T, out = { x: 0, y: 0, z: 0 }) {
  const el = elementsAt(body, T);
  const argPeri = el.lp - el.node;
  const M = wrap180(el.L - el.lp);
  const E = eccentricAnomaly(M, el.e) * DEG;

  // position in the orbital plane
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const w = argPeri * DEG, om = el.node * DEG, inc = el.i * DEG;
  const cw = Math.cos(w), sw = Math.sin(w);
  const co = Math.cos(om), so = Math.sin(om);
  const ci = Math.cos(inc), si = Math.sin(inc);

  out.x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  out.y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  out.z = (sw * si) * xp + (cw * si) * yp;
  // normalised eccentric anomaly, so callers can locate the body along its
  // own drawn orbit path without re-solving Kepler
  out.E = ((E / (Math.PI * 2)) % 1 + 1) % 1;
  return out;
}

/**
 * Sample a full orbit as ecliptic AU points, by sweeping the eccentric
 * anomaly rather than time — gives evenly-shaped curves with no bunching.
 */
export function orbitPath(body, T, segments = 512) {
  const el = elementsAt(body, T);
  const argPeri = (el.lp - el.node) * DEG;
  const om = el.node * DEG, inc = el.i * DEG;
  const cw = Math.cos(argPeri), sw = Math.sin(argPeri);
  const co = Math.cos(om), so = Math.sin(om);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const b = el.a * Math.sqrt(1 - el.e * el.e);

  const pts = [];
  for (let s = 0; s <= segments; s++) {
    const E = (s / segments) * Math.PI * 2;
    const xp = el.a * (Math.cos(E) - el.e);
    const yp = b * Math.sin(E);
    pts.push({
      x: (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
      y: (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
      z: (sw * si) * xp + (cw * si) * yp,
    });
  }
  return pts;
}

/** Sidereal orbital period in days, from the semi-major axis (Kepler III). */
export function periodDays(a) {
  return 365.256363 * Math.pow(a, 1.5);
}
