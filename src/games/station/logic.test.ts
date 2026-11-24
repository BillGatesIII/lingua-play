import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  DESTINATIONS, TRAVELLERS, angleToMinute, checkClock, dragHourHand, dragMinuteHand, generateTrain,
  pickStartClock, pointerToClockAngle, sameTime, stepClock, timeText, toDestinationEs, trainSpeech,
} from './logic';

describe('station logic', () => {
  it('wraps clock hours and minutes cleanly', () => {
    expect(stepClock({ hour: 12, minute: 50 }, 15)).toEqual({ hour: 1, minute: 5 });
    expect(stepClock({ hour: 1, minute: 5 }, -15)).toEqual({ hour: 12, minute: 50 });
    expect(stepClock({ hour: 12, minute: 0 }, 60)).toEqual({ hour: 1, minute: 0 });
  });

  it('formats Spanish and English clock phrases naturally', () => {
    expect(timeText({ hour: 1, minute: 0 }, 'es')).toBe('la una en punto');
    expect(timeText({ hour: 3, minute: 15 }, 'es')).toBe('las tres y cuarto');
    expect(timeText({ hour: 4, minute: 30 }, 'en')).toBe('half past four');
    expect(timeText({ hour: 4, minute: 45 }, 'es')).toBe('las cinco menos cuarto');
    expect(timeText({ hour: 12, minute: 45 }, 'es')).toBe('la una menos cuarto');
    expect(timeText({ hour: 4, minute: 45 }, 'en')).toBe('quarter to five');
  });

  it('generates valid train challenges across the 5-train shift', () => {
    const rng = mulberry32(21);
    for (let i = 0; i < 5; i++) {
      for (let n = 0; n < 30; n++) {
        const c = generateTrain(rng, i);
        expect(c.target.hour).toBeGreaterThanOrEqual(1);
        expect(c.target.hour).toBeLessThanOrEqual(12);
        expect(c.target.minute % 5).toBe(0);
        expect(sameTime(stepClock(c.base, c.deltaMinutes), c.target)).toBe(true);
        expect(trainSpeech(c, 'es').length).toBeGreaterThan(10);
        expect(trainSpeech(c, 'en').length).toBeGreaterThan(10);
      }
    }
  });

  it('checks whether the set clock matches the target time across all variants', () => {
    const target = { hour: 3, minute: 30 };
    expect(checkClock(target, { hour: 3, minute: 30 })).toBeNull();
    expect(checkClock(target, { hour: 3, minute: 15 })?.en).toContain('early');
    expect(checkClock(target, { hour: 3, minute: 45 })?.es).toContain('tarde');
    for (let seed = 0; seed < 25; seed++) {
      const early = checkClock(target, { hour: 3, minute: 15 }, mulberry32(seed))!;
      expect(early.en).toContain('early');
      expect(early.es).not.toContain('tarde');
      const late = checkClock(target, { hour: 3, minute: 45 }, mulberry32(seed))!;
      expect(late.es).toContain('tarde');
      expect(late.en).not.toContain('early');
    }
  });

  it('contracts Spanish a + el to al across all train speeches and destinations', () => {
    expect(toDestinationEs('el museo')).toBe('al museo');
    expect(toDestinationEs('la biblioteca')).toBe('a la biblioteca');
    expect(TRAVELLERS.length).toBeGreaterThanOrEqual(10);
    for (const dest of DESTINATIONS) {
      for (const kind of ['direct', 'delay', 'duration', 'early'] as const) {
        const challenge = {
          destination: dest,
          base: { hour: 3, minute: 15 },
          deltaMinutes: kind === 'early' ? -15 : kind === 'direct' ? 0 : 20,
          target: { hour: 3, minute: 30 },
          kind,
        };
        for (const variant of [-1, 0, 1, 2]) {
          const es = trainSpeech(challenge, 'es', variant);
          const en = trainSpeech(challenge, 'en', variant);
          expect(es).not.toMatch(/\ba el\b/);
          expect(en.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('starts math challenges at the train base time and direct challenges at 12:00 or 6:00', () => {
    const dest = DESTINATIONS[0];
    expect(pickStartClock({
      destination: dest, base: { hour: 3, minute: 15 }, deltaMinutes: 20, target: { hour: 3, minute: 35 }, kind: 'delay',
    })).toEqual({ hour: 3, minute: 15 });
    expect(pickStartClock({
      destination: dest, base: { hour: 5, minute: 0 }, deltaMinutes: -15, target: { hour: 4, minute: 45 }, kind: 'early',
    })).toEqual({ hour: 5, minute: 0 });
    expect(pickStartClock({
      destination: dest, base: { hour: 3, minute: 0 }, deltaMinutes: 0, target: { hour: 3, minute: 0 }, kind: 'direct',
    })).toEqual({ hour: 12, minute: 0 });
    expect(pickStartClock({
      destination: dest, base: { hour: 12, minute: 0 }, deltaMinutes: 0, target: { hour: 12, minute: 0 }, kind: 'direct',
    })).toEqual({ hour: 6, minute: 0 });
  });

  it('converts pointer angles and drags minute/hour hands accurately across 12 o clock', () => {
    expect(pointerToClockAngle(0, -10)).toBeCloseTo(0);
    expect(pointerToClockAngle(10, 0)).toBeCloseTo(90);
    expect(pointerToClockAngle(0, 10)).toBeCloseTo(180);
    expect(pointerToClockAngle(-10, 0)).toBeCloseTo(270);

    expect(angleToMinute(0)).toBe(0);
    expect(angleToMinute(90)).toBe(15);
    expect(angleToMinute(180)).toBe(30);
    expect(angleToMinute(358)).toBe(0);

    // Crossing 12 forward increments the hour
    expect(dragMinuteHand({ hour: 12, minute: 55 }, 0)).toEqual({ hour: 1, minute: 0 });
    // Crossing 12 backward decrements the hour
    expect(dragMinuteHand({ hour: 1, minute: 0 }, 330)).toEqual({ hour: 12, minute: 55 });
    // Normal forward drag within the same hour
    expect(dragMinuteHand({ hour: 3, minute: 10 }, 150)).toEqual({ hour: 3, minute: 25 });

    // Dragging hour hand preserves minutes and tracks the hour angle
    expect(dragHourHand({ hour: 12, minute: 0 }, 90)).toEqual({ hour: 3, minute: 0 });
    expect(dragHourHand({ hour: 3, minute: 30 }, 135)).toEqual({ hour: 4, minute: 30 });
    expect(dragHourHand({ hour: 4, minute: 0 }, 0)).toEqual({ hour: 12, minute: 0 });
  });
});
