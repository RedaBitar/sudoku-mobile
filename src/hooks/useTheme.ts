import { useEffect } from 'react';
import { useSettingsStore, type ThemeMode } from '../store/settingsStore';

const THEME_COLORS: Record<'light' | 'dark', string> = {
  light: '#FAFAF9',
  dark: '#0F0F11',
};

const resolve = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
};

const apply = (mode: ThemeMode): void => {
  const effective = resolve(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[effective]);
};

/**
 * Keep the document theme in sync with the setting, and follow the OS theme
 * live while in "system" mode.
 */
export const useTheme = (): void => {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
};
