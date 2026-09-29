import { describe, expect, it } from 'vitest'
import { apartments, getApartment } from '@/data'
import { getProject, listProjects } from '@/services/projects'
import { countByStatus, sampleStatus, towerStatus, unitNumber, unitsByTower } from '@/utils/inventory'

describe('Spacer projects service', () => {
  it('lists every project as a card', () => {
    const cards = listProjects()
    expect(cards.map((c) => c.shortCode)).toEqual(['ira-towers', 'demo'])
    expect(cards.find((c) => c.shortCode === 'demo').unitCount).toBe(24)
    expect(cards.find((c) => c.shortCode === 'ira-towers')).toMatchObject({
      unitCount: 36,
      website: '/ira-towers/story',
    })
  })

  it('finds a project by code, case-insensitively, and nothing for an unknown code', () => {
    expect(getProject('DEMO').name).toBe('Green Meadows')
    expect(getProject('nope')).toBeUndefined()
  })
})

describe('Ira Towers in the viewer agrees with the Ira Towers site', () => {
  const project = getProject('ira-towers')

  it('has one unit per apartment, with the same IDs', () => {
    expect(project.units).toHaveLength(apartments.length)
    for (const unit of project.units) expect(getApartment(unit.number), unit.number).toBeDefined()
  })

  it('numbers the flat labelled "12 A" on the master plan as flat 13', () => {
    expect(project.units.filter((u) => u.tower === 'C-12A').map((u) => u.number)).toContain('C-0513')
  })

  it('takes type, facing and area from the brochure data', () => {
    const flat = project.layout.plots.find((p) => p.number === 'A-01')
    const apartment = getApartment('A-0101')
    expect(flat).toMatchObject({ bhk: `${apartment.bhk} BHK`, facing: apartment.facing, areaSqFt: apartment.areaSft })
    expect(flat.rooms.length).toBeGreaterThan(0)
  })

  it('marks its availability as sample data', () => {
    expect(project.inventory).toBe('sample')
  })
})

describe('inventory helpers', () => {
  it('builds unit numbers in the {Block}-{FF}{SS} scheme', () => {
    expect(unitNumber('B-06', 6)).toBe('B-0606')
    expect(unitNumber('C-12A', 10, 13)).toBe('C-1013')
  })

  it('gives the same sample status for the same flat every time', () => {
    expect(sampleStatus('B-06', 3)).toBe(sampleStatus('B-06', 3))
  })

  it('counts statuses and picks the most common one per tower', () => {
    const units = [
      { tower: 'A-01', floor: 1, status: 'sold' },
      { tower: 'A-01', floor: 2, status: 'sold' },
      { tower: 'A-01', floor: 3, status: 'available' },
    ]
    expect(countByStatus(units)).toEqual({ available: 1, hold: 0, sold: 2, reserved: 0 })
    expect(towerStatus(unitsByTower(units)['A-01'])).toBe('sold')
    expect(unitsByTower(units)['A-01'].map((u) => u.floor)).toEqual([3, 2, 1])
  })
})
