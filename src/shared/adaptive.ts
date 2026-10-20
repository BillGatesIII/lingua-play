export type ChallengeLevel = 0 | 1 | 2;

export function createAdaptiveChallenge() {
  let level: ChallengeLevel = 1;
  let lastSignal: 'smooth' | 'tricky' | null = null;
  let streak = 0;

  return {
    get level() {
      return level;
    },
    complete(misses: number): ChallengeLevel {
      const signal = misses === 0 ? 'smooth' : misses >= 2 ? 'tricky' : null;
      if (!signal) {
        lastSignal = null;
        streak = 0;
        return level;
      }
      streak = signal === lastSignal ? streak + 1 : 1;
      lastSignal = signal;
      if (streak >= 2) {
        level = Math.max(0, Math.min(2, level + (signal === 'smooth' ? 1 : -1))) as ChallengeLevel;
        streak = 0;
      }
      return level;
    },
  };
}
