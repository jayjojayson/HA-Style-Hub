"""Read the YAML of a popup card with the YAML parser of Home Assistant (1.5.3).

The code comes from the code editor of a dashboard card. It is parsed by
homeassistant.util.yaml.loader.parse_yaml - the parser that reads
configuration.yaml and dashboards in YAML mode. Tags (!include, !secret, ...)
and aliases (*name) are refused before parsing: a card has no use for them, an
include could read files from the configuration folder into a card every user
can see, and aliases could blow a small text up into a huge configuration.
"""

from __future__ import annotations

from io import StringIO
import json
from typing import Any

import yaml

from homeassistant.exceptions import HomeAssistantError
from homeassistant.util.yaml.loader import parse_yaml

from .const import POPUP_CARD_MAX


def _size(text: str) -> int:
    return len(text.encode("utf-8"))


def _mark(err: BaseException | None) -> tuple[int, str]:
    """Line (1-based, 0 = unknown) and message of a YAML error."""
    while err is not None:
        if isinstance(err, yaml.MarkedYAMLError):
            mark = err.problem_mark or err.context_mark
            line = mark.line + 1 if mark is not None else 0
            parts = [part for part in (err.context, err.problem) if part]
            return line, ", ".join(parts) or str(err)
        if isinstance(err, yaml.YAMLError) or err.__cause__ is None:
            return 0, str(err)
        err = err.__cause__
    return 0, ""


def parse_card_yaml(text: Any) -> dict[str, Any]:
    """Parse the YAML of a card.

    Returns {"ok": True, "card": {...}} or
    {"ok": False, "error": "<code>", "line": n, "message": "..."} with the codes
    empty, too_big, tag, alias, yaml, no_type.
    """
    if not isinstance(text, str) or not text.strip():
        return {"ok": False, "error": "empty", "line": 0, "message": ""}
    if _size(text) > POPUP_CARD_MAX:
        return {"ok": False, "error": "too_big", "line": 0, "message": ""}
    try:
        # One pass over the structure first: syntax errors come with their
        # line from here, without an error in the log of Home Assistant for
        # every keystroke; tags and aliases are found on the way.
        for event in yaml.parse(text, Loader=yaml.SafeLoader):
            if isinstance(event, yaml.AliasEvent):
                return {"ok": False, "error": "alias", "line": event.start_mark.line + 1, "message": ""}
            if getattr(event, "tag", None) is not None:
                return {"ok": False, "error": "tag", "line": event.start_mark.line + 1, "message": ""}
        data = parse_yaml(StringIO(text))
    except (yaml.YAMLError, HomeAssistantError) as err:
        line, message = _mark(err)
        return {"ok": False, "error": "yaml", "line": line, "message": message}
    if not isinstance(data, dict) or not isinstance(data.get("type"), str) or not data["type"].strip():
        return {"ok": False, "error": "no_type", "line": 0, "message": ""}
    # Plain JSON (dates as text, like the frontend sends them)
    card = json.loads(json.dumps(data, default=str))
    if _size(json.dumps(card, ensure_ascii=False)) > POPUP_CARD_MAX:
        return {"ok": False, "error": "too_big", "line": 0, "message": ""}
    return {"ok": True, "card": card}
