import { getApartment, getBlock, getFloor, floorId } from '@/data'
import { paths } from '@/routes/paths'

/**
 * Resolves /explore/:blockId/:floor/:apartmentId against the brochure data.
 * Pure — no routing side effects — so every deep-link rule is unit-tested.
 */
export function resolveExplore(params) {
  const { blockId, floor, apartmentId } = params
  if (!blockId) return { kind: 'ok' }

  const block = getBlock(blockId.toUpperCase())
  if (!block) return { kind: 'fallback', to: paths.explore(), message: `Block "${blockId}" is not part of IRA Towers.` }
  if (block.id !== blockId)
    return { kind: 'canonical', to: paths.explore({ blockId: block.id, ...rest(floor, apartmentId) }) }

  if (floor === undefined) return { kind: 'ok', block }

  const level = /^\d{1,2}$/.test(floor) ? Number(floor) : NaN
  const f = Number.isFinite(level) ? getFloor(floorId(block.id, level)) : undefined
  if (!f)
    return {
      kind: 'fallback',
      to: paths.explore({ blockId: block.id }),
      message: `Floor "${floor}" does not exist in ${block.name} (floors 01–${String(block.levels.value.residentialFloors).padStart(2, '0')}).`,
    }
  if (floor !== String(level).padStart(2, '0'))
    return {
      kind: 'canonical',
      to: paths.explore({ blockId: block.id, floor: level, apartmentId: apartmentId?.toUpperCase() }),
    }

  if (apartmentId === undefined) return { kind: 'ok', block, floor: f }

  const apartment = getApartment(apartmentId.toUpperCase())
  if (!apartment)
    return {
      kind: 'fallback',
      to: paths.explore({ blockId: block.id, floor: level }),
      message: `Apartment "${apartmentId}" was not found on ${block.name}, floor ${floor}.`,
    }
  // A real apartment reached via the wrong block/floor segment: send it to its own URL.
  if (apartment.id !== apartmentId || apartment.blockId !== block.id || apartment.level !== level)
    return {
      kind: 'canonical',
      to: paths.explore({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id }),
    }

  return { kind: 'ok', block, floor: f, apartment }
}

function rest(floor, apartmentId) {
  const level = floor && /^\d{1,2}$/.test(floor) ? Number(floor) : undefined
  return level === undefined ? {} : { floor: level, apartmentId: apartmentId?.toUpperCase() }
}
