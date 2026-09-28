/**
 * Presentation summaries derived purely from the transcribed block templates — nothing here is
 * typed by hand, so it can never drift from the area statements (p10–12).
 */

const range = (values) => [Math.min(...values), Math.max(...values)]
const unique = (values) => [...new Set(values)]

export function summariseBlocks(blocks) {
  return blocks.map((b) => ({
    id: b.id,
    name: b.name,
    declaredUnits: b.declaredUnits.value,
    flatsPerTypicalFloor: b.stacks.length,
    residentialFloors: b.levels.value.residentialFloors,
    bhk: unique(b.stacks.map((s) => s.bhk)).sort(),
    sizeRangeSft: range(b.stacks.map((s) => s.areaSft)),
    facings: unique(b.stacks.map((s) => s.facing)).sort(),
  }))
}

export function summariseConfigurations(blocks) {
  const stacks = blocks.flatMap((b) => b.stacks.map((s) => ({ ...s, blockId: b.id })))
  return unique(stacks.map((s) => s.bhk))
    .sort()
    .map((bhk) => {
      const matching = stacks.filter((s) => s.bhk === bhk)
      return {
        bhk,
        sizeRangeSft: range(matching.map((s) => s.areaSft)),
        blocks: unique(matching.map((s) => s.blockId)),
      }
    })
}

export const formatSft = (n) => n.toLocaleString('en-IN')
export const formatRange = ([min, max]) => (min === max ? formatSft(min) : `${formatSft(min)}–${formatSft(max)}`)
