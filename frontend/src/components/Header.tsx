import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useThemeStore } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import ProgressRing from './ProgressRing'
import ConfirmModal from './ConfirmModal'

export default function Header() {
  const { dashboardData, allObjectives, reset } = useAppStore()
  const { theme, toggle } = useThemeStore()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const confirmed = allObjectives.filter((o) => o.confirmed).length
  const courseName = dashboardData?.course_name
  const showBack = !pathname.includes('/processing/') && pathname !== '/courses'
  const hasProgress = allObjectives.length > 0

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-royal flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold font-mono">Q</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink dark:text-white">OLC Insights</div>
            {courseName && (
              <div className="text-xs text-ink-subtle dark:text-slate-300 truncate max-w-[200px]">{courseName}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasProgress && (
            <div className="flex items-center gap-2">
              <ProgressRing
                value={allObjectives.length > 0 ? confirmed / allObjectives.length : 0}
                size={32}
                strokeWidth={2.5}
                label={String(confirmed)}
                color="var(--color-pgreen)"
              />
              <span className="text-[11px] text-ink-subtle dark:text-slate-300 font-medium hidden sm:inline">
                confirmed
              </span>
            </div>
          )}

          <button
            onClick={toggle}
            className="p-2 rounded-lg text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="3.5"/>
                <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z"/>
              </svg>
            )}
          </button>

          {showBack && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-xs font-medium text-ink-subtle dark:text-slate-300 hover:text-pred border border-transparent hover:border-pred/20 hover:bg-pred-lt/50 dark:hover:bg-red-950/20 rounded-lg transition-all"
            >
              New review
            </button>
          )}

          <button
            onClick={() => { reset(); logout(); navigate('/courses') }}
            className="px-3 py-1.5 text-xs font-medium text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white border border-mist dark:border-border-dark hover:bg-surface-sunken dark:hover:bg-surface-raised-dark rounded-lg transition-all"
          >
            Sign out
          </button>
        </div>
      </header>

      {showResetConfirm && (
        <ConfirmModal
          title="Start a new review?"
          description="Your current progress will be lost. Confirmed scores are saved on the server."
          confirmLabel="Start new"
          cancelLabel="Keep reviewing"
          variant="danger"
          onConfirm={() => { setShowResetConfirm(false); reset(); navigate('/courses') }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  )
}
