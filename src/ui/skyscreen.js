import * as THREE from 'three';
import { SkyView } from '../gfx/sky.js';
import { t } from './i18n.js';

const DEG = Math.PI / 180;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Latitudes worth standing at — enough to reach every part of the sphere. */
const VANTAGES = [
  { lat: 68, key: 'sky.vantage.arctic' },
  { lat: 45, key: 'sky.vantage.north' },
  { lat: 20, key: 'sky.vantage.tropicN' },
  { lat: 0, key: 'sky.vantage.equator' },
  { lat: -25, key: 'sky.vantage.tropicS' },
  { lat: -45, key: 'sky.vantage.south' },
  { lat: -68, key: 'sky.vantage.antarctic' },
];

/**
 * The from-the-ground sky: chrome, pointer handling, hover labels and the
 * constellation panel.
 *
 * The view itself is a real celestial sphere rotated for the observer's
 * latitude and the simulation's sidereal time, so what is above the horizon
 * is what would actually be above it — change the date and different
 * constellations rise.
 */
export class SkyScreen {
  constructor(renderer, clock) {
    this.renderer = renderer;
    this.clock = clock;
    this.view = null;
    this.open = false;
    this.buildDom();
  }

  buildDom() {
    const el = document.createElement('div');
    el.id = 'sky-layer';
    el.innerHTML = `
      <div id="sky-label"><span></span><em></em></div>

      <header id="sky-head">
        <button id="sky-close" type="button"></button>
        <div id="sky-site"></div>
      </header>

      <div id="sky-vantage">
        <div class="sv-title"></div>
        <div class="sv-lats"></div>
        <div class="sv-lon">
          <button data-lon="-45" type="button">&#9666;</button>
          <span class="sv-lonval"></span>
          <button data-lon="45" type="button">&#9656;</button>
        </div>
        <button id="sky-list-toggle" type="button"></button>
        <ul id="sky-list"></ul>
      </div>

      <div id="sky-compass"></div>

      <aside id="sky-info">
        <button class="sky-info-close" type="button">✕</button>
        <h3></h3>
        <div class="sky-abbr"></div>
        <p class="sky-note"></p>
        <div class="sky-myth">
          <h4></h4>
          <p></p>
        </div>
        <dl></dl>
      </aside>

      <footer id="sky-hints"></footer>`;
    document.body.appendChild(el);

    this.el = el;
    this.canvas = el;                       // the sky draws into the main canvas
    this.label = el.querySelector('#sky-label');
    this.site = el.querySelector('#sky-site');
    this.compass = el.querySelector('#sky-compass');
    this.info = el.querySelector('#sky-info');
    this.vantage = el.querySelector('#sky-vantage');
    this.list = el.querySelector('#sky-list');

    el.querySelector('#sky-close').addEventListener('click', () => this.close());
    el.querySelector('.sky-info-close').addEventListener('click', () => this.clearSelection());

    this.vantage.querySelector('.sv-lats').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.reObserve(Number(b.dataset.lat), this.siteInfo.lon);
    });
    this.vantage.querySelector('.sv-lon').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const lon = ((this.siteInfo.lon + Number(b.dataset.lon) + 540) % 360) - 180;
      this.reObserve(this.siteInfo.lat, lon);
    });
    el.querySelector('#sky-list-toggle').addEventListener('click', () => {
      this.list.classList.toggle('on');
    });
    this.list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const fig = this.view.figures.find((f) => f.con.id === li.dataset.id);
      if (!fig) return;
      this.view.aimAt(fig);
      this.select(fig);
      this.list.classList.remove('on');
    });

    let dragging = false, moved = 0, lx = 0, ly = 0;
    // The look-around handlers live on the layer itself, so the chrome sits
    // inside them. Without this guard, pressing a control starts a drag and
    // captures the pointer, and the button's own click never lands.
    const onChrome = (e) => !!e.target.closest(
      '#sky-head, #sky-info, #sky-hints, #sky-compass, #sky-vantage');

    this.canvas.addEventListener('pointerdown', (e) => {
      if (onChrome(e)) return;
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
      this.el.classList.add('dragging');
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      this.el.classList.remove('dragging');
      // a press that did not turn into a drag is a selection
      if (moved < 5 && this.hit) this.select(this.hit.fig || null, this.hit);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
      this.pointerPx = { x: e.clientX, y: e.clientY };
      if (!dragging || !this.view) return;
      moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      const k = (this.view.camera.fov / 62) * 0.0032;
      this.view.look(-(e.clientX - lx) * k, (e.clientY - ly) * k);
      lx = e.clientX; ly = e.clientY;
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointer = null; });
    this.canvas.addEventListener('wheel', (e) => {
      if (onChrome(e)) return;
      e.preventDefault();
      this.view?.zoom(Math.sign(e.deltaY) * 4);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') {
        if (this.view?.selected) this.clearSelection();
        else this.close();
      }
    });
  }

  ensureView() {
    // Built on first use — the star field costs a moment, and most visits
    // never open the sky at all.
    if (!this.view) this.view = new SkyView(this.renderer);
  }

  /** @param {object} site {lat, lon, label} */
  show(site) {
    this.ensureView();
    this.siteInfo = { ...site };
    this.applyObserver();
    this.view.az = 0;
    this.view.alt = 26 * DEG;
    this.view.fov = 62;
    this.view.camera.fov = 62;
    this.view.select(null);

    this.open = true;
    document.body.classList.add('sky-open');
    void this.el.offsetHeight;
    this.el.classList.add('on');
    this.resize();
    this.renderChrome();
    this.setInfo(null);
  }

  /** Move the observer without leaving the sky. */
  reObserve(lat, lon) {
    this.siteInfo.lat = lat;
    this.siteInfo.lon = lon;
    this.siteInfo.label = t('sky.vantage.custom');
    this.applyObserver();
    this.renderChrome();
    // whatever was selected may now be under our feet
    if (this.view.selected && !this.view.isUp(this.view.selected)) this.clearSelection();
  }

  applyObserver() {
    this.view.setObserver(this.siteInfo.lat, this.siteInfo.lon, this.clock.jd);
  }

  renderChrome() {
    const s = this.siteInfo;
    const hemi = s.lat >= 0 ? 'N' : 'S';
    const ew = s.lon >= 0 ? 'E' : 'W';
    this.site.innerHTML = `
      <span>${t('sky.observer')} <b>${Math.abs(s.lat).toFixed(1)}° ${hemi} · ${Math.abs(s.lon).toFixed(1)}° ${ew}</b></span>
      <span>${t('sky.lst')} <b>${this.fmtLst(this.view.lst)}</b></span>
      <span>${t('sky.epoch')} <b>${this.clock.date.toISOString().slice(0, 16).replace('T', ' ')} UTC</b></span>`;

    this.el.querySelector('#sky-close').innerHTML = `&#8592;&nbsp; ${t('sky.leave')}`;
    this.vantage.querySelector('.sv-title').textContent = t('sky.standAt');
    this.vantage.querySelector('.sv-lats').innerHTML = VANTAGES.map((v) => `
      <button data-lat="${v.lat}" class="${Math.abs(v.lat - s.lat) < 3 ? 'on' : ''}" type="button">
        ${t(v.key)}</button>`).join('');
    this.vantage.querySelector('.sv-lonval').textContent =
      `${t('sky.longitude')} ${Math.abs(s.lon).toFixed(0)}° ${ew}`;
    this.el.querySelector('#sky-list-toggle').textContent = t('sky.jumpTo');

    // only offer constellations that are actually up right now
    const up = this.view.figures.filter((f) => this.view.isUp(f))
      .sort((a, b) => a.con.name.localeCompare(b.con.name));
    this.list.innerHTML = up.map((f) => `
      <li data-id="${f.con.id}"><span>${esc(f.con.name)}</span><em>${f.con.abbr}</em></li>`).join('')
      || `<li class="sky-list-empty">${t('sky.noneUp')}</li>`;

    this.el.querySelector('#sky-hints').innerHTML = [
      [t('sky.key.drag', 'DRAG'), t('sky.hint.look')],
      [t('sky.key.scroll', 'SCROLL'), t('sky.hint.zoom')],
      [t('sky.key.hover', 'HOVER'), t('sky.hint.hover')],
      [t('sky.key.click', 'CLICK'), t('sky.hint.click')],
      ['ESC', t('sky.hint.esc')],
    ].map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('');
  }

  fmtLst(h) {
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.classList.remove('on');
    this.el.classList.add('closing');
    document.body.classList.remove('sky-open');
    setTimeout(() => this.el.classList.remove('closing'), 560);
    this.onClose?.();
  }

  select(fig, hit) {
    if (!fig && hit?.kind === 'star' && hit.con) {
      fig = this.view.figures.find((f) => f.con === hit.con);
    }
    this.view.select(fig || null);
    this.setInfo(fig ? { kind: 'figure', fig, con: fig.con } : null, true);
  }

  clearSelection() {
    this.view.select(null);
    this.setInfo(null, true);
  }

  /**
   * The panel. Hovering shows the short note; clicking pins it and adds the
   * myth the figure was named for.
   */
  setInfo(hit, pinned = false) {
    if (!hit) {
      if (this.view?.selected) return;      // a pinned panel stays put
      this.info.classList.remove('on', 'pinned');
      return;
    }
    const c = hit.con;
    if (!c) { this.info.classList.remove('on', 'pinned'); return; }

    this.info.querySelector('h3').textContent = c.name;
    this.info.querySelector('.sky-abbr').textContent = `${c.abbr} · ${t('con.' + c.id + '.meaning', c.meaning)}`;
    this.info.querySelector('.sky-note').textContent = t('con.' + c.id + '.note', c.note);

    const mythBlock = this.info.querySelector('.sky-myth');
    if (pinned || this.view.selected) {
      mythBlock.querySelector('h4').textContent = t('sky.myth');
      mythBlock.querySelector('p').textContent = t('con.' + c.id + '.myth', c.myth);
      mythBlock.classList.add('on');
    } else {
      mythBlock.classList.remove('on');
    }

    const named = c.stars.slice().sort((a, b) => a[2] - b[2]).slice(0, 5);
    this.info.querySelector('dl').innerHTML = named.map((s) =>
      `<div><dt>${esc(s[3])}</dt><dd>mag ${s[2].toFixed(2)}</dd></div>`).join('');

    this.info.classList.add('on');
    this.info.classList.toggle('pinned', !!this.view.selected);
  }

  resize() {
    this._w = Math.max(1, window.innerWidth);
    this._h = Math.max(1, window.innerHeight);
  }

  update(dt) {
    if (!this.open || !this.view) return;
    this.resize();
    this.view.update(dt, this._w, this._h);

    const hit = this.pointer ? this.view.pick(this.pointer) : null;
    this.hit = hit;
    this.view.setHover(hit);
    if (!this.view.selected) this.setInfo(hit);

    if (hit && this.pointerPx) {
      const name = hit.kind === 'star' ? hit.star.name : hit.con.name;
      const sub = hit.kind === 'star'
        ? `${t('sky.mag')} ${hit.star.mag.toFixed(2)}${hit.con ? ' · ' + hit.con.abbr : ''}`
        : `${hit.con.abbr} · ${t('con.' + hit.con.id + '.meaning', hit.con.meaning)}`;
      this.label.querySelector('span').textContent = name;
      this.label.querySelector('em').textContent = sub;
      this.label.style.left = `${this.pointerPx.x}px`;
      this.label.style.top = `${this.pointerPx.y}px`;
      this.label.classList.add('on');
      this.el.classList.add('pickable');
    } else {
      this.label.classList.remove('on');
      this.el.classList.remove('pickable');
    }

    this.view.render();

    const hd = this.view.heading;
    this.compass.innerHTML = `<b>${hd.name}</b><span>${hd.deg.toFixed(0)}°</span>
      <em>ALT ${(this.view.alt / DEG).toFixed(0)}°</em>`;
  }
}
