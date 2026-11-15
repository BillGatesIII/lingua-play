import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { PRODUCTS, basketMatches, billFor, checkChange, generateOrder, orderSpeech, orderTotal } from './logic';

describe('market logic', () => {
  it('always needs change and the numbers add up', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 5; i++) {
      for (let n = 0; n < 50; n++) {
        const o = generateOrder(rng, i);
        expect(o.total).toBe(orderTotal(o.lines));
        expect(o.discount).toBeGreaterThanOrEqual(0);
        const due = o.total - o.discount;
        expect(due).toBeGreaterThan(0);
        expect(o.paid).toBeGreaterThan(due);
        expect(o.change).toBe(o.paid - due);
      }
    }
  });

  it('scales into richer phrases and coupons across the day', () => {
    const rng = mulberry32(11);
    const pairOrder = generateOrder(rng, 1);
    expect(pairOrder.lines[0].qty).toBe(2);
    expect(orderSpeech(pairOrder, 'en')).toContain('a pair of');
    expect(orderSpeech(pairOrder, 'es')).toContain('un par de');

    const doubleOrder = generateOrder(rng, 2);
    expect(doubleOrder.lines[1].qty).toBe(doubleOrder.lines[0].qty * 2);
    expect(orderSpeech(doubleOrder, 'es')).toContain('el doble de');
    expect(orderSpeech(doubleOrder, 'en')).toContain('twice as many');
  });

  it('billFor picks the next bill above the total', () => {
    expect(billFor(4)).toBe(5);
    expect(billFor(5)).toBe(10);
    expect(billFor(120)).toBe(200);
  });

  it('matches baskets exactly', () => {
    const o = generateOrder(mulberry32(3), 0);
    const ok = Object.fromEntries(o.lines.map((l) => [l.product.id, l.qty]));
    expect(basketMatches(o, ok)).toBe(true);
    expect(basketMatches(o, { ...ok, [o.lines[0].product.id]: o.lines[0].qty + 1 })).toBe(false);
    const other = PRODUCTS.find((p) => !(p.id in ok))!;
    expect(basketMatches(o, { ...ok, [other.id]: 1 })).toBe(false);
  });

  it('checks change', () => {
    const o = generateOrder(mulberry32(5), 0);
    expect(checkChange(o, [o.change])).toBe('exact');
    expect(checkChange(o, [o.change + 1])).toBe('too-much');
    expect(checkChange(o, [o.change - 1])).toBe('too-little');
  });

  it('speaks in both languages', () => {
    const o = generateOrder(mulberry32(7), 0);
    expect(orderSpeech(o, 'es')).toContain('Quiero');
    expect(orderSpeech(o, 'en')).toContain('would like');
  });
});
