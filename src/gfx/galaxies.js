import * as THREE from 'three';
import { galaxySprite } from './textures.js';
import { rng } from './noise.js';

/**
 * Deep-field galaxies. Real objects with real distances and morphologies,
 * scattered across the sky — and deliberately kept out of the galactic plane,
 * because dust in the Milky Way really does hide that strip from us (the
 * "Zone of Avoidance").
 */
const CATALOGUE = [
  ['Andromeda',          'M31',      'spiral',     2.537,  'Barred spiral · 1 trillion stars · closing on us at 110 km/s'],
  ['Triangulum',         'M33',      'spiral',     2.73,   'Unbarred spiral · third-largest in the Local Group'],
  ['Large Magellanic Cloud', 'LMC',  'irregular',  0.163,  'Satellite of the Milky Way · hosts the Tarantula Nebula'],
  ['Small Magellanic Cloud', 'SMC',  'irregular',  0.20,   'Dwarf irregular · tidally distorted by the LMC'],
  ['Whirlpool',          'M51a',     'spiral',     23.0,   'Grand-design spiral colliding with NGC 5195'],
  ['Sombrero',           'M104',     'elliptical', 29.3,   'Lenticular · a near edge-on dust lane over a vast bulge'],
  ['Pinwheel',           'M101',     'spiral',     20.9,   'Face-on spiral · 170,000 ly across'],
  ['Centaurus A',        'NGC 5128', 'elliptical', 12.0,   'Peculiar elliptical · relativistic jets from a 55M M☉ black hole'],
  ["Bode's Galaxy",      'M81',      'spiral',     11.8,   'Grand-design spiral · anchors the M81 Group'],
  ['Cigar Galaxy',       'M82',      'irregular',  11.5,   'Starburst · forming stars 10x faster than the Milky Way'],
  ['Sculptor Galaxy',    'NGC 253',  'spiral',     11.4,   'Dusty starburst spiral seen nearly edge-on'],
  ['Black Eye',          'M64',      'spiral',     17.3,   'Counter-rotating gas disc behind a dark dust band'],
  ['Cartwheel',          'ESO 350-40','irregular', 500.0,  'Ring galaxy · sculpted by a head-on collision'],
  ['Antennae',           'NGC 4038', 'irregular',  45.0,   'Two galaxies mid-merger with 100-million-year tidal tails'],
  ['Virgo A',            'M87',      'elliptical', 53.5,   'Supergiant elliptical · first black hole ever imaged'],
  ['Barred Spiral',      'NGC 1300', 'barred',     61.0,   'Textbook barred spiral · 110,000 ly across'],
  ["Hoag's Object",      'PGC 54559','elliptical', 612.0,  'A near-perfect ring of blue stars around a yellow core'],
  ['Sunflower',          'M63',      'spiral',     29.3,   'Flocculent spiral · many short, feathery arms'],
  ['Southern Pinwheel',  'M83',      'barred',     15.0,   'Barred spiral · six recorded supernovae'],
  ['Fireworks Galaxy',   'NGC 6946', 'spiral',     25.2,   'Ten supernovae in a century — the most of any known galaxy'],
  ['Needle Galaxy',      'NGC 4565', 'spiral',     42.0,   'Edge-on spiral with a knife-thin dust lane'],
  ['Circinus',           'ESO 97-13','spiral',     13.0,   'Seyfert galaxy hidden behind the Milky Way’s plane'],
  ['Tadpole',            'UGC 10214','spiral',     420.0,  'A 280,000 ly tidal tail torn out by a passing intruder'],
  ['Malin 1',            'LSBG',     'spiral',     1190.0, 'Giant low-surface-brightness spiral · 650,000 ly wide'],
  ['IC 1101',            'IC 1101',  'elliptical', 1045.0, 'Among the largest known galaxies · a supergiant cD'],
  ['NGC 1365',           'NGC 1365', 'barred',     56.0,   'Great Barred Spiral · an active galactic nucleus'],
  ['Mice Galaxies',      'NGC 4676', 'irregular',  290.0,  'A merging pair trailing long, straight tidal tails'],
  ['Sagittarius Dwarf',  'Sgr dSph', 'irregular',  0.065,  'Being torn apart and absorbed by the Milky Way right now'],
];

const SHELL = 2400;
const GAL_TILT = 60.2 * Math.PI / 180;

export function buildGalaxies() {
  const group = new THREE.Group();
  group.name = 'galaxies';
  const rand = rng(0x5EED1A);
  const targets = [];

  CATALOGUE.forEach(([name, cat, kind, mly, blurb], idx) => {
    const tex = galaxySprite(kind, 1000 + idx * 37, kind === 'elliptical' ? 192 : 256);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    });
    const sp = new THREE.Sprite(mat);

    // pick a direction, then push it away from the galactic plane
    let l = rand() * Math.PI * 2;
    let b = (rand() * 2 - 1);
    b = Math.sign(b) * (0.28 + Math.abs(b) * 1.28);   // radians, |b| > ~16°
    b = Math.max(-1.45, Math.min(1.45, b));

    const cb = Math.cos(b);
    const gx = cb * Math.cos(l), gy = cb * Math.sin(l), gz = Math.sin(b);
    const cy = Math.cos(GAL_TILT), sy = Math.sin(GAL_TILT);
    const r = SHELL * (0.9 + rand() * 0.25);
    sp.position.set(gx * r, (gz * cy - gy * sy) * r, (gz * sy + gy * cy) * r);

    // apparent size falls off with distance, floored so nothing vanishes
    const near = Math.min(1, Math.pow(2.5 / Math.max(mly, 0.05), 0.30));
    const size = 40 + near * 235;
    sp.scale.set(size, size, 1);
    mat.opacity = 0.30 + near * 0.55;

    sp.userData = {
      hoverable: true,
      kind: 'galaxy',
      id: 'gal-' + cat.replace(/\s+/g, '').toLowerCase(),
      name,
      designation: cat,
      className: kind === 'barred' ? 'BARRED SPIRAL'
        : kind === 'spiral' ? 'SPIRAL GALAXY'
        : kind === 'elliptical' ? 'ELLIPTICAL GALAXY' : 'IRREGULAR GALAXY',
      distanceMly: mly,
      note: blurb,
      haloScale: size * 0.62,
      baseOpacity: mat.opacity,
      baseSize: size,
    };
    group.add(sp);
    targets.push(sp);
  });

  return { group, targets };
}
