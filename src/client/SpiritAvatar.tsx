/** A stable little forest spirit: each name gets its own face and palette. */
export function SpiritAvatar(props: { name: string; colorIndex: number }) {
  const seed = () =>
    Array.from(props.name).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  const bodies = [
    "M7 24C7 11 14 5 24 5S42 13 41 26C43 39 36 44 25 43C12 45 5 38 7 24Z",
    "M8 25C0 24 5 10 15 8C24 0 39 7 44 19C47 25 39 27 35 26L36 36Q35 44 24 43Q12 44 12 36L13 26Z",
    "M11 19C4 1 12 0 18 16L28 16C32 -1 41 1 36 20C45 29 41 42 26 43C10 45 2 33 11 19Z",
    "M8 20L6 5L20 14Q25 11 30 14L43 6L40 25C46 39 35 44 24 43C9 44 3 34 8 20Z",
    "M24 4L31 13L43 15L39 27L43 38L29 39L21 45L14 36L4 32L10 20L10 9Z",
    "M9 15Q14 6 25 9Q40 5 40 19L40 37Q39 46 30 40Q24 48 18 40Q7 46 7 35Z",
  ]
  const tilt = () => (seed() % 13) - 6
  const palette = () => ["blue", "pink", "lime", "peach", "lavender", "mint"][props.colorIndex % 6]
  return (
    <span class="avatar" aria-hidden="true">
      <svg viewBox="0 0 48 48" style={{ "--spirit-color": `var(--color-avatar-${palette()})` }}>
        <g transform={`rotate(${tilt()} 24 26)`}>
          <path
            class="spirit-body"
            d={bodies[props.colorIndex % bodies.length]}
          />
          <path class="spirit-shine" d="M13 20C12 14 17 10 22 11" />
          <ellipse class="spirit-eye" cx="17" cy="24" rx="2.7" ry={3.2 + (seed() % 2)} />
          <ellipse class="spirit-eye" cx="31" cy="23" rx="2.9" ry={3.3 + ((seed() >> 2) % 2)} />
          <circle class="spirit-cheek" cx="12" cy="30" r="2.4" />
          <circle class="spirit-cheek" cx="36" cy="29" r="2.4" />
          {seed() % 2 ? (
            <path class="spirit-smile" d="M21 32Q24 36 27 31" />
          ) : (
            <ellipse class="spirit-eye" cx="24" cy="33" rx="2" ry="2.5" />
          )}
          {props.colorIndex % 3 === 0 && <path class="spirit-leaf" d="M24 8C23 3 27 1 32 2C32 6 28 9 24 8Z" />}
        </g>
      </svg>
    </span>
  )
}
