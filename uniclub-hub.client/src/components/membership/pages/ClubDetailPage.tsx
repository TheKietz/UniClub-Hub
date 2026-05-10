import { MEMBERSHIP_STATUS } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getClubDetail, getDepartments, getFormSchema, getMyApplications, submitApplication } from '@/components/membership/services/clubApi'
import type { ClubDetail, DepartmentItem, FormSchema, ApplicationItem } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Users, Building, Calendar, Phone, GraduationCap, CheckCircle2, Clock, XCircle, MessageCircle } from 'lucide-react'

const AVATAR_COLORS = ['bg-indigo-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500']

const APP_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Pending:   { label: 'Đang chờ duyệt', color: '#d97706', icon: Clock },
  Interview: { label: 'Được mời phỏng vấn', color: '#2563eb', icon: MessageCircle },
  Accepted:  { label: 'Đã được chấp nhận', color: '#16a34a', icon: CheckCircle2 },
  Rejected:  { label: 'Đã bị từ chối', color: '#dc2626', icon: XCircle },
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [application, setApplication] = useState<ApplicationItem | null>(null)
  const [loading, setLoading] = useState(true)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const membership = user?.memberships.find(m => m.clubId === id)
  const isMember = membership && (membership.status === MEMBERSHIP_STATUS.ACTIVE || membership.status === MEMBERSHIP_STATUS.PROBATION)

  useEffect(() => {
    const tasks: Promise<any>[] = [
      getClubDetail(id).then(setClub),
      getDepartments(id).then(setDepartments),
      getFormSchema(id).then(s => setSchema(s)),
    ]
    if (isAuthenticated) {
      tasks.push(
        getMyApplications(id)
          .then(apps => {
            const latest = apps.sort((a, b) =>
              new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
            )[0]
            if (latest) setApplication(latest)
          })
          .catch(() => {})
      )
    }
    Promise.all(tasks)
      .catch(() => toast.error('Không thể tải thông tin CLB.'))
      .finally(() => setLoading(false))
  }, [id, isAuthenticated])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (schema) {
      const missing = schema.fields.filter(f => f.required && !answers[f.id]?.trim())
      if (missing.length > 0) {
        toast.error(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`)
        return
      }
    }
    setSubmitting(true)
    try {
      await submitApplication(id, { answers: schema ? answers : { note: answers['note'] ?? '' } })
      setSubmitted(true)
      toast.success('Đã gửi đơn đăng ký thành công!')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gửi đơn thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Đang tải...</p>
    </div>
  )

  if (!club) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-red-400">Không tìm thấy CLB.</p>
    </div>
  )

  const avatarColor = AVATAR_COLORS[(club.name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar nhỏ */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <Link to="/clubs" className="text-sm text-gray-500 hover:text-gray-800">Danh sách CLB</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{club.name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Cột phải — Apply card (sticky) ── */}
          <div className="lg:order-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header apply card */}
              <div className="p-5 border-b border-gray-100">
                {isMember ? (
                  <div className="text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                    <p className="font-semibold text-gray-900">Bạn đang là thành viên</p>
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#eff6ff' : '#f0fdf4', color: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#2563eb' : '#16a34a' }}>
                      {membership?.status === MEMBERSHIP_STATUS.PROBATION ? 'Đang thử việc' : 'Thành viên chính thức'}
                    </span>
                  </div>
                ) : application && !submitted ? (
                  (() => {
                    const s = APP_STATUS[application.status]
                    const Icon = s?.icon ?? Clock
                    return (
                      <div className="text-center space-y-2">
                        <Icon size={32} className="mx-auto" style={{ color: s?.color }} />
                        <p className="font-semibold text-gray-900">Trạng thái đơn</p>
                        <p className="text-sm font-medium" style={{ color: s?.color }}>{s?.label}</p>
                        <p className="text-xs text-gray-400">Nộp {new Date(application.appliedAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    )
                  })()
                ) : submitted ? (
                  <div className="text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                    <p className="font-semibold text-gray-900">Đã gửi đơn!</p>
                    <p className="text-xs text-gray-400">CLB sẽ xem xét và thông báo sớm.</p>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-gray-700">Đăng nhập để đăng ký tham gia</p>
                    <Link to={`/login`}>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Đăng nhập</Button>
                    </Link>
                    <p className="text-xs text-gray-400">Chưa có tài khoản? <Link to="/register" className="text-indigo-600">Đăng ký</Link></p>
                  </div>
                ) : club.status !== 'Active' ? (
                  <p className="text-center text-sm text-gray-400">CLB hiện không nhận thành viên mới.</p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="font-semibold text-gray-900 text-sm">Đơn đăng ký tham gia</p>
                    {schema && schema.fields.length > 0 ? (
                      schema.fields.map(f => (
                        <div key={f.id} className="space-y-1">
                          <Label className="text-xs">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
                          {f.type === 'textarea' ? (
                            <textarea rows={3} value={answers[f.id] ?? ''} onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          ) : f.type === 'select' ? (
                            <select value={answers[f.id] ?? ''} onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
                              <option value="">— Chọn —</option>
                              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <Input value={answers[f.id] ?? ''} onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))} />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">Lý do muốn tham gia</Label>
                        <textarea rows={3} value={answers['note'] ?? ''} onChange={e => setAnswers(p => ({ ...p, note: e.target.value }))}
                          placeholder="Chia sẻ lý do bạn muốn tham gia CLB..."
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                    <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {submitting ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
                    </Button>
                  </form>
                )}
              </div>

              {/* Thông tin nhanh */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={15} className="text-gray-400" />
                  <span>{club.memberCount} thành viên</span>
                </div>
                {club.advisorName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap size={15} className="text-gray-400" />
                    <span>{club.advisorName}</span>
                  </div>
                )}
                {club.establishedDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={15} className="text-gray-400" />
                    <span>Thành lập {new Date(club.establishedDate).getFullYear()}</span>
                  </div>
                )}
                {club.contactInfo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={15} className="text-gray-400" />
                    <span>{club.contactInfo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Cột trái — Nội dung chính ── */}
          <div className="lg:col-span-2 lg:order-1 space-y-6">
            {/* Club header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-5">
                {club.logoUrl
                  ? <img src={club.logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                  : <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 ${avatarColor}`}>
                      {club.name[0]}
                    </div>
                }
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>{club.name}</h1>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">{club.code}</span>
                    {club.categoryName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{club.categoryName}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{club.description ?? 'Chưa có mô tả.'}</p>
                </div>
              </div>
            </div>

            {/* Departments */}
            {departments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Building size={15} className="text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">Cơ cấu tổ chức</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {departments.map(dept => (
                    <div key={dept.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                        {dept.deptLeadName && <p className="text-xs text-gray-400 mt-0.5">Trưởng ban: {dept.deptLeadName}</p>}
                      </div>
                      <span className="text-xs text-gray-400">{dept.memberCount} thành viên</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
