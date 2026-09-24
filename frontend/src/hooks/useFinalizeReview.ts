import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'

export function useFinalizeReview() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { reviewId, courseId } = useAppStore()

  return useMutation({
    mutationFn: () => api.finalizeReview(reviewId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-history', courseId] })
      navigate(`/course/${courseId}/metrics`)
      toast.success('Review finalized')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
