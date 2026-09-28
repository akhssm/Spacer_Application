const pad2 = (n) => String(n).padStart(2, '0')

/** The IRA Towers project site is mounted under this prefix; the Spacer platform owns "/". */
export const IRA_BASE = '/ira-towers'

export const EXPLORE_VIEWS = ['site', 'plan', '3d']

/** Default explorer view: the typical floor plan once a floor is chosen, otherwise the site plan. */
export const defaultExploreView = (floor) => (floor === undefined ? 'site' : 'plan')

/** URL builders so links never hand-assemble route strings. */
export const paths = {
  /** Spacer platform landing page. */
  spacerHome: () => '/',
  /** Spacer project viewer, e.g. /p/demo. */
  viewer: (shortCode) => `/p/${encodeURIComponent(shortCode)}`,

  /** IRA Towers project site. `section` is an in-page anchor such as "clubhouse". */
  home: (section) => (section ? `${IRA_BASE}#${section}` : IRA_BASE),
  apartments: () => `${IRA_BASE}/apartments`,
  /** Satellite location map, optionally with its ?block=&flat=&floor= selection query. */
  map: (search = '') => `${IRA_BASE}/explore/map${search}`,
  /**
   * Explorer URL: /ira-towers/explore/:block/:floor/:apartment[?view=site|plan|3d], e.g.
   * /ira-towers/explore/A/03/A-0305. `floor` is the provisional residential level (1–10). `view` is
   * only written when it differs from the default for that level, so every state has one canonical URL.
   */
  explore: (target = {}) => {
    const { blockId, floor, apartmentId, view } = target
    const base = `${IRA_BASE}/explore`
    // Without a block only the site and 3D views exist (the floor plan needs a block).
    if (!blockId) return view === '3d' ? `${base}?view=3d` : base
    const query = view && view !== defaultExploreView(floor) ? `?view=${view}` : ''
    if (floor === undefined) return `${base}/${blockId}${query}`
    if (!apartmentId) return `${base}/${blockId}/${pad2(floor)}${query}`
    return `${base}/${blockId}/${pad2(floor)}/${apartmentId}${query}`
  },
  /**
   * Virtual tour of one apartment: /ira-towers/explore/A/03/A-0305?view=tour&room=kitchen. A separate
   * view on the apartment's own explorer URL — deliberately not one of EXPLORE_VIEWS, so the
   * site / plan / 3D switchers are untouched. Without `room` the tour opens on its first room.
   */
  tour: (target) => {
    const { blockId, floor, apartmentId, room } = target
    const tour = `?view=${TOUR_VIEW}${room ? `&room=${encodeURIComponent(room)}` : ''}`
    return `${IRA_BASE}/explore/${blockId}/${pad2(floor)}/${apartmentId}${tour}`
  },
}

/**
 * Reads the block / floor / apartment segments back out of an explorer URL built by
 * `paths.explore` (the inverse of it, ignoring any query).
 */
export function parseExplore(to) {
  const rest = to.split('?')[0].slice(`${IRA_BASE}/explore`.length)
  const [blockId, floor, apartmentId] = rest.split('/').filter(Boolean)
  return { blockId, floor: floor ? Number(floor) : undefined, apartmentId }
}

/** The `view` value that opens the virtual tour (see paths.tour). */
export const TOUR_VIEW = 'tour'
