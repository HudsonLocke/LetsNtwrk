import { useEffect, useState } from 'react'
import { CATEGORY_COLORS } from '../categories'

const pad = (n) => String(n).padStart(2, '0')

function toDateInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeInput(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStart() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(18, 0, 0, 0)
  return d
}

// One form for both dashboards: `event` set = edit (PATCH fields), otherwise
// create. onSave receives the fields; the caller owns the API call.
export default function EventFormModal({ event, heading, onClose, onSave, onDelete }) {
  const start = event ? new Date(event.starts_at) : defaultStart()
  const [title, setTitle] = useState(event ? event.title : '')
  const [category, setCategory] = useState(event ? event.category : 'Social')
  const [date, setDate] = useState(toDateInput(start))
  const [time, setTime] = useState(toTimeInput(start))
  const [duration, setDuration] = useState(event ? event.duration_minutes : 120)
  const [capacity, setCapacity] = useState(event ? event.capacity : 50)
  const [venue, setVenue] = useState(event ? event.venue : '')
  const [address, setAddress] = useState(event ? event.address : '')
  const [description, setDescription] = useState(event ? event.description : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const valid =
    title.trim() && date && time && Number(capacity) >= 1 && Number(duration) >= 15

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        category,
        starts_at: `${date}T${time}:00`,
        duration_minutes: Number(duration),
        capacity: Number(capacity),
        venue: venue.trim(),
        address: address.trim(),
        description: description.trim(),
      })
    } catch (err) {
      setError(err.message || 'Could not save the event')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(err.message || 'Could not delete the event')
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal event-form" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{heading}</h3>
        {event && <p className="modal-sub">{event.going} signed up so far</p>}

        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Founders & Coffee"
            autoFocus={!event}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Category</span>
            <select
              className="field-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {Object.keys(CATEGORY_COLORS).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Capacity</span>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Venue</span>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. The Grind House"
          />
        </label>
        <label className="field">
          <span>Address</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should people expect?"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          {onDelete && (
            <button
              className={`btn ghost danger${confirmDelete ? ' confirm' : ''}`}
              onClick={handleDelete}
              disabled={saving}
            >
              {confirmDelete ? 'Really delete?' : 'Delete'}
            </button>
          )}
          <span className="modal-spacer" />
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary modal-save" onClick={handleSave} disabled={saving || !valid}>
            {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  )
}
