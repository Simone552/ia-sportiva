"""Classificazione robusta dello stato di una partita prima del recupero statistiche."""
from datetime import datetime, timezone


PRE_MATCH_STATUSES = {
    "notstarted",
    "scheduled",
    "upcoming",
    "fixture",
    "tbd",
    "postponed",
    "cancelled",
    "canceled",
    "delayed",
}

STARTED_STATUSES = {
    "live",
    "inprogress",
    "halftime",
    "finished",
    "fulltime",
    "ft",
    "afterextratime",
    "afterpenalties",
    "aet",
    "penalties",
    "ended",
}


def match_has_started(match, now=None):
    """Restituisce True solo se lo stato/orario indica che il match è iniziato.

    I punteggi 0-0 sono comuni anche nei calendari pre-partita e non sono
    una prova che il match sia iniziato.
    """
    if not isinstance(match, dict):
        return False

    status = "".join(
        char for char in str(match.get("status") or "").strip().lower()
        if char.isalnum()
    )
    if status in PRE_MATCH_STATUSES:
        return False
    if status in STARTED_STATUSES:
        return True

    # Un punteggio non nullo è un indizio utile solo quando lo stato è ignoto.
    for key in ("score_home", "score_away"):
        value = match.get(key)
        if value in (None, ""):
            continue
        try:
            if float(value) > 0:
                return True
        except (TypeError, ValueError):
            continue

    kickoff_value = match.get("time_utc") or match.get("kickoff_time")
    if not kickoff_value:
        return False

    try:
        kickoff = datetime.fromisoformat(
            str(kickoff_value).strip().replace("Z", "+00:00")
        )
    except (TypeError, ValueError):
        return False

    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)

    reference = now or datetime.now(timezone.utc)
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)

    return kickoff <= reference
