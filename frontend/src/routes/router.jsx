import { createBrowserRouter } from 'react-router'
import { ExplorerLayout } from '@/layouts/ExplorerLayout'
import { SiteLayout } from '@/layouts/SiteLayout'
import { SpacerLayout } from '@/layouts/SpacerLayout'
import { ViewerLayout } from '@/layouts/ViewerLayout'
import { RouteFallback } from '@/routes/RouteFallback'
import { IRA_BASE, IRA_SHORT_CODE } from '@/routes/paths'

/** Route modules are code-split: maps, Three.js and the tour load only on the pages that use them. */
const page = (load) => async () => ({
  Component: (await load()).default,
})

/** IRA Towers' project viewer, served at /ira-towers rather than under /p/. */
const iraViewer = async () => {
  const { default: ViewerPage } = await import('@/pages/spacer/ViewerPage')
  return { Component: () => <ViewerPage shortCode={IRA_SHORT_CODE} /> }
}

/**
 *   /                                   Spacer landing page
 *   /p/:shortCode                       Spacer project viewer (e.g. /p/demo; /p/ira-towers redirects)
 *   /ira-towers                         IRA Towers home: its project viewer (satellite map, 3D towers)
 *   /ira-towers/story                   IRA Towers brochure storytelling page
 *   /ira-towers/apartments              every apartment, filterable, with side-by-side comparison
 *   /ira-towers/explore/map             satellite location map
 *   /ira-towers/explore/:block?/:floor?/:apartment?[?view=site|plan|3d|tour]
 *                                       2D master plan, typical floor plans, schematic 3D, virtual tour
 */
export const router = createBrowserRouter([
  {
    Component: SpacerLayout,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, lazy: page(() => import('@/pages/spacer/HomePage')) },
      { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
    ],
  },
  {
    path: 'p/:shortCode',
    Component: ViewerLayout,
    HydrateFallback: RouteFallback,
    children: [{ index: true, lazy: page(() => import('@/pages/spacer/ViewerPage')) }],
  },
  {
    path: IRA_BASE,
    Component: ViewerLayout,
    HydrateFallback: RouteFallback,
    children: [{ index: true, lazy: iraViewer }],
  },
  {
    path: IRA_BASE,
    Component: SiteLayout,
    HydrateFallback: RouteFallback,
    children: [
      { path: 'story', lazy: page(() => import('@/pages/ira-towers/HomePage')) },
      { path: 'apartments', lazy: page(() => import('@/pages/ira-towers/ApartmentsPage')) },
      { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
    ],
  },
  {
    path: `${IRA_BASE}/explore`,
    Component: ExplorerLayout,
    HydrateFallback: RouteFallback,
    children: [
      // Satellite location map. A static segment outranks the dynamic block route below.
      { path: 'map', lazy: page(() => import('@/pages/ira-towers/MapExplorerPage')) },
      {
        path: ':blockId?/:floor?/:apartmentId?',
        lazy: page(() => import('@/pages/ira-towers/ExplorePage')),
      },
    ],
  },
])
