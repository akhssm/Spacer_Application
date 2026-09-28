import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/cn'

// Marketing-size call to action on top of the shared Button styles. "primary" lifts and glows in
// the theme's brand colour on hover (lime on Spacer pages), "dark" is the quiet outlined twin.
const VARIANTS = {
  primary:
    'bg-brand text-brand-foreground hover:-translate-y-0.5 hover:bg-brand hover:brightness-108 hover:glow-brand motion-reduce:hover:translate-y-0',
  dark: 'border-border bg-background text-foreground hover:border-brand hover:bg-background',
}

/**
 * A link that looks like a button. `to` navigates inside the app; `href` is for anchors on the
 * same page (#pricing) and outside links (mailto:, https://wa.me/…).
 */
function ButtonLink({ href, to, variant = 'primary', className, children, ...rest }) {
  const classes = cn(
    buttonVariants({ size: 'lg' }),
    'h-auto rounded-md px-6 py-3 text-sm font-bold duration-300',
    VARIANTS[variant],
    className,
  )
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  )
}

export default ButtonLink
