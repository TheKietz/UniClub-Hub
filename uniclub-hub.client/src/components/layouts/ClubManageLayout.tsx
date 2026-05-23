import { Outlet, useParams } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="club" clubId={clubId} />
      <main style={{ flex: 1, overflow: 'auto', background: '#f7f6f1' }}>
        <Outlet />
      </main>
    </div>
  )
}
