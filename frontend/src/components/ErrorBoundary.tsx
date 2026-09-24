import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    sessionStorage.removeItem('qa-app-state-v3')
    window.location.href = '/courses'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex-1 flex items-center justify-center p-8" role="alert">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-pred-lt dark:bg-red-950/30 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-pred dark:text-red-400" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-ink dark:text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-ink-subtle dark:text-slate-300 mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-colors"
            >
              Reload
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-lg border border-mist dark:border-border-dark text-sm font-medium text-ink dark:text-white hover:bg-surface-sunken dark:hover:bg-surface-raised-dark transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }
}
