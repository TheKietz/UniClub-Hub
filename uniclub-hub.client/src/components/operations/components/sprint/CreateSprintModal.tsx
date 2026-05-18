import { useState } from 'react'
import { X } from 'lucide-react'
import type { CreateSprintDto, SprintStatus } from '../../services/operations.types'

interface CreateSprintModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateSprintDto) => Promise<void>
  editData?: {
    id: number
    name: string
    goal?: string
    startDate: string
    endDate: string
    status: SprintStatus
    eventId?: number
  }
}

const EMPTY: CreateSprintDto = {
  name: '',
  goal: '',
  startDate: '',
  endDate: '',
  eventId: undefined,
}

export default function CreateSprintModal({
  open,
  onClose,
  onSubmit,
  editData,
}: CreateSprintModalProps) {
  const [form, setForm] = useState<CreateSprintDto>(
    editData
      ? {
          name: editData.name,
          goal: editData.goal ?? '',
          startDate: editData.startDate.slice(0, 10),
          endDate: editData.endDate.slice(0, 10),
          eventId: editData.eventId,
        }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Tên sprint không được để trống'
    if (!form.startDate) e.startDate = 'Vui lòng chọn ngày bắt đầu'
    if (!form.endDate) e.endDate = 'Vui lòng chọn ngày kết thúc'
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit(form)
      setForm(EMPTY)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof CreateSprintDto, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel - slides in from right like Figma */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {editData ? 'Chỉnh sửa Sprint' : 'Thiết lập Sprint mới'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5">
          {/* Sprint Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              id="sprint-name"
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g., Q3 Launch Prep"
              className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                transition-all placeholder:text-gray-400
                ${errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="sprint-start-date"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                  transition-all
                  ${errors.startDate ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="sprint-end-date"
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                  transition-all
                  ${errors.endDate ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Sprint Goal
            </label>
            <textarea
              id="sprint-goal"
              value={form.goal ?? ''}
              onChange={e => set('goal', e.target.value)}
              placeholder="Describe the primary objective for this sprint..."
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white
                resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl
              hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#0A2540] rounded-xl
              hover:bg-[#0d2f4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm"
          >
            {saving
              ? 'Đang lưu...'
              : editData
                ? 'Lưu thay đổi'
                : 'Create Sprint'}
          </button>
        </div>
      </div>
    </div>
  )
}
