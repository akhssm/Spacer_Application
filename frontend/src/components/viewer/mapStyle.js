// How the project viewer draws its map, in the style of a marketing plot map: current satellite
// imagery, the real public roads as dark tarmac with a dashed yellow centre line, and the layout
// as a pale card with bright flat tiles, grey driveways, green lawns, trees and a white card
// naming each block. Every layout layer reads its colours and labels from the GeoJSON built in
// layoutGeoJson.js.

export const SOURCE = 'layout'
export const IMAGERY_SOURCE = 'satellite-imagery'

// Esri's imagery is newer than MapTiler's over IRA Towers: it shows the towers going up, so the
// surroundings on the map are the surroundings as they are today.
export const ESRI_IMAGERY = {
  type: 'raster',
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
  tileSize: 256,
  maxzoom: 19,
  attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
}

const kindIs = (kind) => ['==', ['get', 'kind'], kind]
const IS_PLOT = kindIs('plot')
const IS_AMENITY = kindIs('amenity')
const IS_UNIT = ['any', IS_PLOT, IS_AMENITY]
const IS_BOUNDARY = kindIs('boundary')
const IS_BLOCK = kindIs('block')
const IS_RAISED = ['all', IS_UNIT, ['>', ['get', 'height'], 0]]

// A length of so many metres on the ground, in pixels at every zoom (at the site's latitude), so
// roads, trees and tile numbers keep their real size as the map zooms
const METRES_PER_PX_Z0 = 156543.03 * Math.cos((17.51 * Math.PI) / 180)
const px = (m, zoom) => (m * 2 ** zoom) / METRES_PER_PX_Z0
// `perZoom` maps a zoom to the pixel width at that zoom, so widths can vary per feature too
const byZoom = (perZoom) => ['interpolate', ['exponential', 2], ['zoom'], 14, perZoom(14), 22, perZoom(22)]
const metres = (m) => byZoom((zoom) => px(m, zoom))

// ---------- Public roads, from MapTiler's OpenStreetMap data ----------

const PUBLIC_ROADS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service']
const ROAD_FILTER = [
  'all',
  ['==', ['geometry-type'], 'LineString'],
  ['match', ['get', 'class'], PUBLIC_ROADS, true, false],
  ['!=', ['get', 'brunnel'], 'tunnel'],
]
// Real carriageway widths: main roads 16 m, secondary 11 m, service lanes 4.5 m, the rest 7 m
const roadWidth = (extra = 0) =>
  byZoom((zoom) => [
    'match',
    ['get', 'class'],
    ['motorway', 'trunk', 'primary'],
    px(16 + extra, zoom),
    ['secondary', 'tertiary'],
    px(11 + extra, zoom),
    'service',
    px(4.5 + extra, zoom),
    px(7 + extra, zoom),
  ])

// Below this zoom the style's own thin road lines are shown instead
export const ROADS_MIN_ZOOM = 15

export const ROAD_LAYERS = [
  { id: 'public-roads-edge', paint: { 'line-color': '#9fb3c6', 'line-width': roadWidth(1.6), 'line-opacity': 0.55 } },
  { id: 'public-roads', paint: { 'line-color': '#34495e', 'line-width': roadWidth(), 'line-opacity': 0.75 } },
  {
    id: 'public-roads-centre',
    minzoom: 16,
    filter: ['!=', ['get', 'class'], 'service'],
    paint: { 'line-color': '#f7e04b', 'line-width': metres(0.5), 'line-dasharray': [3, 3] },
  },
].map(({ filter, ...layer }) => ({
  minzoom: ROADS_MIN_ZOOM,
  ...layer,
  type: 'line',
  source: 'maptiler_planet',
  'source-layer': 'transportation',
  filter: filter ? ['all', ROAD_FILTER, filter] : ROAD_FILTER,
  layout: { 'line-join': 'round' },
}))

// ---------- Icons drawn on a canvas ----------

const TREE_ICON_PX = 48

function canvasImage(size, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  return ctx.getImageData(0, 0, size, size)
}

// A tree seen from above: a dark crown with a lit side
const treeIcon = () =>
  canvasImage(TREE_ICON_PX, (ctx, s) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.arc(s * 0.56, s * 0.58, s * 0.4, 0, Math.PI * 2)
    ctx.fill()
    const crown = ctx.createRadialGradient(s * 0.38, s * 0.36, s * 0.04, s / 2, s / 2, s * 0.42)
    crown.addColorStop(0, '#8fd16a')
    crown.addColorStop(0.6, '#3f8f34')
    crown.addColorStop(1, '#245c22')
    ctx.fillStyle = crown
    ctx.beginPath()
    ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2)
    ctx.fill()
  })

// A white rounded card that stretches around a block's name
const CARD_PX = 48
const cardIcon = () =>
  canvasImage(CARD_PX, (ctx, s) => {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 2
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(4, 4, s - 8, s - 10, 7)
    ctx.fill()
  })

// A red map pin with a white dot, its point at the bottom middle
const PIN_PX = 48
const pinIcon = () =>
  canvasImage(PIN_PX, (ctx, s) => {
    const r = s * 0.3
    const cx = s / 2
    const cy = s * 0.34
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1
    ctx.fillStyle = '#e53935'
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.82, Math.PI * 2.18)
    ctx.lineTo(cx, s * 0.96)
    ctx.closePath()
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = s * 0.05
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2)
    ctx.fill()
  })

export function addIcons(map) {
  if (!map.hasImage('tree')) map.addImage('tree', treeIcon())
  if (!map.hasImage('pin')) map.addImage('pin', pinIcon(), { pixelRatio: 2 })
  if (!map.hasImage('card')) {
    map.addImage('card', cardIcon(), {
      stretchX: [[14, CARD_PX - 14]],
      stretchY: [[14, CARD_PX - 16]],
      content: [10, 10, CARD_PX - 10, CARD_PX - 12],
    })
  }
}

// ---------- The layout ----------

export const LAYERS = [
  // The site sits on the photo like a card: a soft shadow, a pale paved slab, a dark rim
  {
    id: 'boundary-shadow',
    type: 'fill',
    filter: IS_BOUNDARY,
    paint: { 'fill-color': '#06121f', 'fill-opacity': 0.45, 'fill-translate': [4, 8] },
  },
  { id: 'boundary-fill', type: 'fill', filter: IS_BOUNDARY, paint: { 'fill-color': '#dfe6ed', 'fill-opacity': 0.97 } },
  {
    id: 'boundary-line',
    type: 'line',
    filter: IS_BOUNDARY,
    paint: { 'line-color': '#34495e', 'line-width': metres(1.6) },
  },
  // Each block on a slightly darker pad, under the lawns inside it
  { id: 'blocks-pad', type: 'fill', filter: IS_BLOCK, paint: { 'fill-color': '#c8d2dc', 'fill-opacity': 0.9 } },
  {
    id: 'amenity-fill',
    type: 'fill',
    filter: IS_AMENITY,
    paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] },
  },
  // Driveways: grey lanes with a white dashed centre line
  {
    id: 'site-roads',
    type: 'line',
    filter: kindIs('road'),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#aab6c2', 'line-width': metres(5.5) },
  },
  {
    id: 'site-roads-centre',
    type: 'line',
    filter: kindIs('road'),
    minzoom: 17,
    paint: { 'line-color': '#ffffff', 'line-width': metres(0.35), 'line-dasharray': [3, 3] },
  },
  {
    id: 'plots-shadow',
    type: 'fill',
    filter: IS_PLOT,
    paint: {
      'fill-color': '#1d2b3a',
      'fill-opacity': ['*', 0.4, ['get', 'outlineOpacity']],
      'fill-translate': [2, 3],
    },
  },
  {
    id: 'plots-fill',
    type: 'fill',
    filter: IS_PLOT,
    paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] },
  },
  // Darkens the blocks that are not chosen; invisible otherwise, but still clickable
  {
    id: 'blocks-dim',
    type: 'fill',
    filter: IS_BLOCK,
    paint: { 'fill-color': '#0a0a0a', 'fill-opacity': ['case', ['get', 'dim'], 0.55, 0] },
  },
  {
    id: 'blocks-line',
    type: 'line',
    filter: IS_BLOCK,
    paint: { 'line-color': '#75c217', 'line-width': 2.5, 'line-opacity': ['case', ['get', 'selected'], 1, 0] },
  },
  {
    id: 'plots-3d',
    type: 'fill-extrusion',
    filter: IS_RAISED,
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': ['get', 'fill'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-opacity': 0.9,
    },
  },
  {
    id: 'plots-line',
    type: 'line',
    filter: IS_UNIT,
    paint: {
      'line-color': ['case', ['get', 'selected'], '#75c217', '#ffffff'],
      'line-width': ['case', ['get', 'selected'], 3, 1.5],
      'line-opacity': ['case', ['get', 'selected'], 1, ['get', 'outlineOpacity']],
    },
  },
  {
    id: 'trees',
    type: 'symbol',
    filter: kindIs('tree'),
    layout: {
      'icon-image': 'tree',
      'icon-size': metres(3.2 / TREE_ICON_PX),
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  },
  // Flat number in large type with its size underneath, sized to fit the tile
  {
    id: 'plots-label',
    type: 'symbol',
    filter: IS_PLOT,
    minzoom: 17.8,
    layout: {
      'text-field': ['format', ['get', 'label'], {}, '\n', {}, ['get', 'sub'], { 'font-scale': 0.5 }],
      'text-size': metres(3.5),
      'text-font': ['Open Sans Bold'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-line-height': 1.05,
    },
    paint: { 'text-color': ['get', 'labelColour'], 'text-opacity': ['get', 'labelOpacity'] },
  },
  {
    id: 'amenity-label',
    type: 'symbol',
    filter: IS_AMENITY,
    minzoom: 17,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 17, 9, 19, 12, 21, 16],
      'text-font': ['Open Sans Bold'],
      'text-max-width': 7,
    },
    paint: {
      'text-color': '#ffffff',
      'text-opacity': ['get', 'labelOpacity'],
      'text-halo-color': 'rgba(20, 50, 20, 0.85)',
      'text-halo-width': 1.4,
    },
  },
  // "Block A" on a white card at the head of each block
  {
    id: 'block-label',
    type: 'symbol',
    filter: kindIs('block-label'),
    minzoom: 16.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 16.5, 10, 19, 14, 21, 20],
      'text-font': ['Open Sans Bold'],
      'text-anchor': 'bottom',
      'text-offset': [0, -0.4],
      'icon-image': 'card',
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [3, 9, 3, 9],
      'icon-anchor': 'bottom',
      'icon-offset': [0, -4],
      'text-allow-overlap': true,
      'icon-allow-overlap': true,
    },
    paint: { 'text-color': '#1f2d3d', 'icon-opacity': ['case', ['get', 'dim'], 0.5, 1] },
  },
].map((layer) => ({ ...layer, source: SOURCE }))

export const CLICKABLE_LAYERS = ['plots-fill', 'amenity-fill', 'plots-3d']
export const BLOCK_LAYERS = ['blocks-dim']
// Shown flat in 2D and put away in 3D, where the buildings stand in their place
export const FLAT_ONLY_LAYERS = ['plots-fill', 'plots-shadow', 'plots-label']

// ---------- Measuring tool ----------

export const MEASURE_SOURCE = 'measure'

// A dashed white line with a dark edge, so it reads on photo and street map alike, and a dot at
// every point clicked
export const MEASURE_LAYERS = [
  {
    id: 'measure-line-edge',
    type: 'line',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#1f2d3d', 'line-width': 5 },
  },
  {
    id: 'measure-line',
    type: 'line',
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
  },
  {
    id: 'measure-points',
    type: 'circle',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 5,
      'circle-color': '#75c217',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  },
].map((layer) => ({ ...layer, source: MEASURE_SOURCE }))

export function measureGeoJson(points) {
  const features = points.map((point) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: point },
  }))
  if (points.length > 1) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } })
  }
  return { type: 'FeatureCollection', features }
}

// ---------- Nearby places ----------

export const NEARBY_SOURCE = 'nearby'
// Shown as the map pulls back from the site, so they never sit over the layout itself
export const NEARBY_MAX_ZOOM = 16.5

// A red pin on each place, with its name and distance from the site beside it. Pins always show;
// a name that would cover another hides until there is room.
export const NEARBY_LAYERS = [
  {
    id: 'nearby-pins',
    type: 'symbol',
    maxzoom: NEARBY_MAX_ZOOM,
    layout: {
      'icon-image': 'pin',
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'text-field': ['format', ['get', 'name'], {}, '\n', {}, ['get', 'distance'], { 'font-scale': 0.85 }],
      'text-font': ['Open Sans Bold'],
      'text-size': 12,
      'text-anchor': 'left',
      'text-offset': [0.9, -1.1],
      'text-justify': 'left',
      'text-max-width': 12,
      'text-optional': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(120, 10, 10, 0.95)',
      'text-halo-width': 1.6,
    },
  },
].map((layer) => ({ ...layer, source: NEARBY_SOURCE }))

// One point per place, with its distance from the site written out ("2.4 km")
export function nearbyGeoJson(places, site, distanceMetres) {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      properties: { name: place.name, distance: `${(distanceMetres(site, place.at) / 1000).toFixed(1)} km` },
      geometry: { type: 'Point', coordinates: place.at },
    })),
  }
}
