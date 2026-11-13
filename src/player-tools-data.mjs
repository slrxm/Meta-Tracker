export const heroKey = hero => String(Number(hero.heroId) || hero.hero);
export function eligibleHeroes(rows, { minPick = 1, minMatches = 0 } = {}) {
  return rows.filter(h => Number.isFinite(h.pr) && h.pr >= minPick &&
    (!minMatches || (Number.isFinite(h.matches) && h.matches >= minMatches)));
}
export function matchWon(m) {
  return typeof m.radiant_win === "boolean" && Number.isInteger(m.player_slot) &&
    m.player_slot >= 0 && m.player_slot <= 255 ? (m.player_slot < 128) === m.radiant_win : null;
}
export function orderedMatches(rows) {
  const seen = new Set();
  return rows.filter(m => m && Number.isSafeInteger(m.match_id) && !seen.has(m.match_id) && seen.add(m.match_id))
    .sort((a,b) => (b.start_time || 0) - (a.start_time || 0));
}
export function summarizeMatches(rows) {
  const results = rows.map(matchWon).filter(x => x !== null);
  const average = key => {
    const values = rows.map(m => m[key]).filter(x => Number.isFinite(x) && x >= 0);
    return { value: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null, count: values.length };
  };
  const kdaRows = rows.filter(m => ["kills","deaths","assists"].every(k=>Number.isFinite(m[k]) && m[k]>=0));
  const kda = kdaRows.length ? kdaRows.reduce((s,m)=>s+m.kills+m.assists,0) / Math.max(1,kdaRows.reduce((s,m)=>s+m.deaths,0)) : null;
  const heroes = new Map();
  for (const m of rows) {
    if (!Number.isInteger(m.hero_id) || m.hero_id <= 0) continue;
    const h = heroes.get(m.hero_id) || { id:m.hero_id, games:0, wins:0, known:0 };
    h.games++; const won=matchWon(m); if(won!==null) { h.known++; h.wins+=Number(won); }
    heroes.set(m.hero_id,h);
  }
  return { games:rows.length, known:results.length, wins:results.filter(Boolean).length,
    winrate:results.length ? results.filter(Boolean).length/results.length*100 : null,
    kda, kdaCount:kdaRows.length, gpm:average("gold_per_min"), xpm:average("xp_per_min"),
    kills:average("kills"), deaths:average("deaths"), assists:average("assists"), duration:average("duration"),
    heroes:[...heroes.values()].sort((a,b)=>b.games-a.games || a.id-b.id) };
}
export function analyzePeriod(rows, limit=20) {
  const size = limit === 50 ? 50 : 20, sorted = orderedMatches(rows);
  const current = sorted.slice(0,size), previous=sorted.slice(size,size*2);
  return { current:summarizeMatches(current), previous:summarizeMatches(previous), matches:current,
    comparable:current.length===size && previous.length===size };
}
export function recommendHeroes(rows, matches, options) {
  const personal = new Map(summarizeMatches(orderedMatches(matches).slice(0,50)).heroes.map(h=>[h.id,h]));
  return eligibleHeroes(rows,options).filter(h=>Number.isFinite(h.wr)).map(h=>{
    const own=personal.get(Number(h.heroId));
    const games=own?.known || 0;
    const adjustment=games>=3 ? ((own.wins-games*h.wr/100)/(games+10))*30 : 0;
    return {...h, own, score:h.wr+adjustment+Math.min(games,10)*0.12};
  }).sort((a,b)=>b.score-a.score || b.pr-a.pr).slice(0,5);
}

