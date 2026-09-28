import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { PhasePlaceholder } from '@/components/site/PhasePlaceholder'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { IRA_BASE, paths } from '@/routes/paths'

/** 404 for both sites: it sends visitors back to the home of the site they were on. */
export default function NotFoundPage() {
  const inIraSite = useLocation().pathname.startsWith(`${IRA_BASE}/`)
  useDocumentTitle('Page not found')

  return (
    <PhasePlaceholder phase="404" title="This page doesn’t exist">
      <Button
        nativeButton={false}
        render={<Link to={inIraSite ? paths.home() : paths.spacerHome()} />}
        size="lg"
        className="touch-target mt-2 px-4"
      >
        Back to home
      </Button>
    </PhasePlaceholder>
  )
}
