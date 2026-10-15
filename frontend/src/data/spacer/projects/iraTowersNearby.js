// The places the brochure lists around IRA Towers (page 22, "Proximity"), pinned on the viewer's
// map when it is zoomed out. The brochure gives names only, so each point is that place as mapped
// in OpenStreetMap (looked up October 2026), taking the branch nearest the site where a name has
// several. Places that could not be pinned with confidence are left out: Mumbai Highway,
// ORR Bachupally, Sindhu Hospitals, Vignan High School and Kukatpally Exhibition Grounds.

export const IRA_TOWERS_NEARBY = [
  // Connectivity
  { name: 'JNTU Metro Station', category: 'connectivity', at: [78.38887, 17.49866] },
  { name: 'Miyapur Metro Station', category: 'connectivity', at: [78.37303, 17.49654] },

  // Hospitals
  { name: 'Yashoda Hospitals', category: 'hospitals', at: [78.38418, 17.46227] },
  { name: 'Mamata Hospitals', category: 'hospitals', at: [78.35747, 17.53855] },
  { name: 'Sri Sri Holistic Hospitals', category: 'hospitals', at: [78.38905, 17.50198] },
  { name: 'SLG Hospitals', category: 'hospitals', at: [78.36259, 17.52817] },
  { name: 'Usha Mullapudi Cardiac Centre', category: 'hospitals', at: [78.42914, 17.52023] },

  // Colleges (Mamata Academy of Medical Sciences shares its campus with Mamata Hospitals)
  { name: 'Sri Chaitanya Jr. College', category: 'colleges', at: [78.36835, 17.52767] },
  { name: 'BVRIT College for Women', category: 'colleges', at: [78.3699, 17.52638] },
  { name: 'GRIET', category: 'colleges', at: [78.36662, 17.5209] },
  { name: 'VNR VJIET', category: 'colleges', at: [78.38546, 17.53905] },

  // Schools
  { name: 'Sanghamitra School', category: 'schools', at: [78.38709, 17.50364] },
  { name: 'Silver Oaks Intl. School', category: 'schools', at: [78.3646, 17.54256] },
  { name: 'Delhi Public School', category: 'schools', at: [78.33879, 17.50698] },
  { name: 'Oakridge Intl. School', category: 'schools', at: [78.38486, 17.56345] },
  { name: 'Ambitus World School', category: 'schools', at: [78.39829, 17.55447] },

  // Work places
  { name: 'Hitec City', category: 'workplaces', at: [78.38345, 17.45081] },
  { name: 'Madhapur', category: 'workplaces', at: [78.39163, 17.44089] },
  { name: 'Mindspace', category: 'workplaces', at: [78.38228, 17.44021] },
  { name: 'Wipro Circle', category: 'workplaces', at: [78.34324, 17.42618] },
  { name: 'Financial District', category: 'workplaces', at: [78.34373, 17.41654] },
  { name: 'Gachibowli', category: 'workplaces', at: [78.35196, 17.44362] },

  // Recreation
  { name: 'Nexus Mall', category: 'recreation', at: [78.3889, 17.48422] },
  { name: 'Lulu Mall (Manjeera)', category: 'recreation', at: [78.39286, 17.4901] },
  { name: 'GPR Multiplex', category: 'recreation', at: [78.3906, 17.4992] },
  { name: 'Shilparamam', category: 'recreation', at: [78.37821, 17.4515] },
  { name: 'Metro Wholesale', category: 'recreation', at: [78.41987, 17.48066] },
  { name: 'Ashoka One Mall', category: 'recreation', at: [78.41759, 17.47953] },
]
