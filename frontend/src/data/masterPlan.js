import { blocks } from '@/data/blocks'
import { masterPlanGeometry } from '@/data/generated/masterPlanGeometry'

/**
 * Joins brochure-derived tile geometry (p6) to the transcribed block templates.
 * A tile maps to a flat only through the stack's recorded master-plan label — so the
 * "12 A" tile resolves to flat 13 via exception "block-c-flat-13-label", never by guesswork.
 */
export function joinTiles(bs, geometry) {
  return bs.flatMap((b) =>
    geometry.blocks[b.id].tiles.flatMap((t) => {
      const stack = b.stacks.find((s) => s.masterPlan.label === t.label)
      return stack ? [{ blockId: b.id, flatNo: stack.flatNo, stack, rect: t.rect, label: t.label }] : []
    }),
  )
}

/** Returns problems joining geometry to data; must be empty. */
export function validateMasterPlanGeometry(bs, geometry) {
  const errors = []
  const { width, height } = geometry.image
  const inside = ([x, y, w, h]) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height

  for (const b of bs) {
    const tiles = geometry.blocks[b.id].tiles
    if (tiles.length !== b.stacks.length)
      errors.push(
        `Block ${b.id}: ${tiles.length} tiles on the master plan vs ${b.stacks.length} flats in the area statement.`,
      )
    for (const s of b.stacks) {
      const matches = tiles.filter((t) => t.label === s.masterPlan.label)
      if (matches.length !== 1)
        errors.push(`Block ${b.id} flat ${s.flatNo}: ${matches.length} tiles labelled "${s.masterPlan.label}".`)
      else if (matches[0].areaSft !== s.masterPlan.areaSft)
        errors.push(
          `Block ${b.id} flat ${s.flatNo}: tile prints ${matches[0].areaSft} sft, data says ${s.masterPlan.areaSft}.`,
        )
    }
    for (const t of tiles) {
      if (!b.stacks.some((s) => s.masterPlan.label === t.label))
        errors.push(`Block ${b.id}: tile "${t.label}" has no flat.`)
      if (!inside(t.rect)) errors.push(`Block ${b.id}: tile "${t.label}" lies outside the image.`)
      const [bx, by, bw, bh] = geometry.blocks[b.id].bounds
      const [x, y, w, h] = t.rect
      if (x < bx || y < by || x + w > bx + bw || y + h > by + bh)
        errors.push(`Block ${b.id}: tile "${t.label}" outside block bounds.`)
    }
  }
  if (!inside(geometry.clubhouse.rect)) errors.push('Clubhouse lies outside the image.')
  return errors
}

export const unitTiles = joinTiles(blocks, masterPlanGeometry)
export { masterPlanGeometry }

export const getTile = (blockId, flatNo) => unitTiles.find((t) => t.blockId === blockId && t.flatNo === flatNo)
