"""Strict competition resolution: never infer a country from a league name alone."""
import re
import unicodedata


def normalize_competition(value):
    value = unicodedata.normalize("NFKD", str(value or "").casefold())
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


_COUNTRY_ALIASES = {
    "IT": "ITA", "ITALY": "ITA", "ITALIA": "ITA",
    "EN": "ENG", "GB": "ENG", "GBR": "ENG", "ENGLAND": "ENG",
    "UNITED KINGDOM": "ENG", "UK": "ENG",
    "ES": "ESP", "SPAIN": "ESP",
    "DE": "GER", "DEU": "GER", "GERMANY": "GER",
    "FR": "FRA", "FRANCE": "FRA",
    "NL": "NED", "NLD": "NED", "NETHERLANDS": "NED",
    "PT": "POR", "PRT": "POR", "PORTUGAL": "POR",
    "SCOTLAND": "SCO",
}


def _country(value):
    if isinstance(value, dict):
        value = value.get("code") or value.get("country_code") or value.get("name") or ""
    key = str(value or "").strip().upper()
    return _COUNTRY_ALIASES.get(key, key)


def resolve_match_league(match, leagues, selected_league_ids):
    """Return (selected catalogue ID, league object), or (None, raw).

    Known provider IDs are authoritative. Name-only matching is accepted only
    when the name is unique across the complete provider catalogue.
    """
    raw = match.get("league") or match.get("competition") or {}
    raw = raw if isinstance(raw, dict) else {"name": raw}
    by_id = {str(item.get("id")): item for item in leagues if item.get("id") is not None}
    raw_id = (raw.get("id") or match.get("league_id") or
              match.get("competition_id") or match.get("tournament_id"))
    if raw_id is not None:
        known = by_id.get(str(raw_id))
        if known:
            if str(raw_id) in selected_league_ids:
                return str(raw_id), known
            return None, raw

    name = (raw.get("name") or raw.get("league_name") or
            match.get("league_name") or match.get("competition_name"))
    country = _country(raw.get("country_code") or raw.get("country") or
                       match.get("country_code") or match.get("country"))
    name_key = normalize_competition(name)
    if not name_key:
        return None, raw

    exact = [item for item in leagues
             if normalize_competition(item.get("name")) == name_key
             and _country(item.get("country_code")) == country] if country else []
    if len(exact) == 1:
        candidate_id = str(exact[0].get("id") or "")
        return (candidate_id, exact[0]) if candidate_id in selected_league_ids else (None, raw)
    if country:
        return None, raw

    same_name = [item for item in leagues
                 if normalize_competition(item.get("name")) == name_key]
    if len(same_name) == 1:
        candidate_id = str(same_name[0].get("id") or "")
        return (candidate_id, same_name[0]) if candidate_id in selected_league_ids else (None, raw)
    return None, raw
