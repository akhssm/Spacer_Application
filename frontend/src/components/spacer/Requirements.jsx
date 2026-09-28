import { REQUIREMENTS } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'
import SectionHeading from '@/components/ui/SectionHeading'

function Requirements() {
  return (
    <section id="requirements" className="bg-panel px-5 py-20">
      <div className="mx-auto w-full max-w-275">
        <SectionHeading title="Requirements to Start" />

        <Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {REQUIREMENTS.map(({ icon: Icon, title, text }) => (
              // On hover the card lifts with a lime border and glow, and the icon grows and lights up
              <article
                key={title}
                className="group rounded-lg border border-border bg-card p-6 pb-8 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-brand/50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(117,194,23,0.1)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-lg bg-brand/15 text-brand transition-all duration-500 group-hover:scale-[1.08] group-hover:bg-brand/20 group-hover:shadow-[0_0_20px_rgba(117,194,23,0.3)]">
                  <Icon size={24} strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Requirements
