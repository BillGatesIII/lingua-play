import { describe, expect, it } from 'vitest';
import { createAdaptiveChallenge } from './adaptive';

describe('adaptive challenge', () => {
  it('changes challenge only after two repeated signals and stays in bounds', () => {
    const challenge = createAdaptiveChallenge();
    expect(challenge.level).toBe(1);
    expect(challenge.complete(0)).toBe(1);
    expect(challenge.complete(0)).toBe(2);
    expect(challenge.complete(0)).toBe(2);
    expect(challenge.complete(2)).toBe(2);
    expect(challenge.complete(2)).toBe(1);
    expect(challenge.complete(2)).toBe(1);
  });

  it('treats one-miss rounds as neutral and resets the streak', () => {
    const challenge = createAdaptiveChallenge();
    challenge.complete(0);
    expect(challenge.complete(1)).toBe(1);
    expect(challenge.complete(0)).toBe(1);
  });
});
