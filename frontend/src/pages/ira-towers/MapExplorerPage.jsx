import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ImageIcon,
  ImageOffIcon,
  InfoIcon,
  MapPinOffIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { blocks, project } from '@/data'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { transition } from '@/utils/motion'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { MAPTILER_KEY } from '@/config/maps'
import { BlockSwitcher } from '@/components/explore/ExplorerControls'
import { webglUnavailableReason } from '@/components/explore/three/webgl'
import { GEOREF_NOTES, PLACEMENT_LABEL, QR_PIN, distanceMetres } from '@/components/explore/map/georef'
import { MAP_COLORS, activeBlock, selectionKey, siteBounds } from '@/components/explore/map/layers'
import { MapControls } from '@/components/explore/map/MapControls'
import { MapDetailPanel } from '@/components/explore/map/MapDetailPanel'
import { mapSearch, parseMapSearch } from '@/components/explore/map/mapUrl'
import { searchSelection } from '@/components/explore/map/search'

/** Marks an element the map's labels must stay clear of (see MAP_OBSTACLE_ATTR in MapView). */
const obstacle = { 'data-map-obstacle': '' }

/** MapLibre (and its worker) load only when the map can actually be shown. */
const MapView = lazy(() => import('@/components/explore/map/MapView'))

/** The brochure flipbook (and its page images) load only once a visitor opens it. */
const loadBrochure = () => import('@/components/brochure/BrochureFlipbook')
const BrochureFlipbook = lazy(loadBrochure)
/** The gallery viewer (and its images) load only once a visitor opens it. */
const loadGallery = () => import('@/components/gallery/GalleryViewer')
const GalleryViewer = lazy(loadGallery)

/** /ira-towers/explore/map — the IRA Towers site on satellite imagery (additive; the explorer is unchanged). */
export default function MapExplorerPage() {
  const [fatal, setFatal] = useState()
  const webgl = useMemo(() => (typeof document === 'undefined' ? null : webglUnavailableReason()), [])

  useEffect(() => {
    document.title = `Location map · ${project.name}`
  }, [])

  if (!MAPTILER_KEY)
    return (
      <MapFallback
        Icon={MapPinOffIcon}
        title="The location map isn't available right now"
        detail="The satellite map needs an imagery key, and none is set for this site."
        hint="For developers: set VITE_MAPTILER_KEY in .env.local (see .env.example) and restart the dev server."
      />
    )
  if (webgl || fatal)
    return (
      <MapFallback
        Icon={MapPinOffIcon}
        title="The location map couldn't start"
        detail={`${webgl ?? `The map failed to load (${fatal}).`} The site plan and 3D views are still available.`}
      />
    )
  return <MapExplorer apiKey={MAPTILER_KEY} onFatal={setFatal} />
}

function MapExplorer({ apiKey, onFatal }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  // Below 1280 px the overview and detail panels together leave too little map (240 px at 1024).
  const wideDesktop = useMediaQuery('(min-width: 1280px)')
  const reduce = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  // Block / flat / floor live in the URL (?block=C&flat=9&floor=5): restored on load and refresh.
  const [selection, setSelection] = useState(() => parseMapSearch(location.search))
  const [api, setApi] = useState()
  const [imageryError, setImageryError] = useState()
  const [imageryDismissed, setImageryDismissed] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState()
  const [brochureOpen, setBrochureOpen] = useState(false)
  const [highlight, setHighlight] = useState('all')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const galleryButton = useRef(null)
  const brochureButton = useRef(null)
  // Same as the gallery: the flipbook unmounts on close, so hand focus back to its button.
  const onBrochureOpenChange = (open) => {
    setBrochureOpen(open)
    if (!open) requestAnimationFrame(() => brochureButton.current?.focus())
  }
  // The viewer unmounts on close, so hand focus back to the Gallery button explicitly.
  const onGalleryOpenChange = (open) => {
    setGalleryOpen(open)
    if (!open) requestAnimationFrame(() => galleryButton.current?.focus())
  }
  const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator

  // Narrow desktop (1024–1279 px) with a selection: the overview collapses to a slim rail so the
  // selected block / flat keeps a usable map. The visitor can expand it again for this selection.
  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [overviewKey, setOverviewKey] = useState(selectionKey(selection))
  if (overviewKey !== selectionKey(selection)) {
    setOverviewKey(selectionKey(selection))
    setOverviewExpanded(false)
  }
  const overviewCollapsible = desktop && !wideDesktop && selection !== undefined
  const overviewCollapsed = overviewCollapsible && !overviewExpanded

  // An outside change of the query (e.g. following a shared link while on the page) wins…
  const [seenSearch, setSeenSearch] = useState(location.search)
  if (location.search !== seenSearch) {
    setSeenSearch(location.search)
    if (location.search !== mapSearch(selection)) setSelection(parseMapSearch(location.search))
  }
  // …and every selection change is mirrored back without adding history entries or reloading.
  useEffect(() => {
    const wanted = mapSearch(selection)
    if (wanted !== location.search) navigate({ search: wanted }, { replace: true, preventScrollReset: true })
  }, [selection, location.search, navigate])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 6000)
    return () => clearTimeout(t)
  }, [notice])

  // Escape clears the selection (not while a dialog such as the image lightbox is open).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || document.querySelector('[role=dialog]')) return
      // Escape in the search field belongs to the search (it clears the text), not the map.
      if (e.target?.closest?.('form[role=search]')) return
      if (selection) setSelection(parentOf)
      else setInfoOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection])

  // Screen area the camera must keep clear of floating panels and controls, per layout. MapView
  // turns these into fit padding that always leaves a usable share of the map (camera.js).
  const panelOpen = selection !== undefined
  const insets = useMemo(() => {
    // With the detail panel open, the control column sits just left of it: keep fits clear of both.
    // The collapsed rail is 3.5rem wide at left-6 (24 + 56 + 16 px gap).
    if (desktop) return { top: 104, left: overviewCollapsed ? 96 : 392, right: panelOpen ? 488 : 88, bottom: 32 }
    const h = typeof window === 'undefined' ? 800 : window.innerHeight
    return { top: 128, left: 12, right: 64, bottom: panelOpen ? Math.round(h * PHONE_SHEET) : 112 }
  }, [desktop, panelOpen, overviewCollapsed])

  const selectBlock = (blockId) => setSelection({ kind: 'block', blockId })
  const selectedBlock = activeBlock(selection)
  // The highlight only applies where the active block has both 2 and 3 BHK flats.
  const hasBothTypes =
    !!selectedBlock && new Set(blocks.find((b) => b.id === selectedBlock).stacks.map((s) => s.bhk)).size > 1
  const flatHighlight = hasBothTypes ? highlight : 'all'

  const stepBack = () => setSelection(parentOf)
  /** A click on the map: a feature selects it (re-clicking the selected flat keeps its floor); empty space steps back. */
  const selectOnMap = (next) =>
    setSelection((s) => (!next ? parentOf(s) : selectionKey(s) === selectionKey(next) ? s : next))
  const selectLevel = (level) => setSelection((s) => (s?.kind === 'flat' ? { ...s, level } : s))

  const locate = useCallback(() => {
    if (!api || !canLocate) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const me = [pos.coords.longitude, pos.coords.latitude]
        api.setUserLocation(me)
        const d = distanceMetres(me, QR_PIN)
        if (d < 30_000) {
          const [[w, s], [e, n]] = siteBounds()
          api.fitTo([
            [Math.min(w, me[0]), Math.min(s, me[1])],
            [Math.max(e, me[0]), Math.max(n, me[1])],
          ])
        }
        setNotice(d < 150 ? `You're at ${project.name}.` : `You are about ${formatDistance(d)} from ${project.name}.`)
      },
      (err) => {
        setLocating(false)
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was declined.'
            : "Your location couldn't be determined.",
        )
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }, [api, canLocate])

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
    <div className="absolute inset-0 bg-navy-950 [color-scheme:dark]">
      <Suspense fallback={<MapLoading />}>
        <MapView
          apiKey={apiKey}
          selection={selection}
          insets={insets}
          reducedMotion={!!reduce}
          onSelect={selectOnMap}
          onReady={setApi}
          onFatal={onFatal}
          onImageryError={setImageryError}
          highlight={flatHighlight}
        />
      </Suspense>

      <Breadcrumb />
      {(!desktop || overviewCollapsed) && <h1 className="sr-only">{project.name} location map</h1>}
      <PlacementBadge className={desktop ? 'top-20 left-1/2 -translate-x-1/2' : 'top-[6.75rem] left-4'} />

      {/* Narrow desktop with a selection: the overview as a slim rail */}
      {overviewCollapsed && (
        <nav
          {...obstacle}
          aria-label="Map overview"
          className="absolute top-[7.5rem] left-6 z-(--z-dock) flex w-14 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-navy-950/80 p-2 shadow-float backdrop-blur-xl"
        >
          <RailButton label="Show map overview" onClick={() => setOverviewExpanded(true)}>
            <PanelLeftOpenIcon />
          </RailButton>
          <RailButton
            ref={brochureButton}
            label="Open the brochure"
            onClick={() => setBrochureOpen(true)}
            onPointerEnter={() => void loadBrochure()}
          >
            <BookOpenIcon />
          </RailButton>
          <RailButton
            ref={galleryButton}
            label="Open the gallery"
            onClick={() => setGalleryOpen(true)}
            onPointerEnter={() => void loadGallery()}
          >
            <ImageIcon />
          </RailButton>
        </nav>
      )}

      {/* Desktop: overview panel */}
      {desktop && !overviewCollapsed && (
        <aside
          {...obstacle}
          aria-label="Map overview"
          className="absolute top-[7.5rem] bottom-8 left-6 z-(--z-dock) flex w-[22rem] flex-col gap-5 overflow-y-auto rounded-2xl border border-white/10 bg-navy-950/80 p-5 shadow-float backdrop-blur-xl"
        >
          <div className="relative">
            {overviewCollapsible && (
              <RailButton
                label="Collapse map overview"
                onClick={() => setOverviewExpanded(false)}
                className="absolute -top-1 -right-1"
              >
                <PanelLeftCloseIcon />
              </RailButton>
            )}
            <p className="eyebrow text-gold-300">Location map</p>
            <h1 className="mt-1 font-display text-3xl text-white">{project.name}</h1>
            <p className="mt-2 text-sm text-white/60">{project.location.addressLines.join(' ')}</p>
          </div>
          <MapSearch onFound={setSelection} />
          <section aria-label="Blocks" className="grid gap-2">
            <p className="text-sm text-white">Blocks</p>
            <BlockSwitcher active={selectedBlock} onSelect={selectBlock} />
            <p className="text-xs text-white/50">
              Tap a block to see its flats, then a flat to choose a floor. Esc steps back.
            </p>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <Button
              ref={brochureButton}
              variant="outline"
              size="lg"
              onClick={() => setBrochureOpen(true)}
              onPointerEnter={() => void loadBrochure()}
              className="justify-start border-white/15 bg-transparent px-3 text-white hover:bg-white/10"
            >
              <BookOpenIcon data-icon="inline-start" />
              Brochure
            </Button>
            <Button
              ref={galleryButton}
              variant="outline"
              size="lg"
              onClick={() => setGalleryOpen(true)}
              onPointerEnter={() => void loadGallery()}
              className="justify-start border-white/15 bg-transparent px-3 text-white hover:bg-white/10"
            >
              <ImageIcon data-icon="inline-start" />
              Gallery
            </Button>
          </div>
          <MapLegend />
          <details className="group mt-auto border-t border-white/10 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-white marker:hidden">
              {PLACEMENT_LABEL} — about this map
              <ChevronRightIcon
                className="size-4 text-white/50 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <AboutPlacement className="mt-3" hideTitle />
          </details>
        </aside>
      )}

      {/* Desktop: detail panel */}
      {desktop && (
        <AnimatePresence>
          {selection && (
            <motion.aside
              {...obstacle}
              key="detail"
              aria-label="Details"
              {...panelMotion}
              className="absolute top-[7.5rem] right-6 bottom-8 z-(--z-drawer) w-[24rem] overflow-hidden rounded-2xl border border-white/10 bg-navy-950/90 shadow-float backdrop-blur-xl"
            >
              <MapDetailPanel
                selection={selection}
                onClose={stepBack}
                onSelectLevel={selectLevel}
                highlight={flatHighlight}
                onHighlight={setHighlight}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      <MapControls
        api={api}
        onLocate={locate}
        locating={locating}
        canLocate={canLocate}
        compact={!desktop && !!selection}
        className={cn(
          'absolute z-(--z-dock) transition-[right,bottom] duration-300',
          desktop
            ? cn('bottom-8', selection ? 'right-[27rem]' : 'right-6')
            : cn('right-3', selection ? 'top-[9.5rem]' : 'bottom-[8.25rem]'),
        )}
      />

      {/* Mobile: bottom dock */}
      {!desktop && !selection && (
        <div
          {...obstacle}
          className="absolute inset-x-0 bottom-0 z-(--z-dock) grid gap-2.5 rounded-t-3xl border-t border-white/10 bg-navy-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <BlockSwitcher active={selectedBlock} onSelect={selectBlock} className="flex-1" short />
            <Button
              ref={galleryButton}
              variant="ghost"
              size="icon-lg"
              aria-label="Open the gallery"
              onClick={() => setGalleryOpen(true)}
              className="size-12 rounded-xl bg-white/5 text-white hover:bg-white/10"
            >
              <ImageIcon />
            </Button>
            <Button
              ref={brochureButton}
              variant="ghost"
              size="icon-lg"
              aria-label="Open the brochure"
              onClick={() => setBrochureOpen(true)}
              className="size-12 rounded-xl bg-white/5 text-white hover:bg-white/10"
            >
              <BookOpenIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="About this map and legend"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((v) => !v)}
              className="size-12 rounded-xl bg-white/5 text-white hover:bg-white/10"
            >
              <InfoIcon />
            </Button>
          </div>
          <MapSearch onFound={setSelection} />
        </div>
      )}

      {/* Mobile: about / legend sheet */}
      <AnimatePresence>
        {!desktop && infoOpen && !selection && (
          <motion.div
            key="info"
            {...sheetMotion}
            {...obstacle}
            role="dialog"
            aria-label="About this map"
            className="absolute inset-x-0 bottom-0 z-(--z-drawer) grid max-h-[75svh] gap-5 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-navy-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl text-white">{project.name}</p>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close"
                onClick={() => setInfoOpen(false)}
                className="touch-target text-white/70"
              >
                <XIcon />
              </Button>
            </div>
            <MapLegend />
            <AboutPlacement />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: detail sheet */}
      <AnimatePresence>
        {!desktop && selection && (
          <motion.aside
            {...obstacle}
            key="detail-mobile"
            aria-label="Details"
            {...sheetMotion}
            className="absolute inset-x-0 bottom-0 z-(--z-drawer) flex h-[45svh] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-navy-950 shadow-float"
          >
            <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" />
            <div className="min-h-0 flex-1">
              <MapDetailPanel
                selection={selection}
                onClose={stepBack}
                onSelectLevel={selectLevel}
                highlight={flatHighlight}
                onHighlight={setHighlight}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Imagery failure: the site outline still works, but say so clearly and offer a way out. */}
      {imageryError && !imageryDismissed && (
        <div
          role="alertdialog"
          aria-labelledby="imagery-title"
          className="absolute inset-0 z-(--z-modal) grid place-items-center bg-navy-950/70 p-4 backdrop-blur-sm"
        >
          <div className="grid max-w-md gap-4 rounded-2xl border border-white/10 bg-navy-950 p-6 text-white shadow-float">
            <ImageOffIcon className="size-8 text-gold-300" aria-hidden="true" />
            <div>
              <h2 id="imagery-title" className="font-display text-2xl">
                Satellite imagery couldn't load
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {imageryError}. You can still look at the site outline without the satellite image, or go back to the
                site plan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                nativeButton={false}
                render={<Link to={paths.explore()} />}
                className="h-10 bg-sun-400 px-4 text-navy-950 hover:bg-sun-400/90"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Back to Explore
              </Button>
              <Button
                variant="outline"
                onClick={() => setImageryDismissed(true)}
                className="h-10 border-white/15 bg-transparent px-4 text-white hover:bg-white/10"
              >
                Continue without imagery
              </Button>
            </div>
          </div>
        </div>
      )}

      {brochureOpen && (
        <Suspense fallback={null}>
          <BrochureFlipbook open={brochureOpen} onOpenChange={onBrochureOpenChange} />
        </Suspense>
      )}
      {galleryOpen && (
        <Suspense fallback={null}>
          <GalleryViewer open={galleryOpen} onOpenChange={onGalleryOpenChange} />
        </Suspense>
      )}

      {/* GPS notices */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            role="status"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-4 top-[9rem] z-(--z-toast) mx-auto flex w-fit max-w-lg items-center gap-3 rounded-xl border border-gold-300/30 bg-navy-950/95 px-4 py-3 text-sm text-white shadow-float lg:top-32"
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

function RailButton({ label, className, children, ...rest }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      className={cn('touch-target size-10 rounded-xl text-white/85 hover:bg-white/10 hover:text-white', className)}
      {...rest}
    >
      {children}
    </Button>
  )
}

/** Jump to an apartment ("C-0509"), a flat ("C-09") or a block ("Block C"). */
function MapSearch({ onFound }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const input = useRef(null)
  const submit = (e) => {
    e.preventDefault()
    const found = searchSelection(query)
    if (!found) return setError(true)
    setError(false)
    setQuery('')
    input.current?.blur() // closes the on-screen keyboard on phones
    onFound(found)
  }
  return (
    <form role="search" onSubmit={submit} className="grid gap-1.5">
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 pr-1 pl-3 focus-within:border-sun-400/70">
        <SearchIcon className="size-4 shrink-0 text-white/50" aria-hidden="true" />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.preventDefault()
            if (query || error) {
              setQuery('')
              setError(false)
            } else input.current?.blur()
          }}
          type="search"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-label="Find an apartment, flat or block"
          aria-invalid={error || undefined}
          aria-describedby={error ? 'map-search-error' : undefined}
          placeholder="Find e.g. C-0509, C-09, Block A"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="touch-target h-8 shrink-0 rounded-lg px-3 text-white/80 hover:bg-white/10 hover:text-white"
        >
          Go
        </Button>
      </div>
      {error && (
        <p id="map-search-error" role="status" className="px-1 text-xs text-gold-300">
          No match. Try an apartment ID like C-0509, a flat like C-09, or a block.
        </p>
      )}
    </form>
  )
}

/** Up one level of the hierarchy: flat (or apartment) → its block → nothing. */
function parentOf(s) {
  return s?.kind === 'flat' ? { kind: 'block', blockId: s.blockId } : undefined
}

/** Share of the phone viewport taken by the detail sheet (keep in sync with its h-[45svh]). */
const PHONE_SHEET = 0.45

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`
}

function Breadcrumb() {
  return (
    <nav
      {...obstacle}
      aria-label="Breadcrumb"
      className="absolute top-[4.25rem] left-4 z-(--z-header) sm:top-20 sm:left-6"
    >
      <ol className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-navy-950/75 px-3 py-1.5 text-xs text-white/60 backdrop-blur-md sm:text-sm">
        <li className="flex items-center gap-1">
          <Link to={paths.explore()} className="touch-target rounded px-1 transition-colors hover:text-white">
            Master plan
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRightIcon className="size-3.5 text-white/30" aria-hidden="true" />
          <span aria-current="page" className="px-1 font-medium text-white">
            Location map
          </span>
        </li>
      </ol>
    </nav>
  )
}

/** Always visible while the map is shown. */
function PlacementBadge({ className }) {
  return (
    <p
      {...obstacle}
      className={cn(
        'pointer-events-none absolute z-(--z-dock) flex items-center gap-2 rounded-full border border-gold-300/30 bg-navy-950/85 px-3 py-1 text-[0.7rem] tracking-wide text-white/80 backdrop-blur-md',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-300" />
      {PLACEMENT_LABEL}
    </p>
  )
}

function MapLegend() {
  const items = [
    { swatch: { border: `2px dashed ${MAP_COLORS.gold300}` }, label: 'Site boundary (indicative)' },
    {
      swatch: { background: `${MAP_COLORS.sand200}66`, border: '1.5px solid #fff' },
      label: 'Block / clubhouse footprint',
    },
    { swatch: { background: `${MAP_COLORS.sun400}88`, border: `2px solid ${MAP_COLORS.sun400}` }, label: 'Selected' },
    {
      swatch: { background: `${MAP_COLORS.leaf500}66`, border: `1px solid ${MAP_COLORS.leaf500}` },
      label: 'Landscaped lawns',
    },
    {
      swatch: { background: `${MAP_COLORS.sun400}4d`, border: `1px solid ${MAP_COLORS.sun400}` },
      label: "Children's play area",
    },
    { swatch: { background: `${MAP_COLORS.pool}8c`, border: `1px solid ${MAP_COLORS.pool}` }, label: 'Swimming pool' },
  ]
  return (
    <ul aria-label="Legend" className="grid gap-2 text-xs text-white/75">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3">
          <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px]" style={i.swatch} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/** Where the placement comes from — every assumption in georef.js, in plain words. */
function AboutPlacement({ className, hideTitle }) {
  return (
    <section aria-label="About this map" className={cn('grid gap-2 text-xs leading-relaxed', className)}>
      {!hideTitle && <p className="font-medium text-white">{PLACEMENT_LABEL}</p>}
      <dl className="grid gap-1.5 text-white/60">
        {GEOREF_NOTES.map((n) => (
          <div key={n.title}>
            <dt className="inline text-white/80">{n.title}: </dt>
            <dd className="inline">{n.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MapLoading() {
  return (
    <div role="status" className="absolute inset-0 grid place-items-center text-sm text-white/60">
      <span className="flex items-center gap-3">
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-sun-400"
          aria-hidden="true"
        />
        Loading the location map…
      </span>
    </div>
  )
}

function MapFallback({ Icon, title, detail, hint }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-navy-950 p-6">
      <div role="alert" className="grid max-w-md justify-items-center gap-4 text-center text-white">
        <span className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/5">
          <Icon className="size-6 text-gold-300" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-white/70">{detail}</p>
        <Button
          nativeButton={false}
          render={<Link to={paths.explore()} />}
          className="h-11 bg-sun-400 px-5 text-navy-950 hover:bg-sun-400/90"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to Explore
        </Button>
        {hint && <p className="text-[0.7rem] text-white/40">{hint}</p>}
      </div>
    </div>
  )
}
