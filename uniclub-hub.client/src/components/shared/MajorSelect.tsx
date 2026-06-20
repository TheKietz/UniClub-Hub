import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { UEF_MAJORS } from '@/lib/majors'

interface Props {
  value: string
  onChange: (val: string) => void
  onBlur?: () => void
  error?: boolean
  id?: string
}

export default function MajorSelect({ value, onChange, onBlur, error, id }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!searching) setQuery(value)
  }, [value, searching])

  const filtered = searching && query.trim()
    ? UEF_MAJORS.filter(m => m.toLowerCase().includes(query.toLowerCase()))
    : [...UEF_MAJORS]

  function handleInputChange(e: { target: { value: string } }) {
    const val = e.target.value
    setQuery(val)
    setSearching(true)
    onChange('')
    setOpen(true)
  }

  function handleSelect(major: string) {
    onChange(major)
    setQuery(major)
    setSearching(false)
    setOpen(false)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      if ((UEF_MAJORS as readonly string[]).includes(query)) {
        onChange(query)
      } else {
        setQuery('')
        onChange('')
      }
      setSearching(false)
      onBlur?.()
    }, 150)
  }

  const borderCls = error ? 'border-red-400' : 'border-input'

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setQuery(value)
          setSearching(false)
          setOpen(true)
        }}
        onBlur={handleBlur}
        placeholder="Nhập để tìm ngành..."
        autoComplete="off"
        className={`w-full rounded-md border ${borderCls} bg-white px-3 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none`}
        style={{ height: '42px' }}
      />
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-0 bg-transparent border-none cursor-pointer"
      >
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(m => (
            <button
              key={m}
              type="button"
              onMouseDown={() => handleSelect(m)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                value === m
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {m}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy ngành phù hợp.</p>
          )}
        </div>
      )}
    </div>
  )
}
