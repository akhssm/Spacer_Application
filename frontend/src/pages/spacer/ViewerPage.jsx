import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, BookOpen, Image, Info, LocateFixed, MessageCircle, Navigation, Search } from 'lucide-react'
import { COMPARE_LIMIT, ComparePanel, CompareTray } from '@/components/viewer/ComparePanel'
import MapView from '@/components/viewer/MapView'
import { parseViewerSearch, viewerSearch } from '@/components/viewer/viewerUrl'
import {
  AmenityPanel,
  BlockChips,
  BlockPanel,
  FlatPanel,
  InfoPanel,
  PlotCard,
  SearchPanel,
} from '@/components/viewer/Panels'
import { SITE, getContactLink } from '@/data/spacer/siteContent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paths } from '@/routes/paths'
import { getProject } from '@/services/projects'
import { directionsUrl } from '@/utils/geo'
import { STATUS_BG, countByStatus, towerStatus, unitsByTower } from '@/utils/inventory'

// The brochure flipbook and the gallery (and their images) load only once a visitor opens them
const BrochureFlipbook = lazy(() => import('@/components/brochure/BrochureFlipbook'))
const GalleryViewer = lazy(() => import('@/components/gallery/GalleryViewer'))

const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full bg-card/90 px-3 py-3 text-sm font-semibold backdrop-blur transition-colors sm:px-5'

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

// The public project page: /p/:shortCode. The key makes React start the page
// fresh (no stale selection or panels) when the code in the URL changes.
export default function ViewerPage({ shortCode: fixedCode }) {
  // /p/:shortCode reads the code from the URL; IRA Towers' own /ira-towers route passes it in
  const { shortCode = fixedCode } = useParams()
  const { search, hash } = useLocation()
  // A project served at its own URL (/p/ira-towers → /ira-towers) keeps any ?block=&tower=&floor=
  const home = paths.viewer(shortCode)
  if (!fixedCode && !home.startsWith('/p/')) return <Navigate to={{ pathname: home, search, hash }} replace />
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
  const [openPanel, setOpenPanel] = useState(null) // 'brochure' | 'search' | 'info' | null
  const [colorMode, setColorMode] = useState('plain') // 'plain' | 'zones' | 'status'
  // A chosen plot that is not a tower (an amenity, or a plot of a project without blocks), tied
  // to the block filter it was chosen under: Back / Forward to another filter hides it again.
  const [other, setOther] = useState(null) // { plot, scope }
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

  // The selection lives in the URL (?block=A&tower=A-01&floor=4), so a refresh, a shared link and
  // the browser's Back / Forward all restore it. `block` is the block filter; `tower` is one tower
  // (one flat stack, its own building in 3D); `floor` is a floor of that tower and never exists
  // without it, so A-01 floor 4 and A-02 floor 4 are two different selections.
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const selection = parseViewerSearch(search, blocks, project.layout.plots)
  const { block: selectedBlock, floor: selectedFloor } = selection
  const selectedTower = selection.tower ? project.layout.plots.find((p) => p.number === selection.tower) : null
  const canonicalSearch = viewerSearch(selection, blocks)
  const selectedPlot = selectedTower ?? (other?.scope === selectedBlock ? other.plot : null)
  // The tower's flat on the chosen floor: the one apartment that tower + floor holds
  const selectedUnit =
    selectedTower && selectedFloor ? towerUnits[selectedTower.number]?.find((u) => u.floor === selectedFloor) : null
  const goTo = useCallback(
    (block, tower = null, floor = null) => setSearch(viewerSearch({ block, tower, floor }, blocks)),
    [setSearch, blocks],
  )
  const isTower = useCallback((plot) => plot.kind !== 'amenity' && blocks.some((b) => b.name === plot.zone), [blocks])
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

  // Choosing a tower selects only that tower (its block becomes the filter, so the other blocks
  // fade back); a 3D click on one of its floors carries that floor along, and a click on its
  // stilt or roof (no floor) keeps whatever floor it already had. Anything else that is chosen
  // (an amenity such as the clubhouse) clears the tower. `null` (a click on empty map) clears
  // the choice.
  const selectPlot = useCallback(
    (plot, floor = null) => {
      setOpenPanel(null)
      setOther(null)
      if (plot && isTower(plot)) {
        const kept = plot.number === selection.tower ? selectedFloor : null
        const next = floor ?? kept
        if (plot.number !== selection.tower || next !== selectedFloor) goTo(plot.zone, plot.number, next)
        return
      }
      if (selection.tower) goTo(selectedBlock)
      if (plot) setOther({ plot, scope: selectedBlock })
    },
    [isTower, selection.tower, selectedFloor, selectedBlock, goTo],
  )

  // The block filter: choosing a block shows that block with no tower chosen
  const selectBlock = useCallback(
    (name) => {
      setOther(null)
      if (name !== selectedBlock || selection.tower) goTo(name)
    },
    [selectedBlock, selection.tower, goTo],
  )

  // A floor of the selected tower; choosing the chosen floor (or no unit) clears it
  const setSelectedUnit = (unit) =>
    goTo(selectedBlock, selection.tower, unit && unit.floor !== selectedFloor ? unit.floor : null)
  // Closing the tower keeps its block as the filter
  const closeFlat = () => (selectedTower ? goTo(selectedBlock) : setOther(null))

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

  // From the block panel: open that tower, on the chosen floor when a grid cell was used
  const selectUnitInTower = (tower, unit) => {
    setOpenPanel(null)
    goTo(tower.zone, tower.number, unit?.floor ?? null)
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
    { icon: LocateFixed, label: 'GPS', onClick: toggleGps, active: gpsOn },
    { icon: BookOpen, label: 'Brochure', onClick: hasBrochure ? () => setOpenPanel('brochure') : null },
    { icon: Info, label: 'Info', onClick: () => setOpenPanel('info') },
    { icon: Navigation, label: 'Locate', href: directionsUrl(project.location) },
  ]

  // A URL that is valid but not canonical (a floor without a tower, a tower under the wrong block)
  if (location.search !== canonicalSearch) return <Navigate to={{ search: canonicalSearch }} replace />

  return (
    <main className="relative h-svh overflow-hidden bg-background">
      <MapView
        project={mapProject}
        colorMode={colorMode}
        selectedPlot={selectedPlot}
        selectedBlock={selectedBlock}
        selectedFloor={selectedFloor}
        selectedAmenity={selectedPlot?.kind === 'amenity' ? selectedPlot.number : null}
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
          {project.layout.sample && (
            <span className="rounded bg-status-hold/80 px-1.5 text-[10px] font-bold text-black uppercase">
              Sample layout
            </span>
          )}
        </p>
      </header>

      {colorMode === 'status' && (
        <ul
          className={`absolute flex flex-col gap-1 rounded-lg bg-black/60 p-2 text-xs backdrop-blur transition-[right,top] ${
            // With a panel open it slides left, and on desktop drops under the block chips
            sidePanelOpen ? 'top-5 right-5 md:top-16 md:right-104' : 'top-5 right-5'
          }`}
        >
          <li className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {legendScope} · {legendTotal} {project.unitLabel.toLowerCase()}s
          </li>
          {Object.entries(STATUS_BG).map(([status, swatch]) => (
            <li key={status} className="flex items-center justify-between gap-4 capitalize">
              <span className="flex items-center gap-2">
                <span className={`size-3 rounded-sm ${swatch}`} /> {status}
              </span>
              <span className="font-bold tabular-nums">{legendCounts[status]}</span>
            </li>
          ))}
          {project.inventory === 'sample' && (
            <li className="mt-1 max-w-40 text-[10px] leading-tight text-muted-foreground">Sample data for this demo</li>
          )}
        </ul>
      )}

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
          <a href={whatsappLink} target="_blank" rel="noreferrer" className={`${PILL} hover:bg-border`}>
            <MessageCircle size={18} className="text-[#25d366]" />
            <span className="text-left leading-tight">
              WhatsApp
              <span className="block text-[11px] font-normal text-muted-foreground">Inquire project</span>
            </span>
          </a>
        </div>

        <nav aria-label="Project tools" className="grid grid-cols-3 gap-2">
          {tools.map(({ icon: Icon, label, onClick, href, active }) => {
            const enabled = Boolean(onClick || href)
            const className = `${PILL} ${enabled ? 'cursor-pointer hover:bg-border' : 'cursor-not-allowed opacity-40'} ${active ? 'text-brand' : ''}`
            return href ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" className={className}>
                <Icon size={16} className="shrink-0" /> {label}
              </a>
            ) : (
              <button
                key={label}
                type="button"
                onClick={onClick ?? undefined}
                disabled={!enabled}
                title={enabled ? label : 'Coming soon'}
                aria-pressed={active}
                className={className}
              >
                <Icon size={16} className="shrink-0" /> {label}
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
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            showStatus={colorMode === 'status'}
            enquiryLink={enquiryLink}
            compare={{
              inList: compareIndex !== -1,
              full: compareList.length >= COMPARE_LIMIT,
              onToggle: toggleCompare,
            }}
            onClose={closeFlat}
          />
        ) : selectedPlot.kind === 'amenity' ? (
          <AmenityPanel project={project} plot={selectedPlot} onClose={closeFlat} />
        ) : (
          <PlotCard project={project} plot={selectedPlot} showStatus={colorMode === 'status'} onClose={closeFlat} />
        ))}
      {blockPanelOpen && !openPanel && (
        <BlockPanel
          project={project}
          block={selectedBlock}
          units={units.filter((unit) => unit.block === selectedBlock)}
          onSelectUnit={selectUnitInTower}
          onClose={() => goTo(null)}
        />
      )}
      {openPanel === 'search' && (
        <SearchPanel project={project} onSelect={selectPlot} onClose={() => setOpenPanel(null)} />
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
