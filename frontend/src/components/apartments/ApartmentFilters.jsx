import { SearchIcon, XIcon } from 'lucide-react'
import { blocks } from '@/data'
import { Button } from '@/components/ui/button'
import { DEFAULT_FILTERS, FLOORS, SORTS } from '@/components/apartments/apartmentQuery'
import { cn } from '@/utils/cn'

const FIELD =
  'h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** A labelled row of toggle chips; exactly one option is on. */
function ChipGroup({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="eyebrow mr-1 w-full text-muted-foreground sm:w-auto">{label}</span>
      {options.map((option) => {
        const active = value === option.value
        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'default' : 'outline'}
            size="lg"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="touch-target rounded-full px-3.5"
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

/** Block, BHK and facing chips, floor and sort pickers, and a search box for the apartment number. */
export function ApartmentFilters({ filters, onChange, className }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const isDefault = Object.entries(DEFAULT_FILTERS).every(([key, value]) => filters[key] === value)

  return (
    <div className={cn('grid gap-4', className)}>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <ChipGroup
          label="Block"
          value={filters.block}
          onChange={set('block')}
          options={[{ value: 'all', label: 'All' }, ...blocks.map((b) => ({ value: b.id, label: b.name }))]}
        />
        <ChipGroup
          label="Type"
          value={filters.bhk}
          onChange={set('bhk')}
          options={[
            { value: 'all', label: 'All' },
            { value: '2', label: '2 BHK' },
            { value: '3', label: '3 BHK' },
          ]}
        />
        <ChipGroup
          label="Facing"
          value={filters.facing}
          onChange={set('facing')}
          options={[
            { value: 'all', label: 'All' },
            { value: 'East', label: 'East' },
            { value: 'West', label: 'West' },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
        <label className="grid gap-1.5">
          <span className="eyebrow text-muted-foreground">Apartment number</span>
          <span className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={filters.q}
              onChange={(event) => set('q')(event.target.value)}
              placeholder="e.g. C-0509"
              className={cn(FIELD, 'w-full pl-9')}
            />
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow text-muted-foreground">Floor</span>
          <select value={filters.floor} onChange={(event) => set('floor')(event.target.value)} className={FIELD}>
            <option value="all">All floors</option>
            {FLOORS.map((floor) => (
              <option key={floor} value={String(floor)}>
                Floor {String(floor).padStart(2, '0')}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow text-muted-foreground">Sort by</span>
          <select value={filters.sort} onChange={(event) => set('sort')(event.target.value)} className={FIELD}>
            {SORTS.map((sort) => (
              <option key={sort.id} value={sort.id}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={isDefault}
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="h-11 px-3"
        >
          <XIcon data-icon="inline-start" />
          Clear filters
        </Button>
      </div>
    </div>
  )
}
