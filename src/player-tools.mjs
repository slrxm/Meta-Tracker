import { eligibleHeroes, heroKey, orderedMatches, analyzePeriod, recommendHeroes } from "./player-tools-data.mjs";
import { createJSONClient } from "./request-json.mjs";
const get = createJSONClient({baseUrl:"https://api.opendota.com/api/"});
const $ = id => document.getElementById(id);
const el = (tag,text,cls) => { const n=document.createElement(tag); if(text!=null)n.textContent=text; if(cls)n.className=cls; return n; };
const read = (key, fallback) => {try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }};
const write = (key,value) => {try {localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const number = (value,digits=1) => value==null ? "—" : value.toFixed(digits);
export function initPlayerTools() {
  const saved = read("metaTracker.filters",{});
  const storedFavorites=read("metaTracker.favorites",[]);
  let favorites = new Set((Array.isArray(storedFavorites)?storedFavorites:[]).filter(x=>typeof x==="string"));
  $("minPick").value = ["0","0.5","1","2"].includes(String(saved.minPick)) ? String(saved.minPick) : "1";
  $("minMatches").value = ["0","500","1000","5000"].includes(String(saved.minMatches)) ? String(saved.minMatches) : "0";
  $("favoritesOnly").checked=saved.favoritesOnly===true;
  let context=null, personal=[], personalId=null, recVersion=0, analysisVersion=0;
  const options=()=>({minPick:Number($("minPick").value),minMatches:Number($("minMatches").value)});
  const persist=()=>write("metaTracker.filters",{...options(),favoritesOnly:$("favoritesOnly").checked});
  window.filterMeta = rows => {
    const eligible=eligibleHeroes(rows,options());
    return $("favoritesOnly").checked ? eligible.filter(h=>favorites.has(heroKey(h))) : eligible;
  };
  window.favoriteButton = hero => {
    const on=favorites.has(heroKey(hero));
    return '<button class="favorite-button'+(on?' selected':'')+'" data-favorite="'+
      window.metaEscape(heroKey(hero))+'" aria-pressed="'+on+'" aria-label="'+
      window.metaEscape((on?"Убрать из избранного: ":"В избранное: ")+hero.hero)+'">'+(on?"★":"☆")+'</button>';
  };
  $("list").addEventListener("click",event=>{
    const button=event.target.closest("[data-favorite]");if(!button)return;
    const key=button.dataset.favorite;
    if(favorites.has(key))favorites.delete(key);else favorites.add(key);
    const stored=write("metaTracker.favorites",[...favorites]);window.renderMeta();
    if(!stored)$("filterStatus").append(document.createTextNode(" · Браузер не разрешил сохранить избранное; оно доступно до закрытия страницы."));
  });
  for(const id of ["minPick","minMatches","favoritesOnly"])$(id).addEventListener("change",()=>{persist();window.renderMeta();});
  $("resetMetaFilters").onclick=()=>{
    $("minPick").value="1";$("minMatches").value="0";$("favoritesOnly").checked=false;$("q").value="";
    persist();window.renderMeta();
  };
  window.updateMetaTools = state => {
    context=state;
    const eligible=eligibleHeroes(state.rows,options());
    $("filterStatus").textContent="Показано "+state.visible+" из "+state.rows.length+
      " · редкие пики скрыты: "+(state.rows.length-eligible.length)+" · избранных: "+favorites.size;
    renderRecommendations();
  };
  function renderRecommendations() {
    if(!context)return;
    const box=$("recommendations");box.replaceChildren();
    box.append(el("h3",personalId?"Рекомендации для Dota ID "+personalId:"Герои выбранной меты"));
    box.append(el("p",context.rank+" · "+context.role,"small-note"));
    if(!personalId)box.append(el("p","Добавь Dota ID: рекомендации учтут твои последние 50 публичных матчей.","small-note"));
    else box.append(el("p","Учтено "+Math.min(personal.length,50)+" публичных матчей. Личные результаты включают все позиции и режимы. При малой выборке выше вес меты; это ориентир, а не прогноз победы.","small-note"));
    const candidates=recommendHeroes(context.rows,personal,options());
    if(!candidates.length)box.append(el("p","Нет героев с выбранным пикрейтом и числом матчей. Ослабь фильтры.","small-note"));
    const grid=el("div",null,"recommendation-grid");box.append(grid);
    for(const hero of candidates){
      const card=el("div",null,"recommendation-card"), button=el("button",hero.hero+" ↗","hero-link");
      button.dataset.heroName=hero.hero;button.dataset.heroId=String(hero.heroId || 0);
      card.append(button,el("p","Мета: "+number(hero.wr)+"% побед · "+number(hero.pr)+"% пиков","small-note"));
      const own=hero.own;
      card.append(el("p",own?.known>=3 ? "Твои игры: "+own.games+" · "+number(own.wins/own.known*100)+"% побед" :
        own ? "Твои игры: "+own.games+" · мало данных для личной оценки" : personalId ? "Нет личных игр в выборке" : "Добавь профиль для личной оценки","small-note"));
      grid.append(card);
    }
  }
  async function history(id,force=false){
    const params=new URLSearchParams({limit:"100"});
    for(const field of ["match_id","hero_id","kills","deaths","assists","duration","start_time","player_slot","radiant_win","gold_per_min","xp_per_min"])
      params.append("project",field);
    const request=force ? createJSONClient({baseUrl:"https://api.opendota.com/api/"}) : get;
    const rows=await request("players/"+id+"/matches?"+params);
    if(!Array.isArray(rows))throw Error("Не удалось получить историю матчей.");
    return orderedMatches(rows);
  }
  try{$("recommendationId").value=localStorage.getItem("frostmeta.dotaId") || "";}catch{}
  async function loadRecommendations(){
    const id=window.parseId($("recommendationId").value.trim());
    if(!id || id==="vanity"){$("recommendationStatus").textContent="Введи числовой Dota ID или числовую ссылку Steam.";return;}
    const version=++recVersion;
    $("recommendationStatus").textContent="Загружаем последние матчи…";
    $("loadRecommendations").disabled=true;
    try{
      const rows=await history(id);if(version!==recVersion)return;
      personal=rows;personalId=id;renderRecommendations();
      $("recommendationStatus").textContent=rows.length ? "Рекомендации обновлены." : "Публичная история пуста или скрыта. Показаны герои выбранной меты.";
    }catch(error){if(version===recVersion)$("recommendationStatus").textContent=error.message;}
    finally{if(version===recVersion)$("loadRecommendations").disabled=false;}
  }
  $("loadRecommendations").onclick=loadRecommendations;
  $("recommendationId").addEventListener("keydown",e=>{if(e.key==="Enter")loadRecommendations();});
  window.addEventListener("player-loading",()=>{analysisVersion++;});
  window.addEventListener("player-profile",async event=>{
    const version=++analysisVersion,id=String(event.detail.id);
    const root=el("section",null,"recent-analysis");root.id="recentAnalysis";root.setAttribute("aria-live","polite");
    const title=el("h2","Анализ последних матчей"), controls=el("div",null,"analysis-controls");
    const label=el("label","Период: "),select=el("select");select.id="analysisLimit";
    for(const size of [20,50]){const option=el("option",size+" игр");option.value=String(size);select.append(option);}
    label.append(select);controls.append(label);
    const retry=el("button","Обновить","quiet");controls.append(retry);
    const body=el("div",null,"analysis-body");
    root.append(title,controls,body);
    $("pres").querySelector(".phead")?.after(root);
    let rows=[];
    function renderAnalysis(){
      const result=analyzePeriod(rows,Number(select.value)),s=result.current,p=result.previous;body.replaceChildren();
      if(!s.games){body.append(el("p","Публичная история пуста или скрыта настройками Dota 2.","small-note"));return;}
      body.append(el("p","Доступно "+s.games+" из "+select.value+" игр · все режимы и позиции. Сравнение с предыдущими "+select.value+" играми.","small-note"));
      const grid=el("div",null,"analysis-grid");body.append(grid);
      for(const [name,value] of [
        ["Винрейт",number(s.winrate)+"% ("+s.wins+"/"+s.known+")"],
        ["Средние K / D / A",number(s.kills.value)+" / "+number(s.deaths.value)+" / "+number(s.assists.value)],
        ["KDA",number(s.kda,2)],["Средний GPM",number(s.gpm.value,0)],["Средний XPM",number(s.xpm.value,0)],
        ["Средняя длительность",s.duration.value==null?"—":number(s.duration.value/60)+" мин"],
      ]){const card=el("div",null,"analysis-card");card.append(el("div",name,"small-note"),el("strong",value));grid.append(card);}
      if(s.gpm.count<s.games || s.xpm.count<s.games)body.append(el("p","Данные фарма доступны не для всех игр: GPM "+s.gpm.count+"/"+s.games+", XPM "+s.xpm.count+"/"+s.games+". Пропуски не считаются нулями.","small-note"));
      const change=el("p",null,"small-note");
      change.textContent=result.comparable && s.known===s.games && p.known===p.games
        ? "Винрейт к предыдущему периоду: "+(s.winrate-p.winrate>=0?"+":"")+number(s.winrate-p.winrate)+" п.п."
        : "Для сравнения нужны два полных периода с известным результатом матчей.";
      body.append(change,el("h3","Герои в этой выборке"));
      if(result.comparable){
        const deltas=[];
        const delta=(name,current,previous,digits=1)=>deltas.push(name+": "+(current-previous>=0?"+":"")+number(current-previous,digits));
        if(s.kdaCount===s.games && p.kdaCount===p.games)delta("KDA",s.kda,p.kda,2);
        for(const [key,label] of [["gpm","GPM"],["xpm","XPM"]])
          if(s[key].count===s.games && p[key].count===p.games)delta(label,s[key].value,p[key].value,0);
        if(deltas.length)change.after(el("p","Изменение к предыдущему периоду: "+deltas.join(" · "),"small-note"));
      }
      for(const hero of s.heroes.slice(0,8)){
        const line=el("div",null,"analysis-hero");
        const name=event.detail.heroes?.[hero.id] || "Герой "+hero.id;
        const button=el("button",name+" ↗","hero-link");button.dataset.heroId=String(hero.id);button.dataset.heroName=name;
        line.append(button,el("span",hero.games+" игр · "+(hero.known?number(hero.wins/hero.known*100)+"% побед":"нет результата")));body.append(line);
      }
      const details=el("details");details.append(el("summary","Матчи в анализе ("+s.games+")"));
      const list=el("div",null,"analysis-match-list");details.append(list);
      for(const match of result.matches){
        const button=el("button",new Date(match.start_time*1000).toLocaleDateString("ru-RU")+" · "+
          (event.detail.heroes?.[match.hero_id] || "Герой "+match.hero_id)+" · матч "+match.match_id,"quiet");
        button.onclick=()=>window.openMatch(match.match_id);list.append(button);
      }
      body.append(details);
    }
    select.onchange=renderAnalysis;
    async function load(force=false){
      retry.disabled=true;select.disabled=true;body.replaceChildren(el("p","Загружаем историю…","small-note"));
      try{const result=await history(id,force);if(version!==analysisVersion || !root.isConnected)return;
        rows=result;renderAnalysis();personal=rows;personalId=id;$("recommendationId").value=id;renderRecommendations();
      }catch(error){if(version===analysisVersion && root.isConnected)body.replaceChildren(el("p",error.message,"small-note"));}
      finally{retry.disabled=false;select.disabled=false;}
    }
    retry.onclick=()=>load(true);await load();
  });
}

