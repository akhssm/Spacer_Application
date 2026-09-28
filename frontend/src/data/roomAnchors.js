import { blocks } from '@/data/blocks'
import { floorPlanGeometry } from '@/data/generated/floorPlanGeometry'
import { roomLabels } from '@/data/generated/roomLabels'
import { roomsByFlat } from '@/data/rooms'

/**
 * Where each printed room sits on its flat: the position of its own printed label on the typical
 * floor plan (p10–12), read by scripts/extract_room_labels.py. Nothing is hand-placed.
 *
 * Every room in src/data/rooms.js is matched to exactly one label of the same kind. Where a flat
 * prints the same name more than once (BEDROOM ×2, TOILET ×3), the printed size under each label
 * decides which is which. Rooms are then given stable keys for linking (e.g. "bedroom-2",
 * "toilet-1"); the ordinals are ours, in the order rooms.js lists them — the brochure numbers none.
 */

/** Classifies a printed room name (or an OCR'd label) by kind. Undefined for anything else. */
export function roomKind(text) {
  const t = text.toUpperCase().replace(/\s+/g, '')
  if (/M\.?BED/.test(t)) return 'master-bedroom'
  if (t.includes('BEDROOM')) return 'bedroom'
  if (t.includes('TOIL')) return 'toilet'
  if (t.includes('LIVING/DINING')) return 'living-dining'
  if (t.includes('LIVING')) return 'living'
  if (t.includes('DINING')) return 'dining'
  if (t.includes('DRAWING')) return 'drawing'
  if (t.includes('KITCHEN')) return 'kitchen'
  if (t.includes('DRESS')) return 'dress'
  if (t.includes('PWR')) return 'powder'
  if (t.includes('WASH') && t.includes('BALCONY')) return 'wash-balcony'
  if (t.includes('WASH')) return 'wash'
  if (t.includes('BALCONY')) return 'balcony'
  return undefined
}

const KIND_LABEL = {
  living: 'Living',
  dining: 'Dining',
  'living-dining': 'Living / dining',
  drawing: 'Drawing',
  kitchen: 'Kitchen',
  'master-bedroom': 'Master bedroom',
  bedroom: 'Bedroom',
  toilet: 'Toilet',
  powder: 'Powder room',
  dress: 'Dress',
  balcony: 'Balcony',
  wash: 'Wash',
  'wash-balcony': 'Wash / balcony',
}

/** Bedrooms count on from the master bedroom (Bedroom 2, 3); toilets and repeats count from 1. */
const FIRST_ORDINAL = { bedroom: 2 }

/** The part of an OCR box that holds `kind`'s word, when OCR merged it with a neighbouring label. */
function nameBox(t) {
  const [x, y, w, h] = t.box
  const text = t.text.toUpperCase()
  const words = [
    'M.BEDROOM',
    'BEDROOM',
    'LIVING/DINING',
    'WASH/BALCONY',
    'LIVING',
    'DINING',
    'DRAWING',
    'KITCHEN',
    'DRESS',
    'TOIL',
    'PWR',
    'WASH',
    'BALCONY',
  ]
  const word = words.find((wd) => text.includes(wd))
  // Vertical labels (balconies, washes) and single-word boxes need no trimming.
  if (!word || h > w || text.trim().length <= word.length + 6) return [x, y, w, h]
  const start = text.indexOf(word)
  const perChar = w / text.length
  return [x + start * perChar, y, word.length * perChar, h]
}

const digits = (s) => s.replace(/[^0-9]/g, '')

/** Longest-common-subsequence similarity of the digits in two printed sizes (OCR drops primes). */
function sizeSimilarity(a, b) {
  const x = digits(a)
  const y = digits(b)
  if (!x.length || !y.length) return 0
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0))
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return (2 * dp[x.length][y.length]) / (x.length + y.length)
}

const isSize = (t) => /\d/.test(t.text) && /X|×|\*/i.test(t.text) && roomKind(t.text) === undefined

/** The printed size directly under a name label, if OCR found one. */
function sizeUnder(name, tokens) {
  const [x, y, w, h] = name
  const cx = x + w / 2
  let best
  let bestDy = Infinity
  for (const t of tokens) {
    if (!isSize(t)) continue
    const [tx, ty, tw] = t.box
    const dy = ty - (y + h * 0.5)
    if (dy < 0 || dy > h * 2.6) continue
    if (Math.abs(tx + tw / 2 - cx) > Math.max(w, tw) * 0.75) continue
    if (dy < bestDy) {
      bestDy = dy
      best = t
    }
  }
  return best
}

function union(a, b) {
  if (!b) return a
  const x = Math.min(a[0], b[0])
  const y = Math.min(a[1], b[1])
  return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y]
}

function permutations(items) {
  if (items.length <= 1) return [items]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  )
}

/** Matches one flat's printed rooms to its OCR'd labels. Pure — unit-tested. */
export function matchRoomAnchors(rooms, tokens, where = 'flat') {
  const errors = []
  const byKind = new Map()
  rooms.forEach((room, index) => {
    const kind = roomKind(room.name)
    if (!kind) return errors.push(`${where}: printed room "${room.name}" has no kind.`)
    byKind.set(kind, [...(byKind.get(kind) ?? []), { index, room }])
  })

  const labels = new Map()
  for (const t of tokens) {
    const kind = roomKind(t.text)
    if (!kind) continue
    const name = nameBox(t)
    labels.set(kind, [...(labels.get(kind) ?? []), { name, size: sizeUnder(name, tokens) }])
  }

  const placed = new Map()
  for (const [kind, printed] of byKind) {
    const found = labels.get(kind) ?? []
    if (found.length !== printed.length) {
      errors.push(`${where}: ${printed.length} printed ${kind} vs ${found.length} labels found on the plan.`)
      continue
    }
    // Same-named rooms: pick the pairing whose printed sizes agree best with the sizes under each label.
    let best = found
    let bestScore = -1
    for (const order of permutations(found)) {
      const score = order.reduce(
        (s, l, i) => s + (printed[i].room.dims && l.size ? sizeSimilarity(printed[i].room.dims, l.size.text) : 0),
        0,
      )
      if (score > bestScore) {
        bestScore = score
        best = order
      }
    }
    printed.forEach(({ index, room }, i) => {
      const box = union(best[i].name, best[i].size?.box)
      placed.set(index, {
        kind,
        index,
        room,
        box,
        anchor: [Math.round(box[0] + box[2] / 2), Math.round(box[1] + box[3] / 2)],
      })
    })
  }

  const counts = new Map()
  const total = (k) => byKind.get(k)?.length ?? 0
  const out = []
  rooms.forEach((_, index) => {
    const p = placed.get(index)
    if (!p) return
    const n = counts.get(p.kind) ?? 0
    counts.set(p.kind, n + 1)
    const numbered = total(p.kind) > 1 || p.kind === 'bedroom' || p.kind === 'toilet'
    const ordinal = (FIRST_ORDINAL[p.kind] ?? 1) + n
    out.push({
      ...p,
      key: numbered ? `${p.kind}-${ordinal}` : p.kind,
      label: numbered ? `${KIND_LABEL[p.kind]} ${ordinal}` : KIND_LABEL[p.kind],
      box: p.box.map(Math.round),
    })
  })
  return { rooms: out, errors }
}

function buildAll(bs, scan) {
  const byFlat = new Map()
  const errors = []
  for (const b of bs) {
    const g = floorPlanGeometry[b.id]
    for (const s of b.stacks) {
      const where = `Block ${b.id} flat ${s.flatNo}`
      const tokens = scan[b.id]?.flats[s.masterPlan.label]
      if (!tokens) {
        errors.push(`${where}: no OCR scan.`)
        continue
      }
      const unit = g.units.find((u) => u.masterPlanLabel === s.masterPlan.label)
      const m = matchRoomAnchors(roomsByFlat[b.id][s.flatNo] ?? [], tokens, where)
      errors.push(...m.errors)
      const [x, y, w, h] = unit.rect
      for (const r of m.rooms)
        if (r.anchor[0] < x - 30 || r.anchor[0] > x + w + 30 || r.anchor[1] < y - 30 || r.anchor[1] > y + h + 30)
          errors.push(`${where}: "${r.label}" label lies outside the flat.`)
      byFlat.set(`${b.id}-${s.flatNo}`, m.rooms)
    }
  }
  return { byFlat, errors }
}

const built = buildAll(blocks, roomLabels)

/** Problems matching printed rooms to plan labels; must be empty (see roomAnchors.test.js). */
export const roomAnchorErrors = built.errors

/** Rooms of one flat with their printed-label positions, in rooms.js order. */
export const getPlanRooms = (blockId, flatNo) => built.byFlat.get(`${blockId}-${flatNo}`) ?? []
