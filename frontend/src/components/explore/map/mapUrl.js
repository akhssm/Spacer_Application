import { blocks } from '@/data'
import { paths } from '@/routes/paths'

/**
 * The map selection in the URL: /ira-towers/explore/map?block=C&flat=9&floor=5 (block, block + flat, or
 * block + flat + floor). Only blocks, flats and floors are encoded; clubhouse and amenity
 * selections are transient. Anything invalid falls back to no selection.
 */

export const MAP_PATH = paths.map()

// Up to three digits; leading zeros are fine ("09" = 9, as the site displays flat numbers).
// Zero itself is never a valid flat or floor. Canonical URLs are written unpadded.
const INT = /^\d{1,3}$/
const positive = (value) => (INT.test(value) && Number(value) > 0 ? Number(value) : undefined)

export function parseMapSearch(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const blockParam = params.get('block')
  const flatParam = params.get('flat')
  const floorParam = params.get('floor')
  if (blockParam === null) return undefined
  const block = blocks.find((b) => b.id === blockParam.toUpperCase())
  if (!block) return undefined
  if (flatParam === null) return floorParam === null ? { kind: 'block', blockId: block.id } : undefined
  const flatNo = positive(flatParam)
  if (flatNo === undefined || !block.stacks.some((s) => s.flatNo === flatNo)) return undefined
  if (floorParam === null) return { kind: 'flat', blockId: block.id, flatNo }
  const level = positive(floorParam)
  if (level === undefined || level > block.levels.value.residentialFloors) return undefined
  return { kind: 'flat', blockId: block.id, flatNo, level }
}

/** "" or "?block=C&flat=9&floor=5" — the canonical query for a selection. */
export function mapSearch(selection) {
  if (selection?.kind !== 'block' && selection?.kind !== 'flat') return ''
  const params = [['block', selection.blockId]]
  if (selection.kind === 'flat') {
    params.push(['flat', String(selection.flatNo)])
    if (selection.level !== undefined) params.push(['floor', String(selection.level)])
  }
  return `?${new URLSearchParams(params).toString()}`
}

export const mapHref = (selection) => `${MAP_PATH}${mapSearch(selection)}`
