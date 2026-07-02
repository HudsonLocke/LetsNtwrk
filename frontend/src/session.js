// Placeholder sessions: who you're signed in as lives in localStorage.
// role: 'user' (regular member) | 'admin' (LetsNtwrk admin) | 'company'
// (a company's event manager, with `company` naming which one).

const KEY = 'letsntwrk-session'
const ROLES = new Set(['user', 'admin', 'company'])

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session || !ROLES.has(session.role)) return null
    if (session.role === 'company' && !session.company) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    /* private mode */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}
