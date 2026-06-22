import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMemberFieldSchema, updateMemberFieldSchema } from '@/components/membership/services/clubApi'
import type { MemberFieldDef, MemberFieldType } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'

const FIELD_TYPES: { value: MemberFieldType; label: string }[] = [
  { value: 'text',     label: 'Văn bản ngắn' },
  { value: 'textarea', label: 'Văn bản dài' },
  { value: 'select',   label: 'Chọn một' },
]

const TYPE_STYLE: Record<string, { bg: string; label: string }> = {
  text:     { bg: '#4f46e5', label: 'VĂN BẢN NGẮN' },
  textarea: { bg: '#7c3aed', label: 'VĂN BẢN DÀI' },
  select:   { bg: '#f59e0b', label: 'CHỌN MỘT' },
}

const D = {
  border: '1.5px solid var(--c-ink)', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 var(--c-ink)`,
  radius: 14, pill: 999,
  ink: 'var(--c-ink)', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: 'var(--c-bg)', card: '#ffffff', indigo: '#4f46e5',
}

const inputS: React.CSSProperties = {
  width: '100%', height: 44, borderRadius: 10, border: D.borderLight,
  padding: '0 14px', fontSize: 14, color: D.ink, outline: 'none',
  background: D.card, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 6 }

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12, padding: 2,
      background: checked ? '#10b981' : '#d1d5db',
      border: 'none', cursor: 'pointer', transition: 'background .2s',
      display: 'flex', alignItems: 'center',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform .2s', display: 'block', flexShrink: 0,
      }} />
    </button>
  )
}

function FieldTypeSelect({ value, onChange }: { value: MemberFieldType; onChange: (v: MemberFieldType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = FIELD_TYPES.find(t => t.value === value)!
  const ts = TYPE_STYLE[value]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...inputS, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: ts.bg, flexShrink: 0, display: 'block' }} />
          <span style={{ fontSize: 14, color: D.ink }}>{current.label}</span>
        </div>
        <ChevronDown size={14} style={{ color: D.inkMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 30, width: '100%', top: 'calc(100% + 4px)', left: 0,
          background: D.card, border: D.border, borderRadius: 10, boxShadow: D.shadow(3, 3), overflow: 'hidden',
        }}>
          {FIELD_TYPES.map(t => (
            <button key={t.value} type="button"
              onMouseDown={() => { onChange(t.value); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                background: value === t.value ? '#eef2ff' : 'transparent',
                color: value === t.value ? D.indigo : D.inkDim,
                fontWeight: value === t.value ? 700 : 400,
                fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: '1px solid #f3f4f6',
              }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_STYLE[t.value].bg, flexShrink: 0, display: 'block' }} />
              {t.label}
              {value === t.value && <span style={{ marginLeft: 'auto', fontSize: 12, color: D.indigo }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function newField(): MemberFieldDef {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false }
}

export default function MemberFieldsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [fields, setFields] = useState<MemberFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMemberFieldSchema(id)
      .then(data => setFields(data))
      .catch(() => toast.error('Không thể tải cấu hình trường thông tin.'))
      .finally(() => setLoading(false))
  }, [id])

  function updateField(index: number, patch: Partial<MemberFieldDef>) {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
  }

  function addOption(index: number) {
    updateField(index, { options: [...(fields[index].options ?? []), ''] })
  }

  function updateOption(fi: number, oi: number, value: string) {
    const options = [...(fields[fi].options ?? [])]
    options[oi] = value
    updateField(fi, { options })
  }

  function removeOption(fi: number, oi: number) {
    updateField(fi, { options: (fields[fi].options ?? []).filter((_, i) => i !== oi) })
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= fields.length) return
    const arr = [...fields];
    [arr[index], arr[next]] = [arr[next], arr[index]]
    setFields(arr)
  }

  async function handleSave() {
    if (fields.find(f => !f.label.trim())) { toast.error('Vui lòng điền đầy đủ tên trường.'); return }
    setSaving(true)
    try {
      await updateMemberFieldSchema(id, fields)
      toast.success('Đã lưu cấu hình trường thông tin thành viên.')
    } catch {
      toast.error('Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ padding: '28px 32px', color: D.inkMuted, fontSize: 13, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  )

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Trường thông tin thành viên</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Định nghĩa các trường thông tin đặc thù cho CLB của bạn</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          background: D.ink, color: '#facc15', border: D.border, boxShadow: D.shadow(2, 2),
          padding: '10px 22px', borderRadius: D.pill, fontSize: 13, fontWeight: 800,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', flexShrink: 0,
        }}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#dbeafe', border: D.border, borderRadius: 12, boxShadow: D.shadow(3, 3),
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20, fontSize: 13, fontWeight: 600, color: D.ink,
      }}>
        <span style={{ fontSize: 16 }}>🗂</span>
        <span>
          <strong>{fields.length}</strong> trường · Hiển thị trong hồ sơ từng thành viên và có thể tìm kiếm
        </span>
      </div>

      {/* Field cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
        {fields.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: D.inkMuted, fontSize: 13 }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🗃</p>
            Chưa có trường nào. Nhấn "+ Thêm trường mới" để bắt đầu.
          </div>
        )}
        {fields.map((field, i) => {
          const ts = TYPE_STYLE[field.type] ?? TYPE_STYLE.text
          return (
            <div key={field.id} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 20px' }}>
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ color: '#ccc', fontSize: 15, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: ts.bg, flexShrink: 0,
                  display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 900,
                }}>{i + 1}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: D.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Trường {i + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveField(i, -1)} disabled={i === 0}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', color: D.inkMuted, opacity: i === 0 ? 0.25 : 0.7, display: 'grid', placeItems: 'center', fontSize: 14 }}>↑</button>
                  <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: i === fields.length - 1 ? 'not-allowed' : 'pointer', color: D.inkMuted, opacity: i === fields.length - 1 ? 0.25 : 0.7, display: 'grid', placeItems: 'center', fontSize: 14 }}>↓</button>
                  <div style={{ width: 1, height: 16, background: D.borderLight, margin: '0 4px' }} />
                  <button onClick={() => setFields(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'grid', placeItems: 'center', fontSize: 14 }}>✕</button>
                </div>
              </div>

              {/* Label */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelS}>Tên trường <span style={{ color: '#ef4444' }}>*</span></label>
                <input value={field.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="VD: Tech stack, Nhạc cụ, Dự án đã làm..." style={inputS} />
              </div>

              {/* Type + Required */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelS}>Kiểu dữ liệu</label>
                  <FieldTypeSelect value={field.type} onChange={v => updateField(i, { type: v, options: [] })} />
                </div>
                <div style={{
                  padding: '0 14px', height: 44, borderRadius: 10, background: ts.bg,
                  border: D.border, boxShadow: D.shadow(2, 2),
                  display: 'flex', alignItems: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '.06em', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{ts.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: D.inkDim }}>Bắt buộc</label>
                  <Toggle checked={field.required} onChange={v => updateField(i, { required: v })} />
                </div>
              </div>

              {/* Select options */}
              {field.type === 'select' && (
                <div style={{ marginTop: 14 }}>
                  <label style={labelS}>Các lựa chọn</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(field.options ?? []).map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 8 }}>
                        <input value={opt} onChange={e => updateOption(i, oi, e.target.value)} placeholder={`Lựa chọn ${oi + 1}`} style={{ ...inputS, flex: 1, height: 38 }} />
                        <button onClick={() => removeOption(i, oi)} style={{ width: 38, height: 38, borderRadius: 8, background: 'none', border: D.borderLight, cursor: 'pointer', color: '#ef4444', display: 'grid', placeItems: 'center', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addOption(i)} style={{ padding: '7px 14px', borderRadius: D.pill, background: D.card, border: D.borderLight, fontSize: 12, fontWeight: 600, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>+ Thêm lựa chọn</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <button onClick={() => setFields(prev => [...prev, newField()])} style={{
        width: '100%', padding: '16px', borderRadius: D.radius,
        background: 'transparent', border: `1.5px dashed #c4bdb1`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 14, fontWeight: 700, color: D.indigo, cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: 20,
      }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.indigo, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 900 }}>+</span>
        Thêm trường mới
      </button>

      <p style={{ fontSize: 12, color: D.inkMuted, lineHeight: 1.6 }}>
        <strong>Mẹo:</strong> Dùng "Chọn một" cho những giá trị cố định như nhạc cụ, tech stack.
        "Văn bản dài" phù hợp cho mô tả dự án, kinh nghiệm.
      </p>
    </div>
  )
}
