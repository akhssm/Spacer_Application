import { brochureAssets } from '@/data'
import { flatCropBox, floorPlanGeometry } from '@/data/floorPlan'
import { getRooms, roomDisplayName } from '@/data/rooms'
import { cn } from '@/utils/cn'

/**
 * The flat cut out of its block's typical floor plan — an exact crop of the brochure drawing
 * (region from the floor-plan geometry), not a redraw. `children` draw on top, in plan pixels.
 */
export function FlatPlanCrop({ blockId, flatNo, className, children }) {
  const g = floorPlanGeometry[blockId]
  const box = flatCropBox(blockId, flatNo)
  if (!box) return null
  const img = brochureAssets[g.assetId]
  const src = img.variants[img.variants.length - 1].src
  return (
    <svg
      viewBox={box.join(' ')}
      role="img"
      aria-label={`Flat ${String(flatNo).padStart(2, '0')} on the ${img.alt.toLowerCase()} (brochure p${g.page})`}
      className={cn('block h-auto w-full rounded-lg bg-white', className)}
    >
      <image href={src} x={0} y={0} width={g.width} height={g.height} preserveAspectRatio="none" />
      {children}
    </svg>
  )
}

/** Room labels exactly as printed on the plan, with a plain-language name where abbreviated. */
export function RoomList({ blockId, flatNo, className }) {
  const rooms = getRooms(blockId, flatNo)
  const page = floorPlanGeometry[blockId].page
  if (!rooms.length) return null
  return (
    <div className={className}>
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left text-xs text-white/50">
          Rooms as printed on the typical floor plan (p{page})
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Room</th>
            <th scope="col">Size as printed</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r, i) => {
            const friendly = roomDisplayName(r.name)
            return (
              <tr key={`${r.name}-${i}`} className="border-b border-white/5 last:border-0">
                <th scope="row" className="py-1.5 pr-3 font-normal text-white/85">
                  {friendly === r.name ? (
                    r.name
                  ) : (
                    <>
                      {friendly} <span className="text-white/40">({r.name})</span>
                    </>
                  )}
                </th>
                <td className="py-1.5 text-right font-numeric text-white">
                  {r.dims ?? <span className="text-white/35">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[0.7rem] leading-relaxed text-white/40">
        Sizes are reproduced exactly as printed on the brochure plan (feet ′, inches ″).
      </p>
    </div>
  )
}
