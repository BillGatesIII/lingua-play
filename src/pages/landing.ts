import { EMOJI_ENGLISH, addHoverVoice, speakEnglish } from '../shared/voice';
import { playSfx } from '../shared/sfx';
import { clearProgress, loadProgress } from '../shared/storage';
import { Button, Card, type Tone } from '../ui/components';
import { h } from '../ui/dom';
import { renderKeepingFocus } from '../ui/focus';
import type { Page } from './types';

const PROMISES: { icon: string; text: string }[] = [
  { icon: '🚫', text: 'Sin anuncios' },
  { icon: '🕵️', text: 'Sin rastreadores' },
  { icon: '🌙', text: 'Sin prisas ni rachas' },
  { icon: '💾', text: 'Se guarda solo en tu dispositivo' },
];

interface GameEntry {
  route: string;
  title: string;
  art: string;
  tag: string;
  desc: string;
  tone: Tone;
  btnVariant: 'primary' | 'secondary';
}

const GAMES: readonly GameEntry[] = [
  {
    route: '#/market',
    title: 'Market Quest',
    art: '🍎🧀🍞',
    tag: 'Palabras · Sumas y cambio',
    desc: 'Atiende el puesto del mercado: llena la bolsa y devuelve el cambio.',
    tone: 'sun',
    btnVariant: 'secondary',
  },
  {
    route: '#/compass',
    title: 'Compass Island',
    art: '🧭🏝️⛵',
    tag: 'Rumbos · Coordenadas',
    desc: 'Sigue las pistas del mapa, navega entre rocas y encuentra el tesoro.',
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/colors',
    title: 'Color Chameleon',
    art: '🎨🦎🖌️',
    tag: 'Colores · Mezclas',
    desc: 'Mezcla pinturas y pinta al camaleón del color que pide.',
    tone: 'leaf',
    btnVariant: 'primary',
  },
  {
    route: '#/recipe',
    title: 'Recipe Lab',
    art: '🍳🍓🥛',
    tag: 'Verbos · Fracciones',
    desc: 'Mide ¼, ½ y ¾ de taza, elige ingredientes y cocina platos locos.',
    tone: 'peach',
    btnVariant: 'secondary',
  },
  {
    route: '#/station',
    title: 'Train Station',
    art: '🚂🕒🎫',
    tag: 'La hora · Viajes',
    desc: 'Ajusta el reloj de la estación para que cada viajero suba a su tren.',
    tone: 'berry',
    btnVariant: 'primary',
  },
  {
    route: '#/detective',
    title: 'Mystery Detective',
    art: '🔎🦊🍪',
    tag: 'Lógica · Pistas',
    desc: 'Lee las pistas, descarta sospechosos y descubre quién fue.',
    tone: 'lemon',
    btnVariant: 'secondary',
  },
  {
    route: '#/words',
    title: 'Word Workshop',
    art: '🔤🦉📚',
    tag: 'Letras · Ortografía',
    desc: 'Descifra pistas y ordena letras para encontrar cada palabra.',
    tone: 'sea',
    btnVariant: 'primary',
  },
  {
    route: '#/garden',
    title: 'Bloom Garden',
    art: '🌷🐝🌻',
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

  const badgeChip = (emoji: string) => {
    const en = EMOJI_ENGLISH[emoji];
    if (!en) return h('span', { class: 'big-emoji' }, emoji);
    const btn = h('button', {
      type: 'button',
      class: 'badge-chip',
      'aria-label': `${emoji} (${en})`,
      onclick: (e: MouseEvent) => {
        playSfx('pop');
        speakEnglish(en, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
      },
    }, emoji);
    return addHoverVoice(btn, en);
  };

  const shelf = (title: string, items: string[]) =>
    h('div', { class: 'shelf-row' },
      h('h3', {}, title),
      items.length
        ? h('div', { class: 'badge-row' }, ...items.map(badgeChip))
        : h('p', { class: 'big-emoji', 'aria-label': '—' }, '—'));

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const progress = loadProgress();
      const wrap = h('div');

      const parrotBtn = h('button', {
        type: 'button',
        class: 'hero__parrot-btn',
        'aria-label': 'Loro de Lingua Play: escuchar saludo en inglés',
        onclick: (e: MouseEvent) => {
          playSfx('surprise');
          speakEnglish("Hello! Let's play!", { anchor: e.currentTarget as HTMLElement, mode: 'click' });
        },
      }, '🦜');
      addHoverVoice(parrotBtn, "Hello! Let's play!");

      const gameCards = GAMES.map((g) => {
        const card = Card([
          h('div', { class: 'game-card__art', 'aria-hidden': 'true' }, g.art),
          h('span', { class: 'game-card__meta' }, g.tag),
          h('h2', {}, g.title),
          h('p', {}, g.desc),
          Button('▶ Jugar', {
            href: g.route,
            large: true,
            variant: g.btnVariant,
            ariaLabel: `${g.title}: Jugar`,
            voiceHover: `Play ${g.title}`,
            onClick: () => playSfx('pop'),
          }),
        ], g.tone, 'game-card');
        return addHoverVoice(card, g.title, 220);
      });

      wrap.append(
        h('section', { class: 'hero' },
          h('p', { class: 'hero__parrot' }, parrotBtn),
          h('h1', { class: 'hero__title' }, 'Lingua Play'),
          h('p', { class: 'hero__tag' }, '¡Juega primero! Las palabras en inglés y los números vienen contigo.')),
        h('div', { class: 'cols cols--games' }, ...gameCards),
        h('ul', { class: 'promises' }, ...PROMISES.map((p) =>
          h('li', {}, h('span', { 'aria-hidden': 'true' }, p.icon), ' ', p.text))),
        Card([
          h('h2', {}, 'Mi colección'),
          h('div', { class: 'cols' },
            shelf('Pegatinas del mercado', progress.market.stickers),
            shelf('Tesoros de la isla', progress.compass.treasures),
            shelf('Colores del camaleón', progress.colors.colours),
            shelf('Platos de la cocina', progress.recipe.dishes),
            shelf('Sellos de tren', progress.station.stamps),
            shelf('Casos resueltos', progress.detective.badges),
            shelf('Palabras mágicas', progress.words.badges),
            shelf('Flores del jardín', progress.garden.flowers)),
          confirmingErase
            ? h('div', { class: 'confirm-box', role: 'alertdialog', 'aria-label': 'Confirmar borrado' },
                h('p', { class: 'confirm-box__text' }, '¿Borrar todo lo guardado en este dispositivo?'),
                Button('Sí, borrar', {
                  variant: 'primary',
                  focusKey: 'confirm-erase',
                  onClick: () => {
                    playSfx('remove');
                    clearProgress();
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
};
