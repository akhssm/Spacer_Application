import { describe, expect, it } from 'vitest'
import { parseViewerSearch, viewerSearch } from '@/components/viewer/viewerUrl'
import { getProject } from '@/services/projects'

const { blocks, plots } = getProject('ira-towers').layout
const parse = (search) => parseViewerSearch(search, blocks, plots)
const none = { block: null, tower: null, floor: null }

describe('viewer URL', () => {
  it('reads a block, a tower of it, and a floor of that tower', () => {
    expect(parse('?block=A')).toEqual({ block: 'Block A', tower: null, floor: null })
    expect(parse('?block=a&tower=a-01')).toEqual({ block: 'Block A', tower: 'A-01', floor: null })
    expect(parse('?block=A&tower=A-01&floor=4')).toEqual({ block: 'Block A', tower: 'A-01', floor: 4 })
    expect(parse('?block=C&tower=C-12A&floor=10')).toEqual({ block: 'Block C', tower: 'C-12A', floor: 10 })
  })

  it('keeps two towers on the same floor apart', () => {
    expect(parse('?block=A&tower=A-01&floor=4')).not.toEqual(parse('?block=A&tower=A-02&floor=4'))
  })

  it('never reads a floor without its tower', () => {
    expect(parse('?block=A&floor=4')).toEqual({ block: 'Block A', tower: null, floor: null })
  })

  it('takes the block from the tower, and drops what is invalid', () => {
    expect(parse('?block=B&tower=A-03')).toEqual({ block: 'Block A', tower: 'A-03', floor: null })
    expect(parse('?tower=B-06&floor=2')).toEqual({ block: 'Block B', tower: 'B-06', floor: 2 })
    expect(parse('')).toEqual(none)
    expect(parse('?block=Z')).toEqual(none)
    expect(parse('?block=A&tower=A-99&floor=4')).toEqual({ block: 'Block A', tower: null, floor: null })
    expect(parse('?block=A&tower=Club House')).toEqual({ block: 'Block A', tower: null, floor: null })
    expect(parse('?block=B&tower=B-01&floor=11')).toEqual({ block: 'Block B', tower: 'B-01', floor: null })
    expect(parse('?block=B&tower=B-01&floor=0')).toEqual({ block: 'Block B', tower: 'B-01', floor: null })
  })

  it('writes the canonical query and reads every tower floor back', () => {
    expect(viewerSearch({ block: null }, blocks)).toBe('')
    expect(viewerSearch({ block: 'Block A' }, blocks)).toBe('?block=A')
    expect(viewerSearch({ block: 'Block A', floor: 4 }, blocks)).toBe('?block=A')
    expect(viewerSearch({ block: 'Block A', tower: 'A-01', floor: 4 }, blocks)).toBe('?block=A&tower=A-01&floor=4')
    const towers = plots.filter((p) => p.kind !== 'amenity')
    expect(towers).toHaveLength(36)
    for (const t of towers)
      for (let floor = 1; floor <= 10; floor++)
        expect(parse(viewerSearch({ block: t.zone, tower: t.number, floor }, blocks))).toEqual({
          block: t.zone,
          tower: t.number,
          floor,
        })
  })

  it('falls back to block names for projects without block IDs', () => {
    const named = [{ name: 'Tower 1', floors: 4 }]
    const namedPlots = [{ number: 'T1-01', zone: 'Tower 1' }]
    expect(viewerSearch({ block: 'Tower 1', tower: 'T1-01', floor: 2 }, named)).toBe(
      '?block=Tower+1&tower=T1-01&floor=2',
    )
    expect(parseViewerSearch('?block=Tower+1&tower=T1-01&floor=2', named, namedPlots)).toEqual({
      block: 'Tower 1',
      tower: 'T1-01',
      floor: 2,
    })
  })
})
