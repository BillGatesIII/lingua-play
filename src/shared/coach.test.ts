import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { colorsPage } from '../games/colors/colors';
import { COLORS, type ColorId } from '../games/colors/logic';
import { JUNK, TEMPERATURE_TEXT, temperatureTrend } from '../games/compass/logic';
import { ANIMALS, type Suspect } from '../games/detective/logic';
import { generatePattern, type PatternPuzzle } from '../games/garden/logic';
import { PRODUCTS, type Order } from '../games/market/logic';
import { DISHES, INGREDIENTS, VERBS, type Recipe } from '../games/recipe/logic';
import { DESTINATIONS, checkClock, type TrainChallenge } from '../games/station/logic';
import { WORDS, type WordPuzzle } from '../games/words/logic';
import {
  diagnoseBasketMistake, diagnoseChangeMistake, diagnoseClockMistake, diagnoseColorMistake,
  diagnoseDetectiveMistake, diagnoseDigMistake, diagnosePatternMistake, diagnoseRecipeMistake,
  diagnoseWordMistake, scaffoldVocab,
} from './coach';
import { mulberry32 } from './rng';
import { recordSpoken, resetSpeechSession } from './speechDirector';
import { clearProgress } from './storage';
import { speakEnglish, stopSpeech } from './voice';

function mockSpeechSynthesis(): string[] {
  const spoken: string[] = [];
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false,
      pending: false,
      speak: vi.fn((u: { text: string }) => { spoken.push(u.text); }),
      cancel: vi.fn(),
      getVoices: () => [],
    },
  });
  class MockUtterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(t: string) { this.text = t; }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  return spoken;
}

describe('Parrot Coach (context-aware diagnostics & vocab scaffolding)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T11:00:00Z'));
    localStorage.clear();
    clearProgress();
    document.body.innerHTML = '';
    stopSpeech();
    resetSpeechSession();
  });

  afterEach(() => {
    stopSpeech();
    resetSpeechSession();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('scaffolds familiar vocab only after 2 exposures with natural British grammar', () => {
    const rng = mulberry32(1);
    expect(scaffoldVocab('apple', 'product', rng)).toBe('apple');
    recordSpoken('apple', 'click', 1000);
    expect(scaffoldVocab('apple', 'product', rng)).toBe('apple');
    recordSpoken('apple', 'click', 2000);
    const enriched = scaffoldVocab('apple', 'product', rng);
    expect(enriched).toContain('apple');
    expect(enriched).toMatch(/^A (fresh|lovely|nice) apple!$/);

    // Every product & ingredient uses grammatical article/uncountable/plural forms
    for (const p of PRODUCTS) {
      recordSpoken(p.en.one, 'click', 1000);
      recordSpoken(p.en.one, 'click', 2000);
      for (let seed = 0; seed < 8; seed++) {
        const phrase = scaffoldVocab(p.en.one, 'product', mulberry32(seed));
        if (p.id === 'cheese') {
          expect(phrase).not.toMatch(/^A /);
        } else {
          expect(phrase).toMatch(/^A (fresh|lovely|nice) /);
        }
      }
    }
    recordSpoken('cookies', 'click', 1000);
    recordSpoken('cookies', 'click', 2000);
    expect(scaffoldVocab('cookies', 'product', rng)).toMatch(/^(Fresh|Lovely|Nice) cookies!$/);

    for (const ing of INGREDIENTS) {
      recordSpoken(ing.name.en, 'click', 1000);
      recordSpoken(ing.name.en, 'click', 2000);
      for (let seed = 0; seed < 8; seed++) {
        const phrase = scaffoldVocab(ing.name.en, 'ingredient', mulberry32(seed));
        if (ing.id === 'strawberry' || ing.id === 'milk' || ing.id === 'honey' || ing.id === 'cocoa') {
          expect(phrase).not.toMatch(/^A /);
        }
        if (ing.id === 'honey' || ing.id === 'cocoa') {
          expect(phrase).not.toContain('Fresh');
        }
        if (ing.id === 'carrot' || ing.id === 'lemon') {
          expect(phrase).toMatch(/^(A fresh|A tasty|Into the pot with the) /);
        }
      }
    }

    // No contradictory "Bright dark green!" or "Bright black!"
    for (const c of Object.keys(COLORS) as ColorId[]) {
      const name = COLORS[c].name.en;
      recordSpoken(name, 'click', 1000);
      recordSpoken(name, 'click', 2000);
      for (let seed = 0; seed < 8; seed++) {
        const phrase = scaffoldVocab(name, 'color', mulberry32(seed));
        expect(phrase).not.toContain('Bright');
        expect(phrase).toContain(name);
      }
    }

    // Directions & destinations
    recordSpoken('north', 'click', 1000);
    recordSpoken('north', 'click', 2000);
    expect(scaffoldVocab('north', 'direction', rng)).toMatch(/^(Heading north!|Sailing north!|Off to the north!)$/);
    for (const d of DESTINATIONS) {
      recordSpoken(d.name.en, 'click', 1000);
      recordSpoken(d.name.en, 'click', 2000);
      expect(scaffoldVocab(d.name.en, 'destination', rng)).toContain(d.name.en);
    }
  });

  it('keeps speaking scaffolded step phrases aloud after 3+ exposures', () => {
    const spoken = mockSpeechSynthesis();
    const rng = mulberry32(7);

    // 4 consecutive steps in the same direction (e.g. sailing east)
    for (let i = 0; i < 4; i++) {
      const label = scaffoldVocab('east', 'direction', rng, 'east');
      speakEnglish(label, { mode: 'click', role: 'step', topic: label });
    }
    expect(spoken).toHaveLength(4);
    expect(spoken[0]).toBe('east');
    expect(spoken[1]).toBe('east');
    expect(spoken[2]).not.toBe('east');
    expect(spoken[3]).not.toBe('east');
  });

  it('diagnoses Train Station clock mistakes accurately including 12h wraparound and 360-min half turn', () => {
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

    // 12h wraparound: 11:50 vs 12:10 is 20 minutes early
    const wrapChallenge: TrainChallenge = {
      destination: DESTINATIONS[0],
      base: { hour: 12, minute: 10 },
      deltaMinutes: 0,
      target: { hour: 12, minute: 10 },
      kind: 'direct',
    };
    const wrapEarly = diagnoseClockMistake(wrapChallenge, { hour: 11, minute: 50 })!;
    expect(wrapEarly.first).toContain('20 minutes too early');
    expect(wrapEarly.hint).toContain('forward 20 minutes');

    // Exactly 360 minutes (6 hours) apart agrees with checkClock ('too late') without "Almost!"
    const sixHour: TrainChallenge = {
      destination: DESTINATIONS[0],
      base: { hour: 6, minute: 0 },
      deltaMinutes: 0,
      target: { hour: 6, minute: 0 },
      kind: 'direct',
    };
    expect(checkClock(sixHour.target, { hour: 12, minute: 0 })?.en).toContain('too late');
    const halfTurn = diagnoseClockMistake(sixHour, { hour: 12, minute: 0 })!;
    expect(halfTurn.first).toContain('Too late');
    expect(halfTurn.first).not.toContain('Almost');

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
    const bread = PRODUCTS.find((p) => p.id === 'bread')!;

    const order: Order = {
      lines: [
        { product: apple, qty: 2, phrase: 'pair' },
        { product: banana, qty: 4, phrase: 'double' },
        { product: bread, qty: 1, phrase: 'count' },
      ],
      total: 11,
      discount: 2,
      paid: 20,
      change: 11,
    };

    expect(diagnoseBasketMistake(order, { cheese: 1 }).hint).toContain('cheeses');
    expect(diagnoseBasketMistake(order, { apple: 1, banana: 4, bread: 1 }).hint).toContain('pair means two');
    const doubleHint = diagnoseBasketMistake(order, { apple: 2, banana: 2, bread: 1 }).hint;
    expect(doubleHint).toContain('twice as many bananas as apples');
    expect(diagnoseBasketMistake(order, { apple: 2, banana: 4, bread: 0 }).hint).toContain('loaf of bread');
    expect(diagnoseBasketMistake(order, { apple: 2, banana: 4, bread: 2 }).hint).toBe('Take out one loaf of bread!');

    // Half-dozen
    const halfDozenOrder: Order = {
      lines: [{ product: apple, qty: 6, phrase: 'half-dozen' }],
      total: 12,
      discount: 0,
      paid: 20,
      change: 8,
    };
    expect(diagnoseBasketMistake(halfDozenOrder, { apple: 4 }).hint).toContain('six apples');

    // Empty change without coupon does not say "So close!"
    const tinyOrder: Order = {
      lines: [{ product: banana, qty: 3, phrase: 'count' }],
      total: 3,
      discount: 0,
      paid: 5,
      change: 2,
    };
    expect(diagnoseChangeMistake(tinyOrder, [])?.hint).not.toContain('So close');

    // Forgot the 2-coin coupon (gave 20 - 11 = 9 instead of 11)
    const forgotCoupon = diagnoseChangeMistake(order, [5, 2, 2])!;
    expect(forgotCoupon.first).toContain('2-coin coupon');
    expect(forgotCoupon.hint).toContain('2 more');

    // Off by 1 coin
    expect(diagnoseChangeMistake(order, [10, 2])?.first).toContain('one coin too much');
    expect(diagnoseChangeMistake(order, [10])?.first).toContain('one coin short');
    expect(diagnoseChangeMistake(order, [10, 1])).toBeNull();
  });

  it('diagnoses Color Chameleon bowl recipes accurately including multi-pot mixes and empty bowls', () => {
    // Target: pink = red + white
    expect(diagnoseColorMistake('pink', ['red', 'blue']).hint).toBe('Keep the red, and take out the blue!');
    expect(diagnoseColorMistake('pink', ['red']).hint).toContain('adding white');
    expect(diagnoseColorMistake('pink', []).hint).not.toContain('Good start');
    expect(diagnoseColorMistake('navy', ['blue']).hint).toContain('adding black');
    expect(diagnoseColorMistake('lavender', ['yellow']).hint).toContain('three different paints');
    expect(diagnoseColorMistake('lavender', ['blue', 'red', 'yellow']).hint).toBe(
      'Keep the blue and red, and take out the yellow!',
    );
    expect(diagnoseColorMistake('red', ['red', 'blue', 'yellow']).hint).toBe(
      'Keep the red, and take out the blue and yellow!',
    );
  });

  it('does not trigger premature coach hints when untapping pots or right after emptying in Color Chameleon', () => {
    const spoken = mockSpeechSynthesis();
    const root = document.createElement('main');
    document.body.append(root);
    colorsPage({ root, refresh: () => {} });

    const clickPot = (pot: string) => root.querySelector<HTMLButtonElement>(`[data-focus="pot-${pot}"]`)!.click();

    // Target 0 is always red, yellow, or blue — mixing white and black never solves it.
    clickPot('white'); // pour 1 -> white
    vi.advanceTimersByTime(500);
    clickPot('black'); // pour 2 -> grey
    vi.advanceTimersByTime(500);
    clickPot('black'); // untap -> stays pour 2, white
    vi.advanceTimersByTime(500);
    clickPot('black'); // pour 3 -> grey
    vi.advanceTimersByTime(500);
    clickPot('black'); // untap -> stays pour 3, should confirm 'white' (not fire 4th-pour hint!)
    vi.advanceTimersByTime(500);

    expect(spoken[spoken.length - 1]).toContain('white');
    expect(spoken[spoken.length - 1]).not.toContain('Empty the bowl');

    // Empty bowl caps poursOnCurrent at 2 so the next single pour still names the colour.
    root.querySelector<HTMLButtonElement>('[data-focus="empty"]')!.click();
    clickPot('white'); // pour 3 -> white (note: white now has >=2 exposures so scaffolded)
    vi.advanceTimersByTime(500);
    expect(spoken[spoken.length - 1]).toContain('white');
    expect(spoken[spoken.length - 1]).not.toContain('Empty the bowl');

    // 4th pour gives the non-mud diagnostic hint
    clickPot('black'); // pour 4 -> grey, triggers hint
    expect(spoken[spoken.length - 1]).toBe('Empty the bowl and try just one paint!');
  });

  it('identifies the exact failing clue for every Mystery Detective CluePredicate with proper grammar', () => {
    const foxSuspect: Suspect = {
      id: 's-1',
      name: 'Milo',
      animal: ANIMALS.find((a) => a.name.en === 'fox')!,
      hat: 'cap',
      glasses: true,
      snack: 'apple',
      badge: 4,
    };
    const owlSuspect: Suspect = {
      ...foxSuspect,
      name: 'Nora',
      animal: ANIMALS.find((a) => a.name.en === 'owl')!,
      hat: 'none',
      glasses: false,
      snack: 'carrot',
      badge: 5,
    };

    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'glasses', value: false }]).hint).toContain('Milo wears glasses');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'glasses', value: true }]).hint).toContain('they wear glasses');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'hat', value: 'none' }]).hint).toContain('wearing a hat');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'hat', value: 'cap' }]).hint).toContain('not wearing a cap');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'not-hat', value: 'cap' }]).hint).toContain('wearing a cap');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'snack', value: 'apple' }]).hint).toContain('an apple');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'snack', value: 'carrot' }]).hint).toContain('a carrot');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'not-snack', value: 'apple' }]).hint).toContain('has an apple');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'not-snack', value: 'carrot' }]).hint).toContain('has a carrot');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'habitat', value: 'water' }]).hint).toContain('A fox is a land animal');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'habitat', value: 'water' }]).hint).toContain('An owl is a land animal');
    expect(diagnoseDetectiveMistake(owlSuspect, [{ kind: 'even', value: true }]).hint).toContain('odd, not even');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'gt', threshold: 6 }]).hint).toContain('not greater than 6');
    expect(diagnoseDetectiveMistake(foxSuspect, [{ kind: 'lt', threshold: 4 }]).hint).toContain('not less than 4');

    const waterAnimals = ['dolphin', 'whale', 'turtle'] as const;
    for (const name of waterAnimals) {
      const suspect = { ...foxSuspect, animal: ANIMALS.find((a) => a.name.en === name)! };
      expect(diagnoseDetectiveMistake(suspect, [{ kind: 'habitat', value: 'land' }]).hint).toBe(
        `A ${name} is a water animal, not a land animal!`,
      );
    }
    const landAnimals: [string, string][] = [['panda', 'A'], ['koala', 'A'], ['elephant', 'An']];
    for (const [name, art] of landAnimals) {
      const suspect = { ...foxSuspect, animal: ANIMALS.find((a) => a.name.en === name)! };
      expect(diagnoseDetectiveMistake(suspect, [{ kind: 'habitat', value: 'water' }]).hint).toBe(
        `${art} ${name} is a land animal, not a water animal!`,
      );
    }
  });

  it('diagnoses Recipe Lab mistakes including plural/singular ingredients, doubling, and jug volume', () => {
    const recipe: Recipe = {
      dish: DISHES[0],
      ingredients: [INGREDIENTS[1]], // lemon
      baseQuarters: 2,
      scale: 2,
      targetQuarters: 4,
      maxQuarters: 8,
      verb: VERBS[1], // stir
    };
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[0].id], 4, 'stir').hint).toBe(
      'Take out the strawberries — they are not in this recipe!',
    );
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[4].id], 4, 'stir').hint).toBe(
      'Take out the carrot — it is not in this recipe!',
    );
    expect(diagnoseRecipeMistake(recipe, [], 4, 'stir').hint).toContain('one more');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[1].id], 0, 'stir').hint).toContain('jug first');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[1].id], 2, 'stir').first).toContain('double the jug');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[1].id], 3, 'stir').hint).toContain('double the recipe');
    expect(diagnoseRecipeMistake({ ...recipe, scale: 1, targetQuarters: 2 }, [INGREDIENTS[1].id], 1, 'stir').hint).toContain('measuring jug');
    expect(diagnoseRecipeMistake(recipe, [INGREDIENTS[1].id], 4, 'bake').hint).toContain('stir');
  });

  it('diagnoses Word Workshop spelling attempts (accents, duplicates, anagrams, empty)', () => {
    const base = WORDS[0]; // casa / house
    const puzzle: WordPuzzle = { ...base, tiles: [] };
    expect(diagnoseWordMistake(puzzle, 'saca', 'es').hint).toContain('all the right letters');
    expect(diagnoseWordMistake(puzzle, 'ccsa', 'es').hint).not.toContain('all the right letters');
    expect(diagnoseWordMistake(puzzle, 'cama', 'es').hint).toContain('Several letters');
    expect(diagnoseWordMistake(puzzle, 'cxxx', 'es').hint).toBe('The first letter is right! Check the other letters.');
    expect(diagnoseWordMistake(puzzle, 'xxxa', 'es').hint).toBe('The last letter is right! Check the other letters.');
    expect(diagnoseWordMistake(puzzle, '', 'es').hint).toContain('Berta the owl');

    const accentedPuzzle: WordPuzzle = {
      emoji: '🌳',
      answer: { es: 'árbol', en: 'tree' },
      clue: { es: 'Tiene tronco y hojas.', en: 'Has a trunk and leaves.' },
      tiles: [],
    };
    expect(diagnoseWordMistake(accentedPuzzle, 'arbol', 'es').hint).toContain('accent');
    expect(diagnoseWordMistake(accentedPuzzle, 'lobrá', 'es').hint).toContain('all the right letters');
    expect(diagnoseWordMistake(accentedPuzzle, 'a\u0301rblo', 'es').hint).toContain('all the right letters');
  });

  it('gives clean compass direction nudges for Compass Island digs without raw emojis', () => {
    const warmText = TEMPERATURE_TEXT.warm.en;
    const coldText = TEMPERATURE_TEXT.cold.en;
    const colderTrend = temperatureTrend(2, 4)!.en;

    const eastNudge = diagnoseDigMistake({ x: 2, y: 3 }, { x: 5, y: 4 }, JUNK[0].en, warmText, null);
    expect(eastNudge.hint).toBe('Try sailing further east!');
    expect(eastNudge.first).toBe('An old boot! Warm!');

    const southNudge = diagnoseDigMistake({ x: 3, y: 6 }, { x: 3, y: 2 }, JUNK[1].en, coldText, colderTrend);
    expect(southNudge.hint).toBe('Try sailing further south!');
    expect(southNudge.first).toBe('Cold! Colder than last time!');

    const sameSpot = diagnoseDigMistake({ x: 4, y: 4 }, { x: 4, y: 4 }, JUNK[0].en, TEMPERATURE_TEXT.hot.en, null);
    expect(sameSpot.hint).toContain('dig here');
  });

  it('diagnoses Bloom Garden pattern rules including negative alternating steps and multipliers', () => {
    const rng = mulberry32(42);
    const addPuzzle = generatePattern(rng, 0);
    expect(diagnosePatternMistake(addPuzzle, addPuzzle.answer - 2).hint).toContain('adds');
    expect(diagnosePatternMistake(addPuzzle, addPuzzle.answer - 2).hint).toContain('bigger');

    const subPuzzle = generatePattern(rng, 1);
    expect(diagnosePatternMistake(subPuzzle, subPuzzle.answer + 3).hint).toContain('backwards');
    expect(diagnosePatternMistake(subPuzzle, subPuzzle.answer + 3).hint).toContain('smaller');

    const midPuzzle = generatePattern(rng, 2);
    expect(diagnosePatternMistake(midPuzzle, midPuzzle.answer - 1).hint).toContain('adds');

    const multPuzzle = generatePattern(rng, 3);
    expect(diagnosePatternMistake(multPuzzle, multPuzzle.answer - 1).hint).toMatch(/Double|Triple/);

    const quadPuzzle: PatternPuzzle = {
      slots: [1, 4, 16, null],
      fullSequence: [1, 4, 16, 64],
      missingIndex: 3,
      answer: 64,
      choices: [60, 64, 68, 72],
      instruction: { es: '', en: '' },
    };
    expect(diagnosePatternMistake(quadPuzzle, 60).hint).toContain('Multiply each pot by four');

    const altPuzzle = generatePattern(rng, 4);
    expect(diagnosePatternMistake(altPuzzle, altPuzzle.answer + 1).hint).toContain('alternating jumps');

    const negAltPuzzle: PatternPuzzle = {
      slots: [10, 15, 12, 17, null],
      fullSequence: [10, 15, 12, 17, 14],
      missingIndex: 4,
      answer: 14,
      choices: [12, 14, 16, 19],
      instruction: { es: '', en: '' },
    };
    expect(diagnosePatternMistake(negAltPuzzle, 16).hint).toContain('plus five, then minus three');

    const brokenAltPuzzle: PatternPuzzle = {
      slots: [2, 4, 8, 10, null],
      fullSequence: [2, 4, 8, 10, 15],
      missingIndex: 4,
      answer: 15,
      choices: [12, 14, 15, 18],
      instruction: { es: '', en: '' },
    };
    expect(diagnosePatternMistake(brokenAltPuzzle, 12).hint).toContain('jump from pot to pot');
  });
});
