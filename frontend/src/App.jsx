import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AccountModal from './components/AccountModal'
import AdminDashboard from './components/AdminDashboard'
import AuthPage from './components/AuthPage'
import CalendarCard from './components/CalendarCard'
import CompanyDashboard from './components/CompanyDashboard'
import EventCard from './components/EventCard'
import EventPage from './components/EventPage'
import MapCard from './components/MapCard'
import ProfilePage from './components/ProfilePage'
import RecCard from './components/RecCard'
import TopNav from './components/TopNav'
import YourEventsCard from './components/YourEventsCard'
import { colorFor } from './categories'
import { clearSession, loadSession, saveSession } from './session'
import * as api from './api'

const FALLBACK = { lat: 37.7749, lng: -122.4194 } // San Francisco

function inDateRange(event, range) {
  const now = new Date()
  const d = new Date(event.starts_at)
  if (range === 'today') {
    return d.toDateString() === now.toDateString()
  }
  if (range === 'week') {
    const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
    return d <= end
  }
  if (range === 'weekend') {
    const day = now.getDay() // 0 Sun .. 6 Sat
    const sat = new Date(now)
    sat.setHours(0, 0, 0, 0)
    sat.setDate(sat.getDate() + (day === 0 ? -1 : 6 - day))
    const end = new Date(sat)
    end.setDate(end.getDate() + 2)
    return d >= sat && d < end
  }
  return true
}

// The gate: nobody is signed in until they pass the auth page (or pick a
// testing-mode seat), and the session decides which app you see.
export default function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light',
  )
  const [session, setSession] = useState(loadSession)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('letsntwrk-theme', theme)
    } catch {
      /* private mode */
    }
  }, [theme])

  const onToggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  const enter = useCallback((s) => {
    saveSession(s)
    setSession(s)
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  if (!session) {
    return <AuthPage onEnter={enter} theme={theme} onToggleTheme={onToggleTheme} />
  }
  if (session.role === 'admin') {
    return (
      <AdminDashboard theme={theme} onToggleTheme={onToggleTheme} onSignOut={signOut} />
    )
  }
  if (session.role === 'company') {
    return (
      <CompanyDashboard
        company={session.company}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSignOut={signOut}
      />
    )
  }
  return <UserHome theme={theme} onToggleTheme={onToggleTheme} onSignOut={signOut} />
}

function UserHome({ theme, onToggleTheme, onSignOut }) {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState(null) // nearby upcoming; null = loading
  const [myEvents, setMyEvents] = useState([]) // everything registered, past + future
  const [origin, setOrigin] = useState(null)
  const [userLoc, setUserLoc] = useState(null)
  const [locStatus, setLocStatus] = useState('locating')
  const [apiError, setApiError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mapFull, setMapFull] = useState(false)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [dateRange, setDateRange] = useState('any')
  const [maxMiles, setMaxMiles] = useState('any')
  const [sort, setSort] = useState('soonest')
  const [openSpots, setOpenSpots] = useState(false)

  const [accountOpen, setAccountOpen] = useState(false)
  const [pendingEventId, setPendingEventId] = useState(null)

  const [mapTarget, setMapTarget] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const flyTo = useCallback((lat, lng, zoom) => {
    setMapTarget({ lat, lng, zoom, key: Date.now() })
  }, [])

  const loadEvents = useCallback(async (lat, lng) => {
    try {
      const list = await api.getEvents(lat, lng)
      setEvents(list)
      setOrigin({ lat, lng })
      setApiError(null)
    } catch (err) {
      setApiError(err.message || 'Could not load events')
      setEvents([])
    }
  }, [])

  const loadMyEvents = useCallback(async (o) => {
    try {
      setMyEvents(await api.getMyEvents(o))
    } catch {
      /* non-fatal */
    }
  }, [])

  // Placeholder auth: the backend signs every request in as the test account.
  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => setApiError('Could not reach the LetsNtwrk API'))
  }, [])

  // Refresh "your events" once we know where the user is.
  useEffect(() => {
    if (origin) loadMyEvents(origin)
  }, [origin, loadMyEvents])

  // Locate the visitor on first load, fall back to San Francisco.
  useEffect(() => {
    let done = false
    const fallback = () => {
      if (done) return
      done = true
      setLocStatus('off')
      loadEvents(FALLBACK.lat, FALLBACK.lng)
      flyTo(FALLBACK.lat, FALLBACK.lng, 12)
    }
    if (!navigator.geolocation) {
      fallback()
      return
    }
    const timer = setTimeout(fallback, 8000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        if (done) return
        done = true
        const { latitude: lat, longitude: lng } = pos.coords
        setLocStatus('on')
        setUserLoc({ lat, lng })
        loadEvents(lat, lng)
        flyTo(lat, lng, 12)
      },
      () => {
        clearTimeout(timer)
        fallback()
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    )
    return () => clearTimeout(timer)
  }, [loadEvents, flyTo])

  // One Escape handler for all layers, innermost first.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (accountOpen) return // modal handles itself via its buttons
      if (selectedId != null) setSelectedId(null)
      else if (profileOpen) setProfileOpen(false)
      else if (mapFull) setMapFull(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [accountOpen, selectedId, profileOpen, mapFull])

  const applyEventUpdate = useCallback(
    (updated) => {
      setEvents((prev) => (prev || []).map((e) => (e.id === updated.id ? updated : e)))
      loadMyEvents(origin)
    },
    [origin, loadMyEvents],
  )

  const doRegister = useCallback(
    async (eventId) => {
      try {
        const updated = await api.registerFor(eventId, origin)
        applyEventUpdate(updated)
        showToast(`You're registered for ${updated.title}`)
      } catch (err) {
        showToast(err.message || 'Registration failed')
      }
    },
    [origin, applyEventUpdate, showToast],
  )

  const handleRegister = useCallback(
    (eventId) => {
      if (user && !user.profile_completed) {
        setPendingEventId(eventId)
        setAccountOpen(true)
        return
      }
      doRegister(eventId)
    },
    [user, doRegister],
  )

  const handleUnregister = useCallback(
    async (eventId) => {
      try {
        const updated = await api.unregisterFrom(eventId, origin)
        applyEventUpdate(updated)
        showToast('Registration cancelled')
      } catch (err) {
        showToast(err.message || 'Could not cancel registration')
      }
    },
    [origin, applyEventUpdate, showToast],
  )

  const handleSaveProfile = useCallback(
    async (fields) => {
      const updated = await api.updateMe({ ...fields, profile_completed: true })
      setUser(updated)
      setAccountOpen(false)
      if (pendingEventId != null) {
        const id = pendingEventId
        setPendingEventId(null)
        await doRegister(id)
      }
    },
    [pendingEventId, doRegister],
  )

  const handleSelect = useCallback(
    (id) => {
      setSelectedId(id)
      if (id != null) {
        const ev = (events || []).find((e) => e.id === id)
        if (ev) flyTo(ev.lat, ev.lng, 14)
      }
    },
    [events, flyTo],
  )

  const myUpcoming = useMemo(() => {
    const now = Date.now()
    return myEvents
      .filter((e) => new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  }, [myEvents])

  const visibleEvents = useMemo(() => {
    let list = events || []
    if (category !== 'All') list = list.filter((e) => e.category === category)
    if (dateRange !== 'any') list = list.filter((e) => inDateRange(e, dateRange))
    if (maxMiles !== 'any') {
      list = list.filter(
        (e) => e.distance_km != null && e.distance_km * 0.621371 <= Number(maxMiles),
      )
    }
    if (openSpots) list = list.filter((e) => e.going < e.capacity)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((e) =>
        [
          e.title,
          e.venue,
          e.category,
          ...(e.companies || []).map((c) => c.name),
          e.host ? e.host.name : '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    list = [...list]
    if (sort === 'closest') {
      list.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9))
    } else if (sort === 'popular') {
      list.sort((a, b) => b.going - a.going)
    } else {
      list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    }
    return list
  }, [events, category, dateRange, maxMiles, openSpots, query, sort])

  const recommended = useMemo(() => {
    const cats = new Set(myUpcoming.map((e) => e.category))
    return (events || [])
      .filter((e) => !e.is_registered)
      .map((e) => {
        let score = e.going / 10
        let reason = 'Popular nearby'
        if (cats.has(e.category)) {
          score += 5
          reason = `More ${e.category} for you`
        } else if (e.distance_km != null && e.distance_km < 5) {
          score += 1.5
          reason = 'Close to you'
        }
        return { event: e, score, reason }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [events, myUpcoming])

  // Event pages can be opened from the feed (nearby) or the profile (history).
  const selectedEvent = useMemo(() => {
    if (selectedId == null) return null
    return (
      (events || []).find((e) => e.id === selectedId) ||
      myEvents.find((e) => e.id === selectedId) ||
      null
    )
  }, [events, myEvents, selectedId])

  const mapEvents = useMemo(() => {
    if (
      selectedEvent &&
      !visibleEvents.some((e) => e.id === selectedEvent.id) &&
      new Date(selectedEvent.starts_at).getTime() >= Date.now()
    ) {
      return [...visibleEvents, selectedEvent]
    }
    return visibleEvents
  }, [visibleEvents, selectedEvent])

  const showSearchArea = useMemo(() => {
    if (!origin || !mapCenter) return false
    return api.haversineKm(origin, mapCenter) > 8
  }, [origin, mapCenter])

  const searchThisArea = useCallback(() => {
    if (mapCenter) loadEvents(mapCenter.lat, mapCenter.lng)
  }, [mapCenter, loadEvents])

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not available in this browser')
      return
    }
    setLocStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocStatus('on')
        setUserLoc({ lat, lng })
        loadEvents(lat, lng)
        flyTo(lat, lng, 12)
      },
      () => {
        setLocStatus('off')
        showToast('Location permission is off — showing San Francisco')
      },
      { timeout: 7000 },
    )
  }, [loadEvents, flyTo, showToast])

  const categories = ['All', ...new Set((events || []).map((e) => e.category))]

  return (
    <div className="page">
      <TopNav
        user={user}
        query={query}
        onQuery={setQuery}
        onOpenProfile={() => setProfileOpen(true)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {apiError && (
        <div className="api-banner">
          {apiError} — is the backend running on port 8000?
        </div>
      )}

      <div className="shell">
        <aside className="left-rail">
          <CalendarCard
            events={myEvents}
            onPickDay={(evs) => evs[0] && handleSelect(evs[0].id)}
          />
          <YourEventsCard
            events={myUpcoming}
            onSelect={handleSelect}
            onOpenProfile={() => setProfileOpen(true)}
          />
        </aside>

        <main className="feed">
          <MapCard
            theme={theme}
            full={mapFull}
            onToggleFull={() => setMapFull((f) => !f)}
            events={mapEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
            target={mapTarget}
            userLoc={userLoc}
            onMoved={setMapCenter}
            showSearchArea={showSearchArea}
            onSearchArea={searchThisArea}
            onLocate={locateMe}
            locStatus={locStatus}
            onRetryLocation={locateMe}
          />

          <section className="feed-section">
            <div className="fs-head">
              <h2>Recommended for you</h2>
              <span className="fs-sub">
                Based on what you're going to and what's busy nearby
              </span>
            </div>
            {events === null ? (
              <div className="empty card">
                <p>Finding events near you…</p>
              </div>
            ) : recommended.length === 0 ? (
              <div className="empty card">
                <p>You're registered for everything nearby. Impressive.</p>
              </div>
            ) : (
              <div className="rec-grid">
                {recommended.map(({ event, reason }) => (
                  <RecCard
                    key={event.id}
                    event={event}
                    reason={reason}
                    onClick={() => handleSelect(event.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="feed-section">
            <div className="fs-head">
              <h2>All events nearby</h2>
              <span className="fs-sub">
                {events === null ? '…' : `${visibleEvents.length} upcoming`}
              </span>
            </div>
            <div className="filters-row feed-filters">
              <div className="chips">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`chip${category === c ? ' active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c !== 'All' && (
                      <span className="cat-dot" style={{ background: colorFor(c) }} />
                    )}
                    {c}
                  </button>
                ))}
              </div>
              <div className="filters-row">
                <select
                  className="filter-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="any">Any time</option>
                  <option value="today">Today</option>
                  <option value="weekend">This weekend</option>
                  <option value="week">Next 7 days</option>
                </select>
                <select
                  className="filter-select"
                  value={maxMiles}
                  onChange={(e) => setMaxMiles(e.target.value)}
                >
                  <option value="any">Any distance</option>
                  <option value="2">Within 2 mi</option>
                  <option value="5">Within 5 mi</option>
                  <option value="10">Within 10 mi</option>
                  <option value="25">Within 25 mi</option>
                </select>
                <select
                  className="filter-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="soonest">Soonest</option>
                  <option value="closest">Closest</option>
                  <option value="popular">Most popular</option>
                </select>
                <button
                  className={`chip${openSpots ? ' active' : ''}`}
                  onClick={() => setOpenSpots(!openSpots)}
                >
                  Open spots
                </button>
              </div>
            </div>
            {events !== null && visibleEvents.length === 0 ? (
              <div className="empty card">
                <p>No events match.</p>
                <p className="empty-sub">Try clearing your search or filters.</p>
              </div>
            ) : (
              <div className="card list-card">
                {visibleEvents.map((e) => (
                  <EventCard key={e.id} event={e} onClick={() => handleSelect(e.id)} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {profileOpen && user && (
        <ProfilePage
          user={user}
          myEvents={myEvents}
          onClose={() => setProfileOpen(false)}
          onSelect={handleSelect}
          onEdit={() => setAccountOpen(true)}
          onSignOut={onSignOut}
        />
      )}
      {selectedEvent && (
        <EventPage
          event={selectedEvent}
          onClose={() => setSelectedId(null)}
          onRegister={handleRegister}
          onUnregister={handleUnregister}
        />
      )}
      {accountOpen && user && (
        <AccountModal
          user={user}
          pendingEvent={
            pendingEventId != null
              ? (events || []).find((e) => e.id === pendingEventId)
              : null
          }
          onClose={() => {
            setAccountOpen(false)
            setPendingEventId(null)
          }}
          onSave={handleSaveProfile}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
