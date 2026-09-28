import { motion, useReducedMotion } from 'framer-motion'
import { ease, duration } from '@/utils/motion'

/** Fades content up once as it enters the viewport. Static when reduced motion is requested. */
export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: duration.slow, ease: ease.outExpo, delay }}
    >
      {children}
    </Tag>
  )
}
