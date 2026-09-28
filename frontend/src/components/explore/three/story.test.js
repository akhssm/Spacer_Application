import { describe, expect, it } from 'vitest'
import {
  PLAY_HOLD_S,
  PLAY_TRANSITION_S,
  STORY_END,
  STORY_STAGES,
  activeStage,
  advance,
  containFit,
  createStoryStore,
  floorGrowth,
  impressionOpacity,
  lineOpacity,
  planOpacity,
} from '@/components/explore/three/story'

describe('plan-to-tower story', () => {
  it('has four stages, 0 to 3', () => {
    expect(STORY_STAGES.map((s) => s.n)).toEqual(['01', '02', '03', '04'])
    expect(STORY_END).toBe(3)
  })

  it('lights the stage that has been reached', () => {
    expect(activeStage(0)).toBe(0)
    expect(activeStage(0.6)).toBe(0)
    expect(activeStage(0.7)).toBe(1)
    expect(activeStage(2)).toBe(2)
    expect(activeStage(3)).toBe(3)
  })

  it('keeps the line drawing whole at the sketch stage, a faint outline over the massing, then drops them', () => {
    expect(lineOpacity(0.5)).toBe(1)
    expect(lineOpacity(1.4)).toBeCloseTo(0.2)
    expect(lineOpacity(2)).toBe(0)
  })

  it('grows floors bottom-up during the massing', () => {
    expect(floorGrowth(0.5, 0, 10)).toBe(0)
    expect(floorGrowth(1, 10, 10)).toBe(1)
    expect(floorGrowth(0.75, 1, 10)).toBe(1) // halfway: the stilt and lower floors are up…
    expect(floorGrowth(0.75, 9, 10)).toBe(0) // …the top ones are not
    expect(floorGrowth(3, 5, 10)).toBe(1)
  })

  it('brings in the printed plans, then the impression', () => {
    expect(planOpacity(1)).toBe(0)
    expect(planOpacity(2)).toBe(1)
    expect(impressionOpacity(2)).toBe(0)
    expect(impressionOpacity(3)).toBe(1)
  })

  it('plays through each stage with a pause, and stops at the end', () => {
    let p = { t: 0, hold: 0 }
    p = advance(p, PLAY_TRANSITION_S * 0.5)
    expect(p.t).toBeCloseTo(0.5)
    p = advance(p, PLAY_TRANSITION_S * 0.6)
    expect(p).toMatchObject({ t: 1, hold: PLAY_HOLD_S, done: false })
    p = advance(p, PLAY_HOLD_S / 2)
    expect(p.t).toBe(1)
    const end = advance({ t: 2.95, hold: 0 }, 1)
    expect(end).toEqual({ t: 3, hold: 0, done: true })
  })

  it('never distorts a printed plan when fitting it on a tile', () => {
    const [w, d] = containFit(4, 2, 1.6)
    expect(w / d).toBeCloseTo(1.6)
    expect(w).toBeLessThanOrEqual(4)
    expect(d).toBeLessThanOrEqual(2)
    const [w2, d2] = containFit(2, 2, 1.6)
    expect([w2, d2]).toEqual([2, 1.25])
  })

  it('notifies subscribers of changes', () => {
    const s = createStoryStore({ t: 0, playing: false, dusk: false, sketch: 1 })
    let n = 0
    s.subscribe(() => n++)
    s.set({ t: 1 })
    expect(s.get()).toEqual({ t: 1, playing: false, dusk: false, sketch: 1 })
    expect(n).toBe(1)
  })
})
