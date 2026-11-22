import { COLORS, recipePots, type ColorId, type PotId } from '../games/colors/logic';
import type { Pos } from '../games/compass/logic';
import { HATS, SNACKS, matchesPredicate, type CluePredicate, type Suspect } from '../games/detective/logic';
import type { PatternPuzzle } from '../games/garden/logic';
import { PRODUCTS, sumCoins, type Basket, type Order } from '../games/market/logic';
import { INGREDIENTS, quartersText, type Recipe, type VerbId } from '../games/recipe/logic';
import { sameTime, toMinutes, type ClockTime, type TrainChallenge } from '../games/station/logic';
import type { WordPuzzle } from '../games/words/logic';
import { numberWord, type Lang } from './i18n';
import { pick, type Rng } from './rng';
import { getTopicExposure } from './speechDirector';

export interface CoachAdvice {
  /** Optional specific reaction for the first mistake (otherwise falls back to default). */
  first?: string;
  /** Targeted, encouraging British English hint for repeated mistakes without spoiling the answer. */
  hint: string;
}

export type VocabCategory = 'product' | 'color' | 'ingredient' | 'direction' | 'destination';

const SCAFFOLD_TEMPLATES: Record<VocabCategory, readonly ((word: string) => string)[]> = {
  product: [
    (w) => `Fresh ${w}!`,
    (w) => `Lovely ${w}!`,
    (w) => `Nice ${w}!`,
  ],
  color: [
    (w) => `Lovely ${w}!`,
    (w) => `A splash of ${w}!`,
    (w) => `Bright ${w}!`,
  ],
  ingredient: [
    (w) => `Tasty ${w}!`,
    (w) => `Fresh ${w}!`,
    (w) => `Some ${w} for the pot!`,
  ],
  direction: [
    (w) => `Heading ${w}!`,
    (w) => `Sailing ${w}!`,
    (w) => `Off to the ${w}!`,
  ],
  destination: [
    (w) => `Off to ${w}!`,
    (w) => `Next stop, ${w}!`,
    (w) => `All aboard for ${w}!`,
  ],
};

/**
 * Gently enriches familiar vocabulary into short natural British phrases once
 * the child has already heard the base word at least twice this session.
 */
export function scaffoldVocab(
  word: string,
  category: VocabCategory,
  rng: Rng,
  topic = word,
): string {
  const clean = word.trim();
  if (!clean) return clean;
  if (getTopicExposure(topic) < 2) return clean;
  return pick(rng, SCAFFOLD_TEMPLATES[category])(clean);
}

/** Diagnoses why a Train Station clock setting missed the target time. */
export function diagnoseClockMistake(challenge: TrainChallenge, chosen: ClockTime): CoachAdvice | null {
  if (sameTime(challenge.target, chosen)) return null;

  if (challenge.deltaMinutes !== 0 && sameTime(chosen, challenge.base)) {
    if (challenge.kind === 'delay') {
      return {
        first: `That is the old time — the train is ${challenge.deltaMinutes} minutes late!`,
        hint: `Add ${challenge.deltaMinutes} minutes to the departure time.`,
      };
    }
    if (challenge.kind === 'duration') {
      return {
        first: `That is when it leaves — add ${challenge.deltaMinutes} minutes for the trip!`,
        hint: `Move the clock forward ${challenge.deltaMinutes} minutes to find the arrival time.`,
      };
    }
    const mins = Math.abs(challenge.deltaMinutes);
    return {
      first: `That is departure time — arrive ${mins} minutes earlier!`,
      hint: `Turn the clock back ${mins} minutes from the departure time.`,
    };
  }

  const raw = ((toMinutes(chosen) - toMinutes(challenge.target)) + 720) % 720;
  const early = raw > 360;
  const diff = early ? 720 - raw : raw;

  if (chosen.minute === challenge.target.minute) {
    return {
      first: early ? 'Almost! Too early — check the hour!' : 'Almost! Too late — check the hour!',
      hint: 'Your minutes are spot on! Move the short red hour hand.',
    };
  }

  if (chosen.hour === challenge.target.hour) {
    return {
      first: early
        ? `So close! Just ${diff} minutes too early!`
        : `So close! Just ${diff} minutes too late!`,
      hint: early
        ? `The hour is right! Move the minute hand forward ${diff} minutes.`
        : `The hour is right! Turn the minute hand back ${diff} minutes.`,
    };
  }

  if (diff <= 30) {
    return {
      first: early
        ? `Ooh, just ${diff} minutes too early!`
        : `Ooh, just ${diff} minutes too late!`,
      hint: early
        ? `Push the clock forward ${diff} minutes!`
        : `Turn the clock back ${diff} minutes!`,
    };
  }

  return {
    hint: early
      ? 'Move the hands forward — red for the hour, black for the minutes!'
      : 'Turn the hands back — red for the hour, black for the minutes!',
  };
}

/** Diagnoses what is wrong with a Market Quest shopping bag. */
export function diagnoseBasketMistake(order: Order, basket: Basket): CoachAdvice {
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
  const wanted = new Map(order.lines.map((l) => [l.product.id, l]));

  const extraId = Object.keys(basket).find((id) => basket[id] > 0 && !wanted.has(id));
  if (extraId) {
    const p = byId.get(extraId)!;
    return {
      hint: `Take out the ${p.en.many} — nobody ordered those!`,
    };
  }

  for (const line of order.lines) {
    const have = basket[line.product.id] ?? 0;
    if (have === line.qty) continue;

    if (line.phrase === 'pair' && have !== 2) {
      return { hint: `A pair means two ${line.product.en.many}!` };
    }
    if (line.phrase === 'half-dozen' && have !== 6) {
      return { hint: `Half a dozen means six ${line.product.en.many}!` };
    }
    if (line.phrase === 'double') {
      return { hint: `Remember, twice as many ${line.product.en.many}!` };
    }
    if (have > line.qty) {
      const over = have - line.qty;
      return {
        hint: `Take out ${over === 1 ? 'one' : numberWord(over, 'en')} ${over === 1 ? line.product.en.one : line.product.en.many}!`,
      };
    }
    if (have === 0) {
      return {
        hint: `Do not forget the ${line.qty === 1 ? line.product.en.one : line.product.en.many}!`,
      };
    }
    const short = line.qty - have;
    return {
      hint: `Add ${short === 1 ? 'one more' : `${numberWord(short, 'en')} more`} ${short === 1 ? line.product.en.one : line.product.en.many}!`,
    };
  }

  return { hint: 'Listen to the customer again and check the bag!' };
}

/** Diagnoses why Market Quest change does not match the exact amount due. */
export function diagnoseChangeMistake(order: Order, coins: readonly number[]): CoachAdvice | null {
  const given = sumCoins(coins);
  if (given === order.change) return null;

  if (order.discount > 0 && given === order.paid - order.total) {
    return {
      first: `Ooh, do not forget the ${order.discount}-coin coupon!`,
      hint: `The coupon saves ${order.discount} coins, so give ${order.discount} more in change!`,
    };
  }

  const diff = Math.abs(given - order.change);
  const tooMuch = given > order.change;
  if (diff <= 2) {
    const unit = diff === 1 ? 'one coin' : 'two coins';
    return {
      first: tooMuch ? `So close! Just ${unit} too much!` : `So close! Just ${unit} short!`,
      hint: tooMuch ? `Take back ${unit} and you have got it!` : `Add ${diff === 1 ? 'one more coin' : 'two more coins'}!`,
    };
  }

  return {
    hint: tooMuch
      ? 'Too much change — check the total price and take a coin back!'
      : 'Not enough change — count how much is left after the price!',
  };
}

/** Diagnoses how a Color Chameleon bowl compares to the target colour's recipe. */
export function diagnoseColorMistake(target: ColorId, bowl: readonly PotId[]): CoachAdvice {
  const needed = recipePots(target);
  const kept = bowl.filter((p) => needed.includes(p));
  const extra = bowl.filter((p) => !needed.includes(p));
  const missing = needed.filter((p) => !bowl.includes(p));

  if (kept.length > 0 && extra.length > 0) {
    return {
      hint: `Keep the ${COLORS[kept[0]].name.en}, and take out the ${COLORS[extra[0]].name.en}!`,
    };
  }
  if (extra.length > 0) {
    const countPhrase = needed.length === 1
      ? 'just one paint'
      : `${numberWord(needed.length, 'en')} different paints`;
    return {
      hint: `Empty the bowl and try ${countPhrase}!`,
    };
  }
  if (missing.length > 0) {
    if (missing.includes('white')) {
      return { hint: 'Good start! Try adding white to make it lighter!' };
    }
    if (missing.includes('black')) {
      return { hint: 'Good start! Try adding black to make it darker!' };
    }
    return { hint: 'Good start! Keep what you have and add another colour!' };
  }
  return { hint: 'Empty the bowl and try another mix!' };
}

/** Diagnoses which specific clue rules out a wrongly accused Mystery Detective suspect. */
export function diagnoseDetectiveMistake(suspect: Suspect, clues: readonly CluePredicate[]): CoachAdvice {
  const failed = clues.find((c) => !matchesPredicate(suspect, c));
  if (!failed) {
    return { hint: 'Check every clue and rule out who does not match!' };
  }

  switch (failed.kind) {
    case 'glasses':
      return {
        hint: failed.value
          ? `${suspect.name} does not wear glasses, but the clue says wears glasses!`
          : `${suspect.name} wears glasses, and the clue says no glasses!`,
      };
    case 'hat':
      return {
        hint: failed.value === 'none'
          ? `${suspect.name} is wearing a hat, but the clue says no hat!`
          : `${suspect.name} is not wearing ${HATS[failed.value].name.en}!`,
      };
    case 'not-hat':
      return {
        hint: `${suspect.name} is wearing ${HATS[failed.value].name.en}, so rule them out!`,
      };
    case 'snack':
      return {
        hint: `${suspect.name} does not have ${SNACKS[failed.value].en}!`,
      };
    case 'not-snack':
      return {
        hint: `${suspect.name} has ${SNACKS[failed.value].en}, and the clue rules that out!`,
      };
    case 'habitat':
      return {
        hint: failed.value === 'water'
          ? `A ${suspect.animal.name.en} is a land animal, not a water animal!`
          : `A ${suspect.animal.name.en} is a water animal, not a land animal!`,
      };
    case 'even':
      return {
        hint: failed.value
          ? `Badge ${suspect.badge} is odd, not even!`
          : `Badge ${suspect.badge} is even, not odd!`,
      };
    case 'gt':
      return { hint: `Badge ${suspect.badge} is not greater than ${failed.threshold}!` };
    case 'lt':
      return { hint: `Badge ${suspect.badge} is not less than ${failed.threshold}!` };
  }
}

/** Diagnoses what went wrong in Recipe Lab (ingredients, doubling, jug volume, or cooking verb). */
export function diagnoseRecipeMistake(
  recipe: Recipe,
  chosenIds: readonly string[],
  quarters: number,
  verbId: VerbId,
): CoachAdvice {
  const wanted = new Set(recipe.ingredients.map((i) => i.id));
  const picked = new Set(chosenIds);

  const extra = [...picked].find((id) => !wanted.has(id));
  if (extra) {
    const ing = INGREDIENTS.find((i) => i.id === extra)!;
    return { hint: `Take out the ${ing.name.en} — it is not in this recipe!` };
  }

  if (picked.size < wanted.size) {
    const missing = wanted.size - picked.size;
    return {
      hint: `Check the ingredients — you still need ${missing === 1 ? 'one more' : `${numberWord(missing, 'en')} more`}!`,
    };
  }

  if (recipe.scale === 2 && quarters === recipe.baseQuarters) {
    return {
      first: 'Ooh, remember there are two of us — double the jug!',
      hint: `Make double! Pour ${quartersText(recipe.baseQuarters, 'en')} one more time.`,
    };
  }

  if (quarters > recipe.targetQuarters) {
    return {
      hint: recipe.scale === 2
        ? 'Too much in the jug! Empty it and measure double the recipe carefully.'
        : 'Too much in the jug! Empty it and pour a little less.',
    };
  }

  if (quarters === 0) {
    return { hint: 'Pour some liquid into the measuring jug first!' };
  }

  if (quarters < recipe.targetQuarters) {
    return {
      hint: recipe.scale === 2
        ? 'Not enough in the jug — remember to double the recipe!'
        : 'A bit more in the measuring jug!',
    };
  }

  if (verbId !== recipe.verb.id) {
    return {
      hint: `Check the last step — you need to ${recipe.verb.label.en.toLowerCase()} it!`,
    };
  }

  return { hint: 'Check the ingredients, the jug, and the final step!' };
}

/** Diagnoses a wrong spelling attempt in Word Workshop without giving away the answer. */
export function diagnoseWordMistake(puzzle: WordPuzzle, attempt: string, lang: Lang): CoachAdvice {
  const target = puzzle.answer[lang].toLowerCase();
  const guess = attempt.toLowerCase();

  const sortLetters = (s: string) => [...s].sort().join('');
  if (guess.length === target.length && sortLetters(guess) === sortLetters(target)) {
    return { hint: 'You have all the right letters — just swap a couple around!' };
  }

  let exactMatches = 0;
  for (let i = 0; i < Math.min(guess.length, target.length); i++) {
    if (guess[i] === target[i]) exactMatches += 1;
  }

  if (guess[0] === target[0] && exactMatches >= 2) {
    return { hint: 'Good start! Several letters are already in the right spot.' };
  }
  if (guess[0] === target[0]) {
    return { hint: 'The first letter is right! Try swapping the rest.' };
  }
  if (guess.length > 0 && guess[guess.length - 1] === target[target.length - 1]) {
    return { hint: 'The last letter is right! Try a different starting letter.' };
  }
  return { hint: 'Tap the picture or Berta the owl to hear the clue again!' };
}

/** Gives a compass-direction nudge after repeated unsuccessful digs in Compass Island. */
export function diagnoseDigMistake(pos: Pos, target: Pos, junkEn: string, tempEn: string, trendEn: string | null): CoachAdvice {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  let dir: string;
  if (Math.abs(dx) >= Math.abs(dy)) {
    dir = dx > 0 ? 'east' : 'west';
  } else {
    dir = dy > 0 ? 'north' : 'south';
  }
  const cleanJunk = junkEn.trim();
  const junkLabel = cleanJunk ? cleanJunk[0].toUpperCase() + cleanJunk.slice(1) : 'Oops';
  const first = trendEn ? `${tempEn} ${trendEn}` : `${junkLabel}! ${tempEn}`;
  return {
    first,
    hint: `Try sailing further ${dir}!`,
  };
}

/** Diagnoses the underlying pattern rule in Bloom Garden and nudges higher or lower. */
export function diagnosePatternMistake(puzzle: PatternPuzzle, chosen: number): CoachAdvice {
  const seq = puzzle.fullSequence;
  const dirHint = chosen < puzzle.answer ? 'Try a bigger number.' : 'Try a smaller number.';

  if (seq.length >= 4) {
    const d0 = seq[1] - seq[0];
    const d1 = seq[2] - seq[1];
    const d2 = seq[3] - seq[2];

    if (d0 === d1 && d1 === d2) {
      if (d0 > 0) {
        return { hint: `Each pot adds ${numberWord(d0, 'en')}! ${dirHint}` };
      }
      if (d0 < 0) {
        return { hint: `Count backwards by ${numberWord(-d0, 'en')}! ${dirHint}` };
      }
    }

    if (seq[0] > 0 && seq[1] % seq[0] === 0) {
      const factor = seq[1] / seq[0];
      if (seq[2] === seq[1] * factor && seq[3] === seq[2] * factor) {
        const mult = factor === 2 ? 'Double' : factor === 3 ? 'Triple' : `Multiply by ${numberWord(factor, 'en')}`;
        return { hint: `${mult} each pot to get the next one! ${dirHint}` };
      }
    }

    if (d0 !== d1 && d0 === d2) {
      return {
        hint: `Watch the alternating jumps: plus ${numberWord(d0, 'en')}, then plus ${numberWord(d1, 'en')}! ${dirHint}`,
      };
    }
  }

  return { hint: `Look at how the numbers jump from pot to pot! ${dirHint}` };
}
