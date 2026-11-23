import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, updateProgress } from './storage';
import { playSfx, resetSfxForTest } from './sfx';
import { resetSpeechSession } from './speechDirector';
import { addHoverVoice, cleanSpeechText, pickEnglishVoice, speakEnglish, stopSpeech } from './voice';

describe('voice & speech bubble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearProgress();
    document.body.innerHTML = '';
    resetSfxForTest();
    stopSpeech();
    resetSpeechSession();
  });

  afterEach(() => {
    stopSpeech();
    resetSpeechSession();
    resetSfxForTest();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('strips emojis cleanly for speech synthesis', () => {
    expect(cleanSpeechText('🍎 Two apples! 🎉')).toBe('Two apples!');
    expect(cleanSpeechText('Treasure! 💎 You found it!')).toBe('Treasure! You found it!');
  });

  it('prefers British English voices over American English voices', () => {
    const voices = [
      { lang: 'es-ES', name: 'Monica', localService: true },
      { lang: 'en-US', name: 'Microsoft Aria Online (Natural) - English (United States)', localService: false },
      { lang: 'en-US', name: 'Google US English', localService: false },
      { lang: 'en-GB', name: 'Microsoft Hazel - English (United Kingdom)', localService: true },
      { lang: 'en-GB', name: 'Google UK English Female', localService: false },
    ] as SpeechSynthesisVoice[];
    expect(pickEnglishVoice(voices)?.name).toBe('Google UK English Female');

    const withNaturalUk = [
      ...voices,
      { lang: 'en-GB', name: 'Microsoft Libby Online (Natural) - English (United Kingdom)', localService: false },
    ] as SpeechSynthesisVoice[];
    expect(pickEnglishVoice(withNaturalUk)?.name).toBe('Microsoft Libby Online (Natural) - English (United Kingdom)');

    const androidUk = [
      { lang: 'en_US', name: 'English United States', localService: true },
      { lang: 'en_GB', name: 'English United Kingdom', localService: true },
    ] as SpeechSynthesisVoice[];
    expect(pickEnglishVoice(androidUk)?.lang).toBe('en_GB');

    const usFallback = [
      { lang: 'es-ES', name: 'Monica', localService: true },
      { lang: 'en-US', name: 'Google US English', localService: false },
    ] as SpeechSynthesisVoice[];
    expect(pickEnglishVoice(usFallback)?.name).toBe('Google US English');

    expect(pickEnglishVoice([{ lang: 'es-ES', name: 'Monica' }] as SpeechSynthesisVoice[])).toBeNull();
  });

  it('displays an English speech bubble and speaks via speechSynthesis in en-GB when sound is enabled', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => [] },
    });
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    const anchor = document.createElement('button');
    document.body.append(anchor);
    speakEnglish('Two apples!', { anchor, mode: 'click' });

    const bubble = document.querySelector<HTMLElement>('.voice-bubble');
    expect(bubble).not.toBeNull();
    expect(bubble?.hidden).toBe(false);
    expect(bubble?.getAttribute('lang')).toBe('en');
    expect(bubble?.textContent).toContain('Two apples!');
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0][0] as MockUtterance).lang).toBe('en-GB');

    vi.advanceTimersByTime(5000);
    expect(bubble?.hidden).toBe(true);
  });

  it('shows visual bubble silently when sound is muted', () => {
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: vi.fn(), getVoices: () => [] },
    });
    updateProgress((p) => { p.settings.sound = false; });

    speakEnglish('Red', { mode: 'click' });
    const bubble = document.querySelector<HTMLElement>('.voice-bubble');
    expect(bubble?.hidden).toBe(false);
    expect(bubble?.textContent).toContain('Red');
    expect(speak).not.toHaveBeenCalled();
  });

  it('speaks on mouse hover after delay and cancels on pointer leave', () => {
    const btn = document.createElement('button');
    document.body.append(btn);
    addHoverVoice(btn, 'apple', 140);

    btn.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
    vi.advanceTimersByTime(100);
    expect(document.querySelector('.voice-bubble')).toBeNull();

    btn.dispatchEvent(new MouseEvent('pointerleave'));
    vi.advanceTimersByTime(100);
    expect(document.querySelector('.voice-bubble')).toBeNull();

    btn.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
    vi.advanceTimersByTime(150);
    const bubble = document.querySelector<HTMLElement>('.voice-bubble');
    expect(bubble?.hidden).toBe(false);
    expect(bubble?.textContent).toContain('apple');
  });

  it('safely handles playSfx when AudioContext is unavailable or muted', () => {
    expect(() => playSfx('surprise')).not.toThrow();
    updateProgress((p) => { p.settings.sound = false; });
    expect(() => playSfx('levelUp')).not.toThrow();
  });

  it('positions the bubble using untransformed offset dimensions so it stays inside the viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

    speakEnglish('Warmup', { mode: 'click' });
    const bubble = document.querySelector<HTMLElement>('.voice-bubble')!;
    Object.defineProperty(bubble, 'offsetWidth', { configurable: true, value: 240 });
    Object.defineProperty(bubble, 'offsetHeight', { configurable: true, value: 50 });
    vi.spyOn(bubble, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 204, bottom: 42.5, width: 204, height: 42.5, x: 0, y: 0, toJSON: () => ({}),
    });

    const anchor = document.createElement('button');
    document.body.append(anchor);
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      left: 960, top: 200, right: 1010, bottom: 240, width: 50, height: 40, x: 960, y: 200, toJSON: () => ({}),
    });

    speakEnglish('Right edge clue', { anchor, mode: 'click' });
    expect(bubble.style.left).toBe('772px');
  });

  it('suppresses hover speech while click speech is active and allows another click to interrupt', () => {
    const utterances: { onend: (() => void) | null }[] = [];
    const synth = {
      speaking: false,
      pending: false,
      speak: vi.fn((u: { onend: (() => void) | null }) => {
        synth.speaking = true;
        utterances.push(u);
      }),
      cancel: vi.fn(() => {
        synth.speaking = false;
        synth.pending = false;
      }),
      getVoices: () => [],
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    speakEnglish('The train leaves at half past three.', { mode: 'click' });
    expect(synth.speak).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    speakEnglish('Plus five minutes', { mode: 'hover' });
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('The train leaves at half past three.');

    speakEnglish('Four o clock', { mode: 'click' });
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('Four o clock');

    synth.speaking = false;
    utterances[utterances.length - 1]?.onend?.();
    vi.advanceTimersByTime(400);
    speakEnglish('Home', { mode: 'hover' });
    expect(synth.speak).toHaveBeenCalledTimes(3);
    expect(document.querySelector('.voice-bubble')?.textContent).toContain('Home');
  });

  it('does not burn hover cooldown when speech is blocked by autoplay (onerror without onstart)', () => {
    const utterances: { onstart: (() => void) | null; onerror: (() => void) | null }[] = [];
    const speak = vi.fn((u: { onstart: (() => void) | null; onerror: (() => void) | null }) => {
      utterances.push(u);
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: vi.fn(), getVoices: () => [] },
    });
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    speakEnglish('Market Quest', { mode: 'hover', role: 'vocab' });
    expect(speak).toHaveBeenCalledTimes(1);
    utterances[0].onerror?.();

    // Visual bubble stays readable for fallback duration instead of cutting off at 750ms
    vi.advanceTimersByTime(1000);
    expect(document.querySelector<HTMLElement>('.voice-bubble')?.hidden).toBe(false);

    speakEnglish('Market Quest', { mode: 'hover', role: 'vocab' });
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('clears priority speech lock and keeps bubble readable when click speech errors before starting', () => {
    const utterances: { onstart: (() => void) | null; onerror: (() => void) | null }[] = [];
    const synth = {
      speaking: false,
      pending: false,
      speak: vi.fn((u: { onstart: (() => void) | null; onerror: (() => void) | null }) => {
        utterances.push(u);
      }),
      cancel: vi.fn(),
      getVoices: () => [],
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    speakEnglish('Two apples!', { mode: 'click' });
    utterances[0].onerror?.();

    vi.advanceTimersByTime(400);
    expect(document.querySelector<HTMLElement>('.voice-bubble')?.hidden).toBe(false);

    speakEnglish('Orange', { mode: 'hover', role: 'vocab' });
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it('waits for a suspended AudioContext to resume before scheduling tones, and skips if muted meanwhile', async () => {
    let resolveResume!: () => void;
    const oscStart = vi.fn();
    const mockCtx = {
      state: 'suspended' as AudioContextState,
      currentTime: 0,
      destination: {},
      resume: vi.fn(() => new Promise<void>((resolve) => {
        resolveResume = () => {
          mockCtx.state = 'running';
          mockCtx.currentTime = 0.05;
          resolve();
        };
      })),
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: oscStart,
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
    };
    vi.stubGlobal('AudioContext', vi.fn(function () { return mockCtx; }));

    playSfx('pop');
    expect(mockCtx.resume).toHaveBeenCalledTimes(1);
    expect(oscStart).not.toHaveBeenCalled();

    resolveResume();
    await Promise.resolve();
    expect(oscStart).toHaveBeenCalledTimes(1);
    expect(oscStart).toHaveBeenCalledWith(0.05);

    // If sound is muted while resume is pending, do not schedule tones after resume resolves
    mockCtx.state = 'suspended';
    playSfx('pop');
    updateProgress((p) => { p.settings.sound = false; });
    resolveResume();
    await Promise.resolve();
    expect(oscStart).toHaveBeenCalledTimes(1);

    // Closed AudioContext is recreated automatically
    updateProgress((p) => { p.settings.sound = true; });
    mockCtx.state = 'closed';
    const oscStart2 = vi.fn();
    const mockCtx2 = { ...mockCtx, state: 'running' as AudioContextState, createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: oscStart2,
      stop: vi.fn(),
    })) };
    vi.stubGlobal('AudioContext', vi.fn(function () { return mockCtx2; }));
    playSfx('pop');
    expect(oscStart2).toHaveBeenCalledTimes(1);
  });
});
