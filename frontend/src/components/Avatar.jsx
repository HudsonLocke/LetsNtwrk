import { useEffect, useState } from 'react'

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

export default function Avatar({ user, size = 32 }) {
  const src = (user && (user.avatar_data || user.avatar_url)) || ''
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])

  const name = (user && (user.name || user.email)) || '?'
  if (src && !broken) {
    return (
      <img
        className="avatar"
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    )
  }
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  const bg = PALETTE[hash % PALETTE.length]
  return (
    <span
      className="avatar avatar-initials"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}
