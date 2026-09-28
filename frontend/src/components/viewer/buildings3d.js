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
// The block is a group named after it; inside it every tower is its own group named after its
// flat (the plot number, e.g. "A-01"), holding everything drawn for that tower (stilt, walls,
// balconies, rails, roof, planters), so a click on any part of a tower is a click on that tower.
// The corridor and the cores are shared by the block's towers and belong to no tower.
function buildBlock(block, flats, cores, toLocal) {
  const group = new THREE.Group()
  group.userData.block = block.name
  const floors = block.floors ?? DEFAULT_FLOORS
  const top = STILT_HEIGHT + floors * FLOOR_HEIGHT
  const { toFrame, fromFrame } = blockFrame(block.polygon.map(toLocal))
  const facade = towerFacade(floors)
  const stilt = stiltFacade()

  const boxes = flats.map((flat) => ({ number: flat.number, box: bounds(flat.polygon.map(toLocal).map(toFrame)) }))
  const middle = ({ box }) => (box[0] + box[1]) / 2
  const centreU = boxes.reduce((s, b) => s + middle(b), 0) / boxes.length
  const west = boxes.filter((b) => middle(b) < centreU)
  const east = boxes.filter((b) => middle(b) >= centreU)

  // The corridor runs between the two columns, the full length of the block
  const corridorU0 = Math.max(...west.map((b) => b.box[1]))
  const corridorU1 = Math.max(Math.min(...east.map((b) => b.box[0])), corridorU0 + CORRIDOR_MIN_WIDTH)
  const allV = boxes.flatMap((b) => [b.box[2], b.box[3]])
  const corridor = [corridorU0, corridorU1, Math.min(...allV), Math.max(...allV)]
  addBoxWalls(group, corridor, 0, top, facade, '#e6e2da', fromFrame, ['west', 'east', 'north', 'south'])
  addSurface(group, rect(corridor).map(fromFrame), top, '#d9d6cf')

  // Towers: each flat, stretched sideways to meet the corridor so nothing floats
  const [ax, az] = fromFrame([0, 0])
  const [bx, bz] = fromFrame([1, 0])
  const frameAngle = -Math.atan2(bz - az, bx - ax)
  const towers = [
    ...west.map(({ number, box: b }) => ({
      number,
      box: [b[0], corridorU0, b[2], b[3]],
      inner: 'east',
      sign: -1,
      outerU: b[0],
    })),
    ...east.map(({ number, box: b }) => ({
      number,
      box: [corridorU1, b[1], b[2], b[3]],
      inner: 'west',
      sign: 1,
      outerU: b[1],
    })),
  ]
  towers.forEach(({ number, box, inner, sign, outerU }) => {
    const tower = new THREE.Group()
    tower.userData.tower = number
    tower.userData.floors = floors
    addBoxWalls(tower, box, 0, STILT_HEIGHT, stilt, '#4c4a45', fromFrame, [inner])
    addBoxWalls(tower, box, STILT_HEIGHT, floors * FLOOR_HEIGHT, facade, '#e6e2da', fromFrame, [inner])
    addSurface(tower, rect(box).map(fromFrame), top, '#d9d6cf')

    // Balcony on the outer face on every floor, and planting along the roof edge
    const [u0, u1, v0, v1] = box
    const edge = [fromFrame([outerU, v0]), fromFrame([outerU, v1])]
    const [ox, oz] = fromFrame([outerU, 0])
    const [px, pz] = fromFrame([outerU + sign, 0])
    const outward = [px - ox, pz - oz]
    const width = (v1 - v0) * 0.8
    const slabs = []
    const rails = []
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
    const planter = boxAlongEdge(edge, outward, {
      width: v1 - v0 - 1,
      height: 0.45,
      depth: 0.7,
      offset: -0.6,
      y: top + 0.22,
    })
    tower.add(new THREE.Mesh(mergeGeometries(slabs), new THREE.MeshLambertMaterial({ color: '#e4e1da' })))
    tower.add(
      new THREE.Mesh(
        mergeGeometries(rails),
        new THREE.MeshLambertMaterial({ color: '#a9c4d4', transparent: true, opacity: 0.55 }),
      ),
    )
    tower.add(new THREE.Mesh(planter, new THREE.MeshLambertMaterial({ color: '#4f7f36' })))

    // Thin translucent bands around the tower, moved to a floor (hidden until then): the green
    // one marks the tower's chosen floor, the faint white one the floor under the pointer.
    const [cx, cz] = fromFrame([(u0 + u1) / 2, (v0 + v1) / 2])
    const makeBand = (color, opacity) => {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(u1 - u0 + FLOOR_BAND_MARGIN, FLOOR_HEIGHT, v1 - v0 + FLOOR_BAND_MARGIN),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
      )
      band.position.set(cx, 0, cz)
      band.rotation.y = frameAngle
      band.visible = false
      band.raycast = () => {} // decoration only: clicks go through to the tower
      tower.add(band)
      return band
    }
    tower.userData.floorBand = makeBand(HIGHLIGHT.selected, 0.35)
    tower.userData.hoverBand = makeBand('#ffffff', 0.12)
    group.add(tower)
  })

  // Lift and stair cores: plain white boxes rising above the roof
  cores.forEach((core) => {
    const box = bounds(core.polygon.map(toLocal).map(toFrame))
    const coreTop = top + CORE_EXTRA_HEIGHT
    addBoxWalls(group, box, 0, coreTop, facade, '#f1eee8', fromFrame, ['west', 'east', 'north', 'south'])
    addSurface(group, rect(box).map(fromFrame), coreTop, '#e8e5de')
  })

  // Remember each material's own colour, so highlighting can tint a tower and put it back
  group.traverse((object) => {
    if (object.material) object.material.userData.baseColor ??= object.material.color.clone()
  })
  return group
}

// Height of the middle of a residential floor (1 = the first floor above the stilt)
const floorY = (floor) => STILT_HEIGHT + (floor - 0.5) * FLOOR_HEIGHT

// Hover and selection tints, kept subtle so the building still reads as itself
const HIGHLIGHT = {
  selected: '#75c217', // the brand green the 2D block outline uses
  selectedGlow: 0.16,
  hoverGlow: 0.12,
  otherShade: 0.62, // blocks outside the chosen block darken a little, as their footprints do
}
const FLOOR_BAND_MARGIN = 1.6 // metres the floor band stands proud of the tower

// Tint the meshes of one tower, or of a block's shared parts (corridor, cores), without going
// into its towers: 'selected', 'hover', 'dimmed' or 'normal'
function tint(group, state) {
  group.children.forEach((object) => {
    if (object.userData.tower) return
    const material = object.material
    if (!material?.userData.baseColor || object === group.userData.floorBand || object === group.userData.hoverBand)
      return
    material.color.copy(material.userData.baseColor)
    if (state === 'dimmed') material.color.multiplyScalar(HIGHLIGHT.otherShade)
    if (state === 'selected') material.emissive.set(HIGHLIGHT.selected).multiplyScalar(HIGHLIGHT.selectedGlow)
    else if (state === 'hover') material.emissive.setScalar(HIGHLIGHT.hoverGlow)
    else material.emissive.setScalar(0)
  })
}

// { "A-01": { selected, hover, dimmed, floorBandY, hoverBandY }, "Club House": { selected, hover } }
// read back from the towers' and amenities' materials
function towerStates(blockGroups, amenityGroups = []) {
  const states = {}
  const read = (material) => ({
    selected: material.emissive.g > material.emissive.r + 0.01,
    hover: material.emissive.r > 0 && material.emissive.r === material.emissive.g,
    dimmed: material.color.r < material.userData.baseColor.r - 0.01,
  })
  blockGroups.forEach((group) =>
    group.children
      .filter((child) => child.userData.tower)
      .forEach((tower) => {
        const material = tower.children.find((mesh) => mesh.material?.userData.baseColor).material
        const band = tower.userData.floorBand
        const hoverBand = tower.userData.hoverBand
        states[tower.userData.tower] = {
          ...read(material),
          floorBandY: band.visible ? band.position.y : null,
          hoverBandY: hoverBand.visible ? hoverBand.position.y : null,
        }
      }),
  )
  amenityGroups.forEach((group) => {
    const readGroup = (g) => read(g.children.find((mesh) => mesh.material?.userData.baseColor).material)
    states[group.userData.amenity] = readGroup(group)
    group.children.filter((child) => child.userData.amenity).forEach((n) => (states[n.userData.amenity] = readGroup(n)))
  })
  return states
}

// The clubhouse as one selectable amenity: every mesh of the building (walls, louvred facade,
// roof) lives in a group carrying the plot's number, so a click on any part of it is a click on
// the clubhouse. The pool on its roof is a nested group with its own amenity identity, as on the
// 2D plan, so tapping the water selects the pool and everything else selects the clubhouse.
function buildClubhouse(club, pool, toLocal) {
  const group = new THREE.Group()
  group.userData.amenity = club.number
  const ring = club.polygon.map(toLocal)
  const height = club.height ?? 13
  addWalls(group, ring, 0, height, clubFacade(height), '#e9e5dd')
  addSurface(group, ring, height, '#e3e0d8')
  if (pool) {
    const poolGroup = new THREE.Group()
    poolGroup.userData.amenity = pool.number
    addSurface(poolGroup, pool.polygon.map(toLocal), height + 0.1, '#3aa7d9')
    group.add(poolGroup)
  }
  return group
}

function buildGeneratedModel(project, toLocal) {
  const group = new THREE.Group()
  const { blocks = [], cores = [], plots } = project.layout

  blocks.forEach((block) => {
    const flats = plots.filter((plot) => plot.kind !== 'amenity' && plot.zone === block.name)
    const blockCores = cores.filter((core) => core.zone === block.name)
    if (flats.length) group.add(buildBlock(block, flats, blockCores, toLocal))
  })

  const club = plots.find((plot) => plot.number === 'Club House')
  if (club)
    group.add(
      buildClubhouse(
        club,
        plots.find((plot) => plot.number === 'Swimming Pool'),
        toLocal,
      ),
    )

  // Remember each material's own colour (idempotent), so tints can always be undone
  group.traverse((object) => {
    if (object.material) object.material.userData.baseColor ??= object.material.color.clone()
  })
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
  let blockGroups = [] // one group per block of the generated model, each holding its tower groups
  let amenityGroups = [] // the clubhouse (with the pool nested inside it)
  let hovered = null // { tower, floor } or { amenity }, whatever is under the pointer
  // The floor always belongs to the tower; the amenity (clubhouse) is its own selection
  let selection = { block: null, tower: null, floor: null, amenity: null }
  const raycaster = new THREE.Raycaster()

  const applyHighlight = () => {
    blockGroups.forEach((group) => {
      const outside = selection.block && group.userData.block !== selection.block
      const blockState = outside ? 'dimmed' : 'normal'
      tint(group, blockState)
      group.children
        .filter((child) => child.userData.tower)
        .forEach((tower) => {
          const id = tower.userData.tower
          const chosen = id === selection.tower
          tint(tower, chosen ? 'selected' : id === hovered?.tower ? 'hover' : blockState)
          const band = tower.userData.floorBand
          band.visible = chosen && selection.floor != null
          if (band.visible) band.position.y = floorY(selection.floor)
          // The faint band under the pointer, on whichever floor of this tower it is over —
          // never on top of that same floor's selected band.
          const hover = tower.userData.hoverBand
          hover.visible =
            hovered?.tower === id && hovered.floor != null && !(chosen && selection.floor === hovered.floor)
          if (hover.visible) hover.position.y = floorY(hovered.floor)
        })
    })
    // Amenities: every mesh follows its nearest amenity ancestor (the pool inside the clubhouse
    // keeps its own identity), so selecting the clubhouse lights the whole building.
    amenityGroups.forEach((group) =>
      group.traverse((object) => {
        const material = object.material
        if (!material?.userData.baseColor) return
        let owner = object
        while (owner && !owner.userData.amenity) owner = owner.parent
        const id = owner?.userData.amenity
        const state = id === selection.amenity ? 'selected' : id === hovered?.amenity ? 'hover' : 'normal'
        material.color.copy(material.userData.baseColor)
        if (state === 'selected') material.emissive.set(HIGHLIGHT.selected).multiplyScalar(HIGHLIGHT.selectedGlow)
        else if (state === 'hover') material.emissive.setScalar(HIGHLIGHT.hoverGlow)
        else material.emissive.setScalar(0)
      }),
    )
    if (visible) map?.triggerRepaint()
  }

  return {
    id: 'buildings-3d',
    type: 'custom',
    renderingMode: '3d',

    setVisible(on) {
      visible = on
      map?.triggerRepaint()
    },

    // What is under a point on the map canvas (CSS pixels), from the nearest thing the ray hits
    // (so a tower behind the clubhouse is never picked through it):
    //   { block, tower, floor }   a tower — walls, balconies, rails (floor from the hit's height:
    //                             the geometry is built from the same storey constants), or its
    //                             stilt / roof / planters, where floor is null
    //   { block, tower: null }    a block's shared corridor or cores
    //   { amenity }               the clubhouse, or the pool on its roof
    //   null                      nothing
    // Only while the 3D buildings are showing: the ray is cast through the matrix of the last
    // frame drawn.
    pick({ x, y }) {
      if (!visible || !map || !blockGroups.length) return null
      const canvas = map.getCanvas()
      const inverse = camera.projectionMatrixInverse
      const ndcX = (x / canvas.clientWidth) * 2 - 1
      const ndcY = 1 - (y / canvas.clientHeight) * 2
      const near = new THREE.Vector3(ndcX, ndcY, -1).applyMatrix4(inverse)
      const far = new THREE.Vector3(ndcX, ndcY, 1).applyMatrix4(inverse)
      raycaster.set(near, far.sub(near).normalize())
      const hit = raycaster.intersectObjects([...blockGroups, ...amenityGroups], true)[0]
      let object = hit?.object
      let tower = null
      let floors = 0
      while (object && !object.userData.block) {
        if (object.userData.amenity) return { amenity: object.userData.amenity }
        if (object.userData.tower && !tower) {
          tower = object.userData.tower
          floors = object.userData.floors
        }
        object = object.parent
      }
      if (!object) return null
      // Which residential floor the hit is on: its height above the stilt, in storeys. The roof,
      // planters (above the top floor) and the stilt itself carry no floor.
      let floor = null
      if (tower && hit.point.y >= STILT_HEIGHT && hit.point.y < STILT_HEIGHT + floors * FLOOR_HEIGHT)
        floor = Math.min(floors, Math.floor((hit.point.y - STILT_HEIGHT) / FLOOR_HEIGHT) + 1)
      return { block: object.userData.block, tower, floor }
    },

    // The faint tints under the pointer: a tower (with the floor the pointer is over) or an
    // amenity. Passing null clears them.
    setHover(target) {
      if (target?.tower === hovered?.tower && target?.floor === hovered?.floor && target?.amenity === hovered?.amenity)
        return
      hovered = target ?? null
      applyHighlight()
    },
    setSelection({ block = null, tower = null, floor = null, amenity = null }) {
      selection = { block, tower, floor: tower ? floor : null, amenity }
      applyHighlight()
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
        const model = buildGeneratedModel(project, toLocal)
        blockGroups = model.children.filter((child) => child.userData.block)
        amenityGroups = model.children.filter((child) => child.userData.amenity)
        scene.add(model)
        applyHighlight()
        // Development-only (tree-shaken from production builds): lets automated QA read each
        // tower's and amenity's tint and bands, to check that exactly one thing is selected.
        if (import.meta.env.DEV) this.debugTowers = () => towerStates(blockGroups, amenityGroups)
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
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      renderer.resetState()
      renderer.render(scene, camera)
    },
  }
}
