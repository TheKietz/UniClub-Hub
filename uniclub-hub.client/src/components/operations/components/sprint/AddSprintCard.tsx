import { Plus } from 'lucide-react'
import { useState } from 'react'

interface AddSprintCardProps {
  onClick: () => void
}

export default function AddSprintCard({ onClick }: AddSprintCardProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        minHeight: 220, width: '100%', cursor: 'pointer',
        background: hovered ? '#ffffff' : 'rgba(255,255,255,0.6)',
        border: `2px dashed ${hovered ? '#4f46e5' : '#c4bfb0'}`,
        borderRadius: 14,
        boxShadow: hovered ? '3px 3px 0 #15131a' : 'none',
        transition: 'all .15s', fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 10,
        background: hovered ? '#ede9fe' : '#f7f6f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid #15131a', transition: 'background .15s',
      }}>
        <Plus size={24} style={{ color: hovered ? '#4f46e5' : '#918c99' }} />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: hovered ? '#4f46e5' : '#918c99',
        transition: 'color .15s',
      }}>
        Thêm Sprint mới
      </span>
    </button>
  )
}
