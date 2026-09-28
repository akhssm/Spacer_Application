import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  ImageOffIcon,
  MaximizeIcon,
  MinimizeIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImpressionTag } from '@/components/media/BrochureImage'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'
import {
  GALLERY_ALBUMS,
  GALLERY_ITEMS,
  fitSize,
  itemsFor,
  maxZoomFor,
  stepIndex,
  variantFor,
  zoomStepsFor,
} from '@/components/gallery/galleryItems'

/**
 * Project gallery: album chips, one large image with previous / next and swipe, caption with the
 * brochure's "Artistic impression" label on renders, and a thumbnail strip. Zoom only goes as far
 * as each image's own resolution; the larger variant loads only while zoomed.
 *
 * Without `items` it shows the IRA Towers gallery with its albums. Pass `items` (built with
 * `galleryItem`) to show a fixed set instead — e.g. one amenity's pictures — starting at `initialIndex`.
 */

const SLIDE_S = 0.3

export default function GalleryViewer({ open, onOpenChange, items, initialIndex = 0, title = 'IRA Towers gallery' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90 supports-backdrop-filter:backdrop-blur-sm" />
        <GalleryPopup customItems={items} initialIndex={initialIndex} title={title} />
      </DialogPortal>
    </Dialog>
  )
}

function GalleryPopup({ customItems, initialIndex, title }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const reduce = !!useReducedMotion()
  const popupRef = useRef(null)
  const [stage, setStage] = useState(null)
  const size = useElementSize(stage)
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3)

  const [album, setAlbum] = useState('all')
  const [index, setIndexState] = useState(initialIndex)
  const [direction, setDirection] = useState(1)
  const [zoomSetting, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  // Thumbnails beyond the neighbours wait until the first main image has loaded (see Thumbnails).
  const [thumbsReady, setThumbsReady] = useState(false)
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled

  const source = customItems ?? GALLERY_ITEMS
  const items = itemsFor(album, source)
  // Album chips only help when the pictures span more than one album
  const showAlbums = new Set(source.map((i) => i.album)).size > 1
  const item = items[Math.min(index, items.length - 1)]
  const fit = fitSize(item.asset, size.w - (desktop ? 160 : 24), size.h - 16)
  const steps = zoomStepsFor(maxZoomFor(item.asset, fit.w, dpr))
  const maxZoom = steps[steps.length - 1]
  const zoom = Math.min(zoomSetting, maxZoom)
  const canZoom = maxZoom > 1

  // Every change of image (or album) opens it whole.
  const goTo = useCallback((next, dir) => {
    setDirection(dir)
    setIndexState(next)
    setZoom(1)
  }, [])
  const go = useCallback((dir) => goTo(stepIndex(index, dir, items.length), dir), [goTo, index, items.length])
  const chooseAlbum = (a) => {
    setAlbum(a)
    goTo(0, 1)
  }
  const zoomIn = () => setZoom(steps.find((z) => z > zoom) ?? zoom)
  const zoomOut = () => setZoom([...steps].reverse().find((z) => z < zoom) ?? 1)
  const toggleZoom = () => canZoom && setZoom(zoom > 1 ? 1 : (steps.find((z) => z >= 2) ?? maxZoom))

  // Keyboard (capture phase: the dialog stops key events bubbling out of its popup). Escape closes via the dialog.
  const keys = useRef({
    go,
    first: () => goTo(0, -1),
    last: () => goTo(items.length - 1, 1),
    zoomIn,
    zoomOut,
    reset: () => setZoom(1),
  })
  useEffect(() => {
    keys.current = {
      go,
      first: () => goTo(0, -1),
      last: () => goTo(items.length - 1, 1),
      zoomIn,
      zoomOut,
      reset: () => setZoom(1),
    }
  })
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const k = keys.current
      if (e.key === 'ArrowRight') k.go(1)
      else if (e.key === 'ArrowLeft') k.go(-1)
      else if (e.key === 'Home') k.first()
      else if (e.key === 'End') k.last()
      else if (e.key === '+' || e.key === '=') k.zoomIn()
      else if (e.key === '-') k.zoomOut()
      else if (e.key === '0') k.reset()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(!!popupRef.current && document.fullscreenElement === popupRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void popupRef.current?.requestFullscreen().catch(() => {})
  }

  // Preload only the previous and next images, at the size they will be shown.
  const baseWidth = fit.w * dpr
  useEffect(() => {
    if (baseWidth <= 0) return
    for (const n of [index - 1, index + 1]) {
      const neighbour = items[n]
      if (neighbour) new Image().src = variantFor(neighbour.asset, baseWidth).src
    }
  }, [baseWidth, index, items])

  const atStart = index === 0
  const atEnd = index === items.length - 1

  return (
    <DialogPrimitive.Popup
      ref={popupRef}
      className="fixed inset-0 z-50 flex flex-col text-white outline-none [color-scheme:dark] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      style={{ background: fullscreen ? '#05080b' : undefined }}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">
        Renders and plans from the IRA Towers brochure.{showAlbums && ' Use the album buttons to filter.'} Use the arrow
        keys or previous and next buttons to move between images, plus and minus to zoom, and Escape to close.
      </DialogDescription>

      {/* Top bar: title, albums (desktop), zoom, fullscreen, close */}
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <ImageIcon className="size-5 shrink-0 text-gold-300" aria-hidden="true" />
          <p className="truncate font-display text-lg sm:text-xl">{customItems ? title : 'Gallery'}</p>
          {desktop && showAlbums && (
            <AlbumChips album={album} source={source} onChoose={chooseAlbum} className="ml-4" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <BarButton label="Zoom out" onClick={zoomOut} disabled={zoom <= 1}>
            <ZoomOutIcon />
          </BarButton>
          <span
            className="w-12 text-center font-numeric text-sm text-white/70"
            aria-live="polite"
            aria-label={`Zoom ${Math.round(zoom * 100)} percent`}
          >
            {Math.round(zoom * 100)}%
          </span>
          <BarButton label="Zoom in" onClick={zoomIn} disabled={!canZoom || zoom >= maxZoom}>
            <ZoomInIcon />
          </BarButton>
          {canFullscreen && (
            <BarButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </BarButton>
          )}
          <DialogClose render={<BarButton label="Close gallery" />}>
            <XIcon />
          </DialogClose>
        </div>
      </div>
      {!desktop && showAlbums && (
        <AlbumChips album={album} source={source} onChoose={chooseAlbum} className="px-3 pt-2" />
      )}

      {/* Stage */}
      <div ref={setStage} className="relative mt-2 min-h-0 flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
        {fit.w > 0 && (
          <Stage
            key={album}
            item={item}
            index={index}
            direction={direction}
            fit={fit}
            dpr={dpr}
            zoom={zoom}
            reduce={reduce}
            stageW={size.w}
            stageH={size.h}
            atStart={atStart}
            atEnd={atEnd}
            onGo={go}
            onToggleZoom={toggleZoom}
            onLoaded={() => setThumbsReady(true)}
          />
        )}
        {desktop && (
          <>
            <SideButton side="left" label="Previous image" disabled={atStart} onClick={() => go(-1)} />
            <SideButton side="right" label="Next image" disabled={atEnd} onClick={() => go(1)} />
          </>
        )}
      </div>

      {/* Caption + counter */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 pt-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm text-white sm:text-base">{item.caption}</p>
          {item.impression && <ImpressionTag />}
          <span className="text-xs text-white/45">Brochure p{item.page}</span>
        </div>
        <p className="font-numeric text-sm text-white/70" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Image </span>
          {index + 1} / {items.length}
          <span className="sr-only">: {item.caption}</span>
        </p>
      </div>

      {/* Thumbnails, with phone prev / next */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-4">
        {!desktop && (
          <BarButton label="Previous image" onClick={() => go(-1)} disabled={atStart}>
            <ChevronLeftIcon />
          </BarButton>
        )}
        <Thumbnails items={items} index={index} ready={thumbsReady} onChoose={(i) => goTo(i, i > index ? 1 : -1)} />
        {!desktop && (
          <BarButton label="Next image" onClick={() => go(1)} disabled={atEnd}>
            <ChevronRightIcon />
          </BarButton>
        )}
      </div>
    </DialogPrimitive.Popup>
  )
}

function AlbumChips({ album, source, onChoose, className }) {
  return (
    <div
      role="group"
      aria-label="Albums"
      className={cn('flex gap-1.5 overflow-x-auto [scrollbar-width:none]', className)}
    >
      {GALLERY_ALBUMS.filter((a) => itemsFor(a.id, source).length > 0).map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={album === a.id}
          onClick={() => album !== a.id && onChoose(a.id)}
          className={cn(
            'h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sun-400',
            album === a.id
              ? 'border-sun-400 bg-sun-400 text-navy-950'
              : 'border-white/15 text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {a.label}
          <span className={cn('ml-1.5 font-numeric text-xs', album === a.id ? 'text-navy-950/60' : 'text-white/40')}>
            {itemsFor(a.id, source).length}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Main image: slides (or crossfades with reduced motion), swipes, double-tap zoom and pan. */
function Stage({
  item,
  index,
  direction,
  fit,
  dpr,
  zoom,
  reduce,
  stageW,
  stageH,
  atStart,
  atEnd,
  onGo,
  onToggleZoom,
  onLoaded,
}) {
  const dragX = useMotionValue(0)
  const drag = useRef(null)
  const lastTap = useRef(0)
  const lastTouchToggle = useRef(0)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    drag.current = {
      x0: e.clientX,
      t0: performance.now(),
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
    }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || zoom > 1) return
    const dx = e.clientX - d.x0
    if (!d.moved && Math.abs(dx) < 8) return
    if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId)
    d.moved = true
    const now = performance.now()
    d.v = (e.clientX - d.lastX) / Math.max(1, now - d.lastT)
    d.lastX = e.clientX
    d.lastT = now
    const blocked = (dx > 0 && atStart) || (dx < 0 && atEnd)
    if (!reduce) dragX.set(blocked ? dx * 0.25 : dx)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x0
    if (d.moved) {
      const dir = dx < 0 ? 1 : -1
      const allowed = dir === 1 ? !atEnd : !atStart
      if (allowed && (Math.abs(dx) > fit.w * 0.2 || Math.abs(d.v) > 0.45)) {
        dragX.set(0)
        return onGo(dir)
      }
      void animate(dragX, 0, { duration: reduce ? 0 : 0.2 })
      return
    }
    // Mouse double-clicks use the native dblclick (system timing); touch taps are timed here.
    if (performance.now() - d.t0 > 350 || e.pointerType === 'mouse') return
    const now = performance.now()
    if (now - lastTap.current < 320) {
      lastTap.current = 0
      lastTouchToggle.current = now
      onToggleZoom()
    } else lastTap.current = now
  }

  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (dir) => ({ opacity: 0, x: dir * 60 }),
        center: { opacity: 1, x: 0 },
        exit: (dir) => ({ opacity: 0, x: dir * -60 }),
      }

  return (
    <div className="absolute inset-0 grid place-items-center">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={`${item.id}-${index}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduce ? 0.15 : SLIDE_S, ease: 'easeOut' }}
          className="col-start-1 row-start-1"
        >
          <motion.div
            style={{ x: dragX }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => void animate(dragX, 0, { duration: 0.2 })}
            // Some mobile browsers also fire dblclick after a double tap — don't toggle twice.
            onDoubleClick={() => performance.now() - lastTouchToggle.current > 600 && onToggleZoom()}
            className="select-none"
          >
            <ZoomLayer zoom={zoom} w={fit.w} h={fit.h} stageW={stageW} stageH={stageH} reduce={reduce}>
              <GalleryImage item={item} w={fit.w} h={fit.h} dpr={dpr} zoom={zoom} onLoaded={onLoaded} />
            </ZoomLayer>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * The image at the size it is shown, with a spinner until it loads and a clear state if it cannot
 * load. While zoomed, the largest sharp variant fades in on top (never beyond the source).
 */
function GalleryImage({ item, w, h, dpr, zoom, onLoaded }) {
  const base = variantFor(item.asset, w * dpr)
  const sharp = zoom > 1 ? variantFor(item.asset, w * dpr * zoom) : base
  const [status, setStatus] = useState({})
  const baseStatus = status[base.src]
  // The shown variant can change while the stage is first measured; an image that finished before
  // its load listener saw it (e.g. from cache) is picked up here instead of waiting forever.
  const baseRef = useRef(null)
  useEffect(() => {
    const el = baseRef.current
    if (el?.complete && el.naturalWidth > 0) {
      setStatus((s) => (s[base.src] ? s : { ...s, [base.src]: 'loaded' }))
      onLoaded()
    }
  }, [base.src, onLoaded])
  return (
    <div className="relative" style={{ width: w, height: h }} data-gallery-image={item.id}>
      {baseStatus === 'error' ? (
        <div
          role="img"
          aria-label={`${item.caption} — image unavailable`}
          className="absolute inset-0 grid place-items-center rounded-lg border border-white/10 bg-white/5 text-center"
        >
          <div className="grid justify-items-center gap-2 p-6 text-sm text-white/70" data-gallery-error>
            <ImageOffIcon className="size-8 text-gold-300" aria-hidden="true" />
            Image unavailable
          </div>
        </div>
      ) : (
        <>
          {baseStatus !== 'loaded' && (
            <div role="status" className="absolute inset-0 grid place-items-center" data-gallery-loading>
              <span
                className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-sun-400"
                aria-hidden="true"
              />
              <span className="sr-only">Loading image</span>
            </div>
          )}
          <img
            ref={baseRef}
            src={base.src}
            width={base.width}
            height={base.height}
            alt={item.caption}
            draggable={false}
            decoding="async"
            onLoad={() => {
              setStatus((s) => ({ ...s, [base.src]: 'loaded' }))
              onLoaded()
            }}
            onError={() => {
              setStatus((s) => ({ ...s, [base.src]: 'error' }))
              onLoaded()
            }}
            className={cn('absolute inset-0 size-full rounded-sm', baseStatus !== 'loaded' && 'invisible')}
          />
          {sharp.src !== base.src && (
            <img
              src={sharp.src}
              width={sharp.width}
              height={sharp.height}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              data-hires={sharp.width}
              onLoad={() => setStatus((s) => ({ ...s, [sharp.src]: 'loaded' }))}
              className={cn(
                'absolute inset-0 size-full rounded-sm transition-opacity duration-300',
                status[sharp.src] === 'loaded' ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
        </>
      )}
    </div>
  )
}

/** Scales the image and allows panning while zoomed, limited to the image. */
function ZoomLayer({ zoom, w, h, stageW, stageH, reduce, children }) {
  const scale = useMotionValue(zoom)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  useEffect(() => {
    const opts = { duration: reduce ? 0 : 0.25, ease: 'easeOut' }
    void animate(scale, zoom, opts)
    if (zoom === 1) {
      void animate(x, 0, opts)
      void animate(y, 0, opts)
    }
  }, [reduce, scale, x, y, zoom])
  const mx = Math.max(0, (w * zoom - stageW) / 2 + 24)
  const my = Math.max(0, (h * zoom - stageH) / 2 + 24)
  return (
    <motion.div
      drag={zoom > 1}
      dragConstraints={{ left: -mx, right: mx, top: -my, bottom: my }}
      dragElastic={0.06}
      dragMomentum={false}
      style={{ scale, x, y, cursor: zoom > 1 ? 'grab' : undefined }}
      data-zoom={zoom}
    >
      {children}
    </motion.div>
  )
}

/**
 * Thumbnail strip. Only the neighbours' thumbnails load straight away; the rest follow once the
 * main image has loaded, so the image being viewed is never competing with the strip. (Plans and
 * the location map have no variant smaller than ~1200 px, so their thumbnails are the heaviest.)
 */
function Thumbnails({ items, index, ready, onChoose }) {
  const strip = useRef(null)
  // Keep the current thumbnail in view (scrolling only the strip, never the page).
  useEffect(() => {
    const el = strip.current
    const thumb = el?.children[index]
    if (!el || !thumb) return
    el.scrollTo({ left: thumb.offsetLeft - el.clientWidth / 2 + thumb.clientWidth / 2, behavior: 'smooth' })
  }, [index])
  return (
    <div
      ref={strip}
      role="group"
      aria-label="Thumbnails"
      className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none]"
    >
      {items.map((it, i) => {
        const v = variantFor(it.asset, 160)
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => i !== index && onChoose(i)}
            aria-label={`Show image ${i + 1}: ${it.caption}`}
            aria-current={i === index ? 'true' : undefined}
            className={cn(
              'relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-white/5 transition-[border-color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 sm:h-16 sm:w-24',
              i === index ? 'border-sun-400 opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
            )}
          >
            {(ready || Math.abs(i - index) <= 1) && (
              <img
                src={v.src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="size-full object-cover"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

function SideButton({ side, label, disabled, onClick }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 size-14 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md hover:bg-white/15 disabled:opacity-25',
        side === 'left' ? 'left-5' : 'right-5',
      )}
    >
      {side === 'left' ? <ChevronLeftIcon className="size-7" /> : <ChevronRightIcon className="size-7" />}
    </Button>
  )
}

function BarButton({ label, onClick, disabled, children, ...rest }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="size-11 shrink-0 rounded-full text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-30"
      {...rest}
    >
      {children}
    </Button>
  )
}

function useElementSize(el) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return size
}
