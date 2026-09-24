export const SCORE_LABELS = ['Developing', 'Accomplished', 'Exemplary'] as const

export const SCORE_COLORS = {
  0: { bg: 'bg-bronze-lt dark:bg-red-950/40', text: 'text-bronze dark:text-red-400', border: 'border-bronze/30 dark:border-red-800' },
  1: { bg: 'bg-gold-lt dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-gold/30 dark:border-yellow-800' },
  2: { bg: 'bg-pblue-lt dark:bg-blue-950/40', text: 'text-pblue dark:text-blue-400', border: 'border-pblue/30 dark:border-blue-800' },
} as const

export const SECTIONS = ['Essential Design', 'Advanced Design', 'Course Delivery'] as const
