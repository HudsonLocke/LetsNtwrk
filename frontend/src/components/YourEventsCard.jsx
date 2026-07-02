export default function YourEventsCard({ events, onSelect, onOpenProfile }) {
  const shown = events.slice(0, 5)
  return (
    <div className="card ye-card">
      <h4 className="card-title">Your events</h4>
      {shown.length === 0 ? (
        <p className="ye-empty">Nothing on your calendar yet — find something on the map.</p>
      ) : (
        shown.map((e) => {
          const d = new Date(e.starts_at)
          return (
            <button className="ye-row" key={e.id} onClick={() => onSelect(e.id)}>
              <span className="ye-date">
                <span className="ye-mon">
                  {d.toLocaleDateString([], { month: 'short' }).toUpperCase()}
                </span>
                <span className="ye-day">{d.getDate()}</span>
              </span>
              <span className="ye-body">
                <span className="ye-title">{e.title}</span>
                <span className="ye-meta">
                  {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {e.venue}
                </span>
              </span>
            </button>
          )
        })
      )}
      {events.length > 5 && <div className="ye-more">+{events.length - 5} more</div>}
      <button className="linklike ye-profile" onClick={onOpenProfile}>
        View your profile →
      </button>
    </div>
  )
}
