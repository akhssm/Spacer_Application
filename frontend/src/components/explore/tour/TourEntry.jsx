import { Link } from 'react-router'
import { ViewIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { getTourForApartment } from '@/components/explore/tour/tours'

/**
 * "Virtual tour" entry for an apartment (explorer detail panel and map panel). Opens the sample
 * tour for its BHK type; `tourReturn` lets "Exit tour" go back to exactly where the visitor was.
 */
export function TourEntry({ apartment: a, className }) {
  const tour = getTourForApartment(a)
  if (!tour) return null
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Button
        nativeButton={false}
        render={
          <Link
            to={paths.tour({ blockId: a.blockId, floor: a.level, apartmentId: a.id })}
            state={{ tourReturn: true }}
          />
        }
        variant="outline"
        className="h-11 w-full justify-start border-sun-400/50 bg-sun-400/10 px-3 text-white hover:bg-sun-400/20"
      >
        <ViewIcon data-icon="inline-start" className="text-sun-400" />
        Virtual tour · step inside
      </Button>
      <p className="text-[0.7rem] text-white/45">
        360° sample {tour.bhk} BHK interior{tour.media === 'placeholder' ? ' — placeholder images for now' : ''}.
        Representative, not this apartment's final design.
      </p>
    </div>
  )
}
