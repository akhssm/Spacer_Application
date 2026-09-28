import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BoxIcon,
  ChevronRightIcon,
  ClapperboardIcon,
  InfoIcon,
  LayoutPanelTopIcon,
  LocateFixedIcon,
  MapIcon,
  MapPinnedIcon,
  MinusIcon,
  PlusIcon,
  ViewIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apartmentId, blocks, project } from '@/data'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useViewportSize } from '@/hooks/useViewportSize'
import { transition } from '@/utils/motion'
import { EXPLORE_VIEWS, TOUR_VIEW, defaultExploreView, parseExplore, paths } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { resolveExplore } from '@/components/explore/resolveExplore'
import { MasterPlanCanvas } from '@/components/explore/MasterPlanCanvas'
import {
  BlockSummary,
  BlockSwitcher,
  FloorPicker,
  HighlightFilter,
  Legend,
} from '@/components/explore/ExplorerControls'
import { DetailPanel } from '@/components/explore/DetailPanel'
import { FloorPlanCanvas } from '@/components/explore/FloorPlanCanvas'
import { getTourForApartment } from '@/components/explore/tour/tours'
import { createStoryStore } from '@/components/explore/three/story'
import { StoryImpression, StoryTimeline } from '@/components/explore/three/StoryPanel'

const pad2 = (n) => String(n).padStart(2, '0')

/** Height of the phone detail sheet, as a share of the viewport. Mirrored by `h-[58svh]` below. */
const SHEET_SHARE = 0.58
/** Below this height the layout is treated as a landscape phone: less room for floating chrome. */
const SHORT_VIEWPORT = 560

/** Three.js / R3F load only when the 3D view is opened — never with the Home page or 2D explorer. */
const Scene3D = lazy(() => import('@/components/explore/three/Scene3D'))
/** The virtual tour (?view=tour) is its own lazily loaded screen over the apartment's URL. */
const TourRoute = lazy(() => import('@/components/explore/tour/TourRoute'))

export default function ExplorePage() {
  const params = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  if (search.get('view') === TOUR_VIEW)
    return (
      <Suspense fallback={<SceneLoading label="Loading virtual tour…" />}>
        <TourRoute />
      </Suspense>
    )
  const resolution = resolveExplore({ blockId: params.blockId, floor: params.floor, apartmentId: params.apartmentId })
  const raw = search.get('view')
  const requested = EXPLORE_VIEWS.includes(raw) ? raw : undefined

  // Keep the view across canonical redirects; fallbacks drop to the default view of their level.
  if (resolution.kind === 'canonical') return <Navigate to={withView(resolution.to, requested)} replace />
  if (resolution.kind === 'fallback')
    return <Navigate to={resolution.to} replace state={{ notice: resolution.message }} />

  const block = resolution.block?.id
  const level = resolution.floor?.level
  // The floor plan needs a block; an unknown or redundant ?view is removed from the URL.
  const view = block ? (requested ?? defaultExploreView(level)) : requested === '3d' ? '3d' : 'site'
  const canonical = paths.explore({ blockId: block, floor: level, apartmentId: resolution.apartment?.id, view })
  const canonicalSearch = canonical.includes('?') ? canonical.slice(canonical.indexOf('?')) : ''
  if (location.search !== canonicalSearch) return <Navigate to={canonical} replace />
  return <Explorer block={block} level={level} apartment={resolution.apartment} view={view} />
}

/** Re-attach a requested view to a canonical path produced without one. */
function withView(to, view) {
  if (!view) return to
  return paths.explore({ ...parseExplore(to), view })
}

function Explorer({ block, level, apartment, view }) {
  const navigate = useNavigate()
  const location = useLocation()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const reduce = useReducedMotion()

  // Transient UI state (not in the URL): a flat chosen before a floor, the clubhouse card, filter.
  const [stackFlat, setStackFlat] = useState()
  const [clubhouse, setClubhouse] = useState(false)
  const [highlight, setHighlight] = useState('all')
  const [infoOpen, setInfoOpen] = useState(false)
  // "From plan to tower" (3D only). Transient: not in the URL, closed when leaving the 3D view.
  const [story, setStory] = useState()
  if (story && view !== '3d') setStory(undefined)
  const storyOn = view === '3d' && story !== undefined
  const [notice, setNotice] = useState(location.state?.notice)
  const camera = useRef(null)

  // Reset transient state when the URL level changes.
  const urlKey = `${block}/${level}/${apartment?.id}`
  // (the view is deliberately not part of the key: switching site ⇄ plan keeps the selected flat)
  const [seenKey, setSeenKey] = useState(urlKey)
  if (seenKey !== urlKey) {
    setSeenKey(urlKey)
    setStackFlat(undefined)
    setClubhouse(false)
  }

  // A notice can also arrive with a same-route navigation (e.g. the 3D → 2D fallback).
  const incoming = location.state?.notice
  const [seenNoticeKey, setSeenNoticeKey] = useState(location.key)
  if (incoming && seenNoticeKey !== location.key) {
    setSeenNoticeKey(location.key)
    setNotice(incoming)
  }

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const blockData = block ? blocks.find((b) => b.id === block) : undefined

  const subject = clubhouse
    ? { kind: 'clubhouse' }
    : apartment
      ? { kind: 'apartment', apartment }
      : block && stackFlat !== undefined
        ? { kind: 'stack', blockId: block, stack: blockData.stacks.find((s) => s.flatNo === stackFlat) }
        : undefined

  const selectedFlat = apartment?.flatNo ?? stackFlat
  const focus = clubhouse
    ? { kind: 'clubhouse' }
    : block && selectedFlat !== undefined
      ? { kind: 'tile', blockId: block, flatNo: selectedFlat }
      : block
        ? { kind: 'block', blockId: block }
        : { kind: 'overview' }

  // Screen area the camera must avoid (panels / docks), per layout. Derived from the live
  // viewport so rotating the device re-frames the plan for the new orientation.
  const panelOpen = subject !== undefined
  const { height: viewportH } = useViewportSize()
  const insets = useMemo(() => {
    // The story has no side panels — only its timeline at the bottom.
    if (storyOn)
      return desktop ? { top: 96, left: 48, right: 48, bottom: 150 } : { top: 72, left: 12, right: 12, bottom: 250 }
    if (desktop) return { top: 96, left: 392, right: panelOpen ? 432 : 88, bottom: 32 }
    // The dock is content-sized (101px, or 133px once a block adds the floor row) and the
    // breadcrumb sits lower on a wide-but-short viewport, where `sm:` has already applied.
    // Portrait keeps its generous margins; landscape trims to what the chrome really occupies,
    // and flyTo's share clamp stops the pair from swallowing the canvas either way.
    const short = viewportH < SHORT_VIEWPORT
    const bottom = panelOpen ? Math.round(viewportH * SHEET_SHARE) : short ? (block ? 141 : 109) : block ? 168 : 128
    return { top: short ? 122 : 116, left: 12, right: 12, bottom }
  }, [desktop, panelOpen, block, viewportH, storyOn])

  const shortViewport = !desktop && viewportH < SHORT_VIEWPORT

  const go = useCallback((to) => navigate(to), [navigate])
  const registerCamera = useCallback((api) => {
    camera.current = api
  }, [])
  const selectBlock = (id) => go(paths.explore({ blockId: id, floor: level, view }))
  const selectFloor = (l) =>
    go(
      paths.explore({
        blockId: block,
        floor: l,
        apartmentId: selectedFlat !== undefined && block ? apartmentId(block, l, selectedFlat) : undefined,
        view,
      }),
    )
  const selectFlat = (blockId, flatNo) => {
    setClubhouse(false)
    if (blockId !== block) return go(paths.explore({ blockId, floor: level, view }))
    if (level !== undefined)
      return go(paths.explore({ blockId, floor: level, apartmentId: apartmentId(blockId, level, flatNo), view }))
    setStackFlat(flatNo)
  }
  const selectTile = (t) => selectFlat(t.blockId, t.flatNo)
  const select3DFloor = (id, l) => {
    setClubhouse(false)
    go(paths.explore({ blockId: id, floor: l, view }))
  }
  const select3DFlat = (id, l, flatNo) => {
    setClubhouse(false)
    go(paths.explore({ blockId: id, floor: l, apartmentId: apartmentId(id, l, flatNo), view }))
  }
  const on3DUnsupported = useCallback(
    (reason) =>
      navigate(paths.explore({ blockId: block, floor: level, apartmentId: apartment?.id, view: 'site' }), {
        replace: true,
        state: { notice: `3D view unavailable (${reason}) — showing the 2D site plan.` },
      }),
    [navigate, block, level, apartment?.id],
  )
  const selectPlanFlat = (f) => selectFlat(f.blockId, f.flatNo)
  /** Switch site ⇄ floor plan, keeping block / floor / apartment — the selection stays in sync. */
  const showOn = (v) => {
    go(paths.explore({ blockId: block, floor: level, apartmentId: apartment?.id, view: v }))
  }
  const closeDetail = () => {
    if (clubhouse) return setClubhouse(false)
    if (apartment) return go(paths.explore({ blockId: block, floor: level, view }))
    setStackFlat(undefined)
  }
  const up = () => {
    if (subject) return closeDetail()
    if (level !== undefined) return go(paths.explore({ blockId: block, view }))
    if (block) return go(paths.explore())
  }

  // Escape goes up one level; ignore when a dialog (e.g. floor-plan lightbox) is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || document.querySelector('[role=dialog]')) return
      if (storyOn) return setStory(undefined)
      up()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = apartment
    ? `${apartment.id} · ${apartment.bhk} BHK · ${project.name}`
    : block
      ? `Block ${block}${level ? ` · Floor ${pad2(level)}` : ''}${view === 'plan' ? ' · Floor plan' : view === '3d' ? ' · 3D' : ''} · ${project.name}`
      : `${view === '3d' ? '3D site' : 'Master plan'} · ${project.name}`
  useEffect(() => {
    document.title = title
  }, [title])

  const panelMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 24 },
        transition: transition.base,
      }
  const sheetMotion = reduce
    ? {}
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: transition.spring }

  return (
    <div className="absolute inset-0">
      {view === '3d' ? (
        <Suspense fallback={<SceneLoading />}>
          <Scene3D
            block={block}
            level={level}
            selectedFlat={selectedFlat}
            clubhouseSelected={clubhouse}
            highlight={highlight}
            insets={insets}
            reducedMotion={!!reduce}
            mobile={!desktop}
            onSelectBlock={selectBlock}
            onSelectFloor={select3DFloor}
            onSelectFlat={select3DFlat}
            onSelectClubhouse={() => {
              setStackFlat(undefined)
              setClubhouse(true)
            }}
            onBackgroundClick={() => {
              if (subject) closeDetail()
            }}
            onCamera={registerCamera}
            onUnsupported={on3DUnsupported}
            story={storyOn ? story : undefined}
          />
        </Suspense>
      ) : view === 'plan' && block ? (
        <FloorPlanCanvas
          key={block}
          blockId={block}
          level={level}
          selectedFlat={selectedFlat}
          highlight={highlight}
          insets={insets}
          onSelectFlat={selectPlanFlat}
          onBackgroundClick={() => {
            if (subject) closeDetail()
          }}
          onCamera={registerCamera}
        />
      ) : (
        <MasterPlanCanvas
          focus={focus}
          activeBlock={block}
          selectedFlat={selectedFlat}
          clubhouseSelected={clubhouse}
          highlight={highlight}
          insets={insets}
          onSelectBlock={selectBlock}
          onSelectTile={selectTile}
          onSelectClubhouse={() => {
            setStackFlat(undefined)
            setClubhouse(true)
          }}
          onBackgroundClick={() => {
            if (subject) closeDetail()
          }}
          onCamera={registerCamera}
        />
      )}

      {storyOn && (
        <>
          <StoryImpression story={story} desktop={desktop} />
          <StoryTimeline story={story} desktop={desktop} onClose={() => setStory(undefined)} />
        </>
      )}

      {!storyOn && (
        <>
          {desktop && (
            <div className="absolute top-20 left-1/2 z-(--z-dock) flex -translate-x-1/2 gap-2">
              <ViewToggle view={view} hasBlock={!!block} onChange={showOn} />
              {view === '3d' && (
                <StoryButton
                  onClick={() =>
                    setStory(createStoryStore({ t: 0, playing: !reduce, dusk: false, sketch: reduce ? 1 : 0 }))
                  }
                />
              )}
              <LocationMapLink />
            </div>
          )}
          {view === '3d' && <SchematicBadge desktop={desktop} />}
          {view === '3d' && desktop && apartment && getTourForApartment(apartment) && (
            <Link
              to={paths.tour({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id })}
              state={{ tourReturn: true }}
              className="absolute bottom-16 left-1/2 z-(--z-dock) flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-sun-400 px-5 text-sm font-medium text-navy-950 shadow-float transition-colors hover:bg-sun-400/90"
            >
              <ViewIcon className="size-4" aria-hidden="true" />
              Step inside {apartment.id} · Virtual tour
            </Link>
          )}

          <Breadcrumb block={block} level={level} apartment={apartment?.id} view={view} />
          {/* Phones: a small pill beside the breadcrumb keeps the bottom dock uncrowded. It stands
          down with the dock while the detail sheet is open, leaving the zoom column its room. */}
          {!desktop && !subject && (
            <LocationMapLink compact className="absolute top-[6.75rem] right-4 z-(--z-header)" />
          )}
          {!desktop && !subject && view === '3d' && (
            <StoryButton
              compact
              className="absolute top-[6.75rem] right-16 z-(--z-header)"
              onClick={() =>
                setStory(createStoryStore({ t: 0, playing: !reduce, dusk: false, sketch: reduce ? 1 : 0 }))
              }
            />
          )}
          {!desktop && (
            <h1 className="sr-only">
              {blockData ? `${blockData.name} · ${project.name}` : `${project.name} master plan`}
            </h1>
          )}

          {/* Desktop: control panel */}
          {desktop && (
            <aside
              aria-label="Explorer controls"
              className="absolute top-[7.5rem] bottom-8 left-6 z-(--z-dock) flex w-[22rem] flex-col gap-5 overflow-y-auto rounded-2xl border border-white/10 bg-navy-950/80 p-5 shadow-float backdrop-blur-xl"
            >
              <div>
                <p className="eyebrow text-gold-300">{block ? 'Block' : 'Master plan'}</p>
                <h1 className="mt-1 font-display text-3xl text-white">{blockData ? blockData.name : project.name}</h1>
              </div>
              <BlockSwitcher active={block} onSelect={selectBlock} />
              <BlockSummary blockId={block} />
              {blockData && (
                <section aria-label="Floors" className="grid gap-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-white">Floor</p>
                    <p className="text-[0.7rem] text-white/45">Provisional numbering</p>
                  </div>
                  <FloorPicker block={blockData} active={level} onSelect={selectFloor} />
                  {level === undefined && (
                    <p className="text-xs text-white/50">Choose a floor, or tap a flat to see it on every floor.</p>
                  )}
                </section>
              )}
              {blockData && (
                <section aria-label="Highlight" className="grid gap-2">
                  <p className="text-sm text-white">Highlight</p>
                  <HighlightFilter value={highlight} onChange={setHighlight} />
                </section>
              )}
              <section aria-label="Legend" className="mt-auto grid gap-3 border-t border-white/10 pt-4">
                {view === '3d' ? <SchematicNote /> : <Legend />}
              </section>
            </aside>
          )}

          {/* Desktop: detail panel */}
          {desktop && (
            <AnimatePresence>
              {subject && (
                <motion.aside
                  key="detail"
                  aria-label="Details"
                  {...panelMotion}
                  className="absolute top-[7.5rem] right-6 bottom-8 z-(--z-drawer) w-[24rem] overflow-hidden rounded-2xl border border-white/10 bg-navy-950/90 shadow-float backdrop-blur-xl"
                >
                  <DetailPanel subject={subject} onClose={closeDetail} view={view} onShowOn={showOn} />
                </motion.aside>
              )}
            </AnimatePresence>
          )}

          {/* Zoom controls — on phones they clear the detail sheet, which is drawn above them. */}
          <div
            className={cn(
              'absolute z-(--z-dock) flex gap-1.5',
              desktop
                ? cn('flex-col bottom-8', subject ? 'right-[27rem]' : 'right-6')
                : shortViewport
                  ? // Landscape phone: too little height between the chrome and the dock for a column.
                    cn(
                      'right-3 flex-row',
                      subject ? 'bottom-[calc(58svh+0.75rem)]' : block ? 'bottom-[7.5rem]' : 'bottom-[5.5rem]',
                    )
                  : cn(
                      'right-3 flex-col',
                      subject ? 'bottom-[calc(58svh+0.75rem)]' : block ? 'bottom-[11rem]' : 'bottom-[8.5rem]',
                    ),
            )}
          >
            <ZoomButton label="Zoom in" onClick={() => camera.current?.zoomIn()}>
              <PlusIcon />
            </ZoomButton>
            <ZoomButton label="Zoom out" onClick={() => camera.current?.zoomOut()}>
              <MinusIcon />
            </ZoomButton>
            <ZoomButton label="Recenter" onClick={() => camera.current?.recenter()}>
              <LocateFixedIcon />
            </ZoomButton>
          </div>

          {/* Mobile: bottom dock */}
          {!desktop && !subject && (
            <div className="absolute inset-x-0 bottom-0 z-(--z-dock) grid gap-2.5 rounded-t-3xl border-t border-white/10 bg-navy-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <BlockSwitcher active={block} onSelect={selectBlock} className="flex-1" short />
                <ViewToggle view={view} hasBlock={!!block} onChange={showOn} compact />
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Block information and legend"
                  aria-expanded={infoOpen}
                  onClick={() => setInfoOpen((v) => !v)}
                  className="size-12 rounded-xl bg-white/5 text-white hover:bg-white/10"
                >
                  <InfoIcon />
                </Button>
              </div>
              {blockData ? (
                <FloorPicker block={blockData} active={level} onSelect={selectFloor} orientation="horizontal" />
              ) : (
                <p className="px-1 text-xs text-white/60">Tap a block on the plan or above · pinch to zoom</p>
              )}
            </div>
          )}

          {/* Mobile: info sheet (summary, filter, legend) */}
          <AnimatePresence>
            {!desktop && infoOpen && !subject && (
              <motion.div
                key="info"
                {...sheetMotion}
                role="dialog"
                aria-modal="false"
                aria-label="Block information"
                className="absolute inset-x-0 bottom-0 z-(--z-drawer) grid max-h-[70svh] gap-4 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-navy-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-2xl text-white">{blockData ? blockData.name : project.name}</p>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Close"
                    onClick={() => setInfoOpen(false)}
                    className="text-white/70"
                  >
                    <XIcon />
                  </Button>
                </div>
                <BlockSummary blockId={block} />
                {blockData && <HighlightFilter value={highlight} onChange={setHighlight} />}
                {view === '3d' ? <SchematicNote /> : <Legend className="border-t border-white/10 pt-4" />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile: detail sheet */}
          <AnimatePresence>
            {!desktop && subject && (
              <motion.aside
                key="detail-mobile"
                // Non-modal: the plan behind it stays pannable and the canvas keeps its own hit targets.
                role="dialog"
                aria-modal="false"
                aria-label="Details"
                {...sheetMotion}
                className="absolute inset-x-0 bottom-0 z-(--z-drawer) h-[58svh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-navy-950 shadow-float"
              >
                <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
                <DetailPanel subject={subject} onClose={closeDetail} view={view} onShowOn={showOn} />
              </motion.aside>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Deep-link fallback notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            role="status"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-4 top-[7.5rem] z-(--z-toast) mx-auto flex w-fit max-w-lg items-center gap-3 rounded-xl border border-gold-300/30 bg-navy-950/95 px-4 py-3 text-sm text-white shadow-float lg:top-24"
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
    </div>
  )
}

function Breadcrumb({ block, level, apartment, view }) {
  const crumbs = [{ label: 'Master plan', to: block ? paths.explore() : undefined }]
  if (block)
    crumbs.push({
      label: `Block ${block}`,
      to: level !== undefined ? paths.explore({ blockId: block, view }) : undefined,
    })
  if (block && level !== undefined)
    crumbs.push({
      label: `Floor ${pad2(level)}`,
      to: apartment ? paths.explore({ blockId: block, floor: level, view }) : undefined,
    })
  if (apartment) crumbs.push({ label: apartment })

  return (
    <nav aria-label="Breadcrumb" className="absolute top-[4.25rem] left-4 z-(--z-header) sm:top-20 sm:left-6">
      <ol className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-navy-950/75 px-3 py-1.5 text-xs text-white/60 backdrop-blur-md sm:text-sm">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon className="size-3.5 text-white/30" aria-hidden="true" />}
            {c.to ? (
              <Link to={c.to} className="touch-target rounded px-1 transition-colors hover:text-white">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="px-1 font-medium text-white">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function ZoomButton({ label, onClick, children }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-11 rounded-xl border border-white/10 bg-navy-950/80 text-white shadow-float backdrop-blur-md hover:bg-navy-900"
    >
      {children}
    </Button>
  )
}

/** Site master plan ⇄ typical floor plan ⇄ schematic 3D. */
function ViewToggle({ view, onChange, hasBlock, compact, className }) {
  const options = [
    { v: 'site', label: 'Site plan', Icon: MapIcon },
    {
      v: 'plan',
      label: hasBlock ? 'Floor plan' : 'Floor plan (choose a block)',
      Icon: LayoutPanelTopIcon,
      disabled: !hasBlock,
    },
    { v: '3d', label: '3D', Icon: BoxIcon },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Plan view"
      className={cn(
        'flex gap-1 rounded-xl border border-white/10 bg-navy-950/85 p-1 shadow-float backdrop-blur-md',
        className,
      )}
    >
      {options.map(({ v, label, Icon, disabled }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={() => view !== v && onChange(v)}
          className={cn(
            'flex items-center gap-2 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35',
            compact ? 'touch-target size-10 justify-center' : 'h-9 px-3',
            view === v ? 'bg-white text-navy-950' : 'text-white/75 enabled:hover:bg-white/10 enabled:hover:text-white',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {!compact && (v === 'plan' ? 'Floor plan' : label)}
        </button>
      ))}
    </div>
  )
}

/** Opens "From plan to tower" — the brochure-only four-stage story over the 3D model. */
function StoryButton({ onClick, compact, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="From plan to tower"
      title="From plan to tower — the site from sketch to artistic impression"
      className={cn(
        'flex items-center gap-2 rounded-xl border border-sun-400/40 bg-navy-950/85 text-sm text-white shadow-float backdrop-blur-md transition-colors hover:bg-white/10',
        compact ? 'touch-target size-10 justify-center rounded-full' : 'h-11 px-4',
        className,
      )}
    >
      <ClapperboardIcon className="size-4 text-sun-400" aria-hidden="true" />
      {!compact && 'From plan to tower'}
    </button>
  )
}

/** The satellite location map lives on its own route (/ira-towers/explore/map); this is its way in. */
function LocationMapLink({ compact, className }) {
  return (
    <Link
      to={paths.map()}
      aria-label="Location map"
      title="Location map — the site on satellite imagery"
      className={cn(
        'flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950/85 text-sm text-white/75 shadow-float backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white',
        compact ? 'touch-target size-10 justify-center rounded-full' : 'h-11 px-4',
        className,
      )}
    >
      <MapPinnedIcon className="size-4" aria-hidden="true" />
      {!compact && 'Location map'}
    </Link>
  )
}

function SceneLoading({ label = 'Loading 3D view…' }) {
  return (
    <div role="status" className="absolute inset-0 grid place-items-center text-sm text-white/60">
      <span className="flex items-center gap-3">
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-sun-400"
          aria-hidden="true"
        />
        {label}
      </span>
    </div>
  )
}

/** Always-visible reminder that the 3D view is a diagram, not an architectural model. */
function SchematicBadge({ desktop }) {
  return (
    <p
      className={cn(
        'pointer-events-none absolute z-(--z-dock) rounded-full border border-white/10 bg-navy-950/80 px-3 py-1 text-[0.7rem] tracking-wide text-white/70 backdrop-blur-md',
        desktop ? 'bottom-8 left-1/2 -translate-x-1/2' : 'top-[6.75rem] left-4',
      )}
    >
      Schematic · not to scale
    </p>
  )
}

function SchematicNote() {
  return (
    <div className="grid gap-2 text-xs leading-relaxed text-white/70">
      <p className="font-medium text-white">Schematic 3D — not an architectural model</p>
      <ul className="grid list-disc gap-1 pl-4 text-white/60">
        <li>Footprints are the flat tiles of the brochure master plan (p6), shown on the plan itself.</li>
        <li>
          Each block stacks a stilt level and 10 floors (C+S+10, p3) at a uniform illustrative storey height; the
          brochure gives no heights or scale.
        </li>
        <li>The cellar is not shown. The clubhouse is shown as its footprint only.</li>
        <li>
          Block C shows the 14 flats × 10 floors of its typical plan; its declared count (154) is kept as published.
        </li>
      </ul>
      <p className="text-white/50">
        Drag to orbit · right-drag or two fingers to pan · scroll or pinch to zoom. Tap a block, then a floor, then a
        flat.
      </p>
    </div>
  )
}
