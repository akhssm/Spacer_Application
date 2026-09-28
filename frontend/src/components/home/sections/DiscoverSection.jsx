import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { BrochureImage, ImpressionTag } from '@/components/media/BrochureImage'
import { ChapterHeading } from '@/components/home/components/ChapterHeading'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { chapterCount, getChapter } from '@/components/home/chapters'
import { brochureAssets } from '@/data'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

/** Project renders from the brochure, in brochure page order. */
const GALLERY = [
  'aerial-overview',
  'aerial-clubhouse-pool',
  'entrance-night',
  'elevation-night',
  'clubhouse-day',
  'landscape-sitting-area',
  'landscape-play-area',
  'landscape-walkway',
  'elevation-mono',
]

/**
 * Chapter 05 — "Discover". On large screens the gallery is pinned and scrolls sideways with
 * the page (vertical scroll → horizontal travel); elsewhere it is a native swipe carousel.
 */
export function DiscoverSection() {
  const c = getChapter('Discover')
  const reduce = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  const pinned = wide && !reduce

  return (
    <section
      id={c.id}
      aria-label="Discover — gallery"
      className="dark relative scroll-mt-(--header-h) bg-navy-950 text-foreground"
    >
      {pinned ? <PinnedGallery /> : <SwipeGallery />}
      <span className="sr-only">{`Chapter ${c.index + 1} of ${chapterCount}`}</span>
    </section>
  )
}

function Heading() {
  const c = getChapter('Discover')
  return <ChapterHeading chapter={c.chapter} index={c.index} total={chapterCount} tone="dark" />
}

function Card({ asset, heightVh, className }) {
  const a = brochureAssets[asset]
  // Rendered width = height × aspect ratio, so give the browser that width for variant selection.
  const sizes = `${Math.round((heightVh * a.width) / a.height)}vh`
  return (
    <ImageLightbox
      asset={asset}
      trigger={
        <button
          type="button"
          aria-label={`Enlarge: ${a.alt}`}
          className={cn(
            'group relative block shrink-0 cursor-zoom-in overflow-hidden rounded-2xl bg-navy-900',
            className,
          )}
          style={{ aspectRatio: `${a.width} / ${a.height}` }}
        >
          <BrochureImage
            asset={asset}
            sizes={sizes}
            className="size-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]"
          />
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-navy-950/80 to-transparent p-4 pt-16 text-left">
            <span className="text-sm text-white/90">{a.alt}</span>
            <ImpressionTag className="shrink-0" />
          </span>
        </button>
      }
    />
  )
}

function PinnedGallery() {
  const outer = useRef(null)
  const track = useRef(null)
  const [distance, setDistance] = useState(0)

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] })
  const x = useSpring(useTransform(scrollYProgress, [0, 1], [0, -distance]), { stiffness: 120, damping: 30, mass: 0.4 })
  const progress = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    // Height = one viewport + the horizontal travel, so vertical scroll maps 1:1 to sideways motion.
    <div ref={outer} style={{ height: `calc(100svh + ${distance}px)` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col justify-center gap-10 overflow-hidden py-16">
        <motion.div
          ref={track}
          style={{ x }}
          className="flex items-center gap-6 pr-[8vw] pl-[max(1rem,calc((100vw-80rem)/2+2.5rem))]"
        >
          <div className="w-[26rem] shrink-0 pr-8">
            <Heading />
          </div>
          {GALLERY.map((id) => (
            <Card key={id} asset={id} heightVh={62} className="h-[62svh]" />
          ))}
        </motion.div>
        <div className="container-page">
          <div className="h-px w-full bg-white/10">
            <motion.div style={{ width: progress }} className="h-px bg-gold-300" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SwipeGallery() {
  return (
    <div className="py-24 sm:py-32">
      <div className="container-page">
        <Heading />
      </div>
      <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,4vw)] pb-4 [scrollbar-width:none]">
        {GALLERY.map((id) => (
          <Card key={id} asset={id} heightVh={52} className="h-[52svh] max-h-[34rem] max-w-[88vw] snap-center" />
        ))}
      </div>
      <p className="container-page mt-3 text-xs text-muted-foreground">Swipe to explore · tap to enlarge</p>
    </div>
  )
}
