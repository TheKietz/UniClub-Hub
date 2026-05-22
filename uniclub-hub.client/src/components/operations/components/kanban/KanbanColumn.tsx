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

export default function KanbanColumn({ column, tasks, onAdd, onEdit, onRename, onDelete, isDarkBg = false }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const dotColor = column.color ?? "#6b7280";
  const titleClass = isDarkBg ? "text-white/90" : "text-gray-700";
  const countClass = isDarkBg ? "bg-white/20 text-white/80" : "bg-gray-200 text-gray-400";
  const iconClass  = isDarkBg ? "text-white/60 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200";
  const dropBg     = isDarkBg ? "bg-black/25 backdrop-blur-sm" : "bg-gray-100/70";
  const dropOver   = isDarkBg ? "bg-white/15 border-2 border-dashed border-white/40" : "bg-indigo-50 border-2 border-dashed border-indigo-300";
  const addBtnClass= isDarkBg ? "text-white/60 hover:text-white hover:bg-white/15" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/60";

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 py-2 mb-1 group">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />

        {renaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={inputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setNameValue(column.name); setRenaming(false); }
              }}
              onBlur={commitRename}
              className="flex-1 text-sm font-semibold bg-white text-gray-700 border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button type="button" onClick={commitRename} className="text-green-500 hover:text-green-700">
              <Check size={13} />
            </button>
            <button type="button" onClick={() => { setNameValue(column.name); setRenaming(false); }} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <span
              className={`text-sm font-semibold flex-1 cursor-pointer ${titleClass}`}
              onDoubleClick={() => setRenaming(true)}
            >
              {column.name}
            </span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${countClass}`}>
              {tasks.length}
            </span>
          </>
        )}

        {/* Actions */}
        {!renaming && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onAdd(column.id)}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${iconClass}`}
            >
              <Plus size={14} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${iconClass}`}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-36">
                  <button
                    type="button"
                    onClick={() => { setRenaming(true); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={13} /> Đổi tên
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDelete(column.id); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={13} /> Xóa cột
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-2xl p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? dropOver : dropBg
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className={`flex-1 flex items-center justify-center text-xs py-8 ${isDarkBg ? "text-white/30" : "text-gray-300"}`}>
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
              className={`flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded-lg transition-colors mt-1 ${addBtnClass}`}
            >
              <Plus size={13} /> Thêm thẻ
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
