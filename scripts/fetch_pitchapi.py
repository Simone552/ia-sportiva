import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
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

today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
matches_data, error = api_get(f"/date/{today}?status=all")
if error or not isinstance(matches_data, dict):
    raise SystemExit(f"Impossibile recuperare il calendario: {error}")

matches = matches_data.get("matches", [])
print(f"Calendario {today} (giocate + in programma): {len(matches)} partite")

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
print(f"Archivio salvato: {len(matches)} partite con dettagli aggregati.")
