import { describe, expect, it } from 'vitest'
import { blocks } from '@/data'
import { getFloorPlanFlat } from '@/data/floorPlan'
import { getPlanRooms, matchRoomAnchors, roomAnchorErrors, roomKind } from '@/data/roomAnchors'
import { getRooms } from '@/data/rooms'

describe('room anchors (printed labels on the typical floor plans, p10–12)', () => {
  it('places every printed room of every flat exactly once, inside its flat', () => {
    expect(roomAnchorErrors).toEqual([])
    for (const b of blocks)
      for (const s of b.stacks) {
        const rooms = getPlanRooms(b.id, s.flatNo)
        expect(rooms.map((r) => r.index)).toEqual(getRooms(b.id, s.flatNo).map((_, i) => i))
        expect(new Set(rooms.map((r) => r.key)).size).toBe(rooms.length)
      }
  })

  it('keeps anchors apart — no two rooms share a label', () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const rooms = getPlanRooms(b.id, s.flatNo)
        rooms.forEach((r, i) =>
          rooms.slice(i + 1).forEach((q) => {
            expect(
              Math.hypot(r.anchor[0] - q.anchor[0], r.anchor[1] - q.anchor[1]),
              `${b.id}-${s.flatNo} ${r.key}/${q.key}`,
            ).toBeGreaterThan(40)
          }),
        )
      }
  })

  it('numbers bedrooms after the master bedroom and toilets from 1', () => {
    expect(getPlanRooms('C', 1).map((r) => r.key)).toEqual([
      'drawing',
      'living',
      'dining',
      'kitchen',
      'master-bedroom',
      'bedroom-2',
      'bedroom-3',
      'toilet-1',
      'toilet-2',
      'toilet-3',
      'balcony',
      'wash',
    ])
    expect(getPlanRooms('B', 1).map((r) => r.key)).toContain('balcony-2')
    expect(getPlanRooms('A', 3).find((r) => r.key === 'bedroom-2')?.label).toBe('Bedroom 2')
  })

  it('tells same-named rooms apart by the size printed under each label', () => {
    // A-01 prints BEDROOM 12'6"X11'2" (left) and BEDROOM 10'1"X11'2" (right of it).
    const [b2, b3] = ['bedroom-2', 'bedroom-3'].map((k) => getPlanRooms('A', 1).find((r) => r.key === k))
    expect(b2.room.dims).toBe(`12'6"X11'2"`)
    expect(b3.room.dims).toBe(`10'1"X11'2"`)
    expect(b2.anchor[0]).toBeLessThan(b3.anchor[0])
  })

  it("puts each anchor on its own flat's crop", () => {
    const f = getFloorPlanFlat('A', 6)
    const [x, y, w, h] = f.rect
    for (const r of getPlanRooms('A', 6)) {
      expect(r.anchor[0]).toBeGreaterThanOrEqual(x)
      expect(r.anchor[0]).toBeLessThanOrEqual(x + w)
      expect(r.anchor[1]).toBeGreaterThanOrEqual(y)
      expect(r.anchor[1]).toBeLessThanOrEqual(y + h)
    }
  })

  it('classifies printed names and OCR variants', () => {
    expect(roomKind('M.BEDROOM')).toBe('master-bedroom')
    expect(roomKind('TOILEY')).toBe('toilet')
    expect(roomKind(`4' WIDE WASH/BALCONY`)).toBe('wash-balcony')
    expect(roomKind('LIVING/DINING')).toBe('living-dining')
    expect(roomKind(`14'X10'6"`)).toBeUndefined()
  })

  it('reports a mismatch instead of guessing', () => {
    const m = matchRoomAnchors(
      [{ name: 'KITCHEN' }, { name: 'TOILET' }],
      [{ text: 'KITCHEN', box: [0, 0, 50, 10] }],
      'test',
    )
    expect(m.errors).toEqual(['test: 1 printed toilet vs 0 labels found on the plan.'])
    expect(m.rooms.map((r) => r.key)).toEqual(['kitchen'])
  })
})
