import { describe, expect, it } from 'vitest'
import { apartments } from '@/data'
import {
  DEFAULT_FILTERS,
  filterApartments,
  filtersToSearch,
  parseFilters,
  sortApartments,
  visibleApartments,
} from '@/components/apartments/apartmentQuery'

describe('apartment filters in the URL', () => {
  it('reads valid values and ignores invalid ones', () => {
    expect(parseFilters('?block=c&bhk=3&facing=West&floor=5&sort=area-desc&q=c05')).toEqual({
      block: 'C',
      bhk: '3',
      facing: 'West',
      floor: '5',
      sort: 'area-desc',
      q: 'c05',
    })
    expect(parseFilters('?block=D&bhk=4&facing=North&floor=11&sort=price')).toEqual(DEFAULT_FILTERS)
    expect(parseFilters('?floor=0')).toEqual(DEFAULT_FILTERS)
  })

  it('writes one canonical query, leaving defaults out', () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('')
    expect(filtersToSearch({ ...DEFAULT_FILTERS, block: 'A', floor: '3' })).toBe('?block=A&floor=3')
    const filters = { ...DEFAULT_FILTERS, bhk: '2', sort: 'floor-desc', q: 'b06' }
    expect(parseFilters(filtersToSearch(filters))).toEqual(filters)
  })
})

describe('filtering and sorting', () => {
  it('lists every generated apartment with no filters', () => {
    expect(filterApartments(apartments, DEFAULT_FILTERS)).toHaveLength(apartments.length)
    expect(apartments).toHaveLength(360)
  })

  it('combines filters', () => {
    const list = filterApartments(apartments, { ...DEFAULT_FILTERS, block: 'C', bhk: '3', floor: '5' })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((a) => a.blockId === 'C' && a.bhk === 3 && a.level === 5)).toBe(true)
  })

  it('matches the apartment number however it is typed', () => {
    for (const q of ['C-0509', 'c0509', 'c 0509']) {
      expect(filterApartments(apartments, { ...DEFAULT_FILTERS, q }).map((a) => a.id)).toEqual(['C-0509'])
    }
  })

  it('sorts by area and floor, with the apartment number breaking ties', () => {
    const byArea = sortApartments(apartments, 'area-desc')
    expect(byArea[0].areaSft).toBe(Math.max(...apartments.map((a) => a.areaSft)))
    const top = visibleApartments(apartments, { ...DEFAULT_FILTERS, block: 'A', sort: 'floor-desc' })
    expect(top[0]).toMatchObject({ id: 'A-1001', level: 10 })
  })
})
