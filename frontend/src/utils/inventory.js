// Helpers for sellable units (a flat on one floor of one tower) and their statuses.

export const STATUS_ORDER = ['available', 'hold', 'sold', 'reserved']

export const STATUS_LABEL = { available: 'Available', hold: 'Hold', sold: 'Sold', reserved: 'Reserved' }

// Tailwind classes, written out in full so Tailwind can find them
export const STATUS_BG = {
  available: 'bg-status-available',
  hold: 'bg-status-hold',
  sold: 'bg-status-sold',
  reserved: 'bg-status-reserved',
}

// The same colours for MapLibre paint, which cannot read CSS variables. Mirrors src/styles/index.css.
export const STATUS_HEX = {
  available: '#4f9a6a',
  hold: '#d9a441',
  sold: '#b5564a',
  reserved: '#4a7fb5',
}

export const emptyCounts = () => ({ available: 0, hold: 0, sold: 0, reserved: 0 })

export function countByStatus(units) {
  const counts = emptyCounts()
  units.forEach((unit) => {
    counts[unit.status] += 1
  })
  return counts
}

// { "B-06": [units sorted by floor, top floor first], ... }
export function unitsByTower(units) {
  const byTower = {}
  units.forEach((unit) => {
    ;(byTower[unit.tower] ??= []).push(unit)
  })
  Object.values(byTower).forEach((list) => list.sort((a, b) => b.floor - a.floor))
  return byTower
}

// The colour a tower gets on the map in status mode: the status most of its
// floors have. Ties go to the earlier entry in STATUS_ORDER.
export function towerStatus(units) {
  if (!units?.length) return null
  const counts = countByStatus(units)
  return STATUS_ORDER.reduce((best, status) => (counts[status] > counts[best] ? status : best))
}

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Unit IDs follow the IRA Towers scheme `{Block}-{FF}{SS}` (see docs/DATA_DECISIONS.md), so a flat
 * has the same ID in the viewer and on the project site: "B-06" on floor 6 becomes "B-0606".
 * `flatNo` overrides the number in the tower's name where the plan labels differ ("C-12A" is flat 13).
 */
export function unitNumber(tower, floor, flatNo) {
  const dash = tower.indexOf('-')
  const prefix = dash === -1 ? '' : tower.slice(0, dash + 1)
  const flat = flatNo != null ? pad2(flatNo) : dash === -1 ? tower : tower.slice(dash + 1)
  return `${prefix}${pad2(floor)}${flat}`
}

// One unit per flat position per floor, for every block that has floors.
// statusFor(tower, floor) decides each unit's status.
export function buildUnits(blocks, plots, statusFor = () => 'available') {
  const units = []
  for (const block of blocks) {
    const towers = plots.filter((plot) => plot.kind !== 'amenity' && plot.zone === block.name)
    for (const tower of towers) {
      for (let floor = 1; floor <= (block.floors ?? 0); floor++) {
        units.push({
          block: block.name,
          tower: tower.number,
          floor,
          number: unitNumber(tower.number, floor, tower.flatNo),
          status: statusFor(tower.number, floor),
        })
      }
    }
  }
  return units
}

function hashOf(text) {
  let hash = 7
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 1000003
  return hash
}

// A fixed pseudo-random spread for demo inventory. Each tower leans towards one status (so the
// map shows towers of every colour) and the rest of its floors are mixed. Same input, same output.
export function sampleStatus(tower, floor) {
  const leaning = STATUS_ORDER[hashOf(tower) % STATUS_ORDER.length]
  const roll = hashOf(`${tower}/${floor}`) % 100
  if (roll < 55) return leaning
  return STATUS_ORDER[roll % STATUS_ORDER.length]
}
