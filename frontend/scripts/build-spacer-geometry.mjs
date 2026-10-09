// Builds src/data/spacer/projects/iraTowersGeometry.js from the brochure master plan (p6).
//
//   node scripts/build-spacer-geometry.mjs
//
// Every shape is read in master-plan pixels (src/data/generated/masterPlanGeometry.js and
// src/components/explore/map/siteOutline.js) and warped onto the land with a thin-plate spline:
// points along the master plan's compound wall are pinned to the matching points of the site
// boundary, and everything inside follows smoothly. The brochure drawing is not to scale, so a
// single affine transform cannot make it fill the real plot; the spline can.
//
// The site boundary is the land as marked by the client on the satellite map (Esri World Imagery)
// on 2026-10-08. Its gate falls within a metre of the brochure's location pin (QR code, p22:
// 17.5108889, 78.3800556), so the two sources agree.

import { writeFileSync } from 'node:fs'
import { masterPlanGeometry as plan } from '../src/data/generated/masterPlanGeometry.js'
import { LAWNS_PX, PLAY_AREA_PX, POOL_PX, SITE_OUTLINE_PX } from '../src/components/explore/map/siteOutline.js'

// The land, clockwise from the north-west corner: the main plot, then the access lane that runs
// south from the gate to the public road. [longitude, latitude]
const SITE_BOUNDARY = [
  [78.3798001, 17.5122714],
  [78.3805669, 17.512213],
  [78.3805711, 17.5120986],
  [78.380588, 17.5120183],
  [78.3806132, 17.5119381],
  [78.3806195, 17.5119261],
  [78.3805879, 17.5118979],
  [78.3805479, 17.5118577],
  [78.3805184, 17.5118175],
  [78.3805057, 17.5117372],
  [78.3804846, 17.5116569],
  [78.3804636, 17.5115766],
  [78.3804509, 17.5115364],
  [78.3804319, 17.5114962],
  [78.3804003, 17.511456],
  [78.3803687, 17.5113757],
  [78.3803392, 17.5113355],
  [78.3802865, 17.5112551],
  [78.3802528, 17.5111747],
  [78.3802233, 17.5110944],
  [78.3802022, 17.5110542],
  [78.3801642, 17.511014],
  [78.3801263, 17.5109336],
  [78.3801179, 17.5109095],
  [78.3800926, 17.5108533],
  [78.3800567, 17.5107729],
  [78.380042, 17.5107328],
  [78.3799788, 17.5107326],
  [78.379983, 17.5107728],
  [78.3799914, 17.5108129],
  [78.3799999, 17.5108531],
  [78.3799662, 17.5108992],
  [78.3795343, 17.5109383],
  [78.3798001, 17.5122714],
]

// Where the access lane meets the public road
const ROAD_END = [78.3800104, 17.5107327]

// [plan pixel, lngLat] pairs: the master plan's compound wall (siteOutline.js) and gate, each
// pinned to the matching point of SITE_BOUNDARY
const CONTROL_POINTS = [
  [
    [195, 275],
    [78.3798001, 17.5122714],
  ],
  [
    [760, 200],
    [78.3800717, 17.5122507],
  ],
  [
    [1700, 70],
    [78.3805237, 17.5122163],
  ],
  [
    [1790, 120],
    [78.3805669, 17.512213],
  ],
  [
    [1960, 500],
    [78.3806195, 17.5119261],
  ],
  [
    [1850, 1000],
    [78.3805057, 17.5117371],
  ],
  [
    [1790, 1500],
    [78.3804546, 17.5115482],
  ],
  [
    [1740, 2000],
    [78.3803567, 17.5113593],
  ],
  [
    [1680, 2400],
    [78.3802668, 17.5112081],
  ],
  [
    [1615, 2800],
    [78.3802036, 17.5110569],
  ],
  [
    [1570, 2900],
    [78.3801691, 17.5110191],
  ],
  [
    [1540, 3190],
    [78.3801179, 17.5109095],
  ],
  [
    [1295, 3200],
    [78.3800462, 17.5108973],
  ],
  [
    [1100, 3230],
    [78.379962, 17.5108992],
  ],
  [
    [650, 3265],
    [78.3797502, 17.5109187],
  ],
  [
    [200, 3300],
    [78.3795343, 17.5109383],
  ],
  [
    [198, 1000],
    [78.3797364, 17.5119519],
  ],
  [
    [198, 1800],
    [78.3796661, 17.5115994],
  ],
  [
    [198, 2600],
    [78.3795958, 17.5112468],
  ],
]

// ---------- Thin-plate spline, plan pixels -> metres east/north of the first control point ----------

const [LNG0, LAT0] = CONTROL_POINTS[0][1]
const M_PER_DEG_LAT = 110600
const M_PER_DEG_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180)
const PLAN_SCALE = 1000 // plan pixels are divided down so the system stays well conditioned

const kernel = (r2) => (r2 === 0 ? 0 : r2 * Math.log(r2) * 0.5) // r² log r

function solveLinear(a, b) {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let i = 0; i < n; i++) {
    let pivot = i
    for (let k = i + 1; k < n; k++) if (Math.abs(m[k][i]) > Math.abs(m[pivot][i])) pivot = k
    ;[m[i], m[pivot]] = [m[pivot], m[i]]
    for (let k = 0; k < n; k++) {
      if (k === i) continue
      const f = m[k][i] / m[i][i]
      for (let j = i; j <= n; j++) m[k][j] -= f * m[i][j]
    }
  }
  return m.map((row, i) => row[n] / row[i])
}

const nodes = CONTROL_POINTS.map(([[x, y]]) => [x / PLAN_SCALE, y / PLAN_SCALE])
const targets = CONTROL_POINTS.map(([, [lng, lat]]) => [(lng - LNG0) * M_PER_DEG_LNG, (lat - LAT0) * M_PER_DEG_LAT])
const N = nodes.length
const system = [
  ...nodes.map(([xi, yi]) => [...nodes.map(([xj, yj]) => kernel((xi - xj) ** 2 + (yi - yj) ** 2)), 1, xi, yi]),
  [...nodes.map(() => 1), 0, 0, 0],
  [...nodes.map(([x]) => x), 0, 0, 0],
  [...nodes.map(([, y]) => y), 0, 0, 0],
]
const weightsFor = (axis) => solveLinear(system, [...targets.map((t) => t[axis]), 0, 0, 0])
const EAST = weightsFor(0)
const NORTH = weightsFor(1)

function warp(w, x, y) {
  let v = w[N] + w[N + 1] * x + w[N + 2] * y
  for (let i = 0; i < N; i++) v += w[i] * kernel((x - nodes[i][0]) ** 2 + (y - nodes[i][1]) ** 2)
  return v
}

const round = (v) => Math.round(v * 1e7) / 1e7
const toLngLat = ([px, py]) => {
  const [x, y] = [px / PLAN_SCALE, py / PLAN_SCALE]
  return [round(LNG0 + warp(EAST, x, y) / M_PER_DEG_LNG), round(LAT0 + warp(NORTH, x, y) / M_PER_DEG_LAT)]
}
const ring = (points) => {
  const out = points.map(toLngLat)
  return [...out, out[0]]
}
const rectRing = ([x, y, w, h]) =>
  ring([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ])
const ellipse = ({ centre: [cx, cy], radiusX, radiusY }, n = 24) =>
  ring(
    Array.from({ length: n }, (_, i) => [
      cx + radiusX * Math.cos((2 * Math.PI * i) / n),
      cy + radiusY * Math.sin((2 * Math.PI * i) / n),
    ]),
  )

// ---------- Flats ----------
const plots = []
for (const blockId of ['A', 'B', 'C']) {
  for (const tile of plan.blocks[blockId].tiles) {
    plots.push({
      number: `${blockId}-${tile.label.replace(' ', '')}`,
      zone: `Block ${blockId}`,
      areaSqFt: tile.areaSft,
      status: 'available',
      polygon: rectRing(tile.rect),
    })
  }
}
plots.sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }))

// ---------- Blocks ----------
const [cx, cy, cw, ch] = plan.blocks.C.bounds
const blocks = [
  { name: 'Block B', floors: 10, polygon: rectRing(plan.blocks.B.bounds) },
  { name: 'Block A', floors: 10, polygon: rectRing(plan.blocks.A.bounds) },
  {
    // Block C's east side follows the boundary wall where it bends in towards the gate
    name: 'Block C',
    floors: 10,
    polygon: ring([
      [cx, cy],
      [cx + cw, cy],
      [cx + cw, 1500],
      [1545, cy + ch],
      [cx, cy + ch],
    ]),
  },
]

// ---------- Lift and stair cores, read off the master plan drawing ----------
const CORES_PX = [
  ['Block B', 'Lift & stair', [643, 669, 154, 146]],
  ['Block B', 'Lift', [646, 1231, 43, 80]],
  ['Block A', 'Lift & stair', [643, 2037, 154, 144]],
  ['Block A', 'Lift', [646, 2598, 43, 77]],
  ['Block C', 'Lift & stair', [1418, 617, 202, 171]],
  ['Block C', 'Stair', [1355, 1295, 100, 214]],
  ['Block C', 'Lift', [1355, 2312, 65, 55]],
  ['Block C', 'Stair', [1290, 2410, 62, 125]],
]
const cores = CORES_PX.map(([zone, kind, rect]) => ({ zone, kind, polygon: rectRing(rect) }))

// ---------- Amenities ----------
const [northLawn, eastLawn] = [LAWNS_PX.slice(0, 5).concat([[1745, 250]]), LAWNS_PX.slice(4)]
const amenity = (number, polygon, extra = {}) => ({
  number,
  kind: 'amenity',
  zone: 'Amenities',
  ...extra,
  status: 'available',
  polygon,
})
const amenities = [
  amenity('Club House', rectRing(plan.clubhouse.rect), { areaSqFt: 18648, height: 13 }),
  amenity("Children's Play Area", ellipse(PLAY_AREA_PX)),
  amenity('Outdoor Games', ring(northLawn)),
  amenity('Sitting Area', rectRing([1508, 2657, 112, 360])),
  amenity('Swimming Pool', rectRing(POOL_PX)),
  amenity('Lawn', rectRing([1012, 1330, 621, 230])),
  amenity('Landscaped Lawn', ring(eastLawn)),
  amenity('Grand Entrance', rectRing([1230, 3130, 130, 85])),
]

// ---------- Internal driveways (centre lines), for the road styling ----------
const ROADS_PX = [
  [
    [250, 3170],
    [250, 330],
    [1700, 330],
    [1700, 1460],
    [1590, 2560],
    [1470, 3170],
    [250, 3170],
  ],
  [
    [945, 330],
    [945, 3170],
  ],
  [
    [945, 2580],
    [1590, 2560],
  ],
  // the drive in from the gate
  [
    [1300, 3170],
    [1295, 3200],
  ],
]
const roads = ROADS_PX.map((line) => line.map(toLngLat))
// ...and on down the access lane to the public road
roads[roads.length - 1].push(ROAD_END)

// ---------- Trees along the compound wall, as the master plan draws them ----------
function treesAlongWall(points, spacingPx, insetPx) {
  const out = []
  const n = points.length
  // signed area tells which side is inside
  const area = points.reduce((s, [x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % n]
    return s + x1 * y2 - x2 * y1
  }, 0)
  const inward = area > 0 ? 1 : -1
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    const len = Math.hypot(x2 - x1, y2 - y1)
    const [nx, ny] = [(-(y2 - y1) / len) * inward, ((x2 - x1) / len) * inward]
    for (let d = spacingPx / 2; d < len; d += spacingPx) {
      const t = d / len
      out.push(toLngLat([x1 + (x2 - x1) * t + nx * insetPx, y1 + (y2 - y1) * t + ny * insetPx]))
    }
  }
  return out
}
const trees = treesAlongWall(SITE_OUTLINE_PX, 130, 45)

// ---------- Write the module ----------
const json = (value) => JSON.stringify(value, null, 2)
const out = `// AUTO-GENERATED by scripts/build-spacer-geometry.mjs — do not edit by hand.
//
// IRA Towers on the satellite map: the brochure master plan (p6) warped to fill the land as
// marked by the client on satellite imagery (Esri World Imagery). Coordinates are [longitude, latitude].
// Only geometry lives here; every flat's type, facing, area and rooms come from the brochure data
// layer (src/data) so the two apps can never disagree. See iraTowers.js.

export const IRA_TOWERS_BOUNDARY = ${json(SITE_BOUNDARY)}

// Named areas from the plan. They can be searched and clicked but are not for sale.
export const IRA_TOWERS_AMENITIES = ${json(amenities)}

export const IRA_TOWERS_PLOTS = ${json(plots)}

// Outlines of the three blocks, for highlighting one and dimming the others.
export const IRA_TOWERS_BLOCKS = ${json(blocks)}

// Lift and stair cores in each block's corridor, read off the master plan.
export const IRA_TOWERS_CORES = ${json(cores)}

// Centre lines of the internal driveways and the drive in from the gate.
export const IRA_TOWERS_ROADS = ${json(roads)}

// Trees planted along the compound wall.
export const IRA_TOWERS_TREES = ${json(trees)}

// The gate, where the drive in from the public road meets the site.
export const IRA_TOWERS_ENTRANCE = ${json(toLngLat([1295, 3200]))}
`
writeFileSync(new URL('../src/data/spacer/projects/iraTowersGeometry.js', import.meta.url), out)
console.log(`plots ${plots.length}, amenities ${amenities.length}, trees ${trees.length}`)
CONTROL_POINTS.forEach(([px, lngLat]) => {
  const [lng, lat] = toLngLat(px)
  const off = Math.hypot((lng - lngLat[0]) * M_PER_DEG_LNG, (lat - lngLat[1]) * M_PER_DEG_LAT)
  if (off > 0.05) console.log(`control ${px} is ${off.toFixed(2)} m off`)
})
