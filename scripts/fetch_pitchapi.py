import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

from match_status import match_has_started

key = os.environ.get("PITCH_KEY", "").strip()
if not key:
    raise SystemExit("Chiave PITCH_KEY/PITCH_API_KEY non configurata")

BASE = "https://api.pitchapi.dev/v1"
HEADERS = {
    "X-API-KEY": key,
    "User-Agent": "IA-Sportiva/0.7 (https://github.com/Simone552/ia-sportiva)",
    "Accept": "application/json",
}

last_request_at = 0.0

def api_get(path):
    global last_request_at
    request = urllib.request.Request(BASE + path, headers=HEADERS)
    for attempt in range(5):
        # Mantiene una distanza minima tra le richieste per evitare il burst guard.
        wait = 0.25 - (time.monotonic() - last_request_at)
        if wait > 0:
            time.sleep(wait)
        last_request_at = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                payload = json.load(response)
                return payload.get("data", payload), None
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if error.code == 404:
                return None, {"available": False, "http_status": 404, "reason": "Dato non pubblicato o non disponibile per questa partita."}
            if error.code == 429 and attempt < 4:
                retry_after = error.headers.get("Retry-After", "")
                try:
                    delay = max(1.0, float(retry_after))
                except (TypeError, ValueError):
                    delay = min(2 ** (attempt + 1), 16)
                print(f"Limite richieste PitchAPI su {path}: nuovo tentativo tra {delay:.1f}s")
                time.sleep(delay)
                continue
            if error.code in {500, 502, 503, 504} and attempt < 3:
                delay = min(2 ** (attempt + 1), 12)
                print(f"Errore temporaneo PitchAPI HTTP {error.code} su {path}: riprovo tra {delay}s")
                time.sleep(delay)
                continue
            print(f"Endpoint {path}: HTTP {error.code} · {body[:500]}")
            return None, {"available": False, "http_status": error.code, "reason": body[:500]}
        except Exception as error:
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            print(f"Endpoint {path}: {error!r}")
            return None, {"available": False, "reason": str(error)}
    return None, {"available": False, "reason": "Tentativi di recupero esauriti."}

# Catalogo completo delle competizioni e delle stagioni disponibili.
# Questo endpoint serve a verificare la copertura, senza sostituire il calendario.
leagues_data, leagues_error = api_get("/leagues")
leagues = []
if isinstance(leagues_data, dict):
    leagues = leagues_data.get("leagues", [])
if leagues_error:
    print(f"Catalogo leghe non disponibile: {leagues_error}")
else:
    print(f"Catalogo PitchAPI: {len(leagues)} leghe/competizioni")

# Competizioni supportate da IA Sportiva: nome + Paese, mai il solo nome.
from competition_resolver import normalize_competition, resolve_match_league

SUPPORTED_COMPETITIONS = [
    ({'serie a', 'serie a enilive', 'serie a tim', 'italian serie a'}, {'ITA', 'IT', 'ITALY'}),
    ({'serie b', 'serie bkt', 'italian serie b'}, {'ITA', 'IT', 'ITALY'}),
    ({'serie c', 'serie c now', 'serie c girone a', 'serie c girone b', 'serie c girone c'}, {'ITA', 'IT', 'ITALY'}),
    ({'premier league', 'english premier league', 'england premier league'}, {'ENG', 'GB', 'GBR', 'EN', 'ENGLAND', 'UNITED KINGDOM', 'UK'}),
    ({'la liga', 'laliga', 'laliga ea sports', 'spanish la liga'}, {'ESP', 'ES', 'SPAIN'}),
    ({'bundesliga', 'german bundesliga', 'germany bundesliga'}, {'GER', 'DE', 'DEU', 'GERMANY'}),
    ({'ligue 1', 'french ligue 1', 'france ligue 1'}, {'FRA', 'FR', 'FRANCE'}),
    ({'champions league', 'uefa champions league', 'ucl'}, None),
    ({'europa league', 'uefa europa league', 'uel'}, None),
    ({'conference league', 'uefa conference league', 'uecl'}, None),
    ({'eredivisie', 'dutch eredivisie'}, {'NED', 'NL', 'NLD', 'NETHERLANDS'}),
    ({'primeira liga', 'liga portugal', 'portuguese primeira liga'}, {'POR', 'PT', 'PRT', 'PORTUGAL'}),
    ({'championship', 'english championship', 'efl championship'}, {'ENG', 'GB', 'GBR', 'EN', 'ENGLAND', 'UNITED KINGDOM', 'UK'}),
    ({'scottish premiership', 'scottish premier league', 'premiership'}, {'SCO', 'SCOTLAND', 'GB', 'GBR'}),
]
selected_league_ids = set()
for league in leagues:
    league_name = normalize_competition(league.get('name'))
    country_code = str(league.get('country_code') or '').strip().upper()
    for aliases, countries in SUPPORTED_COMPETITIONS:
        if league_name in {normalize_competition(alias) for alias in aliases} and (countries is None or country_code in countries):
            if league.get('id') is not None:
                selected_league_ids.add(str(league['id']))
            break
print(f'Competizioni IA Sportiva riconosciute nel catalogo: {len(selected_league_ids)}')

today_dt = datetime.now(timezone.utc).date()
today = today_dt.strftime("%Y-%m-%d")
matches_by_id = {}
calendar_errors = []

# Calendario completo di oggi e dei prossimi 6 giorni, per tutte
# le competizioni coperte da PitchAPI.
for offset in range(7):
    day = (today_dt + timedelta(days=offset)).strftime("%Y-%m-%d")
    day_data, day_error = api_get(f"/date/{day}?status=all")
    if day_error or not isinstance(day_data, dict):
        calendar_errors.append({"date": day, "error": day_error or "Risposta non valida"})
        print(f"Calendario {day}: non disponibile · {day_error}")
        continue
    day_matches = day_data.get("matches", [])
    print(f"Calendario {day}: {len(day_matches)} partite")
    for match in day_matches:
        match_id = match.get("id")
        league_id, league_obj = resolve_match_league(match, leagues, selected_league_ids)
        if match_id and league_id:
            match.setdefault("date", day)
            match["league"] = {**league_obj, "id": league_id}
            matches_by_id[match_id] = match

# Integra anche i calendari stagionali delle competizioni prioritarie.
# L'endpoint per data resta la base; questo recupero colma eventuali partite mancanti.

window_start = today_dt
window_end = today_dt + timedelta(days=6)

def parse_match_date(value):
    """Converte date/time PitchAPI in una data UTC, anche come timestamp."""
    if value is None or value == "":
        return None
    if isinstance(value, dict):
        value = value.get("date") or value.get("datetime") or value.get("timestamp")
        if value is None:
            return None
    if isinstance(value, (int, float)):
        try:
            seconds = value / 1000 if value > 10_000_000_000 else value
            return datetime.fromtimestamp(seconds, timezone.utc).date()
        except (OverflowError, OSError, ValueError):
            return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc)
        return parsed.date()
    except ValueError:
        try:
            return datetime.strptime(raw[:10], "%Y-%m-%d").date()
        except ValueError:
            return None

league_schedule_errors = []
league_schedules_checked = []
# Recupera lo storico di ogni competizione presente nelle partite in calendario,
# oltre ai calendari stagionali delle cinque competizioni prioritarie.
league_matches_by_id = {}
calendar_league_ids = {
    (match.get("league") or {}).get("id")
    for match in matches_by_id.values()
    if (match.get("league") or {}).get("id")
}
priority_league_ids = {
    league.get("id")
    for league in leagues
    if str(league.get("id")) in selected_league_ids and league.get("id")
}
league_ids_needed = priority_league_ids

for league in leagues:
    league_id = league.get("id")
    if not league_id or str(league_id) not in {str(value) for value in league_ids_needed}:
        continue
    is_priority = str(league_id) in selected_league_ids
    seasons = league.get("seasons") or []
    if not seasons:
        continue
    season = max(seasons, key=lambda value: int(str(value).split("/")[-1]))
    season_param = season.replace("/", "%2F")
    all_league_matches = []
    if is_priority:
        league_data, league_error = api_get(
            f"/leagues/{league_id}/matches?season={season_param}&status=all"
        )
        if league_error or not isinstance(league_data, dict):
            league_schedule_errors.append({
                "league": league.get("name"),
                "country_code": league.get("country_code"),
                "season": season,
                "error": league_error or "Risposta non valida",
            })
            print(f"Calendario lega {league.get('name')}: non disponibile · {league_error}")
        else:
            all_league_matches = league_data.get("matches", [])
    played_data, played_error = api_get(
        f"/leagues/{league_id}/matches?season={season_param}&status=played"
    )
    played_matches = played_data.get("matches", []) if isinstance(played_data, dict) else []
    if played_error:
        print(f"Risultati giocati {league.get('name')}: uso i risultati presenti nel calendario completo · {played_error}")
        played_matches = [
            item for item in all_league_matches
            if item.get("score_home") is not None and item.get("score_away") is not None
        ]
    league_schedules_checked.append({
        "league": league.get("name"),
        "country_code": league.get("country_code"),
        "season": season,
        "matches_in_season": len(all_league_matches) if is_priority else None,
        "played_results": len(played_matches),
        "sample_played": [
            {
                "date": item.get("date"),
                "time_utc": item.get("time_utc"),
                "home_id": (item.get("home_team") or {}).get("id"),
                "home_name": (item.get("home_team") or {}).get("name"),
                "away_id": (item.get("away_team") or {}).get("id"),
                "away_name": (item.get("away_team") or {}).get("name"),
                "score_home": item.get("score_home"),
                "score_away": item.get("score_away"),
            }
            for item in played_matches[:2]
        ],
    })
    league_matches_by_id[league_id] = played_matches
    for match in all_league_matches:
        # PitchAPI può restituire la data come YYYY-MM-DD oppure come
        # timestamp ISO completo. Usa anche time_utc come fallback.
        match_date = (match.get("date") or match.get("time_utc") or match.get("kickoff")
                      or match.get("start_time") or match.get("timestamp"))
        parsed_date = parse_match_date(match_date)
        if parsed_date is None:
            continue
        if window_start <= parsed_date <= window_end:
            match_id = match.get("id")
            if match_id:
                # Il calendario stagionale è richiesto per un ID lega noto:
                # sovrascrive eventuali metadati incompleti restituiti dal provider.
                match["league"] = {
                    **(match.get("league") or {}),
                    "id": league_id,
                    "name": league.get("name"),
                    "country_code": league.get("country_code"),
                }
                matches_by_id[match_id] = match

matches = [
    match for match in matches_by_id.values()
    if str((match.get("league") or {}).get("id") or "") in selected_league_ids
]

# Normalizza sempre la competizione con il catalogo ufficiale PitchAPI.
# Il solo nome non basta: Serie A esiste in più Paesi e non va confusa.
leagues_by_id = {
    str(league.get("id")): league
    for league in leagues
    if league.get("id") is not None
}
for match in matches:
    current_league = match.get("league") or {}
    league_id = current_league.get("id")
    canonical_league = leagues_by_id.get(str(league_id)) if league_id is not None else None
    if canonical_league:
        match["league"] = {
            **current_league,
            "id": canonical_league.get("id"),
            "name": canonical_league.get("name") or current_league.get("name"),
            "country_code": canonical_league.get("country_code") or current_league.get("country_code"),
        }

def recent_team_form(team_id, team_name, before_date, league_id):
    """Ultime cinque gare di campionato precedenti alla partita, senza includere il match da analizzare."""
    played = []
    team_key = str(team_name or "").strip().casefold()
    for previous in league_matches_by_id.get(league_id, []):
        previous_date = previous.get("date") or str(previous.get("time_utc") or "")[:10]
        if not previous_date or previous_date >= before_date:
            continue
        if previous.get("score_home") is None or previous.get("score_away") is None:
            continue
        home = previous.get("home_team") or {}
        away = previous.get("away_team") or {}
        home_match = home.get("id") == team_id or (team_key and str(home.get("name") or "").strip().casefold() == team_key)
        away_match = away.get("id") == team_id or (team_key and str(away.get("name") or "").strip().casefold() == team_key)
        if not home_match and not away_match:
            continue
        is_home = bool(home_match)
        scored = previous.get("score_home") if is_home else previous.get("score_away")
        conceded = previous.get("score_away") if is_home else previous.get("score_home")
        result = "W" if scored > conceded else "D" if scored == conceded else "L"
        played.append({
            "date": previous.get("date"),
            "opponent": (away if is_home else home).get("name", "Avversaria"),
            "home": is_home,
            "score_for": scored,
            "score_against": conceded,
            "result": result,
        })
    played.sort(key=lambda item: item.get("date") or "")
    return played[-5:]

for match in matches:
    league_id = (match.get("league") or {}).get("id")
    if not league_id:
        continue
    match["recent_form"] = {
        "scope": "Ultime 5 in campionato",
        "home": recent_team_form((match.get("home_team") or {}).get("id"), (match.get("home_team") or {}).get("name"), match.get("date", today), league_id),
        "away": recent_team_form((match.get("away_team") or {}).get("id"), (match.get("away_team") or {}).get("name"), match.get("date", today), league_id),
    }

recent_form_coverage = {
    "matches_with_home_results": sum(bool(m.get("recent_form", {}).get("home")) for m in matches),
    "matches_with_away_results": sum(bool(m.get("recent_form", {}).get("away")) for m in matches),
}

league_counts = {}
for match in matches:
    league = match.get("league") or {}
    league_name = league.get("name", "Competizione non indicata")
    league_counts[league_name] = league_counts.get(league_name, 0) + 1

if not matches and calendar_errors:
    raise SystemExit(f"Nessun calendario recuperato. Errori: {calendar_errors}")
print(f"Totale calendario 7 giorni: {len(matches)} partite uniche")

# Un solo archivio per partita: calendario, statistiche, tiri, giocatori,
# formazioni, precedenti e timeline vengono raccolti insieme lato server.
endpoints = {
    "summary": "",
    "stats": "/stats",
    "shots": "/shots",
    "players": "/players",
    "lineups": "/lineups",
    "h2h": "/h2h",
    "events": "/events",
    "advanced": "/advanced",
    "advanced_players": "/advanced/players",
    "advanced_network": "/advanced/network",
    "momentum": "/momentum",
    "players_halves": "/players/halves",
    "heatmaps": "/heatmaps",
}

deferred_until_kickoff = {
    "stats", "shots", "players", "events", "advanced",
    "advanced_players", "advanced_network", "momentum",
    "players_halves", "heatmaps",
}

for index, match in enumerate(matches, start=1):
    match_id = match.get("id")
    if not match_id:
        continue
    print(f"[{index}/{len(matches)}] Raccolta dettagli partita {match_id}")
    details = {}
    # Alcuni provider valorizzano 0-0 anche prima del calcio d'inizio:
    # lo stato della partita e l'orario sono più affidabili dei soli punteggi.
    has_started = match_has_started(match)
    if not has_started:
        print(
            f"Partita {match_id}: pre-match ({match.get('status') or 'stato non indicato'}); "
            "statistiche, tiri, giocatori ed eventi saranno richiesti dopo l'inizio."
        )
    for name, suffix in endpoints.items():
        if name in deferred_until_kickoff and not has_started:
            details[name] = {
                "available": False,
                "reason": "Dato in attesa: verrà richiesto dopo l'inizio della partita.",
            }
            continue
        if name == "summary":
            value, endpoint_error = api_get(f"/matches/{match_id}")
        else:
            value, endpoint_error = api_get(f"/matches/{match_id}{suffix}")
        if endpoint_error:
            details[name] = endpoint_error
        else:
            details[name] = {"available": True, "data": value}
        time.sleep(0.05)
    match["details"] = details

result = {
    "data": {
        "date": today,
        "period_days": 7,
        "calendar_errors": calendar_errors,
        "leagues_catalogue": leagues,
        "leagues_catalogue_error": leagues_error,
        "priority_league_schedules_checked": league_schedules_checked,
        "priority_league_schedule_errors": league_schedule_errors,
        "recent_form_coverage": recent_form_coverage,
        "league_counts_in_calendar": league_counts,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "matches": matches,
    }
}
folder = Path("data")
folder.mkdir(exist_ok=True)
(folder / "partite.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"Archivio salvato: {len(matches)} partite con dettagli aggregati su 7 giorni.")
