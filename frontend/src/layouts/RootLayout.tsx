import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useThemeStore } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import ErrorBoundary from '../components/ErrorBoundary'
import Header from '../components/Header'
import ToastContainer from '../components/ToastContainer'
import LoginScreen from '../screens/LoginScreen'

const ROUTE_LABELS: Record<string, string> = {
  '/courses': 'Course selection',
  '/course': 'Course options',
  '/processing': 'Processing review',
  '/review': 'Review dashboard',
  '/workspace': 'Scoring workspace',
  '/metrics': 'Metrics dashboard',
}

function getRouteLabel(pathname: string): string {
  if (pathname.endsWith('/workspace')) return ROUTE_LABELS['/workspace']
  if (pathname.includes('/review/')) return ROUTE_LABELS['/review']
  if (pathname.includes('/processing/')) return ROUTE_LABELS['/processing']
  if (pathname.includes('/metrics')) return ROUTE_LABELS['/metrics']
  if (pathname.match(/^\/course\/[^/]+$/)) return ROUTE_LABELS['/course']
  return ROUTE_LABELS['/courses'] || 'Page'
}

export default function RootLayout() {
  const { pathname } = useLocation()
  const theme = useThemeStore((s) => s.theme)
  const { isAuthenticated, isLoading, checkSession } = useAuthStore()

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const announcerRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (prevPath.current !== pathname && announcerRef.current) {
      announcerRef.current.textContent = `Navigated to ${getRouteLabel(pathname)}`
    }
    prevPath.current = pathname
  }, [pathname])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" aria-label="Loading application">
        <svg className="animate-spin w-8 h-8 text-royal" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
        </svg>
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen />
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  const hideHeader = pathname.endsWith('/workspace')

  return (
    <ErrorBoundary>
      <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      {!hideHeader && <Header />}
      <main id="main-content" className="flex flex-col flex-1 min-h-0">
        <Outlet />
      </main>
      <ToastContainer />
    </ErrorBoundary>
  )
}
