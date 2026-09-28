import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

/**
 * Fixed chapter index on large screens: shows where you are in the story and jumps between
 * chapters. Tracks the chapter crossing the viewport's vertical centre.
 */
export function ChapterRail({ items }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const { id } of items) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  return (
    <nav
      aria-label="Chapters"
      className="pointer-events-none fixed top-1/2 right-5 z-(--z-dock) hidden -translate-y-1/2 xl:block"
    >
      <ol className="pointer-events-auto flex flex-col items-end gap-3.5 mix-blend-difference">
        {items.map((item, i) => {
          const isActive = item.id === active
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center gap-3 text-white"
              >
                {/* Labels appear on hover/focus only, so the rail never covers section content. */}
                <span className="text-[0.65rem] tracking-[0.2em] uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-80 group-focus-visible:opacity-80">
                  <span className="font-numeric">{String(i + 1).padStart(2, '0')}</span> {item.label}
                </span>
                <span
                  className={cn(
                    'block h-px bg-white transition-all duration-500 ease-out-expo',
                    isActive ? 'w-8' : 'w-3 opacity-50 group-hover:w-5',
                  )}
                />
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
