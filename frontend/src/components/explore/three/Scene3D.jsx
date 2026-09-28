import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { brochureAssets } from '@/data'
import { webglUnavailableReason } from '@/components/explore/three/webgl'
import { GROUND, SCHEMATIC_STOREY, buildScene, floorCentreY } from '@/components/explore/three/sceneModel'
import { floorGrowth } from '@/components/explore/three/story'
import { StoryLines, StoryPlans } from '@/components/explore/three/StoryLayers'

const pad2 = (n) => String(n).padStart(2, '0')

const COLORS = {
  unit: new THREE.Color('#e5d8a7'),
  unitShade: new THREE.Color('#b9ad82'),
  muted: new THREE.Color('#4b5f6c'),
  filtered: new THREE.Color('#28404f'),
  floor: new THREE.Color('#fdb912'),
  flat: new THREE.Color('#ff8a1c'),
  hover: new THREE.Color('#ffffff'),
}

class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e) {
    this.props.onError(e.message || 'The 3D view failed to start.')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Scene3D(props) {
  const { onUnsupported } = props
  const [reason] = useState(webglUnavailableReason)
  useEffect(() => {
    if (reason) onUnsupported(reason)
  }, [reason, onUnsupported])
  if (reason) return null

  return (
    <CanvasBoundary onError={onUnsupported}>
      <Canvas
        className="absolute! inset-0"
        // The story animates continuously; the explorer only renders on demand.
        frameloop={props.story ? 'always' : 'demand'}
        dpr={props.mobile ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: !props.mobile, powerPreference: 'high-performance' }}
        camera={{ fov: 35, near: 0.1, far: 500, position: [18, 26, 38] }}
        onPointerMissed={(e) => {
          // Clicks on HTML labels (Block / Clubhouse buttons) bubble here as "missed" — ignore them.
          if (e.target?.closest?.('button, a')) return
          if (e.type === 'click') props.onBackgroundClick()
        }}
        aria-label="Schematic 3D view of IRA Towers"
      >
        <color attach="background" args={['#021f2d']} />
        <hemisphereLight args={['#f6f2e4', '#0b2a3a', 1.1]} />
        <directionalLight position={[12, 30, 18]} intensity={1.6} />
        <directionalLight position={[-16, 12, -10]} intensity={0.35} />
        <World {...props} />
      </Canvas>
    </CanvasBoundary>
  )
}

function World(props) {
  const scene = useMemo(() => buildScene(), [])
  const { block, level, selectedFlat, clubhouseSelected, story } = props
  const [hover, setHover] = useState(null)

  return (
    <>
      <Suspense
        fallback={
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[GROUND.width, GROUND.depth]} />
            <meshBasicMaterial color="#0b3246" />
          </mesh>
        }
      >
        <Ground />
      </Suspense>
      <ViewOffset insets={props.insets} />
      {import.meta.env.DEV && <DevProbe scene={scene} />}
      <Rig {...props} scene={scene} />
      {story && (
        <>
          <StoryLines scene={scene} story={story} />
          <Suspense fallback={null}>
            <StoryPlans scene={scene} story={story} />
          </Suspense>
        </>
      )}

      {scene.blocks.map((b) => (
        <group key={b.id}>
          <Stilt
            boxes={b.stilt}
            dimmed={!!block && block !== b.id && !story}
            story={story}
            floors={b.residentialFloors}
          />
          {!story && block === b.id && level !== undefined && level < b.residentialFloors && (
            <Ghost boxes={b.units.filter((u) => u.level > level)} />
          )}
          <Units
            blockId={b.id}
            units={b.units}
            floors={b.residentialFloors}
            story={story}
            state={{ block, level, selectedFlat, highlight: props.highlight }}
            hoverIndex={hover?.blockId === b.id ? hover.index : undefined}
            onHover={(i) => setHover(i === undefined ? null : { blockId: b.id, index: i })}
            onPick={(u) => {
              if (block !== b.id) return props.onSelectBlock(b.id)
              if (level !== u.level) return props.onSelectFloor(b.id, u.level)
              props.onSelectFlat(b.id, u.level, u.flatNo)
            }}
          />
          {!story && (
            <Html position={b.labelAt} center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={() => props.onSelectBlock(b.id)}
                className={
                  'touch-target rounded-full border px-3 py-1 font-display text-sm whitespace-nowrap shadow-float backdrop-blur-md transition-colors ' +
                  (block === b.id
                    ? 'border-sun-400 bg-sun-400 text-navy-950'
                    : 'border-white/20 bg-navy-950/80 text-white hover:bg-navy-900')
                }
              >
                Block {b.id}
              </button>
            </Html>
          )}
          {!story && block === b.id && level !== undefined && (
            <Html position={[b.bounds.x + b.bounds.w / 2 + 0.4, floorCentreY(level), b.bounds.z]} zIndexRange={[20, 0]}>
              <span className="rounded-md bg-sun-400 px-2 py-0.5 font-numeric text-xs whitespace-nowrap text-navy-950 shadow-float">
                Floor {pad2(level)}
              </span>
            </Html>
          )}
        </group>
      ))}

      <Clubhouse
        box={scene.clubhouse}
        selected={!!clubhouseSelected && !story}
        onPick={props.onSelectClubhouse}
        labelled={!story}
      />
    </>
  )
}

/** The brochure master plan (p6) as the ground — site geometry comes straight from the drawing. */
function Ground() {
  const src = brochureAssets['master-plan'].variants.at(-1).src
  // Configure on load (the texture is shared through drei's cache).
  const tex = useTexture(src, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
      <planeGeometry args={[GROUND.width, GROUND.depth]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

/** Shift the projection centre into the part of the screen not covered by panels. */
function ViewOffset({ insets }) {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const cam = camera
    const dx = (insets.left - insets.right) / 2
    const dy = (insets.top - insets.bottom) / 2
    cam.setViewOffset(size.width, size.height, -dx, -dy, size.width, size.height)
    cam.updateProjectionMatrix()
    invalidate()
    return () => {
      cam.clearViewOffset()
    }
  }, [camera, size.width, size.height, insets.left, insets.right, insets.top, insets.bottom, invalidate])
  return null
}

const tmp = new THREE.Object3D()

function Units({ blockId, units, floors, story, state, hoverIndex, onHover, onPick }) {
  const ref = useRef(null)
  const invalidate = useThree((s) => s.invalidate)

  // Cutaway: with a floor selected in this block, floors above it are removed from the solid mesh
  // (drawn as a ghost instead) so the selected floor's flats are visible and clickable.
  const cutAbove = state.block === blockId ? state.level : undefined
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || story) return
    units.forEach((u, i) => {
      const hidden = cutAbove !== undefined && u.level > cutAbove
      tmp.position.set(u.x, u.y, u.z)
      tmp.scale.set(hidden ? 0 : u.w, hidden ? 0 : u.h, hidden ? 0 : u.d)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
    invalidate()
  }, [units, cutAbove, invalidate, story])

  // Story: every block whole (no cutaway), floors rising from the ground as the timeline plays.
  const lastT = useRef(undefined)
  useFrame(() => {
    const mesh = ref.current
    if (!mesh || !story) return
    const { t } = story.get()
    if (t === lastT.current) return
    lastT.current = t
    units.forEach((u, i) => {
      const g = floorGrowth(t, u.level, floors)
      const bottom = u.y - u.h / 2
      tmp.position.set(u.x, bottom + (u.h * g) / 2, u.z)
      tmp.scale.set(g ? u.w : 0, u.h * g, g ? u.d : 0)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })
  useLayoutEffect(() => {
    if (!story) lastT.current = undefined
  }, [story])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const { block, level, selectedFlat, highlight } = state
    const active = block === blockId
    const hovered = hoverIndex !== undefined ? units[hoverIndex] : undefined
    units.forEach((u, i) => {
      let c
      // Story: one neutral "model" palette — no selection, filter or hover colours.
      if (story) c = u.level % 2 ? COLORS.unit : COLORS.unitShade
      else if (block && !active) c = COLORS.muted
      else if (highlight !== 'all' && u.bhk !== highlight) c = COLORS.filtered
      else if (active && level === u.level && selectedFlat === u.flatNo) c = COLORS.flat
      else if (active && level === u.level) c = COLORS.floor
      else c = u.level % 2 ? COLORS.unit : COLORS.unitShade
      // Hover: whole floor when choosing a floor, single flat when on a floor, whole block otherwise.
      const isSelected = active && level === u.level && selectedFlat === u.flatNo
      if (hovered && !isSelected && !story) {
        const sameFloor = hovered.level === u.level
        if (!block || !active ? true : level === undefined ? sameFloor : sameFloor && hovered.flatNo === u.flatNo)
          c = c.clone().lerp(COLORS.hover, block && active ? 0.55 : 0.28)
      }
      mesh.setColorAt(i, c)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    invalidate()
  }, [state, hoverIndex, units, blockId, invalidate, story])

  const pick = (e) => (e.instanceId === undefined ? undefined : units[e.instanceId])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, units.length]}
      onPointerMove={(e) => {
        if (story) return
        e.stopPropagation()
        if (e.instanceId !== hoverIndex) onHover(e.instanceId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onHover(undefined)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        if (story) return // the story is a presentation; picking returns when it closes
        e.stopPropagation()
        if (e.delta > 6) return // was a drag / orbit, not a click
        const u = pick(e)
        if (u) onPick(u)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} metalness={0} />
    </instancedMesh>
  )
}

/** Translucent, non-interactive context for floors above a cutaway. */
function Ghost({ boxes }) {
  const ref = useRef(null)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    boxes.forEach((b, i) => {
      tmp.position.set(b.x, b.y, b.z)
      tmp.scale.set(b.w, b.h, b.d)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [boxes, invalidate])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} raycast={() => null} renderOrder={2}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#e5d8a7" transparent opacity={0.1} depthWrite={false} />
    </instancedMesh>
  )
}

function Stilt({ boxes, dimmed, story, floors }) {
  const ref = useRef(null)
  // Story: the stilt is part of the massing, so it only appears once the blocks start to rise.
  useFrame(() => {
    if (ref.current) ref.current.visible = !story || floorGrowth(story.get().t, 0, floors) > 0
  })
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    boxes.forEach((b, i) => {
      tmp.position.set(b.x, b.y, b.z)
      tmp.scale.set(b.w, b.h, b.d)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [boxes])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={dimmed ? 0.06 : 0.14} depthWrite={false} />
    </instancedMesh>
  )
}

function Clubhouse({ box, selected, onPick, labelled }) {
  const [hover, setHover] = useState(false)
  return (
    <group>
      <mesh
        position={[box.x, box.y, box.z]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          if (!labelled) return
          e.stopPropagation()
          if (e.delta <= 6) onPick()
        }}
      >
        <boxGeometry args={[box.w, box.h, box.d]} />
        <meshBasicMaterial
          color="#fdb912"
          transparent
          opacity={selected ? 0.55 : hover ? 0.35 : 0.12}
          depthWrite={false}
        />
      </mesh>
      {labelled && (
        <Html
          position={[box.x, SCHEMATIC_STOREY * 1.2, box.z]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            onClick={onPick}
            className={
              'touch-target rounded-full border px-3 py-1 text-xs whitespace-nowrap shadow-float backdrop-blur-md ' +
              (selected
                ? 'border-sun-400 bg-sun-400 text-navy-950'
                : 'border-white/20 bg-navy-950/80 text-white hover:bg-navy-900')
            }
          >
            Clubhouse
          </button>
        </Html>
      )}
    </group>
  )
}

/** Camera framing for the current selection, with orbit / zoom limits. */
function Rig(props) {
  const { scene, block, level, selectedFlat, clubhouseSelected, reducedMotion, onCamera, mobile, story } = props
  const controls = useRef(null)
  const first = useRef(true)
  const size = useThree((s) => s.size)
  // The 35° field of view is vertical, so a portrait viewport sees a proportionally narrower
  // slice horizontally. Without this the wide site is framed to the height and runs off the
  // sides of a phone. 1 on any landscape viewport, so desktop framing is unchanged.
  const aspect = size.width / Math.max(1, size.height)
  const portraitFit = Math.min(1, aspect)

  const frame = (animate) => {
    const c = controls.current
    if (!c) return
    let target
    let radius
    const b = block && !story ? scene.blocks.find((x) => x.id === block) : undefined
    if (story) {
      // The whole site, a little closer than the overview — the model is the subject.
      target = new THREE.Vector3(0, 1.4, 0)
      radius = Math.max(GROUND.width, GROUND.depth) * 0.58
    } else if (clubhouseSelected) {
      target = new THREE.Vector3(scene.clubhouse.x, 0, scene.clubhouse.z)
      radius = Math.max(scene.clubhouse.w, scene.clubhouse.d) * 2.4
    } else if (b && level !== undefined && selectedFlat !== undefined) {
      const u = b.units.find((x) => x.level === level && x.flatNo === selectedFlat)
      target = new THREE.Vector3(u.x, u.y, u.z)
      radius = Math.max(u.w, u.d) * 3.2
    } else if (b && level !== undefined) {
      target = new THREE.Vector3(b.bounds.x, floorCentreY(level), b.bounds.z)
      radius = Math.max(b.bounds.w, b.bounds.d) * 0.9
    } else if (b) {
      target = new THREE.Vector3(b.bounds.x, b.bounds.h * 0.45, b.bounds.z)
      radius = Math.max(b.bounds.w, b.bounds.d, b.bounds.h) * 1.05
    } else {
      target = new THREE.Vector3(0, 1.2, 0)
      radius = Math.max(GROUND.width, GROUND.depth) * 0.72
    }
    const dist = radius / Math.tan((35 * Math.PI) / 360) / (mobile ? 1.2 : 1.7) / portraitFit
    // View from the south-east, elevated — the plan's entrance side.
    const dir = new THREE.Vector3(0.55, 0.78, 0.9).normalize()
    const pos = target.clone().addScaledVector(dir, dist)
    c.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, animate && !reducedMotion)
  }

  // Re-frame when the selection changes, and when the aspect ratio does (device rotation) —
  // the distance that fits the scene depends on it. Rounded so ordinary resizes don't re-frame.
  const key = `${block}/${level}/${selectedFlat}/${clubhouseSelected}/${portraitFit.toFixed(2)}/${!!story}`

  // Story autoplay: a slow orbit around the site while it plays (not with reduced motion).
  useFrame((_, delta) => {
    if (!story || reducedMotion || !story.get().playing) return
    controls.current?.rotate(Math.min(delta, 0.1) * 0.06, 0, false)
  })
  useEffect(() => {
    frame(!first.current)
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    onCamera?.({
      zoomIn: () => controls.current?.dolly(controls.current.distance * 0.3, !reducedMotion),
      zoomOut: () => controls.current?.dolly(-controls.current.distance * 0.4, !reducedMotion),
      recenter: () => frame(true),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCamera, key, reducedMotion])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2}
      maxDistance={140}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.08}
      smoothTime={reducedMotion ? 0 : 0.45}
      draggingSmoothTime={reducedMotion ? 0 : 0.12}
    />
  )
}

/**
 * Development-only test hook (tree-shaken from production builds): projects an apartment's box
 * to viewport pixels and exposes renderer stats, so automated QA can click real 3D targets.
 */
function DevProbe({ scene }) {
  const { camera, gl, size } = useThree()
  useEffect(() => {
    const w = window
    w.__ira3d = {
      project(apartmentIdOrClubhouse) {
        const box =
          apartmentIdOrClubhouse === 'clubhouse'
            ? scene.clubhouse
            : scene.blocks.flatMap((b) => b.units).find((u) => u.apartmentId === apartmentIdOrClubhouse)
        if (!box) return null
        const face = window.__ira3dFace ?? 'top'
        const p =
          face === 'side'
            ? new THREE.Vector3(box.x + box.w * 0.2, box.y, box.z + box.d / 2 - 0.001)
            : new THREE.Vector3(box.x, box.y + box.h / 2, box.z)
        const v = p.project(camera)
        const r = gl.domElement.getBoundingClientRect()
        return { x: r.left + ((v.x + 1) / 2) * size.width, y: r.top + ((1 - v.y) / 2) * size.height, visible: v.z < 1 }
      },
      info: () => ({ ...gl.info.render, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }),
      camera: () => camera.position.toArray(),
    }
    return () => {
      delete w.__ira3d
    }
  }, [camera, gl, size, scene])
  return null
}
