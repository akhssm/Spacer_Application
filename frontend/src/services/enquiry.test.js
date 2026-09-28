import { describe, expect, it } from 'vitest'
import { getApartment } from '@/data'
import { apartmentEnquiry } from '@/services/enquiry'
import { paths } from '@/routes/paths'

describe('apartment enquiry', () => {
  const a = getApartment('C-1013')
  const e = apartmentEnquiry(a, 'https://example.test/explore/C/10/C-1013')

  it('carries the apartment context and marks provisional identifiers', () => {
    expect(e.subject).toBe('Enquiry: IRA Towers C-1013 (3 BHK, 1840 sft)')
    expect(e.body).toContain('C-1013 (provisional ID)')
    expect(e.body).toContain('Floor: 10 (provisional numbering)')
    expect(e.body).toContain('https://example.test/explore/C/10/C-1013')
  })

  it('never states a price or availability', () => {
    expect(e.body).not.toMatch(/₹|rs\.?\s*\d|lakh|crore|available now|sold/i)
    expect(e.body).toContain('would like to know its price and availability')
  })

  it("mails the brochure's sales address with encoded fields", () => {
    expect(e.mailto.startsWith('mailto:sales@v4ventures.in?subject=')).toBe(true)
    expect(decodeURIComponent(e.mailto.split('&body=')[1])).toBe(e.body)
  })
})

describe('explore paths with view', () => {
  it('omits the view when it is the default for that level', () => {
    expect(paths.explore({ blockId: 'A' })).toBe('/ira-towers/explore/A')
    expect(paths.explore({ blockId: 'A', view: 'site' })).toBe('/ira-towers/explore/A')
    expect(paths.explore({ blockId: 'A', view: 'plan' })).toBe('/ira-towers/explore/A?view=plan')
    expect(paths.explore({ blockId: 'A', floor: 3, view: 'plan' })).toBe('/ira-towers/explore/A/03')
    expect(paths.explore({ blockId: 'A', floor: 3, view: 'site' })).toBe('/ira-towers/explore/A/03?view=site')
    expect(paths.explore({ blockId: 'A', floor: 3, apartmentId: 'A-0305', view: 'site' })).toBe(
      '/ira-towers/explore/A/03/A-0305?view=site',
    )
    expect(paths.explore({ view: 'plan' })).toBe('/ira-towers/explore')
    expect(paths.explore({ view: '3d' })).toBe('/ira-towers/explore?view=3d')
    expect(paths.explore({ blockId: 'C', view: '3d' })).toBe('/ira-towers/explore/C?view=3d')
    expect(paths.explore({ blockId: 'C', floor: 10, apartmentId: 'C-1013', view: '3d' })).toBe(
      '/ira-towers/explore/C/10/C-1013?view=3d',
    )
  })
})
