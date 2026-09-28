import { useRef } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDownIcon, ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrochureImage } from '@/components/media/BrochureImage'
import { LeafMotif } from '@/components/home/components/LeafMotif'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'
import { ease } from '@/utils/motion'
import { paths } from '@/routes/paths'

/** Chapter 01 — "Welcome". Echoes the brochure cover (p1): line-art elevation on navy. */
export function WelcomeHero() {
  const { chapter, id } = getChapter('Welcome')
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const artY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-30%'])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0])

  const enter = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1, ease: ease.outExpo, delay },
        }

  return (
    <section
      ref={ref}
      id={id}
      aria-label="Welcome to IRA Towers"
      className="dark relative -mt-(--header-h) flex min-h-svh flex-col overflow-hidden bg-navy-900 text-foreground"
    >
      {/* soft light behind the drawing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_60%_at_50%_100%,rgb(255_255_255/0.10),transparent_70%)]"
      />

      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="container-page relative z-10 flex flex-1 flex-col justify-center gap-10 pt-[calc(var(--header-h)+3rem)] pb-10 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-8">
          <motion.h1 {...enter(0.1)} className="w-full max-w-[26rem] sm:max-w-md">
            <BrochureImage
              asset="ira-towers-logo-reverse"
              sizes="28rem"
              priority
              alt={`${project.name} — ${project.tagline}`}
              className="h-auto w-full"
            />
          </motion.h1>
          <motion.p {...enter(0.25)} className="eyebrow max-w-md leading-relaxed text-white/70">
            {project.positioning.value}
            <span className="mx-2 text-gold-300">·</span>
            {project.location.locality}, {project.location.city}
          </motion.p>
          <motion.div {...enter(0.4)} className="flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              render={<Link to={paths.explore()} />}
              className="h-11 bg-sun-400 px-5 text-navy-950 hover:bg-sun-400/90"
            >
              Explore the master plan
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              nativeButton={false}
              render={<a href="#contact" />}
              variant="outline"
              className="h-11 border-white/30 bg-transparent px-5 text-white hover:bg-white/10"
            >
              Enquire
            </Button>
          </motion.div>
        </div>

        <div className="flex items-start gap-4 lg:max-w-sm">
          <motion.div {...enter(0.5)} className="text-gold-300">
            <LeafMotif className="h-16" />
          </motion.div>
          <div>
            <motion.p {...enter(0.55)} className="font-display text-6xl text-white sm:text-7xl">
              {chapter.title}
            </motion.p>
            <ul className="mt-3 font-display text-lg text-white/80 sm:text-xl">
              {chapter.lines.map((line, i) => (
                <motion.li key={line} {...enter(0.65 + i * 0.08)}>
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Line-art elevation "draws in" from left to right, then drifts with scroll. */}
      <motion.div style={{ y: artY }} className="relative z-0 mt-auto">
        <motion.div
          initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 2.4, ease: ease.inOutQuint, delay: 0.3 }}
        >
          <BrochureImage
            asset="lineart-cover"
            sizes="100vw"
            priority
            className="mx-auto h-auto w-full max-w-[1894px] opacity-90"
          />
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="container-page flex items-center justify-between pb-5 text-[0.7rem] tracking-[0.2em] text-white/60 uppercase">
          <span>TG RERA No. {project.rera.value}</span>
          <a href="#enter" className="touch-target flex items-center gap-2 transition-colors hover:text-white">
            Scroll
            <ArrowDownIcon className="size-3.5 motion-safe:animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  )
}
