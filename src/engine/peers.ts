// Precomputed peer-index tables.
//
// Two cells are "peers" if they share a row, a column, or a 3x3 box.
// Every cell has exactly 20 peers. These tables are computed once on
// module load and reused for solving, generation, and conflict checks.

export const rowOf = (i: number): number => Math.floor(i / 9);
export const colOf = (i: number): number => i % 9;
export const boxOf = (i: number): number =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// Index lists grouped by unit.
const rows: number[][] = Array.from({ length: 9 }, () => []);
const cols: number[][] = Array.from({ length: 9 }, () => []);
const boxes: number[][] = Array.from({ length: 9 }, () => []);

for (let i = 0; i < 81; i++) {
  rows[rowOf(i)].push(i);
  cols[colOf(i)].push(i);
  boxes[boxOf(i)].push(i);
}

// peers[i] = sorted unique list of cells sharing i's row/col/box (excluding i).
const peers: number[][] = Array.from({ length: 81 }, (_unused, i) => {
  const set = new Set<number>();
  for (const j of rows[rowOf(i)]) set.add(j);
  for (const j of cols[colOf(i)]) set.add(j);
  for (const j of boxes[boxOf(i)]) set.add(j);
  set.delete(i);
  return [...set].sort((a, b) => a - b);
});

export const peersOf = (i: number): number[] => peers[i];

export const rowCells = (r: number): number[] => rows[r];
export const colCells = (c: number): number[] => cols[c];
export const boxCells = (b: number): number[] => boxes[b];
