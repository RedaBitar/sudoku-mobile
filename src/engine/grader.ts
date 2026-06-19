// Technique-aware difficulty grader.
//
// Rather than judging a puzzle by how many clues it shows, this module
// solves it the way a person would — applying logical techniques from
// easiest to hardest — and reports the HARDEST technique required. That
// rating is what drives the difficulty levels:
//
//   1 Gentle    solved with singles alone (naked + hidden)
//   2 Casual    also needs locked candidates (pointing / claiming)
//   3 Balanced  also needs naked or hidden pairs
//   4 Tough     also needs naked or hidden triples
//   5 Brutal    also needs an X-Wing
//
// If none of the implemented techniques crack it, the puzzle requires
// guessing and gradeDifficulty returns null (the generator rejects it).

import { ALL_CANDIDATES, bit, countC, digitsC, hasC } from './bitmask';
import {
  boxCells,
  boxOf,
  colCells,
  colOf,
  peersOf,
  rowCells,
  rowOf,
} from './peers';
import { parseGrid } from './grid';

export type DifficultyGrade = 1 | 2 | 3 | 4 | 5;

interface State {
  values: number[];
  cands: number[]; // candidate bitmask per empty cell
}

// Every row, column, and box as a flat list of units.
const ALL_UNITS: number[][] = [];
for (let i = 0; i < 9; i++) {
  ALL_UNITS.push(rowCells(i), colCells(i), boxCells(i));
}

const computeCandidates = (values: number[]): number[] => {
  const cands = new Array<number>(81).fill(0);
  for (let i = 0; i < 81; i++) {
    if (values[i] !== 0) continue;
    let used = 0;
    for (const p of peersOf(i)) {
      const v = values[p];
      if (v !== 0) used |= bit(v);
    }
    cands[i] = ALL_CANDIDATES & ~used;
  }
  return cands;
};

const place = (s: State, i: number, d: number): void => {
  s.values[i] = d;
  s.cands[i] = 0;
  const mask = ~bit(d);
  for (const p of peersOf(i)) {
    if (s.values[p] === 0) s.cands[p] &= mask;
  }
};

const isSolved = (s: State): boolean => {
  for (let i = 0; i < 81; i++) if (s.values[i] === 0) return false;
  return true;
};

// All size-k combinations of an array (k is small: 2 or 3).
const combinations = <T>(arr: T[], k: number): T[][] => {
  const out: T[][] = [];
  const pick = (start: number, combo: T[]): void => {
    if (combo.length === k) {
      out.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      pick(i + 1, combo);
      combo.pop();
    }
  };
  pick(0, []);
  return out;
};

// --- Techniques (each returns true if it changed the grid) ---

const nakedSingle = (s: State): boolean => {
  for (let i = 0; i < 81; i++) {
    if (s.values[i] === 0 && countC(s.cands[i]) === 1) {
      place(s, i, digitsC(s.cands[i])[0]);
      return true;
    }
  }
  return false;
};

const hiddenSingle = (s: State): boolean => {
  for (const unit of ALL_UNITS) {
    for (let d = 1; d <= 9; d++) {
      let spot = -1;
      let count = 0;
      for (const c of unit) {
        if (s.values[c] === 0 && hasC(s.cands[c], d)) {
          count++;
          spot = c;
          if (count > 1) break;
        }
      }
      if (count === 1) {
        place(s, spot, d);
        return true;
      }
    }
  }
  return false;
};

const lockedCandidates = (s: State): boolean => {
  // Pointing: candidates for d in a box confined to one line -> clear the
  // rest of that line.
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const spots = boxCells(b).filter(
        (c) => s.values[c] === 0 && hasC(s.cands[c], d),
      );
      if (spots.length < 2) continue;
      const rows = new Set(spots.map(rowOf));
      const cols = new Set(spots.map(colOf));
      if (rows.size === 1) {
        const r = rowOf(spots[0]);
        let changed = false;
        for (const c of rowCells(r)) {
          if (boxOf(c) !== b && s.values[c] === 0 && hasC(s.cands[c], d)) {
            s.cands[c] &= ~bit(d);
            changed = true;
          }
        }
        if (changed) return true;
      }
      if (cols.size === 1) {
        const col = colOf(spots[0]);
        let changed = false;
        for (const c of colCells(col)) {
          if (boxOf(c) !== b && s.values[c] === 0 && hasC(s.cands[c], d)) {
            s.cands[c] &= ~bit(d);
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }

  // Claiming: candidates for d in a line confined to one box -> clear the
  // rest of that box.
  for (let u = 0; u < 9; u++) {
    for (const line of [rowCells(u), colCells(u)]) {
      for (let d = 1; d <= 9; d++) {
        const spots = line.filter(
          (c) => s.values[c] === 0 && hasC(s.cands[c], d),
        );
        if (spots.length < 2) continue;
        const boxes = new Set(spots.map(boxOf));
        if (boxes.size === 1) {
          const b = boxOf(spots[0]);
          const inLine = new Set(line);
          let changed = false;
          for (const c of boxCells(b)) {
            if (!inLine.has(c) && s.values[c] === 0 && hasC(s.cands[c], d)) {
              s.cands[c] &= ~bit(d);
              changed = true;
            }
          }
          if (changed) return true;
        }
      }
    }
  }
  return false;
};

const nakedSubset = (s: State, size: number): boolean => {
  for (const unit of ALL_UNITS) {
    const empties = unit.filter(
      (c) => s.values[c] === 0 && countC(s.cands[c]) <= size,
    );
    if (empties.length <= size) continue;
    for (const combo of combinations(empties, size)) {
      let union = 0;
      for (const c of combo) union |= s.cands[c];
      if (countC(union) !== size) continue;
      const inCombo = new Set(combo);
      let changed = false;
      for (const c of unit) {
        if (s.values[c] !== 0 || inCombo.has(c)) continue;
        if ((s.cands[c] & union) !== 0) {
          s.cands[c] &= ~union;
          changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
};

const hiddenSubset = (s: State, size: number): boolean => {
  for (const unit of ALL_UNITS) {
    const digitsInUnit: number[] = [];
    for (let d = 1; d <= 9; d++) {
      let count = 0;
      for (const c of unit) {
        if (s.values[c] === 0 && hasC(s.cands[c], d)) count++;
      }
      if (count >= 2 && count <= size) digitsInUnit.push(d);
    }
    if (digitsInUnit.length < size) continue;
    for (const combo of combinations(digitsInUnit, size)) {
      const cellSet = new Set<number>();
      for (const d of combo) {
        for (const c of unit) {
          if (s.values[c] === 0 && hasC(s.cands[c], d)) cellSet.add(c);
        }
      }
      if (cellSet.size !== size) continue;
      const mask = combo.reduce((m, d) => m | bit(d), 0);
      let changed = false;
      for (const c of cellSet) {
        if ((s.cands[c] & ~mask) !== 0) {
          s.cands[c] &= mask;
          changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
};

const xWing = (s: State): boolean => {
  for (let d = 1; d <= 9; d++) {
    // Row-based X-Wing.
    const rowCols: number[][] = [];
    for (let r = 0; r < 9; r++) {
      rowCols[r] = rowCells(r)
        .filter((c) => s.values[c] === 0 && hasC(s.cands[c], d))
        .map(colOf);
    }
    for (let r1 = 0; r1 < 9; r1++) {
      if (rowCols[r1].length !== 2) continue;
      for (let r2 = r1 + 1; r2 < 9; r2++) {
        if (rowCols[r2].length !== 2) continue;
        if (rowCols[r1][0] !== rowCols[r2][0] || rowCols[r1][1] !== rowCols[r2][1])
          continue;
        let changed = false;
        for (const cc of rowCols[r1]) {
          for (let r = 0; r < 9; r++) {
            if (r === r1 || r === r2) continue;
            const idx = r * 9 + cc;
            if (s.values[idx] === 0 && hasC(s.cands[idx], d)) {
              s.cands[idx] &= ~bit(d);
              changed = true;
            }
          }
        }
        if (changed) return true;
      }
    }

    // Column-based X-Wing.
    const colRows: number[][] = [];
    for (let c = 0; c < 9; c++) {
      colRows[c] = colCells(c)
        .filter((cell) => s.values[cell] === 0 && hasC(s.cands[cell], d))
        .map(rowOf);
    }
    for (let c1 = 0; c1 < 9; c1++) {
      if (colRows[c1].length !== 2) continue;
      for (let c2 = c1 + 1; c2 < 9; c2++) {
        if (colRows[c2].length !== 2) continue;
        if (colRows[c1][0] !== colRows[c2][0] || colRows[c1][1] !== colRows[c2][1])
          continue;
        let changed = false;
        for (const rr of colRows[c1]) {
          for (let c = 0; c < 9; c++) {
            if (c === c1 || c === c2) continue;
            const idx = rr * 9 + c;
            if (s.values[idx] === 0 && hasC(s.cands[idx], d)) {
              s.cands[idx] &= ~bit(d);
              changed = true;
            }
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
};

const clamp = (h: number): DifficultyGrade =>
  Math.min(5, Math.max(1, h)) as DifficultyGrade;

/**
 * Grade a puzzle by the hardest logical technique needed to solve it.
 * Returns null if the puzzle cannot be solved without guessing.
 */
export const gradeDifficulty = (given: string): DifficultyGrade | null => {
  const s: State = {
    values: parseGrid(given),
    cands: computeCandidates(parseGrid(given)),
  };
  let hardest = 1;

  for (let guard = 0; guard < 1000; guard++) {
    if (isSolved(s)) return clamp(hardest);
    if (nakedSingle(s) || hiddenSingle(s)) {
      hardest = Math.max(hardest, 1);
    } else if (lockedCandidates(s)) {
      hardest = Math.max(hardest, 2);
    } else if (nakedSubset(s, 2) || hiddenSubset(s, 2)) {
      hardest = Math.max(hardest, 3);
    } else if (nakedSubset(s, 3) || hiddenSubset(s, 3)) {
      hardest = Math.max(hardest, 4);
    } else if (xWing(s)) {
      hardest = Math.max(hardest, 5);
    } else {
      break; // no implemented technique applies -> needs guessing
    }
  }

  return isSolved(s) ? clamp(hardest) : null;
};
