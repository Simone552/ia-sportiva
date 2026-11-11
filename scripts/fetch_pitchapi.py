import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

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
        if match_id:
            match.setdefault("date", day)
            matches_by_id[match_id] = match

# Integra anche i calendari stagionali delle competizioni prioritarie.
# L'endpoint per data resta la base; questo recupero colma eventuali partite mancanti.
priority_competitions = {
    ("Serie A", "ITA"),
    ("Serie B", "ITA"),
    ("Champions League", "INT-2"),
    ("Europa League", "INT-2"),
    ("Conference League", "INT-2"),
}
window_start = today_dt
window_end = today_dt + timedelta(days=6)
league_schedule_errors = []
league_schedules_checked = []
# Conserva i risultati già giocati della stagione per calcolare la forma recente
# delle squadre prima di ogni partita in programma.
league_matches_by_id = {}

for league in leagues:
    if (league.get("name"), league.get("country_code")) not in priority_competitions:
        continue
    seasons = league.get("seasons") or []
    if not seasons:
        continue
    season = max(seasons, key=lambda value: int(str(value).split("/")[-1]))  # Gestisce sia stagioni 2026 sia 2026/2027
    league_id = league.get("id")
    if not league_id:
        continue
    season_param = season.replace("/", "%2F")
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
        continue
    league_schedules_checked.append({
        "league": league.get("name"),
        "country_code": league.get("country_code"),
        "season": season,
    })
    league_matches_by_id[league_id] = league_data.get("matches", [])
    for match in league_data.get("matches", []):
        match_date = match.get("date")
        if not match_date:
            continue
        try:
            parsed_date = datetime.strptime(match_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        if window_start <= parsed_date <= window_end:
            match_id = match.get("id")
            if match_id:
                match.setdefault("league", {
                    "id": league_id,
                    "name": league.get("name"),
                    "country_code": league.get("country_code"),
                })
                matches_by_id[match_id] = match

matches = list(matches_by_id.values())

def recent_team_form(team_id, before_date, league_id):
    """Ultime cinque gare di campionato precedenti alla partita, senza includere il match da analizzare."""
    played = []
    for previous in league_matches_by_id.get(league_id, []):
        if previous.get("date", "9999-99-99") >= before_date:
            continue
        if previous.get("score_home") is None or previous.get("score_away") is None:
            continue
        home = previous.get("home_team") or {}
        away = previous.get("away_team") or {}
        if team_id not in (home.get("id"), away.get("id")):
            continue
        is_home = home.get("id") == team_id
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
        "home": recent_team_form((match.get("home_team") or {}).get("id"), match.get("date", today), league_id),
        "away": recent_team_form((match.get("away_team") or {}).get("id"), match.get("date", today), league_id),
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
    status = str(match.get("status") or "").lower().replace("_", "")
    has_started = (
        match.get("score_home") is not None
        or match.get("score_away") is not None
        or status in {"live", "inprogress", "finished", "afterextratime", "afterpenalties", "halftime"}
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
