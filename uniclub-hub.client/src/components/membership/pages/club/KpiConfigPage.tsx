import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { useParams } from 'react-router-dom'
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getKpiConfig,
  updateKpiCriteria,
  updateKpiGrades,
  type KpiCriteria,
  type KpiGrade,
} from '@/components/membership/services/kpiApi'
import { Tooltip } from '@/components/shared/Tooltip'
import { D } from '@/components/shared/managementTheme'
import { PermissionDenied } from '@/components/shared/Can'
import { useClubPermissions } from '@/hooks/useClubPermissions'
import { CLUB_PERMISSIONS } from '@/constants/clubPermissions'

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 8,
  border: D.borderLight,
  padding: '0 12px',
  fontSize: 13,
  color: D.ink,
  outline: 'none',
  background: D.bg,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const thS: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: D.inkMuted,
  letterSpacing: '.02em',
  whiteSpace: 'nowrap',
}

const tdS: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  verticalAlign: 'top',
}

const metricKeyHintS: React.CSSProperties = {
  marginTop: 5,
  fontSize: 11,
  lineHeight: '16px',
  color: D.inkMuted,
  minHeight: 16,
}

import { getApiErrorMessage } from '@/lib/apiError'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: D.pill,
        border: D.borderLight,
        background: checked ? D.emerald : '#e5e7eb',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .15s',
      }}
      aria-label={checked ? 'Tắt tiêu chí' : 'Bật tiêu chí'}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: D.pill,
        background: '#fff',
        border: '1px solid rgba(21,19,26,.35)',
        transition: 'left .15s',
      }} />
    </button>
  )
}

export default function KpiConfigPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const id = Number(clubId)
  const clubPermissions = useClubPermissions(id)
  const canManage = clubPermissions.can(CLUB_PERMISSIONS.MEMBER_KPI_MANAGE)
  const [criteria, setCriteria] = useState<KpiCriteria[]>([])
  const [initialCriteria, setInitialCriteria] = useState<KpiCriteria[]>([])
  const [grades, setGrades] = useState<KpiGrade[]>([])
  const [initialGrades, setInitialGrades] = useState<KpiGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useDeferredEffect(() => {
    setLoading(true)
    getKpiConfig(id)
      .then(config => {
        setCriteria(config.criteria)
        setInitialCriteria(config.criteria)
        setGrades(config.grades)
        setInitialGrades(config.grades)
      })
      .catch(err => toast.error(getApiErrorMessage(err, 'Không thể tải cấu hình KPI.')))
      .finally(() => setLoading(false))
  }, [id])

  const totalWeight = useMemo(
    () => criteria.filter(c => c.isEnabled).reduce((sum, item) => sum + Number(item.weight || 0), 0),
    [criteria]
  )

  const gradeErrors = useMemo(() => {
    const errors: string[] = []
    const minScores = new Set<number>()
    if (grades.length < 2) errors.push('Cần ít nhất 2 mức xếp loại.')
    if (!grades.some(g => Number(g.minScore) === 0)) errors.push('Cần một mức có MinScore = 0.')
    for (const grade of grades) {
      if (!grade.label.trim()) errors.push('Tên mức xếp loại không được rỗng.')
      if (grade.minScore < 0 || grade.minScore > 100) errors.push('MinScore phải nằm trong khoảng 0-100.')
      if (minScores.has(Number(grade.minScore))) errors.push(`MinScore ${grade.minScore} bị trùng.`)
      minScores.add(Number(grade.minScore))
    }
    return Array.from(new Set(errors))
  }, [grades])

  const canSave = totalWeight === 100 && gradeErrors.length === 0 && !saving && criteria.length > 0

  function updateItem(metricKey: string, patch: Partial<KpiCriteria>) {
    setCriteria(prev => prev.map(item => item.metricKey === metricKey ? { ...item, ...patch } : item))
  }

  function updateGrade(index: number, patch: Partial<KpiGrade>) {
    setGrades(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function addGrade() {
    setGrades(prev => [
      ...prev,
      {
        id: 0,
        label: 'Mức mới',
        minScore: 0,
        color: '#64748b',
        displayOrder: prev.length,
      },
    ])
  }

  function removeGrade(index: number) {
    setGrades(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const saved = await updateKpiCriteria(id, criteria.map(item => ({
        metricKey: item.metricKey,
        displayName: item.displayName.trim(),
        description: item.description?.trim() || null,
        weight: Number(item.weight || 0),
        isEnabled: item.isEnabled,
      })))
      const savedGrades = await updateKpiGrades(id, grades.map(item => ({
        label: item.label.trim(),
        minScore: Number(item.minScore || 0),
        color: item.color?.trim() || null,
      })))
      setCriteria(savedGrades.criteria.length ? savedGrades.criteria : saved.criteria)
      setInitialCriteria(savedGrades.criteria.length ? savedGrades.criteria : saved.criteria)
      setGrades(savedGrades.grades)
      setInitialGrades(savedGrades.grades)
      toast.success('Đã lưu cấu hình KPI.')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Lưu cấu hình KPI thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  if (!clubPermissions.loading && !canManage)
    return <PermissionDenied />

  function handleReset() {
    setCriteria(initialCriteria)
    setGrades(initialGrades)
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 32px', color: D.inkMuted, textAlign: 'center', background: D.bg }}>
        Đang tải cấu hình KPI...
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px 40px', minHeight: '100%', background: D.bg, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: D.ink, letterSpacing: '-.025em', margin: 0 }}>Cấu hình KPI thành viên</h1>
          <p style={{ fontSize: 13, color: D.inkMuted, marginTop: 4 }}>
            Tổng trọng số {totalWeight}/100 · {grades.length} mức xếp loại
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            padding: '7px 12px',
            borderRadius: D.pill,
            border: D.border,
            background: canSave ? '#dcfce7' : '#fee2e2',
            color: canSave ? '#166534' : '#991b1b',
            fontSize: 12,
            fontWeight: 800,
          }}>
            {canSave ? 'Hợp lệ' : 'Chưa hợp lệ'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: D.card,
              color: D.inkDim,
              border: D.border,
              boxShadow: D.shadow(2, 2),
              padding: '8px 14px',
              borderRadius: D.pill,
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RotateCcw size={14} /> Khôi phục
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: canSave ? D.indigo : '#d1d5db',
              color: canSave ? '#fff' : '#6b7280',
              border: D.border,
              boxShadow: canSave ? D.shadow(2, 2) : 'none',
              padding: '8px 16px',
              borderRadius: D.pill,
              fontSize: 12,
              fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            <Save size={14} /> Lưu
          </button>
        </div>
      </div>

      {(totalWeight !== 100 || gradeErrors.length > 0) && (
        <div style={{
          marginBottom: 16,
          border: D.border,
          borderRadius: D.radius,
          background: '#fff7ed',
          boxShadow: D.shadow(),
          color: '#9a3412',
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {totalWeight !== 100 && <div>Tổng trọng số các tiêu chí đang bật phải bằng 100.</div>}
          {gradeErrors.map(err => <div key={err}>{err}</div>)}
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: D.ink }}>Tiêu chí đánh giá</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: D.inkMuted }}>Chỉ các tiêu chí đang bật được tính vào tổng trọng số.</p>
          </div>
        </div>

        <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 72 }} />
              <col style={{ width: '26%' }} />
              <col />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
                <th style={{ ...thS, width: 72 }}>Bật</th>
                <th style={thS}>Tiêu chí</th>
                <th style={thS}>Mô tả</th>
                <th style={{ ...thS, width: 130 }}>Trọng số</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(item => (
                <tr key={item.metricKey} style={{ background: item.isEnabled ? D.card : '#f3f4f6', borderBottom: D.borderLight }}>
                  <td style={{ ...tdS, paddingTop: 18 }}>
                    <Toggle checked={item.isEnabled} onChange={value => updateItem(item.metricKey, { isEnabled: value })} />
                  </td>
                  <td style={tdS}>
                    <input
                      value={item.displayName}
                      onChange={e => updateItem(item.metricKey, { displayName: e.target.value })}
                      style={{ ...inputStyle, fontWeight: 700 }}
                    />
                    <div style={metricKeyHintS}>{item.metricKey}</div>
                  </td>
                  <td style={tdS}>
                    <input
                      value={item.description ?? ''}
                      onChange={e => updateItem(item.metricKey, { description: e.target.value })}
                      style={inputStyle}
                    />
                    <div style={{ ...metricKeyHintS, visibility: 'hidden' }} aria-hidden>.</div>
                  </td>
                  <td style={{ ...tdS, paddingTop: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.weight}
                        onChange={e => updateItem(item.metricKey, { weight: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        disabled={!item.isEnabled}
                        style={{
                          ...inputStyle,
                          width: 86,
                          fontWeight: 800,
                          background: item.isEnabled ? D.bg : '#e5e7eb',
                        }}
                      />
                      <span style={{ fontSize: 12, color: D.inkMuted }}>%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: D.ink }}>Cấu hình xếp loại</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: D.inkMuted }}>
              Hệ thống lấy mức đầu tiên có điểm KPI lớn hơn hoặc bằng MinScore.
            </p>
          </div>
          <button
            type="button"
            onClick={addGrade}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: D.card,
              color: D.ink,
              border: D.border,
              boxShadow: D.shadow(2, 2),
              padding: '8px 14px',
              borderRadius: D.pill,
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Thêm mức
          </button>
        </div>

        <div style={{ borderRadius: D.radius, overflow: 'hidden', background: D.card, border: D.border, boxShadow: D.shadow() }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: D.bg, borderBottom: D.borderLight }}>
                <th style={thS}>Tên xếp loại</th>
                <th style={{ ...thS, width: 130 }}>MinScore</th>
                <th style={{ ...thS, width: 180 }}>Màu</th>
                <th style={{ ...thS, width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {[...grades].sort((a, b) => b.minScore - a.minScore).map((grade, sortedIndex) => {
                const originalIndex = grades.findIndex(g => g === grade)
                return (
                  <tr key={`${grade.id}-${sortedIndex}`} style={{ borderBottom: D.borderLight }}>
                    <td style={tdS}>
                      <input
                        value={grade.label}
                        onChange={e => updateGrade(originalIndex, { label: e.target.value })}
                        style={{ ...inputStyle, fontWeight: 700 }}
                      />
                    </td>
                    <td style={tdS}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={grade.minScore}
                        onChange={e => updateGrade(originalIndex, { minScore: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        style={{ ...inputStyle, width: 92, fontWeight: 800 }}
                      />
                    </td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="color"
                          value={grade.color ?? '#64748b'}
                          onChange={e => updateGrade(originalIndex, { color: e.target.value })}
                          style={{ width: 34, height: 30, border: D.borderLight, borderRadius: 6, background: D.bg, padding: 2 }}
                        />
                        <span style={{ color: grade.color ?? D.inkMuted, fontSize: 12, fontWeight: 800 }}>{grade.color ?? '—'}</span>
                      </div>
                    </td>
                    <td style={tdS}>
                      <Tooltip label={grades.length <= 2 ? 'Cần ít nhất 2 mức' : 'Xóa mức'}>
                        <button
                          type="button"
                          onClick={() => removeGrade(originalIndex)}
                          disabled={grades.length <= 2}
                          style={{
                            width: 30,
                            height: 30,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: D.borderLight,
                            borderRadius: 6,
                            background: grades.length <= 2 ? '#e5e7eb' : D.card,
                            color: grades.length <= 2 ? '#9ca3af' : D.red,
                            cursor: grades.length <= 2 ? 'not-allowed' : 'pointer',
                          }}
                          aria-label="Xóa mức xếp loại"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
