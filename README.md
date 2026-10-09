# Hach Draft
Squad tier lists, a Summoner's Rift flex draft board (drag & drop) and a Guess-the-Champ game for the Hach squad.

## Add players / champions
Edit `src/data/players.json`. Tiers: `Z` (blind pick / best performance), `S` (confident), `A` (decent), `B` (can play but rather not), optional `C`/`D`.
Champion ids are Riot Data Dragon ids (e.g. `MissFortune`, `LeeSin`, `KogMaw`):

```json
{ "name": "Omar", "lane": "bot", "champions": [{ "id": "Jinx", "tier": "Z" }] }
```
Optional `flexLanes` lets a player cover other lanes: `"flexLanes": { "mid": "A" }`.

## Dev / deploy
`npm install && npm run dev` · push to `main` and GitHub Pages deploys (Settings → Pages → Source: GitHub Actions).

## Laning tab (v2)
Two modes: **Chabeb** (the squad, uses each player's tier list and op.gg stats) and **Any player**.
Bot lane is a full 2v2 (ADC + support vs ADC + support, four head-to-head win rates).
For each matchup: real win rate, meta check with better picks, most-picked build (runes, spells, skill order, items),
a phase-by-phase lane plan, Riot's official ability clips and YouTube guides.

## Data
- `public/meta/` - lolalytics snapshot (Emerald+, current patch) + YouTube guide picks.
  Refresh: `node scripts/fetch-meta.mjs` (about 10 min), then `node scripts/fetch-videos.mjs` for champions without videos.
  A weekly GitHub Action (`refresh-meta.yml`) tries the same and redeploys.
- `public/stats.json` - squad op.gg snapshot (`node scripts/import-opgg.mjs`).

## Coach chat + visitor Riot ID lookup
Needs the Cloudflare Worker in `worker/` (see `worker/README.md`). Put its URL in `public/config.json`.
Without it the coach runs in offline mode (site help + reads the matchup data) and the Riot ID is only saved locally.
