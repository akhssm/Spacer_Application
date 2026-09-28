/**
 * "From plan to tower": a four-stage timeline over the schematic 3D view, in the spirit of an
 * architect's model — every stage shows only brochure material:
 *
 *   0  Sketch      the flats of every floor as lines over the brochure master plan (p6, C+S+10 p3)
 *   1  Massing     the existing schematic blocks rise floor by floor
 *   2  Typical floor  each flat's own printed plan (p10–12) on the roof of its stack
 *   3  Impression  the brochure's artistic impressions (p5 day, p14 dusk)
 *
 * `t` runs continuously from 0 to 3; every visual below is a pure function of it (unit-tested).
 */

export const STORY_STAGES = [
  { n: '01', title: 'Sketch', caption: 'The site in line.', detail: 'Master plan (p6) · every flat, every floor' },
  {
    n: '02',
    title: 'Massing',
    caption: 'Space takes shape.',
    detail: 'Stilt + 10 floors (p3) · schematic, not to scale',
  },
  {
    n: '03',
    title: 'Typical floor',
    caption: 'Every home, planned.',
    detail: 'Each flat as printed on the typical floor plans (p10–12)',
  },
  {
    n: '04',
    title: 'Artistic impression',
    caption: 'A place to come home to.',
    detail: 'Brochure renders (p5 day · p14 dusk)',
  },
]

export const STORY_END = STORY_STAGES.length - 1

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const smoothstep = (a, b, v) => {
  const k = clamp01((v - a) / (b - a))
  return k * k * (3 - 2 * k)
}

/** Stage whose label is lit: the nearest one reached. */
export const activeStage = (t) => Math.min(STORY_END, Math.max(0, Math.floor(t + 0.35)))

/** Seconds for the line drawing to sketch itself in when the story opens (bottom floors first). */
export const SKETCH_INTRO_S = 1.8

/** Line opacity: full while sketching, a faint outline over the massing, gone on the plans. */
export const lineOpacity = (t) =>
  t <= 0.8 ? 1 : t <= 1.4 ? 1 - 0.8 * smoothstep(0.8, 1.4, t) : 0.2 * (1 - smoothstep(1.4, 2, t))

/**
 * How far a floor has risen (0–1). Floors grow one after another between t = 0.5 and 1, stilt
 * (level 0) first; with `floors` residential levels above it.
 */
export function floorGrowth(t, level, floors) {
  const s = clamp01((t - 0.5) / 0.5) * (floors + 1)
  return clamp01(s - level)
}

/** The printed plans fade in on the roofs. */
export const planOpacity = (t) => smoothstep(1.35, 2, t)

/** The artistic impression card fades in over the model. */
export const impressionOpacity = (t) => smoothstep(2.35, 3, t)

/** Autoplay: seconds per transition, and the pause on each stage. */
export const PLAY_TRANSITION_S = 2.4
export const PLAY_HOLD_S = 1.4

/** Advances autoplay by `dt` seconds; stops (returns done) at the last stage. */
export function advance(p, dt) {
  if (p.hold > 0) return { t: p.t, hold: Math.max(0, p.hold - dt), done: false }
  const next = p.t + dt / PLAY_TRANSITION_S
  const crossed = Math.floor(next) > Math.floor(p.t + 1e-9)
  if (next >= STORY_END) return { t: STORY_END, hold: 0, done: true }
  if (crossed) return { t: Math.floor(next), hold: PLAY_HOLD_S, done: false }
  return { t: next, hold: 0, done: false }
}

export function createStoryStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

/**
 * Fits a plan crop of aspect `planAspect` (width / height) inside a tile of `w` × `d` without
 * distorting it — the printed drawing is never stretched.
 */
export function containFit(w, d, planAspect) {
  return w / d > planAspect ? [d * planAspect, d] : [w, w / planAspect]
}
