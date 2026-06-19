import type { CSSProperties, ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useHaptics } from '../hooks/useHaptics';

interface ControlButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}

const ControlButton = ({
  label,
  active = false,
  disabled = false,
  badge,
  onClick,
  children,
}: ControlButtonProps): JSX.Element => {
  const style: CSSProperties = {
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--muted-text)',
    boxShadow: disabled ? 'none' : 'var(--shadow)',
    opacity: disabled ? 0.4 : 1,
    minHeight: 'var(--tap)',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className="no-touch-callout relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition active:scale-95 disabled:active:scale-100"
      style={style}
    >
      {children}
      <span className="text-[0.66rem] font-medium">{label}</span>
      {badge}
    </button>
  );
};

const icon = (path: string): JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Controls = (): JSX.Element => {
  const undo = useGameStore((s) => s.undo);
  const erase = useGameStore((s) => s.erase);
  const toggleNotesMode = useGameStore((s) => s.toggleNotesMode);
  const hint = useGameStore((s) => s.hint);
  const autoFillNotes = useGameStore((s) => s.autoFillNotes);
  const notesMode = useGameStore((s) => s.notesMode);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const completed = useGameStore((s) => s.completed);
  const paused = useGameStore((s) => s.paused);

  const autoFillEnabled = useSettingsStore((s) => s.settings.autoFillNotesEnabled);
  const haptics = useHaptics();

  const blocked = completed || paused;

  return (
    <div className="flex items-stretch gap-1.5">
      <ControlButton
        label="Undo"
        disabled={!canUndo || blocked}
        onClick={() => {
          undo();
          haptics('light');
        }}
      >
        {icon('M9 14L4 9l5-5 M4 9h11a5 5 0 010 10h-3')}
      </ControlButton>

      <ControlButton
        label="Erase"
        disabled={blocked}
        onClick={() => {
          erase();
          haptics('light');
        }}
      >
        {icon('M7 21h10 M5 16l6-12 8 4-6 12z M3 16l8 4')}
      </ControlButton>

      <ControlButton
        label="Notes"
        active={notesMode}
        disabled={blocked}
        onClick={() => {
          toggleNotesMode();
          haptics('light');
        }}
        badge={
          <span
            className="absolute right-1 top-1 rounded-full px-1.5 text-[0.55rem] font-bold"
            style={{
              background: notesMode ? 'rgba(255,255,255,0.25)' : 'var(--accent-soft)',
              color: notesMode ? '#fff' : 'var(--accent)',
            }}
          >
            {notesMode ? 'ON' : 'OFF'}
          </span>
        }
      >
        {icon('M12 20h9 M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z')}
      </ControlButton>

      {autoFillEnabled && (
        <ControlButton
          label="Fill"
          disabled={blocked}
          onClick={() => {
            autoFillNotes();
            haptics('light');
          }}
        >
          {icon('M4 7h16 M4 12h16 M4 17h10')}
        </ControlButton>
      )}

      <ControlButton
        label="Hint"
        disabled={blocked}
        onClick={() => hint()}
      >
        {icon('M9 18h6 M10 22h4 M12 2a7 7 0 00-4 12c.7.7 1 1.3 1 2h6c0-.7.3-1.3 1-2a7 7 0 00-4-12z')}
      </ControlButton>
    </div>
  );
};
