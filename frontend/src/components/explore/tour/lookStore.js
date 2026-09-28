/**
 * Where the panorama camera is looking, shared between the WebGL canvas (writer, per frame) and the
 * minimap cone (reader) without re-rendering the tour on every frame.
 */

export function createLookStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set: (next) => {
      state = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
