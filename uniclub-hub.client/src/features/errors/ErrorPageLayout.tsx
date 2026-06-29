import type { ReactNode } from 'react'
import SkyBackground from '@/components/public/SkyBackground'
import { C } from '@/components/public/publicComponents'

export type ErrorPageVariant = 'forbidden' | 'notFound'

const VARIANT = {
  forbidden: {
    accent: C.coral,
    accentSoft: '#fee2e2',
  },
  notFound: {
    accent: C.indigo,
    accentSoft: '#eef2ff',
  },
} as const

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,.74)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
}

type ErrorPageLayoutProps = {
  variant: ErrorPageVariant
  code: string
  badge: string
  title: string
  description: string
  actions: ReactNode
}

export function ErrorPageLayout({
  variant,
  code,
  badge,
  title,
  description,
  actions,
}: ErrorPageLayoutProps) {
  const v = VARIANT[variant]

  return (
    <div
      className="v3-page v3-enter"
      style={{
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      <SkyBackground />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(72px, 16vw, 120px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-.06em',
              color: v.accent,
              marginBottom: 16,
              userSelect: 'none',
            }}
          >
            {code}
          </div>

          <div
            style={{
              ...glassCard,
              border: C.border,
              borderRadius: C.radius,
              boxShadow: '0 18px 40px -16px rgba(10, 47, 110, 0.18)',
              padding: '32px 28px 28px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                padding: '0 12px',
                borderRadius: C.radiusPill,
                background: v.accentSoft,
                border: `1px solid ${v.accent}33`,
                color: v.accent,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '.07em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              {badge}
            </div>

            <h1
              style={{
                margin: '0 0 10px',
                fontSize: 22,
                fontWeight: 900,
                color: C.ink,
                letterSpacing: '-.03em',
                lineHeight: 1.25,
              }}
            >
              {title}
            </h1>

            <p
              style={{
                margin: '0 0 26px',
                fontSize: 14,
                color: C.inkDim,
                lineHeight: 1.65,
              }}
            >
              {description}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {actions}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
