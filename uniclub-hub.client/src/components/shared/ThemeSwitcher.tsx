import { useEffect, useRef, useState } from 'react'
import { Settings, Check, X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top: '50%', right: 0, transform: 'translateY(-50%)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Panel */}
      <div
        style={{
          width: open ? 268 : 0,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          overflow: 'hidden',
          transition: 'width .25s ease, opacity .2s ease',
          background: '#ffffff',
          border: '1.5px solid var(--c-ink)',
          borderRight: 'none',
          borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
          boxShadow: '-10px 12px 40px rgba(0,0,0,.18)',
          marginRight: -1,
        }}
      >
        <div style={{ width: 268, padding: '14px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--c-ink)', letterSpacing: '-.01em' }}>
              Giao diện
            </div>
            <button
              onClick={() => setOpen(false)}
              title="Đóng"
              style={{
                width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,.05)', color: 'var(--c-ink)',
                display: 'grid', placeItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, lineHeight: 1.4 }}>
            Chọn bảng màu cho khu vực nội bộ.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {themes.map(t => {
              const active = t.id === themeId
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  title={t.desc}
                  style={{
                    position: 'relative', textAlign: 'left', cursor: 'pointer',
                    padding: 8, borderRadius: 12, fontFamily: 'inherit',
                    border: active ? '2px solid var(--c-ink)' : '1.5px solid #e5e7eb',
                    background: active ? 'rgba(0,0,0,.03)' : '#fff',
                    transition: 'border-color .12s, background .12s',
                  }}
                >
                  {/* Mini preview: chrome bar + bg + accent dot */}
                  <div style={{
                    height: 34, borderRadius: 8, overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,.08)', display: 'flex', marginBottom: 6,
                  }}>
                    <div style={{ width: 10, background: t.palette['--c-chrome'] }} />
                    <div style={{ flex: 1, background: t.palette['--c-bg'], position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: 6, top: 6, width: 12, height: 5, borderRadius: 3,
                        background: t.palette['--c-ink'],
                      }} />
                      <span style={{
                        position: 'absolute', left: 6, bottom: 6, width: 14, height: 14, borderRadius: 7,
                        background: t.palette['--c-accent'],
                      }} />
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, color: '#111827', lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.name}
                  </div>
                  {active && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9,
                      background: 'var(--c-ink)', color: '#fff', display: 'grid', placeItems: 'center',
                    }}>
                      <Check size={12} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Gear tab */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Đổi giao diện"
        aria-label="Đổi giao diện"
        style={{
          width: 42, height: 46,
          border: '1.5px solid var(--c-ink)', borderRight: 'none',
          borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
          background: 'var(--c-chrome)', color: '#fff',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          boxShadow: '-6px 6px 20px rgba(0,0,0,.18)',
          flexShrink: 0,
        }}
      >
        <Settings
          size={20}
          style={{ transition: 'transform .4s ease', transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </button>
    </div>
  )
}
