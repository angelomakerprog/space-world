import * as THREE from 'three';
import { rng } from './noise.js';
import { auToUnits } from '../core/scale.js';
import { J2000_JD } from '../core/orbits.js';

const DEG = Math.PI / 180;

/** Kirkwood gaps — orbital resonances with Jupiter that really do clear these lanes. */
const KIRKWOOD = [
  [2.065, 0.018], [2.502, 0.028], [2.825, 0.022], [2.958, 0.016], [3.279, 0.020],
];

function rejectGaps(a, rand) {
  for (const [pos, w] of KIRKWOOD) {
    const prox = Math.exp(-Math.pow((a - pos) / w, 2));
    if (rand() < prox * 0.97) return true;
  }
  return false;
}

function makeRockGeometry() {
  // a lumpy, faceted rock — irregular like the real thing, still only 80 tris
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const rand = rng(0xA57E01D);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.62 + rand() * 0.72;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y * 0.82, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A population of small bodies on independent Keplerian orbits.
 * `mode: 'mesh'` gives instanced rocks (close belts), `'points'` gives sprites
 * (the Kuiper belt, where individual shapes would be invisible anyway).
 */
export class SmallBodyBelt {
  constructor(spec, { mode = 'mesh', seed = 1, sizeRange = [0.02, 0.14] } = {}) {
    this.spec = spec;
    this.mode = mode;
    const n = spec.count;
    const rand = rng(seed);

    this.n = n;
    this.a = new Float32Array(n);
    this.e = new Float32Array(n);
    this.inc = new Float32Array(n);
    this.node = new Float32Array(n);
    this.peri = new Float32Array(n);
    this.M0 = new Float32Array(n);
    this.nDay = new Float32Array(n);
    this.spin = new Float32Array(n);
    this.size = new Float32Array(n);

    const isTrojan = !!spec.trojan;

    for (let i = 0; i < n; i++) {
      let a;
      if (isTrojan) {
        a = spec.innerAU + (rand() - 0.5) * spec.thicknessAU;
      } else {
        let tries = 0;
        do {
          // density peaks mid-belt rather than at the edges
          const t = (rand() + rand() + rand()) / 3;
          a = spec.innerAU + (spec.outerAU - spec.innerAU) * t;
          tries++;
        } while (rejectGaps(a, rand) && tries < 6);
      }
      this.a[i] = a;
      this.e[i] = isTrojan ? rand() * 0.09 : Math.pow(rand(), 1.8) * 0.30;
      this.inc[i] = (Math.pow(rand(), 1.6) * (isTrojan ? 26 : 21)) * (rand() < 0.5 ? -1 : 1) * DEG;
      this.node[i] = rand() * Math.PI * 2;
      // for the swarms, cancel the node so M0 reads directly as ecliptic longitude
      this.peri[i] = isTrojan ? -this.node[i] : rand() * Math.PI * 2;

      if (isTrojan) {
        const camp = rand() < 0.5 ? 60 : -60;                       // L4 / L5
        const spread = (rand() - 0.5) * spec.spreadDeg * 2;
        this.M0[i] = (spec.jupiterL + camp + spread) * DEG;
      } else {
        this.M0[i] = rand() * Math.PI * 2;
      }

      const periodDays = 365.256363 * Math.pow(a, 1.5);
      this.nDay[i] = (Math.PI * 2) / periodDays;
      this.spin[i] = (rand() - 0.5) * 2.2;
      this.size[i] = sizeRange[0] + Math.pow(rand(), 2.4) * (sizeRange[1] - sizeRange[0]);
    }

    if (mode === 'mesh') {
      const geo = makeRockGeometry();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
      });
      this.object = new THREE.InstancedMesh(geo, mat, n);
      this.object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Asteroids are dark. C-types are charcoal (albedo ~0.06) and make up
      // three quarters of the belt; S-types are stony and a little brighter;
      // M-types are metallic. Colouring per instance keeps that variety.
      const tint = new THREE.Color(spec.tint);
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const roll = rand();
        let base, lift;
        if (roll < 0.75) { base = 0x2a2724; lift = 0.10; }        // C-type
        else if (roll < 0.93) { base = 0x6b5a44; lift = 0.22; }   // S-type
        else { base = 0x6e6a66; lift = 0.30; }                    // M-type
        c.setHex(base).lerp(tint, lift).multiplyScalar(0.55 + rand() * 0.75);
        this.object.setColorAt(i, c);
      }
      this.object.instanceColor.needsUpdate = true;
      this.object.frustumCulled = false;
      this.object.castShadow = false;
      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._e = new THREE.Euler();
      this._s = new THREE.Vector3();
      this._p = new THREE.Vector3();
    } else {
      const posArr = new Float32Array(n * 3);
      const colArr = new Float32Array(n * 3);
      const sizArr = new Float32Array(n);
      const base = new THREE.Color(spec.tint);
      for (let i = 0; i < n; i++) {
        const shade = 0.45 + rand() * 0.75;
        colArr[i * 3] = base.r * shade;
        colArr[i * 3 + 1] = base.g * shade;
        colArr[i * 3 + 2] = base.b * shade;
        sizArr[i] = this.size[i] * 8;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizArr, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }, uOpacity: { value: 0.5 } },
        vertexShader: /* glsl */`
          attribute float aSize;
          varying vec3 vColor;
          uniform float uPixelRatio;
          void main(){
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            gl_Position = projectionMatrix * mv;
            // the camera often sits inside this belt, so cap the apparent size:
            // these read as a faint dusting, never as a field of blobs
            gl_PointSize = clamp(aSize * uPixelRatio * (260.0 / -mv.z), 1.0, 3.0);
          }`,
        fragmentShader: /* glsl */`
          varying vec3 vColor;
          uniform float uOpacity;
          void main(){
            vec2 d = gl_PointCoord - vec2(0.5);
            float r = dot(d,d);
            if (r > 0.25) discard;
            float a = smoothstep(0.25, 0.02, r);
            gl_FragColor = vec4(vColor, a * uOpacity);
          }`,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
      });
      this.object = new THREE.Points(geo, mat);
      this.object.frustumCulled = false;
      this.posAttr = geo.attributes.position;
    }
    this.object.name = spec.id;
  }

  update(jd) {
    const dt = jd - J2000_JD;
    const n = this.n;

    if (this.mode === 'points') {
      const arr = this.posAttr.array;
      for (let i = 0; i < n; i++) {
        const M = this.M0[i] + this.nDay[i] * dt;
        const e = this.e[i];
        const v = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
        const r = this.a[i] * (1 - e * e) / (1 + e * Math.cos(v));
        const u = v + this.peri[i];
        const cu = Math.cos(u), su = Math.sin(u);
        const co = Math.cos(this.node[i]), so = Math.sin(this.node[i]);
        const ci = Math.cos(this.inc[i]), si = Math.sin(this.inc[i]);
        const ex = r * (cu * co - su * so * ci);
        const ey = r * (cu * so + su * co * ci);
        const ez = r * (su * si);
        const k = auToUnits(r) / r;
        arr[i * 3] = ex * k;
        arr[i * 3 + 1] = ez * k;
        arr[i * 3 + 2] = -ey * k;
      }
      this.posAttr.needsUpdate = true;
      return;
    }

    const m = this._m, q = this._q, eu = this._e, s = this._s, p = this._p;
    for (let i = 0; i < n; i++) {
      const M = this.M0[i] + this.nDay[i] * dt;
      const e = this.e[i];
      const v = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      const r = this.a[i] * (1 - e * e) / (1 + e * Math.cos(v));
      const u = v + this.peri[i];
      const cu = Math.cos(u), su = Math.sin(u);
      const co = Math.cos(this.node[i]), so = Math.sin(this.node[i]);
      const ci = Math.cos(this.inc[i]), si = Math.sin(this.inc[i]);
      const ex = r * (cu * co - su * so * ci);
      const ey = r * (cu * so + su * co * ci);
      const ez = r * (su * si);
      const k = auToUnits(r) / r;
      p.set(ex * k, ez * k, -ey * k);

      const spin = this.spin[i] * dt * 0.35;
      eu.set(spin * 0.7, spin, spin * 0.4);
      q.setFromEuler(eu);
      const sz = this.size[i];
      s.set(sz, sz, sz);
      m.compose(p, q, s);
      this.object.setMatrixAt(i, m);
    }
    this.object.instanceMatrix.needsUpdate = true;
  }
}

/** Invisible annulus used as a cheap raycast proxy for hovering a whole belt. */
export function beltHoverProxy(spec, meta) {
  const rIn = auToUnits(spec.innerAU);
  const rOut = auToUnits(spec.outerAU);
  const rMid = (rIn + rOut) / 2;
  const tube = (rOut - rIn) / 2;
  const geo = new THREE.TorusGeometry(rMid, tube, 6, 128);
  const mat = new THREE.MeshBasicMaterial({ visible: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  // flatten the catch volume toward the ecliptic so a belt does not hijack
  // hovers over everything behind it
  mesh.scale.z = 0.4;
  mesh.userData = meta;
  mesh.name = spec.id + '-proxy';
  return mesh;
}

/**
 * Hover feedback for a belt: just the two rim outlines on the ecliptic.
 * A filled annulus reads as a huge flashing disc across the whole screen —
 * these stay hairline-thin at any zoom because they are lines, not geometry.
 */
export function beltHighlight(spec) {
  const group = new THREE.Group();
  const mats = [];

  for (const [au, alpha] of [[spec.innerAU, 1.0], [spec.outerAU, 1.0]]) {
    const r = auToUnits(au);
    const seg = 360;
    const arr = new Float32Array(seg * 3);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xdaeeff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mat.userData.peak = alpha;
    const line = new THREE.LineLoop(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 5;
    group.add(line);
    mats.push(mat);
  }

  group.userData.setOpacity = (v) => {
    for (const m of mats) m.opacity = v * m.userData.peak;
  };
  return group;
}
