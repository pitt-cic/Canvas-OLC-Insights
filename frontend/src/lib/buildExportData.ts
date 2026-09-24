import type { ExportData, ExportSection, ExportObjective, ObjectiveRow, DashboardData } from '../types/api'

function buildSection(objectives: ObjectiveRow[]): ExportSection {
  const exportObjs: ExportObjective[] = objectives.map((obj) => {
    const score = obj.confirmed ? (obj.human_score ?? obj.proposed_score ?? 0) : (obj.proposed_score ?? 0)
    return {
      title: obj.title,
      section: obj.section,
      optional: obj.optional,
      score,
      score_label: score === 2 ? 'Exemplary' : score === 1 ? 'Accomplished' : 'Developing',
      rationale: obj.human_rationale || '',
      ai_proposed_score: obj.proposed_score,
      was_override: obj.confirmed && obj.human_score !== null && obj.human_score !== obj.proposed_score,
      key_findings: [],
      improvement_suggestions: '',
    }
  })

  const subtotal = exportObjs.reduce((sum, o) => sum + (o.score ?? 0), 0)
  const max = objectives.length * 2

  return { subtotal, max, objectives: exportObjs }
}

export function buildExportData(
  allObjectives: ObjectiveRow[],
  dashboardData: DashboardData | null,
  reviewId: string | null,
): ExportData {
  const essential = allObjectives.filter((o) => o.section === 'Essential Design')
  const advanced = allObjectives.filter((o) => o.section === 'Advanced Design')
  const delivery = allObjectives.filter((o) => o.section === 'Course Delivery')

  const essentialSection = buildSection(essential)
  const advancedSection = buildSection(advanced)
  const deliverySection = buildSection(delivery)

  const totalScore = essentialSection.subtotal + advancedSection.subtotal + deliverySection.subtotal
  const totalMax = essentialSection.max + advancedSection.max + deliverySection.max
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0

  const confirmed = allObjectives.filter((o) => o.confirmed).length

  return {
    review_id: reviewId || '',
    course_id: dashboardData?.course_id || '',
    course_name: dashboardData?.course_name || '',
    reviewer: 'QA Reviewer',
    review_date: new Date().toISOString().split('T')[0],
    scorecard: {
      essential_design: essentialSection,
      advanced_design: advancedSection,
      course_delivery: deliverySection,
      total_score: totalScore,
      total_max: totalMax,
      percentage: Math.round(percentage * 10) / 10,
    },
    completion: {
      total_objectives: allObjectives.length,
      scored: confirmed,
      complete: confirmed === allObjectives.length,
    },
    generated_at: new Date().toISOString(),
  }
}
