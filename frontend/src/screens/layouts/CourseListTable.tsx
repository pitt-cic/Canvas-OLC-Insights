import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/appStore'
import { api } from '../../lib/api'
import type { CanvasCourse, CanvasAccount } from '../../types/api'

const PAGE_SIZE = 15

type SortCol = 'name' | 'code' | 'status' | 'id'
type SortDir = 'asc' | 'desc'

interface Props {
  accounts: CanvasAccount[]
}

export default function CourseListTable({ accounts }: Props) {
  const navigate = useNavigate()
  const { setCourseId, setCourseName } = useAppStore()
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(accounts[0]?.id ?? null)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['courses', selectedAccountId],
    queryFn: () => api.listCourses(selectedAccountId),
    staleTime: 5 * 60 * 1000,
  })

  const courses = data?.courses ?? []
  const filtered = filter.trim()
    ? courses.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.course_code.toLowerCase().includes(filter.toLowerCase())
      )
    : courses

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    switch (sortCol) {
      case 'name': cmp = a.name.localeCompare(b.name); break
      case 'code': cmp = a.course_code.localeCompare(b.course_code); break
      case 'status': cmp = a.workflow_state.localeCompare(b.workflow_state); break
      case 'id': cmp = a.id - b.id; break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSelect(course: CanvasCourse) {
    setCourseId(String(course.id))
    setCourseName(course.name)
    navigate(`/course/${course.id}`)
  }

  function handleAccountChange(id: number | null) {
    setSelectedAccountId(id)
    setFilter('')
    setPage(0)
  }

  function handleFilterChange(val: string) {
    setFilter(val)
    setPage(0)
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-ink-subtle/30 ml-1">&uarr;&darr;</span>
    return <span className="text-royal ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 bg-surface-sunken dark:bg-surface-sunken-dark rounded-t-xl p-3">
          {accounts.length > 0 && (
            <select
              value={selectedAccountId ?? ''}
              onChange={(e) => handleAccountChange(Number(e.target.value))}
              aria-label="Select account"
              className="px-3 py-2 rounded-lg border border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark text-ink dark:text-white text-sm outline-none focus:border-royal"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder="Search..."
              aria-label="Search courses"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-mist dark:border-border-dark bg-surface-raised dark:bg-card-dark text-ink dark:text-white placeholder:text-ink-subtle/40 text-sm outline-none focus:border-royal"
            />
          </div>
          <span className="text-xs font-medium text-ink-subtle dark:text-slate-400 px-2 py-1 bg-mist dark:bg-border-dark rounded whitespace-nowrap">
            {filtered.length} course{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="border border-mist dark:border-border-dark rounded-b-xl p-4" aria-busy="true" aria-label="Loading courses">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-mist/30 dark:bg-border-dark/30 rounded mb-1 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12 border border-t-0 border-mist dark:border-border-dark rounded-b-xl">
            <p className="text-sm text-pred font-medium mb-3">{(error as Error).message}</p>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto border border-t-0 border-mist dark:border-border-dark rounded-b-xl">
            {sorted.length === 0 ? (
              <div className="text-center py-12 text-sm text-ink-subtle dark:text-slate-300">
                {filter ? 'No courses match your search.' : 'No courses in this account.'}
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-sunken/50 dark:bg-surface-sunken-dark/50 border-b border-mist dark:border-border-dark">
                      <th className="px-4 py-3">
                        <button onClick={() => handleSort('name')} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-slate-400 hover:text-royal transition-colors" aria-sort={sortCol === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          Name<SortIcon col="name" />
                        </button>
                      </th>
                      <th className="px-4 py-3 hidden sm:table-cell">
                        <button onClick={() => handleSort('code')} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-slate-400 hover:text-royal transition-colors" aria-sort={sortCol === 'code' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          Code<SortIcon col="code" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button onClick={() => handleSort('status')} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-slate-400 hover:text-royal transition-colors" aria-sort={sortCol === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          Status<SortIcon col="status" />
                        </button>
                      </th>
                      <th className="px-4 py-3 hidden sm:table-cell text-right">
                        <button onClick={() => handleSort('id')} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-slate-400 hover:text-royal transition-colors" aria-sort={sortCol === 'id' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          ID<SortIcon col="id" />
                        </button>
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((course, i) => (
                      <tr
                        key={course.id}
                        onClick={() => handleSelect(course)}
                        className={`cursor-pointer border-t border-mist/50 dark:border-border-dark/50 hover:bg-royal/[0.03] dark:hover:bg-royal/[0.05] transition-colors ${
                          i % 2 === 1 ? 'bg-surface-sunken/20 dark:bg-surface-sunken-dark/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-ink dark:text-white max-w-[300px] truncate">
                          {course.name}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-ink-subtle dark:text-slate-400 hidden sm:table-cell">
                          {course.course_code}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            course.workflow_state === 'available' ? 'text-pgreen' : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} aria-hidden="true" />
                            {course.workflow_state === 'available' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-ink-subtle dark:text-slate-400 text-right hidden sm:table-cell">
                          {course.id}
                        </td>
                        <td className="px-2 py-3">
                          <svg className="w-4 h-4 text-ink-subtle/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-mist dark:border-border-dark">
                    <button
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 0}
                      aria-label="Previous page"
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-subtle hover:text-royal hover:bg-royal/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      &larr; Prev
                    </button>
                    <span className="text-xs text-ink-subtle dark:text-slate-400">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                      aria-label="Next page"
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-subtle hover:text-royal hover:bg-royal/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
