import { Link } from 'react-router'
import { cn } from '@/utils/cn'
import { site } from '@/config/site'
import { paths } from '@/routes/paths'

/** Typographic stand-in for the IRA Towers logo until the official SVG is supplied. */
export function Wordmark({ className }) {
  return (
    <Link
      to={paths.home()}
      aria-label={`${site.projectName} by ${site.developer} — home`}
      className={cn('touch-target group inline-flex items-baseline gap-2 leading-none', className)}
    >
      <span className="font-numeric text-2xl font-semibold tracking-tight text-sun-400">ira</span>
      <span className="font-display text-lg tracking-[0.18em] uppercase">Towers</span>
      <span className="eyebrow hidden text-[0.625rem] text-muted-foreground sm:inline">by {site.developer}</span>
    </Link>
  )
}
