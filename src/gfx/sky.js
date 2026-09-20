import * as THREE from 'three';
import { CONSTELLATIONS, EXTRA_STARS } from '../data/constellations.js';
import { starSprite } from './textures.js';
import { rng } from './noise.js';

const DEG = Math.PI / 180;
const R_SKY = 500;

/* ── coordinate machinery ────────────────────────────────────────────── */

/** Equatorial (RA hours, Dec degrees) -> unit vector in the equatorial frame. */
function eq(raH, decDeg, out = new THREE.Vector3()) {
  const a = raH * 15 * DEG, d = decDeg * DEG;
  return out.set(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d));
}

/**
 * Greenwich mean sidereal time in degrees. This is what makes the sky show the
 * right stars for the simulation's date and hour rather than a fixed picture.
 */
export function gmstDeg(jd) {
  const g = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
  return ((g % 360) + 360) % 360;
}

/** Galactic (l, b) -> equatorial unit vector, using the real galactic pole. */
const NGP_RA = 192.85948 * DEG, NGP_DEC = 27.12825 * DEG, L_NCP = 122.93192 * DEG;
function galacticToEq(lDeg, bDeg, out = new THREE.Vector3()) {
  const l = lDeg * DEG, b = bDeg * DEG;
  const sinDec = Math.sin(b) * Math.sin(NGP_DEC) + Math.cos(b) * Math.cos(NGP_DEC) * Math.cos(L_NCP - l);
  const dec = Math.asin(THREE.MathUtils.clamp(sinDec, -1, 1));
  const y = Math.cos(b) * Math.sin(L_NCP - l);
  const x = Math.sin(b) * Math.cos(NGP_DEC) - Math.cos(b) * Math.sin(NGP_DEC) * Math.cos(L_NCP - l);
  const ra = NGP_RA - Math.atan2(y, x);
  return out.set(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
}

/**
 * Real colours for the stars people actually look at. Anything not listed
 * falls back to a neutral white — inventing a colour for a star whose spectral
 * type is not in the data would just be decoration.
 */
const STAR_COLOUR = {
  Betelgeuse: 0xffb08a, Antares: 0xffab86, Aldebaran: 0xffc796, Arcturus: 0xffd2a0,
  Gacrux: 0xffb894, Mirach: 0xffc59a, Menkent: 0xffd8ad, Alphard: 0xffc9a2,
  Eltanin: 0xffd6ab, Kochab: 0xffd0a4, Hamal: 0xffd6ac, Dabih: 0xffd9b2,
  Enif: 0xffbf98, 'Kaus Australis': 0xfff0dc, Suhail: 0xffbe95, Avior: 0xffc39d,
  Mirzam: 0xa8c2ff, Rigel: 0xbcd2ff, Bellatrix: 0xa9c4ff, Alnilam: 0xa5c0ff,
  Alnitak: 0xa6c1ff, Mintaka: 0xa9c3ff, Saiph: 0xafc8ff, Spica: 0xa3bfff,
  Achernar: 0xaac5ff, Regulus: 0xb4ccff, Acrux: 0xa6c1ff, Mimosa: 0xa8c3ff,
  Hadar: 0xa9c4ff, Shaula: 0xacc6ff, Alkaid: 0xb5cdff, Algol: 0xc2d6ff,
  Elnath: 0xc6d9ff, Nunki: 0xb2caff, Peacock: 0xb6ceff, Alnair: 0xb0c8ff,
  Sirius: 0xf4f8ff, Vega: 0xe6eeff, Altair: 0xf2f4ff, Deneb: 0xe8f0ff,
  Fomalhaut: 0xeaf1ff, Castor: 0xe9f0ff, Alphecca: 0xe4edff, Alpheratz: 0xdfe9ff,
  Canopus: 0xfff6ea, Procyon: 0xfff4e6, Polaris: 0xfff2e2, Capella: 0xffeccb,
  Pollux: 0xffc99f, Dubhe: 0xffd9b0, Miaplacidus: 0xdde9ff, Ankaa: 0xffcda3,
  Sadalsuud: 0xfff0d4, Sadalmelik: 0xffefd2, Wezen: 0xfff4e2, Mirfak: 0xfff3e0,
  Rasalgethi: 0xffb28f, Ascella: 0xdfeaff, Sargas: 0xfff0d8,
};

/* ── background field ────────────────────────────────────────────────── */

const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aTw;
  varying vec3 vColor;
  varying float vUp;
  uniform float uTime;
  uniform float uPixelRatio;
  void main(){
    vColor = color;
    // world Y is altitude, because the observer sits at the origin — this is
    // what lets the fragment shader drop everything below the horizon
    vUp = (modelMatrix * vec4(position, 1.0)).y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.84 + 0.16 * sin(uTime * 2.1 + aTw * 51.0);
    gl_PointSize = aSize * uPixelRatio * tw;
  }
`;
const STAR_FRAG = /* glsl */`
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vUp;
  void main(){
    if (vUp < 0.0) discard;               // below the horizon: under our feet
    vec4 t = texture2D(uMap, gl_PointCoord);
    if (t.a < 0.01) discard;
    gl_FragColor = vec4(vColor, t.a);
  }
`;

function makePoints(pos, col, siz, twk, map) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  geo.setAttribute('aTw', new THREE.BufferAttribute(twk, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, vertexColors: true,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return { points: p, material: mat };
}

/** A four-spike sprite, so the brightest stars read as stars and not as dots. */
function brightSprite(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const half = size / 2;

  const core = x.createRadialGradient(half, half, 0, half, half, half * 0.36);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.35, 'rgba(255,255,255,.55)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = core;
  x.fillRect(0, 0, size, size);

  x.globalCompositeOperation = 'lighter';
  for (const ang of [0, Math.PI / 2]) {
    x.save();
    x.translate(half, half);
    x.rotate(ang);
    const g = x.createLinearGradient(-half, 0, half, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(-half, -size * 0.012, size, size * 0.024);
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Anonymous background stars, concentrated toward the galactic plane. */
function buildField(count = 46000) {
  const rand = rng(0x5C1E);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const twk = new Float32Array(count);
  const v = new THREE.Vector3();
  const c = new THREE.Color();

  const CLASSES = [
    [0xaabfff, 0.02, 0.95], [0xcad7ff, 0.06, 0.8], [0xf6f4ff, 0.10, 0.62],
    [0xfff3e6, 0.15, 0.5], [0xffd2a1, 0.25, 0.42], [0xffab6a, 0.42, 0.34],
  ];

  for (let i = 0; i < count; i++) {
    const disc = rand() < 0.58;
    const l = rand() * 360;
    const b = disc
      ? ((rand() + rand() + rand() + rand() - 2) * 0.5) * 10
      : Math.asin(rand() * 2 - 1) / DEG;
    galacticToEq(l, b, v).multiplyScalar(R_SKY);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;

    let roll = rand(), acc = 0, ci = 0;
    for (let k = 0; k < CLASSES.length; k++) { acc += CLASSES[k][1]; if (roll <= acc) { ci = k; break; } ci = k; }
    c.setHex(CLASSES[ci][0]);
    const m = Math.pow(rand(), 3.4);
    const lum = 0.20 + m * 1.75 * CLASSES[ci][2];
    col[i * 3] = c.r * lum; col[i * 3 + 1] = c.g * lum; col[i * 3 + 2] = c.b * lum;
    siz[i] = 0.85 + m * 2.7;
    twk[i] = rand();
  }
  return makePoints(pos, col, siz, twk, starSprite(64));
}

/* ── the view ────────────────────────────────────────────────────────── */

/**
 * A real sky, seen from a point on Earth's surface.
 *
 * The whole celestial sphere is built once in equatorial coordinates; the
 * observer's latitude and the local sidereal time then rotate it so that the
 * zenith is overhead and the horizon is where it should be. Change the time or
 * the latitude and the correct stars rise and set.
 *
 * There is deliberately no Milky Way band here. It is genuinely that bright
 * from a dark site, but a painted band washes out the constellation figures
 * this view exists to show.
 */
export class SkyView {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 4000);

    this.sky = new THREE.Group();           // everything in equatorial coords
    this.sky.matrixAutoUpdate = false;
    this.scene.add(this.sky);

    this.field = buildField();
    this.field.points.renderOrder = 1;
    this.sky.add(this.field.points);

    this.buildFigures();
    this.buildHorizon();

    this.az = 0;                            // looking north
    this.alt = 28 * DEG;
    this.fov = 62;
    this.hover = null;
    this.hoverStar = null;
    this.selected = null;
    this.elapsed = 0;
    this.raycaster = new THREE.Raycaster();
    this._v = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._invRot = new THREE.Matrix4();
  }

  /** Constellation stars and their joining lines, plus per-figure metadata. */
  buildFigures() {
    const figs = [];
    const bp = [], bc = [], bs = [], bt = [];
    const catalogue = [];                   // flat list, for picking by star
    const c = new THREE.Color();
    const v = new THREE.Vector3();

    const addStar = (raH, dec, mag, name, con) => {
      const dir = eq(raH, dec, new THREE.Vector3());
      v.copy(dir).multiplyScalar(R_SKY);
      // brightness and size follow magnitude the way the eye does — roughly
      // a factor of 2.5 in flux per magnitude, compressed to stay on screen
      const flux = Math.pow(2.512, -mag);
      const lum = THREE.MathUtils.clamp(0.55 + Math.log10(flux + 0.02) * 0.9 + 1.6, 0.45, 2.7);
      const size = THREE.MathUtils.clamp(10.5 - mag * 1.5, 2.4, 15);
      c.setHex(STAR_COLOUR[name] ?? 0xeaf0ff);
      bp.push(v.x, v.y, v.z);
      bc.push(c.r * lum, c.g * lum, c.b * lum);
      bs.push(size);
      bt.push(Math.random());
      catalogue.push({ dir, name, mag, con });
    };

    for (const con of CONSTELLATIONS) {
      const verts = con.stars.map((s) => eq(s[0], s[1], new THREE.Vector3()).multiplyScalar(R_SKY));

      const arr = new Float32Array(con.lines.length * 6);
      con.lines.forEach(([a, b], i) => {
        arr.set([verts[a].x, verts[a].y, verts[a].z, verts[b].x, verts[b].y, verts[b].z], i * 6);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x7fb4ff, transparent: true, opacity: 0.30,
        depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(geo, mat);
      lines.frustumCulled = false;
      lines.renderOrder = 2;
      this.sky.add(lines);

      const centre = new THREE.Vector3();
      for (const p of verts) centre.add(p);
      centre.normalize();

      for (const s of con.stars) addStar(s[0], s[1], s[2], s[3], con);
      figs.push({ con, verts, lines, mat, centre });
    }

    for (const s of EXTRA_STARS) addStar(s[0], s[1], s[2], s[3], null);

    this.figures = figs;
    this.catalogue = catalogue;

    const bright = makePoints(
      new Float32Array(bp), new Float32Array(bc), new Float32Array(bs), new Float32Array(bt),
      brightSprite(128)
    );
    bright.points.renderOrder = 3;
    this.sky.add(bright.points);
    this.bright = bright;
  }

  /**
   * The ground. It is opaque and writes depth, so everything on the far side
   * of the world is genuinely hidden rather than merely dimmed — you should
   * not be able to see Crux from Norway.
   */
  buildHorizon() {
    const g = new THREE.Group();

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(R_SKY * 3, 128),
      new THREE.MeshBasicMaterial({ color: 0x04060a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.renderOrder = 0;
    g.add(ground);

    const haze = new THREE.Mesh(
      new THREE.CylinderGeometry(R_SKY * 0.99, R_SKY * 0.99, R_SKY * 0.13, 96, 1, true),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0x2a4467) } },
        vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uColor; varying float vY; void main(){ gl_FragColor = vec4(uColor, pow(1.0 - vY, 2.8) * 0.5); }',
        transparent: true, side: THREE.BackSide, depthWrite: false, depthTest: true,
        blending: THREE.AdditiveBlending,
      })
    );
    haze.position.y = R_SKY * 0.065;
    haze.renderOrder = 4;
    g.add(haze);

    const n = 240, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * R_SKY * 0.996;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(a) * R_SKY * 0.996;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const ring = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({
      color: 0x8fc6ff, transparent: true, opacity: 0.34, depthTest: false,
    }));
    ring.renderOrder = 5;
    g.add(ring);

    this.horizon = g;
    this.scene.add(g);
  }

  /**
   * Point the sky for an observer. `latDeg` is what really matters — it decides
   * which half of the celestial sphere is above the horizon at all.
   */
  setObserver(latDeg, lonDeg, jd) {
    this.lat = latDeg;
    this.lon = lonDeg;
    this.jd = jd;
    const lst = (gmstDeg(jd) + lonDeg) / 15;
    this.lst = ((lst % 24) + 24) % 24;

    const Z = eq(this.lst, latDeg, new THREE.Vector3());
    const th = this.lst * 15 * DEG, ph = latDeg * DEG;
    const N = new THREE.Vector3(
      -Math.sin(ph) * Math.cos(th), -Math.sin(ph) * Math.sin(th), Math.cos(ph)
    ).normalize();
    const E = new THREE.Vector3(-Math.sin(th), Math.cos(th), 0).normalize();
    const S = N.clone().negate();

    // world axes: x = east, y = zenith, z = south. Invert to map equatorial in.
    const m = new THREE.Matrix4().makeBasis(E, Z, S).invert();
    this.sky.matrix.copy(m);
    this.sky.updateMatrixWorld(true);
    this._invRot.copy(m).invert();
  }

  look(dAz, dAlt) {
    this.az += dAz;
    this.alt = THREE.MathUtils.clamp(this.alt + dAlt, -18 * DEG, 88 * DEG);
  }

  zoom(delta) {
    this.fov = THREE.MathUtils.clamp(this.fov + delta, 18, 92);
  }

  /**
   * What is under the pointer: a named star if one is close enough, otherwise
   * the constellation whose figure it falls nearest. Both are compared as plain
   * angular distances in the equatorial frame.
   */
  pick(ndc) {
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(ndc, this.camera);
    const dir = this.raycaster.ray.direction.clone().normalize().applyMatrix4(this._invRot).normalize();

    // stars first — they are small, so the tolerance scales with the zoom
    const starTol = Math.cos(THREE.MathUtils.clamp(this.camera.fov * 0.022, 0.6, 2.2) * DEG);
    let star = null, best = starTol;
    for (const s of this.catalogue) {
      const d = s.dir.dot(dir);
      if (d > best) { best = d; star = s; }
    }
    if (star) return { kind: 'star', star, con: star.con };

    let fig = null, bestF = Math.cos(9 * DEG);
    for (const f of this.figures) {
      let d = -1;
      for (const p of f.verts) {
        const dot = this._v.copy(p).normalize().dot(dir);
        if (dot > d) d = dot;
      }
      for (const [a, b] of f.con.lines) {
        const mid = this._v.copy(f.verts[a]).add(f.verts[b]).normalize();
        const dot = mid.dot(dir);
        if (dot > d) d = dot;
      }
      if (d > bestF) { bestF = d; fig = f; }
    }
    return fig ? { kind: 'figure', fig, con: fig.con } : null;
  }

  /** Is this constellation currently above the horizon? */
  isUp(fig) {
    return this._v.copy(fig.centre).applyMatrix4(this.sky.matrix).y > 0;
  }

  setHover(hit) {
    const fig = hit ? (hit.fig || this.figures.find((f) => f.con === hit.con)) : null;
    this.hover = fig;
    for (const f of this.figures) {
      const on = f === fig || f === this.selected;
      f.mat.color.setHex(on ? 0xd6ecff : 0x7fb4ff);
      f.targetOpacity = f === this.selected ? 1.0 : on ? 0.8 : 0.30;
    }
  }

  select(fig) {
    this.selected = fig;
    this.setHover(this.hover ? { con: this.hover.con, fig: this.hover } : null);
  }

  update(dt, w, h) {
    this.elapsed += dt;

    this.camera.fov += (this.fov - this.camera.fov) * Math.min(1, dt * 10);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const ca = Math.cos(this.alt);
    this._dir.set(Math.sin(this.az) * ca, Math.sin(this.alt), -Math.cos(this.az) * ca);
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(this._dir);

    for (const f of this.figures) {
      const want = f.targetOpacity ?? 0.30;
      f.mat.opacity += (want - f.mat.opacity) * Math.min(1, dt * 9);
    }
    this.field.material.uniforms.uTime.value = this.elapsed;
    this.bright.material.uniforms.uTime.value = this.elapsed;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Turn the camera to face a constellation, so a search or list can aim it. */
  aimAt(fig) {
    const w = this._v.copy(fig.centre).applyMatrix4(this.sky.matrix).normalize();
    this.az = Math.atan2(w.x, -w.z);
    this.alt = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(w.y, -1, 1)), -0.2, 1.5);
  }

  get heading() {
    const deg = ((this.az / DEG) % 360 + 360) % 360;
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return { deg, name: names[Math.round(deg / 45) % 8] };
  }
}
