import { numberWord, type Bi } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, pick, shuffle } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { updateProgress } from '../../shared/storage';
import { addHoverVoice, speakEnglish } from '../../shared/voice';
import type { Page } from '../../pages/types';
import { Button, Panel } from '../../ui/components';
import { append, h, svg } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import { CharacterBubble, EndCard, GameHeader, StatusBanner } from '../../ui/gameShell';
import {
  COINS, CUSTOMERS, CUSTOMERS_PER_DAY, PRODUCTS, basketMatches, basketMistake, changeFeedback,
  checkChange, generateOrder, orderSpeech, paySpeech, sumCoins, type Basket, type Order,
} from './logic';

type Stage = 'basket' | 'change' | 'served' | 'closed';

function coinIcon(): SVGElement {
  return svg('svg', { class: 'coin-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('circle', { cx: 12, cy: 12, r: 10, fill: '#ffd23f', stroke: '#1f1b3d', 'stroke-width': 2.5 }),
    svg('circle', { cx: 12, cy: 12, r: 5.5, fill: 'none', stroke: '#1f1b3d', 'stroke-width': 1.75 }));
}

export const marketPage: Page = (ctx) => {
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
  const stage = { v: 'basket' as Stage };
  const queue = shuffle(rng, CUSTOMERS).slice(0, CUSTOMERS_PER_DAY);
  let index = 0;
  let order: Order = generateOrder(rng, index);
  let customer = queue[index];
  let basket: Basket = {};
  let coins: number[] = [];
  let message: Bi | null = null;
  let endCelebrated = false;
  const stickers: string[] = [];

  const root = ctx.root;
  const host = h('div', { class: 'world world--market' });
  root.append(host);

  const say = (m: Bi | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function nextCustomer() {
    index++;
    if (index >= CUSTOMERS_PER_DAY) {
      stage.v = 'closed';
      completeGameRound();
      if (!endCelebrated) {
        endCelebrated = true;
        playSfx('levelUp');
      }
      speakEnglish('Well done! The market is closed for today!');
    } else {
      order = generateOrder(rng, index);
      customer = queue[index];
      basket = {};
      coins = [];
      stage.v = 'basket';
      playSfx('step');
      speakEnglish(customer.greeting.en);
    }
    message = null;
    draw(stage.v === 'closed' ? 'another-day' : `p-${PRODUCTS[0].id}`);
  }

  function submitBasket(anchor?: HTMLElement) {
    if (basketMatches(order, basket)) {
      stage.v = 'change';
      playSfx('surprise');
      speakEnglish('Perfect!', { anchor, mode: 'click' });
      say({ es: '¡Perfecto! 😄 Ahora el cliente te da el dinero. ¿Cuánto cambio le devuelves?', en: 'Perfect! 😄 Now the customer hands you money. How much change do you give back?' }, 'coin-1');
    } else {
      playSfx('oops');
      const m = basketMistake(order, basket, rng);
      speakEnglish(m.en, { anchor, mode: 'click' });
      say(m);
    }
  }

  function submitChange(anchor?: HTMLElement) {
    const result = checkChange(order, coins);
    if (result !== 'exact') {
      playSfx('oops');
      speakEnglish(result === 'too-much' ? 'Too much change!' : 'Not enough coins!', { anchor, mode: 'click' });
      return say(changeFeedback(result), 'give-change');
    }
    const sticker = pick(rng, PRODUCTS).emoji;
    stickers.push(sticker);
    updateProgress((p) => {
      p.market.served += 1;
      if (!p.market.stickers.includes(sticker)) p.market.stickers.push(sticker);
    });
    stage.v = 'served';
    playSfx('surprise');
    speakEnglish('Happy customer! Thank you!', { anchor, mode: 'click' });
    say({ es: `¡Cliente feliz! 🎉 Te regala una pegatina ${sticker}`, en: `Happy customer! 🎉 You got a sticker ${sticker}` }, 'next-customer');
  }

  function scene(): HTMLElement {
    const products = h('div', { class: 'shelf' },
      ...PRODUCTS.map((p) => {
        const btn = h('button', {
          class: 'product', type: 'button', 'data-focus': `p-${p.id}`,
          disabled: stage.v !== 'basket',
          'aria-label': `${p.emoji} ${p.es.one}: ${p.price} monedas`,
          onclick: (e: MouseEvent) => {
            const nextQty = (basket[p.id] ?? 0) + 1;
            playSfx('pop');
            speakEnglish(`${numberWord(nextQty, 'en')} ${nextQty === 1 ? p.en.one : p.en.many}`, {
              anchor: e.currentTarget as HTMLElement,
              mode: 'click',
            });
            basket = { ...basket, [p.id]: nextQty };
            message = null;
            draw();
          },
        },
        h('span', { class: 'product__emoji', 'aria-hidden': 'true' }, p.emoji),
        h('span', { class: 'product__name', lang: 'es' }, p.es.one),
        h('span', { class: 'product__price' }, coinIcon(), ` ${p.price}`));
        return addHoverVoice(btn, p.en.one);
      }),
    );
    return h('div', { class: 'stall' }, h('div', { class: 'awning', 'aria-hidden': 'true' }), products);
  }

  function basketPanel(): HTMLElement {
    const entries = PRODUCTS.filter((p) => (basket[p.id] ?? 0) > 0);
    const list = entries.length
      ? h('ul', { class: 'basket' }, ...entries.map((p) => {
          const qty = basket[p.id];
          return h('li', {},
            h('span', { class: 'basket__dots', 'aria-hidden': 'true' }, p.emoji.repeat(Math.min(qty, 8))),
            h('span', { lang: 'es' }, qty === 1 ? p.es.one : p.es.many), ` × ${qty} `,
            stage.v === 'change' ? h('span', { class: 'basket__price' },
              `· precio unitario: ${p.price} monedas`) : null,
            stage.v === 'basket' ? removeBtn(p.id) : null);
        }))
      : h('p', { class: 'muted' }, 'La bolsa está vacía. ¡Toca los productos!');
    return Panel('🧺 Bolsa', [
      list,
      stage.v === 'basket'
        ? Button('¡Listo!', {
            onClick: (e) => submitBasket(e.currentTarget as HTMLElement),
            disabled: entries.length === 0,
            focusKey: 'ready',
            voiceHover: 'Ready!',
          })
        : null,
    ]);
  }

  function removeBtn(id: string): HTMLElement {
    const p = PRODUCTS.find((x) => x.id === id)!;
    return Button('−', {
      variant: 'ghost', className: 'btn--mini', focusKey: `rm-${id}`,
      ariaLabel: `Quitar ${p.es.one}`,
      voiceHover: `Remove ${p.en.one}`,
      onClick: () => {
        playSfx('remove');
        const { [id]: n, ...rest } = basket;
        basket = n > 1 ? { ...rest, [id]: n - 1 } : rest;
        message = null;
        draw();
      },
    });
  }

  function changePanel(): HTMLElement {
    const tray = h('div', { class: 'coins' }, ...COINS.map((c) =>
      Button([coinIcon(), ` ${c}`], {
        variant: 'secondary', className: 'coin', disabled: stage.v !== 'change', focusKey: `coin-${c}`,
        ariaLabel: `Dar moneda de ${c}`,
        voiceHover: `${numberWord(c, 'en')} ${c === 1 ? 'coin' : 'coins'}`,
        onClick: (e) => {
          playSfx('coin');
          coins = [...coins, c];
          const sum = sumCoins(coins);
          speakEnglish(`${sum} ${sum === 1 ? 'coin' : 'coins'}`, { anchor: e.currentTarget as HTMLElement, mode: 'click' });
          message = null;
          draw();
        },
      })));
    const placed = coins.length && stage.v === 'change'
      ? h('div', { class: 'coins-placed' }, ...coins.map((c, idx) =>
          Button([coinIcon(), ` ${c} ×`], {
            variant: 'ghost', className: 'coin-chip', focusKey: `rm-coin-${idx}`,
            ariaLabel: `Quitar moneda de ${c}`,
            voiceHover: `Remove ${c}`,
            onClick: () => {
              playSfx('remove');
              coins = coins.filter((_, i) => i !== idx);
              message = null;
              draw();
            },
          })))
      : null;
    const empty = Button('Vaciar', {
      variant: 'ghost', className: 'btn--mini', disabled: stage.v !== 'change', focusKey: 'empty-coins',
      voiceHover: 'Empty',
      onClick: () => { playSfx('remove'); coins = []; message = null; draw('coin-1'); },
    });
    const pouch = h('p', {
      class: coins.length ? 'pouch' : 'muted',
      'aria-live': 'polite',
      'data-live': 'change-total',
    }, ...(coins.length
      ? [`Cambio: ${sumCoins(coins)} `, coinIcon(), ' ', empty]
      : ['Elige monedas para el cambio.']));
    return Panel('💰 Caja', [
      tray, placed, pouch,
      stage.v === 'change'
        ? Button('Dar el cambio', {
            onClick: (e) => submitChange(e.currentTarget as HTMLElement),
            disabled: coins.length === 0,
            focusKey: 'give-change',
            voiceHover: 'Give the change',
          })
        : null,
    ]);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🛒 Market Quest',
        noun: { es: 'Cliente', en: 'Customer' },
        index, total: CUSTOMERS_PER_DAY,
      }));

      if (stage.v === 'closed') {
        wrap.append(EndCard({
          tone: 'sun',
          title: { es: '¡El mercado cierra por hoy! 🌙', en: 'The market is closed for today! 🌙' },
          art: h('p', { class: 'big-emoji', 'aria-label': 'pegatinas' }, stickers.join(' ')),
          body: { es: 'Vuelve cuando quieras. ¡Tus pegatinas te esperan!', en: 'Come back whenever you like. Your stickers will wait!' },
          againLabel: { es: 'Otro día de mercado', en: 'Another market day' },
          againFocusKey: 'another-day',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
        }));
        return wrap;
      }

      const spanishText = stage.v === 'basket' ? orderSpeech(order, 'es', customer) : paySpeech(order, 'es');
      const englishText = stage.v === 'basket' ? orderSpeech(order, 'en', customer) : paySpeech(order, 'en');
      const moneyExtra = stage.v === 'change'
        ? h('div', { class: 'row' },
            addHoverVoice(
              h('span', { class: 'bill-badge' }, `💵 ${order.paid} monedas`),
              `${order.paid} coins`,
            ),
            order.discount > 0
              ? addHoverVoice(
                  h('span', { class: 'coupon-badge' }, `🎟️ −${order.discount}`),
                  `${order.discount} coin coupon`,
                )
              : null)
        : null;

      append(wrap, [
        CharacterBubble({
          emoji: customer.emoji,
          mood: stage.v === 'served' ? '🎉' : stage.v === 'change' ? '💳' : undefined,
          name: customer.name.es,
          englishName: customer.greeting.en,
          text: stage.v === 'served' ? undefined : spanishText,
          englishText: stage.v === 'served' ? undefined : englishText,
          extra: moneyExtra,
        }),
        stage.v === 'basket' ? scene() : null,
        h('div', { class: 'cols cols--task' },
          stage.v !== 'served' ? basketPanel() : null,
          stage.v === 'change' ? changePanel() : null),
        StatusBanner(message),
        stage.v === 'served'
          ? Button('Siguiente cliente →', {
              onClick: nextCustomer,
              large: true,
              focusKey: 'next-customer',
              voiceHover: 'Next customer',
            })
          : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
};
