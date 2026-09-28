import { describe, expect, it } from 'vitest'
import { blocks } from '@/data'
import { getTile, masterPlanGeometry, unitTiles, validateMasterPlanGeometry } from '@/data/masterPlan'

describe('master-plan geometry (derived from brochure p6)', () => {
  it('joins every tile to exactly one flat and vice versa', () => {
    expect(validateMasterPlanGeometry(blocks, masterPlanGeometry)).toEqual([])
    expect(unitTiles).toHaveLength(11 + 11 + 14)
  })

  it('matches the shipped master-plan asset dimensions', () => {
    expect(masterPlanGeometry.image).toEqual({ assetId: 'master-plan', width: 2038, height: 3428 })
  })

  it("maps the printed '12 A' tile to Block C flat 13 (documented exception)", () => {
    const tile = getTile('C', 13)
    expect(tile.label).toBe('12 A')
    expect(tile.stack.exceptions).toContain('block-c-flat-13-label')
    expect(unitTiles.some((t) => t.blockId === 'C' && t.label === '13')).toBe(false)
  })

  it('keeps the clubhouse label as printed on the master plan', () => {
    expect(masterPlanGeometry.clubhouse.label).toBe('18,648 Sft')
  })

  it('detects a tile that does not match the area statement', () => {
    const broken = structuredClone(masterPlanGeometry)
    broken.blocks.B.tiles[0].areaSft += 10
    expect(validateMasterPlanGeometry(blocks, broken).join('\n')).toMatch(/tile prints/)
  })

  it('places Block B above Block A, and Block C to their right', () => {
    const [ax, ay] = masterPlanGeometry.blocks.A.bounds
    const [bx, by] = masterPlanGeometry.blocks.B.bounds
    const [cx] = masterPlanGeometry.blocks.C.bounds
    expect(by).toBeLessThan(ay)
    expect(cx).toBeGreaterThan(Math.max(ax, bx))
  })
})
