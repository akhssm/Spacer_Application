import { describe, expect, it } from 'vitest'
import { blocks } from '@/data'
import { getRooms } from '@/data/rooms'
import { PLAN_TYPES, getPlanType, hasOverallDimensions, publishedWidths } from '@/components/explore/map/measurements'

/** "11'0\"" and "11'" are the same printed value (C-08 notation). */
const normalise = (dims) => dims?.replace(/'0"/g, "'")

describe('flat plan types', () => {
  it('assigns every flat of every block to exactly one plan type', () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const matches = PLAN_TYPES.filter((t) => t.blockId === b.id && t.flatNos.includes(s.flatNo))
        expect(matches, `${b.id}-${s.flatNo}`).toHaveLength(1)
      }
    const listed = PLAN_TYPES.reduce((n, t) => n + t.flatNos.length, 0)
    expect(listed).toBe(blocks.reduce((n, b) => n + b.stacks.length, 0))
  })

  it('uses the agreed groups', () => {
    const ids = Object.fromEntries(PLAN_TYPES.map((t) => [t.id, `${t.blockId}:${t.flatNos.join(',')}`]))
    expect(ids).toEqual({
      A1: 'A:3,4,5,6',
      A2: 'A:2',
      A3: 'A:1',
      A4: 'A:7,8',
      A5: 'A:9',
      A6: 'A:10',
      A7: 'A:11',
      B1: 'B:1,2,3,4,5',
      B2: 'B:6',
      B3: 'B:7',
      B4: 'B:8,10,11',
      B5: 'B:9',
      C1: 'C:1,2,3,4,5,6,7,8',
      C2: 'C:9,10,11,12',
      'C2*': 'C:13',
      C3: 'C:14',
    })
  })

  it('groups only flats with the same BHK, facing, sale area and printed rooms', () => {
    for (const t of PLAN_TYPES) {
      const block = blocks.find((b) => b.id === t.blockId)
      const [first, ...rest] = t.flatNos.map((n) => block.stacks.find((s) => s.flatNo === n))
      const rooms = (n) => getRooms(t.blockId, n).map((r) => `${r.name}|${normalise(r.dims)}`)
      for (const s of rest) {
        expect([s.bhk, s.facing, s.areaSft], `${t.id} flat ${s.flatNo}`).toEqual([
          first.bhk,
          first.facing,
          first.areaSft,
        ])
        expect(rooms(s.flatNo), `${t.id} flat ${s.flatNo}`).toEqual(rooms(first.flatNo))
      }
    }
  })

  it('keeps look-alike variants separate because a printed value differs', () => {
    const rooms = (b, n) => JSON.stringify(getRooms(b, n))
    expect(rooms('A', 9)).not.toBe(rooms('A', 7))
    expect(rooms('B', 9)).not.toBe(rooms('B', 8))
    expect(rooms('C', 13)).not.toBe(rooms('C', 12))
  })

  it('has no overall dimensions until official values are supplied', () => {
    for (const t of PLAN_TYPES) {
      expect(hasOverallDimensions(t), t.id).toBe(false)
      expect(
        Object.values(t.overall).every((v) => v === null),
        t.id,
      ).toBe(true)
    }
  })
})

describe('published widths', () => {
  it('reads balcony and wash widths verbatim from the printed room labels', () => {
    expect(publishedWidths('A', 6)).toEqual([
      { kind: 'Balcony', width: `4'6"`, printed: `4'6" WIDE BALCONY` },
      { kind: 'Wash', width: "4'", printed: "4' WIDE WASH" },
    ])
    expect(publishedWidths('A', 1)).toEqual([{ kind: 'Wash / balcony', width: "4'", printed: "4' WIDE WASH/BALCONY" }])
    expect(publishedWidths('C', 9)).toContainEqual({ kind: 'Wash / balcony', width: "5'", printed: "5' WASH/BALCONY" })
    expect(publishedWidths('B', 1).map((w) => w.width)).toEqual(["5'", "5'", `4'4"`])
  })

  it('finds at least one printed width for every flat and never invents one', () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const widths = publishedWidths(b.id, s.flatNo)
        expect(widths.length, `${b.id}-${s.flatNo}`).toBeGreaterThan(0)
        const printed = getRooms(b.id, s.flatNo).map((r) => r.name)
        for (const w of widths) expect(printed).toContain(w.printed)
      }
  })

  it('looks plan types up by flat', () => {
    expect(getPlanType('C', 13)?.id).toBe('C2*')
    expect(getPlanType('B', 9)?.id).toBe('B5')
    expect(getPlanType('A', 99)).toBeUndefined()
  })
})
