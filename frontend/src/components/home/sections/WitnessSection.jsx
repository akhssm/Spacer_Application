import { Link } from 'react-router'
import { ArrowRightIcon, ExpandIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrochureImage } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'
import { paths } from '@/routes/paths'

/** Chapter 04 — "Witness". The p7 site features beside the p6 master plan. */
export function WitnessSection() {
  const c = getChapter('Witness')

  return (
    <ChapterSection chapter={c} tone="mist">
      <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-6 text-muted-foreground">Site features</p>
          <ol className="divide-y divide-navy-900/10 border-y border-navy-900/10">
            {project.siteFeatures.value.map((feature, i) => (
              <Reveal as="li" key={feature} delay={i * 0.03} className="flex items-baseline gap-5 py-4">
                <span className="font-numeric text-sm text-gold-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-xl text-navy-900">{feature}</span>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal className="lg:col-span-7">
          <figure className="relative overflow-hidden rounded-2xl bg-white p-3 shadow-soft sm:p-5">
            <ImageLightbox
              asset="master-plan"
              impression={false}
              trigger={
                <button
                  type="button"
                  className="group relative block w-full cursor-zoom-in"
                  aria-label="Enlarge master plan"
                >
                  <BrochureImage
                    asset="master-plan"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="mx-auto h-auto max-h-[80svh] w-auto transition-transform duration-700 ease-out-expo group-hover:scale-[1.015]"
                  />
                  <span className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-navy-900/80 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ExpandIcon className="size-4" />
                  </span>
                </button>
              }
            />
            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
              <span>Master plan · Blocks A, B, C and the clubhouse</span>
              <Button
                nativeButton={false}
                render={<Link to={paths.explore()} />}
                variant="outline"
                size="lg"
                className="touch-target px-3"
              >
                Explore interactively
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </ChapterSection>
  )
}
