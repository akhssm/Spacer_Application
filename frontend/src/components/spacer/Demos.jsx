import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { SITE } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'
import SectionHeading from '@/components/ui/SectionHeading'
import { paths } from '@/routes/paths'
import { listProjects } from '@/services/projects'

// Read once: the projects are static data, so adding one to src/data/spacer/projects adds a card here
const PROJECTS = listProjects()

function Demos() {
  return (
    <section id="demos" className="px-5 py-20">
      <div className="mx-auto w-full max-w-275">
        <SectionHeading eyebrow="Live projects" title="Product Demos" />

        <div className="grid gap-5 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <Reveal key={project.shortCode} className="flex flex-col">
              {/* On hover the card lifts with a lime border and glow, the cover zooms and the name turns lime */}
              <Link
                to={paths.viewer(project.shortCode)}
                className="group block flex-1 overflow-hidden rounded-lg border border-border bg-card transition-all duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1.5 hover:border-brand/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_24px_rgba(117,194,23,0.1)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* Cover: the project name over a soft glow in the project's colour */}
                <div
                  className="flex h-44 items-center justify-center px-6 text-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.06]"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${project.theme.accent}55, #0c0c0c 70%)`,
                  }}
                >
                  <span
                    className="text-3xl font-bold tracking-widest uppercase"
                    style={{ color: project.theme.accent }}
                  >
                    {project.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border bg-panel px-7 py-6">
                  <span className="text-2xl font-bold tracking-wider uppercase">{SITE.name}</span>
                  <span className="text-right text-xs leading-5 tracking-wide text-foreground/80 uppercase">
                    Interactive
                    <br />
                    {project.unitLabel.toLowerCase()} viewing
                  </span>
                </div>

                <div className="px-5 py-4">
                  <h3 className="font-bold transition-colors duration-700 group-hover:text-brand">
                    {project.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      • {project.city} • {project.unitCount} {project.unitLabel.toLowerCase()}s
                    </span>
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                </div>
              </Link>

              {/* Projects with a full website in this app link to it as well */}
              {project.website && (
                <Link
                  to={project.website}
                  className="mt-2 inline-flex items-center gap-1.5 self-start px-1 py-2 text-sm text-foreground/80 hover:text-brand"
                >
                  Visit the {project.name} website <ArrowUpRight size={14} />
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Demos
