import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { Log } from '../lib/logger'

export function useConfirmScore() {
  const queryClient = useQueryClient()
  const { reviewId, updateObjectiveScore, selectNextUnconfirmed } = useAppStore()

  return useMutation({
    mutationFn: ({ objId, score, rationale }: { objId: string; score: number; rationale: string }) => {
      Log.group(`Score: ${objId} → ${score}`)
      return api.confirmScore(reviewId!, objId, score, rationale)
    },
    onSuccess: (_data, { objId, score, rationale }) => {
      updateObjectiveScore(objId, score, rationale)
      queryClient.invalidateQueries({ queryKey: ['dashboard', reviewId] })
      queryClient.invalidateQueries({ queryKey: ['objective', reviewId, objId] })
      Log.groupEnd()
      toast.success('Score confirmed')
      selectNextUnconfirmed()
    },
    onError: (err: Error) => {
      Log.error('SCORE', 'Save failed', err)
      Log.groupEnd()
      toast.error(err.message)
    },
  })
}
