const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf("function leagueCountryCode(league){");
const end = html.indexOf("async function loadPitchApiMatches(){", start);
const teamKey = html.match(/function teamKey\(name\)\{[^\n]*\}/);
assert.notEqual(start, -1, "Blocco funzioni campionati non trovato");
assert.notEqual(end, -1, "Fine blocco funzioni campionati non trovata");
assert.ok(teamKey, "Funzione teamKey non trovata");

const source = teamKey[0] + "\n" + html.slice(start, end) +
  "\nglobalThis.api={competitionMatchesQuery,leaguePriority,isCompetitionSearch,renderPitchApiFixtures};";
const context = {
  window: { iaLeagueCountryById: {} },
  esc: value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),
  pitchStatusLabel: value => String(value || "n.d.")
};
vm.runInNewContext(source, context);
const api = context.api;

const cases = [
  ["Serie A italiana (ITA)", {name:"Serie A",country_code:"ITA"}, "Serie A", true, 1],
  ["Serie A italiana (IT)", {name:"Serie A",country_code:"IT"}, "Serie A", true, 1],
  ["Serie A brasiliana esclusa", {name:"Serie A",country_code:"BRA"}, "Serie A", false, 99],
  ["Serie A senza paese esclusa", {name:"Serie A"}, "Serie A", false, 99],
  ["Premier League (GB)", {name:"Premier League",country_code:"GB"}, "Premier League", true, 2],
  ["Premier League (GBR)", {name:"Premier League",country_code:"GBR"}, "Premier League", true, 2],
  ["LaLiga (ES)", {name:"LaLiga",country_code:"ES"}, "LaLiga", true, 3],
  ["Bundesliga (DE)", {name:"Bundesliga",country_code:"DE"}, "Bundesliga", true, 4],
  ["Ligue 1 (FR)", {name:"Ligue 1",country_code:"FR"}, "Ligue 1", true, 5],
  ["Ligue 1 con paese errato", {name:"Ligue 1",country_code:"BR"}, "Ligue 1", false, 99],
  ["Champions League internazionale", {name:"Champions League",country_code:"INT-2"}, "Champions League", true, 99]
];
for (const [label, league, query, expectedMatch, expectedRank] of cases) {
  assert.equal(api.competitionMatchesQuery(league, query), expectedMatch, label + ": filtro");
  assert.equal(api.leaguePriority(league), expectedRank, label + ": priorità");
}
for (const query of ["Serie A","Premier League","LaLiga","Bundesliga","Ligue 1","Champions League"]) {
  assert.equal(api.isCompetitionSearch(query), true, "Riconoscimento competizione: " + query);
}

const leagues = [
  {id:1,name:"Serie A",country_code:"ITA"},
  {id:2,name:"Premier League",country_code:"GB"},
  {id:3,name:"LaLiga",country_code:"ES"},
  {id:4,name:"Bundesliga",country_code:"DE"},
  {id:5,name:"Ligue 1",country_code:"FR"},
  {id:6,name:"Serie A",country_code:"BRA"},
  {id:7,name:"LaLiga2",country_code:"ES"},
  {id:8,name:"Eredivisie",country_code:"NL"}
];
const fixtures = leagues.map((league,index)=>({
  id:String(index+1),league,home_team:{name:"Casa "+index},away_team:{name:"Ospite "+index},
  time_utc:"2026-11-14T18:00:00Z",status:"not_started"
}));
const rendered = api.renderPitchApiFixtures(fixtures);
const labels = ["Serie A · ITA","Premier League · GB","LaLiga · ES","Bundesliga · DE","Ligue 1 · FR","Eredivisie · NL","LaLiga2 · ES","Serie A · BRA"];
const positions = labels.map(label=>rendered.indexOf("<strong>"+label+"</strong>"));
assert.ok(positions.every(position=>position>=0), "Tutte le competizioni di test devono essere mostrate");
assert.deepEqual([...positions].sort((a,b)=>a-b), positions, "I top 5 devono precedere gli altri; i restanti alfabetici");
assert.match(rendered, /TOP 1[\s\S]*TOP 2[\s\S]*TOP 3[\s\S]*TOP 4[\s\S]*TOP 5/,
  "I badge di priorità devono rispettare l'ordine richiesto");
assert.match(rendered, /openMatchDetails\(this\.getAttribute/,
  "Ogni partita deve mantenere l'apertura della scheda");

console.log("OK: filtri campionati, codici paese, priorità top 5, raggruppamento e apertura schede.");
