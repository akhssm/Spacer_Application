import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { blocks, brochureAssets } from '@/data'
import { floorPlanGeometry, getFloorPlanFlat } from '@/data/floorPlan'
import { containFit, lineOpacity, planOpacity } from '@/components/explore/three/story'

/**
 * Story-only layers for the schematic 3D view (see story.js). Mounted only while the
 * "From plan to tower" timeline is open, so the normal explorer is untouched.
 */

// The 12 edges of a unit box, as corner-index pairs (corners: x-/x+ × y-/y+ × z-/z+).
const EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7], // along x
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7], // along y
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // along z
]

function boxEdges(b, out) {
  const c = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [
    b.x + (i & 1 ? 0.5 : -0.5) * b.w,
    b.y + (i & 2 ? 0.5 : -0.5) * b.h,
    b.z + (i & 4 ? 0.5 : -0.5) * b.d,
  ])
  for (const [a, z] of EDGES) out.push(...c[a], ...c[z])
}

/** Stage 01: every flat on every floor as a line drawing (sketched in from the ground up on open). */
export function StoryLines({ scene, story }) {
  const { geometry, vertices } = useMemo(() => {
    // Stilt first, then floor by floor across all blocks, so the drawing "builds" upward.
    const boxes = scene.blocks.flatMap((b) => [
      ...b.stilt.map((box) => ({ level: 0, box })),
      ...b.units.map((u) => ({ level: u.level, box: u })),
    ])
    boxes.sort((a, b) => a.level - b.level)
    const pts = []
    boxes.forEach(({ box }) => boxEdges(box, pts))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return { geometry: g, vertices: pts.length / 3 }
  }, [scene])

  useEffect(() => () => geometry.dispose(), [geometry])
  const lines = useRef(null)
  useFrame(() => {
    const l = lines.current
    if (!l) return
    const { t, sketch } = story.get()
    const opacity = lineOpacity(t)
    l.material.opacity = opacity
    l.visible = opacity > 0.001
    l.geometry.setDrawRange(0, Math.floor((sketch * vertices) / 2) * 2)
  })
  return (
    <lineSegments ref={lines} geometry={geometry} renderOrder={3} raycast={() => null}>
      <lineBasicMaterial color="#f4e9c8" transparent depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}

/**
 * Stage 03: on the roof of every stack, that flat's own crop of the brochure's typical floor plan
 * (p10–12) — fitted inside the schematic tile, never stretched.
 */
export function StoryPlans({ scene, story }) {
  // The 1200 px variants: plenty at this scale, and light on phone GPUs.
  const urls = blocks.map((b) => brochureAssets[b.floorPlanAssetId].variants[0].src)
  const textures = useTexture(urls, (loaded) => {
    for (const t of Array.isArray(loaded) ? loaded : [loaded]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
    }
  })

  const planes = useMemo(() => {
    return scene.blocks.flatMap((b, bi) => {
      const g = floorPlanGeometry[b.id]
      const top = b.units.filter((u) => u.level === b.residentialFloors)
      return top.flatMap((u) => {
        const flat = getFloorPlanFlat(b.id, u.flatNo)
        if (!flat) return []
        const [x, y, w, h] = flat.rect
        const [pw, pd] = containFit(u.w, u.d, w / h)
        const geometry = new THREE.PlaneGeometry(pw, pd)
        // Crop the flat out of the block's plan image (v runs bottom-up).
        const uv = geometry.attributes.uv
        const u0 = x / g.width
        const u1 = (x + w) / g.width
        const v0 = 1 - (y + h) / g.height
        const v1 = 1 - y / g.height
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0)
        uv.needsUpdate = true
        const material = new THREE.MeshBasicMaterial({
          map: textures[bi],
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        })
        return [{ key: `${b.id}-${u.flatNo}`, geometry, material, position: [u.x, u.y + u.h / 2 + 0.004, u.z] }]
      })
    })
  }, [scene, textures])

  useEffect(
    () => () =>
      planes.forEach((p) => {
        p.geometry.dispose()
        p.material.dispose()
      }),
    [planes],
  )

  const group = useRef(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const opacity = planOpacity(story.get().t)
    g.visible = opacity > 0.001
    g.children.forEach((c) => (c.material.opacity = opacity))
  })

  return (
    <group ref={group}>
      {planes.map((p) => (
        <mesh
          key={p.key}
          geometry={p.geometry}
          material={p.material}
          position={p.position}
          rotation-x={-Math.PI / 2}
          renderOrder={4}
          raycast={() => null}
        />
      ))}
    </group>
  )
}
