import * as THREE from 'three';
import { buildRocky, buildEarth, buildBanded, buildRings } from './textures.js';
import { radiusToUnits, MOON_ORBIT_UNITS, auToUnits } from '../core/scale.js';
import { orbitPath } from '../core/orbits.js';

const DEG = Math.PI / 180;

/* ── atmosphere shell ────────────────────────────────────────────────── */

const ATMO_VERT = /* glsl */`
  varying vec3 vWP;
  varying vec3 vCenter;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * A plain fresnel shell peaks at its own limb, which leaves a hard-edged ring
 * hanging in space. Instead this works from the view ray's closest approach to
 * the planet centre — the ray's impact parameter — so brightness peaks just
 * above the surface and decays with altitude, the way real limb glow does.
 */
const ATMO_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  uniform vec3 uSunPos;
  uniform float uR;        // planet radius
  uniform float uShell;    // outer radius of this shell
  varying vec3 vWP;
  varying vec3 vCenter;
  void main(){
    vec3 V = normalize(cameraPosition - vWP);
    vec3 L = normalize(uSunPos - vWP);

    vec3 toC = vCenter - vWP;
    float along = dot(toC, V);
    vec3 nearest = vWP + V * along;          // closest point on the view ray
    float b = length(nearest - vCenter);     // impact parameter

    // One continuous profile across the limb, so no seam appears there.
    // Inside the disc the haze brightens toward the edge; outside it decays
    // with altitude and reaches zero before the shell's own boundary.
    float t = b / uR;
    float h = clamp((b - uR) / max(uShell - uR, 1e-4), 0.0, 1.0);
    float inner = pow(clamp(t, 0.0, 1.0), 4.0);
    float outer = exp(-h * uPower) * (1.0 - h * h);
    float prof = mix(inner, outer, step(1.0, t));

    vec3 An = normalize(nearest - vCenter);  // surface normal beneath the glow
    float lit = clamp(dot(An, L) * 1.45 + 0.22, 0.0, 1.0);
    float fwd = pow(clamp(dot(V, -L), 0.0, 1.0), 3.0) * 0.45;

    gl_FragColor = vec4(uColor, prof * uStrength * (lit + fwd));
  }
`;

function atmosphere(radius, cfg, sunPos) {
  // give the falloff room to reach zero before the shell's own edge
  const shell = radius * (1 + (cfg.scale - 1) * 4.5);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(cfg.color) },
      uPower: { value: cfg.power },
      uStrength: { value: cfg.strength },
      uSunPos: { value: sunPos },
      uR: { value: radius },
      uShell: { value: shell },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(shell, 64, 48), mat);
  m.renderOrder = 3;
  return m;
}

/* ── rings ───────────────────────────────────────────────────────────── */

const RING_VERT = /* glsl */`
  varying vec3 vWP;
  varying vec3 vRingN;
  varying float vR;
  uniform float uInner;
  uniform float uOuter;
  void main(){
    vRingN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    vR = (length(position.xy) - uInner) / (uOuter - uInner);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const RING_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uPlanet;
  uniform vec3 uSunPos;
  uniform float uPlanetR;
  varying vec3 vWP;
  varying vec3 vRingN;
  varying float vR;
  void main(){
    vec4 c = texture2D(uMap, vec2(clamp(vR, 0.001, 0.999), 0.5));
    if (c.a < 0.004) discard;

    // does this ring particle sit inside the planet's shadow cylinder?
    vec3 L = normalize(uSunPos - vWP);
    vec3 toP = uPlanet - vWP;
    float along = dot(toP, L);
    float shade = 1.0;
    if (along > 0.0) {
      float perp = length(toP - L * along);
      shade = smoothstep(uPlanetR * 0.94, uPlanetR * 1.14, perp);
      shade = mix(0.10, 1.0, shade);
    }
    // ring particles are lit by how squarely the plane faces the Sun
    float lit = 0.30 + 0.70 * abs(dot(normalize(vRingN), L));

    // grazing angles look denser, face-on looks translucent
    vec3 V = normalize(cameraPosition - vWP);
    float graze = 1.0 - abs(dot(normalize(vRingN), V));
    float dens = mix(1.0, 1.35, graze);

    gl_FragColor = vec4(c.rgb * shade * lit * 0.78, clamp(c.a * dens, 0.0, 1.0));
  }
`;

function ringGeometry(inner, outer, segments = 320) {
  const g = new THREE.RingGeometry(inner, outer, segments, 2);
  return g;
}

/* ── one planet ──────────────────────────────────────────────────────── */

/**
 * Build a planet. Pass `preTex` to reuse maps that were already generated —
 * the body pages render a second, separately-lit copy of the same world and
 * regenerating a 2048px Earth for that would cost two seconds for nothing.
 */
export function buildPlanet(body, sunPos, quality = {}, preTex = null) {
  const R = radiusToUnits(body.radiusKm);
  const group = new THREE.Group();       // sits at the heliocentric position
  group.name = body.id;

  const tilt = new THREE.Group();        // holds the axial tilt
  tilt.rotation.z = (body.tiltDeg || 0) * DEG;
  group.add(tilt);

  let tex = preTex;
  if (tex) { /* reuse */ }
  else if (body.kind === 'earth') tex = buildEarth(quality.earth || 2048);
  else if (body.kind === 'banded') tex = buildBanded(body, body.texRes || quality.banded || 1600);
  else tex = buildRocky(body, quality.rocky || 1024);

  const matOpts = {
    map: tex.map,
    roughness: body.roughness ?? 0.9,
    metalness: 0.0,
  };
  if (tex.bump) { matOpts.bumpMap = tex.bump; matOpts.bumpScale = body.bump ?? 0.03; }
  if (tex.rough) { matOpts.roughnessMap = tex.rough; }

  const mat = new THREE.MeshStandardMaterial(matOpts);

  // Earth's city lights: emissive, but only on the hemisphere facing away from the Sun
  if (body.nightLights && tex.night) {
    const sunDir = new THREE.Vector3();
    mat.userData.sunDir = sunDir;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = { value: tex.night };
      shader.uniforms.uSunDir = { value: sunDir };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWNormal;')
        .replace('#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\nvWNormal = normalize(mat3(modelMatrix) * objectNormal);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>',
          '#include <common>\nuniform sampler2D uNight;\nuniform vec3 uSunDir;\nvarying vec3 vWNormal;')
        .replace('#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float ndl = dot(normalize(vWNormal), uSunDir);
           float nightMask = smoothstep(0.12, -0.22, ndl);
           totalEmissiveRadiance += texture2D(uNight, vMapUv).rgb * nightMask * 2.6;`);
    };
    mat.needsUpdate = true;
  }

  const geo = new THREE.SphereGeometry(R, 128, 96);
  const mesh = new THREE.Mesh(geo, mat);
  if (body.flattening) mesh.scale.y = 1 - body.flattening;
  mesh.name = body.id + '-mesh';
  mesh.userData = {
    hoverable: true,
    kind: body.parent ? 'moon' : 'planet',
    id: body.id,
    body,
    haloScale: R * 2.5,
  };
  tilt.add(mesh);

  // cloud deck
  let clouds = null;
  if (body.clouds && tex.clouds) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.012, 96, 64),
      new THREE.MeshStandardMaterial({
        map: tex.clouds,
        transparent: true,
        opacity: 0.92,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
      })
    );
    clouds.renderOrder = 2;
    tilt.add(clouds);
  }

  // atmosphere
  let atmo = null;
  if (body.atmosphere) {
    atmo = atmosphere(R, body.atmosphere, sunPos);
    tilt.add(atmo);
  }

  // ring system
  let rings = null;
  if (body.rings) {
    const inner = R * body.rings.inner;
    const outer = R * body.rings.outer;
    const rtex = buildRings(body);
    rings = new THREE.Mesh(
      ringGeometry(inner, outer),
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: rtex },
          uInner: { value: inner },
          uOuter: { value: outer },
          uPlanet: { value: new THREE.Vector3() },
          uSunPos: { value: sunPos },
          uPlanetR: { value: R },
        },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    rings.rotation.x = -Math.PI / 2;
    rings.renderOrder = 1;
    tilt.add(rings);
  }

  return {
    body, group, tilt, mesh, clouds, atmo, rings, radius: R, tex,
    spin: 0,
  };
}

/* ── orbit trail ─────────────────────────────────────────────────────── */

export function buildOrbitLine(body, T, color = 0x5f7fa8, opacity = 0.30) {
  const pts = orbitPath(body, T, 720);
  const arr = new Float32Array(pts.length * 3);
  const alpha = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = Math.hypot(p.x, p.y, p.z);
    const k = auToUnits(r) / r;
    arr[i * 3] = p.x * k;
    arr[i * 3 + 1] = p.z * k;
    arr[i * 3 + 2] = -p.y * k;
    alpha[i] = i / (pts.length - 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uHead: { value: 0 },      // 0..1 position of the planet along the loop
      uBoost: { value: 0 },     // lifts on hover
    },
    vertexShader: /* glsl */`
      attribute float aAlpha;
      varying float vT;
      void main(){
        vT = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uHead;
      uniform float uBoost;
      varying float vT;
      void main(){
        float d = vT - uHead;
        d = d - floor(d);                 // wrap into 0..1 behind the planet
        float comet = pow(1.0 - d, 14.0); // a bright wake just behind the body
        float a = uOpacity * (0.42 + uBoost) + comet * (0.55 + uBoost);
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const line = new THREE.LineLoop(geo, mat);
  line.frustumCulled = false;
  line.renderOrder = 0;
  return { line, material: mat };
}

/* ── the Moon ────────────────────────────────────────────────────────── */

export function buildMoon(moon, sunPos, quality = {}) {
  const p = buildPlanet(moon, sunPos, quality);
  p.group.userData.orbitRadius = MOON_ORBIT_UNITS;

  const seg = 256;
  const arr = new Float32Array(seg * 3);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    arr[i * 3] = Math.cos(a) * MOON_ORBIT_UNITS;
    arr[i * 3 + 1] = 0;
    arr[i * 3 + 2] = Math.sin(a) * MOON_ORBIT_UNITS;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
    color: 0x8ea6c4, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  line.rotation.x = moon.iDeg * DEG;
  p.orbitLine = line;
  return p;
}
