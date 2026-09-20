import { renderSpace } from './space.js';
import { renderGalaxies } from './galaxies.js';
import { renderStars, bindStars } from './stars.js';

const PAGES = {
  space: { title: 'Space', render: renderSpace },
  galaxies: { title: 'The Galaxies', render: renderGalaxies },
  stars: { title: 'The Stars', render: renderStars, bind: bindStars },
};

/**
 * Routes between the live Solar System and the article pages.
 *
 * The pages do not replace the canvas — they sit over it, and the deep sky
 * keeps rendering behind them. Only the Solar System's own objects are hidden,
 * so the backdrop stays alive without the planets competing for attention.
 */
export class Router {
  constructor({ onEnterPage, onLeavePage }) {
    this.onEnterPage = onEnterPage;
    this.onLeavePage = onLeavePage;
    this.route = 'solar';

    this.layer = document.createElement('div');
    this.layer.id = 'page-layer';
    document.body.appendChild(this.layer);

    this.progress = document.createElement('div');
    this.progress.id = 'page-progress';
    document.body.appendChild(this.progress);

    this.closeBtn = document.createElement('button');
    this.closeBtn.id = 'page-close';
    this.closeBtn.innerHTML = '&#8592;&nbsp; SOLAR SYSTEM';
    this.closeBtn.addEventListener('click', () => this.go('solar'));
    document.body.appendChild(this.closeBtn);

    this.layer.addEventListener('scroll', () => this.updateProgress());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.route !== 'solar') this.go('solar');
    });
    window.addEventListener('hashchange', () => this.fromHash());

    this.fromHash();
    this.syncNav();
  }

  updateProgress() {
    const max = this.layer.scrollHeight - this.layer.clientHeight;
    const pct = max > 0 ? (this.layer.scrollTop / max) * 100 : 0;
    this.progress.style.width = `${pct}%`;
  }

  fromHash() {
    const r = (location.hash || '').replace(/^#\/?/, '') || 'solar';
    this.go(PAGES[r] ? r : 'solar', true);
  }

  go(route, fromHash = false) {
    if (route === this.route) return;
    const page = PAGES[route];

    if (!page) {
      this.route = 'solar';
      this.layer.classList.remove('on');
      this.layer.classList.add('closing');
      this.closeBtn.classList.remove('on');
      document.body.classList.remove('page-open');
      this.progress.style.width = '0';
      if (!fromHash) location.hash = '';
      this.onLeavePage?.();
      // clear content after the fade so the transition stays smooth
      setTimeout(() => {
        if (this.route !== 'solar') return;
        this.layer.classList.remove('closing');
        this.layer.innerHTML = '';
      }, 480);
      this.syncNav();
      return;
    }

    this.route = route;
    this.layer.classList.remove('closing');
    this.layer.innerHTML = page.render();
    page.bind?.(this.layer);
    this.armReveal();
    this.layer.scrollTop = 0;
    this.updateProgress();
    this.layer.classList.add('on');
    this.closeBtn.classList.add('on');
    document.body.classList.add('page-open');
    if (!fromHash) location.hash = `/${route}`;
    this.onEnterPage?.(route);
    this.syncNav();
  }

  /**
   * Mark the article's blocks for reveal-on-scroll. Anything already inside
   * the first viewport is revealed immediately, so the top of the page is
   * never blank while you wait for it to animate in.
   */
  armReveal() {
    this.observer?.disconnect();
    const blocks = this.layer.querySelectorAll(
      '.page > h2, .page > h3, .page > p, .page > ul, .page > .cards, .page > .keynums,' +
      '.page > .chart, .page > .table-scroll, .page > .spectrum-bar, .page > .spectrum-ticks,' +
      '.page > .star-row, .page > #star-detail, .page > .page-foot'
    );
    blocks.forEach((el) => el.classList.add('reveal'));

    this.observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        this.observer.unobserve(e.target);
      }
    }, { root: this.layer, rootMargin: '0px 0px -12% 0px', threshold: 0.04 });

    blocks.forEach((el) => this.observer.observe(el));

    // Whatever is already on screen should not wait for a scroll event, and
    // should not wait for a frame either — a backgrounded tab never paints,
    // so this runs off a forced layout instead of requestAnimationFrame.
    void this.layer.offsetHeight;
    const h = this.layer.clientHeight;
    blocks.forEach((el) => {
      if (el.getBoundingClientRect().top < h * 0.96) el.classList.add('in');
    });
  }

  syncNav() {
    document.querySelectorAll('.navbox').forEach((b) => {
      const r = b.dataset.route;
      const active = r === this.route || (r === 'solar' && this.route === 'solar');
      b.classList.toggle('current', active);
      b.classList.remove('locked');
      const state = b.querySelector('.nb-state');
      if (state) state.textContent = active ? 'LIVE' : 'READY';
    });
  }
}
