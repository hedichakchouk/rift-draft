import { useState } from 'react'

/** Player face: loads public/avatars/<name in lowercase>.png, falls back to the initial. */
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [bad, setBad] = useState(false)
  const src = `${import.meta.env.BASE_URL}avatars/${name.toLowerCase()}.png`
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {bad ? name[0] : <img src={src} alt={name} onError={() => setBad(true)} draggable={false} />}
    </span>
  )
}
