import { Outlet, useParams } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

export default function ClubManageLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <DashboardSidebar mode="club" clubId={clubId} />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--c-bg)' }}>
        <Outlet />
      </main>
      <ThemeSwitcher />
    </div>
  )
}
