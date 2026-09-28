// Reference only: the IRA Towers domain model as TypeScript types, kept from the original
// Spacer_app source. The app is JavaScript; these describe the shapes in frontend/src/data.

/**
 * Domain model: Project → Block → Floor → Apartment.
 *
 * Every brochure fact carries a `source` page reference into docs/Latest_Broucher.pdf.
 * Conflicting brochure values are never resolved in code — they are kept side by side and
 * linked to a `DataException` (see src/data/exceptions.ts and docs/DATA_DECISIONS.md).
 */

/** Brochure page reference (1-based, as printed in the PDF viewer). */
export type SourceRef = { page: number; note?: string }

export type Sourced<T> = { value: T; source: SourceRef }

// ---------------------------------------------------------------------------------------
// Commercial status — the brochure publishes neither, so both are always "unknown" for now.
// The UI shows "Enquire" for unknown. Wider unions arrive only with a real data source.
// ---------------------------------------------------------------------------------------
export type Availability = "unknown"
export type Price = "unknown"

// ---------------------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------------------
export type DataExceptionId = "block-c-unit-count" | "block-c-flat-13-label" | "clubhouse-area"

export interface DataException {
  id: DataExceptionId
  title: string
  /** The conflicting brochure statements, each with its page. */
  statements: { label: string; value: string | number; source: SourceRef }[]
  /** What the data layer does about it (from docs/DATA_DECISIONS.md). */
  decision: string
}

// ---------------------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------------------
export type BlockId = "A" | "B" | "C"
export type Bhk = 2 | 3
export type Facing = "East" | "West"

/**
 * One flat position repeated on every typical floor ("stack"), from the block's
 * area statement. Identical on all residential floors.
 */
export interface UnitStack {
  /** Flat number as printed in the area statement, e.g. 1 … 14. */
  flatNo: number
  bhk: Bhk
  facing: Facing
  areaSft: number
  /** What the master plan tile (p6) prints for this position, kept verbatim for cross-checks. */
  masterPlan: { label: string; areaSft: number }
  exceptions?: DataExceptionId[]
}

export interface BlockLevels {
  cellar: number
  stilt: number
  residentialFloors: number
}

export interface Block {
  id: BlockId
  name: string
  /** Unit count as declared by the brochure (p3). Not derived. */
  declaredUnits: Sourced<number>
  levels: Sourced<BlockLevels>
  stacks: UnitStack[]
  areaStatementSource: SourceRef
  floorPlanAssetId: string
  exceptions?: DataExceptionId[]
}

/** Generated from a block's stacks — one per residential floor. */
export interface Floor {
  id: string // e.g. "A-01"
  blockId: BlockId
  /** 1-based residential floor above the stilt. Numbering is provisional (not in brochure). */
  level: number
  apartmentIds: string[]
}

/** Generated: one per stack per residential floor. */
export interface Apartment {
  /** Provisional ID `{Block}-{FF}{SS}`, e.g. "A-0101". See docs/DATA_DECISIONS.md. */
  id: string
  idIsProvisional: true
  blockId: BlockId
  floorId: string
  level: number
  flatNo: number
  bhk: Bhk
  facing: Facing
  areaSft: number
  availability: Availability
  price: Price
  exceptions?: DataExceptionId[]
}

// ---------------------------------------------------------------------------------------
// Project-level content
// ---------------------------------------------------------------------------------------
export interface SpecificationGroup {
  title: string
  items: string[]
  source: SourceRef
}

export interface ProximityCategory {
  id: "connectivity" | "hospitals" | "colleges" | "schools" | "workplaces" | "recreation"
  title: string
  places: string[]
}

export interface Chapter {
  title: string
  lines: [string, string, string]
  source: SourceRef
}

export interface Project {
  id: "ira-towers"
  name: string
  tagline: string
  developer: string
  rera: Sourced<string>
  approvals: Sourced<string[]>
  location: {
    locality: string
    city: string
    state: string
    pincode: string
    addressLines: string[]
    source: SourceRef
  }
  positioning: Sourced<string>
  headline: {
    landAreaAcres: number
    blockCount: number
    floorsLabel: string
    configurations: string
    unitSizeRangeSft: [number, number]
    totalUnits: number
    clubhouseAreaSft: number
    luxuryApartmentsPercent: number
    security: string
    source: SourceRef
  }
  descriptions: Sourced<string>[]
  siteFeatures: Sourced<string[]>
  clubhouse: {
    /** Headline value (p3, p21). */
    areaSft: number
    /** Value printed on the master plan (p6) — see exception "clubhouse-area". */
    masterPlanAreaSft: number
    amenities: string[]
    descriptions: string[]
    source: SourceRef
    exceptions: DataExceptionId[]
  }
  amenities: Sourced<string[]>
  specifications: SpecificationGroup[]
  proximity: { categories: ProximityCategory[]; source: SourceRef }
  contact: {
    phones: { label: string; href: string }[]
    emails: { sales: string; info: string }
    website: string
    source: SourceRef
  }
  chapters: Chapter[]
  disclaimer: Sourced<string>
}

// ---------------------------------------------------------------------------------------
// Master-plan geometry (generated by scripts/extract_master_plan_geometry.py)
// ---------------------------------------------------------------------------------------
/** [x, y, width, height] in master-plan image pixels. */
export type PixelRect = [number, number, number, number]

export interface MasterPlanTile {
  /** Tile label exactly as printed on p6 (e.g. "06", "12 A"). */
  label: string
  /** Area exactly as printed on the tile. */
  areaSft: number
  rect: PixelRect
  /** Source label box in PDF points, for traceability. */
  pdf: number[]
}

export interface MasterPlanGeometry {
  image: { assetId: string; width: number; height: number }
  source: { page: number; clip: number[]; dpi: number }
  blocks: Record<BlockId, { bounds: PixelRect; tiles: MasterPlanTile[] }>
  clubhouse: { rect: PixelRect; label: string }
}

// ---------------------------------------------------------------------------------------
// Typical floor-plan geometry (generated by scripts/extract_floor_plan_geometry.py)
// ---------------------------------------------------------------------------------------
export interface FloorPlanUnit {
  /** Joins to UnitStack.masterPlan.label (same stack order as the master plan). */
  masterPlanLabel: string
  rect: PixelRect
  /** The printed "BHK / SFT" badge. */
  badge: number[]
  /** The printed flat-number tag. */
  tag: number[]
}

export interface FloorPlanGeometry {
  [blockId: string]: {
    assetId: string
    page: number
    width: number
    height: number
    corridor: number[]
    units: FloorPlanUnit[]
  }
}

/** One room label exactly as printed on the typical floor plan (p10–12). */
export interface Room {
  /** Printed name, e.g. "M.BEDROOM", "4'6\" WIDE BALCONY". */
  name: string
  /** Printed dimensions, verbatim (feet/inches as on the plan); absent when the plan gives none. */
  dims?: string
}

// ---------------------------------------------------------------------------------------
// Printed room labels (generated by scripts/extract_room_labels.py)
// ---------------------------------------------------------------------------------------
/** One OCR'd text box on a typical floor plan, verbatim. `box` is [x, y, width, height] in plan pixels. */
export interface RoomLabelToken {
  text: string
  box: number[]
}

export interface RoomLabelScan {
  [blockId: string]: {
    assetId: string
    page: number
    /** Keyed by the flat's master-plan label (as in FloorPlanGeometry). */
    flats: Record<string, RoomLabelToken[]>
  }
}

// ---------------------------------------------------------------------------------------
// Assets (manifest generated by scripts/extract_brochure_assets.py)
// ---------------------------------------------------------------------------------------
export type AssetCategory = "brand" | "render" | "plan" | "location" | "lifestyle" | "decorative"
export type AssetRights = "project" | "verify" | "stock-unverified" | "decorative"

export interface BrochureAsset {
  id: string
  category: AssetCategory
  page: number
  alt: string
  rights: AssetRights
  format: "webp" | "svg"
  width: number
  height: number
  lowResolution: boolean
  hasAlpha?: boolean
  note?: string
  variants: readonly { src: string; width: number; height: number; bytes: number }[]
  source: { xref: number } | { clip: readonly number[]; dpi: number | null }
}
