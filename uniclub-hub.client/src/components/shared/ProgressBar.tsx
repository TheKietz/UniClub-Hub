interface ProgressBarProps {
  value: number          // 0-100
  label?: string
  size?: 'sm' | 'md'
  color?: string
  showLabel?: boolean
}

export default function ProgressBar({
  value,
  label,
  size = 'sm',
  color = '#1d4ed8',
  showLabel = true,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === 'md' ? 'h-2.5' : 'h-1.5'

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs text-gray-500">{label}</span>
          )}
          <span className="text-xs font-semibold" style={{ color }}>
            {clamped}%
          </span>
        </div>
      )}
      <div className={`${height} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  )
}
