import type { Bi, Lang } from '../../shared/i18n';
import { pick, randInt, type Rng } from '../../shared/rng';

export interface ClockTime {
  hour: number; // 1..12
  minute: number; // 0..55 (steps of 5)
}

export interface Destination {
  emoji: string;
  name: Bi;
}

export const DESTINATIONS: readonly Destination[] = [
  { emoji: '🏖️', name: { es: 'la playa', en: 'the beach' } },
  { emoji: '🏔️', name: { es: 'la montaña', en: 'the mountains' } },
  { emoji: '🏛️', name: { es: 'el museo', en: 'the museum' } },
  { emoji: '🌲', name: { es: 'el bosque', en: 'the forest' } },
  { emoji: '🎢', name: { es: 'la feria', en: 'the funfair' } },
  { emoji: '🏰', name: { es: 'el castillo', en: 'the castle' } },
  { emoji: '🦁', name: { es: 'el zoo', en: 'the zoo' } },
  { emoji: '📚', name: { es: 'la biblioteca', en: 'the library' } },
  { emoji: '🔭', name: { es: 'el observatorio', en: 'the observatory' } },
  { emoji: '🏝️', name: { es: 'la isla', en: 'the island' } },
  { emoji: '🌋', name: { es: 'el volcán', en: 'the volcano' } },
  { emoji: '🐠', name: { es: 'el acuario', en: 'the aquarium' } },
];

export const TRAVELLERS = [
  { emoji: '🦆', name: { es: 'el pato Pepe', en: 'Pepe the duck' } },
  { emoji: '🦉', name: { es: 'Clara el búho', en: 'Clara the owl' } },
  { emoji: '🐢', name: { es: 'la tortuga Tita', en: 'Tita the turtle' } },
  { emoji: '🦔', name: { es: 'el erizo Hugo', en: 'Hugo the hedgehog' } },
  { emoji: '🐧', name: { es: 'el pingüino Leo', en: 'Leo the penguin' } },
  { emoji: '🦊', name: { es: 'la zorrita Alba', en: 'Alba the fox' } },
  { emoji: '🐻', name: { es: 'el oso Mateo', en: 'Mateo the bear' } },
  { emoji: '🐰', name: { es: 'el conejo Nico', en: 'Nico the rabbit' } },
  { emoji: '🐨', name: { es: 'Vera el koala', en: 'Vera the koala' } },
  { emoji: '🐸', name: { es: 'la rana Bruno', en: 'Bruno the frog' } },
] as const;

export const TRAINS_PER_ROUND = 5;

export type ClueKind = 'direct' | 'delay' | 'duration' | 'early';

export interface TrainChallenge {
  destination: Destination;
  base: ClockTime;
  deltaMinutes: number;
  target: ClockTime;
  kind: ClueKind;
}

export function toMinutes(t: ClockTime): number {
  return ((t.hour % 12) * 60 + t.minute + 720) % 720;
}

export function fromMinutes(total: number): ClockTime {
  const norm = ((total % 720) + 720) % 720;
  const rawHour = Math.floor(norm / 60);
  return {
    hour: rawHour === 0 ? 12 : rawHour,
    minute: norm % 60,
  };
}

export function stepClock(t: ClockTime, deltaMinutes: number): ClockTime {
  return fromMinutes(toMinutes(t) + deltaMinutes);
}

export const sameTime = (a: ClockTime, b: ClockTime): boolean =>
  a.hour === b.hour && a.minute === b.minute;

/**
 * Picks the initial clock time for a challenge:
 * - For math/offset challenges (delay, duration, early), starts at the train's base time.
 * - For direct time-reading challenges, starts at 12:00 (or 6:00 if target is 12:00).
 */
export function pickStartClock(c: TrainChallenge): ClockTime {
  if (c.deltaMinutes !== 0) return { ...c.base };
  const start = { hour: 12, minute: 0 };
  return sameTime(start, c.target) ? { hour: 6, minute: 0 } : start;
}

/** Converts a vector from the clock centre into clockwise degrees from 12 o'clock (0..360). */
export function pointerToClockAngle(dx: number, dy: number): number {
  return ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
}

/** Snaps a clockwise clock angle (0..360) to the nearest 5-minute mark (0..55). */
export function angleToMinute(angleDeg: number): number {
  const norm = ((angleDeg % 360) + 360) % 360;
  return ((Math.round(norm / 30) * 5) % 60 + 60) % 60;
}

/** Updates clock by dragging the minute hand, automatically crossing 12 forward/backward. */
export function dragMinuteHand(clock: ClockTime, angleDeg: number): ClockTime {
  const snapped = angleToMinute(angleDeg);
  let delta = snapped - clock.minute;
  if (delta > 30) delta -= 60;
  if (delta < -30) delta += 60;
  return stepClock(clock, delta);
}

/** Updates clock by dragging the hour hand while preserving the current minute setting. */
export function dragHourHand(clock: ClockTime, angleDeg: number): ClockTime {
  const norm = ((angleDeg % 360) + 360) % 360;
  const raw = Math.round(norm / 30 - clock.minute / 60);
  const hour = (((raw % 12) + 12) % 12) || 12;
  return { hour, minute: clock.minute };
}

const ES_HOURS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
const EN_HOURS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const MIN_WORDS_ES: Record<number, string> = {
  5: 'cinco', 10: 'diez', 15: 'cuarto', 20: 'veinte', 25: 'veinticinco', 30: 'media',
};
const MIN_WORDS_EN: Record<number, string> = {
  5: 'five', 10: 'ten', 15: 'quarter', 20: 'twenty', 25: 'twenty-five', 30: 'half',
};

export function timeText(t: ClockTime, lang: Lang): string {
  const nextHour = (t.hour % 12) + 1;
  if (lang === 'es') {
    const art = (h: number) => (h === 1 ? 'la' : 'las');
    if (t.minute === 0) return `${art(t.hour)} ${ES_HOURS[t.hour]} en punto`;
    if (t.minute <= 30) return `${art(t.hour)} ${ES_HOURS[t.hour]} y ${MIN_WORDS_ES[t.minute]}`;
    const rem = 60 - t.minute;
    return `${art(nextHour)} ${ES_HOURS[nextHour]} menos ${MIN_WORDS_ES[rem]}`;
  }
  if (t.minute === 0) return `${EN_HOURS[t.hour]} o'clock`;
  if (t.minute <= 30) return `${MIN_WORDS_EN[t.minute]} past ${EN_HOURS[t.hour]}`;
  const rem = 60 - t.minute;
  return `${MIN_WORDS_EN[rem]} to ${EN_HOURS[nextHour]}`;
}

export function generateTrain(rng: Rng, index: number, destinationOverride?: Destination): TrainChallenge {
  const destination = destinationOverride ?? DESTINATIONS[index % DESTINATIONS.length];
  const hour = randInt(rng, 1, 12);
  const minutePool = index === 0
    ? [0, 30]
    : index === 1
      ? [0, 15, 30, 45]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const base: ClockTime = { hour, minute: pick(rng, minutePool) };

  if (index < 3) {
    return { destination, base, deltaMinutes: 0, target: base, kind: 'direct' };
  }
  const kind: ClueKind = index === 3 ? 'delay' : pick(rng, ['duration', 'early']);
  const deltaPool = kind === 'early' ? [-15, -20] : [15, 20, 25, 30, 45];
  const deltaMinutes = pick(rng, deltaPool);
  const target = stepClock(base, deltaMinutes);
  return { destination, base, deltaMinutes, target, kind };
}

/** Contracts Spanish `a + el` -> `al` when building phrases towards a destination. */
export function toDestinationEs(destEs: string): string {
  return destEs.startsWith('el ') ? `al ${destEs.slice(3)}` : `a ${destEs}`;
}

const pickVariant = <T,>(items: readonly T[], variant: number): T =>
  items[((Math.trunc(variant) % items.length) + items.length) % items.length];

export function trainSpeech(c: TrainChallenge, lang: Lang, variant = 0): string {
  const dest = c.destination.name[lang];
  const toDest = toDestinationEs(dest);
  const baseStr = timeText(c.base, lang);
  if (c.kind === 'direct') {
    const lines: readonly Bi[] = [
      {
        es: `¡Hola! Mi tren hacia ${dest} sale a ${baseStr}. ¡Pon el reloj en hora!`,
        en: `Hello! My train to ${dest} leaves at ${baseStr}. Set the station clock!`,
      },
      {
        es: `¡Qué emoción, voy ${toDest}! El tren parte a ${baseStr}.`,
        en: `How exciting, I am off to ${dest}! The train departs at ${baseStr}.`,
      },
      {
        es: `¡Billete listo para ${dest}! Salimos a ${baseStr}.`,
        en: `Ticket ready for ${dest}! We leave at ${baseStr}.`,
      },
    ];
    return pickVariant(lines, variant)[lang];
  }
  if (c.kind === 'delay') {
    const lines: readonly Bi[] = [
      {
        es: `El tren de ${baseStr} hacia ${dest} lleva ${c.deltaMinutes} minutos de retraso. ¿A qué hora sale ahora?`,
        en: `The ${baseStr} train to ${dest} is ${c.deltaMinutes} minutes late. What time does it leave now?`,
      },
      {
        es: `¡Aviso en el andén! El tren de ${baseStr} ${toDest} se retrasa ${c.deltaMinutes} minutos. ¿Cuándo sale?`,
        en: `Platform announcement! The ${baseStr} train to ${dest} is delayed by ${c.deltaMinutes} minutes. When does it leave?`,
      },
    ];
    return pickVariant(lines, variant)[lang];
  }
  if (c.kind === 'duration') {
    const lines: readonly Bi[] = [
      {
        es: `El tren hacia ${dest} sale a ${baseStr} y el viaje dura ${c.deltaMinutes} minutos. ¿A qué hora llega?`,
        en: `The train to ${dest} leaves at ${baseStr} and takes ${c.deltaMinutes} minutes. What time does it arrive?`,
      },
      {
        es: `Salimos hacia ${dest} a ${baseStr} y tardamos ${c.deltaMinutes} minutos. ¿A qué hora llegamos?`,
        en: `We depart for ${dest} at ${baseStr} and the journey lasts ${c.deltaMinutes} minutes. When do we arrive?`,
      },
    ];
    return pickVariant(lines, variant)[lang];
  }
  const mins = Math.abs(c.deltaMinutes);
  const lines: readonly Bi[] = [
    {
      es: `El tren hacia ${dest} sale a ${baseStr}, pero hay que llegar ${mins} minutos antes. ¿Qué hora marcamos?`,
      en: `The train to ${dest} leaves at ${baseStr}, and we must arrive ${mins} minutes early. What time should we set?`,
    },
    {
      es: `¡Sin prisas! El tren ${toDest} sale a ${baseStr}; queremos estar ${mins} minutos antes en el andén.`,
      en: `No rushing! The train to ${dest} leaves at ${baseStr}; we want to be on the platform ${mins} minutes early.`,
    },
  ];
  return pickVariant(lines, variant)[lang];
}

export function checkClock(target: ClockTime, chosen: ClockTime, rng?: Rng): Bi | null {
  if (sameTime(target, chosen)) return null;
  const choose = <T,>(items: readonly T[]): T => (rng ? pick(rng, items) : items[0]);
  const diff = ((toMinutes(chosen) - toMinutes(target)) + 720) % 720;
  if (diff > 360) {
    return choose([
      {
        es: '🦆 ¡Demasiado pronto! Los patos del andén todavía están desayunando.',
        en: '🦆 Too early! The platform ducks are still having breakfast.',
      },
      {
        es: '☕ ¡Muy pronto! El maquinista todavía se está tomando el té.',
        en: '☕ Too early! The train driver is still having a cup of tea.',
      },
      {
        es: '😴 ¡Aún es pronto! La locomotora todavía está bostezando.',
        en: '😴 Too early! The engine is still yawning.',
      },
    ]);
  }
  return choose([
    {
      es: '🚂 ¡Chú-chú! Ese reloj va tarde y las maletas ya están bailando en el vagón.',
      en: '🚂 Choo-choo! That clock is too late and the suitcases are already dancing aboard.',
    },
    {
      es: '🎒 ¡Uy, va tarde! Los pasajeros ya corren por el andén.',
      en: '🎒 Whoops, too late! The passengers are already dashing down the platform.',
    },
    {
      es: '⏰ ¡Un poco tarde! Gira las agujas hacia atrás para alcanzar el tren.',
      en: '⏰ A bit too late! Wind the clock hands back to catch the train.',
    },
  ]);
}
