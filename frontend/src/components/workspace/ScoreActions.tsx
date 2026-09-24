import type { RefObject } from 'react'
import { SCORE_LABELS } from '../../lib/constants'

interface Props {
  selectedScore: number | null
  onPickScore: (score: number) => void
  rationale: string
  onRationaleChange: (val: string) => void
  rationaleRef: RefObject<HTMLTextAreaElement | null>
  onConfirm: () => void
  isSaving: boolean
  aiScore: number | null
  isConfirmed: boolean
}

export default function ScoreActions({
  selectedScore,
  onPickScore,
  rationale,
  onRationaleChange,
  rationaleRef,
  onConfirm,
  isSaving,
  aiScore,
  isConfirmed,
}: Props) {
  const isOverride = selectedScore !== null && aiScore !== null && selectedScore !== aiScore

  return (
    <div className="sticky bottom-0 bg-surface-raised/95 dark:bg-card-dark/95 backdrop-blur-xl border-t border-mist dark:border-border-dark p-4 -mx-6 -mb-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink dark:text-white">Score</span>
          {isConfirmed && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-pgreen">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Confirmed
            </span>
          )}
          {isOverride && (
            <span className="text-[11px] font-medium text-gold px-1.5 py-0.5 rounded bg-gold-lt dark:bg-yellow-950/30">
              Override
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {aiScore != null && (
            <span className="text-xs text-ink-subtle dark:text-slate-300">
              AI suggests: {SCORE_LABELS[aiScore]}
            </span>
          )}
        </div>
      </div>

      {/* Score buttons + confirm */}
      <div className="flex items-center gap-2 mb-3">
        {[0, 1, 2].map((score) => {
          const isSelected = selectedScore === score
          const isAi = aiScore === score
          const colors =
            score === 0
              ? isSelected ? 'border-bronze bg-bronze-lt dark:bg-red-950/40 shadow-sm' : 'border-mist dark:border-border-dark hover:border-bronze/50'
              : score === 1
                ? isSelected ? 'border-gold bg-gold-lt dark:bg-yellow-950/40 shadow-sm' : 'border-mist dark:border-border-dark hover:border-gold/50'
                : isSelected ? 'border-pblue bg-pblue-lt dark:bg-blue-950/40 shadow-sm' : 'border-mist dark:border-border-dark hover:border-pblue/50'

          return (
            <button
              key={score}
              onClick={() => onPickScore(score)}
              className={`relative flex-1 py-2.5 rounded-lg border-2 transition-all text-center ${colors} hover:scale-[1.02] active:scale-[0.97]`}
              aria-pressed={isSelected}
            >
              <div className="text-base font-bold font-mono text-ink dark:text-white">{score}</div>
              <div className="text-[10px] text-ink-muted dark:text-slate-300">{SCORE_LABELS[score]}</div>
              {isAi && !isSelected && (
                <span className="absolute -top-1.5 -right-1.5 text-[7px] font-bold bg-royal text-white px-1 py-0.5 rounded-full leading-none">
                  AI
                </span>
              )}
            </button>
          )
        })}

        <button
          onClick={onConfirm}
          disabled={isSaving || selectedScore === null}
          className="px-5 py-2.5 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98] ml-2"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
              </svg>
            </span>
          ) : isConfirmed ? 'Update' : 'Confirm'}
        </button>
      </div>

      {/* Rationale */}
      <textarea
        ref={rationaleRef}
        value={rationale}
        onChange={(e) => onRationaleChange(e.target.value)}
        placeholder="Rationale (optional)"
        aria-label="Score rationale (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-lg border border-mist dark:border-border-dark bg-surface dark:bg-ink text-ink dark:text-white placeholder:text-ink-subtle/50 resize-none outline-none focus:border-royal focus:ring-2 focus:ring-royal/10 transition-shadow"
      />

      <div className="mt-2 text-[10px] text-ink-subtle/60 dark:text-slate-400/60 text-center">
        Press <kbd className="px-1 py-0.5 bg-mist dark:bg-border-dark rounded text-[9px] font-mono">0</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-mist dark:bg-border-dark rounded text-[9px] font-mono">1</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-mist dark:bg-border-dark rounded text-[9px] font-mono">2</kbd>{' '}
        to score, <kbd className="px-1 py-0.5 bg-mist dark:bg-border-dark rounded text-[9px] font-mono">⌘+Enter</kbd> to confirm
      </div>
    </div>
  )
}
