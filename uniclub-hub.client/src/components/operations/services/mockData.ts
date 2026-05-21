import type { SprintCardData } from '../components/sprint/SprintCard'
import type { TaskStatus, TaskPriority, EventStatus } from './operations.types'

/* ── Sprint Mock Data ───────────────────────────────────────────────── */

export const MOCK_SPRINTS: SprintCardData[] = [
  {
    id: 1,
    name: 'Sprint 12: Chuẩn bị Gala 2024',
    status: 'Active',
    startDate: '2024-10-15',
    endDate: '2024-10-29',
    goal: 'Hoàn thiện kế hoạch tổng thể cho đêm Gala, bao gồm tiết mục, logistics, truyền thông.',
    progress: 65,
    taskCount: 24,
    leadName: 'Hoàng Nam',
    members: [
      { name: 'Hoàng Nam' },
      { name: 'Minh Thư' },
      { name: 'Kim Chi' },
      { name: 'Anh Tuấn' },
      { name: 'Đức Huy' },
    ],
  },
  {
    id: 2,
    name: 'Sprint 13: Tuyển thành viên Gen 10',
    status: 'Planning',
    startDate: '2024-11-01',
    endDate: '2024-11-15',
    goal: 'Lên kế hoạch chiến dịch tuyển thành viên mới cho thế hệ Gen 10.',
    progress: 0,
    taskCount: 12,
    leadName: 'Minh Thư',
    members: [
      { name: 'Minh Thư' },
      { name: 'Kim Chi' },
    ],
  },
  {
    id: 3,
    name: 'Sprint 11: Team Building Hè',
    status: 'Completed',
    startDate: '2024-09-01',
    endDate: '2024-09-15',
    goal: 'Tổ chức chuyến team building thắt chặt tình đồng đội.',
    progress: 100,
    taskCount: 32,
    leadName: 'Anh Tuấn',
    members: [
      { name: 'Anh Tuấn' },
      { name: 'Hoàng Nam' },
      { name: 'Minh Thư' },
      { name: 'Kim Chi' },
    ],
  },
  {
    id: 4,
    name: 'Sprint 12.1: Marketing & PR',
    status: 'Active',
    startDate: '2024-10-18',
    endDate: '2024-11-02',
    goal: 'Triển khai chiến dịch truyền thông đa kênh cho sự kiện Gala.',
    progress: 30,
    taskCount: 18,
    leadName: 'Kim Chi',
    members: [
      { name: 'Kim Chi' },
      { name: 'Đức Huy' },
      { name: 'Lan Anh' },
    ],
  },
]

/* ── Dashboard Stats ────────────────────────────────────────────────── */

export const MOCK_DASHBOARD_STATS = {
  totalSprints: 12,
  activeSprints: 2,
  completedTasks: 148,
  totalMembers: 45,
}

/* ── Task Mock Data ─────────────────────────────────────────────────── */

export interface MockTask {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeName: string
  deadline: string
  progress: number
  sprintId?: number
  subTaskCount: number
}

export const MOCK_TASKS: MockTask[] = [
  {
    id: 1,
    title: 'Thiết kế poster sự kiện Gala',
    status: 'Doing',
    priority: 'High',
    assigneeName: 'Hoàng Nam',
    deadline: '2024-10-25',
    progress: 70,
    sprintId: 1,
    subTaskCount: 3,
  },
  {
    id: 2,
    title: 'Liên hệ nhà tài trợ',
    status: 'Todo',
    priority: 'High',
    assigneeName: 'Minh Thư',
    deadline: '2024-10-22',
    progress: 0,
    sprintId: 1,
    subTaskCount: 0,
  },
  {
    id: 3,
    title: 'Viết kịch bản MC',
    status: 'Doing',
    priority: 'Medium',
    assigneeName: 'Kim Chi',
    deadline: '2024-10-27',
    progress: 45,
    sprintId: 1,
    subTaskCount: 2,
  },
  {
    id: 4,
    title: 'Booking địa điểm',
    status: 'Done',
    priority: 'High',
    assigneeName: 'Anh Tuấn',
    deadline: '2024-10-20',
    progress: 100,
    sprintId: 1,
    subTaskCount: 0,
  },
  {
    id: 5,
    title: 'Thiết kế banner chào mừng',
    status: 'Todo',
    priority: 'Low',
    assigneeName: 'Đức Huy',
    deadline: '2024-10-28',
    progress: 0,
    sprintId: 1,
    subTaskCount: 1,
  },
  {
    id: 6,
    title: 'Chuẩn bị form đăng ký',
    status: 'Doing',
    priority: 'Medium',
    assigneeName: 'Lan Anh',
    deadline: '2024-11-05',
    progress: 60,
    sprintId: 2,
    subTaskCount: 0,
  },
  {
    id: 7,
    title: 'Tạo video promo',
    status: 'Todo',
    priority: 'High',
    assigneeName: 'Hoàng Nam',
    deadline: '2024-11-10',
    progress: 0,
    sprintId: 2,
    subTaskCount: 4,
  },
  {
    id: 8,
    title: 'Thiết kế bộ nhận diện sự kiện',
    status: 'Done',
    priority: 'Medium',
    assigneeName: 'Kim Chi',
    deadline: '2024-09-10',
    progress: 100,
    sprintId: 3,
    subTaskCount: 0,
  },
]

/* ── Event Mock Data ────────────────────────────────────────────────── */

export interface MockEvent {
  id: number
  name: string
  description?: string
  location: string
  startTime: string
  endTime: string
  status: EventStatus
  participantCount: number
  maxParticipants?: number
  supervisors: Array<{ name: string }>
  resources: Array<{ name: string; size: string }>
  timeline: Array<{
    time: string
    title: string
    description?: string
    color: string
  }>
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 1,
    name: 'Hội Thảo Công Nghệ Tương Lai 2024',
    description:
      'Hội thảo quy tụ các chuyên gia hàng đầu về xu hướng công nghệ mới, trí tuệ nhân tạo, blockchain với hơn 500 sinh viên tham gia.',
    location: 'Hội trường A, Tòa B',
    startTime: '2024-11-15T08:00:00',
    endTime: '2024-11-15T17:00:00',
    status: 'InProgress',
    participantCount: 320,
    maxParticipants: 500,
    supervisors: [
      { name: 'Trần Thị B' },
      { name: 'Mã Thu Thảo' },
    ],
    resources: [
      { name: 'Ke_hoach_su_kien.pdf', size: '2.4 MB' },
      { name: 'Danh_sach_dien_gia.xlsx', size: '1.1 MB' },
    ],
    timeline: [
      {
        time: '08:00 - 09:00',
        title: 'Đón Khách & Đăng Ký',
        description: 'Check-in thành viên, phát tài liệu, chụp ảnh lưu niệm.',
        color: '#ef4444',
      },
      {
        time: '09:00 - 10:30',
        title: 'Keynote: Tương Lai Trí Tuệ Nhân Tạo',
        description: 'Bài phát biểu chủ đạo với 4 diễn giả hàng đầu trong lĩnh vực AI.',
        color: '#3b82f6',
      },
      {
        time: '10:30 - 12:00',
        title: 'Tọa Đàm Chuyên Gia',
        description: 'Thảo luận mở với 3 diễn giả khách mời.',
        color: '#8b5cf6',
      },
    ],
  },
  {
    id: 2,
    name: 'Buổi Định hướng Tân Thành Viên',
    description: 'Buổi gặp mặt, giới thiệu CLB và hướng dẫn tân thành viên.',
    location: 'Hội trường A',
    startTime: '2024-10-15T14:00:00',
    endTime: '2024-10-15T17:00:00',
    status: 'Completed',
    participantCount: 85,
    supervisors: [{ name: 'Nguyễn Văn A' }],
    resources: [],
    timeline: [],
  },
  {
    id: 3,
    name: 'Hội Thảo Kỹ năng Lãnh đạo',
    description: 'Workshop nâng cao kỹ năng lãnh đạo cho ban điều hành.',
    location: 'Phòng 204, Tòa B',
    startTime: '2024-11-20T09:00:00',
    endTime: '2024-11-20T12:00:00',
    status: 'Draft',
    participantCount: 0,
    maxParticipants: 40,
    supervisors: [{ name: 'Trần Tuấn' }],
    resources: [],
    timeline: [],
  },
  {
    id: 4,
    name: 'Gala Chào Xuân 2025',
    description: 'Đêm hội mừng năm mới với các tiết mục văn nghệ đặc sắc.',
    location: 'Sân Vận Động Trung tâm',
    startTime: '2025-01-20T18:00:00',
    endTime: '2025-01-20T22:00:00',
    status: 'Draft',
    participantCount: 0,
    maxParticipants: 500,
    supervisors: [{ name: 'Lê Hoàng C' }],
    resources: [],
    timeline: [],
  },
]

/* ── Activity Log Mock Data ─────────────────────────────────────────── */

export interface ActivityLogItem {
  id: number
  user: string
  action: string
  target: string
  time: string
  type: 'task' | 'event' | 'sprint' | 'member'
}

export const MOCK_ACTIVITY_LOG: ActivityLogItem[] = [
  {
    id: 1,
    user: 'Hoàng Nam',
    action: 'đã hoàn thành task',
    target: 'Thiết kế poster sự kiện',
    time: '10 phút trước',
    type: 'task',
  },
  {
    id: 2,
    user: 'Minh Thư',
    action: 'đã tạo sprint mới',
    target: 'Sprint 13: Tuyển thành viên Gen 10',
    time: '1 giờ trước',
    type: 'sprint',
  },
  {
    id: 3,
    user: 'Kim Chi',
    action: 'đã cập nhật sự kiện',
    target: 'Hội Thảo Công Nghệ',
    time: '2 giờ trước',
    type: 'event',
  },
  {
    id: 4,
    user: 'Anh Tuấn',
    action: 'đã phân công task',
    target: 'Viết kịch bản MC cho Đức Huy',
    time: '3 giờ trước',
    type: 'task',
  },
  {
    id: 5,
    user: 'Lan Anh',
    action: 'đã tham gia CLB',
    target: 'Ban Truyền thông',
    time: '5 giờ trước',
    type: 'member',
  },
  {
    id: 6,
    user: 'Đức Huy',
    action: 'đã comment vào task',
    target: 'Booking địa điểm',
    time: 'Hôm qua',
    type: 'task',
  },
]

/* ── Workload Mock ──────────────────────────────────────────────────── */

export interface WorkloadMember {
  name: string
  todo: number
  doing: number
  done: number
  total: number
  hoursEstimated: number
  hoursActual: number
}

export const MOCK_WORKLOAD: WorkloadMember[] = [
  { name: 'Hoàng Nam', todo: 3, doing: 2, done: 5, total: 10, hoursEstimated: 40, hoursActual: 35 },
  { name: 'Minh Thư', todo: 2, doing: 3, done: 4, total: 9, hoursEstimated: 36, hoursActual: 28 },
  { name: 'Kim Chi', todo: 4, doing: 1, done: 6, total: 11, hoursEstimated: 44, hoursActual: 38 },
  { name: 'Anh Tuấn', todo: 1, doing: 2, done: 8, total: 11, hoursEstimated: 44, hoursActual: 42 },
  { name: 'Đức Huy', todo: 5, doing: 1, done: 2, total: 8, hoursEstimated: 32, hoursActual: 15 },
  { name: 'Lan Anh', todo: 2, doing: 2, done: 3, total: 7, hoursEstimated: 28, hoursActual: 20 },
]
