import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/axiosInstance'
import { toast } from 'sonner'
import { Camera, ChevronDown } from 'lucide-react'
import MajorSelect from '@/components/shared/MajorSelect'

const GENDER_OPTIONS = [
  { value: '', label: '— Chưa chọn —' },
  { value: 'Male', label: 'Nam' },
  { value: 'Female', label: 'Nữ' },
  { value: 'Other', label: 'Khác' },
]

const D = {
  border: '1.5px solid #15131a', borderLight: '1px solid #e8e3d6',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14, pill: 999,
  ink: '#15131a', inkDim: '#4a4651', inkMuted: '#918c99',
  bg: '#f7f6f1', card: '#ffffff', indigo: '#4f46e5',
}

const inputS: React.CSSProperties = {
  width: '100%', height: 38, borderRadius: 8, border: D.borderLight,
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: D.inkDim, display: 'block', marginBottom: 4 }

const ROLE_LABELS: Record<string, string> = {
  CLUB_ADMIN: 'Ban chủ nhiệm', DEPT_LEAD: 'Trưởng ban', MEMBER: 'Thành viên',
}
const ROLE_COLORS: Record<string, string> = {
  CLUB_ADMIN: '#ff5a3c', DEPT_LEAD: '#f59e0b', MEMBER: '#14b8a6',
}
const AVATAR_COLORS = ['#4f46e5', '#10b981', '#7c3aed', '#ef4444', '#f59e0b', '#06b6d4']
const CLUB_BG_COLORS = ['#4f46e5', '#7c3aed', '#ff5a3c', '#14b8a6', '#38bdf8', '#ec4899', '#f59e0b', '#10b981']

function getClubShort(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase()
}
function getClubBg(id: number) { return CLUB_BG_COLORS[id % CLUB_BG_COLORS.length] }

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = GENDER_OPTIONS.find(o => o.value === value)?.label ?? '— Chưa chọn —'

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ ...inputS, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: D.bg }}>
        <span style={{ color: value ? D.ink : D.inkMuted }}>{label}</span>
        <ChevronDown size={14} style={{ color: D.inkMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 20, width: '100%', marginTop: 4, background: D.card, border: D.borderLight, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)', overflow: 'hidden' }}>
          {GENDER_OPTIONS.map(o => (
            <button key={o.value} type="button" onMouseDown={() => { onChange(o.value); setOpen(false) }}
              style={{ width: '100%', padding: '9px 12px', textAlign: 'left', fontSize: 13, background: value === o.value ? '#eef2ff' : 'transparent', color: value === o.value ? D.indigo : D.inkDim, fontWeight: value === o.value ? 700 : 400, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [key]: e.target.value }))

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { toast.error('Chỉ chấp nhận ảnh jpg, png, webp, gif.'); return }
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

  const initials = (user?.fullName ?? user?.email ?? '?')[0].toUpperCase()
  const avatarColor = AVATAR_COLORS[(user?.fullName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
  const activeMemberships = user?.memberships.filter(m => m.status === MEMBERSHIP_STATUS.ACTIVE) ?? []

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Hồ sơ cá nhân</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Quản lý thông tin tài khoản của bạn</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar card */}
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: D.borderLight, background: D.bg }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>Ảnh đại diện</p>
            </div>
            <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: D.border }} />
                  : <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarColor, border: D.border, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 28, fontWeight: 900 }}>{initials}</div>
                }
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: D.indigo, color: '#fff', border: '2px solid #fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  {uploadingAvatar ? <span style={{ fontSize: 10 }}>⟳</span> : <Camera size={12} />}
                </button>
              </div>
              <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: D.ink, margin: 0 }}>{user?.fullName ?? '—'}</p>
                <p style={{ fontSize: 12, color: D.inkMuted, marginTop: 2 }}>{user?.email}</p>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 11, fontWeight: 700, color: D.indigo, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 6, padding: 0 }}>
                  Đổi ảnh đại diện
                </button>
              </div>
            </div>
          </div>

          {/* CLB membership */}
          <div style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: D.borderLight, background: D.bg }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>CLB đang tham gia</p>
            </div>
            {activeMemberships.length === 0 ? (
              <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: D.bg, border: `1.5px dashed #c4bdb1`, display: 'grid', placeItems: 'center', fontSize: 16, color: D.inkMuted }}>◇</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: D.inkMuted, margin: 0 }}>Chưa tham gia CLB nào</p>
                  <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>Khám phá và đăng ký các câu lạc bộ phù hợp với bạn.</p>
                </div>
              </div>
            ) : (
              <div>
                {activeMemberships.map((m, i) => (
                  <div key={m.clubId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < activeMemberships.length - 1 ? D.borderLight : 'none' }}>
                    {m.clubLogoUrl ? (
                      <img src={m.clubLogoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: D.borderLight, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: getClubBg(m.clubId), display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '-.01em' }}>
                        {getClubShort(m.clubName)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.clubName}</p>
                      {m.departmentName && <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 2 }}>{m.departmentName}</p>}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: ROLE_COLORS[m.clubRole] ?? D.indigo, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>
                      {ROLE_LABELS[m.clubRole] ?? m.clubRole}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — form */}
        <form onSubmit={handleSave} style={{ background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(), overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: D.borderLight, background: D.bg }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0 }}>Thông tin cá nhân</p>
          </div>
          <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelS}>Họ và tên</label>
                <input value={form.fullName} onChange={field('fullName')} placeholder="Nguyễn Văn A" style={inputS} />
              </div>
              <div>
                <label style={labelS}>MSSV</label>
                <input value={form.studentId} onChange={field('studentId')} placeholder="2151012345" style={inputS} />
              </div>
              <div>
                <label style={labelS}>Ngành học</label>
                <MajorSelect value={form.major} onChange={val => setForm(p => ({ ...p, major: val }))} />
              </div>
              <div>
                <label style={labelS}>Số điện thoại</label>
                <input value={form.phone} onChange={field('phone')} placeholder="0912345678" style={inputS} />
              </div>
              <div>
                <label style={labelS}>Giới tính</label>
                <GenderSelect value={form.gender} onChange={val => setForm(p => ({ ...p, gender: val }))} />
              </div>
              <div>
                <label style={labelS}>Ngày sinh</label>
                <input type="date" value={form.dateOfBirth} onChange={field('dateOfBirth')} style={inputS} />
              </div>
            </div>

            <div>
              <label style={labelS}>Email</label>
              <input value={user?.email ?? ''} disabled style={{ ...inputS, opacity: 0.6, cursor: 'not-allowed' }} />
              <p style={{ fontSize: 11, color: D.inkMuted, marginTop: 4 }}>Email không thể thay đổi.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{ background: '#ff5a3c', color: '#fff', border: D.border, boxShadow: D.shadow(2, 2), padding: '10px 22px', borderRadius: D.pill, fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi →'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  )
}
