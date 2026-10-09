/**
 * Map imagery settings, shared by the IRA Towers location map and the Spacer project viewer.
 * Kept apart from the MapLibre setup (src/utils/maplibre.js) so pages can check for a key
 * without downloading the map library.
 */

/**
 * MapTiler key from `.env.local` (never committed) — see `.env.example`. Vite exposes VITE_*
 * variables to the browser, so the key is public by design: restrict it to the site's domains.
 * Without it, maps show a fallback screen and the rest of the app is unaffected.
 */
export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || undefined

/** MapTiler's satellite imagery with road and place labels (and the glyphs map labels use). */
export const hybridStyleUrl = (apiKey) =>
  `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(apiKey)}`

/**
 * Google Maps Platform key from `.env.local`, with the Map Tiles API enabled. When it is set, the
 * project viewer shows Google's satellite photo with Google's roads and names over it; without
 * it, the viewer falls back to Esri's imagery. Public in the browser like the MapTiler key, so
 * restrict it to the site's domains and to the Map Tiles API in the Google Cloud console.
 */
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim() || undefined

/**
 * A MapLibre raster source for Google's satellite tiles with the road map laid over them (as
 * "Satellite" with labels in Google Maps). Google's Map Tiles API needs a session first.
 */
export async function googleHybridSource(apiKey) {
  const key = encodeURIComponent(apiKey)
  const response = await fetch(`https://tile.googleapis.com/v1/createSession?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapType: 'satellite',
      layerTypes: ['layerRoadmap'],
      language: 'en-IN',
      region: 'IN',
      scale: 'scaleFactor2x',
      highDpi: true,
    }),
  })
  if (!response.ok) throw new Error(`Google Map Tiles session failed: ${response.status}`)
  const { session } = await response.json()
  return {
    type: 'raster',
    tiles: [`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${session}&key=${key}`],
    tileSize: 256, // 512 px tiles drawn at 256, so the photo stays sharp on high-density screens
    maxzoom: 21,
    attribution: `Imagery and map data © ${new Date().getFullYear()} Google`,
  }
}

/** MapTiler's street map as raster tiles, for the viewer's Satellite / Street switch. */
export const streetTilesSource = (apiKey) => ({
  type: 'raster',
  tiles: [`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey)}`],
  tileSize: 256,
  maxzoom: 22,
  attribution: '© MapTiler © OpenStreetMap contributors',
})
