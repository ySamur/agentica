import type { PointerEvent } from 'react';

// A soft light that follows the pointer across glass cards: the card under the pointer gets
// `--x`/`--y`, and its CSS draws the glow there. One handler on the grid serves every card.
export function spotlight(card: string) {
  return (event: PointerEvent<HTMLElement>) => {
    const target = (event.target as Element).closest<HTMLElement>(card);
    if (!target) return;
    const box = target.getBoundingClientRect();
    target.style.setProperty('--x', `${event.clientX - box.left}px`);
    target.style.setProperty('--y', `${event.clientY - box.top}px`);
  };
}
