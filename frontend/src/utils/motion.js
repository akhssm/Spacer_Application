/** Easing curves — keep in sync with `--ease-*` in src/index.css. */
export const ease = {
  outExpo: [0.16, 1, 0.3, 1],
  inOutQuint: [0.83, 0, 0.17, 1],
}

/** Durations in seconds. */
export const duration = {
  fast: 0.18,
  base: 0.35,
  slow: 0.7,
  cinematic: 1.2,
}

export const transition = {
  base: { duration: duration.base, ease: ease.outExpo },
  slow: { duration: duration.slow, ease: ease.outExpo },
  /** Camera-like moves in the explorer (zoom to block, floor change). */
  camera: { duration: duration.cinematic, ease: ease.inOutQuint },
  spring: { type: 'spring', stiffness: 260, damping: 30 },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transition.slow },
}

export const stagger = (step = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: step } },
})
