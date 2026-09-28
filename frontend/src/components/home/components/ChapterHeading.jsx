import { motion, useReducedMotion } from 'framer-motion'
import { ease, duration } from '@/utils/motion'
import { cn } from '@/utils/cn'
import { LeafMotif } from '@/components/home/components/LeafMotif'

/**
 * The brochure's chapter device: a large display word, a gold diagonal hairline with the
 * leaf motif, and three short lines. Copy comes verbatim from `project.chapters`.
 */
export function ChapterHeading({ chapter, index, total, tone = 'light', align = 'left', className }) {
  const reduce = useReducedMotion()
  const from = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '0px 0px -10% 0px' },
          transition: { duration: duration.slow, ease: ease.outExpo, delay },
        }

  return (
    <header className={cn('relative flex flex-col gap-5', align === 'center' && 'items-center text-center', className)}>
      <motion.p {...from(0)} className={cn('eyebrow', tone === 'dark' ? 'text-gold-300' : 'text-gold-500')}>
        <span className="font-numeric tracking-[0.2em]">{String(index + 1).padStart(2, '0')}</span>
        <span className="mx-2 opacity-60">/</span>
        <span className="font-numeric tracking-[0.2em]">{String(total).padStart(2, '0')}</span>
      </motion.p>

      <motion.h2
        {...from(0.05)}
        className={cn('text-display leading-none', tone === 'dark' ? 'text-white' : 'text-navy-900')}
      >
        {chapter.title}
      </motion.h2>

      <div className={cn('flex items-start gap-4', align === 'center' && 'flex-col items-center')}>
        <motion.div
          aria-hidden="true"
          className={cn('relative mt-1 shrink-0', tone === 'dark' ? 'text-gold-300' : 'text-gold-500')}
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: duration.slow, ease: ease.outExpo, delay: 0.15 }}
        >
          <LeafMotif className="h-14" />
        </motion.div>
        <ul
          className={cn(
            'font-display text-lg leading-snug sm:text-xl',
            tone === 'dark' ? 'text-white/80' : 'text-navy-800/80',
          )}
        >
          {chapter.lines.map((line, i) => (
            <motion.li key={line} {...from(0.2 + i * 0.08)}>
              {line}
            </motion.li>
          ))}
        </ul>
      </div>
    </header>
  )
}
