import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Paperclip, Upload, Trash2, Download, FileText, File } from 'lucide-react'
import { getEventAttachments, uploadEventAttachment, deleteEventAttachment } from '../../services/operationsApi'
import type { EventAttachmentItem } from '../../services/operations.types'
import { D } from '@/components/shared/managementTheme'

/* ─── Design tokens ──────────────────────────────────────────────────────── */

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function getFileIcon(contentType?: string) {
  if (!contentType) return <File size={16} style={{ color: D.inkMuted }} />
  if (contentType === 'application/pdf')
    return <FileText size={16} style={{ color: '#ef4444' }} />
  if (contentType.includes('word'))
    return <FileText size={16} style={{ color: '#2563eb' }} />
  if (contentType.includes('excel') || contentType.includes('spreadsheet'))
    return <FileText size={16} style={{ color: '#16a34a' }} />
  return <File size={16} style={{ color: D.inkMuted }} />
}

function getExtLabel(contentType?: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toUpperCase()
    if (ext) return ext
  }
  if (contentType?.includes('pdf')) return 'PDF'
  if (contentType?.includes('word')) return 'DOCX'
  if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) return 'XLSX'
  return 'FILE'
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  eventId: number
  isManager: boolean
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function EventAttachmentsSection({ eventId, isManager }: Props) {
  const [attachments, setAttachments] = useState<EventAttachmentItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [dragging, setDragging]       = useState(false)
  const [deletingId, setDeletingId]   = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (cancelled?: { v: boolean }) => {
    try {
      const list = await getEventAttachments(eventId)
      if (!cancelled?.v) setAttachments(list)
    } catch {
      toast.error('Không thể tải danh sách tài liệu')
    } finally {
      if (!cancelled?.v) setLoading(false)
    }
  }

  useEffect(() => {
    const cancelled = { v: false }
    load(cancelled)
    return () => { cancelled.v = true }
  }, [eventId])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
      toast.error(`Định dạng không được hỗ trợ. Chỉ chấp nhận: PDF, DOC, DOCX, XLS, XLSX`)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File vượt quá 20 MB')
      return
    }
    setUploading(true)
    try {
      const added = await uploadEventAttachment(eventId, file)
      setAttachments(prev => [added, ...prev])
      toast.success(`Đã tải lên: ${file.name}`)
    } catch {
      toast.error('Tải lên thất bại')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await deleteEventAttachment(eventId, id)
      setAttachments(prev => prev.filter(a => a.id !== id))
      toast.success('Đã xóa tài liệu')
    } catch {
      toast.error('Không thể xóa tài liệu')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      style={{
        marginTop: 20,
        background: D.card,
        border: D.border,
        borderRadius: D.radius,
        boxShadow: D.shadow(),
        overflow: 'hidden',
        fontFamily: "'Be Vietnam Pro', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: D.borderLight }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: D.ink, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip size={14} style={{ color: D.indigo }} />
          Tài liệu đính kèm
          {attachments.length > 0 && (
            <span style={{ fontSize: 10, background: '#ede9fe', color: D.indigo, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
              {attachments.length}
            </span>
          )}
        </h2>
        {isManager && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 800, color: D.indigo,
              background: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
              padding: 0, opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={12} />
            {uploading ? 'Đang tải...' : 'Tải lên'}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Drop zone (manager only) */}
      {isManager && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          style={{
            margin: '16px 20px 0',
            border: `2px dashed ${dragging ? D.indigo : '#c4bfb0'}`,
            borderRadius: 10,
            padding: '20px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: dragging ? '#ede9fe44' : D.bg,
            transition: 'border-color .15s, background .15s',
            userSelect: 'none',
          }}
        >
          <Upload size={20} style={{ color: dragging ? D.indigo : '#c4bfb0' }} />
          <p style={{ fontSize: 12, color: dragging ? D.indigo : D.inkMuted, margin: 0, fontWeight: 600 }}>
            {uploading ? 'Đang tải lên...' : 'Kéo thả file vào đây hoặc click để chọn'}
          </p>
          <p style={{ fontSize: 11, color: D.inkMuted, margin: 0 }}>PDF, DOC, DOCX, XLS, XLSX · Tối đa 20 MB</p>
        </div>
      )}

      {/* File list */}
      <div style={{ padding: '12px 20px 20px' }}>
        {loading ? (
          <p style={{ fontSize: 12, color: D.inkMuted, margin: '8px 0 0', textAlign: 'center' }}>Đang tải...</p>
        ) : attachments.length === 0 ? (
          <p style={{ fontSize: 12, color: D.inkMuted, margin: '8px 0 0', fontStyle: 'italic', textAlign: 'center' }}>
            {isManager ? 'Chưa có tài liệu nào. Tải lên tệp đầu tiên.' : 'Chưa có tài liệu đính kèm.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: isManager ? 12 : 4 }}>
            {attachments.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: D.bg, border: D.borderLight, borderRadius: 10,
                }}
              >
                {/* Icon + ext badge */}
                <div style={{ width: 36, height: 36, background: D.card, border: D.borderLight, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 1 }}>
                  {getFileIcon(a.contentType)}
                  <span style={{ fontSize: 8, fontWeight: 900, color: D.inkMuted, letterSpacing: '.03em' }}>
                    {getExtLabel(a.contentType, a.fileName)}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.note ?? a.fileName ?? 'Tài liệu'}
                  </p>
                  <p style={{ fontSize: 11, color: D.inkMuted, margin: '2px 0 0' }}>
                    {a.uploaderName} · {fmtDate(a.uploadedAt)}{a.fileSize ? ` · ${formatBytes(a.fileSize)}` : ''}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <a
                    href={a.fileUrl}
                    download={a.fileName}
                    target="_blank"
                    rel="noreferrer"
                    title="Tải xuống"
                    style={{ padding: 6, borderRadius: 6, color: D.inkMuted, display: 'flex', textDecoration: 'none', background: 'transparent', border: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = D.indigo}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = D.inkMuted}
                  >
                    <Download size={14} />
                  </a>
                  {isManager && (
                    <button
                      type="button"
                      title="Xóa tài liệu"
                      disabled={deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                      style={{ padding: 6, borderRadius: 6, color: D.inkMuted, background: 'transparent', border: 'none', cursor: deletingId === a.id ? 'not-allowed' : 'pointer', display: 'flex', opacity: deletingId === a.id ? 0.5 : 1 }}
                      onMouseEnter={e => { if (deletingId !== a.id) (e.currentTarget as HTMLElement).style.color = D.red }}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = D.inkMuted}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
