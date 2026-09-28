/**
 * Project-level content, transcribed verbatim from docs/Latest_Broucher.pdf.
 * Only glyph-extraction artefacts are normalised (e.g. the "ﬁ" ligature, "OǗce" → "Office").
 * Brochure spelling is otherwise preserved — see `brochureTypos` below.
 */
export const project = {
  id: 'ira-towers',
  name: 'IRA Towers',
  tagline: 'Transforming Spaces, Enhancing Lives',
  developer: 'V4 Ventures',
  rera: { value: 'P02200007156', source: { page: 1, note: 'Also p24' } },
  approvals: { value: ['TG RERA', 'HMDA'], source: { page: 1 } },
  location: {
    locality: 'ASR Nagar, Nizampet',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500 090',
    addressLines: ['ASR Nagar, Nizampet,', 'Hyderabad, Telangana - 500 090'],
    source: { page: 23 },
  },
  positioning: { value: 'Luxury Highrise 2 & 3 BHK Apartments', source: { page: 1 } },
  headline: {
    landAreaAcres: 3,
    blockCount: 3,
    floorsLabel: 'C+S+10',
    configurations: '2 & 3 BHK',
    unitSizeRangeSft: [1150, 1840],
    totalUnits: 374,
    clubhouseAreaSft: 18600,
    luxuryApartmentsPercent: 100,
    security: '24x7',
    source: { page: 3 },
  },
  descriptions: [
    {
      value:
        'V4 Ventures is delighted to welcome you to IRA Towers, a premium 2BHK and 3BHK residential community ' +
        "located in one of the most convenient localities of Hyderabad. If you've always yearned for a life that " +
        'complements and completes your journey, welcome aboard to your new home.',
      source: { page: 14 },
    },
    {
      value:
        'IRA Towers is a community of three distinct blocks well-spaced from one another. Right in their midst you ' +
        'have a good number of amenities for everyone with outdoor and Indoor game areas, an air-conditioned ' +
        "gymnasium, walkways to stroll and a splendid clubhouse. You can weave many of your life's most exciting " +
        'moments right here - one moment at a time.',
      source: { page: 3 },
    },
  ],
  siteFeatures: {
    value: [
      'Grand Entrance',
      'Security Room',
      'Sitting Area',
      'Avenue Plantation',
      'Central Court Yard',
      'Outdoor & Indoor Games',
      "Children's Play Area",
      'Swimming Pool',
      'Club House',
      'Solar Power Fence',
      'EV Charging Points',
    ],
    source: { page: 7 },
  },
  clubhouse: {
    areaSft: 18600,
    masterPlanAreaSft: 18648,
    amenities: [
      'Banquet Hall',
      'Office Room',
      'Indoor Games',
      'Gym',
      'Coffee Shop',
      'Receptionist',
      'Salon',
      'Swimming Pool',
      'Co Working Space',
      'Yoga',
      'Guest Rooms',
      'Spa',
      'Creche',
    ],
    descriptions: [
      "If you have the time to create life's warmest experiences, we provide all the space and means necessary to make them happen.",
      'Few but excellent are the ways to earn the best experiences of life here at IRA Towers.',
    ],
    source: { page: 16 },
    exceptions: ['clubhouse-area'],
  },
  amenities: {
    value: [
      'Rainwater Harvesting Pit',
      'Beautiful Landscaping',
      "Children's Play Area",
      'Sewage Treatment Plant',
      'Maintenance Office',
      'EV Charging',
      'Provision for Creche',
      'Swimming pool',
      'Jogging / Walking Track',
      '100% Vaastu',
      'Grand Entry with Security Post',
      'Outdoor & Indoor Sports',
      'Security under 24hr CCTV Surveillance',
      '100% Power Back-up (Except - A/C & Geysers)',
    ],
    source: { page: 18 },
  },
  specifications: [
    {
      title: 'Framed Structure',
      items: ['Reinforced Cement Concrete Framed Structure designed to withstand wind and seismic loads.'],
      source: { page: 20 },
    },
    {
      title: 'Super Structure',
      items: ['8" External wall and 4" internal wall with quality Blocks.'],
      source: { page: 20 },
    },
    {
      title: 'Finishes',
      items: [
        'Internal: Smooth plastered surface treated with Birla Wall Care/JK Putty and painted with emulsion of reputed make.',
        'External: Texture surface with weather proof paint of reputed make.',
      ],
      source: { page: 20 },
    },
    {
      title: 'Doors & Windows',
      items: [
        'Main Door & Bed Room Doors: Teak wood door frame and flush shutter with veneer & melamine polish on both sides, fitted with good quality hardware and locking system of reputed make.',
        'Bath Room & Utility Doors: Teak wood door frame and flush shutter with one side veneer with polish & other side with duco paint, fitted with good quality hardware and locking system of reputed make.',
        'Windows & French Doors: UPVC Frames with plain glass and additional mosquito screen.',
        'Kitchen: Cooking Platform of Granite and Stainless Steel sink with water tap & Provision for water purifier.',
        'Water Supply: Adequate water supply for all flats with hydro pressure pump & Underground sump',
      ],
      source: { page: 20 },
    },
    {
      title: 'Solar Power',
      items: ['Solar Power harvesting for common area and amenties'],
      source: { page: 20 },
    },
    {
      title: 'Tile Dadoing',
      items: [
        "Kitchen: Glazed ceramic tile dado up to 2' height above kitchen platform.",
        'Toilet: Glazed ceramic wall tile dado up to 8ft height and 2x2 False ceiling grids for all bathrooms.',
        "Utility/Wash: Glazed ceramic tile dado upto 3' height.",
      ],
      source: { page: 20 },
    },
    {
      title: 'Vertical Circulation',
      items: ['Lift of Jhonson or equivalent make'],
      source: { page: 20 },
    },
    {
      title: 'Bathroom & Sanitary',
      items: ['Jaguar CP Fittings and Hindware Sanitary.'],
      source: { page: 21 },
    },
    {
      title: 'Electrical',
      items: [
        '3 Phase power supply for each individual flat.',
        'PVC Piping of Sudhakar or equivalent make.',
        'Concealed copper wiring of Poly cab or equivalent make.',
        'A/C points for all Bed rooms.',
        'Power points for cooking range, chimney, microwave, mixer, refrigerator, grinder in kitchen and Geyser point in Toilets.',
        'Modular switches of legrand or equivalent make.',
      ],
      source: { page: 21 },
    },
    {
      title: 'Power Backup',
      items: ["100% Generator backup except water geysers and A/C's"],
      source: { page: 21 },
    },
    {
      title: 'Club House & Amenties',
      items: ['18,600 Sft. of Modern Club House'],
      source: { page: 21 },
    },
    {
      title: 'Flooring',
      items: [
        'Rooms: 600 x 1200mm vitrified tiles of reputed make.',
        'Toilets/Wash area: Antiskid ceramic tiles for toilets and balconies.',
      ],
      source: { page: 21 },
    },
    {
      title: 'Salient Features',
      items: [
        'Vaastu Compliant designs.',
        'Exclusive Fire Fighting System.',
        'Water from HMWSSB.',
        'Sewage Treatment Plant.',
        'Piped Gas.',
      ],
      source: { page: 21 },
    },
    {
      title: 'EV Charging',
      items: ['Provision for EV Charging of Bikes & Cars.'],
      source: { page: 21 },
    },
    {
      title: 'Fire & Safety',
      items: [
        'Fire hydrant & fire sprinkler system in basements. Fire alarms & control panels will be kept at main Security. LPG Supply of gas from centralized gas bank to all individual apartments with pre-paid gas meters.',
      ],
      source: { page: 21 },
    },
    {
      title: 'Note',
      items: [
        'Registration Charges, GST and any other taxes applicable as per government norms to be borne by the customers.',
        'Flat will be handed over for wood work/interiors after receiving 100% payment only.',
      ],
      source: { page: 21 },
    },
  ],
  proximity: {
    source: { page: 22 },
    categories: [
      {
        id: 'connectivity',
        title: 'Connectivity',
        places: ['JNTU Metro Station', 'Miyapur Metro Station', 'Mumbai Highway', 'ORR Bachupally'],
      },
      {
        id: 'hospitals',
        title: 'Hospitals',
        places: [
          'Yashoda Hospitals',
          'Sindhu Hospitals',
          'Mamata Hospitals',
          'Sri Sri Holistic Hospitals',
          'SLG Hospitals',
          'Usha Mullapudi Cardiac Centre',
        ],
      },
      {
        id: 'colleges',
        title: 'Colleges',
        places: [
          'Sri Chaitanya Jr. Colleges',
          'BVRIT Hyderabad College of Engineering for Women',
          'Gokaraju Rangaraju Engineering College (GRIET)',
          'Mamata Academy of Medical Sciences',
          'VNR VJIT',
        ],
      },
      {
        id: 'schools',
        title: 'Schools',
        places: [
          'Sanghamitra School',
          'Silver Oaks Intl. School',
          'Delhi Public School',
          'Oakridge International School',
          'Ambitus World School',
          'Vignan High School',
        ],
      },
      {
        id: 'workplaces',
        title: 'Work Places',
        places: [
          'Hitec City',
          'Madhapur',
          'Cyber Towers',
          'Mindspace',
          'Wipro Circle',
          'Financial District',
          'Gachibowli',
        ],
      },
      {
        id: 'recreation',
        title: 'Recreation',
        places: [
          'Nexus Mall',
          'Manjeera/Lulu Mall',
          'GPR Multiplex',
          'Shilparamam Children Park',
          'Kukatpally Exhibition Grounds',
          'Metro Wholesale',
          'Ashoka One Mall',
        ],
      },
    ],
  },
  contact: {
    phones: [
      { label: '+91 8881 020 888', href: 'tel:+918881020888' },
      { label: '8500 3031 32', href: 'tel:+918500303132' },
      { label: '8500 90 91 92', href: 'tel:+918500909192' },
    ],
    emails: { sales: 'sales@v4ventures.in', info: 'info@v4ventures.in' },
    website: 'https://www.v4ventures.in',
    source: { page: 23, note: 'info@ address from p24' },
  },
  chapters: [
    {
      title: 'Welcome',
      lines: ['To beautiful Moments.', 'To Peace and harmony.', 'To a unique lifestyle.'],
      source: { page: 1 },
    },
    {
      title: 'Enter',
      lines: ['into the next step of life', 'into a whole new world', 'into where you belong'],
      source: { page: 2 },
    },
    {
      title: 'Freedom',
      lines: ["That's all about space.", "That's all about planning.", "That's designed just for you."],
      source: { page: 5 },
    },
    {
      title: 'Witness',
      lines: ['The Fruits of success', 'the promise of adventure', 'the voyage of discovery'],
      source: { page: 7 },
    },
    {
      title: 'Discover',
      lines: ['the meaning of life', 'the elegance of nature', 'the magic around you'],
      source: { page: 8 },
    },
    {
      title: 'Step Through',
      lines: ['the door of possibilities', 'the door to the path of joy', 'the door to a world of wonder'],
      source: { page: 13 },
    },
    {
      title: 'Uncover',
      lines: ['the secrets of serendipity', 'the whispers of nature', 'the kaleidoscope of life'],
      source: { page: 15 },
    },
    {
      title: 'Embrace',
      lines: ['the symptom of serenity', 'the whimsy of happy dreams', 'the artistry of a life well-lived..'],
      source: { page: 17 },
    },
    {
      title: 'Feel',
      lines: ['the mosaic of moments', 'the color of emotions', 'the masterpiece of life'],
      source: { page: 21 },
    },
    { title: 'Live', lines: ['Amidst Landmarks', 'Amidst all the peace', 'Amidst Conveniences'], source: { page: 23 } },
  ],
  disclaimer: {
    value:
      'The contents including designs, layouts, amenities, facilities, images displayed/provided, are solely for ' +
      'information purpose and are not intended to constitute solicitation. It is an artistic impression/schematic ' +
      'representation of the project shown and is indicative of the project that can be built. This material does ' +
      'not constitute a contract of any type between the developer/promoter/owner and the recipient. Nothing should ' +
      'be construed to be final. Since the project is under evolution, there is possibility that there may be ' +
      'certain changes in the project as represented in promotional material. Every interested buyer is required to ' +
      'verify all the details independently prior to concluding any decision of buying any unit. The developers are ' +
      'not responsible for the consequences of any action taken by the viewer relying on such information/material. ' +
      'Terms and conditions apply.',
    source: { page: 24 },
  },
}

/**
 * Spellings kept verbatim from the brochure. Listed so the UI phases can decide, with the
 * client, whether to display them as-is. Not auto-corrected here.
 */
export const brochureTypos = [
  { text: 'Amenties', expected: 'Amenities', pages: [18, 20, 21] },
  { text: 'Jhonson', expected: 'Johnson', pages: [20] },
  { text: 'BLANCE', expected: 'BALANCE', pages: [22], note: '"Welcome to a new playscape for work life blance"' },
  {
    text: `14'1"X11"3"`,
    expected: `14'1"X11'3"`,
    pages: [12],
    note: 'Block C flat 13 Drawing dimension on the typical floor plan',
  },
]
