import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';

type Pattern = 'light' | 'success' | 'error';

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 10,
  success: [12, 40, 12],
  error: [0, 30, 30, 30],
};

/**
 * Vibration feedback, gated by the user setting and silently a no-op where
 * the Vibration API is unavailable (most desktops, iOS Safari).
 */
export const useHaptics = (): ((pattern?: Pattern) => void) => {
  const enabled = useSettingsStore((s) => s.settings.haptics);

  return useCallback(
    (pattern: Pattern = 'light') => {
      if (!enabled) return;
      if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        /* ignore unsupported */
      }
    },
    [enabled],
  );
};
