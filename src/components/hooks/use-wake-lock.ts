import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`. No-op where the Wake Lock API is
 * unavailable (e.g. most desktop browsers).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator.wakeLock === 'undefined') return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((value) => {
          if (cancelled) {
            value.release().catch(() => undefined)
          } else {
            sentinel = value
          }
        })
        .catch(() => undefined)
    }

    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      sentinel?.release().catch(() => undefined)
    }
  }, [active])
}
