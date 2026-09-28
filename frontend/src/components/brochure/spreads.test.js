import { describe, expect, it } from 'vitest'
import {
  clampIndex,
  desktopSpreads,
  mobileSequence,
  pageLabel,
  spreadIndexOf,
  spreadLabel,
  spreadPages,
} from '@/components/brochure/spreads'
import { BROCHURE_PDF } from '@/components/brochure/pages.generated'
import { BROCHURE_PAGE_COUNT, brochurePages, pickVariant } from '@/components/brochure/pages'

describe('desktop spreads (24-page brochure)', () => {
  const spreads = desktopSpreads(24)

  it('puts the cover alone, pairs 2–3 … 22–23, and the back cover alone', () => {
    expect(spreads).toHaveLength(13)
    expect(spreads[0]).toEqual({ right: 1 })
    for (let i = 1; i <= 11; i++) expect(spreads[i]).toEqual({ left: 2 * i, right: 2 * i + 1 })
    expect(spreads[12]).toEqual({ left: 24 })
  })

  it('keeps the spreads that share an image across the spine together', () => {
    expect(spreads).toContainEqual({ left: 4, right: 5 })
    expect(spreads).toContainEqual({ left: 20, right: 21 })
  })

  it('shows every page exactly once, in order', () => {
    expect(spreads.flatMap(spreadPages)).toEqual(mobileSequence(24))
  })

  it('labels the boundaries and spreads', () => {
    expect(spreadLabel(spreads[0], 24)).toBe('Front cover')
    expect(spreadLabel(spreads[2], 24)).toBe('Pages 4–5 of 24')
    expect(spreadLabel(spreads[12], 24)).toBe('Back cover')
  })

  it('finds the spread for any page, falling back to the cover', () => {
    expect(spreadIndexOf(spreads, 1)).toBe(0)
    expect(spreadIndexOf(spreads, 2)).toBe(1)
    expect(spreadIndexOf(spreads, 3)).toBe(1)
    expect(spreadIndexOf(spreads, 23)).toBe(11)
    expect(spreadIndexOf(spreads, 24)).toBe(12)
    expect(spreadIndexOf(spreads, 99)).toBe(0)
  })
})

describe('other page counts', () => {
  it('ends on a lone right page when the count is odd', () => {
    expect(desktopSpreads(5)).toEqual([{ right: 1 }, { left: 2, right: 3 }, { left: 4, right: 5 }])
    expect(desktopSpreads(1)).toEqual([{ right: 1 }])
    expect(desktopSpreads(0)).toEqual([])
    expect(spreadLabel({ left: 4 }, 5)).toBe('Page 4 of 5')
  })
})

describe('mobile sequence and navigation bounds', () => {
  it('is one page at a time, 1 … 24', () => {
    expect(mobileSequence(24)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(pageLabel(1, 24)).toBe('Front cover')
    expect(pageLabel(12, 24)).toBe('Page 12 of 24')
    expect(pageLabel(24, 24)).toBe('Back cover')
  })

  it('clamps navigation at the first and last page', () => {
    expect(clampIndex(-1, 13)).toBe(0)
    expect(clampIndex(0, 13)).toBe(0)
    expect(clampIndex(12, 13)).toBe(12)
    expect(clampIndex(13, 13)).toBe(12)
    expect(clampIndex(5, 0)).toBe(0)
  })
})

describe('rendered brochure pages', () => {
  it('covers every PDF page with 900 and 1600 px variants', () => {
    expect(BROCHURE_PAGE_COUNT).toBe(BROCHURE_PDF.pageCount)
    expect(brochurePages.map((p) => p.page)).toEqual(mobileSequence(24))
    for (const p of brochurePages) {
      const heights = p.variants.map((v) => v.height)
      expect(heights, `p${p.page}`).toEqual(expect.arrayContaining([900, 1600]))
      expect(
        p.variants.every(
          (v) => v.src === `/assets/brochure/pages/p${String(p.page).padStart(2, '0')}-${v.height}.webp`,
        ),
      ).toBe(true)
    }
  })

  it('has 3200 px variants exactly on the approved detail pages', () => {
    const zoomable = brochurePages.filter((p) => p.zoomable).map((p) => p.page)
    expect(zoomable).toEqual([6, 10, 11, 12, 20, 21, 22, 24])
    for (const p of brochurePages)
      expect(
        p.variants.some((v) => v.height === 3200),
        `p${p.page}`,
      ).toBe(p.zoomable)
  })

  it('picks the smallest variant that is sharp enough, capped at the largest available', () => {
    const p6 = brochurePages.find((p) => p.page === 6)
    const p5 = brochurePages.find((p) => p.page === 5)
    expect(pickVariant(p6, 700).height).toBe(900)
    expect(pickVariant(p6, 1200).height).toBe(1600)
    expect(pickVariant(p6, 2400).height).toBe(3200)
    expect(pickVariant(p5, 2400).height).toBe(1600)
  })

  it("describes every page, including the covers and the brochure's own chapter titles", () => {
    expect(brochurePages[0].label).toMatch(/^Front cover/)
    expect(brochurePages[23].label).toMatch(/^Back cover — Contact details and disclaimer/)
    expect(brochurePages[5].label).toBe('Page 6 — Master plan')
    expect(brochurePages[9].label).toBe('Page 10 — Block A typical floor plan and area statement')
    expect(brochurePages[4].label).toMatch(/^Page 5 — Freedom/)
    for (const p of brochurePages) expect(p.label.length).toBeGreaterThan(10)
  })
})
