import { useState, useRef, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { TaskItem, KanbanColumnItem } from "../../services/operations.types";

interface Props {
  column: KanbanColumnItem;
  tasks: TaskItem[];
  onAdd: (columnId: number) => void;
  onEdit: (task: TaskItem) => void;
  onRename: (id: number, newName: string) => void;
  onDelete: (id: number) => void;
  isDarkBg?: boolean;
}

export default function KanbanColumn({ column, tasks, onAdd, onEdit, onRename, onDelete }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plusHovered, setPlusHovered] = useState(false);
  const [moreHovered, setMoreHovered] = useState(false);
  const [addBtnHovered, setAddBtnHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  useEffect(() => {
    setNameValue(column.name);
  }, [column.name]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== column.name) onRename(column.id, trimmed);
    else setNameValue(column.name);
    setRenaming(false);
  };

  return (
    <div style={{ flexShrink: 0, width: 272, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: '#0A0A0A',
        border: '2px solid #0A0A0A',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
      }}>
        {renaming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <input
              ref={inputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setNameValue(column.name); setRenaming(false); }
              }}
              onBlur={commitRename}
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: 700,
                background: 'white',
                color: '#0A0A0A',
                border: '2px solid #FFE500',
                borderRadius: 0,
                padding: '3px 8px',
                outline: 'none',
              }}
            />
            <button type="button" onClick={commitRename} style={{ color: '#00C853', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <Check size={13} />
            </button>
            <button type="button" onClick={() => { setNameValue(column.name); setRenaming(false); }} style={{ color: '#AAA', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                flex: 1,
                cursor: 'pointer',
              }}
              onDoubleClick={() => setRenaming(true)}
            >
              {column.name}
            </span>

            {/* Task count badge */}
            <span style={{
              background: '#FFE500',
              color: '#0A0A0A',
              border: '2px solid #0A0A0A',
              fontWeight: 900,
              fontSize: 11,
              padding: '1px 7px',
              borderRadius: 0,
            }}>
              {tasks.length}
            </span>

            {/* Action icons */}
            <button
              type="button"
              onClick={() => onAdd(column.id)}
              onMouseEnter={() => setPlusHovered(true)}
              onMouseLeave={() => setPlusHovered(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: plusHovered ? '#FFE500' : 'white',
                display: 'flex',
                alignItems: 'center',
                transition: 'color .1s',
                padding: 2,
              }}
            >
              <Plus size={14} />
            </button>

            <div className="relative" ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                onMouseEnter={() => setMoreHovered(true)}
                onMouseLeave={() => setMoreHovered(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: moreHovered ? '#FFE500' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color .1s',
                  padding: 2,
                }}
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'white',
                  border: '2px solid #0A0A0A',
                  boxShadow: '3px 3px 0 #0A0A0A',
                  borderRadius: 0,
                  padding: '4px 0',
                  zIndex: 20,
                  width: 144,
                }}>
                  <button
                    type="button"
                    onClick={() => { setRenaming(true); setMenuOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0A0A0A',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFFBE0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Pencil size={13} /> Đổi tên
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDelete(column.id); setMenuOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#FF3B3B',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Trash2 size={13} /> Xóa cột
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 120,
              padding: 8,
              background: snapshot.isDraggingOver ? '#FFFBE0' : '#FAFAF0',
              border: snapshot.isDraggingOver ? '2px dashed #0A0A0A' : '2px solid #0A0A0A',
              borderTop: 'none',
              borderRadius: 0,
              transition: 'background .1s',
            }}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#BBB',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                padding: '32px 0',
              }}>
                Không có thẻ
              </div>
            )}

            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {prov => (
                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                    <TaskCard task={task} onEdit={onEdit} onStatusChange={() => {}} />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {/* Add card button */}
            <button
              type="button"
              onClick={() => onAdd(column.id)}
              onMouseEnter={() => setAddBtnHovered(true)}
              onMouseLeave={() => setAddBtnHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#0A0A0A',
                background: addBtnHovered ? '#FFE500' : 'transparent',
                border: '2px dashed #0A0A0A',
                borderRadius: 0,
                cursor: 'pointer',
                marginTop: 4,
                transition: 'background .1s',
              }}
            >
              <Plus size={13} /> Thêm thẻ
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
