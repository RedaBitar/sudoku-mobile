import {
  useCallback,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react';
import {
  computeConflicts,
  computeWrong,
  useGameStore,
} from '../store/gameStore';
import { peersOf } from '../engine/peers';
import { useSettingsStore } from '../store/settingsStore';
import { Cell } from './Cell';

/** Resolve the cell index under a pointer position, or null. */
const cellIndexAt = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y);
  const host = el?.closest('[data-cell]');
  if (!host) return null;
  const raw = host.getAttribute('data-cell');
  return raw === null ? null : Number(raw);
};

const usePrefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Board = (): JSX.Element => {
  const board = useGameStore((s) => s.board);
  const selectedIndex = useGameStore((s) => s.selectedIndex);
  const paused = useGameStore((s) => s.paused);
  const selectCell = useGameStore((s) => s.selectCell);
  const resume = useGameStore((s) => s.resume);

  const settings = useSettingsStore((s) => s.settings);
  const reducedMotion = usePrefersReducedMotion();

  // Error cells: union of rule-based conflicts and (optionally) wrong-vs-
  // solution. Each tier is gated by its own setting.
  const errorSet = useMemo(() => {
    const set = new Set<number>();
    if (settings.mistakeDetection) {
      for (const i of computeConflicts(board)) set.add(i);
    }
    if (settings.compareToSolution) {
      const solution = useGameStore.getState().solution;
      for (const i of computeWrong(board, solution)) set.add(i);
    }
    return set;
  }, [board, settings.mistakeDetection, settings.compareToSolution]);

  // Peers (row/col/box) of the current selection.
  const peerSet = useMemo(() => {
    if (selectedIndex === null || !settings.peerHighlight) return null;
    return new Set(peersOf(selectedIndex));
  }, [selectedIndex, settings.peerHighlight]);

  const selectedValue =
    selectedIndex !== null ? board[selectedIndex]?.value ?? 0 : 0;

  const emphasizeCandidate =
    settings.sameValueHighlight && selectedValue !== 0 ? selectedValue : 0;

  // Drag across the board to sweep the selection from cell to cell, like
  // hovering a mouse. Works for touch and mouse via pointer capture +
  // elementFromPoint, so it never gets "stuck" on the starting cell.
  const dragging = useRef(false);
  const lastIndex = useRef<number | null>(null);
  // True once a drag has moved to a different cell. Used to swallow the
  // trailing click — which the browser dispatches on the cell where the
  // gesture STARTED — so the selection doesn't snap back to it on release.
  const didDrag = useRef(false);

  const selectAtPoint = useCallback(
    (x: number, y: number): void => {
      const i = cellIndexAt(x, y);
      if (i !== null && i !== lastIndex.current) {
        if (lastIndex.current !== null) didDrag.current = true;
        lastIndex.current = i;
        selectCell(i);
      }
    },
    [selectCell],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (paused) return;
      dragging.current = true;
      didDrag.current = false;
      lastIndex.current = null;
      e.currentTarget.setPointerCapture(e.pointerId);
      selectAtPoint(e.clientX, e.clientY);
    },
    [paused, selectAtPoint],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      selectAtPoint(e.clientX, e.clientY);
    },
    [selectAtPoint],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
    lastIndex.current = null;
  }, []);

  // Cancel the post-drag click (capture phase, before the cell's onClick).
  const onClickCapture = useCallback((e: ReactMouseEvent) => {
    if (didDrag.current) {
      e.stopPropagation();
      e.preventDefault();
      didDrag.current = false;
    }
  }, []);

  return (
    <div
      className="relative aspect-square w-full select-none overflow-hidden rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '2px solid var(--line-box)',
        boxShadow: 'var(--shadow)',
        containerType: 'inline-size',
      }}
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: 'repeat(9, 1fr)',
          gridTemplateRows: 'repeat(9, 1fr)',
          filter: paused ? 'blur(10px)' : undefined,
          pointerEvents: paused ? 'none' : undefined,
          touchAction: 'none', // let a drag sweep selection without scrolling
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {board.map((cell, i) => {
          const selected = selectedIndex === i;
          const error = errorSet.has(i);
          const sameValue =
            settings.sameValueHighlight &&
            selectedValue !== 0 &&
            cell.value === selectedValue;
          const peer = peerSet?.has(i) ?? false;
          return (
            <Cell
              key={i}
              index={i}
              value={cell.value}
              given={cell.given}
              candidates={cell.candidates}
              selected={selected}
              error={error}
              sameValue={sameValue}
              peer={peer}
              emphasizeCandidate={emphasizeCandidate}
              reducedMotion={reducedMotion}
              onSelect={selectCell}
            />
          );
        })}
      </div>

      {paused && (
        <button
          type="button"
          onClick={resume}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-fade-in"
          style={{
            background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
            color: 'var(--muted-text)',
          }}
          aria-label="Paused. Tap to resume."
        >
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="var(--accent)" />
          </svg>
          <span className="text-sm font-medium">Paused — tap to resume</span>
        </button>
      )}
    </div>
  );
};
