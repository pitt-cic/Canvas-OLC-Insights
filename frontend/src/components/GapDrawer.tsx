import { useState } from 'react'
import type { ContentGap } from '../types/api'

interface Props {
  gaps: ContentGap[]
}

export default function GapDrawer({ gaps }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gold/30 dark:border-yellow-800/50 bg-gold-lt/30 dark:bg-yellow-950/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gold-lt/50 dark:hover:bg-yellow-950/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-yellow-700 dark:text-yellow-400">
            <path d="M8 1.5l6.5 11.25H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
            Content gaps
          </span>
          <span className="text-xs font-mono font-bold text-yellow-700/60 dark:text-yellow-400/60 bg-gold-lt dark:bg-yellow-950/40 px-1.5 py-0.5 rounded">
            {gaps.length}
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`text-yellow-700 dark:text-yellow-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3.5 5.5L7 9l3.5-3.5"/>
        </svg>
      </button>

      <div className={`drawer-content ${open ? 'open' : ''}`}>
        <div>
          <div className="px-5 pb-4 pt-1 border-t border-gold/20 dark:border-yellow-800/30 space-y-2">
            {gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-surface-raised dark:bg-card-dark rounded-lg border border-mist/50 dark:border-border-dark/50">
                <span className="text-[10px] font-bold uppercase text-yellow-700 dark:text-yellow-400 bg-gold-lt dark:bg-yellow-950/40 px-1.5 py-0.5 rounded flex-shrink-0">
                  {gap.type?.replace(/_/g, ' ') || 'gap'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink dark:text-white truncate">
                    {gap.url ? (
                      <a href={gap.url} target="_blank" rel="noopener noreferrer" className="hover:text-royal dark:hover:text-blue-400 underline decoration-mist hover:decoration-royal">
                        {gap.name}
                      </a>
                    ) : (
                      gap.name
                    )}
                  </div>
                  {gap.context && (
                    <p className="text-[11px] text-ink-subtle dark:text-slate-300 mt-0.5">{gap.context}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
