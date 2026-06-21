import { useCallback, useEffect, useState } from 'react'

/**
 * Đếm ngược cooldown cho nút "gửi lại" (email xác thực, OTP...).
 * Gọi start(seconds) sau khi gửi thành công; trong lúc active thì khoá nút.
 */
export function useResendCooldown(defaultSeconds = 60) {
  const [seconds, setSeconds] = useState(0)

  const start = useCallback((duration = defaultSeconds) => setSeconds(duration), [defaultSeconds])

  useEffect(() => {
    if (seconds <= 0) return
    // setState nằm trong setTimeout callback (không phải đồng bộ trong effect) → an toàn
    const t = window.setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [seconds])

  return { seconds, active: seconds > 0, start }
}
