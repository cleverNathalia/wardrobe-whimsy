import { useCallback, useEffect, useState } from 'react'

interface Remote<T> {
  data: T | null
  error: Error | null
  /** The first load, before there is anything to show. */
  loading: boolean
  /** A pull-to-refresh in progress, while the old data stays on screen. */
  refreshing: boolean
  refresh: () => Promise<void>
}

const toError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)))

/**
 * Loads data once on mount and again on refresh(). Deliberately small: enough
 * for read-only screens. If screens start sharing or mutating data, this is
 * the point to bring in a proper cache such as TanStack Query.
 */
export function useRemote<T>(load: () => Promise<T>): Remote<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // State is only set in the promise's callbacks, never synchronously in the
  // effect, and not at all once the screen has gone.
  useEffect(() => {
    let live = true
    load().then(
      (value) => {
        if (!live) return
        setData(value)
        setError(null)
        setLoading(false)
      },
      (err: unknown) => {
        if (!live) return
        setError(toError(err))
        setLoading(false)
      }
    )
    return () => {
      live = false
    }
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setData(await load())
      setError(null)
    } catch (err) {
      setError(toError(err))
    } finally {
      setRefreshing(false)
    }
  }, [load])

  return { data, error, loading, refreshing, refresh }
}
