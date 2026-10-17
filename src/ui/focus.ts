import { clear } from './dom';

/** Re-render a container but keep keyboard focus on the element with the same data-focus key. */
export function renderKeepingFocus(container: HTMLElement, build: () => Node): void {
  const key = (document.activeElement as HTMLElement | null)?.dataset?.focus;
  clear(container);
  container.append(build());
  if (key) container.querySelector<HTMLElement>(`[data-focus="${CSS.escape(key)}"]`)?.focus();
}
