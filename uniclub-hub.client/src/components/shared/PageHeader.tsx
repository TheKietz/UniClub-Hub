interface PageHeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({
  breadcrumbs,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>›</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-500 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title + action row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 mt-1 max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
