import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAppStore } from '../store/appStore'

export function useObjectiveDetail(objId: string | null) {
  const reviewId = useAppStore((s) => s.reviewId)

  return useQuery({
    queryKey: ['objective', reviewId, objId],
    queryFn: () => api.getObjective(reviewId!, objId!),
    enabled: !!reviewId && !!objId,
    staleTime: 60_000,
  })
}
