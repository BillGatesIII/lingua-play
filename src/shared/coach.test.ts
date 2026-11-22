import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANIMALS, type CluePredicate, type Suspect } from '../games/detective/logic';
import { generatePattern } from '../games/garden/logic';
import { PRODUCTS, type Order } from '../games/market/logic';
import { DISHES, INGREDIENTS, VERBS, type Recipe } from '../games/recipe/logic';
import { DESTINATIONS, type TrainChallenge } from '../games/station/logic';
import { WORDS, type WordPuzzle } from '../games/words/logic';
import {
  diagnoseBasketMistake, diagnoseChangeMistake, diagnoseClockMistake, diagnoseColorMistake,
  diagnoseDetectiveMistake, diagnoseDigMistake, diagnosePatternMistake, diagnoseRecipeMistake,
  diagnoseWordMistake, scaffoldVocab,
} from './coach';
import { mulberry32 } from './rng';
import { recordSpoken, resetSpeechSession } from './speechDirector';

describe('Parrot Coach (context-aware diagnostics & vocab scaffolding)', () => {
  beforeEach(() => {
    resetSpeechSession();
  });

  afterEach(() => {
    resetSpeechSession();
  });

  it('scaffolds familiar vocab only after 2 exposures in the session', () => {
    const rng = mulberry32(1);
    expect(scaffoldVocab('apple', 'product', rng)).toBe('apple');
    recordSpoken('apple', 'click', 1000);
    expect(scaffoldVocab('apple', 'product', rng)).toBe('apple');
    recordSpoken('apple', 'click', 2000);
    const enriched = scaffoldVocab('apple', 'product', rng);
    expect(enriched).toContain('apple');
    expect(enriched).not.toBe('apple');
  });

  it('diagnoses Train Station clock mistakes accurately', () => {
    const delayed: TrainChallenge = {
      destination: DESTINATIONS[0],
      base: { hour: 3, minute: 0 },
      deltaMinutes: 20,
      target: { hour: 3, minute: 20 },
      kind: 'delay',
    };
    expect(diagnoseClockMistake(delayed, { hour: 3, minute: 20 })).toBeNull();

    // Forgot the delay
    const forgotDelay = diagnoseClockMistake(delayed, { hour: 3, minute: 0 })!;
    expect(forgotDelay.first).toContain('20 minutes late');

    // Right minutes, wrong hour
    const wrongHour = diagnoseClockMistake(delayed, { hour: 2, minute: 20 })!;
    expect(wrongHour.hint).toContain('hour hand');

    // Right hour, 10 minutes early
    const wrongMin = diagnoseClockMistake(delayed, { hour: 3, minute: 10 })!;
    expect(wrongMin.first).toContain('10 minutes too early');
    expect(wrongMin.hint).toContain('forward 10 minutes');

    // Early arrival challenge
    const earlyChallenge: TrainChallenge = {
      destination: DESTINATIONS[1],
      base: { hour: 5, minute: 30 },
      deltaMinutes: -15,
      target: { hour: 5, minute: 15 },
      kind: 'early',
    };
    expect(diagnoseClockMistake(earlyChallenge, { hour: 5, minute: 30 })?.first).toContain('15 minutes earlier');
  });

  it('diagnoses Market Quest basket and change mistakes including coupons and quantifiers', () => {
    const apple = PRODUCTS.find((p) => p.id === 'apple')!;
    const banana = PRODUCTS.find((p) => p.id === 'banana')!;

    const order: Order = {
      lines: [
        { product: apple, qty: 2, phrase: 'pair' },
        { product: banana, qty: 4, phrase: 'double' },
      ],
      total: 8,
      discount: 2,
      paid: 10,
      change: 4,
    };

    expect(diagnoseBasketMistake(order, { cheese: 1 }).hint).toContain('cheeses');
    expect(diagnoseBasketMistake(order, { apple: 1, banana: 4 }).hint).toContain('pair means two');
    expect(diagnoseBasketMistake(order, { apple: 2, banana: 2 }).hint).toContain('twice as many');

    // Forgot the 2-coin coupon (gave 10 - 8 = 2 instead of 4)
    const forgotCoupon = diagnoseChangeMistake(order, [2])!;
    expect(forgotCoupon.first).toContain('2-coin coupon');
    expect(forgotCoupon.hint).toContain('2 more');

    // Off by 1 coin
    expect(diagnoseChangeMistake(order, [5])?.first).toContain('one coin too much');
    expect(diagnoseChangeMistake(order, [2, 1])?.first).toContain('one coin short');
    expect(diagnoseChangeMistake(order, [2, 2])).toBeNull();
  });

  it('diagnoses Color Chameleon bowl recipes without spoiling the missing colour', () => {
    // Target: pink = red + white
    expect(diagnoseColorMistake('pink', ['red', 'blue']).hint).toBe('Keep the red, and take out the blue!');
    expect(diagnoseColorMistake('pink', ['red']).hint).toContain('adding white');
    expect(diagnoseColorMistake('navy', ['blue']).hint).toContain('adding black');
    expect(diagnoseColorMistake('lavender', ['yellow']).hint).toContain('three different paints');
  });

  it('identifies the exact failing clue for a wrongly accused Mystery Detective suspect', () => {
    const suspect: Suspect = {
      id: 's-1',
      name: 'Milo',
      animal: ANIMALS.find((a) => a.name.en === 'fox')!,
      hat: 'cap',
      glasses: true,
      snack: 'apple',
      badge: 4,
    };
    const clues: CluePredicate[] = [
      { kind: 'even', value: true },
      { kind: 'glasses', value: false },
    ];
    expect(diagnoseDetectiveMistake(suspect, clues).hint).toContain('Milo wears glasses');

    const waterClue: CluePredicate[] = [{ kind: 'habitat', value: 'water' }];
    expect(diagnoseDetectiveMistake(suspect, waterClue).hint).toContain('land animal');
  });

  it('diagnoses Recipe Lab mistakes including forgotten doubling and remaining volume', () => {
    const recipe: Recipe = {
      dish: DISHES[0],
      ingredients: [INGREDIENTS[0]],
      baseQuarters: 2,
      scale: 2,
      targetQuarters: 4,
      maxQuarters: 8,
      verb: VERBS[1], // stir
    };
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[1].id], 4, 'stir').hint).toContain(INGREDIENTS[1].name.en);
    expect(diagnoseRecipeMistake(recipe, [], 4, 'stir').hint).toContain('one more');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[0].id], 0, 'stir').hint).toContain('jug first');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[0].id], 2, 'stir').first).toContain('double the jug');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[0].id], 3, 'stir').hint).toContain('double the recipe');
    expect(diagnoseRecipeMistake({ ...recipe, scale: 1, targetQuarters: 2 }, [INGREDIENTS[0].id], 1, 'stir').hint).toContain('measuring jug');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[0].id], 4, 'bake').hint).toContain('stir');
  });

  it('diagnoses Word Workshop spelling attempts (anagrams, first/last letter)', () => {
    const base = WORDS[0]; // casa / house
    const puzzle: WordPuzzle = { ...base, tiles: [] };
    expect(diagnoseWordMistake(puzzle, 'saca', 'es').hint).toContain('all the right letters');
    expect(diagnoseWordMistake(puzzle, 'cama', 'es').hint).toContain('Several letters');
    expect(diagnoseWordMistake(puzzle, 'cxxx', 'es').hint).toContain('first letter is right');
    expect(diagnoseWordMistake(puzzle, 'xxxa', 'es').hint).toContain('last letter is right');
  });

  it('gives compass direction nudges for Compass Island digs', () => {
    const eastNudge = diagnoseDigMistake({ x: 2, y: 3 }, { x: 5, y: 4 }, 'an old boot', 'Warm', null);
    expect(eastNudge.hint).toBe('Try sailing further east!');
    expect(eastNudge.first).toBe('An old boot! Warm');

    const southNudge = diagnoseDigMistake({ x: 3, y: 6 }, { x: 3, y: 2 }, 'a crab', 'Cold', 'Colder!');
    expect(southNudge.hint).toBe('Try sailing further south!');
    expect(southNudge.first).toBe('Cold Colder!');
  });

  it('diagnoses Bloom Garden pattern rules and nudges bigger or smaller', () => {
    const rng = mulberry32(42);
    const addPuzzle = generatePattern(rng, 0);
    expect(diagnosePatternMistake(addPuzzle, addPuzzle.answer - 2).hint).toContain('adds');
    expect(diagnosePatternMistake(addPuzzle, addPuzzle.answer - 2).hint).toContain('bigger');

    const subPuzzle = generatePattern(rng, 1);
    expect(diagnosePatternMistake(subPuzzle, subPuzzle.answer + 3).hint).toContain('backwards');
    expect(diagnosePatternMistake(subPuzzle, subPuzzle.answer + 3).hint).toContain('smaller');

    const multPuzzle = generatePattern(rng, 3);
    expect(diagnosePatternMistake(multPuzzle, multPuzzle.answer - 1).hint).toMatch(/Double|Triple/);

    const altPuzzle = generatePattern(rng, 4);
    expect(diagnosePatternMistake(altPuzzle, altPuzzle.answer + 1).hint).toContain('alternating jumps');
  });
});
