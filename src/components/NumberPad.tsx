import { useMemo } from 'react';
import { computeRemaining, useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';

export const NumberPad = (): JSX.Element => {
  const board = useGameStore((s) => s.board);
  const inputDigit = useGameStore((s) => s.inputDigit);
  const notesMode = useGameStore((s) => s.notesMode);
  const completed = useGameStore((s) => s.completed);
  const paused = useGameStore((s) => s.paused);

  const greyCompleted = useSettingsStore((s) => s.settings.greyCompletedDigits);
  const showRemaining = useSettingsStore((s) => s.settings.showRemainingCount);

  const remaining = useMemo(() => computeRemaining(board), [board]);

  // Two rows for bigger, easier mobile tap targets: 1–5 then 6–9.
  const rows = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9],
  ];

  const renderButton = (d: number): JSX.Element => {
    const left = remaining[d];
    const disabled = (greyCompleted && left <= 0) || completed || paused;
    return (
      <button
        key={d}
        type="button"
        disabled={disabled}
        onClick={() => inputDigit(d)}
        className="no-touch-callout relative flex flex-col items-center justify-center rounded-2xl transition active:scale-95 disabled:active:scale-100"
        style={{
          flex: '1 1 0',
          maxWidth: '4.75rem',
          height: '3.5rem',
          background: disabled ? 'transparent' : 'var(--surface)',
          boxShadow: disabled ? 'none' : 'var(--shadow)',
          color: disabled ? 'var(--line-box)' : 'var(--text-user)',
          opacity: disabled ? 0.45 : 1,
        }}
        aria-label={`${notesMode ? 'note' : 'place'} ${d}, ${left} remaining${
          disabled ? ', disabled' : ''
        }`}
      >
        <span
          className="tabular font-semibold leading-none"
          style={{ fontSize: '1.6rem' }}
        >
          {d}
        </span>
        {showRemaining && (
          <span
            className="tabular leading-none"
            style={{
              fontSize: '0.62rem',
              marginTop: '0.15rem',
              color: 'var(--muted-text)',
            }}
          >
            {left}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col items-stretch gap-2"
      role="group"
      aria-label="Number pad"
    >
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-2">
          {row.map(renderButton)}
        </div>
      ))}
    </div>
  );
};
