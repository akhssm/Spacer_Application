import { brochureAssets } from '@/data'

/**
 * Gallery albums for the location map — a curated list of EXISTING brochure assets (by id; no
 * image is copied, renamed or regenerated). Every item carries an explicit rights status so that
 * excluded material (stock / unverified lifestyle photography, brand marks, decorative layers)
 * can never slip into an album: `galleryItem` throws for it and the tests enforce it.
 *
 * Rights (internal — not shown to visitors):
 *   project               brochure asset flagged "project" in the asset manifest
 *   pending-confirmation  brochure asset flagged "verify" (appears to be a project render;
 *                         publishing rights NOT yet confirmed with V4 Ventures)
 * All gallery images are brochure-derived: publishing any of them still depends on V4 Ventures'
 * permission for the brochure material.
 */

export const GALLERY_ALBUMS = [
  { id: 'all', label: 'All' },
  { id: 'project', label: 'Project' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'plans', label: 'Plans' },
  { id: 'location', label: 'Location' },
]

/** Manifest rights flags that may never appear in the gallery. */
export const EXCLUDED_RIGHTS = ['stock-unverified', 'decorative']
/** Manifest categories that may never appear in the gallery (people/lifestyle stock, logos, ornaments). */
export const EXCLUDED_CATEGORIES = ['lifestyle', 'brand', 'decorative']
/** Specific assets that are not gallery images: the QR code, and render layers that only work composited. */
export const EXCLUDED_IDS = [
  'location-qr',
  'entrance-day-building',
  'entrance-day-sky',
  'elevation-day-building',
  'elevation-day-sky',
  'lineart-cover',
]

export function galleryItem(id, album) {
  const asset = brochureAssets[id]
  if (!asset) throw new Error(`Unknown brochure asset "${id}".`)
  if (EXCLUDED_IDS.includes(id)) throw new Error(`"${id}" is not a gallery image.`)
  if (EXCLUDED_CATEGORIES.includes(asset.category))
    throw new Error(`"${id}" is ${asset.category} material — excluded from the gallery.`)
  if (EXCLUDED_RIGHTS.includes(asset.rights))
    throw new Error(`"${id}" has rights "${asset.rights}" — excluded from the gallery.`)
  const rights = asset.rights === 'verify' ? 'pending-confirmation' : 'project'
  return { id, album, caption: asset.alt, page: asset.page, impression: asset.category === 'render', rights, asset }
}

export const GALLERY_ITEMS = [
  // Project: exterior and aerial renders.
  galleryItem('aerial-overview', 'project'),
  galleryItem('aerial-clubhouse-pool', 'project'),
  galleryItem('entrance-night', 'project'),
  galleryItem('elevation-night', 'project'),
  galleryItem('elevation-mono', 'project'),
  galleryItem('lineart-elevation', 'project'),
  // Amenities: clubhouse and landscape renders.
  galleryItem('clubhouse-day', 'amenities'),
  galleryItem('landscape-sitting-area', 'amenities'),
  galleryItem('landscape-play-area', 'amenities'),
  galleryItem('landscape-walkway', 'amenities'),
  // Plans (the same assets the explorer uses — referenced, not duplicated).
  galleryItem('master-plan', 'plans'),
  galleryItem('floor-plan-block-a', 'plans'),
  galleryItem('floor-plan-block-b', 'plans'),
  galleryItem('floor-plan-block-c', 'plans'),
  galleryItem('clubhouse-plan', 'plans'),
  // Location.
  galleryItem('location-map', 'location'),
]

/** The items of one album (or all of them), from the IRA gallery unless another list is given. */
export const itemsFor = (filter, source = GALLERY_ITEMS) =>
  filter === 'all' ? [...source] : source.filter((i) => i.album === filter)

/** Previous / next stop at the ends of an album (no wrap-around). */
export const stepIndex = (index, dir, length) => Math.min(Math.max(index + dir, 0), Math.max(0, length - 1))

/** Smallest variant at least `neededWidthPx` wide, else the largest there is (never upscaled). */
export function variantFor(asset, neededWidthPx) {
  const sorted = [...asset.variants].sort((a, b) => a.width - b.width)
  return sorted.find((v) => v.width >= neededWidthPx) ?? sorted[sorted.length - 1]
}

export const ZOOM_STEPS = [1, 1.5, 2, 3, 4]
export const MAX_ZOOM = 4

/**
 * How far an image can be zoomed while staying sharp: the largest available variant's pixels over
 * the device pixels it fills when fitted. Low-resolution renders therefore barely zoom (or not at
 * all), while plans and the location map go up to MAX_ZOOM.
 */
export function maxZoomFor(asset, displayedWidthCss, dpr) {
  if (displayedWidthCss <= 0) return 1
  const largest = Math.max(...asset.variants.map((v) => v.width))
  return Math.min(MAX_ZOOM, Math.max(1, largest / (displayedWidthCss * dpr)))
}

/** Zoom steps usable for an image: 1 plus every step it can show sharply. */
export const zoomStepsFor = (maxZoom) => ZOOM_STEPS.filter((z) => z <= maxZoom + 1e-6)

/** Fitted size of an image inside a box (object-fit: contain). */
export function fitSize(asset, boxW, boxH) {
  if (boxW <= 0 || boxH <= 0) return { w: 0, h: 0 }
  const aspect = asset.width / asset.height
  const w = Math.min(boxW, boxH * aspect)
  return { w, h: w / aspect }
}
