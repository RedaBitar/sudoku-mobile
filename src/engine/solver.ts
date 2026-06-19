// Backtracking solver and solution counter.
//
// Cells are encoded as a number[81] (0 = empty). Both routines use a
// candidate bitmask per cell and a most-constrained-cell heuristic so
// they stay fast enough to run uniqueness checks during generation.

import { ALL_CANDIDATES, bit, countC } from './bitmask';
import { peersOf } from './peers';

/** Bitmask of digits already used by i's peers (i.e. forbidden at i). */
const usedMask = (grid: number[], i: number): number => {
  let mask = 0;
  for (const p of peersOf(i)) {
    const v = grid[p];
    if (v !== 0) mask |= bit(v);
  }
  return mask;
};

/**
 * Pick the empty cell with the fewest legal candidates (MRV heuristic).
 * Returns -1 when the grid is full, or -2 when some empty cell has zero
 * candidates (a dead end).
 */
const pickCell = (grid: number[]): number => {
  let best = -1;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const legal = ALL_CANDIDATES & ~usedMask(grid, i);
    const c = countC(legal);
    if (c === 0) return -2; // dead end, prune immediately
    if (c < bestCount) {
      bestCount = c;
      best = i;
      if (c === 1) break; // can't do better than a forced cell
    }
  }
  return best;
};

/**
 * Solve in place using backtracking. Optionally randomize the digit order
 * so the same empty grid yields different complete grids each run.
 */
const backtrack = (grid: number[], randomize: boolean): boolean => {
  const cell = pickCell(grid);
  if (cell === -1) return true; // solved
  if (cell === -2) return false; // dead end

  const legal = ALL_CANDIDATES & ~usedMask(grid, cell);
  let order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (randomize) order = shuffle(order);

  for (const d of order) {
    if ((legal & bit(d)) === 0) continue;
    grid[cell] = d;
    if (backtrack(grid, randomize)) return true;
    grid[cell] = 0;
  }
  return false;
};

/** Return a solved copy of the grid, or null if it is unsolvable. */
export const solve = (grid: number[], randomize = false): number[] | null => {
  const work = grid.slice();
  return backtrack(work, randomize) ? work : null;
};

/**
 * Count solutions, stopping as soon as `limit` are found. A well-formed
 * puzzle has exactly 1. Used to verify uniqueness while carving.
 */
export const countSolutions = (grid: number[], limit = 2): number => {
  const work = grid.slice();
  let count = 0;

  const recurse = (): boolean => {
    const cell = pickCell(work);
    if (cell === -1) {
      count++;
      return count >= limit; // signal "stop early"
    }
    if (cell === -2) return false;

    const legal = ALL_CANDIDATES & ~usedMask(work, cell);
    for (let d = 1; d <= 9; d++) {
      if ((legal & bit(d)) === 0) continue;
      work[cell] = d;
      if (recurse()) {
        work[cell] = 0;
        return true; // bubble up the early stop
      }
      work[cell] = 0;
    }
    return false;
  };

  recurse();
  return count;
};

/** Fisher–Yates shuffle (returns the same array, shuffled in place). */
export const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
