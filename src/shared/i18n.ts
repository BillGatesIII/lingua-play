export type Lang = 'es' | 'en';
export type Bi = { es: string; en: string };

const ES_NUM = [
  'cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
];
const EN_NUM = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

/** Number as a word (0-20), falling back to digits. Spanish "uno" becomes "un/una" by gender. */
export function numberWord(n: number, lang: Lang, gender: 'm' | 'f' = 'm'): string {
  if (!Number.isInteger(n) || n < 0 || n > 20) return String(n);
  if (lang === 'en') return EN_NUM[n];
  return n === 1 && gender === 'f' ? 'una' : ES_NUM[n];
}

/** Join items like "a, b y c" / "a, b and c". */
export function joinList(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('');
  const word = lang === 'es' ? 'y' : 'and';
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}
