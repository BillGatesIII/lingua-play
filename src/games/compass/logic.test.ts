import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../shared/rng';
import { applyLegs, type Clue, clueText, distance, generateLevel, shortestPath, step, temperature } from './logic';

describe('compass logic', () => {
  it('generates solvable levels whose target is inside the map', () => {
    const rng = mulberry32(42);
    for (const level of [0, 1, 2] as const) {
      for (let i = 0; i < 5; i++) {
        for (let n = 0; n < 40; n++) {
          const l = generateLevel(rng, level, i);
          expect(l.target.x).toBeGreaterThanOrEqual(1);
          expect(l.target.x).toBeLessThanOrEqual(l.size);
          expect(l.target.y).toBeGreaterThanOrEqual(1);
          expect(l.target.y).toBeLessThanOrEqual(l.size);
          const best = shortestPath(l.size, l.rocks, l.start, l.target);
          expect(best).toBeGreaterThan(0);
          expect(l.budget).toBeGreaterThanOrEqual(best);
          if (l.clue.kind === 'relative') expect(applyLegs(l.start, l.clue.legs)).toEqual(l.target);
          if (l.clue.kind === 'landmark') expect(applyLegs(l.landmarkPos!, l.clue.legs)).toEqual(l.target);
          if (l.clue.kind === 'coords') expect([l.clue.x, l.clue.y]).toEqual([l.target.x, l.target.y]);
        }
      }
    }
  });

  it('north increases y and edges block movement', () => {
    const l = generateLevel(mulberry32(1), 0, 0);
    const free = { ...l, rocks: [] };
    expect(step(free, { x: 2, y: 2 }, 'N').pos).toEqual({ x: 2, y: 3 });
    expect(step(free, { x: 1, y: 1 }, 'W').blocked).toBe(true);
    expect(step({ ...free, rocks: [{ x: 3, y: 2 }] }, { x: 2, y: 2 }, 'E').blocked).toBe(true);
  });

  it('writes clues in both languages', () => {
    const clue: Clue = { kind: 'relative', legs: [{ dir: 'N', n: 3 }, { dir: 'E', n: 1 }] };
    expect(clueText(clue, 'es')).toBe('Desde el barco: tres pasos al norte y un paso al este. ¡Cava!');
    expect(clueText(clue, 'en')).toBe('From the ship: three steps north and one step east. Dig!');
  });

  it('measures distance and temperature', () => {
    expect(distance({ x: 1, y: 1 }, { x: 4, y: 3 })).toBe(5);
    expect([temperature(1), temperature(3), temperature(4)]).toEqual(['hot', 'warm', 'cold']);
  });
});
