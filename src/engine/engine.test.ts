import { describe, expect, it } from 'vitest';
import { countC, digitsC, hasC, removeC } from './bitmask';
import { peersOf } from './peers';
import { countSolutions, solve } from './solver';
import { generatePuzzle } from './generator';
import { parseGrid } from './grid';
import { gradeDifficulty } from './grader';
import { decodePuzzle } from './share';
import { DIFFICULTIES, type Difficulty } from './types';

// A known puzzle with a single solution (from a standard test set).
const KNOWN_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const KNOWN_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('bitmask helpers', () => {
  it('builds, queries, and clears candidate masks', () => {
    let m = 0;
    m |= 1 << (5 - 1);
    m |= 1 << (9 - 1);
    expect(hasC(m, 5)).toBe(true);
    expect(hasC(m, 9)).toBe(true);
    expect(hasC(m, 1)).toBe(false);
    expect(countC(m)).toBe(2);
    expect(digitsC(m)).toEqual([5, 9]);
    expect(hasC(removeC(m, 5), 5)).toBe(false);
  });
});

describe('peers', () => {
  it('peersOf(i) has exactly 20 entries and excludes i', () => {
    for (let i = 0; i < 81; i++) {
      const peers = peersOf(i);
      expect(peers).toHaveLength(20);
      expect(peers).not.toContain(i);
      expect(new Set(peers).size).toBe(20);
    }
  });
});

describe('solver', () => {
  it('solves a known puzzle correctly', () => {
    const solved = solve(parseGrid(KNOWN_PUZZLE));
    expect(solved).not.toBeNull();
    expect(solved!.join('')).toBe(KNOWN_SOLUTION);
  });

  it('countSolutions returns 1 for a well-formed puzzle', () => {
    expect(countSolutions(parseGrid(KNOWN_PUZZLE), 2)).toBe(1);
  });

  it('countSolutions returns >1 for an under-constrained grid', () => {
    expect(countSolutions(new Array<number>(81).fill(0), 2)).toBeGreaterThan(1);
  });
});

describe('grader', () => {
  it('logically solves a known puzzle and returns a valid grade', () => {
    const grade = gradeDifficulty(KNOWN_PUZZLE);
    expect(grade).not.toBeNull();
    expect(grade).toBeGreaterThanOrEqual(1);
    expect(grade).toBeLessThanOrEqual(5);
  });

  it('rates the empty grid as unsolvable by logic (null)', () => {
    expect(gradeDifficulty('0'.repeat(81))).toBeNull();
  });
});

describe('generator', () => {
  const levels: Difficulty[] = [1, 2, 3, 4, 5];

  for (const level of levels) {
    it(
      `generatePuzzle(${level}) is unique and grades near ${DIFFICULTIES[level].label}`,
      () => {
        const { given, solution } = generatePuzzle(level);
        expect(given).toHaveLength(81);
        expect(solution).toHaveLength(81);

        // Unique solution.
        expect(countSolutions(parseGrid(given), 2)).toBe(1);

        // The given is consistent with the solution.
        for (let i = 0; i < 81; i++) {
          if (given[i] !== '0') expect(given[i]).toBe(solution[i]);
        }

        // Technique grade lands at (or near) the requested level. The top
        // tier accepts subsets-or-harder, since pure X-Wing puzzles are rare,
        // so it's asserted as "hard" rather than within one of level 5.
        const grade = gradeDifficulty(given);
        expect(grade).not.toBeNull();
        if (level === 5) {
          expect(grade as number).toBeGreaterThanOrEqual(3);
        } else {
          expect(Math.abs((grade as number) - level)).toBeLessThanOrEqual(1);
        }
      },
      20000,
    );
  }
});

describe('share', () => {
  it('round-trips a valid puzzle code and rejects malformed ones', () => {
    const { given } = generatePuzzle(1);
    expect(decodePuzzle(given)).toBe(given);
    expect(decodePuzzle('not-a-puzzle')).toBeNull();
    expect(decodePuzzle('123')).toBeNull();
    expect(decodePuzzle(null)).toBeNull();
  });
});
