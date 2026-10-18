import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { PRODUCTS, basketMatches, billFor, checkChange, generateOrder, orderSpeech, orderTotal } from './logic';

describe('market logic', () => {
  it('always needs change and the numbers add up', () => {
    const rng = mulberry32(1);
    for (const band of ['7-10', '11-14'] as const) {
      for (let i = 0; i < 5; i++) {
        for (let n = 0; n < 50; n++) {
          const o = generateOrder(rng, band, i);
          expect(o.total).toBe(orderTotal(o.lines));
          expect(o.paid).toBeGreaterThan(o.total);
          expect(o.change).toBe(o.paid - o.total);
        }
      }
    }
  });

  it('billFor picks the next bill above the total', () => {
    expect(billFor(4)).toBe(5);
    expect(billFor(5)).toBe(10);
    expect(billFor(120)).toBe(200);
  });

  it('matches baskets exactly', () => {
    const o = generateOrder(mulberry32(3), '7-10', 0);
    const ok = Object.fromEntries(o.lines.map((l) => [l.product.id, l.qty]));
    expect(basketMatches(o, ok)).toBe(true);
    expect(basketMatches(o, { ...ok, [o.lines[0].product.id]: o.lines[0].qty + 1 })).toBe(false);
    const other = PRODUCTS.find((p) => !(p.id in ok))!;
    expect(basketMatches(o, { ...ok, [other.id]: 1 })).toBe(false);
  });

  it('checks change', () => {
    const o = generateOrder(mulberry32(5), '7-10', 0);
    expect(checkChange(o, [o.change])).toBe('exact');
    expect(checkChange(o, [o.change + 1])).toBe('too-much');
    expect(checkChange(o, [o.change - 1])).toBe('too-little');
  });

  it('speaks in both languages', () => {
    const o = generateOrder(mulberry32(7), '7-10', 0);
    expect(orderSpeech(o, 'es')).toContain('Quiero');
    expect(orderSpeech(o, 'en')).toContain('would like');
  });
});
