export type Lang = 'es' | 'en';
export type Bi = { es: string; en: string };

export const other = (lang: Lang): Lang => (lang === 'es' ? 'en' : 'es');
export const tr = (b: Bi, lang: Lang): string => b[lang];

const ES_NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Number as a word (0-10), falling back to digits. Spanish "uno" becomes "un/una" by gender. */
export function numberWord(n: number, lang: Lang, gender: 'm' | 'f' = 'm'): string {
  if (!Number.isInteger(n) || n < 0 || n > 10) return String(n);
  if (lang === 'en') return EN_NUM[n];
  return n === 1 && gender === 'f' ? 'una' : ES_NUM[n];
}

/** Join items like "a, b y c" / "a, b and c". */
export function joinList(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('');
  const word = lang === 'es' ? 'y' : 'and';
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}
