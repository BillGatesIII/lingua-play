import { applyAlbumCode, encodeAlbumCode } from '../shared/albumCode';
import { resetBreakState } from '../shared/playBreak';
import { rewardEmojiEnglish, rewardShelfTotal, type RewardShelf } from '../shared/rewards';
import { playSfx, type SfxKind } from '../shared/sfx';
import { nextParrotGreeting, resetParrotGreeting, resetSpeechSession } from '../shared/speechDirector';
import { loadProgress, startFreshAlbum, type Progress } from '../shared/storage';
import { addHoverVoice } from '../shared/voice';
import { Button, Card, SpeakButton, type Tone } from '../ui/components';
import { h } from '../ui/dom';
import { renderKeepingFocus } from '../ui/focus';
import { prefersReducedMotion, startIconChoreography, type IconMotion, type MotionIcon } from './iconMotion';
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

interface ShelfConfig {
  kind: RewardShelf;
  title: string;
  icon: string;
  tone: Tone;
  route: string;
  sfx: SfxKind;
  items: (p: Progress) => string[];
}

const SHELVES: readonly ShelfConfig[] = [
  { kind: 'market', title: 'Pegatinas del mercado', icon: '🍎', tone: 'sun', route: '#/market', sfx: 'pop', items: (p) => p.market.stickers },
  { kind: 'compass', title: 'Tesoros de la isla', icon: '🧭', tone: 'sea', route: '#/compass', sfx: 'coin', items: (p) => p.compass.treasures },
  { kind: 'colors', title: 'Colores del camaleón', icon: '🎨', tone: 'leaf', route: '#/colors', sfx: 'splash', items: (p) => p.colors.colours },
  { kind: 'recipe', title: 'Platos de la cocina', icon: '🍳', tone: 'peach', route: '#/recipe', sfx: 'pop', items: (p) => p.recipe.dishes },
  { kind: 'station', title: 'Sellos de tren', icon: '🚂', tone: 'berry', route: '#/station', sfx: 'tick', items: (p) => p.station.stamps },
  { kind: 'detective', title: 'Casos resueltos', icon: '🔎', tone: 'lemon', route: '#/detective', sfx: 'surprise', items: (p) => p.detective.badges },
  { kind: 'words', title: 'Palabras mágicas', icon: '🔤', tone: 'sea', route: '#/words', sfx: 'pop', items: (p) => p.words.badges },
  { kind: 'garden', title: 'Flores del jardín', icon: '🌷', tone: 'leaf', route: '#/garden', sfx: 'surprise', items: (p) => p.garden.flowers },
];

export const landingPage: Page = (ctx) => {
  let disposed = false;
  let confirmingErase = false;
  let codePanelOpen = false;
  let codeInputValue = '';
  let codeStatus: { text: string; tone: 'ok' | 'err' } | null = null;
  let copiedCode = false;
  let copyStatus: string | null = null;
  const celebrateTimers = new Map<HTMLElement, number>();
  const host = h('div');
  ctx.root.append(host);

  const badgeChip = (kind: RewardShelf, emoji: string, sfx: SfxKind) => {
    const en = rewardEmojiEnglish(kind, emoji);
    if (!en) return h('span', { class: 'big-emoji' }, emoji);
    const btn = SpeakButton(emoji, {
      english: en,
      className: 'badge-chip',
      ariaLabel: `${emoji} (${en})`,
      sfx,
    });
    const clearCelebrate = () => {
      const timer = celebrateTimers.get(btn);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        celebrateTimers.delete(btn);
      }
      btn.classList.remove('badge-chip--celebrate');
    };
    btn.addEventListener('click', () => {
      if (disposed || prefersReducedMotion()) return;
      clearCelebrate();
      void btn.offsetWidth;
      btn.classList.add('badge-chip--celebrate');
      const timer = window.setTimeout(() => {
        celebrateTimers.delete(btn);
        btn.classList.remove('badge-chip--celebrate');
      }, 520);
      celebrateTimers.set(btn, timer);
    });
    btn.addEventListener('animationend', (e) => {
      const animName = (e as AnimationEvent).animationName;
      if (e.target === btn && (!animName || animName === 'sticker-pop')) clearCelebrate();
    });
    btn.addEventListener('animationcancel', clearCelebrate);
    return btn;
  };

  const emptySlots = (count: number) =>
    Array.from({ length: count }, () => h('span', { class: 'badge-slot', 'aria-hidden': 'true' }, '✦'));

  const shelf = (cfg: ShelfConfig, items: string[]) => {
    const total = rewardShelfTotal(cfg.kind);
    const remaining = Math.max(0, total - items.length);
    const placeholderCount = items.length === 0 ? Math.min(3, total) : Math.min(2, remaining);

    return h('div', { class: `shelf-row shelf-row--${cfg.tone}` },
      h('div', { class: 'shelf-row__head' },
        h('span', { class: 'shelf-row__icon', 'aria-hidden': 'true' }, cfg.icon),
        h('h3', {}, cfg.title),
        h('span', { class: 'shelf-row__count', 'aria-label': `${items.length} de ${total}` }, `${items.length}/${total}`)),
      h('div', { class: items.length ? 'badge-row' : 'badge-row badge-row--empty' },
        ...items.map((emoji) => badgeChip(cfg.kind, emoji, cfg.sfx)),
        ...emptySlots(placeholderCount),
        items.length === 0
          ? h('a', {
              class: 'shelf-row__play',
              href: cfg.route,
              'aria-label': `Jugar para conseguir ${cfg.title}`,
              onclick: () => playSfx('pop'),
            }, '▶ Jugar')
          : null));
  };

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
            onClick: () => playSfx('pop'),
          }),
        ], g.tone, 'game-card');
        return addHoverVoice(card, g.title, { delayMs: 280, role: 'vocab', showBubble: false });
      });

      const totalCollected = SHELVES.reduce((sum, cfg) => sum + cfg.items(progress).length, 0);
      const albumCode = encodeAlbumCode(progress);

      const codeInputEl = h('input', {
        id: 'album-code-input',
        type: 'text',
        class: 'code-box__input',
        value: codeInputValue,
        placeholder: 'Ej: LP1-XXXX',
        autocomplete: 'off',
        spellcheck: false,
        maxlength: 120,
        'data-focus': 'code-input',
        oninput: (e: Event) => {
          codeInputValue = (e.currentTarget as HTMLInputElement).value;
        },
      }) as HTMLInputElement;

      const handleLoadCode = (e: Event) => {
        e.preventDefault();
        codeInputValue = codeInputEl.value;
        const res = applyAlbumCode(codeInputValue);
        if (res.ok) {
          playSfx('levelUp');
          codeInputValue = '';
          copiedCode = false;
          copyStatus = null;
          codeStatus = {
            text: res.addedCount > 0
              ? `🎉 ¡Álbum cargado! +${res.addedCount} ${res.addedCount === 1 ? 'pegatina nueva' : 'pegatinas nuevas'}.`
              : '✨ ¡Listo! Ya tenías todas esas pegatinas en tu álbum.',
            tone: 'ok',
          };
          draw('code-input');
        } else {
          playSfx('oops');
          codeStatus = {
            text: res.error === 'empty'
              ? 'Escribe un código primero (por ejemplo, LP1-...).'
              : 'Ese código no coincide. Revísalo e inténtalo otra vez.',
            tone: 'err',
          };
          draw('code-input');
        }
      };

      const selectCodeText = (el: HTMLElement | null) => {
        if (!el || typeof window === 'undefined' || typeof document === 'undefined') return;
        try {
          const sel = window.getSelection?.();
          if (!sel) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch {
          /* ignore */
        }
      };

      const codeValueEl = albumCode ? h('code', { class: 'code-box__value' }, albumCode) : null;

      const handleCopyCode = () => {
        playSfx('pop');
        const markCopied = () => {
          if (disposed || !codePanelOpen) return;
          copiedCode = true;
          copyStatus = null;
          draw(host.contains(document.activeElement) ? undefined : 'copy-code');
        };
        const fallbackCopy = () => {
          if (disposed || !codePanelOpen) return;
          selectCodeText(codeValueEl);
          let ok = false;
          try {
            ok = typeof document.execCommand === 'function' && document.execCommand('copy');
          } catch {
            ok = false;
          }
          if (ok) {
            markCopied();
            return;
          }
          copiedCode = false;
          copyStatus = 'Selecciona el código y pulsa Ctrl+C para copiarlo.';
          draw(host.contains(document.activeElement) ? undefined : 'copy-code');
          selectCodeText(host.querySelector<HTMLElement>('.code-box__value'));
        };
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(albumCode).then(markCopied, fallbackCopy);
          return;
        }
        fallbackCopy();
      };

      const codePanel = codePanelOpen
        ? h('div', { class: 'code-box' },
            h('div', { class: 'code-box__section' },
              h('p', { class: 'code-box__label' }, 'Tu código de hoy'),
              codeValueEl
                ? h('div', { class: 'code-box__row' },
                    codeValueEl,
                    Button(copiedCode ? '✅ ¡Copiado!' : '📋 Copiar', {
                      variant: 'ghost',
                      className: 'btn--mini',
                      focusKey: 'copy-code',
                      onClick: handleCopyCode,
                    }))
                : h('p', { class: 'muted code-box__hint' }, 'Consigue al menos una pegatina para crear tu código.'),
              albumCode
                ? h('p', {
                    class: 'code-box__status code-box__status--err',
                    role: 'status',
                    'aria-live': 'polite',
                    'data-live': 'copy-status',
                  }, copyStatus ?? '')
                : null,
              albumCode
                ? h('p', { class: 'muted code-box__hint' }, 'Apunta este código para traer tus pegatinas otro día o a otro ordenador.')
                : null),
            h('form', { class: 'code-box__section code-box__form', onsubmit: handleLoadCode },
              h('label', { class: 'code-box__label', for: 'album-code-input' }, '¿Ya tienes un código?'),
              h('div', { class: 'code-box__row' },
                codeInputEl,
                h('button', { type: 'submit', class: 'btn btn--primary btn--mini', 'data-focus': 'load-code' }, '✨ Cargar')),
              h('p', {
                class: codeStatus ? `code-box__status code-box__status--${codeStatus.tone}` : 'code-box__status',
                role: 'status',
                'aria-live': 'polite',
                'data-live': 'code-status',
              }, codeStatus?.text ?? '')))
        : null;

      wrap.append(
        h('section', { class: 'hero' },
          h('div', { class: 'hero__head' },
            h('span', { class: 'hero__parrot' }, parrotBtn),
            h('h1', { class: 'hero__title' }, 'Lingua Play')),
          h('p', { class: 'hero__tag' }, '¡Juega primero! Las palabras en inglés y los números vienen contigo.')),
        h('div', { class: 'cols cols--games' }, ...gameCards),
        h('ul', { class: 'promises' }, ...PROMISES.map((p) =>
          h('li', {}, h('span', { class: 'art-icon promise-icon', 'data-motion': p.motion, 'aria-hidden': 'true' }, p.icon), ' ', p.text))),
        Card([
          h('div', { class: 'collection__head' },
            h('h2', {}, h('span', { 'aria-hidden': 'true' }, '🏆 '), 'Mi colección'),
            h('div', { class: 'collection__actions' },
              h('span', { class: 'collection__summary' },
                totalCollected > 0
                  ? `✨ ${totalCollected} ${totalCollected === 1 ? 'pegatina' : 'pegatinas'}`
                  : '✨ ¡Empieza tu álbum!'),
              Button('🎟️ Mi código', {
                variant: 'ghost',
                className: 'collection__code-btn',
                pressed: codePanelOpen,
                focusKey: 'code-toggle',
                onClick: () => {
                  playSfx('pop');
                  codePanelOpen = !codePanelOpen;
                  confirmingErase = false;
                  copiedCode = false;
                  copyStatus = null;
                  codeStatus = null;
                  draw('code-toggle');
                },
              }))),
          codePanel,
          h('div', { class: 'collection__grid' },
            ...SHELVES.map((cfg) => shelf(cfg, cfg.items(progress)))),
          confirmingErase
            ? h('div', { class: 'confirm-box', role: 'alertdialog', 'aria-label': 'Confirmar reinicio' },
                h('p', { class: 'confirm-box__text' }, '¿Empezar un álbum nuevo para jugar hoy?'),
                Button('Sí, empezar', {
                  variant: 'primary',
                  focusKey: 'confirm-erase',
                  onClick: () => {
                    playSfx('remove');
                    startFreshAlbum();
                    resetBreakState();
                    resetSpeechSession();
                    resetParrotGreeting();
                    confirmingErase = false;
                    codePanelOpen = false;
                    copiedCode = false;
                    copyStatus = null;
                    codeStatus = null;
                    ctx.refresh();
                  },
                }),
                Button('Cancelar', {
                  variant: 'ghost',
                  focusKey: 'cancel-erase',
                  onClick: () => { confirmingErase = false; draw('erase-btn'); },
                }))
            : h('div', { class: 'collection__footer' },
                Button('🔄 Empezar de nuevo', {
                  variant: 'ghost',
                  className: 'collection__erase',
                  focusKey: 'erase-btn',
                  onClick: () => {
                    confirmingErase = true;
                    codePanelOpen = false;
                    draw('cancel-erase');
                  },
                })),
        ], 'plain', 'collection'),
      );
      return wrap;
    }, focusTarget);
  }

  draw();
  const stopChoreography = startIconChoreography(host);
  return () => {
    disposed = true;
    for (const timer of celebrateTimers.values()) window.clearTimeout(timer);
    celebrateTimers.clear();
    stopChoreography();
  };
};
