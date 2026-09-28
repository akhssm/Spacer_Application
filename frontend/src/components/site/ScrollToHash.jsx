import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Scrolls to `#section` targets after navigation; ScrollRestoration handles everything else. */
export function ScrollToHash() {
  const { hash, key } = useLocation()

  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    target?.scrollIntoView({ block: 'start' })
  }, [hash, key])

  return null
}
