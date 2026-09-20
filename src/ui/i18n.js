/**
 * Two-language support.
 *
 * English is the source language: it lives in the data files and in the page
 * templates, so `t(key, fallback)` returns the fallback untouched when the
 * language is English. Only French needs a dictionary. Anything not yet
 * translated falls through to the English text rather than to a missing-key
 * placeholder, so a partial dictionary degrades quietly.
 */

const STORE_KEY = 'space-world-lang';

let lang = 'en';
try {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved === 'fr' || saved === 'en') lang = saved;
} catch { /* private mode, or storage disabled */ }

const listeners = new Set();

export function getLang() { return lang; }

export function setLang(next) {
  if (next !== 'en' && next !== 'fr') return;
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(STORE_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key. `fallback` is the English text when there is one. */
export function t(key, fallback) {
  if (lang === 'fr') {
    const v = FR[key];
    if (v !== undefined) return v;
  }
  if (fallback !== undefined) return fallback;
  const en = EN[key];
  return en !== undefined ? en : key;
}

/** For prose that only exists as a pair of long strings. */
export function pick(en, fr) {
  return lang === 'fr' && fr ? fr : en;
}

/* ── interface strings ───────────────────────────────────────────────── */

const EN = {
  'lang.toggle': 'LANGUAGE',

  'sky.leave': 'LEAVE THE SKY',
  'sky.observer': 'OBSERVER',
  'sky.lst': 'LOCAL SIDEREAL',
  'sky.epoch': 'EPOCH',
  'sky.standAt': 'STAND AT',
  'sky.longitude': 'LONGITUDE',
  'sky.jumpTo': 'CONSTELLATIONS UP NOW',
  'sky.noneUp': 'nothing above the horizon',
  'sky.myth': 'THE STORY',
  'sky.mag': 'MAGNITUDE',
  'sky.hint.look': 'look around',
  'sky.hint.zoom': 'zoom',
  'sky.hint.hover': 'name a star or figure',
  'sky.hint.click': 'open its story',
  'sky.hint.esc': 'back',
  'sky.key.drag': 'DRAG',
  'sky.key.scroll': 'SCROLL',
  'sky.key.hover': 'HOVER',
  'sky.key.click': 'CLICK',
  'sky.vantage.arctic': 'ARCTIC 68°N',
  'sky.vantage.north': 'NORTH 45°N',
  'sky.vantage.tropicN': 'TROPIC 20°N',
  'sky.vantage.equator': 'EQUATOR 0°',
  'sky.vantage.tropicS': 'TROPIC 25°S',
  'sky.vantage.south': 'SOUTH 45°S',
  'sky.vantage.antarctic': 'ANTARCTIC 68°S',
  'sky.vantage.custom': 'CHOSEN VANTAGE',

  'scope.lookThrough': 'LOOK THROUGH',
  'scope.exit': 'STEP BACK',
  'scope.aperture': 'APERTURE',
  'scope.launched': 'LAUNCHED',
  'scope.orbit': 'ORBIT',
  'scope.status': 'STATUS',
  'scope.seeing': 'POINTING AT',
  'scope.eyepiece': 'THROUGH THE EYEPIECE',

  'ui.back': 'BACK',
  'ui.backSystem': 'BACK TO THE SYSTEM',
  'ui.xEarth': '× Earth',
  'ui.type': 'TYPE',
};

const FR = {
  'lang.toggle': 'LANGUE',

  'sky.leave': 'QUITTER LE CIEL',
  'sky.observer': 'OBSERVATEUR',
  'sky.lst': 'TEMPS SIDÉRAL',
  'sky.epoch': 'ÉPOQUE',
  'sky.standAt': 'SE PLACER À',
  'sky.longitude': 'LONGITUDE',
  'sky.jumpTo': 'CONSTELLATIONS VISIBLES',
  'sky.noneUp': 'rien au-dessus de l’horizon',
  'sky.myth': 'LA LÉGENDE',
  'sky.mag': 'MAGNITUDE',
  'sky.hint.look': 'regarder autour',
  'sky.hint.zoom': 'zoomer',
  'sky.hint.hover': 'nommer une étoile ou une figure',
  'sky.hint.click': 'ouvrir sa légende',
  'sky.hint.esc': 'retour',
  'sky.key.drag': 'GLISSER',
  'sky.key.scroll': 'MOLETTE',
  'sky.key.hover': 'SURVOL',
  'sky.key.click': 'CLIC',
  'sky.vantage.arctic': 'ARCTIQUE 68°N',
  'sky.vantage.north': 'NORD 45°N',
  'sky.vantage.tropicN': 'TROPIQUE 20°N',
  'sky.vantage.equator': 'ÉQUATEUR 0°',
  'sky.vantage.tropicS': 'TROPIQUE 25°S',
  'sky.vantage.south': 'SUD 45°S',
  'sky.vantage.antarctic': 'ANTARCTIQUE 68°S',
  'sky.vantage.custom': 'POSITION CHOISIE',

  'scope.lookThrough': 'REGARDER DEDANS',
  'scope.exit': 'RECULER',
  'scope.aperture': 'OUVERTURE',
  'scope.launched': 'LANCEMENT',
  'scope.orbit': 'ORBITE',
  'scope.status': 'ÉTAT',
  'scope.seeing': 'POINTÉ VERS',
  'scope.eyepiece': 'DANS L’OCULAIRE',

  'ui.back': 'RETOUR',
  'ui.backSystem': 'RETOUR AU SYSTÈME',
  'ui.xEarth': '× la Terre',
  'ui.type': 'TYPE',
};

/** Merge extra dictionary entries (page and data translations load these). */
export function addFrench(entries) {
  Object.assign(FR, entries);
}
export function addEnglish(entries) {
  Object.assign(EN, entries);
}

/* ── prose translation ───────────────────────────────────────────────── */

/**
 * Long-form text is translated by matching the rendered English against a
 * dictionary keyed by that English, rather than by threading a key through
 * every template. The page templates stay readable, nothing has to be kept in
 * sync by hand, and an untranslated paragraph simply stays in English.
 */
const PROSE = new Map();

export function addProse(pairs) {
  for (const [en, fr] of pairs) PROSE.set(norm(en), fr);
}

function norm(html) {
  return String(html).replace(/\s+/g, ' ').trim();
}

// `text` reaches the labels inside the SVG charts, which are as much prose
// as anything in the articles
const PROSE_TAGS = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,span,em,b,button,div,text';

/**
 * Swap translatable blocks inside a freshly-rendered subtree. Elements are
 * matched on their whole inner HTML, so inline markup survives intact.
 */
export function translateTree(root) {
  if (!root) return;
  if (lang !== 'fr') return;
  for (const el of root.querySelectorAll(PROSE_TAGS)) {
    // never rewrite a block that owns a live hook — replacing innerHTML would
    // drop the element some other module holds a reference to
    if (el.querySelector('[id]')) continue;
    const key = norm(el.innerHTML);
    if (!key) continue;
    const fr = PROSE.get(key);
    if (fr === undefined || fr === key) continue;   // identity would re-loop
    if (!el.dataset.i18nEn) el.dataset.i18nEn = el.innerHTML;
    el.innerHTML = fr;
  }
  translateLabels(root);
}

/**
 * A second pass for text sitting alongside a live hook — `TARGET <em id=…>`
 * and the like, where rewriting the parent would throw away the element
 * another module updates every frame. Only whole labels are matched.
 */
function translateLabels(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const raw = n.nodeValue;
    const key = raw.trim();
    if (key.length < 2 || key.length > 40) continue;
    const fr = PROSE.get(key);
    if (fr === undefined || fr === key || /[<]/.test(fr)) continue;
    hits.push([n, raw.replace(key, fr)]);
  }
  for (const [n, v] of hits) n.nodeValue = v;
}

/** Put a subtree back into English, for when the switch flips the other way. */
export function untranslateTree(root) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n-en]')) {
    el.innerHTML = el.dataset.i18nEn;
    delete el.dataset.i18nEn;
  }
}
