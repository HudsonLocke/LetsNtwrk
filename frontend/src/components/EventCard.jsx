import { colorFor } from '../categories'

export default function EventCard({ event, onClick }) {
  const d = new Date(event.starts_at)
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const miles =
    event.distance_km != null ? (event.distance_km * 0.621371).toFixed(1) : null
  const past = d.getTime() < Date.now()

  return (
    <button className="event-card" onClick={onClick}>
      <div
        className="ec-thumb"
        style={{
          backgroundImage: event.cover_url ? `url(${event.cover_url})` : undefined,
          '--tint': colorFor(event.category),
        }}
      />
      <div className="ec-body">
        <div className="ec-title">
          <span>{event.title}</span>
          {event.is_registered && (
            <span className={`going-tag${past ? ' past' : ''}`}>
              {past ? 'Attended' : 'Going'}
            </span>
          )}
        </div>
        <div className="ec-meta">
          {date} · {time}
        </div>
        <div className="ec-sub">
          <span className="cat-dot" style={{ background: colorFor(event.category) }} />
          {event.venue}
          {miles != null ? ` · ${miles} mi` : ''} · {event.going} going
        </div>
      </div>
    </button>
  )
}
