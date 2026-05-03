import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDepartments } from '@/lib/clubApi'
import type { DepartmentItem } from '@/types/club'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Info } from 'lucide-react'

export default function DepartmentsPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) return
    getDepartments(Number(clubId))
      .then(setDepartments)
      .catch(() => toast.error('Không thể tải danh sách ban.'))
      .finally(() => setLoading(false))
  }, [clubId])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ban bộ phận</h1>
        <p className="text-gray-500 mt-1">Cơ cấu tổ chức của câu lạc bộ</p>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Việc tạo và chỉnh sửa ban bộ phận do quản trị viên hệ thống thực hiện. Liên hệ admin để thay đổi cơ cấu tổ chức.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên ban</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số thành viên</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-12">Đang tải...</TableCell></TableRow>
            ) : departments.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-12">Chưa có ban bộ phận nào.</TableCell></TableRow>
            ) : departments.map(dept => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="text-gray-500">{dept.description ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{dept.memberCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
