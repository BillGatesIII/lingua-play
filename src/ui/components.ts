import { playSfx, type SfxKind } from '../shared/sfx';
import { addHoverVoice, speakEnglish, type VoiceRole } from '../shared/voice';
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
  /** Optional English phrase shown/spoken on mouseover (with speech bubble). */
  voiceHover?: string | (() => string);
  /** Speech role for hover: defaults to 'chrome' (silent bubble) so UI controls don't nag. */
  voiceRole?: VoiceRole;
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
  if (o.voiceHover) addHoverVoice(el, o.voiceHover, { role: o.voiceRole ?? 'chrome' });
  return el;
}

export type Tone = 'sun' | 'sea' | 'berry' | 'leaf' | 'peach' | 'lemon' | 'plain';

export function Card(children: Child[], tone: Tone = 'plain', className = ''): HTMLElement {
  return h('div', { class: `card card--${tone} ${className}`.trim() }, ...children);
}

export function Panel(title: Child, children: Child[], className = ''): HTMLElement {
  return h('section', { class: `panel ${className}`.trim() }, h('h2', { class: 'panel__title' }, title), ...children);
}

export interface SpeakButtonOptions {
  english: string | (() => string);
  className?: string;
  ariaLabel?: string;
  lang?: string;
  style?: string;
  sfx?: SfxKind;
  hover?: boolean;
  hoverText?: string;
  topic?: string;
}

/** Interactive button that speaks an English phrase on click (and hover by default) with a subtle SFX. */
export function SpeakButton(content: Child | Child[], o: SpeakButtonOptions): HTMLButtonElement {
  const kids = Array.isArray(content) ? content : [content];
  const getText = () => (typeof o.english === 'function' ? o.english() : o.english);
  const btn = h(
    'button',
    {
      type: 'button',
      class: o.className,
      lang: o.lang,
      style: o.style,
      'aria-label': o.ariaLabel,
      onclick: (e: MouseEvent) => {
        playSfx(o.sfx ?? 'pop');
        speakEnglish(getText(), { anchor: e.currentTarget as HTMLElement, mode: 'click', role: 'explicit', topic: o.topic });
      },
    },
    ...kids,
  );
  if (o.hover === false) return btn;
  return addHoverVoice(btn, o.hoverText ?? (typeof o.english === 'string' ? o.english : getText), { role: 'vocab', topic: o.topic });
}
