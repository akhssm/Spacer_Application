/**
 * Georeferencing for the interactive location map — the ONLY place the brochure master plan
 * (p6, image space 2038 × 3428 px, see `masterPlanGeometry.image`) is tied to the real world.
 *
 * This is a first-pass, INDICATIVE placement derived from brochure data only. It is not a survey.
 * When surveyed control points or a CAD/KML file arrive, replace the constants below (or swap the
 * similarity transform for an affine fit) — every map layer derives from `planToLngLat`.
 *
 * Transform: similarity (translation + uniform scale + rotation), 4 parameters:
 *   dx = x − anchorX, dy = y − anchorY                (plan pixels; y grows downwards / south)
 *   east  = s · ( dx·cosθ − dy·sinθ)                  (metres)
 *   north = s · (−dx·sinθ − dy·cosθ)
 *   lng = anchorLng + east / metresPerDegreeLng(anchorLat)
 *   lat = anchorLat + north / metresPerDegreeLat(anchorLat)
 * θ is the compass bearing of the plan's "up" direction (clockwise from true north).
 * A local tangent plane is accurate to millimetres over the ~160 m site.
 */

/** A point in master-plan image pixels (brochure p6). */

/** [longitude, latitude] — GeoJSON / MapLibre order. */

/** [x, y, width, height] in master-plan pixels — same shape as `PixelRect` in docs/ira-towers-data-model.d.ts. */

/**
 * Anchor — brochure p22 location QR code (`public/assets/brochure/location/location-qr.webp`).
 * It decodes to https://goo.gl/maps/yVxnm6j7oeEYwmo58, which resolves to a Google Maps dropped pin
 * at 17°30'39.2"N 78°22'48.2"E = 17.5108889, 78.3800556 (Nizampet, Hyderabad).
 */
export const QR_PIN = [78.3800556, 17.5108889]

/**
 * ASSUMPTION — the QR pin marks the site entrance: the entry road just south of the gate on the
 * master plan (p6). A one-off comparison with public satellite imagery supported this (the pin sits
 * at the site's only road entrance); it is not a surveyed control point.
 */
export const ENTRANCE_ANCHOR_PX = [1320, 3290]

/**
 * Scale — brochure p3 states the land area as "3 Acres" (≈ 12,140.6 m²). The hand-traced site
 * outline (`siteOutline.js`) encloses 4,803,100 px², so s = √(12,140.6 / 4,803,100) ≈ 0.05028 m/px.
 * Cross-check: the cars drawn on the plan (~85 px) measure ≈ 4.3 m. "3 acres" is a rounded headline
 * figure (±0.25 acre ⇒ ±4 % scale).
 */
export const METRES_PER_PIXEL = 0.05028

/** Rotation — the brochure p6 compass rose points straight up the page: the plan is north-up. */
export const ROTATION_DEG = 0

export const GEOREF = {
  anchorLngLat: QR_PIN,
  anchorPx: ENTRANCE_ANCHOR_PX,
  metresPerPixel: METRES_PER_PIXEL,
  rotationDeg: ROTATION_DEG,
}

/** Must be shown wherever the placement is shown. */
export const PLACEMENT_LABEL = 'Indicative placement · Not surveyed'

/** Human-readable provenance of every constant above, for the map's "About this map" note. */
export const GEOREF_NOTES = [
  {
    title: 'Location',
    detail:
      "The brochure's location QR code (p22) opens a Google Maps pin at 17.5108889° N, 78.3800556° E in Nizampet.",
  },
  {
    title: 'Entrance',
    detail: "The pin is assumed to mark the site entrance, so the master plan's gate (p6) is placed on it.",
  },
  {
    title: 'Scale',
    detail: "Sized so the site outline covers the brochure's stated 3 acres (p3). This is an approximation.",
  },
  {
    title: 'Orientation',
    detail: 'North-up, as shown by the compass on the master plan (p6).',
  },
  {
    title: 'Outlines',
    detail:
      "The site boundary and amenity areas were traced by hand from the master plan; block and clubhouse footprints come from the plan's tiles. Positions may be off by several metres.",
  },
]

/** Metres per degree of latitude / longitude at a latitude (WGS84 series expansion). */
export function metresPerDegree(latDeg) {
  const φ = (latDeg * Math.PI) / 180
  return {
    lat: 111132.92 - 559.82 * Math.cos(2 * φ) + 1.175 * Math.cos(4 * φ) - 0.0023 * Math.cos(6 * φ),
    lng: 111412.84 * Math.cos(φ) - 93.5 * Math.cos(3 * φ) + 0.118 * Math.cos(5 * φ),
  }
}

/** Master-plan pixel → [lng, lat]. */
export function planToLngLat([x, y], g = GEOREF) {
  const [ax, ay] = g.anchorPx
  const [lng0, lat0] = g.anchorLngLat
  const θ = (g.rotationDeg * Math.PI) / 180
  const dx = x - ax
  const dy = y - ay
  const east = g.metresPerPixel * (dx * Math.cos(θ) - dy * Math.sin(θ))
  const north = g.metresPerPixel * (-dx * Math.sin(θ) - dy * Math.cos(θ))
  const m = metresPerDegree(lat0)
  return [lng0 + east / m.lng, lat0 + north / m.lat]
}

/** A plan rectangle → closed GeoJSON ring (NW, SW, SE, NE, NW — counter-clockwise on the map). */
export function planRectToRing([x, y, w, h], g = GEOREF) {
  const corners = [
    [x, y],
    [x, y + h],
    [x + w, y + h],
    [x + w, y],
  ]
  return closeRing(corners.map((p) => planToLngLat(p, g)))
}

/** A plan polygon → closed GeoJSON ring. */
export function planPolygonToRing(points, g = GEOREF) {
  return closeRing(points.map((p) => planToLngLat(p, g)))
}

function closeRing(ring) {
  const [first] = ring
  const last = ring[ring.length - 1]
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, [first[0], first[1]]]
}

/**
 * Ground distance in metres on the same local ellipsoidal model as `planToLngLat`, so it is exactly
 * consistent with the plan scale. Accurate for city-scale distances (GPS "distance to site").
 */
export function distanceMetres([lng1, lat1], [lng2, lat2]) {
  const m = metresPerDegree((lat1 + lat2) / 2)
  return Math.hypot((lng2 - lng1) * m.lng, (lat2 - lat1) * m.lat)
}
