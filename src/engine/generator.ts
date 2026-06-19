// Puzzle generation: a random complete grid, carved down to a target
// difficulty. Difficulty is now technique-aware — we carve a unique puzzle
// and grade it by the hardest logical technique required, accepting it only
// when the grade matches the requested level (with a closest-match fallback
// under a wall-clock budget).

import { bit } from './bitmask';
import { boxCells } from './peers';
import { countSolutions, shuffle, solve } from './solver';
import { gradeDifficulty } from './grader';
import { gridToString, parseGrid } from './grid';
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

export interface Puzzle {
  given: string;
  solution: string;
}

/**
 * Carve a unique-solution puzzle from a solved grid, removing clues in
 * random order down toward the difficulty's clue band. Uniqueness is
 * preserved at every step. The clue band biases how aggressively we carve
 * (harder levels tend to need fewer clues), while the grader makes the final
 * difficulty call.
 */
const carvePuzzle = (solution: number[], difficulty: Difficulty): number[] => {
  const [minClues, maxClues] = DIFFICULTIES[difficulty].clues;
  // A random stop within the band gives variety and samples a range of
  // technique grades, so we hit the requested level more often.
  const target = minClues + Math.floor(Math.random() * (maxClues - minClues + 1));
  const puzzle = solution.slice();
  let clues = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= target) break;
    const saved = puzzle[i];
    if (saved === 0) continue;
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = saved; // removal broke uniqueness; restore
  }
  return puzzle;
};

/**
 * Generate a puzzle whose technique grade matches the requested difficulty.
 * Tries fresh grids/carvings until the grade matches or the time budget runs
 * out, keeping the closest grade seen as a fallback so we always return a
 * valid, unique puzzle.
 */
export const generatePuzzle = (difficulty: Difficulty): Puzzle => {
  const start = Date.now();
  const hardDeadline = start + 4500;
  const softDeadline = start + 1500; // good enough once we have a near match
  let best: { given: string; solution: string; grade: number } | null = null;

  while (Date.now() < hardDeadline) {
    const solution = generateFullGrid();
    const given = gridToString(carvePuzzle(solution, difficulty));
    const grade = gradeDifficulty(given);
    if (grade === null) continue; // needs guessing — discard

    // Pure X-Wing puzzles are scarce, so the top tier accepts any puzzle
    // needing subsets-or-harder; every other level wants an exact match.
    const matches = difficulty === 5 ? grade >= 4 : grade === difficulty;
    if (matches) {
      return { given, solution: gridToString(solution) };
    }
    if (
      best === null ||
      Math.abs(grade - difficulty) < Math.abs(best.grade - difficulty)
    ) {
      best = { given, solution: gridToString(solution), grade };
    }
    // Stop hunting for an exact match once we have a within-one candidate and
    // the soft budget has elapsed, so generation stays snappy.
    if (
      best &&
      Math.abs(best.grade - difficulty) <= 1 &&
      Date.now() > softDeadline
    ) {
      return { given: best.given, solution: best.solution };
    }
  }

  if (best) return { given: best.given, solution: best.solution };

  // Ultimate fallback (budget exhausted before any gradable puzzle): a plain
  // unique carve, ungraded.
  const solution = generateFullGrid();
  return {
    given: gridToString(carvePuzzle(solution, difficulty)),
    solution: gridToString(solution),
  };
};

// Re-exported for the store and tests.
export { bit, parseGrid };
export { clueCount } from './grid';
