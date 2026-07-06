/**
 * Shared design tokens for the internal dashboard UI.
 *
 * Color tokens now follow the runtime theme switcher (src/contexts/ThemeContext.tsx),
 * which sets these CSS variables on :root and swaps them per theme:
 *   ink / border / shadow → var(--c-ink)    (primary dark colour: text, borders, shadows)
 *   bg                    → var(--c-bg)     (light page / working-area background)
 *   coral                 → var(--c-accent) (accent / pop colour)
 *
 * NOTE: inkDim / inkMuted stay literal hex ON PURPOSE — they are passed to Recharts
 * as <Cell fill={...}> (SVG presentation attributes), where var()/color-mix() do NOT
 * resolve. Keep them real colours. `red` also stays fixed for true danger semantics;
 * the status colours (indigo/emerald/amber/red/sky/violet) are semantic and theme-agnostic.
 */
export const D = {
  border: '1.5px solid var(--c-ink)',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14,
  pill: 999,
  ink: 'var(--c-ink)',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: 'var(--c-bg)',
  card: '#ffffff',
  indigo: '#2563eb',
  coral: 'var(--c-accent)',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  sky: '#38bdf8',
  violet: '#8b5cf6',
  violetSoft: '#ede9fe',
  lemon: '#ffffff',
} as const
