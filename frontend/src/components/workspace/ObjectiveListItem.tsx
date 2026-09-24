import { memo } from 'react'
import type { ObjectiveRow } from '../../types/api'
import { SCORE_COLORS } from '../../lib/constants'

interface Props {
  objective: ObjectiveRow
  isSelected: boolean
  isTriage: boolean
  onClick: () => void
}

export const ObjectiveListItem = memo(function ObjectiveListItem({
  objective,
  isSelected,
  isTriage,
  onClick,
}: Props) {
  const score = objective.confirmed ? objective.human_score : objective.proposed_score
  const scoreColor = score != null ? SCORE_COLORS[score as 0 | 1 | 2] : null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 rounded-lg transition-all group ${
        isSelected
          ? 'bg-royal/8 dark:bg-royal/15 border-l-[3px] border-l-royal pl-[9px]'
          : 'hover:bg-surface-sunken dark:hover:bg-surface-raised-dark border-l-[3px] border-l-transparent pl-[9px]'
      }`}
      aria-selected={isSelected}
      role="option"
    >
      {/* Obj ID badge */}
      <span className={`flex-shrink-0 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded mt-0.5 ${
        scoreColor ? `${scoreColor.bg} ${scoreColor.text}` : 'bg-mist dark:bg-border-dark text-ink-subtle'
      }`}>
        {objective.obj_id}
      </span>

      {/* Title + section — full text wraps, no truncation */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink dark:text-white leading-snug">
          {objective.title || objective.obj_id}
        </div>
        <div className="text-[11px] text-ink-subtle dark:text-slate-300 mt-1 flex items-center gap-1.5">
          <span>{objective.section.replace(' Design', '').replace('Course ', '')}</span>
          {isTriage && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
          )}
          {isTriage && (
            <span className="sr-only">Needs review</span>
          )}
          {objective.human_judgment && (
            <span className="text-gold">Human</span>
          )}
          {objective.confirmed && (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-pgreen flex-shrink-0" aria-hidden="true">
                <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="sr-only">Confirmed</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}, (prev, next) =>
  prev.objective.obj_id === next.objective.obj_id &&
  prev.objective.confirmed === next.objective.confirmed &&
  prev.objective.human_score === next.objective.human_score &&
  prev.isSelected === next.isSelected
)
