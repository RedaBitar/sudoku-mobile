import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { clearPuzzleFromUrl, readPuzzleFromUrl } from '../engine/share';
import { useTheme } from '../hooks/useTheme';
import { GameScreen } from './GameScreen';
import { DifficultyPicker } from './DifficultyPicker';
import { SettingsSheet } from './SettingsSheet';
import { StatsPanel } from './StatsPanel';
import { WinModal } from './WinModal';
import { ConfirmDialog } from './ConfirmDialog';

export const App = (): JSX.Element => {
  useTheme();

  const hydrated = useGameStore((s) => s.hydrated);
  const hasGame = useGameStore((s) => s.given.length === 81);
  const loadSharedPuzzle = useGameStore((s) => s.loadSharedPuzzle);
  const difficultyOpen = useUIStore((s) => s.difficultyOpen);
  const openDifficulty = useUIStore((s) => s.openDifficulty);
  const anyOverlayOpen = useUIStore((s) => s.anyOverlayOpen);
  const closeTopOverlay = useUIStore((s) => s.closeTopOverlay);

  // A shared puzzle in the URL takes priority over any saved/empty game.
  const sharedHandled = useRef(false);
  useEffect(() => {
    if (!hydrated || sharedHandled.current) return;
    sharedHandled.current = true;
    const shared = readPuzzleFromUrl();
    if (shared) {
      const ok = loadSharedPuzzle(shared);
      clearPuzzleFromUrl();
      if (ok) return;
    }
    // First launch (or a corrupted save): no game to resume, so surface the
    // difficulty picker. It renders non-dismissible in that case.
    if (!hasGame) openDifficulty();
  }, [hydrated, hasGame, loadSharedPuzzle, openDifficulty]);

  // Hardware back / Escape pops the top overlay instead of leaving the app.
  useEffect(() => {
    const onPop = (): void => {
      if (anyOverlayOpen()) {
        closeTopOverlay();
        // Re-arm a history entry so the next back press is also captured.
        window.history.pushState(null, '');
      }
    };
    window.history.pushState(null, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [anyOverlayOpen, closeTopOverlay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && anyOverlayOpen()) closeTopOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anyOverlayOpen, closeTopOverlay]);

  // Lock to portrait where the platform allows it (installed PWA / Android
  // fullscreen). It throws in a plain browser tab and on iOS — harmless; the
  // CSS guard below covers those cases.
  useEffect(() => {
    const so = screen.orientation as unknown as {
      lock?: (o: string) => Promise<void>;
    };
    void so.lock?.('portrait').catch(() => undefined);
  }, []);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {hasGame ? (
        <GameScreen />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p style={{ color: 'var(--muted-text)' }}>
            {hydrated ? 'Choose a difficulty to begin.' : 'Loading…'}
          </p>
        </div>
      )}

      {difficultyOpen && <DifficultyPicker dismissible={hasGame} />}
      <SettingsSheet />
      <StatsPanel />
      <WinModal />
      <ConfirmDialog />

      {/* Portrait-only guard: shown by CSS when a phone is held in landscape
          and the orientation lock above isn't honored (e.g. browser tab). */}
      <div className="rotate-guard" role="alert">
        <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="7"
            y="2"
            width="10"
            height="20"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M3 8a9 9 0 0118 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
        <p>Rotate your device to portrait to play.</p>
      </div>
    </div>
  );
};
