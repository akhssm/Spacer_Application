import { HERO, SITE } from '@/data/spacer/siteContent'
import ButtonLink from '@/components/ui/ButtonLink'
import PhoneMockup from '@/components/spacer/PhoneMockup'

function Hero() {
  return (
    <section id="top" className="bg-grid overflow-hidden">
      {/* min-h keeps the hero one full screen tall, minus the 64px navbar */}
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-275 items-center gap-16 px-5 py-16 md:grid-cols-2">
        <div className="md:pl-12">
          <h1 className="text-5xl leading-[1.15] font-bold md:text-6xl">
            {HERO.title} <span className="text-brand">{HERO.titleAccent}</span>
          </h1>
          <p className="mt-10 max-w-sm leading-7 text-muted-foreground">{HERO.lead}</p>
          <div className="mt-6">
            <ButtonLink href="#pricing">Buy {SITE.name}</ButtonLink>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{HERO.note}</p>
        </div>

        <PhoneMockup />
      </div>
    </section>
  )
}

export default Hero
