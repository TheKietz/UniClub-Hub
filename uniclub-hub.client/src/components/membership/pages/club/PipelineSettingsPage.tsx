import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getPipelineStages, createPipelineStage, updatePipelineStage,
  deletePipelineStage, reorderPipelineStages,
} from '@/components/membership/services/clubApi'
import type { PipelineStage } from '@/components/membership/services/club.types'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'
import { useUnsavedNavigationGuard } from '@/hooks/useUnsavedNavigationGuard'
import type { SettingsTabChildProps } from './settingsTabTypes'

const inputStyle: React.CSSProperties = {
  height: 36, borderRadius: 8, border: '1px solid #dce6f4',
  padding: '0 12px', fontSize: 13, color: D.ink, outline: 'none',
  background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
}

const PRESET_STAGES = [
  'Xét CV', 'Phỏng vấn', 'Bài kiểm tra kỹ năng', 'Live coding', 'Phỏng vấn văn hóa', 'Thử việc',
]
const DEFAULT_STAGES = ['Xét CV', 'Phỏng vấn', 'Thử việc']

export default function PipelineSettingsPage({ onDirtyChange, onBindHandles }: SettingsTabChildProps = {}) {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canManage = clubPermissions.can(CLUB_PERMISSIONS.RECRUITMENT_PIPELINE_MANAGE)

  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPipelineStages(id)
      .then(setStages)
      .catch(() => toast.error('Không thể tải quy trình tuyển dụng.'))
      .finally(() => setLoading(false))
  }, [id])

  const isDirty = editId !== null || newName.trim() !== ''

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const discard = useCallback(() => {
    setEditId(null)
    setEditName('')
    setNewName('')
  }, [])

  const savePending = useCallback(async (): Promise<boolean> => {
    if (editId !== null) {
      const trimmed = editName.trim()
      if (!trimmed) {
        toast.error('Tên vòng không được để trống.')
        return false
      }
      setSaving(true)
      try {
        const updated = await updatePipelineStage(id, editId, { name: trimmed })
        setStages(prev => prev.map(s => s.id === editId ? { ...s, name: updated.name } : s))
        setEditId(null)
        setEditName('')
        toast.success('Đã cập nhật tên vòng.')
        return true
      } catch {
        toast.error('Cập nhật thất bại.')
        return false
      } finally {
        setSaving(false)
      }
    }
    if (newName.trim()) {
      const trimmed = newName.trim()
      setAdding(true)
      try {
        const next = stages.length + 1
        const stage = await createPipelineStage(id, { name: trimmed, stageOrder: next })
        setStages(prev => [...prev, stage])
        setNewName('')
        toast.success(`Đã thêm vòng "${trimmed}".`)
        return true
      } catch {
        toast.error('Thêm vòng thất bại.')
        return false
      } finally {
        setAdding(false)
      }
    }
    return true
  }, [editId, editName, id, newName, stages.length])

  useEffect(() => {
    onBindHandles?.({ save: savePending, discard })
    return () => onBindHandles?.(null)
  }, [discard, onBindHandles, savePending])

  const embedded = onDirtyChange != null
  useUnsavedNavigationGuard({
    when: isDirty && !embedded,
    onSave: savePending,
    onDiscard: discard,
    description: 'Bạn có thay đổi chưa lưu trong quy trình tuyển. Lưu trước khi rời trang?',
  })

  async function addStage(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const next = stages.length + 1
      const stage = await createPipelineStage(id, { name: trimmed, stageOrder: next })
      setStages(prev => [...prev, stage])
      setNewName('')
      toast.success(`Đã thêm vòng "${trimmed}".`)
    } catch {
      toast.error('Thêm vòng thất bại.')
    } finally {
      setAdding(false)
    }
  }

  async function createDefaultStages() {
    if (stages.length > 0 || adding) return
    setAdding(true)
    try {
      const created: PipelineStage[] = []
      for (let i = 0; i < DEFAULT_STAGES.length; i++) {
        created.push(await createPipelineStage(id, { name: DEFAULT_STAGES[i], stageOrder: i + 1 }))
      }
      setStages(created)
      toast.success('Đã tạo quy trình mặc định.')
    } catch {
      toast.error('Tạo quy trình mặc định thất bại.')
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit(stageId: number) {
    const trimmed = editName.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const updated = await updatePipelineStage(id, stageId, { name: trimmed })
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, name: updated.name } : s))
      setEditId(null)
      toast.success('Đã cập nhật tên vòng.')
    } catch {
      toast.error('Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteStage(stageId: number, name: string) {
    if (!confirm(`Xóa vòng "${name}"? Các đơn đang ở vòng này sẽ mất thông tin vòng hiện tại.`)) return
    try {
      await deletePipelineStage(id, stageId)
      const updated = stages.filter(s => s.id !== stageId)
        .map((s, i) => ({ ...s, stageOrder: i + 1 }))
      setStages(updated)
      await reorderPipelineStages(id, updated.map(s => s.id))
      toast.success(`Đã xóa vòng "${name}".`)
    } catch {
      toast.error('Xóa thất bại.')
    }
  }

  async function moveStage(index: number, direction: 'up' | 'down') {
    const newStages = [...stages]
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    ;[newStages[index], newStages[swapIdx]] = [newStages[swapIdx], newStages[index]]
    const reordered = newStages.map((s, i) => ({ ...s, stageOrder: i + 1 }))
    setStages(reordered)
    try {
      await reorderPipelineStages(id, reordered.map(s => s.id))
    } catch {
      toast.error('Cập nhật thứ tự thất bại.')
    }
  }

  if (!clubPermissions.loading && !canManage)
    return <PermissionDenied />

  return (
    <div className="mgmt-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Quy trình tuyển thành viên</h1>
        <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>Cấu hình các vòng xét duyệt đơn ứng tuyển cho CLB này</p>
      </div>

      {/* Current stages */}
      <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: D.ink, marginBottom: 16 }}>
          Các vòng hiện tại {stages.length > 0 && <span style={{ color: D.inkMuted, fontWeight: 400 }}>({stages.length} vòng)</span>}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: D.inkMuted }}>Đang tải...</p>
        ) : stages.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
            <p style={{ fontSize: 13, color: D.inkMuted, margin: 0 }}>
              Chưa có vòng nào. Thêm vòng bên dưới để bắt đầu cấu hình quy trình.
            </p>
            <p style={{ fontSize: 12, color: D.inkMuted, marginTop: 6 }}>
              Nếu không cấu hình, đơn sẽ dùng luồng cũ: Chờ duyệt → Phỏng vấn → Kết quả.
            </p>
            <button
              type="button"
              onClick={createDefaultStages}
              disabled={adding}
              style={{
                marginTop: 14, padding: '8px 16px', borderRadius: D.pill,
                background: D.indigo, color: '#fff', border: D.border,
                boxShadow: D.shadow(2, 2), fontSize: 12, fontWeight: 700,
                cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {adding ? 'Đang tạo...' : 'Tạo quy trình mặc định'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Flow preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#eef2ff', borderRadius: 10, border: '1px solid #c7d2fe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: D.indigo }}>LUỒNG:</span>
              <span style={{ fontSize: 11, color: '#4338ca', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4 }}>Nộp đơn</span>
              {stages.map(s => (
                <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: D.indigo }}>→</span>
                  <span style={{ fontSize: 11, color: '#4338ca', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4 }}>{s.name}</span>
                </span>
              ))}
              <span style={{ fontSize: 11, color: D.indigo }}>→</span>
              <span style={{ fontSize: 11, color: '#065f46', background: '#d1fae5', padding: '2px 8px', borderRadius: 4 }}>Kết quả</span>
            </div>

            {stages.map((stage, idx) => (
              <div key={stage.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: D.bg, borderRadius: 10, border: D.borderLight, padding: '10px 14px',
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: D.indigo, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {idx + 1}
                </span>

                {editId === stage.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(stage.id); if (e.key === 'Escape') setEditId(null) }}
                      style={{ ...inputStyle, flex: 1 }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(stage.id)} disabled={saving}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: D.indigo, color: '#fff', border: D.border, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? '...' : 'Lưu'}
                    </button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: D.card, color: D.inkMuted, border: D.borderLight, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: D.ink }}>{stage.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => moveStage(idx, 'up')} disabled={idx === 0}
                        style={{ width: 28, height: 28, borderRadius: 6, border: D.borderLight, background: D.card, cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: idx === 0 ? 0.4 : 1 }}>
                        ↑
                      </button>
                      <button onClick={() => moveStage(idx, 'down')} disabled={idx === stages.length - 1}
                        style={{ width: 28, height: 28, borderRadius: 6, border: D.borderLight, background: D.card, cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: idx === stages.length - 1 ? 0.4 : 1 }}>
                        ↓
                      </button>
                      <button onClick={() => { setEditId(stage.id); setEditName(stage.name) }}
                        style={{ padding: '0 10px', height: 28, borderRadius: 6, border: D.borderLight, background: D.card, cursor: 'pointer', fontSize: 12, color: D.inkDim, fontFamily: 'inherit' }}>
                        Sửa
                      </button>
                      <button onClick={() => deleteStage(stage.id, stage.name)}
                        style={{ padding: '0 10px', height: 28, borderRadius: 6, border: '1.5px solid #fecaca', background: D.card, cursor: 'pointer', fontSize: 12, color: D.red, fontFamily: 'inherit' }}>
                        Xóa
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add stage */}
      <div style={{ background: D.card, borderRadius: D.radius, border: D.border, boxShadow: D.shadow(), padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: D.ink, marginBottom: 16 }}>Thêm vòng mới</div>

        {/* Presets */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: D.inkMuted, margin: '0 0 8px' }}>Chọn nhanh:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_STAGES.filter(p => !stages.some(s => s.name === p)).map(preset => (
              <button key={preset} onClick={() => addStage(preset)} disabled={adding}
                style={{ padding: '5px 12px', borderRadius: D.pill, border: D.borderLight, background: D.bg, fontSize: 12, color: D.inkDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Manual input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addStage(newName) }}
            placeholder="Tên vòng tùy chỉnh (nhấn Enter để thêm)..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => addStage(newName)} disabled={adding || !newName.trim()}
            style={{
              padding: '0 20px', height: 36, borderRadius: 8, border: D.border,
              background: D.indigo, color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: adding || !newName.trim() ? 'not-allowed' : 'pointer',
              opacity: adding || !newName.trim() ? 0.6 : 1, fontFamily: 'inherit',
            }}>
            {adding ? 'Đang thêm...' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  )
}
