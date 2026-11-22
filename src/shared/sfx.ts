import { loadProgress } from './storage';

export type SfxKind =
  | 'pop'
  | 'remove'
  | 'step'
  | 'tick'
  | 'coin'
  | 'splash'
  | 'bonk'
  | 'oops'
  | 'surprise'
  | 'levelUp';

let audioCtx: AudioContext | null = null;
let unlockBound = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function bindAudioUnlock(): void {
  if (unlockBound || typeof document === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    getAudioContext();
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });
}

interface ToneStep {
  delay: number;
  freqStart: number;
  freqEnd?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
}

function scheduleTones(ctx: AudioContext, steps: ToneStep[]): void {
  const base = ctx.currentTime;
  for (const s of steps) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const start = base + s.delay;
    const end = start + s.duration;
    osc.type = s.type ?? 'sine';
    osc.frequency.setValueAtTime(s.freqStart, start);
    if (s.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.freqEnd), end);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(s.gain, start + Math.min(0.012, s.duration * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  }
}

export function playSfx(kind: SfxKind): void {
  if (!loadProgress().settings.sound) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (kind) {
    case 'pop':
      scheduleTones(ctx, [{ delay: 0, freqStart: 340, freqEnd: 620, duration: 0.065, gain: 0.09, type: 'sine' }]);
      break;
    case 'remove':
      scheduleTones(ctx, [{ delay: 0, freqStart: 420, freqEnd: 210, duration: 0.065, gain: 0.08, type: 'sine' }]);
      break;
    case 'step':
      scheduleTones(ctx, [{ delay: 0, freqStart: 240, freqEnd: 350, duration: 0.055, gain: 0.06, type: 'triangle' }]);
      break;
    case 'tick':
      scheduleTones(ctx, [{ delay: 0, freqStart: 880, freqEnd: 380, duration: 0.03, gain: 0.07, type: 'triangle' }]);
      break;
    case 'coin':
      scheduleTones(ctx, [
        { delay: 0, freqStart: 1046.5, duration: 0.06, gain: 0.07, type: 'sine' },
        { delay: 0.05, freqStart: 1318.5, duration: 0.12, gain: 0.07, type: 'sine' },
      ]);
      break;
    case 'splash':
      scheduleTones(ctx, [
        { delay: 0, freqStart: 320, freqEnd: 580, duration: 0.07, gain: 0.08, type: 'sine' },
        { delay: 0.045, freqStart: 480, freqEnd: 740, duration: 0.08, gain: 0.06, type: 'sine' },
      ]);
      break;
    case 'bonk':
      scheduleTones(ctx, [{ delay: 0, freqStart: 170, freqEnd: 85, duration: 0.11, gain: 0.1, type: 'triangle' }]);
      break;
    case 'oops':
      scheduleTones(ctx, [
        { delay: 0, freqStart: 320, freqEnd: 210, duration: 0.1, gain: 0.08, type: 'triangle' },
        { delay: 0.09, freqStart: 220, freqEnd: 280, duration: 0.11, gain: 0.07, type: 'triangle' },
      ]);
      break;
    case 'surprise':
      scheduleTones(ctx, [
        { delay: 0, freqStart: 523.25, duration: 0.08, gain: 0.08, type: 'sine' },
        { delay: 0.065, freqStart: 659.25, duration: 0.08, gain: 0.08, type: 'sine' },
        { delay: 0.13, freqStart: 783.99, duration: 0.09, gain: 0.08, type: 'sine' },
        { delay: 0.2, freqStart: 1046.5, duration: 0.16, gain: 0.09, type: 'sine' },
      ]);
      break;
    case 'levelUp':
      scheduleTones(ctx, [
        { delay: 0, freqStart: 523.25, duration: 0.09, gain: 0.08, type: 'triangle' },
        { delay: 0.08, freqStart: 659.25, duration: 0.09, gain: 0.08, type: 'triangle' },
        { delay: 0.16, freqStart: 783.99, duration: 0.09, gain: 0.08, type: 'triangle' },
        { delay: 0.24, freqStart: 880, duration: 0.1, gain: 0.08, type: 'triangle' },
        { delay: 0.33, freqStart: 1046.5, duration: 0.25, gain: 0.1, type: 'sine' },
      ]);
      break;
  }
}
