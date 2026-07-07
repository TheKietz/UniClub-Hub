import { useEffect, useState } from 'react'

/**
 * Theo dõi một media query và trả về true/false khi trạng thái khớp thay đổi.
 * An toàn khi chạy phía server (matchMedia không tồn tại → mặc định false).
 *
 * const isMobile = useMediaQuery('(max-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Điện thoại / màn hình hẹp (≤ 768px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}
