// Checks that every champion id in public/stats.json and players.json exists in Data Dragon.
import { readFileSync } from 'node:fs'
const v = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0]
const ids = new Set(Object.keys((await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`)).json()).data))
const stats = JSON.parse(readFileSync('public/stats.json', 'utf8')).players
const players = JSON.parse(readFileSync('src/data/players.json', 'utf8')).players
const bad = new Set()
for (const [n, p] of Object.entries(stats)) for (const id of Object.keys(p.champions)) if (!ids.has(id)) bad.add(`${n}: ${id}`)
for (const p of players) for (const c of p.champions) if (!ids.has(c.id)) bad.add(`players.json ${p.name}: ${c.id}`)
console.log(bad.size ? 'UNKNOWN IDS:\n' + [...bad].join('\n') : `all ids valid (patch ${v})`)
