export interface LogoWallProps {
  label: string
  names: Array<{ name: string }>
}

/**
 * The customer wall.
 *
 * Renders nothing when no names are set, so switching the section on before
 * there is anyone to name produces an empty band rather than a lie.
 */
export function LogoWall({ label, names }: LogoWallProps) {
  const present = names.filter((entry) => entry.name.trim() !== '')
  if (present.length === 0) return null

  return (
    <div className="logos">
      <span className="section__body">{label}</span>
      <div className="logos__row">
        {present.map((entry) => (
          <span key={entry.name} className="logos__name">
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  )
}
