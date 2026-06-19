# Sudoku — calm puzzles

A production-quality, installable, offline-capable **mobile-first Progressive
Web App** for playing Sudoku. Everything runs client-side: no backend, no
runtime network calls. Your game auto-saves locally and resumes after you close
the app.

> Built with Vite + React 18 + TypeScript (strict), Tailwind CSS v4, Zustand
> (persist), vite-plugin-pwa (Workbox), and a pure-TypeScript puzzle engine that
> runs generation in a Web Worker.

---

## Run it

```bash
npm install      # install dependencies
npm run dev      # start the dev server (Vite)
npm run build    # type-check (tsc -b) + production build (emits SW + manifest)
npm run preview  # serve the production build locally
npm run test     # run the engine unit tests (Vitest)
```

Targets **Node 18+**. The app is installable from a supported browser and plays
fully offline once loaded.

### Icons

PWA icons are committed under `public/`. To regenerate them (e.g. after a brand
tweak) run:

```bash
npm run gen-icons
```

`scripts/gen-icons.mjs` draws a Sudoku-grid motif and encodes PNGs using only
Node's built-in `zlib` — no native image dependencies and no network access.

---

## Architecture

The code is split into three strictly separated layers. The **engine** is pure
and unit-testable; the **store** orchestrates; the **view** only renders and
dispatches.

```
[Web Worker: generator] --(given, solution)--> [gameStore (Zustand)]
                                                     |
            user taps cell / digit / control ────────┤
                                                     v
                                        store actions (reducer-like)
                                   place / toggleNote / erase / undo / select
                                                     |
                              mutate board · push undo diff · recompute derived
                                                     |
                                        persist middleware (auto) → localStorage
                                                     |
                                          components re-render
```

### `src/engine/` — pure TypeScript, zero React

- **`types.ts`** — domain types and the difficulty table.
- **`bitmask.ts`** — candidate sets encoded as a single integer (bit `d-1` =
  digit `d`). Auto-removal of a candidate is a one-line bitwise op, and the
  persisted board stays tiny.
- **`peers.ts`** — precomputed peer tables. Each cell has exactly 20 peers
  (its row, column, and box, excluding itself), computed once on load.
- **`solver.ts`** — backtracking solver with a most-constrained-cell (MRV)
  heuristic, plus `countSolutions(grid, limit)` that stops early — used to
  verify a puzzle has exactly one solution.
- **`generator.ts`** — builds a random full grid (the three diagonal boxes are
  independent, so they're seeded directly, then backtracking completes the
  rest), then **carves** clues away while `countSolutions === 1`, down to the
  target band. A wall-clock guard prevents pathological looping.
- **`worker.ts`** — Web Worker entry point so generation never blocks the main
  thread; the UI shows a loading state while a puzzle is carved.
- **`engine.test.ts`** — Vitest coverage for the solver, uniqueness counter,
  peer tables, and per-difficulty clue bands.

### `src/store/` — Zustand state

- **`gameStore.ts`** — the current game: board, selection, notes mode, derived
  selectors (`computeRemaining`, `computeConflicts`, `computeWrong`,
  `isBoardComplete`), and a reducer-like set of actions. **Every mutating
  action pushes exactly one `MoveDiff`**, so a single undo reverses the whole
  action — including any candidates auto-removed from peers. Persisted to
  `localStorage` under `sudoku.game.v1` (undo stack capped to 200 diffs).
- **`settingsStore.ts`** — toggles, theme, and per-difficulty stats. Persisted
  under `sudoku.settings.v1`, merged onto defaults so new keys survive upgrades.
- **`uiStore.ts`** — ephemeral overlay state (settings sheet, stats, difficulty
  picker, win modal, confirm dialog). Deliberately **not** persisted, and driven
  without a router so the hardware back button / `Escape` pop overlays.

### `src/components/` — view layer

`App` wires theme, hydration, and back/Escape handling. `GameScreen` composes
`TopBar`, `Board` (+ `Cell`), `Controls`, and `NumberPad`, and owns desktop
keyboard input. Overlays (`DifficultyPicker`, `SettingsSheet`, `StatsPanel`,
`WinModal`, `ConfirmDialog`) share a `Sheet` primitive.

### `src/styles/` — design tokens

`tokens.css` defines the full palette (light + `.dark`) as CSS variables;
`base.css` imports Tailwind v4 and the tokens and holds global resets and
keyframes. The UI consumes the variables directly, so it doesn't look like a
default Tailwind template and theme switching is a single class toggle.

---

## Difficulty model

Difficulty is graded by **clue count** (number of givens). Generation carves a
unique-solution puzzle down into the band for the chosen level:

| Level | Label    | Target clues |
| ----- | -------- | ------------ |
| 1     | Gentle   | 44–49        |
| 2     | Casual   | 38–43        |
| 3     | Balanced | 32–37        |
| 4     | Tough    | 28–31        |
| 5     | Brutal   | 24–27        |

Carving may overshoot slightly below a band's minimum for the hardest levels
(still a valid, unique puzzle); the tests assert the clue count never exceeds
the band's upper bound. Technique-aware grading is a future enhancement, out of
scope here.

---

## Behavior decisions

A few rules were fixed up front (see `// DECISION:` notes in code where
relevant):

- **Auto-removal of candidates uses row + column + box.** Placing a digit
  removes it from the notes of every peer in all three units.
- **Mistake detection is rule-based by default** (a value duplicating a peer).
  A separate, independent **"Highlight wrong entries (compare to solution)"**
  toggle is OFF by default. Both can be on at once.
- **One active game slot.** The current game is saved and resumed on launch;
  starting a new game confirms first if the current one is unfinished.
- **Selection highlight tiers** (high → low): error → selected → same-value →
  peer → default, each gated by its own setting.

---

## Features included

Core: cell-first input, pencil-mark notes in the correct 3×3 layout, remaining
badges on the pad (greyed at 0), single-step undo of compound moves,
rule-based + solution-based mistake detection, peer / same-value highlighting,
auto-removal of candidates, pause-with-blur, a timer, win detection with best
time, full persistence, theme (system/light/dark), and safe-area-aware layout.

Optional extras built:

- **Hint** — fills one correct empty cell (counted in the win summary).
- **Auto-fill notes** — one-tap legal candidates for every empty cell (gated
  behind a settings toggle, default OFF).
- **Mistake counter + optional 3-strike mode** (default OFF).
- **Statistics** — games completed, win rate, best and average time per
  difficulty, with a reset action.
- **Completion sweep** animation and **`prefers-reduced-motion`** support.
- **Desktop keyboard support** — arrows move selection, `1–9` input,
  `Backspace`/`Delete` erase, `N` toggles notes, `Ctrl/Cmd+Z` undo.
- **Haptics** on supported devices (gated by a setting).

### Skipped / future

- Technique-aware difficulty grading.
- Seeded / shareable puzzle URLs (the `given` string makes this straightforward
  to add later).

---

## PWA notes

- `registerType: 'autoUpdate'`, `generateSW` (Workbox). The app shell is
  precached, so it launches and plays with no network.
- Manifest is injected by `vite-plugin-pwa` with 192 / 512 / maskable-512 icons,
  `display: standalone`, `orientation: portrait`, and `categories: ["games"]`.
- `viewport-fit=cover` + `env(safe-area-inset-*)` keep the layout clear of
  notches and home indicators; long-press callouts and selection are disabled on
  the board and pad.
