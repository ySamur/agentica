// Scroll ranges inside a sticky scene, measured from the section itself on every refresh,
// so each piece can own its trigger and still line up with the rest of the scene.
const span = (section: HTMLElement) => section.offsetHeight - window.innerHeight;

export function sceneRange(section: HTMLElement, from: number, to: number, scrub: boolean | number) {
  return {
    trigger: section,
    start: () => `top+=${span(section) * from} top`,
    end: () => `top+=${span(section) * to} top`,
    scrub,
    invalidateOnRefresh: true,
  };
}

// The page offset of a point of the scene's progress, to scroll there.
export const sceneOffset = (section: HTMLElement, progress: number) => section.offsetTop + span(section) * progress;

// Blocks already on screen (or scrolled past) when the layer starts stay as they are:
// hiding them now would flash, and nobody would see their entrance anyway.
export const onScreen = (element: Element) => element.getBoundingClientRect().top < window.innerHeight * 0.85;

// Anything clickable only fades in: a control still rising into place would slip out from under the pointer.
const controls = 'a, button, summary, input, textarea, select';
export const rise = (distance: number) => (_index: number, target: Element) => target.matches(controls) || target.querySelector(controls) ? 0 : distance;
