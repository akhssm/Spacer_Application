import { blocks, project } from '@/data'
import { brochurePageSources } from '@/components/brochure/pages.generated'

/**
 * Brochure pages for the flipbook: rendered WebP variants (scripts/render_brochure_pages.py) plus a
 * short text description per page for assistive technology — most pages carry their text inside
 * images. Descriptions come from existing brochure data where it names the page; otherwise they
 * only state what kind of page it is. Nothing here alters or replaces brochure content.
 *
 * LICENSING: the rendered pages are INTERNAL / LOCAL USE ONLY until V4 Ventures confirms the
 * licences for the stock photography they contain.
 */

/** Generated per page by the render script. */
const chapterTitle = (page) => project.chapters.find((c) => c.source.page === page)

/** What each page is, from the brochure data that cites it (source pages in src/data). */
const KNOWN = {
  [project.headline.source.page]: 'Project highlights',
  6: 'Master plan',
  ...Object.fromEntries(
    blocks.map((b) => [b.areaStatementSource.page, `${b.name} typical floor plan and area statement`]),
  ),
  [project.clubhouse.source.page]: 'Clubhouse',
  [project.amenities.source.page]: 'Amenities and features',
  20: 'Specifications',
  [project.proximity.source.page]: 'Location map and proximity',
  24: 'Contact details and disclaimer',
}

function describe(page, count) {
  const chapter = chapterTitle(page)
  const what = [chapter && `${chapter.title} — ${chapter.lines.join(' ')}`, KNOWN[page]].filter(Boolean).join('. ')
  const role = page === 1 ? 'Front cover' : page === count ? 'Back cover' : `Page ${page}`
  return what ? `${role} — ${what}` : `${role} — artistic impression`
}

export const brochurePages = brochurePageSources.map((p) => ({
  ...p,
  label: describe(p.page, brochurePageSources.length),
}))

export const BROCHURE_PAGE_COUNT = brochurePages.length

export const getBrochurePage = (page) => brochurePages.find((p) => p.page === page)

/**
 * Smallest variant tall enough for the displayed size (CSS px × device pixel ratio × zoom).
 * The 3200 px variant only exists on detail pages, so ordinary pages top out at 1600 px.
 */
export function pickVariant(page, neededHeightPx) {
  const sorted = [...page.variants].sort((a, b) => a.height - b.height)
  return sorted.find((v) => v.height >= neededHeightPx) ?? sorted[sorted.length - 1]
}
