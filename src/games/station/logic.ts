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
];

export const TRAVELLERS = [
  { emoji: '🦆', name: { es: 'el pato Pepe', en: 'Pepe the duck' } },
  { emoji: '🦉', name: { es: 'la búho Clara', en: 'Clara the owl' } },
  { emoji: '🐢', name: { es: 'la tortuga Tita', en: 'Tita the turtle' } },
  { emoji: '🦔', name: { es: 'el erizo Hugo', en: 'Hugo the hedgehog' } },
  { emoji: '🐧', name: { es: 'el pingüino Leo', en: 'Leo the penguin' } },
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

export function generateTrain(rng: Rng, index: number): TrainChallenge {
  const destination = DESTINATIONS[index % DESTINATIONS.length];
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

export function trainSpeech(c: TrainChallenge, lang: Lang): string {
  const dest = c.destination.name[lang];
  const baseStr = timeText(c.base, lang);
  if (c.kind === 'direct') {
    return lang === 'es'
      ? `¡Hola! Mi tren hacia ${dest} sale a ${baseStr}. ¡Pon el reloj en hora!`
      : `Hello! My train to ${dest} leaves at ${baseStr}. Set the station clock!`;
  }
  if (c.kind === 'delay') {
    return lang === 'es'
      ? `El tren hacia ${dest} de ${baseStr} lleva ${c.deltaMinutes} minutos de retraso. ¿A qué hora sale ahora?`
      : `The ${baseStr} train to ${dest} is ${c.deltaMinutes} minutes late. What time does it leave now?`;
  }
  if (c.kind === 'duration') {
    return lang === 'es'
      ? `El tren hacia ${dest} sale a ${baseStr} y el viaje dura ${c.deltaMinutes} minutos. ¿A qué hora llega?`
      : `The train to ${dest} leaves at ${baseStr} and takes ${c.deltaMinutes} minutes. What time does it arrive?`;
  }
  const mins = Math.abs(c.deltaMinutes);
  return lang === 'es'
    ? `El tren hacia ${dest} sale a ${baseStr}, pero hay que llegar ${mins} minutos antes. ¿Qué hora marcamos?`
    : `The train to ${dest} leaves at ${baseStr}, and we must arrive ${mins} minutes early. What time should we set?`;
}

export function checkClock(target: ClockTime, chosen: ClockTime): Bi | null {
  if (sameTime(target, chosen)) return null;
  const diff = ((toMinutes(chosen) - toMinutes(target)) + 720) % 720;
  if (diff > 360) {
    return {
      es: '🦆 ¡Demasiado pronto! Los patos del andén todavía están desayunando.',
      en: '🦆 Too early! The platform ducks are still having breakfast.',
    };
  }
  return {
    es: '🚂 ¡Chú-chú! Ese reloj va tarde y las maletas ya están bailando en el vagón.',
    en: '🚂 Choo-choo! That clock is too late and the suitcases are already dancing aboard.',
  };
}
