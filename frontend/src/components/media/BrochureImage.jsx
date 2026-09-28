import { brochureAssets } from '@/data'
import { cn } from '@/utils/cn'

/** Responsive <img> for an extracted brochure asset, driven by the generated manifest. */
export function BrochureImage({ asset, sizes, priority, alt, className, ...rest }) {
  const a = brochureAssets[asset]
  const variants = a.variants
  const fallback = variants.find((v) => v.width >= 1200) ?? variants[variants.length - 1]
  const decorative = a.rights === 'decorative'

  return (
    <img
      src={fallback.src}
      srcSet={a.format === 'svg' ? undefined : variants.map((v) => `${v.src} ${v.width}w`).join(', ')}
      sizes={a.format === 'svg' ? undefined : sizes}
      width={a.width}
      height={a.height}
      alt={alt ?? (decorative ? '' : a.alt)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={cn('block', className)}
      {...rest}
    />
  )
}

/** Small caption the brochure requires on renders: "artistic impression". */
export function ImpressionTag({ className }) {
  return (
    <span
      className={cn(
        'pointer-events-none rounded-full bg-navy-950/55 px-2.5 py-1 text-[0.625rem] tracking-[0.18em] text-white/85 uppercase backdrop-blur-sm',
        className,
      )}
    >
      Artistic impression
    </span>
  )
}
