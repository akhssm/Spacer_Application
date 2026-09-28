/**
 * Virtual-tour content. NOT brochure data: the brochure has no interiors. Each tour is a sample
 * (one per BHK type) shown for every apartment of that type, with a "representative" disclaimer.
 *
 * Rooms and their connections were taken ONLY from what is visible in the walkthrough clips in
 * docs/2bhk and docs/3bhk (one clip per room); see `reference` on each scene. Those clips are
 * fixed-camera videos and are not used as media.
 *
 * Media: every scene loads files at a fixed path —
 *   public/tours/{tourId}/{sceneKey}-4k.webp        equirectangular 360°, 2:1, 4096×2048
 *   public/tours/{tourId}/{sceneKey}-preview.webp   same, 512×256 (shown instantly while the 4K loads)
 *   public/tours/{tourId}/{sceneKey}-thumb.webp     room-strip thumbnail, 400×225
 * They are PLACEHOLDERS today (scripts/generate_tour_placeholders.py). Replacing the files with the
 * real renders needs no code change; afterwards set `media: "final"` to drop the placeholder badge.
 *
 * Angles are in degrees. yaw 0 = the centre of the panorama, positive to the right; pitch 0 = horizon.
 * `northOffset` is the yaw that faces "up" on the brochure floor plan (drives the minimap cone).
 * With placeholder media every angle below is a placeholder too — calibrate them on the real renders.
 */

const view = (yaw = 0, pitch = 0, fov = 80) => ({ yaw, pitch, fov })

const TOURS = [
  {
    id: 'sample-2bhk',
    bhk: 2,
    title: 'Sample 2 BHK interior',
    media: 'placeholder',
    notRecorded: 'Balcony and wash area (seen only through glazing, never recorded).',
    scenes: [
      {
        key: 'living',
        title: 'Living room',
        planRooms: ['living'],
        initialView: view(),
        northOffset: 0,
        links: [
          { to: 'dining', yaw: 120, pitch: -8 },
          { to: 'kitchen', yaw: 150, pitch: -8 },
        ],
        reference: {
          clip: 'docs/2bhk/living room 2bhk.mp4',
          visible:
            'L-shaped sofa, coffee table, abstract artwork, full-height glazing to a balcony; the dining table and the kitchen are visible beyond; a WC and a bed are seen through two doorways.',
        },
      },
      {
        key: 'dining',
        title: 'Dining',
        planRooms: ['dining'],
        initialView: view(),
        northOffset: 0,
        links: [
          { to: 'kitchen', yaw: 60, pitch: -8 },
          { to: 'living', yaw: 200, pitch: -8 },
        ],
        reference: {
          clip: 'docs/2bhk/dining area 2bhk.mp4',
          visible:
            'Round glass dining table with four blue chairs and a ring pendant; the open kitchen on one side, the living area (sofa, TV) and a sliding door to the balcony on the other; a bed is seen through a doorway.',
        },
      },
      {
        key: 'kitchen',
        title: 'Kitchen',
        planRooms: ['kitchen'],
        initialView: view(),
        northOffset: 0,
        links: [{ to: 'dining', yaw: 160, pitch: -8 }],
        reference: {
          clip: 'docs/2bhk/Kitchen 2bhk.mp4',
          visible:
            'Charcoal L/U-shaped kitchen, window over the sink, hob and hood, tall unit with built-in microwave and oven; the dining table is visible through the opening at the end.',
        },
      },
      {
        key: 'master-bedroom',
        title: 'Master bedroom',
        planRooms: ['master-bedroom'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/2bhk/master bedroom 2bhk.mp4',
          visible: 'Upholstered double bed, glass-fronted wardrobe, dressing table, entrance door, full-height window.',
        },
      },
      {
        key: 'bedroom-2',
        title: 'Bedroom 2',
        planRooms: ['bedroom-2'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/2bhk/bedroom 2bhk.mp4',
          visible:
            'Double bed, white desk and chair, full-height glazing with a sliding door to a balcony, built-in wardrobe, entrance door.',
        },
      },
      {
        key: 'toilet-1',
        title: 'Toilet 1',
        planRooms: ['toilet-1'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/2bhk/bathroom 2bhk.mp4',
          visible:
            'Round backlit mirror, vessel basin on a wooden vanity, glass shower enclosure, towel rails, wall niche.',
        },
      },
      {
        key: 'toilet-2',
        title: 'Toilet 2',
        planRooms: ['toilet-2'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/2bhk/bathroom2bhk.mp4',
          visible:
            'Round backlit mirror, vessel basin on a wooden vanity, wall-hung WC, glass shower enclosure, niche, door. Very close to the other bathroom clip — it may show the same bathroom.',
        },
      },
    ],
  },
  {
    id: 'sample-3bhk',
    bhk: 3,
    title: 'Sample 3 BHK interior',
    media: 'placeholder',
    notRecorded: 'A separate dining room, drawing room, second and third toilets, dress, powder room and wash area.',
    scenes: [
      {
        key: 'living',
        title: 'Living & dining',
        // C-14 prints no LIVING — only DRAWING and DINING — so its drawing room stands in.
        planRooms: ['living-dining', 'living', 'drawing'],
        initialView: view(),
        northOffset: 0,
        links: [
          { to: 'kitchen', yaw: 70, pitch: -8 },
          { to: 'balcony', yaw: 110, pitch: -8 },
        ],
        reference: {
          clip: 'docs/3bhk/living room.mp4',
          visible:
            'L-shaped sofa, TV wall in walnut and stone, framed artwork, a six-seat dining table with pendants in the same space, the kitchen through an opening, sliding doors to a balcony.',
        },
      },
      {
        key: 'kitchen',
        title: 'Kitchen',
        planRooms: ['kitchen'],
        initialView: view(),
        northOffset: 0,
        links: [{ to: 'living', yaw: 170, pitch: -8 }],
        reference: {
          clip: 'docs/3bhk/Kitchen.mp4',
          visible:
            'Walnut L-shaped kitchen, marble backsplash, chimney hood, window, double-door fridge; the living and dining area is visible from its end.',
        },
      },
      {
        key: 'master-bedroom',
        title: 'Master bedroom',
        planRooms: ['master-bedroom'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/3bhk/Master bedroom.mp4',
          visible:
            'Walnut-panelled headboard wall with gold leaf art, glass-fronted wardrobe, dressing table, window with curtains, lounge chair, door.',
        },
      },
      {
        key: 'bedroom-2',
        title: 'Bedroom 2',
        planRooms: ['bedroom-2'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/3bhk/bedroom2.mp4',
          visible:
            'Wardrobe beside the entrance door, study desk, double bed, window; an attached bathroom is visible through an open door.',
        },
      },
      {
        key: 'bedroom-3',
        title: 'Bedroom 3',
        planRooms: ['bedroom-3'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/3bhk/bedroom3.mp4',
          visible:
            'Double bed with tufted headboard, glass-fronted wardrobe, lounge chair, entrance door, sliding door to a balcony.',
        },
      },
      {
        key: 'toilet-1',
        title: 'Toilet 1',
        planRooms: ['toilet-1'],
        initialView: view(),
        northOffset: 0,
        links: [],
        reference: {
          clip: 'docs/3bhk/Bathroom.mp4',
          visible:
            'Rectangular backlit mirror, walnut vanity with basin, dark-marble walk-in shower, wall-hung WC, door.',
        },
      },
      {
        key: 'balcony',
        title: 'Balcony',
        planRooms: ['balcony', 'balcony-1', 'wash-balcony'],
        initialView: view(),
        northOffset: 0,
        links: [{ to: 'living', yaw: 180, pitch: -8 }],
        reference: {
          clip: 'docs/3bhk/balcony_360.mp4',
          visible:
            "Covered balcony with sofa, lounge chairs, planters and glass railing; sliding doors back into the living room. Far larger than any balcony the brochure prints (4'–5' wide).",
        },
      },
    ],
  },
]

export const tours = TOURS

export const getTour = (id) => TOURS.find((t) => t.id === id)

/** The sample tour shown for an apartment: by BHK type. */
export const getTourForApartment = (a) => TOURS.find((t) => t.bhk === a.bhk)

export const TOUR_MEDIA_ROOT = '/tours'

/** Fixed media paths for one scene (see the header comment). */
export const sceneMedia = (tourId, sceneKey) => {
  const base = `${TOUR_MEDIA_ROOT}/${tourId}/${sceneKey}`
  return { full: `${base}-4k.webp`, preview: `${base}-preview.webp`, thumb: `${base}-thumb.webp` }
}
