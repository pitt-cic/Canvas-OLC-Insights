import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useStartReview } from '../hooks/useStartReview'
import { useRouteSync } from '../hooks/useRouteSync'

export default function CourseOptionsScreen() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const courseName = useAppStore((s) => s.courseName)
  const { mutate, isPending } = useStartReview()
  useRouteSync()

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-pblue-lt)_0%,_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(29,78,216,0.05)_0%,_transparent_70%)] opacity-40" />

      <div className="w-full max-w-lg relative screen-enter">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-extrabold text-ink dark:text-white tracking-tight">
            {courseName || `Course ${courseId}`}
          </h1>
          <p className="text-ink-subtle dark:text-slate-300 mt-2 text-sm">
            What would you like to do?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(`/course/${courseId}/metrics`)}
            className="group p-6 rounded-2xl border-2 border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark hover:border-royal dark:hover:border-royal transition-all hover:shadow-lg hover:shadow-royal/10 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-royal/10 dark:bg-royal/20 flex items-center justify-center mb-4 group-hover:bg-royal/20">
              <svg className="w-5 h-5 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-ink dark:text-white mb-1">View Metrics</h2>
            <p className="text-sm text-ink-subtle dark:text-slate-300">
              See score trends and history for this course
            </p>
          </button>

          <button
            onClick={() => mutate(courseId!)}
            disabled={isPending}
            className="group p-6 rounded-2xl border-2 border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark hover:border-royal dark:hover:border-royal transition-all hover:shadow-lg hover:shadow-royal/10 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/10 dark:bg-gold/20 flex items-center justify-center mb-4 group-hover:bg-gold/20">
              <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-ink dark:text-white mb-1">
              {isPending ? 'Starting...' : 'File New Review'}
            </h2>
            <p className="text-sm text-ink-subtle dark:text-slate-300">
              Run a new AI-assisted quality evaluation
            </p>
          </button>
        </div>

        <button
          onClick={() => { useAppStore.getState().reset(); navigate('/courses') }}
          className="mt-8 mx-auto block text-sm text-ink-subtle dark:text-slate-400 hover:text-royal transition-colors"
        >
          &larr; Change course
        </button>
      </div>
    </div>
  )
}
