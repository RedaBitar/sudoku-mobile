import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
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
  const difficultyOpen = useUIStore((s) => s.difficultyOpen);
  const openDifficulty = useUIStore((s) => s.openDifficulty);
  const anyOverlayOpen = useUIStore((s) => s.anyOverlayOpen);
  const closeTopOverlay = useUIStore((s) => s.closeTopOverlay);

  // First launch (or a corrupted save): there is no game to resume, so
  // surface the difficulty picker. It renders non-dismissible in that case.
  useEffect(() => {
    if (hydrated && !hasGame) openDifficulty();
  }, [hydrated, hasGame, openDifficulty]);

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
    </div>
  );
};
