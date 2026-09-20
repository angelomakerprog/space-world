import { t } from '../ui/i18n.js';
import * as THREE from 'three';
import { buildPlanet } from '../gfx/planets.js';
import { buildSun } from '../gfx/sun.js';
import { SUN_UNITS } from '../core/scale.js';
import { PROFILES } from '../data/profiles.js';
import { fmtKm, fmtMass, fmtNum, fmtDuration } from '../ui/format.js';
import { periodDays } from '../core/orbits.js';

/**
 * The per-body page: a live, rotating, separately-lit copy of the world on the
 * left, its numbers underneath, and long-form text on the right.
 *
 * The planet is a real second render rather than a screenshot, so it keeps
 * turning while you read — and for Earth it can be hovered hemisphere by
 * hemisphere. It runs in its own small WebGL context and reuses the textures
 * the main scene already generated.
 */
export class BodyPortrait {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
      // keeps the frame readable back out of the canvas, which the capture
      // tooling needs and costs almost nothing at this size
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 4000);

    // a fixed off-axis key light, so every world is shown with a terminator
    // rather than flat-on — it reads as a sphere that way
    this.sunPos = new THREE.Vector3(0.86, 0.34, 0.62).normalize().multiplyScalar(400);
    const key = new THREE.PointLight(0xfff2e0, 2.4, 0, 0);
    key.position.copy(this.sunPos);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0x101a2a, 0.75));

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-10, -10);
    this.obj = null;
    this.hemis = null;
    this.hoverHemi = null;
    this.onHemiClick = null;
    this.spin = 0;
    this._running = false;

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    });
    canvas.addEventListener('pointerleave', () => this.pointer.set(-10, -10));
    canvas.addEventListener('click', () => {
      if (this.hoverHemi) this.onHemiClick?.(this.hoverHemi, this.hoverSite);
    });
  }

  /** Swap in a body. `sourceTex` are the maps the main scene already built. */
  show(body, sourceTex, { hemispheres = false } = {}) {
    this.clear();

    let obj;
    if (body.id === 'sol') {
      // the Sun is not a lit sphere — it is the light. Reuse the real one,
      // built once and kept, since its surface map costs a fifth of a second.
      if (!this._sun) this._sun = buildSun();
      obj = {
        body, group: this._sun.group, tilt: this._sun.group, mesh: this._sun.core,
        radius: SUN_UNITS, clouds: null, rings: null, atmo: null, isSun: true,
      };
    } else {
      obj = buildPlanet(body, this.sunPos, {}, sourceTex);
    }
    this.obj = obj;
    this.scene.add(obj.group);

    // frame it: rings need more room than the globe
    const reach = obj.radius * (body.rings ? body.rings.outer : 1.0);
    this.fitDistance = reach * (obj.isSun ? 5.4 : body.rings ? 4.2 : 4.35);
    // enough elevation that a ring system opens into an ellipse rather than
    // collapsing to a line
    this.camera.position.set(0.40, 0.44, 1).normalize().multiplyScalar(this.fitDistance);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = this.fitDistance * 0.02;
    this.camera.far = this.fitDistance * 12;
    this.camera.updateProjectionMatrix();

    // the Sun has no lit/dark side to show — light it from the front instead
    if (body.id === 'sol') {
      this.scene.children.forEach((c) => { if (c.isPointLight) c.position.copy(this.camera.position); });
    } else {
      this.scene.children.forEach((c) => { if (c.isPointLight) c.position.copy(this.sunPos); });
    }

    if (hemispheres) this.addHemispheres(obj);
    this.spin = 0;
    this._running = true;
    this.resize();
    return this;
  }

  /**
   * Four invisible quarter-shells on the tilt group, so they follow the axis
   * but not the spin. Two hemispheres would only ever show you two skies;
   * quartering by longitude as well means all four quadrants of the celestial
   * sphere are reachable.
   */
  addHemispheres(obj) {
    const R = obj.radius * 1.006;
    const mk = (phiStart, thetaStart, name) => {
      const geo = new THREE.SphereGeometry(R, 48, 24, phiStart, Math.PI, thetaStart, Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xbfe4ff, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      m.name = name;
      m.userData.hemi = name;
      m.renderOrder = 6;
      return m;
    };
    this.hemis = [
      mk(0, 0, 'north-east'), mk(Math.PI, 0, 'north-west'),
      mk(0, Math.PI / 2, 'south-east'), mk(Math.PI, Math.PI / 2, 'south-west'),
    ];
    obj.mesh.add(...this.hemis);

    // hairlines on the equator and the dividing meridian, so the four regions
    // are legible before you hover anything
    const guide = (rotX, rotY) => {
      const t = new THREE.Mesh(
        new THREE.TorusGeometry(R * 1.001, R * 0.0032, 6, 180),
        new THREE.MeshBasicMaterial({
          color: 0x9fd4ff, transparent: true, opacity: 0.24,
          depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      t.rotation.set(rotX, rotY, 0);
      obj.mesh.add(t);
      return t;
    };
    this.guides = [guide(Math.PI / 2, 0), guide(0, Math.PI / 2)];
    this.equator = this.guides[0];
  }

  /**
   * Turn a point on the globe into a latitude and longitude, undoing the spin
   * and the axial tilt. Latitude is what the sky view actually needs.
   */
  siteFromPoint(worldPoint) {
    const local = this.obj.mesh.worldToLocal(worldPoint.clone()).normalize();
    const lat = Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) / (Math.PI / 180);
    // SphereGeometry maps u to phi = atan2(z, -x); the texture puts u = 0 at -180
    let lon = Math.atan2(local.z, -local.x) / (Math.PI / 180) - 180;
    lon = ((lon + 540) % 360) - 180;
    return { lat, lon };
  }

  clear() {
    if (this.obj) {
      this.scene.remove(this.obj.group);
      // geometry is per-instance here; the maps are shared and must survive.
      // The Sun's group is cached and reused, so leave its buffers alone.
      if (!this.obj.isSun) {
        this.obj.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
    }
    this.obj = null;
    this.hemis = null;
    this.hoverHemi = null;
    this.equator = null;
    this._running = false;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this._running || !this.obj) return;
    this.resize();
    const o = this.obj;
    this.elapsed = (this.elapsed || 0) + dt;

    // one turn every ~26 s, in the body's real direction
    const dir = (o.body.rotationDays ?? 1) < 0 ? -1 : 1;
    this.spin += dt * 0.24 * dir;
    o.mesh.rotation.y = this.spin;
    if (o.isSun) this._sun.update(this.elapsed, this.fitDistance);
    if (o.clouds) o.clouds.rotation.y = this.spin * 1.06 + 0.4;

    if (o.mesh.material.userData?.sunDir) {
      o.mesh.material.userData.sunDir.copy(this.sunPos).normalize();
    }
    if (o.rings) o.rings.material.uniforms.uPlanet.value.set(0, 0, 0);

    if (this.hemis) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.pointer.x < -5 ? [] : this.raycaster.intersectObjects(this.hemis, false);
      const now = hit.length ? hit[0].object.userData.hemi : null;
      this.hoverHemi = now;
      this.hoverSite = hit.length ? this.siteFromPoint(hit[0].point) : null;
      for (const m of this.hemis) {
        const want = m.userData.hemi === now ? 0.13 : 0;
        m.material.opacity += (want - m.material.opacity) * Math.min(1, dt * 10);
      }
      for (const g of this.guides || []) {
        const want = now ? 0.5 : 0.24;
        g.material.opacity += (want - g.material.opacity) * Math.min(1, dt * 8);
      }
      this.canvas.style.cursor = now ? 'pointer' : '';
      this.onHemiHover?.(now, this.hoverSite);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* ── page markup ─────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function statsFor(body) {
  const p = PROFILES[body.id] || {};
  const rows = [];

  if (body.id === 'sol') {
    rows.push(['DISTANCE', p.distText, p.distSub]);
  } else if (body.parent) {
    rows.push(['DISTANCE', p.distText, p.distSub]);
  } else {
    rows.push(['DISTANCE', p.distText, p.distSub]);
  }

  rows.push(['MASS', fmtMass(body.massKg),
    body.id === 'sol' ? '333,000 Earths'
      : `${fmtNum(body.massKg / 5.97237e24, 3)} ${t('ui.xEarth', '× Earth')}`]);

  rows.push(['MADE OF', p.madeOf || '—', p.madeOfSub || '']);
  return rows;
}

function specsFor(body) {
  const specs = [
    ['MEAN RADIUS', fmtKm(body.radiusKm)],
    ['SURFACE GRAVITY', `${body.gravity.toFixed(2)} m/s²`],
    ['MEAN TEMPERATURE', `${body.tempC > 0 ? '+' : ''}${body.tempC} °C`],
    ['AXIAL TILT', `${body.tiltDeg.toFixed(2)}°`],
    ['SIDEREAL DAY', fmtDuration(Math.abs(body.rotationDays)) + (body.rotationDays < 0 ? '  ↺ retrograde' : '')],
  ];
  if (body.el) {
    specs.push(['ORBITAL PERIOD', fmtDuration(periodDays(body.el.a))]);
    specs.push(['ORBITAL VELOCITY', `${body.orbVel.toFixed(2)} km/s`]);
    specs.push(['ECCENTRICITY', body.el.e.toFixed(4)]);
  } else if (body.periodDays) {
    specs.push(['ORBITAL PERIOD', fmtDuration(body.periodDays)]);
    specs.push(['ORBITAL VELOCITY', `${body.orbVel.toFixed(3)} km/s`]);
  }
  specs.push(['SATELLITES', String(body.moons)]);
  return specs;
}

export function renderBodyPage(body) {
  const p = PROFILES[body.id] || {};
  const stats = statsFor(body);
  const specs = specsFor(body);

  return `
  <div class="bodypage">
    <div class="bp-grid">

      <div class="bp-left">
        <div class="bp-stage">
          <div class="bp-spinhint">LIVE · REAL AXIAL TILT AND SPIN DIRECTION</div>
        </div>
        <h1 class="bp-name">${esc(body.name)}</h1>
        <div class="bp-class">${esc(body.designation)} · <span>${esc(body.class)}</span></div>

        <ul class="bp-facts">
          ${stats.map(([k, v, sub]) => `
            <li>
              <span class="bp-k">${esc(k)}</span>
              <span class="bp-v">${esc(v || '—')}</span>
              ${sub ? `<span class="bp-sub">${esc(sub)}</span>` : ''}
            </li>`).join('')}
        </ul>
      </div>

      <div class="bp-right">
        <section class="bp-block">
          <h2>Description</h2>
          <p>${esc(p.descrip || body.note || '')}</p>
        </section>

        <section class="bp-block bp-fun">
          <h2>Fun fact</h2>
          <p>${esc(p.funFact || '')}</p>
        </section>

        <section class="bp-block">
          <h2>Specifications</h2>
          <dl class="bp-specs">
            ${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
          </dl>
        </section>

        <div id="bp-hemi-note" class="bp-hemi-note"></div>
      </div>

    </div>
  </div>`;
}
