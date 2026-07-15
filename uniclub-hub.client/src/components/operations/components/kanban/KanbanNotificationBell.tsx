import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, GitBranch, ArrowRightLeft, Clock, Star, Pencil } from "lucide-react";
import {
  getNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/components/membership/services/notificationApi";
import type { NotificationItem, NotificationType } from "@/components/membership/services/notificationApi";
import { useNotificationSignalR } from "@/lib/useNotificationSignalR";

/* ── Kanban-relevant notification types ──────────────────────────────────────
   Only task events surface on a board bell: new/assigned tasks, status changes,
   content edits (title, description, deadline...) and deadline reminders. */
const KANBAN_TYPES = new Set<NotificationType>([
  "Task", "TaskAssigned", "TaskStatusUpdated", "TaskUpdated", "DeadlineReminder",
]);

const PAGE_SIZE = 50;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

// Icon + accent color per notification type so the list scans quickly.
function typeVisual(type: NotificationType): { color: string; icon: React.ReactNode } {
  switch (type) {
    case "TaskAssigned":      return { color: "#1d4ed8", icon: <GitBranch size={16} color="#fff" /> };
    case "TaskStatusUpdated": return { color: "#7c3aed", icon: <ArrowRightLeft size={16} color="#fff" /> };
    case "TaskUpdated":       return { color: "#0d9488", icon: <Pencil size={16} color="#fff" /> };
    case "DeadlineReminder":  return { color: "#ea580c", icon: <Clock size={16} color="#fff" /> };
    default:                  return { color: "#0a2f6e", icon: <Star size={16} fill="#fff" color="#fff" /> };
  }
}

interface Props {
  clubId: number;
  /** Ids of the tasks visible on this board (already scoped to the user's
   *  department). When provided, only notifications for these tasks show. */
  boardTaskIds?: Set<number>;
}

/**
 * Bell dropdown for Kanban-related notifications (assignment, status change,
 * deadline, …). Reuses the shared per-user notification store, filtered to the
 * current club's task events. Rendered via a portal with a high z-index so the
 * panel is never clipped by the board or other stacking contexts.
 */
export default function KanbanNotificationBell({ clubId, boardTaskIds }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Only task notifications, and only for tasks that live on this board
  // (i.e. within the user's department) — assignment/system alerts stay out.
  const isKanbanNotif = useCallback((n: NotificationItem) => {
    if (!KANBAN_TYPES.has(n.type)) return false;
    if (n.relatedEntityType !== "Task") return false;
    if (boardTaskIds && (n.relatedEntityId == null || !boardTaskIds.has(n.relatedEntityId))) return false;
    return !n.navigationUrl || n.navigationUrl.includes(`/clubs/${clubId}/`);
  }, [clubId, boardTaskIds]);

  // Fetches asynchronously (no synchronous setState) so it is safe to call from
  // an effect body; the spinner is driven separately from the click handler.
  const fetchList = useCallback(() =>
    getNotifications(1, PAGE_SIZE)
      .then(res => {
        const kanban = res.items.filter(isKanbanNotif);
        setItems(kanban);
        setUnreadCount(kanban.filter(n => !n.isRead).length);
      })
      .catch(() => {}),
  [isKanbanNotif]);

  // Initial load + slow poll fallback when the socket is down.
  useEffect(() => {
    fetchList();
    const timer = setInterval(fetchList, 60_000);
    return () => clearInterval(timer);
  }, [fetchList]);

  // Realtime: refresh the badge/list as new notifications arrive.
  useNotificationSignalR(() => { fetchList(); });

  // Close on outside click (button wrapper OR portal dropdown).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (dropRef.current && !dropRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      setLoading(true);
      fetchList().finally(() => setLoading(false));
    }
    setOpen(v => !v);
  };

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  };

  const markRead = async (id: number) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await markNotificationRead(id).catch(() => {});
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.isRead) await markRead(n.id);
    if (n.navigationUrl) {
      setOpen(false);
      navigate(n.navigationUrl);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Thông báo Kanban"
        onClick={handleToggle}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: open ? "#0a2f6e" : "#f4f7fc", color: open ? "#fff" : "#4a4651",
          border: "1.5px solid #0a2f6e", boxShadow: open ? "none" : "2px 2px 0 #0a2f6e",
          padding: "7px 10px", borderRadius: 999, cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5, minWidth: 16, height: 16,
            borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 9,
            fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "1.5px solid #fff",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          className="kanban-notif-scroll"
          style={{
            position: "fixed", top: pos.top, right: pos.right,
            width: "min(340px, calc(100vw - 24px))",
            background: "#fff", borderRadius: 16,
            border: "2px solid #0a2f6e", boxShadow: "6px 6px 0 rgba(10,47,110,.18)",
            zIndex: 9999, overflow: "hidden",
            fontFamily: "'Be Vietnam Pro', sans-serif",
          }}
        >
          <style>{`
            .kanban-notif-list { scrollbar-width: thin; scrollbar-color: rgba(10,47,110,.2) transparent; }
            .kanban-notif-list::-webkit-scrollbar { width: 5px; }
            .kanban-notif-list::-webkit-scrollbar-thumb { background: rgba(10,47,110,.2); border-radius: 999px; }
          `}</style>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: "1px solid #dce6f4" }}>
            <span style={{ fontWeight: 900, fontSize: 15, color: "#0a2f6e", letterSpacing: "-.02em" }}>
              Thông báo Kanban
            </span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              style={{
                fontSize: 12, fontWeight: 800, color: "#1d4ed8",
                background: "none", border: "none",
                cursor: unreadCount === 0 ? "default" : "pointer",
                opacity: unreadCount === 0 ? 0.45 : 1, fontFamily: "inherit",
              }}
            >
              Đánh dấu đã đọc
            </button>
          </div>

          {/* List */}
          <div className="kanban-notif-list" style={{ maxHeight: 360, overflowY: "auto", background: "#f7f9fc" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <div style={{ width: 18, height: 18, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            ) : items.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 13, color: "#918c99", padding: "38px 16px", margin: 0 }}>
                Chưa có thông báo nào
              </p>
            ) : items.map(n => {
              const v = typeVisual(n.type);
              return (
                <div key={n.id} onClick={() => handleItemClick(n)}
                  style={{ padding: "12px 18px", borderBottom: "1px solid #e8ecf4", cursor: "pointer", background: n.isRead ? "#f7f9fc" : "#eef3ff", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#e6edfb")}
                  onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "#f7f9fc" : "#eef3ff")}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, border: "2px solid #0a2f6e", background: v.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {v.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 800, color: "#0a2f6e", margin: 0,
                        lineHeight: 1.3, letterSpacing: "-.01em",
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                      }}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p style={{
                          fontSize: 11, color: "#6b7280", margin: "3px 0 0", lineHeight: 1.35,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                        }}>
                          {n.message}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: "#918c99", margin: "4px 0 0" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff563f", flexShrink: 0, marginTop: 6 }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/notifications"); }}
            style={{
              width: "100%", height: 42, border: "none", borderTop: "1px solid #dce6f4",
              background: "#fff", color: "#1d4ed8", fontSize: 13, fontWeight: 900,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Xem tất cả thông báo →
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
