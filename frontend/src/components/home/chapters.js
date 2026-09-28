import { project } from '@/data'

/**
 * The Home page follows the brochure's 10 chapter headlines, in brochure order.
 * `id` is the section anchor (header nav uses #overview, #amenities, #location, #contact).
 */
const sections = [
  { title: 'Welcome', id: 'welcome', label: 'Welcome' },
  { title: 'Enter', id: 'enter', label: 'Enter' },
  { title: 'Freedom', id: 'overview', label: 'Overview' },
  { title: 'Witness', id: 'site', label: 'The site' },
  { title: 'Discover', id: 'gallery', label: 'Gallery' },
  { title: 'Step Through', id: 'homes', label: 'Homes' },
  { title: 'Uncover', id: 'amenities', label: 'Amenities' },
  { title: 'Embrace', id: 'clubhouse', label: 'Clubhouse' },
  { title: 'Feel', id: 'specifications', label: 'Specifications' },
  { title: 'Live', id: 'location', label: 'Location' },
]

export const homeChapters = sections.map((s, index) => {
  const chapter = project.chapters.find((c) => c.title === s.title)
  if (!chapter) throw new Error(`Brochure chapter "${s.title}" missing from project data`)
  return { chapter, id: s.id, label: s.label, index }
})

export const chapterCount = homeChapters.length

export const getChapter = (title) => homeChapters.find((c) => c.chapter.title === title)
