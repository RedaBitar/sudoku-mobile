import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addC,
  ALL_CANDIDATES,
  hasC,
  removeC,
  bit,
} from '../engine/bitmask';
import {
  boxCells,
  boxOf,
  colCells,
  colOf,
  peersOf,
  rowCells,
  rowOf,
} from '../engine/peers';
import { countSolutions, solve } from '../engine/solver';
import { gradeDifficulty } from '../engine/grader';
import { parseGrid } from '../engine/grid';
import type {
  Cell,
  Difficulty,
  GameState,
  MoveDiff,
  WorkerResponse,
} from '../engine/types';
import { useSettingsStore } from './settingsStore';
import { useUIStore } from './uiStore';

const UNDO_LIMIT = 200;

// --- Web Worker (puzzle generation, off the main thread) ---

let worker: Worker | null = null;
const getWorker = (): Worker | null => {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('../engine/worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'generated') {
        useGameStore.getState().applyGenerated(msg);
      }
    };
  }
  return worker;
};

// --- Board helpers ---

const buildBoard = (given: string): Cell[] => {
  const board: Cell[] = new Array(81);
  for (let i = 0; i < 81; i++) {
    const v = given.charCodeAt(i) - 48;
    board[i] = { value: v, given: v !== 0, candidates: 0 };
  }
  return board;
};

const cloneCell = (c: Cell): Cell => ({ ...c });

/** remaining[d] = 9 minus the number of cells already holding digit d. */
export const computeRemaining = (board: Cell[]): Record<number, number> => {
  const counts: Record<number, number> = {
    1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9,
  };
  for (const cell of board) {
    if (cell.value !== 0) counts[cell.value] -= 1;
  }
  return counts;
};

/** Rule-based conflicts: a filled cell duplicating a peer's value. */
export const computeConflicts = (board: Cell[]): Set<number> => {
  const conflicts = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = board[i].value;
    if (v === 0) continue;
    for (const p of peersOf(i)) {
      if (board[p].value === v) {
        conflicts.add(i);
        break;
      }
    }
  }
  return conflicts;
};

/** Cells whose value disagrees with the known solution. */
export const computeWrong = (board: Cell[], solution: string): Set<number> => {
  const wrong = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = board[i].value;
    if (v !== 0 && v !== solution.charCodeAt(i) - 48) wrong.add(i);
  }
  return wrong;
};

export const isBoardComplete = (board: Cell[], solution: string): boolean => {
  for (let i = 0; i < 81; i++) {
    if (board[i].value !== solution.charCodeAt(i) - 48) return false;
  }
  return true;
};

/** True if every cell of a unit is filled and correct. */
const unitComplete = (
  board: Cell[],
  solution: string,
  cells: number[],
): boolean =>
  cells.every(
    (c) => board[c].value !== 0 && board[c].value === solution.charCodeAt(c) - 48,
  );

/**
 * After placing at `idx`, return the cell indices of any row/column/box that
 * just became fully and correctly filled (for the "unit cleared" celebration).
 */
const newlyClearedCells = (
  board: Cell[],
  solution: string,
  idx: number,
): number[] => {
  const set = new Set<number>();
  const units = [
    rowCells(rowOf(idx)),
    colCells(colOf(idx)),
    boxCells(boxOf(idx)),
  ];
  for (const u of units) {
    if (unitComplete(board, solution, u)) u.forEach((c) => set.add(c));
  }
  return [...set];
};

/** Legal digits at an empty cell given current values (for auto-notes). */
const legalMask = (board: Cell[], i: number): number => {
  let used = 0;
  for (const p of peersOf(i)) {
    const v = board[p].value;
    if (v !== 0) used |= bit(v);
  }
  return ALL_CANDIDATES & ~used;
};

// --- Store shape ---

/** Transient signal consumed by the UI for haptics + animations. Not
 * persisted; `id` changes on every input so effects re-fire. */
export interface Feedback {
  id: number;
  mistake: boolean;
  clearedCells: number[]; // cells of any row/col/box just completed
  solved: boolean;
}

interface GameStore extends GameState {
  generating: boolean;
  pendingRequestId: string | null;
  hydrated: boolean;
  feedback: Feedback | null;

  newGame: (difficulty: Difficulty) => void;
  applyGenerated: (msg: WorkerResponse) => void;
  loadSharedPuzzle: (given: string) => boolean;
  selectCell: (index: number | null) => void;
  inputDigit: (d: number) => void;
  erase: () => void;
  toggleNotesMode: () => void;
  undo: () => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  tick: (deltaMs: number) => void;
  hint: () => void;
  autoFillNotes: () => void;
}

const emptyGame = (): GameState => ({
  puzzleId: '',
  difficulty: 3,
  given: '',
  solution: '',
  board: [],
  selectedIndex: null,
  notesMode: false,
  undoStack: [],
  startedAt: 0,
  elapsedMs: 0,
  paused: false,
  completed: false,
  hintsUsed: 0,
  mistakes: 0,
});

const makeRequestId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Apply a finished move: push the diff (capped) and recompute completion. */
const commitMove = (
  state: GameStore,
  board: Cell[],
  diff: MoveDiff,
): Partial<GameStore> => {
  const undoStack = [...state.undoStack, diff];
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();

  const nowComplete =
    !state.completed && isBoardComplete(board, state.solution);

  if (nowComplete) {
    // Side effects: stop the clock, record stats, raise the win modal.
    useSettingsStore
      .getState()
      .recordCompletion(state.difficulty, state.elapsedMs);
    queueMicrotask(() => useUIStore.getState().openWin());
  }

  return {
    board,
    undoStack,
    completed: state.completed || nowComplete,
  };
};

/** Build the next feedback signal (monotonic id so the UI re-reacts). */
const bumpFeedback = (
  state: GameStore,
  partial: Omit<Feedback, 'id'>,
): Feedback => ({ id: (state.feedback?.id ?? 0) + 1, ...partial });

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...emptyGame(),
      generating: false,
      pendingRequestId: null,
      hydrated: false,
      feedback: null,

      newGame: (difficulty) => {
        const requestId = makeRequestId();
        set({
          generating: true,
          pendingRequestId: requestId,
          difficulty,
        });
        const w = getWorker();
        if (w) {
          w.postMessage({ type: 'generate', difficulty, requestId });
        } else {
          // Fallback for environments without Worker: generate inline.
          void import('../engine/generator').then(({ generatePuzzle }) => {
            const { given, solution } = generatePuzzle(difficulty);
            get().applyGenerated({
              type: 'generated',
              requestId,
              given,
              solution,
            });
          });
        }
      },

      applyGenerated: (msg) => {
        // Ignore stale results from superseded requests.
        if (msg.requestId !== get().pendingRequestId) return;
        useSettingsStore.getState().recordGameStart(get().difficulty);
        set({
          puzzleId: msg.requestId,
          given: msg.given,
          solution: msg.solution,
          board: buildBoard(msg.given),
          selectedIndex: null,
          notesMode: false,
          undoStack: [],
          startedAt: Date.now(),
          elapsedMs: 0,
          paused: false,
          completed: false,
          hintsUsed: 0,
          mistakes: 0,
          generating: false,
          pendingRequestId: null,
        });
      },

      // Load a puzzle shared via URL/code. Validates uniqueness, derives the
      // solution and a technique grade, then starts a fresh game from it.
      loadSharedPuzzle: (given) => {
        if (!/^[0-9]{81}$/.test(given)) return false;
        const grid = parseGrid(given);
        if (countSolutions(grid, 2) !== 1) return false;
        const solved = solve(grid);
        if (!solved) return false;

        const difficulty = (gradeDifficulty(given) ?? 3) as Difficulty;
        useSettingsStore.getState().recordGameStart(difficulty);
        set({
          puzzleId: makeRequestId(),
          difficulty,
          given,
          solution: solved.join(''),
          board: buildBoard(given),
          selectedIndex: null,
          notesMode: false,
          undoStack: [],
          startedAt: Date.now(),
          elapsedMs: 0,
          paused: false,
          completed: false,
          hintsUsed: 0,
          mistakes: 0,
          generating: false,
          pendingRequestId: null,
        });
        return true;
      },

      selectCell: (index) => set({ selectedIndex: index }),

      inputDigit: (d) => {
        const state = get();
        const idx = state.selectedIndex;
        if (idx === null || state.completed || state.paused) return;
        const cell = state.board[idx];
        if (cell.given) return;

        const settings = useSettingsStore.getState().settings;

        // --- Notes mode: toggle a pencil mark on an empty cell ---
        if (state.notesMode) {
          if (cell.value !== 0) return;
          const next = cloneCell(cell);
          next.candidates = hasC(cell.candidates, d)
            ? removeC(cell.candidates, d)
            : addC(cell.candidates, d);
          const board = state.board.slice();
          board[idx] = next;
          const diff: MoveDiff = {
            selectedIndex: idx,
            changes: [
              {
                index: idx,
                prevValue: cell.value,
                prevCandidates: cell.candidates,
              },
            ],
          };
          set({
            ...commitMove(state, board, diff),
            feedback: bumpFeedback(state, {
              mistake: false,
              clearedCells: [],
              solved: false,
            }),
          });
          return;
        }

        // --- Value mode ---
        const board = state.board.slice();
        const changes: MoveDiff['changes'] = [];

        if (cell.value === d) {
          // Toggle the value off.
          changes.push({
            index: idx,
            prevValue: cell.value,
            prevCandidates: cell.candidates,
          });
          board[idx] = { ...cell, value: 0 };
          const diff: MoveDiff = { selectedIndex: idx, changes };
          set({
            ...commitMove(state, board, diff),
            feedback: bumpFeedback(state, {
              mistake: false,
              clearedCells: [],
              solved: false,
            }),
          });
          return;
        }

        const remaining = computeRemaining(state.board);
        if (remaining[d] <= 0) return; // pad button is disabled

        // Place the value and drop its own notes.
        changes.push({
          index: idx,
          prevValue: cell.value,
          prevCandidates: cell.candidates,
        });
        board[idx] = { value: d, given: false, candidates: 0 };

        // Auto-remove this digit as a candidate from every peer.
        if (settings.autoRemoveCandidates) {
          for (const p of peersOf(idx)) {
            const peer = board[p];
            if (peer.value === 0 && hasC(peer.candidates, d)) {
              changes.push({
                index: p,
                prevValue: peer.value,
                prevCandidates: peer.candidates,
              });
              board[p] = { ...peer, candidates: removeC(peer.candidates, d) };
            }
          }
        }

        // Count a mistake when the entry contradicts the solution.
        const isWrong = d !== state.solution.charCodeAt(idx) - 48;
        const mistakes = state.mistakes + (isWrong ? 1 : 0);

        const diff: MoveDiff = { selectedIndex: idx, changes };
        const committed = commitMove(state, board, diff);
        const solved = committed.completed === true;
        const clearedCells = isWrong
          ? []
          : newlyClearedCells(board, state.solution, idx);
        set({
          ...committed,
          mistakes,
          feedback: bumpFeedback(state, {
            mistake: isWrong,
            clearedCells,
            solved,
          }),
        });

        // Optional 3-strike mode: end the game on the third mistake.
        if (settings.strikeMode && mistakes >= 3 && !committed.completed) {
          set({ paused: true });
          queueMicrotask(() => useUIStore.getState().openWin());
        }
      },

      erase: () => {
        const state = get();
        const idx = state.selectedIndex;
        if (idx === null || state.completed || state.paused) return;
        const cell = state.board[idx];
        if (cell.given) return;
        if (cell.value === 0 && cell.candidates === 0) return; // nothing to do

        const board = state.board.slice();
        board[idx] = { ...cell, value: 0, candidates: 0 };
        const diff: MoveDiff = {
          selectedIndex: idx,
          changes: [
            { index: idx, prevValue: cell.value, prevCandidates: cell.candidates },
          ],
        };
        set(commitMove(state, board, diff));
      },

      toggleNotesMode: () => set((s) => ({ notesMode: !s.notesMode })),

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        const diff = state.undoStack[state.undoStack.length - 1];
        const board = state.board.slice();
        for (const ch of diff.changes) {
          board[ch.index] = {
            ...board[ch.index],
            value: ch.prevValue,
            candidates: ch.prevCandidates,
          };
        }
        set({
          board,
          undoStack: state.undoStack.slice(0, -1),
          selectedIndex: diff.selectedIndex,
          completed: isBoardComplete(board, state.solution),
        });
      },

      restart: () => {
        const state = get();
        if (!state.given) return;
        set({
          board: buildBoard(state.given),
          selectedIndex: null,
          notesMode: false,
          undoStack: [],
          startedAt: Date.now(),
          elapsedMs: 0,
          paused: false,
          completed: false,
          hintsUsed: 0,
          mistakes: 0,
        });
      },

      pause: () => {
        const s = get();
        if (!s.completed) set({ paused: true });
      },
      resume: () => set({ paused: false }),

      tick: (deltaMs) => {
        const s = get();
        if (s.paused || s.completed || !s.given) return;
        set({ elapsedMs: s.elapsedMs + deltaMs });
      },

      hint: () => {
        const state = get();
        if (state.completed || state.paused || !state.given) return;
        // Fill one correct empty, non-given cell (styled as a user entry).
        const empties: number[] = [];
        for (let i = 0; i < 81; i++) {
          if (state.board[i].value === 0) empties.push(i);
        }
        if (empties.length === 0) return;
        const idx = empties[Math.floor(Math.random() * empties.length)];
        const correct = state.solution.charCodeAt(idx) - 48;
        const cell = state.board[idx];

        const board = state.board.slice();
        const changes: MoveDiff['changes'] = [
          { index: idx, prevValue: cell.value, prevCandidates: cell.candidates },
        ];
        board[idx] = { value: correct, given: false, candidates: 0 };

        const settings = useSettingsStore.getState().settings;
        if (settings.autoRemoveCandidates) {
          for (const p of peersOf(idx)) {
            const peer = board[p];
            if (peer.value === 0 && hasC(peer.candidates, correct)) {
              changes.push({
                index: p,
                prevValue: peer.value,
                prevCandidates: peer.candidates,
              });
              board[p] = {
                ...peer,
                candidates: removeC(peer.candidates, correct),
              };
            }
          }
        }

        const diff: MoveDiff = { selectedIndex: idx, changes };
        const committed = commitMove(state, board, diff);
        set({
          ...committed,
          selectedIndex: idx,
          hintsUsed: state.hintsUsed + 1,
          feedback: bumpFeedback(state, {
            mistake: false,
            clearedCells: newlyClearedCells(board, state.solution, idx),
            solved: committed.completed === true,
          }),
        });
      },

      autoFillNotes: () => {
        const state = get();
        if (state.completed || state.paused || !state.given) return;
        const board = state.board.slice();
        const changes: MoveDiff['changes'] = [];
        for (let i = 0; i < 81; i++) {
          const cell = board[i];
          if (cell.value !== 0) continue;
          const mask = legalMask(board, i);
          if (mask !== cell.candidates) {
            changes.push({
              index: i,
              prevValue: cell.value,
              prevCandidates: cell.candidates,
            });
            board[i] = { ...cell, candidates: mask };
          }
        }
        if (changes.length === 0) return;
        const diff: MoveDiff = { selectedIndex: state.selectedIndex, changes };
        const undoStack = [...state.undoStack, diff];
        if (undoStack.length > UNDO_LIMIT) undoStack.shift();
        set({ board, undoStack });
      },
    }),
    {
      name: 'sudoku.game.v1',
      version: 1,
      // Persist the playable game (incl. undo) but never the transient
      // generating flags. Cap the undo stack so storage stays small.
      partialize: (state) => ({
        puzzleId: state.puzzleId,
        difficulty: state.difficulty,
        given: state.given,
        solution: state.solution,
        board: state.board,
        selectedIndex: state.selectedIndex,
        notesMode: state.notesMode,
        undoStack: state.undoStack.slice(-UNDO_LIMIT),
        startedAt: state.startedAt,
        elapsedMs: state.elapsedMs,
        paused: state.paused,
        completed: state.completed,
        hintsUsed: state.hintsUsed,
        mistakes: state.mistakes,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydration done so the app can decide picker-vs-resume.
        if (state) state.hydrated = true;
        else useGameStore.setState({ hydrated: true });
      },
      // If a stored save is malformed, fall back to a fresh empty game.
      merge: (persisted, current) => {
        try {
          const p = persisted as Partial<GameState> | undefined;
          if (
            !p ||
            !Array.isArray(p.board) ||
            p.board.length !== 81 ||
            typeof p.solution !== 'string' ||
            p.solution.length !== 81
          ) {
            return current;
          }
          return { ...current, ...p };
        } catch {
          return current;
        }
      },
    },
  ),
);

// Re-export unit helpers for components.
export { rowOf, colOf, boxOf };
