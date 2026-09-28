import { useCallback, useEffect, useRef } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { transition } from '@/utils/motion'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Most of one axis that the two insets on it may claim between them. */
const MAX_INSET_SHARE = 0.62

/** Scale a pair of insets down proportionally if together they would eat too much of `total`. */
function shareAxis(a, b, total) {
  const room = total * MAX_INSET_SHARE
  const sum = a + b
  return sum <= room || sum <= 0 ? [a, b] : [(a * room) / sum, (b * room) / sum]
}

/**
 * 2D camera for a large image: translate + uniform scale, driven by motion values so
 * gestures never re-render React. Supports drag-pan, wheel/trackpad zoom around the cursor,
 * two-finger pinch, keyboard zoom, and animated "fly to" a content rectangle.
 */
export function useCamera(viewportRef, content) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(0.2)
  const reduce = useReducedMotion()
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const dragDistance = useRef(0)
  const limits = useRef({ min: 0.05, max: 4 })

  const viewport = useCallback(
    () => viewportRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1),
    [viewportRef],
  )

  /** Keep at least a quarter of the content inside the viewport. */
  const constrain = useCallback(
    (nx, ny, s) => {
      const v = viewport()
      const cw = content.w * s
      const ch = content.h * s
      return {
        x: clamp(nx, -cw * 0.75, v.width - cw * 0.25),
        y: clamp(ny, -ch * 0.75, v.height - ch * 0.25),
      }
    },
    [content.w, content.h, viewport],
  )

  const zoomAt = useCallback(
    (factor, cx, cy) => {
      const s0 = scale.get()
      const s1 = clamp(s0 * factor, limits.current.min, limits.current.max)
      const k = s1 / s0
      const p = constrain(cx - (cx - x.get()) * k, cy - (cy - y.get()) * k, s1)
      scale.set(s1)
      x.set(p.x)
      y.set(p.y)
    },
    [constrain, scale, x, y],
  )

  /** Animate so `box` (content px) fits inside the viewport minus `insets`. */
  const flyTo = useCallback(
    (box, insets, opts = {}) => {
      const v = viewport()
      // Insets are chrome-sized in px, so on a short viewport (landscape phone) they could
      // otherwise claim most of the screen and fit the plan into a sliver. Never let the pair
      // take more than MAX_INSET_SHARE of an axis; beyond that they shrink proportionally.
      const [insetLeft, insetRight] = shareAxis(insets.left, insets.right, v.width)
      const [insetTop, insetBottom] = shareAxis(insets.top, insets.bottom, v.height)
      const aw = Math.max(80, v.width - insetLeft - insetRight)
      const ah = Math.max(80, v.height - insetTop - insetBottom)
      const fitAll = Math.min(aw / content.w, ah / content.h)
      limits.current = { min: fitAll * 0.6, max: Math.max(fitAll * 10, 1.5) }
      const s = Math.min(aw / box.w, ah / box.h, opts.maxScale ?? Infinity) * 0.92
      const tx = insetLeft + (aw - box.w * s) / 2 - box.x * s
      const ty = insetTop + (ah - box.h * s) / 2 - box.y * s
      if (opts.instant || reduce) {
        scale.set(s)
        x.set(tx)
        y.set(ty)
        return
      }
      animate(scale, s, transition.camera)
      animate(x, tx, transition.camera)
      animate(y, ty, transition.camera)
    },
    [content.w, content.h, reduce, scale, x, y, viewport],
  )

  // Wheel / trackpad zoom must be a non-passive native listener to prevent page zoom.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const intensity = e.ctrlKey ? 0.012 : 0.0018 // ctrlKey = trackpad pinch
      zoomAt(Math.exp(-e.deltaY * intensity), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [viewportRef, zoomAt])

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Capture only once a drag starts (see onPointerMove) so taps still reach the SVG hotspots.
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) dragDistance.current = 0
    gesture.current = null
  }

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, next)
    const r = viewport()

    if (pointers.current.size === 1) {
      const dx = next.x - prev.x
      const dy = next.y - prev.y
      dragDistance.current += Math.hypot(dx, dy)
      const el = e.currentTarget
      if (dragDistance.current > 6 && !el.hasPointerCapture?.(e.pointerId)) el.setPointerCapture?.(e.pointerId)
      const p = constrain(x.get() + dx, y.get() + dy, scale.get())
      x.set(p.x)
      y.set(p.y)
      return
    }

    const [a, b] = [...pointers.current.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const midX = (a.x + b.x) / 2 - r.left
    const midY = (a.y + b.y) / 2 - r.top
    dragDistance.current += 10
    if (gesture.current) {
      zoomAt(dist / gesture.current.dist, midX, midY)
      const p = constrain(x.get() + midX - gesture.current.midX, y.get() + midY - gesture.current.midY, scale.get())
      x.set(p.x)
      y.set(p.y)
    }
    gesture.current = { dist, midX, midY }
  }

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    gesture.current = null
  }

  const zoomBy = (factor) => {
    const r = viewport()
    const s0 = scale.get()
    const s1 = clamp(s0 * factor, limits.current.min, limits.current.max)
    const k = s1 / s0
    const cx = r.width / 2
    const cy = r.height / 2
    const p = constrain(cx - (cx - x.get()) * k, cy - (cy - y.get()) * k, s1)
    if (reduce) {
      scale.set(s1)
      x.set(p.x)
      y.set(p.y)
      return
    }
    animate(scale, s1, transition.base)
    animate(x, p.x, transition.base)
    animate(y, p.y, transition.base)
  }

  return {
    x,
    y,
    scale,
    flyTo,
    zoomBy,
    /** True if the pointer moved enough since pointer-down to count as a drag, not a click. */
    wasDrag: () => dragDistance.current > 6,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
