import { MEMBERSHIP_STATUS, CLUB_ROLES } from '@/types/auth'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getClubDetail, getDepartments, getFormSchema, getMemberFieldSchema, getMyApplications, submitApplication, resignFromClub, submitResignation, getUserResignations } from '@/components/membership/services/clubApi'
import type { ClubDetail, DepartmentItem, FormSchema, MemberFieldDef, ApplicationItem, ResignationRequestItem, ResignationPreference } from '@/components/membership/services/club.types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/axiosInstance'
import { ArrowLeft, Users, Building, Calendar, Phone, GraduationCap, CheckCircle2, Clock, XCircle, MessageCircle, LogOut, AlertCircle, Paperclip, X, GitBranch } from 'lucide-react'
import { Tree, TreeNode } from 'react-organizational-chart'
import PublicHeader from '@/components/layouts/PublicHeader'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500']

const APP_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Pending: { label: 'Đang chờ duyệt', color: '#d97706', icon: Clock },
  Interview: { label: 'Được mời phỏng vấn', color: '#2563eb', icon: MessageCircle },
  Accepted: { label: 'Đã được chấp nhận', color: '#16a34a', icon: CheckCircle2 },
  Rejected: { label: 'Đã bị từ chối', color: '#dc2626', icon: XCircle },
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [fieldSchema, setFieldSchema] = useState<MemberFieldDef[]>([])
  const [application, setApplication] = useState<ApplicationItem | null>(null)
  const [loading, setLoading] = useState(true)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [memberFieldAnswers, setMemberFieldAnswers] = useState<Record<string, string>>({})
  const [fileAnswers, setFileAnswers] = useState<Record<string, File | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'submitting'>('idle')
  const [submitted, setSubmitted] = useState(false)

  const [resignOpen, setResignOpen] = useState(false)
  const [resigning, setResigning] = useState(false)
  const [resignPreference, setResignPreference] = useState<ResignationPreference>('LeaveClub')
  const [resignRequest, setResignRequest] = useState<ResignationRequestItem | null>(null)

  const membership = user?.memberships.find(m => m.clubId === id)
  const isMember = membership && (membership.status === MEMBERSHIP_STATUS.ACTIVE || membership.status === MEMBERSHIP_STATUS.PROBATION)
  const isLeader = membership?.clubRole === CLUB_ROLES.CLUB_ADMIN || membership?.clubRole === CLUB_ROLES.DEPT_LEAD

  // Load đơn từ chức đang chờ (nếu là leader)
  useEffect(() => {
    if (!isAuthenticated || !isMember || !isLeader || !user) return
    getUserResignations(user.id)
      .then(list => {
        const pending = list.find(r => r.clubId === id && r.status === 'Pending')
        setResignRequest(pending ?? null)
      })
      .catch(() => { })
  }, [id, isAuthenticated, isMember, isLeader, user])

  async function handleResign() {
    setResigning(true)
    try {
      await resignFromClub(id)
      toast.success('Đã rời khỏi CLB.')
      navigate('/clubs')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Thao tác thất bại.')
      setResignOpen(false)
    } finally {
      setResigning(false)
    }
  }

  async function handleSubmitResignation() {
    setResigning(true)
    try {
      const result = await submitResignation(id, { preference: resignPreference })
      setResignRequest(result)
      setResignOpen(false)
      toast.success('Đã gửi đơn từ chức. Vui lòng chờ phê duyệt.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gửi đơn thất bại.')
    } finally {
      setResigning(false)
    }
  }

  useEffect(() => {
    const tasks: Promise<any>[] = [
      getClubDetail(id).then(setClub),
      getDepartments(id).then(setDepartments),
      getFormSchema(id).then(s => setSchema(s)),
      getMemberFieldSchema(id).then(setFieldSchema).catch(() => {}),
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
          .catch(() => { })
      )
    }
    Promise.all(tasks)
      .catch(() => toast.error('Không thể tải thông tin CLB.'))
      .finally(() => setLoading(false))
  }, [id, isAuthenticated])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (schema) {
      const missingText = schema.fields.filter(f => f.required && f.type !== 'file' && !answers[f.id]?.trim())
      const missingFile = schema.fields.filter(f => f.required && f.type === 'file' && !fileAnswers[f.id])
      const missing = [...missingText, ...missingFile]
      if (missing.length > 0) {
        toast.error(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`)
        return
      }
    }
    if (fieldSchema.length > 0) {
      const missingMemberFields = fieldSchema.filter(f => f.required && !memberFieldAnswers[f.id]?.trim())
      if (missingMemberFields.length > 0) {
        toast.error(`Vui lòng điền: ${missingMemberFields.map(f => f.label).join(', ')}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const finalAnswers = { ...answers }

      // Upload từng file, lấy URL rồi gán vào answers
      const fileFields = schema?.fields.filter(f => f.type === 'file' && fileAnswers[f.id]) ?? []
      if (fileFields.length > 0) {
        setSubmitStatus('uploading')
        await Promise.all(fileFields.map(async f => {
          const fd = new FormData()
          fd.append('file', fileAnswers[f.id]!)
          const res = await api.post<{ data: { url: string } }>('/uploads/application-file', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          finalAnswers[f.id] = res.data.data.url
        }))
      }

      setSubmitStatus('submitting')
      await submitApplication(id, {
        answers: schema ? finalAnswers : { note: finalAnswers['note'] ?? '' },
        ...(fieldSchema.length > 0 ? { memberFieldData: memberFieldAnswers } : {}),
      })
      setSubmitted(true)
      toast.success('Đã gửi đơn đăng ký thành công!')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gửi đơn thất bại.')
    } finally {
      setSubmitting(false)
      setSubmitStatus('idle')
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

  const avatarColor = AVATAR_COLORS[club.id % AVATAR_COLORS.length]
  const avatarLetter = (club.name.startsWith('CLB ') ? club.name.slice(4) : club.name)[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Back link — nằm trong nội dung, không có nền riêng */}
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ArrowLeft size={14} className="text-gray-500" />
          </button>
          <Link to="/clubs" className="text-gray-500 hover:text-indigo-600 transition-colors">Danh sách CLB</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium truncate max-w-xs">{club.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Cột trái — Nội dung chính ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Club header card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt=""
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${avatarColor}`}>
                      {avatarLetter}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h1 className="text-xl font-bold leading-snug" style={{ color: '#0f172a', margin: 0 }}>{club.name}</h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">{club.code}</span>
                      {club.categoryName && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {club.categoryName}
                        </span>
                      )}
                    </div>
                    <p className="pt-3 text-sm text-gray-500 leading-relaxed">
                      {club.description ?? 'Chưa có mô tả.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Org chart public */}
            {departments.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <GitBranch size={15} className="text-indigo-400" />
                  <p className="text-sm font-semibold text-gray-900">Cơ cấu tổ chức</p>
                </div>
                <div className="px-6 py-5 overflow-x-auto">
                  <div className="min-w-max mx-auto">
                    <Tree
                      lineWidth="2px"
                      lineColor="#c7d2fe"
                      lineBorderRadius="8px"
                      label={
                        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow">
                          <Building size={14} />
                          {club.name}
                        </div>
                      }
                    >
                      {departments.map(dept => (
                        <TreeNode key={dept.id} label={
                          <div className="inline-flex flex-col items-center gap-0.5 bg-white border-2 border-indigo-200 rounded-xl px-4 py-2.5 shadow-sm min-w-28">
                            <p className="font-semibold text-sm text-gray-800">{dept.name}</p>
                            {dept.deptLeadName
                              ? <p className="text-xs text-indigo-500">{dept.deptLeadName}</p>
                              : <p className="text-xs text-amber-500">Chưa có trưởng ban</p>
                            }
                            <p className="text-xs text-gray-400">{dept.memberCount} thành viên</p>
                          </div>
                        } />
                      ))}
                    </Tree>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Cột phải — Apply + meta ── */}
          <div className="space-y-4 lg:sticky lg:top-24">

            {/* Apply card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Tham gia CLB</p>
              </div>

              <div className="p-5">
                {isMember ? (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Bạn đang là thành viên</p>
                    <span className="inline-block text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        background: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#eff6ff' : '#f0fdf4',
                        color: membership?.status === MEMBERSHIP_STATUS.PROBATION ? '#2563eb' : '#16a34a'
                      }}>
                      {membership?.status === MEMBERSHIP_STATUS.PROBATION ? 'Đang thử việc' : 'Thành viên chính thức'}
                    </span>

                    {/* Nút rời CLB — leader cần đệ đơn, member thường rời ngay */}
                    <div className="pt-1">
                      {isLeader ? (
                        resignRequest ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                            <AlertCircle size={12} />
                            Đơn từ chức đang chờ duyệt
                          </div>
                        ) : (
                          <button onClick={() => setResignOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors">
                            <LogOut size={12} />
                            Đệ đơn từ chức
                          </button>
                        )
                      ) : (
                        <button onClick={() => setResignOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                          <LogOut size={12} />
                          Rời khỏi CLB
                        </button>
                      )}
                    </div>
                  </div>
                ) : application && !submitted ? (
                  (() => {
                    const s = APP_STATUS[application.status]
                    const Icon = s?.icon ?? Clock
                    return (
                      <div className="space-y-3">
                        <div className="text-center space-y-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                            style={{ background: `${s?.color}18` }}>
                            <Icon size={20} style={{ color: s?.color }} />
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">Trạng thái đơn</p>
                          <p className="text-sm font-medium" style={{ color: s?.color }}>{s?.label}</p>
                          <p className="text-xs text-gray-400">Nộp {new Date(application.appliedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        {application.reviewNote && (
                          <div className="bg-indigo-50 rounded-lg px-3 py-2.5">
                            <p className="text-xs font-medium text-indigo-500 mb-1">Phản hồi từ CLB</p>
                            <p className="text-sm text-indigo-900 whitespace-pre-wrap">{application.reviewNote}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : submitted ? (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Đã gửi đơn thành công!</p>
                    <p className="text-xs text-gray-400">CLB sẽ xem xét và thông báo sớm.</p>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 text-center">Đăng nhập để đăng ký tham gia</p>
                    <Link to="/login">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Đăng nhập</Button>
                    </Link>
                    <p className="text-xs text-gray-400 text-center">
                      Chưa có tài khoản?{' '}
                      <Link to="/register" className="text-indigo-600 hover:underline">Đăng ký</Link>
                    </p>
                  </div>
                ) : club.status !== 'Active' ? (
                  <p className="text-center text-sm text-gray-400 py-2">CLB hiện không nhận thành viên mới.</p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {schema && schema.fields.length > 0 ? (
                      schema.fields.map(f => (
                        <div key={f.id} className="space-y-1.5">
                          <Label className="text-xs text-gray-600">
                            {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          {f.type === 'textarea' ? (
                            <textarea rows={3} value={answers[f.id] ?? ''}
                              onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          ) : f.type === 'select' ? (
                            <select value={answers[f.id] ?? ''}
                              onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white">
                              <option value="">— Chọn —</option>
                              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === 'file' ? (
                            <div>
                              <label className={`flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                                fileAnswers[f.id] ? 'border-indigo-400 bg-indigo-50' : 'border-input bg-background hover:bg-gray-50'
                              }`}>
                                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                                <span className="flex-1 truncate text-gray-600">
                                  {fileAnswers[f.id]?.name ?? 'Chọn file...'}
                                </span>
                                {fileAnswers[f.id] && (
                                  <button type="button" onClick={e => { e.preventDefault(); setFileAnswers(p => ({ ...p, [f.id]: null })) }}
                                    className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                    <X size={13} />
                                  </button>
                                )}
                                <input type="file" className="hidden"
                                  accept={f.accept}
                                  onChange={e => {
                                    const file = e.target.files?.[0] ?? null
                                    setFileAnswers(p => ({ ...p, [f.id]: file }))
                                    e.target.value = ''
                                  }} />
                              </label>
                              {f.accept && (
                                <p className="text-xs text-gray-400 mt-1">Định dạng chấp nhận: {f.accept}</p>
                              )}
                            </div>
                          ) : (
                            <Input value={answers[f.id] ?? ''}
                              onChange={e => setAnswers(p => ({ ...p, [f.id]: e.target.value }))} />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-600">Lý do muốn tham gia</Label>
                        <textarea rows={4} value={answers['note'] ?? ''}
                          onChange={e => setAnswers(p => ({ ...p, note: e.target.value }))}
                          placeholder="Chia sẻ lý do bạn muốn tham gia CLB..."
                          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                    {fieldSchema.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Thông tin hồ sơ thành viên
                        </p>
                        {fieldSchema.map(f => (
                          <div key={f.id} className="space-y-1.5">
                            <Label className="text-xs text-gray-600">
                              {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                            </Label>
                            {f.type === 'textarea' ? (
                              <textarea rows={3} value={memberFieldAnswers[f.id] ?? ''}
                                onChange={e => setMemberFieldAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            ) : f.type === 'select' ? (
                              <select value={memberFieldAnswers[f.id] ?? ''}
                                onChange={e => setMemberFieldAnswers(p => ({ ...p, [f.id]: e.target.value }))}
                                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">— Chọn —</option>
                                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <Input value={memberFieldAnswers[f.id] ?? ''}
                                onChange={e => setMemberFieldAnswers(p => ({ ...p, [f.id]: e.target.value }))} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button type="submit" disabled={submitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 mt-1">
                      {submitStatus === 'uploading' ? 'Đang tải file...'
                        : submitStatus === 'submitting' ? 'Đang gửi...'
                        : 'Gửi đơn đăng ký'}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Club meta card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông tin CLB</p>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Users size={14} className="text-gray-400 flex-shrink-0" />
                <span>{club.memberCount} thành viên</span>
              </div>
              {club.advisorName && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <GraduationCap size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{club.advisorName}</span>
                </div>
              )}
              {club.establishedDate && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  <span>Thành lập {new Date(club.establishedDate).getFullYear()}</span>
                </div>
              )}
              {club.contactInfo && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{club.contactInfo}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Dialog rời CLB / đệ đơn từ chức */}
      <Dialog open={resignOpen} onOpenChange={setResignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isLeader ? 'Đệ đơn từ chức' : 'Xác nhận rời CLB'}</DialogTitle>
          </DialogHeader>

          {isLeader ? (
            <div className="space-y-4 py-1">
              <p className="text-sm text-gray-500">
                Với vai trò <span className="font-semibold text-gray-800">
                  {membership?.clubRole === CLUB_ROLES.CLUB_ADMIN ? 'Trưởng CLB' : 'Trưởng ban'}
                </span>, đơn từ chức của bạn cần được phê duyệt trước khi có hiệu lực.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sau khi được duyệt, bạn muốn</p>
                {([
                  { value: 'LeaveClub', label: 'Rời CLB hoàn toàn', desc: 'Chấm dứt tư cách thành viên' },
                  { value: 'BecomeMember', label: 'Trở thành thành viên thường', desc: 'Giữ lại tư cách thành viên, không còn vai trò quản lý' },
                ] as const).map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      resignPreference === opt.value
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="preference" value={opt.value}
                      checked={resignPreference === opt.value}
                      onChange={() => setResignPreference(opt.value)}
                      className="mt-0.5 accent-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Bạn có chắc muốn rời khỏi <span className="font-semibold text-gray-800">{club.name}</span>?
              Bạn có thể nộp đơn đăng ký lại sau.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResignOpen(false)} disabled={resigning}>Huỷ</Button>
            {isLeader ? (
              <Button onClick={handleSubmitResignation} disabled={resigning}
                className="bg-amber-600 hover:bg-amber-700">
                {resigning ? 'Đang gửi...' : 'Gửi đơn từ chức'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleResign} disabled={resigning}>
                {resigning ? 'Đang xử lý...' : 'Rời CLB'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-100 text-center bg-white mt-auto">
        <p className="text-xs text-gray-400">© 2026 UniClub Hub · Đại học Kinh tế Tài chính TP.HCM</p>
      </footer>
    </div>
  )
}
