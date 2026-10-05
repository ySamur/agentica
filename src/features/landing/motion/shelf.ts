import { gsap } from 'gsap';
import { libraryTotal, shelfOpened } from '../LibraryShelf';

// As the shelf scrolls through, the counter runs to the whole library and its materials unlock one by one;
// the last opens with the last of the library, while the whole shelf is still on screen. Returns the reset to the static shelf.
export function buildShelf(root: HTMLElement) {
  const shelf = root.querySelector<HTMLElement>('.vault-shelf');
  const count = shelf?.querySelector('.vault-count b');
  if (!shelf || !count) return () => {};
  const items = [...shelf.querySelectorAll('.vault-item')];
  const render = (value: number) => {
    const opened = Math.round(value);
    const rows = shelfOpened + Math.floor((opened - shelfOpened) / (libraryTotal - shelfOpened) * (items.length - shelfOpened));
    count.textContent = String(opened);
    shelf.style.setProperty('--fill', String(opened / libraryTotal));
    items.forEach((item, index) => item.toggleAttribute('data-open', index < rows));
    shelf.toggleAttribute('data-complete', opened === libraryTotal);
  };
  const state = { opened: shelfOpened };
  const draw = () => render(state.opened);
  gsap.to(state, {
    opened: libraryTotal, ease: 'none', onUpdate: draw,
    scrollTrigger: { trigger: shelf, start: 'top 80%', end: 'bottom 85%', scrub: true, onRefresh: draw },
  });
  return () => render(shelfOpened);
}
