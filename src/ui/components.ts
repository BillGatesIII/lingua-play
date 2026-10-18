import type { Bi, Lang } from '../shared/i18n';
import { other } from '../shared/i18n';
import { h, type Child } from './dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonOptions {
  variant?: ButtonVariant;
  onClick?: (e: MouseEvent) => void;
  ariaLabel?: string;
  pressed?: boolean;
  disabled?: boolean;
  large?: boolean;
  href?: string;
  className?: string;
  focusKey?: string;
}

/** Reusable button (or link when `href` is given). */
export function Button(content: Child | Child[], o: ButtonOptions = {}): HTMLElement {
  const cls = ['btn', `btn--${o.variant ?? 'primary'}`, o.large && 'btn--lg', o.className].filter(Boolean).join(' ');
  const kids = Array.isArray(content) ? content : [content];
  if (o.href) return h('a', { class: cls, href: o.href, 'aria-label': o.ariaLabel, 'data-focus': o.focusKey }, ...kids);
  return h(
    'button',
    {
      class: cls,
      type: 'button',
      onclick: o.onClick,
      'aria-label': o.ariaLabel,
      'aria-pressed': o.pressed === undefined ? undefined : String(o.pressed),
      disabled: o.disabled,
      'data-focus': o.focusKey,
    },
    ...kids,
  );
}

export type Tone = 'sun' | 'sea' | 'berry' | 'leaf' | 'plain';

export function Card(children: Child[], tone: Tone = 'plain', className = ''): HTMLElement {
  return h('div', { class: `card card--${tone} ${className}`.trim() }, ...children);
}

export function Panel(title: Child, children: Child[], className = ''): HTMLElement {
  return h('section', { class: `panel ${className}`.trim() }, h('h2', { class: 'panel__title' }, title), ...children);
}

/** Primary-language text with the other language shown smaller beneath. */
export function biText(b: Bi, lang: Lang): HTMLElement {
  return h('span', { class: 'bi' }, h('span', { class: 'bi__main', lang }, b[lang]), h('span', { class: 'bi__sub', lang: other(lang) }, b[other(lang)]));
}
