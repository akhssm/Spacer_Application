import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

/** "Room select": a scrollable strip of room thumbnails, the current room outlined. */
export function RoomStrip({ stops, current, onSelect }) {
  const list = useRef(null)

  // Bring the current room into view when the strip opens or the room changes.
  useEffect(() => {
    list.current
      ?.querySelector('[aria-current=true]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [current])

  return (
    <nav aria-label="Rooms" className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <p className="text-center text-xs tracking-wide text-white/70">Rooms</p>
      <ul ref={list} className="flex snap-x gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:thin]">
        {stops.map(({ scene, media }) => {
          const active = scene.key === current
          return (
            <li key={scene.key} className="shrink-0 snap-center">
              <button
                type="button"
                aria-current={active}
                onClick={() => onSelect(scene.key)}
                className={cn(
                  'group grid w-24 gap-1 rounded-lg p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sun-400 sm:w-28',
                  active ? 'bg-white/15 ring-2 ring-sun-400' : 'hover:bg-white/10',
                )}
              >
                <img
                  src={media.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={225}
                  className="aspect-video w-full rounded-md bg-white/10 object-cover"
                />
                <span
                  className={cn(
                    'truncate px-0.5 text-xs',
                    active ? 'text-white' : 'text-white/75 group-hover:text-white',
                  )}
                >
                  {scene.title}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
