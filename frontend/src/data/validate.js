import { dataExceptions } from '@/data/exceptions'
import { APARTMENT_ID_PATTERN } from '@/data/generate'

/**
 * Cross-checks the transcribed data and the generated inventory against the brochure's own
 * headline figures. A mismatch is only acceptable when the affected record carries a
 * documented exception; otherwise it is an error.
 */
export function validateProjectData(project, blocks, inventory) {
  const errors = []
  const knownMismatches = []
  const h = project.headline

  const mismatch = (code, message, exception, hasIt) => {
    if (exception && hasIt && exception in dataExceptions) knownMismatches.push({ code, message, exception })
    else errors.push({ code, message })
  }
  const check = (ok, code, message) => {
    if (!ok) errors.push({ code, message })
  }

  // --- Blocks & declared totals (p3) ---------------------------------------------------
  check(blocks.length === h.blockCount, 'block-count', `Expected ${h.blockCount} blocks, found ${blocks.length}.`)

  const declaredTotal = blocks.reduce((sum, b) => sum + b.declaredUnits.value, 0)
  check(
    declaredTotal === h.totalUnits,
    'declared-total',
    `Declared block units sum to ${declaredTotal}; brochure headline is ${h.totalUnits}.`,
  )

  for (const block of blocks) {
    const generated = inventory.apartments.filter((a) => a.blockId === block.id).length
    if (generated !== block.declaredUnits.value) {
      mismatch(
        'block-unit-count',
        `Block ${block.id}: declared ${block.declaredUnits.value} units, typical floor plan generates ${generated}.`,
        'block-c-unit-count',
        block.exceptions?.includes('block-c-unit-count') ?? false,
      )
    }
  }

  const generatedTotal = inventory.apartments.length
  if (generatedTotal !== h.totalUnits) {
    const explained = blocks.every(
      (b) =>
        inventory.apartments.filter((a) => a.blockId === b.id).length === b.declaredUnits.value ||
        b.exceptions?.includes('block-c-unit-count'),
    )
    mismatch(
      'total-unit-count',
      `Generated ${generatedTotal} apartments; brochure headline is ${h.totalUnits}.`,
      'block-c-unit-count',
      explained,
    )
  }

  // --- Levels: "C+S+10" (p3) ------------------------------------------------------------
  const floorsMatch = /^C\+S\+(\d+)$/.exec(h.floorsLabel)
  for (const block of blocks) {
    const { cellar, stilt, residentialFloors } = block.levels.value
    check(
      floorsMatch !== null && cellar === 1 && stilt === 1 && residentialFloors === Number(floorsMatch[1]),
      'levels',
      `Block ${block.id} levels do not match "${h.floorsLabel}".`,
    )
  }

  // --- Unit templates ---------------------------------------------------------------------
  const allStacks = blocks.flatMap((b) => b.stacks.map((s) => ({ block: b, stack: s })))
  const areas = allStacks.map(({ stack }) => stack.areaSft)
  const [minSft, maxSft] = h.unitSizeRangeSft
  check(
    Math.min(...areas) === minSft && Math.max(...areas) === maxSft,
    'size-range',
    `Unit sizes span ${Math.min(...areas)}–${Math.max(...areas)} sft; brochure headline is ${minSft}–${maxSft}.`,
  )
  check(
    allStacks.every(({ stack }) => stack.bhk === 2 || stack.bhk === 3),
    'bhk',
    `Only 2 and 3 BHK units are allowed ("${h.configurations}").`,
  )

  for (const block of blocks) {
    const nos = block.stacks.map((s) => s.flatNo)
    check(new Set(nos).size === nos.length, 'stack-unique', `Block ${block.id} has duplicate flat numbers.`)
    check(
      nos.every((n, i) => n === i + 1),
      'stack-sequence',
      `Block ${block.id} flat numbers are not 1…${nos.length} in order.`,
    )

    for (const s of block.stacks) {
      // Area statement vs master plan tile — two independent brochure transcriptions.
      check(
        s.masterPlan.areaSft === s.areaSft,
        'masterplan-area',
        `Block ${block.id} flat ${s.flatNo}: area statement ${s.areaSft} sft vs master plan ${s.masterPlan.areaSft} sft.`,
      )
      if (s.masterPlan.label !== String(s.flatNo).padStart(2, '0')) {
        mismatch(
          'masterplan-label',
          `Block ${block.id} flat ${s.flatNo}: master plan labels this position "${s.masterPlan.label}".`,
          'block-c-flat-13-label',
          s.exceptions?.includes('block-c-flat-13-label') ?? false,
        )
      }
    }
  }

  // --- Clubhouse (p3/p21 vs p6) --------------------------------------------------------
  check(
    project.clubhouse.areaSft === h.clubhouseAreaSft,
    'clubhouse-headline',
    `Clubhouse area ${project.clubhouse.areaSft} does not equal headline ${h.clubhouseAreaSft}.`,
  )
  if (project.clubhouse.masterPlanAreaSft !== project.clubhouse.areaSft) {
    mismatch(
      'clubhouse-area',
      `Clubhouse: headline ${project.clubhouse.areaSft} sft vs master plan ${project.clubhouse.masterPlanAreaSft} sft.`,
      'clubhouse-area',
      project.clubhouse.exceptions.includes('clubhouse-area'),
    )
  }

  // --- Generated inventory ---------------------------------------------------------------
  const ids = inventory.apartments.map((a) => a.id)
  check(new Set(ids).size === ids.length, 'apartment-id-unique', 'Apartment IDs are not unique.')
  check(
    ids.every((id) => APARTMENT_ID_PATTERN.test(id)),
    'apartment-id-format',
    'Apartment IDs must match the provisional {Block}-{FF}{SS} format.',
  )
  check(
    inventory.apartments.every((a) => a.idIsProvisional),
    'apartment-id-provisional',
    'Every apartment ID must be flagged provisional.',
  )
  check(
    inventory.apartments.every((a) => a.availability === 'unknown' && a.price === 'unknown'),
    'commercial-unknown',
    'Availability and price must be unknown — the brochure publishes neither.',
  )

  const floorApartmentIds = inventory.floors.flatMap((f) => f.apartmentIds)
  check(
    floorApartmentIds.length === ids.length && floorApartmentIds.every((id) => ids.includes(id)),
    'floor-apartments',
    'Floors and apartments are out of sync.',
  )

  // --- Exceptions are well-formed and actually used -----------------------------------
  for (const ex of Object.values(dataExceptions)) {
    check(
      ex.statements.length >= 2,
      'exception-statements',
      `Exception ${ex.id} needs at least two brochure statements.`,
    )
  }
  const referenced = new Set([
    ...blocks.flatMap((b) => b.exceptions ?? []),
    ...allStacks.flatMap(({ stack }) => stack.exceptions ?? []),
    ...project.clubhouse.exceptions,
  ])
  for (const id of Object.keys(dataExceptions)) {
    check(referenced.has(id), 'exception-unused', `Exception ${id} is documented but not attached to any record.`)
  }

  return { errors, knownMismatches }
}
