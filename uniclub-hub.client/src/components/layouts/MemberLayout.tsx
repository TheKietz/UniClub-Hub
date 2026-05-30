import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'

/* ─── MemberLayout ──────────────────────────────────────────────────── */
export default function MemberLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="member" />
      <main style={{ flex: 1, overflow: 'auto', background: '#f7f6f1' }}>
        <Outlet />
      </main>
    </div>
  )
}
