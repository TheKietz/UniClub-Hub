import { useState } from "react";
import {
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";
import AvatarGroup from "../../../shared/AvatarGroup";
import type { TaskItem, TaskStatus } from "../../services/operations.types";

const PRIORITY: Record<string, { label: string; color: string; accentColor: string }> = {
  Low: {
    label: "Thấp",
    color: "#3B4EFF",
    accentColor: "#3B4EFF",
  },
  Medium: {
    label: "Trung bình",
    color: "#FF9500",
    accentColor: "#FF9500",
  },
  High: {
    label: "Cao",
    color: "#FF3B3B",
    accentColor: "#FF3B3B",
  },
};

interface Props {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
}

export default function TaskCard({ task, onEdit }: Props) {
  const [hovered, setHovered] = useState(false);
  const p = PRIORITY[task.priority] ?? PRIORITY.Medium;
  const isDone = task.status === "Done";
  const now = new Date();
  const dl = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = !!dl && !isDone && dl < now;
  const isToday = !!dl && !isDone && dl.toDateString() === now.toDateString();

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    Todo:  { bg: '#F5F5F5', color: '#0A0A0A', label: 'Cần làm' },
    Doing: { bg: '#3B4EFF', color: 'white',   label: 'Đang làm' },
    Done:  { bg: '#00C853', color: 'white',   label: 'Hoàn thành' },
  };
  const ss = statusStyle[task.status] ?? statusStyle.Todo;

  return (
    <div
      style={{
        background: 'white',
        border: '2px solid #0A0A0A',
        borderLeft: `4px solid ${p.accentColor}`,
        boxShadow: hovered ? '5px 5px 0 #0A0A0A' : '3px 3px 0 #0A0A0A',
        borderRadius: 0,
        padding: '12px 14px',
        cursor: 'pointer',
        transform: hovered ? 'translate(-1px,-1px)' : 'none',
        transition: 'transform .12s, box-shadow .12s',
      }}
      onClick={() => onEdit(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: priority badge + icons */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          padding: '2px 7px',
          border: `1.5px solid #0A0A0A`,
          borderRadius: 0,
          background: 'white',
          color: p.color,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}>
          {p.label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isDone && <CheckCircle2 size={14} color="#00C853" />}
          {task.isBlocked && <Lock size={12} color="#FF3B3B" />}
          <button
            type="button"
            title="Tùy chọn"
            style={{
              padding: 2,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              opacity: hovered ? 1 : 0,
              transition: 'opacity .12s',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={14} color="#888" />
          </button>
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontSize: 13,
        fontWeight: 800,
        color: isDone ? '#999' : '#0A0A0A',
        textDecoration: isDone ? 'line-through' : 'none',
        margin: '0 0 10px 0',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {task.title}
      </p>

      {/* Status badge */}
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          padding: '2px 7px',
          border: '1.5px solid #0A0A0A',
          borderRadius: 0,
          background: ss.bg,
          color: ss.color,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}>
          {ss.label}
        </span>
      </div>

      {/* Bottom row: date + assignee */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {dl ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: isOverdue ? '#FF3B3B' : isToday ? '#FF9500' : '#888',
          }}>
            {isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
            <span>{isToday ? "Hôm nay" : fmtDate(dl)}</span>
          </div>
        ) : (
          <div />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.subTaskCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#AAA', fontWeight: 700 }}>
              <Layers size={10} />
              {task.subTaskCount}
            </span>
          )}
          {task.assigneeName && (
            <div style={{ borderRadius: 0, border: '2px solid #0A0A0A', overflow: 'hidden' }}>
              <AvatarGroup
                avatars={[{ name: task.assigneeName }]}
                max={1}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
