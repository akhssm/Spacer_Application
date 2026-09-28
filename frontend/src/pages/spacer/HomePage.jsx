import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { SITE } from '@/data/spacer/siteContent'
import CallToAction from '@/components/spacer/CallToAction'
import Delivery from '@/components/spacer/Delivery'
import Demos from '@/components/spacer/Demos'
import Faq from '@/components/spacer/Faq'
import Features from '@/components/spacer/Features'
import Hero from '@/components/spacer/Hero'
import Pricing from '@/components/spacer/Pricing'
import Requirements from '@/components/spacer/Requirements'
import Statement from '@/components/spacer/Statement'
import Testimonials from '@/components/spacer/Testimonials'

/** Spacer landing page: the sections stacked in order (navbar and footer come from SpacerLayout). */
export default function HomePage() {
  useDocumentTitle(`${SITE.name} · ${SITE.tagline}`)

  return (
    <>
      <Hero />
      <Statement />
      <Demos />
      <Features />
      <Pricing />
      <Delivery />
      <Requirements />
      <Testimonials />
      <Faq />
      <CallToAction />
    </>
  )
}
