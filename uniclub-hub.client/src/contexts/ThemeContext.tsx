import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Theme system for the internal app (operations / admin / club / member).
 *
 * Colors are driven by 5 CSS variables that the dashboard surfaces reference
 * via `var(--c-*)` in their inline styles:
 *   --c-bg        page / working-area background (light)
 *   --c-ink       primary dark color: text, borders, buttons, shadows
 *   --c-accent    accent / pop color
 *   --c-chrome    sidebar & top tab bar background (dark — keeps white text readable)
 *   --c-chrome-2  dark popover surfaces (dropdowns)
 *
 * NOTE: every theme keeps `--c-chrome` dark on purpose, because the sidebar/
 * top bar use hardcoded white text. Vary the hue, not the darkness.
 */
export type ThemePalette = {
  '--c-bg': string
  '--c-ink': string
  '--c-accent': string
  '--c-chrome': string
  '--c-chrome-2': string
}

export type Theme = {
  id: string
  name: string
  desc: string
  palette: ThemePalette
}

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Xanh UEF',
    desc: 'Mặc định — xanh / trắng / đỏ',
    palette: { '--c-bg': '#e9f1fc', '--c-ink': '#0a2f6e', '--c-accent': '#e11d2a', '--c-chrome': '#0a1c42', '--c-chrome-2': '#0c2a63' },
  },
  {
    id: 'classic',
    name: 'Cổ điển',
    desc: 'Giao diện cũ — nền kem',
    palette: { '--c-bg': '#f7f6f1', '--c-ink': '#15131a', '--c-accent': '#ff5a3c', '--c-chrome': '#0f172a', '--c-chrome-2': '#1e1c24' },
  },
  {
    id: 'slate',
    name: 'Xám đá',
    desc: 'Trung tính, hiện đại',
    palette: { '--c-bg': '#f1f5f9', '--c-ink': '#0f172a', '--c-accent': '#2563eb', '--c-chrome': '#111827', '--c-chrome-2': '#1f2937' },
  },
  {
    id: 'violet',
    name: 'Tím hoàng hôn',
    desc: 'Tím + hồng sen',
    palette: { '--c-bg': '#f4f0fd', '--c-ink': '#4c1d95', '--c-accent': '#db2777', '--c-chrome': '#1e1640', '--c-chrome-2': '#2a1f57' },
  },
  {
    id: 'emerald',
    name: 'Xanh ngọc',
    desc: 'Lục bảo + hổ phách',
    palette: { '--c-bg': '#eafaf3', '--c-ink': '#065f46', '--c-accent': '#f59e0b', '--c-chrome': '#0c2a23', '--c-chrome-2': '#123a30' },
  },
  {
    id: 'ocean',
    name: 'Đại dương',
    desc: 'Xanh biển + lam',
    palette: { '--c-bg': '#e8f6fb', '--c-ink': '#0e4f63', '--c-accent': '#0ea5e9', '--c-chrome': '#06283a', '--c-chrome-2': '#0a3550' },
  },
  {
    id: 'rose',
    name: 'Hồng anh đào',
    desc: 'Hồng + đỏ rượu',
    palette: { '--c-bg': '#fdf0f4', '--c-ink': '#9f1239', '--c-accent': '#e11d48', '--c-chrome': '#3a0d22', '--c-chrome-2': '#4d1530' },
  },
  {
    id: 'amber',
    name: 'Cam hoàng thổ',
    desc: 'Cam đất ấm áp',
    palette: { '--c-bg': '#fff6ec', '--c-ink': '#7c2d12', '--c-accent': '#ea580c', '--c-chrome': '#2a1505', '--c-chrome-2': '#3a1e0a' },
  },
]

const STORAGE_KEY = 'uniclub-theme'

function applyTheme(palette: ThemePalette) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v)
}

type ThemeContextValue = {
  themeId: string
  setThemeId: (id: string) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'default'
  )

  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
    applyTheme(theme.palette)
  }, [themeId])

  function setThemeId(id: string) {
    setThemeIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
