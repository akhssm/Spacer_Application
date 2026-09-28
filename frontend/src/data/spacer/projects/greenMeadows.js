// Green Meadows: a sample plotted layout used to show every viewer feature (/p/demo).
// Every coordinate is in GeoJSON order: [longitude, latitude].

// Rough metres per degree around Hyderabad, used to draw the sample shapes
const METRES_PER_DEG_LAT = 111_000
const METRES_PER_DEG_LNG = 106_000

// A closed rectangle whose top-left corner is at [lng, lat]
function rectangle([lng, lat], widthMetres, depthMetres) {
  const east = lng + widthMetres / METRES_PER_DEG_LNG
  const south = lat - depthMetres / METRES_PER_DEG_LAT
  return [
    [lng, lat],
    [east, lat],
    [east, south],
    [lng, south],
    [lng, lat],
  ]
}

const STATUS_BY_LETTER = { a: 'available', s: 'sold', h: 'hold', r: 'reserved' }

// A block of equal plots laid out in rows and columns
function makeBlock({ startNumber, origin, rows, cols, width, depth, zone, statusPattern }) {
  const plots = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = plots.length
      const corner = [origin[0] + (col * width) / METRES_PER_DEG_LNG, origin[1] - (row * depth) / METRES_PER_DEG_LAT]
      plots.push({
        number: String(startNumber + index),
        zone,
        status: STATUS_BY_LETTER[statusPattern[index % statusPattern.length]],
        polygon: rectangle(corner, width, depth),
      })
    }
  }
  return plots
}

// The sample brochure: square SVG pages, in the flipbook's page shape (see components/brochure/pages.js)
const PAGE_SIZE = 1200
const brochurePages = Array.from({ length: 8 }, (_, index) => {
  const page = index + 1
  const src = `/sample/brochure/page-${page}.svg`
  return {
    page,
    widthPt: PAGE_SIZE,
    heightPt: PAGE_SIZE,
    zoomable: false,
    variants: [{ src, width: PAGE_SIZE, height: PAGE_SIZE, bytes: 0 }],
    label: `Page ${page} of 8`,
  }
})

const ORIGIN = [78.135, 17.455]

export const greenMeadows = {
  shortCode: 'demo',
  name: 'Green Meadows',
  type: 'plots',
  unitLabel: 'Plot',
  unitHeight: 3,
  city: 'Hyderabad',
  address: 'Near Shankarpally, Ranga Reddy district, Telangana',
  description: 'A sample plotted layout with 24 plots in two blocks, used to show every viewer feature.',
  location: [78.1355, 17.4547],
  whatsapp: '',
  theme: { accent: '#b9822e' },
  zones: ['Block A', 'Block B'],
  inventory: 'sample',
  brochure: { pages: brochurePages, title: 'Green Meadows brochure' },
  gallery: [],
  layout: {
    sample: true,
    boundary: rectangle([78.13485, 17.45515], 120, 70),
    plots: [
      ...makeBlock({
        startNumber: 1,
        origin: ORIGIN,
        rows: 3,
        cols: 4,
        width: 12,
        depth: 18,
        zone: 'Block A',
        statusPattern: 'aasahaarsaaa',
      }),
      ...makeBlock({
        startNumber: 13,
        origin: [ORIGIN[0] + 57 / METRES_PER_DEG_LNG, ORIGIN[1]], // 9 m road gap
        rows: 3,
        cols: 4,
        width: 12,
        depth: 18,
        zone: 'Block B',
        statusPattern: 'saaraahasaas',
      }),
    ],
  },
}
