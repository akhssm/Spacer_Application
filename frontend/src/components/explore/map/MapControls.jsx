import { useEffect, useState } from 'react'
import { HouseIcon, LocateIcon, LoaderCircleIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

/**
 * Floating map controls, styled like the existing explorer's zoom buttons:
 * compass (tap to face north), zoom, 2D ⇄ perspective, home / reset and "locate me".
 */
export function MapControls({ api, onLocate, locating, canLocate, compact, className }) {
  const [camera, setCamera] = useState({ bearing: 0, pitch: 0 })
  useEffect(() => api?.onCamera(setCamera), [api])
  const tilted = camera.pitch > 5
  const rotated = Math.abs(camera.bearing) > 0.5

  return (
    <div data-map-obstacle="" className={cn('flex flex-col items-end gap-1.5', className)}>
      <ControlButton
        label={rotated ? 'Reset to north' : 'Compass — north is up'}
        onClick={() => api?.resetNorth()}
        disabled={!api}
      >
        <Compass bearing={camera.bearing} />
      </ControlButton>

      <div
        role="radiogroup"
        aria-label="Map perspective"
        className="flex flex-col gap-1 rounded-xl border border-white/10 bg-navy-950/80 p-1 shadow-float backdrop-blur-md"
      >
        {[
          { on: false, label: '2D', title: 'Top-down view' },
          { on: true, label: '3D', title: 'Perspective view' },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={tilted === o.on}
            aria-label={o.title}
            title={o.title}
            disabled={!api}
            onClick={() => api?.setTilted(o.on)}
            className={cn(
              'flex size-11 items-center justify-center rounded-lg font-numeric text-sm tracking-wider transition-colors disabled:opacity-40',
              tilted === o.on
                ? 'bg-white text-navy-950'
                : 'text-white/75 enabled:hover:bg-white/10 enabled:hover:text-white',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {!compact && (
        <>
          <ControlButton label="Zoom in" onClick={() => api?.zoomIn()} disabled={!api}>
            <PlusIcon />
          </ControlButton>
          <ControlButton label="Zoom out" onClick={() => api?.zoomOut()} disabled={!api}>
            <MinusIcon />
          </ControlButton>
        </>
      )}
      <ControlButton label="Back to the whole site" onClick={() => api?.home()} disabled={!api}>
        <HouseIcon />
      </ControlButton>
      {canLocate && !compact && (
        <ControlButton
          label={locating ? 'Finding your location…' : 'Show my location'}
          onClick={onLocate}
          disabled={!api || locating}
        >
          {locating ? <LoaderCircleIcon className="animate-spin" /> : <LocateIcon />}
        </ControlButton>
      )}
    </div>
  )
}

function ControlButton({ label, onClick, disabled, children }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="size-11 rounded-xl border border-white/10 bg-navy-950/80 text-white shadow-float backdrop-blur-md hover:bg-navy-900"
    >
      {children}
    </Button>
  )
}

/** Needle that counter-rotates with the map so it always points to true north. */
function Compass({ bearing }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)` }}>
      <path d="M12 2.5 15 12h-6z" fill="var(--sun-400)" />
      <path d="M12 21.5 9 12h6z" fill="currentColor" opacity="0.55" />
      <text
        x="12"
        y="9.6"
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="700"
        fill="var(--navy-950)"
        fontFamily="var(--font-sans)"
      >
        N
      </text>
    </svg>
  )
}
