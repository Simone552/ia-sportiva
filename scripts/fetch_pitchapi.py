import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

key = os.environ.get("PITCH_KEY", "").strip()
if not key:
    raise SystemExit("Chiave PITCH_KEY/PITCH_API_KEY non configurata")

data = datetime.now(timezone.utc).strftime("%Y-%m-%d")
url = f"https://api.pitchapi.dev/v1/date/{data}"
request = urllib.request.Request(url, headers={"X-API-KEY": key})

try:
    with urllib.request.urlopen(request, timeout=30) as response:
        risultato = json.load(response)
        print("Connessione PitchAPI riuscita. HTTP:", response.status)
except urllib.error.HTTPError as errore:
    corpo = errore.read().decode("utf-8", errors="replace")
    print("Errore HTTP:", errore.code)
    print("Risposta del provider:", corpo[:4000])
    if errore.code == 401:
        print("La chiave API non viene accettata: controllare il secret.")
    elif errore.code == 403:
        print("403: richiesta bloccata dal provider o dal suo sistema anti-bot. Il codice 1010 indica un blocco Cloudflare.")
    raise
except Exception as errore:
    print("Errore di rete o risposta non valida:", repr(errore))
    raise

cartella = Path("data")
cartella.mkdir(exist_ok=True)
(cartella / "partite.json").write_text(
    json.dumps(risultato, ensure_ascii=False, indent=2),
    encoding="utf-8"
)
print("Risposta API salvata in data/partite.json")
