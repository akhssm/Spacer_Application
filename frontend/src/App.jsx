import { RouterProvider } from 'react-router/dom'
import { router } from '@/routes/router'

/** Root component: every page is reached through the route table in src/routes/router.jsx. */
export default function App() {
  return <RouterProvider router={router} />
}
