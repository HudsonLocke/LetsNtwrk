async function json(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail || detail
    } catch {
      /* not json */
    }
    throw new Error(detail)
  }
  return res.json()
}

function originQs(origin) {
  if (!origin) return ''
  return `?lat=${origin.lat}&lng=${origin.lng}`
}

// Placeholder auth: the backend accepts anything and signs you in as the
// regular test account.
export const login = (username, password) =>
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(json)

export const signup = (name, username, password) =>
  fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password }),
  }).then(json)

export const getCompanies = () => fetch('/api/companies').then(json)

export const getAdminStats = () => fetch('/api/admin/stats').then(json)

export const getAdminEvents = () => fetch('/api/admin/events').then(json)

export const getCompanyEvents = (company) =>
  fetch(`/api/company/events?company=${encodeURIComponent(company)}`).then(json)

export const createEvent = (fields) =>
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }).then(json)

export const updateEvent = (eventId, fields) =>
  fetch(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }).then(json)

export const deleteEvent = (eventId) =>
  fetch(`/api/events/${eventId}`, { method: 'DELETE' }).then(json)

export const getMe = () => fetch('/api/me').then(json)

export const updateMe = (fields) =>
  fetch('/api/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }).then(json)

export const getEvents = (lat, lng) =>
  fetch(`/api/events?lat=${lat}&lng=${lng}`).then(json)

export const getMyEvents = (origin) =>
  fetch(`/api/me/events${originQs(origin)}`).then(json)

export const registerFor = (eventId, origin) =>
  fetch(`/api/events/${eventId}/register${originQs(origin)}`, { method: 'POST' }).then(json)

export const unregisterFrom = (eventId, origin) =>
  fetch(`/api/events/${eventId}/register${originQs(origin)}`, { method: 'DELETE' }).then(json)

export function haversineKm(a, b) {
  const r = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(h))
}
