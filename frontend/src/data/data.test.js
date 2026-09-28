import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  apartments,
  blocks,
  brochureAssets,
  dataExceptions,
  floors,
  getApartment,
  getApartmentsForFloor,
  getBlock,
  getFloor,
  project,
} from '@/data'
import { generateInventory } from '@/data/generate'
import { validateProjectData } from '@/data/validate'

const report = validateProjectData(project, blocks, { floors: [...floors], apartments: [...apartments] })

describe('validation against brochure totals', () => {
  it('has no unexpected errors', () => {
    expect(report.errors).toEqual([])
  })

  it('reports exactly the documented brochure inconsistencies', () => {
    const byException = (id) => report.knownMismatches.filter((m) => m.exception === id).map((m) => m.code)
    expect(byException('block-c-unit-count').sort()).toEqual(['block-unit-count', 'total-unit-count'])
    expect(byException('block-c-flat-13-label')).toEqual(['masterplan-label'])
    expect(byException('clubhouse-area')).toEqual(['clubhouse-area'])
    expect(report.knownMismatches).toHaveLength(4)
  })

  it('flags an undocumented mismatch as an error', () => {
    const tampered = blocks.map((b) => (b.id === 'A' ? { ...b, declaredUnits: { ...b.declaredUnits, value: 111 } } : b))
    const r = validateProjectData(project, tampered, generateInventory(tampered))
    expect(r.errors.map((e) => e.code)).toEqual(expect.arrayContaining(['declared-total', 'block-unit-count']))
  })

  it('flags a transcription mismatch between area statement and master plan', () => {
    const tampered = blocks.map((b) =>
      b.id === 'B' ? { ...b, stacks: b.stacks.map((s) => (s.flatNo === 6 ? { ...s, areaSft: 1680 } : s)) } : b,
    )
    const r = validateProjectData(project, tampered, generateInventory(tampered))
    expect(r.errors.map((e) => e.code)).toContain('masterplan-area')
  })
})

describe('brochure headline figures (p3)', () => {
  it('keeps declared counts exactly as printed', () => {
    expect(blocks.map((b) => [b.id, b.declaredUnits.value])).toEqual([
      ['A', 110],
      ['B', 110],
      ['C', 154],
    ])
    expect(project.headline.totalUnits).toBe(374)
  })

  it('keeps both clubhouse figures', () => {
    expect(project.headline.clubhouseAreaSft).toBe(18600)
    expect(project.clubhouse.areaSft).toBe(18600)
    expect(project.clubhouse.masterPlanAreaSft).toBe(18648)
  })
})

describe('generated inventory', () => {
  it('generates only what the typical floor plans support', () => {
    const count = (id) => apartments.filter((a) => a.blockId === id).length
    expect(count('A')).toBe(110) // 11 × 10
    expect(count('B')).toBe(110) // 11 × 10
    expect(count('C')).toBe(140) // 14 × 10 — declared 154 is a documented exception, not padded
    expect(apartments).toHaveLength(360)
    expect(floors).toHaveLength(30)
  })

  it('uses provisional {Block}-{FF}{SS} IDs', () => {
    expect(apartments[0].id).toBe('A-0101')
    expect(getApartment('B-1011')).toMatchObject({ blockId: 'B', level: 10, flatNo: 11, areaSft: 1265 })
    expect(getApartment('C-0514')).toMatchObject({ bhk: 3, facing: 'West', areaSft: 1590 })
    expect(apartments.every((a) => a.idIsProvisional)).toBe(true)
    expect(getApartment('C-1115')).toBeUndefined()
  })

  it('keeps availability and price unknown everywhere', () => {
    expect(new Set(apartments.map((a) => a.availability))).toEqual(new Set(['unknown']))
    expect(new Set(apartments.map((a) => a.price))).toEqual(new Set(['unknown']))
  })

  it('carries the 12A/13 exception onto every Block C flat 13', () => {
    const flat13 = apartments.filter((a) => a.blockId === 'C' && a.flatNo === 13)
    expect(flat13).toHaveLength(10)
    expect(flat13.every((a) => a.exceptions?.includes('block-c-flat-13-label'))).toBe(true)
    const stack = getBlock('C').stacks.find((s) => s.flatNo === 13)
    expect(stack.masterPlan.label).toBe('12 A')
  })

  it('matches area-statement BHK and facing mix', () => {
    const mix = (id) => {
      const s = getBlock(id).stacks
      return {
        twoBhk: s.filter((x) => x.bhk === 2).length,
        threeBhk: s.filter((x) => x.bhk === 3).length,
        east: s.filter((x) => x.facing === 'East').length,
        west: s.filter((x) => x.facing === 'West').length,
      }
    }
    expect(mix('A')).toEqual({ twoBhk: 9, threeBhk: 2, east: 6, west: 5 })
    expect(mix('B')).toEqual({ twoBhk: 9, threeBhk: 2, east: 6, west: 5 })
    expect(mix('C')).toEqual({ twoBhk: 0, threeBhk: 14, east: 8, west: 6 })
  })

  it('links floors and apartments', () => {
    const floor = getFloor('A-03')
    expect(getApartmentsForFloor(floor).map((a) => a.id)).toEqual(
      Array.from({ length: 11 }, (_, i) => `A-03${String(i + 1).padStart(2, '0')}`),
    )
  })
})

describe('exceptions', () => {
  it('mirrors docs/DATA_DECISIONS.md', () => {
    expect(Object.keys(dataExceptions).sort()).toEqual([
      'block-c-flat-13-label',
      'block-c-unit-count',
      'clubhouse-area',
    ])
  })
})

describe('asset manifest', () => {
  const assets = Object.values(brochureAssets)

  it('references every block floor plan', () => {
    for (const b of blocks) expect(brochureAssets).toHaveProperty(b.floorPlanAssetId)
  })

  it('serves only optimised web formats from public/assets/brochure', () => {
    for (const a of assets) {
      expect(a.variants.length).toBeGreaterThan(0)
      for (const v of a.variants) {
        expect(v.src).toMatch(/^\/assets\/brochure\/[a-z]+\/[a-z0-9-]+\.(webp|svg)$/)
        expect(v.width).toBeLessThanOrEqual(a.width) // never upscaled
      }
    }
  })

  it('gives every non-decorative asset alt text and a brochure page', () => {
    for (const a of assets) {
      expect(a.page).toBeGreaterThanOrEqual(1)
      expect(a.page).toBeLessThanOrEqual(24)
      if (a.rights !== 'decorative') expect(a.alt.length).toBeGreaterThan(0)
    }
  })

  it('has every variant file on disk with the recorded size', () => {
    for (const a of assets) {
      for (const v of a.variants) {
        const file = resolve(process.cwd(), 'public', v.src.slice(1))
        expect(existsSync(file), v.src).toBe(true)
        expect(statSync(file).size).toBe(v.bytes)
      }
    }
  })

  it('never ships the master-plan base raster with stale labels', () => {
    expect(brochureAssets['master-plan'].source).not.toHaveProperty('xref')
  })
})
