import { Outlet } from 'react-router'
import { THEMES, useDocumentTheme } from '@/hooks/useDocumentTheme'

/** The Spacer project viewer: one full-screen map, no page scroll, in the Spacer theme. */
export function ViewerLayout() {
  useDocumentTheme(THEMES.spacer)

  return (
    <div className="h-svh overflow-hidden bg-background text-foreground">
      <Outlet />
    </div>
  )
}
