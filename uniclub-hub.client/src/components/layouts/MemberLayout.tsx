import { Outlet } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import { D } from '@/components/shared/managementTheme'

/* ─── MemberLayout ──────────────────────────────────────────────────── */
export default function MemberLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="member" clubId={clubId} />
      <main style={{ flex: 1, overflow: 'auto', background: D.bg }}>
        <Outlet />
      </main>
    </div>
  )
}
