import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { brochureAssets } from '@/data'
import { masterPlanGeometry, unitTiles } from '@/data/masterPlan'
import { formatSft } from '@/data/summaries'
import { cn } from '@/utils/cn'
import { useCamera } from '@/components/explore/useCamera'

const { width: W, height: H } = masterPlanGeometry.image
const toBox = ([x, y, w, h]) => ({ x, y, w, h })

/** Region the camera should frame for a given focus. */
function focusBox(focus) {
  switch (focus.kind) {
    case 'overview':
      return { x: 0, y: 0, w: W, h: H }
    case 'block':
      return toBox(masterPlanGeometry.blocks[focus.blockId].bounds)
    case 'clubhouse': {
      const [x, y, w, h] = masterPlanGeometry.clubhouse.rect
      return { x: x - w * 0.6, y: y - h * 0.4, w: w * 2.2, h: h * 1.8 }
    }
    case 'tile': {
      // Frame the tile with its neighbours for context, not a tight crop.
      const t = unitTiles.find((u) => u.blockId === focus.blockId && u.flatNo === focus.flatNo)
      if (!t) return toBox(masterPlanGeometry.blocks[focus.blockId].bounds)
      const [x, y, w, h] = t.rect
      return { x: x - w * 1.2, y: y - h * 1.6, w: w * 3.4, h: h * 4.2 }
    }
  }
}

const tileLabel = (t) =>
  `Flat ${String(t.flatNo).padStart(2, '0')}${t.label !== String(t.flatNo).padStart(2, '0') ? ` (printed “${t.label}”)` : ''}`
const tileDetail = (t) => `${t.stack.bhk} BHK · ${formatSft(t.stack.areaSft)} sft · ${t.stack.facing} facing`

export function MasterPlanCanvas(props) {
  const { focus, activeBlock, selectedFlat, clubhouseSelected, highlight, insets } = props
  const viewportRef = useRef(null)
  const cam = useCamera(viewportRef, { w: W, h: H })
  const [hover, setHover] = useState(null)
  const first = useRef(true)
  const img = brochureAssets['master-plan']
  const full = img.variants[img.variants.length - 1]

  // Fly to the current focus whenever it (or the available viewport) changes.
  const focusKey = JSON.stringify(focus)
  const insetKey = `${insets.top},${insets.right},${insets.bottom},${insets.left}`
  useEffect(() => {
    cam.flyTo(focusBox(focus), insets, { instant: first.current, maxScale: focus.kind === 'tile' ? 1.1 : undefined })
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, insetKey])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => cam.flyTo(focusBox(focus), insets, { instant: true }))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, insetKey])

  const { onCamera } = props
  useEffect(() => {
    onCamera?.({
      zoomIn: () => cam.zoomBy(1.4),
      zoomOut: () => cam.zoomBy(1 / 1.4),
      recenter: () => cam.flyTo(focusBox(focus), insets),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCamera, focusKey, insetKey])

  const showHover = (e, label, detail) => {
    if (e.pointerType !== 'mouse') return
    const r = viewportRef.current.getBoundingClientRect()
    setHover({ label, detail, x: e.clientX - r.left, y: e.clientY - r.top })
  }
  const activate = (fn) => () => {
    if (!cam.wasDrag()) fn()
  }
  const onKey = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }

  const blockIds = Object.keys(masterPlanGeometry.blocks)
  const activeBounds = activeBlock ? masterPlanGeometry.blocks[activeBlock].bounds : undefined

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
        <img
          src={full.src}
          width={W}
          height={H}
          alt={img.alt}
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full rounded-[28px] shadow-[0_40px_120px_rgb(0_0_0/0.45)]"
        />

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full overflow-visible"
          aria-label="Interactive master plan"
        >
          {/* Dim everything outside the active block (even-odd hole). */}
          {activeBounds && (
            <path
              d={`M0 0H${W}V${H}H0Z M${activeBounds[0]} ${activeBounds[1]}h${activeBounds[2]}v${activeBounds[3]}h${-activeBounds[2]}Z`}
              fillRule="evenodd"
              className="pointer-events-none fill-navy-950/55 transition-opacity duration-500"
            />
          )}

          {/* Blocks: whole-block targets (overview) or neighbour switchers (inside a block). */}
          {blockIds
            .filter((id) => id !== activeBlock)
            .map((id) => {
              const [x, y, w, h] = masterPlanGeometry.blocks[id].bounds
              return (
                <rect
                  key={id}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={18}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select Block ${id}`}
                  className="peer cursor-pointer fill-transparent stroke-transparent outline-none [vector-effect:non-scaling-stroke] hover:fill-sun-400/15 hover:stroke-sun-400 focus-visible:fill-sun-400/15 focus-visible:stroke-white"
                  strokeWidth={2}
                  onClick={(e) => {
                    e.stopPropagation()
                    activate(() => props.onSelectBlock(id))()
                  }}
                  onKeyDown={onKey(() => props.onSelectBlock(id))}
                  onPointerMove={(e) => showHover(e, `Block ${id}`, 'Select to explore')}
                  onPointerLeave={() => setHover(null)}
                />
              )
            })}

          {/* Clubhouse */}
          {(() => {
            const [x, y, w, h] = masterPlanGeometry.clubhouse.rect
            return (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={10}
                role="button"
                tabIndex={0}
                aria-label="Clubhouse"
                aria-pressed={clubhouseSelected}
                className={cn(
                  'cursor-pointer outline-none [vector-effect:non-scaling-stroke]',
                  clubhouseSelected
                    ? 'fill-sun-400/30 stroke-sun-400'
                    : 'fill-transparent stroke-transparent hover:fill-sun-400/15 hover:stroke-sun-400 focus-visible:stroke-white',
                )}
                strokeWidth={clubhouseSelected ? 3 : 2}
                onClick={(e) => {
                  e.stopPropagation()
                  activate(props.onSelectClubhouse)()
                }}
                onKeyDown={onKey(props.onSelectClubhouse)}
                onPointerMove={(e) =>
                  showHover(e, 'Clubhouse', masterPlanGeometry.clubhouse.label + ' (as printed on master plan)')
                }
                onPointerLeave={() => setHover(null)}
              />
            )
          })()}

          {/* Unit tiles of the active block */}
          {activeBlock &&
            unitTiles
              .filter((t) => t.blockId === activeBlock)
              .map((t) => {
                const [x, y, w, h] = t.rect
                const selected = t.flatNo === selectedFlat
                const dimmed = highlight !== 'all' && t.stack.bhk !== highlight
                return (
                  <rect
                    key={t.flatNo}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={6}
                    role="button"
                    tabIndex={0}
                    aria-label={`${tileLabel(t)}, ${tileDetail(t)}`}
                    aria-pressed={selected}
                    data-flat={t.flatNo}
                    className={cn(
                      'cursor-pointer outline-none [vector-effect:non-scaling-stroke] transition-[fill,stroke] duration-300',
                      selected && 'fill-sun-400/45 stroke-sun-400',
                      !selected && dimmed && 'fill-navy-950/60 stroke-transparent hover:fill-navy-950/40',
                      !selected && !dimmed && 'fill-white/0 stroke-white/50 hover:fill-sun-400/25 hover:stroke-sun-400',
                      'focus-visible:stroke-white focus-visible:[stroke-dasharray:6_4]',
                    )}
                    strokeWidth={selected ? 3.5 : 1.5}
                    onClick={(e) => {
                      e.stopPropagation()
                      activate(() => props.onSelectTile(t))()
                    }}
                    onKeyDown={onKey(() => props.onSelectTile(t))}
                    onPointerMove={(e) => showHover(e, tileLabel(t), tileDetail(t))}
                    onPointerLeave={() => setHover(null)}
                  />
                )
              })}

          {/* Pulsing ring on the selected tile */}
          {activeBlock &&
            selectedFlat !== undefined &&
            (() => {
              const t = unitTiles.find((u) => u.blockId === activeBlock && u.flatNo === selectedFlat)
              if (!t) return null
              const [x, y, w, h] = t.rect
              return (
                <rect
                  x={x - 8}
                  y={y - 8}
                  width={w + 16}
                  height={h + 16}
                  rx={12}
                  className="pointer-events-none fill-none stroke-sun-400 [vector-effect:non-scaling-stroke] motion-safe:animate-pulse"
                  strokeWidth={2}
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
