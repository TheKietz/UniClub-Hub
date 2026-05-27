import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { TaskItem } from '../services/operations.types'
import { getTasks } from '../services/operationsApi'

interface TasksCtx {
  tasks: TaskItem[]
  tasksLoading: boolean
  departmentId: number | undefined
  reloadTasks: () => Promise<void>
  patchTask: (t: TaskItem) => void
  addTask: (t: TaskItem) => void
  removeTask: (id: number) => void
  setAllTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>
}

const Ctx = createContext<TasksCtx | null>(null)

export function TasksProvider({
  clubId, departmentId, children,
}: {
  clubId: number
  departmentId?: number
  children: React.ReactNode
}) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const reloadTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const r = await getTasks({ clubId, departmentId, pageSize: 500 })
      setTasks(r.items)
    } catch { toast.error('Không thể tải công việc') }
    finally { setTasksLoading(false) }
  }, [clubId, departmentId])

  useEffect(() => { reloadTasks() }, [reloadTasks])

  return (
    <Ctx.Provider value={{
      tasks,
      tasksLoading,
      departmentId,
      reloadTasks,
      patchTask: t => setTasks(prev => prev.map(x => x.id === t.id ? t : x)),
      addTask:   t => setTasks(prev => [...prev, t]),
      removeTask: id => setTasks(prev => prev.filter(x => x.id !== id)),
      setAllTasks: setTasks,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider')
  return ctx
}
