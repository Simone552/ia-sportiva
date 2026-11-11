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

def api_get(path):
    request = urllib.request.Request(BASE + path, headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            payload = json.load(response)
            return payload.get("data", payload), None
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        if error.code == 404:
            return None, {"available": False, "http_status": 404, "reason": "Dato non pubblicato o non disponibile per questa partita."}
        print(f"Endpoint {path}: HTTP {error.code} · {body[:500]}")
        return None, {"available": False, "http_status": error.code, "reason": body[:500]}
    except Exception as error:
        print(f"Endpoint {path}: {error!r}")
        return None, {"available": False, "reason": str(error)}

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

matches = list(matches_by_id.values())
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
}

for index, match in enumerate(matches, start=1):
    match_id = match.get("id")
    if not match_id:
        continue
    print(f"[{index}/{len(matches)}] Raccolta dettagli partita {match_id}")
    details = {}
    for name, suffix in endpoints.items():
        if name == "summary":
            value, endpoint_error = api_get(f"/matches/{match_id}")
        else:
            value, endpoint_error = api_get(f"/matches/{match_id}{suffix}")
        if endpoint_error:
            details[name] = endpoint_error
        else:
            details[name] = {"available": True, "data": value}
        time.sleep(0.12)
    match["details"] = details

result = {
    "data": {
        "date": today,
        "period_days": 7,
        "calendar_errors": calendar_errors,
        "leagues_catalogue": leagues,
        "leagues_catalogue_error": leagues_error,
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
