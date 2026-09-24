import { useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import type { ObjectiveRow } from '../types/api'

export interface ObjectiveGroup {
  key: string
  title: string
  accent: string
  items: ObjectiveRow[]
  defaultCollapsed?: boolean
}

function parseObjNum(objId: string): number {
  return parseInt(objId.replace(/^[A-Z]+/, ''), 10) || 0
}

export function useObjectiveGroups(): ObjectiveGroup[] {
  const allObjectives = useAppStore((s) => s.allObjectives)
  const triageIds = useAppStore((s) => s.triageIds)
  const sortMode = useAppStore((s) => s.sortMode)

  return useMemo(() => {
    if (sortMode === 'scorecard') {
      const essential: ObjectiveRow[] = []
      const advanced: ObjectiveRow[] = []
      const delivery: ObjectiveRow[] = []

      for (const obj of allObjectives) {
        if (obj.section === 'Essential Design') essential.push(obj)
        else if (obj.section === 'Advanced Design') advanced.push(obj)
        else delivery.push(obj)
      }

      essential.sort((a, b) => parseObjNum(a.obj_id) - parseObjNum(b.obj_id))
      advanced.sort((a, b) => parseObjNum(a.obj_id) - parseObjNum(b.obj_id))
      delivery.sort((a, b) => parseObjNum(a.obj_id) - parseObjNum(b.obj_id))

      return [
        { key: 'essential', title: 'Essential Design', accent: 'text-royal dark:text-blue-400', items: essential },
        { key: 'advanced', title: 'Advanced Design', accent: 'text-ink-muted dark:text-slate-300', items: advanced },
        { key: 'delivery', title: 'Course Delivery', accent: 'text-bronze dark:text-orange-400', items: delivery },
      ]
    }

    // Priority mode
    const triageSet = new Set(triageIds)
    const needsAttention: ObjectiveRow[] = []
    const review: ObjectiveRow[] = []
    const confirmed: ObjectiveRow[] = []

    for (const obj of allObjectives) {
      if (obj.confirmed) {
        confirmed.push(obj)
      } else if (triageSet.has(obj.obj_id)) {
        needsAttention.push(obj)
      } else {
        review.push(obj)
      }
    }

    return [
      { key: 'attention', title: 'Needs Attention', accent: 'text-gold dark:text-yellow-400', items: needsAttention },
      { key: 'review', title: 'Review', accent: 'text-ink-muted dark:text-slate-300', items: review },
      { key: 'confirmed', title: 'Confirmed', accent: 'text-pgreen dark:text-green-400', items: confirmed, defaultCollapsed: true },
    ]
  }, [allObjectives, triageIds, sortMode])
}
