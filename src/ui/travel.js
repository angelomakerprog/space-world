import * as THREE from 'three';
import { renderBodyPage, BodyPortrait } from '../pages/body.js';
import { t } from './i18n.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Bodies that get the full illustrated page rather than a card. */
const PAGE_KINDS = new Set(['sun', 'planet', 'moon']);

const KIND_COLOR = {
  sun: '#ffd48a', planet: '#8fc6ff', moon: '#cfd8e6', belt: '#9d9083',
  galaxy: '#a9cdff', blackhole: '#ff9e7a', supernova: '#7dffb2',
  telescope: '#7dffb2', route: '#7dffb2',
};
const KIND_LABEL = {
  sun: 'STAR', planet: 'PLANET', moon: 'MOON', belt: 'SMALL BODIES',
  galaxy: 'GALAXY', blackhole: 'BLACK HOLE', supernova: 'SUPERNOVA',
  telescope: 'TELESCOPE', route: 'CATALOGUE',
};

/**
 * Everything to do with going somewhere: the click and search entry points,
 * the arrival card, and the per-body page.
 *
 * Selection never cuts. Whatever you pick, the camera flies there first —
 * that flight is the only thing that conveys how far apart these objects
 * actually are, and it is worth the second and a half it costs.
 */
export class Travel {
  constructor({ scene, camera, controls, warp, hover, hud, router, home, sky, eyepiece, onOpen, onClose }) {
    this.sky = sky;
    this.eyepiece = eyepiece;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.warp = warp;
    this.hover = hover;
    this.hud = hud;
    this.router = router;
    this.home = home;                 // {pos, target} — the opening framing
    this.onOpen = onOpen;
    this.onClose = onClose;

    this.bodyOpen = false;
    this.portrait = null;
    this.sourceTex = new Map();       // body id -> generated maps
    this.bodies = new Map();          // body id -> catalogue entry

    this.buildDom();
  }

  buildDom() {
    const card = document.createElement('div');
    card.id = 'entity-card';
    document.body.appendChild(card);
    this.card = card;

    const layer = document.createElement('div');
    layer.id = 'body-layer';
    document.body.appendChild(layer);
    this.layer = layer;

    const close = document.createElement('button');
    close.id = 'body-close';
    close.innerHTML = '&#8592;&nbsp; BACK TO THE SYSTEM';
    close.addEventListener('click', () => this.closeBody());
    document.body.appendChild(close);
    this.closeBtn = close;

    // one canvas, reused for every body — a new WebGL context per open would
    // leak them until the browser starts evicting
    this.bpCanvas = document.createElement('canvas');
    this.bpCanvas.id = 'bp-canvas';

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.bodyOpen) this.closeBody();
        else if (this.card.classList.contains('on')) this.hideCard();
      }
    });
  }

  /** Register a body's generated textures so the page can reuse them. */
  registerBody(body, tex) {
    this.bodies.set(body.id, body);
    if (tex) this.sourceTex.set(body.id, tex);
  }

  /* ── going somewhere ───────────────────────────────────────────────── */

  /** How close to stop, and from which side, for each kind of object. */
  arrivalFor(target) {
    const meta = target.meta;
    const pos = new THREE.Vector3();
    target.anchor(pos);
    const r = Math.max(0.001, target.radius());

    if (meta.kind === 'belt') {
      // a belt has no "front" — look down onto the ring from outside it
      return { pos, standoff: r * 1.75, approach: new THREE.Vector3(0.34, 0.86, 0.38).normalize() };
    }

    if (PAGE_KINDS.has(meta.kind) && meta.kind !== 'sun') {
      // arrive on the sunlit side, slightly above, so we meet a lit face
      const toSun = pos.clone().negate().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(toSun, up).normalize();
      const approach = toSun.multiplyScalar(0.72)
        .addScaledVector(up, 0.30)
        .addScaledVector(side, 0.46)
        .normalize();
      return { pos, standoff: r * 4.4, approach };
    }

    if (meta.kind === 'sun') {
      return { pos, standoff: r * 5.2, approach: new THREE.Vector3(0.42, 0.34, 1).normalize() };
    }

    if (meta.kind === 'telescope') {
      // close enough to make out the hardware
      return { pos, standoff: r * 5.5, approach: null };
    }

    // sprites are lit from nowhere in particular — keep the current angle
    return { pos, standoff: r * 3.1, approach: null };
  }

  /** Fly to a hover target and then reveal it. */
  goTo(target, { instant = false } = {}) {
    if (!target) return;
    this.hideCard();
    const { pos, standoff, approach } = this.arrivalFor(target);

    // OrbitControls' global minimum distance would stop us well short of a
    // small planet, so relax it to suit whatever we are arriving at.
    this.controls.minDistance = Math.max(0.4, standoff * 0.32);

    const arrive = () => this.reveal(target);
    if (instant) {
      this.camera.position.copy(pos).addScaledVector(
        approach || this.camera.position.clone().sub(this.controls.target).normalize(), standoff);
      this.controls.target.copy(pos);
      this.camera.lookAt(pos);
      arrive();
      return;
    }
    this.warp.flyTo(pos, standoff, { approach, onArrive: arrive });
  }

  /** Return to the opening view — the "I am lost" button. */
  goHome() {
    this.hideCard();
    if (this.bodyOpen) this.closeBody();
    this.controls.minDistance = 7.5;
    const dir = this.home.pos.clone().normalize();
    this.warp.flyTo(new THREE.Vector3(0, 0, 0), this.home.pos.length(), {
      approach: dir, duration: 1.7,
    });
  }

  reveal(target) {
    const meta = target.meta;
    if (PAGE_KINDS.has(meta.kind) && this.bodies.has(meta.id)) {
      this.openBody(meta.id);
    } else {
      this.showCard(meta, target);
    }
  }

  /* ── the arrival card ──────────────────────────────────────────────── */

  showCard(meta, target) {
    const rows = [];
    if (meta.stats) {
      for (const [k, v] of meta.stats.slice(0, 3)) rows.push(`<span>${esc(k)} <b>${esc(v)}</b></span>`);
    } else if (meta.distanceMly != null) {
      rows.push(`<span>DISTANCE <b>${meta.distanceMly.toLocaleString('en-US')} Mly</b></span>`);
      rows.push(`<span>${t('ui.type', 'TYPE')} <b>${esc(meta.className)}</b></span>`);
    }

    const isScope = meta.kind === 'telescope';
    this.card.innerHTML = `
      <button class="ec-close" type="button">ESC ✕</button>
      <div class="ec-tag"><span>${esc(KIND_LABEL[meta.kind] || 'OBJECT')}</span>${meta.designation ? ' · ' + esc(meta.designation) : ''}</div>
      <h3>${esc(meta.name)}</h3>
      <p>${esc(meta.note || meta.className || '')}</p>
      ${isScope && meta.scope?.body ? `<p class="ec-more">${esc(meta.scope.body)}</p>` : ''}
      ${rows.length ? `<div class="ec-meta">${rows.join('')}</div>` : ''}
      ${isScope ? `<button class="ec-open" type="button">◎&nbsp; ${t('scope.lookThrough')}</button>` : ''}`;
    this.card.querySelector('.ec-close').addEventListener('click', () => this.hideCard());
    this.card.querySelector('.ec-open')?.addEventListener('click', () => {
      const pos = new THREE.Vector3();
      target.anchor(pos);
      this.hideCard();
      this.eyepiece?.show(meta, this.hover.targets, pos);
    });
    void this.card.offsetHeight;   // flush layout so the transition plays
    this.card.classList.add('on');
  }

  hideCard() {
    this.card.classList.remove('on');
  }

  /* ── the body page ─────────────────────────────────────────────────── */

  openBody(id) {
    const body = this.bodies.get(id);
    if (!body) return;

    this.layer.classList.remove('closing');
    this.layer.innerHTML = renderBodyPage(body);
    const stage = this.layer.querySelector('.bp-stage');
    stage.insertBefore(this.bpCanvas, stage.firstChild);

    if (!this.portrait) this.portrait = new BodyPortrait(this.bpCanvas);
    const isEarth = id === 'earth';
    this.portrait.show(body, this.sourceTex.get(id) || null, { hemispheres: isEarth });

    this.portrait.onHemiClick = isEarth ? (hemi, site) => this.onHemisphere(hemi, site) : null;

    this.bodyOpen = true;
    document.body.classList.add('body-open');
    this.closeBtn.classList.add('on');
    void this.layer.offsetHeight;
    this.layer.classList.add('on');
    this.onOpen?.(id);

    // Once the page is up, ease the real camera back out to a system-wide
    // framing. The overlay is already blurring whatever is behind it, so what
    // you read against is the whole Solar System rather than one enormous
    // out-of-focus planet — and closing the page leaves you somewhere useful.
    this.pullBack();
  }

  pullBack() {
    const dir = this.camera.position.clone().normalize();
    if (!dir.lengthSq()) dir.set(0, 0.4, 1).normalize();
    this.warp.flyTo(new THREE.Vector3(0, 0, 0), this.home.pos.length() * 1.05, {
      approach: dir.lerp(this.home.pos.clone().normalize(), 0.55).normalize(),
      duration: 2.8,
    });
  }

  /**
   * Standing on the globe. The clicked point gives a real latitude, which is
   * what decides which half of the celestial sphere is above the horizon —
   * so the sky you get is the sky you would actually see from there, at the
   * simulation's current date and hour.
   */
  onHemisphere(hemi, site) {
    if (!this.sky || !site) return;
    const label = hemi.replace('-', ' ').toUpperCase();
    const note = this.layer.querySelector('#bp-hemi-note');
    if (note) {
      note.textContent = `${label} — descending to ${Math.abs(site.lat).toFixed(1)}° ${site.lat >= 0 ? 'N' : 'S'}…`;
      note.classList.add('on');
    }
    // let the page fade before the sky comes up, so it reads as one move
    this.closeBody();
    setTimeout(() => this.sky.show({ ...site, label }), 320);
  }

  /** The catalogue shortcut: a default vantage rather than a picked one. */
  openSky(site = { lat: 42, lon: 8 }) {
    this.hideCard();
    if (this.bodyOpen) this.closeBody();
    this.sky?.show({ ...site, label: 'CATALOGUE VANTAGE' });
  }

  closeBody() {
    if (!this.bodyOpen) return;
    this.bodyOpen = false;
    this.layer.classList.remove('on');
    this.layer.classList.add('closing');
    this.closeBtn.classList.remove('on');
    document.body.classList.remove('body-open');
    setTimeout(() => {
      if (this.bodyOpen) return;
      this.portrait?.clear();
      if (this.bpCanvas.parentNode) this.bpCanvas.parentNode.removeChild(this.bpCanvas);
      this.layer.classList.remove('closing');
      this.layer.innerHTML = '';
    }, 560);
    this.onClose?.();
  }

  update(dt) {
    if (this.bodyOpen) this.portrait?.update(dt);
  }
}

/* ── search ──────────────────────────────────────────────────────────── */

/**
 * A flat index over every hover target plus the catalogue routes.
 * Ranking is deliberately simple — a prefix match beats a word-start match
 * beats a substring — because the catalogue is small enough that anything
 * fuzzier would just introduce surprises.
 */
export class SearchBar {
  constructor({ targets, routes, onPick, onHome }) {
    this.targets = targets;
    this.routes = routes;
    this.onPick = onPick;
    this.onHome = onHome;
    this.sel = 0;
    this.results = [];
    this.build();
  }

  build() {
    const el = document.createElement('div');
    el.id = 'searchbar';
    el.innerHTML = `
      <ul id="sb-results"></ul>
      <div class="sb-field">
        <span class="sb-icon">⌕</span>
        <input type="text" spellcheck="false" autocomplete="off"
               placeholder="SEARCH — PLANET, GALAXY, BLACK HOLE, “SOLAR SYSTEM” TO RESET" />
        <span class="sb-hint">/</span>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.input = el.querySelector('input');
    this.list = el.querySelector('#sb-results');

    this.input.addEventListener('focus', () => { el.classList.add('focused'); this.run(); });
    this.input.addEventListener('blur', () => {
      el.classList.remove('focused');
      setTimeout(() => this.list.classList.remove('on'), 140);
    });
    this.input.addEventListener('input', () => this.run());
    this.input.addEventListener('keydown', (e) => this.key(e));

    this.list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      e.preventDefault();
      this.choose(Number(li.dataset.i));
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        this.input.focus();
        this.input.select();
      }
    });
  }

  entries() {
    const out = [];
    for (const t of this.targets) {
      out.push({
        name: t.meta.name,
        alt: `${t.meta.designation || ''} ${t.meta.className || ''}`,
        kind: t.meta.kind,
        // the object's own class is more useful than the bucket it sits in —
        // it tells Pluto from Neptune, and a spiral from an elliptical
        kindLabel: (t.meta.className || '').split(' · ')[0] || KIND_LABEL[t.meta.kind],
        target: t,
      });
    }
    for (const r of this.routes) out.push({ name: r.name, alt: r.alt || '', kind: 'route', route: r.id });
    return out;
  }

  score(entry, q) {
    const n = entry.name.toLowerCase();
    const a = entry.alt.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.split(/[\s·-]+/).some((w) => w.startsWith(q))) return 2;
    if (n.includes(q)) return 3;
    if (a.includes(q)) return 4;
    return Infinity;
  }

  run() {
    const q = this.input.value.trim().toLowerCase();
    if (!q) {
      this.results = [];
      this.list.classList.remove('on');
      return;
    }

    // the reset phrase, before anything else gets a chance to match it
    if ('solar system'.startsWith(q) || 'home'.startsWith(q) || 'reset'.startsWith(q)) {
      this.results = [{ name: 'Solar System', kind: 'route', route: '__home', alt: 'reset the view' }];
    } else {
      this.results = [];
    }

    const scored = this.entries()
      .map((e) => ({ e, s: this.score(e, q) }))
      .filter((x) => x.s !== Infinity)
      .sort((a, b) => a.s - b.s || a.e.name.length - b.e.name.length)
      .slice(0, 9)
      .map((x) => x.e);

    for (const e of scored) if (!this.results.some((r) => r.name === e.name)) this.results.push(e);
    this.results = this.results.slice(0, 9);
    this.sel = 0;
    this.render(q);
  }

  render(q) {
    if (!this.results.length) {
      this.list.innerHTML = `<div id="sb-empty">NOTHING MATCHES “${esc(q.toUpperCase())}”</div>`;
      this.list.classList.add('on');
      return;
    }
    this.list.innerHTML = this.results.map((r, i) => {
      const idx = r.name.toLowerCase().indexOf(q);
      const nm = idx >= 0
        ? esc(r.name.slice(0, idx)) + '<em>' + esc(r.name.slice(idx, idx + q.length)) + '</em>' + esc(r.name.slice(idx + q.length))
        : esc(r.name);
      return `<li data-i="${i}" class="${i === this.sel ? 'sel' : ''}">
        <span class="sr-dot" style="background:${KIND_COLOR[r.kind] || '#8fc6ff'}"></span>
        <span class="sr-name">${nm}</span>
        <span class="sr-kind">${esc(r.route === '__home' ? 'RESET VIEW' : (r.kindLabel || KIND_LABEL[r.kind] || ''))}</span>
      </li>`;
    }).join('');
    this.list.classList.add('on');
  }

  key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); this.choose(this.sel); }
    else if (e.key === 'Escape') { this.input.value = ''; this.input.blur(); this.list.classList.remove('on'); }
  }

  move(d) {
    if (!this.results.length) return;
    this.sel = (this.sel + d + this.results.length) % this.results.length;
    [...this.list.querySelectorAll('li')].forEach((li, i) => li.classList.toggle('sel', i === this.sel));
    this.list.querySelector('li.sel')?.scrollIntoView({ block: 'nearest' });
  }

  choose(i) {
    const r = this.results[i];
    if (!r) return;
    this.input.value = '';
    this.input.blur();
    this.list.classList.remove('on');
    if (r.route === '__home') this.onHome();
    else this.onPick(r);
  }
}
