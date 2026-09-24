import { useToastStore, type ToastType } from '../store/toastStore'

const BORDER_COLOR: Record<ToastType, string> = {
  success: 'border-l-pgreen',
  error: 'border-l-pred',
  info: 'border-l-pblue',
  warning: 'border-l-gold',
}

function ToastIcon({ type }: { type: ToastType }) {
  const cls = 'w-4 h-4 flex-shrink-0 mt-0.5'
  switch (type) {
    case 'success':
      return (
        <svg className={`${cls} text-pgreen`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M5.5 8.5L7 10l3.5-4"/>
        </svg>
      )
    case 'error':
      return (
        <svg className={`${cls} text-pred`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/>
        </svg>
      )
    case 'warning':
      return (
        <svg className={`${cls} text-gold`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2l6 10.5H2L8 2z"/>
          <path d="M8 6.5v2.5M8 11h.01"/>
        </svg>
      )
    default:
      return (
        <svg className={`${cls} text-pblue`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 7v3.5M8 5h.01"/>
        </svg>
      )
  }
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : undefined}
          className={`pointer-events-auto toast-enter bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark border-l-4 ${BORDER_COLOR[t.type]} rounded-lg shadow-[var(--shadow-overlay)] px-4 py-3 min-w-[260px] max-w-[360px] flex items-start gap-2.5`}
        >
          <ToastIcon type={t.type} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink dark:text-white">{t.title}</div>
            {t.message && (
              <div className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5">{t.message}</div>
            )}
          </div>
          <button
            onClick={() => remove(t.id)}
            className="text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white p-0.5 rounded hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
            aria-label="Dismiss notification"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l6 6M10 4l-6 6"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
