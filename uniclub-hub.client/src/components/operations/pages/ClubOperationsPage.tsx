import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { TasksProvider } from '../context/TasksContext';
import KanbanPage from './KanbanPage';
import SprintsPage from './SprintsPage';
import WorkloadPage from './WorkloadPage';
import GanttPage from './GanttPage';
import DeadlinePage from './DeadlinePage';
import CalendarPage from './CalendarPage';
import ActivityLogPage from './ActivityLogPage';
import OperationsDashboard from './OperationsDashboard';
import MyTasksPage from './MyTasksPage';
import KpiPage from './KpiPage';
import { getDepartments } from '../../membership/services/clubApi';
import type { DepartmentItem } from '../../membership/services/club.types';
import { useAuth } from '@/contexts/AuthContext';
import { CLUB_ROLES } from '@/types/auth';
import { FilterSelect } from '@/components/shared/FilterSelect';

const TABS = [
  { id: 'overview',   label: 'Tổng quan',  icon: '◇', memberAllowed: true  },
  { id: 'mytasks',    label: 'Task',        icon: '✓', memberAllowed: true  },
  { id: 'sprints',    label: 'Backlog',     icon: '≡', memberAllowed: true  },
  { id: 'board',      label: 'Board',       icon: '▦', memberAllowed: true  },
  { id: 'deadlines',  label: 'Deadlines',   icon: '⊖', memberAllowed: true  },
  { id: 'workload',   label: 'Phân công',  icon: '◎', memberAllowed: false },
  { id: 'gantt',      label: 'Gantt',       icon: '↗', memberAllowed: true  },
  { id: 'calendar',   label: 'Lịch',        icon: '◑', memberAllowed: true  },
  { id: 'activity',   label: 'Hoạt động',    icon: '◉', memberAllowed: false },
  { id: 'kpi',        label: 'KPI',          icon: '◈', memberAllowed: true  },
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
  const [deptLoaded, setDeptLoaded] = useState(false);

  useEffect(() => {
    // Reset so switching clubs shows loading again
    setDeptLoaded(false);

    if (!clubId || !user) {
      // No auth context yet — render club-wide immediately
      setDeptLoaded(true);
      return;
    }

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
    })
      .catch(() => { /* silently fall back to club-wide view */ })
      .finally(() => setDeptLoaded(true));
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
            <FilterSelect
              value={selectedDeptId?.toString() ?? ''}
              onChange={value => setSelectedDeptId(Number(value))}
              options={departments.map(d => ({ value: d.id.toString(), label: d.name }))}
              style={{ width: 180 }}
              maxMenuHeight={260}
            />
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
        {!deptLoaded ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ color: '#999', fontSize: 13 }}>Đang tải...</span>
          </div>
        ) : (
          <TasksProvider clubId={clubIdNum} departmentId={selectedDeptId}>
            {view === 'overview'  && <OperationsDashboard />}
            {view === 'mytasks'   && <MyTasksPage />}
            {view === 'board'     && <KanbanPage />}
            {view === 'sprints'   && <SprintsPage />}
            {view === 'workload'  && <WorkloadPage />}
            {view === 'gantt'     && <GanttPage />}
            {view === 'deadlines' && <DeadlinePage />}
            {view === 'calendar'  && <CalendarPage />}
            {view === 'activity'  && <ActivityLogPage />}
            {view === 'kpi'       && <KpiPage />}
          </TasksProvider>
        )}
      </div>
    </div>
  );
}
