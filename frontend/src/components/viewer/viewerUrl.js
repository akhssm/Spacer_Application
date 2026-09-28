/**
 * The viewer's selection in the URL: /p/ira-towers?block=A&tower=A-01&floor=4.
 *   block  the block filter (Block A); written by the block's `id` when it has one, else its name
 *   tower  one tower of that block, by its plot number ("A-01": one flat stack, its own building)
 *   floor  a floor of THAT tower — a floor never exists without its tower
 * The same `block` / `floor` names the IRA location map uses. Anything invalid is dropped, from the
 * first bad part on. Amenities and panels stay out of the URL.
 */

const INT = /^\d{1,3}$/

const blockKey = (block) => block.id ?? block.name

const none = { block: null, tower: null, floor: null }

export function parseViewerSearch(search, blocks, plots) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const blockParam = params.get('block')
  const towerParam = params.get('tower')
  const floorParam = params.get('floor')

  const byKey = blockParam && blocks.find((b) => String(blockKey(b)).toUpperCase() === blockParam.toUpperCase())
  const tower =
    towerParam &&
    plots.find(
      (p) =>
        p.kind !== 'amenity' &&
        p.number.toUpperCase() === towerParam.toUpperCase() &&
        blocks.some((b) => b.name === p.zone),
    )
  // A tower names its own block; without one, the block parameter decides
  const block = tower ? blocks.find((b) => b.name === tower.zone) : byKey
  if (!block) return none
  if (!tower) return { ...none, block: block.name }

  const floor = floorParam !== null && INT.test(floorParam) ? Number(floorParam) : null
  const valid = floor !== null && floor >= 1 && floor <= (block.floors ?? 0)
  return { block: block.name, tower: tower.number, floor: valid ? floor : null }
}

/** "", "?block=A", "?block=A&tower=A-01" or "?block=A&tower=A-01&floor=4": the canonical query. */
export function viewerSearch({ block, tower, floor }, blocks) {
  const found = block ? blocks.find((b) => b.name === block) : undefined
  if (!found) return ''
  const params = [['block', blockKey(found)]]
  if (tower) {
    params.push(['tower', tower])
    if (floor != null) params.push(['floor', String(floor)])
  }
  return `?${new URLSearchParams(params).toString()}`
}
