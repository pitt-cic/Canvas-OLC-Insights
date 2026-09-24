import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import CourseListTable from './layouts/CourseListTable'

export default function CourseListScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.listAccounts(),
    staleTime: 10 * 60 * 1000,
  })
  const accounts = data?.accounts ?? []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center" aria-busy="true">
          <svg className="animate-spin w-8 h-8 text-royal" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
          </svg>
        </div>
      ) : (
        <CourseListTable accounts={accounts} />
      )}
    </div>
  )
}
