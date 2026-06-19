import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { DIFFICULTIES } from '../engine/types';
import { formatTime } from '../hooks/useTimer';

export const WinModal = (): JSX.Element | null => {
  const open = useUIStore((s) => s.winOpen);
  const close = useUIStore((s) => s.closeWin);
  const openDifficulty = useUIStore((s) => s.openDifficulty);

  const completed = useGameStore((s) => s.completed);
  const difficulty = useGameStore((s) => s.difficulty);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const mistakes = useGameStore((s) => s.mistakes);

  const bestMs = useSettingsStore((s) => s.stats[difficulty].bestMs);

  if (!open) return null;

  const isWin = completed;
  const isBest = isWin && bestMs !== null && elapsedMs <= bestMs;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={isWin ? 'Puzzle solved' : 'Game over'}
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={close}
      />

      {/* Tasteful completion sweep */}
      {isWin && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--accent), transparent)',
              animation: 'sweep 900ms ease-out',
            }}
          />
        </div>
      )}

      <div
        className="animate-sheet-up relative w-full max-w-sm rounded-3xl p-6 text-center"
        style={{
          background: 'var(--surface)',
          color: 'var(--text-given)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: isWin ? 'var(--accent-soft)' : 'var(--error-bg)',
            color: isWin ? 'var(--accent)' : 'var(--error-text)',
          }}
        >
          {isWin ? (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <h2 className="text-xl font-semibold">
          {isWin ? 'Solved!' : 'Game over'}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-text)' }}>
          {isWin
            ? `${DIFFICULTIES[difficulty].label} puzzle complete`
            : 'Three mistakes reached'}
        </p>

        {isWin && (
          <div className="my-5 grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl px-3 py-3"
              style={{ background: 'var(--peer-bg)' }}
            >
              <div className="text-lg font-semibold tabular">
                {formatTime(elapsedMs)}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
                Your time
              </div>
            </div>
            <div
              className="rounded-2xl px-3 py-3"
              style={{ background: 'var(--peer-bg)' }}
            >
              <div className="text-lg font-semibold tabular">
                {bestMs !== null ? formatTime(bestMs) : '—'}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
                Best {isBest ? '★' : ''}
              </div>
            </div>
          </div>
        )}

        {isWin && (hintsUsed > 0 || mistakes > 0) && (
          <p className="mb-4 text-xs" style={{ color: 'var(--muted-text)' }}>
            {hintsUsed} hint{hintsUsed === 1 ? '' : 's'} · {mistakes} mistake
            {mistakes === 1 ? '' : 's'}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-xl py-3 text-sm font-medium transition active:scale-95"
            style={{ background: 'var(--peer-bg)', color: 'var(--text-given)' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              openDifficulty();
            }}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            New game
          </button>
        </div>
      </div>
    </div>
  );
};
