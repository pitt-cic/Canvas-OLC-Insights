import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { Log } from '../lib/logger'

export function useReviewStatus() {
  const reviewId = useAppStore((s) => s.reviewId)

  return useQuery({
    queryKey: ['review-status', reviewId],
    queryFn: () => api.getStatus(reviewId!),
    enabled: !!reviewId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'ready' || status === 'error') {
        Log.info('POLL', `Stopping poll: status=${status}`)
        return false
      }
      return 1500
    },
  })
}
