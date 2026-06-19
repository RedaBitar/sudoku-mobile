import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { useTimer } from '../hooks/useTimer';
import { useHaptics } from '../hooks/useHaptics';
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
  const feedback = useGameStore((s) => s.feedback);

  const anyOverlayOpen = useUIStore((s) => s.anyOverlayOpen);

  // Drive haptics from input feedback: one tap on a normal entry, a triple
  // bump on a mistake, and a "well done" on clearing a unit or finishing.
  const haptics = useHaptics();
  const lastHaptic = useRef(0);
  useEffect(() => {
    if (!feedback || feedback.id === lastHaptic.current) return;
    lastHaptic.current = feedback.id;
    if (feedback.solved || feedback.clearedCells.length > 0) haptics('success');
    else if (feedback.mistake) haptics('error');
    else haptics('light');
  }, [feedback, haptics]);

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

      <main className="flex min-h-0 flex-1 flex-col items-center px-3">
        {/* Spacers keep the board in its upper-middle spot while the controls
            sit just beneath it and the extra room collects at the bottom. */}
        <div style={{ flexGrow: 1 }} aria-hidden="true" />

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

        <div className="mt-4 flex w-full max-w-[min(92vw,560px)] flex-col gap-3 px-1">
          <Controls />
          <NumberPad />
        </div>

        {/* Bottom spacer < top spacer, so the controls sit lower (closer to
            the old position) while still clearing the screen edge. */}
        <div style={{ flexGrow: 0.55 }} aria-hidden="true" />
      </main>
    </div>
  );
};
