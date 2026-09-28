import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import { ease } from '@/utils/motion'

const format = (n) => Math.round(n).toLocaleString('en-IN')

/**
 * Counts up to `value` once in view. The DOM always starts (and ends) on the exact brochure
 * figure; the count-up only runs on a visible page, and assistive tech reads the final value.
 */
export function CountUp({ value, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !inView || reduce || document.visibilityState !== 'visible') return
    const settle = () => (el.textContent = format(value))
    const controls = animate(0, value, {
      duration: 1.6,
      ease: ease.outExpo,
      onUpdate: (v) => (el.textContent = format(v)),
      onComplete: settle,
    })
    // If the tab is hidden mid-count, jump to the final figure rather than freeze part-way.
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        controls.stop()
        settle()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      controls.stop()
      settle()
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [inView, reduce, value])

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
