import { useState } from 'react'
import { Link } from 'react-router'
import {
  ChevronDown,
  Columns3,
  ExternalLink,
  LayoutPanelTop,
  MessageCircle,
  Navigation,
  Search,
  View,
  X,
} from 'lucide-react'
import { SQ_FT_PER_SQ_M, areaSqMetres, directionsUrl, formatArea } from '@/utils/geo'
import { STATUS_BG, STATUS_LABEL, STATUS_ORDER, countByStatus } from '@/utils/inventory'
import GalleryViewer from '@/components/gallery/GalleryViewer'
import { BrochureImage } from '@/components/media/BrochureImage'
import { FlatPlanCrop } from '@/components/explore/FlatPlan'
import { apartmentId } from '@/data'
import { paths } from '@/routes/paths'
import { EMPTY_QUERY, isQueryEmpty, queryOptions, runQuery } from '@/components/viewer/plotQuery'

const SIDE_PANEL =
  'absolute inset-x-3 bottom-3 z-20 max-h-[75svh] overflow-y-auto rounded-xl border border-border bg-panel/95 p-5 text-sm backdrop-blur md:inset-x-auto md:top-20 md:right-5 md:bottom-5 md:max-h-none md:w-96'

// Demo projects show generated statuses; say so wherever availability appears
export function SampleInventoryNote({ project, className = '' }) {
  if (project.inventory !== 'sample') return null
  return (
    <p className={`text-[11px] text-muted-foreground ${className}`}>
      Sample availability for this demo, not live inventory.
    </p>
  )
}

// "Available 6 · Hold 1 · Sold 2 · Reserved 1" as coloured chips
export function StatusCounts({ counts, size = 'sm' }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.map((status) => (
        <li
          key={status}
          className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 font-bold ${
            size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
          }`}
        >
          <span className={`size-2.5 rounded-sm ${STATUS_BG[status]}`} />
          {STATUS_LABEL[status]} {counts[status]}
        </li>
      ))}
    </ul>
  )
}

// One block's inventory: a grid with a column per tower and a row per floor,
// every cell one unit coloured by status. Clicking a cell opens that flat.
export function BlockPanel({ project, block, units, onSelectUnit, onClose }) {
  const towers = project.layout.plots.filter((plot) => plot.kind !== 'amenity' && plot.zone === block)
  const floors = [...new Set(units.map((unit) => unit.floor))].sort((a, b) => b - a)
  const byKey = new Map(units.map((unit) => [`${unit.tower}/${unit.floor}`, unit]))
  const floorCounts = (floor) => countByStatus(units.filter((unit) => unit.floor === floor))
  const towerCounts = (tower) => countByStatus(units.filter((unit) => unit.tower === tower))
  // The block at a glance: its land, its apartments, and the flat types and facings it has
  const blockPolygon = project.layout.blocks?.find((b) => b.name === block)?.polygon
  const facings = [...new Set(towers.map((tower) => tower.facing).filter(Boolean))].sort()

  return (
    <aside aria-label={`${block} inventory`} className={SIDE_PANEL}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{block}</h2>
          <p className="text-xs text-muted-foreground">
            {towers.length} apartments · {floors.length} floors · {units.length} {project.unitLabel.toLowerCase()}s
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${block}`}
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <table className="mb-4 w-full overflow-hidden rounded-lg border border-border text-sm">
        <tbody>
          <InfoRow label="Block">{block}</InfoRow>
          <InfoRow label="Total apartments">{towers.length}</InfoRow>
          {blockPolygon && (
            <InfoRow label="Block total area">
              <LandArea sqMetres={areaSqMetres(blockPolygon)} />
            </InfoRow>
          )}
          {bhkMix(towers) && <InfoRow label="Block type">{bhkMix(towers)}</InfoRow>}
          {facings.length > 0 && <InfoRow label="Block facing">{facings.join(' & ')}</InfoRow>}
        </tbody>
      </table>

      <StatusCounts counts={countByStatus(units)} />
      <SampleInventoryNote project={project} className="mt-2" />

      {units.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No inventory yet for this block.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-[10px] leading-none">
            <thead>
              <tr>
                <th className="pr-1 text-left font-normal text-muted-foreground">Floor</th>
                {towers.map((tower) => (
                  <th
                    key={tower.number}
                    className="w-5 pb-1 font-bold text-white/85"
                    title={`${project.unitLabel} ${tower.number}`}
                  >
                    {tower.number.replace(/^.*-/, '')}
                  </th>
                ))}
                <th className="pl-1 text-left font-normal text-muted-foreground">Avail.</th>
              </tr>
            </thead>
            <tbody>
              {floors.map((floor) => (
                <tr key={floor}>
                  <th className="pr-1 text-left font-bold text-white/85">{floor}</th>
                  {towers.map((tower) => {
                    const unit = byKey.get(`${tower.number}/${floor}`)
                    return (
                      <td key={tower.number}>
                        {unit && (
                          <button
                            type="button"
                            onClick={() => onSelectUnit(tower, unit)}
                            title={`${unit.number}: ${STATUS_LABEL[unit.status]}`}
                            aria-label={`${unit.number}, ${STATUS_LABEL[unit.status]}`}
                            className={`block size-5 cursor-pointer rounded-sm transition-transform hover:scale-125 ${STATUS_BG[unit.status]}`}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td className="pl-1 text-muted-foreground">{floorCounts(floor).available}</td>
                </tr>
              ))}
              <tr>
                <th className="pt-1 pr-1 text-left font-normal text-muted-foreground">Avail.</th>
                {towers.map((tower) => (
                  <td key={tower.number} className="pt-1 text-center text-muted-foreground">
                    {towerCounts(tower.number).available}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Each square is one flat. Tap a square to see that flat.</p>
    </aside>
  )
}

const CHIP =
  'inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors'

// "All blocks / Block A / Block B / Block C" switcher
export function BlockChips({ blocks, selected, onSelect }) {
  // In name order, whatever order the project lists its blocks in
  const names = blocks.map((b) => b.name).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const options = [{ name: null, label: 'All blocks' }, ...names.map((name) => ({ name, label: name }))]
  return (
    <div role="group" aria-label="Choose a block" className="flex flex-wrap gap-1.5">
      {options.map(({ name, label }) => {
        const active = selected === name
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(name)}
            aria-pressed={active}
            className={`${CHIP} ${
              active
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-border bg-card/90 text-white backdrop-blur hover:border-brand'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// One row of the apartment's facts table: the name in bold, the value beside it
function InfoRow({ label, children }) {
  return (
    <tr className="odd:bg-white/[0.06]">
      <th scope="row" className="w-1/2 px-3 py-2 text-left text-xs font-bold text-white/70">
        {label}
      </th>
      <td className="px-3 py-2 font-bold">{children}</td>
    </tr>
  )
}

// One flat position, apartment by apartment: every floor's apartment with its number, floor,
// status, type, area and facing (and the buyer's name, when the inventory carries one), as a plot
// map's feature info shows a plot. The floor plan and room sizes open underneath.
export function FlatPanel({
  project,
  plot,
  units = [],
  blockUnits = units, // every unit in the flat's block: the apartment building it stands in
  selectedUnit,
  onSelectUnit,
  showStatus,
  enquiryLink,
  compare, // { inList, full, onToggle }
  onClose,
}) {
  const area = formatArea(plot.areaSqFt / SQ_FT_PER_SQ_M)
  const title = `${project.unitLabel} ${plot.number}`
  const chosen = selectedUnit ? ` (${selectedUnit.number}, floor ${selectedUnit.floor})` : ''
  const message = `Hi, I am interested in ${title}${chosen} at ${project.name}: ${plot.bhk}, ${plot.facing} facing, ${area.sqft}.`
  const counts = units.length ? countByStatus(units) : null
  // The land the apartment stands on: its square on the layout
  const landSqM = areaSqMetres(plot.polygon)
  const details = [plot.bhk, `${plot.facing} facing`, area.sqft].filter(Boolean).join(' · ')
  // The apartment building (the block) at a glance: its floors, its flats per floor and in all,
  // and the flat types it has
  const floors = new Set(blockUnits.map((unit) => unit.floor)).size
  const flatsPerFloor = floors ? Math.max(...countPerFloor(blockUnits)) : 0
  const blockPlots = project.layout.plots.filter((p) => p.kind !== 'amenity' && p.zone === plot.zone)
  const blockTypes = bhkMix(blockPlots)

  return (
    <aside aria-label={title} className={SIDE_PANEL}>
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Apartment info</p>
          <h2 className="text-xl font-bold">Apartment {plot.number}</h2>
          <p className="text-xs text-muted-foreground">
            {plot.zone} · {project.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <table className="mb-4 w-full overflow-hidden rounded-lg border border-border text-sm">
        <tbody>
          <InfoRow label="Block">{plot.zone}</InfoRow>
          <InfoRow label="Apartment No">{plot.number.split('-').pop()}</InfoRow>
          {floors > 0 && (
            <>
              <InfoRow label="Floors">{floors}</InfoRow>
              <InfoRow label="Flats per floor">{flatsPerFloor}</InfoRow>
              <InfoRow label="Total flats">{blockUnits.length}</InfoRow>
            </>
          )}
          <InfoRow label="Type">{blockTypes || plot.bhk}</InfoRow>
          <InfoRow label="Facing">{plot.facing}</InfoRow>
          <InfoRow label="Apartment land">
            <LandArea sqMetres={landSqM} />
          </InfoRow>
        </tbody>
      </table>

      {counts ? (
        <>
          <h3 className="mb-2 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Flats by floor</h3>
          <StatusCounts counts={counts} />
          <SampleInventoryNote project={project} className="mt-1.5" />
          <ul className="mt-3 flex flex-col gap-1.5">
            {units.map((unit) => {
              const active = selectedUnit?.number === unit.number
              return (
                <li key={unit.number}>
                  <button
                    type="button"
                    onClick={() => onSelectUnit(active ? null : unit)}
                    aria-pressed={active}
                    className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors ${
                      active ? 'border-brand bg-brand/10' : 'border-border bg-white/[0.03] hover:border-white/30'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {unit.number}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Floor {unit.floor}</span>
                      </span>
                      <StatusPill status={unit.status} />
                    </span>
                    <span className="mt-0.5 block text-xs text-white/75">{details}</span>
                    {unit.customer && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">Customer: {unit.customer}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Tap an apartment to enquire about it.</p>
        </>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {details}
          {showStatus && plot.status && <StatusPill status={plot.status} />}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={enquiryLink(message)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground hover:bg-brand-strong"
        >
          <MessageCircle size={16} /> {selectedUnit ? `Enquire ${selectedUnit.number}` : 'Enquire'}
        </a>
        <a
          href={directionsUrl(project.location)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold hover:border-brand hover:text-brand"
        >
          <Navigation size={16} /> Navigate
        </a>
      </div>

      {compare && (
        <button
          type="button"
          onClick={compare.onToggle}
          disabled={!compare.inList && compare.full}
          aria-pressed={compare.inList}
          className={`mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors disabled:cursor-default disabled:opacity-50 ${
            compare.inList ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:border-brand'
          }`}
        >
          <Columns3 size={16} />
          {compare.inList ? 'Remove from compare' : compare.full ? 'Compare list is full' : 'Add to compare'}
        </button>
      )}

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
          Floor plan &amp; rooms
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2">
          {plot.plan && (
            <>
              <FlatPlanCrop blockId={plot.plan.blockId} flatNo={plot.plan.flatNo} className="border border-border" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                The flat on its block's typical floor plan, as printed in the brochure.
              </p>
              <ExplorerLinks plan={plot.plan} unit={selectedUnit} />
            </>
          )}
          <table className="mt-3 w-full">
            <tbody>
              {plot.rooms.map((roomItem, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-white/85">{roomItem.name}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{roomItem.size}</td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="py-1.5 pr-3 text-white/85">Total area</td>
                <td className="py-1.5 text-right font-semibold">
                  {area.sqft}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {area.sqyd} · {area.sqm}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </aside>
  )
}

// Land in square yards, as plots are sold, with square feet underneath
function LandArea({ sqMetres }) {
  const area = formatArea(sqMetres)
  return (
    <>
      {area.sqyd}
      <span className="block text-xs font-normal text-muted-foreground">{area.sqft}</span>
    </>
  )
}

// The flat types among some plots: "2 BHK", "3 BHK", or "2 & 3 BHKs" when there are both
function bhkMix(plots) {
  const counts = [...new Set(plots.map((p) => parseInt(p.bhk, 10)).filter(Number.isFinite))].sort((a, b) => a - b)
  if (!counts.length) return ''
  return counts.length === 1 ? `${counts[0]} BHK` : `${counts.join(' & ')} BHKs`
}

// How many flats each floor has, from a list of units
function countPerFloor(units) {
  const perFloor = {}
  units.forEach((unit) => {
    perFloor[unit.floor] = (perFloor[unit.floor] ?? 0) + 1
  })
  return Object.values(perFloor)
}

// Deep links into the IRA Towers site: the flat's floor plan and 3D view, and its virtual tour.
// Unit numbers share the site's apartment IDs, so the chosen floor opens that exact apartment.
function ExplorerLinks({ plan, unit }) {
  const floor = unit?.floor ?? 1
  const target = {
    blockId: plan.blockId,
    floor,
    apartmentId: unit?.number ?? apartmentId(plan.blockId, floor, plan.flatNo),
  }
  const link =
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-brand hover:text-brand'
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Link to={paths.explore(target)} className={link}>
        <LayoutPanelTop size={14} /> Plan &amp; 3D
      </Link>
      <Link to={paths.tour(target)} className={link}>
        <View size={14} /> Virtual tour
      </Link>
      {!unit && (
        <p className="col-span-2 text-[11px] text-muted-foreground">
          Opens floor 1. Pick a floor above to open that one.
        </p>
      )}
    </div>
  )
}

// An amenity such as the club house or the play area: what it is, its pictures and its facilities
export function AmenityPanel({ project, plot, onClose }) {
  const [openImage, setOpenImage] = useState(null) // index of the picture shown large
  const images = plot.images ?? []
  const features = plot.features ?? []
  // The plan states the club house's area; other amenities are measured from the traced shape
  const measured = !plot.areaSqFt
  const area = formatArea(plot.areaSqFt ? plot.areaSqFt / SQ_FT_PER_SQ_M : areaSqMetres(plot.polygon))

  return (
    <aside
      aria-label={plot.number}
      className="absolute inset-x-3 bottom-3 z-20 max-h-[75svh] overflow-y-auto rounded-xl border border-border bg-panel/95 p-5 text-sm backdrop-blur md:inset-x-auto md:top-20 md:right-5 md:bottom-5 md:max-h-none md:w-96"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{plot.number}</h2>
          <p className="text-xs text-muted-foreground">
            {plot.zone} · {project.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${plot.number}`}
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
        {measured ? '≈ ' : ''}
        {area.sqft}
        <span className="font-normal text-muted-foreground">
          {area.sqm}
          {measured ? ' · from the plan' : ''}
        </span>
      </p>

      {plot.description && <p className="leading-6 text-white/85">{plot.description}</p>}

      {images.length > 0 && (
        <ul className={`mt-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setOpenImage(index)}
                aria-label={`View ${image.caption || 'picture'} full size`}
                className="block aspect-4/3 w-full cursor-pointer overflow-hidden rounded-lg bg-white/5"
              >
                <BrochureImage asset={image.id} sizes="200px" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {features.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
            {plot.number === 'Club House' ? 'Facilities' : 'Features'}
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {features.map((feature) => (
              <li key={feature} className="rounded-full border border-border px-3 py-1 text-xs text-white/85">
                {feature}
              </li>
            ))}
          </ul>
        </>
      )}

      {openImage !== null && (
        <GalleryViewer
          open
          onOpenChange={(open) => !open && setOpenImage(null)}
          items={images}
          initialIndex={openImage}
          title={plot.number}
        />
      )}
    </aside>
  )
}

// Shared frame for the small panels that slide in at the bottom-left
function Panel({ title, onClose, children }) {
  return (
    <aside className="absolute bottom-40 left-5 z-10 w-[calc(100%-2.5rem)] rounded-xl border border-border bg-panel/95 p-4 text-sm backdrop-blur md:bottom-5 md:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </aside>
  )
}

export function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white capitalize ${STATUS_BG[status]}`}>
      {status}
    </span>
  )
}

// Details of the plot the visitor clicked or searched for
export function PlotCard({ project, plot, showStatus, onClose }) {
  const isAmenity = plot.kind === 'amenity'
  // Prefer the size printed on the plan (saleable area); otherwise measure the shape.
  // Amenities only get an area if the plan states one.
  const sqMetres = plot.areaSqFt ? plot.areaSqFt / SQ_FT_PER_SQ_M : isAmenity ? null : areaSqMetres(plot.polygon)
  const area = sqMetres && formatArea(sqMetres)

  return (
    <Panel title={isAmenity ? plot.number : `${project.unitLabel} ${plot.number}`} onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-muted-foreground">
        <dt>Zone</dt>
        <dd className="text-white">{plot.zone}</dd>
        {showStatus && !isAmenity && (
          <>
            <dt>Status</dt>
            <dd>
              <StatusPill status={plot.status} />
            </dd>
          </>
        )}
        {area && (
          <>
            <dt>Area</dt>
            <dd className="text-white">
              {area.sqft}
              <span className="block text-xs text-muted-foreground">
                {area.sqyd} · {area.sqm}
              </span>
            </dd>
          </>
        )}
      </dl>
    </Panel>
  )
}

// Find a plot by its number or name
export function SearchPanel({ project, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const matches = project.layout.plots.filter((plot) => plot.number.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <Panel title="Search" onClose={onClose}>
      <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`${project.unitLabel} number or amenity`}
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      <ul className="mt-3 max-h-56 overflow-y-auto">
        {matches.map((plot) => (
          <li key={plot.number}>
            <button
              type="button"
              onClick={() => onSelect(plot)}
              className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-white/5"
            >
              <span>{plot.kind === 'amenity' ? plot.number : `${project.unitLabel} ${plot.number}`}</span>
              <span className="text-xs text-muted-foreground">{plot.zone}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="px-2 py-1.5 text-muted-foreground">No match</li>}
      </ul>
    </Panel>
  )
}

// One filter's choices as chips; any number can be on at once
function QueryChips({ label, options, chosen, onChange }) {
  if (!options.length) return null
  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(({ value, label: text }) => {
          const on = chosen.includes(value)
          return (
            <button
              key={text}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? chosen.filter((v) => v !== value) : [...chosen, value])}
              className={`${CHIP} ${on ? 'border-brand bg-brand text-black' : 'border-border bg-background hover:bg-white/5'}`}
            >
              {text}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

// Pick flats by BHK, facing, size and availability; the map fades every other flat back
export function QueryPanel({ project, plots, query, onChange, onSelect, onClose }) {
  const options = queryOptions(plots)
  const matches = runQuery(plots, query)
  const set = (key) => (value) => onChange({ ...query, [key]: value })
  const asOptions = (values) => values.map((value) => ({ value, label: value }))
  const hasAvailability = plots.some((plot) => plot.availableCount != null || plot.status)

  return (
    <Panel title="Query" onClose={onClose}>
      <QueryChips label="Type" options={asOptions(options.bhk)} chosen={query.bhk} onChange={set('bhk')} />
      <QueryChips label="Facing" options={asOptions(options.facing)} chosen={query.facing} onChange={set('facing')} />
      <QueryChips
        label="Size"
        options={options.size.map(({ index, label }) => ({ value: index, label }))}
        chosen={query.size}
        onChange={set('size')}
      />
      {hasAvailability && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={query.availableOnly}
            onChange={(event) => onChange({ ...query, availableOnly: event.target.checked })}
            className="accent-brand"
          />
          Only {project.unitLabel.toLowerCase()}s with floors available
        </label>
      )}
      <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
        <span>
          {matches.length} {project.unitLabel.toLowerCase()}
          {matches.length === 1 ? '' : 's'} match
        </span>
        {!isQueryEmpty(query) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_QUERY)}
            className="cursor-pointer text-brand hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="mt-1 max-h-40 overflow-y-auto">
        {matches.map((plot) => (
          <li key={plot.number}>
            <button
              type="button"
              onClick={() => onSelect(plot)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white/5"
            >
              <span>
                {project.unitLabel} {plot.number}
              </span>
              <span className="text-xs text-muted-foreground">
                {[plot.bhk, plot.facing, plot.areaSqFt && `${plot.areaSqFt} sft`].filter(Boolean).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// About the project
export function InfoPanel({ project, onClose }) {
  return (
    <Panel title={project.name} onClose={onClose}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {project.type} · {project.city}
      </p>
      <p className="mt-3 leading-6 text-white/85">{project.description}</p>
      <p className="mt-3 text-muted-foreground">{project.address}</p>
      <p className="mt-1 text-muted-foreground">
        {project.layout.plots.length} {project.unitLabel.toLowerCase()}s · {project.zones.join(', ')}
      </p>
      <a
        href={directionsUrl(project.location)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-brand hover:underline"
      >
        Open in Google Maps <ExternalLink size={14} />
      </a>
    </Panel>
  )
}
