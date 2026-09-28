// Small helpers for GeoJSON-style coordinates ([longitude, latitude]).

const METRES_PER_DEG_LAT = 111_320

// Google Maps wants {lat, lng} objects
export const toLatLng = ([lng, lat]) => ({ lat, lng })

// Middle of a shape: the average of its corners (the closing point is skipped)
export function centroid(ring) {
  const points = ring.slice(0, -1)
  const sum = points.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

// Area in square metres, using the shoelace formula on a flat approximation.
// Accurate to well under 1% for plot-sized shapes.
export function areaSqMetres(ring) {
  const { lat: centreLat } = centroid(ring)
  const metresPerDegLng = METRES_PER_DEG_LAT * Math.cos((centreLat * Math.PI) / 180)
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = [ring[i][0] * metresPerDegLng, ring[i][1] * METRES_PER_DEG_LAT]
    const [x2, y2] = [ring[i + 1][0] * metresPerDegLng, ring[i + 1][1] * METRES_PER_DEG_LAT]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

export const SQ_FT_PER_SQ_M = 10.7639
export const SQ_YD_PER_SQ_M = 1.19599

export function formatArea(sqMetres) {
  const round = (n) => Math.round(n).toLocaleString('en-IN')
  return {
    sqft: `${round(sqMetres * SQ_FT_PER_SQ_M)} sq.ft`,
    sqyd: `${round(sqMetres * SQ_YD_PER_SQ_M)} sq.yd`,
    sqm: `${round(sqMetres)} sq.m`,
  }
}

// Google Maps directions link to a point
export function directionsUrl([lng, lat]) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
