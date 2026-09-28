import { Component, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ChevronUpIcon } from 'lucide-react'
import {
  AUTOROTATE_SPEED,
  KEY_SPEED,
  clampFov,
  clampPitch,
  decay,
  degreesPerPixel,
  direction,
  pinchFov,
  shownHorizontalFov,
  throwVelocity,
  verticalFov,
  wheelFov,
  wrapYaw,
} from '@/components/explore/tour/look'
/**
 * The 360° panorama: an inverted sphere textured with an equirectangular image, seen from its centre.
 * Built on the project's existing React Three Fiber / three.js stack — no panorama library.
 *
 *  - drag / swipe to look (the image stays under the pointer), with inertia and vertical limits
 *  - wheel and pinch zoom the field of view (the camera never moves)
 *  - arrow keys look, +/− zoom, 0 resets (when the viewer has focus)
 *  - each room fades in over the previous one; the small preview shows first, the 4K swaps in
 *  - linked and neighbouring rooms are preloaded into the browser cache (not the GPU)
 *  - in-scene arrows at each link's direction
 */

const FADE_MS = 550
const RADIUS = 100
const ARROW_RADIUS = 40

class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e) {
    this.props.onError(e.message || 'The 360° viewer failed to start.')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function PanoramaCanvas(props) {
  const { stop, look, apiRef, onFirstInteraction } = props
  const wrapper = useRef(null)
  const ctl = useRef({
    yaw: stop.scene.initialView.yaw,
    pitch: stop.scene.initialView.pitch,
    fov: stop.scene.initialView.fov,
    vYaw: 0,
    vPitch: 0,
    keys: new Set(),
    pointers: new Map(),
    lastMove: 0,
    touched: 0,
    interacted: false,
  })

  const touch = () => {
    const c = ctl.current
    c.touched = performance.now()
    if (!c.interacted) {
      c.interacted = true
      onFirstInteraction()
    }
  }

  useImperativeHandle(apiRef, () => ({
    zoom: (factor) => {
      ctl.current.fov = clampFov(ctl.current.fov * factor)
      touch()
    },
    reset: () => {
      const v = stop.scene.initialView
      Object.assign(ctl.current, { yaw: v.yaw, pitch: v.pitch, fov: v.fov, vYaw: 0, vPitch: 0 })
      touch()
    },
  }))

  // Wheel must be non-passive to stop the page from scrolling / zooming.
  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      ctl.current.fov = wheelFov(ctl.current.fov, e.deltaY * (e.deltaMode === 1 ? 33 : 1))
      touch()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const onPointerDown = (e) => {
    // Arrows and other controls inside the viewer keep their own clicks.
    if (e.target.closest('button, a, [data-no-drag]')) return
    const c = ctl.current
    wrapper.current?.setPointerCapture(e.pointerId)
    c.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    c.vYaw = c.vPitch = 0
    c.lastMove = performance.now()
    if (c.pointers.size === 2) {
      const [a, b] = [...c.pointers.values()]
      c.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), fov: c.fov }
    }
    touch()
  }

  const onPointerMove = (e) => {
    const c = ctl.current
    const prev = c.pointers.get(e.pointerId)
    if (!prev) return
    c.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (c.pointers.size >= 2 && c.pinch) {
      const [a, b] = [...c.pointers.values()]
      c.fov = pinchFov(c.pinch.fov, c.pinch.distance, Math.hypot(a.x - b.x, a.y - b.y))
    } else if (c.pointers.size === 1) {
      const el = wrapper.current
      const k = degreesPerPixel(verticalFov(c.fov, el.clientWidth / Math.max(1, el.clientHeight)), el.clientHeight)
      const dYaw = -(e.clientX - prev.x) * k
      const dPitch = (e.clientY - prev.y) * k
      c.yaw = wrapYaw(c.yaw + dYaw)
      c.pitch += dPitch
      const now = performance.now()
      // Smoothed velocity for the throw on release.
      c.vYaw = c.vYaw * 0.6 + throwVelocity(dYaw, now - c.lastMove) * 0.4
      c.vPitch = c.vPitch * 0.6 + throwVelocity(dPitch, now - c.lastMove) * 0.4
      c.lastMove = now
    }
    touch()
  }

  const onPointerUp = (e) => {
    const c = ctl.current
    c.pointers.delete(e.pointerId)
    if (c.pointers.size < 2) c.pinch = undefined
    // A pause before release means no throw.
    if (performance.now() - c.lastMove > 80) c.vYaw = c.vPitch = 0
  }

  const onKeyDown = (e) => {
    const c = ctl.current
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      c.keys.add(e.key)
      touch()
    } else if (e.key === '+' || e.key === '=') {
      c.fov = clampFov(c.fov / 1.15)
      touch()
    } else if (e.key === '-' || e.key === '_') {
      c.fov = clampFov(c.fov * 1.15)
      touch()
    } else if (e.key === '0') {
      const v = stop.scene.initialView
      Object.assign(c, { yaw: v.yaw, pitch: v.pitch, fov: v.fov })
      touch()
    }
  }
  const onKeyUp = (e) => ctl.current.keys.delete(e.key)

  return (
    <div
      ref={wrapper}
      tabIndex={0}
      role="application"
      aria-roledescription="360° panorama"
      aria-label={props.label}
      aria-describedby="tour-look-help"
      className="absolute inset-0 cursor-grab touch-none outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:ring-inset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => ctl.current.keys.clear()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p id="tour-look-help" className="sr-only">
        Drag to look around. Arrow keys look around, plus and minus zoom, 0 resets the view.
      </p>
      <CanvasBoundary onError={props.onError}>
        <Canvas
          className="absolute! inset-0"
          flat
          dpr={[1, 2]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: 75, near: 0.1, far: RADIUS * 3, position: [0, 0, 0] }}
        >
          <Rig ctlRef={ctl} look={look} autorotate={props.autorotate} />
          <Layers
            stop={stop}
            stops={props.stops}
            reducedMotion={props.reducedMotion}
            ctlRef={ctl}
            onStatus={props.onStatus}
          />
          <Arrows stop={stop} stops={props.stops} onNavigate={props.onNavigate} />
        </Canvas>
      </CanvasBoundary>
    </div>
  )
}

/** Applies the controller to the camera each frame: inertia, keys, autorotate, limits. */
function Rig({ ctlRef, look, autorotate }) {
  useFrame((state, delta) => {
    const camera = state.camera
    const size = state.size
    const c = ctlRef.current
    const dt = Math.min(delta, 0.1)
    const aspect = size.width / Math.max(1, size.height)
    if (c.pointers.size === 0) {
      c.yaw += c.vYaw * dt
      c.pitch += c.vPitch * dt
      c.vYaw = decay(c.vYaw, dt)
      c.vPitch = decay(c.vPitch, dt)
    }
    const k = KEY_SPEED * dt * (c.fov / 80)
    if (c.keys.has('ArrowLeft')) c.yaw -= k
    if (c.keys.has('ArrowRight')) c.yaw += k
    if (c.keys.has('ArrowUp')) c.pitch += k
    if (c.keys.has('ArrowDown')) c.pitch -= k
    if (autorotate && c.pointers.size === 0 && !c.keys.size && performance.now() - c.touched > 2500)
      c.yaw += AUTOROTATE_SPEED * dt

    c.fov = clampFov(c.fov)
    const vfov = verticalFov(c.fov, aspect)
    c.yaw = wrapYaw(c.yaw)
    c.pitch = clampPitch(c.pitch, vfov)

    if (Math.abs(camera.fov - vfov) > 1e-3) {
      camera.fov = vfov
      camera.updateProjectionMatrix()
    }
    camera.rotation.set(THREE.MathUtils.degToRad(c.pitch), THREE.MathUtils.degToRad(-c.yaw), 0, 'YXZ')

    const prev = look.get()
    const shown = shownHorizontalFov(c.fov, aspect)
    if (
      Math.abs(prev.yaw - c.yaw) > 0.2 ||
      Math.abs(prev.pitch - c.pitch) > 0.2 ||
      Math.abs(prev.shownFov - shown) > 0.2
    )
      look.set({ yaw: c.yaw, pitch: c.pitch, fov: c.fov, shownFov: shown })
  })
  return null
}

const loader = new THREE.TextureLoader()
/** Keeps preloaded images alive until the browser has them cached. */
const warm = new Map()
function preload(url) {
  if (warm.has(url)) return
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  warm.set(url, img)
}

/** One sphere per room; the newest fades in over the others, which are then disposed. */
function Layers({ stop, stops, reducedMotion, ctlRef, onStatus }) {
  const group = useRef(null)
  const layers = useRef([])
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(RADIUS, 96, 64)
    g.scale(-1, 1, 1) // seen from inside, not mirrored
    return g
  }, [])

  const prepare = (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    return t
  }

  useEffect(() => {
    let cancelled = false
    const { scene, media } = stop
    onStatus('loading')

    const addLayer = (texture) => {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
      const mesh = new THREE.Mesh(geometry, material)
      // yaw 0 (the image centre) faces the camera's -Z; u grows to the right.
      mesh.rotation.y = -Math.PI / 2
      mesh.renderOrder = layers.current.length + 1
      group.current.add(mesh)
      const layer = { key: scene.key, mesh, born: performance.now() }
      layers.current.push(layer)
      // Every room opens on its own starting view, as in the reference tour.
      const v = scene.initialView
      Object.assign(ctlRef.current, { yaw: v.yaw, pitch: v.pitch, fov: v.fov, vYaw: 0, vPitch: 0 })
      return layer
    }

    let layer
    loader
      .loadAsync(media.preview)
      .then((preview) => {
        if (cancelled) return preview.dispose()
        layer = addLayer(prepare(preview))
        onStatus('ready')
        invalidate()
      })
      .catch(() => undefined)
      .then(() => loader.loadAsync(media.full))
      .then((full) => {
        if (cancelled) return full.dispose()
        if (!layer) {
          layer = addLayer(prepare(full))
          onStatus('ready')
        } else {
          const old = layer.mesh.material.map
          layer.mesh.material.map = prepare(full)
          layer.mesh.material.needsUpdate = true
          old?.dispose()
        }
        // Warm the rooms one step away: linked rooms, then strip neighbours.
        const i = stops.findIndex((s) => s.scene.key === scene.key)
        const next = new Set([
          ...scene.links.map((l) => l.to),
          stops[(i + 1) % stops.length].scene.key,
          stops[(i - 1 + stops.length) % stops.length].scene.key,
        ])
        for (const s of stops) if (next.has(s.scene.key) && s.scene.key !== scene.key) preload(s.media.full)
      })
      .catch(() => {
        if (!cancelled && !layer) onStatus('error')
      })

    return () => {
      cancelled = true
    }
    // Keyed on the room's media, not object identity: resolving the URL rebuilds the stop objects.
  }, [stop.media.full]) // eslint-disable-line react-hooks/exhaustive-deps

  // Previews of every room are tiny — fetch them up front so switching rooms starts instantly.
  const previews = stops.map((s) => s.media.preview).join('|')
  useEffect(() => {
    previews.split('|').forEach(preload)
  }, [previews])

  useFrame(() => {
    const all = layers.current
    if (!all.length) return
    const now = performance.now()
    const top = all[all.length - 1]
    const k = reducedMotion ? 1 : Math.min(1, (now - top.born) / FADE_MS)
    top.mesh.material.opacity = k * k * (3 - 2 * k)
    if (k >= 1 && all.length > 1) {
      for (const l of all.slice(0, -1)) {
        group.current?.remove(l.mesh)
        l.mesh.material.map?.dispose()
        l.mesh.material.dispose()
      }
      layers.current = [top]
      top.mesh.renderOrder = 1
    }
  })

  useEffect(
    () => () => {
      for (const l of layers.current) {
        l.mesh.material.map?.dispose()
        l.mesh.material.dispose()
      }
      layers.current = []
      geometry.dispose()
    },
    [geometry],
  )

  return <group ref={group} />
}

/** In-scene arrows to connected rooms (only connections seen in the reference clips). */
function Arrows({ stop, stops, onNavigate }) {
  return (
    <>
      {stop.scene.links.map((link) => {
        const target = stops.find((s) => s.scene.key === link.to)
        if (!target) return null
        const [x, y, z] = direction(link.yaw, link.pitch)
        return (
          <Html
            key={`${stop.scene.key}-${link.to}`}
            position={[x * ARROW_RADIUS, y * ARROW_RADIUS, z * ARROW_RADIUS]}
            center
            zIndexRange={[15, 0]}
          >
            <button
              type="button"
              onClick={() => onNavigate(link.to)}
              aria-label={`Go to ${target.scene.title}`}
              className="group flex flex-col items-center gap-1.5 outline-none"
            >
              <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg backdrop-blur-sm transition-colors group-hover:bg-black/75 group-focus-visible:ring-2 group-focus-visible:ring-sun-400">
                {target.scene.title}
              </span>
              <span className="grid size-11 place-items-center rounded-full border-2 border-white/90 bg-white/15 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110 group-active:scale-95">
                <ChevronUpIcon className="size-6" aria-hidden="true" />
              </span>
            </button>
          </Html>
        )
      })}
    </>
  )
}
