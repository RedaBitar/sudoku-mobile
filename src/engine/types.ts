// Domain types shared across the engine, store, and view layers.
// The engine layer is pure: it imports nothing from React or the store.

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface DifficultyMeta {
  level: Difficulty;
  label: string;
  /** Inclusive clue band [min, max] that biases the carving algorithm. */
  clues: [number, number];
  /** The hardest solving technique a puzzle at this level requires. */
  technique: string;
}

// Levels are graded by the hardest logical technique needed to solve the
// puzzle (see engine/grader.ts), not merely by clue count.
export const DIFFICULTIES: Record<Difficulty, DifficultyMeta> = {
  1: { level: 1, label: 'Gentle', clues: [44, 49], technique: 'Singles only' },
  2: { level: 2, label: 'Casual', clues: [38, 43], technique: 'Locked candidates' },
  3: { level: 3, label: 'Balanced', clues: [32, 37], technique: 'Naked & hidden pairs' },
  4: { level: 4, label: 'Tough', clues: [28, 31], technique: 'Triples & subsets' },
  5: { level: 5, label: 'Brutal', clues: [24, 27], technique: 'X-Wing & beyond' },
};

/** A single cell on the board. */
export interface Cell {
  value: number; // 0 = empty, else 1..9
  given: boolean; // part of the original puzzle (locked)
  candidates: number; // bitmask of notes (only meaningful when value === 0)
}

/** One undoable user action; restores everything it changed. */
export interface MoveDiff {
  changes: Array<{
    index: number;
    prevValue: number;
    prevCandidates: number;
  }>;
  /** The cell the user acted on, restored as the selection on undo. */
  selectedIndex: number | null;
}

export interface GameState {
  puzzleId: string;
  difficulty: Difficulty;
  given: string; // 81 chars, '0' = blank
  solution: string; // 81 chars
  board: Cell[]; // length 81
  selectedIndex: number | null;
  notesMode: boolean;
  undoStack: MoveDiff[]; // capped to UNDO_LIMIT
  startedAt: number; // epoch ms
  elapsedMs: number;
  paused: boolean;
  completed: boolean;
  hintsUsed: number;
  mistakes: number;
}

// --- Worker message contract ---

export interface GenerateRequest {
  type: 'generate';
  difficulty: Difficulty;
  requestId: string;
}

export interface GeneratedResponse {
  type: 'generated';
  requestId: string;
  given: string;
  solution: string;
}

export type WorkerRequest = GenerateRequest;
export type WorkerResponse = GeneratedResponse;
