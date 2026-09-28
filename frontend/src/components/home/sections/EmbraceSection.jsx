import {
  BabyIcon,
  BedDoubleIcon,
  BriefcaseIcon,
  CoffeeIcon,
  ConciergeBellIcon,
  DicesIcon,
  DumbbellIcon,
  FlowerIcon,
  LaptopIcon,
  PersonStandingIcon,
  ScissorsIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
  WavesIcon,
} from 'lucide-react'
import { BrochureImage, ImpressionTag } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { CountUp } from '@/components/home/components/StatCounter'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'

/** Decorative icon per p16 clubhouse amenity. */
const ICONS = {
  'Banquet Hall': UtensilsCrossedIcon,
  'Office Room': BriefcaseIcon,
  'Indoor Games': DicesIcon,
  Gym: DumbbellIcon,
  'Coffee Shop': CoffeeIcon,
  Receptionist: ConciergeBellIcon,
  Salon: ScissorsIcon,
  'Swimming Pool': WavesIcon,
  'Co Working Space': LaptopIcon,
  Yoga: PersonStandingIcon,
  'Guest Rooms': BedDoubleIcon,
  Spa: FlowerIcon,
  Creche: BabyIcon,
}

/** Chapter 08 — "Embrace". The clubhouse (p16–17). */
export function EmbraceSection() {
  const c = getChapter('Embrace')
  const club = project.clubhouse

  return (
    <ChapterSection
      chapter={c}
      tone="dark"
      aside={
        <Reveal className="flex flex-col gap-4 lg:items-end lg:text-right">
          <p className="flex items-baseline gap-2 font-numeric text-stat font-medium text-sun-400">
            <CountUp value={club.areaSft} />
            <span className="font-sans text-base font-normal text-white/60">sft clubhouse</span>
          </p>
          {club.descriptions.map((d) => (
            <p key={d} className="max-w-md text-white/70">
              {d}
            </p>
          ))}
        </Reveal>
      }
    >
      <div className="mt-16 grid gap-6 lg:grid-cols-12">
        <Reveal className="relative overflow-hidden rounded-2xl lg:col-span-5 lg:row-span-2">
          <BrochureImage
            asset="clubhouse-day"
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-[4/5] size-full object-cover"
          />
          <ImpressionTag className="absolute bottom-3 left-3" />
        </Reveal>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-4">
          {club.amenities.map((a, i) => {
            const Icon = ICONS[a] ?? SparklesIcon
            return (
              <Reveal
                as="li"
                key={a}
                delay={(i % 4) * 0.04}
                className="group flex flex-col gap-4 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition-colors duration-500 ring-inset hover:bg-white/[0.08]"
              >
                <Icon className="size-6 text-gold-300 transition-colors group-hover:text-sun-400" aria-hidden="true" />
                <span className="text-sm text-white/90">{a}</span>
              </Reveal>
            )
          })}
        </ul>

        <div className="grid grid-cols-3 gap-3 lg:col-span-7">
          {['gym', 'banquet', 'pool-family'].map((id, i) => (
            <Reveal key={id} delay={i * 0.06} className="overflow-hidden rounded-xl">
              <BrochureImage
                asset={id}
                sizes="(min-width: 1024px) 18vw, 33vw"
                className="aspect-square size-full object-cover"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </ChapterSection>
  )
}
