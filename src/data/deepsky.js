/**
 * Iconic deep-sky objects: black holes and supernovae.
 * Masses in solar masses, distances in light years unless noted.
 * Figures follow the published measurements — EHT for the imaged holes,
 * LIGO/Virgo for the merger remnants, Gaia and X-ray binary studies for the
 * stellar-mass ones.
 */

export const BLACK_HOLES = [
  {
    id: 'sgr-a-star', name: 'Sagittarius A*', designation: 'SGR A*',
    className: 'SUPERMASSIVE BLACK HOLE', kind: 'blackhole',
    distanceLy: 26670, massSolar: 4.297e6, look: 'sgra',
    stats: [
      ['MASS', '4.297 × 10⁶ M☉'],
      ['DISTANCE', '26,670 ly · 8.18 kpc'],
      ['SCHWARZSCHILD Ø', '≈ 25.4 million km'],
      ['IMAGED', '2022 · Event Horizon Telescope'],
      ['LOCATION', 'Milky Way galactic centre'],
    ],
    note: 'The black hole our own galaxy orbits. Decades of tracking the star S2 through its 16-year orbit proved it was there; the EHT resolved its shadow in 2022. Its event horizon would fit inside Mercury’s orbit.',
  },
  {
    id: 'm87-star', name: 'M87*', designation: 'MESSIER 87*',
    className: 'SUPERMASSIVE BLACK HOLE', kind: 'blackhole',
    distanceLy: 5.35e7, massSolar: 6.5e9, look: 'm87',
    stats: [
      ['MASS', '6.5 × 10⁹ M☉'],
      ['DISTANCE', '53.5 Mly'],
      ['SCHWARZSCHILD Ø', '≈ 38 billion km'],
      ['IMAGED', '2019 · first ever'],
      ['JET LENGTH', '≈ 5,000 ly'],
    ],
    note: 'The first black hole humanity ever saw. Its shadow is wider than our entire Solar System, and it drives a relativistic jet 5,000 light years long out of the heart of galaxy M87.',
  },
  {
    id: 'cygnus-x1', name: 'Cygnus X-1', designation: 'CYG X-1',
    className: 'STELLAR-MASS BLACK HOLE', kind: 'blackhole',
    distanceLy: 7240, massSolar: 21.2, look: 'binary',
    stats: [
      ['MASS', '21.2 M☉'],
      ['DISTANCE', '7,240 ly'],
      ['COMPANION', 'Blue supergiant HDE 226868'],
      ['ORBIT', '5.6 days'],
      ['SPIN', '> 95% of maximum'],
    ],
    note: 'The first object widely accepted as a black hole, and the subject of a famous bet between Stephen Hawking and Kip Thorne — Hawking conceded in 1990. It strips gas from its companion star into a searing X-ray disc.',
  },
  {
    id: 'gaia-bh1', name: 'Gaia BH1', designation: 'GAIA BH1',
    className: 'STELLAR-MASS BLACK HOLE', kind: 'blackhole',
    distanceLy: 1560, massSolar: 9.62, look: 'quiet',
    stats: [
      ['MASS', '9.62 M☉'],
      ['DISTANCE', '1,560 ly'],
      ['COMPANION', 'Sun-like G star'],
      ['ORBIT', '185.6 days'],
      ['DISCOVERED', '2022 · Gaia astrometry'],
    ],
    note: 'The nearest black hole known — found not by its glow but by the wobble it puts into a Sun-like star. It is dormant: nothing is falling in, so it emits essentially nothing.',
  },
  {
    id: 'ton-618', name: 'TON 618', designation: 'TON 618',
    className: 'ULTRAMASSIVE QUASAR', kind: 'blackhole',
    distanceLy: 1.82e10, massSolar: 6.6e10, look: 'quasar',
    stats: [
      ['MASS', '≈ 6.6 × 10¹⁰ M☉'],
      ['DISTANCE', '18.2 Gly · z = 2.219'],
      ['SCHWARZSCHILD Ø', '≈ 390 billion km'],
      ['LUMINOSITY', '≈ 4 × 10¹⁴ L☉'],
      ['CLASS', 'Hyperluminous quasar'],
    ],
    note: 'One of the most massive black holes ever weighed — its event horizon is some 40 times wider than Neptune’s orbit. As a quasar it outshines its entire host galaxy by a factor of hundreds.',
  },
  {
    id: 'gw150914', name: 'GW150914', designation: 'GW150914',
    className: 'MERGER REMNANT', kind: 'blackhole',
    distanceLy: 1.3e9, massSolar: 62, look: 'merger',
    stats: [
      ['FINAL MASS', '62 M☉'],
      ['PROGENITORS', '36 + 29 M☉'],
      ['DISTANCE', '≈ 1.3 Gly'],
      ['DETECTED', '14 Sep 2015 · LIGO'],
      ['ENERGY RADIATED', '3 M☉ as gravitational waves'],
    ],
    note: 'The first direct detection of gravitational waves. Two black holes spiralled together and, in a fraction of a second, radiated three solar masses of energy as ripples in spacetime — briefly outshining every star in the observable universe combined.',
  },
];

export const SUPERNOVAE = [
  {
    id: 'crab', name: 'Crab Nebula', designation: 'M1 · SN 1054',
    className: 'SUPERNOVA REMNANT', kind: 'supernova',
    distanceLy: 6500, look: 'crab',
    stats: [
      ['EXPLODED', '1054 CE · recorded in China'],
      ['DISTANCE', '6,500 ly'],
      ['DIAMETER', '≈ 11 ly'],
      ['EXPANSION', '1,500 km/s'],
      ['REMNANT', 'Pulsar spinning 30×/second'],
    ],
    note: 'Chinese astronomers logged a "guest star" bright enough to see in daylight for 23 days. What remains is a shredded shell around a neutron star that sweeps a beam past Earth thirty times a second.',
  },
  {
    id: 'cas-a', name: 'Cassiopeia A', designation: 'CAS A',
    className: 'SUPERNOVA REMNANT', kind: 'supernova',
    distanceLy: 11000, look: 'casa',
    stats: [
      ['EXPLODED', '≈ 1680 CE'],
      ['DISTANCE', '11,000 ly'],
      ['DIAMETER', '≈ 10 ly'],
      ['EXPANSION', '4,000 – 6,000 km/s'],
      ['NOTE', 'Brightest radio source beyond the Sun'],
    ],
    note: 'The youngest known remnant in the Milky Way, and the brightest radio source in the sky outside the Solar System. Oddly, almost nobody recorded seeing it explode — dust likely dimmed it.',
  },
  {
    id: 'sn1987a', name: 'SN 1987A', designation: 'SN 1987A',
    className: 'SUPERNOVA', kind: 'supernova',
    distanceLy: 168000, look: 'rings',
    stats: [
      ['EXPLODED', '23 Feb 1987'],
      ['DISTANCE', '168,000 ly · LMC'],
      ['TYPE', 'II-P · core collapse'],
      ['NEUTRINOS', '24 detected, 3 hours early'],
      ['PROGENITOR', 'Blue supergiant Sanduleak −69 202'],
    ],
    note: 'The closest supernova since 1604, and the first whose progenitor star we had photographs of. Detectors caught its neutrino burst hours before the light arrived — the birth of neutrino astronomy.',
  },
  {
    id: 'sn1006', name: 'SN 1006', designation: 'SN 1006',
    className: 'SUPERNOVA REMNANT', kind: 'supernova',
    distanceLy: 7200, look: 'shell',
    stats: [
      ['EXPLODED', '1 May 1006 CE'],
      ['DISTANCE', '7,200 ly'],
      ['PEAK MAGNITUDE', '−7.5'],
      ['TYPE', 'Ia · white dwarf detonation'],
      ['DIAMETER', '≈ 65 ly'],
    ],
    note: 'The brightest stellar event in recorded history — roughly sixteen times brighter than Venus, and bright enough to read by. Observers in Egypt, Iraq, China, Japan and Europe all wrote it down.',
  },
  {
    id: 'tycho', name: "Tycho's Supernova", designation: 'SN 1572 · 3C 10',
    className: 'SUPERNOVA REMNANT', kind: 'supernova',
    distanceLy: 9800, look: 'shell',
    stats: [
      ['EXPLODED', 'Nov 1572'],
      ['DISTANCE', '≈ 9,800 ly'],
      ['TYPE', 'Ia'],
      ['PEAK MAGNITUDE', '−4'],
      ['OBSERVER', 'Tycho Brahe'],
    ],
    note: 'Tycho Brahe showed this new star had no measurable parallax, so it had to lie beyond the Moon. That single observation broke the ancient doctrine that the heavens were unchanging.',
  },
  {
    id: 'veil', name: 'Veil Nebula', designation: 'CYGNUS LOOP',
    className: 'SUPERNOVA REMNANT', kind: 'supernova',
    distanceLy: 2400, look: 'veil',
    stats: [
      ['EXPLODED', '10,000 – 20,000 yr ago'],
      ['DISTANCE', '2,400 ly'],
      ['ANGULAR SIZE', '3° · six full Moons'],
      ['DIAMETER', '≈ 110 ly'],
      ['STRUCTURE', 'Shock-heated filaments'],
    ],
    note: 'The blast wave is still ploughing through interstellar gas at 1.5 million km/h, lighting it into ribbons. It covers six times the width of the full Moon on the sky, yet is far too faint to see by eye.',
  },
  {
    id: 'eta-car', name: 'Eta Carinae', designation: 'η CAR · HOMUNCULUS',
    className: 'SUPERNOVA CANDIDATE', kind: 'supernova',
    distanceLy: 7500, look: 'homunculus',
    stats: [
      ['SYSTEM MASS', '≈ 100 + 30 M☉'],
      ['DISTANCE', '7,500 ly'],
      ['LUMINOSITY', '5 × 10⁶ L☉'],
      ['GREAT ERUPTION', '1837 – 1856'],
      ['STATUS', 'Expected to go supernova'],
    ],
    note: 'In the 1840s it briefly became the second-brightest star in the sky while shedding more than ten solar masses — and survived. The twin lobes of that eruption are still expanding. It will not survive the next one.',
  },
];
