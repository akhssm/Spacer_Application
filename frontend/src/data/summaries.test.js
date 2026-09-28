import { describe, expect, it } from 'vitest'
import { blocks, project } from '@/data'
import { formatRange, summariseBlocks, summariseConfigurations } from '@/data/summaries'

describe('block summaries', () => {
  const summaries = summariseBlocks(blocks)

  it('derive sizes and mix from the area statements', () => {
    expect(summaries.map((s) => [s.id, s.bhk, s.sizeRangeSft, s.flatsPerTypicalFloor])).toEqual([
      ['A', [2, 3], [1150, 1515], 11],
      ['B', [2, 3], [1265, 1670], 11],
      ['C', [3], [1590, 1840], 14],
    ])
  })

  it('report declared (not generated) unit counts', () => {
    expect(summaries.map((s) => s.declaredUnits)).toEqual([110, 110, 154])
  })
})

describe('configuration summaries', () => {
  it('span the brochure headline size range', () => {
    const configs = summariseConfigurations(blocks)
    expect(configs).toEqual([
      { bhk: 2, sizeRangeSft: [1150, 1295], blocks: ['A', 'B'] },
      { bhk: 3, sizeRangeSft: [1480, 1840], blocks: ['A', 'B', 'C'] },
    ])
    expect(Math.min(...configs.map((c) => c.sizeRangeSft[0]))).toBe(project.headline.unitSizeRangeSft[0])
    expect(Math.max(...configs.map((c) => c.sizeRangeSft[1]))).toBe(project.headline.unitSizeRangeSft[1])
  })

  it('formats ranges', () => {
    expect(formatRange([1150, 1295])).toBe('1,150–1,295')
    expect(formatRange([1840, 1840])).toBe('1,840')
  })
})
