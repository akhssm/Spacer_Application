import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Wordmark } from '@/components/site/Wordmark'
import { primaryNav } from '@/config/site'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'

const linkClass = 'text-sm tracking-wide text-foreground/70 transition-colors hover:text-foreground'

// NavLink ignores the hash, so "/ira-towers#amenities" would be marked active (and aria-current) on "/ira-towers".
// Section links therefore use a plain Link; only real routes get active styling.
function PrimaryLink({ to, children }) {
  if (to.includes('#')) {
    return (
      <Link to={to} className={linkClass}>
        {children}
      </Link>
    )
  }
  return (
    <NavLink to={to} end className={({ isActive }) => cn(linkClass, isActive && 'text-foreground')}>
      {children}
    </NavLink>
  )
}

/** True while the Home hero (a full-viewport dark section) sits behind the header. */
function useOverHero() {
  const isHome = useLocation().pathname === paths.home()
  const [over, setOver] = useState(true)
  useEffect(() => {
    // Plain passive listener keeps animation libraries out of the shared bundle.
    const update = () => setOver(window.scrollY < window.innerHeight * 0.85)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return isHome && over
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const overHero = useOverHero()

  return (
    <header
      className={cn(
        'sticky top-0 z-(--z-header) h-(--header-h) border-b transition-[background-color,border-color,color] duration-500',
        overHero
          ? 'dark border-transparent bg-transparent text-foreground'
          : 'bg-background/80 text-foreground backdrop-blur-md',
      )}
    >
      <div className="container-page flex h-full items-center justify-between gap-6">
        {/* The hero shows the full logo; fade the small wordmark in once it scrolls away. */}
        <Wordmark className={cn('transition-opacity duration-500', overHero && 'pointer-events-none opacity-0')} />

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {primaryNav.map((item) => (
            <PrimaryLink key={item.to} to={item.to}>
              {item.label}
            </PrimaryLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link to={paths.home('contact')} />}
            size="lg"
            className="touch-target px-4"
          >
            Enquire
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon-lg" className="touch-target lg:hidden" />}
              aria-label="Open menu"
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-10 flex flex-col gap-5">
                {primaryNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="font-display text-2xl"
                    onClick={() => setMenuOpen(false)}
                    end
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
