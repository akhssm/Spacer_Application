import { cn } from '@/utils/cn'

/** Temporary route body used during Phase 0 — replaced as each phase lands. */
export function PhasePlaceholder({ phase, title, children, className }) {
  return (
    <section className={cn('container-page flex flex-col items-start gap-5 py-24', className)}>
      <p className="eyebrow text-gold-500">{phase}</p>
      <h1 className="text-title">{title}</h1>
      <div className="gold-rule w-40" />
      <div className="max-w-prose text-muted-foreground">{children}</div>
    </section>
  )
}
