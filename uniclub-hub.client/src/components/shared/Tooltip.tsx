import { useState, useRef } from 'react'

interface TooltipProps {
  label: string
  children: React.ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  function show() {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setPos({ top: r.top - 36, left: r.left + r.width / 2 })
    }
    timerRef.current = setTimeout(() => setVisible(true), 150)
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <div ref={wrapRef} style={{ display: 'inline-flex' }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: '#0a2f6e',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          padding: '5px 10px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          fontFamily: "'Be Vietnam Pro', sans-serif",
          boxShadow: '2px 2px 0 rgba(0,0,0,.25)',
          letterSpacing: '.01em',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}
