(function(){
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"Dato non disponibile").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const getData=x=>x&&typeof x==="object"&&Object.prototype.hasOwnProperty.call(x,"available")?(x.available?x.data:null):x;
 const unavailable=x=>{
  if(!x)return "Dato non presente nell’archivio.";
  if(x.reason)return String(x.reason);
  if(x.http_status)return "La fonte ha risposto con errore HTTP "+x.http_status+"; il dato non è stato recuperato.";
  return "La fonte non ha pubblicato questo dato per la partita.";
 };
 const names={
  "Total shots":"Tiri totali","Shots on target":"Tiri in porta","Shots off target":"Tiri fuori","Blocked shots":"Tiri bloccati","Shots inside box":"Tiri in area","Shots outside box":"Tiri fuori area","Corners":"Calci d’angolo","Fouls committed":"Falli commessi","Yellow cards":"Ammonizioni","Red cards":"Espulsioni","Ball possession":"Possesso palla","Expected goals (xG)":"Gol attesi (xG)","Expected goals":"Gol attesi (xG)","xG non-penalty":"xG senza rigori","xG on target (xGOT)":"xG dei tiri in porta","xG open play":"xG su azione","xG set play":"xG su palla inattiva","Keeper saves":"Parate","Accurate passes":"Passaggi riusciti","Passes":"Passaggi tentati","Offsides":"Fuorigioco","Big chances":"Grandi occasioni","Big chances missed":"Grandi occasioni sprecate","Clearances":"Respinte difensive","Interceptions":"Intercetti","Tackles":"Contrasti","Blocks":"Tiri murati","Aerial duels won":"Duelli aerei vinti","Ground duels won":"Duelli a terra vinti","Successful dribbles":"Dribbling riusciti","Recoveries":"Palloni recuperati","PPDA":"Pressione (PPDA)","Accurate crosses":"Cross riusciti","Accurate long balls":"Lanci lunghi riusciti","Touches in opposition box":"Tocchi in area avversaria","Final third entries":"Ingressi nell’ultimo terzo","Penalty area entries":"Ingressi in area","Saves":"Parate","Goals":"Gol","Assists":"Assist","Minutes played":"Minuti giocati","Chances created":"Occasioni create","Touches":"Tocchi palla","Dispossessed":"Palloni persi","Was fouled":"Falli subiti","Duels won":"Duelli vinti","Duels lost":"Duelli persi","Headed clearance":"Respinte di testa","Passes into final third":"Passaggi nell’ultimo terzo","Throws":"Rimesse laterali","Shot assists":"Assist al tiro","Expected goals on target":"xG dei tiri in porta","Expected assists":"Assist attesi (xA)","Penalties":"Rigori","Penalties missed":"Rigori sbagliati","Hit woodwork":"Legni colpiti","Key passes":"Passaggi chiave","Long balls":"Lanci lunghi","Dribbles":"Dribbling","Tackles won":"Contrasti vinti","Fouls":"Falli","Yellow cards":"Ammonizioni","Red cards":"Espulsioni"
 };
 const groups={"Defence":"Difesa","Defense":"Difesa","Discipline":"Disciplina","Duels":"Duelli","Expected goals (xG)":"Qualità delle occasioni","Passes":"Passaggi e possesso","Pressing":"Pressione e recuperi","Shots":"Tiri","Territory":"Territorio","Top stats":"Dati principali","Attack":"Attacco","Goalkeeping":"Portiere"};
 const vals={"All":"Intera partita","FirstHalf":"Primo tempo","SecondHalf":"Secondo tempo","Header":"Colpo di testa","LeftFoot":"Piede sinistro","RightFoot":"Piede destro","Other":"Altro","RegularPlay":"Azione","FromCorner":"Da calcio d’angolo","FreeKick":"Da punizione","FastBreak":"Contropiede","SetPiece":"Palla inattiva","Penalty":"Rigore","ThrowInSetPiece":"Da rimessa laterale","Goal":"Gol","AttemptSaved":"Parato dal portiere","Miss":"Fuori","Blocked":"Murato","OwnGoal":"Autogol","yellowcard":"Ammonizione","redcard":"Espulsione","goal":"Gol","substitution":"Sostituzione","penalty":"Rigore"};
 const label=x=>names[x]||String(x||"Dato non indicato").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const italian=x=>vals[x]||x||"Dato non indicato";
 const empty=x=>'<div class="analysis-empty">'+esc(x)+'</div>';
 const matchNotStarted=()=>["not_started","notstarted","scheduled"].includes(String(currentMatch?.status||currentMatch?.details?.summary?.data?.status||"").toLowerCase().replace(/_/g,""));
 const waitingMessage=area=>matchNotStarted()?area+" non ancora disponibili: la partita deve ancora iniziare.":area+" non disponibili o non pubblicati dalla fonte per questa partita.";
 const block=(title,body,note="")=>'<section class="analysis-block"><h3>'+esc(title)+'</h3>'+(note?'<p class="analysis-note">'+esc(note)+'</p>':"")+body+'</section>';
 let currentMatch=null,currentPlayers=[],currentLineups=null;
 function sectionTabs(){
  const items=[["riepilogo","Riepilogo"],["forma","Forma recente"],["statistiche","Statistiche"],["tiri","Tiri e occasioni"],["formazioni","Formazioni"],["giocatori","Giocatori"],["precedenti","Precedenti"],["avanzate","Analisi avanzata"],["pressione","Pressione"],["eventi","Cronologia"]];
  return '<nav class="match-section-tabs" aria-label="Sezioni analisi">'+items.map((x,i)=>'<button class="match-section-tab '+(i===0?"active":"")+'" data-section="'+x[0]+'" onclick="showMatchSection(\''+x[0]+'\')">'+x[1]+'</button>').join("")+'</nav>';
 }
 function section(id,html,active){return '<section class="match-section '+(active?"active":"")+'" id="match-section-'+id+'">'+html+'</section>';}
 function metrics(items){return '<div class="analysis-metrics">'+items.map(x=>'<div><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>').join("")+'</div>';}
 function renderStats(data){
  const periods=data?.periods||[];if(!periods.length)return empty(waitingMessage("Le statistiche di squadra"));
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
  if(!shots.length)return empty(waitingMessage("Il dettaglio dei singoli tiri"));
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
  const homeTeam=currentMatch?.home_team||{},awayTeam=currentMatch?.away_team||{};
  const palettes={
   "inter":["#0757a5","#101820"],"milan":["#c51f32","#171717"],"juventus":["#f4f4f0","#171717"],"napoli":["#58b9e9","#ffffff"],"roma":["#8c1837","#e7bd61"],"lazio":["#79c9ef","#ffffff"],"atalanta":["#1765ad","#171717"],"fiorentina":["#56328a","#ffffff"],"bologna":["#c62635","#183f7a"],"torino":["#7d1832","#ffffff"],"genoa":["#b92336","#173f77"],"cagliari":["#c42b43","#123d79"],"udinese":["#20242a","#f2f2ec"],"sassuolo":["#16784c","#111111"],"parma":["#e4c83c","#2252a0"],"lecce":["#e9c83d","#c62b36"],"como":["#65bce9","#ffffff"],"pisa":["#164d9a","#111111"],"cremonese":["#b92835","#f2f2f2"],"verona":["#f0c63c","#164b9c"],"junior":["#d52b3d","#ffffff"],"cucuta":["#d32932","#171717"]
  };
  const paletteFor=(name,side)=>{
   const n=String(name||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
   const key=Object.keys(palettes).find(k=>n.includes(k));
   return key?palettes[key]:(side==="home"?["#b7f34a","#173b28"]:["#e4e9ee","#283a50"]);
  };
  const shirt=(p,side)=>{
   const [c1,c2]=paletteFor(side==="home"?home:away,side);
   const player=playerById[p.player_id]?.player||{},face=player.image_url;
   const faceMarkup=face?'<image href="'+esc(face)+'" x="11" y="2" width="26" height="26" clip-path="url(#faceClip-'+side+'-'+esc(p.player_id)+')"/>':'';
   return '<svg class="pitch-kit" viewBox="0 0 48 52" role="img" aria-label="Maglia numero '+esc(p.shirt_number||"n.d.")+'"><path d="M14 5 L7 9 L1 20 L9 25 L13 19 L13 48 Q24 52 35 48 L35 19 L39 25 L47 20 L41 9 L34 5 Q29 11 24 11 Q19 11 14 5Z" fill="'+c1+'" stroke="#f4ffe9" stroke-width="1.5"/><path d="M19 8 Q24 13 29 8 L35 6 L35 48 Q24 52 13 48 L13 6Z" fill="'+c2+'" opacity=".72"/><path d="M21 12 L27 12 L27 46 L21 46Z" fill="'+c1+'" opacity=".9"/><path d="M14 5 L7 9 L1 20 L9 25 L13 19 M34 5 L41 9 L47 20 L39 25 L35 19" fill="none" stroke="#f4ffe9" stroke-width="1.3"/><text x="24" y="34" fill="#fff" stroke="#102016" stroke-width=".5" paint-order="stroke" text-anchor="middle" font-size="11" font-weight="900">'+esc(p.shirt_number||"")+'</text></svg>'+(face?'<img class="pitch-face-small" src="'+esc(face)+'" alt="">':'');
  };
  const markers=(arr,side)=>arr.map(p=>{
   const px=Number(p.pitch_x),py=Number(p.pitch_y);
   if(!Number.isFinite(px)||!Number.isFinite(py)||(px===0&&py===0))return "";
   const x=side==="home"?Math.max(5,Math.min(45,5+px*40)):Math.max(55,Math.min(95,95-px*40));
   const y=Math.max(7,Math.min(93,py*100));
   return '<button class="pitch-player '+side+'" style="--x:'+x+'%;left:'+x+'%;top:'+y+'%" onclick="openPlayerProfile(\''+esc(p.player_id)+'\')" title="'+esc(p.name)+'" aria-label="Apri scheda '+esc(p.name)+'">'+shirt(p,side)+'<small>'+esc(p.name)+'</small></button>';
  }).join("");
  const crest=team=>team.image_url?'<img class="team-crest" src="'+esc(team.image_url)+'" alt="Stemma '+esc(team.name||"squadra")+'">':'<span class="team-crest">⚽</span>';
  const pitch='<div class="pitch-wrap"><div class="pitch-labels"><div class="pitch-team-label">'+crest(homeTeam)+'<span><small>SQUADRA DI CASA</small><strong>'+esc(home)+'</strong></span></div><span class="muted">FORMAZIONI</span><div class="pitch-team-label"><span><small>SQUADRA OSPITE</small><strong>'+esc(away)+'</strong></span>'+crest(awayTeam)+'</div></div><div class="football-pitch"><div class="pitch-halfway"></div><div class="pitch-center-circle"></div><div class="pitch-center-spot"></div><div class="pitch-box left"></div><div class="pitch-box right"></div><div class="pitch-six left"></div><div class="pitch-six right"></div><div class="pitch-goal left"></div><div class="pitch-goal right"></div><div class="pitch-team-separator"></div>'+markers(h.starters||[],"home")+markers(a.starters||[],"away")+'</div><div class="pitch-legend"><span><i style="background:#b7f34a"></i> Casa · '+esc(home)+'</span><span><i style="background:#e4e9ee"></i> Ospite · '+esc(away)+'</span></div><div class="pitch-hint">Le squadre occupano due metà distinte: casa a sinistra, ospite a destra. Le maglie riprendono i colori sociali noti; se la divisa ufficiale della stagione non è fornita dalla fonte, la grafica è indicativa.</div></div>';
  const teams=[[h,home],[a,away]].map(([t,name])=>{
   const list=arr=>arr.length?'<div class="sub-list">'+arr.map(p=>'<button class="player-select" onclick="openPlayerProfile(\''+esc(p.player_id)+'\')"><span class="shirt">'+esc(p.shirt_number||"•")+'</span><span>'+esc(p.name)+'</span>'+(p.is_captain?'<small>Capitano</small>':"")+'</button>').join("")+'</div>':empty("Elenco non fornito.");
   return '<div class="lineup-team"><div class="lineup-team-head"><div><h4>'+esc(name)+'</h4><small>'+esc(t.formation?"Modulo "+t.formation:"Modulo non indicato")+' · '+(t.confirmed===true?"Formazione ufficiale confermata":t.lineup_type==="lastStarting11"?"Ultima formazione nota · non è una probabile":t.confirmed===false?"Formazione non confermata":"Conferma non indicata")+'</small></div>'+(t.coach?.name?'<small>Allenatore: '+esc(t.coach.name)+'</small>':"")+'</div><h5>Titolari</h5>'+list(t.starters||[])+'<h5>Panchina</h5>'+list(t.subs||[])+'</div>';
  }).join("");
  return pitch+'<div class="lineup-grid">'+teams+'</div><div id="playerProfile" class="player-profile hidden"></div>';
 }
 function renderPlayerDirectory(players,homeId,awayId,home,away){
  if(!players?.length)return empty(waitingMessage("Le statistiche individuali"));
  return '<p class="analysis-note">Seleziona un giocatore per aprire la scheda completa con tutti i dati individuali pubblicati.</p><div class="player-grid">'+players.map(e=>{
   const p=e.player||{},stats=allPlayerStats(e),team=e.team_id===homeId?home:e.team_id===awayId?away:"Squadra non indicata";
   const goals=stats.find(x=>x.name==="Gol")?.value??"—",assists=stats.find(x=>x.name==="Assist")?.value??"—",minutes=stats.find(x=>x.name==="Minuti giocati")?.value??"—";
   return '<button class="player-card player-card-button" onclick="openPlayerProfile(\''+esc(p.id)+'\')">'+(p.image_url?'<img class="player-thumb" src="'+esc(p.image_url)+'" alt="">':'<span class="player-thumb">⚽</span>')+'<span class="player-card-info"><strong>'+esc(p.name||"Giocatore")+'</strong><small>'+esc(team)+'</small><span class="player-card-summary">Gol '+esc(goals)+' · Assist '+esc(assists)+' · Minuti '+esc(minutes)+'</span></span></button>';
  }).join("")+'</div><div id="playerProfile" class="player-profile hidden"></div>';
 }
 function renderH2H(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const allGames=d.recent_matches||d.matches||[];
  const games=allGames.filter(g=>g.finished===true||(g.finished===undefined&&g.score_home!=null&&g.score_away!=null));
  const overview=metrics([["Vittorie casa",d.home_wins??"n.d."],["Pareggi",d.draws??"n.d."],["Vittorie ospite",d.away_wins??"n.d."]]);
  if(!games.length){if(Number(d.total_matches||0)===0)return empty("Nessun precedente restituito dalla fonte. Questo non dimostra che le squadre non si siano mai affrontate: significa soltanto che l’archivio non fornisce incontri H2H per questa partita.");return overview+empty("La fonte non ha restituito l’elenco dei precedenti.");}
  return overview+'<div class="result-list">'+games.map(g=>'<div><strong>'+esc(g.home?.name||"Casa")+' '+esc(g.score_home??"—")+' – '+esc(g.score_away??"—")+' '+esc(g.away?.name||"Ospite")+'</strong><small>'+esc(g.time_utc?new Date(g.time_utc).toLocaleDateString("it-IT",{timeZone:"Europe/Rome"}):"Data non indicata")+'</small></div>').join("")+'</div>';
 }
 function renderRecentForm(form){
  if(!form)return empty("La forma recente non è presente nell’archivio per questa competizione.");
  const summarize=items=>{
   const games=items||[],wins=games.filter(g=>g.result==="W").length,draws=games.filter(g=>g.result==="D").length,losses=games.filter(g=>g.result==="L").length;
   const scored=games.reduce((sum,g)=>sum+(Number(g.score_for)||0),0),conceded=games.reduce((sum,g)=>sum+(Number(g.score_against)||0),0);
   const points=wins*3+draws;
   return {games:games.length,wins,draws,losses,scored,conceded,points};
  };
  const side=(items,name)=>{
   const s=summarize(items);
   const overview=metrics([["Gare",s.games],["V-P-S",s.wins+"-"+s.draws+"-"+s.losses],["Gol fatti/subiti",s.scored+" / "+s.conceded],["Punti",s.points]]);
   const rows=(items||[]).slice().reverse();
   const list=rows.length?'<div class="result-list">'+rows.map(g=>{
    const date=g.date?new Date(g.date+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"short"}):"Data n.d.";
    const venue=g.home?"Casa":"Trasferta";
    const resultLabel=g.result==="W"?"Vittoria":g.result==="D"?"Pareggio":"Sconfitta";
    return '<div><span><strong>'+esc(g.opponent||"Avversaria")+'</strong><small>'+esc(date)+' · '+venue+'</small></span><span><strong>'+esc(g.score_for)+' – '+esc(g.score_against)+'</strong><small>'+resultLabel+'</small></span></div>';
   }).join("")+'</div>':empty("Nessuna gara precedente trovata nella stagione di questa competizione.");
   return '<div class="form-team"><h4>'+esc(name)+'</h4>'+overview+list+'</div>';
  };
  return '<p class="analysis-note">Ultime cinque partite di campionato precedenti a questa gara, dalla più recente. Risultati e riepiloghi sono calcolati dai punteggi registrati dalla fonte; non includono amichevoli o coppe.</p><div class="form-grid">'+side(form.home,currentMatch?.home_team?.name||"Casa")+side(form.away,currentMatch?.away_team?.name||"Ospite")+'</div>';
 }
 function renderAdvanced(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const teams=d.teams||[];if(!teams.length)return empty(waitingMessage("Le statistiche avanzate"));
  const labels={possession_value:"Valore del possesso",passing:"Passaggi",carrying:"Conduzione palla",creation:"Creazione occasioni",defending:"Fase difensiva",territory:"Territorio",tempo:"Ritmo"};
  const metricLabels={xt_total:"xT totale",vaep_total:"VAEP totale",vaep_offensive:"VAEP offensivo",vaep_defensive:"VAEP difensivo",pv_total:"Valore possesso",passes:"Passaggi",pass_accuracy:"Precisione passaggi %",progressive_passes:"Passaggi progressivi",progressive_pass_distance:"Metri passaggi progressivi",passes_into_box:"Passaggi in area",key_passes:"Passaggi chiave",assists:"Assist",through_balls:"Filtranti",crosses:"Cross",switches:"Cambi gioco",carries:"Conduzioni",carry_distance:"Metri in conduzione",progressive_carries:"Conduzioni progressive",carries_into_final_third:"Conduzioni ultimo terzo",carries_into_box:"Conduzioni in area",take_ons:"Dribbling tentati",take_ons_won:"Dribbling riusciti",miscontrols:"Controlli sbagliati",dispossessed:"Palloni persi",sca:"Azioni da tiro create",gca:"Azioni da gol create",chances_created:"Occasioni create",second_assists:"Pre-assist",xag:"xA da assist",tackles:"Contrasti",interceptions:"Intercetti",blocks:"Blocchi",clearances:"Respinte",duels_won:"Duelli vinti",aerials:"Duelli aerei",aerials_won:"Duelli aerei vinti",ppda:"PPDA",opponent_passes:"Passaggi avversari",defensive_actions:"Azioni difensive",high_turnovers:"Recuperi alti",counterpress_regains_5s:"Riconquiste entro 5s",ball_recovery_time:"Tempo recupero palla",possession_pct:"Possesso %",field_tilt:"Field tilt %",final_third_entries:"Ingressi ultimo terzo",box_entries:"Ingressi in area",avg_action_x:"Posizione media azioni",passes_per_sequence:"Passaggi per azione",sequence_time:"Durata sequenza",direct_speed:"Velocità attacco diretto",buildup_attacks:"Attacchi manovrati",direct_attacks:"Attacchi diretti"};
  const fmt=v=>typeof v==="number"?Number(v.toFixed(2)):v;
  return '<p class="analysis-note">Metriche avanzate elaborate dal feed eventi della partita. Non sono previsioni: descrivono ciò che è successo in campo.</p><div class="advanced-team-grid">'+teams.map(t=>{
   const groups=Object.entries(t).filter(([k,v])=>k!=="team"&&k!=="actions"&&v&&typeof v==="object"&&!Array.isArray(v));
   return '<article class="advanced-team"><h4>'+esc(t.team?.name||"Squadra")+'</h4>'+metrics([["Azioni registrate",t.actions??"—"]])+groups.map(([key,values])=>'<div class="advanced-group"><h5>'+esc(labels[key]||key)+'</h5><div class="advanced-values">'+Object.entries(values).filter(([,v])=>v!==null&&typeof v!=="object").map(([k,v])=>'<div><span>'+esc(metricLabels[k]||label(k))+'</span><strong>'+esc(fmt(v))+'</strong></div>').join("")+'</div></div>').join("")+'</article>';
  }).join("")+'</div>';
 }
 function renderMomentum(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const points=d.points||[];if(!points.length)return empty(waitingMessage("L’indicatore di pressione"));
  const peakHome=Math.max(...points.map(p=>Number(p.value)||0)),peakAway=Math.min(...points.map(p=>Number(p.value)||0));
  const maxAbs=Math.max(.01,...points.map(p=>Math.abs(Number(p.value)||0)));const bars=points.map((p,i)=>{const v=Number(p.value)||0,h=Math.max(3,Math.min(48,Math.abs(v)/maxAbs*48)),left=points.length>1?i/(points.length-1)*100:50,width=Math.max(.5,Math.min(3,70/points.length));return '<span class="momentum-bar '+(v>=0?"home":"away")+'" style="left:'+left+'%;width:'+width+'%;height:'+h+'%;'+(v>=0?"bottom:50%;":"top:50%;")+'" title="'+esc(p.minute)+"′ · "+esc(v.toFixed(2))+'"></span>';}).join("");
  return metrics([["Picco pressione casa",peakHome.toFixed(2)],["Picco pressione ospite",peakAway.toFixed(2)]])+'<div class="momentum-chart"><div class="momentum-zero"></div>'+bars+'</div><div class="momentum-legend"><span>Casa: pressione positiva</span><span>Ospite: pressione negativa</span></div>';
 }
 function renderAdvancedPlayers(item,homeId,awayId){
  const d=getData(item);if(!d)return empty("Le metriche avanzate individuali non sono disponibili per questa partita.");
  const players=d.players||[];if(!players.length)return empty("Nessun dato avanzato individuale pubblicato.");
  return '<p class="analysis-note">Giocatori ordinati dalla fonte per valore delle azioni. Il VAEP misura il contributo delle azioni alla probabilità di segnare o subire gol.</p><div class="advanced-player-list">'+players.slice(0,10).map(p=>{
   const team=p.team_id===homeId?currentMatch?.home_team?.name:p.team_id===awayId?currentMatch?.away_team?.name:"Squadra";
   const vaep=p.possession_value?.vaep_total,xt=p.possession_value?.xt_total;
   return '<div class="advanced-player-row"><strong>'+esc(p.player?.name||"Giocatore")+'</strong><small>'+esc(team)+' · '+esc(p.minutes_played??"—")+' min · '+esc(p.actions??"—")+' azioni</small><span>VAEP '+esc(vaep==null?"n.d.":Number(vaep).toFixed(3))+' · xT '+esc(xt==null?"n.d.":Number(xt).toFixed(3))+'</span></div>';
  }).join("")+'</div>';
 }
 function renderHeatmaps(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const teams=d.teams||[];if(!teams.length)return empty(waitingMessage("Le mappe delle azioni"));
  const length=d.grid?.length||16,width=d.grid?.width||12;
  return '<div class="heatmap-team-grid">'+teams.map(t=>{
   const counts={};let max=1;(t.cells||[]).forEach(c=>{counts[c[1]*length+c[0]]=c[2];max=Math.max(max,c[2]);});
   const cells=Array.from({length:length*width},(_,i)=>{const n=counts[i]||0,opacity=n?(.12+.88*n/max):.035;return '<span title="'+n+' azioni" style="background:rgba(46,174,120,'+opacity.toFixed(2)+')"></span>';}).join("");
   return '<div class="heatmap-team"><strong>'+esc(t.team?.name||"Squadra")+'</strong><small>'+esc(t.actions??"—")+' azioni · mappa orientata verso la porta avversaria</small><div class="heatmap-grid" style="grid-template-columns:repeat('+length+',minmax(0,1fr))">'+cells+'</div></div>';
  }).join("")+'</div>';
 }
 function renderAdvancedNetwork(item){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const networks=d.networks||[];if(!networks.length)return empty(waitingMessage("La rete dei passaggi"));
  return '<div class="network-grid">'+networks.map(n=>'<div class="network-team"><strong>'+esc(n.team?.name||"Squadra")+'</strong><small>Rete passaggi · primi undici</small><div class="result-list">'+(n.nodes||[]).slice().sort((a,b)=>(b.passes||0)-(a.passes||0)).slice(0,6).map(p=>'<div><strong>'+esc(p.player?.name||"Giocatore")+'</strong><small>'+esc(p.passes??0)+' passaggi · '+esc(p.passes_received??0)+' ricevuti</small></div>').join("")+'</div></div>').join("")+'</div>';
 }
 function renderEvents(item,homeId,home,away){
  const d=getData(item);if(!d)return empty(unavailable(item));
  const events=Array.isArray(d)?d:(d.events||[]);if(!events.length)return empty(waitingMessage("La cronologia degli eventi"));
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
   const normalizedStatus=status.replace(/_/g,"");const state=normalizedStatus==="finished"?"Partita conclusa":normalizedStatus==="live"||normalizedStatus==="inprogress"?"Partita in corso":normalizedStatus==="scheduled"||normalizedStatus==="notstarted"?"In programma":normalizedStatus==="postponed"?"Rinviata":normalizedStatus==="cancelled"?"Annullata":"Stato non indicato";
   const homeCrest=match.home_team?.image_url?'<img class="team-crest" src="'+esc(match.home_team.image_url)+'" alt="">':'⚽';const awayCrest=match.away_team?.image_url?'<img class="team-crest" src="'+esc(match.away_team.image_url)+'" alt="">':'⚽';const stadium=summary.stadium||"Stadio non indicato";const head='<div class="match-hero"><div class="match-league">'+esc(summary.league?.name||match.league?.name||"Competizione non indicata")+' · '+esc(date)+'</div><div class="match-score"><span class="match-team-lockup">'+homeCrest+'<b>'+esc(home)+'</b></span><strong>'+esc(score)+'</strong><span class="match-team-lockup">'+awayCrest+'<b>'+esc(away)+'</b></span></div><div class="match-state">'+state+'</div><div class="match-stadium">🏟️ '+esc(stadium)+'</div></div>';
   const summaryBody=metrics([["Giornata / turno",summary.round_name||"—"],["Arbitro",summary.referee||"—"],["Stadio",summary.stadium||"—"]]);
   const sections=sectionTabs()+
    section("riepilogo",block("Informazioni principali",summaryBody+metrics([["Competizione",summary.league?.name||match.league?.name||"—"],["Stagione",summary.season||"—"],["Stato",state]]),""),true)+
    section("forma",block("Forma recente delle squadre",renderRecentForm(match.recent_form),"Risultati storici recuperati dal calendario stagionale della stessa competizione."),false)+
    section("statistiche",block("Confronto statistico",renderStats(getData(d.stats)),"Valori della squadra di casa e della squadra ospite, suddivisi per categoria."),false)+
    section("tiri",block("Tiri e occasioni",renderShots(d.shots,homeId,awayId,home,away),"Conteggio e dettaglio dei tiri registrati dalla fonte."),false)+
    section("formazioni",block("Formazioni sul campo",renderPitch(getData(d.lineups),home,away),"I moduli e le posizioni sono quelli restituiti dalla fonte; clicca sui calciatori per vedere i dati individuali."),false)+
    section("giocatori",block("Tutti i giocatori",renderPlayerDirectory(currentPlayers,homeId,awayId,home,away),"Statistiche individuali della partita. Apri un calciatore per vedere tutti i valori disponibili.")+block("Impatto avanzato dei giocatori",renderAdvancedPlayers(d.advanced_players,homeId,awayId)),false)+
    section("precedenti",block("Scontri diretti",renderH2H(d.h2h)),false)+
    section("avanzate",block("Metriche avanzate",renderAdvanced(d.advanced),"Passaggi progressivi, conduzioni, creazione, difesa, territorio e ritmo.")+block("Rete dei passaggi",renderAdvancedNetwork(d.advanced_network))+block("Mappe delle azioni",renderHeatmaps(d.heatmaps),"Le zone più intense indicano dove sono state registrate più azioni."),false)+
    section("pressione",block("Andamento della pressione",renderMomentum(d.momentum),"La linea positiva favorisce la squadra di casa, quella negativa la squadra ospite."),false)+
    section("eventi",block("Cronologia della partita",renderEvents(d.events,homeId,home,away)),false);
   const note='<div class="analysis-source">Fonte: PitchAPI · ultimo aggiornamento archivio: '+esc(root.fetched_at||"non indicato")+'. I dati non pubblicati dalla fonte vengono indicati come non disponibili e non sono sostituiti da valori inventati. Le formazioni sono probabili o confermate secondo lo stato indicato dal provider.</div>';
   content.innerHTML=head+sections+note;
  }catch(err){content.innerHTML=empty("Non riesco a caricare questa partita: "+err.message);}
 };
})();