import {
  BabyIcon,
  BatteryChargingIcon,
  BuildingIcon,
  CctvIcon,
  CompassIcon,
  DropletsIcon,
  FootprintsIcon,
  PlugZapIcon,
  RecycleIcon,
  ShieldCheckIcon,
  ToyBrickIcon,
  SparklesIcon,
  TreesIcon,
  TrophyIcon,
  WavesIcon,
} from 'lucide-react'
import { BrochureImage } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'

/** Decorative icon per p18 amenity (text is always the brochure wording). */
const ICONS = [
  [/rainwater/i, DropletsIcon],
  [/landscap/i, TreesIcon],
  [/children/i, ToyBrickIcon],
  [/sewage/i, RecycleIcon],
  [/maintenance/i, BuildingIcon],
  [/ev charging/i, PlugZapIcon],
  [/creche/i, BabyIcon],
  [/swimming/i, WavesIcon],
  [/jogging/i, FootprintsIcon],
  [/vaastu/i, CompassIcon],
  [/security post|grand entry/i, ShieldCheckIcon],
  [/sports/i, TrophyIcon],
  [/cctv/i, CctvIcon],
  [/power/i, BatteryChargingIcon],
]
const iconFor = (label) => ICONS.find(([re]) => re.test(label))?.[1] ?? SparklesIcon

/** Chapter 07 — "Uncover". Amenities & features (p18). */
export function UncoverSection() {
  const c = getChapter('Uncover')

  return (
    <ChapterSection chapter={c} tone="mist">
      <div className="mt-16 grid gap-10 lg:grid-cols-12">
        <Reveal className="relative overflow-hidden rounded-2xl lg:col-span-5">
          <BrochureImage
            asset="couple-reading"
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="aspect-[4/5] w-full object-cover lg:aspect-auto lg:h-full"
          />
        </Reveal>

        <div className="lg:col-span-7">
          <p className="eyebrow mb-6 text-muted-foreground">Amenities &amp; features</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {project.amenities.value.map((a, i) => {
              const Icon = iconFor(a)
              return (
                <Reveal
                  as="li"
                  key={a}
                  delay={(i % 2) * 0.05}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-soft"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy-900 text-sun-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-navy-900">{a}</span>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </div>
    </ChapterSection>
  )
}
