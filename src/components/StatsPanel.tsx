import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import { formatTime } from '../hooks/useTimer';
import { Sheet } from './Sheet';

export const StatsPanel = (): JSX.Element => {
  const open = useUIStore((s) => s.statsOpen);
  const close = useUIStore((s) => s.closeStats);
  const stats = useSettingsStore((s) => s.stats);

  const levels: Difficulty[] = [1, 2, 3, 4, 5];

  const totalCompleted = levels.reduce((n, l) => n + stats[l].completed, 0);
  const totalPlayed = levels.reduce((n, l) => n + stats[l].played, 0);
  const winRate =
    totalPlayed > 0 ? Math.round((totalCompleted / totalPlayed) * 100) : 0;

  return (
    <Sheet open={open} onClose={close} title="Statistics">
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Completed', value: String(totalCompleted) },
          { label: 'Played', value: String(totalPlayed) },
          { label: 'Win rate', value: `${winRate}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl px-3 py-4 text-center"
            style={{ background: 'var(--peer-bg)' }}
          >
            <div className="text-2xl font-semibold tabular">{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--muted-text)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 pb-2">
        <div
          className="grid grid-cols-4 px-2 pb-1 text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--muted-text)' }}
        >
          <span className="col-span-1">Level</span>
          <span className="text-center">Done</span>
          <span className="text-center">Best</span>
          <span className="text-center">Avg</span>
        </div>
        {levels.map((l) => {
          const s = stats[l];
          const avg =
            s.completed > 0 ? formatTime(s.totalMs / s.completed) : '—';
          return (
            <div
              key={l}
              className="grid grid-cols-4 items-center rounded-xl px-2 py-2.5 text-sm"
              style={{ background: 'var(--peer-bg)' }}
            >
              <span className="font-medium">{DIFFICULTIES[l].label}</span>
              <span className="text-center tabular">{s.completed}</span>
              <span className="text-center tabular">
                {s.bestMs !== null ? formatTime(s.bestMs) : '—'}
              </span>
              <span className="text-center tabular">{avg}</span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};
