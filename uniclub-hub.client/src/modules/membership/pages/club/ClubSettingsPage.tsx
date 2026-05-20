import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClubDetail } from '@/modules/membership/services/clubApi'
import api from '@/lib/axiosInstance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ImagePlus, X } from 'lucide-react'

export default function ClubSettingsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // pendingFile: file chưa upload, chỉ preview local
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const [form, setForm] = useState({
    description: '',
    contactInfo: '',
    advisorName: '',
    logoUrl: '',
  })

  useEffect(() => {
    getClubDetail(id)
      .then(club => setForm({
        description: club.description ?? '',
        contactInfo: club.contactInfo ?? '',
        advisorName: club.advisorName ?? '',
        logoUrl: club.logoUrl ?? '',
      }))
      .catch(() => toast.error('Không thể tải thông tin CLB.'))
      .finally(() => setLoading(false))
  }, [id])

  // Giải phóng object URL khi unmount hoặc khi đổi file
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))

  function pickFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh jpg, png, webp, gif.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File không được vượt quá 5MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearLogo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl('')
    setForm(p => ({ ...p, logoUrl: '' }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) pickFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) pickFile(file)
  }

  const displayLogo = previewUrl || form.logoUrl

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let logoUrl = form.logoUrl

      // Nếu có file chờ → upload lên Cloudinary khi lưu
      if (pendingFile) {
        const fd = new FormData()
        fd.append('file', pendingFile)
        const res = await api.post<{ data: { logoUrl: string } }>(`/clubs/${id}/logo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        logoUrl = res.data.data.logoUrl
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPendingFile(null)
        setPreviewUrl('')
        setForm(p => ({ ...p, logoUrl }))
      }

      await api.patch(`/clubs/${id}/settings`, {
        description: form.description || null,
        contactInfo: form.contactInfo || null,
        advisorName: form.advisorName || null,
        logoUrl: logoUrl || null,
      })
      toast.success('Đã cập nhật thông tin CLB.')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="px-8 pt-6 text-sm" style={{ color: '#6b7280' }}>Đang tải...</div>

  return (
    <div className="px-8 pt-4 pb-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold leading-none" style={{ color: '#0f172a' }}>Cài đặt CLB</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <Label className="text-sm font-semibold mb-3 block">Logo CLB</Label>
          <div className="flex gap-6 items-start">
            {/* Drop zone */}
            <div
              className={[
                'w-40 h-40 flex-shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden relative',
                dragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {displayLogo ? (
                <img src={displayLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-3 text-center">
                  <ImagePlus size={28} className="text-gray-400" />
                  <span className="text-xs leading-tight" style={{ color: '#9ca3af' }}>
                    Kéo ảnh vào đây<br />hoặc nhấn để chọn
                  </span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleFileChange} />

            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium" style={{ color: '#374151' }}>Tải ảnh lên</p>
              <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                Kéo thả file ảnh vào ô bên trái, hoặc nhấn vào ô đó để chọn file.<br />
                Chấp nhận: jpg, png, webp, gif — tối đa 5MB.<br />
                Ảnh sẽ được upload khi bạn nhấn <strong>Lưu thay đổi</strong>.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Chọn file ảnh
                </Button>
                {displayLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 gap-1"
                    onClick={clearLogo}
                  >
                    <X size={14} />
                    Xóa logo
                  </Button>
                )}
              </div>
              {pendingFile && (
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Đã chọn: <span className="font-medium">{pendingFile.name}</span> — chưa lưu
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info fields — 2 cột */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-1.5">
            <Label>Mô tả CLB</Label>
            <textarea
              value={form.description}
              onChange={field('description')}
              rows={4}
              placeholder="Mô tả về câu lạc bộ..."
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Giảng viên phụ trách</Label>
            <Input value={form.advisorName} onChange={field('advisorName')} placeholder="ThS. Nguyễn Văn A" />
          </div>

          <div className="space-y-1.5">
            <Label>Thông tin liên hệ</Label>
            <Input value={form.contactInfo} onChange={field('contactInfo')} placeholder="email@uef.edu.vn hoặc SĐT" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? (pendingFile ? 'Đang upload & lưu...' : 'Đang lưu...') : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  )
}
