import type { ObjectiveDetail } from '../types/api'
import { SCORE_LABELS } from '../lib/constants'

interface Props {
  detail: ObjectiveDetail
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-pgreen-lt dark:bg-green-950/30 text-pgreen dark:text-green-400',
  medium: 'bg-gold-lt dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
  low: 'bg-pred-lt dark:bg-red-950/30 text-pred dark:text-red-400',
}

const PATTERN_LABELS: Record<string, string> = {
  AGENTIC: 'AI Analyzed',
  PRE_FETCH: 'Syllabus + Module 0',
  STRUCTURAL: 'Structural',
  HUMAN_JUDGMENT: 'Human Judgment',
  TOOL_REQUIRED: 'Tool Required',
  FULL_HUMAN: 'Full Human',
  PARTIAL_API: 'Partial API',
}

export default function AnalysisSection({ detail }: Props) {
  if (!detail.reasoning && !detail.key_findings?.length) return null

  const score = detail.proposed_score
  const label = score != null ? SCORE_LABELS[score] : 'Not scored'

  const badgeColor =
    score === 2
      ? 'bg-pblue-lt dark:bg-blue-950/40 text-pblue dark:text-blue-400 border-pblue/20 dark:border-blue-800'
      : score === 1
        ? 'bg-gold-lt dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-gold/20 dark:border-yellow-800'
        : 'bg-bronze-lt dark:bg-red-950/40 text-bronze dark:text-red-400 border-bronze/20 dark:border-red-800'

  const confidenceStyle = detail.confidence ? CONFIDENCE_STYLES[detail.confidence] : null
  const patternLabel = detail.pattern ? PATTERN_LABELS[detail.pattern] || detail.pattern : null

  return (
    <div className="border border-mist dark:border-border-dark rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-surface-sunken dark:bg-surface-sunken-dark border-b border-mist dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle dark:text-slate-300">AI Analysis</span>
          {patternLabel && (
            <span className="text-[10px] font-medium text-ink-subtle dark:text-slate-300 px-1.5 py-0.5 rounded bg-mist/50 dark:bg-border-dark">
              {patternLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {confidenceStyle && detail.confidence !== 'none' && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${confidenceStyle}`}>
              {detail.confidence} conf.
            </span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${badgeColor}`}>
            {label}
          </span>
        </div>
      </div>
      <div className="px-5 py-5">
        {detail.reasoning && (
          <div className="prose-review text-ink dark:text-white/90 mb-5">{detail.reasoning}</div>
        )}
        {detail.key_findings?.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle dark:text-slate-300">Key findings</div>
            {detail.key_findings.map((f, i) => (
              <div key={i} className="flex gap-3 text-sm text-ink-muted dark:text-slate-300">
                <span className="font-mono text-xs text-ink-subtle/60 dark:text-slate-400/60 mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
