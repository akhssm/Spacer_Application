import { useState } from 'react'
import { Link } from 'react-router'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ButtonLink from '@/components/ui/ButtonLink'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Logo from '@/components/spacer/Logo'
import { NAV_LINKS, SITE } from '@/data/spacer/siteContent'

const linkClass = 'text-sm text-foreground/75 transition-colors hover:text-brand'

/** Sticky Spacer header: logo, section links (desktop), buy button, and a slide-out menu on phones. */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-(--z-header) border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-324 items-center justify-between gap-6 px-5">
        <Logo showTagline />

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/#pricing" className="hidden sm:inline-flex">
            Buy {SITE.name}
          </ButtonLink>

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
                {NAV_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} className="text-2xl font-bold" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <ButtonLink href="/#pricing" className="mt-4" onClick={() => setMenuOpen(false)}>
                  Buy {SITE.name}
                </ButtonLink>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Navbar
