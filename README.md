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
