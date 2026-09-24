export interface CanvasAccount {
  id: number
  name: string
  parent_account_id: number | null
  workflow_state: string
}

export interface AccountsListResponse {
  accounts: CanvasAccount[]
}

export interface CanvasCourse {
  id: number
  name: string
  course_code: string
  workflow_state: string
}

export interface CoursesListResponse {
  courses: CanvasCourse[]
}

export interface StartReviewRequest {
  course_id: string
}

export interface StartReviewResponse {
  review_id: string
  status: string
}

export interface CourseHistoryReview {
  completed_at: string
  review_id: string
  reviewer: string
  course_name: string
  total_score: number
  total_max: number
  essential_subtotal: number
  advanced_subtotal: number
  delivery_subtotal: number
  objectives: Record<string, number>
  is_synthetic?: boolean
}

export interface CourseHistoryResponse {
  course_id: string
  reviews: CourseHistoryReview[]
}

export interface FinalizeResponse {
  ok: boolean
  completed_at: string
  pdf_url: string
}

export interface ReviewStatus {
  review_id: string
  status: 'ingesting' | 'extracting' | 'ready' | 'finalized' | 'error'
  progress: number
  total: number
  course_id: string
  course_name: string
  error?: string
}

export interface ObjectiveRow {
  obj_id: string
  title: string
  section: 'Essential Design' | 'Advanced Design' | 'Course Delivery'
  optional: boolean
  human_judgment: boolean
  pattern: string
  proposed_score: number | null
  proposed_label: string | null
  confidence: string
  human_score: number | null
  human_rationale: string
  confirmed: boolean
  ready: boolean
}

export interface CriterionVerdict {
  criterion: string
  text?: string
  met: 'MET' | 'NOT_MET' | 'INSUFFICIENT_EVIDENCE' | 'FULL_HUMAN_OVERSIGHT' | 'REQUIRES_TOOL' | boolean | null
  evidence: string
  tier?: string | number | null
}

export interface ContentGap {
  type: string
  file_type?: string
  name: string
  url?: string
  context: string
  message?: string
  accessible?: boolean
}

export interface ObjectiveDetail {
  obj_id: string
  title: string
  section: string
  optional: boolean
  pattern: string
  where_to_look?: string[]
  proposed_score: number | null
  score_label: string | null
  confidence: string | null
  human_judgment_required: boolean
  full_human_oversight?: boolean
  tool_required?: boolean
  tool_message?: string
  api_note?: string
  error?: boolean
  error_detail?: string
  accomplished_criteria: CriterionVerdict[]
  exemplary_criteria: CriterionVerdict[]
  key_findings: string[]
  reasoning: string
  improvement_suggestions: string
  human_score?: number | null
  human_rationale?: string
  confirmed?: boolean
  content_gaps: ContentGap[]
  syllabus_is_file_only?: boolean
  high_judgment?: boolean
}

export interface ScoreRequest {
  obj_id: string
  score: number
  rationale?: string
}

export interface ScoreResponse {
  ok: boolean
  obj_id: string
  score: number
}

export interface StructuralAudit {
  syllabus_status: string
  syllabus_detail?: string
  module_count: number
  module_0_present: boolean
  module_0_names?: string[]
  module_item_types?: Record<string, number>
  orientation_pages?: number
  content_pages?: number
  total_pages_fetched: number
  embedded_media_pages?: number
  captions_issues?: Array<{ page: string; issue: string; url: string }>
  non_panopto_media_pages?: number
  assignment_count?: number
  rubric_count?: number
  rubric_pct?: number
  specs_grading?: boolean
  missing_due_dates?: string[]
  discussion_count?: number
  qa_forums_detected?: number
  inaccessible_files?: number
  external_tools?: number
  external_tool_names?: string[]
}

export interface GridCell {
  obj_id: string
  section: string
  confirmed: boolean
  human_score: number | null
  proposed_score: number | null
  needs_attention: boolean
  pattern: string
  optional: boolean
}

export interface TriageItem {
  obj_id: string
  title: string
  section: string
  pattern: string
  reason: string
}

export interface DashboardScores {
  total: number
  max: number
  essential: { scored: number; max: number }
  advanced: { scored: number; max: number }
  delivery: { scored: number; max: number }
}

export interface DashboardData {
  review_id: string
  course_id: string
  course_name: string
  course_summary?: string
  course_overview?: string
  status: string
  confirmed_count: number
  total_objectives: number
  scores: DashboardScores
  structural_audit: StructuralAudit
  grid: GridCell[]
  triage: TriageItem[]
}

export interface ImprovementPlanItem {
  obj_id: string
  title: string
  current_score: number
  target_score: number
  difficulty: 'easy' | 'moderate' | 'hard'
  effort_hours: string
  what_to_do: string
  why_it_matters: string
  quick_wins: string[]
  broken_links?: string[]
}

export interface ImprovementPlan {
  summary: string
  items: ImprovementPlanItem[]
}

export interface ExportObjective {
  title: string
  section: string
  optional: boolean
  score: number | null
  score_label: string | null
  rationale: string
  ai_proposed_score: number | null
  was_override: boolean
  key_findings: string[]
  improvement_suggestions: string
}

export interface ExportSection {
  subtotal: number
  max: number
  note?: string
  objectives: ExportObjective[]
}

export interface ExportData {
  review_id: string
  course_id: string
  course_name: string
  reviewer: string
  review_date: string
  scorecard: {
    essential_design: ExportSection
    advanced_design: ExportSection
    course_delivery: ExportSection
    total_score: number
    total_max: number
    percentage: number
  }
  completion: {
    total_objectives: number
    scored: number
    complete: boolean
  }
  generated_at: string
}
