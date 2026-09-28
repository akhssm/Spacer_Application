/**
 * Camera-fit padding that respects the space actually left for the map. Floating panels are
 * reserved as insets; if they (plus breathing room) would leave too little map, the breathing
 * room shrinks first and then the insets scale down, so a fit never zooms out into a sliver.
 */

/** At least this share of each map dimension stays available for the fitted content. */
export const MIN_VISIBLE = 0.3

export function fitPadding(insets, extra, width, height) {
  const axis = (a, b, size) => {
    if (size <= 0) return [a, b]
    const minVisible = size * MIN_VISIBLE
    // Room left for breathing space once the panels are reserved.
    const spare = size - a - b - minVisible
    if (spare >= 2 * extra) return [a + extra, b + extra]
    if (spare >= 0) return [a + spare / 2, b + spare / 2]
    // Panels alone exceed the budget: shrink them proportionally.
    const scale = Math.max(0, size - minVisible) / Math.max(1, a + b)
    return [a * scale, b * scale]
  }
  const [top, bottom] = axis(insets.top, insets.bottom, height)
  const [left, right] = axis(insets.left, insets.right, width)
  return { top, right, bottom, left }
}
