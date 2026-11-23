import { resetBreakState } from '../shared/playBreak';
import { rewardEmojiEnglish, type RewardShelf } from '../shared/rewards';
import { playSfx } from '../shared/sfx';
import { nextParrotGreeting, resetParrotGreeting, resetSpeechSession } from '../shared/speechDirector';
import { clearProgress, loadProgress } from '../shared/storage';
import { addHoverVoice } from '../shared/voice';
import { Button, Card, SpeakButton, type Tone } from '../ui/components';
import { h } from '../ui/dom';
import { renderKeepingFocus } from '../ui/focus';
import { startIconChoreography, type IconMotion, type MotionIcon } from './iconMotion';
import type { Page } from './types';

const PROMISES: { icon: string; motion: IconMotion; text: string }[] = [
  { icon: '🚫', motion: 'no-shake', text: 'Sin anuncios' },
  { icon: '🕵️', motion: 'spy-peek', text: 'Sin rastreadores' },
  { icon: '🌙', motion: 'moon-rock', text: 'Sin prisas ni rachas' },
  { icon: '💾', motion: 'disk-click', text: 'Se guarda solo en tu dispositivo' },
];

interface GameEntry {
  route: string;
  title: string;
  art: readonly MotionIcon[];
  tag: string;
  desc: string;
  tone: Tone;
  btnVariant: 'primary' | 'secondary';
}

const GAMES: readonly GameEntry[] = [
  {
    route: '#/market',
    title: 'Market Quest',
    art: [
      { emoji: '🍎', motion: 'apple-roll' },
      { emoji: '🧀', motion: 'cheese-wiggle' },
      { emoji: '🍞', motion: 'bread-rise' },
    ],
    tag: 'Palabras · Sumas y cambio',
    desc: 'Atiende el puesto del mercado: llena la bolsa y devuelve el cambio.',
    tone: 'sun',
    btnVariant: 'secondary',
  },
  {
    route: '#/compass',
    title: 'Compass Island',
    art: [
      { emoji: '🧭', motion: 'compass-seek' },
      { emoji: '🏝️', motion: 'island-sway' },
      { emoji: '⛵', motion: 'boat-sail' },
    ],
    tag: 'Rumbos · Coordenadas',
    desc: 'Sigue las pistas del mapa, navega entre rocas y encuentra el tesoro.',
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/colors',
    title: 'Color Chameleon',
    art: [
      { emoji: '🎨', motion: 'palette-tilt' },
      { emoji: '🦎', motion: 'chameleon-step' },
      { emoji: '🖌️', motion: 'brush-stroke' },
    ],
    tag: 'Colores · Mezclas',
    desc: 'Mezcla pinturas y pinta al camaleón del color que pide.',
    tone: 'leaf',
    btnVariant: 'primary',
  },
  {
    route: '#/recipe',
    title: 'Recipe Lab',
    art: [
      { emoji: '🍳', motion: 'pan-flip' },
      { emoji: '🍓', motion: 'berry-bounce' },
      { emoji: '🥛', motion: 'milk-pour' },
    ],
    tag: 'Verbos · Fracciones',
    desc: 'Mide ¼, ½ y ¾ de taza, elige ingredientes y cocina platos locos.',
    tone: 'peach',
    btnVariant: 'secondary',
  },
  {
    route: '#/station',
    title: 'Train Station',
    art: [
      { emoji: '🚂', motion: 'train-chug' },
      { emoji: '🕒', motion: 'clock-tick' },
      { emoji: '🎫', motion: 'ticket-flutter' },
    ],
    tag: 'La hora · Viajes',
    desc: 'Ajusta el reloj de la estación para que cada viajero suba a su tren.',
    tone: 'berry',
    btnVariant: 'primary',
  },
  {
    route: '#/detective',
    title: 'Mystery Detective',
    art: [
      { emoji: '🔎', motion: 'magnifier-scan' },
      { emoji: '🦊', motion: 'fox-peek' },
      { emoji: '🍪', motion: 'cookie-nibble' },
    ],
    tag: 'Lógica · Pistas',
    desc: 'Lee las pistas, descarta sospechosos y descubre quién fue.',
    tone: 'lemon',
    btnVariant: 'secondary',
  },
  {
    route: '#/words',
    title: 'Word Workshop',
    art: [
      { emoji: '🔤', motion: 'letters-pop' },
      { emoji: '🦉', motion: 'owl-head-tilt' },
      { emoji: '📚', motion: 'books-settle' },
    ],
    tag: 'Letras · Ortografía',
    desc: 'Descifra pistas y ordena letras para encontrar cada palabra.',
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/garden',
    title: 'Bloom Garden',
    art: [
      { emoji: '🌷', motion: 'flower-sway' },
      { emoji: '🐝', motion: 'bee-buzz' },
      { emoji: '🌻', motion: 'sunflower-turn' },
    ],
    tag: 'Series · Patrones',
    desc: 'Observa cómo crecen las flores y planta el paquete de semillas correcto.',
    tone: 'leaf',
    btnVariant: 'primary',
  },
];

export const landingPage: Page = (ctx) => {
  let confirmingErase = false;
  const host = h('div');
  ctx.root.append(host);

  const badgeChip = (kind: RewardShelf, emoji: string) => {
    const en = rewardEmojiEnglish(kind, emoji);
    if (!en) return h('span', { class: 'big-emoji' }, emoji);
    return SpeakButton(emoji, {
      english: en,
      className: 'badge-chip',
      ariaLabel: `${emoji} (${en})`,
    });
  };

  const shelf = (title: string, kind: RewardShelf, items: string[]) =>
    h('div', { class: 'shelf-row' },
      h('h3', {}, title),
      items.length
        ? h('div', { class: 'badge-row' }, ...items.map((emoji) => badgeChip(kind, emoji)))
        : h('p', { class: 'big-emoji', 'aria-label': '—' }, '—'));

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const progress = loadProgress();
      const wrap = h('div');

      const parrotBtn = SpeakButton('🦜', {
        english: () => nextParrotGreeting(),
        hoverText: 'Hello!',
        className: 'hero__parrot-btn',
        ariaLabel: 'Loro de Lingua Play: escuchar saludo en inglés',
        sfx: 'surprise',
      });

      const gameCards = GAMES.map((g) => {
        const card = Card([
          h(
            'div',
            { class: 'game-card__art', 'aria-hidden': 'true' },
            ...g.art.map((icon) =>
              h('span', { class: 'art-icon', 'data-motion': icon.motion }, icon.emoji)),
          ),
          h('span', { class: 'game-card__meta' }, g.tag),
          h('h2', {}, g.title),
          h('p', {}, g.desc),
          Button('▶ Jugar', {
            href: g.route,
            large: true,
            variant: g.btnVariant,
            ariaLabel: `${g.title}: Jugar`,
            voiceHover: `Play ${g.title}`,
            voiceRole: 'chrome',
            onClick: () => playSfx('pop'),
          }),
        ], g.tone, 'game-card');
        return addHoverVoice(card, g.title, { delayMs: 280, role: 'vocab' });
      });

      wrap.append(
        h('section', { class: 'hero' },
          h('p', { class: 'hero__parrot' }, parrotBtn),
          h('h1', { class: 'hero__title' }, 'Lingua Play'),
          h('p', { class: 'hero__tag' }, '¡Juega primero! Las palabras en inglés y los números vienen contigo.')),
        h('div', { class: 'cols cols--games' }, ...gameCards),
        h('ul', { class: 'promises' }, ...PROMISES.map((p) =>
          h('li', {}, h('span', { class: 'art-icon promise-icon', 'data-motion': p.motion, 'aria-hidden': 'true' }, p.icon), ' ', p.text))),
        Card([
          h('h2', {}, 'Mi colección'),
          h('div', { class: 'cols' },
            shelf('Pegatinas del mercado', 'market', progress.market.stickers),
            shelf('Tesoros de la isla', 'compass', progress.compass.treasures),
            shelf('Colores del camaleón', 'colors', progress.colors.colours),
            shelf('Platos de la cocina', 'recipe', progress.recipe.dishes),
            shelf('Sellos de tren', 'station', progress.station.stamps),
            shelf('Casos resueltos', 'detective', progress.detective.badges),
            shelf('Palabras mágicas', 'words', progress.words.badges),
            shelf('Flores del jardín', 'garden', progress.garden.flowers)),
          confirmingErase
            ? h('div', { class: 'confirm-box', role: 'alertdialog', 'aria-label': 'Confirmar borrado' },
                h('p', { class: 'confirm-box__text' }, '¿Borrar todo lo guardado en este dispositivo?'),
                Button('Sí, borrar', {
                  variant: 'primary',
                  focusKey: 'confirm-erase',
                  onClick: () => {
                    playSfx('remove');
                    clearProgress();
                    resetBreakState();
                    resetSpeechSession();
                    resetParrotGreeting();
                    confirmingErase = false;
                    ctx.refresh();
                  },
                }),
                Button('Cancelar', {
                  variant: 'ghost',
                  focusKey: 'cancel-erase',
                  onClick: () => { confirmingErase = false; draw('erase-btn'); },
                }))
            : Button('Borrar mi progreso', {
                variant: 'ghost',
                focusKey: 'erase-btn',
                onClick: () => { confirmingErase = true; draw('cancel-erase'); },
              }),
        ], 'plain', 'collection'),
      );
      return wrap;
    }, focusTarget);
  }

  draw();
  return startIconChoreography(host);
};
