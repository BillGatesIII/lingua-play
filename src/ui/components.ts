import { addHoverVoice } from '../shared/voice';
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
  /** Optional English phrase spoken on mouseover (with speech bubble). */
  voiceHover?: string | (() => string);
}

/** Reusable button (or link when `href` is given). */
export function Button(content: Child | Child[], o: ButtonOptions = {}): HTMLElement {
  const cls = ['btn', `btn--${o.variant ?? 'primary'}`, o.large && 'btn--lg', o.className].filter(Boolean).join(' ');
  const kids = Array.isArray(content) ? content : [content];
  const el = o.href
    ? h('a', { class: cls, href: o.href, onclick: o.onClick, 'aria-label': o.ariaLabel, 'data-focus': o.focusKey }, ...kids)
    : h(
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
  if (o.voiceHover) addHoverVoice(el, o.voiceHover);
  return el;
}

export type Tone = 'sun' | 'sea' | 'berry' | 'leaf' | 'peach' | 'lemon' | 'plain';

export function Card(children: Child[], tone: Tone = 'plain', className = ''): HTMLElement {
  return h('div', { class: `card card--${tone} ${className}`.trim() }, ...children);
}

export function Panel(title: Child, children: Child[], className = ''): HTMLElement {
  return h('section', { class: `panel ${className}`.trim() }, h('h2', { class: 'panel__title' }, title), ...children);
}
