import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

export function useRouteSync() {
  const params = useParams<{ courseId?: string; reviewId?: string }>()
  const setCourseId = useAppStore((s) => s.setCourseId)
  const setReviewId = useAppStore((s) => s.setReviewId)

  useEffect(() => {
    if (params.courseId) setCourseId(params.courseId)
  }, [params.courseId, setCourseId])

  useEffect(() => {
    if (params.reviewId) setReviewId(params.reviewId)
  }, [params.reviewId, setReviewId])
}
