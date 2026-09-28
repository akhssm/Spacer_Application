import { describe, expect, it } from 'vitest'
import { project } from '@/data'
import { masterPlanGeometry } from '@/data/masterPlan'
import {
  ENTRANCE_ANCHOR_PX,
  GEOREF,
  METRES_PER_PIXEL,
  PLACEMENT_LABEL,
  QR_PIN,
  ROTATION_DEG,
  distanceMetres,
  planRectToRing,
  planToLngLat,
} from '@/components/explore/map/georef'
import { SITE_OUTLINE_PX, planPolygonArea } from '@/components/explore/map/siteOutline'

const ACRE_M2 = 4046.8564224

describe('georeferencing constants (brochure-derived, indicative)', () => {
  it('anchors the QR pin from brochure p22 to the entrance', () => {
    expect(QR_PIN).toEqual([78.3800556, 17.5108889])
    expect(ENTRANCE_ANCHOR_PX).toEqual([1320, 3290])
    expect(planToLngLat(ENTRANCE_ANCHOR_PX)).toEqual(QR_PIN)
  })

  it('derives the scale from the 3-acre site area (p3) and the traced outline', () => {
    expect(project.headline.landAreaAcres).toBe(3)
    const areaPx = Math.abs(planPolygonArea(SITE_OUTLINE_PX))
    expect(areaPx).toBe(4803100)
    expect(Math.sqrt((3 * ACRE_M2) / areaPx)).toBeCloseTo(METRES_PER_PIXEL, 4)
  })

  it('is north-up (p6 compass) and labelled as not surveyed', () => {
    expect(ROTATION_DEG).toBe(0)
    expect(PLACEMENT_LABEL).toBe('Indicative placement · Not surveyed')
  })
})

describe('planToLngLat', () => {
  it('maps plan up to north and plan right to east', () => {
    const [lng0, lat0] = planToLngLat([1000, 1000])
    const [lngUp, latUp] = planToLngLat([1000, 900])
    const [lngRight, latRight] = planToLngLat([1100, 1000])
    expect(latUp).toBeGreaterThan(lat0)
    expect(lngUp).toBeCloseTo(lng0, 10)
    expect(lngRight).toBeGreaterThan(lng0)
    expect(latRight).toBeCloseTo(lat0, 10)
  })

  it('preserves ground distances at the stated scale', () => {
    const a = planToLngLat([0, 0])
    expect(distanceMetres(a, planToLngLat([1000, 0]))).toBeCloseTo(1000 * METRES_PER_PIXEL, 1)
    expect(distanceMetres(a, planToLngLat([0, 1000]))).toBeCloseTo(1000 * METRES_PER_PIXEL, 1)
  })

  it('matches the first-pass coordinates of the planning analysis', () => {
    const [tl] = planRectToRing([0, 0, masterPlanGeometry.image.width, masterPlanGeometry.image.height])
    expect(tl[0]).toBeCloseTo(78.3794306, 6)
    expect(tl[1]).toBeCloseTo(17.5123836, 6)
    const [x, y, w, h] = masterPlanGeometry.blocks.A.bounds
    const [lng, lat] = planToLngLat([x + w / 2, y + h / 2])
    expect(lng).toBeCloseTo(78.3797213, 6)
    expect(lat).toBeCloseTo(17.5112682, 6)
  })

  it('applies rotation about the anchor', () => {
    const rotated = { ...GEOREF, rotationDeg: 90 }
    // With the plan's "up" pointing east, a point above the anchor on the plan lies east of it.
    const [lng, lat] = planToLngLat([ENTRANCE_ANCHOR_PX[0], ENTRANCE_ANCHOR_PX[1] - 100], rotated)
    expect(lng).toBeGreaterThan(QR_PIN[0])
    expect(lat).toBeCloseTo(QR_PIN[1], 10)
  })

  it('returns closed rings', () => {
    const ring = planRectToRing([10, 20, 30, 40])
    expect(ring).toHaveLength(5)
    expect(ring[0]).toEqual(ring[4])
  })
})
