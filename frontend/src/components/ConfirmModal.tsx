import { useEffect, useRef, useCallback } from 'react'

interface Props {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onCancel(); return }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onCancel])

  useEffect(() => {
    confirmRef.current?.focus()
    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [trapFocus])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-ink/40 dark:bg-ink/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div ref={dialogRef} className="relative bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-6 w-full max-w-sm shadow-[var(--shadow-overlay)] animate-[scaleIn_150ms_ease]">
        <h2 id="confirm-title" className="text-lg font-bold text-ink dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-ink-muted dark:text-slate-300 mt-2">{description}</p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-mist dark:border-border-dark text-sm font-medium text-ink dark:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
              variant === 'danger'
                ? 'bg-pred hover:bg-pred/90'
                : 'bg-royal hover:bg-medium'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
