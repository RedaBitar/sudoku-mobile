// Puzzle generation: a random complete grid, then symmetric-free carving
// down to a target clue band with a guaranteed-unique solution.

import { bit } from './bitmask';
import { boxCells } from './peers';
import { countSolutions, shuffle, solve } from './solver';
import { DIFFICULTIES, type Difficulty } from './types';

/**
 * Produce a random, complete, valid solution grid.
 *
 * The three diagonal boxes (0, 4, 8) share no row, column, or box with one
 * another, so they can be filled with independent random permutations
 * without any constraint checking. Backtracking then completes the rest.
 */
export const generateFullGrid = (): number[] => {
  const grid = new Array<number>(81).fill(0);

  for (const b of [0, 4, 8]) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    boxCells(b).forEach((cell, k) => {
      grid[cell] = digits[k];
    });
  }

  const solved = solve(grid, true);
  // The diagonal seed is always completable, but fall back defensively.
  return solved ?? buildFallbackGrid();
};

/** Deterministic valid grid; only used if randomized solving ever fails. */
const buildFallbackGrid = (): number[] => {
  const grid = new Array<number>(81);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      grid[r * 9 + c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
    }
  }
  return grid;
};

const gridToString = (grid: number[]): string => grid.join('');

export interface Puzzle {
  given: string;
  solution: string;
}

/**
 * Generate a puzzle for the given difficulty.
 *
 * Carving: copy the solution, then visit cells in random order and try to
 * clear each one. A clear is only kept if the puzzle still has exactly one
 * solution. We stop once the clue count reaches the difficulty's target
 * band, or once we run out of removable cells.
 *
 * A wall-clock guard prevents pathological looping: if carving stalls we
 * accept the best (lowest-clue) unique puzzle reached so far.
 */
export const generatePuzzle = (difficulty: Difficulty): Puzzle => {
  const meta = DIFFICULTIES[difficulty];
  const [minClues, maxClues] = meta.clues;
  const solution = generateFullGrid();

  const deadline = Date.now() + 4000; // generous per-puzzle budget

  let best: number[] | null = null;
  let bestClues = 82;

  // A few independent carving attempts; keep the one closest to the band.
  for (let attempt = 0; attempt < 12 && Date.now() < deadline; attempt++) {
    const puzzle = solution.slice();
    let clues = 81;
    const order = shuffle([...Array(81).keys()]);

    for (const i of order) {
      if (clues <= maxClues) break; // reached the band's upper edge
      if (Date.now() > deadline) break;
      const saved = puzzle[i];
      if (saved === 0) continue;
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) === 1) {
        clues--;
      } else {
        puzzle[i] = saved; // removal broke uniqueness; restore
      }
    }

    if (clues < bestClues) {
      bestClues = clues;
      best = puzzle.slice();
    }

    // Good enough: inside (or below) the target band.
    if (clues >= minClues && clues <= maxClues) {
      return { given: gridToString(puzzle), solution: gridToString(solution) };
    }
    if (clues < minClues) {
      // Below the band can still happen for hard levels; accept it.
      return { given: gridToString(puzzle), solution: gridToString(solution) };
    }
  }

  // Stalled: return the most-carved unique puzzle we found.
  const fallback = best ?? solution.slice();
  return { given: gridToString(fallback), solution: gridToString(solution) };
};

/** Parse an 81-char grid string into a number[81]. */
export const parseGrid = (s: string): number[] => {
  const grid = new Array<number>(81);
  for (let i = 0; i < 81; i++) grid[i] = s.charCodeAt(i) - 48;
  return grid;
};

/** Count non-blank clues in a given string. */
export const clueCount = (given: string): number => {
  let n = 0;
  for (let i = 0; i < given.length; i++) {
    if (given[i] !== '0') n++;
  }
  return n;
};

// Re-exported so the worker and tests can reach digit bits if needed.
export { bit };
