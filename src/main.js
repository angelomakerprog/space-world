import './styles/main.css';
import './styles/pages.css';
import './styles/immersive.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { SUN, PLANETS, MOONS, BELTS, TROJANS } from './data/bodies.js';
import { Clock } from './core/clock.js';
import { heliocentric, J2000_JD } from './core/orbits.js';
import { eclipticToScene, auToUnits, unitsToAu, MOON_ORBIT_UNITS } from './core/scale.js';

import { buildSun } from './gfx/sun.js';
import { buildPlanet, buildMoon, buildOrbitLine } from './gfx/planets.js';
import { buildStarfield, buildMilkyWayDome } from './gfx/starfield.js';
import { buildGalaxies } from './gfx/galaxies.js';
import { buildDeepSky } from './gfx/deepsky.js';
import { buildTelescopes, updateTelescopes } from './gfx/telescopes.js';
import { SmallBodyBelt, beltHoverProxy, beltHighlight } from './gfx/asteroids.js';
import { HoverSystem } from './gfx/hover.js';
import { WarpDrive } from './gfx/warp.js';

import { HUD } from './ui/hud.js';
import { TimeBar } from './ui/timebar.js';
import { initNav } from './ui/nav.js';
import { Router } from './pages/router.js';
import { Travel, SearchBar } from './ui/travel.js';
import { SkyScreen } from './ui/skyscreen.js';
import { Eyepiece } from './ui/eyepiece.js';
import { initLanguage } from './ui/lang.js';

const DEG = Math.PI / 180;
// Yield to the browser between build steps so the boot screen keeps animating.
// A backgrounded tab throttles timers to once a minute, which would stretch
// the build to several minutes for nobody's benefit — so when the page is
// hidden, hand back only a microtask.
const yieldFrame = () =>
  (document.hidden ? Promise.resolve() : new Promise((r) => setTimeout(r, 0)));

/* ── renderer ────────────────────────────────────────────────────────── */

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 12000);
camera.position.set(0, 96, 212);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.6;
controls.minDistance = 7.5;
controls.maxDistance = 2200;
controls.target.set(0, 0, 0);
controls.enablePan = true;
controls.screenSpacePanning = true;   // pan along the screen, not the ground plane
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.62,   // strength
  0.55,   // radius
  0.58    // threshold — keeps the deep black truly black
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ── state ───────────────────────────────────────────────────────────── */

const clock = new Clock();
const hud = new HUD(clock);
const timebar = new TimeBar(
  document.getElementById('ruler-canvas'),
  document.getElementById('playhead-label'),
  document.getElementById('ruler-span'),
  document.getElementById('ruler-rate')
);
const hover = new HoverSystem(scene, camera, renderer);
const warp = new WarpDrive(camera, controls);

const SUN_POS = new THREE.Vector3(0, 0, 0);
const planets = [];
const orbitLines = [];
const belts = [];
let moonObj = null;
let sun = null;
let starField = null;
let showOrbits = true, showLabels = true;
let beltGlow = 0;
let pageOpen = false;
let travel = null, search = null, sky = null, eyepiece = null;
let scopes = null;
const HOME = { pos: new THREE.Vector3(0, 96, 212), target: new THREE.Vector3(0, 0, 0) };
const solarViz = [];   // objects hidden while an article page is open

const labelLayer = document.createElement('div');
labelLayer.id = 'labels';
labelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15';
document.body.appendChild(labelLayer);

function makeLabel(text, cls) {
  const el = document.createElement('div');
  el.className = 'body-label ' + (cls || '');
  el.textContent = text;
  el.style.cssText = `position:absolute;transform:translate(-50%,-50%);
    font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.18em;
    color:rgba(198,214,236,.72);text-shadow:0 0 8px rgba(0,0,0,.9);
    white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none;`;
  labelLayer.appendChild(el);
  return el;
}

/* ── build ───────────────────────────────────────────────────────────── */

const bootEl = document.getElementById('boot');
const bootText = bootEl.querySelector('span');
const statusEl = document.getElementById('status');
const statusText = statusEl.querySelector('span');

/**
 * Every surface here is generated from noise at load time, which costs a few
 * seconds in total. Rather than hold a black screen for all of it, the sky and
 * the Sun go up first and the planets stream in behind them.
 */
let revealed = false;
const step = async (msg) => {
  if (revealed) statusText.textContent = msg;
  else bootText.textContent = msg;
  await yieldFrame();
  await yieldFrame();
};

function revealScene() {
  if (revealed) return;
  revealed = true;
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 900);
  statusEl.classList.add('on');
  requestAnimationFrame(animate);
}

async function build() {
  await step('MAPPING DEEP FIELD…');
  const sf = buildStarfield(120000);
  starField = sf;
  scene.add(sf.points);
  scene.add(buildMilkyWayDome().mesh);

  await step('CATALOGUING GALAXIES…');
  const gx = buildGalaxies();
  scene.add(gx.group);
  for (const sp of gx.targets) {
    hover.register(
      sp,
      sp.userData,
      (v) => v.copy(sp.position),
      () => sp.userData.baseSize * 0.42
    );
  }

  await step('DEPLOYING TELESCOPES…');
  scopes = buildTelescopes();
  scene.add(scopes.group);
  solarViz.push(scopes.group);
  for (const sp of scopes.targets) {
    hover.register(sp, sp.userData, (v) => v.copy(sp.position), () => sp.userData.baseSize * 0.6);
  }

  await step('LOCATING SINGULARITIES…');
  const ds = buildDeepSky();
  scene.add(ds.group);
  for (const sp of ds.targets) {
    hover.register(
      sp,
      sp.userData,
      (v) => v.copy(sp.position),
      () => sp.userData.baseSize * 0.40
    );
  }

  await step('IGNITING SOL…');
  sun = buildSun();
  scene.add(sun.group);
  solarViz.push(sun.group);
  scene.add(sun.ambient);
  {
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData.pickFor = 'sun';
    scene.add(pick);
    hover.register(
      pick,
      { kind: 'sun', id: 'sol', name: SUN.name, designation: SUN.designation, className: SUN.class, body: SUN, note: SUN.note },
      (v) => v.set(0, 0, 0),
      () => 6.0
    );
    sun.pick = pick;
  }
  sun.label = makeLabel('SOL');

  // enough of a scene to be worth looking at — hand it over now
  revealScene();

  for (const p of PLANETS) {
    await step(`RENDERING ${p.name.toUpperCase()}…`);
    const obj = buildPlanet(p, SUN_POS, { earth: 2048, banded: 1600, rocky: 1024 });
    scene.add(obj.group);
    solarViz.push(obj.group);
    obj.pos = { x: 0, y: 0, z: 0, E: 0 };
    obj.worldPos = new THREE.Vector3();
    obj.label = makeLabel(p.name.toUpperCase());

    const ol = buildOrbitLine(p, clock.T, tintFor(p), 0.26);
    scene.add(ol.line);
    solarViz.push(ol.line);
    ol.body = p;
    orbitLines.push(ol);
    obj.orbit = ol;

    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(pick);
    obj.pick = pick;
    hover.register(
      pick,
      {
        kind: 'planet', id: p.id, name: p.name, designation: p.designation,
        className: p.class, body: p, note: p.note,
      },
      (v) => v.copy(obj.worldPos),
      () => obj.radius * (p.rings ? p.rings.outer * 0.9 : 1)
    );
    planets.push(obj);
    travel?.registerBody(p, obj.tex);
  }

  await step('PLACING LUNA…');
  const moonSpec = MOONS[0];
  moonObj = buildMoon(moonSpec, SUN_POS, { rocky: 1024 });
  const earth = planets.find((p) => p.body.id === 'earth');
  earth.group.add(moonObj.group);
  earth.group.add(moonObj.orbitLine);
  moonObj.worldPos = new THREE.Vector3();
  moonObj.label = makeLabel('MOON');
  {
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(pick);
    moonObj.pick = pick;
    hover.register(
      pick,
      {
        kind: 'moon', id: moonSpec.id, name: moonSpec.name, designation: moonSpec.designation,
        className: moonSpec.class, body: moonSpec, note: moonSpec.note,
      },
      (v) => v.copy(moonObj.worldPos),
      () => moonObj.radius
    );
  }

  travel?.registerBody(moonSpec, moonObj.tex);
  travel?.registerBody(SUN, null);

  await step('SEEDING THE ASTEROID BELT…');
  const mainSpec = BELTS.find((b) => b.id === 'main-belt');
  const main = new SmallBodyBelt(mainSpec, { mode: 'mesh', seed: 0x11AA, sizeRange: [0.018, 0.10] });
  scene.add(main.object);
  solarViz.push(main.object);
  belts.push(main);
  registerBelt(mainSpec);

  // Jupiter's Trojans, riding 60° ahead of and behind the planet
  const jup = PLANETS.find((p) => p.id === 'jupiter');
  const jupL = jup.el.L;
  const trojanSpec = {
    id: 'trojans', name: 'Jupiter Trojans', designation: 'L4 / L5 SWARMS', class: 'SMALL BODIES',
    innerAU: jup.el.a, outerAU: jup.el.a, count: TROJANS.count, thicknessAU: TROJANS.thicknessAU,
    spreadDeg: TROJANS.spreadDeg, jupiterL: jupL, trojan: true, tint: '#8d7f74',
  };
  const troj = new SmallBodyBelt(trojanSpec, { mode: 'mesh', seed: 0x77CC, sizeRange: [0.025, 0.13] });
  scene.add(troj.object);
  solarViz.push(troj.object);
  belts.push(troj);

  await step('CHARTING THE KUIPER BELT…');
  const kSpec = BELTS.find((b) => b.id === 'kuiper');
  const kuiper = new SmallBodyBelt(kSpec, { mode: 'points', seed: 0x9911, sizeRange: [0.05, 0.3] });
  scene.add(kuiper.object);
  solarViz.push(kuiper.object);
  kuiper.slow = true;
  belts.push(kuiper);
  registerBelt(kSpec);

  await step('SYNCHRONISING EPHEMERIS…');
  updateBodies(0);

  search = new SearchBar({
    targets: hover.targets,
    routes: [
      { id: 'space', name: 'Space', alt: 'big bang universe cosmology origin' },
      { id: 'galaxies', name: 'The Galaxies', alt: 'hubble spiral elliptical' },
      { id: 'stars', name: 'The Stars', alt: 'spectral class o b a f g k m' },
    ],
    onPick: (r) => {
      if (r.route) { router.go(r.route); return; }
      travel.goTo(r.target);
    },
    onHome: () => travel.goHome(),
  });

  statusText.textContent = 'EPHEMERIS LOCKED';
  setTimeout(() => statusEl.classList.add('done'), 900);
  setTimeout(() => statusEl.classList.remove('on'), 1500);
}

function tintFor(p) {
  return new THREE.Color(p.palette.light).lerp(new THREE.Color(0x5f7fa8), 0.45).getHex();
}

function registerBelt(spec) {
  const proxy = beltHoverProxy(spec, {});
  scene.add(proxy);
  const hl = beltHighlight(spec);
  scene.add(hl);
  solarViz.push(hl);
  hover.register(
    proxy,
    {
      kind: 'belt', id: spec.id, name: spec.name, designation: spec.designation,
      className: spec.class, note: spec.note, stats: spec.stats, isBelt: true,
      highlight: hl, noReticle: true,
    },
    (v) => v.set(0, 0, 0),
    () => auToUnits((spec.innerAU + spec.outerAU) / 2) * 1.02
  );
  proxy.userData.highlight = hl;
}

/* ── per-frame body update ───────────────────────────────────────────── */

const _v = new THREE.Vector3();
const _sunDir = new THREE.Vector3();

function updateBodies(frame) {
  const T = clock.T;
  const jd = clock.jd;

  for (const obj of planets) {
    const b = obj.body;
    heliocentric(b, T, obj.pos);
    eclipticToScene(obj.pos.x, obj.pos.y, obj.pos.z, _v);
    obj.group.position.copy(_v);
    obj.worldPos.copy(_v);

    // sidereal rotation; negative periods spin the other way
    obj.mesh.rotation.y = ((jd - J2000_JD) / b.rotationDays) * Math.PI * 2;
    if (obj.clouds) obj.clouds.rotation.y = obj.mesh.rotation.y * 1.06 + 0.4;

    if (obj.orbit) obj.orbit.material.uniforms.uHead.value = obj.pos.E;

    if (obj.rings) {
      obj.rings.material.uniforms.uPlanet.value.copy(_v);
    }
    if (obj.mesh.material.userData.sunDir) {
      obj.mesh.material.userData.sunDir.copy(_sunDir.copy(_v).negate().normalize());
    }
  }

  // the Moon, on its own inclined orbit around Earth
  if (moonObj) {
    const m = moonObj.body;
    const ang = ((jd - J2000_JD) / m.periodDays) * Math.PI * 2 + 2.31;
    const inc = m.iDeg * DEG;
    moonObj.group.position.set(
      Math.cos(ang) * MOON_ORBIT_UNITS,
      Math.sin(ang) * Math.sin(inc) * MOON_ORBIT_UNITS * 0.4,
      Math.sin(ang) * MOON_ORBIT_UNITS
    );
    // tidally locked: the same face always points at Earth
    moonObj.mesh.rotation.y = -ang + Math.PI / 2;
    moonObj.group.getWorldPosition(moonObj.worldPos);
  }

  if (scopes) {
    const e = planets.find((p) => p.body.id === 'earth');
    if (e) updateTelescopes(scopes.group, e.worldPos, jd);
  }

  for (let i = 0; i < belts.length; i++) {
    const belt = belts[i];
    if (belt.slow && frame % 3 !== 0) continue;
    belt.update(jd);
  }
}

/* ── pick proxies keep a comfortable click target at any zoom ─────────── */

function updatePickProxies() {
  const camPos = camera.position;
  const scaleFor = (worldPos, minR) => {
    const d = camPos.distanceTo(worldPos);
    return Math.max(minR, d * 0.016);
  };
  if (sun?.pick) {
    sun.pick.scale.setScalar(scaleFor(SUN_POS, 6.2));
  }
  for (const obj of planets) {
    obj.pick.position.copy(obj.worldPos);
    const rr = obj.body.rings ? obj.radius * obj.body.rings.outer : obj.radius;
    obj.pick.scale.setScalar(scaleFor(obj.worldPos, rr * 1.05));
  }
  if (moonObj) {
    moonObj.pick.position.copy(moonObj.worldPos);
    moonObj.pick.scale.setScalar(scaleFor(moonObj.worldPos, moonObj.radius * 1.1));
  }
}

/* ── labels ──────────────────────────────────────────────────────────── */

const _proj = new THREE.Vector3();
function placeLabel(el, worldPos, radius, minDist = 0, maxDist = 1e9) {
  if (!showLabels) { el.style.opacity = '0'; return; }
  _proj.copy(worldPos).project(camera);
  const behind = _proj.z > 1;
  const d = camera.position.distanceTo(worldPos);
  if (behind || d < minDist || d > maxDist) { el.style.opacity = '0'; return; }
  const x = (_proj.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
  // sit just below the body, scaled by its apparent size
  const px = (radius / d) * (window.innerHeight / (2 * Math.tan((camera.fov * DEG) / 2)));
  el.style.left = `${x}px`;
  el.style.top = `${y + Math.max(12, px + 10)}px`;
  el.style.opacity = String(Math.min(0.85, Math.max(0, (d - minDist) / 40)));
}

/* ── interaction ─────────────────────────────────────────────────────── */

let pointerX = -100, pointerY = -100, pointerInside = false;

renderer.domElement.addEventListener('pointermove', (e) => {
  pointerX = e.clientX; pointerY = e.clientY; pointerInside = true;
  hover.setPointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
  markActive();
});
renderer.domElement.addEventListener('pointerleave', () => {
  pointerInside = false;
  hover.clearPointer();
});

// hovering the HUD should not keep a body selected underneath it
for (const id of ['hud-left', 'hud-right', 'timebar']) {
  const el = document.getElementById(id);
  el.addEventListener('pointerenter', () => { pointerInside = false; hover.clearPointer(); });
}

/* ── keyboard panning ────────────────────────────────────────────────── */

const panKeys = { left: false, right: false, up: false, down: false };
const panVel = new THREE.Vector2();      // smoothed, in screen space
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _panDelta = new THREE.Vector3();

/** Slide the camera and its target together across the view plane. */
function applyPan(dt) {
  const want = new THREE.Vector2(
    (panKeys.right ? 1 : 0) - (panKeys.left ? 1 : 0),
    (panKeys.up ? 1 : 0) - (panKeys.down ? 1 : 0)
  );
  if (want.lengthSq() > 1) want.normalize();
  if (want.lengthSq() > 0 && warp.busy) warp.cancel();
  // ease in and out so it never feels like a jump cut
  panVel.lerp(want, Math.min(1, dt * 9));
  if (panVel.lengthSq() < 1e-6) return;

  // speed scales with range, so it feels the same up close and far out
  const dist = camera.position.distanceTo(controls.target);
  const speed = dist * 0.85 * dt;
  _right.setFromMatrixColumn(camera.matrix, 0);
  _up.setFromMatrixColumn(camera.matrix, 1);
  _panDelta.copy(_right).multiplyScalar(panVel.x * speed).addScaledVector(_up, panVel.y * speed);
  camera.position.add(_panDelta);
  controls.target.add(_panDelta);
}

/** Ease the view back to the Sun without snapping. */
let recentering = false;
function recenter() {
  recentering = true;
}

/* ── selection ───────────────────────────────────────────────────────── */

// A click only counts if the pointer barely moved — otherwise every orbit
// drag that happens to end over a planet would fire a flight.
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  const held = performance.now() - downAt.t;
  downAt = null;
  if (moved > 5 || held > 450) return;
  if (pageOpen || travel?.bodyOpen || warp.busy) return;
  const hit = hover.current;
  if (hit) travel.goTo(hit);
});

let idleTimer = null;
function markActive() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 4200);
}
markActive();

const PAN_KEYMAP = {
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
};

window.addEventListener('keyup', (e) => {
  const slot = PAN_KEYMAP[e.key.toLowerCase()];
  if (slot) panKeys[slot] = false;
});
window.addEventListener('blur', () => {
  for (const k in panKeys) panKeys[k] = false;
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.key.toLowerCase();
  const slot = PAN_KEYMAP[k];
  if (slot) {
    e.preventDefault();
    panKeys[slot] = true;
    recentering = false;
    markActive();
    return;
  }
  if (k === 'c') { recenter(); markActive(); return; }
  if (k === ' ') { e.preventDefault(); hud.action('play'); }
  else if (k === ',') hud.action('slower');
  else if (k === '.') hud.action('faster');
  else if (k === 'r') hud.action('reverse');
  else if (k === 'n') hud.action('now');
  else if (k === 'o') {
    showOrbits = !showOrbits;
    for (const o of orbitLines) o.line.visible = showOrbits;
    if (moonObj) moonObj.orbitLine.visible = showOrbits;
  } else if (k === 'l') {
    showLabels = !showLabels;
  }
  markActive();
});

/* ── routing between the live system and the article pages ───────────── */

const router = new Router({
  onEnterPage(route) {
    pageOpen = true;
    for (const o of solarViz) o.visible = false;
    hover.current = null;
    hover.group.visible = false;
    hud.setTarget(null);
    pointerInside = false;
    hover.clearPointer();
    document.body.classList.remove('hovering');
    hud.setFocus(route.toUpperCase());
  },
  onLeavePage() {
    pageOpen = false;
    for (const o of solarViz) o.visible = true;
    // honour the orbit-trail toggle when coming back
    for (const ol of orbitLines) ol.line.visible = showOrbits;
    if (moonObj) moonObj.orbitLine.visible = showOrbits;
    hud.setFocus('SOL SYSTEM');
  },
});

initNav((route) => {
  if (route === 'constellations') { travel.openSky(); return; }
  router.go(route);
});

sky = new SkyScreen(renderer, clock);
eyepiece = new Eyepiece({ camera, controls, warp, scene });

travel = new Travel({
  scene, camera, controls, warp, hover, hud, home: HOME, sky, eyepiece,
  onOpen: () => { hover.current = null; hover.group.visible = false; hud.setTarget(null); },
});

initLanguage();

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  timebar.resize();
  eyepiece.applyIris();          // the iris is sized off the shorter edge
});

/* ── loop ────────────────────────────────────────────────────────────── */

let last = performance.now();
let frame = 0;
let fps = 60;
let elapsed = 0;

function animate(now) {
  requestAnimationFrame(animate);
  frameStep(now);
}

function frameStep(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  elapsed += dt;
  frame++;
  fps += ((1 / Math.max(dt, 1e-4)) - fps) * 0.06;

  clock.tick(dt);
  if (!pageOpen) {
    updateBodies(frame);
    updatePickProxies();
  }

  if (sky?.open) {
    sky.update(dt);               // the sky owns the frame; nothing else draws
    return;
  }

  warp.update(dt);
  travel?.update(dt);
  eyepiece?.update(dt);

  applyPan(dt);
  if (recentering && !warp.busy) {
    controls.target.lerp(SUN_POS, Math.min(1, dt * 2.4));
    if (controls.target.lengthSq() < 0.02) { controls.target.set(0, 0, 0); recentering = false; }
  }
  controls.update();

  // Two different distances matter: how far we are from the Sun (what the HUD
  // reports) and how far we are from what we're looking at (what sets the
  // depth range). Panning makes them diverge.
  const camDist = camera.position.length();
  const viewDist = camera.position.distanceTo(controls.target);
  if (!eyepiece?.open) {
    camera.near = Math.max(0.02, Math.min(viewDist, camDist) * 0.0035);
    camera.far = Math.max(4000, camDist * 6);
    camera.updateProjectionMatrix();
  }

  if (sun) sun.update(elapsed, camDist);
  if (starField) starField.material.uniforms.uTime.value = elapsed;

  // hover: re-pick on alternate frames, it is plenty responsive
  if (frame % 2 === 0 && !pageOpen && !travel?.bodyOpen && !eyepiece?.open) {
    const hit = pointerInside && !warp.busy ? hover.pick() : null;
    const prev = hover.current;
    if (hit !== prev) {
      if (prev?.meta?.highlight) prev.meta.highlight.userData.setOpacity(0);
      hover.current = hit;
      hud.setTarget(hit ? hit.meta : null);
      document.body.classList.toggle('hovering', !!hit);
      // lift the hovered planet's orbit trail
      for (const o of orbitLines) {
        o.material.uniforms.uBoost.value = hit && o.body.id === hit.meta.id ? 0.5 : 0;
      }
    }
  }
  if (hover.current?.meta?.highlight) {
    beltGlow += (0.85 - beltGlow) * Math.min(1, dt * 8);
    hover.current.meta.highlight.userData.setOpacity(beltGlow);
  } else {
    beltGlow = 0;
  }
  hover.update(dt, elapsed);
  hud.setTag(hover.current ? hover.current.meta : null, pointerX, pointerY);

  // labels
  if (pageOpen) {
    for (const el of labelLayer.children) el.style.opacity = '0';
  } else if (sun) placeLabel(sun.label, SUN_POS, 6, 0);
  if (!pageOpen) {
    for (const obj of planets) placeLabel(obj.label, obj.worldPos, obj.radius, 0);
    if (moonObj) placeLabel(moonObj.label, moonObj.worldPos, moonObj.radius, 0, 260);
  }

  // HUD numbers
  const camAu = unitsToAu(camDist);
  hud.update(camDist, camAu, fps);
  if (frame % 2 === 0 && !pageOpen) timebar.draw(clock);

  composer.render();
  warp.render(renderer);
}

/* ── debug handle ────────────────────────────────────────────────────── */
// Exposed so the scene can be inspected and stepped from the console.
window.__space = {
  THREE, scene, camera, renderer, composer, controls, clock, hud, hover, warp,
  planets, belts, orbitLines,
  get travel() { return travel; },
  get search() { return search; },
  get router() { return router; },
  get sun() { return sun; },
  get moon() { return moonObj; },
  frameStep,
  /** advance n frames at a fixed timestep, without waiting on rAF */
  run(n = 1, step = 16.7) {
    for (let i = 0; i < n; i++) { last = performance.now() - step; frameStep(performance.now()); }
  },
  /** how much of the frame is actually lit — a quick "is anything drawing" probe */
  sample() {
    const gl = renderer.getContext();
    const w = renderer.domElement.width, h = renderer.domElement.height;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0, sum = 0, max = 0;
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i] + px[i + 1] + px[i + 2];
      if (v > 12) lit++;
      sum += v; if (v > max) max = v;
    }
    return { pixels: w * h, litFraction: lit / (w * h), meanLuma: sum / (w * h) / 3, max };
  },
  /** point the camera at a world position (or a body) from a given range */
  view(target, dist, elev = 0.35, azi = 0) {
    const p = target.isVector3 ? target : target.worldPos;
    camera.position.set(p.x + Math.sin(azi) * dist, p.y + dist * elev, p.z + Math.cos(azi) * dist);
    controls.target.copy(p);
    camera.lookAt(p);
    camera.near = Math.max(0.01, dist * 0.002);
    camera.far = 20000;
    camera.updateProjectionMatrix();
  },
  /** render at a fixed size and POST the frame to tools/shot-server.mjs */
  async shot(name, W = 1440, H = 900) {
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    composer.setSize(W, H);
    if (sky?.open) {
      sky._w = W; sky._h = H;
      sky.view.update(0.016, W, H);
      sky.view.render();
    } else {
      composer.render();
      warp.render(renderer);
    }
    const gl = renderer.getContext();
    const buf = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {            // readPixels returns bottom-up rows
      const src = (H - 1 - y) * W * 4;
      img.data.set(buf.subarray(src, src + W * 4), y * W * 4);
    }
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    ctx.putImageData(img, 0, 0);
    const r = await fetch('http://localhost:5199/shot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: c.toDataURL('image/png') }),
    });
    return r.text();
  },
  /**
   * Capture the DOM (article pages) rather than the WebGL canvas.
   * html2canvas is loaded on demand, so it is code-split out of the app
   * bundle and never fetched during normal use.
   */
  async shotDOM(name) {
    const { default: html2canvas } = await import('html2canvas');
    const c = await html2canvas(document.body, {
      backgroundColor: '#000',
      scale: 1,
      logging: false,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
    const r = await fetch('http://localhost:5199/shot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: c.toDataURL('image/png') }),
    });
    return r.text();
  },
  /** Capture one element (optionally a vertical slice of it) to a PNG. */
  async shotRegion(name, selector, y0 = 0, h = 1000) {
    const { default: html2canvas } = await import('html2canvas');
    // entrance animations do not advance in a backgrounded tab, which would
    // capture everything at opacity 0 — pin them to their end state
    const freeze = document.createElement('style');
    freeze.textContent = `*{animation:none!important} .reveal{opacity:1!important;
      transform:none!important;filter:none!important}`;
    document.head.appendChild(freeze);
    const el = document.querySelector(selector);
    const full = await html2canvas(el, { backgroundColor: '#050709', scale: 1, logging: false });
    const w = Math.min(full.width, 1600);
    const hh = Math.max(1, Math.min(h, full.height - y0));
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    c.getContext('2d').drawImage(full, 0, y0, w, hh, 0, 0, w, hh);
    const r = await fetch('http://localhost:5199/shot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: c.toDataURL('image/png') }),
    });
    await r.text();
    freeze.remove();
    return `${full.width}x${full.height}`;
  },
  ready() {
    return new Promise((res) => {
      const t = setInterval(() => {
        if (!document.getElementById('boot')) { clearInterval(t); res(true); }
      }, 200);
    });
  },
  pickAt(x, y) {
    hover.setPointer(x, y, window.innerWidth, window.innerHeight);
    const t = hover.pick();
    return t ? t.meta : null;
  },
};

build().catch((err) => {
  bootText.textContent = 'BUILD FAILED — SEE CONSOLE';
  statusText.textContent = 'BUILD FAILED';
  throw err;
});
