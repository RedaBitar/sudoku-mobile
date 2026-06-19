import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import { Sheet } from './Sheet';

interface DifficultyPickerProps {
  /** False on first launch when there is no game to fall back to. */
  dismissible: boolean;
}

export const DifficultyPicker = ({
  dismissible,
}: DifficultyPickerProps): JSX.Element => {
  const difficultyOpen = useUIStore((s) => s.difficultyOpen);
  const closeDifficulty = useUIStore((s) => s.closeDifficulty);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const newGame = useGameStore((s) => s.newGame);
  const currentDifficulty = useGameStore((s) => s.difficulty);
  const hasUnfinished = useGameStore(
    (s) => s.given.length === 81 && !s.completed,
  );

  const start = (level: Difficulty): void => {
    const begin = (): void => {
      newGame(level);
      closeDifficulty();
    };
    // Confirm before discarding an in-progress game.
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

  const levels = Object.values(DIFFICULTIES);

  return (
    <Sheet
      open={difficultyOpen}
      onClose={closeDifficulty}
      title="New game"
      dismissible={dismissible}
    >
      <p className="mb-4 text-sm" style={{ color: 'var(--muted-text)' }}>
        Pick a difficulty. Puzzles are generated fresh with a single solution.
      </p>
      <div className="flex flex-col gap-2 pb-2">
        {levels.map((meta) => {
          const isCurrent = meta.level === currentDifficulty;
          return (
            <button
              key={meta.level}
              type="button"
              onClick={() => start(meta.level)}
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition active:scale-[0.99]"
              style={{
                background: isCurrent ? 'var(--accent-soft)' : 'var(--peer-bg)',
                border: `1px solid ${
                  isCurrent ? 'var(--accent)' : 'transparent'
                }`,
              }}
            >
              <div>
                <div className="text-base font-semibold">{meta.label}</div>
                <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
                  {meta.clues[0]}–{meta.clues[1]} clues
                </div>
              </div>
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        n <= meta.level ? 'var(--accent)' : 'var(--line)',
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
};
