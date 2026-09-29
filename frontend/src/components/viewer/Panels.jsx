import { useState } from 'react'
import { Link } from 'react-router'
import { Columns3, Compass, ExternalLink, LayoutPanelTop, MessageCircle, Search, View, X } from 'lucide-react'
import { SQ_FT_PER_SQ_M, areaSqMetres, directionsUrl, formatArea } from '@/utils/geo'
import { STATUS_BG, STATUS_LABEL, STATUS_ORDER, countByStatus } from '@/utils/inventory'
import GalleryViewer from '@/components/gallery/GalleryViewer'
import { BrochureImage } from '@/components/media/BrochureImage'
import { FlatPlanCrop } from '@/components/explore/FlatPlan'
import { getApartment, getBlock } from '@/data'
import { paths } from '@/routes/paths'
import { getTourForApartment } from '@/components/explore/tour/tours'

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

// The block filter: the chosen block's towers to pick from, and (folded away, so the panel stays
// compact over the map) its inventory grid: a column per tower, a row per floor, every cell one
// unit coloured by status. A block has no floor of its own: floors belong to a tower, so picking
// a tower, or a cell (a tower on one floor), is how a floor is chosen.
export function BlockPanel({ project, block, units, onSelectUnit, onClose }) {
  const towers = project.layout.plots.filter((plot) => plot.kind !== 'amenity' && plot.zone === block)
  const floors = [...new Set(units.map((unit) => unit.floor))].sort((a, b) => b - a)
  const byKey = new Map(units.map((unit) => [`${unit.tower}/${unit.floor}`, unit]))
  const floorCounts = (level) => countByStatus(units.filter((unit) => unit.floor === level))
  const towerCounts = (tower) => countByStatus(units.filter((unit) => unit.tower === tower))
  const unitLabel = project.unitLabel.toLowerCase()
  // The IRA Towers block behind this one, when its flats carry brochure plans
  const declared = getBlock(towers.find((tower) => tower.plan)?.plan.blockId)?.declaredUnits.value

  return (
    <aside aria-label={`${block} details`} className={`${SIDE_PANEL} max-h-[55svh]`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-brand uppercase">Block</p>
          <h2 className="text-xl font-bold">{block}</h2>
          <p className="text-xs text-muted-foreground">
            {towers.length} towers · {floors.length} floors · {units.length} {unitLabel}s
          </p>
          {declared !== undefined && declared !== units.length && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              The brochure declares {declared} {unitLabel}s; its typical floor plan shows {units.length}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Clear ${block} filter`}
          title="Show all blocks"
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {units.length === 0 ? (
        <p className="text-muted-foreground">No inventory yet for this block.</p>
      ) : (
        <>
          <h3 id="tower-picker" className="mb-2 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
            Select tower
          </h3>
          <div role="group" aria-labelledby="tower-picker" className="grid grid-cols-4 gap-1.5">
            {towers.map((tower) => (
              <button
                key={tower.number}
                type="button"
                onClick={() => onSelectUnit(tower, null)}
                aria-label={`Tower ${tower.number}`}
                className="flex cursor-pointer flex-col items-center rounded-md border border-border py-1.5 leading-tight transition-colors hover:border-white/40"
              >
                <span className="text-sm font-bold">{tower.number}</span>
                {tower.bhk && <span className="text-[10px] text-muted-foreground">{tower.bhk}</span>}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Each tower is one stack of {unitLabel}s, one per floor. Tap a tower here or on the map.
          </p>

          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Availability, every tower and floor
            </summary>
            <div className="mt-3">
              <StatusCounts counts={countByStatus(units)} />
              <SampleInventoryNote project={project} className="mt-2" />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="border-separate border-spacing-0.5 text-[10px] leading-none">
                <thead>
                  <tr>
                    <th className="pr-1 text-left font-normal text-muted-foreground">Floor</th>
                    {towers.map((tower) => (
                      <th
                        key={tower.number}
                        className="w-5 pb-1 font-bold text-white/85"
                        title={`Tower ${tower.number}`}
                      >
                        {tower.number.replace(/^.*-/, '')}
                      </th>
                    ))}
                    <th className="pl-1 text-left font-normal text-muted-foreground">Avail.</th>
                  </tr>
                </thead>
                <tbody>
                  {floors.map((level) => (
                    <tr key={level}>
                      <th className="pr-1 text-left font-bold text-white/85">{level}</th>
                      {towers.map((tower) => {
                        const unit = byKey.get(`${tower.number}/${level}`)
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
                      <td className="pl-1 text-muted-foreground">{floorCounts(level).available}</td>
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
            <p className="mt-3 text-[11px] text-muted-foreground">
              Each square is one flat: a tower on one floor. Tap a square to open it.
            </p>
          </details>
        </>
      )}
    </aside>
  )
}

const CHIP =
  'inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors'

// "All blocks / Block A / Block B / Block C" switcher
export function BlockChips({ blocks, selected, onSelect }) {
  const options = [{ name: null, label: 'All blocks' }, ...blocks.map((b) => ({ name: b.name, label: b.name }))]
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

// One tower (one flat position, stacked on every floor): type, facing, area, a floor picker with
// the status of its flat on every floor, its floor plan, every room's size and, once a floor is
// chosen, that tower + floor's flat and its walkthrough. Projects whose plots have no floors show
// the same panel without the floor parts.
export function FlatPanel({
  project,
  plot,
  units = [],
  selectedUnit,
  onSelectUnit,
  showStatus,
  enquiryLink,
  compare, // { inList, full, onToggle }
  onClose,
}) {
  const area = formatArea(plot.areaSqFt / SQ_FT_PER_SQ_M)
  const title = units.length ? `Tower ${plot.number}` : `${project.unitLabel} ${plot.number}`
  const chosen = selectedUnit ? ` (${selectedUnit.number}, floor ${selectedUnit.floor})` : ''
  const message = `Hi, I am interested in ${project.unitLabel} ${plot.number}${chosen} at ${project.name}: ${plot.bhk}, ${plot.facing} facing, ${area.sqft}.`
  const counts = units.length ? countByStatus(units) : null

  return (
    <aside aria-label={title} className={`${SIDE_PANEL} max-h-[55svh]`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {counts && <p className="text-[10px] font-bold tracking-[0.15em] text-brand uppercase">Selected tower</p>}
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {plot.zone} · {project.name}
            {counts && ` · ${units.length} floors · 1 ${project.unitLabel.toLowerCase()} per floor`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          title="Clear selection"
          className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{plot.bhk}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
          <Compass size={12} /> {plot.facing} facing
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{area.sqft}</span>
        {showStatus && !counts && <StatusPill status={plot.status} />}
      </div>

      {counts && (
        <>
          <h3 id="floor-picker" className="mb-2 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
            Select floor
          </h3>
          <div role="group" aria-labelledby="floor-picker" className="grid grid-cols-5 gap-1.5">
            {units.map((unit) => {
              const active = selectedUnit?.number === unit.number
              return (
                <button
                  key={unit.number}
                  type="button"
                  onClick={() => onSelectUnit(active ? null : unit)}
                  aria-pressed={active}
                  aria-label={`Floor ${unit.floor}, ${unit.number}, ${STATUS_LABEL[unit.status]}`}
                  title={`${unit.number}: ${STATUS_LABEL[unit.status]}`}
                  className={`flex h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border text-sm font-bold tabular-nums transition-colors ${
                    active ? 'border-brand bg-brand text-brand-foreground' : 'border-border hover:border-white/40'
                  }`}
                >
                  {String(unit.floor).padStart(2, '0')}
                  <span className={`h-1 w-4 rounded-full ${STATUS_BG[unit.status]}`} aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <div className="mt-2">
            <StatusCounts counts={counts} />
            <SampleInventoryNote project={project} className="mt-1.5" />
          </div>
          {selectedUnit ? (
            <TowerFloor plot={plot} unit={selectedUnit} />
          ) : (
            <p className="mt-2 mb-4 text-[11px] text-muted-foreground">
              Choose a floor to open this tower on that floor.
            </p>
          )}
        </>
      )}

      {plot.plan && !selectedUnit && (
        <>
          <FlatPlanCrop blockId={plot.plan.blockId} flatNo={plot.plan.flatNo} className="border border-border" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            The flat on its block's typical floor plan, as printed in the brochure.
          </p>
        </>
      )}

      <h3 className="mt-5 mb-2 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Rooms</h3>
      <table className="w-full">
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

      <a
        href={enquiryLink(message)}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:bg-brand-strong"
      >
        <MessageCircle size={16} /> {selectedUnit ? `Enquire about ${selectedUnit.number}` : 'Enquire about this flat'}
      </a>

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
    </aside>
  )
}

// The selected tower on its selected floor: that floor's plan (the tower's flat, which is the whole
// of the tower on that floor), and its walkthrough and plan on the IRA Towers site. Unit numbers
// share the site's apartment IDs, so tower A-01 on floor 4 opens apartment A-0401 there.
function TowerFloor({ plot, unit }) {
  const label = String(unit.floor).padStart(2, '0')
  const apartment = plot.plan ? getApartment(unit.number) : undefined
  const tour = apartment && getTourForApartment(apartment)
  const target = apartment && { blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id }
  return (
    <section aria-label={`Tower ${plot.number}, floor ${label}`} className="mt-4 mb-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold">
          Floor {label} · {unit.number}
        </h3>
        <StatusPill status={unit.status} />
      </div>
      {plot.plan && (
        <>
          <FlatPlanCrop blockId={plot.plan.blockId} flatNo={plot.plan.flatNo} className="border border-border" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Floor plan of tower {plot.number} on floor {label}: {unit.number}, as printed on the brochure's typical
            floor plan (the same on every floor).
          </p>
        </>
      )}
      {tour ? (
        <>
          <Link
            to={paths.tour(target)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:bg-brand-strong"
          >
            <View size={16} /> Walkthrough floor {label}
          </Link>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            A 360° walk through {unit.number}. The interior is the sample {tour.bhk} BHK tour
            {tour.media === 'placeholder' ? ', with placeholder images for now' : ''}: representative, not this flat's
            final design.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">No walkthrough is available for this floor yet.</p>
      )}
      {target && (
        <Link
          to={paths.explore(target)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-brand hover:text-brand"
        >
          <LayoutPanelTop size={14} /> Plan &amp; 3D on the IRA Towers site
        </Link>
      )}
    </section>
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
          <p className="text-[10px] font-bold tracking-[0.15em] text-brand uppercase">Amenity</p>
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
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <a
          href={directionsUrl(project.location)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-brand hover:underline"
        >
          Open in Google Maps <ExternalLink size={14} />
        </a>
        {project.website && (
          <Link to={project.website} className="inline-flex items-center gap-1.5 text-brand hover:underline">
            Project website <ExternalLink size={14} />
          </Link>
        )}
      </div>
    </Panel>
  )
}
