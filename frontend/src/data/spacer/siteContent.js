// All the text shown on the Spacer landing page lives here.
// To change wording, edit this file. The components only handle layout.

import {
  ArrowLeftRight,
  Box,
  EyeOff,
  FileText,
  Image,
  Info,
  Layers,
  Link2,
  LocateFixed,
  MapPin,
  Navigation,
  Palette,
  Pencil,
  RefreshCw,
  Ruler,
  Satellite,
  Search,
  Smartphone,
  Tag,
  Users,
  Zap,
} from 'lucide-react'

export const SITE = {
  name: 'Spacer',
  tagline: 'Interactive plot viewer',
  description: 'An interactive 3D plot viewing experience for real-estate developers.',
  email: 'hello@example.com', // TODO: replace with your sales email
  phone: '', // TODO: number with country code, e.g. +919876543210
  whatsapp: '', // TODO: number with country code and no "+", e.g. 919876543210
  address: 'Hyderabad, Telangana, India', // TODO: replace with your office address
}

export const HERO = {
  title: 'The ultimate way to show your',
  titleAccent: 'plots.',
  lead: 'Put your whole layout on the real map, with live availability, and share it as one link.',
  note: 'No app to install. Works on any phone.',
}

export const STATEMENT = {
  line: 'No PDFs, No Spreadsheets,',
  accentLine: 'Just One Live Link',
}

export const FEATURES = [
  { icon: Satellite, title: 'Satellite View' },
  { icon: LocateFixed, title: 'Live GPS' },
  { icon: Search, title: 'Plot Search' },
  { icon: Image, title: 'Photo & Video Gallery' },
  { icon: Users, title: 'Lead Management' },
  { icon: Ruler, title: 'Automatic Dimensions' },
  { icon: Layers, title: 'Zones & Phases' },
  { icon: Tag, title: 'Custom Plot Labels' },
  { icon: RefreshCw, title: 'Live Inventory Updates' },
  { icon: Palette, title: 'Status Colours' },
  { icon: Navigation, title: 'Directions to Site' },
  { icon: Box, title: '2D & 3D View' },
  { icon: ArrowLeftRight, title: 'Unit Switch' },
  { icon: FileText, title: 'Brochure Viewer' },
  { icon: Zap, title: 'Fast Loading' },
  { icon: Link2, title: 'One Link for Everything' },
  { icon: Smartphone, title: 'No App Needed' },
  { icon: Info, title: 'Project Info Panel' },
  { icon: Pencil, title: 'Edit After Sharing' },
  { icon: EyeOff, title: 'Public & Internal Links' },
]

export const PRICING = {
  title: 'One Plan, Everything Included',
  price: '₹00,000/-', // TODO: set your price
  tax: '+ 18% GST',
  note: 'Extra hosting years and layout change rounds are priced separately, only if you need them.',
}

export const DELIVERY = {
  title: 'Live in days, not weeks',
  text: 'From your raw layout drawing to a fully interactive link your sales team can share.',
}

export const REQUIREMENTS = [
  {
    icon: FileText,
    title: 'Layout Drawing',
    text: 'A CAD file or vector PDF is best. A clear image of the layout also works.',
  },
  {
    icon: MapPin,
    title: 'Google Map Location',
    text: 'A pin or link for the project site, so the layout sits on the right land.',
  },
  {
    icon: Palette,
    title: 'Branding Details',
    text: 'Your logo, colours and project name, so the viewer looks like yours.',
  },
]

// TODO: placeholders. Replace with real quotes from real customers before launch.
export const TESTIMONIALS = [
  {
    quote: 'Add a real customer quote here. One or two sentences about how the link helped them sell.',
    name: 'Customer name',
    role: 'Role, Company',
  },
  {
    quote: 'Add a second customer quote here. A buyer or a broker works well too.',
    name: 'Customer name',
    role: 'Role, Company',
  },
  {
    quote: 'Add a third customer quote here.',
    name: 'Customer name',
    role: 'Role, Company',
  },
]

export const FAQS = [
  {
    question: 'What exactly is Spacer?',
    answer:
      'A web link that shows your plot layout on a satellite map in 2D and 3D, with plot sizes, status, gallery, brochure and directions in one place.',
  },
  {
    question: 'What type of real-estate projects can use Spacer?',
    answer:
      'Plotted projects: residential, commercial and industrial plots, farmhouses, villas and row houses. Apartment projects work too: every flat is tracked floor by floor, as the Ira Towers demo shows.',
  },
  {
    question: 'Does Spacer design the project layout?',
    answer: 'No. It shows a layout you already have. We do not create or change the layout design.',
  },
  {
    question: 'Do buyers need to install an app?',
    answer: 'No. The viewer opens in the browser on any phone or computer, straight from the link.',
  },
  {
    question: 'Who updates the plot status?',
    answer: 'Your own team. The admin screen works like a spreadsheet, and changes appear on the link immediately.',
  },
  {
    question: 'Can I hide which plots are sold?',
    answer: 'Yes. Each project has an internal link that shows status and a public link that hides it.',
  },
  {
    question: 'My plots are not rectangles. Will areas still be right?',
    answer:
      'Yes. Areas and side lengths are calculated from the actual plot shape, so corner, curved and triangular plots work.',
  },
  {
    question: 'Can I change things after the link is shared?',
    answer:
      'Yes. Gallery, brochure, units, zones and plot status can be changed at any time, and the same link keeps working.',
  },
]

// Landing page sections. Written as routes ("/#demos") so they also work from other pages.
export const NAV_LINKS = [
  { label: 'Demos', to: '/#demos' },
  { label: 'Features', to: '/#features' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'FAQ', to: '/#faq' },
]

export const FOOTER_LINKS = [
  { label: 'Demos', to: '/#demos' },
  { label: 'Features', to: '/#features' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Files Required', to: '/#requirements' },
  { label: 'Testimonials', to: '/#testimonials' },
  { label: 'FAQ', to: '/#faq' },
]

// Where the main buttons go: WhatsApp if a number is set, email otherwise.
export function getContactLink() {
  const message = `Hi, I would like to know more about ${SITE.name}.`

  if (SITE.whatsapp) {
    return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`
  }
  return `mailto:${SITE.email}?subject=${encodeURIComponent(`${SITE.name} enquiry`)}`
}
