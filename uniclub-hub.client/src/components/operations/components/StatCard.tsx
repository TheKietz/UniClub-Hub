import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  subtitle?: string
  trend?: { value: string; positive: boolean }
}

export default function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  subtitle,
  trend,
}: StatCardProps) {
  return (
    <div style={{
      background: 'white',
      border: '2px solid #0A0A0A',
      boxShadow: '4px 4px 0 #0A0A0A',
      borderRadius: 0,
      padding: '20px',
      transition: 'box-shadow .12s, transform .12s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translate(-2px,-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '6px 6px 0 #0A0A0A';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0 #0A0A0A';
      }}
    >
      <div className="mgmt-page-header" style={{ marginBottom: 12 }}>
        {/* Icon container — square, thick border */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 0,
          border: '2px solid #0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: iconBg,
          flexShrink: 0,
        }}>
          <Icon size={22} style={{ color: iconColor }} />
        </div>

        {/* Trend badge — rectangular, bordered */}
        {trend && (
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '3px 8px',
            border: '2px solid #0A0A0A',
            borderRadius: 0,
            background: trend.positive ? '#DCFCE7' : '#FEE2E2',
            color: trend.positive ? '#166534' : '#991B1B',
            letterSpacing: '.04em',
          }}>
            {trend.value}
          </span>
        )}
      </div>

      {/* Value */}
      <p style={{
        fontSize: 30,
        fontWeight: 900,
        color: '#0A0A0A',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        margin: 0,
      }}>
        {value}
      </p>

      {/* Label */}
      <p style={{
        fontSize: 10,
        fontWeight: 800,
        color: '#555',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
      }}>
        {label}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          fontSize: 11,
          color: '#888',
          marginTop: 4,
          fontWeight: 600,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
