import { useMemo, useState } from 'react'
import { useDeferredEffect } from '@/hooks/useDeferredEffect'
import { getAdminClubs } from '@/components/membership/services/adminApi'
import type { ClubItem } from '@/components/membership/services/admin.types'
import PositionManagementPanel from '@/components/membership/pages/shared/PositionManagementPanel'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { toast } from 'sonner'
import { D } from '@/components/shared/managementTheme'

export default function AdminPositionsPage() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [loading, setLoading] = useState(true)

  useDeferredEffect(() => {
    setLoading(true)
    getAdminClubs()
      .then(data => {
        setClubs(data)
        setSelectedClubId(prev => prev || data[0]?.id.toString() || '')
      })
      .catch(() => toast.error('Không thể tải danh sách CLB.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedClub = useMemo(
    () => clubs.find(club => String(club.id) === selectedClubId),
    [clubs, selectedClubId]
  )

  if (loading) {
    return (
      <div className="mgmt-page mgmt-page--loading">
        Đang tải...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <div style={{ padding: '28px 32px 0', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <div style={{ borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: D.ink }}>Vị trí & quyền CLB</h1>
            <p style={{ margin: '4px 0 0', color: D.inkMuted, fontSize: 13 }}>Chọn CLB để kiểm tra hoặc can thiệp cấu hình vị trí.</p>
          </div>
          <FilterSelect
            value={selectedClubId}
            onChange={setSelectedClubId}
            options={clubs.map(club => ({ value: String(club.id), label: `${club.name} (${club.code})` }))}
            style={{ width: 300 }}
          />
        </div>
      </div>

      {selectedClub ? (
        <PositionManagementPanel
          clubId={selectedClub.id}
          clubName={selectedClub.name}
          title="Vị trí & quyền"
          canManageCatalog
        />
      ) : (
        <div style={{ padding: 32, color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          Chưa có CLB để cấu hình.
        </div>
      )}
    </div>
  )
}
