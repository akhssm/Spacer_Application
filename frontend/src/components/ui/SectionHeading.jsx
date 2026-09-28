// Small green label plus the section title. "center" controls the alignment.
function SectionHeading({ eyebrow, title, center = false }) {
  return (
    <header className={center ? 'mb-10 text-center' : 'mb-10'}>
      {eyebrow && <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>}
      <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
    </header>
  )
}

export default SectionHeading
