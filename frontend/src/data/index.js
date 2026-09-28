/**
 * Public entry point for all brochure-derived data.
 * Source of truth: docs/Latest_Broucher.pdf — rules in docs/DATA_DECISIONS.md.
 */
import { blocks } from '@/data/blocks'
import { dataExceptions } from '@/data/exceptions'
import { generateInventory } from '@/data/generate'
import { project } from '@/data/project'

export { blocks, dataExceptions, project }
export { brochureTypos } from '@/data/project'
export { brochureAssets } from '@/data/generated/brochureAssets'
export { apartmentId, floorId } from '@/data/generate'

const inventory = generateInventory(blocks)

export const floors = inventory.floors
export const apartments = inventory.apartments

const blockById = new Map(blocks.map((b) => [b.id, b]))
const floorById = new Map(floors.map((f) => [f.id, f]))
const apartmentById = new Map(apartments.map((a) => [a.id, a]))

export const isBlockId = (value) => blockById.has(value)
export const getBlock = (id) => blockById.get(id)
export const getFloor = (id) => floorById.get(id)
export const getApartment = (id) => apartmentById.get(id)
export const getFloorsForBlock = (blockId) => floors.filter((f) => f.blockId === blockId)
export const getApartmentsForFloor = (floor) => floor.apartmentIds.map((id) => apartmentById.get(id))

/** UI label for unknown commercial fields (availability/price). */
export const UNKNOWN_LABEL = 'Enquire'
