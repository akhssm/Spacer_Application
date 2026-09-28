/**
 * Shapes traced BY HAND from the published master-plan render (brochure p6,
 * `public/assets/brochure/plan/master-plan-2038.webp`, 2038 × 3428 px — the same pixel space as
 * `masterPlanGeometry`). The brochure's site drawing is a single raster, so there is no vector
 * boundary to extract. Accuracy is roughly ±10–20 px (±0.5–1 m on the ground), before the much
 * larger uncertainty of the indicative georeferencing in `georef.js`.
 *
 * Block and clubhouse footprints are NOT traced here — they come from `masterPlanGeometry`.
 */

/**
 * Compound wall (inner green line), clockwise from the north-west corner. The north lawn edge and
 * the rounded north-east corner are soft in the render, so those vertices are approximate.
 * Enclosed area: 4,803,100 px² — the basis of the map scale (see `METRES_PER_PIXEL`).
 */
export const SITE_OUTLINE_PX = [
  [195, 275],
  [760, 200],
  [1700, 70],
  [1790, 120],
  [1960, 500],
  [1850, 1000],
  [1790, 1500],
  [1740, 2000],
  [1680, 2400],
  [1615, 2800],
  [1570, 2900],
  [1540, 3190],
  [1100, 3230],
  [200, 3300],
]

/** Entry gate with the security post (the red square) on the south wall. */
export const ENTRANCE_GATE_PX = [1295, 3200]

/** Landscaped lawns: the north lawn strip and the east lawn, down to where the paving begins. */
export const LAWNS_PX = [
  [760, 250],
  [760, 200],
  [1700, 70],
  [1790, 120],
  [1960, 500],
  [1850, 1000],
  [1795, 1405],
  [1745, 1405],
  [1745, 250],
]

/** Children's play area: the oval play surface on the east lawn. */
export const PLAY_AREA_PX = { centre: [1822, 810], radiusX: 67, radiusY: 108 }

/** Swimming pool drawn inside the clubhouse footprint. */
export const POOL_PX = [1075, 2900, 200, 140]

/** Signed area in px² (positive when clockwise in image space, where y points down). */
export function planPolygonArea(points) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** Polygon approximation of an axis-aligned ellipse (for the play area). */
export function planEllipse({ centre: [cx, cy], radiusX, radiusY }, segments = 32) {
  return Array.from({ length: segments }, (_, i) => {
    const t = (i / segments) * 2 * Math.PI
    return [cx + radiusX * Math.cos(t), cy + radiusY * Math.sin(t)]
  })
}
