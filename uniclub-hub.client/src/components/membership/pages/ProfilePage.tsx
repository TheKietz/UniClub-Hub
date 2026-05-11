import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Camera, ChevronDown } from 'lucide-react'
import MajorSelect from '@/components/shared/MajorSelect'

const GENDER_OPTIONS = [
  { value: '', label: '— Chưa chọn —' },
  { value: 'Male', label: 'Nam' },
  { value: 'Female', label: 'Nữ' },
  { value: 'Other', label: 'Khác' },
]

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = GENDER_OPTIONS.find(o => o.value === value)?.label ?? '— Chưa chọn —'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-white px-3 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        style={{ height: '42px' }}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          {GENDER_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                value === o.value
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500']

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm',
  DEPT_LEAD: 'Trưởng ban',
  MEMBER: 'Thành viên',
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    studentId: user?.studentId ?? '',
    major: user?.major ?? '',
    phone: user?.phone ?? '',
    gender: user?.gender ?? '',
    dateOfBirth: user?.dateOfBirth?.slice(0, 10) ?? '',
  })

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh jpg, png, webp, gif.')
      return
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('File không được vượt quá 5MB.'); return }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.patch('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
      toast.success('Đã cập nhật ảnh đại diện.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Upload thất bại.')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/users/me', {
        fullName: form.fullName || null,
        studentId: form.studentId || null,
        major: form.major || null,
        phone: form.phone || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
      })
      await refreshUser()
      toast.success('Đã cập nhật hồ sơ.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const avatarColor = AVATAR_COLORS[(user?.fullName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
  const activeMemberships = user?.memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE) ?? []

  return (
    <div className="px-8 pt-4 pb-8">
      <h1 className="text-xl font-bold leading-none mb-6" style={{ color: '#0f172a' }}>Hồ sơ cá nhân</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

        {/* ── Cột trái ── */}
        <div className="space-y-5">

          {/* Avatar card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold" style={{ color: '#111827' }}>Ảnh đại diện</p>
            </div>
            <div className="p-5 flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover" />
                  : <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${avatarColor}`}>
                      {(user?.fullName ?? user?.email ?? '?')[0].toUpperCase()}
                    </div>
                }
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-colors"
                >
                  {uploadingAvatar
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={14} />}
                </button>
              </div>
              <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{user?.fullName ?? '—'}</p>
                <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{user?.email}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Đổi ảnh đại diện
                </button>
              </div>
            </div>
          </div>

          {/* CLB đang tham gia */}
          {activeMemberships.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold" style={{ color: '#111827' }}>CLB đang tham gia</p>
              </div>
              <div className="px-5 divide-y divide-gray-100">
                {activeMemberships.map(m => (
                  <div key={m.clubId} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{m.clubName}</p>
                      {m.departmentName && <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{m.departmentName}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 font-medium" style={{ color: '#4f46e5' }}>
                      {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* end cột trái */}

        {/* ── Cột phải — form (col-span-2) ── */}
        <form onSubmit={handleSave} className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>Thông tin cá nhân</p>
          </div>

          <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Họ và tên</Label>
              <Input value={form.fullName} onChange={field('fullName')} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-1.5">
              <Label>MSSV</Label>
              <Input value={form.studentId} onChange={field('studentId')} placeholder="2151012345" />
            </div>
            <div className="space-y-1.5">
              <Label>Ngành học</Label>
              <MajorSelect
                value={form.major}
                onChange={val => setForm(p => ({ ...p, major: val }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={form.phone} onChange={field('phone')} placeholder="0912345678" />
            </div>
            <div className="space-y-1.5">
              <Label>Giới tính</Label>
              <GenderSelect
                value={form.gender}
                onChange={val => setForm(p => ({ ...p, gender: val }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày sinh</Label>
              <Input type="date" value={form.dateOfBirth} onChange={field('dateOfBirth')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled className="bg-gray-50 text-gray-400" />
            <p className="text-xs" style={{ color: '#9ca3af' }}>Email không thể thay đổi.</p>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
          </div>{/* end p-6 */}
        </form>

      </div>
    </div>
  )
}
