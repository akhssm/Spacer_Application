import { blocks } from '@/data'

/**
 * Filters for the apartments list, kept in the URL (?block=C&bhk=3&facing=East&floor=5&sort=area-desc&q=c05)
 * so a filtered list can be shared. Unknown or invalid values are ignored, never guessed at.
 */

export const SORTS = [
  { id: 'id', label: 'Apartment number' },
  { id: 'area-asc', label: 'Area: smallest first' },
  { id: 'area-desc', label: 'Area: largest first' },
  { id: 'floor-desc', label: 'Floor: highest first' },
]

export const DEFAULT_FILTERS = { block: 'all', bhk: 'all', facing: 'all', floor: 'all', sort: 'id', q: '' }

const BLOCK_IDS = blocks.map((b) => b.id)
const MAX_FLOOR = Math.max(...blocks.map((b) => b.levels.value.residentialFloors))
export const FLOORS = Array.from({ length: MAX_FLOOR }, (_, i) => i + 1)

const oneOf = (value, allowed) => (allowed.includes(value) ? value : 'all')

export function parseFilters(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const block = params.get('block')?.toUpperCase()
  const floor = Number(params.get('floor'))
  const sort = params.get('sort')
  return {
    block: oneOf(block, BLOCK_IDS),
    bhk: oneOf(params.get('bhk'), ['2', '3']),
    facing: oneOf(params.get('facing'), ['East', 'West']),
    floor: FLOORS.includes(floor) ? String(floor) : 'all',
    sort: SORTS.some((s) => s.id === sort) ? sort : 'id',
    q: (params.get('q') ?? '').trim().slice(0, 20),
  }
}

/** The query string for a set of filters; defaults are left out so every state has one URL. */
export function filtersToSearch(filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== DEFAULT_FILTERS[key] && value !== '') params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

// "c-0509", "C0509", "c 509" all become "C0509" for matching against "C-0509"
const normalise = (text) => text.toUpperCase().replace(/[^A-Z0-9]/g, '')

export function filterApartments(apartments, filters) {
  const q = normalise(filters.q)
  return apartments.filter(
    (a) =>
      (filters.block === 'all' || a.blockId === filters.block) &&
      (filters.bhk === 'all' || a.bhk === Number(filters.bhk)) &&
      (filters.facing === 'all' || a.facing === filters.facing) &&
      (filters.floor === 'all' || a.level === Number(filters.floor)) &&
      (!q || normalise(a.id).includes(q)),
  )
}

const BY = {
  id: (a, b) => a.id.localeCompare(b.id),
  'area-asc': (a, b) => a.areaSft - b.areaSft || BY.id(a, b),
  'area-desc': (a, b) => b.areaSft - a.areaSft || BY.id(a, b),
  'floor-desc': (a, b) => b.level - a.level || BY.id(a, b),
}

export const sortApartments = (apartments, sort) => [...apartments].sort(BY[sort] ?? BY.id)

/** Filtered and sorted, in one go. */
export const visibleApartments = (apartments, filters) =>
  sortApartments(filterApartments(apartments, filters), filters.sort)
