import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from match_status import match_has_started
from competition_resolver import resolve_match_league


class MatchHasStartedTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 12, 8, 0, tzinfo=timezone.utc)

    def test_not_started_zero_zero_is_pre_match(self):
        match = {
            "status": "not_started",
            "score_home": 0,
            "score_away": 0,
            "time_utc": "2026-11-18T14:30:00Z",
        }
        self.assertFalse(match_has_started(match, self.now))

    def test_scheduled_zero_zero_stays_pre_match_even_after_scheduled_time(self):
        match = {
            "status": "scheduled",
            "score_home": 0,
            "score_away": 0,
            "time_utc": "2026-11-11T14:30:00Z",
        }
        self.assertFalse(match_has_started(match, self.now))

    def test_live_zero_zero_has_started(self):
        self.assertTrue(match_has_started({"status": "live", "score_home": 0, "score_away": 0}, self.now))

    def test_finished_zero_zero_has_started(self):
        self.assertTrue(match_has_started({"status": "finished", "score_home": 0, "score_away": 0}, self.now))

    def test_unknown_status_uses_future_kickoff(self):
        match = {"status": "unknown", "time_utc": "2026-11-13T14:30:00Z"}
        self.assertFalse(match_has_started(match, self.now))

    def test_unknown_status_uses_elapsed_kickoff(self):
        match = {"status": "unknown", "time_utc": "2026-11-11T14:30:00Z"}
        self.assertTrue(match_has_started(match, self.now))

    def test_unknown_status_nonzero_score_is_started(self):
        self.assertTrue(match_has_started({"status": "unknown", "score_home": 1, "score_away": 0}, self.now))

    def test_missing_or_invalid_data_is_not_started(self):
        self.assertFalse(match_has_started({}, self.now))
        self.assertFalse(match_has_started(None, self.now))
        self.assertFalse(match_has_started({"status": "unknown", "time_utc": "non valido"}, self.now))


class CompetitionResolverTests(unittest.TestCase):
    def setUp(self):
        self.catalogue = [
            {"id": "ita-a", "name": "Serie A", "country_code": "ITA"},
            {"id": "bra-a", "name": "Serie A", "country_code": "BRA"},
            {"id": "ita-b", "name": "Serie B", "country_code": "ITA"},
            {"id": "bra-b", "name": "Serie B", "country_code": "BRA"},
        ]
        self.selected = {"ita-a", "ita-b"}

    def test_brazilian_league_id_is_never_relabelled_as_italian(self):
        resolved, _ = resolve_match_league({"league": {"id": "bra-a", "name": "Serie A"}}, self.catalogue, self.selected)
        self.assertIsNone(resolved)

    def test_brazilian_country_is_never_relabelled_as_italian(self):
        resolved, _ = resolve_match_league({"league": {"name": "Serie A", "country_code": "BRA"}}, self.catalogue, self.selected)
        self.assertIsNone(resolved)

    def test_ambiguous_name_without_country_is_rejected(self):
        resolved, _ = resolve_match_league({"league": {"name": "Serie A"}}, self.catalogue, self.selected)
        self.assertIsNone(resolved)

    def test_italian_competition_is_resolved_by_id(self):
        resolved, league = resolve_match_league({"league": {"id": "ita-a", "name": "Serie A"}}, self.catalogue, self.selected)
        self.assertEqual(resolved, "ita-a")
        self.assertEqual(league["country_code"], "ITA")

    def test_italian_competition_is_resolved_by_explicit_country(self):
        resolved, _ = resolve_match_league({"league": {"name": "Serie B", "country_code": "Italy"}}, self.catalogue, self.selected)
        self.assertEqual(resolved, "ita-b")

if __name__ == "__main__":
    unittest.main()
