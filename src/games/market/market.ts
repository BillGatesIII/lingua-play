import { diagnoseBasketMistake, diagnoseChangeMistake, scaffoldVocab } from '../../shared/coach';
import { numberWord } from '../../shared/i18n';
import { completeGameRound } from '../../shared/playBreak';
import { mulberry32, pick, shuffle } from '../../shared/rng';
import { playSfx } from '../../shared/sfx';
import { createGameDirector } from '../../shared/speechDirector';
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
  const director = createGameDirector(rng);
  const stage = { v: 'basket' as Stage };
  const queue = shuffle(rng, CUSTOMERS).slice(0, CUSTOMERS_PER_DAY);
  let index = 0;
  let order: Order = generateOrder(rng, index);
  let customer = queue[index];
  let basket: Basket = {};
  let coins: number[] = [];
  let message: string | null = null;
  const stickers: string[] = [];

  const root = ctx.root;
  const host = h('div', { class: 'world world--market' });
  root.append(host);

  const say = (m: string | null, focusTarget?: string) => {
    message = m;
    draw(focusTarget);
  };

  function nextCustomer() {
    index++;
    director.nextPuzzle();
    if (index >= CUSTOMERS_PER_DAY) {
      stage.v = 'closed';
      completeGameRound();
      playSfx('levelUp');
      speakEnglish(director.pickLine('closed', [
        'Well done! The market is closed for today!',
        'Splendid work! Time to pack up the stall!',
        'What a busy market day! Brilliant job!',
        'All shoppers served! Cheerio for now!',
      ]), { mode: 'event' });
    } else {
      order = generateOrder(rng, index);
      customer = queue[index];
      basket = {};
      coins = [];
      stage.v = 'basket';
      playSfx('step');
      const intro = director.transition('customer', [
        customer.greeting.en,
        `Here comes ${customer.name.en}!`,
        `Next shopper: ${customer.name.en}!`,
      ], 2);
      if (intro) speakEnglish(intro, { mode: 'event' });
    }
    message = null;
    draw(stage.v === 'closed' ? 'another-day' : `p-${PRODUCTS[0].id}`);
  }

  function submitBasket(anchor?: HTMLElement) {
    if (basketMatches(order, basket)) {
      stage.v = 'change';
      director.nextPuzzle();
      playSfx('surprise');
      speakEnglish(director.pickLine('bag-ok', [
        'Spot on! Now for the change.',
        'Lovely! Everything is in the bag.',
        'Smashing! Time to count the change.',
        'Perfect! That is the exact order.',
      ]), { anchor, mode: 'event' });
      say('¡Perfecto! 😄 Ahora el cliente te da el dinero. ¿Cuánto cambio le devuelves?', 'coin-1');
    } else {
      playSfx('oops');
      const m = basketMistake(order, basket, rng);
      const advice = diagnoseBasketMistake(order, basket);
      const line = director.encourage(advice.hint, advice.first ?? m.en);
      speakEnglish(line, { anchor, mode: 'event' });
      say(m.es);
    }
  }

  function submitChange(anchor?: HTMLElement) {
    const result = checkChange(order, coins);
    if (result !== 'exact') {
      playSfx('oops');
      const advice = diagnoseChangeMistake(order, coins);
      const firstLine = advice?.first ?? (result === 'too-much'
        ? director.pickLine('too-much', ['Too much change!', 'Whoa, too many coins!', 'A bit too much change!'])
        : director.pickLine('too-little', ['Not enough coins!', 'A few coins short!', 'That needs a bit more change!']));
      const hint = advice?.hint ?? (result === 'too-much'
        ? 'Take away a coin and check the total again.'
        : 'Add a bit more change after counting the price.');
      speakEnglish(director.encourage(hint, firstLine), { anchor, mode: 'event' });
      return say(changeFeedback(result).es, 'give-change');
    }
    const sticker = pick(rng, PRODUCTS).emoji;
    stickers.push(sticker);
    updateProgress((p) => {
      p.market.served += 1;
      if (!p.market.stickers.includes(sticker)) p.market.stickers.push(sticker);
    });
    stage.v = 'served';
    playSfx('surprise');
    speakEnglish(director.celebrate(director.pickLine('served', [
      'Happy customer! Cheers!',
      'Lovely service! Thank you!',
      'One happy shopper!',
      'Ta very much!',
    ])), { anchor, mode: 'event' });
    say(`¡Cliente feliz! 🎉 Te regala una pegatina ${sticker}`, 'next-customer');
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
            const label = nextQty === 1
              ? scaffoldVocab(p.en.one, 'product', rng, p.en.one)
              : `${numberWord(nextQty, 'en')} ${p.en.many}`;
            speakEnglish(label, {
              anchor: e.currentTarget as HTMLElement,
              mode: 'click',
              role: 'step',
              topic: nextQty === 1 ? p.en.one : `market-${p.id}-${nextQty}`,
              coalesceKey: 'market-bag',
            });
            basket = { ...basket, [p.id]: nextQty };
            message = null;
            draw();
          },
        },
        h('span', { class: 'product__emoji', 'aria-hidden': 'true' }, p.emoji),
        h('span', { class: 'product__name', lang: 'es' }, p.es.one),
        h('span', { class: 'product__price' }, coinIcon(), ` ${p.price}`));
        return addHoverVoice(btn, p.en.one, { role: 'vocab' });
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
        voiceRole: 'vocab',
        onClick: (e) => {
          playSfx('coin');
          coins = [...coins, c];
          const sum = sumCoins(coins);
          speakEnglish(`${sum} ${sum === 1 ? 'coin' : 'coins'}`, {
            anchor: e.currentTarget as HTMLElement,
            mode: 'click',
            role: 'step',
            topic: `market-change-${sum}`,
            coalesceKey: 'market-coins',
          });
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
        noun: 'Cliente',
        index, total: CUSTOMERS_PER_DAY,
      }));

      if (stage.v === 'closed') {
        wrap.append(EndCard({
          tone: 'sun',
          title: '¡El mercado cierra por hoy! 🌙',
          art: h('p', { class: 'big-emoji', 'aria-label': 'pegatinas' }, stickers.join(' ')),
          body: 'Vuelve cuando quieras. ¡Tus pegatinas te esperan!',
          againLabel: 'Otro día de mercado',
          againVoice: 'Another market day',
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
