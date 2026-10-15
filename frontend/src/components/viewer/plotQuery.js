// The Query tool: pick flats by BHK, facing, size and availability, as a plot map's query does.

import { SIZE_TIERS } from '@/components/viewer/layoutGeoJson'

export const EMPTY_QUERY = { bhk: [], facing: [], size: [], availableOnly: false }

export const isQueryEmpty = (query) =>
  !query.bhk.length && !query.facing.length && !query.size.length && !query.availableOnly

const sizeTier = (areaSqFt) => SIZE_TIERS.findIndex((tier) => (areaSqFt ?? 0) <= tier.max)

// The choices each filter offers, from the flats the project actually has
export function queryOptions(plots) {
  const flats = plots.filter((plot) => plot.kind !== 'amenity')
  const distinct = (key) => [...new Set(flats.map((plot) => plot[key]).filter(Boolean))].sort()
  const tiers = new Set(flats.map((plot) => sizeTier(plot.areaSqFt)))
  return {
    bhk: distinct('bhk'),
    facing: distinct('facing'),
    size: SIZE_TIERS.map((tier, index) => ({ index, label: tier.label })).filter(({ index }) => tiers.has(index)),
  }
}

// Flats that pass every filter that is set; `plots` carry `availableCount` when the project has floors
export function runQuery(plots, query) {
  return plots.filter(
    (plot) =>
      plot.kind !== 'amenity' &&
      (!query.bhk.length || query.bhk.includes(plot.bhk)) &&
      (!query.facing.length || query.facing.includes(plot.facing)) &&
      (!query.size.length || query.size.includes(sizeTier(plot.areaSqFt))) &&
      (!query.availableOnly || plot.availableCount > 0 || (plot.availableCount == null && plot.status === 'available')),
  )
}
