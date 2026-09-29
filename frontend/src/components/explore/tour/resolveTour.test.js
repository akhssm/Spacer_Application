import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { apartments, blocks } from '@/data'
import { paths } from '@/routes/paths'
import { apartmentTour, resolveTour, stepStop } from '@/components/explore/tour/resolveTour'
import { getTourForApartment, sceneMedia, tours } from '@/components/explore/tour/tours'

describe('tour URLs', () => {
  it("builds the tour URL on the apartment's explorer path", () => {
    expect(paths.tour({ blockId: 'A', floor: 3, apartmentId: 'A-0305' })).toBe(
      '/ira-towers/explore/A/03/A-0305?view=tour',
    )
    expect(paths.tour({ blockId: 'A', floor: 3, apartmentId: 'A-0305', room: 'bedroom-2' })).toBe(
      '/ira-towers/explore/A/03/A-0305?view=tour&room=bedroom-2',
    )
  })
})

describe('resolveTour', () => {
  it('opens the requested room', () => {
    const r = resolveTour({ blockId: 'A', floor: '03', apartmentId: 'A-0305', room: 'kitchen' })
    expect(r).toMatchObject({ kind: 'ok', apartment: { id: 'A-0305' }, stop: { scene: { key: 'kitchen' } } })
  })

  it('opens the first room when none is given', () => {
    expect(resolveTour({ blockId: 'A', floor: '03', apartmentId: 'A-0305' })).toEqual({
      kind: 'redirect',
      to: '/ira-towers/explore/A/03/A-0305?view=tour&room=living',
    })
  })

  it('falls back to the first room, with a notice, for an unknown room', () => {
    const r = resolveTour({ blockId: 'C', floor: '05', apartmentId: 'C-0501', room: 'attic' })
    expect(r).toMatchObject({ kind: 'redirect', to: '/ira-towers/explore/C/05/C-0501?view=tour&room=living' })
    expect(r.kind === 'redirect' && r.notice).toMatch(/attic/)
  })

  it('canonicalises room case silently', () => {
    expect(resolveTour({ blockId: 'A', floor: '03', apartmentId: 'A-0305', room: 'Kitchen' })).toEqual({
      kind: 'redirect',
      to: '/ira-towers/explore/A/03/A-0305?view=tour&room=kitchen',
    })
  })

  it('canonicalises the apartment URL, keeping the tour and room', () => {
    expect(resolveTour({ blockId: 'a', floor: '3', apartmentId: 'a-0305', room: 'kitchen' })).toEqual({
      kind: 'redirect',
      to: '/ira-towers/explore/A/03/A-0305?view=tour&room=kitchen',
    })
    expect(resolveTour({ blockId: 'B', floor: '05', apartmentId: 'A-0505' })).toEqual({
      kind: 'redirect',
      to: '/ira-towers/explore/A/05/A-0505?view=tour',
    })
  })

  it('needs an apartment — block or floor level goes back there with a notice', () => {
    expect(resolveTour({ blockId: 'A', floor: '03' })).toMatchObject({
      kind: 'redirect',
      to: '/ira-towers/explore/A/03',
      notice: expect.stringMatching(/apartment/),
    })
    expect(resolveTour({ blockId: 'A' })).toMatchObject({ kind: 'redirect', to: '/ira-towers/explore/A' })
    expect(resolveTour({})).toMatchObject({ kind: 'redirect', to: '/ira-towers/explore' })
  })

  it('falls back like the explorer for things that do not exist', () => {
    expect(resolveTour({ blockId: 'D' })).toMatchObject({
      kind: 'redirect',
      to: '/ira-towers/explore',
      notice: expect.any(String),
    })
    expect(resolveTour({ blockId: 'A', floor: '03', apartmentId: 'A-0399' })).toMatchObject({
      kind: 'redirect',
      to: '/ira-towers/explore/A/03',
    })
  })

  it('steps through rooms in strip order, wrapping', () => {
    const r = resolveTour({ blockId: 'A', floor: '03', apartmentId: 'A-0305', room: 'living' })
    if (r.kind !== 'ok') throw new Error('expected ok')
    const stops = r.tour.stops
    expect(stepStop(stops, 'living', -1).scene.key).toBe(stops[stops.length - 1].scene.key)
    expect(stepStop(stops, 'living', 1).scene.key).toBe(stops[1].scene.key)
  })
})

describe('sample tours', () => {
  it('has exactly one sample tour per BHK type, both clearly marked', () => {
    expect(tours.map((t) => t.bhk).sort()).toEqual([2, 3])
    for (const t of tours) expect(t.media).toBe('final')
  })

  it('selects the tour from each apartment BHK, even within the same block', () => {
    const blockA = blocks.find((block) => block.id === 'A')
    const twoBhk = blockA.stacks.find((stack) => stack.flatNo === 2)
    const threeBhk = blockA.stacks.find((stack) => stack.flatNo === 1)

    expect(getTourForApartment(twoBhk).id).toBe('sample-2bhk')
    expect(getTourForApartment(threeBhk).id).toBe('sample-3bhk')
  })

  it('has unique scene keys and links only to its own scenes', () => {
    for (const t of tours) {
      const keys = t.scenes.map((s) => s.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const s of t.scenes) for (const l of s.links) expect(keys, `${t.id}/${s.key} → ${l.to}`).toContain(l.to)
    }
  })

  // The reference clips are kept locally, not in the repo; check the citations wherever they are present.
  it.skipIf(!existsSync(path.resolve('docs/2bhk')) || !existsSync(path.resolve('docs/3bhk')))(
    'cites a walkthrough clip that exists for every scene',
    () => {
      for (const t of tours)
        for (const s of t.scenes) expect(existsSync(path.resolve(s.reference.clip)), s.reference.clip).toBe(true)
    },
  )

  it('ships every media file at its fixed path', () => {
    for (const t of tours)
      for (const s of t.scenes)
        for (const file of Object.values(sceneMedia(t.id, s.key)))
          expect(existsSync(path.resolve('public' + file)), file).toBe(true)
  })

  it('pins every scene to a printed room on every apartment of its type', () => {
    for (const b of blocks)
      for (const s of b.stacks) {
        const t = getTourForApartment(s)
        const bound = apartmentTour(b.id, s.flatNo, t)
        for (const stop of bound.stops) expect(stop.planRoom, `${b.id}-${s.flatNo} ${stop.scene.key}`).toBeDefined()
      }
  })

  it('covers every apartment', () => {
    for (const a of apartments) expect(getTourForApartment(a)).toBeDefined()
  })
})
