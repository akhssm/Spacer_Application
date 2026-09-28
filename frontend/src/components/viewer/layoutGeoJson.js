// Turns a project's layout into GeoJSON the map can draw in one go.
// Each shape becomes a Feature whose properties carry its colour and label.

import { STATUS_HEX } from '@/utils/inventory'

const PLAIN_FILL = '#eadfba'
const DIMMED_FILL = '#5f5f58'
const ZONE_FILLS = ['#eadfba', '#b9dba9', '#f3c6a0', '#a9c8e8', '#d9b8e8']
const DEFAULT_HEIGHT_METRES = 3
const DIM_FACTOR = 0.3

function fillFor(plot, colorMode, zones) {
  if (colorMode === 'status') return STATUS_HEX[plot.status]
  if (colorMode === 'zones') return ZONE_FILLS[zones.indexOf(plot.zone) % ZONE_FILLS.length]
  return PLAIN_FILL
}

export function buildLayoutGeoJson(project, { colorMode, selectedPlot, selectedBlock }) {
  const { boundary, plots, overlay, blocks = [] } = project.layout
  // When the plan drawing is draped on the map, plain mode shows the drawing itself
  // and our fills and numbers only appear when colouring by zone or status.
  const drawingShown = Boolean(overlay) && colorMode === 'plain'

  const features = plots.map((plot) => {
    const isAmenity = plot.kind === 'amenity'
    // With one block chosen, flats in the other blocks fade back
    const dimmed = Boolean(selectedBlock) && !isAmenity && plot.zone !== selectedBlock
    const dim = dimmed ? DIM_FACTOR : 1
    return {
      type: 'Feature',
      properties: {
        kind: isAmenity ? 'amenity' : 'plot',
        number: plot.number,
        fill: dimmed ? DIMMED_FILL : fillFor(plot, colorMode, project.zones),
        fillOpacity: isAmenity ? 0 : drawingShown ? 0 : 0.95,
        outlineOpacity: (isAmenity ? 0 : drawingShown ? 0.35 : 1) * dim,
        selected: selectedPlot?.number === plot.number,
        height: plot.height ?? (isAmenity ? 0 : (project.unitHeight ?? DEFAULT_HEIGHT_METRES)),
        // In status mode a tower with floors also shows how many are still available
        label:
          colorMode === 'status' && plot.availableCount != null
            ? `${plot.number}\n${plot.availableCount}/${plot.unitCount} avl`
            : plot.number,
        labelOpacity: (isAmenity ? 1 : drawingShown ? 0 : 1) * dim,
        labelColour: isAmenity || colorMode === 'status' ? '#ffffff' : '#3b3a2a',
        labelHalo: isAmenity ? 1.2 : 0,
        labelSize: isAmenity ? 10 : 11,
      },
      geometry: { type: 'Polygon', coordinates: [plot.polygon] },
    }
  })

  // Block outlines: the chosen one is highlighted, the others darkened
  blocks.forEach((block) => {
    features.unshift({
      type: 'Feature',
      properties: {
        kind: 'block',
        name: block.name,
        dim: Boolean(selectedBlock) && block.name !== selectedBlock,
        selected: block.name === selectedBlock,
      },
      geometry: { type: 'Polygon', coordinates: [block.polygon] },
    })
  })

  if (boundary) {
    features.unshift({
      type: 'Feature',
      properties: { kind: 'boundary' },
      geometry: { type: 'Polygon', coordinates: [boundary] },
    })
  }

  return { type: 'FeatureCollection', features }
}
