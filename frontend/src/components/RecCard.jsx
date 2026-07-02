import { colorFor } from '../categories'

export default function RecCard({ event, reason, onClick }) {
  const d = new Date(event.starts_at)
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const miles =
    event.distance_km != null ? (event.distance_km * 0.621371).toFixed(1) : null

  return (
    <button className="rec-card" onClick={onClick}>
      <div
        className="rec-cover"
        style={{
          backgroundImage: event.cover_url ? `url(${event.cover_url})` : undefined,
          '--tint': colorFor(event.category),
        }}
      >
        {reason && <span className="rec-reason">{reason}</span>}
      </div>
      <div className="rec-body">
        <div className="rec-cat">
          <span className="cat-dot" style={{ background: colorFor(event.category) }} />
          {event.category}
        </div>
        <div className="rec-title">{event.title}</div>
        <div className="rec-meta">
          {date} · {time}
        </div>
        <div className="rec-sub">
          {event.venue}
          {miles != null ? ` · ${miles} mi` : ''} · {event.going} going
        </div>
      </div>
    </button>
  )
}
