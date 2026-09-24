import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useObjectiveDetail } from '../../hooks/useObjectiveDetail'
import { useConfirmScore } from '../../hooks/useConfirmScore'
import AnalysisSection from '../AnalysisSection'
import CriteriaCard from '../CriteriaCard'
import GapDrawer from '../GapDrawer'
import ScoreActions from './ScoreActions'

export default function ObjectiveDetail() {
  const selectedObjId = useAppStore((s) => s.selectedObjId)
  const { data: detail, isLoading, error, refetch } = useObjectiveDetail(selectedObjId)
  const confirmMutation = useConfirmScore()
  const rationaleRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [rationale, setRationale] = useState('')

  useEffect(() => {
    if (detail) {
      setSelectedScore(detail.confirmed ? (detail.human_score ?? detail.proposed_score) : detail.proposed_score)
      setRationale(detail.human_rationale || '')
    }
  }, [detail])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedObjId])

  const handleConfirm = () => {
    if (selectedScore === null || !selectedObjId) return
    confirmMutation.mutate({ objId: selectedObjId, score: selectedScore, rationale })
  }

  if (!selectedObjId) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-subtle dark:text-slate-300">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 opacity-30">
            <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M6 18h36M18 18v20" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <p className="text-sm">Select an objective from the list</p>
          <p className="text-xs mt-1">Use <kbd className="px-1 py-0.5 bg-mist dark:bg-border-dark rounded font-mono">↑↓</kbd> keys to navigate</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-6 bg-mist dark:bg-border-dark rounded w-2/3" />
          <div className="h-4 bg-mist dark:bg-border-dark rounded w-1/3" />
          <div className="h-40 bg-mist dark:bg-border-dark rounded-xl" />
          <div className="h-32 bg-mist dark:bg-border-dark rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-pred">Failed to load objective details</p>
          <p className="text-xs text-ink-subtle dark:text-slate-300 mt-1">{error?.message || 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-royal hover:bg-medium text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const accomplishedCriteria = detail.accomplished_criteria || []
  const exemplaryCriteria = detail.exemplary_criteria || []

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold font-mono px-2 py-1 bg-royal/10 dark:bg-royal/20 text-royal dark:text-blue-400 rounded">
              {detail.obj_id}
            </span>
            <span className="text-[11px] text-ink-subtle dark:text-slate-300">{detail.section}</span>
            {detail.optional && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-mist dark:bg-border-dark text-ink-subtle dark:text-slate-300 rounded">
                Optional
              </span>
            )}
            {detail.human_judgment_required && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gold-lt dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 rounded">
                Human judgment
              </span>
            )}
            {detail.tool_required && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-pblue-lt dark:bg-blue-950/30 text-pblue dark:text-blue-400 rounded">
                Tool required
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-ink dark:text-white leading-tight">
            {detail.title}
          </h2>
        </div>

        {/* Error banner */}
        {detail.error && (
          <div className="mb-4 p-3 rounded-lg bg-pred-lt dark:bg-red-950/30 border border-pred/20 dark:border-red-800/30">
            <p className="text-sm text-pred dark:text-red-400 font-medium">
              AI extraction encountered an error
            </p>
            {detail.error_detail && (
              <p className="text-xs text-ink-muted dark:text-slate-300 mt-1">{detail.error_detail}</p>
            )}
          </div>
        )}

        {/* Tool/API notes */}
        {detail.tool_message && (
          <div className="mb-4 p-3 rounded-lg bg-pblue-lt dark:bg-blue-950/20 border border-pblue/20 dark:border-blue-800/30">
            <p className="text-sm text-ink-muted dark:text-slate-300">{detail.tool_message}</p>
          </div>
        )}
        {detail.api_note && (
          <div className="mb-4 p-3 rounded-lg bg-surface-sunken dark:bg-surface-sunken-dark border border-mist dark:border-border-dark">
            <p className="text-sm text-ink-muted dark:text-slate-300">{detail.api_note}</p>
          </div>
        )}

        {/* Where to look */}
        {detail.where_to_look && detail.where_to_look.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-ink-subtle dark:text-slate-300 tracking-wider mr-1">Sources:</span>
            {detail.where_to_look.map((src, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 bg-surface-sunken dark:bg-surface-sunken-dark border border-mist dark:border-border-dark rounded-full text-ink-muted dark:text-slate-300">
                {src}
              </span>
            ))}
          </div>
        )}

        {/* AI Analysis */}
        <div className="space-y-4">
          <AnalysisSection detail={detail} />

          {/* Criteria */}
          {accomplishedCriteria.length > 0 && (
            <CriteriaCard tier="Accomplished" criteria={accomplishedCriteria} score={1} />
          )}
          {exemplaryCriteria.length > 0 && (
            <CriteriaCard tier="Exemplary" criteria={exemplaryCriteria} score={2} />
          )}

          {/* Content gaps */}
          {detail.content_gaps?.length > 0 && (
            <GapDrawer gaps={detail.content_gaps} />
          )}

          {/* Improvement suggestions */}
          {detail.improvement_suggestions && (
            <SuggestionBox text={detail.improvement_suggestions} />
          )}
        </div>

        {/* Score actions */}
        <ScoreActions
          selectedScore={selectedScore}
          onPickScore={setSelectedScore}
          rationale={rationale}
          onRationaleChange={setRationale}
          rationaleRef={rationaleRef}
          onConfirm={handleConfirm}
          isSaving={confirmMutation.isPending}
          aiScore={detail.proposed_score}
          isConfirmed={detail.confirmed ?? false}
        />
      </div>
    </div>
  )
}


function SuggestionBox({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n').filter((l) => l.trim())

  const parsed = lines.map((line) => {
    const cleaned = line.replace(/^[-•*]\s*|^\d+[.)]\s*/, '').trim()
    const boldMatch = cleaned.match(/^(?:\*\*(.+?)\*\*[:\s]*|([^:]{3,40}):\s)(.+)$/)
    if (boldMatch) {
      return { heading: boldMatch[1] || boldMatch[2], body: boldMatch[3] }
    }
    return { heading: null, body: cleaned }
  })

  const isCollapsible = parsed.length > 4
  const visibleItems = !expanded && isCollapsible ? parsed.slice(0, 3) : parsed

  return (
    <div className="rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 dark:from-amber-950/20 dark:to-yellow-950/10">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Suggestions for Improvement
        </span>
        {isCollapsible && (
          <span className="ml-auto text-[10px] font-medium text-amber-600/70 dark:text-amber-400/60">
            {parsed.length} items
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        <ul className="space-y-3">
          {visibleItems.map((item, i) => (
            <li key={i} className="flex gap-3 group">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200/60 dark:bg-amber-800/30 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{i + 1}</span>
              </span>
              <div className="flex-1 min-w-0">
                {item.heading ? (
                  <>
                    <p className="text-sm font-semibold text-ink dark:text-white leading-snug">{item.heading}</p>
                    <p className="text-sm text-ink-muted dark:text-slate-300 leading-relaxed mt-0.5">{item.body}</p>
                  </>
                ) : (
                  <p className="text-sm text-ink dark:text-slate-200 leading-relaxed">{item.body}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {isCollapsible && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Show less' : `Show ${parsed.length - 3} more`}
          </button>
        )}
      </div>
    </div>
  )
}
