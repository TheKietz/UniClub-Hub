import type { CSSProperties } from 'react'
import { D } from '@/components/shared/managementTheme'

/**
 * Shared helpers, form-field styles and status config for the event pages
 * (EventListPage, EventDetailPage, UniversityEventDetailPage).
 * Extracted verbatim from the previously-duplicated copies so behavior is unchanged.
 */

/** Date + time, e.g. "05/03/2026, 14:30". Used on the event detail pages. */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** Date only, e.g. "05/03/2026". Used on the event list pages. */
export function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Currency in VND, or "Chưa xác định" when unset. */
export function formatVnd(amount?: number): string {
  if (amount == null) return 'Chưa xác định'
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

export const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
  border: '1.5px solid #c4bfb0', borderRadius: 8, outline: 'none',
  background: '#fff', color: D.ink, fontFamily: "'Be Vietnam Pro', sans-serif",
  boxSizing: 'border-box',
}

export const labelStyle: CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: D.inkDim,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em',
}

export { EVENT_STATUS_CONFIG, EventStatusBadge } from '@/components/shared/StatusBadge'
