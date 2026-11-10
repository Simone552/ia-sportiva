import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

# I feed vengono usati per un aggregatore personale: ogni scheda rimanda
# sempre alla pagina originale dell'editore.
FEEDS = [
    ("Sky Sport", "https://sport.sky.it/rss/sport_calcio.xml"),
    ("Gazzetta dello Sport", "https://www.gazzetta.it/dynamic-feed/rss/section/Calcio.xml"),
]

def clean(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\\s+", " ", value).strip()

def child_text(node, names):
    for child in list(node):
        if child.tag.rsplit("}", 1)[-1].lower() in names:
            return "".join(child.itertext()).strip()
    return ""

items = []
for source, url in FEEDS:
    try:
        request = urllib.request.Request(url, headers={
            "User-Agent": "IA-Sportiva-News/1.0 (personal football news reader)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        })
        with urllib.request.urlopen(request, timeout=25) as response:
            root = ET.fromstring(response.read())
        nodes = root.findall(".//item")
        if not nodes:
            nodes = [n for n in root.iter() if n.tag.rsplit("}", 1)[-1].lower() == "entry"]
        for node in nodes[:30]:
            title = clean(child_text(node, {"title"}))
            link = child_text(node, {"link"})
            if not link:
                for child in list(node):
                    if child.tag.rsplit("}", 1)[-1].lower() == "link":
                        link = child.attrib.get("href", "")
                        if link:
                            break
            summary = clean(child_text(node, {"description", "summary", "encoded"}))
            pub = child_text(node, {"pubdate", "published", "updated", "date"})
            published = ""
            if pub:
                try:
                    dt = parsedate_to_datetime(pub)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    published = dt.astimezone(timezone.utc).isoformat()
                except Exception:
                    try:
                        dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        published = dt.astimezone(timezone.utc).isoformat()
                    except Exception:
                        pass
            if title and link.startswith("http"):
                items.append({
                    "title": title,
                    "link": link,
                    "summary": summary[:260],
                    "published": published,
                    "source": source,
                })
        print(f"{source}: raccolti {sum(1 for item in items if item['source'] == source)} articoli")
    except Exception as exc:
        print(f"Feed non disponibile {source}: {exc}")

items.sort(key=lambda item: item.get("published") or "", reverse=True)
unique, seen = [], set()
for item in items:
    if item["link"] not in seen:
        seen.add(item["link"])
        unique.append(item)

payload = {"fetched_at": datetime.now(timezone.utc).isoformat(), "items": unique[:60]}
Path("data").mkdir(exist_ok=True)
Path("data/notizie.json").write_text(
    json.dumps(payload, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"Archivio notizie aggiornato: {len(payload['items'])} articoli")
