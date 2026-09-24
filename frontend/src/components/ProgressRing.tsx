interface Props {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
}

export default function ProgressRing({
  value,
  size = 56,
  strokeWidth = 4,
  label,
  sublabel,
  color = 'var(--color-royal)',
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 1))
  const percentage = Math.round(Math.min(Math.max(value, 0), 1) * 100)

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${percentage}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-mist dark:text-border-dark"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          {label && <span className="text-xs font-bold font-mono text-ink dark:text-white leading-none">{label}</span>}
          {sublabel && <span className="text-[9px] text-ink-subtle dark:text-slate-300 mt-0.5 leading-none">{sublabel}</span>}
        </div>
      )}
    </div>
  )
}
