import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReviewStatus } from '../hooks/useReviewStatus'
import { useAppStore } from '../store/appStore'
import { api } from '../lib/api'
import { toast } from '../store/toastStore'
import { Log } from '../lib/logger'
import { useRouteSync } from '../hooks/useRouteSync'

export default function ProcessingScreen() {
  const { courseId, reviewId } = useParams<{ courseId: string; reviewId: string }>()
  const navigate = useNavigate()
  const { data: status } = useReviewStatus()
  const { setDashboardData, setObjectives, setTriageIds } = useAppStore()
  useRouteSync()

  useEffect(() => {
    if (!status) return

    if (status.status === 'ready') {
      Log.success('LOAD', 'Review ready, transitioning to workspace')
      ;(async () => {
        try {
          const [dashData, allRes] = await Promise.all([
            api.getDashboard(reviewId!),
            api.getAllObjectives(reviewId!),
          ])
          if (dashData) {
            setDashboardData(dashData)
            setTriageIds(
              dashData.grid
                .filter((cell) => cell.proposed_score === 0 || cell.proposed_score === 1)
                .map((cell) => cell.obj_id)
            )
          }
          if (allRes.objectives) {
            setObjectives(allRes.objectives)
          }
          navigate(`/course/${courseId}/review/${reviewId}`, { replace: true })
          toast.success('Review ready')
        } catch (err) {
          Log.error('LOAD', 'Failed to load review data', err)
          toast.error('Failed to load review data')
          navigate('/courses', { replace: true })
        }
      })()
    }

    if (status.status === 'error') {
      Log.error('LOAD', 'Review error', status.error)
      toast.error(status.error || 'Processing failed')
      navigate('/courses', { replace: true })
    }
  }, [status?.status])

  const progress = status ? Math.round((status.progress / Math.max(status.total, 1)) * 100) : 0
  const courseName = status?.course_name

  const stageMessage =
    status?.status === 'ingesting'
      ? 'Ingesting course content from Canvas'
      : status?.status === 'extracting'
        ? 'AI is evaluating each objective'
        : 'Connecting to server'

  const sectionProgress = status ? {
    essential: Math.min(status.progress, 20),
    advanced: Math.max(0, Math.min(status.progress - 20, 15)),
    delivery: Math.max(0, Math.min(status.progress - 35, 15)),
  } : { essential: 0, advanced: 0, delivery: 0 }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 screen-enter">
      <div className="w-full max-w-md">
        {/* Main progress ring */}
        <div
          className="relative w-20 h-20 mx-auto mb-8"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Review progress: ${progress}%`}
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="3" className="text-mist dark:text-border-dark" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="var(--color-royal)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="text-lg font-bold font-mono text-ink dark:text-white">{progress}%</span>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-8">
          {courseName && (
            <div className="text-sm font-semibold text-ink dark:text-white mb-1">{courseName}</div>
          )}
          <h1 className="text-lg font-bold text-ink dark:text-white">
            {status?.status === 'ingesting' ? 'Ingesting course' : status?.status === 'extracting' ? 'Scoring objectives' : 'Connecting'}
          </h1>
          <p className="text-sm text-ink-subtle dark:text-slate-300 mt-1">{stageMessage}</p>
        </div>

        {/* Section progress bars */}
        <div className="space-y-3 mb-6">
          {[
            { label: 'Essential Design', count: 20, done: sectionProgress.essential },
            { label: 'Advanced Design', count: 15, done: sectionProgress.advanced },
            { label: 'Course Delivery', count: 15, done: sectionProgress.delivery },
          ].map((section) => (
            <div key={section.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-ink-subtle dark:text-slate-300">{section.label}</span>
                <span className="text-[11px] font-mono text-ink-subtle dark:text-slate-300 tabular-nums">{section.done}/{section.count}</span>
              </div>
              <div
                className="h-2 rounded-full bg-surface-sunken dark:bg-surface-sunken-dark overflow-hidden"
                role="progressbar"
                aria-valuenow={section.done}
                aria-valuemin={0}
                aria-valuemax={section.count}
                aria-label={`${section.label}: ${section.done} of ${section.count}`}
              >
                <div
                  className="h-full bg-royal/70 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(section.done / section.count) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live region for screen reader progress updates */}
        <p className="text-center text-xs font-mono text-ink-subtle dark:text-slate-300 tabular-nums" aria-live="polite" aria-atomic="true">
          {status ? `${status.progress} of ${status.total} objectives` : 'Waiting for response...'}
        </p>

      </div>
    </div>
  )
}
