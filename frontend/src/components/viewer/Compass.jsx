// Shows which way is north. Turns as the map turns; a click points the map north again.
function Compass({ heading, onReset }) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="Point map north"
      title="Point map north"
      className="inline-flex size-16 cursor-pointer items-center justify-center rounded-full bg-black/60 backdrop-blur"
    >
      <svg
        viewBox="0 0 64 64"
        className="size-14 transition-transform duration-300"
        style={{ transform: `rotate(${-heading}deg)` }}
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,0.25)" />
        <polygon points="32,12 36,32 32,30 28,32" fill="#e0453a" />
        <polygon points="32,52 36,32 32,34 28,32" fill="#ffffff" fillOpacity="0.6" />
        <text x="32" y="10" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
          N
        </text>
        <text x="32" y="61" textAnchor="middle" fontSize="8" fill="#bbb">
          S
        </text>
        <text x="5" y="35" textAnchor="middle" fontSize="8" fill="#bbb">
          W
        </text>
        <text x="59" y="35" textAnchor="middle" fontSize="8" fill="#bbb">
          E
        </text>
      </svg>
    </button>
  )
}

export default Compass
