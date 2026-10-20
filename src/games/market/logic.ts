import { joinList, numberWord, type Bi, type Lang } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';
import type { ChallengeLevel } from '../../shared/adaptive';

export interface Product {
  id: string;
  emoji: string;
  gender: 'm' | 'f';
  es: { one: string; many: string };
  en: { one: string; many: string };
  price: number;
}

export const PRODUCTS: readonly Product[] = [
  { id: 'banana', emoji: '🍌', gender: 'm', es: { one: 'plátano', many: 'plátanos' }, en: { one: 'banana', many: 'bananas' }, price: 1 },
  { id: 'egg', emoji: '🥚', gender: 'm', es: { one: 'huevo', many: 'huevos' }, en: { one: 'egg', many: 'eggs' }, price: 1 },
  { id: 'apple', emoji: '🍎', gender: 'f', es: { one: 'manzana', many: 'manzanas' }, en: { one: 'apple', many: 'apples' }, price: 2 },
  { id: 'orange', emoji: '🍊', gender: 'f', es: { one: 'naranja', many: 'naranjas' }, en: { one: 'orange', many: 'oranges' }, price: 2 },
  { id: 'bread', emoji: '🍞', gender: 'm', es: { one: 'pan', many: 'panes' }, en: { one: 'loaf of bread', many: 'loaves of bread' }, price: 3 },
  { id: 'tomato', emoji: '🍅', gender: 'm', es: { one: 'tomate', many: 'tomates' }, en: { one: 'tomato', many: 'tomatoes' }, price: 2 },
  { id: 'cheese', emoji: '🧀', gender: 'm', es: { one: 'queso', many: 'quesos' }, en: { one: 'cheese', many: 'cheeses' }, price: 5 },
  { id: 'melon', emoji: '🍉', gender: 'f', es: { one: 'sandía', many: 'sandías' }, en: { one: 'watermelon', many: 'watermelons' }, price: 6 },
];

export const COINS = [1, 2, 5, 10, 20] as const;
const BILLS = [5, 10, 20, 50, 100];

export interface OrderLine {
  product: Product;
  qty: number;
}
export interface Order {
  lines: OrderLine[];
  total: number;
  paid: number;
  change: number;
}

export const CUSTOMERS = [
  { emoji: '👵', name: { es: 'la abuela Rosa', en: 'Grandma Rosa' } },
  { emoji: '🧑‍🍳', name: { es: 'el chef Paco', en: 'Chef Paco' } },
  { emoji: '🧒', name: { es: 'Lucía', en: 'Lucía' } },
  { emoji: '🧙', name: { es: 'el mago Merlín', en: 'Merlin the wizard' } },
  { emoji: '🐲', name: { es: 'el dragón Dino', en: 'Dino the dragon' } },
  { emoji: '🧑‍🚀', name: { es: 'la astronauta Ana', en: 'Ana the astronaut' } },
] as const;

export const CUSTOMERS_PER_DAY = 5;

export const orderTotal = (lines: readonly OrderLine[]): number =>
  lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

/** Smallest bill strictly larger than the total, so there is always change to give. */
export function billFor(total: number): number {
  return BILLS.find((b) => b > total) ?? Math.ceil((total + 1) / 100) * 100;
}

/** `index` is the customer number within a day (0-based); orders grow as the day goes on. */
export function generateOrder(rng: Rng, level: ChallengeLevel, index: number): Order {
  const pool = level === 0 ? PRODUCTS.filter((p) => p.price <= 3) : level === 1 ? PRODUCTS.filter((p) => p.price <= 5) : PRODUCTS;
  const lineCount = Math.min((level === 0 ? 1 : 2) + Math.floor(index / 2), 3);
  const maxQty = level === 0 ? 3 : level === 1 ? 4 : 5;
  const lines = shuffle(rng, pool)
    .slice(0, lineCount)
    .map((product) => ({ product, qty: randInt(rng, 1, maxQty) }));
  const total = orderTotal(lines);
  const paid = billFor(total);
  return { lines, total, paid, change: paid - total };
}

export function lineText(line: OrderLine, lang: Lang): string {
  const names = line.product[lang];
  const name = line.qty === 1 ? names.one : names.many;
  return `${numberWord(line.qty, lang, line.product.gender)} ${name}`;
}

export function orderSpeech(order: Order, lang: Lang): string {
  const list = joinList(order.lines.map((l) => lineText(l, lang)), lang);
  return lang === 'es' ? `¡Hola! Quiero ${list}, por favor.` : `Hello! I would like ${list}, please.`;
}

export function paySpeech(order: Order, lang: Lang): string {
  return lang === 'es'
    ? `Aquí tienes ${order.paid} monedas.`
    : `Here you go, ${order.paid} coins.`;
}

export type Basket = Record<string, number>;

export const basketMatches = (order: Order, basket: Basket): boolean => {
  const wanted = new Map(order.lines.map((l) => [l.product.id, l.qty]));
  const ids = new Set([...wanted.keys(), ...Object.keys(basket).filter((k) => basket[k] > 0)]);
  return [...ids].every((id) => (wanted.get(id) ?? 0) === (basket[id] ?? 0));
};

/** Playful, never-scolding feedback for a wrong basket. */
export function basketMistake(order: Order, basket: Basket, rng: Rng): Bi {
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
  const wanted = new Map(order.lines.map((l) => [l.product.id, l.qty]));
  const extra = Object.keys(basket).find((id) => basket[id] > 0 && !wanted.has(id));
  if (extra) {
    const p = byId.get(extra)!;
    return {
      es: `¡Ups! ${p.emoji} Nadie pidió ${p.es.many}. ¡Ahora el cliente se ríe a carcajadas!`,
      en: `Oops! ${p.emoji} Nobody asked for ${p.en.many}. Now the customer is laughing out loud!`,
    };
  }
  for (const [id, qty] of wanted) {
    const have = basket[id] ?? 0;
    const p = byId.get(id)!;
    if (have > qty) {
      return pick(rng, [
        { es: `¡Cuántos ${p.es.many}! ${p.emoji.repeat(Math.min(have, 8))} ¡Se los pone de sombrero!`, en: `So many ${p.en.many}! ${p.emoji.repeat(Math.min(have, 8))} They're wearing them as a hat!` },
        { es: `${p.emoji} ¡Qué montón de ${p.es.many}! No caben en la bolsa.`, en: `${p.emoji} What a pile of ${p.en.many}! They don't fit in the bag.` },
      ]);
    }
    if (have < qty) {
      return {
        es: `${p.emoji} Mmm… el cliente cuenta y cuenta… ¡Falta algo en la bolsa!`,
        en: `${p.emoji} Hmm… the customer counts and counts… something is missing from the bag!`,
      };
    }
  }
  return { es: '¡Casi!', en: 'Almost!' };
}

export const sumCoins = (coins: readonly number[]): number => coins.reduce((a, b) => a + b, 0);

export type ChangeResult = 'exact' | 'too-much' | 'too-little';
export const checkChange = (order: Order, coins: readonly number[]): ChangeResult => {
  const given = sumCoins(coins);
  return given === order.change ? 'exact' : given > order.change ? 'too-much' : 'too-little';
};

export function changeFeedback(result: Exclude<ChangeResult, 'exact'>): Bi {
  return result === 'too-much'
    ? { es: '¡Qué generoso! 🤑 Pero la tienda se queda sin monedas. Devuelve alguna.', en: "How generous! 🤑 But the shop is running out of coins. Take some back." }
    : { es: '🪙 El cliente sacude la bolsa… ¡suenan pocas monedas! Faltan algunas.', en: '🪙 The customer shakes the pouch… it barely jingles! Some coins are missing.' };
}
