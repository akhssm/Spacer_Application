import { useState } from 'react'
import { Link } from 'react-router'
import {
  BoxIcon,
  CheckIcon,
  FileImageIcon,
  LayoutPanelTopIcon,
  LinkIcon,
  MailIcon,
  MapIcon,
  PhoneIcon,
  Share2Icon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageLightbox } from '@/components/media/ImageLightbox'
import { apartmentId, blocks, dataExceptions, project, UNKNOWN_LABEL } from '@/data'
import { masterPlanGeometry } from '@/data/masterPlan'
import { formatSft } from '@/data/summaries'
import { apartmentEnquiry } from '@/services/enquiry'
import { paths } from '@/routes/paths'
import { FlatPlanCrop, RoomList } from '@/components/explore/FlatPlan'
import { TourEntry } from '@/components/explore/tour/TourEntry'
import { cn } from '@/utils/cn'

const pad2 = (n) => String(n).padStart(2, '0')

export function DetailPanel({ subject, onClose, view, onShowOn }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pt-5 pb-4">
        <Header subject={subject} />
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Close details"
          onClick={onClose}
          className="touch-target -mt-1 -mr-2 text-white/70 hover:text-white"
        >
          <XIcon />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {subject.kind === 'apartment' && (
          <ApartmentBody apartment={subject.apartment} view={view} onShowOn={onShowOn} />
        )}
        {subject.kind === 'stack' && (
          <StackBody blockId={subject.blockId} stack={subject.stack} view={view} onShowOn={onShowOn} />
        )}
        {subject.kind === 'clubhouse' && <ClubhouseBody />}
      </div>
    </div>
  )
}

function Header({ subject }) {
  if (subject.kind === 'clubhouse')
    return (
      <div>
        <p className="eyebrow text-gold-300">Amenity</p>
        <h2 className="mt-1 font-display text-3xl text-white">Clubhouse</h2>
      </div>
    )
  if (subject.kind === 'stack')
    return (
      <div>
        <p className="eyebrow text-gold-300">Block {subject.blockId} · choose a floor</p>
        <h2 className="mt-1 font-display text-3xl text-white">Flat {pad2(subject.stack.flatNo)}</h2>
      </div>
    )
  const a = subject.apartment
  return (
    <div>
      <p className="eyebrow text-gold-300">
        Block {a.blockId} · Floor {pad2(a.level)}
      </p>
      <h2 className="mt-1 flex flex-wrap items-center gap-2 font-numeric text-3xl text-white">
        {a.id}
        <span className="rounded-full border border-white/20 px-2 py-0.5 font-sans text-[0.625rem] tracking-[0.14em] text-white/60 uppercase">
          Provisional ID
        </span>
      </h2>
    </div>
  )
}

function Facts({ rows }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
      {rows.map(([k, v]) => (
        <div key={k} className="bg-navy-950 p-3.5">
          <dt className="text-xs text-white/50">{k}</dt>
          <dd className="mt-0.5 text-base text-white">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Not published in the brochure — the enquiry actions sit directly below the facts. */
const enquire = <span className="font-display text-gold-300">{UNKNOWN_LABEL}</span>

function ExceptionNote({ stack }) {
  if (!stack.exceptions?.includes('block-c-flat-13-label')) return null
  const ex = dataExceptions['block-c-flat-13-label']
  return (
    <p className="mt-4 rounded-lg border border-gold-300/30 bg-gold-300/10 p-3 text-xs leading-relaxed text-white/80">
      <span className="font-medium text-gold-300">Brochure note · </span>
      This flat is numbered {ex.statements[0].value} in the area statement and on the floor-plan tag (p
      {ex.statements[0].source.page}), and printed as “{ex.statements[1].value}” on the master plan (p
      {ex.statements[1].source.page}). Both are kept as published.
    </p>
  )
}

function FloorPlanLink({ blockId }) {
  const b = blocks.find((x) => x.id === blockId)
  return (
    <ImageLightbox
      asset={b.floorPlanAssetId}
      impression={false}
      trigger={
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full justify-start border-white/15 bg-transparent px-3 text-white hover:bg-white/10"
        >
          <FileImageIcon data-icon="inline-start" />
          Open full {b.name} floor plan (p{b.areaStatementSource.page})
        </Button>
      }
    />
  )
}

const VIEW_ACTIONS = {
  site: { label: 'Site master plan', Icon: MapIcon },
  plan: { label: 'Typical floor plan', Icon: LayoutPanelTopIcon },
  '3d': { label: 'Schematic 3D', Icon: BoxIcon },
}

/** Show the same selection in the other views (site plan / floor plan / 3D). */
function ViewSwitch({ view, onShowOn }) {
  const targets = Object.keys(VIEW_ACTIONS).filter((v) => v !== view)
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-white/50">Show on</p>
      <div className="grid grid-cols-2 gap-2">
        {targets.map((v) => {
          const { label, Icon } = VIEW_ACTIONS[v]
          return (
            <Button
              key={v}
              variant="outline"
              size="lg"
              onClick={() => onShowOn(v)}
              className="h-11 justify-start border-white/15 bg-transparent px-3 text-white hover:bg-white/10"
            >
              <Icon data-icon="inline-start" />
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function ApartmentBody({ apartment: a, view, onShowOn }) {
  const block = blocks.find((b) => b.id === a.blockId)
  const stack = block.stacks.find((s) => s.flatNo === a.flatNo)
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : window.location.href
  const enquiry = apartmentEnquiry(a, url)
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
    <div className="grid gap-5">
      <Facts
        rows={[
          ['Type', `${a.bhk} BHK`],
          ['Area', `${formatSft(a.areaSft)} sft`],
          ['Facing', a.facing],
          ['Block', block.name],
          ['Floor', pad2(a.level)],
          ['Flat no.', pad2(a.flatNo)],
          ['Price', enquire],
          ['Availability', enquire],
        ]}
      />
      <ExceptionNote stack={stack} />

      <TourEntry apartment={a} />

      <section aria-label="Enquire" className="grid gap-2">
        <Button
          nativeButton={false}
          render={<a href={enquiry.mailto} />}
          className="h-11 w-full bg-sun-400 text-navy-950 hover:bg-sun-400/90"
        >
          <MailIcon data-icon="inline-start" />
          Enquire about {a.id}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            nativeButton={false}
            render={<a href={project.contact.phones[0].href} />}
            variant="outline"
            className="h-11 border-white/15 bg-transparent text-white hover:bg-white/10"
          >
            <PhoneIcon data-icon="inline-start" />
            Call
          </Button>
          {canShare && (
            <Button
              variant="outline"
              onClick={share}
              className="h-11 border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              <Share2Icon data-icon="inline-start" />
              Share
            </Button>
          )}
          <Button
            variant="outline"
            onClick={copy}
            className={cn(
              'h-11 border-white/15 bg-transparent text-white hover:bg-white/10',
              !canShare && 'col-span-2',
            )}
          >
            {copied ? <CheckIcon data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <p className="text-[0.7rem] text-white/45">
          The email is pre-filled with this apartment's details and link. Phone:{' '}
          {project.contact.phones.map((p) => p.label).join(' · ')}
        </p>
      </section>

      <section aria-label="Flat plan" className="grid gap-2">
        <p className="text-xs text-white/50">Flat {pad2(a.flatNo)} on the typical floor plan</p>
        <FlatPlanCrop blockId={a.blockId} flatNo={a.flatNo} />
        <ViewSwitch view={view} onShowOn={onShowOn} />
      </section>

      <RoomList blockId={a.blockId} flatNo={a.flatNo} />

      <div>
        <p className="mb-2 text-xs text-white/50">Same flat on other floors (identical typical plan)</p>
        <FloorLinks
          blockId={a.blockId}
          flatNo={a.flatNo}
          active={a.level}
          floors={block.levels.value.residentialFloors}
          view={view}
        />
      </div>

      <FloorPlanLink blockId={a.blockId} />
      <SourceNote page={block.areaStatementSource.page} />
    </div>
  )
}

function StackBody({ blockId, stack, view, onShowOn }) {
  const block = blocks.find((b) => b.id === blockId)
  return (
    <div className="grid gap-5">
      <Facts
        rows={[
          ['Type', `${stack.bhk} BHK`],
          ['Area', `${formatSft(stack.areaSft)} sft`],
          ['Facing', stack.facing],
          ['Price', enquire],
        ]}
      />
      <ExceptionNote stack={stack} />
      <div>
        <p className="mb-2 text-sm text-white/80">This flat repeats on every typical floor. Choose one:</p>
        <FloorLinks blockId={blockId} flatNo={stack.flatNo} floors={block.levels.value.residentialFloors} view={view} />
      </div>
      <section aria-label="Flat plan" className="grid gap-2">
        <FlatPlanCrop blockId={blockId} flatNo={stack.flatNo} />
        <ViewSwitch view={view} onShowOn={onShowOn} />
      </section>
      <RoomList blockId={blockId} flatNo={stack.flatNo} />
      <FloorPlanLink blockId={blockId} />
      <SourceNote page={block.areaStatementSource.page} />
    </div>
  )
}

function ClubhouseBody() {
  const club = project.clubhouse
  const ex = dataExceptions['clubhouse-area']
  return (
    <div className="grid gap-5">
      <Facts
        rows={[
          ['Area (headline)', `${formatSft(club.areaSft)} sft`],
          ['Master plan label', masterPlanGeometry.clubhouse.label],
        ]}
      />
      <p className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-3 text-xs leading-relaxed text-white/80">
        <span className="font-medium text-gold-300">Brochure note · </span>
        The brochure gives {formatSft(Number(ex.statements[0].value))} sft (p{ex.statements[0].source.page}, p21) and
        the master plan prints {formatSft(Number(ex.statements[1].value))} sft (p{ex.statements[1].source.page}). Both
        are kept as published.
      </p>
      <ul className="grid grid-cols-2 gap-2 text-sm text-white/85">
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
        className="h-11 border-white/15 bg-transparent text-white hover:bg-white/10"
      >
        More about the clubhouse
      </Button>
    </div>
  )
}

function FloorLinks({ blockId, flatNo, floors, active, view }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: floors }, (_, i) => i + 1).map((level) => (
        <Link
          key={level}
          to={paths.explore({ blockId, floor: level, apartmentId: apartmentId(blockId, level, flatNo), view })}
          aria-current={level === active ? 'page' : undefined}
          aria-label={`Floor ${pad2(level)}, apartment ${apartmentId(blockId, level, flatNo)}`}
          className={cn(
            'flex h-11 items-center justify-center rounded-lg font-numeric text-sm transition-colors',
            level === active ? 'bg-sun-400 text-navy-950' : 'bg-white/5 text-white/85 hover:bg-white/15',
          )}
        >
          {pad2(level)}
        </Link>
      ))}
    </div>
  )
}

function SourceNote({ page }) {
  return (
    <p className="text-[0.7rem] leading-relaxed text-white/40">
      Source: brochure area statement and typical floor plan (p{page}) and master plan (p6). Floor numbering and
      apartment IDs are provisional; every residential floor uses the same typical plan. Price and availability are not
      published — please enquire.
    </p>
  )
}
