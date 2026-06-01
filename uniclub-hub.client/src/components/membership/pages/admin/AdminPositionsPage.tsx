import { useEffect, useMemo, useState } from 'react'
import { getAdminClubs } from '@/components/membership/services/adminApi'
import type { ClubItem } from '@/components/membership/services/admin.types'
import PositionManagementPanel from '@/components/membership/pages/shared/PositionManagementPanel'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { toast } from 'sonner'

const D = {
  border: '1.5px solid #15131a',
  shadow: (x = 3, y = 3) => `${x}px ${y}px 0 #15131a`,
  radius: 14,
  ink: '#15131a',
  inkMuted: '#918c99',
  bg: '#f7f6f1',
  card: '#ffffff',
}

export default function AdminPositionsPage() {
  const [clubs, setClubs] = useState<ClubItem[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      <div style={{ padding: '28px 32px', minHeight: '100%', background: D.bg, color: D.inkMuted, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        Đang tải...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <div style={{ padding: '28px 32px 0', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <div style={{ borderRadius: D.radius, background: D.card, border: D.border, boxShadow: D.shadow(), padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: D.ink }}>Position & permission CLB</h1>
            <p style={{ margin: '4px 0 0', color: D.inkMuted, fontSize: 13 }}>Chọn CLB để kiểm tra hoặc can thiệp cấu hình position.</p>
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
