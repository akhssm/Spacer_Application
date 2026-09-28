import { cn } from '@/utils/cn'

/** Three-leaf line motif echoing the brochure's chapter ornament. */
export function LeafMotif({ className }) {
  return (
    <svg
      viewBox="0 0 40 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn('h-12 w-auto', className)}
    >
      <path d="M20 70V30" />
      <path d="M20 34c-6-4-8-11-8-18 5 2 8 7 8 12" />
      <path d="M20 34c6-4 8-11 8-18-5 2-8 7-8 12" />
      <path d="M20 30c-2.5-6-2.5-14 0-24 2.5 10 2.5 18 0 24z" />
      <path d="M20 44c-5-1-11-5-15-12 6-1 11 2 15 7" />
      <path d="M20 44c5-1 11-5 15-12-6-1-11 2-15 7" />
    </svg>
  )
}
