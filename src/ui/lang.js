import {
  getLang, setLang, onLangChange, addFrench, addProse,
  translateTree, untranslateTree,
} from './i18n.js';
import { FR_SKY, FR_SKY_NAMES } from '../data/fr-sky.js';
import { FR_CONTENT } from '../data/fr-content.js';
import { FR_PAGES } from '../data/fr-pages.js';

/** Interface chrome that lives in index.html rather than in a template. */
const FR_CHROME = [
  ['CATALOGUE', 'CATALOGUE'],
  ['Space', 'L’Espace'],
  ['Solar System', 'Système solaire'],
  ['The Galaxies', 'Les Galaxies'],
  ['The Stars', 'Les Étoiles'],
  ['Constellations', 'Constellations'],
  ['READY', 'PRÊT'],
  ['LIVE', 'EN DIRECT'],
  ['SKY', 'CIEL'],
  ['EPOCH', 'ÉPOQUE'],
  ['JULIAN DAY', 'JOUR JULIEN'],
  ['TIME FLOW', 'ÉCOULEMENT DU TEMPS'],
  ['NOW', 'MAINTENANT'],
  ['OBSERVER', 'OBSERVATEUR'],
  ['RANGE TO SOL', 'DISTANCE AU SOLEIL'],
  ['LIGHT DELAY', 'DÉLAI LUMIÈRE'],
  ['FOCUS', 'CIBLE'],
  ['FRAME', 'IMAGES'],
  ['NO SELECTION', 'AUCUNE SÉLECTION'],
  ['SOL SYSTEM', 'SYSTÈME SOL'],
  ['STANDBY', 'EN ATTENTE'],
  ['orbit', 'orbiter'],
  ['pan', 'déplacer'],
  ['zoom', 'zoomer'],
  ['recentre', 'recentrer'],
  ['pause', 'pause'],
  ['rate', 'vitesse'],
  ['orbits', 'orbites'],
  ['labels', 'étiquettes'],
  ['reset the view', 'réinitialiser la vue'],
  ['TARGET', 'CIBLE'],
  ['MISSION T+', 'MISSION T+'],
  ['<b>DRAG</b> orbit', '<b>GLISSER</b> orbiter'],
  ['<b>WASD</b> pan', '<b>WASD</b> déplacer'],
  ['<b>RIGHT-DRAG</b> pan', '<b>CLIC DROIT</b> déplacer'],
  ['<b>SCROLL</b> zoom', '<b>MOLETTE</b> zoomer'],
  ['<b>C</b> recentre', '<b>C</b> recentrer'],
  ['<b>SPACE</b> pause', '<b>ESPACE</b> pause'],
  ['<b>, .</b> rate', '<b>, .</b> vitesse'],
  ['<b>O</b> orbits', '<b>O</b> orbites'],
  ['<b>L</b> labels', '<b>L</b> étiquettes'],
];

/** Attribute-borne strings, which the innerHTML matcher cannot reach. */
const FR_ATTR = {
  'SEARCH — PLANET, GALAXY, BLACK HOLE, “SOLAR SYSTEM” TO RESET':
    'RECHERCHE — PLANÈTE, GALAXIE, TROU NOIR, « SYSTÈME SOLAIRE » POUR REVENIR',
  'Jump to real now (N)': 'Revenir à l’instant présent (N)',
};

let started = false;

/**
 * Wire up the language switch.
 *
 * Most of the site is rendered from templates that run once, and several
 * panels are injected later — the star class panel, the entity card, the
 * constellation story. Rather than ask every one of them to re-render on a
 * language change, a single observer translates whatever appears. It is a
 * few hundred string comparisons per injection, which is nothing next to a
 * frame of WebGL.
 */
export function initLanguage() {
  if (started) return;
  started = true;

  addFrench(FR_SKY);
  addProse(FR_SKY_NAMES);
  addProse(FR_CHROME);
  addProse(FR_CONTENT);
  addProse(FR_PAGES);

  const el = document.createElement('div');
  el.id = 'lang-switch';
  el.innerHTML = `
    <button type="button" data-lang="en">EN</button>
    <button type="button" data-lang="fr">FR</button>`;
  document.body.appendChild(el);

  const paint = () => {
    const cur = getLang();
    for (const b of el.querySelectorAll('button')) {
      b.classList.toggle('on', b.dataset.lang === cur);
    }
    document.documentElement.lang = cur;
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    setLang(b.dataset.lang);
  });

  onLangChange(() => {
    paint();
    if (getLang() === 'fr') { applyAttrs('fr'); translateTree(document.body); }
    else { untranslateTree(document.body); applyAttrs('en'); }
  });

  paint();

  // Keep translating whatever the app injects after the first render. The
  // coalescing timer is a timeout rather than a frame callback: a backgrounded
  // tab never runs rAF, and a panel injected there would stay in English until
  // the tab came forward again.
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued || getLang() !== 'fr') return;
    queued = true;
    setTimeout(() => {
      queued = false;
      translateTree(document.body);
      applyAttrs('fr');
    }, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (getLang() === 'fr') { applyAttrs('fr'); translateTree(document.body); }
}

/** Placeholders and tooltips, which have no text node to match against. */
function applyAttrs(lang) {
  for (const node of document.querySelectorAll('[placeholder], [title]')) {
    for (const attr of ['placeholder', 'title']) {
      const v = node.getAttribute(attr);
      if (v == null) continue;
      if (lang === 'fr') {
        const fr = FR_ATTR[v];
        if (fr) { node.dataset[`en${attr}`] = v; node.setAttribute(attr, fr); }
      } else {
        const en = node.dataset[`en${attr}`];
        if (en) { node.setAttribute(attr, en); delete node.dataset[`en${attr}`]; }
      }
    }
  }
}
