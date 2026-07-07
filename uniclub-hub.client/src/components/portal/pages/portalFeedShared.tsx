import { useEffect, useState } from 'react'
import { C } from '@/components/public/publicComponents'
import { FilterSelect } from '@/components/shared/FilterSelect'
import type { PortalFeedScope } from '../services/portal.types'

// ─── Shared style ────────────────────────────────────────────────────
export const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,.74)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
}

// ─── Debounce hook ───────────────────────────────────────────────────
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Date helpers ────────────────────────────────────────────────────
export function fmtDate(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
}
export function fmtDateShort(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function fmtTime(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
export function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return 'Chưa xác định thời gian'
  const s = fmtDateShort(start)
  if (!end) return s
  const e = fmtDateShort(end)
  return s === e ? s : `${s} – ${e}`
}

// ─── Scope tabs (Tất cả / Cấp trường / Cấp CLB) ──────────────────────
export const SCOPE_TABS: { value: PortalFeedScope; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'university', label: 'Cấp trường' },
  { value: 'club', label: 'Cấp CLB' },
]

export function ScopeChips({ value, onChange }: { value: PortalFeedScope; onChange: (v: PortalFeedScope) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {SCOPE_TABS.map(t => {
        const active = value === t.value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              padding: '8px 18px', borderRadius: C.radiusPill,
              background: active ? C.ink : C.card,
              color: active ? C.lemon : C.ink,
              border: C.border,
              boxShadow: active ? 'none' : C.shadow(2, 2),
              transform: active ? 'translate(2px,2px)' : 'none',
              fontSize: 13, fontWeight: 700, transition: 'all .12s',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t.label}</button>
        )
      })}
    </div>
  )
}

// ─── Club filter dropdown (public glass styling) ─────────────────────
export function ClubFilterSelect({
  clubs, value, onChange, disabled,
}: {
  clubs: { id: number; name: string }[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const options = [{ value: '', label: 'Tất cả CLB' }, ...clubs.map(c => ({ value: String(c.id), label: c.name }))]
  return (
    <FilterSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      style={{ width: 240 }}
      buttonStyle={{
        height: 42, borderRadius: C.radiusPill,
        border: C.border, color: C.ink, fontWeight: 700, fontSize: 13,
        background: 'rgba(255,255,255,.74)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      }}
      menuStyle={{ border: C.border, borderRadius: 14, boxShadow: C.shadow(3, 3) }}
    />
  )
}

// ─── Search bar (public glass styling) ───────────────────────────────
export function PortalSearchBar({
  value, onChange, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div style={{
      ...glassCard,
      display: 'flex', alignItems: 'center', gap: 10,
      border: C.border, borderRadius: C.radiusPill,
      padding: '0 20px', height: 52, boxShadow: C.shadow(),
    }}>
      <span style={{ fontSize: 18, color: C.inkMuted }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 15, color: C.ink, height: '100%', fontWeight: 500,
          fontFamily: "'Be Vietnam Pro', sans-serif",
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            width: 28, height: 28, borderRadius: 999, border: 'none',
            background: C.ink, color: C.bg, fontSize: 14, fontWeight: 800,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >×</button>
      )}
    </div>
  )
}

// ─── Origin badge: school (Toàn trường) vs club (name + logo) ────────
export function ScopeBadge({
  clubId, clubName, clubLogoUrl, small,
}: {
  clubId: number | null
  clubName?: string | null
  clubLogoUrl?: string | null
  small?: boolean
}) {
  const isSchool = clubId == null
  const fs = small ? 9.5 : 10.5
  if (isSchool) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: fs, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
        padding: '3px 9px', borderRadius: C.radiusPill,
        background: C.coral, color: C.bg,
      }}>★ Toàn trường</span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: fs, fontWeight: 800, letterSpacing: '.02em',
      padding: small ? '2px 8px 2px 3px' : '3px 10px 3px 3px', borderRadius: C.radiusPill,
      background: C.card, color: C.ink, border: C.border, maxWidth: 200,
    }}>
      {clubLogoUrl
        ? <img src={clubLogoUrl} alt="" style={{ width: 16, height: 16, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: 16, height: 16, borderRadius: 999, background: C.ink, color: C.bg, fontSize: 8, fontWeight: 900, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{(clubName ?? '?')[0]}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName ?? 'CLB'}</span>
    </span>
  )
}

// ─── Reusable states ─────────────────────────────────────────────────
export function FeedError({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <section style={{ padding: '64px 28px', textAlign: 'center' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 20, lineHeight: 1.55 }}>
          Backend có thể chưa chạy hoặc API đang gián đoạn. Thử tải lại một lần nữa.
        </div>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '10px 20px', borderRadius: C.radiusPill,
            background: C.ink, color: C.lemon, border: C.border,
            fontSize: 14, fontWeight: 750, boxShadow: C.shadow(),
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Thử lại</button>
      </div>
    </section>
  )
}

export function EmptyFeed({ icon, title, hint, onReset }: { icon: string; title: string; hint: string; onReset: () => void }) {
  return (
    <section style={{ padding: '64px 28px', textAlign: 'center' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 20 }}>{hint}</div>
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px', borderRadius: C.radiusPill,
            background: C.ink, color: C.lemon, border: C.border,
            fontSize: 14, fontWeight: 700, boxShadow: C.shadow(),
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Xóa bộ lọc</button>
      </div>
    </section>
  )
}

export function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          padding: '12px 28px', borderRadius: C.radiusPill,
          background: C.card, color: C.ink, border: C.border,
          fontSize: 14, fontWeight: 800, boxShadow: C.shadow(3, 3),
          cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          opacity: loading ? 0.7 : 1,
        }}
      >{loading ? 'Đang tải…' : 'Xem thêm ↓'}</button>
    </div>
  )
}
