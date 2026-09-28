import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { BrochureImage, ImpressionTag } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterHeading } from '@/components/home/components/ChapterHeading'
import { chapterCount, getChapter } from '@/components/home/chapters'
import { project } from '@/data'

/** Chapter 02 — "Enter". The p5 day render, built from its sky + building layers for parallax. */
export function EnterSection() {
  const c = getChapter('Enter')
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const skyY = useTransform(scrollYProgress, [0, 1], ['-8%', reduce ? '-8%' : '8%'])
  const buildingY = useTransform(scrollYProgress, [0, 0.6], [reduce ? '0%' : '14%', '0%'])
  const intro = project.descriptions.find((d) => d.source.page === 14)

  return (
    <section ref={ref} id={c.id} aria-label="Enter — introduction" className="relative scroll-mt-(--header-h)">
      <div className="relative isolate flex min-h-[88svh] flex-col overflow-hidden bg-[#9cc8ea]">
        <motion.div style={{ y: skyY }} className="absolute -inset-y-[10%] inset-x-0 -z-10">
          <BrochureImage asset="elevation-day-sky" sizes="100vw" className="size-full object-cover" />
        </motion.div>

        <div className="container-page pt-24 sm:pt-32">
          <ChapterHeading chapter={c.chapter} index={c.index} total={chapterCount} />
        </div>

        <motion.div style={{ y: buildingY }} className="relative mt-auto flex justify-end">
          <BrochureImage
            asset="elevation-day-building"
            sizes="(min-width: 1024px) 968px, 100vw"
            className="h-auto w-full max-w-[968px]"
          />
          <ImpressionTag className="absolute right-4 bottom-4" />
        </motion.div>
      </div>

      <div className="container-page grid gap-10 py-20 sm:py-28 lg:grid-cols-12">
        <Reveal className="lg:col-span-7 lg:col-start-2">
          <p className="font-display text-2xl leading-snug text-navy-900 sm:text-3xl">{intro.value}</p>
        </Reveal>
        <Reveal delay={0.1} className="flex items-end lg:col-span-3 lg:col-start-10">
          <p className="eyebrow leading-relaxed text-muted-foreground">
            {project.developer}
            <br />
            {project.location.locality}, {project.location.city}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
