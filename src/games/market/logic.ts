import { joinList, numberWord, type Bi, type Lang } from '../../shared/i18n';
import { pick, randInt, shuffle, type Rng } from '../../shared/rng';

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

export type LinePhrase = 'count' | 'pair' | 'half-dozen' | 'double';

export interface OrderLine {
  product: Product;
  qty: number;
  phrase?: LinePhrase;
}
export interface Order {
  lines: OrderLine[];
  total: number;
  discount: number;
  paid: number;
  change: number;
}

export interface Customer {
  emoji: string;
  name: Bi;
  greeting: Bi;
}

export const CUSTOMERS: readonly Customer[] = [
  { emoji: '👵', name: { es: 'la abuela Rosa', en: 'Grandma Rosa' }, greeting: { es: '¡Hola, cielo!', en: 'Hello, dear!' } },
  { emoji: '🧑‍🍳', name: { es: 'el chef Paco', en: 'Chef Paco' }, greeting: { es: '¡A cocinar!', en: "Let's cook!" } },
  { emoji: '🧒', name: { es: 'Lucía', en: 'Lucía' }, greeting: { es: '¡Buenas!', en: 'Hi there!' } },
  { emoji: '🧙', name: { es: 'el mago Merlín', en: 'Merlin the wizard' }, greeting: { es: '¡Abracadabra!', en: 'Abracadabra!' } },
  { emoji: '🐲', name: { es: 'el dragón Dino', en: 'Dino the dragon' }, greeting: { es: '¡Grrr-hola!', en: 'Grrr-hello!' } },
  { emoji: '🧑‍🚀', name: { es: 'la astronauta Ana', en: 'Ana the astronaut' }, greeting: { es: '¡Saludos desde la Luna!', en: 'Greetings from the Moon!' } },
];

export const CUSTOMERS_PER_DAY = 5;

export const orderTotal = (lines: readonly OrderLine[]): number =>
  lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

/** Smallest bill strictly larger than the due amount, so there is always change to give. */
export function billFor(total: number): number {
  return BILLS.find((b) => b > total) ?? Math.ceil((total + 1) / 100) * 100;
}

/** `index` is the customer number within a day (0-based); orders grow naturally for ages 8-12. */
export function generateOrder(rng: Rng, index: number): Order {
  const pool = index === 0 ? PRODUCTS.filter((p) => p.price <= 3) : PRODUCTS;
  const lineCount = index === 0 ? randInt(rng, 1, 2) : index < 3 ? 2 : 3;
  const maxQty = index < 2 ? 3 : 4;
  const lines: OrderLine[] = shuffle(rng, pool)
    .slice(0, lineCount)
    .map((product) => ({ product, qty: randInt(rng, 1, maxQty), phrase: 'count' as LinePhrase }));

  if (index === 1 && lines[0].qty <= 3) {
    lines[0].qty = 2;
    lines[0].phrase = 'pair';
  } else if (index === 2 && lines.length >= 2) {
    lines[1].qty = lines[0].qty * 2;
    lines[1].phrase = 'double';
  } else if (index === 3 && lines[0].product.price <= 2) {
    lines[0].qty = 6;
    lines[0].phrase = 'half-dozen';
  }

  const total = orderTotal(lines);
  const discount = index >= 3 && total >= 8 ? pick(rng, [2, 3]) : 0;
  const due = total - discount;
  const paid = billFor(due);
  return { lines, total, discount, paid, change: paid - due };
}

export function lineText(line: OrderLine, lang: Lang): string {
  const names = line.product[lang];
  if (line.phrase === 'pair' && line.qty === 2) {
    return lang === 'es' ? `un par de ${names.many}` : `a pair of ${names.many}`;
  }
  if (line.phrase === 'half-dozen' && line.qty === 6) {
    return lang === 'es' ? `media docena de ${names.many}` : `half a dozen ${names.many}`;
  }
  if (line.phrase === 'double') {
    return lang === 'es' ? `el doble de ${names.many}` : `twice as many ${names.many}`;
  }
  const name = line.qty === 1 ? names.one : names.many;
  return `${numberWord(line.qty, lang, line.product.gender)} ${name}`;
}

export function orderSpeech(order: Order, lang: Lang, customer?: Customer): string {
  const list = joinList(order.lines.map((l) => lineText(l, lang)), lang);
  const greet = customer ? `${customer.greeting[lang]} ` : lang === 'es' ? '¡Hola! ' : 'Hello! ';
  return lang === 'es' ? `${greet}Quiero ${list}, por favor.` : `${greet}I would like ${list}, please.`;
}

export function paySpeech(order: Order, lang: Lang): string {
  if (order.discount > 0) {
    return lang === 'es'
      ? `Tengo un cupón de ${order.discount} monedas. Aquí tienes ${order.paid} monedas.`
      : `I have a ${order.discount}-coin coupon. Here you go, ${order.paid} coins.`;
  }
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
    : { es: '💰 El cliente sacude la bolsa… ¡suenan pocas monedas! Faltan algunas.', en: '💰 The customer shakes the pouch… it barely jingles! Some coins are missing.' };
}
