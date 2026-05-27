// Shared SVG chart components for dashboard pages — Campus neo-brutalist style.

const INK = '#15131a'
const INK_MUTED = '#918c99'
const BORDER = '1.5px solid #15131a'
const BORDER_LIGHT = '1px solid #e8e3d6'
const BG = '#f7f6f1'
const RADIUS = 14

function shadow(x = 3, y = 3) { return `${x}px ${y}px 0 #15131a` }

// ── MiniAreaChart ────────────────────────────────────────────────
export function MiniAreaChart({ data, color, height = 100 }: {
  data: { month?: string; val: number }[]
  color: string
  height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data.map(d => d.val), 1)
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.val / max) * 85,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L100,100 L0,100 Z`
  const gradId = `ag${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8"
        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={color} />)}
    </svg>
  )
}

// ── MiniBarChart ─────────────────────────────────────────────────
export function MiniBarChart({ data, color, height = 120 }: {
  data: { name?: string; month?: string; val?: number; count?: number }[]
  color: string | ((i: number) => string)
  height?: number
}) {
  const vals = data.map(d => d.val ?? d.count ?? 0)
  const max = Math.max(...vals, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingTop: 12 }}>
      {data.map((d, i) => {
        const v = d.val ?? d.count ?? 0
        const bg = typeof color === 'function' ? color(i) : color
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: INK }}>{v}</span>
            <div style={{
              width: '100%', borderRadius: 4, border: BORDER,
              height: `${Math.max((v / max) * 80, 4)}%`,
              background: bg, transition: 'height .4s ease',
            }} />
            <span style={{
              fontSize: 9.5, color: INK_MUTED, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              textAlign: 'center',
            }}>{d.month ?? d.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── MiniDonut ────────────────────────────────────────────────────
export function MiniDonut({ segments, size = 120, thickness = 22 }: {
  segments: { val: number; color: string }[]
  size?: number
  thickness?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.val, 0)
  if (total === 0) return null
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      {segments.map((seg, i) => {
        const dash = (seg.val / total) * circ
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

// ── StatCard ─────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div style={{
      padding: '18px 20px', borderRadius: RADIUS,
      background: '#fff', border: BORDER, boxShadow: shadow(),
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: color, border: BORDER,
        display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11.5, color: INK_MUTED, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: INK, letterSpacing: '-.03em', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── ChartCard ────────────────────────────────────────────────────
export function ChartCard({ title, sub, rightLabel, children, style: sx }: {
  title: string; sub?: string; rightLabel?: string
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{
      borderRadius: RADIUS, background: '#fff',
      border: BORDER, boxShadow: shadow(), overflow: 'hidden', ...sx,
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: BORDER_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 1 }}>{sub}</div>}
        </div>
        {rightLabel && <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>{rightLabel}</div>}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

// ── DTag ─────────────────────────────────────────────────────────
export function DTag({ children, bg = INK, color = '#f7f6f1', style: sx }: {
  children: React.ReactNode; bg?: string; color?: string; style?: React.CSSProperties
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 4, background: bg, color, ...sx,
    }}>{children}</span>
  )
}

// ── PageShell ─────────────────────────────────────────────────────
// Standard page content wrapper
export function PageShell({ children, style: sx }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '28px 32px', minHeight: '100%',
      background: BG, fontFamily: "'Be Vietnam Pro', sans-serif",
      ...sx,
    }}>
      {children}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────
export function PageHeader({ title, sub, actions }: {
  title: string; sub?: string; actions?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: INK, letterSpacing: '-.025em', margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: INK_MUTED, marginTop: 4 }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

// ── Pill button ───────────────────────────────────────────────────
export function PillBtn({ children, onClick, color = INK, bg = '#fff', style: sx }: {
  children: React.ReactNode; onClick?: () => void; color?: string; bg?: string; style?: React.CSSProperties
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 999,
      background: bg, color, border: BORDER, boxShadow: shadow(2, 2),
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: "'Be Vietnam Pro', sans-serif",
      ...sx,
    }}>{children}</button>
  )
}
