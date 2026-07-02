export default function DashTopbar({ badge, sub, theme, onToggleTheme, onSignOut }) {
  return (
    <nav className="topnav">
      <div className="tn-inner">
        <div className="brand">
          Lets<span>Ntwrk</span>
        </div>
        <span className="dash-badge">{badge}</span>
        {sub && <span className="dash-sub">{sub}</span>}
        <div className="tn-right">
          <button
            className="icon-btn"
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
          <button className="btn ghost dash-signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
