// Spacer projects, served from static data in the frontend (src/data/spacer/projects). There is no
// backend: this module is the only place components get project data from, so it keeps the shape
// the viewer expects (one project with its layout and sellable units, or a list of cards).

import { buildUnits, sampleStatus } from '@/utils/inventory'
import { greenMeadows } from '@/data/spacer/projects/greenMeadows'
import { iraTowers } from '@/data/spacer/projects/iraTowers'

const PROJECTS = [iraTowers, greenMeadows]

// One unit per flat position per floor. Demo projects get a fixed sample spread of statuses.
function withUnits(project) {
  const blocks = project.layout.blocks ?? []
  const statusFor = project.inventory === 'sample' ? sampleStatus : undefined
  return { ...project, units: buildUnits(blocks, project.layout.plots, statusFor) }
}

const byCode = new Map(PROJECTS.map((project) => [project.shortCode, withUnits(project)]))

/** Every project as a card: enough for the demos list on the landing page. */
export function listProjects() {
  return PROJECTS.map((project) => ({
    shortCode: project.shortCode,
    name: project.name,
    type: project.type,
    unitLabel: project.unitLabel,
    city: project.city,
    description: project.description,
    theme: project.theme,
    website: project.website,
    unitCount: project.layout.plots.filter((plot) => plot.kind !== 'amenity').length,
  }))
}

/** One project with its layout and units, or undefined when the code is unknown. */
export const getProject = (shortCode) => byCode.get(String(shortCode).toLowerCase())
