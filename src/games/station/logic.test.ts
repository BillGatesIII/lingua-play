import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import {
  checkClock, generateTrain, sameTime, stepClock, timeText, trainSpeech,
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

  it('checks whether the set clock matches the target time', () => {
    const target = { hour: 3, minute: 30 };
    expect(checkClock(target, { hour: 3, minute: 30 })).toBeNull();
    expect(checkClock(target, { hour: 3, minute: 15 })?.en).toContain('early');
    expect(checkClock(target, { hour: 3, minute: 45 })?.es).toContain('tarde');
  });
});
