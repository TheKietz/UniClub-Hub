export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      {/* Status badge skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-20 h-6 bg-gray-100 rounded-md" />
        <div className="w-6 h-6 bg-gray-100 rounded-full" />
      </div>

      {/* Title */}
      <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />

      {/* Date */}
      <div className="w-1/2 h-3 bg-gray-100 rounded mb-4" />

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <div className="w-12 h-3 bg-gray-100 rounded" />
          <div className="w-8 h-3 bg-gray-100 rounded" />
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <div className="w-16 h-3 bg-gray-100 rounded" />
        </div>
        <div className="flex -space-x-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 bg-gray-100 rounded-full ring-2 ring-white" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 bg-gray-100 rounded-xl" />
      </div>
      <div className="w-16 h-7 bg-gray-100 rounded mb-1" />
      <div className="w-24 h-4 bg-gray-100 rounded" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="h-12 bg-gray-50 border-b flex items-center px-4 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 border-b border-gray-50 flex items-center px-4 gap-4">
          {[1, 2, 3, 4, 5].map(j => (
            <div key={j} className="h-3 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
