import { useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { Log } from '../lib/logger'

export function useStartReview() {
  const { setReviewId } = useAppStore()
  const navigate = useNavigate()
  const { courseId } = useParams<{ courseId: string }>()
  const storeCourseId = useAppStore((s) => s.courseId)
  const effectiveCourseId = courseId || storeCourseId

  return useMutation({
    mutationFn: (cid: string) => api.startReview(cid),
    onSuccess: (data) => {
      Log.success('REVIEW', 'Started', { review_id: data.review_id })
      setReviewId(data.review_id)
      navigate(`/course/${effectiveCourseId}/processing/${data.review_id}`)
    },
    onError: (err: Error) => {
      Log.error('REVIEW', 'Start failed', err)
      const msg = err.message.includes('Failed to fetch')
        ? "Can't reach the backend — check your connection and try again"
        : err.message
      toast.error(msg)
    },
  })
}
