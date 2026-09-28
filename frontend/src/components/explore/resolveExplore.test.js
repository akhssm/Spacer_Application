import { describe, expect, it } from 'vitest'
import { resolveExplore } from '@/components/explore/resolveExplore'

describe('explorer deep links', () => {
  it('resolves each level', () => {
    expect(resolveExplore({})).toEqual({ kind: 'ok' })
    expect(resolveExplore({ blockId: 'A' })).toMatchObject({ kind: 'ok', block: { id: 'A' } })
    expect(resolveExplore({ blockId: 'B', floor: '07' })).toMatchObject({ kind: 'ok', floor: { id: 'B-07' } })
    expect(resolveExplore({ blockId: 'C', floor: '10', apartmentId: 'C-1013' })).toMatchObject({
      kind: 'ok',
      apartment: { id: 'C-1013', flatNo: 13, areaSft: 1840 },
    })
  })

  it('canonicalises case and floor padding', () => {
    expect(resolveExplore({ blockId: 'a' })).toEqual({ kind: 'canonical', to: '/ira-towers/explore/A' })
    expect(resolveExplore({ blockId: 'b', floor: '3' })).toEqual({ kind: 'canonical', to: '/ira-towers/explore/B/03' })
    expect(resolveExplore({ blockId: 'A', floor: '3', apartmentId: 'a-0305' })).toEqual({
      kind: 'canonical',
      to: '/ira-towers/explore/A/03/A-0305',
    })
    expect(resolveExplore({ blockId: 'A', floor: '03', apartmentId: 'a-0305' })).toEqual({
      kind: 'canonical',
      to: '/ira-towers/explore/A/03/A-0305',
    })
  })

  it('redirects a real apartment reached through the wrong block or floor', () => {
    expect(resolveExplore({ blockId: 'A', floor: '03', apartmentId: 'A-0505' })).toEqual({
      kind: 'canonical',
      to: '/ira-towers/explore/A/05/A-0505',
    })
    expect(resolveExplore({ blockId: 'B', floor: '05', apartmentId: 'A-0505' })).toEqual({
      kind: 'canonical',
      to: '/ira-towers/explore/A/05/A-0505',
    })
  })

  it('falls back to the deepest valid level with an explanation', () => {
    expect(resolveExplore({ blockId: 'D' })).toMatchObject({ kind: 'fallback', to: '/ira-towers/explore' })
    expect(resolveExplore({ blockId: 'A', floor: '11' })).toMatchObject({
      kind: 'fallback',
      to: '/ira-towers/explore/A',
    })
    expect(resolveExplore({ blockId: 'A', floor: '00' })).toMatchObject({
      kind: 'fallback',
      to: '/ira-towers/explore/A',
    })
    expect(resolveExplore({ blockId: 'A', floor: 'top' })).toMatchObject({
      kind: 'fallback',
      to: '/ira-towers/explore/A',
    })
    // Block C has 14 flats per floor; flat 15 does not exist. Block A has 11.
    expect(resolveExplore({ blockId: 'C', floor: '02', apartmentId: 'C-0215' })).toMatchObject({
      kind: 'fallback',
      to: '/ira-towers/explore/C/02',
    })
    expect(resolveExplore({ blockId: 'A', floor: '02', apartmentId: 'A-0212' })).toMatchObject({
      kind: 'fallback',
      to: '/ira-towers/explore/A/02',
    })
  })

  it('never resolves apartments the typical floor plan does not support (Block C declared 154)', () => {
    // 154 would imply an 11th residential floor; the provisional model has floors 01–10 only.
    expect(resolveExplore({ blockId: 'C', floor: '11', apartmentId: 'C-1101' })).toMatchObject({ kind: 'fallback' })
  })
})
