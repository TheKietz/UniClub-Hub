import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFormSchema, getMemberFieldSchema, updateFormSchema } from '@/components/membership/services/clubApi'
import type { FormField, FormFieldType, MemberFieldDef } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { useUnsavedNavigationGuard } from '@/hooks/useUnsavedNavigationGuard'
import type { SettingsTabChildProps } from './settingsTabTypes'

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text',     label: 'Văn bản ngắn' },
  { value: 'textarea', label: 'Văn bản dài' },
  { value: 'select',   label: 'Chọn một' },
  { value: 'file',     label: 'Tải file lên' },
]

const TYPE_STYLE: Record<string, { bg: string; label: string }> = {
  text:     { bg: '#1d4ed8', label: 'VĂN BẢN NGẮN' },
  textarea: { bg: '#7c3aed', label: 'VĂN BẢN DÀI' },
  select:   { bg: '#f59e0b', label: 'CHỌN MỘT' },
  file:     { bg: '#ff5a3c', label: 'TẢI FILE' },
}

const FILE_TYPE_OPTIONS = [
  { value: '.pdf',  label: 'PDF' },
  { value: '.doc',  label: 'DOC' },
  { value: '.docx', label: 'DOCX' },
  { value: '.xls',  label: 'XLS' },
  { value: '.xlsx', label: 'XLSX' },
  { value: '.ppt',  label: 'PPT' },
  { value: '.pptx', label: 'PPTX' },
  { value: '.jpg',  label: 'JPG' },
  { value: '.png',  label: 'PNG' },
  { value: '.zip',  label: 'ZIP' },
]

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
        transition: 'transform .2s',
        display: 'block', flexShrink: 0,
      }} />
    </button>
  )
}

function FieldTypeSelect({ value, onChange }: { value: FormFieldType; onChange: (v: FormFieldType) => void }) {
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
        ...inputS, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', gap: 8,
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
          background: D.card, border: D.border, borderRadius: 10,
          boxShadow: D.shadow(3, 3), overflow: 'hidden',
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

function newField(): FormField {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false }
}

export default function FormSchemaPage({ onDirtyChange, onBindHandles }: SettingsTabChildProps = {}) {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canManage = clubPermissions.can(CLUB_PERMISSIONS.RECRUITMENT_FORM_MANAGE)

  const [fields, setFields] = useState<FormField[]>([])
  const [memberFields, setMemberFields] = useState<MemberFieldDef[]>([])
  const [baseline, setBaseline] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      getFormSchema(id),
      getMemberFieldSchema(id).catch(() => [] as MemberFieldDef[]),
    ])
      .then(([schema, memberSchema]) => {
        const next = schema?.fields ?? []
        setFields(next)
        setMemberFields(memberSchema)
        setBaseline(JSON.stringify(next))
      })
      .catch(() => toast.error('Không thể tải form schema.'))
      .finally(() => setLoading(false))
  }, [id])

  function compatibleMemberFields(field: FormField): MemberFieldDef[] {
    if (field.type === 'file') return []
    return memberFields.filter(mf => mf.type === field.type)
  }

  function setLinkedField(index: number, linkedFieldId: string | undefined) {
    const field = fields[index]
    const linked = linkedFieldId
      ? memberFields.find(mf => mf.id === linkedFieldId)
      : undefined
    updateField(index, {
      linkedFieldId: linkedFieldId || undefined,
      options: linked?.type === 'select' ? undefined : field.options,
    })
  }

  function updateField(index: number, patch: Partial<FormField>) {
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

  const isDirty = !loading && baseline !== '' && JSON.stringify(fields) !== baseline

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const discard = useCallback(() => {
    if (!baseline) return
    setFields(JSON.parse(baseline) as FormField[])
  }, [baseline])

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (fields.find(f => !f.label.trim())) {
      toast.error('Vui lòng điền đầy đủ tiêu đề câu hỏi.')
      return false
    }
    const linkedIds = fields.map(f => f.linkedFieldId).filter((v): v is string => !!v)
    const seen = new Set<string>()
    for (const linkedId of linkedIds) {
      if (seen.has(linkedId)) {
        const mf = memberFields.find(f => f.id === linkedId)
        toast.error(`Trường «${mf?.label ?? linkedId}» đã được liên kết với nhiều hơn 1 câu hỏi.`)
        return false
      }
      seen.add(linkedId)
    }
    for (const field of fields) {
      if (!field.linkedFieldId) continue
      const mf = memberFields.find(f => f.id === field.linkedFieldId)
      if (!mf) {
        toast.error(`Câu hỏi «${field.label}» liên kết tới trường không tồn tại.`)
        return false
      }
      if (field.type !== 'file' && mf.type !== field.type) {
        toast.error(`Câu hỏi «${field.label}» và trường «${mf.label}» không cùng kiểu dữ liệu.`)
        return false
      }
    }
    setSaving(true)
    try {
      await updateFormSchema(id, { fields })
      setBaseline(JSON.stringify(fields))
      toast.success('Đã lưu form đăng ký.')
      return true
    } catch {
      toast.error('Lưu thất bại.')
      return false
    } finally {
      setSaving(false)
    }
  }, [fields, id, memberFields])

  useEffect(() => {
    onBindHandles?.({ save: handleSave, discard })
    return () => onBindHandles?.(null)
  }, [discard, handleSave, onBindHandles])

  const embedded = onDirtyChange != null
  useUnsavedNavigationGuard({
    when: isDirty && !embedded,
    onSave: handleSave,
    onDiscard: discard,
    description: 'Bạn có thay đổi chưa lưu trong form đăng ký. Lưu trước khi rời trang?',
  })

  if (!clubPermissions.loading && !canManage)
    return <PermissionDenied />

  if (loading) return (
    <div style={{ padding: '28px 32px', color: D.inkMuted, fontSize: 13, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Đang tải...</div>
  )

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Form đăng ký</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Tuỳ chỉnh câu hỏi cho đơn ứng tuyển CLB</p>
        </div>
        <button onClick={() => void handleSave()} disabled={saving} style={{
          background: D.ink, color: '#ffffff', border: D.border, boxShadow: D.shadow(2, 2),
          padding: '10px 22px', borderRadius: D.pill, fontSize: 13, fontWeight: 800,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', flexShrink: 0,
        }}>
          {saving ? 'Đang lưu...' : 'Lưu form'}
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#facc15', border: D.border, borderRadius: 12,
        boxShadow: D.shadow(3, 3), padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20, fontSize: 13, fontWeight: 600, color: D.ink,
      }}>
        <span style={{ fontSize: 16 }}>📝</span>
        <span>
          <strong>{fields.length}</strong> câu hỏi · Sinh viên sẽ điền khi nộp đơn ứng tuyển
        </span>
      </div>

      {/* Field cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
        {fields.map((field, i) => {
          const ts = TYPE_STYLE[field.type] ?? TYPE_STYLE.text
          const numBg = ts.bg
          const linkable = field.type !== 'file'
          const linkedMember = field.linkedFieldId
            ? memberFields.find(mf => mf.id === field.linkedFieldId)
            : undefined
          const compatibleFields = compatibleMemberFields(field)
          return (
            <div key={field.id} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), padding: '18px 20px' }}>
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ color: '#ccc', fontSize: 15, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: numBg, flexShrink: 0,
                  display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 900,
                }}>{i + 1}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: D.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Câu hỏi {i + 1}
                </span>
                {/* Move + close controls */}
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

              {/* Label input */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelS}>Tiêu đề câu hỏi <span style={{ color: '#ef4444' }}>*</span></label>
                <input value={field.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Nhập câu hỏi..." style={inputS} />
              </div>

              {/* Type + Required row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelS}>Loại trả lời</label>
                  <FieldTypeSelect
                    value={field.type}
                    onChange={v => {
                      const keepLink = v !== 'file'
                        && field.linkedFieldId
                        && memberFields.find(mf => mf.id === field.linkedFieldId)?.type === v
                      updateField(i, {
                        type: v,
                        options: [],
                        linkedFieldId: keepLink ? field.linkedFieldId : undefined,
                      })
                    }}
                  />
                </div>

                {/* Type badge */}
                <div style={{
                  padding: '0 14px', height: 44, borderRadius: 10, background: ts.bg,
                  border: D.border, boxShadow: D.shadow(2, 2),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '.06em',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{ts.label}</div>

                {/* Required toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: D.inkDim }}>Bắt buộc</label>
                  <Toggle checked={field.required} onChange={v => updateField(i, { required: v })} />
                </div>
              </div>

              {linkable && memberFields.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label style={labelS}>Lưu câu trả lời vào trường</label>
                  <select
                    value={field.linkedFieldId ?? ''}
                    onChange={e => setLinkedField(i, e.target.value || undefined)}
                    style={{ ...inputS, cursor: 'pointer' }}
                  >
                    <option value="">Không liên kết</option>
                    {compatibleFields.map(mf => (
                      <option key={mf.id} value={mf.id}>{mf.label || '(Chưa đặt tên)'}</option>
                    ))}
                  </select>
                  {field.linkedFieldId && !linkedMember && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: D.coral }}>
                      Trường liên kết không còn tồn tại — hãy chọn lại hoặc bỏ liên kết.
                    </p>
                  )}
                </div>
              )}

              {/* Select options */}
              {field.type === 'select' && (
                <div style={{ marginTop: 14 }}>
                  {field.linkedFieldId && linkedMember ? (
                    <p style={{ margin: 0, fontSize: 12, color: D.inkMuted, lineHeight: 1.6 }}>
                      Lựa chọn lấy từ trường «{linkedMember.label || 'chưa đặt tên'}»:
                      {' '}{(linkedMember.options ?? []).filter(Boolean).join(', ') || '(chưa có lựa chọn)'}
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {/* File accept */}
              {field.type === 'file' && (
                <div style={{ marginTop: 14 }}>
                  <label style={labelS}>
                    Loại file chấp nhận
                    <span style={{ fontWeight: 400, color: D.inkMuted, marginLeft: 6 }}>
                      {field.accept ? `(${field.accept})` : '(mọi định dạng)'}
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {FILE_TYPE_OPTIONS.map(opt => {
                      const selected = (field.accept ?? '').split(',').map(s => s.trim()).includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const current = (field.accept ?? '').split(',').map(s => s.trim()).filter(Boolean)
                            const next = selected
                              ? current.filter(v => v !== opt.value)
                              : [...current, opt.value]
                            updateField(i, { accept: next.length ? next.join(', ') : undefined })
                          }}
                          style={{
                            padding: '5px 14px', borderRadius: D.pill, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                            background: selected ? D.ink : D.card,
                            color: selected ? '#facc15' : D.inkDim,
                            border: selected ? D.border : D.borderLight,
                            boxShadow: selected ? D.shadow(2, 2) : 'none',
                            transition: 'all .1s',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
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
        Thêm câu hỏi mới
      </button>

      {/* Tip */}
      <p style={{ fontSize: 12, color: D.inkMuted, lineHeight: 1.6 }}>
        <strong>Mẹo:</strong> Dùng "Văn bản ngắn" cho câu trả lời 1 dòng, "Văn bản dài" cho paragraph.
        "Chọn một" sẽ cho phép bạn thêm lựa chọn sẵn. "Tải file" cho phép SV upload tài liệu.
      </p>
    </div>
  )
}
