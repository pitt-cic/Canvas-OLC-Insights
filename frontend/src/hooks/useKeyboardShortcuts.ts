import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Log } from '../lib/logger'

interface ShortcutActions {
  pickScore?: (score: number) => void
  confirmScore?: () => void
  navPrev?: () => void
  navNext?: () => void
  toggleExport?: () => void
  toggleHelp?: () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const { pathname } = useLocation()
  const isWorkspace = pathname.endsWith('/workspace')

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const inInput = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        Log.ui('Keyboard: confirm')
        e.preventDefault()
        actions.confirmScore?.()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        Log.ui('Keyboard: save')
        e.preventDefault()
        actions.confirmScore?.()
        return
      }

      if (inInput) return

      if (e.key === 'Escape') {
        Log.ui('Keyboard: Esc')
        const { exportPanelOpen, toggleExportPanel } = useAppStore.getState()
        if (exportPanelOpen) {
          toggleExportPanel()
        }
        return
      }

      if (!isWorkspace) return

      if (e.key === '0' || e.key === '1' || e.key === '2') {
        Log.ui('Keyboard: score', e.key)
        actions.pickScore?.(parseInt(e.key))
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'k') {
        Log.ui('Keyboard: prev')
        e.preventDefault()
        actions.navPrev?.()
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        Log.ui('Keyboard: next')
        e.preventDefault()
        actions.navNext?.()
        return
      }

      if (e.key === 'e') {
        Log.ui('Keyboard: export')
        actions.toggleExport?.()
        return
      }

      if (e.key === '?') {
        Log.ui('Keyboard: help')
        actions.toggleHelp?.()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isWorkspace, actions])
}
