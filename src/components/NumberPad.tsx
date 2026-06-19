import { useMemo } from 'react';
import { computeRemaining, useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useHaptics } from '../hooks/useHaptics';

export const NumberPad = (): JSX.Element => {
  const board = useGameStore((s) => s.board);
  const inputDigit = useGameStore((s) => s.inputDigit);
  const notesMode = useGameStore((s) => s.notesMode);
  const completed = useGameStore((s) => s.completed);
  const paused = useGameStore((s) => s.paused);

  const greyCompleted = useSettingsStore((s) => s.settings.greyCompletedDigits);
  const haptics = useHaptics();

  const remaining = useMemo(() => computeRemaining(board), [board]);

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
      role="group"
      aria-label="Number pad"
    >
      {digits.map((d) => {
        const left = remaining[d];
        const disabled =
          (greyCompleted && left <= 0) || completed || paused;
        return (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => {
              inputDigit(d);
              haptics('light');
            }}
            className="no-touch-callout relative flex aspect-[3/4] flex-col items-center justify-center rounded-xl transition active:scale-95 disabled:active:scale-100"
            style={{
              background: disabled ? 'transparent' : 'var(--surface)',
              boxShadow: disabled ? 'none' : 'var(--shadow)',
              color: disabled ? 'var(--line-box)' : 'var(--text-user)',
              opacity: disabled ? 0.45 : 1,
              minHeight: 'var(--tap)',
            }}
            aria-label={`${notesMode ? 'note' : 'place'} ${d}, ${left} remaining${
              disabled ? ', disabled' : ''
            }`}
          >
            <span
              className="tabular font-semibold"
              style={{ fontSize: 'clamp(1.05rem, 4.4vw, 1.5rem)' }}
            >
              {d}
            </span>
            <span
              className="tabular text-[0.62rem] leading-none"
              style={{ color: 'var(--muted-text)' }}
            >
              {left}
            </span>
          </button>
        );
      })}
    </div>
  );
};
