import { test, expect } from "@playwright/test";
const axe={hero:"Axe",heroId:2,wr:55,pr:5,tr:1,matches:2000};
const phoenix={hero:"Phoenix",heroId:110,wr:65,pr:0.1,tr:1,matches:100};
test.beforeEach(async({page})=>{
 await page.route("**/data.json",r=>r.fulfill({json:{
  ranks:["Legend","Immortal"],roles:["Carry","Support"],sourceWindow:"day",updated:"2026-11-13",
  data:{"0|0":[axe,phoenix],"1|0":[axe,phoenix],
   "0|1":[{...axe,pr:0.2},{...phoenix,pr:4,matches:3000}],
   "1|1":[{...axe,pr:0.2},{...phoenix,pr:4,matches:3000}]}
 }}));
});
test("rare role picks, favorites and saved filters work together on mobile",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/");
 await expect(page.locator("#list .hero-link")).toHaveText(["Axe ↗"]);
 await expect(page.locator("#filterStatus")).toContainText("редкие пики скрыты: 1");
 await page.getByRole("button",{name:"В избранное: Axe",exact:true}).click();
 await expect(page.getByRole("button",{name:"Убрать из избранного: Axe",exact:true})).toHaveAttribute("aria-pressed","true");
 await page.locator("#favoritesOnly").check();
 await page.reload();await expect(page.locator("#list .hero-link")).toHaveText(["Axe ↗"]);
 await expect(page.locator("#favoritesOnly")).toBeChecked();
 await page.locator("#favoritesOnly").uncheck();
 await page.locator("#roles").getByRole("button",{name:"Support",exact:true}).click();
 await expect(page.locator("#list .hero-link")).toHaveText(["Phoenix ↗"]);
 await page.locator("#minPick").selectOption("0");
 await expect(page.locator("#list .hero-link")).toHaveCount(2);
 await page.locator("#minMatches").selectOption("5000");
 await expect(page.locator("#list")).toContainText("Нет героев с выбранными фильтрами");
 await page.locator("#resetMetaFilters").click();await expect(page.locator("#list .hero-link")).toHaveText(["Phoenix ↗"]);
 const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);expect(widths[0]).toBeLessThanOrEqual(widths[1]);
});
function mockPlayer(page,mode="ok"){
 return page.route("https://api.opendota.com/api/**",r=>{
  const url=new URL(r.request().url()),path=url.pathname.replace("/api/","");
  if(path==="heroes")return r.fulfill({json:[{id:2,localized_name:"Axe",name:"npc_dota_hero_axe"},{id:110,localized_name:"Phoenix",name:"npc_dota_hero_phoenix"}]});
  if(path.endsWith("/matches")){
   expect(url.searchParams.get("limit")).toBe("100");
   expect(url.searchParams.getAll("project")).toContain("gold_per_min");
   if(mode==="error")return r.fulfill({status:429,json:{error:"rate limit"}});
   return r.fulfill({json:mode==="empty"?[]:Array.from({length:100},(_,i)=>({
    match_id:1000+i,start_time:1800000000-i*3600,hero_id:2,player_slot:0,radiant_win:i<20,
    kills:10,deaths:2,assists:4,duration:1800,
    ...(i===0?{gold_per_min:600,xp_per_min:700}:{})
   }))});
  }
  return r.fulfill({json:path==="players/123"?{profile:{personaname:"Alpha"},rank_tier:50}:
   path.endsWith("/wl")?{win:6,lose:4}:[]});
 });
}
test("recent analysis switches 20/50 games and personal recommendations use actual history",async({page})=>{
 await mockPlayer(page);await page.goto("/");await expect(page.locator("#list .hero-link")).toHaveText(["Axe ↗"]);
 await page.locator("#nv2").click();await page.locator("#pid").fill("123");await page.locator("#pid").press("Enter");
 const analysis=page.locator("#recentAnalysis");await expect(analysis).toContainText("Доступно 20 из 20 игр");
 await expect(analysis).toContainText("100.0% (20/20)");
 await expect(analysis).toContainText("GPM 1/20");await expect(analysis).toContainText("+100.0 п.п.");
 await page.locator("#analysisLimit").selectOption("50");
 await expect(analysis).toContainText("40.0% (20/50)");await expect(analysis).toContainText("Матчи в анализе (50)");
 await page.locator("#nv0").click();await page.locator(".recommendation-panel summary").click();
 await expect(page.locator("#recommendations")).toContainText("Рекомендации для Dota ID 123");
 await expect(page.locator("#recommendations")).toContainText("Твои игры: 50");
 await expect(page.locator("#recommendations .hero-link")).toHaveText(["Axe ↗"]);
 await page.locator("#roles").getByRole("button",{name:"Support",exact:true}).click();
 await expect(page.locator("#recommendations .hero-link")).toHaveText(["Phoenix ↗"]);
 await page.locator("#recommendations .hero-link").click();await expect(page.locator("#heroDialog")).toBeVisible();
});
test("empty histories and API errors remain useful",async({page})=>{
 await mockPlayer(page,"empty");await page.goto("/");await expect(page.locator("#list .hero-link")).toBeVisible();
 await page.locator(".recommendation-panel summary").click();await page.locator("#recommendationId").fill("123");
 await page.locator("#loadRecommendations").click();await expect(page.locator("#recommendationStatus")).toContainText("пуста или скрыта");
 await page.unroute("https://api.opendota.com/api/**");await mockPlayer(page,"error");
 await page.locator("#recommendationId").fill("456");await page.locator("#loadRecommendations").click();
 await expect(page.locator("#recommendationStatus")).toContainText("ограничил запросы");
 await expect(page.locator("#loadRecommendations")).toBeEnabled();
});

