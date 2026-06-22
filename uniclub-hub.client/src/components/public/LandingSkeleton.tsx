import { C } from '@/components/public/publicComponents'

function SkeletonStyles() {
  return (
    <style>{`
      @keyframes landingSkeletonPulse {
        0%, 100% { opacity: .58; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-1px); }
      }
      .landing-skeleton-pulse {
        animation: landingSkeletonPulse 1.35s ease-in-out infinite;
      }
    `}</style>
  )
}

function Line({ width, height = 12, color = 'rgba(10, 47, 110, .16)' }: { width: string; height?: number; color?: string }) {
  return (
    <span
      className="landing-skeleton-pulse"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: 999,
        background: color,
      }}
    />
  )
}

export function LandingStatSkeleton() {
  return (
    <div className="landing-glass-card landing-stat-card" aria-hidden>
      <SkeletonStyles />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Line width="44%" height={10} />
        <span className="landing-skeleton-pulse" style={{ width: 10, height: 10, borderRadius: 999, background: C.coral }} />
      </div>
      <div>
        <Line width="28%" height={42} color="rgba(10, 47, 110, .24)" />
        <div style={{ marginTop: 12 }}>
          <Line width="56%" height={12} />
        </div>
      </div>
    </div>
  )
}

export function LandingClubCardSkeleton({ compact = true }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        borderRadius: C.radius,
        overflow: 'hidden',
        border: C.border,
        boxShadow: C.shadow(),
        background: C.card,
      }}
    >
      <SkeletonStyles />
      <div
        className="landing-skeleton-pulse"
        style={{
          height: compact ? 100 : 120,
          padding: 14,
          background: 'linear-gradient(135deg, rgba(29,78,216,.9), rgba(14,165,233,.84))',
          borderBottom: C.border,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ width: 42, height: 42, borderRadius: 10, background: C.ink, display: 'block' }} />
        <Line width="72%" height={16} color="rgba(255,255,255,.72)" />
      </div>
      <div style={{ padding: '14px 14px 12px' }}>
        <Line width="70%" height={16} color="rgba(10, 47, 110, .22)" />
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <Line width="100%" />
          <Line width="86%" />
          <Line width="62%" />
        </div>
        <div style={{ borderTop: `1px dashed ${C.rule}`, marginTop: 14, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <Line width="34%" height={14} />
          <Line width="20%" height={14} />
        </div>
      </div>
    </div>
  )
}

export function LandingClubGridSkeleton({ count = 6, compact = true }: { count?: number; compact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <LandingClubCardSkeleton key={i} compact={compact} />
      ))}
    </>
  )
}
