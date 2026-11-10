(function(){
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "n.d.").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let currentMatches = [];

  function unwrap(item){ return item && item.available ? item.data : null; }
  function unavailable(item){
    if(!item) return "Dato non presente nell'archivio.";
    return item.reason || "Il provider non ha restituito questo dato per la partita.";
  }
  function section(title, body, note=""){
    return '<section class="panel span12" style="margin-top:12px"><div class="panel-head"><h3>'+esc(title)+'</h3></div>'+(note?'<p class="muted" style="font-size:12px">'+esc(note)+'</p>':'')+body+'</section>';
  }
  function empty(msg){return '<div class="empty">'+esc(msg)+'</div>';}
  function flatten(value, path=[], out=[]){
    if(value===null || value===undefined) return out;
    if(Array.isArray(value)){ value.forEach((v,i)=>flatten(v,path,out)); return out; }
    if(typeof value==="object"){
      if(value.stat && typeof value.stat==="object" && Object.prototype.hasOwnProperty.call(value.stat,"value")){
        out.push({label:path[path.length-1]||"Statistica",value:value.stat.value});
        return out;
      }
      Object.entries(value).forEach(([key,v])=>{
        if(["id","image_url","url","player","team","team_id","player_id","position_id","type","key","confirmed"].includes(key)) return;
        flatten(v,[...path,key],out);
      });
      return out;
    }
    const key=path[path.length-1]||"Dato";
    if(["name","period","minute","score_home","score_away","status","formation","referee","stadium","date","time_utc","finished","home","away","value"].includes(key) || typeof value==="number"){
      out.push({label:path.join(" · "),value});
    }
    return out;
  }
  function renderPairs(data){
    const pairs=flatten(data).filter(x=>x.value!=="" && x.value!==null && x.value!==undefined);
    if(!pairs.length) return empty("Nessuna statistica strutturata disponibile.");
    const unique=pairs.slice(0,100);
    return '<div class="stats-grid">'+unique.map(x=>'<div><strong>'+esc(x.label)+'</strong><p>'+esc(x.value)+'</p></div>').join("")+'</div>';
  }
  function renderPlayers(item){
    const data=unwrap(item);
    if(!data) return empty(unavailable(item));
    const players=Array.isArray(data)?data:(data.players||[]);
    if(!players.length) return empty("Nessuna statistica giocatore disponibile.");
    return '<div class="grid">'+players.map(entry=>{
      const p=entry.player||{};
      const groups=Array.isArray(entry.stats)?entry.stats:[];
      const metrics=groups.flatMap(group=>flatten(group.stats||{},[group.title||group.key||"Statistiche"]));
      const team=entry.team?.name||entry.team_id||"Squadra n.d.";
      return '<div class="panel span6"><div class="panel-head"><strong>'+esc(p.name||"Giocatore n.d.")+'</strong><span class="pill">'+esc(team)+'</span></div>'+(metrics.length?'<div class="stats-grid">'+metrics.slice(0,18).map(m=>'<div><strong>'+esc(m.label)+'</strong><p>'+esc(m.value)+'</p></div>').join("")+'</div>':empty("Statistiche individuali non disponibili."))+'</div>';
    }).join("")+'</div>';
  }
  function renderShots(item){
    const data=unwrap(item);
    if(!data) return empty(unavailable(item));
    const periods=data.periods||[];
    const shots=periods.flatMap(period=>(period.shots||[]).map(s=>({...s,period:period.period})));
    if(!shots.length) return empty("Nessun dettaglio tiro disponibile.");
    return '<div class="list">'+shots.map(s=>'<div class="entry"><div><strong>'+esc(s.minute!=null?s.minute+"'":"Minuto n.d.")+' · '+esc(s.player?.name||"Giocatore n.d.")+'</strong><div class="muted" style="font-size:12px">'+esc(s.period||"Tempo n.d.")+' · '+esc(s.shot_type||"Tipo n.d.")+' · '+esc(s.situation||"Situazione n.d.")+'</div></div><div style="text-align:right"><strong>'+((s.expected_goals!=null)?'xG '+Number(s.expected_goals).toFixed(2):'xG n.d.')+'</strong><div class="muted" style="font-size:12px">'+(s.is_on_target===true?"In porta":s.is_on_target===false?"Fuori / bloccato":"Esito n.d.")+'</div></div></div>').join("")+'</div>';
  }
  function renderLineups(item){
    const data=unwrap(item);
    if(!data) return empty(unavailable(item));
    return '<div class="grid">'+["home","away"].map(side=>{
      const team=data[side]||{},players=team.starters||[],subs=team.subs||[];
      return '<div class="panel span6"><div class="panel-head"><h3>'+esc(team.name||data[side+"_team"]?.name|| (side==="home"?"Casa":"Ospite"))+'</h3><span class="pill">'+esc(team.formation||"Modulo n.d.")+'</span></div><p class="muted" style="font-size:12px">'+(team.confirmed===true?"Formazione confermata":team.confirmed===false?"Formazione prevista, non confermata":"Conferma non indicata")+(team.coach?.name?" · Allenatore: "+esc(team.coach.name):"")+'</p><strong>Titolari</strong>'+ (players.length?'<div class="list">'+players.map(p=>'<div class="entry"><span>'+esc(p.name||"Giocatore")+(p.is_captain?" · Capitano":"")+'</span><span class="pill">'+esc(p.shirt_number||"—")+'</span></div>').join("")+'</div>':empty("Titolari non pubblicati."))+'<strong style="display:block;margin-top:12px">Panchina</strong>'+(subs.length?'<div class="list">'+subs.map(p=>'<div class="entry">'+esc(p.name||"Giocatore")+'</div>').join("")+'</div>':empty("Panchina non pubblicata."))+'</div>';
    }).join("")+'</div>';
  }
  function renderH2H(item){
    const data=unwrap(item);
    if(!data) return empty(unavailable(item));
    const games=Array.isArray(data)?data:(data.matches||data.meetings||data.h2h||[]);
    if(!games.length) return renderPairs(data);
    return '<div class="list">'+games.slice(0,15).map(g=>{
      const home=g.home?.name||g.home_team?.name||g.home||"Casa";
      const away=g.away?.name||g.away_team?.name||g.away||"Ospite";
      const score=(g.score_home!=null&&g.score_away!=null)?g.score_home+"–"+g.score_away:(g.score||"Risultato n.d.");
      return '<div class="entry"><div><strong>'+esc(home)+' '+esc(score)+' '+esc(away)+'</strong><div class="muted" style="font-size:12px">'+esc(g.date||g.time_utc||"Data n.d.")+'</div></div><span class="pill">H2H</span></div>';
    }).join("")+'</div>';
  }
  function renderEvents(item){
    const data=unwrap(item);
    if(!data) return empty(unavailable(item));
    const events=Array.isArray(data)?data:(data.events||[]);
    if(!events.length) return renderPairs(data);
    return '<div class="list">'+events.map(e=>'<div class="entry"><div><strong>'+esc(e.minute!=null?e.minute+"'":"Minuto n.d.")+' · '+esc(e.type||e.event_type||"Evento")+'</strong><div class="muted" style="font-size:12px">'+esc(e.player?.name||e.player_name||"")+(e.assist?.name?" · Assist: "+esc(e.assist.name):"")+'</div></div><span class="pill">'+esc(e.team?.name||e.team_name||"")+'</span></div>').join("")+'</div>';
  }
  window.closeMatchDetails=function(){
    const panel=$("matchDetailPanel"); if(panel) panel.classList.add("hidden");
  };
  window.openMatchDetails=async function(matchId){
    const panel=$("matchDetailPanel"),content=$("matchDetailContent");
    if(!panel||!content) return;
    panel.classList.remove("hidden");
    panel.scrollIntoView({behavior:"smooth",block:"start"});
    content.innerHTML=empty("Carico la scheda unificata e tutte le statistiche disponibili…");
    try{
      const response=await fetch("data/partite.json?v="+Date.now(),{cache:"no-store"});
      if(!response.ok) throw new Error("Archivio non disponibile (HTTP "+response.status+").");
      const payload=await response.json(),root=payload.data||payload;
      const match=(root.matches||[]).find(m=>String(m.id)===String(matchId));
      if(!match) throw new Error("Partita non trovata nell'ultimo archivio. Aggiorna l'elenco.");
      const details=match.details||{};
      const home=match.home_team?.name||"Casa",away=match.away_team?.name||"Ospite";
      $("matchDetailTitle").textContent=home+" – "+away;
      const summary=unwrap(details.summary)||match;
      const score=(summary.score_home!=null&&summary.score_away!=null)?summary.score_home+" – "+summary.score_away:"Risultato non disponibile";
      const summaryBody='<div class="stats-grid"><div><strong>Competizione</strong><p>'+esc(summary.league?.name||match.league?.name||"n.d.")+'</p></div><div><strong>Risultato</strong><p>'+esc(score)+'</p></div><div><strong>Stato</strong><p>'+esc(summary.status||match.status||"n.d.")+'</p></div><div><strong>Stadio</strong><p>'+esc(summary.stadium||"n.d.")+'</p></div><div><strong>Arbitro</strong><p>'+esc(summary.referee||"n.d.")+'</p></div><div><strong>Data / ora UTC</strong><p>'+esc(summary.time_utc||match.time_utc||"n.d.")+'</p></div></div>';
      let html=section("Identità della partita",summaryBody,"Fonte principale: PitchAPI. Archivio aggiornato "+(root.fetched_at||"data non indicata")+".");
      html+=section("Statistiche delle squadre",unwrap(details.stats)?renderPairs(unwrap(details.stats)):empty(unavailable(details.stats)));
      html+=section("Tutti i tiri e i relativi xG",renderShots(details.shots),"Il dettaglio dipende dalla disponibilità dei dati per questo incontro.");
      html+=section("Statistiche individuali dei giocatori",renderPlayers(details.players),"I dati dei giocatori sono raggruppati qui nella stessa scheda, non in una pagina separata.");
      html+=section("Formazioni, titolari e panchine",renderLineups(details.lineups));
      html+=section("Scontri diretti (H2H)",renderH2H(details.h2h));
      html+=section("Cronologia: gol, cartellini e sostituzioni",renderEvents(details.events));
      html+='<p class="muted" style="font-size:12px;margin:12px 0">Nota: indisponibilità, infortuni e notizie pre-partita provenienti da testate giornalistiche saranno integrate in una fase successiva, con fonte e data della notizia. Non vengono dedotte dalle statistiche della partita.</p>';
      content.innerHTML=html;
    }catch(error){
      content.innerHTML=empty("Non riesco a caricare la scheda: "+error.message);
    }
  };
})();