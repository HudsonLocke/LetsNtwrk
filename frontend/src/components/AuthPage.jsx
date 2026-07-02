import { useEffect, useState } from 'react'
import * as api from '../api'

const CUSTOM = '__custom__'

export default function AuthPage({ onEnter, theme, onToggleTheme }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Testing mode: company picker for the company-admin seat.
  const [companies, setCompanies] = useState(null) // null = loading
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyPick, setCompanyPick] = useState('')
  const [customCompany, setCustomCompany] = useState('')

  useEffect(() => {
    api
      .getCompanies()
      .then((list) => {
        setCompanies(list)
        if (list.length > 0) setCompanyPick(list[0].name)
        else setCompanyPick(CUSTOM)
      })
      .catch(() => {
        setCompanies([])
        setCompanyPick(CUSTOM)
      })
  }, [])

  const canSubmit =
    username.trim() && password && (mode === 'signin' || name.trim()) && !busy

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      // Placeholder auth: whatever was typed, the backend signs us in as a
      // regular member.
      if (mode === 'signup') await api.signup(name.trim(), username.trim(), password)
      else await api.login(username.trim(), password)
      onEnter({ role: 'user' })
    } catch (err) {
      setError(err.message || 'Could not reach the LetsNtwrk API')
      setBusy(false)
    }
  }

  const chosenCompany =
    companyPick === CUSTOM ? customCompany.trim() : companyPick

  const enterCompany = () => {
    if (chosenCompany) onEnter({ role: 'company', company: chosenCompany })
  }

  return (
    <div className="auth-page">
      <button
        className="icon-btn auth-theme"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>

      <div className="auth-wrap">
        <div className="brand auth-brand">
          Lets<span>Ntwrk</span>
        </div>
        <p className="auth-tag">Find networking events near you</p>

        <div className="card auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <label className="field">
                <span>Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="field">
              <span>Username or email</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@company.com"
                autoComplete="username"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Pick a password' : 'Your password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="btn primary auth-submit" type="submit" disabled={!canSubmit}>
              {busy ? 'Signing in…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="fineprint">
            Demo build — sign-in isn't wired up yet. Any username and password
            gets you in as a regular member.
          </p>
        </div>

        <div className="card auth-card auth-testing">
          <div className="auth-divider">
            <span>Testing mode</span>
          </div>
          <p className="auth-testing-sub">
            Trying the demo? Skip the form and open LetsNtwrk from another seat:
          </p>

          <button type="button" className="role-card" onClick={() => onEnter({ role: 'admin' })}>
            <span className="role-icon admin">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="role-body">
              <span className="role-name">LetsNtwrk admin</span>
              <span className="role-desc">
                Platform stats, the member list, and every event — with editing.
              </span>
            </span>
            <span className="role-go">→</span>
          </button>

          <button
            type="button"
            className={`role-card${companyOpen ? ' open' : ''}`}
            onClick={() => setCompanyOpen((o) => !o)}
          >
            <span className="role-icon company">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11" />
                <path d="M8 8h2M8 12h2M8 16h2" />
              </svg>
            </span>
            <span className="role-body">
              <span className="role-name">Company admin</span>
              <span className="role-desc">
                Host events for a company, watch signups roll in.
              </span>
            </span>
            <span className="role-go">{companyOpen ? '↓' : '→'}</span>
          </button>

          {companyOpen && (
            <div className="role-company">
              {companies === null ? (
                <span className="role-company-loading">Loading companies…</span>
              ) : (
                <>
                  {companies.length > 0 && (
                    <select
                      className="filter-select role-select"
                      value={companyPick}
                      onChange={(e) => setCompanyPick(e.target.value)}
                    >
                      {companies.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                          {c.events ? ` — ${c.events} event${c.events === 1 ? '' : 's'}` : ''}
                        </option>
                      ))}
                      <option value={CUSTOM}>Somewhere else…</option>
                    </select>
                  )}
                  {companyPick === CUSTOM && (
                    <input
                      className="search role-custom"
                      placeholder="Company name"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enterCompany()}
                      autoFocus
                    />
                  )}
                  <button
                    type="button"
                    className="btn primary role-enter"
                    disabled={!chosenCompany}
                    onClick={enterCompany}
                  >
                    Open dashboard
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
