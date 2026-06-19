import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export type HapticPattern = 'light' | 'success' | 'error';

// Android / Chrome expose the Vibration API and honor pattern arrays.
const VIBRATE: Record<HapticPattern, number | number[]> = {
  light: 14,
  success: [0, 30, 45, 70], // two rising taps — a "well done" feel
  error: [0, 55, 55, 55, 55, 55], // three sharp bumps — "that's wrong"
};

// iOS Safari has no Vibration API, but toggling a rendered
// `<input type="checkbox" switch>` (iOS 17.4+) plays a subtle system
// haptic. We keep one hidden offscreen and "click" it to fire a tap.
let iosToggle: HTMLLabelElement | null = null;

const getIosToggle = (): HTMLLabelElement | null => {
  if (typeof document === 'undefined') return null;
  if (iosToggle && document.body.contains(iosToggle)) return iosToggle;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText =
    'position:fixed;top:-100px;left:-100px;width:1px;height:1px;opacity:0;pointer-events:none;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', ''); // iOS 17.4+ native switch
  label.appendChild(input);
  document.body.appendChild(label);
  iosToggle = label;
  return label;
};

const iosTap = (): void => {
  getIosToggle()?.click();
};

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const playIos = (pattern: HapticPattern): void => {
  // We can only produce single taps on iOS, so we approximate the multi-tap
  // patterns with short bursts. Delayed taps may not always fire (they fall
  // outside the originating gesture), but the first one reliably does.
  if (pattern === 'light') {
    iosTap();
  } else if (pattern === 'success') {
    iosTap();
    window.setTimeout(iosTap, 90);
  } else {
    iosTap();
    window.setTimeout(iosTap, 80);
    window.setTimeout(iosTap, 160);
  }
};

/**
 * Haptic feedback, gated by the user setting. Uses the Vibration API where
 * available (Android) and the iOS switch trick as a fallback (iPhone).
 */
export const useHaptics = (): ((pattern?: HapticPattern) => void) => {
  const enabled = useSettingsStore((s) => s.settings.haptics);

  return useCallback(
    (pattern: HapticPattern = 'light') => {
      if (!enabled) return;
      try {
        if (canVibrate()) navigator.vibrate(VIBRATE[pattern]);
        else playIos(pattern);
      } catch {
        /* ignore unsupported */
      }
    },
    [enabled],
  );
};
