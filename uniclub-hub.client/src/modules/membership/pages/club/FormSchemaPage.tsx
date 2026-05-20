import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFormSchema, updateFormSchema } from '@/modules/membership/services/clubApi'
import type { FormField, FormFieldType } from '@/modules/membership/services/club.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Văn bản ngắn' },
  { value: 'textarea', label: 'Văn bản dài' },
  { value: 'select', label: 'Chọn một đáp án' },
  { value: 'file', label: 'Tải file lên' },
]

function newField(): FormField {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false }
}

export default function FormSchemaPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getFormSchema(id)
      .then(schema => { if (schema) setFields(schema.fields) })
      .catch(() => toast.error('Không thể tải form schema.'))
      .finally(() => setLoading(false))
  }, [id])

  function updateField(index: number, patch: Partial<FormField>) {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f))
  }

  function addOption(index: number) {
    const field = fields[index]
    updateField(index, { options: [...(field.options ?? []), ''] })
  }

  function updateOption(fieldIndex: number, optIndex: number, value: string) {
    const options = [...(fields[fieldIndex].options ?? [])]
    options[optIndex] = value
    updateField(fieldIndex, { options })
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    const options = (fields[fieldIndex].options ?? []).filter((_, i) => i !== optIndex)
    updateField(fieldIndex, { options })
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= fields.length) return
    const arr = [...fields]
      ;[arr[index], arr[next]] = [arr[next], arr[index]]
    setFields(arr)
  }

  async function handleSave() {
    const invalid = fields.find(f => !f.label.trim())
    if (invalid) { toast.error('Vui lòng điền đầy đủ tiêu đề câu hỏi.'); return }
    setSaving(true)
    try {
      await updateFormSchema(id, { fields })
      toast.success('Đã lưu form đăng ký.')
    } catch {
      toast.error('Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Đang tải...</div>

  return (
    <div className="px-8 pt-4 pb-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Form đăng ký</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu form'}
        </Button>
      </div>

      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 text-sm">
            Chưa có câu hỏi nào. Bấm "Thêm câu hỏi" để bắt đầu.
          </div>
        )}

        {fields.map((field, i) => (
          <div key={field.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="text-gray-300 shrink-0" />
              <span className="text-sm font-medium text-gray-500 mr-auto">Câu hỏi {i + 1}</span>
              <button onClick={() => moveField(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                <ChevronUp size={16} />
              </button>
              <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                <ChevronDown size={16} />
              </button>
              <button onClick={() => removeField(i)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label>Tiêu đề câu hỏi *</Label>
              <Input
                value={field.label}
                onChange={e => updateField(i, { label: e.target.value })}
                placeholder="Nhập câu hỏi..."
              />
            </div>

            {/* Type + required */}
            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>Loại trả lời</Label>
                <select
                  value={field.type}
                  onChange={e => updateField(i, { type: e.target.value as FormFieldType, options: [] })}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                >
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Bắt buộc</Label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => updateField(i, { required: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Options (select only) */}
            {field.type === 'select' && (
              <div className="space-y-2">
                <Label>Các lựa chọn</Label>
                {(field.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={e => updateOption(i, oi, e.target.value)}
                      placeholder={`Lựa chọn ${oi + 1}`}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i, oi)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addOption(i)} className="gap-1">
                  <Plus size={14} /> Thêm lựa chọn
                </Button>
              </div>
            )}

            {/* Accept (file only) */}
            {field.type === 'file' && (
              <div className="space-y-1.5">
                <Label>Loại file chấp nhận <span className="text-gray-400 font-normal">(để trống = mọi định dạng)</span></Label>
                <Input
                  value={field.accept ?? ''}
                  onChange={e => updateField(i, { accept: e.target.value || undefined })}
                  placeholder=".pdf, .docx, .jpg, .png"
                />
                <p className="text-xs text-gray-400">Ví dụ: .pdf,.docx — người dùng sẽ chỉ chọn được đúng định dạng này</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setFields(prev => [...prev, newField()])}
        className="gap-2 w-full"
      >
        <Plus size={16} /> Thêm câu hỏi
      </Button>
    </div>
  )
}
