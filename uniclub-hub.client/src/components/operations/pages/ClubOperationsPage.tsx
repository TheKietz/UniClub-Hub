import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { TasksProvider } from '../context/TasksContext';
import KanbanPage from './KanbanPage';
import SprintsPage from './SprintsPage';
import EventListPage from './EventListPage';
import WorkloadPage from './WorkloadPage';
import GanttPage from './GanttPage';
import DeadlinePage from './DeadlinePage';
import CalendarPage from './CalendarPage';
import ActivityLogPage from './ActivityLogPage';
import OperationsDashboard from './OperationsDashboard';
import MyTasksPage from './MyTasksPage';
import { getDepartments } from '../../membership/services/clubApi';
import type { DepartmentItem } from '../../membership/services/club.types';
import { useAuth } from '@/contexts/AuthContext';
import { CLUB_ROLES } from '@/types/auth';

const TABS = [
  { id: 'overview',   label: 'Tổng quan',  icon: '◇', memberAllowed: true  },
  { id: 'mytasks',    label: 'Task',        icon: '✓', memberAllowed: true  },
  { id: 'sprints',    label: 'Backlog',     icon: '≡', memberAllowed: true  },
  { id: 'board',      label: 'Board',       icon: '▦', memberAllowed: true  },
  { id: 'events',     label: 'Sự kiện',    icon: '◐', memberAllowed: false },
  { id: 'workload',   label: 'Phân công',  icon: '◎', memberAllowed: false },
  { id: 'gantt',      label: 'Gantt',       icon: '↗', memberAllowed: true  },
  { id: 'deadlines',  label: 'Deadlines',   icon: '⊖', memberAllowed: true  },
  { id: 'calendar',   label: 'Lịch',        icon: '◑', memberAllowed: true  },
  { id: 'activity',   label: 'Hoạt động',    icon: '◉', memberAllowed: false },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ClubOperationsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get('view') ?? 'overview') as TabId;

  const { user, getClubRole } = useAuth();
  const clubIdNum = Number(clubId ?? 0);
  const clubRole = getClubRole(clubIdNum);
  const isClubAdmin = clubRole === CLUB_ROLES.CLUB_ADMIN;
  const canAccessAll = clubRole === CLUB_ROLES.CLUB_ADMIN || clubRole === CLUB_ROLES.DEPT_LEAD;

  const visibleTabs = useMemo(
    () => TABS.filter(t => canAccessAll || t.memberAllowed),
    [canAccessAll],
  );

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>();

  useEffect(() => {
    if (!clubId || !user) return;

    getDepartments(clubIdNum).then(depts => {
      let visible: DepartmentItem[];

      if (isClubAdmin) {
        visible = depts;
      } else {
        // Collect all departmentIds the user belongs to in this club
        const myDeptIds = new Set(
          user.memberships
            .filter(m => m.clubId === clubIdNum && m.departmentId != null)
            .map(m => m.departmentId!)
        );
        visible = myDeptIds.size > 0
          ? depts.filter(d => myDeptIds.has(d.id))
          : depts; // fallback: show all if no dept assignment
      }

      setDepartments(visible);
      setSelectedDeptId(prev => {
        // Keep the current selection if it's still valid; otherwise default to first
        if (prev != null && visible.some(d => d.id === prev)) return prev;
        return visible[0]?.id;
      });
    }).catch(() => { /* silently fall back to club-wide view */ });
  }, [clubId, clubIdNum, user, isClubAdmin]);

  function setView(v: TabId) {
    setSearchParams({ view: v }, { replace: true });
  }

  // Redirect to overview if the active tab is not accessible to this role
  useEffect(() => {
    if (!visibleTabs.some(t => t.id === view)) {
      setView('overview');
    }
  }, [view, visibleTabs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#FAFAF0' }}>
      {/* ── Neo-Brutalism tab bar ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        background: '#0A0A0A',
        borderBottom: '4px solid #FFE500',
        flexShrink: 0,
        overflowX: 'auto',
        padding: '0 24px',
      }}>
        {/* Department selector / label */}
        <div style={{
          paddingRight: 20,
          marginRight: 8,
          borderRight: '2px solid rgba(255,229,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          {departments.length > 1 ? (
            <select
              value={selectedDeptId ?? ''}
              onChange={e => setSelectedDeptId(Number(e.target.value))}
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: '#FFE500',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                padding: '0 18px 0 0',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%23FFE500\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0 center',
              }}
            >
              {departments.map(d => (
                <option key={d.id} value={d.id} style={{ background: '#0A0A0A', color: 'white', fontWeight: 700 }}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{
              fontSize: 11,
              fontWeight: 900,
              color: 'white',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              {departments[0]?.name ?? `CLB #${clubId}`}
            </span>
          )}
        </div>

        {visibleTabs.map(tab => {
          const isActive = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: isActive ? '14px 18px' : '12px 14px',
                border: 'none',
                background: isActive ? '#FFE500' : 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontSize: 12,
                fontWeight: isActive ? 900 : 700,
                color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.6)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                transition: 'background .1s, color .1s',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,229,0,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'white';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
                }
              }}
            >
              <span style={{ fontSize: 12 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: '#FAFAF0' }}>
        <TasksProvider clubId={clubIdNum} departmentId={selectedDeptId}>
          {view === 'overview'  && <OperationsDashboard />}
          {view === 'mytasks'   && <MyTasksPage />}
          {view === 'board'     && <KanbanPage />}
          {view === 'sprints'   && <SprintsPage />}
          {view === 'events'    && <EventListPage />}
          {view === 'workload'  && <WorkloadPage />}
          {view === 'gantt'     && <GanttPage />}
          {view === 'deadlines' && <DeadlinePage />}
          {view === 'calendar'  && <CalendarPage />}
          {view === 'activity'  && <ActivityLogPage />}
        </TasksProvider>
      </div>
    </div>
  );
}
