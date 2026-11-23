import { localDateKey } from './date';
import type { Bi } from './i18n';
import { pick, type Rng } from './rng';

export const PLAY_BREAK_KEY = 'linguaplay.break.v1';
export const ROUNDS_BEFORE_BREAK = 2;

export interface PlayBreakState {
  roundsSinceBreak: number;
  totalBreaks: number;
  resting: boolean;
}

export const BREAK_IDEAS: readonly { emoji: string; text: Bi }[] = [
  { emoji: '🌳', text: { es: 'Sal un momento y busca tres cosas verdes.', en: 'Step outside and spot three green things.' } },
  { emoji: '🐸', text: { es: 'Haz ocho saltos de rana por el salón o el jardín.', en: 'Do eight frog jumps across the room or garden.' } },
  { emoji: '💧', text: { es: 'Bebe un buen vaso de agua y estira los brazos.', en: 'Drink a glass of water and stretch your arms.' } },
  { emoji: '☁️', text: { es: 'Mira por la ventana y busca una nube con forma divertida.', en: 'Look out the window and find a funny-shaped cloud.' } },
];

const defaultBreak = (): PlayBreakState => ({ roundsSinceBreak: 0, totalBreaks: 0, resting: false });
let memoryBreak: PlayBreakState | null = null;
let memoryDate: string | null = null;

function sanitizeBreak(raw: unknown): PlayBreakState {
  const d = defaultBreak();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  if (typeof r.roundsSinceBreak === 'number' && Number.isFinite(r.roundsSinceBreak) && r.roundsSinceBreak >= 0) {
    d.roundsSinceBreak = Math.floor(r.roundsSinceBreak);
  }
  if (typeof r.totalBreaks === 'number' && Number.isFinite(r.totalBreaks) && r.totalBreaks >= 0) {
    d.totalBreaks = Math.floor(r.totalBreaks);
  }
  d.resting = r.resting === true;
  return d;
}

export function loadBreakState(): PlayBreakState {
  const today = localDateKey();
  if (memoryBreak) {
    if (memoryDate && memoryDate !== today) return resetBreakState();
    return { ...memoryBreak };
  }
  try {
    const raw = localStorage.getItem(PLAY_BREAK_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown> | null) : null;
    if (parsed && typeof parsed === 'object' && typeof parsed.sessionDate === 'string' && parsed.sessionDate !== today) {
      return resetBreakState();
    }
    memoryBreak = sanitizeBreak(parsed);
    memoryDate = today;
  } catch {
    memoryBreak = defaultBreak();
    memoryDate = today;
  }
  return { ...memoryBreak };
}

function saveBreakState(state: PlayBreakState): PlayBreakState {
  const today = localDateKey();
  const clean = sanitizeBreak(state);
  memoryBreak = clean;
  memoryDate = today;
  try {
    localStorage.setItem(PLAY_BREAK_KEY, JSON.stringify({ ...clean, sessionDate: today }));
  } catch {
    /* ignore private mode errors */
  }
  return { ...clean };
}

export function completeGameRound(): { state: PlayBreakState; suggestBreak: boolean } {
  const state = loadBreakState();
  state.roundsSinceBreak += 1;
  const saved = saveBreakState(state);
  return { state: saved, suggestBreak: saved.roundsSinceBreak >= ROUNDS_BEFORE_BREAK };
}

export function startPlayBreak(): PlayBreakState {
  const state = loadBreakState();
  return saveBreakState({
    roundsSinceBreak: 0,
    totalBreaks: state.totalBreaks + 1,
    resting: true,
  });
}

export function finishPlayBreak(): PlayBreakState {
  const state = loadBreakState();
  return saveBreakState({
    roundsSinceBreak: 0,
    totalBreaks: state.totalBreaks,
    resting: false,
  });
}

export const dismissPlayBreak = finishPlayBreak;

export function resetBreakState(): PlayBreakState {
  memoryBreak = defaultBreak();
  memoryDate = localDateKey();
  try {
    localStorage.removeItem(PLAY_BREAK_KEY);
  } catch {
    /* ignore */
  }
  return defaultBreak();
}

export function pickBreakIdea(rng: Rng): { emoji: string; text: Bi } {
  return pick(rng, BREAK_IDEAS);
}
