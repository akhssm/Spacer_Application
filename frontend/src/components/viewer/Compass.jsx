import { useRef } from 'react'

const DRAG_THRESHOLD_DEG = 3

// Angle of a pointer around the centre of an element, in degrees clockwise from straight up
function pointerAngle(element, event) {
  const box = element.getBoundingClientRect()
  const dx = event.clientX - (box.left + box.width / 2)
  const dy = event.clientY - (box.top + box.height / 2)
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

// Shows which way is north and turns as the map turns. A click points the map north; dragging
// the dial round turns the map with it, a full 360°.
function Compass({ heading, onClick, onRotate }) {
  const drag = useRef(null)

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startAngle: pointerAngle(event.currentTarget, event), startHeading: heading, turned: false }
  }

  const onPointerMove = (event) => {
    if (!drag.current) return
    let delta = pointerAngle(event.currentTarget, event) - drag.current.startAngle
    delta = ((delta + 540) % 360) - 180 // the short way round
    if (!drag.current.turned && Math.abs(delta) < DRAG_THRESHOLD_DEG) return
    drag.current.turned = true
    // The dial follows the pointer, so the map turns the other way
    onRotate(drag.current.startHeading - delta)
    drag.current.startAngle += delta
    drag.current.startHeading -= delta
  }

  const onPointerUp = (event) => {
    const wasDrag = drag.current?.turned
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!wasDrag) onClick()
  }

  const label = 'Point map north (drag to turn)'

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), onClick())}
      aria-label={label}
      title={label}
      className="inline-flex size-16 cursor-grab touch-none items-center justify-center rounded-full bg-black/60 backdrop-blur select-none active:cursor-grabbing"
    >
      <svg viewBox="0 0 64 64" className="size-14" style={{ transform: `rotate(${-heading}deg)` }} aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,0.25)" />
        <polygon points="32,12 36,32 32,30 28,32" fill="#e0453a" />
        <polygon points="32,52 36,32 32,34 28,32" fill="#ffffff" fillOpacity="0.6" />
        <text x="32" y="10" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
          N
        </text>
        <text x="32" y="61" textAnchor="middle" fontSize="8" fill="#bbb">
          S
        </text>
        <text x="5" y="35" textAnchor="middle" fontSize="8" fill="#bbb">
          W
        </text>
        <text x="59" y="35" textAnchor="middle" fontSize="8" fill="#bbb">
          E
        </text>
      </svg>
    </button>
  )
}

export default Compass
