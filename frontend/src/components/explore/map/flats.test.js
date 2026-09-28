import { describe, expect, it } from 'vitest'
import { blocks } from '@/data'
import { masterPlanGeometry, unitTiles } from '@/data/masterPlan'
import { planRectToRing } from '@/components/explore/map/georef'
import { buildFlatLabels, buildFlats, flatBounds, flatKey } from '@/components/explore/map/flats'
import { activeBlock, selectionBounds, selectionFromKey, selectionKey } from '@/components/explore/map/layers'

function inside([x, y], ring) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

describe('flat tiles on the location map', () => {
  const flats = buildFlats().features

  it('has one tile per flat position — 11 + 11 + 14, straight from the master-plan tiles', () => {
    expect(flats).toHaveLength(unitTiles.length)
    expect(flats).toHaveLength(blocks.reduce((n, b) => n + b.stacks.length, 0))
    for (const b of blocks)
      for (const s of b.stacks) {
        const f = flats.find((x) => x.properties.key === flatKey(b.id, s.flatNo))
        expect(f, `${b.id}-${s.flatNo}`).toBeDefined()
        expect(f.properties).toMatchObject({
          bhk: s.bhk,
          facing: s.facing,
          areaSft: s.areaSft,
          label: s.masterPlan.label,
        })
      }
  })

  it("keeps the printed '12 A' label on Block C flat 13", () => {
    expect(flats.find((f) => f.properties.key === flatKey('C', 13)).properties.label).toBe('12 A')
  })

  it('places every tile inside its block footprint', () => {
    for (const f of flats) {
      const block = planRectToRing(masterPlanGeometry.blocks[f.properties.blockId].bounds)
      for (const p of f.geometry.coordinates[0]) expect(inside(p, block), f.properties.key).toBe(true)
    }
  })

  it('labels every tile at its centre', () => {
    const labels = buildFlatLabels()
    expect(labels).toHaveLength(flats.length)
    for (const l of labels) {
      const [[w, s], [e, n]] = flatBounds(l.blockId, l.flatNo)
      expect(l.lngLat[0]).toBeCloseTo((w + e) / 2, 9)
      expect(l.lngLat[1]).toBeCloseTo((s + n) / 2, 9)
    }
  })
})

describe('flat selection', () => {
  it('round-trips flat selections through their keys (the floor is not part of the key)', () => {
    const flat = { kind: 'flat', blockId: 'B', flatNo: 9 }
    expect(selectionKey(flat)).toBe('flat-B-9')
    expect(selectionKey({ ...flat, level: 4 })).toBe('flat-B-9')
    expect(selectionFromKey('flat-B-9')).toEqual(flat)
    expect(selectionFromKey('flat-B-12')).toBeUndefined()
  })

  it("keeps the flat's block active and zooms to the tile", () => {
    const flat = { kind: 'flat', blockId: 'C', flatNo: 13, level: 2 }
    expect(activeBlock(flat)).toBe('C')
    expect(activeBlock({ kind: 'block', blockId: 'A' })).toBe('A')
    expect(activeBlock({ kind: 'clubhouse' })).toBeUndefined()
    expect(selectionBounds(flat)).toEqual(flatBounds('C', 13))
  })
})
