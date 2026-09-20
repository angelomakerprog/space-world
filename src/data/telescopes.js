/**
 * Space telescopes: where they actually are, and what they were built to do.
 *
 * `place` describes the real orbit; the scene has to exaggerate two of them to
 * be visible at all — Hubble is 535 km above a planet drawn 1.5 units wide, and
 * JWST sits 1.5 million km beyond Earth, which is 0.01 AU. Both are noted.
 */

export const TELESCOPES = [
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    designation: 'HST',
    className: 'ORBITAL OBSERVATORY',
    kind: 'telescope',
    look: 'hubble',
    place: { mode: 'earth-orbit', radius: 2.6, incl: 28.5, period: 0.0662 },
    spikes: 4,
    stats: [
      ['APERTURE', '2.4 m'],
      ['LAUNCHED', '24 April 1990 · STS-31'],
      ['ORBIT', '535 km · 95 minutes'],
      ['WAVELENGTHS', 'Near-UV, visible, near-IR'],
      ['STATUS', 'Operating · 5 servicing missions'],
    ],
    note: 'Launched with a mirror ground to the wrong shape by two microns. Three years later astronauts fitted corrective optics in orbit, and it went on to become the most productive scientific instrument ever built.',
    body: 'Hubble sits above the atmosphere that blurs every ground-based image, which is the whole point of it: 0.05 arcsecond resolution, held steady to within seven thousandths of an arcsecond. It measured the expansion rate of the universe to within a few percent, watched Comet Shoemaker–Levy 9 hit Jupiter, and produced the Deep Field — a ten-day exposure of an apparently empty patch of sky that turned out to contain three thousand galaxies.',
    target: { kind: 'galaxy', hint: 'A spiral galaxy in the deep field' },
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    designation: 'JWST',
    className: 'INFRARED OBSERVATORY',
    kind: 'telescope',
    look: 'jwst',
    place: { mode: 'l2', offset: 3.2 },
    spikes: 6,
    stats: [
      ['APERTURE', '6.5 m · 18 gold hexagons'],
      ['LAUNCHED', '25 December 2021 · Ariane 5'],
      ['ORBIT', 'Sun–Earth L2 · 1.5 million km'],
      ['WAVELENGTHS', '0.6 – 28 µm infrared'],
      ['OPERATING TEMP', '−223 °C, passively cooled'],
    ],
    note: 'The largest telescope ever flown. Its five-layer sunshield, the size of a tennis court, keeps the mirror at 50 kelvin — cold enough to see the first galaxies that ever formed.',
    body: 'Webb had 344 single points of failure during deployment and every one of them worked. It sees in the infrared because the light of the earliest galaxies has been stretched out of the visible band by the expansion of the universe — light that left when the cosmos was 300 million years old arrives here as heat. Its six-pointed diffraction spikes come from the hexagonal mirror segments, and the three struts holding the secondary add a seventh and eighth that overlap two of them.',
    target: { kind: 'deep', hint: 'The earliest galaxies, in infrared' },
  },
  {
    id: 'kepler',
    name: 'Kepler',
    designation: 'KEPLER · K2',
    className: 'EXOPLANET SURVEY',
    kind: 'telescope',
    look: 'kepler',
    place: { mode: 'trailing', au: 1.02, lagDeg: 62 },
    spikes: 4,
    stats: [
      ['APERTURE', '0.95 m · 105 deg² field'],
      ['LAUNCHED', '7 March 2009'],
      ['ORBIT', 'Earth-trailing, heliocentric'],
      ['PLANETS FOUND', '2,662 confirmed'],
      ['STATUS', 'Retired 15 November 2018'],
    ],
    note: 'Stared at the same 150,000 stars for four years, measuring their brightness to twenty parts per million, waiting for the fractional dimming of a planet crossing in front. It found thousands.',
    body: 'Kepler answered a question people had asked for centuries: how common are planets? The answer is that they are ordinary — most stars have them, and small rocky worlds are the most common kind. Two of its four reaction wheels failed in 2013, leaving it unable to hold a steady stare; engineers rescued the mission by balancing the spacecraft against the pressure of sunlight itself, and it worked for five more years as K2 before running out of fuel.',
    target: { kind: 'field', hint: 'A dense field of Sun-like stars' },
  },
];
