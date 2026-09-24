import { useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../store/appStore'
import { useObjectiveGroups } from '../hooks/useObjectiveGroups'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { api } from '../lib/api'
import TopBar from '../components/workspace/TopBar'
import ObjectiveList from '../components/workspace/ObjectiveList'
import ObjectiveDetail from '../components/workspace/ObjectiveDetail'
import ExportPanel from '../components/workspace/ExportPanel'
import KeyboardHelpModal from '../components/KeyboardHelpModal'

export default function WorkspaceScreen() {
  const reviewId = useAppStore((s) => s.reviewId)
  const selectedObjId = useAppStore((s) => s.selectedObjId)
  const allObjectives = useAppStore((s) => s.allObjectives)
  const selectObjective = useAppStore((s) => s.selectObjective)
  const toggleExportPanel = useAppStore((s) => s.toggleExportPanel)
  const exportPanelOpen = useAppStore((s) => s.exportPanelOpen)
  const groups = useObjectiveGroups()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [showHelp, setShowHelp] = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)

  useQuery({
    queryKey: ['dashboard', reviewId],
    queryFn: () => api.getDashboard(reviewId!),
    enabled: !!reviewId,
    staleTime: 30_000,
  })

  // Auto-select first item on mount
  useEffect(() => {
    if (selectedObjId || allObjectives.length === 0) return
    const firstGroup = groups.find((g) => g.items.length > 0)
    if (firstGroup) selectObjective(firstGroup.items[0].obj_id)
  }, [allObjectives.length])

  // On mobile: show detail when an objective is selected
  useEffect(() => {
    if (!isDesktop && selectedObjId) {
      setMobileShowDetail(true)
    }
  }, [selectedObjId, isDesktop])

  const navigateList = useCallback((direction: -1 | 1) => {
    const all = groups.flatMap((g) => g.items)
    if (all.length === 0) return

    const currentIdx = all.findIndex((o) => o.obj_id === selectedObjId)
    const nextIdx = Math.max(0, Math.min(all.length - 1, currentIdx + direction))
    selectObjective(all[nextIdx].obj_id)
  }, [groups, selectedObjId, selectObjective])

  useKeyboardShortcuts({
    navPrev: () => navigateList(-1),
    navNext: () => navigateList(1),
    toggleExport: toggleExportPanel,
    toggleHelp: () => setShowHelp((v) => !v),
  })

  // Mobile: stacked layout
  if (!isDesktop) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TopBar />
        {exportPanelOpen ? (
          <ExportPanel />
        ) : mobileShowDetail && selectedObjId ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <button
              onClick={() => setMobileShowDetail(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-royal border-b border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 2L4 6l4 4"/>
              </svg>
              Back to list
            </button>
            <ObjectiveDetail />
          </div>
        ) : (
          <ObjectiveList />
        )}
        {showHelp && <KeyboardHelpModal onClose={() => setShowHelp(false)} />}
      </div>
    )
  }

  // Desktop: split-pane
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-[350px] min-w-[280px] border-r border-mist dark:border-border-dark flex flex-col bg-surface dark:bg-ink overflow-hidden">
          <ObjectiveList />
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface-raised dark:bg-card-dark">
          {exportPanelOpen ? <ExportPanel /> : <ObjectiveDetail />}
        </div>
      </div>
      {showHelp && <KeyboardHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
