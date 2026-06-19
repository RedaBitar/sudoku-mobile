import { useUIStore } from '../store/uiStore';

export const ConfirmDialog = (): JSX.Element | null => {
  const confirm = useUIStore((s) => s.confirm);
  const close = useUIStore((s) => s.closeConfirm);

  if (!confirm.open) return null;

  const onConfirm = confirm.onConfirm;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={confirm.title}
    >
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={close}
      />
      <div
        className="animate-sheet-up relative w-full max-w-sm rounded-3xl p-6"
        style={{
          background: 'var(--surface)',
          color: 'var(--text-given)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h2 className="text-lg font-semibold">{confirm.title}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-text)' }}>
          {confirm.message}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-xl py-3 text-sm font-medium transition active:scale-95"
            style={{ background: 'var(--peer-bg)', color: 'var(--text-given)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              close();
            }}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
