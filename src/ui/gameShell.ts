import type { Bi } from '../shared/i18n';
import {
  ROUNDS_BEFORE_BREAK, dismissPlayBreak, finishPlayBreak, loadBreakState, pickBreakIdea, startPlayBreak,
} from '../shared/playBreak';
import { mulberry32 } from '../shared/rng';
import { playSfx } from '../shared/sfx';
import { addHoverVoice, speakEnglish } from '../shared/voice';
import { Button, Card, type Tone } from './components';
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
}

export function GameHeader(o: GameHeaderOptions): HTMLElement {
  const shown = Math.min(o.index + 1, o.total);
  const label = `${o.noun.es} ${shown} / ${o.total}`;
  return h('header', { class: 'game__head' },
    h('div', { class: 'game__identity' },
      h('h1', { class: 'game__title' }, o.title),
      StepDots(o.index, o.total, label)),
    Button('← Inicio', {
      variant: 'ghost',
      href: '#/',
      focusKey: 'home',
      voiceHover: 'Home',
      onClick: () => playSfx('step'),
    }));
}

export function ListenButton(englishText: string, anchorFn?: () => HTMLElement | null): HTMLElement {
  return Button('🔊 Escuchar en inglés', {
    variant: 'ghost',
    focusKey: 'listen-en',
    voiceHover: 'Listen in English',
    onClick: (e) => {
      playSfx('pop');
      speakEnglish(englishText, { anchor: anchorFn?.() ?? (e.currentTarget as HTMLElement), mode: 'click' });
    },
  });
}

export interface CharacterBubbleOptions {
  emoji: string;
  name: string;
  englishName?: string;
  text?: string;
  englishText?: string;
  extra?: Child;
  mood?: string;
}

export function CharacterBubble(o: CharacterBubbleOptions): HTMLElement {
  const face = h('button', {
    type: 'button',
    class: 'customer__face customer__face--btn',
    'aria-label': o.englishName ? `${o.name}: escuchar en inglés` : o.name,
    onclick: (e: MouseEvent) => {
      playSfx('pop');
      const line = o.englishName ?? o.englishText;
      if (line) speakEnglish(line, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
    },
  },
  h('span', { 'aria-hidden': 'true' }, o.emoji),
  o.mood ? h('span', { class: 'customer__mood', 'aria-hidden': 'true' }, o.mood) : null);

  if (o.englishName) addHoverVoice(face, o.englishName);

  const bubble = o.text
    ? h('div', {
        class: o.englishText ? 'bubble bubble--interactive' : 'bubble',
        role: o.englishText ? 'button' : undefined,
        tabindex: o.englishText ? 0 : undefined,
        'aria-label': o.englishText ? `${o.text} (toca para escuchar en inglés)` : undefined,
        onclick: o.englishText
          ? (e: MouseEvent) => {
              playSfx('pop');
              speakEnglish(o.englishText!, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
            }
          : undefined,
        onkeydown: o.englishText
          ? (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playSfx('pop');
                speakEnglish(o.englishText!, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
              }
            }
          : undefined,
      },
      h('p', { class: 'bubble__main', lang: 'es' }, o.text))
    : null;

  return h('div', { class: 'customer' },
    face,
    h('div', { class: 'customer__body' },
      h('p', { class: 'customer__name' }, o.name),
      bubble,
      o.extra ?? null),
    o.englishText ? ListenButton(o.englishText, () => bubble ?? face) : null);
}

export function StatusBanner(message: Bi | null, alwaysOn = false): HTMLElement {
  const showBox = Boolean(message) || alwaysOn;
  return h(
    'div',
    {
      class: showBox ? 'message message--on' : 'message',
      role: 'status',
      'aria-live': 'polite',
      'data-live': 'message',
    },
    message ? h('span', { lang: 'es' }, message.es) : null,
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
}

export function EndCard(o: EndCardOptions): HTMLElement {
  const brk = loadBreakState();
  if (brk.resting) {
    const idea = pickBreakIdea(mulberry32((brk.totalBreaks + 1) * 97));
    return Card([
      h('p', { class: 'big-emoji', 'aria-hidden': 'true' }, idea.emoji),
      h('h2', {}, '¡Hora de jugar un rato afuera! 🌳'),
      h('p', { class: 'clue' }, idea.text.es),
      h('p', { class: 'muted' }, 'Cuando hayas terminado tu descanso, vuelve cuando quieras.'),
      h('div', { class: 'row' },
        Button('🦜 ¡Ya volví!', {
          large: true,
          focusKey: 'break-done',
          voiceHover: 'I am back!',
          onClick: () => {
            playSfx('pop');
            finishPlayBreak();
            if (o.onBreakChange) o.onBreakChange();
            else o.onAgain();
          },
        }),
        Button('Inicio', {
          variant: 'secondary',
          large: true,
          href: '#/',
          voiceHover: 'Home',
          onClick: () => { finishPlayBreak(); },
        })),
    ], 'leaf', 'end-card');
  }

  const breakInvite = brk.roundsSinceBreak >= ROUNDS_BEFORE_BREAK
    ? h('div', { class: 'break-nudge' },
        h('p', { class: 'break-nudge__text' },
          '🌳 ¡Llevas dos rondas seguidas! ¿Qué tal salir a jugar un rato o beber agua antes de seguir?'),
        Button('🌳 ¡Sí, voy a hacer una pausa!', {
          variant: 'secondary',
          focusKey: 'take-break',
          voiceHover: 'Take a break!',
          onClick: () => {
            playSfx('surprise');
            startPlayBreak();
            if (o.onBreakChange) o.onBreakChange();
            else o.onAgain();
          },
        }))
    : null;

  return Card([
    h('h2', {}, o.title.es),
    o.art,
    h('p', {}, o.body.es),
    breakInvite,
    h('div', { class: 'row' },
      Button(o.againLabel.es, {
        onClick: () => {
          playSfx('pop');
          dismissPlayBreak();
          o.onAgain();
        },
        large: true,
        focusKey: o.againFocusKey,
        voiceHover: o.againLabel.en,
      }),
      Button('Inicio', {
        variant: 'secondary',
        large: true,
        href: '#/',
        voiceHover: 'Home',
        onClick: () => playSfx('step'),
      })),
  ], o.tone ?? 'sun', 'end-card');
}
