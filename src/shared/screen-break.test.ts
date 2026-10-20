import { beforeEach, describe, expect, it } from 'vitest';
import {
  SCREEN_BREAK_KEY, SCREEN_SESSION_LIMIT_SECONDS, addScreenSeconds, beginScreenBreak,
  loadScreenBalance, updateScreenBreakVisibility,
} from './screen-break';

describe('screen break balance', () => {
  beforeEach(() => localStorage.clear());

  it('matches screen time with an equal off-screen break', () => {
    addScreenSeconds(125);
    expect(beginScreenBreak().restSeconds).toBe(125);
    updateScreenBreakVisibility(true, 1000);
    expect(updateScreenBreakVisibility(false, 61_000).restSeconds).toBe(65);
    updateScreenBreakVisibility(true, 62_000);
    expect(updateScreenBreakVisibility(false, 127_000).restSeconds).toBe(0);
  });

  it('starts the equal break automatically at the session limit', () => {
    const balance = addScreenSeconds(SCREEN_SESSION_LIMIT_SECONDS);
    expect(balance).toMatchObject({ screenSeconds: 0, restSeconds: SCREEN_SESSION_LIMIT_SECONDS });
  });

  it('does not count the break until the page is hidden', () => {
    addScreenSeconds(30);
    beginScreenBreak();
    expect(updateScreenBreakVisibility(false, 5000).restSeconds).toBe(30);
    expect(updateScreenBreakVisibility(true, 5000).restSeconds).toBe(30);
    expect(updateScreenBreakVisibility(false, 15_000).restSeconds).toBe(20);
  });

  it('ignores additional screen time during an earned break', () => {
    addScreenSeconds(30);
    beginScreenBreak();
    addScreenSeconds(60);
    expect(loadScreenBalance().restSeconds).toBe(30);
    expect(localStorage.getItem(SCREEN_BREAK_KEY)).not.toBeNull();
  });
});
