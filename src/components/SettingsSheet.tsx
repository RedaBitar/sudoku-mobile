import { useState, type ReactNode } from 'react';
import {
  useSettingsStore,
  type Settings,
  type ThemeMode,
} from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { buildShareUrl } from '../engine/share';
import { Sheet } from './Sheet';

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
}: ToggleRowProps): JSX.Element => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-3 py-3 text-left"
  >
    <span className="flex min-w-0 flex-col">
      <span className="text-sm font-medium">{label}</span>
      {hint && (
        <span className="text-xs" style={{ color: 'var(--muted-text)' }}>
          {hint}
        </span>
      )}
    </span>
    <span
      className="relative h-6 w-11 shrink-0 rounded-full transition"
      style={{ background: checked ? 'var(--accent)' : 'var(--line)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: checked ? '1.375rem' : '0.125rem' }}
      />
    </span>
  </button>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element => (
  <div className="mb-4">
    <h3
      className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide"
      style={{ color: 'var(--muted-text)' }}
    >
      {title}
    </h3>
    <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
      {children}
    </div>
  </div>
);

export const SettingsSheet = (): JSX.Element => {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);
  const openStats = useUIStore((s) => s.openStats);
  const openDifficulty = useUIStore((s) => s.openDifficulty);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const resetStats = useSettingsStore((s) => s.resetStats);

  const given = useGameStore((s) => s.given);
  const [shareLabel, setShareLabel] = useState('Copy puzzle link');

  const sharePuzzle = async (): Promise<void> => {
    if (given.length !== 81) return;
    const url = buildShareUrl(given);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sudoku puzzle', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel('Link copied!');
      window.setTimeout(() => setShareLabel('Copy puzzle link'), 1800);
    } catch {
      // User dismissed the share sheet, or clipboard is unavailable.
    }
  };

  const bind =
    (key: keyof Settings) =>
    (v: boolean): void =>
      setSetting(key, v);

  const themes: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <Sheet open={open} onClose={close} title="Settings">
      <Section title="Assistance">
        <ToggleRow
          label="Mistake detection"
          hint="Flag duplicates in a row, column, or box."
          checked={settings.mistakeDetection}
          onChange={bind('mistakeDetection')}
        />
        <ToggleRow
          label="Highlight wrong entries"
          hint="Compare entries against the solution."
          checked={settings.compareToSolution}
          onChange={bind('compareToSolution')}
        />
        <ToggleRow
          label="Auto-remove candidates"
          hint="Strip a placed digit from peer notes."
          checked={settings.autoRemoveCandidates}
          onChange={bind('autoRemoveCandidates')}
        />
        <ToggleRow
          label="Auto-fill notes control"
          hint="Show a one-tap button to fill all legal notes."
          checked={settings.autoFillNotesEnabled}
          onChange={bind('autoFillNotesEnabled')}
        />
        <ToggleRow
          label="3-strike mode"
          hint="End the game after three mistakes."
          checked={settings.strikeMode}
          onChange={bind('strikeMode')}
        />
      </Section>

      <Section title="Highlighting">
        <ToggleRow
          label="Highlight row, column & box"
          checked={settings.peerHighlight}
          onChange={bind('peerHighlight')}
        />
        <ToggleRow
          label="Highlight same digit"
          checked={settings.sameValueHighlight}
          onChange={bind('sameValueHighlight')}
        />
        <ToggleRow
          label="Grey out completed digits"
          checked={settings.greyCompletedDigits}
          onChange={bind('greyCompletedDigits')}
        />
      </Section>

      <Section title="Feedback">
        <ToggleRow
          label="Haptic feedback"
          hint="Vibrate on input (where supported)."
          checked={settings.haptics}
          onChange={bind('haptics')}
        />
        <ToggleRow
          label="Show timer"
          checked={settings.showTimer}
          onChange={bind('showTimer')}
        />
      </Section>

      <Section title="Theme">
        <div className="flex gap-2 py-3">
          {themes.map((t) => {
            const active = settings.theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setSetting('theme', t.value)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition active:scale-95"
                style={{
                  background: active ? 'var(--accent)' : 'var(--peer-bg)',
                  color: active ? '#fff' : 'var(--text-given)',
                }}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </Section>

      <div className="mb-2 flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            close();
            openDifficulty();
          }}
          className="rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99]"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          New game
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            openStats();
          }}
          className="rounded-xl py-3 text-sm font-medium transition active:scale-[0.99]"
          style={{ background: 'var(--peer-bg)', color: 'var(--text-given)' }}
        >
          Statistics
        </button>
        <button
          type="button"
          onClick={() => void sharePuzzle()}
          disabled={given.length !== 81}
          className="rounded-xl py-3 text-sm font-medium transition active:scale-[0.99] disabled:opacity-40"
          style={{ background: 'var(--peer-bg)', color: 'var(--text-given)' }}
        >
          {shareLabel}
        </button>
        <button
          type="button"
          onClick={() =>
            requestConfirm({
              title: 'Reset statistics?',
              message: 'This permanently clears all recorded games and times.',
              confirmLabel: 'Reset',
              onConfirm: resetStats,
            })
          }
          className="rounded-xl py-3 text-sm font-medium transition active:scale-[0.99]"
          style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}
        >
          Reset statistics
        </button>
      </div>
    </Sheet>
  );
};
