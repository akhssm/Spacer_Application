import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Columns3, MessageCircle, X } from 'lucide-react'
import { SQ_FT_PER_SQ_M, formatArea } from '@/utils/geo'
import { STATUS_BG, STATUS_LABEL, countByStatus } from '@/utils/inventory'
import { alignRooms } from '@/utils/rooms'
import { FlatPlanCrop } from '@/components/explore/FlatPlan'

export const COMPARE_LIMIT = 3

// Best value in a row: bold in the theme's primary colour, underlined in its brand colour (readable on both themes)
const BEST = 'font-bold text-primary underline decoration-brand decoration-2 underline-offset-4'

const ICON_BUTTON =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground'

// The pill at the bottom of the map while flats are picked for comparison
export function CompareTray({ entries, shifted = false, onOpen, onClear }) {
  if (!entries.length) return null
  const names = entries.map((entry) => entry.unit?.number ?? entry.plot.number).join(', ')
  return (
    // Under the block chips on phones; just above the toolbar on desktop, moving
    // left with the other controls when a side panel is open
    <div
      className={`absolute top-56 right-5 left-5 z-20 flex items-center justify-between gap-1 rounded-full border border-brand/60 bg-panel/95 py-1 pr-1 pl-4 text-sm shadow-2xl backdrop-blur transition-[right] md:top-auto md:bottom-32 md:left-auto md:justify-start ${
        shifted ? 'md:right-104' : 'md:right-5'
      }`}
    >
      <span className="text-foreground/80">
        Comparing <span className="font-bold text-foreground">{names}</span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={entries.length < 2}
        className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-strong disabled:cursor-default disabled:opacity-50"
      >
        <Columns3 size={14} /> {entries.length < 2 ? 'Pick one more' : 'Compare'}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear comparison"
        className="cursor-pointer rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// Best value in a row of numbers gets the lime mark
const best = (values, higherIsBetter = true) => {
  const numbers = values.filter((value) => typeof value === 'number')
  if (numbers.length < 2 || new Set(numbers).size === 1) return null
  return higherIsBetter ? Math.max(...numbers) : Math.min(...numbers)
}

// Full-screen table: one column per flat, one row per fact, rooms lined up by name.
// `inventory` adds the floor picker, status and availability rows; projects that publish no
// availability (the IRA Towers site) leave it off and compare the flats alone.
export function ComparePanel({
  project,
  entries,
  towerUnits = {},
  inventory = true,
  onChangeUnit,
  onRemove,
  enquiryLink,
  onClose,
}) {
  const [differencesOnly, setDifferencesOnly] = useState(false)

  const flats = entries.map((entry) => entry.plot)
  const roomRows = alignRooms(flats)
  const areas = flats.map((flat) => flat.areaSqFt ?? null)
  const bestArea = best(areas)

  // Each fact is a row: label, one cell per flat, and whether the cells differ
  const rows = [
    { label: 'Block', cells: flats.map((flat) => flat.zone) },
    { label: 'Type', cells: flats.map((flat) => flat.bhk ?? '—') },
    { label: 'Facing', cells: flats.map((flat) => flat.facing ?? '—') },
    {
      label: 'Floor',
      cells: entries.map((entry, column) => {
        const units = towerUnits[entry.plot.number]
        if (!units?.length) return '—'
        return (
          <select
            key={column}
            value={entry.unit?.number ?? ''}
            onChange={(event) => onChangeUnit(column, units.find((unit) => unit.number === event.target.value) ?? null)}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">Any floor</option>
            {units.map((unit) => (
              <option key={unit.number} value={unit.number}>
                Floor {unit.floor} · {unit.number} · {STATUS_LABEL[unit.status]}
              </option>
            ))}
          </select>
        )
      }),
      compare: entries.map((entry) => entry.unit?.floor ?? ''),
    },
    {
      label: 'Status',
      cells: entries.map((entry, column) => {
        const status = entry.unit?.status
        if (!status)
          return (
            <span key={column} className="text-muted-foreground">
              Pick a floor
            </span>
          )
        return (
          <span
            key={column}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${STATUS_BG[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        )
      }),
      compare: entries.map((entry) => entry.unit?.status ?? ''),
    },
    {
      label: 'Area',
      cells: flats.map((flat, column) => {
        if (!flat.areaSqFt) return '—'
        const area = formatArea(flat.areaSqFt / SQ_FT_PER_SQ_M)
        return (
          <span key={column} className={flat.areaSqFt === bestArea ? BEST : ''}>
            {area.sqft}
            <span className="block text-xs font-normal text-muted-foreground">
              {area.sqyd} · {area.sqm}
            </span>
          </span>
        )
      }),
      compare: areas,
    },
    ...roomRows.map((row) => {
      const sqfts = row.cells.map((cell) => cell?.sqft ?? null)
      const bestSqft = best(sqfts)
      return {
        label: row.label,
        cells: row.cells.map((cell, column) => {
          if (!cell)
            return (
              <span key={column} className="text-muted-foreground">
                —
              </span>
            )
          return (
            <span key={column} className={cell.sqft != null && cell.sqft === bestSqft ? BEST : ''}>
              {cell.size}
              {cell.sqft != null && (
                <span className="block text-xs font-normal text-muted-foreground">{cell.sqft} sq.ft</span>
              )}
            </span>
          )
        }),
        compare: row.cells.map((cell) => cell?.size ?? ''),
      }
    }),
    {
      label: 'Availability',
      cells: entries.map((entry, column) => {
        const units = towerUnits[entry.plot.number]
        if (!units?.length) return '—'
        const counts = countByStatus(units)
        return (
          <span key={column}>
            <span className="font-bold">{counts.available}</span> of {units.length} floors available
            <span className="block text-xs text-muted-foreground">
              {counts.hold} hold · {counts.sold} sold · {counts.reserved} reserved
            </span>
          </span>
        )
      }),
      compare: entries.map((entry) => countByStatus(towerUnits[entry.plot.number] ?? []).available),
    },
  ]

  const INVENTORY_ROWS = ['Floor', 'Status', 'Availability']
  const shownRows = inventory ? rows : rows.filter((row) => !INVENTORY_ROWS.includes(row.label))
  const visibleRows = differencesOnly
    ? shownRows.filter((row) => new Set((row.compare ?? row.cells).map(String)).size > 1)
    : shownRows

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compare flats"
      className="fixed inset-0 z-(--z-modal) flex flex-col bg-background text-foreground"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <p className="text-sm text-muted-foreground">
          {project.name} <span className="mx-1 opacity-50">·</span> Compare {entries.length} flats
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={differencesOnly}
            onChange={(event) => setDifferencesOnly(event.target.checked)}
            className="accent-brand"
          />
          Differences only
        </label>
        <button type="button" onClick={onClose} aria-label="Close comparison" className={ICON_BUTTON}>
          <X size={24} strokeWidth={1.25} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
        <table className="mx-auto w-full max-w-5xl border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="w-32 p-2 text-left align-bottom text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Flat
              </th>
              {entries.map((entry, column) => (
                <th key={column} className="min-w-52 p-2 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold">
                        {entry.unit?.number ?? `${project.unitLabel} ${entry.plot.number}`}
                      </p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {entry.unit
                          ? `${project.unitLabel} ${entry.plot.number} · floor ${entry.unit.floor}`
                          : 'any floor'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(column)}
                      aria-label={`Remove ${entry.plot.number} from comparison`}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {entry.plot.plan && (
                    <FlatPlanCrop
                      blockId={entry.plot.plan.blockId}
                      flatNo={entry.plot.plan.flatNo}
                      className="mt-2 max-h-44 border border-border"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <th className="border-t border-border p-2 text-left align-top font-semibold text-foreground/85">
                  {row.label}
                </th>
                {row.cells.map((cell, column) => (
                  <td key={column} className="border-t border-border p-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={entries.length + 1} className="p-6 text-center text-muted-foreground">
                  These flats are identical on every row.
                </td>
              </tr>
            )}
            <tr>
              <td className="p-2" />
              {entries.map((entry, column) => {
                const name = entry.unit?.number ?? `${project.unitLabel} ${entry.plot.number}`
                const message = `Hi, I am interested in ${name} at ${project.name}: ${entry.plot.bhk}, ${entry.plot.facing} facing, ${entry.plot.areaSqFt} sq.ft.`
                return (
                  <td key={column} className="p-2">
                    <a
                      href={enquiryLink(message)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-strong"
                    >
                      <MessageCircle size={14} /> Enquire about {entry.unit?.number ?? entry.plot.number}
                    </a>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  )
}
