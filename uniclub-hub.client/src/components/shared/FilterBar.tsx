import { Search, Filter, ChevronDown } from 'lucide-react'
import { FilterSelect } from '@/components/shared/FilterSelect'

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  statusOptions: Array<{ key: string; label: string }>
  activeStatus: string
  onStatusChange: (status: string) => void
  sortLabel?: string
  onSortChange?: () => void
  departmentOptions?: Array<{ id: number; name: string }>
  selectedDepartment?: number | null
  onDepartmentChange?: (id: number | null) => void
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  statusOptions,
  activeStatus,
  onStatusChange,
  sortLabel,
  onSortChange,
  departmentOptions,
  selectedDepartment,
  onDepartmentChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          id="filter-search"
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
            transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Department selector */}
      {departmentOptions && onDepartmentChange && (
        <FilterSelect
          value={selectedDepartment?.toString() ?? ''}
          onChange={(value) => onDepartmentChange(value ? Number(value) : null)}
          options={[
            { value: '', label: 'Tất cả ban' },
            ...departmentOptions.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
          style={{ width: 180 }}
        />
      )}

      {/* Status pills */}
      <div className="flex gap-1.5 flex-wrap">
        {statusOptions.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStatusChange(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              activeStatus === key
                ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort */}
      {sortLabel && onSortChange && (
        <button
          type="button"
          onClick={onSortChange}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors ml-auto"
        >
          <Filter size={13} />
          {sortLabel}
          <ChevronDown size={13} />
        </button>
      )}
    </div>
  )
}
