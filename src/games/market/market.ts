import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, pick, shuffle } from '../../shared/rng';
import { tr, other, type Bi } from '../../shared/i18n';
import { updateProgress } from '../../shared/storage';
import type { Page } from '../../pages/types';
import { Button, Panel, biText } from '../../ui/components';
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
  let { lang } = ctx;
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
  const stage = { v: 'basket' as Stage };
  const queue = shuffle(rng, CUSTOMERS).slice(0, CUSTOMERS_PER_DAY);
  let index = 0;
  let order: Order = generateOrder(rng, index);
  let customer = queue[index];
  let basket: Basket = {};
  let coins: number[] = [];
  let message: Bi | null = null;
  let translate = false;
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
    } else {
      order = generateOrder(rng, index);
      customer = queue[index];
      basket = {};
      coins = [];
      stage.v = 'basket';
    }
    message = null;
    draw(stage.v === 'closed' ? 'another-day' : `p-${PRODUCTS[0].id}`);
  }

  function submitBasket() {
    if (basketMatches(order, basket)) {
      stage.v = 'change';
      say({ es: '¡Perfecto! 😄 Ahora el cliente te da el dinero. ¿Cuánto cambio le devuelves?', en: 'Perfect! 😄 Now the customer hands you money. How much change do you give back?' }, 'coin-1');
    } else {
      say(basketMistake(order, basket, rng));
    }
  }

  function submitChange() {
    const result = checkChange(order, coins);
    if (result !== 'exact') return say(changeFeedback(result), 'give-change');
    const sticker = pick(rng, PRODUCTS).emoji;
    stickers.push(sticker);
    updateProgress((p) => {
      p.market.served += 1;
      if (!p.market.stickers.includes(sticker)) p.market.stickers.push(sticker);
    });
    stage.v = 'served';
    say({ es: `¡Cliente feliz! 🎉 Te regala una pegatina ${sticker}`, en: `Happy customer! 🎉 You got a sticker ${sticker}` }, 'next-customer');
  }

  function scene(): HTMLElement {
    const products = h('div', { class: 'shelf' },
      ...PRODUCTS.map((p) =>
        h('button', {
          class: 'product', type: 'button', 'data-focus': `p-${p.id}`,
          disabled: stage.v !== 'basket',
          'aria-label': `${p.emoji} ${p.es.one} / ${p.en.one}: ${p.price} ${lang === 'es' ? 'monedas' : 'coins'}`,
          onclick: () => { basket = { ...basket, [p.id]: (basket[p.id] ?? 0) + 1 }; message = null; draw(); },
        },
          h('span', { class: 'product__emoji', 'aria-hidden': 'true' }, p.emoji),
          h('span', { class: 'product__name', lang }, p[lang].one),
          h('span', { class: 'product__name product__name--sub', lang: other(lang) }, p[other(lang)].one),
          h('span', { class: 'product__price' }, coinIcon(), ` ${p.price}`),
        )),
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
            h('span', { lang }, qty === 1 ? p[lang].one : p[lang].many), ` × ${qty} `,
            stage.v === 'basket' ? removeBtn(p.id) : null);
        }))
      : h('p', { class: 'muted' }, tr({ es: 'La bolsa está vacía. ¡Toca los productos!', en: 'The bag is empty. Tap the products!' }, lang));
    return Panel(`🧺 ${tr({ es: 'Bolsa', en: 'Bag' }, lang)}`, [
      list,
      stage.v === 'basket' ? Button(biText({ es: '¡Listo!', en: 'Ready!' }, lang), { onClick: submitBasket, disabled: entries.length === 0, focusKey: 'ready' }) : null,
    ]);
  }

  function removeBtn(id: string): HTMLElement {
    const p = PRODUCTS.find((x) => x.id === id)!;
    return Button('−', {
      variant: 'ghost', className: 'btn--mini', focusKey: `rm-${id}`,
      ariaLabel: `${tr({ es: 'Quitar', en: 'Remove one' }, lang)} ${p[lang].one}`,
      onClick: () => {
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
        ariaLabel: `${tr({ es: 'Dar moneda de', en: 'Give coin worth' }, lang)} ${c}`,
        onClick: () => { coins = [...coins, c]; message = null; draw(); },
      })));
    const placed = coins.length && stage.v === 'change'
      ? h('div', { class: 'coins-placed' }, ...coins.map((c, idx) =>
          Button([coinIcon(), ` ${c} ×`], {
            variant: 'ghost', className: 'coin-chip', focusKey: `rm-coin-${idx}`,
            ariaLabel: `${tr({ es: 'Quitar moneda de', en: 'Remove coin worth' }, lang)} ${c}`,
            onClick: () => { coins = coins.filter((_, i) => i !== idx); message = null; draw(); },
          })))
      : null;
    const empty = Button(tr({ es: 'Vaciar', en: 'Empty' }, lang), {
      variant: 'ghost', className: 'btn--mini', disabled: stage.v !== 'change', focusKey: 'empty-coins',
      onClick: () => { coins = []; message = null; draw('coin-1'); },
    });
    const pouch = h('p', {
      class: coins.length ? 'pouch' : 'muted',
      'aria-live': 'polite',
      'data-live': 'change-total',
    }, ...(coins.length
      ? [`${tr({ es: 'Cambio', en: 'Change' }, lang)}: ${sumCoins(coins)} `, coinIcon(), ' ', empty]
      : [tr({ es: 'Elige monedas para el cambio.', en: 'Pick coins for the change.' }, lang)]));
    return Panel(`💰 ${tr({ es: 'Caja', en: 'Till' }, lang)}`, [
      tray, placed, pouch,
      stage.v === 'change' ? Button(biText({ es: 'Dar el cambio', en: 'Give the change' }, lang), { onClick: submitChange, disabled: coins.length === 0, focusKey: 'give-change' }) : null,
    ]);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      wrap.append(GameHeader({
        title: '🛒 Market Quest',
        noun: { es: 'Cliente', en: 'Customer' },
        index, total: CUSTOMERS_PER_DAY, lang,
      }));

      if (stage.v === 'closed') {
        wrap.append(EndCard({
          tone: 'sun',
          title: { es: '¡El mercado cierra por hoy! 🌙', en: 'The market is closed for today! 🌙' },
          art: h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'pegatinas', en: 'stickers' }, lang) }, stickers.join(' ')),
          body: { es: 'Vuelve cuando quieras. ¡Tus pegatinas te esperan!', en: 'Come back whenever you like. Your stickers will wait!' },
          againLabel: { es: 'Otro día de mercado', en: 'Another market day' },
          againFocusKey: 'another-day',
          onAgain: () => ctx.refresh(),
          onBreakChange: () => draw(),
          lang,
        }));
        return wrap;
      }

      const text = (l: typeof lang) => (stage.v === 'basket' ? orderSpeech(order, l, customer) : paySpeech(order, l));
      const moneyExtra = stage.v === 'change'
        ? h('div', { class: 'row' },
            h('span', { class: 'bill-badge' }, `💵 ${order.paid} ${tr({ es: 'monedas', en: 'coins' }, lang)}`),
            order.discount > 0 ? h('span', { class: 'coupon-badge' }, `🎟️ −${order.discount}`) : null)
        : null;

      append(wrap, [
        CharacterBubble({
          emoji: customer.emoji,
          mood: stage.v === 'served' ? '🎉' : stage.v === 'change' ? '💳' : undefined,
          name: tr(customer.name, lang),
          text: stage.v === 'served' ? undefined : text(lang),
          subText: stage.v === 'served' ? undefined : text(other(lang)),
          showSub: translate,
          lang,
          translatePressed: translate,
          onTranslate: () => { translate = !translate; draw(); },
          extra: moneyExtra,
        }),
        stage.v === 'basket' ? scene() : null,
        h('div', { class: 'cols cols--task' },
          stage.v !== 'served' ? basketPanel() : null,
          stage.v === 'change' ? changePanel() : null),
        StatusBanner(message, lang),
        stage.v === 'served' ? Button(tr({ es: 'Siguiente cliente →', en: 'Next customer →' }, lang), { onClick: nextCustomer, large: true, focusKey: 'next-customer' }) : null,
      ]);
      return wrap;
    }, focusTarget);
  }

  draw();
  return Object.assign(() => {}, {
    updateSettings(nextLang: typeof lang) {
      lang = nextLang;
      draw();
    },
  });
};
