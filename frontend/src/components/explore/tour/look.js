/**
 * Look-around maths for the panorama viewer. Pure — unit-tested. Angles in degrees.
 *
 * yaw: 0 = centre of the equirectangular image, positive turns right. pitch: 0 = horizon, +90 up.
 * fov: the HORIZONTAL field of view, so a phone in portrait sees the same room width as a laptop
 * until the vertical field would exceed MAX_VFOV.
 */

export const MIN_FOV = 35
export const MAX_FOV = 135 // wide enough that the vertical cap, not this, limits a laptop screen
export const MAX_VFOV = 100
/** Autorotate speed, degrees per second. */
export const AUTOROTATE_SPEED = 5
/** Degrees per second while an arrow key is held. */
export const KEY_SPEED = 70

const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Wraps a yaw into (-180, 180]. */
export const wrapYaw = (yaw) => {
  const y = ((((yaw + 180) % 360) + 360) % 360) - 180
  return y === -180 ? 180 : y
}

export const clampFov = (fov) => clamp(fov, MIN_FOV, MAX_FOV)

/** Vertical field of view for a horizontal fov at an aspect ratio (width / height), capped at MAX_VFOV. */
export const verticalFov = (hfov, aspect) => Math.min(MAX_VFOV, deg(2 * Math.atan(Math.tan(rad(hfov) / 2) / aspect)))

/** Horizontal fov actually shown once the vertical cap applies (drives the minimap cone). */
export const shownHorizontalFov = (hfov, aspect) =>
  deg(2 * Math.atan(Math.tan(rad(verticalFov(hfov, aspect)) / 2) * aspect))

/** Pitch limit that keeps the view's top/bottom edge from passing the zenith/nadir. */
export const pitchLimit = (vfov) => Math.max(0, 90 - vfov / 2)

export const clampPitch = (pitch, vfov) => clamp(pitch, -pitchLimit(vfov), pitchLimit(vfov))

/**
 * Degrees of turn per pixel dragged, so the image stays under the finger: the vertical field
 * spans the viewport height.
 */
export const degreesPerPixel = (vfov, viewportHeight) => vfov / Math.max(1, viewportHeight)

/** Pinch zoom: fingers apart → narrower field (zoom in). */
export const pinchFov = (startFov, startDistance, distance) =>
  clampFov(startFov * (startDistance / Math.max(1, distance)))

/** Wheel zoom: scroll down → wider field (zoom out). */
export const wheelFov = (fov, deltaY) => clampFov(fov * Math.exp(deltaY * 0.0012))

/** Unit direction for a yaw/pitch in the viewer's world (camera looks down -Z at yaw 0). */
export const direction = (yaw, pitch) => [
  Math.sin(rad(yaw)) * Math.cos(rad(pitch)),
  Math.sin(rad(pitch)),
  -Math.cos(rad(yaw)) * Math.cos(rad(pitch)),
]

/** Fastest throw after a drag, degrees per second. */
export const MAX_THROW = 240

/**
 * Velocity (deg/s) for one pointer move. Coalesced or synthetic pointer events can arrive
 * milliseconds apart, so the interval is floored at one 60 Hz frame and the result capped.
 */
export const throwVelocity = (delta, ms) => clamp(delta / (Math.max(16, ms) / 1000), -MAX_THROW, MAX_THROW)

/** Exponential velocity decay for inertia; returns the velocity after `dt` seconds. */
export const decay = (velocity, dt, rate = 4) => {
  const v = velocity * Math.exp(-rate * dt)
  return Math.abs(v) < 0.5 ? 0 : v
}

/**
 * Direction on the floor plan (degrees clockwise from plan-up) that a panorama yaw faces, given the
 * scene's northOffset (the yaw that faces plan-up).
 */
export const planHeading = (yaw, northOffset) => wrapYaw(yaw - northOffset)

/** SVG path of a view cone at (x, y) with radius r, heading (clockwise from up) and angular width. */
export function conePath(x, y, r, heading, width) {
  const a0 = rad(heading - width / 2)
  const a1 = rad(heading + width / 2)
  const p = (a) => `${(x + r * Math.sin(a)).toFixed(1)} ${(y - r * Math.cos(a)).toFixed(1)}`
  return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${p(a0)} A ${r} ${r} 0 ${width > 180 ? 1 : 0} 1 ${p(a1)} Z`
}
