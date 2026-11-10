(function(){
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "Dato non disponibile").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const getData = item => item && item.available ? item.data : null;
  const missing = item => !item ? "Dato non presente nell’archivio." : "La fonte non ha pubblicato questo dato per la partita.";
  const statNames = {
    "Total shots":"Tiri totali","Shots on target":"Tiri in porta","Shots off target":"Tiri fuori","Blocked shots":"Tiri bloccati","Shots inside box":"Tiri in area","Shots outside box":"Tiri fuori area",
    "Corners":"Calci d'angolo","Fouls committed":"Falli commessi","Yellow cards":"Ammonizioni","Red cards":"Espulsioni","Ball possession":"Possesso palla",
    "Expected goals (xG)":"Gol attesi (xG)","xG non-penalty":"xG senza rigori","xG on target (xGOT)":"xG dei tiri in porta","xG open play":"xG su azione","xG set play":"xG su palla inattiva",
    "Keeper saves":"Parate del portiere","Accurate passes":"Passaggi riusciti","Passes":"Passaggi tentati","Offsides":"Fuorigioco","Big chances":"Grandi occasioni","Big chances missed":"Grandi occasioni sprecate",
    "Clearances":"Respinte difensive","Interceptions":"Intercetti","Tackles":"Contrasti","Blocks":"Tiri murati","Aerial duels won":"Duelli aerei vinti","Ground duels won":"Duelli a terra vinti",
    "Successful dribbles":"Dribbling riusciti","Recoveries":"Palloni recuperati","PPDA":"Pressione (PPDA)","Accurate crosses":"Cross riusciti","Accurate long balls":"Lanci lunghi riusciti",
    "Touches in opposition box":"Tocchi in area avversaria","Final third entries":"Ingressi nell'ultimo terzo","Penalty area entries":"Ingressi in area","Saves":"Parate",
    "Goals":"Gol","Assists":"Assist","Total shots":"Tiri","Minutes played":"Minuti giocati","Chances created":"Occasioni create","Touches":"Tocchi palla",
    "Dispossessed":"Palloni persi","Fouls committed":"Falli commessi","Was fouled":"Falli subiti","Duels won":"Duelli vinti","Duels lost":"Duelli persi",
    "Headed clearance":"Respinte di testa","Passes into final third":"Passaggi nell'ultimo terzo","Throws":"Rimesse laterali"
  };
  const categoryNames = {
    "Defence":"Difesa","Defense":"Difesa","Discipline":"Disciplina","Duels":"Duelli","Expected goals (xG)":"Qualità delle occasioni",
    "Passes":"Passaggi e possesso","Pressing":"Pressione e recuperi","Shots":"Tiri","Territory":"Territorio","Top stats":"Statistiche principali",
    "Attack":"Attacco","Goalkeeping":"Portiere"
  };
  const valueNames = {
    "All":"Intera partita","FirstHalf":"Primo tempo","SecondHalf":"Secondo tempo",
    "Header":"Colpo di testa","LeftFoot":"Piede sinistro","RightFoot":"Piede destro","Other":"Altro",
    "RegularPlay":"Azione","FromCorner":"Da calcio d'angolo","FreeKick":"Da punizione","FastBreak":"Contropiede",
    "SetPiece":"Palla inattiva","Penalty":"Rigore","ThrowInSetPiece":"Da rimessa laterale",
    "Goal":"Gol","AttemptSaved":"Parato dal portiere","Miss":"Fuori","Blocked":"Murato","OwnGoal":"Autogol",
    "yellowcard":"Ammonizione","redcard":"Espulsione","goal":"Gol","substitution":"Sostituzione","penalty":"Rigore"
  };
  function italian(value){const s=String(value ?? "");return valueNames[s] || s;}
  function label(value){const s=String(value ?? "");return statNames[s] || s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
  function panel(title,body,note=""){return '<section class="analysis-block"><h3>'+esc(title)+'</h3>'+(note?'<p class="analysis-note">'+esc(note)+'</p>':'')+body+'</section>';}
  function empty(message){return '<div class="analysis-empty">'+esc(message)+'</div>';}
  function statCards(data){
    const periods=data?.periods||[];
    if(!periods.length)return empty("Le statistiche di squadra non sono disponibili per questa partita.");
    return periods.map(period=>{
      const groups=period.groups||[];
      return '<div class="stat-period"><h4>'+esc(italian(period.period||"Intera partita"))+'</h4>'+groups.map(group=>{
        const items=group.items||[];if(!items.length)return "";
        return '<div class="stat-group"><h5>'+esc(categoryNames[group.group_name]||group.group_name||"Altre statistiche")+'</h5><div class="stat-table"><div class="stat-head"><span>'+esc("Statistica")+'</span><span>'+esc("Casa")+'</span><span>'+esc("Ospite")+'</span></div>'+items.map(item=>'<div class="stat-row"><span>'+esc(label(item.title||item.key))+'</span><strong>'+esc(item.home??"n.d.")+'</strong><strong>'+esc(item.away??"n.d.")+'</strong></div>').join("")+'</div></div>';
      }).join("")+'</div>';
    }).join("");
  }
  function renderShots(item,homeId,awayId,homeName,awayName){
    const data=getData(item);if(!data)return empty(missing(item));
    const shots=(data.periods||[]).flatMap(p=>(p.shots||[]).map(s=>({...s,period:p.period})));
    if(!shots.length)return empty("La fonte non ha fornito il dettaglio dei singoli tiri.");
    const home=shots.filter(s=>s.team_id===homeId),away=shots.filter(s=>s.team_id===awayId);
    const on=arr=>arr.filter(s=>s.is_on_target===true).length;
    const xg=arr=>arr.reduce((n,s)=>n+(Number(s.expected_goals)||0),0);
    const summary='<div class="analysis-metrics"><div><strong>'+shots.length+'</strong><span>Tiri totali</span></div><div><strong>'+on(home)+' – '+on(away)+'</strong><span>Tiri in porta</span></div><div><strong>'+xg(home).toFixed(2)+' – '+xg(away).toFixed(2)+'</strong><span>xG dei tiri elencati</span></div></div>';
    const rows=shots.map(s=>{
      const team=s.team_id===homeId?homeName:s.team_id===awayId?awayName:"Squadra non indicata";
      return '<div class="shot-row"><span class="shot-minute">'+esc(s.minute!=null?s.minute+"'":"—")+'</span><div class="shot-main"><strong>'+esc(s.player?.name||"Giocatore non indicato")+'</strong><small>'+esc(team)+' · '+esc(italian(s.period))+' · '+esc(italian(s.shot_type))+' · '+esc(italian(s.situation))+'</small></div><div class="shot-result"><strong>'+esc(italian(s.event_type||"Esito non indicato"))+'</strong><small>'+(s.expected_goals!=null?"xG "+Number(s.expected_goals).toFixed(2):"xG n.d.")+' · '+(s.is_on_target===true?"In porta":s.is_on_target===false?"Fuori porta":"Esito n.d.")+'</small></div></div>';
    }).join("");
    return summary+'<details class="analysis-details"><summary>Visualizza tutti i '+shots.length+' tiri della partita</summary><div class="shot-list">'+rows+'</div></details>';
  }
  function renderPlayers(item,homeId,awayId,homeName,awayName){
    const data=getData(item);if(!data)return empty(missing(item));
    const players=Array.isArray(data)?data:(data.players||[]);
    if(!players.length)return empty("Le statistiche individuali non sono disponibili.");
    const cards=players.map(entry=>{
      const p=entry.player||{},team=entry.team?.name||(entry.team_id===homeId?homeName:entry.team_id===awayId?awayName:"Squadra non indicata");
      const metrics=[];
      (entry.stats||[]).forEach(group=>Object.entries(group.stats||{}).forEach(([name,obj])=>{
        const st=obj?.stat;if(!st||st.value===null||st.value===undefined)return;
        let val=st.value;if(st.type==="fractionWithPercentage"&&st.total!==undefined)val=st.value+"/"+st.total;
        metrics.push([label(name),val]);
      }));
      const priority=["Minuti giocati","Gol","Assist","Tiri","Parate","Passaggi riusciti","Occasioni create","Falli commessi","Falli subiti","Duelli vinti"];
      metrics.sort((a,b)=>{const x=priority.indexOf(a[0]),y=priority.indexOf(b[0]);return (x<0?99:x)-(y<0?99:y)});
      return '<article class="player-card"><div class="player-top"><strong>'+esc(p.name||"Giocatore non indicato")+'</strong><span>'+esc(team)+'</span></div><div class="player-metrics">'+(metrics.length?metrics.map(m=>'<div><span>'+esc(m[0])+'</span><b>'+esc(m[1])+'</b></div>').join(""): '<small>Statistiche individuali non fornite.</small>')+'</div></article>';
    }).join("");
    return '<div class="player-grid">'+cards+'</div>';
  }
  function renderLineups(item){
    const d=getData(item);if(!d)return empty(missing(item));
    return '<div class="lineup-grid">'+["home","away"].map(side=>{
      const team=d[side]||{},starters=team.starters||[],subs=team.subs||[],name=team.name||d[side+"_team"]?.name||(side==="home"?"Casa":"Ospite");
      const list=(arr)=>arr.length?'<ol>'+arr.map(p=>'<li><span>'+esc(p.name||"Giocatore")+(p.is_captain?" · Capitano":"")+'</span><b>'+(p.shirt_number?"#"+esc(p.shirt_number):"")+'</b></li>').join("")+'</ol>':empty("Elenco non fornito.");
      return '<article class="lineup-card"><h4>'+esc(name)+'</h4><p>'+esc(team.formation?"Modulo "+team.formation:"Modulo non indicato")+' · '+(team.confirmed===true?"Formazione confermata":team.confirmed===false?"Formazione non confermata":"Conferma non indicata")+'</p>'+(team.coach?.name?'<p>Allenatore: '+esc(team.coach.name)+'</p>':'')+'<h5>Titolari</h5>'+list(starters)+'<h5>Panchina</h5>'+list(subs)+'</article>';
    }).join("")+'</div>';
  }
  function renderH2H(item){
    const d=getData(item);if(!d)return empty(missing(item));
    const games=d.recent_matches||d.matches||[];
    const summary='<div class="analysis-metrics"><div><strong>'+esc(d.home_wins??"n.d.")+'</strong><span>Vittorie '+esc(d.home_team?.name||"casa")+'</span></div><div><strong>'+esc(d.draws??"n.d.")+'</strong><span>Pareggi</span></div><div><strong>'+esc(d.away_wins??"n.d.")+'</strong><span>Vittorie '+esc(d.away_team?.name||"ospite")+'</span></div></div>';
    if(!games.length)return summary+empty("Nessun precedente dettagliato restituito dalla fonte.");
    return summary+'<div class="result-list">'+games.map(g=>'<div><strong>'+esc(g.home?.name||"Casa")+' '+esc(g.score_home??"—")+' – '+esc(g.score_away??"—")+' '+esc(g.away?.name||"Ospite")+'</strong><small>'+esc(g.time_utc?new Date(g.time_utc).toLocaleDateString("it-IT",{timeZone:"Europe/Rome"}):"Data non indicata")+'</small></div>').join("")+'</div>';
  }
  function renderEvents(item,homeId,homeName,awayName){
    const d=getData(item);if(!d)return empty(missing(item));
    const events=Array.isArray(d)?d:(d.events||[]);if(!events.length)return empty("La cronologia degli eventi non è disponibile.");
    return '<div class="event-list">'+events.map(e=>{
      const type=italian(e.event_type||"Evento"),minute=e.minute!=null?e.minute+"'":"—";
      const team=e.team_id===homeId?homeName:(e.team?.name||awayName);
      let detail=e.player?.name||"";
      if(e.event_type==="substitution")detail=(e.sub_in_player?.name||"Entrata non indicata")+" al posto di "+(e.player?.name||"giocatore non indicato");
      if(e.is_penalty)detail+=" · Rigore";
      if(e.is_own_goal)detail+=" · Autogol";
      return '<div class="event-row"><b>'+esc(minute)+'</b><span>'+esc(type)+'</span><div><strong>'+esc(detail||"Dettaglio non indicato")+'</strong><small>'+esc(team)+'</small></div></div>';
    }).join("")+'</div>';
  }
  window.closeMatchDetails=function(){const p=$("matchDetailPanel");if(p)p.classList.add("hidden");};
  window.openMatchDetails=async function(matchId){
    const panelEl=$("matchDetailPanel"),content=$("matchDetailContent");if(!panelEl||!content)return;
    panelEl.classList.remove("hidden");panelEl.scrollIntoView({behavior:"smooth",block:"start"});
    content.innerHTML=empty("Sto preparando la scheda della partita…");
    try{
      const response=await fetch("data/partite.json?v="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("Archivio non raggiungibile.");
      const payload=await response.json(),root=payload.data||payload;
      const match=(root.matches||[]).find(m=>String(m.id)===String(matchId));if(!match)throw new Error("Partita non presente nell'archivio aggiornato.");
      const d=match.details||{},home=match.home_team?.name||"Casa",away=match.away_team?.name||"Ospite",homeId=match.home_team?.id,awayId=match.away_team?.id;
      const summary=getData(d.summary)||match,finished=String(summary.status||match.status||"").toLowerCase()==="finished";
      const score=summary.score_home!=null&&summary.score_away!=null?summary.score_home+" – "+summary.score_away:"—";
      const when=summary.time_utc||match.time_utc;
      const date=when?new Date(when).toLocaleString("it-IT",{dateStyle:"full",timeStyle:"short",timeZone:"Europe/Rome"}):"Data non indicata";
      $("matchDetailTitle").textContent=home+" – "+away;
      let html='<div class="match-hero"><div class="match-league">'+esc(summary.league?.name||match.league?.name||"Competizione non indicata")+' · '+esc(date)+'</div><div class="match-score"><span>'+esc(home)+'</span><strong>'+esc(score)+'</strong><span>'+esc(away)+'</span></div><div class="match-state">'+(finished?"Partita conclusa":status==="live"||status==="inprogress"?"Partita in corso":status==="scheduled"||status==="notstarted"?"In programma":status==="postponed"?"Rinviata":status==="cancelled"?"Annullata":"Stato non indicato")+'</div></div>';
      html+=panel("Riepilogo della partita",'<div class="analysis-metrics"><div><strong>'+esc(summary.round_name||"—")+'</strong><span>Giornata / turno</span></div><div><strong>'+esc(summary.referee||"—")+'</strong><span>Arbitro</span></div><div><strong>'+esc(summary.stadium||"—")+'</strong><span>Stadio</span></div></div>');
      html+=panel("Statistiche delle due squadre",statCards(getData(d.stats)));
      html+=panel("Tiri e occasioni",renderShots(d.shots,homeId,awayId,home,away),"Riepilogo dei tiri e dettaglio completo, quando fornito dalla fonte.");
      html+=panel("Statistiche dei giocatori",renderPlayers(d.players,homeId,awayId,home,away),"Minuti, gol, assist, tiri, passaggi e altri dati individuali disponibili.");
      html+=panel("Formazioni e panchine",renderLineups(d.lineups));
      html+=panel("Precedenti tra le squadre",renderH2H(d.h2h));
      html+=panel("Cronologia della partita",renderEvents(d.events,homeId,home,away));
      html+='<div class="analysis-source">Dati ricevuti da PitchAPI · aggiornamento archivio: '+esc(root.fetched_at||"non indicato")+'. Le statistiche mancanti non vengono sostituite con stime. Infortuni, squalifiche e notizie pre-partita non sono ancora presenti in questa scheda.</div>';
      content.innerHTML=html;
    }catch(err){content.innerHTML=empty("Non riesco a caricare questa partita: "+err.message);}
  };
})();