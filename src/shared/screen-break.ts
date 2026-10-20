export const SCREEN_BREAK_KEY = 'linguaplay.screen-break.v1';
export const SCREEN_SESSION_LIMIT_SECONDS = 10 * 60;

export interface ScreenBalance {
  screenSeconds: number;
  restSeconds: number;
  hiddenAt: number | null;
  breakArmed: boolean;
}

const emptyBalance = (): ScreenBalance => ({ screenSeconds: 0, restSeconds: 0, hiddenAt: null, breakArmed: false });

export function loadScreenBalance(): ScreenBalance {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SCREEN_BREAK_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return emptyBalance();
    const value = raw as Record<string, unknown>;
    return {
      screenSeconds: typeof value.screenSeconds === 'number' && Number.isFinite(value.screenSeconds)
        ? Math.max(0, Math.floor(value.screenSeconds))
        : 0,
      restSeconds: typeof value.restSeconds === 'number' && Number.isFinite(value.restSeconds)
        ? Math.max(0, Math.floor(value.restSeconds))
        : 0,
      hiddenAt: typeof value.hiddenAt === 'number' && Number.isFinite(value.hiddenAt) ? value.hiddenAt : null,
      breakArmed: value.breakArmed === true,
    };
  } catch {
    return emptyBalance();
  }
}

function save(balance: ScreenBalance): ScreenBalance {
  try {
    localStorage.setItem(SCREEN_BREAK_KEY, JSON.stringify(balance));
  } catch {
    // The feature remains optional when local storage is unavailable.
  }
  return balance;
}

export function addScreenSeconds(seconds: number): ScreenBalance {
  const balance = loadScreenBalance();
  if (balance.restSeconds > 0 || !Number.isFinite(seconds) || seconds <= 0) return balance;
  balance.screenSeconds += Math.floor(seconds);
  if (balance.screenSeconds >= SCREEN_SESSION_LIMIT_SECONDS) {
    balance.restSeconds = balance.screenSeconds;
    balance.screenSeconds = 0;
    balance.breakArmed = true;
  }
  return save(balance);
}

export function beginScreenBreak(): ScreenBalance {
  const balance = loadScreenBalance();
  if (balance.screenSeconds > 0 && balance.restSeconds === 0) {
    balance.restSeconds = balance.screenSeconds;
    balance.screenSeconds = 0;
    balance.hiddenAt = null;
    balance.breakArmed = true;
  }
  return save(balance);
}

export function updateScreenBreakVisibility(hidden: boolean, now = Date.now()): ScreenBalance {
  const balance = loadScreenBalance();
  if (balance.restSeconds === 0) return balance;
  if (hidden) {
    if (balance.breakArmed && balance.hiddenAt === null) balance.hiddenAt = now;
  } else if (balance.hiddenAt !== null) {
    const awaySeconds = Math.floor(Math.max(0, now - balance.hiddenAt) / 1000);
    balance.restSeconds = Math.max(0, balance.restSeconds - awaySeconds);
    balance.hiddenAt = null;
    if (balance.restSeconds === 0) balance.breakArmed = false;
  }
  return save(balance);
}

export function formatScreenTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${String(remainingSeconds).padStart(2, '0')}s`;
}
