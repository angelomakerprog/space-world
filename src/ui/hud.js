import {
  fmtDate, fmtTime, fmtNum, fmtKm, fmtMass, fmtDuration,
  fmtRate, fmtElapsed, fmtLightTime,
} from './format.js';
import { AU_KM, C_KM_S } from '../data/bodies.js';
import { periodDays } from '../core/orbits.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(clock) {
    this.clock = clock;
    this.el = {
      utc: $('m-utc'), jd: $('m-jd'), elapsed: $('m-elapsed'),
      rate: $('m-rate'), rateUnit: $('m-rate-unit'), slider: $('rate-slider'),
      range: $('m-range'), light: $('m-light'), focus: $('m-focus'), fps: $('m-fps'),
      play: $('btn-play'), rev: $('btn-rev'),
      panelTarget: $('panel-target'),
      tName: $('t-name'), tClass: $('t-class'), tNote: $('t-note'),
      tag: $('hover-tag'), tagName: $('hover-tag-name'), tagSub: $('hover-tag-sub'),
    };

    // the TARGET panel's rows are filled positionally, so grab them in order
    this.rowEls = [...document.querySelectorAll('#target-rows .row')].map((el) => ({
      el, k: el.querySelector('.k'), v: el.querySelector('.v'),
    }));

    this.el.slider.value = String(Math.round(clock.sliderT * 1000));
    this.el.slider.addEventListener('input', () => {
      clock.sliderT = Number(this.el.slider.value) / 1000;
      this.syncPresets();
    });

    document.querySelectorAll('#panel-flow .btns button').forEach((b) => {
      b.addEventListener('click', () => this.action(b.dataset.act));
    });
    document.querySelectorAll('#panel-flow .presets button').forEach((b) => {
      b.addEventListener('click', () => {
        clock.setRate(Number(b.dataset.rate));
        this.syncSlider();
        this.syncPresets();
      });
    });

    this.syncButtons();
    this.syncPresets();
    this._lastTargetId = null;
  }

  action(act) {
    const c = this.clock;
    if (act === 'play') c.paused = !c.paused;
    else if (act === 'faster') { c.step(2); this.syncSlider(); }
    else if (act === 'slower') { c.step(0.5); this.syncSlider(); }
    else if (act === 'reverse') c.dir *= -1;
    else if (act === 'now') c.reset();
    this.syncButtons();
    this.syncPresets();
  }

  syncSlider() {
    this.el.slider.value = String(Math.round(this.clock.sliderT * 1000));
  }
  syncButtons() {
    this.el.play.classList.toggle('on', this.clock.paused);
    this.el.play.innerHTML = this.clock.paused ? '&#9654;' : '&#9646;&#9646;';
    this.el.rev.classList.toggle('rev-on', this.clock.dir < 0);
  }
  syncPresets() {
    const r = this.clock.rate;
    document.querySelectorAll('#panel-flow .presets button').forEach((b) => {
      b.classList.toggle('on', Math.abs(Number(b.dataset.rate) - r) / r < 0.01);
    });
  }

  /** Per-frame numbers. */
  update(camDistUnits, camDistAu, fps) {
    const c = this.clock;
    const d = c.date;
    const ok = isFinite(d.getTime());
    this.el.utc.textContent = ok ? `${fmtDate(d)} ${fmtTime(d)}` : '—';
    this.el.jd.textContent = c.jd.toFixed(4);
    this.el.elapsed.textContent = fmtElapsed(c.elapsedDays);

    const [rv, ru] = fmtRate(c.rate);
    this.el.rate.textContent = rv;
    this.el.rateUnit.textContent = ru;

    const km = camDistAu * AU_KM;
    this.el.range.textContent = camDistAu < 0.02
      ? fmtKm(km)
      : `${camDistAu.toFixed(3)} AU`;
    this.el.light.textContent = fmtLightTime(km / C_KM_S);
    this.el.fps.textContent = `${Math.round(fps)} FPS`;
  }

  setFocus(text) {
    this.el.focus.textContent = text;
  }

  /**
   * Fill the TARGET panel from whatever is hovered.
   * Everything is driven through one list of label/value pairs, so a planet,
   * a belt, a galaxy and a black hole all render through the same path.
   */
  setTarget(meta) {
    const e = this.el;
    if (!meta) {
      if (this._lastTargetId === null) return;
      this._lastTargetId = null;
      e.panelTarget.classList.remove('live');
      e.panelTarget.classList.add('dim');
      e.tName.textContent = 'NO SELECTION';
      e.tClass.textContent = '—';
      e.tNote.textContent = '';
      this.fillRows([]);
      e.tag.classList.remove('on');
      return;
    }
    if (this._lastTargetId === meta.id) return;
    this._lastTargetId = meta.id;

    e.panelTarget.classList.add('live');
    e.panelTarget.classList.remove('dim');
    e.tName.textContent = meta.name.toUpperCase();
    e.tClass.textContent = meta.designation || '';
    e.tNote.textContent = meta.note || '';

    this.fillRows(this.rowsFor(meta));
  }

  /** Write pairs into the fixed row slots and hide whatever is left over. */
  fillRows(pairs) {
    this.rowEls.forEach((row, i) => {
      const p = pairs[i];
      if (!p) { row.el.style.display = 'none'; return; }
      row.el.style.display = '';
      row.k.textContent = p[0];
      row.v.textContent = p[1];
    });
  }

  /** Build the label/value list appropriate to this kind of object. */
  rowsFor(meta) {
    const b = meta.body;

    if (meta.stats) return meta.stats;          // belts, black holes, supernovae

    if (meta.kind === 'galaxy') {
      const ly = meta.distanceMly * 1e6;
      return [
        ['DISTANCE', `${fmtNum(meta.distanceMly, 3)} Mly`],
        ['', `${fmtNum(ly * 9.4607e12, 3)} km`],
        ['MORPHOLOGY', meta.className],
        ['LOOKBACK TIME', `${fmtNum(meta.distanceMly, 3)} Myr`],
        ['REDSHIFT z', meta.distanceMly > 1000 ? '≈ ' + (meta.distanceMly / 13800).toFixed(3) : '< 0.01'],
      ];
    }

    if (!b) return [];

    const rows = [
      ['MEAN RADIUS', fmtKm(b.radiusKm)],
      ['MASS', fmtMass(b.massKg)],
    ];

    if (meta.kind === 'sun') {
      rows.push(
        ['SPECTRAL CLASS', b.class],
        ['GALACTIC ORBIT', '≈ 230 Myr'],
        ['LUMINOSITY', '3.828 × 10²⁶ W'],
      );
    } else if (meta.kind === 'moon') {
      rows.push(
        ['SEMI-MAJOR AXIS', fmtKm(b.aKm)],
        ['ORBITAL PERIOD', fmtDuration(b.periodDays)],
        ['ORBITAL VELOCITY', `${b.orbVel.toFixed(3)} km/s`],
      );
    } else {
      rows.push(
        ['SEMI-MAJOR AXIS', `${b.el.a.toFixed(5)} AU`],
        ['', `${fmtNum(b.el.a * AU_KM, 3)} km`],
        ['ORBITAL PERIOD', fmtDuration(periodDays(b.el.a))],
        ['ORBITAL VELOCITY', `${b.orbVel.toFixed(2)} km/s`],
      );
    }

    rows.push(
      ['SIDEREAL DAY', fmtDuration(Math.abs(b.rotationDays)) + (b.rotationDays < 0 ? ' ↺' : '')],
      ['AXIAL TILT', `${b.tiltDeg.toFixed(2)}°`],
      ['MEAN TEMP', `${b.tempC > 0 ? '+' : ''}${b.tempC} °C`],
      ['GRAVITY', `${b.gravity.toFixed(2)} m/s²`],
      ['SATELLITES', String(b.moons)],
    );
    return rows;
  }

  /** Floating label that follows the cursor. */
  setTag(meta, x, y) {
    const e = this.el;
    if (!meta) { e.tag.classList.remove('on'); return; }
    e.tagName.textContent = meta.name;
    e.tagSub.textContent = meta.className || meta.designation || '';
    e.tag.style.left = `${x}px`;
    e.tag.style.top = `${y}px`;
    e.tag.classList.add('on');
  }
}
