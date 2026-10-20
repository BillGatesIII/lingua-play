import { mulberry32, pick } from '../../shared/rng';
import { tr, other, type Bi } from '../../shared/i18n';
import { updateProgress } from '../../shared/storage';
import { createAdaptiveChallenge } from '../../shared/adaptive';
import type { Page } from '../../pages/types';
import { Button, Card, Panel, biText } from '../../ui/components';
import { append, h } from '../../ui/dom';
import { renderKeepingFocus } from '../../ui/focus';
import {
  COINS, CUSTOMERS, CUSTOMERS_PER_DAY, PRODUCTS, basketMatches, basketMistake, changeFeedback,
  checkChange, generateOrder, orderSpeech, paySpeech, sumCoins, type Basket, type Order,
} from './logic';

type Stage = 'basket' | 'change' | 'served' | 'closed';

export const marketPage: Page = (ctx) => {
  let { lang } = ctx;
  const challenge = createAdaptiveChallenge();
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
  const stage = { v: 'basket' as Stage };
  let index = 0;
  let order: Order = generateOrder(rng, challenge.level, index);
  let customer = pick(rng, CUSTOMERS);
  let basket: Basket = {};
  let coins: number[] = [];
  let message: Bi | null = null;
  let translate = false;
  let misses = 0;
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
    } else {
      order = generateOrder(rng, challenge.level, index);
      customer = pick(rng, CUSTOMERS);
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
      misses++;
      say(basketMistake(order, basket, rng));
    }
  }

  function submitChange() {
    const result = checkChange(order, coins);
    if (result !== 'exact') {
      misses++;
      return say(changeFeedback(result), 'give-change');
    }
    challenge.complete(misses);
    misses = 0;
    const sticker = pick(rng, PRODUCTS).emoji;
    stickers.push(sticker);
    updateProgress((p) => {
      p.market.served += 1;
      if (!p.market.stickers.includes(sticker)) p.market.stickers.push(sticker);
    });
    stage.v = 'served';
    say({ es: `¡Cliente feliz! 🎉 Te regala una pegatina ${sticker}`, en: `Happy customer! 🎉 You got a sticker ${sticker}` }, 'next-customer');
  }

  const speech = (): HTMLElement => {
    const text = (l: typeof lang) => (stage.v === 'basket' ? orderSpeech(order, l) : paySpeech(order, l));
    return h(
      'div',
      { class: 'bubble' },
      h('p', { class: 'bubble__main', lang }, text(lang)),
      translate ? h('p', { class: 'bubble__sub', lang: other(lang) }, text(other(lang))) : null,
    );
  };

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
          h('span', { class: 'product__price' }, `🪙 ${p.price}`),
        )),
    );
    return h('div', { class: 'stall' }, h('div', { class: 'awning', 'aria-hidden': 'true' }), products);
  }

  function basketPanel(): HTMLElement {
    const entries = PRODUCTS.filter((p) => (basket[p.id] ?? 0) > 0);
    const list = entries.length
      ? h('ul', { class: 'basket' }, ...entries.map((p) =>
          h('li', {},
            h('span', { 'aria-hidden': 'true' }, p.emoji),
            h('span', { lang }, p[lang].one), ` × ${basket[p.id]} `,
            stage.v === 'basket'
              ? removeBtn(p.id)
              : null)))
      : h('p', { class: 'muted' }, tr({ es: 'La bolsa está vacía. ¡Toca los productos!', en: 'The bag is empty. Tap the products!' }, lang));
    return Panel(`🧺 ${tr({ es: 'Bolsa', en: 'Bag' }, lang)}`, [
      list,
      stage.v === 'basket' ? Button(biText({ es: '¡Listo!', en: 'Ready!' }, lang), { onClick: submitBasket, disabled: entries.length === 0, focusKey: 'ready' }) : null,
    ]);
  }

  function removeBtn(id: string): HTMLElement {
    const p = PRODUCTS.find((x) => x.id === id)!;
    const b = Button('−', {
      variant: 'ghost', className: 'btn--mini',
      ariaLabel: `${tr({ es: 'Quitar', en: 'Remove one' }, lang)} ${p[lang].one}`,
      onClick: () => {
        const { [id]: n, ...rest } = basket;
        basket = n > 1 ? { ...rest, [id]: n - 1 } : rest;
        message = null;
        draw();
      },
    });
    b.dataset.focus = `rm-${id}`;
    return b;
  }

  function changePanel(): HTMLElement {
    const tray = h('div', { class: 'coins' }, ...COINS.map((c) => {
      const b = Button(`🪙 ${c}`, {
        variant: 'secondary', className: 'coin', disabled: stage.v !== 'change',
        ariaLabel: `${tr({ es: 'Dar moneda de', en: 'Give coin worth' }, lang)} ${c}`,
        onClick: () => { coins = [...coins, c]; message = null; draw(); },
      });
      b.dataset.focus = `coin-${c}`;
      return b;
    }));
    const empty = Button(tr({ es: 'Vaciar', en: 'Empty' }, lang), { variant: 'ghost', className: 'btn--mini', disabled: stage.v !== 'change', onClick: () => { coins = []; message = null; draw(); } });
    empty.dataset.focus = 'empty-coins';
    const pouch = h('p', {
      class: coins.length ? 'pouch' : 'muted',
      'aria-live': 'polite',
      'data-live': 'change-total',
    }, coins.length
      ? `${tr({ es: 'Cambio', en: 'Change' }, lang)}: ${sumCoins(coins)} 🪙 `
      : tr({ es: 'Elige monedas para el cambio.', en: 'Pick coins for the change.' }, lang),
    coins.length ? empty : null);
    return Panel(`💰 ${tr({ es: 'Caja', en: 'Till' }, lang)}`, [
      tray, pouch,
      stage.v === 'change' ? Button(biText({ es: 'Dar el cambio', en: 'Give the change' }, lang), { onClick: submitChange, disabled: coins.length === 0, focusKey: 'give-change' }) : null,
    ]);
  }

  function draw(focusTarget?: string) {
    renderKeepingFocus(host, () => {
      const wrap = h('div', { class: 'game' });
      const head = h('header', { class: 'game__head' },
        h('div', {}, h('h1', { class: 'game__title' }, '🛒 Market Quest'),
          h('p', { class: 'muted' }, `${tr({ es: 'Cliente', en: 'Customer' }, lang)} ${Math.min(index + 1, CUSTOMERS_PER_DAY)} / ${CUSTOMERS_PER_DAY}`)),
        Button('← ' + tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'ghost', href: '#/' }));
      wrap.append(head);

      if (stage.v === 'closed') {
        wrap.append(Card([
          h('h2', {}, tr({ es: '¡El mercado cierra por hoy! 🌙', en: 'The market is closed for today! 🌙' }, lang)),
          h('p', { class: 'big-emoji', 'aria-label': tr({ es: 'pegatinas', en: 'stickers' }, lang) }, stickers.join(' ')),
          h('p', {}, tr({ es: 'Vuelve cuando quieras. ¡Tus pegatinas te esperan!', en: 'Come back whenever you like. Your stickers will wait!' }, lang)),
          h('div', { class: 'row' },
            Button(tr({ es: 'Otro día de mercado', en: 'Another market day' }, lang), { onClick: () => ctx.refresh(), focusKey: 'another-day' }),
            Button(tr({ es: 'Inicio', en: 'Home' }, lang), { variant: 'secondary', href: '#/' })),
        ], 'sun', 'end-card'));
        return wrap;
      }

      append(wrap, [
        h('div', { class: 'customer' },
          h('div', { class: 'customer__face', 'aria-hidden': 'true' }, customer.emoji),
          h('div', {}, h('p', { class: 'customer__name' }, tr(customer.name, lang)), stage.v === 'served' ? null : speech()),
          Button(`🦜 ${tr({ es: 'Traducir', en: 'Translate' }, lang)}`, { variant: 'ghost', pressed: translate, focusKey: 'translate', onClick: () => { translate = !translate; draw(); } })),
        scene(),
        h('div', { class: 'cols' }, basketPanel(), changePanel()),
        h('div', { class: `message ${message ? 'message--on' : ''}`, role: 'status', 'aria-live': 'polite', 'data-live': 'message' },
          message ? biText(message, lang) : null),
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
