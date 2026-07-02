import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Avatar from './Avatar'
import DashTopbar from './DashTopbar'
import EventFormModal from './EventFormModal'
import { colorFor } from '../categories'
import * as api from '../api'

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

function SignupsChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <div className="bars">
      {days.map((d) => (
        <div
          className="bar-col"
          key={d.date}
          title={`${new Date(d.date + 'T12:00:00').toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })} — ${d.count} signup${d.count === 1 ? '' : 's'}`}
        >
          <span className="bar-n">{d.count || ''}</span>
          <div className="bar-stack">
            <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="bar-label">{new Date(d.date + 'T12:00:00').getDate()}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard({ theme, onToggleTheme, onSignOut }) {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState(null)
  const [when, setWhen] = useState('upcoming') // upcoming | past | all
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const load = useCallback(async () => {
    try {
      const [s, evs] = await Promise.all([api.getAdminStats(), api.getAdminEvents()])
      setStats(s)
      setEvents(evs)
      setError(null)
    } catch (err) {
      setError(err.message || 'Could not load admin data')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visibleEvents = useMemo(() => {
    const now = Date.now()
    let list = events || []
    if (when === 'upcoming') list = list.filter((e) => new Date(e.starts_at) >= now)
    if (when === 'past') list = list.filter((e) => new Date(e.starts_at) < now)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((e) =>
        [e.title, e.venue, e.category, e.host ? e.host.name : '', e.host ? e.host.company : '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    // Upcoming soonest-first reads better; past stays newest-first.
    if (when === 'upcoming') {
      list = [...list].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    }
    return list
  }, [events, when, query])

  const saveEdit = async (fields) => {
    const updated = await api.updateEvent(editing.id, fields)
    setEditing(null)
    showToast(`Saved “${updated.title}”`)
    await load()
  }

  const deleteEditing = async () => {
    await api.deleteEvent(editing.id)
    setEditing(null)
    showToast('Event deleted')
    await load()
  }

  const totals = stats ? stats.totals : null

  return (
    <div className="page dash-page">
      <DashTopbar
        badge="Admin"
        sub="Platform overview"
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSignOut={onSignOut}
      />

      {error && (
        <div className="api-banner">{error} — is the backend running on port 8000?</div>
      )}

      <div className="dash-shell">
        {!stats || !events ? (
          <div className="empty card">
            <p>Loading the platform picture…</p>
          </div>
        ) : (
          <>
            <div className="dash-stats">
              <div className="card stat">
                <span className="stat-n">{totals.users}</span>
                <span className="stat-l">Members</span>
                <span className="stat-d">+{totals.new_users_7d} this week</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{totals.events}</span>
                <span className="stat-l">Events</span>
                <span className="stat-d">{totals.upcoming_events} upcoming</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{totals.registrations}</span>
                <span className="stat-l">Signups</span>
                <span className="stat-d">+{totals.signups_7d} this week</span>
              </div>
              <div className="card stat">
                <span className="stat-n">{totals.fill_rate}%</span>
                <span className="stat-l">Seats filled</span>
                <span className="stat-d">across upcoming events</span>
              </div>
            </div>

            <div className="dash-row">
              <div className="card dash-card">
                <div className="dash-card-head">
                  <h4 className="card-title">Signups — last 14 days</h4>
                </div>
                <SignupsChart days={stats.signups_by_day} />
              </div>

              <div className="card dash-card">
                <div className="dash-card-head">
                  <h4 className="card-title">Most popular upcoming</h4>
                </div>
                {stats.top_events.map((e, i) => (
                  <div className="top-event" key={e.id}>
                    <span className="top-rank">{i + 1}</span>
                    <span className="top-body">
                      <span className="top-title">{e.title}</span>
                      <span className="top-meta">
                        {fmtWhen(e.starts_at)} · {e.venue}
                      </span>
                    </span>
                    <span className="going-tag">
                      {e.going}/{e.capacity}
                    </span>
                  </div>
                ))}
                <div className="cat-counts">
                  {stats.events_by_category.map((c) => (
                    <span className="chip static" key={c.category}>
                      <span className="cat-dot" style={{ background: colorFor(c.category) }} />
                      {c.category} · {c.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card dash-card">
              <div className="dash-card-head">
                <h4 className="card-title">Events</h4>
                <div className="dash-tools">
                  <div className="chips">
                    {['upcoming', 'past', 'all'].map((w) => (
                      <button
                        key={w}
                        className={`chip${when === w ? ' active' : ''}`}
                        onClick={() => setWhen(w)}
                      >
                        {w[0].toUpperCase() + w.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    className="search dash-search"
                    placeholder="Search events"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Category</th>
                      <th>When</th>
                      <th>Host</th>
                      <th>Signups</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((e) => {
                      const past = new Date(e.starts_at) < Date.now()
                      return (
                        <tr key={e.id}>
                          <td>
                            <span className="cell-title">{e.title}</span>
                            <span className="cell-sub">{e.venue}</span>
                          </td>
                          <td>
                            <span className="chip static">
                              <span className="cat-dot" style={{ background: colorFor(e.category) }} />
                              {e.category}
                            </span>
                          </td>
                          <td>
                            <span className={past ? 'cell-past' : ''}>{fmtWhen(e.starts_at)}</span>
                          </td>
                          <td>
                            <span className="cell-host">
                              {e.host ? e.host.name : '—'}
                              <span className="cell-sub">{e.host ? e.host.company : ''}</span>
                            </span>
                          </td>
                          <td>
                            <span className="cell-signups">
                              {e.going}/{e.capacity}
                              <span className="meter">
                                <i style={{ width: `${Math.min(100, (e.going / e.capacity) * 100)}%` }} />
                              </span>
                            </span>
                          </td>
                          <td>
                            <button className="row-btn" onClick={() => setEditing(e)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {visibleEvents.length === 0 && (
                  <p className="empty-sub dash-empty">No events match.</p>
                )}
              </div>
            </div>

            <div className="card dash-card">
              <div className="dash-card-head">
                <h4 className="card-title">Members</h4>
                <span className="fs-sub">by events attended</span>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <span className="cell-member">
                            <Avatar user={u} size={28} />
                            <span>
                              <span className="cell-title">{u.name}</span>
                              <span className="cell-sub">{u.headline}</span>
                            </span>
                          </span>
                        </td>
                        <td>{u.company || '—'}</td>
                        <td>
                          <span className="cell-email">{u.email}</span>
                        </td>
                        <td>{fmtDay(u.joined)}</td>
                        <td>{u.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {editing && (
        <EventFormModal
          event={editing}
          heading="Edit event"
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onDelete={deleteEditing}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
