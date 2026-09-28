import { useEffect } from 'react'
import { ChapterRail } from '@/components/home/components/ChapterRail'
import { homeChapters } from '@/components/home/chapters'
import { WelcomeHero } from '@/components/home/sections/WelcomeHero'
import { EnterSection } from '@/components/home/sections/EnterSection'
import { FreedomSection } from '@/components/home/sections/FreedomSection'
import { WitnessSection } from '@/components/home/sections/WitnessSection'
import { DiscoverSection } from '@/components/home/sections/DiscoverSection'
import { StepThroughSection } from '@/components/home/sections/StepThroughSection'
import { UncoverSection } from '@/components/home/sections/UncoverSection'
import { EmbraceSection } from '@/components/home/sections/EmbraceSection'
import { FeelSection } from '@/components/home/sections/FeelSection'
import { LiveSection } from '@/components/home/sections/LiveSection'
import { project } from '@/data'

const railItems = homeChapters.map((c) => ({ id: c.id, label: c.label }))

/** Home: the brochure's ten chapters, in order. */
export default function HomePage() {
  useEffect(() => {
    document.title = `${project.name} · ${project.developer} — ${project.positioning.value}, ${project.location.locality}`
  }, [])

  return (
    <>
      <ChapterRail items={railItems} />
      <WelcomeHero />
      <EnterSection />
      <FreedomSection />
      <WitnessSection />
      <DiscoverSection />
      <StepThroughSection />
      <UncoverSection />
      <EmbraceSection />
      <FeelSection />
      <LiveSection />
    </>
  )
}
