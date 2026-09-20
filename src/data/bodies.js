/**
 * Physical + orbital catalogue for the Solar System.
 *
 * Orbital elements are the JPL/NASA "Keplerian Elements for Approximate
 * Positions of the Major Planets" set, valid 1800 AD – 2050 AD.
 *   a  semi-major axis                   (AU,   AU/century)
 *   e  eccentricity                      (-,    /century)
 *   i  inclination to the ecliptic       (deg,  deg/century)
 *   L  mean longitude                    (deg,  deg/century)
 *   lp longitude of perihelion  (varpi)  (deg,  deg/century)
 *   node longitude of ascending node     (deg,  deg/century)
 *
 * Physical values are IAU / NASA planetary fact-sheet figures.
 */

export const AU_KM = 149597870.7;
export const C_KM_S = 299792.458;

export const SUN = {
  id: 'sol',
  name: 'Sol',
  designation: 'THE SUN',
  class: 'G2V MAIN SEQUENCE',
  radiusKm: 695700,
  massKg: 1.9885e30,
  rotationDays: 25.38,          // sidereal, equatorial
  tiltDeg: 7.25,
  tempC: 5499,                  // photosphere ≈ 5772 K
  gravity: 274.0,
  moons: 0,
  note: 'A G-type main-sequence star holding 99.86% of the system mass. Fuses 600 million tonnes of hydrogen every second; its light needs 8m 19s to reach Earth.',
};

export const PLANETS = [
  {
    id: 'mercury', name: 'Mercury', designation: 'PLANET I', class: 'TERRESTRIAL',
    el:   { a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.25032350, lp: 77.45779628, node: 48.33076593 },
    rate: { a: 0.00000037, e: 0.00001906, i: -0.00594749, L: 149472.67411175, lp: 0.16047689, node: -0.12534081 },
    radiusKm: 2439.7, massKg: 3.3011e23, rotationDays: 58.6462, tiltDeg: 0.034,
    tempC: 167, gravity: 3.70, moons: 0, orbVel: 47.36,
    palette: { base: '#8c8378', dark: '#4a443e', light: '#c9bfb2', accent: '#6b6157' },
    kind: 'rocky', roughness: 1.0, craters: 1.0, bump: 0.055,
    note: 'The smallest planet and the fastest — 47.4 km/s. A 3:2 spin-orbit lock stretches its solar day to 176 Earth days. Surface swings from 430 °C to −180 °C.',
  },
  {
    id: 'venus', name: 'Venus', designation: 'PLANET II', class: 'TERRESTRIAL',
    el:   { a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.97909950, lp: 131.60246718, node: 76.67984255 },
    rate: { a: 0.00000390, e: -0.00004107, i: -0.00078890, L: 58517.81538729, lp: 0.00268329, node: -0.27769418 },
    radiusKm: 6051.8, massKg: 4.8675e24, rotationDays: -243.025, tiltDeg: 177.36,
    tempC: 464, gravity: 8.87, moons: 0, orbVel: 35.02,
    palette: { base: '#d9b56f', dark: '#a67c3d', light: '#f6e3bb', accent: '#c99a52' },
    kind: 'gas-lite', roughness: 0.85, craters: 0, bump: 0.01,
    atmosphere: { color: '#ffd9a0', power: 4.0, strength: 0.55, scale: 1.05 },
    note: 'Rotates backwards, once every 243 days — longer than its 225-day year. A 92-bar CO₂ atmosphere runs a runaway greenhouse at 464 °C, hot enough to melt lead.',
  },
  {
    id: 'earth', name: 'Earth', designation: 'PLANET III', class: 'TERRESTRIAL',
    el:   { a: 1.00000261, e: 0.01671123, i: -0.00001531, L: 100.46457166, lp: 102.93768193, node: 0.0 },
    rate: { a: 0.00000562, e: -0.00004392, i: -0.01294668, L: 35999.37244981, lp: 0.32327364, node: 0.0 },
    radiusKm: 6371.0, massKg: 5.97237e24, rotationDays: 0.99726968, tiltDeg: 23.4393,
    tempC: 15, gravity: 9.807, moons: 1, orbVel: 29.78,
    palette: { base: '#1f5a94', dark: '#06203f', light: '#4d8fc4', accent: '#3f6b34' },
    kind: 'earth', roughness: 0.62, craters: 0, bump: 0.028,
    atmosphere: { color: '#6fb4ff', power: 5.2, strength: 0.50, scale: 1.04 },
    clouds: true, nightLights: true,
    note: 'The only world known to carry life. 71% ocean, a magnetosphere that deflects the solar wind, and an oversized Moon that stabilises its 23.44° tilt.',
  },
  {
    id: 'mars', name: 'Mars', designation: 'PLANET IV', class: 'TERRESTRIAL',
    el:   { a: 1.52371034, e: 0.09339410, i: 1.84969142, L: -4.55343205, lp: -23.94362959, node: 49.55953891 },
    rate: { a: 0.00001847, e: 0.00007882, i: -0.00813131, L: 19140.30268499, lp: 0.44441088, node: -0.29257343 },
    radiusKm: 3389.5, massKg: 6.4171e23, rotationDays: 1.02595676, tiltDeg: 25.19,
    tempC: -63, gravity: 3.721, moons: 2, orbVel: 24.07,
    palette: { base: '#b4552e', dark: '#6d2f18', light: '#e08b58', accent: '#8a3f22' },
    kind: 'rocky', roughness: 0.95, craters: 0.55, bump: 0.045, iceCaps: 0.14,
    atmosphere: { color: '#ff9a6a', power: 5.0, strength: 0.30, scale: 1.03 },
    note: 'Home to Olympus Mons — 21.9 km tall, three times Everest — and Valles Marineris, a 4,000 km canyon. Its thin CO₂ air is 0.6% of Earth’s pressure.',
  },
  {
    id: 'jupiter', name: 'Jupiter', designation: 'PLANET V', class: 'GAS GIANT',
    el:   { a: 5.20288700, e: 0.04838624, i: 1.30439695, L: 34.39644051, lp: 14.72847983, node: 100.47390909 },
    rate: { a: -0.00011607, e: -0.00013253, i: -0.00183714, L: 3034.74612775, lp: 0.21252668, node: 0.20469106 },
    radiusKm: 69911, massKg: 1.8982e27, rotationDays: 0.41354, tiltDeg: 3.13,
    tempC: -108, gravity: 24.79, moons: 95, orbVel: 13.06,
    palette: { base: '#cfa878', dark: '#7d5030', light: '#faf0dc', accent: '#c0563a' },
    kind: 'banded', texRes: 1600, roughness: 0.9, bands: 26, bump: 0.0, greatSpot: true, bandContrast: 1.5,
    atmosphere: { color: '#ffd9a8', power: 5.0, strength: 0.35, scale: 1.04 },
    flattening: 0.0649,
    note: 'More massive than every other planet combined. The Great Red Spot is a 350-year-old anticyclone wider than Earth, and a day here lasts under 10 hours.',
  },
  {
    id: 'saturn', name: 'Saturn', designation: 'PLANET VI', class: 'GAS GIANT',
    el:   { a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, lp: 92.59887831, node: 113.66242448 },
    rate: { a: -0.00125060, e: -0.00050991, i: 0.00193609, L: 1222.49362201, lp: -0.41897216, node: -0.28867794 },
    radiusKm: 58232, massKg: 5.6834e26, rotationDays: 0.44401, tiltDeg: 26.73,
    tempC: -139, gravity: 10.44, moons: 146, orbVel: 9.68,
    palette: { base: '#dcbe84', dark: '#9c7a42', light: '#faf1d8', accent: '#c8a468' },
    kind: 'banded', texRes: 1280, roughness: 0.9, bands: 18, bump: 0.0, bandContrast: 1.15,
    atmosphere: { color: '#ffe9bc', power: 5.0, strength: 0.32, scale: 1.04 },
    flattening: 0.098,
    rings: { inner: 1.24, outer: 2.32, tiltFollows: true, opacity: 0.92 },
    note: 'Less dense than water. Its rings span 282,000 km yet average only ~10 m thick — near-pure water ice, shepherded by moons and swept by the Cassini Division.',
  },
  {
    id: 'uranus', name: 'Uranus', designation: 'PLANET VII', class: 'ICE GIANT',
    el:   { a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, lp: 170.95427630, node: 74.01692503 },
    rate: { a: -0.00196176, e: -0.00004397, i: -0.00242939, L: 428.48202785, lp: 0.40805281, node: 0.04240589 },
    radiusKm: 25362, massKg: 8.6810e25, rotationDays: -0.71833, tiltDeg: 97.77,
    tempC: -197, gravity: 8.87, moons: 28, orbVel: 6.80,
    palette: { base: '#9fdbe0', dark: '#5aa6b4', light: '#d5f2f4', accent: '#7cc4cd' },
    kind: 'banded', texRes: 1024, roughness: 0.75, bands: 7, bump: 0.0, bandContrast: 0.25,
    atmosphere: { color: '#a8f0ff', power: 4.2, strength: 0.55, scale: 1.05 },
    flattening: 0.0229,
    rings: { inner: 1.65, outer: 2.0, tiltFollows: true, opacity: 0.22, thin: true },
    note: 'Tipped 98° — it rolls around its orbit, giving 42-year polar days and nights. Methane in the upper air absorbs red light, leaving that flat cyan disc.',
  },
  {
    id: 'neptune', name: 'Neptune', designation: 'PLANET VIII', class: 'ICE GIANT',
    el:   { a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, lp: 44.96476227, node: 131.78422574 },
    rate: { a: 0.00026291, e: 0.00005105, i: 0.00035372, L: 218.45945325, lp: -0.32241464, node: -0.00508664 },
    radiusKm: 24622, massKg: 1.02413e26, rotationDays: 0.67125, tiltDeg: 28.32,
    tempC: -201, gravity: 11.15, moons: 16, orbVel: 5.43,
    palette: { base: '#3f66c8', dark: '#1b2f78', light: '#7d9df0', accent: '#26418f' },
    kind: 'banded', texRes: 1024, roughness: 0.75, bands: 9, bump: 0.0, bandContrast: 0.34, darkSpot: true,
    atmosphere: { color: '#6f8dff', power: 4.2, strength: 0.62, scale: 1.05 },
    flattening: 0.0171,
    note: 'The windiest world known — jets reach 2,100 km/h. Found in 1846 by mathematics before anyone looked; one orbit takes 164.8 years.',
  },
  {
    id: 'pluto', name: 'Pluto', designation: 'FORMERLY PLANET IX', class: 'DWARF PLANET · KUIPER BELT OBJECT',
    el:   { a: 39.48211675, e: 0.24882730, i: 17.14001206, L: 238.92903833, lp: 224.06891629, node: 110.30393684 },
    rate: { a: -0.00031596, e: 0.00005170, i: 0.00004818, L: 145.20780515, lp: -0.04062942, node: -0.01183482 },
    radiusKm: 1188.3, massKg: 1.303e22, rotationDays: -6.387230, tiltDeg: 122.53,
    tempC: -229, gravity: 0.62, moons: 5, orbVel: 4.74,
    palette: { base: '#b09a80', dark: '#5f5242', light: '#eee3d0', accent: '#8a6f55' },
    kind: 'rocky', roughness: 1.0, craters: 0.45, bump: 0.05, iceCaps: 0.06,
    // Tombaugh Regio — the nitrogen-ice "heart" New Horizons found in 2015
    patches: [
      { lon: -178, lat: 12, rx: 34, ry: 24, tone: 0.95 },
      { lon: -150, lat: -6, rx: 22, ry: 20, tone: 0.88 },
      { lon: 40, lat: -30, rx: 26, ry: 18, tone: -0.55 },
    ],
    note: 'Smaller than Earth’s Moon and locked in a 2:3 resonance with Neptune, so the two can never collide. Its 248-year orbit is tilted 17° and eccentric enough to bring it inside Neptune’s.',
  },
];

/** Only Earth's Moon, per the current scope. */
export const MOONS = [
  {
    id: 'luna', name: 'Moon', designation: 'LUNA · EARTH I', class: 'NATURAL SATELLITE',
    parent: 'earth',
    aKm: 384400, e: 0.0549, iDeg: 5.145, periodDays: 27.321661,
    radiusKm: 1737.4, massKg: 7.342e22, rotationDays: 27.321661, tiltDeg: 6.68,
    tempC: -20, gravity: 1.62, moons: 0, orbVel: 1.022,
    palette: { base: '#8e8b86', dark: '#3e3c39', light: '#d5d1c9', accent: '#6a6763' },
    kind: 'rocky', roughness: 1.0, craters: 1.6, bump: 0.08, maria: true,
    note: 'Tidally locked, so one face never turns toward us. It recedes 3.8 cm a year and its pull is what keeps Earth’s axial tilt — and its seasons — stable.',
  },
];

/** Small-body populations. */
export const BELTS = [
  {
    id: 'main-belt', name: 'Main Asteroid Belt', designation: 'MINOR PLANET REGION', class: 'SMALL BODIES',
    innerAU: 2.06, outerAU: 3.28, count: 4200, thicknessAU: 0.20,
    tint: '#9d9083',
    note: 'Between Mars and Jupiter: roughly 1.1–1.9 million bodies over 1 km, yet their combined mass is only ~3% of the Moon’s. Ceres alone holds a quarter of it.',
    stats: [
      ['REGION', '2.06 – 3.28 AU'],
      ['TOTAL MASS', '≈ 2.39 × 10²¹ kg'],
      ['LARGEST', 'Ceres · 939 km'],
      ['KIRKWOOD GAPS', '4 major'],
      ['MEAN VELOCITY', '17.9 km/s'],
    ],
  },
  {
    id: 'kuiper', name: 'Kuiper Belt', designation: 'TRANS-NEPTUNIAN REGION', class: 'SMALL BODIES',
    innerAU: 30, outerAU: 50, count: 5200, thicknessAU: 4.0,
    tint: '#7f8fa8',
    note: 'A ring of icy remnants beyond Neptune, 20–200 times more massive than the main belt. Home to Pluto, Haumea, Makemake and the source of short-period comets.',
    stats: [
      ['REGION', '30 – 50 AU'],
      ['KNOWN OBJECTS', '> 3,000 catalogued'],
      ['ESTIMATED', '> 100,000 over 100 km'],
      ['COMPOSITION', 'Water / methane / ammonia ice'],
      ['MEAN TEMP', '≈ −220 °C'],
    ],
  },
];

/** Trojan swarms riding Jupiter's L4/L5 points. */
export const TROJANS = { count: 420, spreadDeg: 26, thicknessAU: 0.34 };
