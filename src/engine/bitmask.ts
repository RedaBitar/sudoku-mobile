// Candidate set helpers.
//
// A cell's pencil-mark candidates are stored as a single integer where
// bit (d-1) represents digit d (1..9). This makes the most common
// operation — "remove digit d as a candidate from a peer" — a single
// bitwise instruction, and keeps the persisted board tiny.

/** Digit 1..9 -> its bit. */
export const bit = (d: number): number => 1 << (d - 1);

/** All nine candidates set: 0b1_1111_1111 === 511. */
export const ALL_CANDIDATES = 511;

export const hasC = (mask: number, d: number): boolean => (mask & bit(d)) !== 0;

export const addC = (mask: number, d: number): number => mask | bit(d);

export const removeC = (mask: number, d: number): number => mask & ~bit(d);

/** Population count — how many candidates are set. */
export const countC = (mask: number): number => {
  let n = 0;
  let m = mask;
  while (m) {
    m &= m - 1; // clear the lowest set bit
    n++;
  }
  return n;
};

/** Expand a mask into the ascending list of digits it contains. */
export const digitsC = (mask: number): number[] => {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) {
    if (hasC(mask, d)) out.push(d);
  }
  return out;
};
