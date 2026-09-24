import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import type { SortMode } from '../store/appStore'
import { api } from '../lib/api'
import { toast } from '../store/toastStore'
import { useFinalizeReview } from '../hooks/useFinalizeReview'
import ProgressRing from '../components/ProgressRing'
import { SCORE_LABELS, SCORE_COLORS, SECTIONS } from '../lib/constants'

export default function DashboardScreen() {
  const navigate = useNavigate()
  const dashboardData = useAppStore((s) => s.dashboardData)
  const allObjectives = useAppStore((s) => s.allObjectives)
  const triageIds = useAppStore((s) => s.triageIds)
  const reviewId = useAppStore((s) => s.reviewId)
  const setSortMode = useAppStore((s) => s.setSortMode)
  const toggleExportPanel = useAppStore((s) => s.toggleExportPanel)
  const updateObjectiveScore = useAppStore((s) => s.updateObjectiveScore)

  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [showScorecard, setShowScorecard] = useState(false)
  const { mutate: finalize, isPending: isFinalizing } = useFinalizeReview()

  const courseName = dashboardData?.course_name || 'Course'
  const triageCount = triageIds.length
  const hasStartedScoring = allObjectives.some((o) => o.confirmed)

  const scores = useMemo(() => {
    const sections = { essential: 0, advanced: 0, delivery: 0 }
    const maxes = { essential: 0, advanced: 0, delivery: 0 }

    for (const obj of allObjectives) {
      const score = obj.confirmed ? (obj.human_score ?? 0) : (obj.proposed_score ?? 0)
      const key = obj.section === 'Essential Design' ? 'essential'
        : obj.section === 'Advanced Design' ? 'advanced'
        : 'delivery'
      sections[key] += score
      maxes[key] += 2
    }

    const total = sections.essential + sections.advanced + sections.delivery
    const max = maxes.essential + maxes.advanced + maxes.delivery
    const pct = max > 0 ? (total / max) * 100 : 0

    return { sections, maxes, total, max, pct }
  }, [allObjectives])

  const tierLabel = scores.pct >= 85 ? 'Exemplary' : scores.pct >= 60 ? 'Accomplished' : 'Developing'

  const allConfirmed = allObjectives.length > 0 && allObjectives.every((o) => o.confirmed)
  const unconfirmed = allObjectives.filter((o) => !o.confirmed)

  function handleChoice(mode: SortMode) {
    setSortMode(mode)
    navigate('workspace')
  }

  const handleBulkAccept = useCallback(async () => {
    if (!reviewId || unconfirmed.length === 0) return
    const total = unconfirmed.length
    setBulkProgress({ done: 0, total })
    let failures = 0

    for (let i = 0; i < unconfirmed.length; i++) {
      const obj = unconfirmed[i]
      try {
        await api.confirmScore(reviewId, obj.obj_id, obj.proposed_score ?? 0, '')
        updateObjectiveScore(obj.obj_id, obj.proposed_score ?? 0, '')
      } catch {
        failures++
      }
      setBulkProgress({ done: i + 1, total })
    }

    setBulkProgress(null)
    if (failures === 0) {
      toast.success(`All ${total} objectives confirmed`)
    } else {
      toast.warning(`Confirmed ${total - failures}/${total}`, `${failures} failed`)
    }
  }, [reviewId, unconfirmed, updateObjectiveScore])

  function handleExport() {
    toggleExportPanel()
    navigate('workspace')
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center px-8 py-6 screen-enter">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-pgreen-lt dark:bg-emerald-500/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-pgreen dark:text-emerald-400">
              <path d="M8 16.5L13.5 22L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-ink dark:text-white mb-1">Evaluation Complete</h1>
          <p className="text-lg text-ink-muted dark:text-slate-200">{courseName}</p>
          {dashboardData?.course_id && (
            <p className="text-sm text-ink-subtle dark:text-slate-300 mt-1">
              {dashboardData.course_id} — {allObjectives.length} objectives evaluated
            </p>
          )}
        </div>

        {/* Score overview + sections side by side */}
        <div className="flex gap-5 mb-5">
          {/* Left: overall score */}
          <div className="flex-shrink-0 w-[220px] bg-surface-raised dark:bg-slate-800 border border-mist dark:border-slate-600 rounded-2xl p-7 flex flex-col items-center justify-center">
            <ProgressRing
              value={scores.max > 0 ? scores.total / scores.max : 0}
              size={96}
              strokeWidth={7}
              label={`${Math.round(scores.pct)}%`}
              sublabel={tierLabel}
              color="var(--color-royal)"
            />
            <div className="mt-4 text-center">
              <div className="text-4xl font-bold font-mono text-ink dark:text-white">
                {scores.total}<span className="text-lg text-ink-subtle dark:text-slate-300 font-normal"> / {scores.max}</span>
              </div>
              <p className="text-sm text-ink-subtle dark:text-slate-300 mt-1">
                {hasStartedScoring ? 'Current score' : 'AI proposed score'}
              </p>
            </div>
          </div>

          {/* Right: section breakdown */}
          <div className="flex-1 bg-surface-raised dark:bg-slate-800 border border-mist dark:border-slate-600 rounded-2xl p-7 flex flex-col justify-center space-y-5">
            {([
              { key: 'essential' as const, label: 'Essential Design' },
              { key: 'advanced' as const, label: 'Advanced Design' },
              { key: 'delivery' as const, label: 'Course Delivery' },
            ]).map(({ key, label }) => {
              const scored = scores.sections[key]
              const max = scores.maxes[key]
              const pct = max > 0 ? (scored / max) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-medium text-ink-muted dark:text-slate-200">{label}</span>
                    <span className="text-base font-bold font-mono text-ink dark:text-white">{scored}/{max}</span>
                  </div>
                  <div
                    className="h-3 bg-mist dark:bg-slate-600 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={scored}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={`${label}: ${scored} of ${max}`}
                  >
                    <div
                      className="h-full bg-royal dark:bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Triage summary */}
        {triageCount > 0 && (
          <div className="flex items-center gap-4 bg-gold-lt/50 dark:bg-amber-500/20 border border-gold/30 dark:border-amber-400/50 rounded-2xl px-6 py-4 mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-yellow-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true">
              <path d="M12 3l9.5 17H2.5L12 3z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
              <path d="M12 9.5v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <p className="text-lg font-semibold text-yellow-800 dark:text-white">
                {triageCount} objective{triageCount !== 1 ? 's' : ''} need{triageCount === 1 ? 's' : ''} your attention
              </p>
              <p className="text-sm text-yellow-700 dark:text-amber-200">
                Low AI confidence or requires human judgment
              </p>
            </div>
          </div>
        )}
        {triageCount === 0 && (
          <div className="flex items-center gap-4 bg-pgreen-lt/50 dark:bg-emerald-500/20 border border-pgreen/30 dark:border-emerald-400/50 rounded-2xl px-6 py-4 mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-pgreen dark:text-emerald-400 flex-shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
              <path d="M8 12.5L10.5 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-lg font-semibold text-green-800 dark:text-white">All objectives scored confidently</p>
              <p className="text-sm text-green-700 dark:text-emerald-200">Review and confirm at your own pace</p>
            </div>
          </div>
        )}

        {/* Completion state */}
        {allConfirmed ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 bg-pgreen-lt/50 dark:bg-emerald-500/20 border border-pgreen/30 dark:border-emerald-400/50 rounded-2xl px-6 py-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-pgreen dark:text-emerald-400">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p className="text-lg font-semibold text-green-800 dark:text-white">All objectives reviewed</p>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => finalize()}
                disabled={isFinalizing}
                className="px-6 py-3 rounded-xl bg-pgreen hover:bg-emerald-600 text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isFinalizing ? 'Finalizing...' : 'Finalize Review'}
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-3 rounded-xl bg-royal hover:bg-medium text-white font-semibold transition-all hover:shadow-lg"
              >
                Export Scorecard
              </button>
              <button
                onClick={() => handleChoice('scorecard')}
                className="px-6 py-3 rounded-xl border-2 border-mist dark:border-slate-500 hover:border-royal dark:hover:border-blue-400 bg-surface-raised dark:bg-slate-800 text-ink dark:text-white font-medium transition-all"
              >
                Review Scores
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bulk accept */}
            {unconfirmed.length > 0 && (
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={handleBulkAccept}
                  disabled={bulkProgress !== null}
                  className="px-5 py-2.5 rounded-xl border-2 border-mist dark:border-slate-500 hover:border-pgreen dark:hover:border-emerald-400 bg-surface-raised dark:bg-slate-800 text-sm font-medium text-ink dark:text-white transition-all hover:shadow-md disabled:opacity-50"
                >
                  {bulkProgress
                    ? `Confirming ${bulkProgress.done}/${bulkProgress.total}...`
                    : `Accept All AI Scores (${unconfirmed.length})`
                  }
                </button>
              </div>
            )}

            {/* CTA buttons */}
            <p className="text-base text-ink-subtle dark:text-slate-300 text-center mb-3">
              {hasStartedScoring ? 'Continue reviewing?' : 'How would you like to review the results?'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleChoice('priority')}
                className="flex-1 px-6 py-5 rounded-2xl border-2 border-mist dark:border-slate-500 hover:border-royal dark:hover:border-blue-400 bg-surface-raised dark:bg-slate-800 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-gold dark:text-amber-400">
                    <path d="M11 2.5l2.2 4.8 5.1.8-3.7 3.6.9 5.3L11 14.5l-4.5 2.5.9-5.3-3.7-3.6 5.1-.8L11 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-lg font-bold text-ink dark:text-white">
                    {hasStartedScoring ? 'Resume by Priority' : 'Needs Attention First'}
                  </span>
                </div>
                <p className="text-sm text-ink-subtle dark:text-slate-300 leading-relaxed">
                  {hasStartedScoring ? 'Continue with flagged items first' : 'Start with flagged items that need human judgment'}
                </p>
              </button>

              <button
                onClick={() => handleChoice('scorecard')}
                className="flex-1 px-6 py-5 rounded-2xl border-2 border-mist dark:border-slate-500 hover:border-royal dark:hover:border-blue-400 bg-surface-raised dark:bg-slate-800 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-royal dark:text-blue-400">
                    <path d="M4 5.5h14M4 11h14M4 16.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span className="text-lg font-bold text-ink dark:text-white">
                    {hasStartedScoring ? 'Resume in Scorecard Order' : 'Scorecard Order'}
                  </span>
                </div>
                <p className="text-sm text-ink-subtle dark:text-slate-300 leading-relaxed">
                  {hasStartedScoring ? 'Continue reviewing E1 through D15' : 'Review E1 through D15 matching OLC layout'}
                </p>
              </button>
            </div>
          </>
        )}

        {/* View Full Scorecard toggle */}
        <div className="mt-8 border-t border-mist dark:border-slate-600 pt-6">
          <button
            onClick={() => setShowScorecard(!showScorecard)}
            aria-expanded={showScorecard}
            className="flex items-center gap-2 text-sm font-medium text-royal dark:text-blue-400 hover:text-medium dark:hover:text-blue-300 transition-colors"
          >
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className={`transition-transform ${showScorecard ? 'rotate-90' : ''}`}
            >
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showScorecard ? 'Hide Full Scorecard' : 'View Full Scorecard'}
          </button>

          {showScorecard && (
            <div className="mt-4 space-y-6">
              {SECTIONS.map((sectionName) => {
                const sectionObjs = allObjectives
                  .filter((o) => o.section === sectionName)
                  .sort((a, b) => {
                    const numA = parseInt(a.obj_id.slice(1))
                    const numB = parseInt(b.obj_id.slice(1))
                    return numA - numB
                  })
                const sectionScore = sectionObjs.reduce((sum, o) => {
                  const s = o.confirmed ? (o.human_score ?? 0) : (o.proposed_score ?? 0)
                  return sum + s
                }, 0)
                const sectionMax = sectionObjs.length * 2

                return (
                  <div key={sectionName} className="bg-surface-raised dark:bg-slate-800 border border-mist dark:border-slate-600 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 bg-mist/50 dark:bg-slate-700/50 border-b border-mist dark:border-slate-600 flex items-center justify-between">
                      <h3 className="text-base font-bold text-ink dark:text-white">{sectionName}</h3>
                      <span className="text-sm font-mono font-semibold text-ink-muted dark:text-slate-300">
                        {sectionScore}/{sectionMax}
                      </span>
                    </div>
                    <div className="divide-y divide-mist/60 dark:divide-slate-700">
                      {sectionObjs.map((obj) => {
                        const score = obj.confirmed ? (obj.human_score ?? obj.proposed_score ?? 0) : (obj.proposed_score ?? 0)
                        const label = SCORE_LABELS[score] || 'Developing'
                        const colors = SCORE_COLORS[score as 0 | 1 | 2] || SCORE_COLORS[0]
                        const wasOverride = obj.confirmed && obj.human_score !== null && obj.human_score !== obj.proposed_score

                        return (
                          <div key={obj.obj_id} className="px-5 py-3 flex items-start gap-3">
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${colors.bg} ${colors.text} flex-shrink-0 mt-0.5`}>
                              {obj.obj_id}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-ink dark:text-slate-200 leading-snug">
                                {obj.title}
                              </p>
                              {obj.human_rationale && (
                                <p className="text-xs text-ink-subtle dark:text-slate-400 mt-1 italic">
                                  {obj.human_rationale}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {wasOverride && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                  Override
                                </span>
                              )}
                              {obj.confirmed && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-pgreen dark:text-emerald-400">
                                  <path d="M3.5 7l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {score}/2 {label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
