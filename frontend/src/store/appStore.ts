import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Log } from '../lib/logger'
import type { ObjectiveRow, DashboardData } from '../types/api'

export type SortMode = 'scorecard' | 'priority'

interface AppState {
  courseId: string | null
  courseName: string | null
  reviewId: string | null
  allObjectives: ObjectiveRow[]
  dashboardData: DashboardData | null
  selectedObjId: string | null
  triageIds: string[]
  exportPanelOpen: boolean
  sortMode: SortMode

  setCourseId: (id: string) => void
  setCourseName: (name: string) => void
  setReviewId: (rid: string) => void
  setObjectives: (objs: ObjectiveRow[]) => void
  setDashboardData: (data: DashboardData) => void
  selectObjective: (objId: string | null) => void
  selectNextUnconfirmed: () => void
  setTriageIds: (ids: string[]) => void
  updateObjectiveScore: (objId: string, score: number, rationale: string) => void
  toggleExportPanel: () => void
  setSortMode: (mode: SortMode) => void
  confirmedCount: () => number
  reset: () => void
}

function getPriorityOrder(objectives: ObjectiveRow[], triageIds: string[]): ObjectiveRow[] {
  const triageSet = new Set(triageIds)
  const triage = objectives.filter((o) => !o.confirmed && triageSet.has(o.obj_id))
  const review = objectives.filter((o) => !o.confirmed && !triageSet.has(o.obj_id))
  return [...triage, ...review]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      courseId: null,
      courseName: null,
      reviewId: null,
      allObjectives: [],
      dashboardData: null,
      selectedObjId: null,
      triageIds: [],
      exportPanelOpen: false,
      sortMode: 'priority',

      setCourseId: (id) => {
        Log.state('Course ID set', id)
        set({ courseId: id })
      },

      setCourseName: (name) => {
        set({ courseName: name })
      },

      setReviewId: (rid) => {
        Log.state('Review ID set', rid)
        set({ reviewId: rid })
      },

      setObjectives: (objs) => {
        Log.state('Objectives loaded', { count: objs.length })
        set({ allObjectives: objs })
      },

      setDashboardData: (data) => {
        Log.state('Dashboard data set', { course: data.course_name })
        set({ dashboardData: data })
      },

      selectObjective: (objId) => {
        Log.state('Selected objective →', objId)
        set({ selectedObjId: objId })
      },

      selectNextUnconfirmed: () => {
        const { allObjectives, triageIds, selectedObjId } = get()
        const queue = getPriorityOrder(allObjectives, triageIds)
        if (queue.length === 0) {
          Log.state('All confirmed, no next objective')
          set({ selectedObjId: null })
          return
        }
        const currentIdx = queue.findIndex((o) => o.obj_id === selectedObjId)
        const next = currentIdx >= 0 && currentIdx < queue.length - 1
          ? queue[currentIdx + 1]
          : queue[0]
        Log.state('Auto-advance →', next.obj_id)
        set({ selectedObjId: next.obj_id })
      },

      setTriageIds: (ids) => {
        Log.state('Triage IDs set', { count: ids.length })
        set({ triageIds: ids })
      },

      updateObjectiveScore: (objId, score, rationale) => {
        Log.state('Score updated locally', { objId, score })
        set((s) => ({
          allObjectives: s.allObjectives.map((o) =>
            o.obj_id === objId
              ? { ...o, human_score: score, human_rationale: rationale, confirmed: true }
              : o
          ),
        }))
      },

      toggleExportPanel: () => {
        set((s) => ({ exportPanelOpen: !s.exportPanelOpen }))
      },

      setSortMode: (mode) => {
        Log.ui('Sort mode →', mode)
        set({ sortMode: mode })
      },

      confirmedCount: () => {
        return get().allObjectives.filter((o) => o.confirmed).length
      },

      reset: () => {
        Log.state('App reset')
        set({
          courseId: null,
          courseName: null,
          reviewId: null,
          allObjectives: [],
          dashboardData: null,
          selectedObjId: null,
          triageIds: [],
          exportPanelOpen: false,
          sortMode: 'priority',
        })
      },
    }),
    {
      name: 'qa-app-state-v3',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          Log.storage('READ', name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          Log.storage('SAVE', name)
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          Log.storage('REMOVE', name)
          sessionStorage.removeItem(name)
        },
      },
      partialize: (state) => ({
        courseId: state.courseId,
        courseName: state.courseName,
        reviewId: state.reviewId,
        allObjectives: state.allObjectives,
        dashboardData: state.dashboardData,
        selectedObjId: state.selectedObjId,
        triageIds: state.triageIds,
        sortMode: state.sortMode,
      }) as unknown as AppState,
      merge: (persisted, current) => {
        const p = persisted as unknown as Partial<AppState>
        const sortMode = p.sortMode === 'scorecard' ? 'scorecard' : 'priority'
        return { ...current, ...p, sortMode }
      },
    }
  )
)
