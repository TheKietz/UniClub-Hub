import { useEffect, type DependencyList } from 'react'

export type DeferredEffectFn = (isCancelled: () => boolean) => void | Promise<void>

export interface UseDeferredEffectOptions {
  /** Skip running the effect when false (default: true). */
  enabled?: boolean
}

/**
 * Like useEffect, but defers the body until after a microtask so synchronous
 * setState calls don't trigger react-hooks/set-state-in-effect.
 * Provides isCancelled() for safe async cleanup.
 */
export function useDeferredEffect(
  effect: DeferredEffectFn,
  deps: DependencyList,
  options?: UseDeferredEffectOptions,
): void {
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const isCancelled = () => cancelled

    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await effect(isCancelled)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps list
  }, [enabled, ...(deps as unknown[])])
}
