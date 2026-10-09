import { useEffect, useState } from 'react'
import type { FlexGame } from './stats'

export interface Clip { title: string; url: string; thumb?: string }
const LOCAL = 'hd-clips-v1'

/** Stable id of a game: duration + the champion Hach (or the first member) played. */
export const gameKey = (g: FlexGame) => {
  const m = g.members.find(([w]) => w === 'Hach') ?? g.members[0]
  return `${g.duration}-${m?.[1] ?? 'x'}`
}

const readLocal = (): Record<string, Clip[]> => { try { return JSON.parse(localStorage.getItem(LOCAL) ?? '{}') } catch { return {} } }

/** Clips committed to the site (public/clips.json) plus the ones this browser added. */
export function useClips() {
  const [shared, setShared] = useState<Record<string, Clip[]>>({})
  const [local, setLocal] = useState<Record<string, Clip[]>>(readLocal)
  useEffect(() => { fetch(`./clips.json?t=${Math.floor(Date.now() / 600000)}`).then((r) => (r.ok ? r.json() : {})).then(setShared).catch(() => {}) }, [])
  const save = (next: Record<string, Clip[]>) => { setLocal(next); try { localStorage.setItem(LOCAL, JSON.stringify(next)) } catch { /* ignore */ } }
  return {
    get: (k: string) => [...(shared[k] ?? []).map((c) => ({ ...c, mine: false })), ...(local[k] ?? []).map((c) => ({ ...c, mine: true }))],
    add: (k: string, c: Clip) => save({ ...local, [k]: [...(local[k] ?? []), c] }),
    remove: (k: string, url: string) => save({ ...local, [k]: (local[k] ?? []).filter((c) => c.url !== url) }),
  }
}

export type Embed = { kind: 'iframe'; src: string } | { kind: 'video'; src: string } | { kind: 'link' }

/** Turn a pasted link into something we can play inline. */
export function toEmbed(raw: string): Embed {
  let u: URL
  try { u = new URL(raw.trim()) } catch { return { kind: 'link' } }
  const h = u.hostname.replace(/^www\./, '')
  if (h === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` }
  if (h.endsWith('youtube.com')) {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]
    if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` }
  }
  if (h === 'streamable.com') { const id = u.pathname.split('/').filter(Boolean).pop(); if (id) return { kind: 'iframe', src: `https://streamable.com/e/${id}` } }
  if (h === 'clips.twitch.tv') return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${u.pathname.slice(1)}&parent=${location.hostname}` }
  if (h.endsWith('twitch.tv')) { const id = u.pathname.match(/\/clip\/([\w-]+)/)?.[1]; if (id) return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${id}&parent=${location.hostname}` } }
  if (/\.(mp4|webm)(\?|$)/i.test(u.pathname + u.search)) return { kind: 'video', src: u.toString() }
  return { kind: 'link' }
}
