import { Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { resolveTour } from '@/components/explore/tour/resolveTour'
import { TourView } from '@/components/explore/tour/TourView'

/**
 * /explore/:block/:floor/:apartment?view=tour&room=… — resolved by resolveTour. Every non-canonical
 * or invalid URL is replaced (with a notice when something was not found); a valid one opens the tour.
 * Loaded lazily from ExplorePage, so none of the tour ships with the explorer itself.
 */
export default function TourRoute() {
  const params = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const r = resolveTour({
    blockId: params.blockId,
    floor: params.floor,
    apartmentId: params.apartmentId,
    room: search.get('room'),
  })
  if (r.kind === 'redirect') {
    const kept = location.state?.tourReturn
    return <Navigate to={r.to} replace state={{ tourReturn: kept, notice: r.notice }} />
  }
  // One viewer per apartment; rooms change inside it (cross-fade, same WebGL context).
  return <TourView key={r.apartment.id} resolution={r} />
}
