import * as THREE from 'three';
import { noise3, fbm3, ridged3, rng } from './noise.js';
import { BLACK_HOLES, SUPERNOVAE } from '../data/deepsky.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const mixRGB = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function pixelCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  return { c, ctx, img, A: img.data };
}

function finish(c, ctx, img) {
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── black holes ─────────────────────────────────────────────────────── */

/**
 * What you actually see of a black hole is everything except the hole: a
 * lensed accretion disc, a thin photon ring at the edge of the shadow, and
 * a dark circle where light cannot escape. The disc is drawn brighter on one
 * limb because material rushing toward us is Doppler-beamed — that asymmetry
 * is the single most recognisable feature of the EHT images.
 */
export function blackHoleSprite(look, seed, size = 256) {
  const { c, ctx, img, A } = pixelCanvas(size);
  const rand = rng(seed);
  const half = size / 2;

  const jets = look === 'quasar' || look === 'm87';
  const tiltY = look === 'sgra' ? 0.88 : look === 'm87' ? 0.72 : 0.34;  // disc inclination
  const beamDir = rand() < 0.5 ? -1 : 1;                                 // which limb approaches
  const shadowR = 0.17;
  const photonR = 0.205;
  const discIn = 0.26;
  const discOut = look === 'quiet' ? 0.55 : 0.80;

  const HOT = [255, 250, 235];
  const WARM = [255, 186, 96];
  const COOL = [214, 96, 40];
  const JET = [150, 200, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const px = (x - half) / half;
      const py = (y - half) / half;

      let inten = 0;
      let col = WARM;

      // accretion disc, squashed by inclination
      const dy = py / Math.max(tiltY, 0.05);
      const rd = Math.hypot(px, dy);
      if (rd > discIn * 0.7 && rd < discOut * 1.25) {
        const band = smoothstep(discIn * 0.7, discIn, rd) * (1 - smoothstep(discOut * 0.7, discOut * 1.25, rd));
        // turbulent streaks wound around the disc
        const th = Math.atan2(dy, px);
        const swirl = fbm3(Math.cos(th * 2) * 3 + rd * 7, Math.sin(th * 2) * 3, seed % 7, seed);
        const grain = 0.55 + swirl * 0.9;
        // relativistic beaming: the approaching side is far brighter
        const beam = 0.30 + 0.70 * Math.pow(clamp01(0.5 + 0.5 * Math.cos(th) * beamDir), 2.2);
        const hot = 1 - smoothstep(discIn, discOut, rd);
        inten += band * grain * beam * (0.5 + hot * 1.5) * 0.80;
        col = mixRGB(COOL, WARM, clamp01(hot * 1.3));
        col = mixRGB(col, HOT, clamp01((hot - 0.55) * 2.2));
      }

      // photon ring — thin, circular, and unaffected by the disc's tilt
      const rr = Math.hypot(px, py);
      const ring = Math.exp(-Math.pow((rr - photonR) / 0.014, 2));
      if (ring > 0.002) {
        inten += ring * 1.45;
        col = mixRGB(col, HOT, clamp01(ring));
      }

      // relativistic jets along the disc axis
      if (jets) {
        const along = Math.abs(py);
        const across = Math.abs(px);
        const cone = across < 0.045 + along * 0.10 ? 1 : 0;
        if (cone && along > photonR) {
          const fade = (1 - smoothstep(0.35, 1.0, along)) * (1 - across / (0.05 + along * 0.12));
          const knot = 0.6 + noise3(px * 30, py * 12, 3.3, seed + 5) * 0.9;
          inten += fade * knot * 0.34;
          col = mixRGB(col, JET, clamp01(fade * 1.4));
        }
      }

      // the shadow: nothing escapes, so nothing is drawn
      const shadow = 1 - smoothstep(shadowR * 0.82, shadowR, rr);
      inten *= 1 - shadow;

      if (rr > 1.0) inten = 0;
      const a = clamp01(inten);
      A[o] = col[0] * a; A[o + 1] = col[1] * a; A[o + 2] = col[2] * a;
      A[o + 3] = a * 255;
    }
  }
  return finish(c, ctx, img);
}

/* ── supernovae and their remnants ───────────────────────────────────── */

export function supernovaSprite(look, seed, size = 256) {
  const { c, ctx, img, A } = pixelCanvas(size);
  const rand = rng(seed);
  const half = size / 2;
  const rot = rand() * Math.PI * 2;
  const cr = Math.cos(rot), sr = Math.sin(rot);

  // each remnant type has its own emission signature
  const PALETTE = {
    crab:        { a: [120, 170, 255], b: [255, 140, 90],  c: [255, 226, 190] },
    casa:        { a: [120, 255, 190], b: [255, 150, 80],  c: [255, 240, 210] },
    shell:       { a: [130, 190, 255], b: [190, 225, 255], c: [255, 245, 235] },
    veil:        { a: [90, 230, 255],  b: [255, 90, 110],  c: [220, 245, 255] },
    rings:       { a: [255, 190, 120], b: [255, 120, 90],  c: [255, 248, 235] },
    homunculus:  { a: [255, 200, 140], b: [255, 130, 70],  c: [255, 245, 225] },
  }[look] || { a: [180, 200, 255], b: [255, 160, 110], c: [255, 240, 220] };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      let px = (x - half) / half, py = (y - half) / half;
      const rx = px * cr - py * sr, ry = px * sr + py * cr;
      const r = Math.hypot(rx, ry);
      if (r > 1.02) { A[o + 3] = 0; continue; }

      let inten = 0;
      let col = PALETTE.a;

      if (look === 'rings') {
        // SN 1987A: a bright core inside a lit equatorial ring, plus two
        // fainter outer rings above and below it
        inten += Math.exp(-Math.pow(r / 0.09, 2)) * 1.05;
        col = PALETTE.c;
        const ey = ry / 0.34;
        const rr = Math.hypot(rx, ey);
        const beads = 0.55 + Math.pow(clamp01(noise3(rx * 26, ey * 26, 2.2, seed)), 2) * 1.8;
        const main = Math.exp(-Math.pow((rr - 0.52) / 0.055, 2)) * beads;
        inten += main * 0.80;
        col = mixRGB(col, PALETTE.a, clamp01(main));
        for (const off of [-0.42, 0.42]) {
          const oy = (ry - off) / 0.30;
          const orr = Math.hypot(rx, oy);
          const outer = Math.exp(-Math.pow((orr - 0.62) / 0.075, 2));
          inten += outer * 0.18;
          col = mixRGB(col, PALETTE.b, clamp01(outer * 0.7));
        }
      } else if (look === 'homunculus') {
        // Eta Carinae's two eruption lobes, waist-pinched
        for (const sgn of [-1, 1]) {
          const ly = (ry - sgn * 0.34) / 0.44;
          const lx = rx / 0.30;
          const lr = Math.hypot(lx, ly);
          const lobe = Math.exp(-Math.pow(lr / 0.85, 2.6));
          const shellEdge = Math.exp(-Math.pow((lr - 0.72) / 0.16, 2)) * 0.9;
          const tex = 0.5 + fbm3(rx * 7, ry * 7, seed % 5, seed) * 1.0;
          inten += (lobe * 0.55 + shellEdge) * tex * 0.62;
        }
        col = mixRGB(PALETTE.b, PALETTE.a, clamp01(1 - Math.abs(ry) * 1.4));
        const core = Math.exp(-Math.pow(r / 0.07, 2));
        inten += core * 1.2;
        col = mixRGB(col, PALETTE.c, clamp01(core));
      } else if (look === 'shell') {
        // Type Ia remnants: a thin, limb-brightened bubble
        const wob = fbm3(rx * 3.4, ry * 3.4, seed % 9, seed) - 0.5;
        const edge = Math.exp(-Math.pow((r - (0.74 + wob * 0.10)) / 0.085, 2));
        const fil = ridged3(rx * 12, ry * 12, 1.7, { octaves: 4, seed });
        inten += edge * (0.45 + fil * 1.25) * 0.72;
        inten += Math.exp(-Math.pow(r / 0.55, 2)) * 0.08;   // faint interior
        col = mixRGB(PALETTE.a, PALETTE.b, clamp01(fil * 1.2));
        col = mixRGB(col, PALETTE.c, clamp01((fil - 0.7) * 2.5));
      } else if (look === 'veil') {
        // shock filaments: long ridged ribbons, not a closed shell
        const warp = fbm3(rx * 2.2, ry * 2.2, 4.4, { octaves: 3, seed }) - 0.5;
        const arc = Math.exp(-Math.pow((r - (0.66 + warp * 0.22)) / 0.20, 2));
        const fil = Math.pow(ridged3(rx * 9, ry * 9 + warp * 4, 2.5, { octaves: 5, seed }), 2.4);
        inten += arc * fil * 1.85;
        const hue = noise3(rx * 4, ry * 4, 8.8, seed + 3);
        col = mixRGB(PALETTE.a, PALETTE.b, clamp01((hue - 0.42) * 2.2));
      } else {
        // Crab and Cas A: a knotted body with a bright pulsar / core
        const body = Math.exp(-Math.pow(r / 0.52, 2.1));
        const web = ridged3(rx * 7, ry * 7, seed % 6, { octaves: 5, seed });
        const knots = Math.pow(clamp01(noise3(rx * 17, ry * 17, 1.4, seed + 8)), 3.4);
        inten += body * (0.30 + web * 1.05) * 0.72 + knots * body * 1.35;
        col = mixRGB(PALETTE.a, PALETTE.b, clamp01(web * 1.35));
        col = mixRGB(col, PALETTE.c, clamp01(knots * 3));
        const core = Math.exp(-Math.pow(r / 0.05, 2));
        inten += core * 0.85;
        col = mixRGB(col, PALETTE.c, clamp01(core));
      }

      inten *= 1 - smoothstep(0.86, 1.02, r);
      const a = clamp01(inten);
      A[o] = col[0] * a; A[o + 1] = col[1] * a; A[o + 2] = col[2] * a;
      A[o + 3] = clamp01(a * 1.1) * 255;
    }
  }
  return finish(c, ctx, img);
}

/* ── placement ───────────────────────────────────────────────────────── */

const SHELL = 2150;
const GAL_TILT = 60.2 * Math.PI / 180;

/** Objects inside the Milky Way belong near its plane; the rest can be anywhere. */
function place(rand, distanceLy, out) {
  const galactic = distanceLy < 3e5;
  const l = rand() * Math.PI * 2;
  let b;
  if (galactic) {
    b = ((rand() + rand() + rand()) / 1.5 - 1) * 0.26;      // hugs the disc
  } else {
    b = Math.sign(rand() * 2 - 1) * (0.30 + rand() * 1.10); // avoids it
  }
  const cb = Math.cos(b);
  const gx = cb * Math.cos(l), gy = cb * Math.sin(l), gz = Math.sin(b);
  const cy = Math.cos(GAL_TILT), sy = Math.sin(GAL_TILT);
  const r = SHELL * (0.92 + rand() * 0.22);
  out.set(gx * r, (gz * cy - gy * sy) * r, (gz * sy + gy * cy) * r);
}

export function buildDeepSky() {
  const group = new THREE.Group();
  group.name = 'deepsky';
  const rand = rng(0x0BADCAFE);
  const targets = [];
  const pos = new THREE.Vector3();

  const all = [
    ...BLACK_HOLES.map((o) => ({ ...o, _sprite: 'bh' })),
    ...SUPERNOVAE.map((o) => ({ ...o, _sprite: 'sn' })),
  ];

  all.forEach((o, i) => {
    const tex = o._sprite === 'bh'
      ? blackHoleSprite(o.look, 4000 + i * 53, 256)
      : supernovaSprite(o.look, 7000 + i * 71, 256);

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    place(rand, o.distanceLy, pos);
    sp.position.copy(pos);

    // nearer objects look bigger, but keep them all subtle against the stars
    const near = Math.min(1, Math.pow(2e4 / Math.max(o.distanceLy, 500), 0.16));
    const size = 24 + near * 78;
    sp.scale.set(size, size, 1);
    mat.opacity = 0.26 + near * 0.26;

    sp.userData = {
      hoverable: true,
      kind: o.kind,
      id: o.id,
      name: o.name,
      designation: o.designation,
      className: o.className,
      note: o.note,
      stats: o.stats,
      distanceLy: o.distanceLy,
      baseSize: size,
    };
    group.add(sp);
    targets.push(sp);
  });

  return { group, targets };
}
