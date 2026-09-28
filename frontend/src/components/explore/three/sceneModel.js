import { apartmentId, blocks } from '@/data'
import { masterPlanGeometry, unitTiles } from '@/data/masterPlan'

/**
 * Schematic 3D model derived ONLY from brochure-backed data:
 *  - footprints: master-plan tile / block / clubhouse rectangles (p6, via masterPlanGeometry)
 *  - storey count: "C+S+10" (p3) → 1 stilt level + 10 residential floors per block
 *  - flats per floor: the typical-floor area statements (p10–12) → the generated apartments
 *
 * The brochure gives NO drawing scale and NO storey height. Plan units are therefore
 * master-plan pixels scaled by PX (unitless), and every storey uses the same schematic height
 * SCHEMATIC_STOREY. These are presentation constants, not dimensions of the building.
 */
export const PX = 1 / 100
export const SCHEMATIC_STOREY = 0.42
/** Visual gap between stacked slabs so floors read as separate. */
export const SLAB_GAP = 0.06

const { width: W, height: H } = masterPlanGeometry.image
export const GROUND = { width: W * PX, depth: H * PX }

/** Master-plan pixel → world (x, z); image centre is the origin, +z is "down" the plan (south). */
export const toWorld = (px, py) => [px * PX - GROUND.width / 2, py * PX - GROUND.depth / 2]

const rectBox = ([x, y, w, h], bottom, height, inset = 0) => {
  const [cx, cz] = toWorld(x + w / 2, y + h / 2)
  return { x: cx, z: cz, y: bottom + height / 2, w: w * PX - inset, d: h * PX - inset, h: height }
}

/** Bottom of residential floor `level` (1-based); the stilt occupies storey 0. */
export const floorBottom = (level) => level * SCHEMATIC_STOREY
export const floorCentreY = (level) => floorBottom(level) + (SCHEMATIC_STOREY - SLAB_GAP) / 2

export function buildScene() {
  const models = blocks.map((b) => {
    const floors = b.levels.value.residentialFloors
    const tiles = unitTiles.filter((t) => t.blockId === b.id)
    const units = []
    for (let level = 1; level <= floors; level++) {
      for (const t of tiles) {
        units.push({
          ...rectBox(t.rect, floorBottom(level), SCHEMATIC_STOREY - SLAB_GAP, 0.04),
          apartmentId: apartmentId(b.id, level, t.flatNo),
          blockId: b.id,
          level,
          flatNo: t.flatNo,
          bhk: t.stack.bhk,
        })
      }
    }
    const top = floorBottom(floors + 1)
    const [bx, by, bw, bh] = masterPlanGeometry.blocks[b.id].bounds
    const [lx, lz] = toWorld(bx + bw / 2, by)
    return {
      id: b.id,
      residentialFloors: floors,
      bounds: rectBox([bx, by, bw, bh], 0, top),
      // Stilt: same footprints, drawn as low translucent outlines — the brochure lists no flats on it.
      stilt: tiles.map((t) => rectBox(t.rect, 0, SCHEMATIC_STOREY - SLAB_GAP, 0.04)),
      units,
      labelAt: [lx, top + 0.5, lz],
    }
  })

  // Clubhouse: footprint only. The brochure shows its plan (p6) and renders, but no storey count.
  const clubhouse = rectBox(masterPlanGeometry.clubhouse.rect, 0, 0.08)
  return { blocks: models, clubhouse }
}
