import test from "node:test";
import assert from "node:assert/strict";
import { eligibleHeroes, matchWon, orderedMatches, analyzePeriod, recommendHeroes } from "../src/player-tools-data.mjs";
const meta=[
 {heroId:2,hero:"Axe",pr:5,wr:52,matches:2000},
 {heroId:42,hero:"Wraith King",pr:4,wr:54,matches:1500},
 {heroId:110,hero:"Phoenix",pr:0.1,wr:70,matches:100},
];
test("rare role picks are excluded even with inflated winrate; filters are reversible",()=>{
 assert.deepEqual(eligibleHeroes(meta).map(h=>h.heroId),[2,42]);
 assert.equal(eligibleHeroes(meta,{minPick:0}).length,3);
 assert.deepEqual(eligibleHeroes(meta,{minPick:1,minMatches:1800}).map(h=>h.heroId),[2]);
 assert.equal(eligibleHeroes([{pr:2}],{minPick:1,minMatches:500}).length,0);
});
test("match outcomes handle both sides and reject unknown outcomes",()=>{
 assert.equal(matchWon({player_slot:0,radiant_win:true}),true);
 assert.equal(matchWon({player_slot:128,radiant_win:false}),true);
 assert.equal(matchWon({player_slot:128,radiant_win:true}),false);
 assert.equal(matchWon({player_slot:0}),null);
 assert.equal(matchWon({radiant_win:true}),null);
});
test("recent periods are chronological, distinct and missing farm data stays unknown",()=>{
 const rows=Array.from({length:100},(_,i)=>({match_id:1000+i,start_time:1000-i,hero_id:2,
  player_slot:0,radiant_win:i<20,kills:4,deaths:2,assists:6}));
 rows[0].gold_per_min=600;rows[1].gold_per_min=400;
 const result=analyzePeriod([...rows.reverse(),rows[0]],20);
 assert.equal(orderedMatches([...rows,rows[0]]).length,100);
 assert.equal(result.current.games,20);assert.equal(result.current.winrate,100);
 assert.equal(result.previous.winrate,0);assert.equal(result.comparable,true);
 assert.equal(result.current.gpm.value,500);assert.equal(result.current.gpm.count,2);
 assert.equal(result.current.xpm.value,null);assert.equal(result.current.kda,5);
 assert.equal(analyzePeriod(rows,50).current.games,50);
 assert.equal(analyzePeriod(rows.slice(0,7),20).comparable,false);
});
test("recommendations respect meta filters and use sufficiently sampled personal results",()=>{
 const matches=Array.from({length:10},(_,i)=>({match_id:i+1,start_time:i,hero_id:2,player_slot:0,radiant_win:true}));
 const candidates=recommendHeroes(meta,matches);
 assert.equal(candidates[0].heroId,2);assert.equal(candidates[0].own.known,10);
 assert.ok(!candidates.some(h=>h.heroId===110));
 assert.equal(recommendHeroes(meta,[])[0].heroId,42);
});

