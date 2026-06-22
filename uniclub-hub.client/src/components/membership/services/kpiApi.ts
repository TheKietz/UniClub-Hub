import api from '@/lib/axiosInstance'

export type KpiMetricKey =
  | 'TaskCompletion'
  | 'OnTimeCompletion'
  | 'AvgProgress'
  | 'ContributionPoints'
  | 'Workload'

export interface KpiCriteria {
  id: number
  metricKey: KpiMetricKey
  displayName: string
  description?: string | null
  weight: number
  isEnabled: boolean
}

export interface KpiConfig {
  id: number
  clubId: number
  totalWeight: number
  updatedAt?: string | null
  updatedBy?: string | null
  criteria: KpiCriteria[]
  grades: KpiGrade[]
}

export interface UpdateKpiCriteria {
  metricKey: KpiMetricKey
  displayName: string
  description?: string | null
  weight: number
  isEnabled: boolean
}

export interface KpiGrade {
  id: number
  label: string
  minScore: number
  color?: string | null
  displayOrder: number
}

export interface UpdateKpiGrade {
  label: string
  minScore: number
  color?: string | null
}

export interface KpiMetricScore {
  metricKey: KpiMetricKey
  displayName: string
  weight: number
  rawScore: number
  weightedScore: number
  detail: string
}

export interface MemberKpiResult {
  membershipId: number
  userId: string
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  departmentId?: number | null
  departmentName?: string | null
  clubRole: string
  totalScore: number
  grade: string
  gradeColor?: string | null
  rank: number
  metrics: KpiMetricScore[]
}

export interface KpiResults {
  clubId: number
  departmentId?: number | null
  fromDate: string
  toDate: string
  totalMembers: number
  averageScore: number
  members: MemberKpiResult[]
}

type ApiResponse<T> = { data: T; success: boolean; message: string }

export const getKpiConfig = (clubId: number) =>
  api.get<ApiResponse<KpiConfig>>(`/clubs/${clubId}/kpi/config`).then(r => r.data.data)

export const updateKpiCriteria = (clubId: number, criteria: UpdateKpiCriteria[]) =>
  api.put<ApiResponse<KpiConfig>>(`/clubs/${clubId}/kpi/config/criteria`, criteria).then(r => r.data.data)

export const toggleKpiCriteria = (clubId: number, metricKey: KpiMetricKey, isEnabled: boolean) =>
  api.patch<ApiResponse<KpiConfig>>(`/clubs/${clubId}/kpi/config/criteria/${metricKey}`, { isEnabled }).then(r => r.data.data)

export const updateKpiGrades = (clubId: number, grades: UpdateKpiGrade[]) =>
  api.put<ApiResponse<KpiConfig>>(`/clubs/${clubId}/kpi/config/grades`, { grades }).then(r => r.data.data)

export const getKpiResults = (
  clubId: number,
  params?: { departmentId?: number; fromDate?: string; toDate?: string }
) =>
  api.get<ApiResponse<KpiResults>>(`/clubs/${clubId}/kpi/results`, { params }).then(r => r.data.data)

export const getMyKpiResult = (
  clubId: number,
  params?: { fromDate?: string; toDate?: string }
) =>
  api.get<ApiResponse<MemberKpiResult>>(`/clubs/${clubId}/kpi/results/me`, { params }).then(r => r.data.data)
