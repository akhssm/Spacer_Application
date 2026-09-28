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
