import { useSyncExternalStore } from 'react'

const SERVER = { width: 1280, height: 800 }

// useSyncExternalStore compares snapshots by reference, so the same object must be
// returned until the viewport actually changes.
let snapshot = SERVER

function subscribe(onChange) {
  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  return () => {
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
  }
}

function getSnapshot() {
  if (snapshot.width !== window.innerWidth || snapshot.height !== window.innerHeight) {
    snapshot = { width: window.innerWidth, height: window.innerHeight }
  }
  return snapshot
}

/**
 * Live viewport size. Camera insets are derived from it, so rotating the device
 * re-frames the plan instead of leaving it fitted to the previous orientation.
 */
export function useViewportSize() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER)
}
