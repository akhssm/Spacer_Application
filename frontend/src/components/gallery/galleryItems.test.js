import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brochureAssets } from '@/data'
import {
  EXCLUDED_CATEGORIES,
  EXCLUDED_IDS,
  EXCLUDED_RIGHTS,
  GALLERY_ALBUMS,
  GALLERY_ITEMS,
  fitSize,
  galleryItem,
  itemsFor,
  maxZoomFor,
  stepIndex,
  variantFor,
  zoomStepsFor,
} from '@/components/gallery/galleryItems'

// Vitest runs from the project root, which holds public/.
const publicFile = (src) => resolve(process.cwd(), 'public', src.replace(/^\//, ''))

describe('gallery items', () => {
  it('uses only existing brochure assets whose files are on disk', () => {
    for (const item of GALLERY_ITEMS) {
      expect(brochureAssets[item.id], item.id).toBeDefined()
      for (const v of item.asset.variants) expect(existsSync(publicFile(v.src)), v.src).toBe(true)
    }
  })

  it('never includes excluded stock, lifestyle, brand, decorative or layer assets', () => {
    for (const item of GALLERY_ITEMS) {
      expect(EXCLUDED_RIGHTS).not.toContain(item.asset.rights)
      expect(EXCLUDED_CATEGORIES).not.toContain(item.asset.category)
      expect(EXCLUDED_IDS).not.toContain(item.id)
    }
    // …and refuses them if someone tries to add one.
    const stock = Object.keys(brochureAssets).filter((id) => brochureAssets[id].rights === 'stock-unverified')
    expect(stock.length).toBeGreaterThan(0)
    for (const id of stock) expect(() => galleryItem(id, 'project')).toThrow(/excluded/)
    for (const id of [
      'ira-towers-logo',
      'tg-rera-badge',
      'palm-leaf',
      'location-qr',
      'entrance-day-sky',
      'interior-living',
    ])
      expect(() => galleryItem(id, 'project')).toThrow()
  })

  it('has no duplicate asset ids', () => {
    const ids = GALLERY_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has five albums, each non-empty, and 'All' holds everything", () => {
    expect(GALLERY_ALBUMS.map((a) => a.id)).toEqual(['all', 'project', 'amenities', 'plans', 'location'])
    for (const a of GALLERY_ALBUMS) expect(itemsFor(a.id).length, a.id).toBeGreaterThan(0)
    expect(itemsFor('all')).toHaveLength(GALLERY_ITEMS.length)
    const perAlbum = GALLERY_ALBUMS.filter((a) => a.id !== 'all').reduce((n, a) => n + itemsFor(a.id).length, 0)
    expect(perAlbum).toBe(GALLERY_ITEMS.length)
  })

  it('filters albums by their own items only', () => {
    for (const a of GALLERY_ALBUMS.filter((x) => x.id !== 'all'))
      for (const i of itemsFor(a.id)) expect(i.album).toBe(a.id)
    expect(itemsFor('location').map((i) => i.id)).toEqual(['location-map'])
  })

  it('labels every render as an artistic impression, and nothing else', () => {
    for (const i of GALLERY_ITEMS) expect(i.impression, i.id).toBe(i.asset.category === 'render')
    expect(itemsFor('project').every((i) => i.impression)).toBe(true)
    expect(itemsFor('amenities').every((i) => i.impression)).toBe(true)
    expect(itemsFor('plans').some((i) => i.impression)).toBe(false)
  })

  it('flags the three landscape renders as pending confirmation', () => {
    const pending = GALLERY_ITEMS.filter((i) => i.rights === 'pending-confirmation').map((i) => i.id)
    expect(pending.sort()).toEqual(['landscape-play-area', 'landscape-sitting-area', 'landscape-walkway'])
    for (const i of GALLERY_ITEMS)
      expect(i.rights).toBe(i.asset.rights === 'verify' ? 'pending-confirmation' : 'project')
  })

  it("puts the master plan, three floor plans and clubhouse plan in Plans — the explorer's own assets", () => {
    expect(itemsFor('plans').map((i) => i.id)).toEqual([
      'master-plan',
      'floor-plan-block-a',
      'floor-plan-block-b',
      'floor-plan-block-c',
      'clubhouse-plan',
    ])
    for (const i of itemsFor('plans')) expect(i.asset.category).toBe('plan')
  })
})

describe('gallery navigation and zoom helpers', () => {
  it('stops at the first and last item', () => {
    expect(stepIndex(0, -1, 16)).toBe(0)
    expect(stepIndex(0, 1, 16)).toBe(1)
    expect(stepIndex(15, 1, 16)).toBe(15)
    expect(stepIndex(3, -1, 1)).toBe(0)
  })

  it('picks the smallest sharp-enough variant and never beyond the largest', () => {
    const a = brochureAssets['clubhouse-day']
    expect(variantFor(a, 400).width).toBe(480)
    expect(variantFor(a, 1000).width).toBe(1600)
    expect(variantFor(a, 5000).width).toBe(2073)
  })

  it("limits zoom by each image's own resolution", () => {
    // A low-resolution render fitted at ~450 CSS px cannot zoom sharply on a 2× screen.
    expect(maxZoomFor(brochureAssets['aerial-overview'], 450, 2)).toBe(1)
    expect(zoomStepsFor(maxZoomFor(brochureAssets['aerial-overview'], 450, 2))).toEqual([1])
    // Plans and the location map zoom usefully.
    expect(maxZoomFor(brochureAssets['floor-plan-block-a'], 300, 1)).toBe(4)
    expect(maxZoomFor(brochureAssets['master-plan'], 420, 1)).toBe(4)
    expect(maxZoomFor(brochureAssets['location-map'], 800, 1)).toBe(3)
    expect(zoomStepsFor(3)).toEqual([1, 1.5, 2, 3])
    expect(maxZoomFor(brochureAssets['master-plan'], 0, 1)).toBe(1)
  })

  it('fits images inside the stage', () => {
    const plan = brochureAssets['floor-plan-block-a'] // tall
    const fit = fitSize(plan, 1000, 600)
    expect(fit.h).toBeCloseTo(600, 6)
    expect(fit.w).toBeLessThan(1000)
    const wide = fitSize(brochureAssets['elevation-mono'], 800, 800)
    expect(wide.w).toBeCloseTo(800, 6)
  })
})
