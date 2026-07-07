import { useParams } from 'react-router-dom'
import AppShell from './AppShell'

/* ─── MemberLayout ──────────────────────────────────────────────────── */
export default function MemberLayout() {
  const { clubId } = useParams<{ clubId: string }>()
  return <AppShell mode="member" clubId={clubId} />
}
