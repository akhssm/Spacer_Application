import { PRICING, SITE, getContactLink } from '@/data/spacer/siteContent'
import ButtonLink from '@/components/ui/ButtonLink'
import { Reveal } from '@/components/motion/Reveal'

function Pricing() {
  return (
    <section id="pricing" className="px-5 py-20 text-center">
      <Reveal className="mx-auto w-full max-w-275">
        <p className="text-sm">Pricing</p>
        <h2 className="mt-1 text-3xl font-bold md:text-4xl">{PRICING.title}</h2>

        {/* The price, with a thin fading line on each side */}
        <div className="mt-8 flex items-center justify-center gap-8">
          <span className="hidden h-px flex-1 bg-linear-to-r from-transparent to-brand/60 md:block" />
          <p className="text-6xl font-bold text-brand text-shadow-[0_0_40px_rgba(117,194,23,0.35)] md:text-8xl">
            {PRICING.price}
          </p>
          <span className="hidden h-px flex-1 bg-linear-to-l from-transparent to-brand/60 md:block" />
        </div>

        <span className="mt-4 inline-block rounded-full border border-brand/50 px-4 py-1 text-[11px] text-muted-foreground">
          {PRICING.tax}
        </span>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={getContactLink()}>Buy {SITE.name}</ButtonLink>
          <ButtonLink href={getContactLink()} variant="dark">
            Talk to us first
          </ButtonLink>
        </div>

        <p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-muted-foreground">{PRICING.note}</p>
      </Reveal>
    </section>
  )
}

export default Pricing
