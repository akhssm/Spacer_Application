/**
 * Site-shell constants (header, footer, meta), derived from the brochure data in src/data.
 */
import { project } from '@/data/project'
import { paths } from '@/routes/paths'

export const site = {
  projectName: project.name,
  tagline: project.tagline,
  developer: project.developer,
  rera: project.rera.value,
  address: { lines: project.location.addressLines },
  phones: project.contact.phones,
  emails: project.contact.emails,
  website: project.contact.website,
}

/** Primary navigation of the IRA Towers site. Hash targets are the Home chapter anchors. */
export const primaryNav = [
  { label: 'Overview', to: paths.home('overview') },
  { label: 'Explore', to: paths.explore() },
  { label: 'Apartments', to: paths.apartments() },
  { label: 'Amenities', to: paths.home('amenities') },
  { label: 'Location', to: paths.home('location') },
]
