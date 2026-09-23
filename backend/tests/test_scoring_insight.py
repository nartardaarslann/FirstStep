"""Unit-level scoring checks for insight trigger logic."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from scoring import insight


def test_insight_triggers_with_low_sleep_and_higher_afternoon_sugar():
    meals = [
        {"macros": {"sugar": 8}, "local_hour": 9},
        {"macros": {"sugar": 22}, "local_hour": 16},
    ]
    log = {"sleep": 5.5}
    result = insight(meals, log, 16)
    assert result["triggered"] is True
    assert "tıbbi tavsiye değildir" in result["disclaimer"]


def test_insight_not_triggered_without_pattern():
    meals = [{"macros": {"sugar": 12}, "local_hour": 10}]
    log = {"sleep": 7}
    result = insight(meals, log, 16)
    assert result["triggered"] is False
