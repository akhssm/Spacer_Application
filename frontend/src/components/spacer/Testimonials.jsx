import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { TESTIMONIALS } from '@/data/spacer/siteContent'
import { Reveal } from '@/components/motion/Reveal'
import SectionHeading from '@/components/ui/SectionHeading'

const SLIDE_INTERVAL_MS = 6000

function Testimonials() {
  const [current, setCurrent] = useState(0)

  // Move to the next quote every few seconds. Clicking a dot restarts the timer,
  // because "current" changing re-runs this effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrent((index) => (index + 1) % TESTIMONIALS.length)
    }, SLIDE_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [current])

  const testimonial = TESTIMONIALS[current]

  return (
    <section id="testimonials" className="px-5 py-20">
      <div className="mx-auto w-full max-w-275">
        <SectionHeading eyebrow="Testimonials" title="Loved by Developers & Buyers" center />

        <Reveal className="mx-auto max-w-3xl">
          <figure className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center md:px-16">
            <div className="flex gap-1 text-[#f5b301]" aria-label="5 out of 5 stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={18} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <blockquote className="mt-6 text-xl leading-9">{testimonial.quote}</blockquote>
            <figcaption className="mt-6">
              <p className="font-bold">{testimonial.name}</p>
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            </figcaption>
          </figure>

          <div className="mt-7 flex justify-center gap-2">
            {TESTIMONIALS.map((item, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show testimonial ${index + 1}`}
                aria-current={index === current}
                onClick={() => setCurrent(index)}
                className={`h-2 cursor-pointer rounded-full transition-all ${
                  index === current ? 'w-6 bg-brand' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Testimonials
