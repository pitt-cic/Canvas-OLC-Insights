import { useEffect, useRef, useCallback } from 'react'

interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  { keys: '0 / 1 / 2', action: 'Select score' },
  { keys: '↑ / ↓ or j / k', action: 'Navigate objective list' },
  { keys: 'Ctrl+Enter', action: 'Confirm score' },
  { keys: 'Ctrl+S', action: 'Confirm score (alt)' },
  { keys: 'e', action: 'Toggle export panel' },
  { keys: '?', action: 'Toggle this help' },
  { keys: 'Esc', action: 'Close panel' },
]

export default function KeyboardHelpModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
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
  }, [onClose])

  useEffect(() => {
    closeRef.current?.focus()
    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [trapFocus])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-help-title"
    >
      <div className="absolute inset-0 bg-ink/40 dark:bg-ink/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="relative bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-6 w-full max-w-sm shadow-[var(--shadow-overlay)] animate-[scaleIn_150ms_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="kb-help-title" className="text-lg font-bold text-ink dark:text-white mb-5">Keyboard shortcuts</h2>
        <dl className="space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center gap-3">
              <dt>
                <kbd className="font-mono text-[11px] bg-surface-sunken dark:bg-surface-sunken-dark px-2.5 py-1.5 rounded-md border border-mist dark:border-border-dark min-w-[100px] text-center text-ink dark:text-white font-medium">
                  {s.keys}
                </kbd>
              </dt>
              <dd className="text-sm text-ink-muted dark:text-slate-300">{s.action}</dd>
            </div>
          ))}
        </dl>
        <button
          ref={closeRef}
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
