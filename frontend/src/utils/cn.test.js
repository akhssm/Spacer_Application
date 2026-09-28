import { describe, expect, it } from 'vitest'
import { cn } from '@/utils/cn'

describe('cn', () => {
  it('keeps custom font sizes alongside text colours', () => {
    expect(cn('text-display leading-none', 'text-navy-900')).toBe('text-display leading-none text-navy-900')
    expect(cn('text-stat', 'text-sun-400')).toBe('text-stat text-sun-400')
  })

  it('still resolves real conflicts', () => {
    expect(cn('text-display', 'text-title')).toBe('text-title')
    expect(cn('text-white', 'text-navy-900')).toBe('text-navy-900')
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
