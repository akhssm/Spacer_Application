import { project } from '@/data'

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Pre-filled enquiry for an apartment. States only brochure facts plus the provisional
 * identifiers (clearly labelled) — never a price or availability claim.
 */
export function apartmentEnquiry(a, url) {
  const subject = `Enquiry: ${project.name} ${a.id} (${a.bhk} BHK, ${a.areaSft} sft)`
  const body = [
    `Hello ${project.developer},`,
    '',
    `I'm interested in this apartment at ${project.name} and would like to know its price and availability.`,
    '',
    `Apartment: ${a.id} (provisional ID)`,
    `Block: ${a.blockId}`,
    `Floor: ${pad2(a.level)} (provisional numbering)`,
    `Flat no.: ${pad2(a.flatNo)}`,
    `Type: ${a.bhk} BHK, ${a.facing} facing`,
    `Area: ${a.areaSft} sft`,
    '',
    `Link: ${url}`,
  ].join('\n')
  return {
    subject,
    body,
    mailto: `mailto:${project.contact.emails.sales}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    shareText: `${project.name} · ${a.id} · ${a.bhk} BHK · ${a.areaSft} sft`,
  }
}
