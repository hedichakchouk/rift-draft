import type { Lane } from './types'

export interface ChampFacts { name: string; date: string; region: string | null; gender: 'Male' | 'Female' | 'Other'; lanes: Lane[] }
let p: Promise<Record<string, ChampFacts>> | null = null
/** Region, gender, release date and lanes per champion (public/champdata.json). */
export const loadChampData = () => (p ??= fetch('./champdata.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})))
