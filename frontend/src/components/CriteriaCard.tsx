import { useState } from 'react'
import type { CriterionVerdict } from '../types/api'

interface Props {
  tier: 'Exemplary' | 'Accomplished' | 'Developing'
  criteria: CriterionVerdict[]
  score: number
}

const TIER_STYLES = {
  Exemplary: {
    border: 'border-l-pblue',
    header: 'text-pblue dark:text-blue-400',
    badge: 'bg-pblue-lt dark:bg-blue-950/30 text-pblue dark:text-blue-400',
    bg: 'bg-pblue/[0.015] dark:bg-blue-950/[0.08]',
  },
  Accomplished: {
    border: 'border-l-gold',
    header: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-gold-lt dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
    bg: 'bg-gold/[0.015] dark:bg-yellow-950/[0.08]',
  },
  Developing: {
    border: 'border-l-bronze',
    header: 'text-bronze dark:text-red-400',
    badge: 'bg-bronze-lt dark:bg-red-950/30 text-bronze dark:text-red-400',
    bg: 'bg-bronze/[0.015] dark:bg-red-950/[0.08]',
  },
}

function isMet(met: CriterionVerdict['met']): 'met' | 'not_met' | 'unknown' {
  if (met === true || met === 'MET') return 'met'
  if (met === false || met === 'NOT_MET') return 'not_met'
  return 'unknown'
}

function MetIcon({ status }: { status: 'met' | 'not_met' | 'unknown' }) {
  if (status === 'met') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-pgreen dark:text-green-400 flex-shrink-0">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <path d="M5.5 9.5L8 12L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'not_met') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-pred dark:text-red-400 flex-shrink-0">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-ink-subtle dark:text-slate-300 flex-shrink-0">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <path d="M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function CriteriaCard({ tier, criteria, score }: Props) {
  if (!criteria.length) return null
  const style = TIER_STYLES[tier]
  const metCount = criteria.filter((c) => isMet(c.met) === 'met').length

  return (
    <div className={`border-l-4 ${style.border} rounded-r-xl ${style.bg} border border-mist dark:border-border-dark overflow-hidden shadow-[var(--shadow-card)]`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-mist/60 dark:border-border-dark/60">
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${style.header}`}>
            {tier}
          </span>
          <span className="text-[10px] font-medium text-ink-subtle dark:text-slate-300">
            {metCount}/{criteria.length} met
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${style.badge}`}>
          {score}
        </span>
      </div>

      {/* Criteria list */}
      <div className="p-5 space-y-4">
        {criteria.map((c, i) => {
          const status = isMet(c.met)
          return <CriterionRow key={i} criterion={c} status={status} />
        })}
      </div>
    </div>
  )
}

function CriterionRow({ criterion: c, status }: { criterion: CriterionVerdict; status: 'met' | 'not_met' | 'unknown' }) {
  const [expanded, setExpanded] = useState(false)
  const hasLongEvidence = c.evidence && c.evidence.length > 150

  return (
    <div className="flex gap-3">
      <div className="mt-0.5">
        <MetIcon status={status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-relaxed text-ink dark:text-white/90">
          {c.criterion || c.text}
        </p>
        {c.evidence && (
          <div className="mt-2">
            <p className={`text-sm text-ink-muted dark:text-slate-300 pl-3 border-l-2 border-mist dark:border-border-dark ${!expanded && hasLongEvidence ? 'line-clamp-2' : ''}`}>
              {c.evidence}
            </p>
            {hasLongEvidence && (
              <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                className="text-xs font-medium text-royal dark:text-blue-400 mt-1 ml-3 hover:underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
