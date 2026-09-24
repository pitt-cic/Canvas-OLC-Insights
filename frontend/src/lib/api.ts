import { Log } from './logger'
import { getIdToken } from './auth'
import type {
  StartReviewResponse,
  ReviewStatus,
  DashboardData,
  ObjectiveDetail,
  ScoreResponse,
  ExportData,
  ObjectiveRow,
  CourseHistoryResponse,
  FinalizeResponse,
  ImprovementPlan,
  CoursesListResponse,
  AccountsListResponse,
} from '../types/api'

const BASE = ''

function sanitizeError(status: number, text: string): string {
  const firstLine = text.split('\n')[0].slice(0, 120)
  return `Server error (${status}): ${firstLine}`
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const start = performance.now()
  Log.api(method, path, body)

  const token = await getIdToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = token

  const opts: RequestInit = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  const ms = Math.round(performance.now() - start)

  if (!res.ok) {
    const text = await res.text()
    Log.apiResponse(path, res.status, text)
    throw new Error(sanitizeError(res.status, text))
  }

  const data = await res.json()
  Log.apiResponse(path, res.status, data)
  Log.perf(`${method} ${path}`, ms)
  return data as T
}

export const api = {
  listAccounts() {
    return request<AccountsListResponse>('GET', '/api/accounts')
  },

  listCourses(accountId?: number | null) {
    const qs = accountId ? `?account_id=${accountId}` : ''
    return request<CoursesListResponse>('GET', `/api/courses${qs}`)
  },

  startReview(courseId: string) {
    return request<StartReviewResponse>('POST', '/api/review/start', { course_id: courseId })
  },

  getStatus(rid: string) {
    return request<ReviewStatus>('GET', `/api/review/${rid}/status`)
  },

  getDashboard(rid: string) {
    return request<DashboardData>('GET', `/api/review/${rid}/dashboard`)
  },

  getAllObjectives(rid: string) {
    return request<{ objectives: ObjectiveRow[]; course_name: string }>('GET', `/api/review/${rid}/all`)
  },

  getObjective(rid: string, objId: string) {
    return request<ObjectiveDetail>('GET', `/api/review/${rid}/objective/${objId}`)
  },

  confirmScore(rid: string, objId: string, score: number, rationale: string) {
    return request<ScoreResponse>('POST', `/api/review/${rid}/score`, {
      obj_id: objId,
      score,
      rationale: rationale || '',
    })
  },

  async getExport(rid: string) {
    const raw = await request<any>('GET', `/api/review/${rid}/export`)
    // Backend returns objectives as {obj_id: {...}} dict; normalize to array
    for (const key of ['essential_design', 'advanced_design', 'course_delivery'] as const) {
      const section = raw.scorecard?.[key]
      if (section && section.objectives && !Array.isArray(section.objectives)) {
        section.objectives = Object.values(section.objectives)
      }
    }
    return raw as ExportData
  },

  getCourseHistory(courseId: string) {
    return request<CourseHistoryResponse>('GET', `/api/courses/${courseId}/history`)
  },

  finalizeReview(reviewId: string) {
    return request<FinalizeResponse>('POST', `/api/review/${reviewId}/finalize`)
  },

  getReviewPdf(reviewId: string) {
    return request<{ url: string }>('GET', `/api/review/${reviewId}/pdf`)
  },

  deleteHistoryEntry(courseId: string, completedAt: string) {
    return request<{ ok: boolean; deleted: string }>('DELETE', `/api/courses/${courseId}/history/${encodeURIComponent(completedAt)}`)
  },

  startImprovementPlan(courseId: string, force = false) {
    const qs = force ? '?force=true' : ''
    return request<{ status: string }>('POST', `/api/courses/${courseId}/improvement-plan${qs}`)
  },

  getImprovementPlan(courseId: string) {
    return request<ImprovementPlan & { status: string }>('GET', `/api/courses/${courseId}/improvement-plan`)
  },
}
