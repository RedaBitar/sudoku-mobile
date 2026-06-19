import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#2563EB', '#60A5FA', '#F59E0B', '#10B981', '#EF4444', '#A855F7'];

/**
 * A short, lightweight confetti burst for the win celebration. Pure CSS
 * animation, no dependencies. Skipped entirely when the user prefers
 * reduced motion.
 */
export const Confetti = (): JSX.Element | null => {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pieces = useMemo(
    () =>
      Array.from({ length: 140 }, (_unused, i) => ({
        left: Math.random() * 100,
        // Stagger the launch over ~1s so the confetti rains for a few
        // seconds rather than flashing by in one frame.
        delay: Math.random() * 1,
        duration: 2.6 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        width: 7 + Math.random() * 6,
        height: 9 + Math.random() * 9,
        drift: (Math.random() * 2 - 1) * 70,
        round: Math.random() > 0.5,
      })),
    [],
  );

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: `${p.width}px`,
              height: `${p.height}px`,
              background: p.color,
              borderRadius: p.round ? '50%' : '2px',
              animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};
