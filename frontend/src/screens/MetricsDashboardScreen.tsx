import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/appStore'
import { useCourseHistory } from '../hooks/useCourseHistory'
import { useStartReview } from '../hooks/useStartReview'
import { api } from '../lib/api'
import { toast } from '../store/toastStore'
import { OBJECTIVE_TITLES } from '../lib/objectiveTitles'
import { SCORE_LABELS, SCORE_COLORS, SECTIONS } from '../lib/constants'
import { generateImprovementPDF } from '../lib/generateImprovementPDF'
import type { CourseHistoryReview, ImprovementPlan, ImprovementPlanItem, ObjectiveDetail } from '../types/api'

type Tab = 'essentials' | 'overall' | 'sections' | 'changes' | 'improvements' | 'manage'

const ADMIN_DELETE_ENABLED = false

const CHART_GRID = 'var(--chart-grid, #e2e8f0)'
const CHART_TICK = 'var(--chart-tick, #64748b)'

const SECTION_MAX: Record<string, number> = { total: 100, essential: 40, advanced: 30, delivery: 30 }

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const seen = new Set<string>()
  const entries = payload.filter((entry: any) => {
    if (seen.has(entry.dataKey)) return false
    seen.add(entry.dataKey)
    return true
  })

  return (
    <div className="rounded-lg border border-mist dark:border-border-dark bg-white dark:bg-slate-800 px-3 py-2.5 shadow-lg min-w-[140px]">
      <p className="text-[11px] font-medium text-ink-subtle dark:text-slate-400 mb-1.5 pb-1.5 border-b border-mist/60 dark:border-slate-700">{label}</p>
      <div className="space-y-1">
        {entries.map((entry: any, idx: number) => {
          const point = entry.payload
          const val = point[entry.dataKey]
          const max = entry.dataKey === 'total' && point.total_max
            ? point.total_max
            : SECTION_MAX[entry.dataKey]
          const pct = max ? Math.round((val / max) * 100) : null
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-ink-subtle dark:text-slate-300">{entry.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-ink dark:text-white">{val}</span>
                {max && <span className="text-[11px] text-ink-subtle dark:text-slate-400">/{max}</span>}
                {pct !== null && <span className="text-[10px] text-ink-subtle dark:text-slate-500 ml-0.5">({pct}%)</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MetricsDashboardScreen() {
  const { courseId: paramCourseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const storeCourseId = useAppStore((s) => s.courseId)
  const courseId = paramCourseId || storeCourseId
  const { data, isLoading } = useCourseHistory(courseId)
  const { mutate: startReview, isPending } = useStartReview()
  const [activeTab, setActiveTab] = useState<Tab>('overall')

  const reviews = data?.reviews ?? []

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-ink-subtle dark:text-slate-400">Loading metrics...</div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md screen-enter">
          <div className="w-16 h-16 rounded-2xl bg-royal/10 dark:bg-royal/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink dark:text-white mb-2">No reviews yet</h2>
          <p className="text-sm text-ink-subtle dark:text-slate-300 mb-6">
            This course hasn't been reviewed yet. File a new review to start tracking quality metrics over time.
          </p>
          <button
            onClick={() => startReview(courseId!)}
            disabled={isPending}
            className="px-6 py-3 rounded-xl bg-royal hover:bg-medium text-white font-semibold transition-all disabled:opacity-50"
          >
            {isPending ? 'Starting...' : 'File New Review'}
          </button>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="mt-4 block mx-auto text-sm text-ink-subtle hover:text-royal transition-colors"
          >
            &larr; Back
          </button>
        </div>
      </div>
    )
  }

  const chartData = [...reviews].reverse().map((r, idx, arr) => {
    const baseDate = new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    const priorSameDay = arr.slice(0, idx).filter(x =>
      new Date(x.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) === baseDate
    ).length
    return {
      date: priorSameDay > 0 ? `${baseDate} (#${priorSameDay + 1})` : baseDate,
      total: r.total_score,
      total_max: r.total_max,
      essential: r.essential_subtotal,
      advanced: r.advanced_subtotal,
      delivery: r.delivery_subtotal,
      is_synthetic: r.is_synthetic ?? false,
    }
  })

  const hasSynthetic = reviews.some((r) => r.is_synthetic)
  const latest = reviews[0]
  const previous = reviews.length > 1 ? reviews[1] : null
  const scoreDelta = previous ? latest.total_score - previous.total_score : null
  const essentialPct = latest.total_max > 0 ? Math.round((latest.essential_subtotal / 40) * 100) : 0
  const tierLabel = (latest.total_score / latest.total_max * 100) >= 85 ? 'Exemplary' : (latest.total_score / latest.total_max * 100) >= 60 ? 'Accomplished' : 'Developing'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'sections', label: 'Sections' },
    { key: 'essentials', label: 'Essentials' },
    { key: 'changes', label: 'Changes' },
    { key: 'improvements', label: 'Action Plan' },
    { key: 'manage', label: 'Manage' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 screen-enter">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ink dark:text-white">
              Course Metrics
            </h1>
            <p className="text-sm text-ink-subtle dark:text-slate-300 mt-1">
              {latest.course_name || `Course ${courseId}`} &middot; {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => startReview(courseId!)}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-royal hover:bg-medium text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isPending ? 'Starting...' : 'New Review'}
            </button>
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="px-4 py-2 rounded-lg border border-mist dark:border-border-dark text-ink-subtle dark:text-slate-300 text-sm font-medium hover:border-royal hover:text-royal transition-all"
            >
              Back
            </button>
          </div>
        </div>

        {/* Latest Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-4">
            <div className="text-xs font-medium text-ink-subtle dark:text-slate-400 mb-1">Total Score</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink dark:text-white">{latest.total_score}/{latest.total_max}</span>
              {scoreDelta !== null && (
                <span className={`text-sm font-semibold ${scoreDelta > 0 ? 'text-green-600' : scoreDelta < 0 ? 'text-red-500' : 'text-ink-subtle'}`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </span>
              )}
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
              tierLabel === 'Exemplary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
              tierLabel === 'Accomplished' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
              'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
            }`}>{tierLabel}</span>
          </div>
          <div className="bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-4">
            <div className="text-xs font-medium text-ink-subtle dark:text-slate-400 mb-1">Essential Design</div>
            <div className="text-2xl font-bold text-royal">{essentialPct}%</div>
            <div className="text-xs text-ink-subtle dark:text-slate-400 mt-1">{latest.essential_subtotal}/40</div>
          </div>
          <div className="bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-4">
            <div className="text-xs font-medium text-ink-subtle dark:text-slate-400 mb-1">Last Review</div>
            <div className="text-lg font-bold text-ink dark:text-white">
              {new Date(latest.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-ink-subtle dark:text-slate-400 mt-1">
              {new Date(latest.completed_at).getFullYear()}
            </div>
          </div>
          <div className="bg-surface-raised dark:bg-card-dark border border-mist dark:border-border-dark rounded-xl p-4">
            <div className="text-xs font-medium text-ink-subtle dark:text-slate-400 mb-1">Developing</div>
            <div className="text-2xl font-bold text-red-500">
              {Object.values(latest.objectives).filter((s) => s === 0 || s === 1).length}
            </div>
            <div className="text-xs text-ink-subtle dark:text-slate-400 mt-1">objectives need work</div>
          </div>
        </div>

        {/* Synthetic notice */}
        {hasSynthetic && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 w-fit">
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 rounded">Demo</span>
            <span className="text-xs text-amber-700 dark:text-amber-300">Some data points are synthetic demo data</span>
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex gap-1 bg-surface-sunken dark:bg-card-dark rounded-lg p-1 mb-6 overflow-x-auto"
          role="tablist"
          aria-label="Metrics views"
          onKeyDown={(e) => {
            const keys = TABS.map(t => t.key)
            const idx = keys.indexOf(activeTab)
            if (e.key === 'ArrowRight') { e.preventDefault(); setActiveTab(keys[(idx + 1) % keys.length]) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveTab(keys[(idx - 1 + keys.length) % keys.length]) }
            else if (e.key === 'Home') { e.preventDefault(); setActiveTab(keys[0]) }
            else if (e.key === 'End') { e.preventDefault(); setActiveTab(keys[keys.length - 1]) }
          }}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`tabpanel-${key}`}
              tabIndex={activeTab === key ? 0 : -1}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-white dark:bg-border-dark text-ink dark:text-white shadow-sm'
                  : 'text-ink-subtle dark:text-slate-400 hover:text-ink dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="bg-surface-raised dark:bg-card-dark rounded-2xl border border-mist dark:border-border-dark p-6 min-h-[360px] screen-enter"
          key={activeTab}
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'essentials' && <EssentialsTrend data={chartData} />}
          {activeTab === 'overall' && <OverallTrend data={chartData} />}
          {activeTab === 'sections' && <SectionTrend data={chartData} />}
          {activeTab === 'changes' && <ObjectiveDelta reviews={reviews} />}
          {activeTab === 'improvements' && <ImprovementsPriority reviews={reviews} />}
          {activeTab === 'manage' && <ManageReviews reviews={reviews} courseId={courseId!} />}
        </div>
      </div>
    </div>
  )
}


function EssentialsTrend({ data }: { data: Array<{ date: string; essential: number }> }) {
  if (data.length === 1) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl font-extrabold text-royal">{data[0].essential}<span className="text-lg text-ink-subtle font-normal">/40</span></p>
        <p className="text-sm text-ink-subtle dark:text-slate-300 mt-2">
          Essential Design score on {data[0].date}
        </p>
        <p className="text-xs text-ink-subtle dark:text-slate-400 mt-1">File another review to see trends</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-subtle dark:text-slate-300 mb-4">Essential Design Score Over Time (out of 40)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART_TICK }} />
          <YAxis domain={[0, 40]} tick={{ fontSize: 12, fill: CHART_TICK }} />
          <Tooltip content={<ChartTooltipContent />} />
          <ReferenceLine y={30} stroke="#059669" strokeDasharray="6 3" label={{ value: '75% goal', position: 'right', fontSize: 11, fill: '#059669' }} />
          <Area type="linear" dataKey="essential" stroke="#003594" strokeWidth={2.5} fill="#003594" fillOpacity={0.08} isAnimationActive={false} dot={{ r: 5, fill: '#003594', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#003594', stroke: '#fff', strokeWidth: 2 }} name="Essential" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


function OverallTrend({ data }: { data: Array<{ date: string; total: number; total_max: number }> }) {
  if (data.length === 1) {
    const pct = data[0].total_max > 0 ? Math.round((data[0].total / data[0].total_max) * 100) : 0
    return (
      <div className="text-center py-12">
        <p className="text-4xl font-extrabold text-ink dark:text-white">
          {data[0].total}<span className="text-lg text-ink-subtle dark:text-slate-300 font-normal">/{data[0].total_max}</span>
        </p>
        <p className="text-sm font-semibold text-royal mt-1">{pct}%</p>
        <p className="text-sm text-ink-subtle dark:text-slate-300 mt-2">
          Single review on {data[0].date} — file another to see trends
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-subtle dark:text-slate-300 mb-4">Total Score Over Time (out of 100)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART_TICK }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: CHART_TICK }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Line type="linear" dataKey="total" stroke="#003594" strokeWidth={2.5} isAnimationActive={false} dot={{ r: 5, fill: '#003594', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#003594', stroke: '#fff', strokeWidth: 2 }} name="Total Score" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


function SectionTrend({ data }: { data: Array<{ date: string; essential: number; advanced: number; delivery: number }> }) {
  if (data.length === 1) {
    const d = data[0]
    return (
      <div className="grid grid-cols-3 gap-4 py-8">
        {[
          { label: 'Essential', value: d.essential, max: 40, color: '#003594' },
          { label: 'Advanced', value: d.advanced, max: 30, color: '#7c3aed' },
          { label: 'Delivery', value: d.delivery, max: 30, color: '#059669' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}/{s.max}</p>
            <p className="text-xs text-ink-subtle dark:text-slate-300 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-subtle dark:text-slate-300 mb-4">Section Scores Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART_TICK }} />
          <YAxis domain={[0, 42]} tick={{ fontSize: 12, fill: CHART_TICK }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <ReferenceLine y={40} stroke="#003594" strokeDasharray="4 3" strokeOpacity={0.35} label={{ value: 'Essential max', position: 'right', fontSize: 9, fill: '#003594' }} />
          <ReferenceLine y={30} stroke="#7c3aed" strokeDasharray="4 3" strokeOpacity={0.35} label={{ value: 'Adv/Del max', position: 'right', fontSize: 9, fill: '#7c3aed' }} />
          <Line type="linear" dataKey="essential" stroke="#003594" strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: '#003594', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#003594', stroke: '#fff', strokeWidth: 2 }} name="Essential" />
          <Line type="linear" dataKey="advanced" stroke="#7c3aed" strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }} name="Advanced" />
          <Line type="linear" dataKey="delivery" stroke="#059669" strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} name="Delivery" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


function ObjectiveDelta({ reviews }: { reviews: CourseHistoryReview[] }) {
  if (reviews.length < 2) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-subtle dark:text-slate-300">
          Need at least two reviews to show changes. File another review to see which objectives improved or regressed.
        </p>
      </div>
    )
  }

  const current = reviews[0].objectives
  const previous = reviews[1].objectives
  const allIds = [...new Set([...Object.keys(current), ...Object.keys(previous)])].sort((a, b) => {
    const sectionOrder = (id: string) => id.startsWith('E') ? 0 : id.startsWith('A') ? 1 : 2
    const numA = parseInt(a.slice(1))
    const numB = parseInt(b.slice(1))
    return sectionOrder(a) - sectionOrder(b) || numA - numB
  })

  const changes = allIds
    .map((id) => ({
      id,
      title: OBJECTIVE_TITLES[id] || id,
      prev: previous[id] ?? null,
      curr: current[id] ?? null,
      delta: (current[id] ?? 0) - (previous[id] ?? 0),
    }))
    .filter((c) => c.delta !== 0)

  if (changes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-subtle dark:text-slate-300">No score changes between the two most recent reviews.</p>
      </div>
    )
  }

  const improved = changes.filter(c => c.delta > 0)
  const regressed = changes.filter(c => c.delta < 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink dark:text-white flex items-center gap-2 flex-wrap">
          <span>Score Changes</span>
          <span className="text-xs font-normal text-ink-subtle dark:text-slate-400">
            {new Date(reviews[1].completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {reviews[1].is_synthetic && <span className="ml-1 px-1 py-0.5 text-[9px] font-bold uppercase bg-amber-400 text-amber-900 rounded">Demo</span>}
            {' → '}
            {new Date(reviews[0].completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {reviews[0].is_synthetic && <span className="ml-1 px-1 py-0.5 text-[9px] font-bold uppercase bg-amber-400 text-amber-900 rounded">Demo</span>}
          </span>
        </h3>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            {improved.length}
          </span>
          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {regressed.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {changes.map((c) => (
          <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
            c.delta > 0
              ? 'border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/10'
              : 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10'
          }`}>
            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              c.delta > 0
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
            }`}>
              {c.delta > 0 ? '+' : ''}{c.delta}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-ink-subtle dark:text-slate-400 bg-mist dark:bg-border-dark px-1.5 py-0.5 rounded">{c.id}</span>
              </div>
              <p className="text-sm text-ink dark:text-slate-200 mt-1 leading-snug">{c.title}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono flex-shrink-0 mt-1">
              <span className="text-ink-subtle dark:text-slate-400">{c.prev ?? '-'}</span>
              <svg className="w-3 h-3 text-ink-subtle/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              <span className="font-semibold text-ink dark:text-white">{c.curr ?? '-'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function ImprovementsPriority({ reviews }: { reviews: CourseHistoryReview[] }) {
  const { courseId } = useAppStore()
  const [plan, setPlan] = useState<ImprovementPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) generatePlan()
  }, [courseId])

  async function generatePlan(force = false) {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const startResult = await api.startImprovementPlan(courseId, force)
      if (startResult.status === 'ready') {
        setPlan(startResult as any)
        return
      }
      const result = await pollForPlan(courseId)
      setPlan(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function pollForPlan(cid: string) {
    const maxAttempts = 90
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const result = await api.getImprovementPlan(cid)
      if (result.status === 'ready') return result
      if (result.status === 'error') throw new Error((result as any).error || 'Plan generation failed')
    }
    throw new Error('Plan generation timed out — please try again')
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={() => generatePlan()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold transition-all"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!plan && !loading) {
    const latest = reviews[0]
    const developingCount = Object.values(latest.objectives).filter((s) => s === 0 || s === 1).length
    const accomplishedCount = Object.values(latest.objectives).filter((s) => s === 1).length

    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-ink dark:text-white mb-2">AI Improvement Plan</h3>
        <p className="text-sm text-ink-subtle dark:text-slate-300 mb-1 max-w-md mx-auto">
          Generate a personalized action plan ordered from easiest to hardest changes.
        </p>
        <p className="text-xs text-ink-subtle dark:text-slate-400 mb-6">
          {developingCount} developing &middot; {accomplishedCount} accomplished &middot; Uses AI to prioritize next steps
        </p>
        <button
          onClick={() => generatePlan()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98]"
        >
          Generate Plan
        </button>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="animate-spin w-8 h-8 text-violet-500 mb-4" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
        </svg>
        <p className="text-sm font-medium text-ink dark:text-white">Analyzing scorecard...</p>
        <p className="text-xs text-ink-subtle dark:text-slate-400 mt-1">AI is generating your improvement plan</p>
      </div>
    )
  }

  if (!plan) return null

  const difficultyConfig = {
    easy: { label: 'Quick Win', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', icon: '1' },
    moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', icon: '2' },
    hard: { label: 'Significant', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: '3' },
  }

  const latestReview = reviews[0]
  const courseName = latestReview?.course_name || `Course ${courseId}`

  function handleDownloadPDF() {
    try {
      generateImprovementPDF(plan!, courseName, courseId!)
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error(`PDF failed: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-white mb-1">Action Plan</h3>
          <p className="text-xs text-ink-subtle dark:text-slate-400">{plan.summary}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Download as PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => generatePlan(true)}
            disabled={loading}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {(['easy', 'moderate', 'hard'] as const).map((d) => {
          const count = plan.items.filter(i => i.difficulty === d).length
          if (!count) return null
          const cfg = difficultyConfig[d]
          return (
            <span key={d} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>
              {count} {cfg.label}
            </span>
          )
        })}
      </div>

      <div className="space-y-3">
        {plan.items.map((item, idx) => (
          <ImprovementCard key={item.obj_id + idx} item={item} index={idx} />
        ))}
      </div>
    </div>
  )
}


function FormattedText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\n|(?<=\.)\s*(?=\d+[.)]\s)/).filter(l => l.trim())
  const hasList = lines.length > 1 && lines.some(l => /^\d+[.)]\s|^[-•*]\s/.test(l.trim()))

  if (!hasList) {
    return <p className={className}>{text}</p>
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const cleaned = line.replace(/^\d+[.)]\s*|^[-•*]\s*/, '').trim()
        if (!cleaned) return null
        return (
          <li key={i} className={`flex gap-2 ${className || ''}`}>
            <span className="flex-shrink-0 text-ink-subtle dark:text-slate-500 select-none mt-px">•</span>
            <span>{cleaned}</span>
          </li>
        )
      })}
    </ul>
  )
}


function ImprovementCard({ item, index }: { item: ImprovementPlanItem; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const diffColors = {
    easy: 'border-l-green-400 bg-green-50/30 dark:bg-green-950/10',
    moderate: 'border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10',
    hard: 'border-l-red-400 bg-red-50/30 dark:bg-red-950/10',
  }

  const badgeColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  }

  return (
    <div
      className={`rounded-lg rounded-l-none border-l-[3px] border border-mist dark:border-border-dark border-l-0 overflow-hidden transition-all ${diffColors[item.difficulty]}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-mist dark:bg-border-dark flex items-center justify-center text-[11px] font-bold text-ink-subtle dark:text-slate-400 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono font-bold text-ink-subtle dark:text-slate-400 bg-mist dark:bg-border-dark px-1.5 py-0.5 rounded">{item.obj_id}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeColors[item.difficulty]}`}>
              {item.difficulty === 'easy' ? 'Quick Win' : item.difficulty === 'moderate' ? 'Moderate' : 'Significant'}
            </span>
            <span className="text-[10px] text-ink-subtle dark:text-slate-400">{item.effort_hours}</span>
          </div>
          <p className="text-sm font-medium text-ink dark:text-white leading-snug">{item.title}</p>
          <div className="mt-1">
            <FormattedText text={item.what_to_do} className="text-sm text-ink-muted dark:text-slate-300 leading-relaxed" />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <span className="text-xs font-mono text-ink-subtle dark:text-slate-400">{item.current_score}</span>
          <svg className="w-3 h-3 text-ink-subtle/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">{item.target_score}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-[52px] space-y-3 border-t border-mist/50 dark:border-border-dark/50 pt-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle dark:text-slate-400 mb-1">Why it matters</p>
            <FormattedText text={item.why_it_matters} className="text-sm text-ink-muted dark:text-slate-300 leading-relaxed" />
          </div>
          {item.quick_wins.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle dark:text-slate-400 mb-1.5">First steps</p>
              <ul className="space-y-1.5">
                {item.quick_wins.map((win, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink dark:text-slate-200">
                    <span className="flex-shrink-0 w-4 h-4 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mt-0.5">
                      <svg className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.broken_links && item.broken_links.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 mb-1.5">
                Broken links (at time of scan)
              </p>
              <ul className="space-y-1">
                {item.broken_links.map((url, i) => (
                  <li key={i} className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                    {url}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function ManageReviews({ reviews, courseId }: { reviews: CourseHistoryReview[]; courseId: string }) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)

  async function handleDelete(completedAt: string) {
    setDeleting(completedAt)
    try {
      await api.deleteHistoryEntry(courseId, completedAt)
      queryClient.invalidateQueries({ queryKey: ['course-history', courseId] })
      toast.success('Review deleted')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleting(null)
      setConfirmTarget(null)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-muted dark:text-slate-300 mb-1">Manage Reviews</h3>
      <p className="text-xs text-ink-subtle dark:text-slate-400 mb-4">
        {ADMIN_DELETE_ENABLED
          ? 'View filled scorecards or delete historical reviews. Deletion cannot be undone.'
          : 'View filled scorecards from previous reviews.'}
      </p>
      <div className="space-y-3">
        {reviews.map((r) => {
          const isExpanded = expandedReview === r.completed_at
          const pct = r.total_max > 0 ? Math.round((r.total_score / r.total_max) * 100) : 0
          const tier = pct >= 85 ? 'Exemplary' : pct >= 60 ? 'Accomplished' : 'Developing'

          return (
            <div key={r.completed_at} className="rounded-xl border border-mist dark:border-border-dark overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <button
                  onClick={() => setExpandedReview(isExpanded ? null : r.completed_at)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`text-ink-subtle dark:text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink dark:text-white">
                        {new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {r.is_synthetic && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-400 text-amber-900 rounded">Demo</span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                        tier === 'Exemplary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                        tier === 'Accomplished' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      }`}>{tier}</span>
                    </div>
                    <p className="text-xs text-ink-subtle dark:text-slate-400 mt-0.5">
                      {r.total_score}/{r.total_max} ({pct}%) &middot; E: {r.essential_subtotal}/40 &middot; A: {r.advanced_subtotal}/30 &middot; D: {r.delivery_subtotal}/30
                    </p>
                  </div>
                </button>
                {ADMIN_DELETE_ENABLED && (
                <div>
                  {confirmTarget === r.completed_at ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(r.completed_at)}
                        disabled={deleting === r.completed_at}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {deleting === r.completed_at ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmTarget(null)}
                        className="px-3 py-1.5 text-xs font-medium text-ink-subtle hover:text-ink dark:text-slate-400 dark:hover:text-white rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmTarget(r.completed_at)}
                      className="p-2 text-ink-subtle dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete review"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                )}
              </div>

              {isExpanded && (
                <HistoricalScorecard review={r} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function HistoricalScorecard({ review }: { review: CourseHistoryReview }) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const objIds = Object.keys(review.objectives).sort((a, b) => {
    const sectionOrder = (id: string) => id.startsWith('E') ? 0 : id.startsWith('A') ? 1 : 2
    return sectionOrder(a) - sectionOrder(b) || parseInt(a.slice(1)) - parseInt(b.slice(1))
  })

  const sectionGroups: { name: typeof SECTIONS[number]; ids: string[] }[] = SECTIONS.map((name) => ({
    name,
    ids: objIds.filter((id) =>
      name === 'Essential Design' ? id.startsWith('E') :
      name === 'Advanced Design' ? id.startsWith('A') :
      id.startsWith('D')
    ),
  }))

  function toggleSection(name: string) {
    setCollapsedSections((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div className="border-t border-mist dark:border-border-dark px-3 pb-3 space-y-4 pt-3">
      {sectionGroups.map(({ name, ids }) => {
        const sectionScore = ids.reduce((sum, id) => sum + (review.objectives[id] ?? 0), 0)
        const sectionMax = ids.length * 2
        const isCollapsed = collapsedSections[name] ?? false

        return (
          <div key={name} className="rounded-lg border border-mist dark:border-border-dark overflow-hidden">
            <button
              onClick={() => toggleSection(name)}
              aria-expanded={!isCollapsed}
              className="w-full px-4 py-2.5 bg-mist/50 dark:bg-slate-700/50 border-b border-mist dark:border-border-dark flex items-center justify-between hover:bg-mist/80 dark:hover:bg-slate-700/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`text-ink-subtle dark:text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                >
                  <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h4 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wide">{name}</h4>
              </div>
              <span className="text-xs font-mono font-semibold text-ink-muted dark:text-slate-300">
                {sectionScore}/{sectionMax}
              </span>
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-mist/60 dark:divide-slate-700">
                {ids.map((id) => (
                  <HistoricalObjectiveRow
                    key={id}
                    objId={id}
                    score={review.objectives[id] ?? 0}
                    reviewId={review.review_id}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


function HistoricalObjectiveRow({ objId, score, reviewId }: { objId: string; score: number; reviewId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<ObjectiveDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const label = SCORE_LABELS[score] || 'Developing'
  const colors = SCORE_COLORS[score as 0 | 1 | 2] || SCORE_COLORS[0]
  const title = OBJECTIVE_TITLES[objId] || objId

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (!detail) {
      setLoading(true)
      try {
        const d = await api.getObjective(reviewId, objId)
        setDetail(d)
      } catch {
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div>
      <button
        onClick={handleExpand}
        aria-expanded={expanded}
        className="w-full px-4 py-2.5 flex items-start gap-3 text-left hover:bg-mist/30 dark:hover:bg-slate-700/20 transition-colors"
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          aria-hidden="true"
          className={`text-ink-subtle/60 dark:text-slate-500 transition-transform mt-1 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M3.5 1.5l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`inline-flex items-center justify-center w-9 rounded text-[10px] font-bold ${colors.bg} ${colors.text} flex-shrink-0 py-0.5`}>
          {objId}
        </span>
        <p className="flex-1 text-xs text-ink dark:text-slate-200 leading-snug min-w-0">
          {title}
        </p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${colors.bg} ${colors.text}`}>
          {score}/2 {label}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pl-[60px]">
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <svg className="animate-spin w-3.5 h-3.5 text-ink-subtle" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
              </svg>
              <span className="text-xs text-ink-subtle dark:text-slate-400">Loading details...</span>
            </div>
          )}
          {!loading && !detail && (
            <p className="text-xs text-ink-subtle dark:text-slate-400 py-1">Detail not available for this review.</p>
          )}
          {!loading && detail && (
            <div className="space-y-4 pt-1 bg-mist/30 dark:bg-slate-800/50 rounded-lg p-3 -mx-1">
              {detail.reasoning && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle dark:text-slate-400 mb-1.5">Reasoning</p>
                  <p className="text-xs text-ink-muted dark:text-slate-300 leading-relaxed">{detail.reasoning}</p>
                </div>
              )}
              {detail.accomplished_criteria && detail.accomplished_criteria.length > 0 && (
                <div className="border-l-2 border-green-300 dark:border-green-700 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2">Accomplished Criteria</p>
                  <ul className="space-y-2">
                    {detail.accomplished_criteria.map((c, i) => {
                      const met = c.met === 'MET' || c.met === true
                      const notMet = c.met === 'NOT_MET' || c.met === false
                      return (
                        <li key={i} className="flex gap-2">
                          <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center ${
                            met ? 'bg-green-100 dark:bg-green-900/30' :
                            notMet ? 'bg-red-100 dark:bg-red-900/30' :
                            'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            {met && <svg className="w-2.5 h-2.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {notMet && <svg className="w-2.5 h-2.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                            {!met && !notMet && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink dark:text-slate-200 leading-snug">{c.criterion || c.text}</p>
                            {c.evidence && (
                              <p className="text-[11px] text-ink-subtle dark:text-slate-400 mt-0.5 leading-snug italic">{c.evidence}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {detail.exemplary_criteria && detail.exemplary_criteria.length > 0 && (
                <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">Exemplary Criteria</p>
                  <ul className="space-y-2">
                    {detail.exemplary_criteria.map((c, i) => {
                      const met = c.met === 'MET' || c.met === true
                      const notMet = c.met === 'NOT_MET' || c.met === false
                      return (
                        <li key={i} className="flex gap-2">
                          <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center ${
                            met ? 'bg-green-100 dark:bg-green-900/30' :
                            notMet ? 'bg-red-100 dark:bg-red-900/30' :
                            'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            {met && <svg className="w-2.5 h-2.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {notMet && <svg className="w-2.5 h-2.5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                            {!met && !notMet && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink dark:text-slate-200 leading-snug">{c.criterion || c.text}</p>
                            {c.evidence && (
                              <p className="text-[11px] text-ink-subtle dark:text-slate-400 mt-0.5 leading-snug italic">{c.evidence}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {detail.key_findings && detail.key_findings.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle dark:text-slate-400 mb-1.5">Key Findings</p>
                  <ul className="space-y-1.5">
                    {detail.key_findings.map((f, i) => (
                      <li key={i} className="flex gap-2 text-xs text-ink-muted dark:text-slate-300">
                        <span className="text-ink-subtle dark:text-slate-500 select-none">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.improvement_suggestions && (
                <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">Suggestions</p>
                  <FormattedText text={detail.improvement_suggestions} className="text-xs text-ink-muted dark:text-slate-300 leading-relaxed" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
