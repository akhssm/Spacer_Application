import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { brochureAssets } from '@/data'
import { floorPlanFlats, floorPlanGeometry } from '@/data/floorPlan'
import { formatSft } from '@/data/summaries'
import { cn } from '@/utils/cn'
import { useCamera } from '@/components/explore/useCamera'

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * The block's typical floor plan (brochure p10–12) with a hotspot per flat. Regions come from
 * scripts/extract_floor_plan_geometry.py; the drawing itself is the unmodified brochure raster.
 */
export function FloorPlanCanvas(props) {
  const { blockId, level, selectedFlat, highlight, insets } = props
  const geo = floorPlanGeometry[blockId]
  const W = geo.width
  const H = geo.height
  const viewportRef = useRef(null)
  const cam = useCamera(viewportRef, { w: W, h: H })
  const [hover, setHover] = useState(null)
  const first = useRef(true)
  const img = brochureAssets[geo.assetId]
  const full = img.variants[img.variants.length - 1]
  const flats = floorPlanFlats.filter((f) => f.blockId === blockId)

  const focusBox = () => {
    const f = flats.find((x) => x.flatNo === selectedFlat)
    if (!f) return { x: 0, y: 0, w: W, h: H }
    const [x, y, w, h] = f.rect
    return { x: x - w * 0.08, y: y - h * 0.12, w: w * 1.16, h: h * 1.24 }
  }

  const key = `${blockId}/${selectedFlat}/${insets.top},${insets.right},${insets.bottom},${insets.left}`
  useEffect(() => {
    cam.flyTo(focusBox(), insets, { instant: first.current })
    first.current = false
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => cam.flyTo(focusBox(), insets, { instant: true }))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const { onCamera } = props
  useEffect(() => {
    onCamera?.({
      zoomIn: () => cam.zoomBy(1.4),
      zoomOut: () => cam.zoomBy(1 / 1.4),
      recenter: () => cam.flyTo(focusBox(), insets),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCamera, key])

  const activate = (fn) => () => {
    if (!cam.wasDrag()) fn()
  }
  const onKey = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
  const label = (f) =>
    `Flat ${pad2(f.flatNo)}${level !== undefined ? ` · ${blockId}-${pad2(level)}${pad2(f.flatNo)}` : ''}`
  const detail = (f) => `${f.stack.bhk} BHK · ${formatSft(f.stack.areaSft)} sft · ${f.stack.facing} facing`

  return (
    <div
      ref={viewportRef}
      className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
      {...cam.handlers}
      onClick={activate(props.onBackgroundClick)}
      onPointerLeave={() => setHover(null)}
    >
      <motion.div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ x: cam.x, y: cam.y, scale: cam.scale, width: W, height: H }}
      >
        <div className="absolute -inset-10 rounded-[40px] bg-white shadow-[0_40px_120px_rgb(0_0_0/0.45)]" />
        <img
          src={full.src}
          width={W}
          height={H}
          alt={img.alt}
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full"
        />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full overflow-visible"
          aria-label={`${img.alt} — interactive`}
        >
          {flats.map((f) => {
            const [x, y, w, h] = f.rect
            const selected = f.flatNo === selectedFlat
            const dimmed = highlight !== 'all' && f.stack.bhk !== highlight
            return (
              <rect
                key={f.flatNo}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={10}
                role="button"
                tabIndex={0}
                data-flat={f.flatNo}
                aria-pressed={selected}
                aria-label={`${label(f)}, ${detail(f)}`}
                className={cn(
                  'cursor-pointer outline-none [vector-effect:non-scaling-stroke] transition-[fill,stroke] duration-300',
                  selected && 'fill-sun-400/20 stroke-sun-400',
                  !selected && dimmed && 'fill-navy-950/55 stroke-transparent hover:fill-navy-950/35',
                  !selected &&
                    !dimmed &&
                    'fill-transparent stroke-navy-900/25 hover:fill-sun-400/15 hover:stroke-sun-400',
                  'focus-visible:stroke-navy-900 focus-visible:[stroke-dasharray:6_4]',
                )}
                strokeWidth={selected ? 4 : 1.5}
                onClick={(e) => {
                  e.stopPropagation()
                  activate(() => props.onSelectFlat(f))()
                }}
                onKeyDown={onKey(() => props.onSelectFlat(f))}
                onPointerMove={(e) => {
                  if (e.pointerType !== 'mouse') return
                  const r = viewportRef.current.getBoundingClientRect()
                  setHover({ label: label(f), detail: detail(f), x: e.clientX - r.left, y: e.clientY - r.top })
                }}
                onPointerLeave={() => setHover(null)}
              />
            )
          })}
          {/* Dim the rest of the plan around a selected flat. */}
          {(() => {
            const f = flats.find((x) => x.flatNo === selectedFlat)
            if (!f) return null
            const [x, y, w, h] = f.rect
            return (
              <path
                d={`M-40 -40H${W + 40}V${H + 40}H-40Z M${x} ${y}h${w}v${h}h${-w}Z`}
                fillRule="evenodd"
                className="pointer-events-none fill-navy-950/45"
              />
            )
          })()}
        </svg>
      </motion.div>

      {hover && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-(--z-overlay) -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg bg-navy-950/90 px-3 py-2 text-xs whitespace-nowrap text-white shadow-float backdrop-blur"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="font-medium">{hover.label}</p>
          <p className="text-white/70">{hover.detail}</p>
        </div>
      )}
    </div>
  )
}
