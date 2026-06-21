import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { D } from '@/components/shared/managementTheme'

export interface UserSuggestion {
  id: string
  name: string
  avatarUrl?: string | null
}

interface Props {
  value: string
  onChange: (val: string) => void   // chỉ cập nhật text hiển thị, không reload
  onSelect: (name: string) => void  // khi chọn gợi ý → apply filter
  onClear: () => void               // khi xóa → clear filter
  fetchSuggestions: (q: string) => Promise<UserSuggestion[]>
  placeholder?: string
  style?: React.CSSProperties
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#1d4ed8', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const bg = colors[name.charCodeAt(0) % colors.length]
  return url
    ? <img src={url} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: D.borderLight }} alt="" />
    : <div style={{ width: 26, height: 26, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
}

export function UserSearchCombobox({ value, onChange, onSelect, onClear, fetchSuggestions, placeholder = 'Tìm người...', style }: Props) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleFocus() {
    try {
      const results = await fetchSuggestions(value.trim())
      if (results.length > 0) { setSuggestions(results); setOpen(true) }
    } catch { /* ignore */ }
  }

  function handleChange(v: string) {
    onChange(v)  // chỉ cập nhật display, không trigger reload
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(v.trim())
        setSuggestions(results)
        setOpen(results.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  function handleSelect(s: UserSuggestion) {
    onSelect(s.name)  // parent commit search → trigger reload
    setSuggestions([])
    setOpen(false)
  }

  function handleClear() {
    onClear()  // parent clear search → trigger reload
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.inkMuted, pointerEvents: 'none' }} />
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={{
            width: '100%', height: 36, borderRadius: 8, border: D.borderLight,
            paddingLeft: 32, paddingRight: value ? 32 : 12,
            fontSize: 13, color: D.ink, background: D.card, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {value && (
          <button onMouseDown={handleClear} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.inkMuted, display: 'flex', padding: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 50, width: '100%', top: 'calc(100% + 4px)', left: 0,
          background: D.card, border: D.border, borderRadius: 10,
          boxShadow: D.shadow(3, 3), overflow: 'hidden',
        }}>
          {suggestions.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                background: hoverId === s.id ? D.bg : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, color: D.ink, fontWeight: 500,
                borderBottom: idx < suggestions.length - 1 ? D.borderLight : 'none',
              }}
            >
              <Avatar name={s.name} url={s.avatarUrl} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
