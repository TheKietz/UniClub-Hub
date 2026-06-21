import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { D } from '@/components/shared/managementTheme'

export interface SelectOption { value: string; label: string }

interface Props {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  style?: React.CSSProperties
  buttonStyle?: React.CSSProperties
  menuStyle?: React.CSSProperties
  disabled?: boolean
  maxMenuHeight?: number
}

export function FilterSelect({ value, onChange, options, style, buttonStyle, menuStyle, disabled = false, maxMenuHeight = 280 }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value) ?? options[0] ?? { value: '', label: '—' }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        disabled={disabled}
        style={{
          width: '100%', height: 36, borderRadius: 8, border: D.borderLight,
          padding: '0 10px 0 12px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 6, background: D.bg,
          cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13,
          color: disabled ? D.inkMuted : D.inkDim,
          opacity: disabled ? 0.7 : 1,
          whiteSpace: 'nowrap',
          ...buttonStyle,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
          {current.label}
        </span>
        <ChevronDown
          size={13}
          style={{ color: D.inkMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}
        />
      </button>

      {open && !disabled && (
        <div style={{
          position: 'absolute', zIndex: 50, minWidth: '100%', top: 'calc(100% + 4px)', left: 0,
          background: D.card, border: D.border, borderRadius: 10,
          boxShadow: D.shadow(3, 3), overflowY: 'auto', maxHeight: maxMenuHeight,
          ...menuStyle,
        }}>
          {options.map((o, idx) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: value === o.value ? '#eef2ff' : 'transparent',
                color: value === o.value ? D.indigo : D.inkDim,
                fontWeight: value === o.value ? 700 : 400,
                fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: idx < options.length - 1 ? '1px solid #f3f4f6' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {o.label}
              {value === o.value && <span style={{ fontSize: 11, color: D.indigo, flexShrink: 0 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
