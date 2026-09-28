import { InfoIcon } from 'lucide-react'
import { blocks, dataExceptions, project } from '@/data'
import { formatRange, summariseBlocks } from '@/data/summaries'
import { cn } from '@/utils/cn'

const summaries = summariseBlocks(blocks)
const pad2 = (n) => String(n).padStart(2, '0')

/** Segmented A / B / C switcher. */
export function BlockSwitcher({ active, onSelect, className, short }) {
  return (
    <div
      role="radiogroup"
      aria-label="Block"
      className={cn('grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1', className)}
    >
      {blocks.map((b) => {
        const on = b.id === active
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={b.name}
            onClick={() => onSelect(b.id)}
            className={cn(
              'touch-target flex h-10 items-center justify-center rounded-lg font-display text-base transition-colors',
              on ? 'bg-sun-400 text-navy-950' : 'text-white/80 hover:bg-white/10 hover:text-white',
            )}
          >
            {short ? b.id : b.name}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Residential floors 01–10 (provisional numbering above the stilt). Cellar and stilt are shown
 * for orientation but are not selectable — the brochure lists no flats on them.
 */
export function FloorPicker({ block, active, onSelect, orientation = 'vertical' }) {
  const levels = Array.from({ length: block.levels.value.residentialFloors }, (_, i) => i + 1)
  const vertical = orientation === 'vertical'
  const ordered = vertical ? [...levels].reverse() : levels

  return (
    <div
      role="radiogroup"
      aria-label={`${block.name} floor`}
      // pt-1 gives the buttons' expanded tap area room inside the scroll container, which clips it.
      className={cn(
        vertical ? 'grid grid-cols-5 gap-1.5' : 'flex gap-1.5 overflow-x-auto pt-1 pb-1 [scrollbar-width:none]',
      )}
    >
      {!vertical && <FixedLevel label="C" title="Cellar" />}
      {!vertical && <FixedLevel label="S" title="Stilt" />}
      {ordered.map((level) => {
        const on = level === active
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Floor ${pad2(level)}`}
            onClick={() => onSelect(level)}
            className={cn(
              'touch-target flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg font-numeric text-sm transition-colors',
              on ? 'bg-sun-400 text-navy-950' : 'bg-white/5 text-white/85 hover:bg-white/15',
            )}
          >
            {pad2(level)}
          </button>
        )
      })}
      {vertical && (
        <div className="col-span-5 mt-1 grid grid-cols-2 gap-1.5">
          <FixedLevel label="Stilt" title="Stilt — no flats listed" wide />
          <FixedLevel label="Cellar" title="Cellar — no flats listed" wide />
        </div>
      )}
    </div>
  )
}

function FixedLevel({ label, title, wide }) {
  return (
    <span
      title={title}
      aria-hidden="true"
      className={cn(
        'flex h-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-white/35',
        wide ? 'w-full' : 'min-w-10',
      )}
    >
      {label}
    </span>
  )
}

export function HighlightFilter({ value, onChange }) {
  const options = [
    { v: 'all', label: 'All' },
    { v: 2, label: '2 BHK' },
    { v: 3, label: '3 BHK' },
  ]
  return (
    <div role="radiogroup" aria-label="Highlight flats" className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            'h-8 rounded-lg text-xs transition-colors',
            value === o.v ? 'bg-white text-navy-950' : 'text-white/75 hover:bg-white/10',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Legend({ className }) {
  const items = [
    { swatch: 'border border-white/60', label: 'Flat — tap to select' },
    { swatch: 'border-2 border-sun-400 bg-sun-400/25', label: 'Hover / keyboard focus' },
    { swatch: 'border-2 border-sun-400 bg-sun-400/55', label: 'Selected' },
    { swatch: 'bg-navy-950 ring-1 ring-white/15', label: 'Outside highlight filter' },
    { swatch: 'bg-sand-200', label: 'Availability not published — Enquire' },
  ]
  return (
    <ul aria-label="Legend" className={cn('grid gap-2 text-xs text-white/75', className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3">
          <span aria-hidden="true" className={cn('size-3.5 shrink-0 rounded-[4px]', i.swatch)} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/** What the brochure says about a block (or the whole project in overview). */
export function BlockSummary({ blockId }) {
  if (!blockId) {
    const h = project.headline
    return (
      <div className="grid gap-3">
        <p className="text-sm leading-relaxed text-white/70">
          {h.blockCount} blocks · {h.totalUnits} flats · {h.configurations} · {formatRange(h.unitSizeRangeSft)} sft ·{' '}
          {h.floorsLabel}
        </p>
        <p className="flex items-start gap-2 text-xs text-white/50">
          <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Select a block on the plan or above. Drag to pan, scroll or pinch to zoom.
        </p>
      </div>
    )
  }
  const s = summaries.find((x) => x.id === blockId)
  const block = blocks.find((b) => b.id === blockId)
  const ex = block.exceptions?.includes('block-c-unit-count') ? dataExceptions['block-c-unit-count'] : undefined

  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-white/50">Declared flats</dt>
          <dd className="font-numeric text-xl text-white">{s.declaredUnits}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">Configuration</dt>
          <dd className="text-white">{s.bhk.join(' & ')} BHK</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">Sizes</dt>
          <dd className="text-white">{formatRange(s.sizeRangeSft)} sft</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50">Per typical floor</dt>
          <dd className="text-white">
            {s.flatsPerTypicalFloor} flats · {s.facings.join(' & ')}
          </dd>
        </div>
      </dl>
      {ex && (
        <p className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-3 text-xs leading-relaxed text-white/80">
          <span className="font-medium text-gold-300">Brochure note · </span>
          {ex.statements[0].label} is {ex.statements[0].value} (p{ex.statements[0].source.page}); the typical floor plan
          shows {s.flatsPerTypicalFloor} flats × {s.residentialFloors} floors = {ex.statements[1].value} (p
          {ex.statements[1].source.page}). Both figures are kept as published.
        </p>
      )}
    </div>
  )
}
