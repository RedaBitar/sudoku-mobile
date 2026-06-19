import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../engine/types';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  mistakeDetection: boolean; // rule-based conflict highlighting
  compareToSolution: boolean; // highlight wrong-vs-solution
  peerHighlight: boolean; // row/col/box of selected cell
  sameValueHighlight: boolean; // same digit across the grid
  autoRemoveCandidates: boolean; // strip placed digit from peer notes
  greyCompletedDigits: boolean; // pad button greyed at 0 remaining
  haptics: boolean;
  showTimer: boolean;
  autoFillNotesEnabled: boolean; // expose the "fill all notes" control
  strikeMode: boolean; // end the game at 3 mistakes
  theme: ThemeMode;
}

export interface DifficultyStats {
  played: number;
  completed: number;
  bestMs: number | null;
  totalMs: number; // for average (completed games only)
}

export type StatsByDifficulty = Record<Difficulty, DifficultyStats>;

const emptyStats = (): DifficultyStats => ({
  played: 0,
  completed: 0,
  bestMs: null,
  totalMs: 0,
});

const freshStats = (): StatsByDifficulty => ({
  1: emptyStats(),
  2: emptyStats(),
  3: emptyStats(),
  4: emptyStats(),
  5: emptyStats(),
});

export const DEFAULT_SETTINGS: Settings = {
  mistakeDetection: true,
  compareToSolution: false,
  peerHighlight: true,
  sameValueHighlight: true,
  autoRemoveCandidates: true,
  greyCompletedDigits: true,
  haptics: true,
  showTimer: true,
  autoFillNotesEnabled: false,
  strikeMode: false,
  theme: 'system',
};

interface SettingsStore {
  settings: Settings;
  stats: StatsByDifficulty;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  recordGameStart: (difficulty: Difficulty) => void;
  recordCompletion: (difficulty: Difficulty, elapsedMs: number) => void;
  resetStats: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      stats: freshStats(),

      setSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),

      recordGameStart: (difficulty) =>
        set((state) => {
          const s = state.stats[difficulty];
          return {
            stats: {
              ...state.stats,
              [difficulty]: { ...s, played: s.played + 1 },
            },
          };
        }),

      recordCompletion: (difficulty, elapsedMs) =>
        set((state) => {
          const s = state.stats[difficulty];
          const bestMs =
            s.bestMs === null ? elapsedMs : Math.min(s.bestMs, elapsedMs);
          return {
            stats: {
              ...state.stats,
              [difficulty]: {
                ...s,
                completed: s.completed + 1,
                bestMs,
                totalMs: s.totalMs + elapsedMs,
              },
            },
          };
        }),

      resetStats: () => set({ stats: freshStats() }),
    }),
    {
      name: 'sudoku.settings.v1',
      version: 1,
      // Merge persisted partials onto current defaults so newly-added
      // settings keys always have a sensible value after an upgrade.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsStore>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          stats: { ...freshStats(), ...(p.stats ?? {}) },
        };
      },
    },
  ),
);
