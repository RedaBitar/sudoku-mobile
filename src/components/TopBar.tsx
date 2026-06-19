import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { DIFFICULTIES } from '../engine/types';
import { formatTime } from '../hooks/useTimer';

const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95';

export const TopBar = (): JSX.Element => {
  const difficulty = useGameStore((s) => s.difficulty);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const paused = useGameStore((s) => s.paused);
  const completed = useGameStore((s) => s.completed);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const newGame = useGameStore((s) => s.newGame);
  const hasUnfinished = useGameStore(
    (s) => s.given.length === 81 && !s.completed,
  );

  const showTimer = useSettingsStore((s) => s.settings.showTimer);
  const openSettings = useUIStore((s) => s.openSettings);
  const openDifficulty = useUIStore((s) => s.openDifficulty);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  // Start a fresh puzzle at the current difficulty, confirming first if the
  // current game is still in progress.
  const startNewGame = (): void => {
    const begin = (): void => newGame(difficulty);
    if (hasUnfinished) {
      requestConfirm({
        title: 'Start a new game?',
        message:
          'Your current game is unfinished. Starting a new puzzle will discard it.',
        confirmLabel: 'New game',
        onConfirm: begin,
      });
    } else {
      begin();
    }
  };

  return (
    <header
      className="flex items-center justify-between px-3 py-3"
      style={{ color: 'var(--text-given)' }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openDifficulty}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
          aria-label={`Difficulty: ${DIFFICULTIES[difficulty].label}. Change difficulty.`}
        >
          <span>{DIFFICULTIES[difficulty].label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={startNewGame}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium transition active:scale-95"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow)' }}
          aria-label="Start a new game at the current difficulty"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M20 11a8 8 0 10-2.3 5.7M20 5v4h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>New</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {showTimer && (
          <span
            className="tabular min-w-[3.5rem] text-center text-base font-medium"
            style={{ color: 'var(--muted-text)' }}
            aria-label={`Elapsed time ${formatTime(elapsedMs)}`}
          >
            {formatTime(elapsedMs)}
          </span>
        )}

        {!completed && (
          <button
            type="button"
            className={iconBtn}
            style={{ color: 'var(--muted-text)' }}
            onClick={() => (paused ? resume() : pause())}
            aria-label={paused ? 'Resume game' : 'Pause game'}
          >
            {paused ? (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 5h3v14H7zM14 5h3v14h-3z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        )}

        <button
          type="button"
          className={iconBtn}
          style={{ color: 'var(--muted-text)' }}
          onClick={openSettings}
          aria-label="Open settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19.4 13a7.8 7.8 0 000-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 00-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7.8 7.8 0 000 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 001.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 001.7-1l2.4 1 2-3.5-2-1.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};
