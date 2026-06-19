import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { digitsC } from '../engine/bitmask';
import { colOf, rowOf } from '../engine/peers';

export interface CellViewProps {
  index: number;
  value: number;
  given: boolean;
  candidates: number;
  selected: boolean;
  error: boolean;
  sameValue: boolean;
  peer: boolean;
  /** Digit to emphasize among candidate marks (0 = none). */
  emphasizeCandidate: number;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
}

const cellBackground = (p: CellViewProps): string => {
  if (p.error) return 'var(--error-bg)';
  if (p.selected) return 'var(--sel-bg)';
  if (p.sameValue) return 'var(--samevalue-bg)';
  if (p.peer) return 'var(--peer-bg)';
  return 'var(--surface)';
};

const valueColor = (p: CellViewProps): string => {
  if (p.error) return 'var(--error-text)';
  return p.given ? 'var(--text-given)' : 'var(--text-user)';
};

const ariaLabel = (p: CellViewProps): string => {
  const r = rowOf(p.index) + 1;
  const c = colOf(p.index) + 1;
  const where = `row ${r} column ${c}`;
  if (p.value !== 0) {
    return `${where}, ${p.given ? 'given' : 'entered'} ${p.value}${
      p.error ? ', conflict' : ''
    }`;
  }
  const marks = digitsC(p.candidates);
  if (marks.length > 0) return `${where}, notes ${marks.join(' ')}`;
  return `${where}, empty`;
};

const CellComponent = (p: CellViewProps): JSX.Element => {
  const r = rowOf(p.index);
  const c = colOf(p.index);

  // Thicker separators on 3x3 box boundaries.
  const thickRight = c % 3 === 2 && c !== 8;
  const thickBottom = r % 3 === 2 && r !== 8;

  const style: CSSProperties = {
    background: cellBackground(p),
    borderRight: c === 8 ? 'none' : `${thickRight ? 2 : 1}px solid ${
      thickRight ? 'var(--line-box)' : 'var(--line)'
    }`,
    borderBottom: r === 8 ? 'none' : `${thickBottom ? 2 : 1}px solid ${
      thickBottom ? 'var(--line-box)' : 'var(--line)'
    }`,
    boxShadow: p.selected ? 'inset 0 0 0 2px var(--sel-ring)' : p.error
      ? 'inset 0 0 0 2px var(--error-text)'
      : 'none',
    transition: 'background-color 140ms ease',
  };

  // Gentle pop when a fresh value lands in this cell.
  const prev = useRef(p.value);
  const [popKey, setPopKey] = useState(0);
  useEffect(() => {
    if (p.value !== 0 && p.value !== prev.current && !p.reducedMotion) {
      setPopKey((k) => k + 1);
    }
    prev.current = p.value;
  }, [p.value, p.reducedMotion]);

  return (
    <button
      type="button"
      onClick={() => p.onSelect(p.index)}
      className="no-touch-callout relative flex items-center justify-center"
      style={style}
      aria-label={ariaLabel(p)}
      aria-pressed={p.selected}
    >
      {p.value !== 0 ? (
        <span
          key={popKey}
          className={popKey ? 'animate-pop' : undefined}
          style={{
            fontSize: '5.4cqw',
            lineHeight: 1,
            fontWeight: p.sameValue ? 700 : p.given ? 600 : 500,
            color: valueColor(p),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {p.value}
        </span>
      ) : p.candidates !== 0 ? (
        <span
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            padding: '6%',
          }}
          aria-hidden="true"
        >
          {Array.from({ length: 9 }, (_unused, k) => {
            const d = k + 1;
            const present = (p.candidates & (1 << (d - 1))) !== 0;
            const emph = present && p.emphasizeCandidate === d;
            return (
              <span
                key={d}
                className="flex items-center justify-center"
                style={{
                  fontSize: '2.5cqw',
                  lineHeight: 1,
                  fontWeight: emph ? 700 : 500,
                  color: emph ? 'var(--accent)' : 'var(--candidate)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {present ? d : ''}
              </span>
            );
          })}
        </span>
      ) : null}
    </button>
  );
};

export const Cell = memo(CellComponent);
