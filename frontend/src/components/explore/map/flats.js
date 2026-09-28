import { unitTiles } from '@/data/masterPlan'
import { planRectToRing, planToLngLat } from '@/components/explore/map/georef'

/**
 * Flat positions on the location map: the 36 unit tiles of the brochure master plan (p6), one per
 * flat number per block, joined to the area statements by `unitTiles`. Each tile stands for the same
 * flat on every typical floor (a "stack"). The tiles are the drawing's schematic flat blocks — they
 * show position, not measured flat outlines, so nothing is ever measured off them.
 */

export const flatKey = (blockId, flatNo) => `flat-${blockId}-${flatNo}`

const props = (t) => ({
  key: flatKey(t.blockId, t.flatNo),
  blockId: t.blockId,
  flatNo: t.flatNo,
  label: t.label,
  bhk: t.stack.bhk,
  facing: t.stack.facing,
  areaSft: t.stack.areaSft,
})

/** Counter-clockwise (RFC 7946) polygons — `planRectToRing` already winds them that way. */
export function buildFlats() {
  return {
    type: 'FeatureCollection',
    features: unitTiles.map((t) => ({
      type: 'Feature',
      properties: props(t),
      geometry: { type: 'Polygon', coordinates: [planRectToRing(t.rect)] },
    })),
  }
}

export function buildFlatLabels() {
  return unitTiles.map((t) => {
    const [x, y, w, h] = t.rect
    return { ...props(t), lngLat: planToLngLat([x + w / 2, y + h / 2]) }
  })
}

/** [[west, south], [east, north]] of one flat tile. */
export function flatBounds(blockId, flatNo) {
  const tile = unitTiles.find((t) => t.blockId === blockId && t.flatNo === flatNo)
  if (!tile) throw new Error(`No master-plan tile for Block ${blockId} flat ${flatNo}.`)
  const ring = planRectToRing(tile.rect)
  const lngs = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}
