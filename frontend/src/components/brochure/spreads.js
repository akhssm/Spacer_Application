/**
 * How brochure pages pair up. The brochure is laid out as a book (checked page by page): the front
 * cover stands alone, pages 2–3 … 22–23 are designed as left/right spreads (4–5 and 20–21 share
 * one image across the spine), and the back cover stands alone.
 */

/** Desktop: [1], [2|3], [4|5] … and, when the page count is even, the last page alone on the left. */
export function desktopSpreads(pageCount) {
  if (pageCount < 1) return []
  const spreads = [{ right: 1 }]
  for (let left = 2; left <= pageCount; left += 2) {
    const right = left + 1
    spreads.push(right <= pageCount ? { left, right } : { left })
  }
  return spreads
}

/** Mobile: one page at a time, in order. */
export function mobileSequence(pageCount) {
  return Array.from({ length: Math.max(0, pageCount) }, (_, i) => i + 1)
}

export const spreadPages = (s) => [s.left, s.right].filter((p) => p !== undefined)

/** Index of the spread that shows a page (e.g. to keep the place when switching layouts). */
export function spreadIndexOf(spreads, page) {
  const i = spreads.findIndex((s) => s.left === page || s.right === page)
  return i === -1 ? 0 : i
}

/** "Front cover", "Pages 4–5 of 24", "Back cover". */
export function spreadLabel(s, pageCount) {
  if (s.right === 1 && s.left === undefined) return 'Front cover'
  if (s.left === pageCount && s.right === undefined) return 'Back cover'
  const pages = spreadPages(s)
  return pages.length === 2 ? `Pages ${pages[0]}–${pages[1]} of ${pageCount}` : `Page ${pages[0]} of ${pageCount}`
}

export function pageLabel(page, pageCount) {
  if (page === 1) return 'Front cover'
  if (page === pageCount) return 'Back cover'
  return `Page ${page} of ${pageCount}`
}

/** Clamp a navigation target to the available range. */
export const clampIndex = (index, length) => Math.min(Math.max(index, 0), Math.max(0, length - 1))
