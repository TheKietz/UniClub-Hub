import { Plus } from 'lucide-react'

interface AddSprintCardProps {
  onClick: () => void
}

export default function AddSprintCard({ onClick }: AddSprintCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-3 
        min-h-[220px] bg-white/60 hover:bg-white
        border-2 border-dashed border-gray-200 hover:border-indigo-300
        rounded-2xl transition-all duration-300 cursor-pointer
        hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
        <Plus size={24} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
        Thêm Sprint mới
      </span>
    </button>
  )
}
