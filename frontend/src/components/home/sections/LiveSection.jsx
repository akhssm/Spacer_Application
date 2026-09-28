import {
  BriefcaseIcon,
  GraduationCapIcon,
  HospitalIcon,
  MailIcon,
  MapPinIcon,
  PartyPopperIcon,
  PhoneIcon,
  SchoolIcon,
  TrainFrontIcon,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BrochureImage } from '@/components/media/BrochureImage'
import { Reveal } from '@/components/motion/Reveal'
import { ChapterSection } from '@/components/home/components/ChapterSection'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { getChapter } from '@/components/home/chapters'
import { project } from '@/data'

const CATEGORY_ICONS = {
  connectivity: TrainFrontIcon,
  hospitals: HospitalIcon,
  colleges: GraduationCapIcon,
  schools: SchoolIcon,
  workplaces: BriefcaseIcon,
  recreation: PartyPopperIcon,
}

/** Chapter 10 — "Live". Proximity (p22) and contact (p23). */
export function LiveSection() {
  const c = getChapter('Live')
  const { categories } = project.proximity
  const contact = project.contact
  const enquirySubject = encodeURIComponent(`Enquiry: ${project.name}`)

  return (
    <ChapterSection chapter={c} tone="mist">
      <div className="mt-16 grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <Tabs defaultValue={categories[0].id} className="gap-6">
            <TabsList variant="line" className="h-auto! w-full flex-wrap justify-start gap-x-1 gap-y-2">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id]
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="flex-none px-3 py-2 text-sm">
                    <Icon aria-hidden="true" />
                    {cat.title}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id}>
                <ul className="divide-y divide-navy-900/10 border-y border-navy-900/10">
                  {cat.places.map((place) => (
                    <li key={place} className="flex items-center gap-4 py-3.5 text-base text-navy-900">
                      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-leaf-500" />
                      {place}
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-6">
          <figure className="overflow-hidden rounded-2xl bg-white p-3 shadow-soft">
            <ImageLightbox
              asset="location-map"
              impression={false}
              trigger={
                <button type="button" aria-label="Enlarge location map" className="block w-full cursor-zoom-in">
                  <BrochureImage
                    asset="location-map"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="h-auto w-full rounded-lg"
                  />
                </button>
              }
            />
            <figcaption className="px-1 pt-3 text-xs text-muted-foreground">Location map · tap to enlarge</figcaption>
          </figure>
        </Reveal>
      </div>

      <div id="contact" className="mt-24 scroll-mt-(--header-h)">
        <Reveal className="dark grid gap-10 overflow-hidden rounded-3xl bg-navy-900 p-8 text-foreground sm:p-12 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-6">
            <p className="eyebrow text-gold-300">Enquire</p>
            <p className="font-display text-4xl text-white sm:text-5xl">Visit {project.name}</p>
            <address className="flex items-start gap-3 text-white/75 not-italic">
              <MapPinIcon className="mt-1 size-4 shrink-0 text-gold-300" aria-hidden="true" />
              <span>
                Office &amp; Site Address:
                <br />
                {project.location.addressLines.join(' ')}
              </span>
            </address>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                render={<a href={contact.phones[0].href} />}
                className="h-11 bg-sun-400 px-5 text-navy-950 hover:bg-sun-400/90"
              >
                <PhoneIcon data-icon="inline-start" />
                Call {contact.phones[0].label}
              </Button>
              <Button
                nativeButton={false}
                render={<a href={`mailto:${contact.emails.sales}?subject=${enquirySubject}`} />}
                variant="outline"
                className="h-11 border-white/30 bg-transparent px-5 text-white hover:bg-white/10"
              >
                <MailIcon data-icon="inline-start" />
                {contact.emails.sales}
              </Button>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-[1fr_auto] lg:col-span-6">
            <dl className="grid content-start gap-5 text-sm">
              <div>
                <dt className="eyebrow mb-2 text-white/50">For any queries</dt>
                {contact.phones.map((p) => (
                  <dd key={p.href}>
                    <a href={p.href} className="font-numeric text-2xl text-white hover:text-sun-400">
                      {p.label}
                    </a>
                  </dd>
                ))}
              </div>
              <div>
                <dt className="eyebrow mb-2 text-white/50">Email</dt>
                <dd>
                  <a href={`mailto:${contact.emails.sales}`} className="text-white/85 hover:text-white">
                    {contact.emails.sales}
                  </a>
                </dd>
                <dd>
                  <a href={`mailto:${contact.emails.info}`} className="text-white/85 hover:text-white">
                    {contact.emails.info}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow mb-2 text-white/50">Web</dt>
                <dd>
                  <a href={contact.website} target="_blank" rel="noreferrer" className="text-white/85 hover:text-white">
                    {contact.website.replace(/^https?:\/\//, '')}
                  </a>
                </dd>
              </div>
            </dl>
            <figure className="flex flex-col items-start gap-2">
              <div className="rounded-xl bg-white p-3">
                <BrochureImage asset="location-qr" sizes="140px" className="size-32 [image-rendering:pixelated]" />
              </div>
              <figcaption className="max-w-36 text-xs text-white/60">Scan QR Code for Direct Location</figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </ChapterSection>
  )
}
