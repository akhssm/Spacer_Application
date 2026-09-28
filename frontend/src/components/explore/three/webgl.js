/** Returns a reason string when WebGL is not usable, otherwise null. */
export function webglUnavailableReason() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    return gl ? null : 'WebGL is not available in this browser'
  } catch {
    return 'WebGL could not be initialised'
  }
}
