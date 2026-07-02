import MapView from './MapView'

export default function MapCard({
  theme,
  full,
  onToggleFull,
  events,
  selectedId,
  onSelect,
  target,
  userLoc,
  onMoved,
  showSearchArea,
  onSearchArea,
  onLocate,
  locStatus,
  onRetryLocation,
}) {
  return (
    <div className={`map-card${full ? ' full' : ''}`}>
      <MapView
        theme={theme}
        events={events}
        selectedId={selectedId}
        onSelect={onSelect}
        target={target}
        userLoc={userLoc}
        onMoved={onMoved}
        resizeSignal={full}
      />
      {showSearchArea && (
        <button className="search-area-btn" onClick={onSearchArea}>
          Search this area
        </button>
      )}
      <div className="map-actions">
        <button className="map-btn" onClick={onToggleFull} title={full ? 'Exit fullscreen' : 'Fullscreen map'}>
          {full ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          )}
        </button>
        <button className="map-btn" onClick={onLocate} title="Use my location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>
      <div className="map-status">
        {locStatus === 'locating' && <span>Locating you…</span>}
        {locStatus === 'on' && <span>Events near your location</span>}
        {locStatus === 'off' && (
          <span>
            Location off — showing San Francisco.{' '}
            <button className="linklike" onClick={onRetryLocation}>
              Retry
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
