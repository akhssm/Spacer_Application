import { describe, expect, it } from 'vitest'
import { searchSelection } from '@/components/explore/map/search'

describe('apartment search', () => {
  it('finds apartments by provisional ID, with or without the dash', () => {
    const c0509 = { kind: 'flat', blockId: 'C', flatNo: 9, level: 5 }
    for (const q of ['C-0509', 'c0509', 'C 0509', ' c-0509 ', 'C509', 'Block C 0509'])
      expect(searchSelection(q), q).toEqual(c0509)
    expect(searchSelection('A-1011')).toEqual({ kind: 'flat', blockId: 'A', flatNo: 11, level: 10 })
  })

  it('finds a flat (no floor) and a block', () => {
    expect(searchSelection('C-09')).toEqual({ kind: 'flat', blockId: 'C', flatNo: 9 })
    expect(searchSelection('b6')).toEqual({ kind: 'flat', blockId: 'B', flatNo: 6 })
    expect(searchSelection('Block A')).toEqual({ kind: 'block', blockId: 'A' })
    expect(searchSelection('c')).toEqual({ kind: 'block', blockId: 'C' })
  })

  it('never returns something that does not exist', () => {
    for (const q of ['', 'D-0101', 'A-0112', 'A-1101', 'A-0001', 'B-12', 'C-15', 'hello', '0509', 'A--0101', 'Block'])
      expect(searchSelection(q), q).toBeUndefined()
  })
})
