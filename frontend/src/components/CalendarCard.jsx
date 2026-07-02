import { useMemo, useState } from 'react'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export default function CalendarCard({ events, onPickDay }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  const byDay = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      const k = dayKey(new Date(e.starts_at))
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(e)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    }
    return map
  }, [events])

  const today = new Date()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, i - offset + 1))
  const label = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })

  return (
    <div className="card cal-card">
      <div className="cal-head">
        <span className="cal-title">{label}</span>
        <div className="cal-nav">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} title="Previous month">
            ‹
          </button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} title="Next month">
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <span key={`wd${i}`} className="cal-wd">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          const evs = byDay.get(dayKey(d)) || []
          const isToday = d.toDateString() === today.toDateString()
          const inMonth = d.getMonth() === month
          return (
            <button
              key={i}
              className={`cal-day${inMonth ? '' : ' out'}${isToday ? ' today' : ''}${
                evs.length ? ' has-ev' : ''
              }`}
              onClick={() => evs.length && onPickDay(evs)}
              title={evs.map((e) => e.title).join('\n')}
            >
              {d.getDate()}
              {evs.length > 0 && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>
      <div className="cal-legend">
        <span className="cal-dot" /> your events
      </div>
    </div>
  )
}
