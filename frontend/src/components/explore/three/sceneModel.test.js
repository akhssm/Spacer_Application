import { describe, expect, it } from 'vitest'
import { apartments, blocks, getApartment } from '@/data'
import { GROUND, SCHEMATIC_STOREY, buildScene, floorBottom } from '@/components/explore/three/sceneModel'

const scene = buildScene()

describe('schematic 3D scene model', () => {
  it('has one box per generated apartment — never the declared counts', () => {
    const count = (id) => scene.blocks.find((b) => b.id === id).units.length
    expect(count('A')).toBe(110)
    expect(count('B')).toBe(110)
    expect(count('C')).toBe(140) // declared 154 is a documented exception, not modelled
    expect(scene.blocks.flatMap((b) => b.units).length).toBe(apartments.length)
  })

  it('uses the provisional apartment IDs from the data layer', () => {
    for (const u of scene.blocks.flatMap((b) => b.units)) {
      const a = getApartment(u.apartmentId)
      expect(a, u.apartmentId).toBeDefined()
      expect([a.blockId, a.level, a.flatNo, a.bhk]).toEqual([u.blockId, u.level, u.flatNo, u.bhk])
    }
  })

  it('stacks C+S+10: a stilt storey, then floors 01–10 at uniform schematic height', () => {
    for (const b of scene.blocks) {
      const src = blocks.find((x) => x.id === b.id)
      expect(b.residentialFloors).toBe(src.levels.value.residentialFloors)
      expect(b.stilt).toHaveLength(src.stacks.length)
      const levels = [...new Set(b.units.map((u) => u.level))].sort((x, y) => x - y)
      expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      for (const u of b.units) expect(u.y - u.h / 2).toBeCloseTo(floorBottom(u.level))
    }
    expect(floorBottom(1)).toBe(SCHEMATIC_STOREY) // floor 01 sits on the stilt storey
  })

  it('keeps every footprint on the master-plan ground', () => {
    const boxes = [...scene.blocks.flatMap((b) => [...b.units, ...b.stilt]), scene.clubhouse]
    for (const b of boxes) {
      expect(Math.abs(b.x) + b.w / 2).toBeLessThanOrEqual(GROUND.width / 2)
      expect(Math.abs(b.z) + b.d / 2).toBeLessThanOrEqual(GROUND.depth / 2)
    }
  })

  it('stacks each flat directly above its own master-plan tile', () => {
    const a = scene.blocks.find((b) => b.id === 'C')
    const f1 = a.units.find((u) => u.apartmentId === 'C-0113')
    const f10 = a.units.find((u) => u.apartmentId === 'C-1013')
    expect([f1.x, f1.z, f1.w, f1.d]).toEqual([f10.x, f10.z, f10.w, f10.d])
  })

  it('shows the clubhouse as a footprint only (no storey count in the brochure)', () => {
    expect(scene.clubhouse.h).toBeLessThan(SCHEMATIC_STOREY)
  })
})
