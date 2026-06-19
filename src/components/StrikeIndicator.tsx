import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';

const Heart = ({ filled }: { filled: boolean }): JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 21s-7-4.6-9.3-9C1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.4 0 5 3.5 3.3 7-2.3 4.4-9.3 9-9.3 9z"
      fill={filled ? 'var(--error-text)' : 'none'}
      stroke={filled ? 'var(--error-text)' : 'var(--line-box)'}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Shows the strikes left in 3-strike mode as a small chip of hearts above
 * the board. Renders nothing when the mode is off.
 */
export const StrikeIndicator = (): JSX.Element | null => {
  const strikeMode = useSettingsStore((s) => s.settings.strikeMode);
  const mistakes = useGameStore((s) => s.mistakes);
  const hasGame = useGameStore((s) => s.given.length === 81);

  if (!strikeMode || !hasGame) return null;
  const livesLeft = Math.max(0, 3 - mistakes);

  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
      role="status"
      aria-label={`${livesLeft} of 3 mistakes remaining`}
    >
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--muted-text)' }}
      >
        Mistakes left
      </span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <Heart key={i} filled={i < livesLeft} />
        ))}
      </div>
    </div>
  );
};
