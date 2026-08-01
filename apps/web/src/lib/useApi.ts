import { useCallback, useEffect, useState } from 'react'

export function useApi<T>(loader: () => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    loader()
      .then((result) => current && setData(result))
      .catch((reason: unknown) => current && setError(reason instanceof Error ? reason.message : 'Error inesperado'))
      .finally(() => current && setLoading(false))
    return () => { current = false }
    // The caller controls when its loader is invalidated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, attempt])

  return { data, error, loading, reload }
}
