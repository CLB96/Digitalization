import { useEffect, useState } from 'react'

export function useOrientation(): 'portrait' | 'landscape' {
  const getOrientation = () =>
    window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(getOrientation)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const handler = () => setOrientation(getOrientation())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return orientation
}
