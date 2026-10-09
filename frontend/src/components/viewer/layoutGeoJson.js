// Turns a project's layout into GeoJSON the map can draw in one go.
// Each shape becomes a Feature whose properties carry its colour and label.
// The look follows a marketing plot map: bright tiles on a pale site slab, with
// grey driveways, green lawns and a white card naming each block.

import { STATUS_HEX } from '@/utils/inventory'
import { SQ_YD_PER_SQ_M, areaSqMetres } from '@/utils/geo'

const DIMMED_FILL = '#5f5f58'
const ZONE_FILLS = ['#f7d14c', '#5b93d8', '#f4a53c', '#9fd27f', '#d9b8e8']
const DEFAULT_HEIGHT_METRES = 3
const DIM_FACTOR = 0.3

// Plain mode colours each flat by its size, so similar flats read as one colour
export const SIZE_TIERS = [
  { max: 1200, fill: '#a9d0ea', label: 'Up to 1,200 sft' },
  { max: 1300, fill: '#5b93d8', label: '1,201 – 1,300 sft' },
  { max: 1700, fill: '#f6a58f', label: '1,301 – 1,700 sft' },
  { max: 1820, fill: '#f7d14c', label: '1,701 – 1,820 sft' },
  { max: Infinity, fill: '#f4a53c', label: 'Above 1,820 sft' },
]
const sizeFill = (areaSqFt) => (SIZE_TIERS.find((tier) => (areaSqFt ?? 0) <= tier.max) ?? SIZE_TIERS[0]).fill

// Amenity grounds, so lawns read green and the pool blue
const AMENITY_FILLS = {
  Lawn: '#8cc85f',
  'Landscaped Lawn': '#8cc85f',
  'Outdoor Games': '#9fd27f',
  'Sitting Area': '#79b851',
  "Children's Play Area": '#f2a65a',
  'Swimming Pool': '#45b4e6',
  'Club House': '#f3efe6',
  'Grand Entrance': '#c0392b',
}

function fillFor(plot, colorMode, zones) {
  if (colorMode === 'status') return STATUS_HEX[plot.status]
  if (colorMode === 'zones') return ZONE_FILLS[zones.indexOf(plot.zone) % ZONE_FILLS.length]
  return sizeFill(plot.areaSqFt)
}

// "A-06" -> "06": the block is written on the block's card, so tiles show the flat number
const shortNumber = (number) => number.split('-').pop()

const feature = (properties, geometry) => ({ type: 'Feature', properties, geometry })

// The middle of a ring's north edge, where the block's card sits
function northCentre(ring) {
  const maxLat = Math.max(...ring.map(([, lat]) => lat))
  const lngs = ring.map(([lng]) => lng)
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, maxLat]
}

// `highlight`, when set, is the numbers of the flats a query picked; the rest fade back
export function buildLayoutGeoJson(project, { colorMode, selectedPlot, selectedBlock, highlight = null }) {
  const { boundary, plots, overlay, blocks = [], roads = [], trees = [] } = project.layout
  // When the plan drawing is draped on the map, plain mode shows the drawing itself
  // and our fills and numbers only appear when colouring by zone or status.
  const drawingShown = Boolean(overlay) && colorMode === 'plain'
  const features = []

  if (boundary) features.push(feature({ kind: 'boundary' }, { type: 'Polygon', coordinates: [boundary] }))

  // Block outlines: the chosen one is highlighted, the others darkened
  blocks.forEach((block) => {
    features.push(
      feature(
        {
          kind: 'block',
          name: block.name,
          dim: Boolean(selectedBlock) && block.name !== selectedBlock,
          selected: block.name === selectedBlock,
        },
        { type: 'Polygon', coordinates: [block.polygon] },
      ),
    )
    features.push(
      feature(
        { kind: 'block-label', name: block.name, dim: Boolean(selectedBlock) && block.name !== selectedBlock },
        { type: 'Point', coordinates: northCentre(block.polygon) },
      ),
    )
  })

  roads.forEach((line) => features.push(feature({ kind: 'road' }, { type: 'LineString', coordinates: line })))
  trees.forEach((point) => features.push(feature({ kind: 'tree' }, { type: 'Point', coordinates: point })))

  plots.forEach((plot) => {
    const isAmenity = plot.kind === 'amenity'
    // With one block chosen, flats in the other blocks fade back
    const dimmed =
      !isAmenity &&
      ((Boolean(selectedBlock) && plot.zone !== selectedBlock) || (highlight !== null && !highlight.has(plot.number)))
    const dim = dimmed ? DIM_FACTOR : 1
    const statusLabel = colorMode === 'status' && plot.availableCount != null
    features.push(
      feature(
        {
          kind: isAmenity ? 'amenity' : 'plot',
          number: plot.number,
          fill: isAmenity
            ? (AMENITY_FILLS[plot.number] ?? '#9fd27f')
            : dimmed
              ? DIMMED_FILL
              : fillFor(plot, colorMode, project.zones),
          fillOpacity: drawingShown ? 0 : isAmenity ? 0.92 : 1,
          outlineOpacity: (isAmenity ? 0.7 : drawingShown ? 0.35 : 1) * dim,
          selected: selectedPlot?.number === plot.number,
          height: plot.height ?? (isAmenity ? 0 : (project.unitHeight ?? DEFAULT_HEIGHT_METRES)),
          label: isAmenity ? plot.number : shortNumber(plot.number),
          // Second line under the number: the land the apartment stands on, or in status mode how many
          // floors are left
          sub: isAmenity
            ? ''
            : statusLabel
              ? `${plot.availableCount}/${plot.unitCount} avl`
              : `${Math.round(areaSqMetres(plot.polygon) * SQ_YD_PER_SQ_M)} sq.yd`,
          labelOpacity: (isAmenity ? 1 : drawingShown ? 0 : 1) * dim,
          labelColour: colorMode === 'status' ? '#ffffff' : '#1d2733',
        },
        { type: 'Polygon', coordinates: [plot.polygon] },
      ),
    )
  })

  return { type: 'FeatureCollection', features }
}
