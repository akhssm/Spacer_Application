import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MinusIcon, PlusIcon, ScanIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrochureImage, ImpressionTag } from '@/components/media/BrochureImage'
import { brochureAssets } from '@/data'
import { useCamera } from '@/components/explore/useCamera'

/** The enlarged image fills the dialog, so nothing is cropped away by the stage. */
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

/** Click-to-enlarge wrapper for a brochure image; `trigger` must be a button-like element. */
export function ImageLightbox({ asset, trigger, impression = true }) {
  const a = brochureAssets[asset]
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      {/*
        A fixed stage rather than a box shrink-wrapped to the image: a tall plan on a narrow
        phone used to be fitted to the viewport height, leaving it ~170px wide and unreadable.
        The dark chip on the close button keeps it visible over a white drawing.
       */}
      <DialogContent className="dark flex h-[92svh] w-[min(96vw,1600px)] max-w-[min(96vw,1600px)] flex-col gap-3 bg-navy-950 p-3 text-foreground sm:max-w-[min(96vw,1600px)] [&_[data-slot=dialog-close]]:bg-navy-950/80 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:backdrop-blur-md">
        <DialogTitle className="sr-only">{a.alt || 'Brochure image'}</DialogTitle>
        <DialogDescription className="sr-only">
          Enlarged view from the IRA Towers brochure, page {a.page}. Drag to pan, pinch or scroll to zoom.
        </DialogDescription>
        <ZoomableAsset asset={asset} impression={impression} />
        <p className="px-1 text-xs text-muted-foreground">
          {a.alt} <span className="text-muted-foreground/70">· drag to pan · pinch or scroll to zoom</span>
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** Pan / pinch-zoom stage sharing the explorer's 2D camera. */
function ZoomableAsset({ asset, impression }) {
  const a = brochureAssets[asset]
  const stage = useRef(null)
  const cam = useCamera(stage, { w: a.width, h: a.height })
  const { flyTo, zoomBy } = cam

  const fit = useCallback(
    (instant) => flyTo({ x: 0, y: 0, w: a.width, h: a.height }, NO_INSETS, { instant }),
    [flyTo, a.width, a.height],
  )

  // Fit on open, and re-fit whenever the stage resizes (rotation, browser chrome).
  useEffect(() => {
    const el = stage.current
    if (!el) return
    fit(true)
    const ro = new ResizeObserver(() => fit(true))
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  return (
    <div
      ref={stage}
      className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden rounded-lg select-none active:cursor-grabbing"
      {...cam.handlers}
    >
      <motion.div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ x: cam.x, y: cam.y, scale: cam.scale, width: a.width, height: a.height }}
      >
        <BrochureImage
          asset={asset}
          // Generous on phones so zooming in still resolves the drawing's dimension text.
          sizes="(min-width: 1024px) 92vw, 150vw"
          draggable={false}
          className="pointer-events-none size-full"
        />
      </motion.div>

      {impression && <ImpressionTag className="absolute bottom-3 left-3" />}

      {/* Keyboard / mouse equivalent of the pinch gesture. Pointer events stop here so
          pressing a button never reads as the start of a pan on the stage behind it. */}
      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <ZoomControl label="Zoom in" onClick={() => zoomBy(1.6)}>
          <PlusIcon />
        </ZoomControl>
        <ZoomControl label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <MinusIcon />
        </ZoomControl>
        <ZoomControl label="Fit to screen" onClick={() => fit(false)}>
          <ScanIcon />
        </ZoomControl>
      </div>
    </div>
  )
}

function ZoomControl({ label, onClick, children }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-11 rounded-xl border border-white/10 bg-navy-950/80 text-white shadow-float backdrop-blur-md hover:bg-navy-900"
    >
      {children}
    </Button>
  )
}
