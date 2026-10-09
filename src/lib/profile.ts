import { useEffect, useState } from 'react'
import { fetchPlayer, type RemoteProfile } from './api'

export const REGIONS: { id: string; label: string }[] = [
  { id: 'euw1', label: 'EUW' }, { id: 'eun1', label: 'EUNE' }, { id: 'na1', label: 'NA' }, { id: 'kr', label: 'KR' },
  { id: 'br1', label: 'BR' }, { id: 'tr1', label: 'TR' }, { id: 'la1', label: 'LAN' }, { id: 'la2', label: 'LAS' },
  { id: 'oc1', label: 'OCE' }, { id: 'jp1', label: 'JP' }, { id: 'me1', label: 'ME' }, { id: 'ru', label: 'RU' },
]
export const OPGG_REGION: Record<string, string> = { euw1: 'euw', eun1: 'eune', na1: 'na', kr: 'kr', br1: 'br', tr1: 'tr', la1: 'lan', la2: 'las', oc1: 'oce', jp1: 'jp', me1: 'me', ru: 'ru' }

export interface Visitor {
  name: string; tag: string; region: string
  data?: RemoteProfile | null
  status: 'idle' | 'loading' | 'ok' | 'error' | 'offline'
  error?: string
}

const KEY = 'hach.visitor.v1'
const SKIP = 'hach.visitor.skip'
const read = (): Visitor | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }
const write = (v: Visitor | null) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* private mode */ } }

let current: Visitor | null = read()
const subs = new Set<(v: Visitor | null) => void>()
const emit = () => subs.forEach((f) => f(current))
const set = (v: Visitor | null) => { current = v; write(v); emit() }

export const opggUrl = (v: { name: string; tag: string; region: string }) =>
  `https://op.gg/lol/summoners/${OPGG_REGION[v.region] ?? 'euw'}/${encodeURIComponent(v.name)}-${encodeURIComponent(v.tag)}`

export async function signIn(name: string, tag: string, region: string) {
  set({ name, tag, region, status: 'loading' })
  await refresh()
}
export async function refresh() {
  if (!current) return
  const { name, tag, region } = current
  set({ ...current, status: 'loading', error: undefined })
  try {
    const data = await fetchPlayer(name, tag, region)
    set({ name, tag, region, data, status: 'ok' })
  } catch (e: any) {
    const msg = String(e?.message ?? e)
    set({ name, tag, region, data: current?.data ?? null, status: msg === 'offline' ? 'offline' : 'error', error: msg })
  }
}
export const signOut = () => set(null)
export const skipOnboarding = () => { try { localStorage.setItem(SKIP, '1') } catch { /* ignore */ } }
export const onboardingSkipped = () => { try { return localStorage.getItem(SKIP) === '1' } catch { return true } }

export function useVisitor() {
  const [v, setV] = useState<Visitor | null>(current)
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV) } }, [])
  return v
}
// refresh once per session if the stored data is older than 30 minutes
if (current && (!current.data || Date.now() - Date.parse(current.data.fetchedAt) > 30 * 60 * 1000)) setTimeout(() => refresh(), 1500)

// ---- coach context: pages publish what the user is looking at ----
let coachContext = ''
const ctxSubs = new Set<() => void>()
export const setCoachContext = (s: string) => { coachContext = s; ctxSubs.forEach((f) => f()) }
export const getCoachContext = () => coachContext
