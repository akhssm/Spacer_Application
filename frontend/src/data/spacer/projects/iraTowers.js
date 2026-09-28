// IRA Towers as a Spacer project: the viewer at /p/ira-towers.
//
// Geometry is Spacer's satellite tracing (iraTowersGeometry.js). Everything a buyer reads about a
// flat — BHK, facing, area, rooms and its plan — comes from the brochure data layer in src/data, the
// same source the IRA Towers site uses, so the viewer and the site always agree.
//
// Availability: the brochure publishes none. The viewer is Spacer's sales tool, so it shows a
// generated sample inventory, flagged with `inventory: 'sample'` and labelled on screen.

import { blocks, project as ira } from '@/data'
import { brochurePages } from '@/components/brochure/pages'
import { GALLERY_ITEMS, galleryItem } from '@/components/gallery/galleryItems'
import { paths } from '@/routes/paths'
import { displayRooms } from '@/utils/rooms'
import {
  IRA_TOWERS_AMENITIES,
  IRA_TOWERS_BLOCKS,
  IRA_TOWERS_BOUNDARY,
  IRA_TOWERS_CORES,
  IRA_TOWERS_PLOTS,
} from '@/data/spacer/projects/iraTowersGeometry'

// "A-01" -> { blockId: 'A', flatNo: 1 }. The master plan labels flat 13 of Block C as "12 A".
function flatRef(number) {
  const [blockId, flat] = number.split('-')
  return { blockId, flatNo: flat === '12A' ? 13 : Number(flat) }
}

function flatDetails(number) {
  const { blockId, flatNo } = flatRef(number)
  const stack = blocks.find((block) => block.id === blockId)?.stacks.find((s) => s.flatNo === flatNo)
  if (!stack) return {}
  return {
    flatNo,
    bhk: `${stack.bhk} BHK`,
    facing: stack.facing,
    areaSqFt: stack.areaSft,
    rooms: displayRooms(blockId, flatNo),
    // Drawn with FlatPlanCrop: the flat cut out of its block's typical floor plan
    plan: { blockId, flatNo },
  }
}

const images = (...ids) => ids.map((id) => galleryItem(id, 'amenities'))

// What each amenity shows when clicked. Wording follows the brochure: the clubhouse facilities
// are from page 16, the feature lists from pages 7 and 18.
const AMENITY_DETAILS = {
  'Club House': {
    // Headline area as published (p3, p21); the master plan label reads 18,648 (data exception).
    areaSqFt: ira.headline.clubhouseAreaSft,
    description: `A ${ira.headline.clubhouseAreaSft.toLocaleString('en-IN')} sq.ft club house at the south of the site, with the swimming pool on top. Everything below is inside it.`,
    features: [
      'Banquet Hall',
      'Office Room',
      'Indoor Games',
      'Gym',
      'Coffee Shop',
      'Receptionist',
      'Salon',
      'Swimming Pool',
      'Co-Working Space',
      'Yoga',
      'Guest Rooms',
      'Spa',
      'Creche',
    ],
    images: images('clubhouse-day', 'aerial-clubhouse-pool', 'entrance-night', 'clubhouse-plan'),
  },
  'Swimming Pool': {
    description: 'Swimming pool on the club house, with a deck and sun loungers.',
    images: images('aerial-clubhouse-pool'),
  },
  "Children's Play Area": {
    description: 'Play area with slides, swings and climbing frames, beside the landscaped lawn on the east side.',
    features: ["Children's Play Area", 'Provision for Creche'],
    images: images('landscape-play-area'),
  },
  'Outdoor Games': {
    description: 'Outdoor games along the north edge of the site: box cricket, badminton and the jogging track.',
    features: ['Box Cricket', 'Badminton', 'Jogging / Walking Track', 'Outdoor & Indoor Sports'],
  },
  'Sitting Area': {
    description: 'Planted sitting area beside the club house, on the walk in from the entrance.',
    features: ['Beautiful Landscaping'],
    images: images('landscape-sitting-area'),
  },
  Lawn: {
    description: 'Central lawn between the blocks, the courtyard of the project.',
    features: ['Central Court Yard', 'Beautiful Landscaping'],
  },
  'Landscaped Lawn': {
    description: 'Landscaped green along the east boundary, with avenue plantation and the walking track.',
    features: ['Avenue Plantation', 'Beautiful Landscaping', 'Jogging / Walking Track', 'Rainwater Harvesting Pit'],
    images: images('landscape-walkway'),
  },
  'Grand Entrance': {
    description: 'Grand entrance on the south side with a security post, leading to the club house and the blocks.',
    features: [
      'Grand Entry with Security Post',
      'Security Room',
      'Security under 24hr CCTV Surveillance',
      'Solar Power Fence',
      'EV Charging Points',
    ],
    images: images('entrance-night'),
  },
}

export const iraTowers = {
  shortCode: 'ira-towers',
  name: ira.name,
  type: 'apartments',
  unitLabel: 'Flat',
  unitHeight: 40, // metres, used when the map is tilted into 3D
  city: ira.location.city,
  address: ira.location.addressLines.join(', '),
  description: `Luxury high-rise ${ira.headline.configurations} apartments by ${ira.developer} in ${ira.location.locality}: three blocks and a ${ira.headline.clubhouseAreaSft.toLocaleString('en-IN')} sq.ft clubhouse.`,
  location: [78.380047, 17.511612], // decoded from the plus code G96J+J2V
  whatsapp: '',
  theme: { accent: '#3f66c9' }, // card colour on the landing page
  zones: ['Block A', 'Block B', 'Block C', 'Amenities'],
  inventory: 'sample',
  brochure: { pages: brochurePages, title: `${ira.name} brochure` },
  gallery: GALLERY_ITEMS,
  // The full project website in this app (storytelling home, explorer, tour)
  website: paths.home(),
  layout: {
    sample: false,
    boundary: IRA_TOWERS_BOUNDARY,
    blocks: IRA_TOWERS_BLOCKS,
    cores: IRA_TOWERS_CORES, // lift and stair cores, drawn in 3D
    plots: [
      ...IRA_TOWERS_PLOTS.map((plot) => ({ ...plot, ...flatDetails(plot.number) })),
      ...IRA_TOWERS_AMENITIES.map((amenity) => ({ ...amenity, ...AMENITY_DETAILS[amenity.number] })),
    ],
  },
}
