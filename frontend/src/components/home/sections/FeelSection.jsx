import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BrochureImage } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'

/** Chapter 09 — "Feel". Specifications (p20–21), verbatim. */
export function FeelSection() {
  const c = getChapter('Feel')
  const specs = project.specifications

  return (
    <ChapterSection chapter={c}>
      <div className="mt-16 grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <p className="eyebrow mb-4 text-muted-foreground">Specifications</p>
          <Accordion multiple defaultValue={[specs[0].title]} className="border-t">
            {specs.map((g) => (
              <AccordionItem key={g.title} value={g.title} className="border-b">
                <AccordionTrigger className="py-5 font-display text-xl text-navy-900 hover:no-underline">
                  {g.title}
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <ul className="flex flex-col gap-2 text-base leading-relaxed text-muted-foreground">
                    {g.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-gold-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)] grid grid-cols-2 gap-3">
            <Reveal className="col-span-2 overflow-hidden rounded-2xl">
              <BrochureImage asset="interior-living" sizes="36vw" className="aspect-[16/9] w-full object-cover" />
            </Reveal>
            <Reveal delay={0.06} className="overflow-hidden rounded-2xl">
              <BrochureImage asset="interior-kitchen" sizes="18vw" className="aspect-[3/4] w-full object-cover" />
            </Reveal>
            <Reveal delay={0.12} className="overflow-hidden rounded-2xl">
              <BrochureImage asset="interior-dining" sizes="18vw" className="aspect-[3/4] w-full object-cover" />
            </Reveal>
          </div>
        </div>
      </div>
    </ChapterSection>
  )
}
