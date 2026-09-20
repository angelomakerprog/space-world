/**
 * Catalogue navigation. Every box now routes: the Solar System is the live
 * canvas, the other three open article pages over it.
 */
export function initNav(onRoute) {
  for (const box of document.querySelectorAll('.navbox, .navsub')) {
    box.addEventListener('click', () => onRoute?.(box.dataset.route));
  }
}
