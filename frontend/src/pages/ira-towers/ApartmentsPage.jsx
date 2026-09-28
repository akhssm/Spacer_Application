import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Columns3Icon, XIcon } from 'lucide-react'
import { apartments, dataExceptions, getBlock, project } from '@/data'
import { Button } from '@/components/ui/button'
import { ApartmentFilters } from '@/components/apartments/ApartmentFilters'
import { ApartmentList } from '@/components/apartments/ApartmentList'
import { filtersToSearch, parseFilters, visibleApartments } from '@/components/apartments/apartmentQuery'
import { COMPARE_LIMIT, ComparePanel } from '@/components/viewer/ComparePanel'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { displayRooms } from '@/utils/rooms'

const PAGE_SIZE = 48
const pad2 = (n) => String(n).padStart(2, '0')

// The compare table (shared with the Spacer viewer) takes each apartment as its flat position
// (`plot`) on a chosen floor (`unit`). IRA Towers publishes no availability, so it runs without inventory.
const compareEntry = (a) => ({
  plot: {
    number: `${a.blockId}-${pad2(a.flatNo)}`,
    zone: getBlock(a.blockId).name,
    bhk: `${a.bhk} BHK`,
    facing: a.facing,
    areaSqFt: a.areaSft,
    rooms: displayRooms(a.blockId, a.flatNo),
    plan: { blockId: a.blockId, flatNo: a.flatNo },
  },
  unit: { number: a.id, floor: a.level },
})

const enquiryLink = (message) =>
  `mailto:${project.contact.emails.sales}?subject=${encodeURIComponent(`Enquiry: ${project.name}`)}&body=${encodeURIComponent(message)}`

const unitCountNote = dataExceptions['block-c-unit-count']

/** /ira-towers/apartments — every apartment, filterable, with a side-by-side comparison. */
export default function ApartmentsPage() {
  useDocumentTitle(`Apartments · ${project.name}`)
  const location = useLocation()
  const navigate = useNavigate()
  const filters = useMemo(() => parseFilters(location.search), [location.search])
  const list = useMemo(() => visibleApartments(apartments, filters), [filters])

  // Paging restarts whenever the filters change
  const [paging, setPaging] = useState({ search: location.search, count: PAGE_SIZE })
  const shown = paging.search === location.search ? paging.count : PAGE_SIZE

  const [compareIds, setCompareIds] = useState([])
  const [comparing, setComparing] = useState(false)
  const toggleCompare = (a) =>
    setCompareIds((ids) =>
      ids.includes(a.id) ? ids.filter((id) => id !== a.id) : ids.length < COMPARE_LIMIT ? [...ids, a.id] : ids,
    )
  const compareList = compareIds.map((id) => apartments.find((a) => a.id === id))

  const setFilters = (next) => navigate({ search: filtersToSearch(next) }, { replace: true, preventScrollReset: true })

  return (
    <section className="container-page py-12 sm:py-16">
      <p className="eyebrow text-gold-500">{project.name}</p>
      <h1 className="mt-3 text-title">Apartments</h1>
      <div className="gold-rule mt-5 w-40" />
      <p className="mt-5 max-w-prose text-muted-foreground">
        Every apartment from the typical floor plans, {apartments.length} in all: {project.headline.configurations},{' '}
        {project.headline.unitSizeRangeSft.map((n) => n.toLocaleString('en-IN')).join('–')} sft. Pick up to{' '}
        {COMPARE_LIMIT} to compare side by side. Apartment numbers are provisional, and price and availability are on
        enquiry.
      </p>

      <ApartmentFilters filters={filters} onChange={setFilters} className="mt-8" />

      <p className="mt-8 mb-3 text-sm text-muted-foreground" aria-live="polite">
        Showing {Math.min(shown, list.length)} of {list.length} apartments
      </p>
      <ApartmentList
        apartments={list.slice(0, shown)}
        compare={{ ids: compareIds, full: compareIds.length >= COMPARE_LIMIT, onToggle: toggleCompare }}
      />
      {shown < list.length && (
        <div className="mt-6 text-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setPaging({ search: location.search, count: shown + PAGE_SIZE })}
            className="px-5"
          >
            Show more
          </Button>
        </div>
      )}

      {unitCountNote && (
        <p className="mt-10 max-w-prose text-xs leading-relaxed text-muted-foreground">
          <span className="text-foreground/80">Note: </span>
          {unitCountNote.decision}
        </p>
      )}

      {/* Compare bar: stays at the bottom of the screen while apartments are picked */}
      {compareList.length > 0 && !comparing && (
        <div className="sticky bottom-4 z-(--z-dock) mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 p-3 pl-5 shadow-float backdrop-blur">
          <p className="text-sm">
            Comparing <span className="font-numeric tracking-wide">{compareIds.join(', ')}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="lg" onClick={() => setCompareIds([])} className="px-3">
              <XIcon data-icon="inline-start" />
              Clear
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={compareList.length < 2}
              onClick={() => setComparing(true)}
              className="px-4"
            >
              <Columns3Icon data-icon="inline-start" />
              {compareList.length < 2 ? 'Pick one more' : 'Compare'}
            </Button>
          </div>
        </div>
      )}

      {comparing && (
        <ComparePanel
          project={{ name: project.name, unitLabel: 'Flat' }}
          entries={compareList.map(compareEntry)}
          inventory={false}
          onRemove={(column) => {
            const next = compareIds.filter((_, i) => i !== column)
            setCompareIds(next)
            if (next.length < 2) setComparing(false)
          }}
          enquiryLink={enquiryLink}
          onClose={() => setComparing(false)}
        />
      )}
    </section>
  )
}
