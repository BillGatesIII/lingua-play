import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ROUNDS_BEFORE_BREAK, completeGameRound, dismissPlayBreak, finishPlayBreak,
  loadBreakState, resetBreakState, startPlayBreak,
} from './playBreak';

describe('playBreak', () => {
  beforeEach(() => {
    localStorage.clear();
    resetBreakState();
  });

  it('suggests a break after ROUNDS_BEFORE_BREAK completed rounds without a timer', () => {
    for (let i = 1; i < ROUNDS_BEFORE_BREAK; i++) {
      const res = completeGameRound();
      expect(res.suggestBreak).toBe(false);
    }
    const last = completeGameRound();
    expect(last.suggestBreak).toBe(true);
    expect(last.state.roundsSinceBreak).toBe(ROUNDS_BEFORE_BREAK);
  });

  it('tracks taking and finishing a play break, or continuing without lock', () => {
    completeGameRound();
    completeGameRound();
    const resting = startPlayBreak();
    expect(resting.resting).toBe(true);
    expect(resting.totalBreaks).toBe(1);
    expect(resting.roundsSinceBreak).toBe(0);

    const back = finishPlayBreak();
    expect(back.resting).toBe(false);
    expect(loadBreakState().totalBreaks).toBe(1);

    completeGameRound();
    completeGameRound();
    const continued = dismissPlayBreak();
    expect(continued.roundsSinceBreak).toBe(0);
    expect(continued.resting).toBe(false);
  });

  it('resets break state automatically on a new calendar day', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-23T20:00:00'));
      resetBreakState();
      completeGameRound();
      completeGameRound();
      startPlayBreak();
      expect(loadBreakState()).toEqual({ roundsSinceBreak: 0, totalBreaks: 1, resting: true });

      vi.setSystemTime(new Date('2026-11-24T08:00:00'));
      expect(loadBreakState()).toEqual({ roundsSinceBreak: 0, totalBreaks: 0, resting: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
