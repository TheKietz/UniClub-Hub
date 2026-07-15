import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosResponse } from 'axios'
import { exportTasksReport, exportAuditLogsReport } from '../services/operationsApi'
import { D } from '@/components/shared/managementTheme'
import { useAuth } from '@/contexts/AuthContext'
import { CLUB_ROLES } from '@/types/auth'

type Variant = 'tasks' | 'audit'
type Format = 'xlsx' | 'pdf'

const CONFIG: Record<Variant, { label: string; formats: Format[]; fileBase: string }> = {
  tasks: { label: 'Xuất báo cáo', formats: ['xlsx', 'pdf'], fileBase: 'bao-cao-cong-viec' },
  audit: { label: 'Xuất báo cáo', formats: ['xlsx'], fileBase: 'nhat-ky-hoat-dong' },
}

function triggerDownload(res: AxiosResponse<Blob>, fileName: string) {
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportReportButton({ clubId, variant }: { clubId: number; variant: Variant }) {
  const cfg = CONFIG[variant]
  const { getClubRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('xlsx')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleExport() {
    if (!clubId) return
    setLoading(true)
    try {
      const params = { clubId, from: from || undefined, to: to || undefined }
      const res = variant === 'tasks'
        ? await exportTasksReport({ ...params, format })
        : await exportAuditLogsReport(params)
      triggerDownload(res, `${cfg.fileBase}.${variant === 'tasks' ? format : 'xlsx'}`)
      toast.success('Đã xuất báo cáo.')
      setOpen(false)
    } catch {
      toast.error('Không thể xuất báo cáo. Bạn cần quyền Quản lý CLB.')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    height: 34, padding: '0 10px', fontSize: 13, border: D.borderLight, borderRadius: 8,
    background: D.bg, color: D.ink, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  // Report export is CLUB_ADMIN-only (mirrors the server check) — hide for everyone else.
  if (getClubRole(clubId) !== CLUB_ROLES.CLUB_ADMIN) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
          border: D.border, borderRadius: D.pill, background: D.card, color: D.inkDim,
          boxShadow: D.shadow(2, 2), cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
        }}
      >
        <Download size={14} /> {cfg.label} <ChevronDown size={13} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 50, width: 280,
          background: D.card, border: D.border, borderRadius: D.radius, boxShadow: D.shadow(6, 6), padding: 16,
        }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>
            Khoảng thời gian
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldStyle} />
            <span style={{ color: D.inkMuted, fontSize: 12 }}>→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={fieldStyle} />
          </div>

          {cfg.formats.length > 1 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 800, color: D.inkMuted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>
                Định dạng
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {cfg.formats.map(f => {
                  const active = format === f
                  const Icon = f === 'pdf' ? FileText : FileSpreadsheet
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      style={{
                        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        height: 36, border: D.border, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: 800,
                        background: active ? D.ink : D.card, color: active ? '#fff' : D.inkDim,
                      }}
                    >
                      <Icon size={14} /> {f === 'pdf' ? 'PDF' : 'Excel'}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            style={{
              width: '100%', height: 38, border: 'none', borderRadius: D.pill, cursor: loading ? 'not-allowed' : 'pointer',
              background: D.indigo, color: '#fff', fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
            Tải xuống
          </button>
        </div>
      )}
    </div>
  )
}
