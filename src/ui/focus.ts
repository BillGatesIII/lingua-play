import { clear } from './dom';

/** Re-render a container but keep keyboard focus on the element with the same data-focus key. */
export function renderKeepingFocus(container: HTMLElement, build: () => Node, focusTarget?: string): void {
  const key = (document.activeElement as HTMLElement | null)?.dataset?.focus;
  const liveRegions = new Map(
    Array.from(container.querySelectorAll<HTMLElement>('[data-live]'), (el) => [el.dataset.live!, el]),
  );
  clear(container);
  container.append(build());
  for (const region of container.querySelectorAll<HTMLElement>('[data-live]')) {
    const previous = liveRegions.get(region.dataset.live!);
    if (!previous) continue;
    region.replaceWith(previous);
    for (const attr of Array.from(previous.attributes)) {
      if (!region.hasAttribute(attr.name)) previous.removeAttribute(attr.name);
    }
    for (const attr of Array.from(region.attributes)) previous.setAttribute(attr.name, attr.value);
    previous.replaceChildren(...Array.from(region.childNodes));
  }
  const target = focusTarget ?? key;
  if (target) {
    Array.from(container.querySelectorAll<HTMLElement>('[data-focus]'))
      .find((el) => el.dataset.focus === target)?.focus();
  }
}
