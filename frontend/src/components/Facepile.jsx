import Avatar from './Avatar'

export default function Facepile({ people, max = 6, size = 30 }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  if (people.length === 0) return null
  return (
    <div className="facepile">
      {shown.map((p, i) => (
        <span className="fp-item" key={p.id ?? i} title={p.name}>
          <Avatar user={p} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="fp-more" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{extra}
        </span>
      )}
    </div>
  )
}
