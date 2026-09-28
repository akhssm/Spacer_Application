import { describe, expect, it } from 'vitest'
import { blocks, brochureAssets } from '@/data'
import { floorPlanFlats, floorPlanGeometry, getFloorPlanFlat, validateFloorPlanGeometry } from '@/data/floorPlan'
import { getRooms, roomsByFlat } from '@/data/rooms'

describe('typical floor-plan geometry (derived from brochure p10–12)', () => {
  it('joins every flat to exactly one region', () => {
    expect(validateFloorPlanGeometry(blocks, floorPlanGeometry)).toEqual([])
    expect(floorPlanFlats).toHaveLength(11 + 11 + 14)
  })

  it("uses the shipped floor-plan assets' native pixel space", () => {
    for (const b of blocks) {
      const g = floorPlanGeometry[b.id]
      const a = brochureAssets[b.floorPlanAssetId]
      expect([g.width, g.height]).toEqual([a.width, a.height])
    }
  })

  it("maps Block C's '12 A' master-plan position to flat 13 on the floor plan", () => {
    const f = getFloorPlanFlat('C', 13)
    expect(f.stack.masterPlan.label).toBe('12 A')
    expect(f.stack.exceptions).toContain('block-c-flat-13-label')
  })

  it("keeps the stack order: flat 06 at the top of Block A's left column, 01 at the bottom", () => {
    const left = floorPlanFlats.filter((f) => f.blockId === 'A' && f.rect[0] < floorPlanGeometry.A.corridor[0])
    const byTop = [...left].sort((a, b) => a.rect[1] - b.rect[1]).map((f) => f.flatNo)
    expect(byTop).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('detects overlapping or missing regions', () => {
    const broken = structuredClone(floorPlanGeometry)
    broken.B.units[1].rect = [...broken.B.units[0].rect]
    expect(validateFloorPlanGeometry(blocks, broken).join('\n')).toMatch(/overlap/)
    broken.B.units.pop()
    expect(validateFloorPlanGeometry(blocks, broken).join('\n')).toMatch(/10 flats/)
  })
})

describe('room labels (transcribed verbatim from p10–12)', () => {
  it('exist for every flat in the area statements', () => {
    for (const b of blocks)
      for (const s of b.stacks) expect(getRooms(b.id, s.flatNo).length, `${b.id}-${s.flatNo}`).toBeGreaterThan(0)
    for (const [bid, flats] of Object.entries(roomsByFlat))
      expect(
        Object.keys(flats)
          .map(Number)
          .sort((x, y) => x - y),
      ).toEqual(blocks.find((b) => b.id === bid).stacks.map((s) => s.flatNo))
  })

  it("agree with the area statement's BHK (bedrooms incl. master = BHK)", () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const beds = getRooms(b.id, s.flatNo).filter((r) => /BEDROOM$/.test(r.name)).length
        expect(beds, `${b.id}-${s.flatNo}`).toBe(s.bhk)
      }
  })

  it('every flat has a kitchen and a WC (toilet or PWR) per bedroom', () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const rooms = getRooms(b.id, s.flatNo)
        expect(
          rooms.some((r) => r.name === 'KITCHEN'),
          `${b.id}-${s.flatNo}`,
        ).toBe(true)
        expect(
          rooms.filter((r) => r.name === 'TOILET' || r.name === 'PWR').length,
          `${b.id}-${s.flatNo}`,
        ).toBeGreaterThanOrEqual(s.bhk)
      }
  })

  it('keeps printed quirks verbatim', () => {
    expect(getRooms('C', 13).find((r) => r.name === 'DRAWING').dims).toBe(`14'1"X11"3"`)
    expect(getRooms('C', 12).find((r) => r.name === 'DRAWING').dims).toBe(`14'1"X11'3"`)
    expect(
      getRooms('C', 8)
        .filter((r) => r.name === 'BEDROOM')
        .map((r) => r.dims),
    ).toEqual([`14'2"X11'0"`, `13'1"X11'0"`])
    expect(getRooms('B', 7).find((r) => r.name === 'KITCHEN').dims).toBe(`10'7"x15'8"`)
  })

  it("only uses dimension strings in the plan's feet/inch notation", () => {
    for (const flats of Object.values(roomsByFlat))
      for (const rooms of Object.values(flats))
        for (const r of rooms) if (r.dims) expect(r.dims).toMatch(/^\d+'(\d+")?[Xx]\d+['"](\d+['"])?$/)
  })
})
