import { FEATURES } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'

function Features() {
  return (
    <section id="features" className="bg-panel px-5 py-20">
      <div className="mx-auto w-full max-w-324">
        <h2 className="mb-8 text-3xl font-bold md:text-4xl">{FEATURES.length}+ Features</h2>

        <Reveal>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title }) => (
              // On hover the card lifts, glows lime, the icon grows and tilts, and the label turns lime
              <article
                key={title}
                className="group rounded-lg border border-border bg-card p-4 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-brand/55 hover:bg-muted hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(117,194,23,0.14)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Icon
                  size={26}
                  strokeWidth={1.6}
                  className="text-brand transition-all duration-500 group-hover:scale-115 group-hover:-rotate-4 group-hover:drop-shadow-[0_0_8px_rgba(117,194,23,0.6)]"
                />
                <h3 className="mt-7 mb-1 text-[15px] transition-colors duration-500 group-hover:text-brand">{title}</h3>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Features
