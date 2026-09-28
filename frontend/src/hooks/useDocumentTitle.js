import { useEffect } from 'react'

/** Sets the browser tab title while the calling page is shown, and restores the previous one after. */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
