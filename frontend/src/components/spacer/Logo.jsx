import { Link } from 'react-router'
import { SITE } from '@/data/spacer/siteContent'

// Four plots arranged as a diamond, plus the site name. Used in the navbar and footer.
function Logo({ showTagline = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3" aria-label={`${SITE.name} home`}>
      <svg viewBox="0 0 28 28" className="size-7 rotate-45" aria-hidden="true">
        <rect x="2" y="2" width="11" height="11" rx="2" className="fill-brand" />
        <rect x="15" y="2" width="11" height="11" rx="2" className="fill-brand/45" />
        <rect x="2" y="15" width="11" height="11" rx="2" className="fill-brand/45" />
        <rect x="15" y="15" width="11" height="11" rx="2" className="fill-brand/80" />
      </svg>
      <span className="text-2xl font-bold uppercase tracking-wider">{SITE.name}</span>
      {showTagline && (
        <span className="hidden text-[11px] uppercase tracking-wide text-foreground/90 sm:inline">{SITE.tagline}</span>
      )}
    </Link>
  )
}

export default Logo
