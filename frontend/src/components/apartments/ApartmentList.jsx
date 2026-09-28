import { Link } from 'react-router'
import { Columns3Icon, LayoutPanelTopIcon, ViewIcon } from 'lucide-react'
import { UNKNOWN_LABEL, getBlock } from '@/data'
import { formatSft } from '@/data/summaries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTourForApartment } from '@/components/explore/tour/tours'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'

const pad2 = (n) => String(n).padStart(2, '0')

const target = (a) => ({ blockId: a.blockId, floor: a.level, apartmentId: a.id })

/** Plan & 3D, virtual tour (when the BHK type has one) and the compare toggle for one apartment. */
function Actions({ apartment, compare, className }) {
  const inList = compare.ids.includes(apartment.id)
  const hasTour = Boolean(getTourForApartment(apartment))
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Button
        nativeButton={false}
        render={<Link to={paths.explore(target(apartment))} />}
        variant="outline"
        size="lg"
        className="touch-target px-2.5"
      >
        <LayoutPanelTopIcon data-icon="inline-start" />
        Plan
      </Button>
      {hasTour && (
        <Button
          nativeButton={false}
          render={<Link to={paths.tour(target(apartment))} />}
          variant="outline"
          size="lg"
          className="touch-target px-2.5"
        >
          <ViewIcon data-icon="inline-start" />
          Tour
        </Button>
      )}
      <Button
        type="button"
        variant={inList ? 'default' : 'ghost'}
        size="lg"
        aria-pressed={inList}
        disabled={!inList && compare.full}
        onClick={() => compare.onToggle(apartment)}
        title={!inList && compare.full ? 'The compare list is full' : undefined}
        className="touch-target px-2.5"
      >
        <Columns3Icon data-icon="inline-start" />
        {inList ? 'Comparing' : 'Compare'}
      </Button>
    </div>
  )
}

/**
 * Every apartment that matches the filters: a table on wide screens, cards on phones. Availability
 * and price are not in the brochure, so both read "Enquire" (see docs/DATA_DECISIONS.md).
 */
export function ApartmentList({ apartments, compare }) {
  if (!apartments.length) {
    return <p className="py-16 text-center text-muted-foreground">No apartments match these filters.</p>
  }

  return (
    <>
      {/* Wide screens */}
      <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Apartment
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Block
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Floor
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Facing
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Area (sft)
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Price
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {apartments.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/60">
                <th scope="row" className="px-4 py-2.5 font-numeric text-base font-normal tracking-wide">
                  {a.id}
                </th>
                <td className="px-4 py-2.5">{getBlock(a.blockId).name}</td>
                <td className="px-4 py-2.5 font-numeric">{pad2(a.level)}</td>
                <td className="px-4 py-2.5">{a.bhk} BHK</td>
                <td className="px-4 py-2.5">{a.facing}</td>
                <td className="px-4 py-2.5 text-right font-numeric">{formatSft(a.areaSft)}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline">{UNKNOWN_LABEL}</Badge>
                </td>
                <td className="px-4 py-2">
                  <Actions apartment={a} compare={compare} className="justify-end" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones and tablets */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {apartments.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-numeric text-xl tracking-wide">{a.id}</p>
                <p className="text-sm text-muted-foreground">
                  {getBlock(a.blockId).name} · Floor {pad2(a.level)}
                </p>
              </div>
              <Badge variant="outline">{UNKNOWN_LABEL}</Badge>
            </div>
            <p className="mt-3 text-sm">
              {a.bhk} BHK · {a.facing} facing · <span className="font-numeric">{formatSft(a.areaSft)}</span> sft
            </p>
            <Actions apartment={a} compare={compare} className="mt-3" />
          </li>
        ))}
      </ul>
    </>
  )
}
