(function(){
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"Dato non disponibile").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const getData=x=>x&&typeof x==="object"&&Object.prototype.hasOwnProperty.call(x,"available")?(x.available?x.data:null):x;
 const unavailable=x=>!x?"Dato non presente nell’archivio.":"La fonte non ha pubblicato questo dato per la partita.";
 const names={
  "Total shots":"Tiri totali","Shots on target":"Tiri in porta","Shots off target":"Tiri fuori","Blocked shots":"Tiri bloccati","Shots inside box":"Tiri in area","Shots outside box":"Tiri fuori area","Corners":"Calci d’angolo","Fouls committed":"Falli commessi","Yellow cards":"Ammonizioni","Red cards":"Espulsioni","Ball possession":"Possesso palla","Expected goals (xG)":"Gol attesi (xG)","Expected goals":"Gol attesi (xG)","xG non-penalty":"xG senza rigori","xG on target (xGOT)":"xG dei tiri in porta","xG open play":"xG su azione","xG set play":"xG su palla inattiva","Keeper saves":"Parate","Accurate passes":"Passaggi riusciti","Passes":"Passaggi tentati","Offsides":"Fuorigioco","Big chances":"Grandi occasioni","Big chances missed":"Grandi occasioni sprecate","Clearances":"Respinte difensive","Interceptions":"Intercetti","Tackles":"Contrasti","Blocks":"Tiri murati","Aerial duels won":"Duelli aerei vinti","Ground duels won":"Duelli a terra vinti","Successful dribbles":"Dribbling riusciti","Recoveries":"Palloni recuperati","PPDA":"Pressione (PPDA)","Accurate crosses":"Cross riusciti","Accurate long balls":"Lanci lunghi riusciti","Touches in opposition box":"Tocchi in area avversaria","Final third entries":"Ingressi nell’ultimo terzo","Penalty area entries":"Ingressi in area","Saves":"Parate","Goals":"Gol","Assists":"Assist","Minutes played":"Minuti giocati","Chances created":"Occasioni create","Touches":"Tocchi palla","Dispossessed":"Palloni persi","Was fouled":"Falli subiti","Duels won":"Duelli vinti","Duels lost":"Duelli persi","Headed clearance":"Respinte di testa","Passes into final third":"Passaggi nell’ultimo terzo","Throws":"Rimesse laterali","Shot assists":"Assist al tiro","Expected goals on target":"xG dei tiri in porta","Expected assists":"Assist attesi (xA)","Penalties":"Rigori","Penalties missed":"Rigori sbagliati","Hit woodwork":"Legni colpiti","Key passes":"Passaggi chiave","Long balls":"Lanci lunghi","Dribbles":"Dribbling","Tackles won":"Contrasti vinti","Fouls":"Falli","Yellow cards":"Ammonizioni","Red cards":"Espulsioni"
 };
 const groups={"Defence":"Difesa","Defense":"Difesa","Discipline":"Disciplina","Duels":"Duelli","Expected goals (xG)":"Qualità delle occasioni","Passes":"Passaggi e possesso","Pressing":"Pressione e recuperi","Shots":"Tiri","Territory":"Territorio","Top stats":"Dati principali","Attack":"Attacco","Goalkeeping":"Portiere"};
 const vals={"All":"Intera partita","FirstHalf":"Primo tempo","SecondHalf":"Secondo tempo","Header":"Colpo di testa","LeftFoot":"Piede sinistro","RightFoot":"Piede destro","Other":"Altro","RegularPlay":"Azione","FromCorner":"Da calcio d’angolo","FreeKick":"Da punizione","FastBreak":"Contropiede","SetPiece":"Palla inattiva","Penalty":"Rigore","ThrowInSetPiece":"Da rimessa laterale","Goal":"Gol","AttemptSaved":"Parato dal portiere","Miss":"Fuori","Blocked":"Murato","OwnGoal":"Autogol","yellowcard":"Ammonizione","redcard":"Espulsione","goal":"Gol","substitution":"Sostituzione","penalty":"Rigore"};
 const label=x=>names[x]||String(x||"Dato non indicato").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const italian=x=>vals[x]||x||"Dato non indicato";
 const empty=x=>'<div class="analysis-empty">'+esc(x)+'</div>';
 const block=(title,body,note="")=>'<section class="analysis-block"><h3>'+esc(title)+'</h3>'+(note?'<p class="analysis-note">'+esc(note)+'</p>':"")+body+'</section>';
 let currentMatch=null,currentPlayers=[],currentLineups=null;
 function sectionTabs(){
  const items=[["riepilogo","Riepilogo"],["statistiche","Statistiche"],["tiri","Tiri e occasioni"],["formazioni","Formazioni"],["giocatori","Giocatori"],["precedenti","Precedenti"],["eventi","Cronologia"]];
  return '<nav class="match-section-tabs" aria-label="Sezioni analisi">'+items.map((x,i)=>'<button class="match-section-tab '+(i===0?"active":"")+'" data-section="'+x[0]+'" onclick="showMatchSection(\''+x[0]+'\')">'+x[1]+'</button>').join("")+'</nav>';
 }
 function section(id,html,active){return '<section class="match-section '+(active?"active":"")+'" id="match-section-'+id+'">'+html+'</section>';}
 function metrics(items){return '<div class="analysis-metrics">'+items.map(x=>'<div><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>').join("")+'</div>';}
 function renderStats(data){
  const periods=data?.periods||[];if(!periods.length)return empty("Le statistiche di squadra non sono disponibili per questa partita.");
  return periods.map(p=>'<div class="stat-period"><h4>'+esc(italian(p.period))+'</h4>'+(p.groups||[]).map(g=>{
   const items=g.items||[];if(!items.length)return "";
   return '<div class="stat-group"><h5>'+esc(groups[g.group_name]||g.group_name||"Altri dati")+'</h5><div class="stat-table"><div class="stat-head"><span>Statistica</span><span>Casa</span><span>Ospite</span></div>'+items.map(it=>'<div class="stat-row"><span>'+esc(label(it.title||it.key))+'</span><strong>'+esc(it.home??"n.d.")+'</strong><strong>'+esc(it.away??"n.d.")+'</strong></div>').join("")+'</div></div>';
  }).join("")+'</div>').join("");
 }
 function allPlayerStats(entry){
  const out=[];
  (entry?.stats||[]).forEach(g=>Object.entries(g.stats||{}).forEach(([key,obj])=>{
   const st=obj?.stat;if(!st||st.value===null||st.value===undefined)return;
   let value=st.value;
   if(st.type==="fractionWithPercentage"||st.total!==undefined){
    value=st.value+(st.total!==undefined?"/"+st.total:"");
    if(st.total>0)value+=" ("+Math.round(st.value/st.total*100)+"%)";
   }
   out.push({group:groups[g.title]||groups[g.key]||({top_stats:"Dati principali",attack:"Attacco",defense:"Difesa",duels:"Duelli"}[g.key]||g.title||"Altri dati"),name:label(key),value});
  }));
  return out;
 }
 function playerDataMap(players){const map={};(players||[]).forEach(e=>{if(e.player?.id)map[e.player.id]=e});return map;}
 function showPlayer(id){
  const entry=currentPlayers.find(e=>String(e.player?.id)===String(id));
  const lineupAll=[...(currentLineups?.home?.starters||[]),...(currentLineups?.away?.starters||[]),...(currentLineups?.home?.subs||[]),...(currentLineups?.away?.subs||[])];
  const lineupPlayer=lineupAll.find(p=>String(p.player_id)===String(id));
  const p=entry?.player||{};
  const teamId=entry?.team_id;
  const team=teamId===currentMatch?.home_team?.id?currentMatch.home_team.name:teamId===currentMatch?.away_team?.id?currentMatch.away_team.name:(lineupPlayer?(currentLineups?.home?.starters||[]).some(x=>String(x.player_id)===String(id))?currentMatch?.home_team?.name:currentMatch?.away_team?.name:"Squadra non indicata");
  const stats=allPlayerStats(entry);
  const findStat=(...names)=>stats.find(s=>names.includes(s.name))?.value??"—";
  const main=[["Gol",findStat("Gol")],["Assist",findStat("Assist")],["Minuti",findStat("Minuti giocati")],["Tiri",findStat("Tiri totali","Total shots")]];
  const groupsBy={};stats.forEach(s=>(groupsBy[s.group]??=[]).push(s));
  const image=p.image_url||"";
  const photo=image?'<img class="player-photo" src="'+esc(image)+'" alt="Foto di '+esc(p.name||"giocatore")+'">':'<div class="player-photo player-photo-empty">⚽</div>';
  const isStarter=(currentLineups?.home?.starters||[]).some(x=>String(x.player_id)===String(id))||(currentLineups?.away?.starters||[]).some(x=>String(x.player_id)===String(id));
  const isSub=(currentLineups?.home?.subs||[]).some(x=>String(x.player_id)===String(id))||(currentLineups?.away?.subs||[]).some(x=>String(x.player_id)===String(id));
  const status=isStarter?"Titolare":isSub?"In panchina":"Presenza non indicata";
  const shirt=lineupPlayer?.shirt_number||"n.d.";
  const captain=lineupPlayer?.is_captain?" · Capitano":"";
  const role=lineupPlayer?.position_name||p.position_name||"Ruolo non disponibile";
  const league=String(currentMatch?.league?.name||currentMatch?.details?.summary?.data?.league?.name||"");
  const isSerieA=/serie\s*a/i.test(league);
  const sticker=isSerieA?'<div class="fantacalcio-sticker"><span class="sticker-title">FANTACALCIO</span>'+(image?'<img src="'+esc(image)+'" alt="">':'<div class="player-photo-empty">⚽</div>')+'<strong>'+esc(p.name||lineupPlayer?.name||"Giocatore")+'</strong><small>'+esc(team)+' · '+esc(role)+'</small><small>Maglia '+esc(shirt)+'</small><span class="sticker-band">SERIE A</span></div>':"";
  const eventsRaw=getData(currentMatch?.details?.events);
  const events=Array.isArray(eventsRaw)?eventsRaw:(eventsRaw?.events||[]);
  const playerEvents=events.filter(e=>String(e.player?.id)===String(id)||String(e.sub_in_player?.id)===String(id));
  const eventNames={goal:"⚽ Gol",yellowcard:"🟨 Ammonizione",redcard:"🟥 Espulsione",substitution:"🔄 Sostituzione",penalty:"⚽ Rigore"};
  const eventHtml=playerEvents.length?'<div class="player-event-strip">'+playerEvents.map(e=>'<span class="player-event-chip">'+esc(eventNames[e.event_type]||"Evento")+' · '+esc(e.minute!=null?e.minute+"′":"minuto n.d.")+'</span>').join("")+'</div>':"";
  const kpis='<div class="player-profile-kpis">'+main.map(x=>'<div class="player-kpi"><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>').join("")+'</div>';
  const details=stats.length?Object.entries(groupsBy).map(([g,items])=>'<div class="player-stat-group"><h5>'+esc(g)+'</h5><div class="player-profile-stats">'+items.map(s=>'<div><span>'+esc(s.name)+'</span><strong>'+esc(s.value)+'</strong></div>').join("")+'</div></div>').join(""):empty("Nessuna statistica individuale pubblicata per questo giocatore.");
  const body='<div class="player-profile-head">'+photo+sticker+'<div><h4>'+esc(p.name||lineupPlayer?.name||"Giocatore")+'</h4><p>'+esc(team)+' · Maglia '+esc(shirt)+esc(captain)+'</p><small>'+status+' · Ruolo: '+esc(role)+'</small></div></div>'+kpis+eventHtml+'<div class="player-profile-body">'+(stats.length?'<p class="analysis-note">Statistiche registrate in questa partita, raggruppate per area. Il trattino indica un dato non pubblicato.</p>':"")+details+'</div><button class="player-profile-close" type="button" onclick="this.parentElement.classList.add(\'hidden\')">Chiudi scheda giocatore</button>';
  let box=document.querySelector(".match-section.active #playerProfile");
  if(!box){window.showMatchSection("giocatori");box=document.querySelector(".match-section.active #playerProfile");}
  if(box){box.innerHTML=body;box.classList.remove("hidden");box.scrollIntoView({behavior:"smooth",block:"nearest"});}
 }
 window.openPlayerProfile=showPlayer;
 window.showMatchSection=function(id){
  document.querySelectorAll(".match-section").forEach(x=>x.classList.toggle("active",x.id==="match-section-"+id));
  document.querySelectorAll(".match-section-tab").forEach(x=>x.classList.toggle("active",x.dataset.section===id));
  const target=$("match-section-"+id);if(target)target.scrollIntoView({behavior:"smooth",block:"nearest"});
 };
 function renderShots(item,homeId,awayId,home,away){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const shots=(d.periods||[]).flatMap(p=>(p.shots||[]).map(s=>({...s,period:p.period})));
  if(!shots.length)return empty("Il dettaglio dei singoli tiri non è stato pubblicato.");
  const h=shots.filter(s=>s.team_id===homeId),a=shots.filter(s=>s.team_id===awayId),on=x=>x.filter(s=>s.is_on_target===true).length;
  const xg=x=>x.reduce((n,s)=>n+(Number(s.expected_goals)||0),0);
  const overview=metrics([["Tiri totali",shots.length],["Tiri in porta",on(h)+" – "+on(a)],["xG dei tiri elencati",xg(h).toFixed(2)+" – "+xg(a).toFixed(2)]]);
  const rows=shots.map(s=>'<div class="shot-row"><b>'+esc(s.minute!=null?s.minute+"'":"—")+'</b><div><strong>'+esc(s.player?.name||"Giocatore non indicato")+'</strong><small>'+esc(s.team_id===homeId?home:s.team_id===awayId?away:"Squadra non indicata")+' · '+esc(italian(s.period))+' · '+esc(italian(s.shot_type))+' · '+esc(italian(s.situation))+'</small></div><div class="shot-result"><strong>'+esc(italian(s.event_type))+'</strong><small>'+(s.expected_goals!=null?"xG "+Number(s.expected_goals).toFixed(2):"xG n.d.")+' · '+(s.is_on_target===true?"In porta":s.is_on_target===false?"Fuori porta":"Esito n.d.")+'</small></div></div>').join("");
  return overview+'<details class="analysis-details"><summary>Mostra tutti i '+shots.length+' tiri</summary><div class="shot-list">'+rows+'</div></details>';
 }
 function renderPitch(lineups,home,away){
  if(!lineups)return empty("Le formazioni non sono state pubblicate per questa partita.");
  currentLineups=lineups;
  const h=lineups.home||{},a=lineups.away||{};
  if(!(h.starters||[]).length&&!(a.starters||[]).length)return empty("Non sono disponibili i titolari per disegnare le formazioni.");
  const playerById=playerDataMap(currentPlayers);
  const markers=(arr,side)=>arr.map(p=>{
   const px=Number(p.pitch_x),py=Number(p.pitch_y);
   if(!Number.isFinite(px)||!Number.isFinite(py)||(px===0&&py===0))return "";
   const x=Math.max(5,Math.min(95,(side==="away"?1-px:px)*100)),y=Math.max(7,Math.min(93,py*100));
   const player=playerById[p.player_id]?.player||{},face=player.image_url;
   const avatar=face?'<img class="pitch-face" src="'+esc(face)+'" alt="">':'<i class="pitch-face-fallback">⚽</i>';
   return '<button class="pitch-player '+side+'" style="left:'+x+'%;top:'+y+'%" onclick="openPlayerProfile(\''+esc(p.player_id)+'\')" title="'+esc(p.name)+'" aria-label="Apri scheda '+esc(p.name)+'">'+avatar+'<b class="pitch-number">'+esc(p.shirt_number||"•")+'</b><small>'+esc(p.name)+'</small></button>';
  }).join("");
  const pitch='<div class="pitch-wrap"><div class="pitch-labels"><b>CASA · '+esc(home)+'</b><span>Campo visto dall’alto</span><b>OSPITE · '+esc(away)+'</b></div><div class="football-pitch"><div class="pitch-halfway"></div><div class="pitch-center-circle"></div><div class="pitch-center-spot"></div><div class="pitch-box left"></div><div class="pitch-box right"></div><div class="pitch-six left"></div><div class="pitch-six right"></div><div class="pitch-goal left"></div><div class="pitch-goal right"></div>'+markers(h.starters||[],"home")+markers(a.starters||[],"away")+'</div><div class="pitch-hint">Casa sempre a sinistra e ospite a destra. Le foto appaiono quando disponibili; seleziona un volto per aprire la scheda del giocatore.</div></div>';
  const teams=[[h,home],[a,away]].map(([t,name])=>{
   const list=arr=>arr.length?'<div class="sub-list">'+arr.map(p=>'<button class="player-select" onclick="openPlayerProfile(\''+esc(p.player_id)+'\')"><span class="shirt">'+esc(p.shirt_number||"•")+'</span><span>'+esc(p.name)+'</span>'+(p.is_captain?'<small>Capitano</small>':"")+'</button>').join("")+'</div>':empty("Elenco non fornito.");
   return '<div class="lineup-team"><div class="lineup-team-head"><div><h4>'+esc(name)+'</h4><small>'+esc(t.formation?"Modulo "+t.formation:"Modulo non indicato")+' · '+(t.confirmed===true?"Formazione confermata":t.confirmed===false?"Probabile, non confermata":"Conferma non indicata")+'</small></div>'+(t.coach?.name?'<small>Allenatore: '+esc(t.coach.name)+'</small>':"")+'</div><h5>Titolari</h5>'+list(t.starters||[])+'<h5>Panchina</h5>'+list(t.subs||[])+'</div>';
  }).join("");
  return pitch+'<div class="lineup-grid">'+teams+'</div><div id="playerProfile" class="player-profile hidden"></div>';
 }
 function renderPlayerDirectory(players,homeId,awayId,home,away){
  if(!players?.length)return empty("Le statistiche individuali non sono disponibili.");
  return '<p class="analysis-note">Seleziona un giocatore per aprire la scheda completa con tutti i dati individuali pubblicati.</p><div class="player-grid">'+players.map(e=>{
   const p=e.player||{},stats=allPlayerStats(e),team=e.team_id===homeId?home:e.team_id===awayId?away:"Squadra non indicata";
   const goals=stats.find(x=>x.name==="Gol")?.value??"—",assists=stats.find(x=>x.name==="Assist")?.value??"—",minutes=stats.find(x=>x.name==="Minuti giocati")?.value??"—";
   return '<button class="player-card player-card-button" onclick="openPlayerProfile(\''+esc(p.id)+'\')">'+(p.image_url?'<img class="player-thumb" src="'+esc(p.image_url)+'" alt="">':'<span class="player-thumb">⚽</span>')+'<span class="player-card-info"><strong>'+esc(p.name||"Giocatore")+'</strong><small>'+esc(team)+'</small><span class="player-card-summary">Gol '+esc(goals)+' · Assist '+esc(assists)+' · Minuti '+esc(minutes)+'</span></span></button>';
  }).join("")+'</div><div id="playerProfile" class="player-profile hidden"></div>';
 }
 function renderH2H(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const games=d.recent_matches||d.matches||[];
  const overview=metrics([["Vittorie casa",d.home_wins??"n.d."],["Pareggi",d.draws??"n.d."],["Vittorie ospite",d.away_wins??"n.d."]]);
  if(!games.length)return overview+empty("La fonte non ha restituito l’elenco dei precedenti.");
  return overview+'<div class="result-list">'+games.map(g=>'<div><strong>'+esc(g.home?.name||"Casa")+' '+esc(g.score_home??"—")+' – '+esc(g.score_away??"—")+' '+esc(g.away?.name||"Ospite")+'</strong><small>'+esc(g.time_utc?new Date(g.time_utc).toLocaleDateString("it-IT",{timeZone:"Europe/Rome"}):"Data non indicata")+'</small></div>').join("")+'</div>';
 }
 function renderEvents(item,homeId,home,away){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const events=Array.isArray(d)?d:(d.events||[]);if(!events.length)return empty("La cronologia degli eventi non è disponibile.");
  return '<div class="event-list">'+events.map(e=>{
   const type=italian(e.event_type||"Evento"),minute=e.minute!=null?e.minute+"'":"—";
   const team=e.team_id===homeId?home:(e.team?.name||away);
   let detail=e.player?.name||"";
   if(e.event_type==="substitution")detail=(e.sub_in_player?.name||"Entrata non indicata")+" al posto di "+(e.player?.name||"giocatore non indicato");
   if(e.is_penalty)detail+=" · Rigore";if(e.is_own_goal)detail+=" · Autogol";
   return '<div class="event-row"><b>'+esc(minute)+'</b><span>'+esc(type)+'</span><div><strong>'+esc(detail||"Dettaglio non indicato")+'</strong><small>'+esc(team)+'</small></div></div>';
  }).join("")+'</div>';
 }
 window.closeMatchDetails=()=>{const p=$("matchDetailPanel");if(p)p.classList.add("hidden");};
 window.openMatchDetails=async function(id){
  const panel=$("matchDetailPanel"),content=$("matchDetailContent");if(!panel||!content)return;
  panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth",block:"start"});content.innerHTML=empty("Caricamento della scheda partita…");
  try{
   const res=await fetch("data/partite.json?v="+Date.now(),{cache:"no-store"});if(!res.ok)throw new Error("Archivio non raggiungibile.");
   const payload=await res.json(),root=payload.data||payload,match=(root.matches||[]).find(m=>String(m.id)===String(id));
   if(!match)throw new Error("Partita non presente nell’archivio aggiornato.");
   currentMatch=match;
   const d=match.details||{},home=match.home_team?.name||"Casa",away=match.away_team?.name||"Ospite",homeId=match.home_team?.id,awayId=match.away_team?.id;
   currentPlayers=Array.isArray(getData(d.players))?getData(d.players):(getData(d.players)?.players||[]);
   const summary=getData(d.summary)||match,status=String(summary.status||match.status||"").toLowerCase();
   const score=summary.score_home!=null&&summary.score_away!=null?summary.score_home+" – "+summary.score_away:"—",when=summary.time_utc||match.time_utc;
   const date=when?new Date(when).toLocaleString("it-IT",{dateStyle:"full",timeStyle:"short",timeZone:"Europe/Rome"}):"Data non indicata";
   $("matchDetailTitle").textContent=home+" – "+away;
   const state=status==="finished"?"Partita conclusa":status==="live"||status==="inprogress"?"Partita in corso":status==="scheduled"||status==="notstarted"?"In programma":status==="postponed"?"Rinviata":status==="cancelled"?"Annullata":"Stato non indicato";
   const head='<div class="match-hero"><div class="match-league">'+esc(summary.league?.name||match.league?.name||"Competizione non indicata")+' · '+esc(date)+'</div><div class="match-score"><span>'+esc(home)+'</span><strong>'+esc(score)+'</strong><span>'+esc(away)+'</span></div><div class="match-state">'+state+'</div></div>';
   const summaryBody=metrics([["Giornata / turno",summary.round_name||"—"],["Arbitro",summary.referee||"—"],["Stadio",summary.stadium||"—"]]);
   const sections=sectionTabs()+
    section("riepilogo",block("Informazioni principali",summaryBody+metrics([["Competizione",summary.league?.name||match.league?.name||"—"],["Stagione",summary.season||"—"],["Stato",state]]),""),true)+
    section("statistiche",block("Confronto statistico",renderStats(getData(d.stats)),"Valori della squadra di casa e della squadra ospite, suddivisi per categoria."),false)+
    section("tiri",block("Tiri e occasioni",renderShots(d.shots,homeId,awayId,home,away),"Conteggio e dettaglio dei tiri registrati dalla fonte."),false)+
    section("formazioni",block("Formazioni sul campo",renderPitch(getData(d.lineups),home,away),"I moduli e le posizioni sono quelli restituiti dalla fonte; clicca sui calciatori per vedere i dati individuali."),false)+
    section("giocatori",block("Tutti i giocatori",renderPlayerDirectory(currentPlayers,homeId,awayId,home,away),"Statistiche individuali della partita. Apri un calciatore per vedere tutti i valori disponibili."),false)+
    section("precedenti",block("Scontri diretti",renderH2H(d.h2h)),false)+
    section("eventi",block("Cronologia della partita",renderEvents(d.events,homeId,home,away)),false);
   const note='<div class="analysis-source">Fonte: PitchAPI · ultimo aggiornamento archivio: '+esc(root.fetched_at||"non indicato")+'. I dati non pubblicati dalla fonte vengono indicati come non disponibili e non sono sostituiti da valori inventati. Le formazioni sono probabili o confermate secondo lo stato indicato dal provider.</div>';
   content.innerHTML=head+sections+note;
  }catch(err){content.innerHTML=empty("Non riesco a caricare questa partita: "+err.message);}
 };
})();