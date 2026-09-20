import * as THREE from 'three';
import { rng } from './noise.js';

/**
 * Camera travel between objects.
 *
 * A cut would be cheap but disorienting — you lose all sense of how far apart
 * things are. Instead the camera actually flies, accelerating out of its
 * current position and decelerating into the target, with the field of view
 * punching wider at peak speed and a field of streaks scrolling past. The
 * streaks live in the camera's own local space, so only two uniforms change
 * per frame no matter how fast you are going.
 */

const STREAK_VERT = /* glsl */`
  attribute float aSide;      // 0 = tail, 1 = head
  uniform float uLen;
  uniform float uScroll;
  uniform float uSpan;
  uniform float uGuard;       // keep heads in front of the near plane
  varying float vA;
  void main(){
    vec3 p = position;
    // scroll the segment toward the camera and wrap it around the span
    float z = -18.0 - mod(-p.z - 18.0 + uScroll, uSpan);

    // A stretched head can otherwise run past z = 0 — behind the eye — where
    // the perspective divide produces NaN. One bad vertex is enough to poison
    // the post-processing chain and black out the whole frame, so clamp it.
    p.z = min(z + aSide * uLen, -uGuard);

    vA = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const STREAK_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main(){
    // bright at the head, fading out along the tail
    float a = clamp(vA, 0.0, 1.0);
    gl_FragColor = vec4(uColor, a * a * uOpacity);
  }
`;

function buildStreaks(count = 1400) {
  const rand = rng(0x5747EA);
  const pos = new Float32Array(count * 2 * 3);
  const side = new Float32Array(count * 2);
  const span = 240;

  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    // bias outward so the centre of the screen stays clear
    const r = 5 + Math.pow(rand(), 0.55) * 62;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const z = -18 - rand() * span;
    for (const s of [0, 1]) {
      const k = (i * 2 + s) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      side[i * 2 + s] = s;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uLen: { value: 0 },
      uScroll: { value: 0 },
      uSpan: { value: span },
      uGuard: { value: 2.5 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0xcfe6ff) },
    },
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 30;
  lines.visible = false;
  return { lines, mat };
}

/** Smooth acceleration out, long cruise, smooth deceleration in. */
function easeWarp(t) {
  // symmetric ease with a flatter middle than a plain cubic
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** How fast we are moving along the eased curve, 0..1, peaking mid-flight. */
function speedProfile(t) {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
}

export class WarpDrive {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.baseFov = camera.fov;

    /*
     * The streaks live in their own scene, drawn straight to the canvas after
     * post-processing rather than through it. Feeding a screenful of additive
     * lines into the bloom pass poisons its blur chain and blacks out the
     * entire frame — and conceptually they should not bloom anyway, since
     * they are already the brightest thing on screen.
     */
    const { lines, mat } = buildStreaks();
    this.streaks = lines;
    this.streakMat = mat;
    this.overlay = new THREE.Scene();
    this.overlay.add(lines);

    this.active = false;
    this.t = 0;
    this.duration = 1;
    this.from = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
    this.to = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
    this.bow = new THREE.Vector3();
    this._onArrive = null;
    this._tmp = new THREE.Vector3();
    this._prev = new THREE.Vector3();
  }

  get busy() { return this.active; }

  /**
   * @param {THREE.Vector3} targetPos  where to look
   * @param {number} standoff          how far to stop short of it
   * @param {object} opts              {duration, approach, onArrive, onProgress}
   */
  flyTo(targetPos, standoff, opts = {}) {
    const cam = this.camera;
    this.from.pos.copy(cam.position);
    this.from.target.copy(this.controls.target);
    this.to.target.copy(targetPos);

    // Approach direction: caller may force one (planets are framed from the
    // sunward side so we arrive at a lit face); otherwise keep the current
    // viewing angle so the move feels like travel, not a teleport-and-spin.
    const dir = opts.approach
      ? opts.approach.clone().normalize()
      : this._tmp.copy(cam.position).sub(this.controls.target).normalize().clone();
    this.to.pos.copy(targetPos).addScaledVector(dir, standoff);

    const span = this.from.pos.distanceTo(this.to.pos);
    this.duration = opts.duration ?? THREE.MathUtils.clamp(0.9 + span / 900, 1.1, 2.6);

    // a gentle sideways bow so long hops arc instead of sliding on a rail
    const mid = this._tmp.copy(this.from.pos).add(this.to.pos).multiplyScalar(0.5);
    const away = mid.clone().normalize();
    this.bow.copy(away).multiplyScalar(Math.min(span * 0.10, 120));

    this.t = 0;
    this.active = true;
    this._onArrive = opts.onArrive || null;
    this._onProgress = opts.onProgress || null;
    this._prev.copy(cam.position);
    this.streaks.visible = true;
    this.controls.enabled = false;
    document.body.classList.add('warping');
    return this;
  }

  cancel() {
    if (!this.active) return;
    this.active = false;
    this._onArrive = null;
    this.controls.enabled = true;
    document.body.classList.remove('warping');
  }

  update(dt) {
    const cam = this.camera;
    const m = this.streakMat.uniforms;

    if (this.active) {
      this.t = Math.min(1, this.t + dt / this.duration);
      const e = easeWarp(this.t);
      const s = speedProfile(this.t);

      // quadratic Bezier through the bow point
      const inv = 1 - e;
      cam.position.copy(this.from.pos).multiplyScalar(inv * inv);
      this._tmp.copy(this.from.pos).add(this.to.pos).multiplyScalar(0.5).add(this.bow)
        .multiplyScalar(2 * inv * e);
      cam.position.add(this._tmp);
      cam.position.addScaledVector(this.to.pos, e * e);

      this.controls.target.lerpVectors(this.from.target, this.to.target, e);
      cam.lookAt(this.controls.target);

      // the field of view widens at speed, then settles — reads as acceleration
      cam.fov = this.baseFov + s * 15;
      cam.updateProjectionMatrix();

      this._onProgress?.(this.t, s);

      if (this.t >= 1) {
        this.active = false;
        cam.fov = this.baseFov;
        cam.updateProjectionMatrix();
        this.controls.enabled = true;
        document.body.classList.remove('warping');
        const cb = this._onArrive;
        this._onArrive = null;
        cb?.();
      }
    }

    // the streak field is not parented to the camera, so match it by hand
    this.streaks.position.copy(cam.position);
    this.streaks.quaternion.copy(cam.quaternion);

    /*
     * Streaks belong to a commanded flight and nothing else. Driving them off
     * raw camera speed meant every orbit drag and every arrow-key pan lit the
     * warp tunnel, which made the effect meaningless — so they follow the
     * flight profile only, and decay to nothing the moment it ends.
     */
    const moved = cam.position.distanceTo(this._prev) / Math.max(dt, 1e-4);
    this._prev.copy(cam.position);
    const want = this.active ? speedProfile(this.t) : 0;

    m.uOpacity.value += (want * 0.55 - m.uOpacity.value) * Math.min(1, dt * 6);
    m.uLen.value += (want * 78 - m.uLen.value) * Math.min(1, dt * 6);
    // wrap the scroll so it never grows large enough to lose float precision
    m.uScroll.value = (m.uScroll.value + moved * dt * 2.2 + want * dt * 220) % m.uSpan.value;
    m.uGuard.value = Math.max(2.5, cam.near * 3);

    this.streaks.visible = m.uOpacity.value >= 0.002;
  }

  /** Draw the streaks over the finished frame. Call after composer.render(). */
  render(renderer) {
    if (!this.streaks.visible) return;
    const prev = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.overlay, this.camera);
    renderer.autoClear = prev;
  }
}
