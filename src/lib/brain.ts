import { getCoachData } from './profile'

/** Free built-in coach: answers from the data on screen plus a small macro knowledge base. No API, no cost. */
const KB: [RegExp, string][] = [
  [/wave|freez|push|crash|slow push/, "**Wave management**\n- Freeze (hold the wave near your tower) when you are ahead and the enemy must overextend to farm.\n- Slow push (let minions stack) before a gank, recall or objective so you hit it with a big wave.\n- Fast push when you need to roam, recall or answer a call.\n- Never let the wave crash unless you can back or roam right after."],
  [/all.?in|trade|kill/, "**When to all-in**\n- Their key cooldown (flash, dash or CC) is down and yours is up.\n- You hit a level or item spike first (levels 2, 3, 6 and your first completed item).\n- Your jungler is near, or theirs is far.\n- The wave is on your side, so they cannot run to a safe fight.\nIf none of those is true, trade short and walk away."],
  [/behind|losing|snowball|fall/, "**If you fall behind**\n- Stop trading. Farm under tower and keep the wave small.\n- Ward the river and play for team fights; one good fight resets the game.\n- Take safe CS and plates only. Do not chase kills.\n- Ask your jungler for one wave of help, not a babysit."],
  [/carry|win more|climb|improve/, "**How to carry**\n- Win your lane first: CS, wave state and tempo matter more than kills.\n- Move with your jungler to objectives (dragon, herald, grubs) 60 seconds before they spawn.\n- Group around the item or level that makes your champion strong.\n- Track the enemy jungler and ping before you walk into the dark."],
  [/ward|vision/, "**Vision**\n- Ward the river entrances when you push, tri-brush when you freeze.\n- Buy a control ward every back.\n- Clear their wards when you have a sweeper and a fight is coming."],
  [/jungle|gank|path|clear/, "**Jungle basics**\n- Gank the lane that has the pushed wave or the summoners down.\n- Path to the side with your next objective, and track their jungler's first clear.\n- A failed gank costs tempo; it is fine to reset instead of forcing it."],
  [/support|roam|bot lane/, "**Bot lane**\n- Support leads: ward first, then play around the spike of your carry.\n- Fight when your jungler is near or when their support is out of position.\n- Hold priority before dragon; the lane with priority gets the first move."],
]

const bullets = (a: string[]) => a.map((x) => `- ${x}`).join('\n')

export function freeAnswer(q: string, ctx: string): string {
  const s = q.toLowerCase()
  const d = getCoachData()
  const has = (d.recs?.length ?? 0) > 0

  if (/what should i (pick|play)|best pick|who (should|do) i|pick for me|recommend/.test(s)) {
    if (!has) return "I have nothing to rank yet. Open the **Draft** tab, choose your lane, and type the picks that are locked in. I will read them from there."
    const top = d.recs!.slice(0, 3).map((r, i) => `${i + 1}. **${r.name}** (score ${r.score}): ${r.why.slice(0, 3).join('; ')}`).join('\n')
    return `For ${d.lane}${d.player ? ` as ${d.player}` : ''}${d.foe ? ` against ${d.foe}` : ''}, my top picks are:\n${top}`
  }
  if (/ban/.test(s)) {
    if (!d.bans?.length) return "I need your lane and a few picks first. In **Draft**, choose your lane and I will list the champions that hurt you most."
    return `Ban order for ${d.lane}:\n${d.bans.map((b, i) => `${i + 1}. **${b.name}**: ${b.why}`).join('\n')}`
  }
  if (/enemy|their (comp|team)|beat them|win against/.test(s) && d.enemyLines?.length)
    return `Reading their draft:\n${bullets(d.enemyLines)}`
  if (/my (team|comp)|we need|missing|our (team|comp)/.test(s) && d.allyLines?.length)
    return `Your team:\n${bullets(d.allyLines)}`
  if (/site|how (do|to) (i )?use|what can|features?|tab/.test(s))
    return "Here is what this site does, all free:\n- **Draft Co-pilot**: type the picks as champ select goes. You get the best pick for your lane, bans that hurt your pool, a read on both comps and a build.\n- **Draft Board**: plan a full draft on the map with a comp verdict.\n- **Tier Lists**: every Chabeb player's pool and op.gg stats.\n- **Laning**: matchup win rates, meta check, build, phase plan and videos.\n- **Guess the Champ**: a game to test yourself."
  for (const [re, ans] of KB) if (re.test(s)) return ans
  if (ctx && /matchup|lane|vs|counter|build|item|rune/.test(s))
    return `Here is what I see: ${ctx}\n\nThe **Laning** tab turns this into the win rate, the build and a phase-by-phase plan.`
  return "I can help with picks, bans, reading the enemy comp, and basics like wave management, all-ins, vision or what to do when behind. In the **Draft** tab, add the picks and ask me **What should I pick?**"
}
