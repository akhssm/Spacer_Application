import { Outlet, ScrollRestoration } from 'react-router'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ScrollToHash } from '@/components/site/ScrollToHash'
import { THEMES, useDocumentTheme } from '@/hooks/useDocumentTheme'

/** IRA Towers site pages: sticky header, scrolling content, footer, in the IRA Towers theme. */
export function SiteLayout() {
  useDocumentTheme(THEMES.iraTowers)

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only z-(--z-toast) rounded-md bg-accent px-4 py-2 text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
      <ScrollToHash />
    </div>
  )
}
