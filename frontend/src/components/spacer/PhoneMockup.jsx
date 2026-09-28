import { Image, Info, Navigation, Search } from 'lucide-react'

// A made-up layout drawn with SVG, so the hero needs no image file.
// Each block is a grid of plots; the dark gaps between blocks are the roads.
const PLOT_WIDTH = 48
const PLOT_HEIGHT = 54
const GAP = 4

const BLOCKS = [
  { x: 20, y: 20, cols: 5, rows: 2 },
  { x: 300, y: 20, cols: 4, rows: 2 },
  { x: 20, y: 168, cols: 5, rows: 2 },
  { x: 300, y: 168, cols: 4, rows: 2 },
  { x: 20, y: 316, cols: 5, rows: 1 },
]

// Plots drawn in blue, as if the buyer has selected them
const SELECTED_PLOTS = [8, 22, 30]

function buildPlots() {
  const plots = []

  BLOCKS.forEach((block) => {
    for (let row = 0; row < block.rows; row++) {
      for (let col = 0; col < block.cols; col++) {
        plots.push({
          number: plots.length + 1,
          x: block.x + col * PLOT_WIDTH,
          y: block.y + row * PLOT_HEIGHT,
        })
      }
    }
  })

  return plots
}

const PLOTS = buildPlots()

const PHONE_BUTTONS = [
  { icon: Image, label: 'Gallery' },
  { icon: Info, label: 'Info' },
  { icon: Navigation, label: 'Locate' },
]

function PhoneMockup() {
  return (
    <div className="relative mx-auto h-110 w-53" aria-hidden="true">
      {/* Phone body */}
      <div className="absolute inset-0 rounded-[34px] border-2 border-[#46525e] bg-[#161616] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
        <div className="mx-auto mt-2.5 h-4 w-16 rounded-full bg-black" />
        <div className="mx-3 mt-3 rounded-md bg-white/5 py-1 text-center text-[9px] text-muted-foreground">
          your-project.link
        </div>
        <p className="mx-3 mt-3 text-[11px] tracking-wide text-[#b9822e]">PROJECT NAME</p>

        <div className="absolute inset-x-3 bottom-4 space-y-2">
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-[9px] text-muted-foreground">
            <Search size={10} /> Search Plot
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PHONE_BUTTONS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center justify-center gap-1 rounded-full bg-white/5 py-1.5 text-[8px] text-muted-foreground"
              >
                <Icon size={9} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The layout, tilted into 3D and bursting out of the phone */}
      <div className="absolute top-26 left-1/2 -ml-41 w-82">
        <svg
          viewBox="0 0 512 386"
          className="w-full drop-shadow-[0_24px_24px_rgba(0,0,0,0.6)] transform-[perspective(900px)_rotateX(56deg)_rotateZ(-32deg)]"
        >
          <rect x="4" y="4" width="504" height="378" rx="6" fill="#3a3a3a" />

          {/* Park in the last block */}
          <rect x="300" y="316" width="188" height="50" rx="3" fill="#5c8a45" />
          <circle cx="330" cy="341" r="11" fill="#3f6b2f" />
          <circle cx="394" cy="337" r="13" fill="#3f6b2f" />
          <circle cx="456" cy="343" r="10" fill="#3f6b2f" />

          {PLOTS.map((plot) => (
            <g key={plot.number}>
              <rect
                x={plot.x}
                y={plot.y}
                width={PLOT_WIDTH - GAP}
                height={PLOT_HEIGHT - GAP}
                rx="2"
                fill={SELECTED_PLOTS.includes(plot.number) ? '#3b9ae8' : '#eadfba'}
              />
              <text
                x={plot.x + (PLOT_WIDTH - GAP) / 2}
                y={plot.y + (PLOT_HEIGHT - GAP) / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#5a5238"
              >
                {plot.number}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default PhoneMockup
