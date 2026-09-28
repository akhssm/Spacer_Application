// Turns room sizes as printed on the plan, such as 14'11" × 10'6", into numbers,
// and lines up the rooms of several flats so they can be compared row by row.

import { getRooms, roomDisplayName } from '@/data/rooms'

// "14'11\"" -> 14.92 feet; "10'" -> 10; "4'6\" wide" -> 4.5
export function parseFeet(text) {
  const match = /(\d+)\s*'\s*(\d+)?\s*"?/.exec(text)
  if (!match) return null
  return Number(match[1]) + (match[2] ? Number(match[2]) / 12 : 0)
}

// "14'11\" × 10'6\"" -> { width, depth, sqft }. Sizes like "4'6\" wide" give only a width.
export function parseSize(text) {
  const parts = text.split(/\s*[×xX]\s*/)
  const width = parseFeet(parts[0])
  const depth = parts.length > 1 ? parseFeet(parts[1]) : null
  if (width == null) return null
  return { width, depth, sqft: depth != null ? Math.round(width * depth) : null }
}

// Rooms of the same name get numbered so "Bedroom", "Bedroom" become "Bedroom 1", "Bedroom 2".
// Returns rows in the order rooms first appear, each with one entry per flat (or null).
export function alignRooms(flats) {
  const rows = new Map() // key -> { label, cells: [] }

  flats.forEach((flat, column) => {
    const seen = {}
    ;(flat.rooms ?? []).forEach((room) => {
      seen[room.name] = (seen[room.name] ?? 0) + 1
      const key = `${room.name}#${seen[room.name]}`
      if (!rows.has(key))
        rows.set(key, { name: room.name, index: seen[room.name], cells: Array(flats.length).fill(null) })
      rows.get(key).cells[column] = { size: room.size, ...parseSize(room.size) }
    })
  })

  // Number a room only when some flat has more than one of it
  const maxIndex = {}
  rows.forEach((row) => {
    maxIndex[row.name] = Math.max(maxIndex[row.name] ?? 0, row.index)
  })
  return [...rows.values()].map((row) => ({
    ...row,
    label: maxIndex[row.name] > 1 ? `${row.name} ${row.index}` : row.name,
  }))
}

// "LIVING" -> "Living", "M.BEDROOM" -> "Master bedroom"
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase()

// A room as printed on the IRA Towers plan ({ name, dims }), in the { name, size } shape used for
// display and comparison. Balconies and wash areas print a width only ("4'6\" WIDE BALCONY"),
// which becomes { name: 'Balcony', size: "4'6\" wide" }.
export function displayRoom({ name, dims }) {
  if (dims) return { name: sentenceCase(roomDisplayName(name)), size: dims.replace(/\s*[xX]\s*/, ' × ') }
  const widthOnly = /^(.+?)\s+WIDE\s+(.+)$/.exec(name)
  if (widthOnly) return { name: sentenceCase(widthOnly[2]), size: `${widthOnly[1]} wide` }
  return { name: sentenceCase(name), size: '' }
}

/** Every room of one IRA Towers flat, as printed on its typical floor plan, ready to display. */
export const displayRooms = (blockId, flatNo) => getRooms(blockId, flatNo).map(displayRoom)
