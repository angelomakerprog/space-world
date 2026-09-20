/**
 * The Solar System is mostly emptiness — at true scale Earth would be a
 * sub-pixel speck and Neptune would sit 30x further out than the camera can
 * usefully frame. These are the two compression curves that make it legible
 * while keeping every *ratio* monotonic and every real figure intact in the
 * HUD readouts.
 */

/** Radial distance: AU -> scene units (sqrt compression). */
export const AU_UNIT = 38;
export function auToUnits(au) {
  return AU_UNIT * Math.sqrt(Math.abs(au));
}
export function unitsToAu(u) {
  const t = u / AU_UNIT;
  return t * t;
}

/** Body radius: km -> scene units (sqrt compression, Earth = 1.5). */
export const EARTH_KM = 6371;
export function radiusToUnits(km) {
  return 1.5 * Math.sqrt(km / EARTH_KM);
}

/** The Sun is 109 Earth radii — it gets its own hand-tuned size. */
export const SUN_UNITS = 6.0;

/** Earth–Moon separation is 0.00257 AU; hand-tuned so the pair reads clearly. */
export const MOON_ORBIT_UNITS = 9.0;

/**
 * Compress a heliocentric vector (in AU) into scene space.
 * Direction is preserved exactly; only the radius is squeezed.
 * Ecliptic (x, y, z) maps to world (x, z, -y) so the ecliptic is the XZ plane.
 */
export function eclipticToScene(x, y, z, out) {
  const r = Math.hypot(x, y, z);
  const k = r > 1e-9 ? auToUnits(r) / r : 0;
  out.set(x * k, z * k, -y * k);
  return out;
}
