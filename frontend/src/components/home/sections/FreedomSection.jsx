import { Link } from 'react-router'
import { ArrowUpRightIcon } from 'lucide-react'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { CountUp } from '@/components/home/components/StatCounter'
import { getChapter } from '@/components/home/chapters'
import { blocks, project } from '@/data'
import { formatRange, formatSft, summariseBlocks } from '@/data/summaries'
import { paths } from '@/routes/paths'

/** Chapter 03 — "Freedom". Project at a glance: the p3 headline figures and the three blocks. */
export function FreedomSection() {
  const c = getChapter('Freedom')
  const h = project.headline
  const overview = project.descriptions.find((d) => d.source.page === 3)

  // Labels follow the brochure's own captions on p3.
  const stats = [
    { value: h.landAreaAcres, label: 'Acres Lifestyle Project' },
    { value: h.blockCount, label: 'Blocks' },
    { value: h.floorsLabel, label: 'Floors' },
    {
      value: `${formatSft(h.unitSizeRangeSft[0])}–${formatSft(h.unitSizeRangeSft[1])}`,
      unit: 'Sft',
      label: `${h.configurations} Residential Flat Sizes`,
    },
    { value: h.totalUnits, label: 'Luxury Flats' },
    { value: h.clubhouseAreaSft, unit: 'Sft', label: 'Exclusive Clubhouse' },
    { value: `${h.luxuryApartmentsPercent}%`, label: 'Luxury Apartments' },
    { value: h.security, label: 'Security' },
  ]

  return (
    <ChapterSection
      chapter={c}
      aside={
        <Reveal>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{overview.value}</p>
        </Reveal>
      }
    >
      <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={(i % 4) * 0.06} className="flex flex-col gap-2 bg-background p-6 sm:p-8">
            <dt className="order-2 text-sm leading-snug text-muted-foreground">{s.label}</dt>
            <dd className="order-1 flex items-baseline gap-1.5 font-numeric text-stat font-medium tracking-tight text-navy-900">
              {typeof s.value === 'number' ? (
                <CountUp value={s.value} />
              ) : (
                <span className="text-[0.62em] whitespace-nowrap">{s.value}</span>
              )}
              {s.unit && <span className="text-base font-normal text-muted-foreground">{s.unit}</span>}
            </dd>
          </Reveal>
        ))}
      </dl>

      <div className="mt-20 grid gap-5 md:grid-cols-3">
        {summariseBlocks(blocks).map((b, i) => (
          <Reveal key={b.id} delay={i * 0.08}>
            <Link
              to={paths.explore({ blockId: b.id })}
              className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-2xl bg-navy-900 p-7 text-white transition-transform duration-500 ease-out-expo hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <p className="font-display text-3xl">{b.name}</p>
                <ArrowUpRightIcon className="size-5 text-gold-300 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="font-numeric text-6xl font-medium text-sun-400">
                {b.declaredUnits}
                <span className="ml-2 font-sans text-sm font-normal tracking-wide text-white/60">flats</span>
              </p>
              <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-sm">
                <div>
                  <dt className="text-white/50">Configuration</dt>
                  <dd>{b.bhk.join(' & ')} BHK</dd>
                </div>
                <div>
                  <dt className="text-white/50">Sizes (sft)</dt>
                  <dd>{formatRange(b.sizeRangeSft)}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Per typical floor</dt>
                  <dd>{b.flatsPerTypicalFloor}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Facing</dt>
                  <dd>{b.facings.join(' & ')}</dd>
                </div>
              </dl>
            </Link>
          </Reveal>
        ))}
      </div>
    </ChapterSection>
  )
}
