import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Drives the game clock. A single interval advances elapsed time while the
 * game is active; the store ignores ticks when paused or completed, so the
 * effect can stay mounted for the life of the screen.
 */
export const useTimer = (): void => {
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      tick(now - last);
      last = now;
    }, 1000);

    // Don't accrue time while the tab is hidden.
    const onVisibility = (): void => {
      last = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tick]);
};

export const formatTime = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
