import { C } from '@/components/public/publicComponents'

const btnBase: React.CSSProperties = {
  height: 44,
  padding: '0 20px',
  borderRadius: C.radiusPill,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'transform .12s, box-shadow .12s',
  textDecoration: 'none',
}

export const errorBtnSecondary: React.CSSProperties = {
  ...btnBase,
  background: C.card,
  color: C.ink,
  border: C.border,
  boxShadow: '0 2px 8px rgba(10, 47, 110, 0.08)',
}

export const errorBtnPrimary: React.CSSProperties = {
  ...btnBase,
  background: C.indigo,
  color: '#fff',
  border: '1.5px solid #1d4ed8',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
}
