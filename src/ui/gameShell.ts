import { other, tr, type Bi, type Lang } from '../shared/i18n';
import {
  ROUNDS_BEFORE_BREAK, dismissPlayBreak, finishPlayBreak, loadBreakState, pickBreakIdea, startPlayBreak,
} from '../shared/playBreak';
import { mulberry32 } from '../shared/rng';
import { Button, Card, biText, type Tone } from './components';
import { h, type Child } from './dom';

export function StepDots(current: number, total: number, label: string): HTMLElement {
  const dots = Array.from({ length: total }, (_, i) => {
    const state = i < current ? 'done' : i === current ? 'now' : 'todo';
    return h('span', { class: `step-dot step-dot--${state}`, 'aria-hidden': 'true' }, i < current ? '★' : String(i + 1));
  });
  return h('div', { class: 'step-bar', role: 'img', 'aria-label': label },
    h('span', { class: 'step-bar__dots' }, ...dots),
    h('span', { class: 'muted step-bar__text' }, label));
}

export interface GameHeaderOptions {
  title: string;
  noun: Bi;
  index: number;
  total: number;
  lang: Lang;
}

export function GameHeader(o: GameHeaderOptions): HTMLElement {
  const shown = Math.min(o.index + 1, o.total);
  const label = `${tr(o.noun, o.lang)} ${shown} / ${o.total}`;
  return h('header', { class: 'game__head' },
    h('div', { class: 'game__identity' },
      h('h1', { class: 'game__title' }, o.title),
      StepDots(o.index, o.total, label)),
    Button(`← ${tr({ es: 'Inicio', en: 'Home' }, o.lang)}`, { variant: 'ghost', href: '#/', focusKey: 'home' }));
}

export function TranslateButton(pressed: boolean, lang: Lang, onClick: () => void): HTMLElement {
  return Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, {
    variant: 'ghost',
    pressed,
    focusKey: 'translate',
    onClick,
  });
}

export interface CharacterBubbleOptions {
  emoji: string;
  name: string;
  text?: string;
  subText?: string;
  showSub?: boolean;
  lang: Lang;
  translatePressed?: boolean;
  onTranslate?: () => void;
  extra?: Child;
  mood?: string;
}

export function CharacterBubble(o: CharacterBubbleOptions): HTMLElement {
  return h('div', { class: 'customer' },
    h('div', { class: 'customer__face', 'aria-hidden': 'true' },
      o.emoji,
      o.mood ? h('span', { class: 'customer__mood' }, o.mood) : null),
    h('div', { class: 'customer__body' },
      h('p', { class: 'customer__name' }, o.name),
      o.text
        ? h('div', { class: 'bubble' },
            h('p', { class: 'bubble__main', lang: o.lang }, o.text),
            o.showSub && o.subText
              ? h('p', { class: 'bubble__sub', lang: other(o.lang) }, o.subText)
              : null)
        : null,
      o.extra ?? null),
    o.onTranslate ? TranslateButton(Boolean(o.translatePressed), o.lang, o.onTranslate) : null);
}

export function StatusBanner(message: Bi | null, lang: Lang, alwaysOn = false): HTMLElement {
  const showBox = Boolean(message) || alwaysOn;
  return h(
    'div',
    {
      class: showBox ? 'message message--on' : 'message',
      role: 'status',
      'aria-live': 'polite',
      'data-live': 'message',
    },
    message ? biText(message, lang) : null,
  );
}

export interface EndCardOptions {
  tone?: Tone;
  title: Bi;
  art: Child;
  body: Bi;
  againLabel: Bi;
  againFocusKey: string;
  onAgain: () => void;
  onBreakChange?: () => void;
  lang: Lang;
}

export function EndCard(o: EndCardOptions): HTMLElement {
  const brk = loadBreakState();
  if (brk.resting) {
    const idea = pickBreakIdea(mulberry32((brk.totalBreaks + 1) * 97));
    return Card([
      h('p', { class: 'big-emoji', 'aria-hidden': 'true' }, idea.emoji),
      h('h2', {}, tr({ es: '¡Hora de jugar un rato afuera! 🌳', en: 'Time to play outside for a bit! 🌳' }, o.lang)),
      h('p', { class: 'clue' }, tr(idea.text, o.lang)),
      h('p', { class: 'muted' }, tr({ es: 'Cuando hayas terminado tu descanso, vuelve cuando quieras.', en: 'When you are done with your break, come right back!' }, o.lang)),
      h('div', { class: 'row' },
        Button(tr({ es: '🦜 ¡Ya volví!', en: '🦜 I am back!' }, o.lang), {
          large: true, focusKey: 'break-done',
          onClick: () => {
            finishPlayBreak();
            if (o.onBreakChange) o.onBreakChange();
            else o.onAgain();
          },
        }),
        Button(tr({ es: 'Inicio', en: 'Home' }, o.lang), {
          variant: 'secondary', large: true, href: '#/',
          onClick: () => { finishPlayBreak(); },
        })),
    ], 'leaf', 'end-card');
  }

  const breakInvite = brk.roundsSinceBreak >= ROUNDS_BEFORE_BREAK
    ? h('div', { class: 'break-nudge' },
        h('p', { class: 'break-nudge__text' },
          `🌳 ${tr({
            es: '¡Llevas dos rondas seguidas! ¿Qué tal salir a jugar un rato o beber agua antes de seguir?',
            en: 'Two rounds finished! How about playing outside for a bit or grabbing some water before the next one?',
          }, o.lang)}`),
        Button(tr({ es: '🌳 ¡Sí, voy a hacer una pausa!', en: '🌳 Yes, take a break!' }, o.lang), {
          variant: 'secondary',
          focusKey: 'take-break',
          onClick: () => {
            startPlayBreak();
            if (o.onBreakChange) o.onBreakChange();
            else o.onAgain();
          },
        }))
    : null;

  return Card([
    h('h2', {}, tr(o.title, o.lang)),
    o.art,
    h('p', {}, tr(o.body, o.lang)),
    breakInvite,
    h('div', { class: 'row' },
      Button(tr(o.againLabel, o.lang), {
        onClick: () => { dismissPlayBreak(); o.onAgain(); },
        large: true,
        focusKey: o.againFocusKey,
      }),
      Button(tr({ es: 'Inicio', en: 'Home' }, o.lang), { variant: 'secondary', large: true, href: '#/' })),
  ], o.tone ?? 'sun', 'end-card');
}
