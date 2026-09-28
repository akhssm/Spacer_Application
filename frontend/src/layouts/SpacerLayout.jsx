import { Outlet, ScrollRestoration } from 'react-router'
import { ScrollToHash } from '@/components/site/ScrollToHash'
import Footer from '@/components/spacer/Footer'
import Navbar from '@/components/spacer/Navbar'
import { THEMES, useDocumentTheme } from '@/hooks/useDocumentTheme'

/** Spacer marketing pages: sticky navbar, scrolling content, footer, in the Spacer theme. */
export function SpacerLayout() {
  useDocumentTheme(THEMES.spacer)

  return (
    // scroll-mt keeps a section's heading clear of the sticky navbar after a jump to #section
    <div className="flex min-h-svh flex-col bg-background text-foreground [&_section[id]]:scroll-mt-16">
      <a
        href="#main"
        className="sr-only z-(--z-toast) rounded-md bg-brand px-4 py-2 text-brand-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
      <ScrollToHash />
    </div>
  )
}
