// Small grid (de)serialization helpers shared by the generator, grader,
// and store. Kept in their own module to avoid a circular import between
// generator.ts and grader.ts.

/** Parse an 81-char grid string into a number[81] (0 = blank). */
export const parseGrid = (s: string): number[] => {
  const grid = new Array<number>(81);
  for (let i = 0; i < 81; i++) grid[i] = s.charCodeAt(i) - 48;
  return grid;
};

/** Serialize a number[81] into an 81-char string ('0' = blank). */
export const gridToString = (grid: number[]): string => grid.join('');

/** Count non-blank clues in a given string. */
export const clueCount = (given: string): number => {
  let n = 0;
  for (let i = 0; i < given.length; i++) {
    if (given[i] !== '0') n++;
  }
  return n;
};
