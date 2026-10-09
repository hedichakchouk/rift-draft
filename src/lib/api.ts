// Talks to the Cloudflare Worker (see /worker). The URL lives in public/config.json so it can change without a rebuild.
let cfgP: Promise<{ apiUrl: string }> | null = null
export const loadConfig = () =>
  (cfgP ??= fetch('./config.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ apiUrl: '' })))
export const apiUrl = async () => ((await loadConfig()).apiUrl ?? '').replace(/\/$/, '')

export interface RemoteProfile {
  riotId: string; region: string; level: number | null; icon: number | null
  solo: { tier: string; division: string; lp: number; wins: number; losses: number } | null
  flex: { tier: string; division: string; lp: number; wins: number; losses: number } | null
  mastery: { key: number; level: number; points: number }[]
  recent: { games: number; wins: number; roles: Record<string, number>; mainRole: string | null; champions: { key: number; games: number; wins: number; k: number; d: number; a: number; cs: number }[] }
  fetchedAt: string
}

export async function fetchPlayer(name: string, tag: string, region: string): Promise<RemoteProfile> {
  const base = await apiUrl()
  if (!base) throw new Error('offline')
  const r = await fetch(`${base}/player?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&region=${region}`)
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? `lookup failed (${r.status})`)
  return j
}

export interface ChatMsg { role: 'user' | 'assistant'; content: string }
/** Streams the coach's answer; calls onText with the growing text. */
export async function streamChat(messages: ChatMsg[], context: string, onText: (t: string) => void, signal?: AbortSignal) {
  const base = await apiUrl()
  if (!base) throw new Error('offline')
  const r = await fetch(`${base}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, context }), signal })
  if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j.error ?? `chat failed (${r.status})`) }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader()
  let text = ''
  for (;;) { const { value, done } = await reader.read(); if (done) break; text += value; onText(text) }
  return text
}
