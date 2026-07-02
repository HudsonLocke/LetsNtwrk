import { useRef, useState } from 'react'
import Avatar from './Avatar'

function slugify(name) {
  return (
    (name || 'test-user')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'test-user'
  )
}

// Downscale to a small square data-URL so it stores compactly in Postgres.
async function fileToAvatar(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })
  const size = 192
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const scale = Math.max(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function AccountModal({ user, pendingEvent, onClose, onSave }) {
  const [name, setName] = useState(user.name || '')
  const [headline, setHeadline] = useState(user.headline || '')
  const [company, setCompany] = useState(user.company || '')
  const [avatarData, setAvatarData] = useState(user.avatar_data || '')
  const [linkedinConnected, setLinkedinConnected] = useState(user.linkedin_connected)
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedin_url || '')
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      setAvatarData(await fileToAvatar(file))
      setError(null)
    } catch {
      setError('Could not read that image')
    }
  }

  const connectLinkedIn = () => {
    // Placeholder for the real OAuth flow.
    setConnecting(true)
    setTimeout(() => {
      setLinkedinConnected(true)
      setLinkedinUrl(`linkedin.com/in/${slugify(name)}`)
      setConnecting(false)
    }, 800)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        headline: headline.trim(),
        company: company.trim(),
        avatar_data: avatarData,
        linkedin_connected: linkedinConnected,
        linkedin_url: linkedinUrl,
      })
    } catch (err) {
      setError(err.message || 'Could not save your profile')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{user.profile_completed ? 'Your account' : 'Set up your account'}</h3>
        {pendingEvent && (
          <p className="modal-sub">
            Finish your profile to register for <strong>{pendingEvent.title}</strong>.
          </p>
        )}

        <div className="pfp-row">
          <button
            className="pfp-upload"
            onClick={() => fileRef.current && fileRef.current.click()}
            title="Upload a photo"
          >
            <Avatar user={{ name: name || user.email, avatar_data: avatarData }} size={72} />
            <span className="pfp-edit">Edit</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          <div className="pfp-hint">Upload a profile photo</div>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </label>
        <label className="field">
          <span>Headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Product designer"
          />
        </label>
        <label className="field">
          <span>Company</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Where do you work?"
          />
        </label>

        <div className="field">
          <span>LinkedIn</span>
          {linkedinConnected ? (
            <div className="li-connected">
              <span className="li-badge">in</span>
              <span className="li-url">{linkedinUrl}</span>
              <button
                className="linklike"
                onClick={() => {
                  setLinkedinConnected(false)
                  setLinkedinUrl('')
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn linkedin" onClick={connectLinkedIn} disabled={connecting}>
              <span className="li-badge">in</span>
              {connecting ? 'Connecting…' : 'Connect LinkedIn'}
            </button>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        <p className="fineprint">
          Signed in as {user.email} — placeholder account, demo only.
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : pendingEvent ? 'Save & register' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
