import * as THREE from 'three';
import { noise3, fbm3, ridged3, rng } from './noise.js';

/* ── helpers ─────────────────────────────────────────────────────────── */

function rgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
function mixRGB(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: false }) };
}

function toTexture(canvas, { srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

/** Equirectangular pixel -> unit sphere direction. */
function dirAt(u, v, out) {
  const lon = u * Math.PI * 2 - Math.PI;
  const lat = (0.5 - v) * Math.PI;
  const cl = Math.cos(lat);
  out[0] = cl * Math.cos(lon);
  out[1] = Math.sin(lat);
  out[2] = cl * Math.sin(lon);
  return out;
}

function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ── craters ─────────────────────────────────────────────────────────── */

/**
 * Rasterise impact craters directly into a height field. Each crater only
 * touches its own bounding box, so hundreds of them cost almost nothing.
 */
function stampCraters(height, albedo, W, H, count, seed, opts = {}) {
  const rand = rng(seed);
  const { minR = 0.006, maxR = 0.085, powr = 3.0, rimGain = 1, brightRim = 0.5 } = opts;

  for (let n = 0; n < count; n++) {
    // uniform on the sphere
    const lat = Math.asin(rand() * 2 - 1);
    const lon = rand() * Math.PI * 2 - Math.PI;
    const R = minR + (maxR - minR) * Math.pow(rand(), powr);   // many small, few huge
    const depth = 0.55 + rand() * 0.5;
    const cx = Math.cos(lat) * Math.cos(lon);
    const cy = Math.sin(lat);
    const cz = Math.cos(lat) * Math.sin(lon);
    const reach = R * 1.55;

    const vSpan = Math.ceil((reach / Math.PI) * H) + 2;
    const vC = Math.round((0.5 - lat / Math.PI) * H);
    const latScale = Math.max(0.12, Math.cos(lat));
    const uSpan = Math.ceil((reach / (Math.PI * 2 * latScale)) * W) + 2;
    const uC = Math.round(((lon + Math.PI) / (Math.PI * 2)) * W);

    for (let dv = -vSpan; dv <= vSpan; dv++) {
      const y = vC + dv;
      if (y < 0 || y >= H) continue;
      const v = (y + 0.5) / H;
      const plat = (0.5 - v) * Math.PI;
      const pcl = Math.cos(plat), psl = Math.sin(plat);
      for (let du = -uSpan; du <= uSpan; du++) {
        let x = uC + du;
        x = ((x % W) + W) % W;
        const u = (x + 0.5) / W;
        const plon = u * Math.PI * 2 - Math.PI;
        const px = pcl * Math.cos(plon), py = psl, pz = pcl * Math.sin(plon);
        const dot = clamp01(px * cx + py * cy + pz * cz) * 0.999999;
        const ang = Math.acos(Math.max(-1, Math.min(1, px * cx + py * cy + pz * cz)));
        if (ang > reach) continue;
        const t = ang / R;
        const i = y * W + x;

        let h = 0, alb = 0;
        if (t < 0.72) {
          // bowl floor
          const f = t / 0.72;
          h = -depth * (1 - f * f * 0.55) * 0.55;
          alb = -0.05;
        } else if (t < 1.0) {
          // raised rim
          const f = (t - 0.72) / 0.28;
          h = depth * Math.sin(f * Math.PI) * 0.85 * rimGain;
          alb = brightRim * Math.sin(f * Math.PI) * 0.5;
        } else {
          // ejecta blanket
          const f = (t - 1.0) / 0.55;
          h = depth * 0.12 * (1 - f);
          alb = brightRim * 0.28 * (1 - f) * (1 - f);
        }
        height[i] += h * 0.35;
        albedo[i] += alb;
      }
    }
  }
}

/* ── rocky worlds: Mercury, Mars, the Moon ───────────────────────────── */

export function buildRocky(body, W = 1024) {
  const H = W >> 1;
  const seed = seedOf(body.id);
  const p = body.palette;
  const cDark = rgb(p.dark), cBase = rgb(p.base), cLight = rgb(p.light), cAcc = rgb(p.accent);

  const height = new Float32Array(W * H);
  const albedo = new Float32Array(W * H);
  const d = [0, 0, 0];
  const d2v = [0, 0, 0];

  // base terrain
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      dirAt(u, v, d);
      const big = fbm3(d[0] * 2.1, d[1] * 2.1, d[2] * 2.1, { octaves: 5, seed });
      const fine = ridged3(d[0] * 9, d[1] * 9, d[2] * 9, { octaves: 4, seed: seed + 977 });
      const i = y * W + x;
      height[i] = (big - 0.5) * 1.6 + (fine - 0.5) * 0.5;
      albedo[i] = (big - 0.5) * 0.55 + (fine - 0.5) * 0.22;
    }
  }

  // lunar maria: broad, dark, low-lying basaltic plains
  if (body.maria) {
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H;
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W;
        dirAt(u, v, d);
        const m = fbm3(d[0] * 1.35 + 4, d[1] * 1.35, d[2] * 1.35, { octaves: 3, seed: seed + 5501 });
        const mask = smoothstep(0.54, 0.70, m);
        const i = y * W + x;
        albedo[i] -= mask * 0.62;
        height[i] -= mask * 0.25;
      }
    }
  }

  if (body.craters) {
    stampCraters(height, albedo, W, H, Math.round(520 * body.craters), seed + 31, {
      maxR: body.maria ? 0.12 : 0.09,
      brightRim: body.maria ? 0.62 : 0.44,
    });
  }

  // Mars gets its signature volcanic swell + rift valley
  if (body.id === 'mars') {
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H;
      const lat = (0.5 - v) * 180;
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W;
        const lon = u * 360 - 180;
        const i = y * W + x;
        // Tharsis rise
        const dt = Math.hypot((lon + 100) / 34, (lat - 4) / 26);
        if (dt < 1.6) { height[i] += (1.6 - dt) * 0.55; albedo[i] += (1.6 - dt) * 0.10; }
        // Valles Marineris
        const dvm = Math.abs(lat + 10) / 3.4 + Math.max(0, Math.abs(lon + 62) - 34) / 6;
        if (dvm < 1) { height[i] -= (1 - dvm) * 0.9; albedo[i] -= (1 - dvm) * 0.24; }
      }
    }
  }

  // named surface features: bright nitrogen plains, dark tholin regions
  if (body.patches) {
    for (const pt of body.patches) {
      for (let y = 0; y < H; y++) {
        const v = (y + 0.5) / H;
        const lat = (0.5 - v) * 180;
        if (Math.abs(lat - pt.lat) > pt.ry * 2.2) continue;
        for (let x = 0; x < W; x++) {
          const u = (x + 0.5) / W;
          const lon = u * 360 - 180;
          let dl = ((lon - pt.lon + 540) % 360) - 180;
          const d = Math.hypot(dl / pt.rx, (lat - pt.lat) / pt.ry);
          if (d > 1.5) continue;
          const i = y * W + x;
          dirAt(u, v, d2v);
          const edge = fbm3(d2v[0] * 5, d2v[1] * 5, d2v[2] * 5, { octaves: 3, seed: seed + 71 });
          const soft = 1 - smoothstep(0.72 + (edge - 0.5) * 0.35, 1.12, d);
          albedo[i] += pt.tone * soft;
          height[i] += pt.tone * soft * 0.12;
        }
      }
    }
  }

  // colourise
  const img = new ImageData(W, H);
  const bmp = new ImageData(W, H);
  const A = img.data, B = bmp.data;
  const caps = body.iceCaps || 0;

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const lat = Math.abs(0.5 - v) * 2;   // 0 equator -> 1 pole
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      const h = height[i];
      const shade = clamp01(0.5 + albedo[i] * 0.9 + h * 0.18);

      let col = shade < 0.5
        ? mixRGB(cDark, cBase, shade * 2)
        : mixRGB(cBase, cLight, (shade - 0.5) * 2);

      // warm/cool tint variation
      const tint = noise3(x * 0.011, y * 0.011, 3.7, seed + 8);
      col = mixRGB(col, cAcc, (tint - 0.5) * 0.30 + 0.12);

      if (caps > 0) {
        const u = (x + 0.5) / W;
        dirAt(u, v, d);
        const jag = fbm3(d[0] * 7, d[1] * 7, d[2] * 7, { octaves: 3, seed: seed + 313 });
        const capEdge = 1 - caps - jag * 0.10;
        const ice = smoothstep(capEdge, capEdge + 0.05, lat);
        col = mixRGB(col, [242, 246, 252], ice * 0.94);
      }

      A[o] = col[0]; A[o + 1] = col[1]; A[o + 2] = col[2]; A[o + 3] = 255;
      const bv = clamp01(0.5 + h * 0.55) * 255;
      B[o] = B[o + 1] = B[o + 2] = bv; B[o + 3] = 255;
    }
  }

  const mapC = canvas2d(W, H); mapC.ctx.putImageData(img, 0, 0);
  const bumpC = canvas2d(W, H); bumpC.ctx.putImageData(bmp, 0, 0);
  return { map: toTexture(mapC.c), bump: toTexture(bumpC.c, { srgb: false }) };
}

/* ── Earth ───────────────────────────────────────────────────────────── */

export function buildEarth(W = 2048) {
  const H = W >> 1;
  const seed = seedOf('earth-terra');
  const d = [0, 0, 0], d2 = [0, 0, 0];

  const img = new ImageData(W, H);
  const bmp = new ImageData(W, H);
  const rgh = new ImageData(W, H);
  const nit = new ImageData(W, H);
  const A = img.data, B = bmp.data, R = rgh.data, N = nit.data;

  const DEEP = [4, 22, 58], SEA = [12, 54, 112], SHELF = [26, 96, 156];
  const SAND = [186, 168, 122], GRASS = [58, 96, 46], FOREST = [30, 68, 34];
  const DRY = [150, 116, 66], ROCK = [104, 96, 84], SNOW = [238, 244, 250];

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const latN = (0.5 - v) * 2;          // -1 .. 1
    const alat = Math.abs(latN);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const i = y * W + x, o = i * 4;
      dirAt(u, v, d);

      // domain warp gives coastlines that meander instead of looking like blobs
      const wx = fbm3(d[0] * 1.7 + 11, d[1] * 1.7, d[2] * 1.7, { octaves: 3, seed: seed + 4 });
      const wy = fbm3(d[0] * 1.7, d[1] * 1.7 + 19, d[2] * 1.7, { octaves: 3, seed: seed + 9 });
      d2[0] = d[0] + (wx - 0.5) * 0.55;
      d2[1] = d[1] + (wy - 0.5) * 0.55;
      d2[2] = d[2] + (wx - wy) * 0.35;

      let h = fbm3(d2[0] * 1.55, d2[1] * 1.55, d2[2] * 1.55, { octaves: 7, gain: 0.52, seed });
      // bias toward more ocean than land
      h = h * 1.22 - 0.14;
      const isLand = h > 0.5;

      let col, rough, bumpV, night = 0;

      if (!isLand) {
        const depth = clamp01((0.5 - h) / 0.28);
        col = mixRGB(SHELF, SEA, smoothstep(0, 0.45, depth));
        col = mixRGB(col, DEEP, smoothstep(0.4, 1, depth));
        rough = 62;                         // oceans are glossy, not a mirror
        bumpV = 0.42 - depth * 0.05;
      } else {
        const e = (h - 0.5) / 0.5;          // 0 coast -> 1 peak
        const mt = ridged3(d2[0] * 6.5, d2[1] * 6.5, d2[2] * 6.5, { octaves: 5, seed: seed + 77 });
        const elev = e + mt * 0.42 * smoothstep(0.06, 0.5, e);

        // crude but readable climate model: latitude + a moisture field
        const moist = fbm3(d[0] * 3.1 + 40, d[1] * 3.1, d[2] * 3.1, { octaves: 4, seed: seed + 202 });
        const desertBand = Math.exp(-Math.pow((alat - 0.26) / 0.11, 2));
        const arid = clamp01(desertBand * 1.15 + (0.5 - moist) * 0.9);

        col = mixRGB(FOREST, GRASS, clamp01(alat * 1.4));
        col = mixRGB(col, DRY, clamp01(arid * 0.95));
        col = mixRGB(col, SAND, smoothstep(0.0, 0.035, e) * 0 + clamp01(arid - 0.55) * 0.6);
        col = mixRGB(col, ROCK, smoothstep(0.35, 0.8, elev));

        // boreal fade then permanent snow
        col = mixRGB(col, [72, 92, 74], smoothstep(0.52, 0.72, alat));
        const snowLine = 0.72 - alat * 0.55;
        col = mixRGB(col, SNOW, smoothstep(snowLine, snowLine + 0.12, elev));

        rough = 210 - arid * 30;
        bumpV = 0.5 + elev * 0.5;

        // city lights: coastal, mid-latitude, clustered, never in deserts or ice
        const cluster = fbm3(d[0] * 14, d[1] * 14, d[2] * 14, { octaves: 3, seed: seed + 909 });
        const pop = clamp01(
          Math.exp(-Math.pow((alat - 0.30) / 0.24, 2)) *
          (1 - smoothstep(0.25, 0.6, elev)) *
          (1 - arid * 0.7) *
          smoothstep(0.55, 0.85, cluster)
        );
        night = pop;
      }

      // polar ice caps sit on top of everything — only sampled where they can exist
      if (alat > 0.74) {
        const jag = fbm3(d[0] * 8, d[1] * 8, d[2] * 8, { octaves: 3, seed: seed + 555 });
        const capN = smoothstep(0.80, 0.90, alat + (jag - 0.5) * 0.10);
        const seaIce = latN < 0 ? capN : capN * (isLand ? 1 : 0.75);
        col = mixRGB(col, SNOW, seaIce * 0.96);
        if (seaIce > 0.3) { rough = mix(rough, 190, seaIce); night *= 1 - seaIce; }
      }

      A[o] = col[0]; A[o + 1] = col[1]; A[o + 2] = col[2]; A[o + 3] = 255;
      const bv = clamp01(bumpV) * 255;
      B[o] = B[o + 1] = B[o + 2] = bv; B[o + 3] = 255;
      R[o] = R[o + 1] = R[o + 2] = rough; R[o + 3] = 255;
      const nv = night * 255;
      N[o] = nv; N[o + 1] = nv * 0.82; N[o + 2] = nv * 0.55; N[o + 3] = 255;
    }
  }

  const mapC = canvas2d(W, H); mapC.ctx.putImageData(img, 0, 0);
  const bumpC = canvas2d(W, H); bumpC.ctx.putImageData(bmp, 0, 0);
  const roughC = canvas2d(W, H); roughC.ctx.putImageData(rgh, 0, 0);
  const nightC = canvas2d(W, H); nightC.ctx.putImageData(nit, 0, 0);

  return {
    map: toTexture(mapC.c),
    bump: toTexture(bumpC.c, { srgb: false }),
    rough: toTexture(roughC.c, { srgb: false }),
    night: toTexture(nightC.c),
    clouds: buildClouds(W >> 1),
  };
}

/** Cloud deck as a separate transparent shell — banded by latitude like the real circulation cells. */
export function buildClouds(W = 1024) {
  const H = W >> 1;
  const seed = seedOf('terra-clouds');
  const img = new ImageData(W, H);
  const A = img.data;
  const d = [0, 0, 0];

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const alat = Math.abs(0.5 - v) * 2;
    // ITCZ band at the equator, storm tracks near 55°, clear subtropics near 25°
    const belt =
      Math.exp(-Math.pow(alat / 0.10, 2)) * 0.95 +
      Math.exp(-Math.pow((alat - 0.58) / 0.20, 2)) * 0.85 +
      Math.exp(-Math.pow((alat - 0.95) / 0.16, 2)) * 0.5 +
      0.28;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const o = (y * W + x) * 4;
      dirAt(u, v, d);
      // stretch zonally so systems smear east–west like real weather
      const s = fbm3(d[0] * 3.4, d[1] * 7.0, d[2] * 3.4, { octaves: 6, gain: 0.55, seed });
      const w = ridged3(d[0] * 9, d[1] * 16, d[2] * 9, { octaves: 4, seed: seed + 13 });
      // a hard floor keeps clear sky genuinely clear instead of laying a
      // uniform veil over the whole globe
      const raw = (s * 0.72 + w * 0.42) * belt;
      const a = smoothstep(0.44, 0.80, raw);
      A[o] = 255; A[o + 1] = 255; A[o + 2] = 255;
      A[o + 3] = a * 245;
    }
  }
  const c = canvas2d(W, H); c.ctx.putImageData(img, 0, 0);
  const t = toTexture(c.c);
  return t;
}

/* ── gas & ice giants ────────────────────────────────────────────────── */

export function buildBanded(body, W = 1600) {
  const H = W >> 1;
  const seed = seedOf(body.id);
  const rand = rng(seed);
  const p = body.palette;
  const cDark = rgb(p.dark), cBase = rgb(p.base), cLight = rgb(p.light), cAcc = rgb(p.accent);
  const contrast = body.bandContrast ?? 1.0;

  // build a zonal tone profile: alternating belts and zones with random widths
  const LUT = 2048;
  const tone = new Float32Array(LUT);
  {
    const n = body.bands || 16;
    const edges = [0];
    for (let i = 1; i < n; i++) edges.push(i / n + (rand() - 0.5) * (0.55 / n));
    edges.push(1);
    const vals = [];
    for (let i = 0; i < n; i++) {
      const alt = i % 2 === 0 ? 0.30 : 0.72;
      vals.push(clamp01(alt + (rand() - 0.5) * 0.34));
    }
    for (let k = 0; k < LUT; k++) {
      const t = k / (LUT - 1);
      let bi = 0;
      while (bi < n - 1 && t > edges[bi + 1]) bi++;
      const span = edges[bi + 1] - edges[bi] || 1;
      const local = (t - edges[bi]) / span;
      const prev = vals[Math.max(0, bi - 1)], next = vals[Math.min(n - 1, bi + 1)];
      // soften the joins so bands blur into each other
      let val = vals[bi];
      if (local < 0.18) val = mix(mix(prev, vals[bi], 0.5), vals[bi], local / 0.18);
      else if (local > 0.82) val = mix(vals[bi], mix(next, vals[bi], 0.5), (local - 0.82) / 0.18);
      tone[k] = val;
    }
  }

  const img = new ImageData(W, H);
  const A = img.data;
  const d = [0, 0, 0];
  const spotLon = -70, spotLat = -22;

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const latN = (0.5 - v) * 2;
    const lat = latN * 90;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const lon = u * 360 - 180;
      const o = (y * W + x) * 4;
      dirAt(u, v, d);

      // turbulence: shear the latitude coordinate, strongly stretched zonally
      const t1 = fbm3(d[0] * 2.2, d[1] * 8.5, d[2] * 2.2, { octaves: 5, gain: 0.55, seed });
      const t2 = fbm3(d[0] * 5.5, d[1] * 20, d[2] * 5.5, { octaves: 4, seed: seed + 61 });
      const shear = (t1 - 0.5) * 0.085 + (t2 - 0.5) * 0.022;

      let lv = clamp01((latN * 0.5 + 0.5) + shear);
      let tv = tone[Math.min(LUT - 1, Math.round(lv * (LUT - 1)))];

      // fine filaments along the band edges
      const fil = ridged3(d[0] * 8, d[1] * 34, d[2] * 8, { octaves: 4, seed: seed + 5 });
      tv = clamp01(tv + (fil - 0.5) * 0.16 * contrast);

      // recentre contrast around the base tone
      tv = clamp01(0.5 + (tv - 0.5) * contrast);

      // latitude bands crowd together at the poles and read as a bullseye —
      // flatten them out where they converge
      const conv = smoothstep(0.58, 0.96, Math.abs(latN));
      tv = mix(tv, 0.5, conv * 0.8);

      let col = tv < 0.5 ? mixRGB(cDark, cBase, tv * 2) : mixRGB(cBase, cLight, (tv - 0.5) * 2);

      // storms
      if (body.greatSpot || body.darkSpot) {
        const sl = body.greatSpot ? spotLat : 42;
        const so = body.greatSpot ? spotLon : 110;
        const ra = body.greatSpot ? 21 : 13;
        const rb = body.greatSpot ? 8.5 : 6.0;
        let dl = ((lon - so + 540) % 360) - 180;
        const ex = dl / ra, ey = (lat - sl) / rb;
        const rr = Math.hypot(ex, ey);
        if (rr < 1.5) {
          const ang = Math.atan2(ey, ex) + (1.4 - rr) * 2.6;   // vortex swirl
          // damp the swirl toward the eye, otherwise the symmetry of the
          // sine collapses into a bowtie at the centre
          const arms = Math.min(1, rr / 0.42);
          const swirl = 0.5 + 0.5 * Math.sin(ang * 3 + rr * 9) * arms
                      + (fil - 0.5) * 0.35;
          const core = 1 - smoothstep(0.55, 1.05, rr);
          const stormCol = body.greatSpot
            ? mixRGB(mixRGB(cAcc, [226, 138, 96], 0.45), [245, 186, 150], swirl * 0.5)
            : mixRGB(cAcc, [16, 26, 74], swirl * 0.5);
          col = mixRGB(col, stormCol, core * (body.greatSpot ? 0.92 : 0.8));
          // bright collar around the spot
          const collar = smoothstep(1.05, 1.16, rr) * (1 - smoothstep(1.24, 1.48, rr));
          col = mixRGB(col, cLight, collar * 0.5);
        }
      }

      // polar hoods run darker and greyer on every giant
      const polar = smoothstep(0.72, 1.0, Math.abs(latN));
      col = mixRGB(col, mixRGB(cDark, [70, 70, 82], 0.35), polar * 0.45);

      A[o] = col[0]; A[o + 1] = col[1]; A[o + 2] = col[2]; A[o + 3] = 255;
    }
  }

  const c = canvas2d(W, H); c.ctx.putImageData(img, 0, 0);
  return { map: toTexture(c.c) };
}

/* ── ring systems ────────────────────────────────────────────────────── */

/**
 * Rings are painted as a 1D radial strip: `u` runs from the inner edge to the
 * outer edge, and alpha carries the ringlet structure and the real divisions.
 */
export function buildRings(body, W = 2048) {
  const H = 4;
  const seed = seedOf(body.id + '-rings');
  const img = new ImageData(W, H);
  const A = img.data;

  const thin = body.rings.thin;
  const base = thin ? [120, 130, 140] : [212, 190, 152];
  const pale = thin ? [170, 190, 200] : [246, 235, 208];
  const dusk = thin ? [70, 80, 92] : [150, 124, 88];

  // normalised positions of the real gaps, mapped onto 0..1 of the strip
  const gaps = thin
    ? [[0.30, 0.05], [0.62, 0.06], [0.88, 0.04]]
    : [[0.545, 0.055], [0.30, 0.014], [0.965, 0.02], [0.78, 0.010]];

  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);
    let density =
      0.55 +
      0.30 * Math.sin(t * 41 + 1.2) * Math.sin(t * 7.3) +
      0.22 * noise3(t * 130, 0.5, 0.5, seed) +
      0.16 * noise3(t * 420, 3.5, 1.5, seed + 3);

    // broad structure: sparse inner, dense middle, tapered outer
    density *= smoothstep(0, 0.10, t) * (1 - smoothstep(0.90, 1.0, t));
    density *= mix(0.55, 1.15, smoothstep(0.05, 0.42, t));

    for (const [pos, w] of gaps) {
      const g = 1 - Math.exp(-Math.pow((t - pos) / w, 2));
      density *= mix(1, g, 0.96);
    }

    let a = clamp01(density) * (thin ? 0.55 : 1.0);
    const icy = clamp01(0.35 + noise3(t * 60, 9, 2, seed + 11) * 0.9);
    let col = mixRGB(dusk, base, clamp01(icy));
    col = mixRGB(col, pale, clamp01((icy - 0.55) * 1.8));

    for (let y = 0; y < H; y++) {
      const o = (y * W + x) * 4;
      A[o] = col[0]; A[o + 1] = col[1]; A[o + 2] = col[2];
      A[o + 3] = a * 255 * body.rings.opacity;
    }
  }

  const c = canvas2d(W, H); c.ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c.c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 16;
  return t;
}

/* ── the Sun's photosphere ───────────────────────────────────────────── */

export function buildSunSurface(W = 1024) {
  const H = W >> 1;
  const seed = seedOf('sol');
  const img = new ImageData(W, H);
  const A = img.data;
  const d = [0, 0, 0];

  const CORE = [255, 252, 240], HOT = [255, 214, 120], MID = [255, 152, 40], COOL = [186, 74, 12];

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const o = (y * W + x) * 4;
      dirAt(u, v, d);
      // granulation: convection cells
      const gran = ridged3(d[0] * 26, d[1] * 26, d[2] * 26, { octaves: 4, gain: 0.55, seed });
      const supergran = fbm3(d[0] * 6, d[1] * 6, d[2] * 6, { octaves: 4, seed: seed + 21 });
      const spots = fbm3(d[0] * 3.4 + 7, d[1] * 3.4, d[2] * 3.4, { octaves: 3, seed: seed + 88 });

      let t = clamp01(gran * 0.62 + supergran * 0.5);
      let col = mixRGB(MID, HOT, t);
      col = mixRGB(col, CORE, clamp01((t - 0.62) * 2.4));
      col = mixRGB(col, COOL, clamp01((0.36 - t) * 1.9));
      // sunspot umbrae
      const sp = smoothstep(0.70, 0.80, spots);
      col = mixRGB(col, [96, 34, 6], sp * 0.82);

      A[o] = col[0]; A[o + 1] = col[1]; A[o + 2] = col[2]; A[o + 3] = 255;
    }
  }
  const c = canvas2d(W, H); c.ctx.putImageData(img, 0, 0);
  return toTexture(c.c);
}

/* ── sprites ─────────────────────────────────────────────────────────── */

/** Soft round point used for stars and particles. */
export function starSprite(size = 64) {
  const { c, ctx } = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.16, 'rgba(255,255,255,.92)');
  g.addColorStop(0.36, 'rgba(255,255,255,.34)');
  g.addColorStop(0.65, 'rgba(255,255,255,.07)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Wide falloff used for the corona and for hover halos. */
export function glowSprite(size = 256, power = 3.2) {
  const { c, ctx } = canvas2d(size, size);
  const img = ctx.createImageData(size, size);
  const A = img.data;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - half, y - half) / half;
      const a = r >= 1 ? 0 : Math.pow(1 - r, power);
      const o = (y * size + x) * 4;
      A[o] = 255; A[o + 1] = 255; A[o + 2] = 255; A[o + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A thin bright annulus — the "ready to select" reticle. */
export function ringSprite(size = 256, thickness = 0.055) {
  const { c, ctx } = canvas2d(size, size);
  const img = ctx.createImageData(size, size);
  const A = img.data;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - half, y - half) / half;
      const dd = Math.abs(r - 0.80);
      const a = Math.exp(-Math.pow(dd / thickness, 2)) * (r < 1 ? 1 : 0);
      const o = (y * size + x) * 4;
      A[o] = 255; A[o + 1] = 255; A[o + 2] = 255; A[o + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Distant galaxies. Three morphologies, each with the colour signature you
 * actually see: hot blue O/B stars in the arms, an old yellow-red core.
 */
export function galaxySprite(kind, seed, size = 256) {
  const { c, ctx } = canvas2d(size, size);
  const img = ctx.createImageData(size, size);
  const A = img.data;
  const half = size / 2;
  const rand = rng(seed);
  const arms = 2 + Math.floor(rand() * 3);
  const twist = 2.1 + rand() * 2.6;
  const tiltY = 0.25 + rand() * 0.75;          // apparent inclination
  const rot = rand() * Math.PI * 2;
  const cr = Math.cos(rot), sr = Math.sin(rot);

  const CORE = [255, 238, 198];
  const OLD = [255, 186, 120];
  const ARM = [150, 190, 255];
  const HII = [255, 130, 160];
  const DUST = [40, 24, 18];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let px = (x - half) / half, py = (y - half) / half;
      let rx = px * cr - py * sr, ry = px * sr + py * cr;
      if (kind !== 'elliptical') ry /= tiltY;

      const r = Math.hypot(rx, ry);
      const o = (y * size + x) * 4;
      if (r > 1.05) { A[o + 3] = 0; continue; }

      const th = Math.atan2(ry, rx);
      let inten = 0, col = CORE;

      // bulge
      const bulge = Math.exp(-Math.pow(r / (kind === 'elliptical' ? 0.46 : 0.17), 1.1));
      inten += bulge * 1.25;
      col = mixRGB(OLD, CORE, clamp01(bulge));

      if (kind === 'spiral' || kind === 'barred') {
        let armF = 0;
        for (let a = 0; a < arms; a++) {
          const base = th + (a * Math.PI * 2) / arms;
          let phase = base - Math.log(Math.max(r, 0.05)) * twist;
          if (kind === 'barred' && r < 0.30) phase = base;
          const s = Math.cos(phase);
          armF = Math.max(armF, Math.pow(clamp01(s * 0.5 + 0.5), 7));
        }
        const disc = Math.exp(-r / 0.36) * (1 - smoothstep(0.75, 1.05, r));
        const grain = noise3(rx * 22, ry * 22, seed % 17, seed) * 0.6 + 0.6;
        const armLight = armF * disc * grain * 1.5;
        inten += armLight + disc * 0.30;
        col = mixRGB(col, ARM, clamp01(armLight * 1.5) * (1 - bulge * 0.75));
        // HII knots
        const knot = Math.pow(noise3(rx * 40, ry * 40, 5.5, seed + 4), 6) * armF * disc;
        col = mixRGB(col, HII, clamp01(knot * 9));
        inten += knot * 3;
        // dust lanes trailing the arms
        const lane = Math.pow(clamp01(0.5 + 0.5 * Math.cos(th - Math.log(Math.max(r, .05)) * twist + 0.55)), 12);
        const dust = lane * disc * 0.7;
        col = mixRGB(col, DUST, clamp01(dust));
        inten *= 1 - dust * 0.5;
      } else if (kind === 'irregular') {
        const blob = fbm3(rx * 3.2, ry * 3.2, seed % 11, seed) ;
        const disc = Math.exp(-r / 0.42) * (1 - smoothstep(0.7, 1.05, r));
        const l = clamp01(blob * 1.6 - 0.35) * disc * 2.2;
        inten += l;
        col = mixRGB(col, ARM, clamp01(l * 0.9));
        col = mixRGB(col, HII, clamp01(Math.pow(blob, 5) * 2));
      } else {
        inten += Math.exp(-r / 0.34) * 0.5;
      }

      const a = clamp01(inten) ;
      A[o] = col[0] * a; A[o + 1] = col[1] * a; A[o + 2] = col[2] * a;
      A[o + 3] = clamp01(a * 1.15) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── the Milky Way band ──────────────────────────────────────────────── */

/**
 * An equirectangular map of our own galaxy seen from inside it: a bright
 * band that swells toward the galactic centre, split by the dark dust lanes
 * of the Great Rift. Painted once onto a sky dome, so it costs nothing per
 * frame and stays perfectly smooth instead of breaking into sprites.
 */
export function buildMilkyWay(W = 2048) {
  const H = W >> 1;
  const seed = seedOf('milky-way');
  const img = new ImageData(W, H);
  const A = img.data;
  const d = [0, 0, 0];

  const WARM = [255, 236, 206];   // toward the bulge
  const COOL = [188, 206, 240];   // toward the anticentre

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const b = (0.5 - v) * Math.PI;              // galactic latitude
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const l = u * Math.PI * 2 - Math.PI;      // galactic longitude, 0 = centre
      const o = (y * W + x) * 4;
      dirAt(u, v, d);

      // the disc: thin, and thicker toward the bulge
      const core = Math.exp(-Math.pow(l / 1.15, 2));
      const thickness = 0.085 + core * 0.085;
      let band = Math.exp(-Math.pow(b / thickness, 2));
      // a broad faint halo either side of the bright lane
      band += 0.28 * Math.exp(-Math.pow(b / (thickness * 3.4), 2));

      // brightness rises steeply toward the centre of the Galaxy
      let lum = band * (0.34 + core * 1.15);

      // clumpy star clouds
      const clump = fbm3(d[0] * 5.5, d[1] * 14, d[2] * 5.5, { octaves: 5, gain: 0.55, seed });
      lum *= 0.55 + clump * 0.95;

      // dust lanes: the Great Rift, dark filaments right along the plane
      const rift = fbm3(d[0] * 3.2, d[1] * 11, d[2] * 3.2, { octaves: 5, seed: seed + 91 });
      const riftMask = Math.exp(-Math.pow(b / (thickness * 1.5), 2));
      lum *= 1 - clamp01((rift - 0.42) * 1.9) * riftMask * 0.85;

      lum = clamp01(lum) * 0.22;                // deliberately faint

      const col = mixRGB(COOL, WARM, clamp01(core * 1.25));
      A[o] = col[0] * lum;
      A[o + 1] = col[1] * lum;
      A[o + 2] = col[2] * lum;
      A[o + 3] = 255;
    }
  }

  const c = canvas2d(W, H);
  c.ctx.putImageData(img, 0, 0);
  return toTexture(c.c, { aniso: 4 });
}
