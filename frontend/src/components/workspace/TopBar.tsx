import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/themeStore'
import ProgressRing from '../ProgressRing'

export default function TopBar() {
  const navigate = useNavigate()
  const allObjectives = useAppStore((s) => s.allObjectives)
  const dashboardData = useAppStore((s) => s.dashboardData)
  const toggleExportPanel = useAppStore((s) => s.toggleExportPanel)
  const reset = useAppStore((s) => s.reset)
  const { theme, toggle: toggleTheme } = useThemeStore()

  const total = allObjectives.length
  const confirmed = allObjectives.filter((o) => o.confirmed).length
  const progress = total > 0 ? confirmed / total : 0

  const courseName = dashboardData?.course_name || 'Course Review'

  const effectiveScore = allObjectives.reduce((sum, o) => {
    const s = o.confirmed ? o.human_score : o.proposed_score
    return sum + (s ?? 0)
  }, 0)
  const maxScore = allObjectives.length * 2

  return (
    <header className="h-14 flex items-center px-4 gap-4 border-b border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark flex-shrink-0">
      {/* Logo + course */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-royal flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">QA</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink dark:text-white truncate">{courseName}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <ProgressRing value={progress} size={28} strokeWidth={3} />
        <div className="text-xs text-ink-muted dark:text-slate-300">
          <span className="font-bold text-ink dark:text-white">{confirmed}</span>/{total} confirmed
        </div>
      </div>

      {/* Score */}
      <div className="hidden md:flex items-center gap-2 text-xs text-ink-subtle dark:text-slate-300 border-l border-mist dark:border-border-dark pl-4">
        <span className="font-mono font-bold text-ink dark:text-white">{effectiveScore}</span>
        <span>/ {maxScore}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-2">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-mist dark:border-border-dark text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:border-royal/30 transition-colors"
        >
          Overview
        </button>
        <button
          onClick={toggleExportPanel}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-mist dark:border-border-dark text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:border-royal/30 transition-colors"
        >
          Export
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="3.5"/>
              <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13.5 10.3A5.5 5.5 0 015.7 2.5 6 6 0 1013.5 10.3z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
          className="p-1.5 rounded-lg text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M6 6a2 2 0 013.5 1.5c0 1-1.5 1.5-1.5 2.5M8 12.5h.01"/>
          </svg>
        </button>
        <button
          onClick={() => { reset(); navigate('/courses') }}
          className="p-1.5 rounded-lg text-ink-subtle dark:text-slate-300 hover:text-pred transition-colors"
          aria-label="New review"
          title="Start new review"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 8a6 6 0 0111.47-2.47M14 8a6 6 0 01-11.47 2.47"/>
            <path d="M14 2v4h-4M2 14v-4h4"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
