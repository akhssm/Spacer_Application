import { site } from '@/config/site'
import { project } from '@/data/project'

export function SiteFooter() {
  return (
    <footer className="dark bg-background text-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div className="space-y-3">
          <p className="font-display text-2xl">{site.projectName}</p>
          <p className="eyebrow text-muted-foreground">{site.tagline}</p>
        </div>

        <address className="space-y-1 text-sm not-italic text-muted-foreground">
          <p className="eyebrow mb-3 text-foreground">Office &amp; Site</p>
          {site.address.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </address>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="eyebrow mb-3 text-foreground">Contact</p>
          {site.phones.map((phone) => (
            <a key={phone.href} href={phone.href} className="block py-3 hover:text-foreground">
              {phone.label}
            </a>
          ))}
          <a href={`mailto:${site.emails.sales}`} className="block py-3 hover:text-foreground">
            {site.emails.sales}
          </a>
        </div>
      </div>

      <div className="gold-rule opacity-40" />

      <div className="container-page flex flex-col gap-4 py-8 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="text-foreground/80">Note: </span>
          {project.disclaimer.value}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <p>TG RERA No. {site.rera}</p>
          <p>
            © {new Date().getFullYear()} {site.developer}
          </p>
        </div>
      </div>
    </footer>
  )
}
