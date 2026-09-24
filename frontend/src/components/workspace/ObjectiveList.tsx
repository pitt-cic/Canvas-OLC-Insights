import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useObjectiveGroups } from '../../hooks/useObjectiveGroups'
import { ObjectiveListItem } from './ObjectiveListItem'
import type { ObjectiveRow } from '../../types/api'

interface GroupProps {
  title: string
  count: number
  accent: string
  items: ObjectiveRow[]
  selectedId: string | null
  triageIds: Set<string>
  onSelect: (id: string) => void
  defaultCollapsed?: boolean
}

function ObjectiveGroup({ title, count, accent, items, selectedId, triageIds, onSelect, defaultCollapsed = false }: GroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (items.length === 0 && defaultCollapsed) return null

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-sunken/50 dark:hover:bg-surface-raised-dark/50 rounded-lg transition-colors"
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-ink-subtle dark:text-slate-300 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        >
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
          {title}
        </span>
        <span className="text-[11px] font-mono text-ink-subtle dark:text-slate-300 bg-mist dark:bg-border-dark px-1.5 py-0.5 rounded">
          {count}
        </span>
      </button>

      {!collapsed && items.length > 0 && (
        <div className="mt-0.5 space-y-0.5 pl-1" role="listbox" aria-label={title}>
          {items.map((obj) => (
            <ObjectiveListItem
              key={obj.obj_id}
              objective={obj}
              isSelected={obj.obj_id === selectedId}
              isTriage={triageIds.has(obj.obj_id)}
              onClick={() => onSelect(obj.obj_id)}
            />
          ))}
        </div>
      )}

      {!collapsed && items.length === 0 && (
        <div className="px-4 py-3 text-xs text-ink-subtle dark:text-slate-300 italic">
          {title === 'Confirmed' ? 'No objectives confirmed yet' : 'All clear — nothing needs attention'}
        </div>
      )}
    </div>
  )
}

function SortToggle() {
  const sortMode = useAppStore((s) => s.sortMode)
  const setSortMode = useAppStore((s) => s.setSortMode)

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-mist dark:border-border-dark">
      <ToggleButton
        active={sortMode === 'priority'}
        onClick={() => setSortMode('priority')}
        label="Priority"
      />
      <ToggleButton
        active={sortMode === 'scorecard'}
        onClick={() => setSortMode('scorecard')}
        label="Scorecard"
      />
    </div>
  )
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
        active
          ? 'bg-royal text-white shadow-sm'
          : 'text-ink-subtle dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark'
      }`}
    >
      {label}
    </button>
  )
}

export default function ObjectiveList() {
  const groups = useObjectiveGroups()
  const selectedObjId = useAppStore((s) => s.selectedObjId)
  const triageIds = useAppStore((s) => s.triageIds)
  const selectObjective = useAppStore((s) => s.selectObjective)
  const triageSet = new Set(triageIds)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedObjId || !listRef.current) return
    const el = listRef.current.querySelector(`[aria-selected="true"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedObjId])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SortToggle />
      <nav
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1"
        aria-label="Objective list"
      >
        {groups.map((group) => (
          <ObjectiveGroup
            key={group.key}
            title={group.title}
            count={group.items.length}
            accent={group.accent}
            items={group.items}
            selectedId={selectedObjId}
            triageIds={triageSet}
            onSelect={selectObjective}
            defaultCollapsed={group.defaultCollapsed}
          />
        ))}
      </nav>
    </div>
  )
}
