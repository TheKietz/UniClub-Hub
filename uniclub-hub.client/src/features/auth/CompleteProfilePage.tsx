import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/axiosInstance'
import { C } from '@/components/public/publicComponents'
import MajorSelect from '@/components/shared/MajorSelect'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { toast } from 'sonner'
import AuthShell from './AuthShell'
import { getApiErrorMessage } from '@/lib/apiError'

type F = {
  fullName: string
  studentId: string
  major: string
  phone: string
  gender: string
  dateOfBirth: string
}
type Errs = Partial<Record<'fullName' | 'studentId' | 'major', string>>

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác', 'Không muốn nêu']

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 14,
  border: '1.5px solid #e4dfd4',
  background: C.bg,
  padding: '0 14px',
  fontSize: 14,
  color: C.ink,
  outline: 'none',
  fontWeight: 600,
  boxSizing: 'border-box',
  fontFamily: "'Be Vietnam Pro', sans-serif",
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  color: C.inkDim,
  marginBottom: 6,
}

export default function CompleteProfilePage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<F>({
    fullName: user?.fullName ?? '',
    studentId: user?.studentId ?? '',
    major: user?.major ?? '',
    phone: user?.phone ?? '',
    gender: user?.gender ?? '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
  })
  const [errs, setErrs] = useState<Errs>({})
  const [loading, setLoading] = useState(false)

  function validate(v: F): Errs {
    const e: Errs = {}
    if (!v.fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên.'
    if (!v.studentId.trim()) e.studentId = 'Vui lòng nhập mã số sinh viên.'
    if (!v.major.trim()) e.major = 'Vui lòng chọn ngành.'
    return e
  }

  function onChange(field: keyof F) {
    return (e: { target: { value: string } }) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      if (field in errs && errs[field as keyof Errs]) setErrs(prev => ({ ...prev, [field]: '' }))
    }
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const fieldErrs = validate(form)
    if (Object.keys(fieldErrs).length > 0) { setErrs(fieldErrs); return }
    setLoading(true)
    try {
      await api.patch('/users/me', {
        fullName: form.fullName,
        studentId: form.studentId,
        major: form.major,
        phone: form.phone || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
      })
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Hoàn tất hồ sơ"
      title="Sắp xong"
      accent="rồi!"
      description="Chỉ một vài thông tin nữa là bạn có thể tham gia câu lạc bộ và trải nghiệm đầy đủ hệ thống."
    >
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: C.ink, letterSpacing: '-.04em' }}>
        Hoàn tất hồ sơ
      </h1>
      <p style={{ margin: '6px 0 20px', fontSize: 14, color: C.inkDim, fontWeight: 600 }}>
        Bổ sung thông tin để bắt đầu sử dụng hệ thống
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Họ và tên */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Họ và tên <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            value={form.fullName}
            onChange={onChange('fullName')}
            placeholder="Nguyễn Văn A"
            style={{ ...inputStyle, borderColor: errs.fullName ? '#ef4444' : '#e4dfd4' }}
          />
          {errs.fullName && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errs.fullName}</p>}
        </div>

        {/* MSSV + Ngành */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Mã số SV <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={form.studentId}
              onChange={onChange('studentId')}
              placeholder="2151234567"
              style={{ ...inputStyle, borderColor: errs.studentId ? '#ef4444' : '#e4dfd4' }}
            />
            {errs.studentId && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errs.studentId}</p>}
          </div>
          <div>
            <label style={labelStyle}>Ngành <span style={{ color: '#ef4444' }}>*</span></label>
            <MajorSelect
              value={form.major}
              onChange={val => {
                setForm(p => ({ ...p, major: val }))
                if (errs.major) setErrs(p => ({ ...p, major: '' }))
              }}
              error={!!errs.major}
            />
            {errs.major && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errs.major}</p>}
          </div>
        </div>

        {/* Divider optional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
          <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Tuỳ chọn
          </span>
          <div style={{ flex: 1, height: 1, background: '#e6e0d6' }} />
        </div>

        {/* SĐT + Giới tính */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Số điện thoại</label>
            <input
              type="tel"
              value={form.phone}
              onChange={onChange('phone')}
              placeholder="0901234567"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Giới tính</label>
            <FilterSelect
              value={form.gender}
              onChange={value => setForm(p => ({ ...p, gender: value }))}
              options={[
                { value: '', label: '-- Chọn --' },
                ...GENDER_OPTIONS.map(g => ({ value: g, label: g })),
              ]}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Ngày sinh */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Ngày sinh</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={onChange('dateOfBirth')}
            max={new Date().toISOString().split('T')[0]}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 50,
            border: 'none',
            borderRadius: 14,
            background: loading ? '#9ca3af' : `linear-gradient(90deg, ${C.coral}, #f43f5e)`,
            color: C.bg,
            fontSize: 15,
            fontWeight: 900,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Đang lưu...' : 'Hoàn tất →'}
        </button>
      </form>

      <p style={{ margin: '16px 0 0', textAlign: 'center', color: C.inkDim, fontSize: 13, fontWeight: 700 }}>
        Muốn đổi tài khoản?{' '}
        <button
          type="button"
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          style={{ color: C.coral, fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
        >
          Đăng xuất
        </button>
      </p>
    </AuthShell>
  )
}
