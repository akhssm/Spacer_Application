import { cn } from '@/utils/cn'
import { ChapterHeading } from '@/components/home/components/ChapterHeading'
import { chapterCount } from '@/components/home/chapters'

/** A chapter of the story: anchored section + brochure chapter heading. */
export function ChapterSection({ chapter, tone = 'light', className, headingClassName, align, aside, children }) {
  return (
    <section
      id={chapter.id}
      aria-label={`${chapter.chapter.title} — ${chapter.label}`}
      className={cn(
        'relative scroll-mt-(--header-h) py-24 sm:py-32',
        tone === 'dark' && 'dark bg-background text-foreground',
        tone === 'mist' && 'bg-mist-100',
        className,
      )}
    >
      <div className="container-page">
        <div className={cn('grid gap-12', aside && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end')}>
          <ChapterHeading
            chapter={chapter.chapter}
            index={chapter.index}
            total={chapterCount}
            tone={tone === 'dark' ? 'dark' : 'light'}
            align={align}
            className={headingClassName}
          />
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}
