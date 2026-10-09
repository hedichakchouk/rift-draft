# Hach Draft API (Cloudflare Worker)

Powers the Thresh coach chat (Claude) and the "enter your Riot ID" lookup. Keys stay on Cloudflare, never in the website.

## One-time setup (about 5 minutes)
1. Create a free account at https://dash.cloudflare.com
2. In this folder: `npx wrangler login` (opens the browser, click Allow)
3. Add the two keys (you paste them in the terminal, they are stored encrypted on Cloudflare):
   - `npx wrangler secret put ANTHROPIC_API_KEY`  (from https://console.anthropic.com -> API keys)
   - `npx wrangler secret put RIOT_API_KEY`       (from https://developer.riotgames.com - register a Personal API key so it does not expire every 24 h)
4. `npx wrangler deploy` -> prints the Worker URL, e.g. `https://hach-draft-api.<you>.workers.dev`
5. Put that URL in `public/config.json` -> `"apiUrl"` and push. The chat and player lookup switch on automatically.

Check: open `<worker url>/health` from the site origin, or `curl -H "Origin: https://hedichakchouk.github.io" <worker url>/health`.

Cost: Cloudflare Workers free tier (100k requests/day). Claude: `claude-sonnet-5-5` is about $2 / $10 per million input/output tokens - a typical chat answer costs well under one cent. Change `MODEL` in wrangler.toml to `claude-haiku-5-5` to make it even cheaper.
