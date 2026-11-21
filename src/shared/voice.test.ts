import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgress, updateProgress } from './storage';
import { playSfx } from './sfx';
import { addHoverVoice, cleanSpeechText, pickEnglishVoice, speakEnglish, stopSpeech } from './voice';

describe('voice & speech bubble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    clearProgress();
    document.body.innerHTML = '';
    stopSpeech();
  });

  afterEach(() => {
    stopSpeech();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('strips emojis cleanly for speech synthesis', () => {
    expect(cleanSpeechText('🍎 Two apples! 🎉')).toBe('Two apples!');
    expect(cleanSpeechText('Treasure! 💎 You found it!')).toBe('Treasure! You found it!');
  });

  it('picks a preferred English voice when available', () => {
    const voices = [
      { lang: 'es-ES', name: 'Monica', localService: true },
      { lang: 'en-GB', name: 'Generic UK', localService: false },
      { lang: 'en-US', name: 'Google US English', localService: false },
    ] as SpeechSynthesisVoice[];
    expect(pickEnglishVoice(voices)?.name).toBe('Google US English');
    expect(pickEnglishVoice([{ lang: 'es-ES', name: 'Monica' }] as SpeechSynthesisVoice[])).toBeNull();
  });

  it('displays an English speech bubble and speaks via speechSynthesis when sound is enabled', () => {
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
});
