import { useState } from 'react'
import type { SprintItem, TaskItem, KanbanColumnItem } from '../../services/operations.types'

interface CompleteSprintModalProps {
  open: boolean
  sprint: SprintItem
  tasks: TaskItem[]
  columns: KanbanColumnItem[]
  otherSprints: SprintItem[]
  onClose: () => void
  onComplete: (moveToSprintId: number | null) => Promise<void>
}

export default function CompleteSprintModal({
  open, sprint, tasks, columns, otherSprints, onClose, onComplete,
}: CompleteSprintModalProps) {
  if (!open || !sprint) return null
  const lastCol = [...columns].sort((a, b) => a.sortOrder - b.sortOrder).at(-1)

  const completedTasks = tasks.filter(t =>
    lastCol ? t.kanbanColumnId === lastCol.id : t.status === 'Done'
  )
  const openTasks = tasks.filter(t =>
    lastCol ? t.kanbanColumnId !== lastCol.id : t.status !== 'Done'
  )

  // destination: null = backlog, number = sprintId
  const [destination, setDestination] = useState<string>('backlog')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      const sprintId = destination === 'backlog' ? null : parseInt(destination)
      await onComplete(sprintId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    border: '2px solid #0A0A0A',
    borderRadius: 0,
    outline: 'none',
    background: 'white',
    color: '#0A0A0A',
    cursor: 'pointer',
    appearance: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.5)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 500,
        background: 'white',
        border: '3px solid #0A0A0A',
        boxShadow: '8px 8px 0 #0A0A0A',
        borderRadius: 0,
        overflow: 'hidden',
      }}>
        {/* Trophy banner */}
        <div style={{
          background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 60%, #06b6d4 100%)',
          padding: '28px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '3px solid #0A0A0A',
        }}>
          <span style={{ fontSize: 56, lineHeight: 1 }}>🏆</span>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 900, color: '#0A0A0A' }}>
            Complete {sprint.name}
          </h2>

          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#333', lineHeight: 1.6 }}>
            This sprint contains{' '}
            <strong style={{ color: '#0A0A0A' }}>{completedTasks.length} completed work item{completedTasks.length !== 1 ? 's' : ''}</strong>
            {' '}and{' '}
            <strong style={{ color: '#0A0A0A' }}>{openTasks.length} open work item{openTasks.length !== 1 ? 's' : ''}</strong>.
          </p>

          <ul style={{ margin: '0 0 20px', paddingLeft: 20, fontSize: 13, color: '#444', lineHeight: 1.7 }}>
            <li>
              Completed work items includes everything in the last column on the board
              {lastCol && (
                <>, <span style={{ color: '#3B4EFF', fontWeight: 700, cursor: 'default' }}>{lastCol.name}</span></>
              )}.
            </li>
            <li>
              Open work items includes everything from any other column on the board.
              Move these to a new sprint or the backlog.
            </li>
          </ul>

          {openTasks.length > 0 && (
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 900,
                color: '#0A0A0A',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}>
                Move open work items to
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  style={inputStyle}
                >
                  <option value="backlog">Backlog</option>
                  {otherSprints.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', fontSize: 12, color: '#555',
                }}>▼</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '14px 24px',
          borderTop: '2px solid #E0E0E0',
          background: '#FAFAF9',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: '#555',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0F0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '9px 22px',
              fontSize: 13,
              fontWeight: 800,
              border: 'none',
              borderRadius: 4,
              background: saving ? '#93c5fd' : '#3B4EFF',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#2233dd' }}
            onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#3B4EFF' }}
          >
            {saving ? 'Completing...' : 'Complete sprint'}
          </button>
        </div>
      </div>
    </div>
  )
}
