import { joinList, type Bi, type Lang } from '../../shared/i18n';
import { pick, shuffle, type Rng } from '../../shared/rng';

export interface Ingredient {
  id: string;
  emoji: string;
  name: Bi;
  gender?: 'm' | 'f';
  plural?: boolean;
}

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'strawberry', emoji: '🍓', name: { es: 'fresas', en: 'strawberries' }, gender: 'f', plural: true },
  { id: 'lemon', emoji: '🍋', name: { es: 'limón', en: 'lemon' }, gender: 'm' },
  { id: 'milk', emoji: '🥛', name: { es: 'leche', en: 'milk' }, gender: 'f' },
  { id: 'honey', emoji: '🍯', name: { es: 'miel', en: 'honey' }, gender: 'f' },
  { id: 'carrot', emoji: '🥕', name: { es: 'zanahoria', en: 'carrot' }, gender: 'f' },
  { id: 'cocoa', emoji: '🍫', name: { es: 'cacao', en: 'cocoa' }, gender: 'm' },
];

export type VerbId = 'slice' | 'stir' | 'bake' | 'chill';
export interface CookVerb {
  id: VerbId;
  emoji: string;
  label: Bi;
  imperative: Bi;
}

export const VERBS: readonly CookVerb[] = [
  { id: 'slice', emoji: '🔪', label: { es: 'Cortar', en: 'Slice' }, imperative: { es: 'corta', en: 'slice it' } },
  { id: 'stir', emoji: '🥄', label: { es: 'Mezclar', en: 'Stir' }, imperative: { es: 'mezcla', en: 'stir it' } },
  { id: 'bake', emoji: '🔥', label: { es: 'Hornear', en: 'Bake' }, imperative: { es: 'hornea', en: 'bake it' } },
  { id: 'chill', emoji: '❄️', label: { es: 'Enfriar', en: 'Chill' }, imperative: { es: 'enfría', en: 'chill it' } },
];

export interface Dish {
  emoji: string;
  name: Bi;
  color: string;
  gender?: 'm' | 'f';
  plural?: boolean;
  uncountableEn?: boolean;
}

export const DISHES: readonly Dish[] = [
  { emoji: '🍲', name: { es: 'sopa arcoíris', en: 'rainbow soup' }, color: '#ff924c', gender: 'f', uncountableEn: true },
  { emoji: '🥤', name: { es: 'batido espacial', en: 'space smoothie' }, color: '#b388ff', gender: 'm' },
  { emoji: '🍕', name: { es: 'pizza monstruo', en: 'monster pizza' }, color: '#ffd23f', gender: 'f' },
  { emoji: '🥗', name: { es: 'ensalada mágica', en: 'magic salad' }, color: '#52b788', gender: 'f' },
  { emoji: '🧁', name: { es: 'pastelillo estrella', en: 'star cupcake' }, color: '#ff7eb6', gender: 'm' },
  { emoji: '🥞', name: { es: 'tortitas cósmicas', en: 'cosmic pancakes' }, color: '#f4a261', gender: 'f', plural: true },
  { emoji: '🍛', name: { es: 'curry volcán', en: 'volcano curry' }, color: '#e76f51', gender: 'm' },
  { emoji: '🎂', name: { es: 'tarta de mago', en: 'wizard cake' }, color: '#c77dff', gender: 'f' },
  { emoji: '🍜', name: { es: 'fideos dragón', en: 'dragon noodles' }, color: '#ff9f1c', gender: 'm', plural: true },
  { emoji: '🍨', name: { es: 'helado de nube', en: 'cloud ice cream' }, color: '#72efdd', gender: 'm', uncountableEn: true },
  { emoji: '🥧', name: { es: 'pastel lunar', en: 'moonlight pie' }, color: '#f7b267', gender: 'm' },
  { emoji: '🌮', name: { es: 'taco pirata', en: 'pirate taco' }, color: '#90be6d', gender: 'm' },
];

export const CHEFS = [
  { emoji: '🐻', name: { es: 'el oso Bruno', en: 'Bruno the bear' } },
  { emoji: '🐸', name: { es: 'la rana Lola', en: 'Lola the frog' } },
  { emoji: '🦊', name: { es: 'el zorro Félix', en: 'Felix the fox' } },
  { emoji: '🐼', name: { es: 'el panda Pipo', en: 'Pipo the panda' } },
  { emoji: '🐰', name: { es: 'la coneja Sofía', en: 'Sofía the rabbit' } },
  { emoji: '🦉', name: { es: 'el búho Otto', en: 'Otto the owl' } },
  { emoji: '🐧', name: { es: 'la pingüina Nina', en: 'Nina the penguin' } },
  { emoji: '🐨', name: { es: 'el koala Kiko', en: 'Kiko the koala' } },
  { emoji: '🦁', name: { es: 'el león Leo', en: 'Leo the lion' } },
  { emoji: '🐙', name: { es: 'el pulpo Polo', en: 'Polo the octopus' } },
] as const;

/** Returns the Spanish compliment adjective (`delicioso`/`deliciosa`/`deliciosos`/`deliciosas`) for a dish. */
export function dishComplimentEs(dish: Dish): string {
  const stem = (dish.gender ?? 'm') === 'f' ? 'deliciosa' : 'delicioso';
  return dish.plural ? `${stem}s` : stem;
}

export const RECIPES_PER_ROUND = 5;
export const SCOOPS = [1, 2, 4] as const;

export interface Recipe {
  dish: Dish;
  ingredients: Ingredient[];
  baseQuarters: number;
  scale: 1 | 2;
  targetQuarters: number;
  maxQuarters: number;
  verb: CookVerb;
}

export function generateRecipe(rng: Rng, index: number, dishOverride?: Dish): Recipe {
  const dish = dishOverride ?? DISHES[index % DISHES.length];
  const ingCount = index < 2 ? 1 : 2;
  const ingredients = shuffle(rng, INGREDIENTS).slice(0, ingCount);
  const baseChoices = index === 0 ? [2, 4] : [1, 2, 3, 4];
  const baseQuarters = pick(rng, baseChoices);
  const scale: 1 | 2 = index >= 3 && baseQuarters <= 3 ? 2 : 1;
  const targetQuarters = baseQuarters * scale;
  const maxQuarters = 8;
  const verb = pick(rng, VERBS);
  return { dish, ingredients, baseQuarters, scale, targetQuarters, maxQuarters, verb };
}

export function quartersText(q: number, lang: Lang): string {
  const whole = Math.floor(q / 4);
  const rem = q % 4;
  const fracMap: Record<number, Bi> = {
    1: { es: 'un cuarto de taza', en: 'a quarter cup' },
    2: { es: 'media taza', en: 'half a cup' },
    3: { es: 'tres cuartos de taza', en: 'three quarters of a cup' },
  };
  if (whole === 0 && rem > 0) return fracMap[rem][lang];
  if (rem === 0) {
    if (whole === 1) return lang === 'es' ? 'una taza entera' : 'one whole cup';
    return lang === 'es' ? `${whole} tazas` : `${whole} cups`;
  }
  const wholePart = whole === 1 ? (lang === 'es' ? 'una taza' : 'one cup') : `${whole} ${lang === 'es' ? 'tazas' : 'cups'}`;
  return lang === 'es' ? `${wholePart} y ${fracMap[rem].es}` : `${wholePart} and ${fracMap[rem].en}`;
}

export function quartersBadge(q: number): string {
  const whole = Math.floor(q / 4);
  const rem = q % 4;
  const fracs = ['', '¼', '½', '¾'];
  if (q === 0) return '0';
  if (whole === 0) return fracs[rem];
  if (rem === 0) return String(whole);
  return `${whole} ${fracs[rem]}`;
}

const wrapIdx = (index: number, length: number): number =>
  ((Math.trunc(index) % length) + length) % length;

const cap = (text: string): string => (text ? text[0].toUpperCase() + text.slice(1) : text);

function dishPhrase(dish: Dish, lang: Lang): string {
  if (lang === 'es') {
    const art = dish.plural
      ? (dish.gender === 'f' ? 'unas' : 'unos')
      : (dish.gender === 'f' ? 'una' : 'un');
    return `${art} ${dish.name.es}`;
  }
  if (dish.plural || dish.uncountableEn) return dish.name.en;
  const art = /^[aeiou]/i.test(dish.name.en) ? 'an' : 'a';
  return `${art} ${dish.name.en}`;
}

export function recipeSpeech(r: Recipe, lang: Lang, variant = 0): string {
  const ings = joinList(r.ingredients.map((i) => `${i.name[lang]} ${i.emoji}`), lang);
  const amt = quartersText(r.baseQuarters, lang);
  const dishEs = dishPhrase(r.dish, 'es');
  const dishEn = dishPhrase(r.dish, 'en');
  if (r.scale === 2) {
    const doubled: readonly Bi[] = [
      {
        es: `¡Quiero ${dishEs}! Pon ${ings} con ${amt}… ¡pero somos dos, así que prepara el doble y luego ${r.verb.imperative.es}!`,
        en: `I want ${dishEn}! Add ${ings} with ${amt}… but there are two of us, so make double and then ${r.verb.imperative.en}!`,
      },
      {
        es: `¡Hoy cenamos en pareja! Para ${dishEs} usa ${ings}, mide el doble de ${amt} y al final ${r.verb.imperative.es}.`,
        en: `Dinner for two today! For ${dishEn}, use ${ings}, measure double ${amt}, and then ${r.verb.imperative.en}.`,
      },
      {
        es: `¡Qué hambre tenemos los dos! Prepara ${dishEs} con ${ings}, el doble de ${amt}, y luego ${r.verb.imperative.es}!`,
        en: `Both of us are starving! Make ${dishEn} with ${ings}, double ${amt}, and then ${r.verb.imperative.en}!`,
      },
    ];
    return doubled[wrapIdx(variant, doubled.length)][lang];
  }
  const single: readonly Bi[] = [
    {
      es: `¡Prepara ${dishEs}! Usa ${ings}, mide ${amt} y luego ${r.verb.imperative.es}.`,
      en: `Make ${dishEn}! Use ${ings}, measure ${amt}, and then ${r.verb.imperative.en}.`,
    },
    {
      es: `¡Me ${r.dish.plural ? 'apetecen' : 'apetece'} ${dishEs}! Mezcla ${ings} con ${amt} y al final ${r.verb.imperative.es}.`,
      en: `I fancy ${dishEn}! Combine ${ings} with ${amt}, and then ${r.verb.imperative.en}.`,
    },
    {
      es: `¡Al mando de los fogones! Haz ${dishEs} con ${ings}, ${amt}, y luego ${r.verb.imperative.es}.`,
      en: `Chef's special! Cook ${dishEn} with ${ings}, ${amt}, and then ${r.verb.imperative.en}.`,
    },
  ];
  return single[wrapIdx(variant, single.length)][lang];
}

export function checkRecipe(
  recipe: Recipe,
  chosenIds: readonly string[],
  quarters: number,
  verbId: VerbId,
  rng?: Rng,
): { ok: true } | { ok: false; reason: Bi } {
  const choose = <T,>(items: readonly T[]): T => (rng ? pick(rng, items) : items[0]);
  const wanted = new Set(recipe.ingredients.map((i) => i.id));
  const picked = new Set(chosenIds);
  const extra = [...picked].find((id) => !wanted.has(id));
  if (extra) {
    const ing = INGREDIENTS.find((i) => i.id === extra)!;
    const ingEsSubject = `${ing.plural ? (ing.gender === 'f' ? 'Las' : 'Los') : (ing.gender === 'f' ? 'La' : 'El')} ${ing.name.es}`;
    const ingEnSubject = ing.plural ? cap(ing.name.en) : `The ${ing.name.en}`;
    return {
      ok: false,
      reason: choose([
        {
          es: `😜 ¡Mmm! ¿${cap(ing.name.es)} en ${dishPhrase(recipe.dish, 'es')}? ¡El plato hace burbujas raras!`,
          en: `😜 Hmm! ${cap(ing.name.en)} in ${dishPhrase(recipe.dish, 'en')}? The pot is blowing funny bubbles!`,
        },
        {
          es: `🤣 ¡Vaya invento! ${ingEsSubject} no ${ing.plural ? 'aparecen' : 'aparece'} en esta receta.`,
          en: `🤣 What a wild invention! ${ingEnSubject} ${ing.plural ? 'are' : 'is'} not in this recipe.`,
        },
      ]),
    };
  }
  if (picked.size < wanted.size) {
    return {
      ok: false,
      reason: choose([
        {
          es: '🥣 ¡Falta un ingrediente de la receta! Revisa la lista.',
          en: '🥣 An ingredient from the recipe is missing! Check the order.',
        },
        {
          es: '👀 ¡Uy! El cuenco pide algún ingrediente más.',
          en: '👀 Whoops! The bowl is still waiting for another ingredient.',
        },
      ]),
    };
  }
  if (quarters > recipe.targetQuarters) {
    return {
      ok: false,
      reason: choose([
        {
          es: '🫧 ¡Splash! Llenaste demasiado la jarra y salió espuma hasta el techo.',
          en: '🫧 Splash! You overfilled the jug and foam hit the ceiling.',
        },
        {
          es: '🌊 ¡Gluglú! La jarra se desbordó por toda la cocina.',
          en: '🌊 Glug-glug! The jug overflowed all over the kitchen.',
        },
      ]),
    };
  }
  if (quarters < recipe.targetQuarters) {
    return {
      ok: false,
      reason: choose([
        {
          es: '🏜️ ¡Uy! Quedó muy espeso. Añade un poco más en la jarra medidora.',
          en: '🏜️ Whoops! Too thick. Add a bit more to the measuring jug.',
        },
        {
          es: '🥣 ¡Falta líquido! La cuchara se quedó de pie en el cuenco.',
          en: '🥣 Needs more liquid! The spoon is standing straight up in the bowl.',
        },
      ]),
    };
  }
  if (verbId !== recipe.verb.id) {
    const used = VERBS.find((v) => v.id === verbId)!;
    return {
      ok: false,
      reason: choose([
        {
          es: `${used.emoji} ¡Ja, ja! Si haces eso en vez de ${recipe.verb.label.es.toLowerCase()}, ¡el plato baila en la mesa!`,
          en: `${used.emoji} Haha! If you do that instead of ${recipe.verb.label.en.toLowerCase()}, the dish dances on the table!`,
        },
        {
          es: `${used.emoji} ¡Ups! Ese no era el paso final de la receta.`,
          en: `${used.emoji} Oops! That was not the final cooking step in the recipe.`,
        },
      ]),
    };
  }
  return { ok: true };
}
