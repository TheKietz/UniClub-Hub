interface AvatarGroupProps {
  avatars: Array<{ name: string; imageUrl?: string }>
  max?: number
  size?: 'sm' | 'md'
}

const COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0d9488',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
}: AvatarGroupProps) {
  const displayed = avatars.slice(0, max)
  const remaining = avatars.length - max
  const dim = size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]'
  const overlap = size === 'md' ? '-ml-2' : '-ml-1.5'

  return (
    <div className="flex items-center">
      {displayed.map((a, i) => (
        <div
          key={`${a.name}-${i}`}
          className={`${dim} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white ${
            i > 0 ? overlap : ''
          }`}
          style={{ background: hashColor(a.name), zIndex: displayed.length - i }}
          title={a.name}
        >
          {a.imageUrl ? (
            <img
              src={a.imageUrl}
              alt={a.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(a.name)
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${dim} rounded-full flex items-center justify-center font-semibold text-gray-500 bg-gray-100 ring-2 ring-white ${overlap}`}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
