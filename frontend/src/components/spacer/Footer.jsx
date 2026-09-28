import { Link } from 'react-router'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { FOOTER_LINKS, SITE } from '@/data/spacer/siteContent'
import Logo from '@/components/spacer/Logo'

// Contact buttons only appear for the details that are filled in
const CONTACTS = [
  { icon: Phone, label: 'Call us', href: SITE.phone && `tel:${SITE.phone}` },
  { icon: Mail, label: 'Email us', href: SITE.email && `mailto:${SITE.email}` },
  {
    icon: MessageCircle,
    label: 'WhatsApp us',
    href: SITE.whatsapp && `https://wa.me/${SITE.whatsapp}`,
  },
].filter((contact) => contact.href)

const COLUMN_TITLE = 'mb-4 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground'

function Footer() {
  return (
    <footer className="border-t border-border bg-background px-5 text-sm">
      <div className="mx-auto grid w-full max-w-275 gap-10 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo showTagline />
          <p className="mt-4 max-w-64 leading-6 text-muted-foreground">{SITE.description}</p>
        </div>

        <nav aria-label="Product">
          <h3 className={COLUMN_TITLE}>Product</h3>
          <ul className="space-y-3">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-foreground/80 hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className={COLUMN_TITLE}>Contact</h3>
          <div className="flex gap-2.5">
            {CONTACTS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground/80 hover:border-brand hover:text-brand"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
          <h4 className="mt-5 mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Office</h4>
          <p className="leading-6 text-foreground/80">{SITE.address}</p>
        </div>
      </div>

      <p className="mx-auto w-full max-w-275 border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer
