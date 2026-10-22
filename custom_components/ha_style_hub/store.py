"""Persistent storage for the HA Style Hub configuration."""

from __future__ import annotations

import json
import logging
import math
import re
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .card_yaml import parse_card_yaml
from .const import (
    DEFAULT_APPEARANCE,
    DEFAULT_ADVANCED,
    DEFAULT_FAVORITE,
    DEFAULT_HEADER,
    FAVORITES_PLACES,
    MONITOR_PLACES,
    COUNT_ITEMS,
    MONITOR_SENSORS_MAX,
    HEADER_LINKS_MAX,
    MENU_PATHS_MAX,
    DEFAULT_HEADING,
    DEFAULT_ITEM,
    DEFAULT_LAYOUT,
    DEFAULT_SETTINGS,
    DASH_DIRECTIONS,
    DASH_IMAGE_SIZES,
    DEFAULT_THEME,
    HISTORY_MAX,
    HISTORY_STORAGE_KEY,
    HISTORY_STORAGE_VERSION,
    KEY_PREFIX_HEADING,
    KEY_PREFIX_POPUP,
    POPUP_LINKS_MAX,
    POPUP_CARD_MAX,
    POPUP_CONTENTS,
    POPUP_SIZE_MAX,
    DEFAULT_POPUP,
    LEGACY_THEME_NAME,
    STORAGE_KEY,
    STORAGE_VERSION,
    THEME_EXTRAS,
    THEME_VARIABLES,
    default_config,
    is_media_url,
)

_LOGGER = logging.getLogger(__name__)


def _merge_section(defaults: dict[str, Any], data: Any) -> dict[str, Any]:
    """Return defaults updated with the known keys of data.

    Unknown keys are dropped on purpose so that a configuration written by a
    newer version cannot inject arbitrary values into the frontend.
    """
    merged = dict(defaults)
    if isinstance(data, dict):
        for key, value in data.items():
            if key in merged:
                merged[key] = value
    return merged


# Nur Pfade innerhalb von Home Assistant, wie im Injector (LINK_PATH).
_LINK_PATH = re.compile(r"/(?!/)[A-Za-z0-9_\-./?=&%#~+]*")
_ICON_NAME = re.compile(r"[a-z0-9-]+:[a-z0-9-]+", re.IGNORECASE)


def _clean_header_links(
    raw: Any, limit: int = HEADER_LINKS_MAX, entities: bool = False
) -> list[dict[str, str]]:
    """Return the links of the dashboard header as a clean list.

    The list is the only value of the header that is not a plain value, so it
    is checked here: every entry needs a path inside Home Assistant, each path
    appears once, and name, icon and color are short strings. Whatever does not
    fit is dropped rather than passed on to the frontend.

    With entities (only the header, 1.5.4) an entry may show the state of an
    entity instead: {"path": "", "entity": "sensor.x", ...}, each entity once.
    It has two more keys: value_color (color of the value; color is the
    icon) and value_only (the value without an icon).
    """
    links: list[dict[str, str]] = []
    if not isinstance(raw, list):
        return links
    seen: set[str] = set()
    for one in raw:
        if not isinstance(one, dict):
            continue
        entity = one.get("entity")
        if entities and isinstance(entity, str) and entity.strip():
            entity = entity.strip()
            if not _ENTITY_ID.fullmatch(entity) or f"entity:{entity}" in seen:
                continue
            seen.add(f"entity:{entity}")
            name = one.get("name")
            icon = one.get("icon")
            color = one.get("color")
            value_color = one.get("value_color")
            links.append(
                {
                    "path": "",
                    "entity": entity,
                    "name": name.strip()[:60] if isinstance(name, str) else "",
                    "icon": icon if isinstance(icon, str) and _ICON_NAME.fullmatch(icon) else "",
                    "color": color.strip()[:80] if isinstance(color, str) else "",
                    "value_color": value_color.strip()[:80] if isinstance(value_color, str) else "",
                    "value_only": one.get("value_only") is True,
                }
            )
            if len(links) >= limit:
                break
            continue
        path = one.get("path")
        if (
            not isinstance(path, str)
            or len(path) > 200
            or path == "/"
            or not _LINK_PATH.fullmatch(path)
            or path in seen
        ):
            continue
        seen.add(path)
        name = one.get("name")
        icon = one.get("icon")
        color = one.get("color")
        links.append(
            {
                "path": path,
                "name": name.strip()[:60] if isinstance(name, str) else "",
                "icon": icon if isinstance(icon, str) and _ICON_NAME.fullmatch(icon) else "",
                "color": color.strip()[:80] if isinstance(color, str) else "",
            }
        )
        if len(links) >= limit:
            break
    return links


def _clean_popup_links(raw: Any) -> list[dict[str, str]]:
    """Return the links of a popup entry (1.5.1): path, name and icon.

    Checked like the links of the header, at most POPUP_LINKS_MAX.
    """
    return [
        {"path": link["path"], "name": link["name"], "icon": link["icon"]}
        for link in _clean_header_links(raw, POPUP_LINKS_MAX)
    ]


def _clean_popup_card(entry: dict[str, Any]) -> None:
    """Check content, card and window size of a popup entry (1.5.3), in place.

    The card is stored twice: the YAML as typed (for editing) and the parsed
    configuration (for Home Assistant). Each is limited to POPUP_CARD_MAX
    bytes; a card needs a "type". A valid YAML is parsed here again, so the
    stored card always matches it. Anything else falls back to the default.
    """
    if entry.get("content") not in POPUP_CONTENTS:
        entry["content"] = "links"
    text = entry.get("card_yaml")
    if not isinstance(text, str) or len(text.encode("utf-8")) > POPUP_CARD_MAX:
        entry["card_yaml"] = ""
    elif text.strip():
        # The YAML decides, read by Home Assistant's own parser. While it has
        # an error, the last valid card the panel sent stays.
        parsed = parse_card_yaml(text)
        if parsed["ok"]:
            entry["card"] = parsed["card"]
    card = entry.get("card")
    try:
        size = len(json.dumps(card, ensure_ascii=False).encode("utf-8"))
    except (TypeError, ValueError):
        size = POPUP_CARD_MAX + 1
    if (
        not isinstance(card, dict)
        or not isinstance(card.get("type"), str)
        or not card["type"].strip()
        or size > POPUP_CARD_MAX
    ):
        entry["card"] = {}
    for key in ("width", "height"):
        value = entry.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            entry[key] = 0
        else:
            entry[key] = max(0, min(POPUP_SIZE_MAX, round(value)))


def _clean_favorites(raw: Any) -> list[dict[str, Any]]:
    """Return the favourites of the settings page as a clean list.

    Path, name, icon and icon color are checked like the links of the header;
    the look of each favourite (colors, height, border, corners) gets the keys
    of DEFAULT_FAVORITE. Colors are short strings, sizes whole numbers where
    -1 means "as given" - anything else falls back to the default.
    """
    favorites: list[dict[str, Any]] = []
    raw_list = raw if isinstance(raw, list) else []
    # The first entry of a path counts, like in _clean_header_links.
    by_path: dict[Any, dict[str, Any]] = {}
    for one in raw_list:
        if isinstance(one, dict) and isinstance(one.get("path"), str):
            by_path.setdefault(one["path"], one)
    for link in _clean_header_links(raw_list):
        source = by_path.get(link["path"], {})
        clean = {**DEFAULT_FAVORITE, **link}
        for key, default in DEFAULT_FAVORITE.items():
            if key in link:
                continue
            value = source.get(key)
            if isinstance(default, bool):
                clean[key] = value if isinstance(value, bool) else default
            elif isinstance(default, int):
                limit = 200 if key.startswith("radius") else 80
                if (
                    isinstance(value, (int, float))
                    and not isinstance(value, bool)
                    and -1 <= value <= limit
                ):
                    clean[key] = int(value)
                else:
                    clean[key] = default
            else:
                clean[key] = value.strip()[:80] if isinstance(value, str) else default
        favorites.append(clean)
    return favorites


_MENU_ITEM_KEYS = {"name": 60, "icon": 60, "icon_color": 80, "icon_background": 80}
_ENTITY_ID = re.compile(r"[a-z0-9_]+\.[a-z0-9_]+")


def _clean_menu_items(raw: Any) -> dict[str, dict[str, Any]]:
    """Return the per entry settings of the menu (1.4.8), like cleanMenuItems.

    Name, icon (1.5.5), icon color and background of the icon box as short
    strings, hide_sub as a flag; an entry without any of them is dropped.
    """
    items: dict[str, dict[str, Any]] = {}
    if not isinstance(raw, dict):
        return items
    for path, one in list(raw.items())[:80]:
        if (
            not isinstance(path, str)
            or path == "/"
            or len(path) > 200
            or not _LINK_PATH.fullmatch(path)
            or not isinstance(one, dict)
        ):
            continue
        clean: dict[str, Any] = {}
        for key, limit in _MENU_ITEM_KEYS.items():
            value = one.get(key)
            if isinstance(value, str) and value.strip():
                clean[key] = value.strip()[:limit]
        # 1.5.5: an own icon, only as an icon name (mdi:...)
        if "icon" in clean and not _ICON_NAME.fullmatch(clean["icon"]):
            del clean["icon"]
        if one.get("hide_sub") is True:
            clean["hide_sub"] = True
        if clean:
            items[path] = clean
    return items


def _clean_sensors(raw: Any) -> list[dict[str, str]]:
    """Return the own values of the system monitor (1.4.8), like cleanSensors."""
    sensors: list[dict[str, str]] = []
    if not isinstance(raw, list):
        return sensors
    for one in raw:
        if len(sensors) >= MONITOR_SENSORS_MAX:
            break
        entity = one.get("entity") if isinstance(one, dict) else None
        if not isinstance(entity, str) or not _ENTITY_ID.fullmatch(entity.strip()):
            continue
        entity = entity.strip()
        if any(sensor["entity"] == entity for sensor in sensors):
            continue
        name = one.get("name")
        sensors.append({"entity": entity, "name": name.strip()[:40] if isinstance(name, str) else ""})
    return sensors


def _clean_paths(raw: Any) -> list[str]:
    """Return a list of paths inside Home Assistant, each one once."""
    paths: list[str] = []
    if not isinstance(raw, list):
        return paths
    for one in raw:
        if (
            isinstance(one, str)
            and len(one) <= 200
            and one != "/"
            and _LINK_PATH.fullmatch(one)
            and one not in paths
        ):
            paths.append(one)
            if len(paths) >= MENU_PATHS_MAX:
                break
    return paths


def _clean_background(values: dict[str, Any]) -> None:
    """Drop invalid values of the dashboard background extras (in place).

    The second color, the direction and the image are put into a CSS
    background. A direction or size outside the list, a second color with
    characters that end a declaration, or an image that is not one of the files
    the upload produced is thrown away instead of being passed on.
    """
    # "to bottom" and "cover" are what an empty value means; the panel shows
    # the empty entry for them, so they are not kept as a second spelling.
    if values.get("dash_direction") not in DASH_DIRECTIONS or (
        values.get("dash_direction") == "to bottom"
    ):
        values.pop("dash_direction", None)
    if values.get("dash_image_size") not in DASH_IMAGE_SIZES or (
        values.get("dash_image_size") == "cover"
    ):
        values.pop("dash_image_size", None)
    if not is_media_url(values.get("dash_image")):
        values.pop("dash_image", None)
    color = values.get("dash_color2")
    if isinstance(color, str) and any(char in color for char in ";{}<>\"'\\\n"):
        values.pop("dash_color2", None)


def _merge_theme(data: Any) -> dict[str, Any]:
    """Return a sanitised theme section.

    Only the variables from THEME_VARIABLES survive, and only as strings -
    whatever ends up here is handed to the frontend as CSS, so nothing else is
    allowed through.
    """
    theme: dict[str, Any] = {
        "enabled": bool(DEFAULT_THEME["enabled"]),
        "name": str(DEFAULT_THEME["name"]),
        "set_default": bool(DEFAULT_THEME["set_default"]),
        "dark": {},
        "light": {},
    }
    if not isinstance(data, dict):
        return theme

    theme["enabled"] = bool(data.get("enabled", theme["enabled"]))
    theme["set_default"] = bool(data.get("set_default", theme["set_default"]))

    name = data.get("name")
    if isinstance(name, str) and name.strip():
        theme["name"] = name.strip()

    # Der alte Projektname wird auf den neuen gezogen. Nur genau dieser eine
    # Wert - ein selbst vergebener Name bleibt unangetastet.
    if theme["name"] == LEGACY_THEME_NAME:
        theme["name"] = str(DEFAULT_THEME["name"])

    for mode in ("dark", "light"):
        raw = data.get(mode)
        if not isinstance(raw, dict):
            continue
        values: dict[str, Any] = {}
        for key in THEME_VARIABLES:
            value = raw.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                value = str(value)
            if isinstance(value, str) and value.strip():
                values[key] = value.strip()

        # The extras are not CSS variables, they are the per side / per corner
        # values the theme page composes the two card variables from. The
        # switches stay booleans, the numbers stay strings.
        for key, default in THEME_EXTRAS.items():
            value = raw.get(key)
            if isinstance(default, bool):
                if value is not None:
                    values[key] = bool(value)
                continue
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                value = str(value)
            if isinstance(value, str) and value.strip():
                values[key] = value.strip()

        _clean_background(values)
        theme[mode] = values

    return theme


def normalize(data: Any) -> dict[str, Any]:
    """Return a complete, sanitised configuration dictionary."""
    config = default_config()
    if not isinstance(data, dict):
        return config

    config["layout"] = _merge_section(DEFAULT_LAYOUT, data.get("layout"))
    config["appearance"] = _merge_section(DEFAULT_APPEARANCE, data.get("appearance"))
    config["advanced"] = _merge_section(DEFAULT_ADVANCED, data.get("advanced"))
    config["header"] = _merge_section(DEFAULT_HEADER, data.get("header"))
    # 1.5.6: only the two known positions
    if config["header"].get("position") not in ("top", "bottom"):
        config["header"]["position"] = "top"
    config["header"]["links"] = _clean_header_links(
        config["header"].get("links"), entities=True
    )
    config["settings"] = _merge_section(DEFAULT_SETTINGS, data.get("settings"))
    config["settings"]["favorites"] = _clean_favorites(
        config["settings"].get("favorites")
    )
    if config["settings"].get("favorites_place") not in FAVORITES_PLACES:
        config["settings"]["favorites_place"] = DEFAULT_SETTINGS["favorites_place"]
    raw_items = config["settings"].get("monitor_counts_items")
    config["settings"]["monitor_counts_items"] = (
        [key for key in COUNT_ITEMS if key in raw_items]
        if isinstance(raw_items, list)
        else list(COUNT_ITEMS)
    )
    for key in ("monitor_place", "monitor_backup_place", "monitor_counts_place"):
        if config["settings"].get(key) not in MONITOR_PLACES:
            config["settings"][key] = DEFAULT_SETTINGS[key]
    for key in ("menu_order", "menu_hidden"):
        config["settings"][key] = _clean_paths(config["settings"].get(key))
    config["settings"]["menu_items"] = _clean_menu_items(config["settings"].get("menu_items"))
    config["settings"]["monitor_sensors"] = _clean_sensors(config["settings"].get("monitor_sensors"))
    config["theme"] = _merge_theme(data.get("theme"))

    order = data.get("order")
    if isinstance(order, list):
        config["order"] = [str(key) for key in order if isinstance(key, str)]

    items = data.get("items")
    if isinstance(items, dict):
        clean_items: dict[str, Any] = {}
        for key, value in items.items():
            if not isinstance(key, str):
                continue
            if key.startswith(KEY_PREFIX_HEADING):
                defaults = DEFAULT_HEADING
            elif key.startswith(KEY_PREFIX_POPUP):
                defaults = DEFAULT_POPUP
            else:
                defaults = DEFAULT_ITEM
            clean_items[key] = _merge_section(defaults, value)
            if key.startswith(KEY_PREFIX_POPUP):
                clean_items[key]["links"] = _clean_popup_links(
                    value.get("links") if isinstance(value, dict) else None
                )
                _clean_popup_card(clean_items[key])
        config["items"] = clean_items

    return config


#: Woher ein Eintrag im Verlauf stammt.
HISTORY_SOURCES = ("panel", "reset", "start")


def _clean_history(raw: Any) -> list[dict[str, Any]]:
    """Return a sanitised history list, oldest first.

    The file is under our control, but a half written or hand edited one must
    not be able to take the integration down - so nothing is trusted.
    """
    entries: list[dict[str, Any]] = []
    if not isinstance(raw, dict) or not isinstance(raw.get("entries"), list):
        return entries
    for item in raw["entries"]:
        if not isinstance(item, dict) or not isinstance(item.get("config"), dict):
            continue
        ts = item.get("ts")
        user = item.get("user")
        source = item.get("source")
        entries.append(
            {
                "id": item["id"] if isinstance(item.get("id"), int) else 0,
                "ts": ts if isinstance(ts, str) else None,
                "user": user[:64] if isinstance(user, str) and user else None,
                "source": source if source in HISTORY_SOURCES else "panel",
                "config": normalize(item["config"]),
            }
        )
    # ids have to be unique - they are what the panel points at
    seen: set[int] = set()
    next_id = max((entry["id"] for entry in entries), default=0) + 1
    for entry in entries:
        if entry["id"] <= 0 or entry["id"] in seen:
            entry["id"] = next_id
            next_id += 1
        seen.add(entry["id"])
    return entries[-HISTORY_MAX:]


class SidebarHubStore:
    """Thin wrapper around the Home Assistant Store helper."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialise the store."""
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY
        )
        self._history_store: Store[dict[str, Any]] = Store(
            hass, HISTORY_STORAGE_VERSION, HISTORY_STORAGE_KEY
        )
        self._config: dict[str, Any] = default_config()
        self._history: list[dict[str, Any]] = []
        self._loaded = False

    @property
    def config(self) -> dict[str, Any]:
        """Return the current configuration."""
        return self._config

    @property
    def history(self) -> list[dict[str, Any]]:
        """Return the saved states, oldest first."""
        return self._history

    async def async_load(self) -> dict[str, Any]:
        """Load the configuration from disk."""
        if not self._loaded:
            try:
                raw = await self._store.async_load()
            except Exception:  # noqa: BLE001 - never block setup on bad storage
                _LOGGER.exception("Could not read the stored configuration")
                raw = None
            self._config = normalize(raw)
            try:
                self._history = _clean_history(await self._history_store.async_load())
            except Exception:  # noqa: BLE001 - the history is a bonus
                _LOGGER.exception("Could not read the history")
                self._history = []
            self._loaded = True
        return self._config

    async def async_save(
        self,
        data: Any,
        *,
        user: str | None = None,
        source: str = "panel",
        record: bool = True,
    ) -> dict[str, Any]:
        """Validate, store and return the new configuration.

        With ``record`` the new state also goes into the history - unless it
        is identical to the current one, so pressing Save twice does not fill
        the list with copies. The switch entities pass ``record=False``: hiding
        the header is a toggle, not a design, and a few clicks on a dashboard
        button would otherwise push every real state out of the list.
        """
        new = normalize(data)
        previous = self._config
        self._config = new
        self._loaded = True
        await self._store.async_save(self._config)
        if record and new != previous:
            await self._async_record(previous, new, user, source)
        return self._config

    async def async_reset(self, *, user: str | None = None) -> dict[str, Any]:
        """Reset the configuration back to the defaults."""
        previous = self._config
        self._config = default_config()
        self._loaded = True
        await self._store.async_save(self._config)
        if self._config != previous:
            await self._async_record(previous, self._config, user, "reset")
        return self._config

    async def _async_record(
        self,
        previous: dict[str, Any],
        new: dict[str, Any],
        user: str | None,
        source: str,
    ) -> None:
        """Append a state to the history and write it out."""
        try:
            if not self._history:
                # Without this there would be no way back to what was there
                # before the very first entry.
                self._history.append(self._entry(previous, None, "start", None))
            stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self._history.append(self._entry(new, user, source, stamp))
            del self._history[:-HISTORY_MAX]
            await self._history_store.async_save({"entries": self._history})
        except Exception:  # noqa: BLE001 - a broken history must not break saving
            _LOGGER.exception("Could not write the history")

    def _entry(
        self,
        config: dict[str, Any],
        user: str | None,
        source: str,
        stamp: str | None,
    ) -> dict[str, Any]:
        """Build one history entry."""
        next_id = max((entry["id"] for entry in self._history), default=0) + 1
        return {
            "id": next_id,
            "ts": stamp,
            "user": user[:64] if isinstance(user, str) and user else None,
            "source": source if source in HISTORY_SOURCES else "panel",
            "config": normalize(config),
        }

    async def async_remove(self) -> None:
        """Delete the stored configuration."""
        await self._store.async_remove()
        await self._history_store.async_remove()
        self._config = default_config()
        self._history = []
        self._loaded = False
