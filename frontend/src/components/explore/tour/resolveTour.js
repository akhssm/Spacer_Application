import { getPlanRooms } from '@/data/roomAnchors'
import { resolveExplore } from '@/components/explore/resolveExplore'
import { parseExplore, paths } from '@/routes/paths'
import { getTourForApartment, sceneMedia } from '@/components/explore/tour/tours'

/** One tour scene placed on this apartment's plan (pin = its printed room label, when it has one). */
/** Binds the sample tour for an apartment's BHK to the rooms printed on its own flat plan. */
export function apartmentTour(blockId, flatNo, tour) {
  const rooms = getPlanRooms(blockId, flatNo)
  const used = new Set()
  const stops = tour.scenes.map((scene) => {
    const planRoom = scene.planRooms.map((k) => rooms.find((r) => r.key === k && !used.has(r.key))).find(Boolean)
    if (planRoom) used.add(planRoom.key)
    return { scene, planRoom, media: sceneMedia(tour.id, scene.key) }
  })
  return { tour, stops, roomsWithoutScene: rooms.filter((r) => !used.has(r.key)) }
}

/**
 * Resolves /ira-towers/explore/:block/:floor/:apartment?view=tour&room=… . Pure, like resolveExplore:
 *  - an invalid block / floor / apartment falls back exactly as the explorer does;
 *  - a non-canonical apartment URL is canonicalised, keeping the tour and room;
 *  - a tour needs an apartment — block or floor level goes back to that level with a notice;
 *  - an apartment without a tour goes back to the apartment with a notice;
 *  - no room → the first room; an unknown room → the first room with a notice.
 */
export function resolveTour(params) {
  const explore = resolveExplore(params)
  if (explore.kind === 'fallback') return { kind: 'redirect', to: explore.to, notice: explore.message }
  if (explore.kind === 'canonical') {
    const { blockId, floor, apartmentId } = parseExplore(explore.to)
    if (!apartmentId)
      return { kind: 'redirect', to: explore.to, notice: 'Choose an apartment to open its virtual tour.' }
    return {
      kind: 'redirect',
      to: paths.tour({ blockId, floor, apartmentId, room: params.room?.toLowerCase() || undefined }),
    }
  }
  const { block, floor, apartment } = explore
  if (!apartment)
    return {
      kind: 'redirect',
      to: paths.explore({ blockId: block?.id, floor: floor?.level }),
      notice: 'Choose an apartment to open its virtual tour.',
    }

  const tour = getTourForApartment(apartment)
  const bound = tour && apartmentTour(apartment.blockId, apartment.flatNo, tour)
  const home = paths.explore({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id })
  if (!bound || !bound.stops.length)
    return { kind: 'redirect', to: home, notice: `No virtual tour is available for ${apartment.id} yet.` }

  const at = (room) =>
    paths.tour({ blockId: apartment.blockId, floor: apartment.level, apartmentId: apartment.id, room })
  const first = bound.stops[0].scene.key
  const room = params.room ?? undefined
  if (!room) return { kind: 'redirect', to: at(first) }
  const stop = bound.stops.find((s) => s.scene.key === room.toLowerCase())
  if (!stop)
    return {
      kind: 'redirect',
      to: at(first),
      notice: `Room "${room}" is not part of this tour — showing the ${bound.stops[0].scene.title.toLowerCase()}.`,
    }
  if (stop.scene.key !== room) return { kind: 'redirect', to: at(stop.scene.key) }
  return { kind: 'ok', apartment, tour: bound, stop }
}

/** Neighbouring room in strip order (wraps). */
export const stepStop = (stops, key, dir) => {
  const i = stops.findIndex((s) => s.scene.key === key)
  return stops[(i + dir + stops.length) % stops.length]
}
