import { getRooms } from '@/data/rooms'

/**
 * Flat plan types and their measurements, for the location map.
 *
 * Plan types group the flats that print IDENTICAL room labels, BHK, facing and sale area on the
 * typical floor plans (brochure p10–12). Visually similar flats with any differing printed value are
 * their own type. Room data is NOT copied here — it is read from `@/data/rooms`.
 *
 * Overall flat width / depth are NOT published anywhere in the brochure (checked page by page at
 * native resolution). They stay `null` until official values are supplied; the map draws no edge
 * dimensions while they are unavailable. Never fill them with estimates.
 */

/** Official overall dimensions for one plan type — every field null until supplied with a source. */
const UNAVAILABLE = { width: null, depth: null, unit: null, basis: null, balconyIncluded: null, source: null }

const type = (id, blockId, flatNos, note) => ({
  id,
  blockId,
  flatNos,
  overall: UNAVAILABLE,
  ...(note ? { note } : {}),
})

export const PLAN_TYPES = [
  type('A1', 'A', [3, 4, 5, 6]),
  type('A2', 'A', [2]),
  type('A3', 'A', [1]),
  type('A4', 'A', [7, 8]),
  type('A5', 'A', [9], 'Looks like A4, but prints a different toilet, master bedroom and dining size.'),
  type('A6', 'A', [10]),
  type('A7', 'A', [11]),
  type('B1', 'B', [1, 2, 3, 4, 5]),
  type('B2', 'B', [6]),
  type('B3', 'B', [7]),
  type('B4', 'B', [8, 10, 11]),
  type('B5', 'B', [9], 'Looks like B4, but prints the master bedroom as 13\'1"X10\'9".'),
  type(
    'C1',
    'C',
    [1, 2, 3, 4, 5, 6, 7, 8],
    "C-08 prints its bedrooms as …X11'0\" where the others print …X11' (same value).",
  ),
  type('C2', 'C', [9, 10, 11, 12]),
  type(
    'C2*',
    'C',
    [13],
    'Printed "12 A" on the master plan; its Drawing room prints 14\'1"X11"3" (typo kept as printed).',
  ),
  type('C3', 'C', [14]),
]

export const getPlanType = (blockId, flatNo) =>
  PLAN_TYPES.find((t) => t.blockId === blockId && t.flatNos.includes(flatNo))

export const hasOverallDimensions = (t) => t.overall.width !== null && t.overall.depth !== null

const WIDTH_LABEL = /^(\d+'(?:\d+")?)\s+(?:WIDE\s+)?(WASH\/BALCONY|BALCONY|WASH)$/

/** Balcony and wash widths printed on the flat, read from the existing room transcription. */
export function publishedWidths(blockId, flatNo) {
  return getRooms(blockId, flatNo).flatMap((r) => {
    const m = WIDTH_LABEL.exec(r.name)
    if (!m) return []
    const kind = m[2] === 'WASH/BALCONY' ? 'Wash / balcony' : m[2] === 'BALCONY' ? 'Balcony' : 'Wash'
    return [{ kind, width: m[1], printed: r.name }]
  })
}
