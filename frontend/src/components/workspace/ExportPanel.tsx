import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../../store/appStore'
import { toast } from '../../store/toastStore'
import { generateScorecardPDF } from '../../lib/generateScorecard'
import { buildExportData } from '../../lib/buildExportData'
import { api } from '../../lib/api'
import ProgressRing from '../ProgressRing'

async function downloadFinalizedPdf(reviewId: string) {
  const { url } = await api.getReviewPdf(reviewId)
  window.open(url, '_blank')
}

export default function ExportPanel() {
  const toggleExportPanel = useAppStore((s) => s.toggleExportPanel)
  const allObjectives = useAppStore((s) => s.allObjectives)
  const dashboardData = useAppStore((s) => s.dashboardData)
  const reviewId = useAppStore((s) => s.reviewId)
  const [copiedJSON, setCopiedJSON] = useState(false)
  const [essentialsLoading, setEssentialsLoading] = useState(false)

  const exportData = useMemo(
    () => buildExportData(allObjectives, dashboardData, reviewId),
    [allObjectives, dashboardData, reviewId]
  )

  const { scorecard, completion } = exportData
  const tierLabel = scorecard.percentage >= 85 ? 'Exemplary' : scorecard.percentage >= 60 ? 'Accomplished' : 'Developing'

  const handleDownloadPDF = useCallback(() => {
    try {
      generateScorecardPDF(exportData)
      toast.success('PDF downloaded')
    } catch (e) {
      console.error('PDF generation failed:', e)
      toast.error(`PDF failed: ${(e as Error).message}`)
    }
  }, [exportData])

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `olc-review-${exportData.course_id}-${exportData.review_date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyJSON() {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2)).then(() => {
      setCopiedJSON(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedJSON(false), 2000)
    }).catch(() => {
      toast.error('Clipboard not available')
    })
  }

  async function downloadEssentials() {
    if (!reviewId) return
    setEssentialsLoading(true)
    try {
      const essentialIds = Array.from({ length: 20 }, (_, i) => `E${i + 1}`)
      const details = await Promise.all(
        essentialIds.map((id) => api.getObjective(reviewId, id))
      )
      const essentialsExport = {
        review_id: reviewId,
        course_id: dashboardData?.course_id || '',
        course_name: dashboardData?.course_name || '',
        exported_at: new Date().toISOString(),
        section: 'Essential Design',
        objectives: details.map((d) => ({
          obj_id: d.obj_id,
          title: d.title,
          pattern: d.pattern,
          proposed_score: d.proposed_score,
          score_label: d.score_label,
          confidence: d.confidence,
          human_judgment_required: d.human_judgment_required,
          accomplished_criteria: d.accomplished_criteria,
          exemplary_criteria: d.exemplary_criteria,
          key_findings: d.key_findings,
          reasoning: d.reasoning,
          improvement_suggestions: d.improvement_suggestions,
          where_to_look: d.where_to_look,
          content_gaps: d.content_gaps,
          human_score: d.human_score ?? null,
          human_rationale: d.human_rationale ?? '',
          confirmed: d.confirmed ?? false,
        })),
      }
      const blob = new Blob([JSON.stringify(essentialsExport, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `essential-design-E1-E20-${dashboardData?.course_id || 'course'}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Essential Design JSON downloaded')
    } catch (e) {
      console.error('Essentials export failed:', e)
      toast.error(`Export failed: ${(e as Error).message}`)
    } finally {
      setEssentialsLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink dark:text-white">Export Scorecard</h2>
          <button
            onClick={toggleExportPanel}
            className="p-2 rounded-lg text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
            aria-label="Close export panel"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l8 8M13 5l-8 8"/>
            </svg>
          </button>
        </div>

        {/* Completion warning */}
        {!completion.complete && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gold-lt/50 dark:bg-yellow-950/20 border border-gold/30">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-yellow-700 dark:text-yellow-400 flex-shrink-0">
              <path d="M7 1l6 10.5H1L7 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M7 5.5v2M7 9h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
              {completion.scored}/{completion.total_objectives} confirmed — unconfirmed use AI scores
            </p>
          </div>
        )}

        {/* Score overview */}
        <div className="flex items-center gap-4">
          <ProgressRing
            value={scorecard.total_max > 0 ? scorecard.total_score / scorecard.total_max : 0}
            size={64}
            strokeWidth={4}
            label={`${Math.round(scorecard.percentage)}%`}
            sublabel={tierLabel}
            color="var(--color-royal)"
          />
          <div>
            <div className="text-2xl font-bold font-mono text-ink dark:text-white">
              {scorecard.total_score}<span className="text-sm text-ink-subtle dark:text-slate-300 font-normal">/{scorecard.total_max}</span>
            </div>
            <p className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5">{tierLabel}</p>
          </div>
        </div>

        {/* Section breakdown */}
        <div className="space-y-3">
          {([
            { key: 'essential_design' as const, label: 'Essential Design' },
            { key: 'advanced_design' as const, label: 'Advanced Design' },
            { key: 'course_delivery' as const, label: 'Course Delivery' },
          ]).map(({ key, label }) => {
            const section = scorecard[key]
            const pct = section.max > 0 ? (section.subtotal / section.max) * 100 : 0
            return (
              <div key={key} className="p-3 border border-mist dark:border-border-dark rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-ink-muted dark:text-slate-300">{label}</span>
                  <span className="text-sm font-bold font-mono text-ink dark:text-white">
                    {section.subtotal}/{section.max}
                  </span>
                </div>
                <div className="h-1.5 bg-mist dark:bg-border-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-royal rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {dashboardData?.status === 'finalized' && reviewId && (
            <button
              onClick={() => downloadFinalizedPdf(reviewId).catch((e) => toast.error(e.message))}
              className="w-full px-4 py-3 rounded-lg bg-pgreen hover:bg-emerald-600 text-white text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14h8a1 1 0 001-1V5l-4-4H4a1 1 0 00-1 1v11a1 1 0 001 1z"/>
                <path d="M9 1v4h4"/>
              </svg>
              Download Finalized PDF
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="w-full px-4 py-3 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h8a1 1 0 001-1V5l-4-4H4a1 1 0 00-1 1v11a1 1 0 001 1z"/>
              <path d="M9 1v4h4"/>
            </svg>
            Download PDF Scorecard
          </button>
          <button
            onClick={downloadEssentials}
            disabled={essentialsLoading}
            className="w-full px-4 py-3 rounded-lg border-2 border-royal text-royal hover:bg-royal hover:text-white text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M5 7l3 3 3-3M3 12h10"/>
            </svg>
            {essentialsLoading ? 'Fetching E1–E20...' : 'Download Essentials (E1–E20)'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={copyJSON}
              className="flex-1 px-4 py-2 rounded-lg border border-mist dark:border-border-dark text-xs font-medium text-ink-muted dark:text-slate-300 hover:border-royal hover:text-ink dark:hover:text-white transition-all"
            >
              {copiedJSON ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={downloadJSON}
              className="flex-1 px-4 py-2 rounded-lg border border-mist dark:border-border-dark text-xs font-medium text-ink-muted dark:text-slate-300 hover:border-royal hover:text-ink dark:hover:text-white transition-all"
            >
              Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
