import { Link, Outlet } from 'react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/site/Wordmark'
import { paths } from '@/routes/paths'
import { THEMES, useDocumentTheme } from '@/hooks/useDocumentTheme'

/**
 * Immersive explorer: full-viewport, dark "night" theme, no page scroll or footer.
 * The canvas fills the screen; chrome floats above it in fixed layers.
 */
export function ExplorerLayout() {
  useDocumentTheme(THEMES.iraTowers)

  return (
    <div className="dark relative h-dvh overflow-hidden bg-background text-foreground">
      {/* Fade behind the floating header keeps it legible when the plan is zoomed underneath. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-(--z-overlay) h-36 bg-gradient-to-b from-navy-950 via-navy-950/70 to-transparent"
      />
      <header className="pointer-events-none absolute inset-x-0 top-0 z-(--z-header) flex items-center justify-between p-4 sm:p-6">
        <Wordmark className="pointer-events-auto" />
        <Button
          nativeButton={false}
          render={<Link to={paths.viewer('ira-towers')} />}
          variant="secondary"
          size="lg"
          className="touch-target pointer-events-auto px-3"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to site
        </Button>
      </header>
      <main className="absolute inset-0 z-(--z-canvas)">
        <Outlet />
      </main>
    </div>
  )
}
