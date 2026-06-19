import { useEffect, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** When false the scrim tap and close button are hidden (forced choice). */
  dismissible?: boolean;
}

/**
 * A bottom sheet used for settings, stats, and the difficulty picker. Lives
 * entirely in store-driven UI state — no router. Tapping the scrim or the
 * close button dismisses it (unless dismissible is false).
 */
export const Sheet = ({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: SheetProps): JSX.Element | null => {
  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        className="animate-sheet-up relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl"
        style={{
          background: 'var(--surface)',
          color: 'var(--text-given)',
          boxShadow: 'var(--shadow)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 pb-3 pt-4"
          style={{ background: 'var(--surface)' }}
        >
          <div
            className="mx-auto absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full"
            style={{ background: 'var(--line)' }}
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95"
              style={{ color: 'var(--muted-text)', background: 'var(--peer-bg)' }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  );
};
