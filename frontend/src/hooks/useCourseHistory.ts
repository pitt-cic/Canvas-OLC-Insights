import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useCourseHistory(courseId: string | null) {
  return useQuery({
    queryKey: ['course-history', courseId],
    queryFn: () => api.getCourseHistory(courseId!),
    enabled: !!courseId,
  })
}
