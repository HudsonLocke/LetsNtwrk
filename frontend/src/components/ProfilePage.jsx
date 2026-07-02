import Avatar from './Avatar'
import EventCard from './EventCard'

function splitEvents(myEvents) {
  const now = Date.now()
  const upcoming = []
  const attended = []
  for (const e of myEvents) {
    if (new Date(e.starts_at).getTime() >= now) upcoming.push(e)
    else attended.push(e)
  }
  upcoming.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  attended.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
  return { upcoming, attended }
}

export default function ProfilePage({ user, myEvents, onClose, onSelect, onEdit, onSignOut }) {
  const { upcoming, attended } = splitEvents(myEvents || [])
  const companiesMet = [
    ...new Set(attended.flatMap((e) => (e.companies || []).map((c) => c.name))),
  ]
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : ''
  const subtitle = [user.headline, user.company].filter(Boolean).join(' · ')

  return (
    <div className="profile-page">
      <div className="pp-topbar">
        <button className="back" onClick={onClose}>
          ← Back
        </button>
        <div className="pp-actions">
          <button className="btn ghost pp-edit" onClick={onEdit}>
            Edit profile
          </button>
          {onSignOut && (
            <button className="btn ghost pp-edit pp-signout" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <div className="pp-scroll">
        <div className="pp-container">
          <div className="card pp-header">
            <Avatar user={user} size={88} />
            <div className="pp-id">
              <h1>{user.name || 'Unnamed'}</h1>
              {subtitle && <div className="pp-sub">{subtitle}</div>}
              <div className="pp-tags">
                {user.linkedin_connected && user.linkedin_url && (
                  <a
                    className="pp-tag li"
                    href={`https://${user.linkedin_url.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="li-badge">in</span>
                    {user.linkedin_url}
                  </a>
                )}
                <span className="pp-tag">{user.email}</span>
                {memberSince && <span className="pp-tag">Member since {memberSince}</span>}
              </div>
            </div>
          </div>

          <div className="pp-stats">
            <div className="card stat">
              <span className="stat-n">{upcoming.length}</span>
              <span className="stat-l">Upcoming</span>
            </div>
            <div className="card stat">
              <span className="stat-n">{attended.length}</span>
              <span className="stat-l">Attended</span>
            </div>
            <div className="card stat">
              <span className="stat-n">{companiesMet.length}</span>
              <span className="stat-l">Companies met</span>
            </div>
          </div>

          <div className="card pp-section">
            <h4 className="card-title">Upcoming events</h4>
            {upcoming.length === 0 ? (
              <p className="ye-empty">Nothing yet — go find your people on the map.</p>
            ) : (
              upcoming.map((e) => (
                <EventCard key={e.id} event={e} onClick={() => onSelect(e.id)} />
              ))
            )}
          </div>

          <div className="card pp-section">
            <h4 className="card-title">Attended</h4>
            {attended.length === 0 ? (
              <p className="ye-empty">Events you've been to will show up here.</p>
            ) : (
              attended.map((e) => (
                <div className="attended-row" key={e.id}>
                  <EventCard event={e} onClick={() => onSelect(e.id)} />
                </div>
              ))
            )}
          </div>

          {companiesMet.length > 0 && (
            <div className="card pp-section">
              <h4 className="card-title">Companies you've networked with</h4>
              <div className="company-chips">
                {companiesMet.slice(0, 18).map((n) => (
                  <span className="company-chip" key={n}>
                    <span className="company-mono">{n[0]}</span>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
