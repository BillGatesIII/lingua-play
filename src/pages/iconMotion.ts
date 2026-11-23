export type IconMotion =
  | 'apple-roll'
  | 'cheese-wiggle'
  | 'bread-rise'
  | 'compass-seek'
  | 'island-sway'
  | 'boat-sail'
  | 'palette-tilt'
  | 'chameleon-step'
  | 'brush-stroke'
  | 'pan-flip'
  | 'berry-bounce'
  | 'milk-pour'
  | 'train-chug'
  | 'clock-tick'
  | 'ticket-flutter'
  | 'magnifier-scan'
  | 'fox-peek'
  | 'cookie-nibble'
  | 'letters-pop'
  | 'owl-head-tilt'
  | 'books-settle'
  | 'flower-sway'
  | 'bee-buzz'
  | 'sunflower-turn'
  | 'no-shake'
  | 'spy-peek'
  | 'moon-rock'
  | 'disk-click';

export interface MotionIcon {
  emoji: string;
  motion: IconMotion;
}

export interface ChoreographyOptions {
  /** Initial delay before the first icon animates (ms). */
  initialDelayMs?: number;
  /** Minimum delay between ambient beats (ms). */
  minDelayMs?: number;
  /** Maximum delay between ambient beats (ms). */
  maxDelayMs?: number;
  /** Maximum number of ambient icons animating at the same time. */
  maxConcurrent?: number;
  /** Fallback timeout to clear `.is-alive` if animationend never fires (ms). */
  fallbackClearMs?: number;
  /** Optional RNG override for deterministic tests. */
  random?: () => number;
}

const ALIVE_CLASS = 'is-alive';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Brings icons with `[data-motion]` subtly to life one or two at a time,
 * plus a gentle staggered wave when hovering over a `.game-card`.
 */
export function startIconChoreography(
  root: HTMLElement,
  options: ChoreographyOptions = {},
): () => void {
  if (prefersReducedMotion()) return () => {};

  const initialDelayMs = options.initialDelayMs ?? 700;
  const minDelayMs = options.minDelayMs ?? 1500;
  const maxDelayMs = options.maxDelayMs ?? 2500;
  const maxConcurrent = options.maxConcurrent ?? 2;
  const fallbackClearMs = options.fallbackClearMs ?? 2400;
  const random = options.random ?? Math.random;

  let stopped = false;
  let beatTimer: number | undefined;
  let lastIcon: HTMLElement | null = null;
  let lastGroup: Element | null = null;
  const activeTimers = new Map<HTMLElement, number>();
  const waveTimers = new Set<number>();

  const clearIcon = (el: HTMLElement) => {
    const timer = activeTimers.get(el);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      activeTimers.delete(el);
    }
    el.classList.remove(ALIVE_CLASS);
  };

  const animateIcon = (el: HTMLElement) => {
    if (stopped || !el.isConnected) return;
    if (el.classList.contains(ALIVE_CLASS)) return;

    el.classList.add(ALIVE_CLASS);
    const onEnd = () => clearIcon(el);
    el.addEventListener('animationend', onEnd, { once: true });
    const fallback = window.setTimeout(() => {
      el.removeEventListener('animationend', onEnd);
      clearIcon(el);
    }, fallbackClearMs);
    activeTimers.set(el, fallback);
  };

  const pickNextIcon = (): HTMLElement | null => {
    const all = Array.from(root.querySelectorAll<HTMLElement>('[data-motion]'));
    const idle = all.filter((el) => !el.classList.contains(ALIVE_CLASS));
    if (!idle.length) return null;

    // Prefer an icon from a different card/section so motion spreads naturally across the page.
    const differentGroup = idle.filter((el) => {
      const group = el.closest('.game-card, .promises');
      return group !== lastGroup && el !== lastIcon;
    });
    const pool = differentGroup.length
      ? differentGroup
      : idle.filter((el) => el !== lastIcon);
    const candidates = pool.length ? pool : idle;
    return candidates[Math.floor(random() * candidates.length)] ?? null;
  };

  const scheduleNext = (delayMs: number) => {
    if (stopped) return;
    beatTimer = window.setTimeout(tick, delayMs);
  };

  const tick = () => {
    if (stopped) return;
    const isHidden = typeof document !== 'undefined' && document.hidden;
    if (!isHidden) {
      const currentAlive = root.querySelectorAll(`[data-motion].${ALIVE_CLASS}`).length;
      if (currentAlive < maxConcurrent) {
        const next = pickNextIcon();
        if (next) {
          lastIcon = next;
          lastGroup = next.closest('.game-card, .promises');
          animateIcon(next);
        }
      }
    }
    const nextDelay = minDelayMs + Math.round(random() * (maxDelayMs - minDelayMs));
    scheduleNext(nextDelay);
  };

  // Gentle staggered ripple when hovering a game card.
  const onPointerOver = (event: Event) => {
    if (stopped) return;
    const target = event.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('.game-card');
    if (!card) return;
    const related = (event as PointerEvent).relatedTarget as Node | null;
    if (related && card.contains(related)) return;

    const icons = Array.from(card.querySelectorAll<HTMLElement>('[data-motion]'));
    icons.forEach((icon, index) => {
      const t = window.setTimeout(() => {
        waveTimers.delete(t);
        animateIcon(icon);
      }, index * 140);
      waveTimers.add(t);
    });
  };

  root.addEventListener('pointerover', onPointerOver);
  scheduleNext(initialDelayMs);

  return () => {
    stopped = true;
    if (beatTimer !== undefined) window.clearTimeout(beatTimer);
    for (const timer of activeTimers.values()) window.clearTimeout(timer);
    activeTimers.clear();
    for (const timer of waveTimers) window.clearTimeout(timer);
    waveTimers.clear();
    root.removeEventListener('pointerover', onPointerOver);
  };
}
