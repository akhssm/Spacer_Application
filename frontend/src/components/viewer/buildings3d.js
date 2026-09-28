// A MapLibre custom layer that draws the project's buildings with three.js.
// Each block is built from its flats as drawn on the master plan: every flat
// is its own tower with a gap to the next, the two columns of towers meet at
// the central corridor, lift and stair cores rise above the roof, balconies
// protrude on every tower's outer face on every floor, and planters line the
// roof. The club house gets its louvred façade and the pool on its roof. If
// the project has an architect's glTF model, that is shown instead.

import { MercatorCoordinate } from 'maplibre-gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const FLOOR_HEIGHT = 3.1 // metres
const STILT_HEIGHT = 3.5 // ground level parking under the block
const DEFAULT_FLOORS = 10
const BALCONY_DEPTH = 1.4
const RAIL_HEIGHT = 1.1
const CORE_EXTRA_HEIGHT = 3 // lift machine rooms rise above the roof
const CORRIDOR_MIN_WIDTH = 2.4
const PX_PER_METRE = 24 // resolution of the generated façade textures
const MODULE_METRES = 12 // the façade texture repeats every 12 m along a wall
const SHORT_WALL = 3.5 // walls shorter than this get no windows

// ---------- Façade textures, drawn on a canvas ----------

function newCanvas(widthMetres, heightMetres) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(widthMetres * PX_PER_METRE)
  canvas.height = Math.round(heightMetres * PX_PER_METRE)
  return [canvas, canvas.getContext('2d'), (metres) => metres * PX_PER_METRE]
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// Residential floors: off-white walls, dark glass windows, a floor slab line per storey
function towerFacade(floors) {
  const height = floors * FLOOR_HEIGHT
  const [canvas, ctx, m] = newCanvas(MODULE_METRES, height)
  const W = canvas.width
  const H = canvas.height

  ctx.fillStyle = '#efece5'
  ctx.fillRect(0, 0, W, H)
  for (let floor = 0; floor < floors; floor++) {
    const top = H - (floor + 1) * m(FLOOR_HEIGHT)
    ctx.fillStyle = '#cfcbc2'
    ctx.fillRect(0, top + m(FLOOR_HEIGHT) - m(0.25), W, m(0.25))
    // Two windows per 12 m module
    for (const x of [1.5, 7.5]) {
      ctx.fillStyle = '#42525f'
      ctx.fillRect(m(x), top + m(0.8), m(3), m(1.5))
      ctx.fillStyle = '#93a4b0'
      ctx.fillRect(m(x + 1.45), top + m(0.8), m(0.1), m(1.5))
    }
  }
  // Brown accent band and parapet
  ctx.fillStyle = '#6f4b2f'
  ctx.fillRect(m(5.2), 0, m(1.2), H)
  ctx.fillStyle = '#d4d0c7'
  ctx.fillRect(0, 0, W, m(0.4))
  return canvasTexture(canvas)
}

// Stilt level: shadowed parking with columns
function stiltFacade() {
  const [canvas, ctx, m] = newCanvas(MODULE_METRES, STILT_HEIGHT)
  ctx.fillStyle = '#4c4a45'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#d8d4cb'
  for (let x = 1.2; x < MODULE_METRES; x += 4) ctx.fillRect(m(x), 0, m(0.6), canvas.height)
  return canvasTexture(canvas)
}

// Club house: brown vertical louvres over glass, like the render
function clubFacade(height) {
  const [canvas, ctx, m] = newCanvas(MODULE_METRES, height)
  const W = canvas.width
  const H = canvas.height
  ctx.fillStyle = '#3d4f5e'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#e9e5dd'
  ctx.fillRect(0, 0, m(1), H)
  ctx.fillRect(W - m(1), 0, m(1), H)
  ctx.fillStyle = '#6b4a2e'
  for (let x = 1.3; x < MODULE_METRES - 1; x += 0.6) ctx.fillRect(m(x), m(0.4), m(0.3), H - m(0.4))
  ctx.fillStyle = '#cfcbc2'
  for (let y = FLOOR_HEIGHT; y < height; y += FLOOR_HEIGHT) ctx.fillRect(0, H - m(y), W, m(0.2))
  return canvasTexture(canvas)
}

// ---------- Small geometry helpers (local metres: x east, z south, y up) ----------

const edgesOf = (ring) => ring.slice(0, -1).map((a, i) => [a, ring[i + 1]])
const edgeLength = ([[ax, az], [bx, bz]]) => Math.hypot(bx - ax, bz - az)
const edgeAngle = ([[ax, az], [bx, bz]]) => Math.atan2(-(bz - az), bx - ax)
const midpoint = ([[ax, az], [bx, bz]]) => [(ax + bx) / 2, (az + bz) / 2]

// Walls around a ring between two heights; long walls get the façade, short ones a plain colour
function addWalls(group, ring, bottom, height, texture, plainColor) {
  const textured = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide })
  const plain = new THREE.MeshLambertMaterial({ color: plainColor, side: THREE.DoubleSide })

  edgesOf(ring).forEach((edge) => {
    const length = edgeLength(edge)
    if (length < 0.3) return
    const wall = new THREE.PlaneGeometry(length, height)
    const uv = wall.attributes.uv
    for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (length / MODULE_METRES))
    const mesh = new THREE.Mesh(wall, length < SHORT_WALL ? plain : textured)
    const [mx, mz] = midpoint(edge)
    mesh.position.set(mx, bottom + height / 2, mz)
    mesh.rotation.y = edgeAngle(edge)
    group.add(mesh)
  })
}

// A flat surface (roof, pool) filling a ring at a height
function addSurface(group, ring, height, color) {
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = height
  group.add(mesh)
}

// A box placed along an edge, pushed outward (or inward when the offset is negative)
function boxAlongEdge(edge, outward, { width, height, depth, offset, y }) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const [mx, mz] = midpoint(edge)
  const matrix = new THREE.Matrix4()
    .makeTranslation(mx + outward[0] * offset, y, mz + outward[1] * offset)
    .multiply(new THREE.Matrix4().makeRotationY(edgeAngle(edge)))
  return geometry.applyMatrix4(matrix)
}

// ---------- Blocks ----------

// Work in the block's own orientation (its first edge), so slightly turned
// blocks still get straight walls.
function blockFrame(blockRing) {
  const [a, b] = blockRing
  const theta = Math.atan2(b[1] - a[1], b[0] - a[0])
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return {
    toFrame: ([x, z]) => [x * cos + z * sin, -x * sin + z * cos],
    fromFrame: ([u, v]) => [u * cos - v * sin, u * sin + v * cos],
  }
}

const bounds = (points) => {
  const us = points.map((p) => p[0])
  const vs = points.map((p) => p[1])
  return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]
}
const rect = ([u0, u1, v0, v1]) => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
  [u0, v0],
]

// Walls of a box given in the block frame. Faces listed in plainSides get no windows.
function addBoxWalls(group, box, bottom, height, texture, plainColor, fromFrame, plainSides = []) {
  const [u0, u1, v0, v1] = box
  const textured = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide })
  const plain = new THREE.MeshLambertMaterial({ color: plainColor, side: THREE.DoubleSide })
  const faces = [
    [
      'west',
      [
        [u0, v1],
        [u0, v0],
      ],
    ],
    [
      'east',
      [
        [u1, v0],
        [u1, v1],
      ],
    ],
    [
      'north',
      [
        [u0, v0],
        [u1, v0],
      ],
    ],
    [
      'south',
      [
        [u1, v1],
        [u0, v1],
      ],
    ],
  ]
  faces.forEach(([side, [a, b]]) => {
    const edge = [fromFrame(a), fromFrame(b)]
    const length = edgeLength(edge)
    const wall = new THREE.PlaneGeometry(length, height)
    const uv = wall.attributes.uv
    for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (length / MODULE_METRES))
    const usePlain = plainSides.includes(side) || length < SHORT_WALL
    const mesh = new THREE.Mesh(wall, usePlain ? plain : textured)
    const [mx, mz] = midpoint(edge)
    mesh.position.set(mx, bottom + height / 2, mz)
    mesh.rotation.y = edgeAngle(edge)
    group.add(mesh)
  })
}

// One block, as the plan and the aerial render show it: every flat is its own
// tower with a gap to its neighbour, the two columns of towers meet the corridor
// between them, and the lift and stair cores rise above the roof.
function addBlock(group, block, flats, cores, toLocal) {
  const floors = block.floors ?? DEFAULT_FLOORS
  const top = STILT_HEIGHT + floors * FLOOR_HEIGHT
  const { toFrame, fromFrame } = blockFrame(block.polygon.map(toLocal))
  const facade = towerFacade(floors)
  const stilt = stiltFacade()

  const boxes = flats.map((flat) => bounds(flat.polygon.map(toLocal).map(toFrame)))
  const centreU = boxes.reduce((s, b) => s + (b[0] + b[1]) / 2, 0) / boxes.length
  const west = boxes.filter((b) => (b[0] + b[1]) / 2 < centreU)
  const east = boxes.filter((b) => (b[0] + b[1]) / 2 >= centreU)

  // The corridor runs between the two columns, the full length of the block
  const corridorU0 = Math.max(...west.map((b) => b[1]))
  const corridorU1 = Math.max(Math.min(...east.map((b) => b[0])), corridorU0 + CORRIDOR_MIN_WIDTH)
  const allV = boxes.flatMap((b) => [b[2], b[3]])
  const corridor = [corridorU0, corridorU1, Math.min(...allV), Math.max(...allV)]
  addBoxWalls(group, corridor, 0, top, facade, '#e6e2da', fromFrame, ['west', 'east', 'north', 'south'])
  addSurface(group, rect(corridor).map(fromFrame), top, '#d9d6cf')

  // Towers: each flat, stretched sideways to meet the corridor so nothing floats
  const slabs = []
  const rails = []
  const planters = []
  const towers = [
    ...west.map((b) => ({ box: [b[0], corridorU0, b[2], b[3]], inner: 'east', sign: -1, outerU: b[0] })),
    ...east.map((b) => ({ box: [corridorU1, b[1], b[2], b[3]], inner: 'west', sign: 1, outerU: b[1] })),
  ]
  towers.forEach(({ box, inner, sign, outerU }) => {
    addBoxWalls(group, box, 0, STILT_HEIGHT, stilt, '#4c4a45', fromFrame, [inner])
    addBoxWalls(group, box, STILT_HEIGHT, floors * FLOOR_HEIGHT, facade, '#e6e2da', fromFrame, [inner])
    addSurface(group, rect(box).map(fromFrame), top, '#d9d6cf')

    // Balcony on the outer face on every floor, and planting along the roof edge
    const [, , v0, v1] = box
    const edge = [fromFrame([outerU, v0]), fromFrame([outerU, v1])]
    const [ax, az] = fromFrame([outerU, 0])
    const [bx, bz] = fromFrame([outerU + sign, 0])
    const outward = [bx - ax, bz - az]
    const width = (v1 - v0) * 0.8
    for (let floor = 0; floor < floors; floor++) {
      const y = STILT_HEIGHT + floor * FLOOR_HEIGHT
      slabs.push(
        boxAlongEdge(edge, outward, {
          width,
          height: 0.15,
          depth: BALCONY_DEPTH,
          offset: BALCONY_DEPTH / 2,
          y: y + 0.08,
        }),
      )
      rails.push(
        boxAlongEdge(edge, outward, {
          width,
          height: RAIL_HEIGHT,
          depth: 0.06,
          offset: BALCONY_DEPTH - 0.03,
          y: y + 0.15 + RAIL_HEIGHT / 2,
        }),
      )
    }
    planters.push(
      boxAlongEdge(edge, outward, { width: v1 - v0 - 1, height: 0.45, depth: 0.7, offset: -0.6, y: top + 0.22 }),
    )
  })

  // Lift and stair cores: plain white boxes rising above the roof
  cores.forEach((core) => {
    const box = bounds(core.polygon.map(toLocal).map(toFrame))
    const coreTop = top + CORE_EXTRA_HEIGHT
    addBoxWalls(group, box, 0, coreTop, facade, '#f1eee8', fromFrame, ['west', 'east', 'north', 'south'])
    addSurface(group, rect(box).map(fromFrame), coreTop, '#e8e5de')
  })

  group.add(new THREE.Mesh(mergeGeometries(slabs), new THREE.MeshLambertMaterial({ color: '#e4e1da' })))
  group.add(
    new THREE.Mesh(
      mergeGeometries(rails),
      new THREE.MeshLambertMaterial({ color: '#a9c4d4', transparent: true, opacity: 0.55 }),
    ),
  )
  group.add(new THREE.Mesh(mergeGeometries(planters), new THREE.MeshLambertMaterial({ color: '#4f7f36' })))
}

function addClubHouse(group, club, pool, toLocal) {
  const ring = club.polygon.map(toLocal)
  const height = club.height ?? 13
  addWalls(group, ring, 0, height, clubFacade(height), '#e9e5dd')
  addSurface(group, ring, height, '#e3e0d8')
  if (pool) addSurface(group, pool.polygon.map(toLocal), height + 0.1, '#3aa7d9')
}

function buildGeneratedModel(project, toLocal) {
  const group = new THREE.Group()
  const { blocks = [], cores = [], plots } = project.layout

  blocks.forEach((block) => {
    const flats = plots.filter((plot) => plot.kind !== 'amenity' && plot.zone === block.name)
    const blockCores = cores.filter((core) => core.zone === block.name)
    if (flats.length) addBlock(group, block, flats, blockCores, toLocal)
  })

  const club = plots.find((plot) => plot.number === 'Club House')
  if (club)
    addClubHouse(
      group,
      club,
      plots.find((plot) => plot.number === 'Swimming Pool'),
      toLocal,
    )

  return group
}

// ---------- The MapLibre layer ----------

export function createBuildingsLayer(project) {
  const [lng, lat] = project.location
  const originMc = MercatorCoordinate.fromLngLat({ lng, lat }, 0)
  const metre = originMc.meterInMercatorCoordinateUnits()
  // Map coordinates -> local metres around the project's location: x east, z south
  const toLocal = ([pointLng, pointLat]) => {
    const mc = MercatorCoordinate.fromLngLat({ lng: pointLng, lat: pointLat }, 0)
    return [(mc.x - originMc.x) / metre, (mc.y - originMc.y) / metre]
  }

  let map
  let scene
  let camera
  let renderer
  let visible = false

  return {
    id: 'buildings-3d',
    type: 'custom',
    renderingMode: '3d',

    setVisible(on) {
      visible = on
      map?.triggerRepaint()
    },

    onAdd(mapInstance, gl) {
      map = mapInstance
      camera = new THREE.Camera()
      scene = new THREE.Scene()
      scene.add(new THREE.AmbientLight(0xffffff, 1.5))
      const sun = new THREE.DirectionalLight(0xffffff, 2.4)
      sun.position.set(-0.6, 1, 0.4)
      scene.add(sun)

      if (project.model?.url) {
        new GLTFLoader().load(project.model.url, (gltf) => {
          const [mx, mz] = toLocal(project.model.position ?? project.location)
          gltf.scene.position.set(mx, 0, mz)
          gltf.scene.rotation.y = -((project.model.rotation ?? 0) * Math.PI) / 180
          gltf.scene.scale.setScalar(project.model.scale ?? 1)
          scene.add(gltf.scene)
          map.triggerRepaint()
        })
      } else {
        scene.add(buildGeneratedModel(project, toLocal))
      }

      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },

    render(gl, args) {
      if (!visible) return
      // MapLibre gives the map's view-projection matrix; place our metre-based
      // model at the project's location, scaled to Mercator units, with Y up.
      const matrix = args.defaultProjectionData?.mainMatrix ?? args.modelViewProjectionMatrix ?? args
      const rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
      const place = new THREE.Matrix4()
        .makeTranslation(originMc.x, originMc.y, originMc.z)
        .scale(new THREE.Vector3(metre, -metre, metre))
        .multiply(rotateX)
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(place)
      renderer.resetState()
      renderer.render(scene, camera)
    },
  }
}
