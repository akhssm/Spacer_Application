import { STATEMENT } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'

function Statement() {
  return (
    <section className="bg-panel px-5 py-20 text-center md:py-24">
      <Reveal>
        <h2 className="text-4xl leading-tight font-bold md:text-[56px]">
          {STATEMENT.line}
          <br />
          <span className="text-brand">{STATEMENT.accentLine}</span>
        </h2>
      </Reveal>
    </section>
  )
}

export default Statement
