import { useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../lib/api'
import { Log } from '../lib/logger'
import { useRouteSync } from '../hooks/useRouteSync'

export default function ReviewDataLoader() {
  const { courseId, reviewId } = useParams<{ courseId: string; reviewId: string }>()
  const navigate = useNavigate()
  const allObjectives = useAppStore((s) => s.allObjectives)
  const storedReviewId = useAppStore((s) => s.reviewId)
  const setDashboardData = useAppStore((s) => s.setDashboardData)
  const setObjectives = useAppStore((s) => s.setObjectives)
  const setTriageIds = useAppStore((s) => s.setTriageIds)
  const [loading, setLoading] = useState(false)

  useRouteSync()

  const needsLoad = !allObjectives.length || storedReviewId !== reviewId

  useEffect(() => {
    if (!needsLoad || !reviewId || loading) return

    setLoading(true)
    ;(async () => {
      try {
        const statusRes = await api.getStatus(reviewId)
        if (statusRes.status !== 'ready' && statusRes.status !== 'finalized') {
          navigate(`/course/${courseId}/processing/${reviewId}`, { replace: true })
          return
        }

        const [dashData, allRes] = await Promise.all([
          api.getDashboard(reviewId),
          api.getAllObjectives(reviewId),
        ])
        if (dashData) {
          setDashboardData(dashData)
          setTriageIds(
            dashData.grid
              .filter((cell) => cell.proposed_score === 0 || cell.proposed_score === 1)
              .map((cell) => cell.obj_id)
          )
        }
        if (allRes.objectives) {
          setObjectives(allRes.objectives)
        }
      } catch (err) {
        Log.error('DEEP_LINK', 'Failed to load review data', err)
        navigate('/courses', { replace: true })
      } finally {
        setLoading(false)
      }
    })()
  }, [needsLoad, reviewId, courseId])

  if (needsLoad || loading) {
    return (
      <div className="flex-1 flex items-center justify-center" aria-label="Loading review data">
        <svg className="animate-spin w-8 h-8 text-royal" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
        </svg>
        <span className="sr-only">Loading review data</span>
      </div>
    )
  }

  return <Outlet />
}
