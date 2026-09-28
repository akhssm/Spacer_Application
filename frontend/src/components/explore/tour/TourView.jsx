import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  HandIcon,
  ImagesIcon,
  InfoIcon,
  LayoutPanelTopIcon,
  MapPinIcon,
  Maximize2Icon,
  MaximizeIcon,
  Minimize2Icon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Share2Icon,
  XIcon,
} from 'lucide-react'
import { project } from '@/data'
import { floorPlanGeometry } from '@/data/floorPlan'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { webglUnavailableReason } from '@/components/explore/three/webgl'
import { createLookStore } from '@/components/explore/tour/lookStore'
import { stepStop } from '@/components/explore/tour/resolveTour'
import { RoomStrip } from '@/components/explore/tour/RoomStrip'
import { TourMinimap } from '@/components/explore/tour/TourMinimap'

/** three.js / R3F load with the tour, never with the 2D explorer. */
const PanoramaCanvas = lazy(() => import('@/components/explore/tour/PanoramaCanvas'))

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Full-screen virtual tour of one apartment, laid out like the reference tour: the flat's plan as a
 * map (top left), fullscreen / share (top right), and a bottom bar with the current room, Rooms
 * (thumbnail strip), Floor plan (map on/off) and More (autorotate, zoom, reset, about).
 */
export function TourView({ resolution }) {
  const { apartment, tour, stop } = resolution
  const { stops } = tour
  const scene = stop.scene
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state
  const desktop = useMediaQuery('(min-width: 1024px)')
  const reduce = !!useReducedMotion()
  const root = useRef(null)
  const panorama = useRef(null)

  const [look] = useState(() =>
    createLookStore({
      yaw: scene.initialView.yaw,
      pitch: 0,
      fov: scene.initialView.fov,
      shownFov: scene.initialView.fov,
    }),
  )
  const [status, setStatus] = useState('loading')
  const [webgl] = useState(webglUnavailableReason)
  const [crashed, setCrashed] = useState()
  const [mapOpen, setMapOpen] = useState(true)
  const [mapLarge, setMapLarge] = useState(false)
  const [stripOpen, setStripOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [autorotate, setAutorotate] = useState(false)
  const [hint, setHint] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState(state?.notice)

  const placeholder = tour.tour.media === 'placeholder'
  const unsupported = webgl ?? crashed
  const doc = typeof document === 'undefined' ? undefined : document
  const canFullscreen = !!doc && !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)

  const go = useCallback(
    (key) => {
      if (key === scene.key) return
      // Rooms replace each other in history: Back leaves the tour, as it was entered.
      navigate(
        paths.tour({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id, room: key }),
        {
          replace: true,
          state: { tourReturn: state?.tourReturn },
        },
      )
    },
    [navigate, apartment, scene.key, state?.tourReturn],
  )

  const exit = useCallback(() => {
    if (doc?.fullscreenElement) void doc.exitFullscreen().catch(() => undefined)
    if (state?.tourReturn) navigate(-1)
    else
      navigate(
        paths.explore({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id, view: '3d' }),
      )
  }, [doc, state?.tourReturn, navigate, apartment])

  useEffect(() => {
    document.title = `${scene.title} · Virtual tour · ${apartment.id} · ${project.name}`
  }, [scene.title, apartment.id])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 6000)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    if (!hint) return
    const t = setTimeout(() => setHint(false), 6000)
    return () => clearTimeout(t)
  }, [hint])

  useEffect(() => {
    const sync = () => setFullscreen(!!(doc?.fullscreenElement ?? doc?.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [doc])

  // Escape closes the innermost open panel, then leaves the tour.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (menuOpen) return setMenuOpen(false)
      if (stripOpen) return setStripOpen(false)
      if (mapLarge) return setMapLarge(false)
      exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, stripOpen, mapLarge, exit])

  // Keyboard users land in the panorama, ready to look around.
  useEffect(() => {
    root.current?.querySelector("[aria-roledescription='360° panorama']")?.focus({ preventScroll: true })
  }, [status])

  const toggleFullscreen = () => {
    if (!doc) return
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch(() => undefined)
      return
    }
    const el = root.current
    void (el?.requestFullscreen?.() ?? el?.webkitRequestFullscreen?.())?.catch(() => undefined)
  }

  const share = async () => {
    const url = window.location.href
    const title = `${scene.title} · ${apartment.id} virtual tour · ${project.name}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: `${project.name} · ${apartment.id} · ${apartment.bhk} BHK · sample virtual tour`,
          url,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setNotice("Copy this page's address to share the tour.")
    }
  }

  const prev = stepStop(stops, scene.key, -1)
  const next = stepStop(stops, scene.key, 1)
  const page = floorPlanGeometry[apartment.blockId].page
  const pop = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
        transition: { duration: 0.18 },
      }

  // Portalled to <body>: the explorer layout's header and fade must not sit on top of the tour.
  return createPortal(
    <section
      ref={root}
      aria-label={`Virtual tour of ${apartment.id}`}
      className="dark fixed inset-0 z-(--z-modal) overflow-hidden bg-black text-white [--tour-gap:0.75rem] sm:[--tour-gap:1rem]"
    >
      {/* Panorama */}
      {unsupported ? (
        <Fallback reason={unsupported} thumb={stop.media.thumb} title={scene.title} />
      ) : (
        <Suspense fallback={<Loading />}>
          <PanoramaCanvas
            stop={stop}
            stops={stops}
            autorotate={autorotate}
            reducedMotion={reduce}
            look={look}
            onNavigate={go}
            onStatus={setStatus}
            onFirstInteraction={() => setHint(false)}
            onError={setCrashed}
            apiRef={panorama}
            label={`${scene.title} — 360° view`}
          />
        </Suspense>
      )}
      {!unsupported && status === 'loading' && <Loading />}
      {!unsupported && status === 'error' && (
        <p
          role="alert"
          className="absolute inset-x-6 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-xl bg-navy-950/90 px-4 py-3 text-center text-sm"
        >
          The 360° image for {scene.title.toLowerCase()} could not be loaded.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {scene.title}, 360° view{placeholder ? ' — placeholder image' : ''}.
      </p>

      {/* Drag hint */}
      <AnimatePresence>
        {hint && !unsupported && status === 'ready' && (
          <motion.p
            key="hint"
            {...pop}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm backdrop-blur-sm"
          >
            <HandIcon className="size-4" />
            {desktop ? 'Drag to look around · scroll to zoom' : 'Swipe to look around · pinch to zoom'}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Placeholder / sample label — always on screen */}
      <div
        className={cn(
          'pointer-events-none absolute z-20 flex flex-col items-center gap-0.5 text-center',
          desktop
            ? 'top-(--tour-gap) left-1/2 -translate-x-1/2'
            : 'inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
          !desktop && (stripOpen || menuOpen) && 'hidden',
        )}
      >
        {placeholder && (
          <span className="rounded-full border border-sun-400/60 bg-black/70 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-sun-400 uppercase backdrop-blur-sm">
            Placeholder 360° · Sample {tour.tour.bhk} BHK
          </span>
        )}
        <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[0.65rem] text-white/80 backdrop-blur-sm">
          Representative sample interior — not {apartment.id}'s final design
        </span>
      </div>

      {/* Map (top left) */}
      <AnimatePresence>
        {mapOpen && (
          <motion.div
            key="map"
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, x: -12 },
                  animate: { opacity: 1, x: 0 },
                  exit: { opacity: 0, x: -12 },
                  transition: { duration: 0.18 },
                })}
            data-no-drag
            className={cn(
              'absolute top-(--tour-gap) left-(--tour-gap) z-20 rounded-2xl border border-white/10 bg-navy-950/65 p-2 shadow-float backdrop-blur-md',
              mapLarge ? 'w-[min(28rem,calc(100vw-5.5rem))]' : 'w-40 sm:w-60',
            )}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 pl-1">
              <p className="flex min-w-0 items-center gap-1 text-xs text-white">
                <MapPinIcon className="size-3.5 shrink-0 text-sun-400" aria-hidden="true" />
                <span className="truncate">{scene.title}</span>
              </p>
              <button
                type="button"
                onClick={() => setMapLarge((v) => !v)}
                aria-label={mapLarge ? 'Smaller floor plan' : 'Larger floor plan'}
                title={mapLarge ? 'Smaller floor plan' : 'Larger floor plan'}
                className="touch-target grid size-7 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              >
                {mapLarge ? <Minimize2Icon className="size-3.5" /> : <Maximize2Icon className="size-3.5" />}
              </button>
            </div>
            <TourMinimap
              blockId={apartment.blockId}
              flatNo={apartment.flatNo}
              tour={tour}
              current={scene.key}
              look={look}
              onSelect={go}
              large={mapLarge}
            />
            <p className="mt-1.5 truncate px-1 text-[0.65rem] text-white/50">
              Flat {pad2(apartment.flatNo)} · typical floor plan (p{page})
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit / fullscreen / share (top right) */}
      <div className="absolute top-(--tour-gap) right-(--tour-gap) z-20 flex flex-col gap-2" data-no-drag>
        <RoundButton label="Exit tour" onClick={exit}>
          <XIcon />
        </RoundButton>
        {canFullscreen && (
          <RoundButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </RoundButton>
        )}
        <RoundButton label={copied ? 'Link copied' : 'Share this room'} onClick={share}>
          {copied ? <CheckIcon /> : <Share2Icon />}
        </RoundButton>
      </div>

      {/* Notice (e.g. an unknown room in the link) */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            role="status"
            {...pop}
            className="absolute inset-x-4 top-[4.5rem] z-30 mx-auto flex w-fit max-w-md items-center gap-3 rounded-xl border border-gold-300/30 bg-navy-950/95 px-4 py-3 text-sm shadow-float"
          >
            <InfoIcon className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
            {notice}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(undefined)}
              className="text-white/60 hover:text-white"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: room strip + bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-[minmax(0,1fr)] gap-2 p-(--tour-gap) pb-[max(var(--tour-gap),env(safe-area-inset-bottom))]"
        data-no-drag
      >
        <AnimatePresence>
          {stripOpen && (
            <motion.div
              key="strip"
              {...pop}
              className="rounded-2xl border border-white/10 bg-navy-950/70 py-2.5 shadow-float backdrop-blur-md"
            >
              <RoomStrip stops={stops} current={scene.key} onSelect={go} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-center gap-1 rounded-2xl border border-white/10 bg-navy-950/70 p-1.5 shadow-float backdrop-blur-md">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <BarIconButton label={`Previous room: ${prev.scene.title}`} onClick={() => go(prev.scene.key)}>
              <ChevronLeftIcon />
            </BarIconButton>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-sm font-medium text-white">{scene.title}</p>
              <p className="truncate text-[0.7rem] text-white/55">
                {apartment.id} · {apartment.bhk} BHK · {tour.tour.title}
              </p>
            </div>
            <BarIconButton label={`Next room: ${next.scene.title}`} onClick={() => go(next.scene.key)}>
              <ChevronRightIcon />
            </BarIconButton>
          </div>

          <ToolButton label="Rooms" pressed={stripOpen} onClick={() => setStripOpen((v) => !v)}>
            <ImagesIcon />
          </ToolButton>
          <ToolButton label="Floor plan" pressed={mapOpen} onClick={() => setMapOpen((v) => !v)}>
            <LayoutPanelTopIcon />
          </ToolButton>
          <div className="relative">
            <ToolButton label="More" expanded={menuOpen} controls="tour-more" onClick={() => setMenuOpen((v) => !v)}>
              <EllipsisIcon />
            </ToolButton>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="more"
                  id="tour-more"
                  {...pop}
                  className="absolute right-0 bottom-full mb-3 grid w-[min(18rem,calc(100vw-2rem))] gap-1 rounded-xl border border-white/10 bg-navy-950/95 p-1.5 text-sm shadow-float backdrop-blur-md"
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autorotate}
                    onClick={() => setAutorotate((v) => !v)}
                    className="flex h-11 items-center gap-3 rounded-lg px-3 text-left hover:bg-white/10"
                  >
                    <RotateCwIcon className="size-4 text-white/70" aria-hidden="true" />
                    <span className="flex-1">Autorotate</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-5 w-9 rounded-full p-0.5 transition-colors',
                        autorotate ? 'bg-sun-400' : 'bg-white/20',
                      )}
                    >
                      <span
                        className={cn(
                          'block size-4 rounded-full bg-white transition-transform',
                          autorotate && 'translate-x-4',
                        )}
                      />
                    </span>
                  </button>
                  {!unsupported && (
                    <div className="grid grid-cols-3 gap-1">
                      <MenuButton label="Zoom in" onClick={() => panorama.current?.zoom(1 / 1.25)}>
                        <PlusIcon />
                      </MenuButton>
                      <MenuButton label="Zoom out" onClick={() => panorama.current?.zoom(1.25)}>
                        <MinusIcon />
                      </MenuButton>
                      <MenuButton label="Reset view" onClick={() => panorama.current?.reset()}>
                        <RotateCcwIcon />
                      </MenuButton>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-expanded={aboutOpen}
                    onClick={() => setAboutOpen((v) => !v)}
                    className="flex h-11 items-center gap-3 rounded-lg px-3 text-left hover:bg-white/10"
                  >
                    <InfoIcon className="size-4 text-white/70" aria-hidden="true" />
                    About this tour
                  </button>
                  {aboutOpen && (
                    <div className="grid gap-2 px-3 pb-2 text-xs leading-relaxed text-white/70">
                      <p>
                        A representative {tour.tour.bhk} BHK sample, shown for every {tour.tour.bhk} BHK apartment.
                        Furniture, finishes and views are illustrative and are not part of the brochure or of{' '}
                        {apartment.id}.
                      </p>
                      {placeholder && (
                        <p className="text-sun-400">
                          The 360° images are placeholders until the final renders are supplied.
                        </p>
                      )}
                      <p>
                        Pins sit on each room's printed label on the brochure floor plan (p{page}). Grey dots are rooms
                        this sample does not show.
                      </p>
                      <p className="text-white/50">Not in this sample: {tour.tour.notRecorded}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>,
    document.body,
  )
}

function Loading() {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white/70">
      <span className="flex items-center gap-3 rounded-full bg-black/40 px-4 py-2">
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-sun-400"
          aria-hidden="true"
        />
        Loading 360° view…
      </span>
    </div>
  )
}

/** No WebGL: the map, room strip and navigation still work; the room shows as a still. */
function Fallback({ reason, thumb, title }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-navy-950 p-6 pb-32">
      <figure className="grid w-full max-w-lg gap-3">
        <img src={thumb} alt={`${title} — still view`} className="aspect-video w-full rounded-xl object-cover" />
        <figcaption role="status" className="text-center text-sm text-white/70">
          The 360° viewer needs WebGL, which is not available here ({reason}). Use the map or Rooms to move between
          rooms.
        </figcaption>
      </figure>
    </div>
  )
}

function RoundButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-float backdrop-blur-md transition-colors outline-none hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-sun-400 [&_svg]:size-[1.125rem]"
    >
      {children}
    </button>
  )
}

function BarIconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-white/80 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sun-400 [&_svg]:size-5"
    >
      {children}
    </button>
  )
}

function ToolButton({ label, onClick, pressed, expanded, controls, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      className={cn(
        'flex h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[0.65rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sun-400 sm:min-w-16 [&_svg]:size-[1.125rem]',
        pressed || expanded ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
      {label}
    </button>
  )
}

function MenuButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[0.7rem] text-white/80 hover:bg-white/10 hover:text-white [&_svg]:size-4"
    >
      {children}
      {label}
    </button>
  )
}
