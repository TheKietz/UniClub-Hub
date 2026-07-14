import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { UpdateSprintDto } from '../../services/operations.types'
import { FilterSelect } from '@/components/shared/FilterSelect'

type Duration = '1week' | '2weeks' | '3weeks' | '4weeks' | 'custom'

const DURATION_OPTIONS: { value: Duration; label: string; days: number }[] = [
  { value: '1week',  label: '1 tuần',  days: 7  },
  { value: '2weeks', label: '2 tuần', days: 14 },
  { value: '3weeks', label: '3 tuần', days: 21 },
  { value: '4weeks', label: '4 tuần', days: 28 },
  { value: 'custom', label: 'Tùy chỉnh',  days: 0  },
]

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): string {
  return new Date(s).toISOString()
}

interface StartSprintModalProps {
  open: boolean
  sprintName: string
  taskCount: number
  defaultStartDate?: string
  defaultEndDate?: string
  onClose: () => void
  onStart: (dto: Partial<UpdateSprintDto>) => Promise<void>
}

export default function StartSprintModal({
  open,
  sprintName,
  taskCount,
  defaultStartDate,
  defaultEndDate,
  onClose,
  onStart,
}: StartSprintModalProps) {
  const now = new Date()
  const [name, setName] = useState(sprintName)
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState<Duration>('2weeks')
  const [startDt, setStartDt] = useState(toDatetimeLocal(now))
  const [endDt, setEndDt] = useState(toDatetimeLocal(addDays(now, 14)))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const base = defaultStartDate ? new Date(defaultStartDate) : new Date()
    setName(sprintName)
    setGoal('')
    setDuration('2weeks')
    setStartDt(toDatetimeLocal(base))
    setEndDt(toDatetimeLocal(addDays(base, 14)))
    setErrors({})
  }, [open, sprintName, defaultStartDate])

  function handleDurationChange(d: Duration) {
    setDuration(d)
    if (d !== 'custom') {
      const days = DURATION_OPTIONS.find(o => o.value === d)!.days
      setEndDt(toDatetimeLocal(addDays(new Date(startDt), days)))
    }
  }

  function handleStartDtChange(val: string) {
    setStartDt(val)
    if (duration !== 'custom') {
      const days = DURATION_OPTIONS.find(o => o.value === duration)!.days
      setEndDt(toDatetimeLocal(addDays(new Date(val), days)))
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Tên sprint không được để trống'
    if (!startDt) e.startDt = 'Vui lòng chọn ngày bắt đầu'
    if (!endDt) e.endDt = 'Vui lòng chọn ngày kết thúc'
    if (startDt && endDt && new Date(startDt) >= new Date(endDt)) {
      e.endDt = 'Ngày kết thúc phải sau ngày bắt đầu'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    try {
      await onStart({
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate: fromDatetimeLocal(startDt),
        endDate: fromDatetimeLocal(endDt),
        status: 'Active',
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const plannedEnd = defaultEndDate ? new Date(defaultEndDate) : null
  const showPlannedHint = duration === 'custom' && plannedEnd

  const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    fontWeight: 600,
    border: `2px solid ${hasErr ? '#FF3B3B' : '#0A0A0A'}`,
    borderRadius: 0,
    outline: 'none',
    background: 'white',
    color: '#0A0A0A',
    boxSizing: 'border-box',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    color: '#0A0A0A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px 24px', boxSizing: 'border-box' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.45)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        background: 'white',
        border: '3px solid #0A0A0A',
        boxShadow: '8px 8px 0 #0A0A0A',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 80px)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '2px solid #0A0A0A',
          background: '#0A0A0A',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#FFE500', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            Bắt đầu tuần công việc
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28,
              border: '2px solid #FFE500',
              borderRadius: 0,
              background: 'transparent',
              color: '#FFE500',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* Work items hint */}
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#444' }}>
            <strong style={{ color: '#0A0A0A' }}>{taskCount}</strong> công việc đã được đưa vào tuần công việc này. Bạn có thể chỉnh sửa tên, thời lượng, ngày bắt đầu/kết thúc và mục tiêu trước khi bắt đầu.
          </p>
          <p style={{ margin: '0 0 18px', fontSize: 12, fontWeight: 700, color: '#888' }}>
            Các trường bắt buộc <span style={{ color: '#FF3B3B' }}>*</span> 
          </p>

          {/* Sprint name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Tên tuần công việc <span style={{ color: '#FF3B3B' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle(!!errors.name)}
            />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#FF3B3B', fontWeight: 700 }}>{errors.name}</p>}
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Thời lượng <span style={{ color: '#FF3B3B' }}>*</span>
            </label>
            <FilterSelect
              value={duration}
              onChange={value => handleDurationChange(value as Duration)}
              options={DURATION_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
          </div>

          {/* Start date */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Ngày bắt đầu <span style={{ color: '#FF3B3B' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={startDt}
              onChange={e => handleStartDtChange(e.target.value)}
              style={inputStyle(!!errors.startDt)}
            />
            {errors.startDt && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#FF3B3B', fontWeight: 700 }}>{errors.startDt}</p>}
          </div>

          {/* End date */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Ngày kết thúc <span style={{ color: '#FF3B3B' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={endDt}
              onChange={e => setEndDt(e.target.value)}
              readOnly={duration !== 'custom'}
              style={{
                ...inputStyle(!!errors.endDt),
                background: duration !== 'custom' ? '#F0F0F0' : 'white',
                color: duration !== 'custom' ? '#777' : '#0A0A0A',
              }}
            />
            {showPlannedHint && (
              <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#555' }}>
                Planned start date:{' '}
                <strong style={{ color: '#0A0A0A' }}>
                  {plannedEnd!.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </strong>
                <br />
                <span style={{ color: '#888' }}>A sprint's start date impacts velocity and scope in reports.</span>
              </p>
            )}
            {errors.endDt && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#FF3B3B', fontWeight: 700 }}>{errors.endDt}</p>}
          </div>

          {/* Sprint goal */}
          <div>
            <label style={{ ...labelStyle, color: '#555' }}>Mục tiêu</label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={4}
              placeholder="Mục tiêu của sprint này..."
              style={{
                ...inputStyle(),
                resize: 'vertical',
                minHeight: 80,
                fontWeight: 500,
                color: '#333',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '14px 20px',
          borderTop: '2px solid #0A0A0A',
          background: '#FAFAF0',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              border: '2px solid #0A0A0A',
              borderRadius: 0,
              background: 'white',
              color: '#0A0A0A',
              cursor: 'pointer',
              letterSpacing: '.04em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0F0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '8px 22px',
              fontSize: 13,
              fontWeight: 900,
              border: '2px solid #0A0A0A',
              borderRadius: 0,
              background: saving ? '#AAA' : '#3B4EFF',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '3px 3px 0 #0A0A0A',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              transition: 'transform .1s, box-shadow .1s',
            }}
            onMouseEnter={e => { if (!saving) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-1px,-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '5px 5px 0 #0A0A0A'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0 #0A0A0A'; }}
          >
            {saving ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
