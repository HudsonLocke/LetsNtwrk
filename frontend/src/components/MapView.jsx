import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { colorFor } from '../categories'

function dotIcon(category, selected) {
  return L.divIcon({
    className: 'dot-anchor',
    html: `<span class="map-dot${selected ? ' selected' : ''}" style="--dot:${colorFor(category)}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function userIcon() {
  return L.divIcon({
    className: 'dot-anchor',
    html: '<span class="user-dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function hoverHtml(e) {
  const d = new Date(e.starts_at)
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const cover = e.cover_url
    ? `<div class="hc-cover" style="background-image:url('${esc(e.cover_url)}')"></div>`
    : ''
  return `<div class="hover-card">${cover}
    <div class="hc-body">
      <div class="hc-title">${esc(e.title)}</div>
      <div class="hc-meta">${date} · ${time}</div>
      <div class="hc-meta">${esc(e.venue)} · ${e.going} going</div>
    </div></div>`
}

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

export default function MapView({
  theme,
  events,
  selectedId,
  onSelect,
  target,
  userLoc,
  onMoved,
  resizeSignal,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const markersRef = useRef(new Map())
  const userMarkerRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const onMovedRef = useRef(onMoved)
  onSelectRef.current = onSelect
  onMovedRef.current = onMoved

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.setView([39.5, -98.35], 4) // US overview until location resolves
    map.on('moveend', () => {
      const c = map.getCenter()
      if (onMovedRef.current) onMovedRef.current({ lat: c.lat, lng: c.lng })
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      tileRef.current = null
      markersRef.current = new Map()
      userMarkerRef.current = null
    }
  }, [])

  // Tile style follows the app theme.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) tileRef.current.remove()
    tileRef.current = L.tileLayer(TILE_URLS[theme === 'dark' ? 'dark' : 'light'], {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)
  }, [theme])

  // Keep markers in sync with the visible events.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const ids = new Set(events.map((e) => e.id))
    for (const [id, marker] of [...markers]) {
      if (!ids.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    }
    for (const e of events) {
      const existing = markers.get(e.id)
      if (existing) {
        existing.setIcon(dotIcon(e.category, e.id === selectedId))
        existing.setTooltipContent(hoverHtml(e))
      } else {
        const marker = L.marker([e.lat, e.lng], {
          icon: dotIcon(e.category, e.id === selectedId),
          riseOnHover: true,
        })
        marker.on('click', () => onSelectRef.current && onSelectRef.current(e.id))
        marker.bindTooltip(hoverHtml(e), {
          direction: 'top',
          offset: [0, -12],
          opacity: 1,
          className: 'dot-tip-rich',
        })
        marker.addTo(map)
        markers.set(e.id, marker)
      }
    }
  }, [events, selectedId])

  // Blue "you are here" dot.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLoc) return
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], {
        icon: userIcon(),
        interactive: false,
        zIndexOffset: -100,
      }).addTo(map)
    } else {
      userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng])
    }
  }, [userLoc])

  useEffect(() => {
    if (target && mapRef.current) {
      mapRef.current.flyTo([target.lat, target.lng], target.zoom || 13, {
        duration: 0.8,
      })
    }
  }, [target])

  // Re-measure after container size changes (e.g. fullscreen toggle).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.invalidateSize()
    const timer = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(timer)
  }, [resizeSignal])

  return <div ref={containerRef} className="map" />
}
