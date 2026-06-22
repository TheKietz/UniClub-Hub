import { MoreVertical, CalendarDays, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { SprintStatusBadge } from '../../../shared/StatusBadge'
import ProgressBar from '../../../shared/ProgressBar'
import AvatarGroup from '../../../shared/AvatarGroup'
import type { SprintStatus } from '../../services/operations.types'

export interface SprintCardData {
  id: number
  name: string
  status: SprintStatus
  startDate: string
  endDate: string
  goal?: string
  progress: number
  taskCount: number
  leadName?: string
  members: Array<{ name: string; imageUrl?: string }>
}

interface SprintCardProps {
  sprint: SprintCardData
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onViewKanban: (id: number) => void
  canManage?: boolean
}

const D = {
  border: '1.5px solid #15131a',
  borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  ink: '#15131a',
  inkDim: '#4a4651',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
  indigo: '#4f46e5',
  red: '#ef4444',
}

export default function SprintCard({
  sprint, onEdit, onDelete, onViewKanban, canManage = true,
}: SprintCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const progressColor =
    sprint.status === 'Completed' ? '#22c55e'
    : sprint.progress >= 60 ? D.indigo
    : sprint.progress >= 30 ? '#f59e0b'
    : '#6366f1'

  return (
    <div
      style={{
        position: 'relative',
        background: D.card,
        border: D.border,
        borderRadius: D.radius,
        padding: 20,
        boxShadow: hovered ? D.shadow(5, 5) : D.shadow(),
        transform: hovered ? 'translate(-2px, -2px)' : 'none',
        transition: 'box-shadow .15s, transform .15s',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: status + menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <SprintStatusBadge status={sprint.status} />

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Sprint options"
            style={{
              padding: 4, border: D.borderLight, borderRadius: 6,
              background: 'transparent', cursor: 'pointer', color: D.inkMuted,
              display: 'flex', alignItems: 'center',
            }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 32, zIndex: 50,
                background: D.card, border: D.border, borderRadius: D.radius,
                boxShadow: D.shadow(4, 4), padding: '4px 0', minWidth: 144,
              }}>
                {canManage && (
                  <button
                    type="button"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      color: D.inkDim, background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = D.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => { setMenuOpen(false); onEdit(sprint.id) }}
                  >
                    Chỉnh sửa
                  </button>
                )}
                <button
                  type="button"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    color: D.inkDim, background: 'transparent', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = D.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setMenuOpen(false); onViewKanban(sprint.id) }}
                >
                  Xem Kanban
                </button>
                {canManage && (
                  <>
                    <div style={{ margin: '4px 0', borderTop: D.borderLight }} />
                    <button
                      type="button"
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 14px', fontSize: 13, fontWeight: 600,
                        color: D.red, background: 'transparent', border: 'none', cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => { setMenuOpen(false); onDelete(sprint.id) }}
                    >
                      Xóa sprint
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sprint name */}
      <h3 style={{ fontSize: 15, fontWeight: 800, color: D.ink, marginBottom: 4, lineHeight: 1.3 }}>
        {sprint.name}
      </h3>

      {/* Date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.inkMuted, marginBottom: 16 }}>
        <CalendarDays size={12} />
        <span>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <ProgressBar value={sprint.progress} label="Tiến độ" color={progressColor} size="md" />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 12, borderTop: D.borderLight,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: D.inkMuted, letterSpacing: '.04em' }}>
            {sprint.taskCount} <span style={{ fontWeight: 600 }}>TASKS</span>
          </span>
          {sprint.leadName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: D.inkMuted }}>
              <span style={{ color: D.borderLight }}>|</span>
              <span style={{ fontWeight: 800, letterSpacing: '.04em' }}>LEAD</span>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: D.ink, color: '#facc15',
                fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sprint.leadName[0]}
              </div>
              <span style={{ fontWeight: 700, color: D.inkDim }}>{sprint.leadName}</span>
            </div>
          )}
        </div>
        {sprint.members.length > 0 && <AvatarGroup avatars={sprint.members} max={3} />}
      </div>

      {/* Kanban link */}
      <button
        type="button"
        onClick={() => onViewKanban(sprint.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginTop: 12, fontSize: 12, fontWeight: 700,
          color: D.indigo, background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 0,
        }}
      >
        Xem Kanban <ArrowRight size={12} />
      </button>
    </div>
  )
}
