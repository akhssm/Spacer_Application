import { useState } from 'react'
import { FAQS } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import SectionHeading from '@/components/ui/SectionHeading'

const COLLAPSED_COUNT = 5

function Faq() {
  const [showAll, setShowAll] = useState(false)

  const visibleFaqs = showAll ? FAQS : FAQS.slice(0, COLLAPSED_COUNT)

  return (
    <section id="faq" className="bg-panel px-5 py-20">
      <div className="mx-auto w-full max-w-215">
        <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" center />

        <Reveal>
          <div className="relative">
            <Accordion multiple className="gap-3">
              {visibleFaqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className="rounded-lg border border-border bg-card transition-colors hover:border-white/20"
                >
                  <AccordionTrigger className="gap-4 px-5 py-5 text-[15px] font-bold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 leading-6 text-muted-foreground">
                    <p>{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Fades out the last visible question to hint that there are more */}
            {!showAll && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-panel to-transparent" />
            )}
          </div>

          {FAQS.length > COLLAPSED_COUNT && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                aria-expanded={showAll}
                className="touch-target cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {showAll ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

export default Faq
