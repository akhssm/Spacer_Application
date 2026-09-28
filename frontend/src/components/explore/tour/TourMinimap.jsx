import { useSyncExternalStore } from 'react'
import { MapPinIcon } from 'lucide-react'
import { flatCropBox } from '@/data/floorPlan'
import { FlatPlanCrop } from '@/components/explore/FlatPlan'
import { conePath, planHeading } from '@/components/explore/tour/look'
import { cn } from '@/utils/cn'

/**
 * The apartment's own flat, cropped from the brochure's typical floor plan, as the tour's map:
 * a pin on every room with a 360° view (at its printed label), the current room highlighted with
 * a view cone that turns as you look around, and printed rooms without a view shown as grey dots.
 */
export function TourMinimap({ blockId, flatNo, tour, current, look, onSelect, large }) {
  const box = flatCropBox(blockId, flatNo)
  if (!box) return null
  const [vx, vy, vw, vh] = box
  const pct = (x, y) => ({ left: `${((x - vx) / vw) * 100}%`, top: `${((y - vy) / vh) * 100}%` })
  const here = tour.stops.find((s) => s.scene.key === current)

  return (
    <div className="relative">
      <FlatPlanCrop blockId={blockId} flatNo={flatNo} className="rounded-md">
        {here?.planRoom && <Highlight box={here.planRoom.box} scale={Math.max(vw, vh)} />}
        {here?.planRoom && (
          <Cone
            look={look}
            x={here.planRoom.anchor[0]}
            y={here.planRoom.anchor[1]}
            r={Math.max(vw, vh) * 0.16}
            northOffset={here.scene.northOffset}
          />
        )}
      </FlatPlanCrop>

      {tour.roomsWithoutScene.map((r) => (
        <span
          key={r.key}
          role="img"
          aria-label={`${r.label} — no 360° view in this sample tour`}
          title={`${r.label} — no 360° view in this sample tour`}
          style={pct(r.anchor[0], r.anchor[1])}
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-neutral-500/80"
        />
      ))}

      {tour.stops.map(({ scene, planRoom }) => {
        if (!planRoom) return null
        const active = scene.key === current
        return (
          <button
            key={scene.key}
            type="button"
            onClick={() => onSelect(scene.key)}
            aria-label={`${scene.title}${active ? ' (current room)' : ''}`}
            aria-current={active ? 'location' : undefined}
            style={pct(planRoom.anchor[0], planRoom.box[1])}
            className={cn(
              'group absolute z-10 -translate-x-1/2 -translate-y-full outline-none',
              // A generous hit area around a small pin.
              "before:absolute before:-inset-2 before:content-['']",
            )}
          >
            <span
              className={cn(
                'grid place-items-center rounded-full border shadow-md transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-sun-400',
                large ? 'size-7' : 'size-6',
                // The current room is marked by the blue dot and view cone, as in the reference; its
                // pin stays in place (focusable) but only shows on hover / focus.
                active
                  ? 'border-navy-950/20 bg-sun-400 text-navy-950 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  : 'border-navy-950/15 bg-white text-navy-900',
              )}
            >
              <MapPinIcon className={large ? 'size-4' : 'size-3.5'} aria-hidden="true" />
            </span>
            <span
              role="presentation"
              className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded-md bg-navy-950/90 px-2 py-0.5 text-[0.7rem] whitespace-nowrap text-white shadow group-hover:block group-focus-visible:block"
            >
              {scene.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The current room's printed label, ringed. */
function Highlight({ box: [x, y, w, h], scale }) {
  const pad = scale * 0.02
  return (
    <rect
      x={x - pad}
      y={y - pad}
      width={w + pad * 2}
      height={h + pad * 2}
      rx={pad}
      className="fill-sun-400/25 stroke-sun-400"
      strokeWidth={scale * 0.008}
    />
  )
}

function Cone({ look, x, y, r, northOffset }) {
  const state = useSyncExternalStore(look.subscribe, look.get)
  const heading = planHeading(state.yaw, northOffset)
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient
          id="tour-cone"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${x} ${y}) scale(${r})`}
        >
          <stop offset="0" stopColor="#0b72e7" stopOpacity="0.75" />
          <stop offset="1" stopColor="#0b72e7" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <path d={conePath(x, y, r, heading, Math.min(170, state.shownFov))} fill="url(#tour-cone)" />
      <circle cx={x} cy={y} r={r * 0.09} fill="#0b72e7" stroke="white" strokeWidth={r * 0.035} />
    </g>
  )
}
