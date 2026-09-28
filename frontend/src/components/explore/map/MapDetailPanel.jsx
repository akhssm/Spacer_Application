import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BoxIcon,
  CheckIcon,
  FileImageIcon,
  InfoIcon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
  Share2Icon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrochureImage } from '@/components/media/BrochureImage'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { apartmentId, blocks, brochureAssets, dataExceptions, getApartment, project } from '@/data'
import { masterPlanGeometry } from '@/data/masterPlan'
import { formatSft } from '@/data/summaries'
import { apartmentEnquiry } from '@/services/enquiry'
import { paths } from '@/routes/paths'
import { cn } from '@/utils/cn'
import { BlockSummary, FloorPicker, HighlightFilter } from '@/components/explore/ExplorerControls'
import { RoomList } from '@/components/explore/FlatPlan'
import { TourEntry } from '@/components/explore/tour/TourEntry'
import { AMENITIES } from '@/components/explore/map/layers'
import { mapHref } from '@/components/explore/map/mapUrl'
import { getPlanType, publishedWidths } from '@/components/explore/map/measurements'

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Details for a selection on the location map. Block facts come from the existing explorer's
 * `BlockSummary`; "Explore" hands over to the existing explorer through `paths.explore`.
 */
export function MapDetailPanel({ selection, onClose, onSelectLevel, highlight = 'all', onHighlight }) {
  const { eyebrow, title } = heading(selection)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pt-5 pb-4">
        <div>
          <p className="eyebrow text-gold-300">{eyebrow}</p>
          <h2 className="mt-1 font-display text-3xl text-white">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Close details"
          onClick={onClose}
          className="-mt-1 -mr-2 text-white/70 hover:text-white"
        >
          <XIcon />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {selection.kind === 'block' && (
          <BlockBody blockId={selection.blockId} highlight={highlight} onHighlight={onHighlight} />
        )}
        {selection.kind === 'flat' && <FlatBody selection={selection} onSelectLevel={onSelectLevel} />}
        {selection.kind === 'clubhouse' && <ClubhouseBody />}
        {selection.kind === 'amenity' && <AmenityBody id={selection.id} />}
      </div>
      {/* The key actions stay in view however long the details are. */}
      {selection.kind === 'flat' && <FlatActionBar selection={selection} />}
    </div>
  )
}

function heading(s) {
  if (s.kind === 'block') return { eyebrow: 'Residential block', title: blocks.find((b) => b.id === s.blockId).name }
  if (s.kind === 'flat') {
    const floor = s.level !== undefined ? `Floor ${pad2(s.level)}` : 'Choose a floor'
    return {
      eyebrow: `Block ${s.blockId} · ${floor}`,
      title: s.level !== undefined ? apartmentId(s.blockId, s.level, s.flatNo) : `Flat ${pad2(s.flatNo)}`,
    }
  }
  if (s.kind === 'clubhouse') return { eyebrow: 'Amenity', title: 'Clubhouse' }
  return { eyebrow: 'Amenity', title: AMENITIES[s.id].name }
}

const outline = 'border-white/15 bg-transparent text-white hover:bg-white/10'

function BlockBody({ blockId, highlight, onHighlight }) {
  const block = blocks.find((b) => b.id === blockId)
  const types = new Set(block.stacks.map((s) => s.bhk))
  return (
    <div className="grid gap-5">
      <BlockSummary blockId={blockId} />
      <p className="text-xs text-white/55">Tap a flat on the map to see its details and choose a floor.</p>
      {/* Only offered where the block has both types (Block C is all 3 BHK). */}
      {onHighlight && types.size > 1 && (
        <section aria-label="Highlight flats" className="grid gap-2">
          <p className="text-sm text-white">Highlight</p>
          <HighlightFilter value={highlight} onChange={onHighlight} />
        </section>
      )}

      <div className="grid gap-2">
        <Button
          nativeButton={false}
          render={<Link to={paths.explore({ blockId })} />}
          className="h-11 w-full bg-sun-400 text-navy-950 hover:bg-sun-400/90"
        >
          Explore {block.name}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <p className="text-[0.7rem] text-white/45">Floors, flats and floor plans open in the site explorer.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          nativeButton={false}
          render={<Link to={paths.explore({ blockId, view: '3d' })} />}
          variant="outline"
          className={`h-10 ${outline}`}
        >
          <BoxIcon data-icon="inline-start" />
          Schematic 3D
        </Button>
        <ImageLightbox
          asset={block.floorPlanAssetId}
          impression={false}
          trigger={
            <Button variant="outline" className={`h-10 ${outline}`}>
              <FileImageIcon data-icon="inline-start" />
              Floor plan
            </Button>
          }
        />
      </div>

      <Enquire topic={block.name} />
      <PlacementNote>
        Footprint: the extent of this block's flats on the brochure master plan (p6). Placed on the satellite image
        approximately.
      </PlacementNote>
    </div>
  )
}

/**
 * One flat position (stack), or one apartment once a floor is chosen. Only published values are
 * shown: BHK, facing, sale area (area statement) and the room labels exactly as printed. Overall
 * flat dimensions are not published, so none are shown or drawn.
 */
function FlatBody({ selection, onSelectLevel }) {
  const { blockId, flatNo, level } = selection
  const block = blocks.find((b) => b.id === blockId)
  const stack = block.stacks.find((s) => s.flatNo === flatNo)
  const plan = getPlanType(blockId, flatNo)
  const widths = publishedWidths(blockId, flatNo)
  const apartment = level !== undefined ? getApartment(apartmentId(blockId, level, flatNo)) : undefined
  const explorerPath = apartment
    ? paths.explore({ blockId, floor: apartment.level, apartmentId: apartment.id })
    : paths.explore({ blockId })

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
        {[
          ['Flat no.', pad2(flatNo)],
          ['Floor', apartment ? pad2(apartment.level) : 'Choose below'],
          ['Apartment ID', apartment ? `${apartment.id} (provisional)` : 'Choose a floor'],
          ['Type', `${stack.bhk} BHK`],
          ['Facing', stack.facing],
          ['Sale area', `${formatSft(stack.areaSft)} sft`],
        ].map(([k, v]) => (
          <div key={k} className="bg-navy-950 p-3.5">
            <dt className="text-xs text-white/50">{k}</dt>
            <dd className="mt-0.5 text-base text-white">{v}</dd>
          </div>
        ))}
      </dl>

      {stack.exceptions?.includes('block-c-flat-13-label') && (
        <p className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-3 text-xs leading-relaxed text-white/80">
          <span className="font-medium text-gold-300">Brochure note · </span>
          This flat is numbered {dataExceptions['block-c-flat-13-label'].statements[0].value} in the area statement and
          on the floor-plan tag, and printed as “{stack.masterPlan.label}” on the master plan. Both are kept as
          published.
        </p>
      )}

      <section aria-label="Floor" id={FLOOR_PICKER_ID} className="grid scroll-mt-4 gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-white">Floor</p>
          <p className="text-[0.7rem] text-white/45">Provisional numbering</p>
        </div>
        <FloorPicker block={block} active={level} onSelect={onSelectLevel} />
        <p className="text-[0.7rem] text-white/45">Every residential floor uses the same typical plan.</p>
      </section>

      {apartment && <TourEntry apartment={apartment} />}

      {apartment ? (
        <ShareLinks selection={selection} apartmentIdValue={apartment.id} />
      ) : (
        <p className="text-xs text-white/55">Choose a floor to enquire about a specific apartment.</p>
      )}

      <Button nativeButton={false} render={<Link to={explorerPath} />} variant="outline" className={`h-10 ${outline}`}>
        Open in Explorer
        <ArrowRightIcon data-icon="inline-end" />
      </Button>

      {widths.length > 0 && (
        <section aria-label="Published widths" className="grid gap-2">
          <p className="text-xs text-white/50">
            Widths as printed on the typical floor plan (p{block.areaStatementSource.page})
          </p>
          <ul className="grid gap-1.5 text-sm">
            {widths.map((w, i) => (
              // Some flats print the same width twice (two balconies), so the label alone isn't unique.
              <li
                key={`${w.printed}-${i}`}
                className="flex items-baseline justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="text-white/85">{w.kind}</span>
                <span className="font-numeric text-white">{w.width} wide</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RoomList blockId={blockId} flatNo={flatNo} />

      <p className="text-[0.7rem] leading-relaxed text-white/40">
        {plan && (
          <>
            Plan type {plan.id}
            {plan.note ? ` — ${plan.note}` : ''}.{' '}
          </>
        )}
        Overall flat dimensions are not published in the brochure. The highlighted tile shows where this flat sits on
        the master plan (p6), placed on the satellite image approximately; it is not a measured outline. Floor numbering
        and apartment IDs are provisional. Price and availability are not published — please enquire.
      </p>
    </div>
  )
}

const FLOOR_PICKER_ID = 'map-floor-picker'

/**
 * Pinned under the flat details: the existing pre-filled apartment enquiry and Call once a floor is
 * chosen; before that, "Choose a floor" (jumps to the floor picker) — never an invented apartment ID.
 */
function FlatActionBar({ selection }) {
  const { blockId, flatNo, level } = selection
  const apartment = level !== undefined ? getApartment(apartmentId(blockId, level, flatNo)) : undefined
  const phone = project.contact.phones[0]
  const chooseFloor = () => {
    const picker = document.getElementById(FLOOR_PICKER_ID)
    picker?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    picker?.querySelector('[role=radio]')?.focus({ preventScroll: true })
  }
  let primary
  if (apartment) {
    // The email keeps its explorer link, exactly as the existing apartment enquiry does.
    const explorerUrl = `${typeof window === 'undefined' ? '' : window.location.origin}${paths.explore({ blockId, floor: apartment.level, apartmentId: apartment.id })}`
    primary = (
      <Button
        nativeButton={false}
        render={<a href={apartmentEnquiry(apartment, explorerUrl).mailto} />}
        className="h-11 min-w-0 flex-1 bg-sun-400 text-navy-950 hover:bg-sun-400/90"
      >
        <MailIcon data-icon="inline-start" />
        <span className="truncate">Enquire about {apartment.id}</span>
      </Button>
    )
  } else {
    primary = (
      <Button onClick={chooseFloor} className="h-11 min-w-0 flex-1 bg-sun-400 text-navy-950 hover:bg-sun-400/90">
        Choose a floor
      </Button>
    )
  }
  return (
    <div
      role="group"
      aria-label="Enquire"
      className="flex shrink-0 gap-2 border-t border-white/10 bg-navy-950/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {primary}
      <Button
        nativeButton={false}
        render={<a href={phone.href} />}
        variant="outline"
        aria-label={`Call ${phone.label}`}
        className={`h-11 shrink-0 px-4 ${outline}`}
      >
        <PhoneIcon data-icon="inline-start" />
        Call
      </Button>
    </div>
  )
}

/** Share / copy the map link that reopens this exact block, flat and floor. */
function ShareLinks({ selection, apartmentIdValue }) {
  const apartment = getApartment(apartmentIdValue)
  const url = `${typeof window === 'undefined' ? '' : window.location.origin}${mapHref(selection)}`
  const enquiry = apartmentEnquiry(apartment, url)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: enquiry.subject, text: enquiry.shareText, url })
    } catch {
      /* dismissed or unsupported — ignore */
    }
  }
  return (
    <section aria-label="Share" className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {canShare && (
          <Button variant="outline" onClick={share} className={`h-10 ${outline}`}>
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
        )}
        <Button
          variant="outline"
          onClick={copy}
          className={cn(`h-10 ${outline}`, !canShare && 'col-span-2')}
          data-share-url={url}
        >
          {copied ? <CheckIcon data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <p className="text-[0.7rem] text-white/45">
        The link reopens this apartment on the map. The enquiry email is pre-filled with its details and explorer link.
        Phone: {project.contact.phones.map((p) => p.label).join(' · ')}
      </p>
    </section>
  )
}

function ClubhouseBody() {
  const club = project.clubhouse
  const ex = dataExceptions['clubhouse-area']
  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
        {[
          ['Area (headline)', `${formatSft(club.areaSft)} sft`],
          ['Master plan label', masterPlanGeometry.clubhouse.label],
        ].map(([k, v]) => (
          <div key={k} className="bg-navy-950 p-3.5">
            <dt className="text-xs text-white/50">{k}</dt>
            <dd className="mt-0.5 text-base text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-3 text-xs leading-relaxed text-white/80">
        <span className="font-medium text-gold-300">Brochure note · </span>
        The brochure gives {formatSft(Number(ex.statements[0].value))} sft (p{ex.statements[0].source.page}, p21) and
        the master plan prints {formatSft(Number(ex.statements[1].value))} sft (p{ex.statements[1].source.page}). Both
        are kept as published.
      </p>

      <Gallery assets={['clubhouse-day', 'aerial-clubhouse-pool', 'clubhouse-plan']} />

      <ul aria-label="Clubhouse amenities" className="grid grid-cols-2 gap-2 text-sm text-white/85">
        {club.amenities.map((a) => (
          <li key={a} className="rounded-lg bg-white/5 px-3 py-2">
            {a}
          </li>
        ))}
      </ul>

      <Button
        nativeButton={false}
        render={<Link to={paths.home('clubhouse')} />}
        variant="outline"
        className={`h-10 ${outline}`}
      >
        <InfoIcon data-icon="inline-start" />
        More about the clubhouse
      </Button>
      <Enquire topic="Clubhouse" />
    </div>
  )
}

function AmenityBody({ id }) {
  const a = AMENITIES[id]
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-relaxed text-white/80">
        Listed in the brochure's amenities (p18) as <span className="text-white">“{a.brochureAmenity}”</span>.
      </p>
      {a.image && <Gallery assets={[a.image]} />}
      <Enquire topic={a.name} />
      <PlacementNote>{a.traced} Traced by hand and placed on the satellite image approximately.</PlacementNote>
    </div>
  )
}

/** Brochure images; each opens in the site's existing lightbox. */
function Gallery({ assets }) {
  return (
    <section aria-label="Gallery" className="grid gap-2">
      <p className="text-xs text-white/50">Gallery · artistic impressions from the brochure</p>
      <div className={assets.length > 1 ? 'grid grid-cols-3 gap-2' : 'grid'}>
        {assets.map((id) => (
          <ImageLightbox
            key={id}
            asset={id}
            trigger={
              <button
                type="button"
                aria-label={`Enlarge: ${brochureAssets[id].alt}`}
                className="group overflow-hidden rounded-lg border border-white/10 focus-visible:outline-2 focus-visible:outline-sun-400"
              >
                <BrochureImage
                  asset={id}
                  sizes={assets.length > 1 ? '8rem' : '22rem'}
                  className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${assets.length > 1 ? 'aspect-square' : 'aspect-[4/3]'}`}
                />
              </button>
            }
          />
        ))}
      </div>
    </section>
  )
}

/** General enquiry: states only the topic and the link — never price or availability. */
function Enquire({ topic }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const subject = `Enquiry: ${project.name} — ${topic}`
  const body = [
    `Hello ${project.developer},`,
    '',
    `I'd like to know more about ${topic} at ${project.name}.`,
    '',
    `Link: ${url}`,
  ].join('\n')
  const mailto = `mailto:${project.contact.emails.sales}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return (
    <section aria-label="Enquire" className="grid gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button nativeButton={false} render={<a href={mailto} />} variant="outline" className={`h-10 ${outline}`}>
          <MailIcon data-icon="inline-start" />
          Enquire
        </Button>
        <Button
          nativeButton={false}
          render={<a href={project.contact.phones[0].href} />}
          variant="outline"
          className={`h-10 ${outline}`}
        >
          <PhoneIcon data-icon="inline-start" />
          Call
        </Button>
      </div>
      <p className="text-[0.7rem] text-white/45">Phone: {project.contact.phones.map((p) => p.label).join(' · ')}</p>
    </section>
  )
}

function PlacementNote({ children }) {
  return <p className="text-[0.7rem] leading-relaxed text-white/40">{children}</p>
}
