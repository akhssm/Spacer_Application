import { useEffect, useSyncExternalStore } from 'react'
import { MoonIcon, PauseIcon, PlayIcon, SunIcon, XIcon } from 'lucide-react'
import { ImpressionTag } from '@/components/media/BrochureImage'
import { brochureAssets } from '@/data'
import { cn } from '@/utils/cn'
import {
  SKETCH_INTRO_S,
  STORY_END,
  STORY_STAGES,
  activeStage,
  advance,
  impressionOpacity,
  smoothstep,
} from '@/components/explore/three/story'

/**
 * "From plan to tower" controls over the 3D view: play / pause, the four stages, a scrubber, and
 * the current stage's caption. Autoplay runs here (requestAnimationFrame) and writes `t` to the
 * store; the 3D layers read it each frame.
 */
export function StoryTimeline({ story, onClose, desktop }) {
  const { t, playing } = useSyncExternalStore(story.subscribe, story.get)
  const stage = activeStage(t)
  const s = STORY_STAGES[stage]

  // The line drawing sketches itself in once, when the story opens.
  useEffect(() => {
    if (story.get().sketch >= 1) return
    const start = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const k = Math.min(1, (now - start) / 1000 / SKETCH_INTRO_S)
      story.set({ sketch: smoothstep(0, 1, k) })
      if (k < 1) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [story])

  const sketching = useSyncExternalStore(story.subscribe, () => story.get().sketch < 1)
  useEffect(() => {
    if (!playing || sketching) return
    let hold = 0
    let last = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const next = advance({ t: story.get().t, hold }, dt)
      hold = next.hold
      story.set({ t: next.t, playing: !next.done })
      if (!next.done) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [playing, sketching, story])

  const toggle = () => story.set(t >= STORY_END && !playing ? { t: 0, playing: true } : { playing: !playing })
  const jump = (i) => story.set({ t: i, playing: false })

  return (
    <>
      {/* Stage caption (bottom left on desktop, above the panel on phones) */}
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute z-(--z-dock) flex items-baseline gap-3 rounded-2xl bg-navy-950/75 px-4 py-2 backdrop-blur-md',
          desktop
            ? 'bottom-8 left-6 max-w-[calc(50vw-21rem)]'
            : 'inset-x-3 bottom-[calc(10rem+env(safe-area-inset-bottom))]',
        )}
      >
        <span className="font-display text-5xl text-gold-300/90 italic" aria-hidden="true">
          {s.n}
        </span>
        <span className="grid">
          <span className="eyebrow text-[0.6rem] text-gold-300">{s.title}</span>
          <span className="text-base text-white">{s.caption}</span>
          <span className="text-xs text-white/60">{s.detail}</span>
        </span>
      </div>

      <div
        role="group"
        aria-label="From plan to tower"
        className={cn(
          'absolute z-(--z-drawer) grid gap-2 rounded-2xl border border-white/10 bg-navy-950/85 p-3 shadow-float backdrop-blur-xl',
          desktop
            ? 'bottom-8 left-1/2 w-[min(40rem,calc(100vw-30rem))] -translate-x-1/2'
            : 'inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause' : t >= STORY_END ? 'Replay' : 'Play'}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-navy-950 transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:outline-none"
          >
            {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4 translate-x-px" />}
          </button>
          <ol className="grid flex-1 grid-cols-4 gap-1">
            {STORY_STAGES.map((st, i) => (
              <li key={st.n}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-label={`${st.n} ${st.title}`}
                  aria-current={stage === i ? 'step' : undefined}
                  className={cn(
                    'grid w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:outline-none',
                    stage === i ? 'text-white' : 'text-white/50',
                  )}
                >
                  <span
                    className={cn(
                      'font-numeric',
                      desktop ? 'text-[0.65rem]' : 'text-center text-base',
                      stage === i ? 'text-sun-400' : 'text-white/40',
                    )}
                  >
                    {st.n}
                  </span>
                  {/* Phones: numbers only — the caption above names the stage. */}
                  {desktop && <span className="truncate text-sm">{st.title}</span>}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close From plan to tower"
            title="Close"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={STORY_END}
          step={0.001}
          value={t}
          onChange={(e) => story.set({ t: Number(e.target.value), playing: false })}
          aria-label="Stage"
          aria-valuetext={`${s.n} ${s.title}`}
          className="h-6 w-full cursor-pointer accent-sun-400"
        />
        <p className="text-center text-[0.65rem] tracking-[0.16em] text-white/45 uppercase">
          {desktop
            ? 'Drag to orbit · scroll to zoom · scrub to transform'
            : 'Drag to orbit · pinch to zoom · scrub to transform'}{' '}
          · schematic, not to scale
        </p>
      </div>
    </>
  )
}

/**
 * Stage 04: the brochure's own artistic impressions on a presentation card over the model —
 * day (p5, building over sky) and dusk (p14). Shown at their published size, never upscaled.
 */
export function StoryImpression({ story, desktop }) {
  const { t, dusk } = useSyncExternalStore(story.subscribe, story.get)
  const opacity = impressionOpacity(t)
  if (opacity <= 0.001) return null
  const day = brochureAssets['elevation-day-building']
  const sky = brochureAssets['elevation-day-sky']
  const night = brochureAssets['elevation-night']
  const shown = dusk ? night : day

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-(--z-overlay) grid place-items-center px-4',
        desktop ? 'pt-24 pb-44' : 'pt-40 pb-72',
      )}
      style={{ opacity }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-navy-950/60" />
      <figure
        className={cn('relative grid gap-2', opacity > 0.6 && 'pointer-events-auto')}
        // Never wider than the published image, nor taller than the space between the chrome.
        style={{ width: `min(100%, ${shown.width}px, calc(${desktop ? 58 : 40}svh * ${shown.width / shown.height}))` }}
      >
        <div
          className="relative overflow-hidden rounded-xl shadow-float"
          style={{ aspectRatio: `${shown.width} / ${shown.height}` }}
        >
          {/* Day: the brochure's building layer over its own sky, as composed on p5. */}
          <img
            src={sky.variants.at(-1).src}
            alt=""
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500',
              dusk && 'opacity-0',
            )}
          />
          <img
            src={day.variants.at(-1).src}
            alt={day.alt}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500',
              dusk && 'opacity-0',
            )}
          />
          <img
            src={night.variants.at(-1).src}
            alt={dusk ? night.alt : ''}
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500',
              !dusk && 'opacity-0',
            )}
          />
          <ImpressionTag className="absolute top-3 left-3" />
        </div>
        <figcaption className="flex items-center justify-between gap-3 text-xs text-white/70">
          <span>
            {shown.alt} · brochure p{shown.page}
          </span>
          <span
            role="radiogroup"
            aria-label="Time of day"
            className="flex shrink-0 gap-1 rounded-full border border-white/15 bg-navy-950/80 p-0.5"
          >
            {[false, true].map((d) => (
              <button
                key={String(d)}
                type="button"
                role="radio"
                aria-checked={dusk === d}
                onClick={() => story.set({ dusk: d })}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full px-3 transition-colors',
                  dusk === d ? 'bg-white text-navy-950' : 'text-white/70 hover:text-white',
                )}
              >
                {d ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
                {d ? 'Dusk' : 'Day'}
              </button>
            ))}
          </span>
        </figcaption>
      </figure>
    </div>
  )
}
