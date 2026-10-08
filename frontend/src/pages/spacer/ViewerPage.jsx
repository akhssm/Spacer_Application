import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, BookOpen, Filter, Image, Info, LocateFixed, MessageCircle, Navigation, Search } from 'lucide-react'
import { COMPARE_LIMIT, ComparePanel, CompareTray } from '@/components/viewer/ComparePanel'
import MapView from '@/components/viewer/MapView'
import { EMPTY_QUERY, isQueryEmpty, runQuery } from '@/components/viewer/plotQuery'
import {
  AmenityPanel,
  BlockChips,
  BlockPanel,
  FlatPanel,
  InfoPanel,
  PlotCard,
  QueryPanel,
  SearchPanel,
} from '@/components/viewer/Panels'
import { SITE, getContactLink } from '@/data/spacer/siteContent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paths } from '@/routes/paths'
import { getProject } from '@/services/projects'
import { directionsUrl } from '@/utils/geo'
import { STATUS_BG, STATUS_LABEL, STATUS_ORDER, countByStatus, towerStatus, unitsByTower } from '@/utils/inventory'

// The brochure flipbook and the gallery (and their images) load only once a visitor opens them
const BrochureFlipbook = lazy(() => import('@/components/brochure/BrochureFlipbook'))
const GalleryViewer = lazy(() => import('@/components/gallery/GalleryViewer'))

const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full bg-card/90 px-3 py-3 text-sm font-semibold backdrop-blur transition-colors sm:px-5'

// Square icon buttons, the same as the map tools on the left; the name shows on hover
const TOOL_BUTTON =
  'inline-flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-lg bg-card/90 text-[10px] leading-none font-semibold text-white backdrop-blur transition-colors'

const NO_BLOCKS = [] // shared empty lists, so they never count as a change
const NO_UNITS = []

// On/off switch like the ones in the original viewer
function Toggle({ label, on, onChange }) {
  return (
    <label className={`${PILL} cursor-pointer gap-3`}>
      {label}
      <input type="checkbox" checked={on} onChange={onChange} className="peer sr-only" />
      <span className="relative h-6 w-11 rounded-full bg-white/20 transition-colors peer-checked:bg-brand after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  )
}

// Flats by status at a glance, as a plot map's availability board shows plots: the total, then
// each status with its colour, one under another. Counts follow the chosen block.
function StatusSummary({ scope, counts, total, unitLabel, sample }) {
  const unit = `${unitLabel}s`
  const rows = [
    { key: 'total', label: `Total ${unit}`, count: total, swatch: 'bg-white/80' },
    ...STATUS_ORDER.map((status) => ({
      key: status,
      label: `${status === 'sold' ? 'Booked' : STATUS_LABEL[status]} ${unit}`,
      count: counts[status],
      swatch: STATUS_BG[status],
    })),
  ]
  return (
    <section
      aria-label={`${unit} by status`}
      className="rounded-xl border border-white/10 bg-black/75 p-3.5 text-sm shadow-lg backdrop-blur"
    >
      <h2 className="mb-2.5 text-xs font-bold tracking-wider text-white/70 uppercase">
        {scope}
        {sample && <span className="ml-1.5 text-status-hold">· Sample</span>}
      </h2>
      <dl className="flex flex-col gap-2">
        {rows.map(({ key, label, count, swatch }) => (
          <div key={key} className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-2.5 font-semibold whitespace-nowrap">
              <span className={`size-4 rounded ${swatch}`} aria-hidden="true" /> {label}
            </dt>
            <dd className="min-w-10 rounded-md bg-white/10 px-2 py-0.5 text-center text-base font-bold tabular-nums">
              {count}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// The public project page: /p/:shortCode. The key makes React start the page
// fresh (no stale selection or panels) when the code in the URL changes.
export default function ViewerPage() {
  const { shortCode } = useParams()
  const project = getProject(shortCode)
  if (!project) return <ProjectNotFound shortCode={shortCode} />
  return <ProjectViewer key={project.shortCode} project={project} />
}

function ProjectNotFound({ shortCode }) {
  useDocumentTitle(`Project not found | ${SITE.name}`)
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-3xl font-bold">Project not found</h1>
      <p className="text-muted-foreground">There is no project with the code “{shortCode}”.</p>
      <Link to={paths.spacerHome()} className="text-brand underline underline-offset-4">
        Back to home
      </Link>
    </main>
  )
}

function ProjectViewer({ project }) {
  const [openPanel, setOpenPanel] = useState(null) // 'brochure' | 'search' | 'query' | 'info' | null
  const [query, setQuery] = useState(EMPTY_QUERY) // the Query tool's filters, kept while it is closed
  const [colorMode, setColorMode] = useState('plain') // 'plain' | 'zones' | 'status'
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null) // a block name, or null for all
  const [selectedUnit, setSelectedUnit] = useState(null) // one flat on one floor, for the enquiry
  const [compareList, setCompareList] = useState([]) // [{ plot, unit }] picked for side-by-side comparison
  const [userPosition, setUserPosition] = useState(null)
  const [gpsOn, setGpsOn] = useState(false)
  const [toast, setToast] = useState('')
  const gpsWatchRef = useRef(null) // id returned by watchPosition, needed to stop it

  // Browser tab shows the project name while this page is open
  useDocumentTitle(`${project.name} | ${SITE.name}`)

  // Stop watching GPS when the page closes
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current)
    }
  }, [])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  const blocks = project.layout.blocks ?? NO_BLOCKS
  const units = project.units ?? NO_UNITS
  const towerUnits = useMemo(() => unitsByTower(units), [units])
  // The map colours each tower from its units' statuses; kept stable so the map is not rebuilt
  const mapProject = useMemo(() => {
    if (!units.length) return project
    return {
      ...project,
      layout: {
        ...project.layout,
        plots: project.layout.plots.map((plot) => {
          const tower = towerUnits[plot.number]
          if (!tower) return plot
          return {
            ...plot,
            status: towerStatus(tower),
            availableCount: tower.filter((unit) => unit.status === 'available').length,
            unitCount: tower.length,
          }
        }),
      },
    }
  }, [project, units, towerUnits])

  // While the Query tool is open, the flats it picked stay bright and the rest fade back
  const highlight = useMemo(
    () =>
      openPanel === 'query' && !isQueryEmpty(query)
        ? new Set(runQuery(mapProject.layout.plots, query).map((plot) => plot.number))
        : null,
    [openPanel, query, mapProject],
  )

  // Choosing a flat also chooses its block, so the other blocks fade back
  const selectPlot = useCallback(
    (plot) => {
      setSelectedPlot(plot)
      setSelectedUnit(null)
      if (plot) {
        setOpenPanel(null)
        if (blocks.some((block) => block.name === plot.zone)) setSelectedBlock(plot.zone)
      }
    },
    [blocks],
  )

  const selectBlock = useCallback((name) => {
    setSelectedBlock(name)
    setSelectedPlot(null)
    setSelectedUnit(null)
  }, [])

  // Add or remove the open flat (with its chosen floor) from the comparison
  const toggleCompare = () => {
    setCompareList((list) => {
      const index = list.findIndex((entry) => entry.plot.number === selectedPlot.number)
      if (index !== -1) return list.filter((_, i) => i !== index)
      if (list.length >= COMPARE_LIMIT) return list
      return [...list, { plot: selectedPlot, unit: selectedUnit }]
    })
  }
  const compareIndex = selectedPlot ? compareList.findIndex((entry) => entry.plot.number === selectedPlot.number) : -1

  // From the block grid: open that tower's panel with the chosen floor highlighted
  const selectUnitInTower = (tower, unit) => {
    setSelectedPlot(tower)
    setSelectedUnit(unit)
    setOpenPanel(null)
  }

  const stopGps = () => {
    if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current)
    gpsWatchRef.current = null
    setUserPosition(null)
    setGpsOn(false)
  }

  const toggleGps = () => {
    if (gpsOn) {
      stopGps()
      return
    }
    if (!navigator.geolocation) {
      showToast('Location is not available on this device')
      return
    }
    setGpsOn(true)
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {
        showToast('Could not get your location')
        stopGps()
      },
      { enableHighAccuracy: true },
    )
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: project.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch {
      // the visitor cancelled the share sheet
    }
  }

  const hasBrochure = project.brochure.pages.length > 0
  const gallery = project.gallery ?? []
  // Flats and amenities open a panel on the right on desktop, so other controls move out from under it
  const blockPanelOpen = Boolean(selectedBlock) && !selectedPlot && units.length > 0

  // Counts for the status legend: the chosen block's units, or the whole project's;
  // projects without floors count their plots instead
  const legendScope = selectedBlock ? selectedBlock : project.name
  const legendCounts = countByStatus(
    units.length
      ? units.filter((unit) => !selectedBlock || unit.block === selectedBlock)
      : project.layout.plots.filter(
          (plot) => plot.kind !== 'amenity' && (!selectedBlock || plot.zone === selectedBlock),
        ),
  )
  const legendTotal = Object.values(legendCounts).reduce((sum, n) => sum + n, 0)
  const sidePanelOpen = Boolean(selectedPlot?.plan || selectedPlot?.kind === 'amenity' || blockPanelOpen) && !openPanel
  // WhatsApp link with a ready-made message, or the site's contact link if the project has no number
  const enquiryLink = (message) =>
    project.whatsapp ? `https://wa.me/${project.whatsapp}?text=${encodeURIComponent(message)}` : getContactLink()
  const whatsappLink = enquiryLink(`Hi, I am interested in ${project.name}.`)

  // Tools without an onClick or href are not built yet and show as disabled
  const tools = [
    { icon: Image, label: 'Gallery', onClick: gallery.length ? () => setOpenPanel('gallery') : null },
    { icon: Search, label: 'Search', onClick: () => setOpenPanel('search') },
    { icon: Filter, label: 'Query', onClick: () => setOpenPanel('query') },
    { icon: LocateFixed, label: 'GPS', onClick: toggleGps, active: gpsOn },
    { icon: BookOpen, label: 'Brochure', onClick: hasBrochure ? () => setOpenPanel('brochure') : null },
    { icon: Info, label: 'Info', onClick: () => setOpenPanel('info') },
    { icon: Navigation, label: 'Locate', href: directionsUrl(project.location) },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      title: 'Enquire on WhatsApp',
      href: whatsappLink,
      iconClass: 'text-[#25d366]',
    },
  ]

  return (
    <main className="relative h-svh overflow-hidden bg-background">
      <MapView
        project={mapProject}
        colorMode={colorMode}
        selectedPlot={selectedPlot}
        selectedBlock={selectedBlock}
        highlight={highlight}
        onSelectPlot={selectPlot}
        onSelectBlock={selectBlock}
        userPosition={userPosition}
        onShare={share}
        sidePanelOpen={sidePanelOpen}
      />

      {blocks.length > 0 && (
        <div className="absolute top-44 left-5 md:top-5 md:left-1/2 md:-translate-x-1/2">
          <BlockChips blocks={blocks} selected={selectedBlock} onSelect={selectBlock} />
        </div>
      )}

      <header className="absolute top-5 left-5">
        <h1 className="text-2xl font-bold tracking-wider uppercase drop-shadow md:text-3xl">{project.name}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-white/70">
          <Link to={paths.spacerHome()} className="inline-flex items-center gap-1 hover:text-brand">
            <ArrowLeft size={12} /> {SITE.name}
          </Link>
          <span aria-hidden="true">·</span>
          {project.city}
          {project.website && (
            <>
              <span aria-hidden="true">·</span>
              <Link to={project.website} className="underline underline-offset-2 hover:text-brand">
                Project website
              </Link>
            </>
          )}
          {project.layout.sample && (
            <span className="rounded bg-status-hold/80 px-1.5 text-[10px] font-bold text-black uppercase">
              Sample layout
            </span>
          )}
        </p>
      </header>

      {/* Flats by status down the right. With a panel open it slides left, and on desktop drops
          under the block chips. */}
      <div
        className={`absolute flex w-max flex-col items-stretch gap-2 transition-[right,top] ${
          sidePanelOpen ? 'top-5 right-5 md:top-16 md:right-104' : 'top-5 right-5'
        }`}
      >
        {legendTotal > 0 && (
          <StatusSummary
            scope={legendScope}
            counts={legendCounts}
            total={legendTotal}
            unitLabel={project.unitLabel}
            sample={project.inventory === 'sample'}
          />
        )}
      </div>

      <div
        className={`absolute bottom-5 left-5 flex flex-col items-stretch gap-2 transition-[right] md:left-auto md:items-end ${
          sidePanelOpen ? 'right-5 md:right-104' : 'right-5'
        }`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Toggle
            label="Zones"
            on={colorMode === 'zones'}
            onChange={() => setColorMode(colorMode === 'zones' ? 'plain' : 'zones')}
          />
          <Toggle
            label="Status"
            on={colorMode === 'status'}
            onChange={() => setColorMode(colorMode === 'status' ? 'plain' : 'status')}
          />
        </div>

        <nav aria-label="Project tools" className="flex flex-wrap justify-end gap-1.5">
          {tools.map(({ icon: Icon, label, title = label, onClick, href, active, iconClass = '' }) => {
            const enabled = Boolean(onClick || href)
            const className = `${TOOL_BUTTON} ${enabled ? 'cursor-pointer hover:bg-border' : 'cursor-not-allowed opacity-40'} ${active ? 'text-brand' : ''}`
            const icon = (
              <>
                <Icon size={17} className={iconClass} />
                {label}
              </>
            )
            return href ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" title={title} className={className}>
                {icon}
              </a>
            ) : (
              <button
                key={label}
                type="button"
                onClick={onClick ?? undefined}
                disabled={!enabled}
                title={enabled ? title : `${title}: coming soon`}
                aria-pressed={active}
                className={className}
              >
                {icon}
              </button>
            )
          })}
        </nav>
      </div>

      {selectedPlot &&
        !openPanel &&
        (selectedPlot.plan ? (
          <FlatPanel
            project={project}
            plot={selectedPlot}
            units={towerUnits[selectedPlot.number] ?? NO_UNITS}
            blockUnits={units.filter((unit) => unit.block === selectedPlot.zone)}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            showStatus={colorMode === 'status'}
            enquiryLink={enquiryLink}
            compare={{
              inList: compareIndex !== -1,
              full: compareList.length >= COMPARE_LIMIT,
              onToggle: toggleCompare,
            }}
            onClose={() => setSelectedPlot(null)}
          />
        ) : selectedPlot.kind === 'amenity' ? (
          <AmenityPanel project={project} plot={selectedPlot} onClose={() => setSelectedPlot(null)} />
        ) : (
          <PlotCard
            project={project}
            plot={selectedPlot}
            showStatus={colorMode === 'status'}
            onClose={() => setSelectedPlot(null)}
          />
        ))}
      {blockPanelOpen && !openPanel && (
        <BlockPanel
          project={project}
          block={selectedBlock}
          units={units.filter((unit) => unit.block === selectedBlock)}
          onSelectUnit={selectUnitInTower}
          onClose={() => setSelectedBlock(null)}
        />
      )}
      {openPanel === 'search' && (
        <SearchPanel project={project} onSelect={selectPlot} onClose={() => setOpenPanel(null)} />
      )}
      {openPanel === 'query' && (
        <QueryPanel
          project={project}
          plots={mapProject.layout.plots}
          query={query}
          onChange={setQuery}
          onSelect={selectPlot}
          onClose={() => setOpenPanel(null)}
        />
      )}
      {openPanel === 'info' && <InfoPanel project={project} onClose={() => setOpenPanel(null)} />}
      {openPanel !== 'compare' && (
        <CompareTray
          entries={compareList}
          shifted={sidePanelOpen}
          onOpen={() => setOpenPanel('compare')}
          onClear={() => setCompareList([])}
        />
      )}
      {openPanel === 'compare' && (
        <ComparePanel
          project={project}
          entries={compareList}
          towerUnits={towerUnits}
          onChangeUnit={(column, unit) =>
            setCompareList((list) => list.map((entry, i) => (i === column ? { ...entry, unit } : entry)))
          }
          onRemove={(column) => {
            const next = compareList.filter((_, i) => i !== column)
            setCompareList(next)
            if (next.length < 2) setOpenPanel(null)
          }}
          enquiryLink={enquiryLink}
          onClose={() => setOpenPanel(null)}
        />
      )}
      <Suspense fallback={null}>
        {openPanel === 'gallery' && (
          <GalleryViewer
            open
            onOpenChange={(open) => !open && setOpenPanel(null)}
            items={gallery}
            title={`${project.name} gallery`}
          />
        )}
        {openPanel === 'brochure' && (
          <BrochureFlipbook
            open
            onOpenChange={(open) => !open && setOpenPanel(null)}
            pages={project.brochure.pages}
            title={project.brochure.title}
          />
        )}
      </Suspense>

      {toast && (
        <p
          role="status"
          className="absolute bottom-48 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          {toast}
        </p>
      )}
    </main>
  )
}
