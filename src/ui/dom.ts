export type Child = Node | string | null | false | undefined;
type Props = Record<string, string | boolean | number | null | undefined | ((e: any) => void)>;

/** Tiny hyperscript helper: builds elements with textContent only (never innerHTML). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function' && k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v === 'function') continue;
    else if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) if (c !== null && c !== false && c !== undefined) el.append(c);
}

export const clear = (el: Element): void => el.replaceChildren();
