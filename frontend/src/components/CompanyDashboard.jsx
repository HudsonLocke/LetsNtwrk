import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Avatar from './Avatar'
import DashTopbar from './DashTopbar'
import EventFormModal from './EventFormModal'
import { colorFor } from '../categories'
import * as api from '../api'

const FALLBACK = { lat: 37.7749, lng: -122.4194 } // San Francisco

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export default function CompanyDashboard({ company, theme, onToggleTheme, onSignOut }) {
  const [events, setEvents] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  // New events are dropped near the tester so they show up on the user map.
  const originRef = useRef(FALLBACK)

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const load = useCallback(async () => {
    try {
      setEvents(await api.getCompanyEvents(company))
      setError(null)
    } catch (err) {
      setError(err.message || 'Could not load company events')
    }
  }, [company])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        originRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    )
  }, [])

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const up = []
    const done = []
    for (const e of events || []) {
      if (new Date(e.starts_at).getTime() >= now) up.push(e)
      else done.push(e)
    }
    up.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    return { upcoming: up, past: done }
  }, [events])

  const totalSignups = (events || []).reduce((n, e) => n + e.going, 0)
  const upcomingCapacity = upcoming.reduce((n, e) => n + e.capacity, 0)
  const upcomingGoing = upcoming.reduce((n, e) => n + e.going, 0)
  const fillRate = upcomingCapacity
    ? Math.round((100 * upcomingGoing) / upcomingCapacity)
    : 0

  const handleCreate = async (fields) => {
    const { lat, lng } = originRef.current
    const created = await api.createEvent({
      ...fields,
      // Scatter within a couple of miles so new events don't stack on one dot.
      lat: lat + (Math.random() - 0.5) * 0.04,
      lng: lng + (Math.random() - 0.5) * 0.04,
      host_company: company,
    })
    setCreating(false)
    showToast(`“${created.title}” is live`)
    await load()
  }

  const handleEdit = async (fields) => {
    const updated = await api.updateEvent(editing.id, fields)
    setEditing(null)
    showToast(`Saved “${updated.title}”`)
    await load()
  }

  const handleDelete = async () => {
    await api.deleteEvent(editing.id)
    setEditing(null)
    showToast('Event deleted')
    await load()
  }

  const renderRow = (e, isPast) => (
    <div className={`co-event${isPast ? ' past' : ''}`} key={e.id}>
      <button
        className="co-event-main"
        onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
        title={expandedId === e.id ? 'Hide signups' : 'Show signups'}
      >
        <span
          className="ec-thumb co-thumb"
          style={{
            '--tint': colorFor(e.category),
            backgroundImage: e.cover_url ? `url(${e.cover_url})` : undefined,
          }}
        />
        <span className="co-event-body">
          <span className="cell-title">{e.title}</span>
          <span className="cell-sub">
            {fmtWhen(e.starts_at)} · {e.venue || 'Venue TBD'}
          </span>
        </span>
        <span className="co-event-right">
          <span className={`going-tag${isPast ? ' past' : ''}`}>
            {e.going}/{e.capacity} {isPast ? 'went' : 'going'}
          </span>
          <span className="meter">
            <i style={{ width: `${Math.min(100, (e.going / e.capacity) * 100)}%` }} />
          </span>
        </span>
        <span className="co-chevron">{expandedId === e.id ? '▾' : '▸'}</span>
      </button>
      <button className="row-btn co-edit" onClick={() => setEditing(e)}>
        Edit
      </button>

      {expandedId === e.id && (
        <div className="co-attendees">
          {e.attendees.length === 0 ? (
            <p className="empty-sub">
              No signups yet — it'll appear on the map and feed for people nearby.
            </p>
          ) : (
            e.attendees.map((a) => (
              <div className="attendee-row" key={a.id}>
                <Avatar user={a} size={30} />
                <span className="attendee-id">
                  <span className="cell-title">{a.name}</span>
                  <span className="cell-sub">
                    {[a.headline, a.company].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {a.linkedin_url && (
                  <a
                    className="pp-tag li attendee-li"
                    href={`https://${a.linkedin_url.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="li-badge">in</span>
                    Profile
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="page dash-page">
      <DashTopbar
        badge="Company admin"
        sub={company}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSignOut={onSignOut}
      />

      {error && (
        <div className="api-banner">{error} — is the backend running on port 8000?</div>
      )}

      <div className="dash-shell">
        {events === null ? (
          <div className="empty card">
            <p>Loading {company}'s events…</p>
          </div>
        ) : (
          <>
            <div className="dash-stats">
              <div className="card stat">
                <span className="stat-n">{events.length}</span>
                <span className="stat-l">Events hosted</span>
                <span className="stat-d">{past.length} wrapped up</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{upcoming.length}</span>
                <span className="stat-l">Upcoming</span>
                <span className="stat-d">on the calendar</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{totalSignups}</span>
                <span className="stat-l">Total signups</span>
                <span className="stat-d">all time</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{fillRate}%</span>
                <span className="stat-l">Seats filled</span>
                <span className="stat-d">across upcoming</span>
              </div>
            </div>

            <div className="card dash-card">
              <div className="dash-card-head">
                <h4 className="card-title">Upcoming events</h4>
                <button className="btn primary dash-new" onClick={() => setCreating(true)}>
                  + New event
                </button>
              </div>
              {upcoming.length === 0 ? (
                <div className="co-empty">
                  <p>No upcoming events for {company} yet.</p>
                  <p className="empty-sub">
                    Create one and it goes straight onto the map for members nearby.
                  </p>
                </div>
              ) : (
                upcoming.map((e) => renderRow(e, false))
              )}
            </div>

            {past.length > 0 && (
              <div className="card dash-card">
                <div className="dash-card-head">
                  <h4 className="card-title">Past events</h4>
                </div>
                {past.map((e) => renderRow(e, true))}
              </div>
            )}
          </>
        )}
      </div>

      {creating && (
        <EventFormModal
          heading={`New event · ${company}`}
          onClose={() => setCreating(false)}
          onSave={handleCreate}
        />
      )}
      {editing && (
        <EventFormModal
          event={editing}
          heading="Edit event"
          onClose={() => setEditing(null)}
          onSave={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
