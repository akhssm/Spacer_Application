import { blocks, project } from '@/data'
import { masterPlanGeometry } from '@/data/masterPlan'
import { summariseBlocks } from '@/data/summaries'
import { flatBounds, flatKey } from '@/components/explore/map/flats'
import { planPolygonToRing, planRectToRing, planToLngLat } from '@/components/explore/map/georef'
import {
  ENTRANCE_GATE_PX,
  LAWNS_PX,
  PLAY_AREA_PX,
  POOL_PX,
  SITE_OUTLINE_PX,
  planEllipse,
} from '@/components/explore/map/siteOutline'

/**
 * Pure builders for the map's GeoJSON and labels. Geometry comes from the tested master-plan data
 * (`masterPlanGeometry`) plus the hand-traced shapes in `siteOutline.js`, placed with `georef.js`.
 * Flat positions (master-plan tiles) are built in `flats.js`; floor plans stay in the explorer.
 */

/**
 * What is selected, top to bottom of the hierarchy: block → flat (a stack, the same position on
 * every typical floor) → floor (which makes it one apartment). The floor is not part of the key.
 */
/** The block whose flats are shown: the selected block, or the selected flat's block. */
export const activeBlock = (s) => (s?.kind === 'block' || s?.kind === 'flat' ? s.blockId : undefined)

/** Stable key shared by layer filters, labels and selection. */
export function selectionKey(s) {
  if (!s) return undefined
  if (s.kind === 'block') return `block-${s.blockId}`
  if (s.kind === 'flat') return flatKey(s.blockId, s.flatNo)
  if (s.kind === 'clubhouse') return 'clubhouse'
  return s.id
}

export function selectionFromKey(key) {
  const block = blocks.find((b) => `block-${b.id}` === key)
  if (block) return { kind: 'block', blockId: block.id }
  for (const b of blocks) {
    const stack = b.stacks.find((s) => flatKey(b.id, s.flatNo) === key)
    if (stack) return { kind: 'flat', blockId: b.id, flatNo: stack.flatNo }
  }
  if (key === 'clubhouse') return { kind: 'clubhouse' }
  if (key in AMENITIES) return { kind: 'amenity', id: key }
  return undefined
}

/** Brand colours for MapLibre paint (which cannot read CSS variables) — mirrors src/index.css. */
export const MAP_COLORS = {
  navy950: '#021f2d',
  navy900: '#053950',
  sun400: '#fdb912',
  gold300: '#d2c6ae',
  sand200: '#e5d8a7',
  leaf500: '#95a451',
  white: '#ffffff',
  pool: '#5fb4d6',
}

// ---------------------------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------------------------

const amenityLine = (text) => {
  const line = project.amenities.value.find((a) => a === text)
  if (!line) throw new Error(`"${text}" is not in the brochure amenities list (p18).`)
  return line
}

export const AMENITIES = {
  entrance: {
    name: 'Main entrance',
    brochureAmenity: amenityLine('Grand Entry with Security Post'),
    traced:
      'The gate and security post on the south wall of the master plan (p6), where the entry road meets the site.',
    image: 'entrance-day-building',
  },
  'play-area': {
    name: "Children's play area",
    brochureAmenity: amenityLine("Children's Play Area"),
    traced: 'The oval play surface drawn on the east lawn of the master plan (p6).',
    image: 'landscape-play-area',
  },
  lawns: {
    name: 'Landscaped lawns',
    brochureAmenity: amenityLine('Beautiful Landscaping'),
    traced: 'The green lawns along the north and east edges of the master plan (p6).',
    image: 'landscape-sitting-area',
  },
}

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------

/** Signed area of a lng/lat ring — positive when counter-clockwise. */
function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return sum / 2
}

/** RFC 7946 winding: exterior rings counter-clockwise, holes clockwise (MapLibre relies on it for holes). */
function wind(ring, ccw) {
  return ringArea(ring) > 0 === ccw ? ring : [...ring].reverse()
}

const polygon = (ring, properties) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Polygon', coordinates: [wind(ring, true)] },
})

export const siteRing = wind(planPolygonToRing(SITE_OUTLINE_PX), true)

/** The indicative site boundary. */
export function buildSite() {
  return { type: 'FeatureCollection', features: [polygon(siteRing, { key: 'site' })] }
}

/** Everything outside the site, for a subtle dim — a large box with the site as a hole. */
export function buildOutsideMask(marginDeg = 0.05) {
  const [[w, s], [e, n]] = siteBounds()
  const outer = [
    [w - marginDeg, s - marginDeg],
    [e + marginDeg, s - marginDeg],
    [e + marginDeg, n + marginDeg],
    [w - marginDeg, n + marginDeg],
    [w - marginDeg, s - marginDeg],
  ]
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { key: 'outside' },
        geometry: { type: 'Polygon', coordinates: [wind(outer, true), wind(siteRing, false)] },
      },
    ],
  }
}

/** Lawns, play area, pool, blocks and clubhouse — drawn in this order (later on top). */
export function buildAreas() {
  const features = [
    polygon(planPolygonToRing(LAWNS_PX), { key: 'lawns', kind: 'lawn', name: AMENITIES.lawns.name, selectable: true }),
    polygon(planPolygonToRing(planEllipse(PLAY_AREA_PX)), {
      key: 'play-area',
      kind: 'play',
      name: AMENITIES['play-area'].name,
      selectable: true,
    }),
    ...blocks.map((b) =>
      polygon(planRectToRing(masterPlanGeometry.blocks[b.id].bounds), {
        key: `block-${b.id}`,
        kind: 'block',
        name: b.name,
        selectable: true,
      }),
    ),
    polygon(planRectToRing(masterPlanGeometry.clubhouse.rect), {
      key: 'clubhouse',
      kind: 'clubhouse',
      name: 'Clubhouse',
      selectable: true,
    }),
    polygon(planRectToRing(POOL_PX), { key: 'pool', kind: 'pool', name: 'Swimming pool', selectable: false }),
  ]
  return { type: 'FeatureCollection', features }
}

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

const rectCentre = ([x, y, w, h]) => [x + w / 2, y + h / 2]
const summaries = summariseBlocks(blocks)

export function buildLabels() {
  return [
    ...blocks.map((b) => {
      const s = summaries.find((x) => x.id === b.id)
      return {
        key: `block-${b.id}`,
        selection: { kind: 'block', blockId: b.id },
        title: b.name,
        subtitle: `${s.bhk.join(' & ')} BHK`,
        lngLat: planToLngLat(rectCentre(masterPlanGeometry.blocks[b.id].bounds)),
        tone: 'block',
      }
    }),
    {
      key: 'clubhouse',
      selection: { kind: 'clubhouse' },
      title: 'Clubhouse',
      lngLat: planToLngLat(rectCentre(masterPlanGeometry.clubhouse.rect)),
      tone: 'feature',
    },
    {
      key: 'entrance',
      selection: { kind: 'amenity', id: 'entrance' },
      title: 'Entrance',
      lngLat: planToLngLat(ENTRANCE_GATE_PX),
      tone: 'feature',
    },
    {
      key: 'play-area',
      selection: { kind: 'amenity', id: 'play-area' },
      title: 'Play area',
      lngLat: planToLngLat(PLAY_AREA_PX.centre),
      tone: 'amenity',
    },
    {
      key: 'lawns',
      selection: { kind: 'amenity', id: 'lawns' },
      title: 'Lawns',
      lngLat: planToLngLat([1250, 160]),
      tone: 'amenity',
    },
  ]
}

// ---------------------------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------------------------

/** [[west, south], [east, north]] of the site boundary. */
export function siteBounds() {
  const lngs = siteRing.map((p) => p[0])
  const lats = siteRing.map((p) => p[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

/** Bounds of one selectable feature (for "zoom to"). */
export function selectionBounds(s) {
  if (s.kind === 'flat') return flatBounds(s.blockId, s.flatNo)
  const ring =
    s.kind === 'block'
      ? planRectToRing(masterPlanGeometry.blocks[s.blockId].bounds)
      : s.kind === 'clubhouse'
        ? planRectToRing(masterPlanGeometry.clubhouse.rect)
        : s.id === 'lawns'
          ? planPolygonToRing(LAWNS_PX)
          : s.id === 'play-area'
            ? planPolygonToRing(planEllipse(PLAY_AREA_PX))
            : planRectToRing([ENTRANCE_GATE_PX[0] - 150, ENTRANCE_GATE_PX[1] - 150, 300, 300])
  const lngs = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}
