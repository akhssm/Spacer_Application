import { describe, expect, it } from 'vitest'
import { blocks } from '@/data'
import { QR_PIN, distanceMetres } from '@/components/explore/map/georef'
import {
  AMENITIES,
  buildAreas,
  buildLabels,
  buildOutsideMask,
  buildSite,
  selectionBounds,
  selectionFromKey,
  selectionKey,
  siteBounds,
  siteRing,
} from '@/components/explore/map/layers'

/** Ray-casting point-in-polygon on lng/lat (fine at site scale). */
function inside([x, y], ring) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

const signedArea = (ring) =>
  ring.slice(0, -1).reduce((s, [x1, y1], i) => s + x1 * ring[i + 1][1] - ring[i + 1][0] * y1, 0) / 2

describe('map layers', () => {
  const areas = buildAreas().features

  it('has one footprint per block and the clubhouse — no apartment-level shapes', () => {
    const keys = areas.map((f) => f.properties.key)
    expect(keys.filter((k) => k.startsWith('block-'))).toEqual(blocks.map((b) => `block-${b.id}`))
    expect(keys).toContain('clubhouse')
    expect(areas).toHaveLength(blocks.length + 4) // + lawns, play area, clubhouse, pool
  })

  it('keeps blocks, clubhouse and amenities inside the site boundary', () => {
    // Footprints from masterPlanGeometry lie strictly inside the traced boundary.
    for (const f of areas) {
      if (f.properties.kind !== 'block' && f.properties.kind !== 'clubhouse' && f.properties.kind !== 'pool') continue
      for (const p of f.geometry.coordinates[0]) expect(inside(p, siteRing), f.properties.key).toBe(true)
    }
    // Hand-traced amenities (lawns share the boundary edge; the play area nearly touches it) — by label point.
    for (const l of buildLabels()) if (l.key !== 'entrance') expect(inside(l.lngLat, siteRing), l.key).toBe(true)
  })

  it('places the entrance label within a few metres of the QR anchor', () => {
    const entrance = buildLabels().find((l) => l.key === 'entrance')
    expect(distanceMetres(entrance.lngLat, QR_PIN)).toBeLessThan(10)
  })

  it('uses RFC 7946 winding so the outside mask has a real hole', () => {
    expect(signedArea(buildSite().features[0].geometry.coordinates[0])).toBeGreaterThan(0)
    const [outer, hole] = buildOutsideMask().features[0].geometry.coordinates
    expect(signedArea(outer)).toBeGreaterThan(0)
    expect(signedArea(hole)).toBeLessThan(0)
    for (const f of areas) expect(signedArea(f.geometry.coordinates[0])).toBeGreaterThan(0)
  })

  it('sizes the site at roughly 89 m × 162 m', () => {
    const [[w, s], [e, n]] = siteBounds()
    expect(distanceMetres([w, s], [e, s])).toBeCloseTo(88.7, 0)
    expect(distanceMetres([w, s], [w, n])).toBeCloseTo(162.4, 0)
  })

  it('round-trips selections through their keys', () => {
    const all = [
      ...blocks.map((b) => ({ kind: 'block', blockId: b.id })),
      { kind: 'clubhouse' },
      ...Object.keys(AMENITIES).map((id) => ({ kind: 'amenity', id })),
    ]
    for (const s of all) {
      expect(selectionFromKey(selectionKey(s))).toEqual(s)
      const [[w, so], [e, n]] = selectionBounds(s)
      expect(e).toBeGreaterThan(w)
      expect(n).toBeGreaterThan(so)
    }
    expect(selectionFromKey('pool')).toBeUndefined()
    expect(selectionFromKey('site')).toBeUndefined()
  })

  it('labels every selectable feature once', () => {
    const keys = buildLabels().map((l) => l.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const f of areas) if (f.properties.selectable) expect(keys).toContain(f.properties.key)
  })
})
