import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { useTimer } from '../hooks/useTimer';
import { TopBar } from './TopBar';
import { Board } from './Board';
import { Controls } from './Controls';
import { NumberPad } from './NumberPad';

export const GameScreen = (): JSX.Element => {
  useTimer();

  const selectedIndex = useGameStore((s) => s.selectedIndex);
  const selectCell = useGameStore((s) => s.selectCell);
  const inputDigit = useGameStore((s) => s.inputDigit);
  const erase = useGameStore((s) => s.erase);
  const toggleNotesMode = useGameStore((s) => s.toggleNotesMode);
  const undo = useGameStore((s) => s.undo);
  const generating = useGameStore((s) => s.generating);

  const anyOverlayOpen = useUIStore((s) => s.anyOverlayOpen);

  // Desktop keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (anyOverlayOpen()) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        inputDigit(Number(e.key));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        erase();
        return;
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        toggleNotesMode();
        return;
      }

      // Arrow-key navigation.
      const cur = selectedIndex ?? 40; // default to the center cell
      let next = cur;
      if (e.key === 'ArrowUp') next = cur - 9;
      else if (e.key === 'ArrowDown') next = cur + 9;
      else if (e.key === 'ArrowLeft') next = cur - 1;
      else if (e.key === 'ArrowRight') next = cur + 1;
      else return;
      e.preventDefault();
      if (next >= 0 && next < 81) selectCell(next);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    anyOverlayOpen,
    selectedIndex,
    selectCell,
    inputDigit,
    erase,
    toggleNotesMode,
    undo,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-3 py-2">
        <div className="relative w-full max-w-[min(92vw,560px)]">
          <Board />
          {generating && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-sm animate-fade-in"
              style={{ background: 'color-mix(in srgb, var(--surface) 60%, transparent)' }}
            >
              <div className="flex flex-col items-center gap-3">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2"
                  style={{
                    borderColor: 'var(--line)',
                    borderTopColor: 'var(--accent)',
                  }}
                />
                <span style={{ color: 'var(--muted-text)' }} className="text-sm">
                  Generating puzzle…
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="flex flex-col gap-3 px-3 pb-6 pt-1 sm:pb-8">
        <Controls />
        <NumberPad />
      </div>
    </div>
  );
};
