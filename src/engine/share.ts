// Shareable puzzles.
//
// A puzzle is fully described by its 81-char `given` string (digits 0-9,
// '0' = blank). That's compact and URL-safe as-is, so the share code is just
// the given string, carried in a `?p=` query parameter.

export const PUZZLE_PARAM = 'p';

/** Validate and normalize a shared puzzle code. Returns null if malformed. */
export const decodePuzzle = (code: string | null | undefined): string | null => {
  if (!code) return null;
  const s = code.trim();
  return /^[0-9]{81}$/.test(s) ? s : null;
};

/** Build a shareable URL for a given puzzle, anchored at the app's base. */
export const buildShareUrl = (given: string): string => {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = `?${PUZZLE_PARAM}=${given}`;
  return url.toString();
};

/** Read a shared puzzle from the current URL, if present and valid. */
export const readPuzzleFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return decodePuzzle(params.get(PUZZLE_PARAM));
};

/** Strip the puzzle param from the address bar without reloading. */
export const clearPuzzleFromUrl = (): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState(null, '', url.toString());
};
