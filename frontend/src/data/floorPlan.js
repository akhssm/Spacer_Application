import { blocks } from '@/data/blocks'
import { floorPlanGeometry } from '@/data/generated/floorPlanGeometry'

/**
 * Joins per-flat regions on each typical floor plan (p10–12) to the block templates, through the
 * stack's master-plan label — the same key the master-plan tiles use, so "12 A" → flat 13.
 */
export function joinFloorPlan(bs, geometry) {
  return bs.flatMap((b) =>
    (geometry[b.id]?.units ?? []).flatMap((u) => {
      const stack = b.stacks.find((s) => s.masterPlan.label === u.masterPlanLabel)
      return stack ? [{ blockId: b.id, flatNo: stack.flatNo, stack, rect: u.rect }] : []
    }),
  )
}

const overlap = (a, b) =>
  Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) *
  Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]))

/** Problems joining floor-plan geometry to the data; must be empty. */
export function validateFloorPlanGeometry(bs, geometry) {
  const errors = []
  for (const b of bs) {
    const g = geometry[b.id]
    if (!g) {
      errors.push(`Block ${b.id}: no floor-plan geometry.`)
      continue
    }
    if (g.assetId !== b.floorPlanAssetId)
      errors.push(`Block ${b.id}: geometry is for ${g.assetId}, block uses ${b.floorPlanAssetId}.`)
    if (g.page !== b.areaStatementSource.page)
      errors.push(`Block ${b.id}: geometry from p${g.page}, area statement on p${b.areaStatementSource.page}.`)
    if (g.units.length !== b.stacks.length)
      errors.push(
        `Block ${b.id}: ${g.units.length} flats on the floor plan vs ${b.stacks.length} in the area statement.`,
      )
    for (const s of b.stacks) {
      const n = g.units.filter((u) => u.masterPlanLabel === s.masterPlan.label).length
      if (n !== 1) errors.push(`Block ${b.id} flat ${s.flatNo}: ${n} floor-plan regions.`)
    }
    g.units.forEach((u, i) => {
      const [x, y, w, h] = u.rect
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > g.width || y + h > g.height)
        errors.push(`Block ${b.id} "${u.masterPlanLabel}": region outside the image.`)
      const inside = (p) => p[0] >= x - 60 && p[0] + p[2] <= x + w + 60 && p[1] >= y - 60 && p[1] + p[3] <= y + h + 60
      if (!inside(u.badge) || !inside(u.tag))
        errors.push(`Block ${b.id} "${u.masterPlanLabel}": printed badge/tag not inside its region.`)
      g.units.slice(i + 1).forEach((v) => {
        if (overlap(u.rect, v.rect) > 0.02 * w * h)
          errors.push(`Block ${b.id}: regions "${u.masterPlanLabel}" and "${v.masterPlanLabel}" overlap.`)
      })
    })
  }
  return errors
}

export const floorPlanFlats = joinFloorPlan(blocks, floorPlanGeometry)
export { floorPlanGeometry }

export const getFloorPlanFlat = (blockId, flatNo) =>
  floorPlanFlats.find((f) => f.blockId === blockId && f.flatNo === flatNo)

const CROP_PAD = 16

/** The crop FlatPlanCrop shows for a flat, [x, y, width, height] in floor-plan image pixels (its SVG viewBox). */
export function flatCropBox(blockId, flatNo) {
  const f = getFloorPlanFlat(blockId, flatNo)
  if (!f) return undefined
  const [x, y, w, h] = f.rect
  return [x - CROP_PAD, y - CROP_PAD, w + CROP_PAD * 2, h + CROP_PAD * 2]
}
