import { describe, expect, it } from 'vitest'
import { fitPadding } from '@/components/explore/map/camera'
import { mapHref, mapSearch, parseMapSearch } from '@/components/explore/map/mapUrl'

describe('map URL', () => {
  it('parses block, block + flat, and block + flat + floor', () => {
    expect(parseMapSearch('?block=C')).toEqual({ kind: 'block', blockId: 'C' })
    expect(parseMapSearch('?block=c&flat=9')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 9 })
    expect(parseMapSearch('?block=C&flat=9&floor=5')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 9, level: 5 })
    expect(parseMapSearch('')).toBeUndefined()
  })

  it('accepts zero-padded flat and floor numbers and writes them back unpadded', () => {
    expect(parseMapSearch('?block=C&flat=09')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 9 })
    expect(parseMapSearch('?block=C&flat=09&floor=05')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 9, level: 5 })
    expect(parseMapSearch('?block=A&flat=01&floor=03')).toEqual({ kind: 'flat', blockId: 'A', flatNo: 1, level: 3 })
    expect(parseMapSearch('?block=A&flat=011&floor=010')).toEqual({ kind: 'flat', blockId: 'A', flatNo: 11, level: 10 })
    expect(mapSearch(parseMapSearch('?block=C&flat=09&floor=05'))).toBe('?block=C&flat=9&floor=5')
    for (const q of [
      '?block=A&flat=00',
      '?block=A&flat=000',
      '?block=A&flat=012',
      '?block=A&flat=01&floor=00',
      '?block=A&flat=01&floor=011',
      '?block=A&flat=0001',
      '?block=A&flat=09.0',
      '?block=A&flat=+9',
      '?block=A&flat= 9',
    ])
      expect(parseMapSearch(q), q).toBeUndefined()
  })

  it('falls back to no selection for anything invalid', () => {
    for (const q of [
      '?block=D',
      '?block=',
      '?block=A&flat=12', // Block A has 11 flats
      '?block=A&flat=0',
      '?block=A&flat=1.5',
      '?block=A&flat=-1',
      '?block=A&flat=abc',
      '?block=A&flat=01x',
      '?block=A&flat=1&floor=11', // C+S+10
      '?block=A&flat=1&floor=0',
      '?block=A&flat=1&floor=x',
      '?block=A&floor=3', // floor without flat
      '?flat=3',
    ])
      expect(parseMapSearch(q), q).toBeUndefined()
    expect(parseMapSearch('?block=C&flat=14&floor=10')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 14, level: 10 })
  })

  it('serialises only blocks, flats and floors, and round-trips', () => {
    expect(mapSearch(undefined)).toBe('')
    expect(mapSearch({ kind: 'clubhouse' })).toBe('')
    expect(mapSearch({ kind: 'amenity', id: 'lawns' })).toBe('')
    expect(mapSearch({ kind: 'block', blockId: 'B' })).toBe('?block=B')
    expect(mapHref({ kind: 'flat', blockId: 'C', flatNo: 9, level: 5 })).toBe(
      '/ira-towers/explore/map?block=C&flat=9&floor=5',
    )
    for (const s of [
      { kind: 'block', blockId: 'A' },
      { kind: 'flat', blockId: 'B', flatNo: 11 },
      { kind: 'flat', blockId: 'C', flatNo: 13, level: 2 },
    ])
      expect(parseMapSearch(mapSearch(s))).toEqual(s)
  })
})

describe('camera fit padding', () => {
  it('adds the full breathing room when there is space', () => {
    expect(fitPadding({ top: 100, right: 400, bottom: 30, left: 400 }, 48, 1440, 900)).toEqual({
      top: 148,
      right: 448,
      bottom: 78,
      left: 448,
    })
  })

  it('never leaves less than 30% of the map for the fit on a phone with a sheet open', () => {
    const h = 844
    const p = fitPadding({ top: 128, right: 64, bottom: Math.round(h * 0.45), left: 12 }, 72, 390, h)
    expect(h - p.top - p.bottom).toBeGreaterThanOrEqual(h * 0.3 - 1e-9)
    expect(p.top).toBeGreaterThanOrEqual(128)
    expect(p.bottom).toBeGreaterThanOrEqual(Math.round(h * 0.45))
  })

  it('scales the panels down when they alone would cover the map', () => {
    const p = fitPadding({ top: 400, right: 0, bottom: 400, left: 0 }, 50, 400, 800)
    expect(800 - p.top - p.bottom).toBeCloseTo(240, 6)
    expect(p.top).toBeCloseTo(p.bottom, 6)
  })
})
