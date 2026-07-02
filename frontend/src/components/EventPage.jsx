import { useState } from 'react'
import Avatar from './Avatar'
import Facepile from './Facepile'
import { colorFor } from '../categories'

function fmtRange(startsAt, durationMinutes) {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  const day = start.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const t = (x) => x.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return { day, time: `${t(start)} – ${t(end)}` }
}

function PersonRow({ person }) {
  const sub = [person.headline, person.company].filter(Boolean).join(' · ')
  return (
    <div className="person">
      <Avatar user={person} size={36} />
      <div className="person-info">
        <div className="p-name">{person.name}</div>
        {sub && <div className="p-sub">{sub}</div>}
      </div>
      {person.linkedin_url && (
        <a
          className="p-linkedin"
          href={`https://${person.linkedin_url.replace(/^https?:\/\//, '')}`}
          target="_blank"
          rel="noreferrer"
          title="LinkedIn profile"
        >
          in
        </a>
      )}
    </div>
  )
}

export default function EventPage({ event, onClose, onRegister, onUnregister }) {
  const [showAll, setShowAll] = useState(false)

  const { day, time } = fmtRange(event.starts_at, event.duration_minutes)
  const ended =
    new Date(event.starts_at).getTime() + event.duration_minutes * 60000 < Date.now()
  const miles =
    event.distance_km != null ? (event.distance_km * 0.621371).toFixed(1) : null
  const full = !event.is_registered && event.going >= event.capacity
  const spots = event.capacity - event.going
  const attendees = event.attendees || []
  const shownAttendees = showAll ? attendees : attendees.slice(0, 6)
  const companies = event.companies || []

  return (
    <div className="event-page">
      <div className="ep-topbar">
        <button className="back" onClick={onClose}>
          ← All events
        </button>
      </div>
      <div className="ep-scroll">
        <div className="ep-container">
          <div
            className="ep-cover"
            style={{
              backgroundImage: event.cover_url ? `url(${event.cover_url})` : undefined,
              '--tint': colorFor(event.category),
            }}
          >
            <span className="chip static cover-chip">
              <span className="cat-dot" style={{ background: colorFor(event.category) }} />
              {event.category}
            </span>
          </div>

          <div className="ep-head">
            <h1>{event.title}</h1>
            <div className="ep-sub">
              {day} · {time} · {event.venue}
              {miles != null ? ` · ${miles} mi away` : ''}
            </div>
          </div>

          <div className="ep-cols">
            <div className="ep-main">
              <section>
                <h3>About this event</h3>
                <p className="lead">{event.description}</p>
                {(event.content_blocks || []).map((block, i) =>
                  block.type === 'image' ? (
                    <figure className="ep-img" key={i}>
                      <img src={block.url} alt={block.caption || event.title} loading="lazy" />
                      {block.caption && <figcaption>{block.caption}</figcaption>}
                    </figure>
                  ) : (
                    <p key={i}>{block.text}</p>
                  ),
                )}
              </section>

              {(event.schedule || []).length > 0 && (
                <section>
                  <h3>Schedule</h3>
                  <div className="timeline">
                    {event.schedule.map((item, i) => (
                      <div className="tl-item" key={i}>
                        <div className="tl-time">{item.time}</div>
                        <div className="tl-title">{item.title}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="ep-rail">
              <div className="rail-card">
                <div className="rc-line">
                  <span className="rc-label">Date</span>
                  <span>{day}</span>
                </div>
                <div className="rc-line">
                  <span className="rc-label">Time</span>
                  <span>{time}</span>
                </div>
                <div className="rc-line">
                  <span className="rc-label">Venue</span>
                  <span>
                    {event.venue}
                    <span className="rc-sub">{event.address}</span>
                  </span>
                </div>
                <div className="rc-line">
                  <span className="rc-label">Spots</span>
                  <span>{spots > 0 ? `${spots} of ${event.capacity} left` : 'At capacity'}</span>
                </div>
                {ended ? (
                  <>
                    <div className="ended-note">This event has ended</div>
                    {event.is_registered && (
                      <div className="registered-note">✓ You attended</div>
                    )}
                  </>
                ) : event.is_registered ? (
                  <>
                    <div className="registered-note">✓ You're registered</div>
                    <button className="btn ghost" onClick={() => onUnregister(event.id)}>
                      Cancel registration
                    </button>
                  </>
                ) : (
                  <button
                    className="btn primary"
                    disabled={full}
                    onClick={() => onRegister(event.id)}
                  >
                    {full ? 'Event is full' : 'Register'}
                  </button>
                )}
                <p className="fineprint">Free event · hosted on LetsNtwrk</p>
              </div>

              {event.host && (
                <div className="rail-card">
                  <h4>Hosted by</h4>
                  <PersonRow person={event.host} />
                </div>
              )}

              <div className="rail-card">
                <h4>
                  {ended ? 'Who attended' : 'Attendees'} ({event.going})
                </h4>
                {attendees.length === 0 ? (
                  <p className="rail-empty">Be the first to register.</p>
                ) : (
                  <>
                    <Facepile people={attendees} max={7} />
                    <div className="attendee-list">
                      {shownAttendees.map((p, i) => (
                        <PersonRow person={p} key={p.id ?? i} />
                      ))}
                    </div>
                    {attendees.length > 6 && (
                      <button className="linklike" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show fewer' : `Show all ${attendees.length}`}
                      </button>
                    )}
                  </>
                )}
              </div>

              {companies.length > 0 && (
                <div className="rail-card">
                  <h4>Companies going</h4>
                  <div className="company-chips">
                    {companies.map((c) => (
                      <span className="company-chip" key={c.name}>
                        <span className="company-mono">{c.name[0]}</span>
                        {c.name}
                        {c.count > 1 ? ` · ${c.count}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
