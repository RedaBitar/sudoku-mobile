import { create } from 'zustand';

// Ephemeral view state for overlays. Deliberately NOT persisted: which
// sheet is open should never survive a reload. Overlays are driven through
// the store (no router) so the hardware back button / Escape can pop them.

interface UIStore {
  settingsOpen: boolean;
  statsOpen: boolean;
  difficultyOpen: boolean;
  winOpen: boolean;
  confirm: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: (() => void) | null;
  };
  openSettings: () => void;
  closeSettings: () => void;
  openStats: () => void;
  closeStats: () => void;
  openDifficulty: () => void;
  closeDifficulty: () => void;
  openWin: () => void;
  closeWin: () => void;
  requestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
  /** True when any dismissible overlay is showing (for back/Escape). */
  anyOverlayOpen: () => boolean;
  closeTopOverlay: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  settingsOpen: false,
  statsOpen: false,
  difficultyOpen: false,
  winOpen: false,
  confirm: {
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: null,
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openStats: () => set({ statsOpen: true }),
  closeStats: () => set({ statsOpen: false }),
  openDifficulty: () => set({ difficultyOpen: true }),
  closeDifficulty: () => set({ difficultyOpen: false }),
  openWin: () => set({ winOpen: true }),
  closeWin: () => set({ winOpen: false }),

  requestConfirm: ({ title, message, confirmLabel = 'Confirm', onConfirm }) =>
    set({ confirm: { open: true, title, message, confirmLabel, onConfirm } }),
  closeConfirm: () =>
    set((s) => ({ confirm: { ...s.confirm, open: false, onConfirm: null } })),

  anyOverlayOpen: () => {
    const s = get();
    return (
      s.settingsOpen ||
      s.statsOpen ||
      s.difficultyOpen ||
      s.winOpen ||
      s.confirm.open
    );
  },

  // Close the highest-priority overlay first (confirm sits above sheets).
  closeTopOverlay: () => {
    const s = get();
    if (s.confirm.open) {
      get().closeConfirm();
    } else if (s.winOpen) {
      set({ winOpen: false });
    } else if (s.statsOpen) {
      set({ statsOpen: false });
    } else if (s.settingsOpen) {
      set({ settingsOpen: false });
    } else if (s.difficultyOpen) {
      set({ difficultyOpen: false });
    }
  },
}));
