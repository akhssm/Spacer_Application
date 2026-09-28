const pad2 = (n) => String(n).padStart(2, '0')

/** Provisional floor ID, e.g. "A-01". */
export const floorId = (blockId, level) => `${blockId}-${pad2(level)}`

/** Provisional apartment ID `{Block}-{FF}{SS}`, e.g. "A-0101" (docs/DATA_DECISIONS.md). */
export const apartmentId = (blockId, level, flatNo) => `${blockId}-${pad2(level)}${pad2(flatNo)}`

export const APARTMENT_ID_PATTERN = /^[ABC]-\d{2}\d{2}$/

/**
 * Expands one block's typical-floor template across its residential floors.
 * Only what the floor plan supports is generated — declared counts are never padded
 * (see exception "block-c-unit-count").
 */
export function generateBlockInventory(block) {
  const floors = []
  const apartments = []

  for (let level = 1; level <= block.levels.value.residentialFloors; level++) {
    const fid = floorId(block.id, level)
    const ids = []

    for (const stack of block.stacks) {
      const id = apartmentId(block.id, level, stack.flatNo)
      ids.push(id)
      apartments.push({
        id,
        idIsProvisional: true,
        blockId: block.id,
        floorId: fid,
        level,
        flatNo: stack.flatNo,
        bhk: stack.bhk,
        facing: stack.facing,
        areaSft: stack.areaSft,
        availability: 'unknown',
        price: 'unknown',
        ...(stack.exceptions ? { exceptions: stack.exceptions } : {}),
      })
    }

    floors.push({ id: fid, blockId: block.id, level, apartmentIds: ids })
  }

  return { floors, apartments }
}

export function generateInventory(blocks) {
  const parts = blocks.map(generateBlockInventory)
  return {
    floors: parts.flatMap((p) => p.floors),
    apartments: parts.flatMap((p) => p.apartments),
  }
}
