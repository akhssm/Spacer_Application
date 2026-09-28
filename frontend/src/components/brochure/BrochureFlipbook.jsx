import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { brochurePages, pickVariant } from '@/components/brochure/pages'
import { clampIndex, desktopSpreads, pageLabel, spreadIndexOf, spreadLabel } from '@/components/brochure/spreads'

/**
 * A brochure as a book (the IRA Towers brochure unless `pages` is given): front cover alone, two-page spreads on desktop turned with a
 * stiff CSS 3D page (perspective, moving shade, corner curl), one page at a time on phones with
 * swipe. Zoom swaps detail pages to their 3200 px render so small print is readable.
 * Pages are the published brochure rendered as-is (INTERNAL / LOCAL preview — see pages.js).
 */

/**
 * The book being shown: its page count, page aspect (from page 1) and a page lookup. Every part of
 * the flipbook reads the pages from here, so any brochure in the `brochurePages` shape can be shown.
 */
const BookContext = createContext(null)
const useBook = () => useContext(BookContext)
function makeBook(pages) {
  const byNumber = new Map(pages.map((p) => [p.page, p]))
  const first = pages[0]
  return { count: pages.length, aspect: first.widthPt / first.heightPt, getPage: (n) => byNumber.get(n) }
}
const TURN_S = 0.8
const SLIDE_S = 0.32
const EASE_TURN = [0.645, 0.045, 0.355, 1]
const ZOOM_STEPS = [1, 1.5, 2, 3, 4]
const STAGE_BG = '#05080b'

const firstPageOf = (s) => s.left ?? s.right
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function BrochureFlipbook({ open, onOpenChange, pages = brochurePages, title = 'IRA Towers brochure' }) {
  // The IRA brochure renders are not yet cleared for publication (see pages.js), so they carry a badge.
  const internal = pages === brochurePages
  const book = useMemo(() => ({ ...makeBook(pages), title, internal }), [pages, title, internal])
  return (
    <BookContext.Provider value={book}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="bg-black/85 supports-backdrop-filter:backdrop-blur-sm" />
          <FlipbookPopup />
        </DialogPortal>
      </Dialog>
    </BookContext.Provider>
  )
}

function FlipbookPopup() {
  const book = useBook()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const reduce = !!useReducedMotion()
  const popupRef = useRef(null)
  const [stage, setStage] = useState(null)
  const size = useElementSize(stage)
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3)

  // The current place in the book is always a page number, so desktop ⇄ phone keeps the position.
  const [page, setPageState] = useState(1)
  const [zoomSetting, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled

  const spreads = useMemo(() => desktopSpreads(book.count), [book.count])
  const index = spreadIndexOf(spreads, page)
  const spread = spreads[index]

  // Page size that fits the stage (two pages side by side on desktop).
  const pad = desktop ? 32 : 12
  const availW = Math.max(0, size.w - pad * 2 - (desktop ? 160 : 0))
  const availH = Math.max(0, size.h - pad * 2)
  const pageH = Math.floor(
    desktop ? Math.min(availH, availW / 2 / book.aspect) : Math.min(availH, availW / book.aspect),
  )
  const pageW = pageH * book.aspect

  const label = desktop ? spreadLabel(spread, book.count) : pageLabel(page, book.count)
  const visiblePages = desktop
    ? [spread.left, spread.right].filter(Boolean).map((p) => book.getPage(p))
    : [book.getPage(page)]
  const maxZoom = visiblePages.some((p) => p.zoomable) ? 4 : 2

  // Zoom never exceeds what the visible pages allow, and a new page always opens whole.
  const zoom = Math.min(zoomSetting, maxZoom)
  const setPage = useCallback((p) => {
    setPageState(p)
    setZoom(1)
  }, [])
  const setZoomTo = useCallback((z) => setZoom(Math.min(Math.max(1, z), 4)), [])
  const zoomIn = () => setZoomTo(ZOOM_STEPS.find((z) => z > zoom && z <= maxZoom) ?? zoom)
  const zoomOut = () => setZoomTo([...ZOOM_STEPS].reverse().find((z) => z < zoom) ?? 1)

  const nav = useRef(null)

  // Keyboard: ← → PageUp/PageDown, Home/End, + − 0. Escape is handled by the dialog (closes).
  // Capture phase: the dialog stops key events from bubbling out of its popup.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const k = e.key
      if (k === 'ArrowRight' || k === 'PageDown') nav.current?.go(1)
      else if (k === 'ArrowLeft' || k === 'PageUp') nav.current?.go(-1)
      else if (k === 'Home') nav.current?.jump(1)
      else if (k === 'End') nav.current?.jump(book.count)
      else if (k === '+' || k === '=')
        setZoom((z) => ZOOM_STEPS.find((s) => s > Math.min(z, maxZoom) && s <= maxZoom) ?? Math.min(z, maxZoom))
      else if (k === '-') setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < Math.min(z, maxZoom)) ?? 1)
      else if (k === '0') setZoom(1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [maxZoom, book.count])

  // Fullscreen on the viewer itself (hidden where the browser has no element fullscreen, e.g. iPhone).
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === popupRef.current && !!popupRef.current)
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

  // Preload only the neighbouring pages at the size in use (never the whole brochure).
  const baseHeight = pageH * dpr
  useEffect(() => {
    if (!pageH) return
    const around = desktop
      ? [spreads[index - 1], spreads[index + 1]].flatMap((s) => (s ? [s.left, s.right] : []))
      : [page - 1, page + 1]
    for (const p of around) {
      const bp = p ? book.getPage(p) : undefined
      if (bp) new Image().src = pickVariant(bp, baseHeight).src
    }
  }, [book, desktop, index, page, spreads, baseHeight, pageH])

  const atStart = desktop ? index === 0 : page === 1
  const atEnd = desktop ? index === spreads.length - 1 : page === book.count

  return (
    <DialogPrimitive.Popup
      ref={popupRef}
      className="fixed inset-0 z-50 flex flex-col text-white outline-none [color-scheme:dark] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0"
      style={{ background: fullscreen ? STAGE_BG : undefined }}
    >
      <DialogTitle className="sr-only">{book.title}</DialogTitle>
      <DialogDescription className="sr-only">
        The published brochure, page by page.
        {book.internal && ' Internal preview — the brochure imagery is not yet cleared for publication.'} Use the arrow
        keys or the previous and next buttons to turn pages, plus and minus to zoom, and Escape to close.
      </DialogDescription>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <BookOpenIcon className="size-5 shrink-0 text-gold-300" aria-hidden="true" />
          <p className="truncate font-display text-lg sm:text-xl">{book.title}</p>
          {book.internal && (
            <span className="hidden rounded-full border border-white/15 px-2 py-0.5 text-[0.625rem] tracking-[0.14em] text-white/55 uppercase sm:inline">
              Internal preview
            </span>
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
          <BarButton label="Zoom in" onClick={zoomIn} disabled={zoom >= maxZoom}>
            <ZoomInIcon />
          </BarButton>
          {canFullscreen && (
            <BarButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </BarButton>
          )}
          <DialogClose render={<BarButton label="Close brochure" />}>
            <XIcon />
          </DialogClose>
        </div>
      </div>

      {/* Stage */}
      <div ref={setStage} className="relative min-h-0 flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
        {pageH > 0 && (
          <ZoomLayer
            zoom={zoom}
            contentW={desktop ? pageW * 2 : pageW}
            contentH={pageH}
            stageW={size.w}
            stageH={size.h}
            reduce={reduce}
          >
            {desktop ? (
              <DesktopBook
                spreads={spreads}
                index={index}
                pageW={pageW}
                pageH={pageH}
                dpr={dpr}
                zoom={zoom}
                reduce={reduce}
                onPage={setPage}
                onToggleZoom={() => setZoomTo(zoom > 1 ? 1 : Math.min(2, maxZoom))}
                navRef={nav}
              />
            ) : (
              <PhonePages
                page={page}
                pageW={pageW}
                pageH={pageH}
                gap={16}
                dpr={dpr}
                zoom={zoom}
                reduce={reduce}
                onPage={setPage}
                onToggleZoom={() => setZoomTo(zoom > 1 ? 1 : Math.min(2, maxZoom))}
                navRef={nav}
              />
            )}
          </ZoomLayer>
        )}

        {desktop && (
          <>
            <SideButton side="left" label="Previous page" disabled={atStart} onClick={() => nav.current?.go(-1)} />
            <SideButton side="right" label="Next page" disabled={atEnd} onClick={() => nav.current?.go(1)} />
          </>
        )}
      </div>

      {/* Bottom bar: counter (and prev / next on phones) */}
      <div className="flex items-center justify-center gap-3 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
        {!desktop && (
          <BarButton label="Previous page" onClick={() => nav.current?.go(-1)} disabled={atStart}>
            <ChevronLeftIcon />
          </BarButton>
        )}
        <p className="min-w-40 text-center text-sm text-white/80" aria-live="polite">
          {label}
        </p>
        {!desktop && (
          <BarButton label="Next page" onClick={() => nav.current?.go(1)} disabled={atEnd}>
            <ChevronRightIcon />
          </BarButton>
        )}
      </div>
      {desktop && (
        <p className="pointer-events-none absolute bottom-4 left-5 hidden text-[0.7rem] text-white/40 xl:block">
          Drag a page corner or press ← → · double-click to zoom
        </p>
      )}
    </DialogPrimitive.Popup>
  )
}

// ---------------------------------------------------------------------------------------------
// Desktop: two-page spreads with a stiff 3D page turn
// ---------------------------------------------------------------------------------------------

function DesktopBook({ spreads, index, pageW, pageH, dpr, zoom, reduce, onPage, onToggleZoom, navRef }) {
  const [turn, setTurn] = useState(null)
  const busy = useRef(false)
  const rotate = useMotionValue(0)
  // A lone cover / back cover sits in the middle; the book slides open around it.
  const offsetOf = useCallback(
    (s) => (s.left === undefined ? -pageW / 2 : s.right === undefined ? pageW / 2 : 0),
    [pageW],
  )
  const shift = useMotionValue(offsetOf(spreads[index]))
  useEffect(() => {
    if (!busy.current) shift.set(offsetOf(spreads[index]))
  }, [index, offsetOf, shift, spreads])

  const frontShade = useTransform(rotate, [0, -90], [0, 0.4])
  const backShade = useTransform(rotate, [-90, -180], [0.4, 0])
  const castShade = useTransform(rotate, [0, -90, -180], [0, 0.35, 0])

  const finish = useCallback(
    (t, commit, fromAngle) => {
      const start = t.dir === 1 ? 0 : -180
      const end = t.dir === 1 ? -180 : 0
      const target = commit ? end : start
      const done = () => {
        if (commit) onPage(firstPageOf(spreads[t.to]))
        setTurn(null)
        busy.current = false
      }
      const remaining = Math.abs(target - (fromAngle ?? rotate.get())) / 180
      animate(shift, offsetOf(spreads[commit ? t.to : t.from]), {
        duration: TURN_S * Math.max(0.25, remaining),
        ease: EASE_TURN,
      })
      void animate(rotate, target, { duration: TURN_S * Math.max(0.25, remaining), ease: EASE_TURN }).then(done)
    },
    [offsetOf, onPage, rotate, shift, spreads],
  )

  const go = useCallback(
    (dir) => {
      const to = index + dir
      if (busy.current || to < 0 || to >= spreads.length) return
      if (reduce) return onPage(firstPageOf(spreads[to]))
      busy.current = true
      const t = { dir, from: index, to }
      rotate.set(dir === 1 ? 0 : -180)
      setTurn(t)
      finish(t, true, dir === 1 ? 0 : -180)
    },
    [finish, index, onPage, reduce, rotate, spreads],
  )
  const jump = useCallback(
    (p) => !busy.current && onPage(firstPageOf(spreads[clampIndex(spreadIndexOf(spreads, p), spreads.length)])),
    [onPage, spreads],
  )
  useEffect(() => {
    navRef.current = { go, jump }
  }, [go, jump, navRef])

  // Pointer: drag a page towards the spine to turn it; tap its outer edge to turn; double-tap zooms.
  const drag = useRef(null)
  const taps = useRef(0)
  const onPointerDown = (e) => {
    if (busy.current || e.button !== 0) return
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = {
      x0: e.clientX,
      t0: performance.now(),
      side: e.clientX - r.left > r.width / 2 ? 'right' : 'left',
      p: 0,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
    }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || zoom > 1) return
    const dx = e.clientX - d.x0
    if (!d.turn) {
      if (Math.abs(dx) < 8) return
      const dir = d.side === 'right' && dx < 0 ? 1 : d.side === 'left' && dx > 0 ? -1 : 0
      const to = index + dir
      if (!dir || reduce || to < 0 || to >= spreads.length) return void (drag.current = null)
      d.turn = { dir, from: index, to }
      busy.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setTurn(d.turn)
    }
    const now = performance.now()
    d.v = (e.clientX - d.lastX) / Math.max(1, now - d.lastT)
    d.lastX = e.clientX
    d.lastT = now
    d.p = clamp01(Math.abs(dx) / (pageW * 1.4))
    rotate.set(d.turn.dir === 1 ? -180 * d.p : -180 * (1 - d.p))
    const a = offsetOf(spreads[d.turn.from])
    shift.set(a + (offsetOf(spreads[d.turn.to]) - a) * d.p)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.turn) {
      const fast = d.turn.dir === 1 ? d.v < -0.45 : d.v > 0.45
      return finish(d.turn, d.p > 0.3 || fast)
    }
    if (performance.now() - d.t0 > 350 || Math.abs(e.clientX - d.x0) > 8) return
    // Tap: outer edge turns the page; a double tap toggles zoom.
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const edge = pageW * 0.18
    if (zoom === 1 && (x > r.width - edge || x < edge)) return go(x > r.width - edge ? 1 : -1)
    taps.current += 1
    if (taps.current === 2) onToggleZoom()
    setTimeout(() => (taps.current = 0), 320)
  }

  const s = spreads[index]
  const baseLeft = turn ? (turn.dir === 1 ? spreads[turn.from].left : spreads[turn.to].left) : s.left
  const baseRight = turn ? (turn.dir === 1 ? spreads[turn.to].right : spreads[turn.from].right) : s.right
  const leafFront = turn ? (turn.dir === 1 ? spreads[turn.from].right : spreads[turn.to].right) : undefined
  const leafBack = turn ? (turn.dir === 1 ? spreads[turn.to].left : spreads[turn.from].left) : undefined
  const needed = pageH * dpr
  const hasNext = index < spreads.length - 1
  const hasPrev = index > 0

  return (
    <motion.div
      className="relative select-none"
      style={{ width: pageW * 2, height: pageH, x: shift, perspective: pageW * 3.2 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => drag.current?.turn && finish(drag.current.turn, false)}
    >
      <Slot
        side="left"
        pageNo={baseLeft}
        pageW={pageW}
        pageH={pageH}
        needed={needed}
        zoom={zoom}
        shade={turn?.dir === -1 ? castShade : undefined}
        curl={!turn && zoom === 1 && hasPrev}
      />
      <Slot
        side="right"
        pageNo={baseRight}
        pageW={pageW}
        pageH={pageH}
        needed={needed}
        zoom={zoom}
        shade={turn?.dir === 1 ? castShade : undefined}
        curl={!turn && zoom === 1 && hasNext}
      />
      {turn && (
        <motion.div
          className="absolute top-0"
          style={{
            left: pageW,
            width: pageW,
            height: pageH,
            rotateY: rotate,
            transformOrigin: '0% 50%',
            transformStyle: 'preserve-3d',
          }}
        >
          <Face pageNo={leafFront} pageW={pageW} pageH={pageH} needed={needed} shade={frontShade} spine="left" />
          <Face pageNo={leafBack} pageW={pageW} pageH={pageH} needed={needed} shade={backShade} spine="right" back />
        </motion.div>
      )}
    </motion.div>
  )
}

function Slot({ side, pageNo, pageW, pageH, needed, zoom, shade, curl }) {
  const book = useBook()
  const page = pageNo ? book.getPage(pageNo) : undefined
  if (!page) return null
  return (
    <div
      className="group absolute top-0 overflow-hidden shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)]"
      style={{ left: side === 'left' ? 0 : pageW, width: pageW, height: pageH }}
    >
      <PageImage page={page} needed={needed} zoom={zoom} />
      {/* Gutter: soft shade towards the spine. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-[9%]"
        style={{
          [side === 'left' ? 'right' : 'left']: 0,
          background: `linear-gradient(${side === 'left' ? 'to left' : 'to right'}, rgb(0 0 0 / 0.22), transparent)`,
        }}
      />
      {shade && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: shade,
            background: `linear-gradient(${side === 'left' ? 'to left' : 'to right'}, rgb(0 0 0 / 0.55), transparent 70%)`,
          }}
        />
      )}
      {curl && <CornerCurl side={side} />}
    </div>
  )
}

/** Subtle dog-ear on the outer top corner while the pointer is over the page. */
function CornerCurl({ side }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 size-12 scale-0 transition-transform duration-200 ease-out group-hover:scale-100 motion-reduce:hidden',
        side === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
      )}
      style={{
        background: `linear-gradient(${side === 'right' ? '225deg' : '135deg'}, ${STAGE_BG} 50%, #f3efe6 50%, #ffffff 64%, #d8d1c2 100%)`,
        filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))',
      }}
    />
  )
}

function Face({ pageNo, pageW, pageH, needed, shade, spine, back }) {
  const book = useBook()
  const page = pageNo ? book.getPage(pageNo) : undefined
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#f3efe6]"
      style={{
        width: pageW,
        height: pageH,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
      }}
    >
      {page && <PageImage page={page} needed={needed} />}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: shade,
          background: `linear-gradient(to ${spine === 'left' ? 'right' : 'left'}, rgb(0 0 0 / 0.6), rgb(0 0 0 / 0.15))`,
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Phone: one page at a time, swipe to turn
// ---------------------------------------------------------------------------------------------

function PhonePages({ page, pageW, pageH, gap, dpr, zoom, reduce, onPage, onToggleZoom, navRef }) {
  const book = useBook()
  const x = useMotionValue(0)
  const busy = useRef(false)
  const step = pageW + gap

  const slide = useCallback(
    (dir) => {
      const to = page + dir
      if (busy.current || to < 1 || to > book.count) return
      if (reduce) return onPage(to)
      busy.current = true
      void animate(x, -dir * step, { duration: SLIDE_S, ease: 'easeOut' }).then(() => {
        onPage(to)
        x.set(0)
        busy.current = false
      })
    },
    [onPage, page, reduce, step, x, book.count],
  )
  const jump = useCallback((p) => !busy.current && onPage(Math.min(book.count, Math.max(1, p))), [onPage, book.count])
  useEffect(() => {
    navRef.current = { go: slide, jump }
  }, [jump, navRef, slide])

  const drag = useRef(null)
  const taps = useRef(0)
  const onPointerDown = (e) => {
    if (busy.current) return
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
    // Resist past the first / last page.
    const blocked = (dx > 0 && page === 1) || (dx < 0 && page === book.count)
    x.set(blocked ? dx * 0.25 : dx)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x0
    if (d.moved) {
      const dir = dx < 0 ? 1 : -1
      const target = page + dir
      const commit = target >= 1 && target <= book.count && (Math.abs(dx) > pageW * 0.22 || Math.abs(d.v) > 0.45)
      if (commit) return slide(dir)
      void animate(x, 0, { duration: reduce ? 0 : 0.2 })
      return
    }
    if (performance.now() - d.t0 > 350) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const edge = pageW * 0.2
    if (zoom === 1 && (px < edge || px > r.width - edge)) return slide(px > r.width - edge ? 1 : -1)
    taps.current += 1
    if (taps.current === 2) onToggleZoom()
    setTimeout(() => (taps.current = 0), 320)
  }

  const needed = pageH * dpr
  return (
    <motion.div
      className="relative select-none"
      style={{ width: pageW, height: pageH, x }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => void animate(x, 0, { duration: 0.2 })}
    >
      {[page - 1, page, page + 1].map((p, i) => {
        const bp = book.getPage(p)
        if (!bp) return null
        return (
          <div
            key={p}
            className="absolute top-0 overflow-hidden shadow-[0_14px_40px_-12px_rgb(0_0_0/0.8)]"
            style={{ left: (i - 1) * step, width: pageW, height: pageH }}
            aria-hidden={p !== page}
          >
            <PageImage page={bp} needed={needed} zoom={p === page ? zoom : 1} />
          </div>
        )
      })}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------------------------

/**
 * One rendered page. The size-appropriate image (≤ 1600 px) is always shown; only while zoomed
 * does the sharper variant (3200 px on detail pages) load and fade in on top — so phones never
 * decode a 3200 px page just to show it whole, and there is no blank flash while it loads.
 */
function PageImage({ page, needed, zoom = 1 }) {
  const base = pickVariant(page, Math.min(needed, 1600))
  const sharp = zoom > 1 ? pickVariant(page, needed * zoom) : base
  const [loadedSharp, setLoadedSharp] = useState()
  return (
    <div className="absolute inset-0 bg-[#f3efe6]">
      <img
        src={base.src}
        width={base.width}
        height={base.height}
        alt={page.label}
        draggable={false}
        decoding="async"
        className="absolute inset-0 size-full"
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
          onLoad={() => setLoadedSharp(sharp.src)}
          data-hires={sharp.height}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-300',
            loadedSharp === sharp.src ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  )
}

/** Scales the book and lets it be dragged around while zoomed (pan limited to the content). */
function ZoomLayer({ zoom, contentW, contentH, stageW, stageH, reduce, children }) {
  const scale = useMotionValue(zoom)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  useEffect(() => {
    const opts = { duration: reduce ? 0 : 0.3, ease: 'easeOut' }
    void animate(scale, zoom, opts)
    if (zoom === 1) {
      void animate(x, 0, opts)
      void animate(y, 0, opts)
    }
  }, [reduce, scale, x, y, zoom])
  const mx = Math.max(0, (contentW * zoom - stageW) / 2 + 24)
  const my = Math.max(0, (contentH * zoom - stageH) / 2 + 24)
  return (
    <div className="absolute inset-0 grid place-items-center">
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
      className="size-11 rounded-full text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-30"
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
