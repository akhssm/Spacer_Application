import { parseMapSearch } from '@/components/explore/map/mapUrl'

/**
 * Free-text apartment search for the map. Understands, case-insensitively:
 *   "C-0509", "c0509", "C 509"  → apartment (provisional ID: floor 05, flat 09)
 *   "C-09", "C9", "c 9"         → flat 09 of Block C (floor not chosen)
 *   "Block C", "C"              → Block C
 * Every result is validated by the same rules as the URL (mapUrl.js), so a search can never
 * select a block, flat or floor that does not exist.
 */
export function searchSelection(query) {
  const q = query
    .trim()
    .toUpperCase()
    .replace(/^BLOCK\s*/, '')
  const m = /^([A-Z])\s*[-\s]?\s*(\d{1,4})$/.exec(q)
  if (m) {
    const [, block, digits] = m
    // 3–4 digits: floor + two-digit flat (the provisional ID); 1–2 digits: flat number.
    const params =
      digits.length >= 3
        ? { block, flat: String(Number(digits.slice(-2))), floor: String(Number(digits.slice(0, -2))) }
        : { block, flat: String(Number(digits)) }
    return parseMapSearch(new URLSearchParams(params))
  }
  if (/^[A-Z]$/.test(q)) return parseMapSearch(new URLSearchParams({ block: q }))
  return undefined
}
