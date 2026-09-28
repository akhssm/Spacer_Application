import { Link } from 'react-router'
import { ArrowRightIcon, ExpandIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrochureImage, ImpressionTag } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { getChapter } from '@/components/home/chapters'
import { blocks, UNKNOWN_LABEL } from '@/data'
import { formatRange, formatSft, summariseConfigurations } from '@/data/summaries'
import { paths } from '@/routes/paths'

/**
 * Chapter 06 — "Step Through". Home configurations and each block's typical floor plan with
 * its area statement (p10–12). Interactive unit selection arrives with the explorer (Phase 4).
 */
export function StepThroughSection() {
  const c = getChapter('Step Through')
  const configs = summariseConfigurations(blocks)

  return (
    <ChapterSection
      chapter={c}
      aside={
        <Reveal className="relative overflow-hidden rounded-2xl">
          <BrochureImage
            asset="entrance-night"
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/3] w-full object-cover"
          />
          <ImpressionTag className="absolute right-3 bottom-3" />
        </Reveal>
      }
    >
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {configs.map((cfg, i) => (
          <Reveal key={cfg.bhk} delay={i * 0.08} className="flex flex-col gap-6 rounded-2xl border p-7 sm:p-9">
            <p className="font-display text-5xl text-navy-900">{cfg.bhk} BHK</p>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div className="col-span-3 sm:col-span-1">
                <dt className="text-muted-foreground">Sizes</dt>
                <dd className="font-numeric text-2xl text-navy-900">
                  {formatRange(cfg.sizeRangeSft)} <span className="font-sans text-sm text-muted-foreground">sft</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Blocks</dt>
                <dd className="font-numeric text-2xl text-navy-900">{cfg.blocks.join(' · ')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="text-2xl">
                  <a href="#contact" className="font-display text-gold-500 underline-offset-4 hover:underline">
                    {UNKNOWN_LABEL}
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-20">
        <Tabs defaultValue="A" className="gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">Typical floor plans</p>
              <p className="mt-2 font-display text-3xl text-navy-900">Choose a block</p>
            </div>
            <TabsList className="h-11! bg-mist-100 p-1">
              {blocks.map((b) => (
                <TabsTrigger key={b.id} value={b.id} className="px-5 font-display text-base">
                  {b.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {blocks.map((b) => (
            <TabsContent key={b.id} value={b.id} className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <ImageLightbox
                  asset={b.floorPlanAssetId}
                  impression={false}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Enlarge ${b.name} typical floor plan`}
                      className="group relative block h-[70svh] w-full cursor-zoom-in overflow-hidden rounded-2xl border bg-white"
                    >
                      <BrochureImage
                        asset={b.floorPlanAssetId}
                        sizes="(min-width: 1024px) 40vw, 90vw"
                        className="mx-auto h-full w-auto object-contain p-4"
                      />
                      <span className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-navy-900/85 px-3 py-1.5 text-xs text-white">
                        <ExpandIcon className="size-3.5" /> Enlarge
                      </span>
                    </button>
                  }
                />
              </div>

              <div className="flex flex-col gap-6 lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border">
                  <table className="w-full text-left text-sm">
                    <caption className="bg-mist-100 px-4 py-3 text-left font-display text-lg text-navy-900">
                      {b.name} · Area statement
                    </caption>
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th scope="col" className="px-4 py-2 font-normal">
                          Flat No.
                        </th>
                        <th scope="col" className="px-4 py-2 font-normal">
                          Unit
                        </th>
                        <th scope="col" className="px-4 py-2 font-normal">
                          Facing
                        </th>
                        <th scope="col" className="px-4 py-2 text-right font-normal">
                          Area (sft)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-numeric text-navy-900">
                      {b.stacks.map((s) => (
                        <tr key={s.flatNo} className="border-b last:border-0">
                          <td className="px-4 py-2">{s.flatNo}</td>
                          <td className="px-4 py-2">{s.bhk} BHK</td>
                          <td className="px-4 py-2 font-sans">{s.facing}</td>
                          <td className="px-4 py-2 text-right">{formatSft(s.areaSft)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link to={paths.explore({ blockId: b.id })} />}
                  size="lg"
                  className="self-start px-4"
                >
                  Explore {b.name}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Reveal>
    </ChapterSection>
  )
}
