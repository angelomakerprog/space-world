import * as THREE from 'three';
import { t } from './i18n.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * Looking through a telescope.
 *
 * The camera is genuinely moved to the instrument and pointed at something
 * worth seeing, with the field of view narrowed to match the magnification —
 * so what appears inside the circle is the real scene, not a picture. The
 * overlay supplies the eyepiece: an iris that opens, the aperture shape
 * (hexagonal for Webb, circular for the other two), the diffraction spikes
 * that instrument actually produces, and a reticle.
 */
export class Eyepiece {
  constructor({ camera, controls, warp, scene }) {
    this.camera = camera;
    this.controls = controls;
    this.warp = warp;
    this.scene = scene;
    this.open = false;
    this.scope = null;
    this.build();
  }

  build() {
    const el = document.createElement('div');
    el.id = 'eyepiece';
    el.innerHTML = `
      <div class="ep-iris"></div>
      <svg class="ep-optics" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <radialGradient id="epGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="#9ec7ff" stop-opacity="0"/>
            <stop offset="92%" stop-color="#9ec7ff" stop-opacity=".16"/>
            <stop offset="100%" stop-color="#9ec7ff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <g class="ep-spikes"></g>
        <circle class="ep-halo" cx="500" cy="500" r="392" fill="url(#epGlow)"/>
        <g class="ep-reticle">
          <circle cx="500" cy="500" r="392" fill="none" stroke="rgba(159,212,255,.30)" stroke-width="1.4"/>
          <circle cx="500" cy="500" r="120" fill="none" stroke="rgba(159,212,255,.16)" stroke-width="1"/>
          <line x1="500" y1="80" x2="500" y2="150" stroke="rgba(159,212,255,.45)" stroke-width="1.2"/>
          <line x1="500" y1="850" x2="500" y2="920" stroke="rgba(159,212,255,.45)" stroke-width="1.2"/>
          <line x1="80" y1="500" x2="150" y2="500" stroke="rgba(159,212,255,.45)" stroke-width="1.2"/>
          <line x1="850" y1="500" x2="920" y2="500" stroke="rgba(159,212,255,.45)" stroke-width="1.2"/>
        </g>
      </svg>
      <header class="ep-head">
        <button class="ep-exit" type="button"></button>
        <div class="ep-id"></div>
      </header>
      <footer class="ep-strip"></footer>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector('.ep-exit').addEventListener('click', () => this.close());

    window.addEventListener('keydown', (e) => {
      if (this.open && e.key === 'Escape') this.close();
    });

    // slow drift while looking, so the view is never dead still
    this.drift = 0;
    this.iris = 0;            // 0 shut, 1 fully open
  }

  /** Aperture-appropriate diffraction spikes, drawn from the frame centre. */
  spikeMarkup(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI / n) * 2 * i + (n === 6 ? Math.PI / 2 : Math.PI / 4);
      const dx = Math.cos(a) * 470, dy = Math.sin(a) * 470;
      out.push(`<line x1="${500 - dx}" y1="${500 - dy}" x2="${500 + dx}" y2="${500 + dy}"
        stroke="rgba(190,220,255,.13)" stroke-width="2"/>`);
    }
    return out.join('');
  }

  /**
   * Choose something worth pointing at: the nearest interesting deep-sky
   * object of the right sort, so each instrument shows the kind of thing it
   * was actually built for.
   */
  chooseTarget(scope, hoverTargets) {
    const want = scope.target.kind;
    const pool = hoverTargets.filter((h) => {
      if (want === 'galaxy') return h.meta.kind === 'galaxy';
      if (want === 'deep') return h.meta.kind === 'galaxy' && (h.meta.distanceMly ?? 0) > 200;
      return h.meta.kind === 'supernova' || h.meta.kind === 'galaxy';
    });
    if (!pool.length) return null;
    // deterministic per telescope, so it is the same object every time
    const idx = [...scope.id].reduce((a, c) => a + c.charCodeAt(0), 0) % pool.length;
    return pool[idx];
  }

  show(scopeMeta, hoverTargets, originPos) {
    const scope = scopeMeta.scope;
    this.scope = scope;
    this.savedFov = this.camera.fov;
    this.savedPos = this.camera.position.clone();
    this.savedTarget = this.controls.target.clone();

    const target = this.chooseTarget(scope, hoverTargets);
    const aim = new THREE.Vector3();
    if (target) target.anchor(aim); else aim.set(0, 0, -1000);

    // stand at the instrument and look down its barrel
    this.camera.position.copy(originPos);
    this.controls.target.copy(aim);
    this.camera.lookAt(aim);

    // magnify until the subject fills a useful share of the field — a fixed
    // field of view leaves a nearby remnant overflowing and a distant galaxy
    // as a speck
    let fov = 9;
    if (target) {
      const dist = Math.max(1, originPos.distanceTo(aim));
      const ang = 2 * Math.atan(target.radius() / dist) * 180 / Math.PI;
      fov = THREE.MathUtils.clamp(ang * 2.9, 2.2, 13);
    }
    this.camera.fov = fov;
    this.camera.near = 0.05;
    this.camera.far = 20000;
    this.camera.updateProjectionMatrix();
    this.controls.enabled = false;

    this.el.querySelector('.ep-spikes').innerHTML = this.spikeMarkup(scope.spikes);
    this.el.classList.toggle('hex', scope.look === 'jwst');
    this.el.querySelector('.ep-exit').innerHTML = `&#8592;&nbsp; ${t('scope.exit')}`;
    this.el.querySelector('.ep-id').innerHTML = `
      <b>${esc(scopeMeta.name)}</b>
      <span>${t('scope.eyepiece')} · <b>${esc(scope.stats[0][1])}</b> ${t('scope.aperture').toLowerCase()}</span>`;
    this.el.querySelector('.ep-strip').innerHTML = `
      <span>${t('scope.seeing')} <b>${esc(target ? target.meta.name : 'open sky')}</b></span>
      <span>${esc(scope.target.hint)}</span>
      <span>${t('scope.aperture')} <b>${esc(scope.stats[0][1])}</b></span>`;

    this.open = true;
    document.body.classList.add('eyepiece-open');
    void this.el.offsetHeight;
    this.el.classList.add('on');
    this.drift = 0;
    this.iris = 0;
    this.applyIris();
    this.aim = aim;
    this.origin = originPos.clone();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.classList.remove('on');
    this.el.classList.add('closing');
    document.body.classList.remove('eyepiece-open');
    setTimeout(() => this.el.classList.remove('closing'), 700);

    this.camera.fov = this.savedFov;
    this.camera.updateProjectionMatrix();
    this.controls.enabled = true;
    // pull back out to where we were watching from
    this.warp.flyTo(this.savedTarget, this.savedPos.distanceTo(this.savedTarget), {
      approach: this.savedPos.clone().sub(this.savedTarget).normalize(),
      duration: 1.4,
    });
    this.onClose?.();
  }

  /**
   * The iris is driven from here rather than by a CSS transition. It is a
   * full-screen black mask with a hole in it, so if the animation ever failed
   * to run the result would be a black screen — this way it cannot.
   */
  applyIris() {
    const e = 1 - Math.pow(1 - this.iris, 3);
    // in pixels, not percent, so the hole lines up exactly with the aperture
    // ring drawn in the SVG — which is sized off the shorter viewport edge
    const r = 0.392 * Math.min(window.innerWidth, window.innerHeight);
    this.el.style.setProperty('--ep-r', `${(e * r).toFixed(1)}px`);
    this.el.style.setProperty('--ep-optics', e < 0.55 ? 0 : (e - 0.55) / 0.45);
  }

  update(dt) {
    if (!this.open) {
      if (this.iris > 0) {
        this.iris = Math.max(0, this.iris - dt * 2.2);
        this.applyIris();
      }
      return;
    }
    if (this.iris < 1) {
      this.iris = Math.min(1, this.iris + dt * 1.35);
      this.applyIris();
    }
    // a slow sway, the way a real mount never sits perfectly still
    this.drift += dt;
    const sway = 0.00035;
    this.camera.position.set(
      this.origin.x + Math.sin(this.drift * 0.5) * sway * 40,
      this.origin.y + Math.cos(this.drift * 0.37) * sway * 40,
      this.origin.z
    );
    this.camera.lookAt(this.aim);
  }
}
