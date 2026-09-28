import { Zap } from 'lucide-react'
import { DELIVERY } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'

function Delivery() {
  return (
    <section className="px-5 py-24 text-center">
      <Reveal className="mx-auto w-full max-w-3xl">
        <span className="inline-flex size-18 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-brand shadow-[0_0_40px_rgba(117,194,23,0.25)]">
          <Zap size={30} fill="currentColor" />
        </span>
        <h2 className="mt-8 text-5xl leading-[1.05] font-bold uppercase italic text-brand md:text-7xl">
          {DELIVERY.title}
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-7 text-muted-foreground">{DELIVERY.text}</p>
      </Reveal>
    </section>
  )
}

export default Delivery
