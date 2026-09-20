import * as THREE from 'three';
import { starSprite, buildMilkyWay } from './textures.js';
import { rng } from './noise.js';

/**
 * Stars are not white. Colour is a direct readout of surface temperature, so
 * the field is built from the real spectral classes with their true tints and
 * a luminosity bias — hot blue giants are rare but bright, red dwarfs are
 * everywhere but faint.
 */
const CLASSES = [
  // [name, colour,      share of population, brightness bias, temperature K]
  ['O', 0x9bb0ff, 0.0016, 1.00, 33000],
  ['B', 0xaabfff, 0.0130, 0.92, 21000],
  ['A', 0xcad7ff, 0.0600, 0.78, 8600],
  ['F', 0xf6f4ff, 0.1000, 0.62, 6800],
  ['G', 0xfff3e6, 0.1500, 0.52, 5700],
  ['K', 0xffd2a1, 0.2400, 0.44, 4400],
  ['M', 0xffab6a, 0.4354, 0.34, 3200],
];

const SHELL = 2900;

/** Galactic plane, tilted ~60.2° from the ecliptic — that's why the Milky Way cuts across at an angle. */
const GAL_TILT = 60.2 * Math.PI / 180;

function galacticToWorld(l, b, r, out) {
  const cb = Math.cos(b);
  const x = cb * Math.cos(l), y = cb * Math.sin(l), z = Math.sin(b);
  // rotate the galactic plane into place relative to the ecliptic
  const cy = Math.cos(GAL_TILT), sy = Math.sin(GAL_TILT);
  out.set(x * r, (z * cy - y * sy) * r, (z * sy + y * cy) * r);
  return out;
}

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aTwinkle;
  varying vec3 vColor;
  varying float vTw;
  uniform float uTime;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vTw = aTwinkle;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.86 + 0.14 * sin(uTime * 1.7 + aTwinkle * 42.0);
    gl_PointSize = aSize * uPixelRatio * tw;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    if (t.a < 0.01) discard;
    gl_FragColor = vec4(vColor, t.a * uOpacity);
  }
`;

export function buildStarfield(count = 120000) {
  const rand = rng(0xC0FFEE);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const twk = new Float32Array(count);
  const v = new THREE.Vector3();
  const c = new THREE.Color();

  // cumulative class distribution
  const cdf = [];
  let acc = 0;
  for (const cl of CLASSES) { acc += cl[2]; cdf.push(acc); }

  for (let i = 0; i < count; i++) {
    // 62% of stars sit in the galactic disc, the rest fill the halo
    const inDisc = rand() < 0.62;
    let l, b;
    if (inDisc) {
      l = rand() * Math.PI * 2;
      // exponential scale height -> a tight, bright band
      const g = (rand() + rand() + rand() + rand() - 2) * 0.5;
      b = g * 0.16;
      // thicken toward the galactic centre and thin toward the anticentre
      const toward = Math.cos(l);
      b *= 1 + toward * 0.35;
    } else {
      l = rand() * Math.PI * 2;
      b = Math.asin(rand() * 2 - 1);
    }
    const r = SHELL * (0.86 + rand() * 0.3);
    galacticToWorld(l, b, r, v);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;

    const roll = rand();
    let ci = 0;
    while (ci < cdf.length - 1 && roll > cdf[ci]) ci++;
    const [, hexc, , bias] = CLASSES[ci];
    c.setHex(hexc);

    // apparent magnitude: mostly faint, occasionally a standout
    const m = Math.pow(rand(), 3.4);
    const bright = (0.20 + m * 0.95) * bias;
    // faint stars desaturate toward grey, as they do to the eye
    const sat = 0.35 + m * 0.65;
    c.lerp(new THREE.Color(0xffffff), (1 - sat) * 0.45);

    // a real sky has enormous dynamic range: almost everything is barely
    // there, and a handful of stars carry the eye
    const lum = 0.09 + bright * 1.45;
    col[i * 3] = c.r * lum;
    col[i * 3 + 1] = c.g * lum;
    col[i * 3 + 2] = c.b * lum;

    siz[i] = 0.55 + m * 2.5 + (roll < 0.01 ? 1.5 : 0);
    twk[i] = rand();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twk, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: starSprite(64) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -10;
  points.name = 'starfield';
  return { points, material: mat };
}

/**
 * The Milky Way itself, as a sky dome. A single inverted sphere carrying the
 * painted band, rotated so its equator lands on the galactic plane — which is
 * why it cuts across the ecliptic at roughly 60 degrees.
 */
export function buildMilkyWayDome() {
  const tex = buildMilkyWay(1280);
  const geo = new THREE.SphereGeometry(SHELL * 1.18, 64, 48);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // local +Y becomes the galactic north pole
  mesh.rotation.x = GAL_TILT;
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  mesh.name = 'milkyway';
  return { mesh, material: mat };
}
