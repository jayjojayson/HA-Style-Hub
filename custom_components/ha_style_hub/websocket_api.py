"""Websocket API for the HA Style Hub integration."""

from __future__ import annotations

import shutil
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .card_yaml import parse_card_yaml
from .const import (
    EVENT_UPDATED,
    VERSION,
    WS_TYPE_CARD_YAML,
    WS_TYPE_DISK,
    WS_TYPE_GET,
    WS_TYPE_HISTORY,
    WS_TYPE_RESET,
    WS_TYPE_SAVE,
    WS_TYPE_SUBSCRIBE,
)
from .media import async_prune
from .runtime import (
    async_save_config,
    get_store as _get_store,
    get_theme as _get_theme,
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register all websocket commands."""
    websocket_api.async_register_command(hass, websocket_get)
    websocket_api.async_register_command(hass, websocket_save)
    websocket_api.async_register_command(hass, websocket_reset)
    websocket_api.async_register_command(hass, websocket_history)
    websocket_api.async_register_command(hass, websocket_subscribe)
    websocket_api.async_register_command(hass, websocket_disk)
    websocket_api.async_register_command(hass, websocket_card_yaml)


def _user_name(connection: websocket_api.ActiveConnection) -> str | None:
    """Return the name of whoever is on the other end, for the history."""
    user = getattr(connection, "user", None)
    name = getattr(user, "name", None)
    return name if isinstance(name, str) and name else None


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET})
@websocket_api.async_response
async def websocket_get(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the stored configuration."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "HA Style Hub is not loaded")
        return

    config = await store.async_load()
    connection.send_result(msg["id"], {"version": VERSION, "config": config})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SAVE,
        vol.Required("config"): dict,
    }
)
@websocket_api.async_response
async def websocket_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Store a new configuration and notify every connected browser."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "HA Style Hub is not loaded")
        return

    config = await async_save_config(
        hass, msg["config"], user=_user_name(connection)
    )
    await async_prune(hass)
    connection.send_result(msg["id"], {"version": VERSION, "config": config})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_RESET})
@websocket_api.async_response
async def websocket_reset(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reset the configuration back to the defaults."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "HA Style Hub is not loaded")
        return

    config = await store.async_reset(user=_user_name(connection))

    theme = _get_theme(hass)
    if theme is not None:
        await theme.async_apply(config)

    hass.bus.async_fire(EVENT_UPDATED, {"config": config})
    await async_prune(hass)
    connection.send_result(msg["id"], {"version": VERSION, "config": config})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_HISTORY})
@websocket_api.async_response
async def websocket_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the last saved states, oldest first."""
    store = _get_store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "HA Style Hub is not loaded")
        return

    await store.async_load()
    connection.send_result(msg["id"], {"entries": store.history})


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_SUBSCRIBE})
@callback
def websocket_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send every saved configuration to this browser.

    Home Assistant lets only administrators subscribe to an event of an
    integration directly. The sidebar is restyled for everybody, though, so a
    normal user has to learn about a change as well - otherwise it only shows
    after a reload. The configuration itself is not a secret: every user can
    already read it with the "get" command.
    """

    @callback
    def forward(event: Any) -> None:
        data = getattr(event, "data", None) or {}
        connection.send_message(
            websocket_api.event_message(msg["id"], {"config": data.get("config")})
        )

    connection.subscriptions[msg["id"]] = hass.bus.async_listen(EVENT_UPDATED, forward)
    connection.send_result(msg["id"])


def _disk_usage(path: str) -> dict[str, float]:
    """Return total, used and free space of the disk holding path, in GB.

    GB as Home Assistant shows it on its storage page: 1024^3 bytes, one
    decimal.
    """
    usage = shutil.disk_usage(path)
    gib = 1024**3
    return {
        "total": round(usage.total / gib, 1),
        "used": round(usage.used / gib, 1),
        "free": round(usage.free / gib, 1),
    }


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_DISK})
@websocket_api.async_response
async def websocket_disk(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return how full the disk with the configuration is.

    The system monitor of the settings page asks the Supervisor first; this
    is for installations without one (Container, Core).
    """
    try:
        usage = await hass.async_add_executor_job(_disk_usage, hass.config.path())
    except OSError as err:
        connection.send_error(msg["id"], "disk_unavailable", str(err))
        return
    connection.send_result(msg["id"], usage)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CARD_YAML,
        vol.Required("yaml"): str,
    }
)
@callback
def websocket_card_yaml(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Check the YAML of a popup card with the YAML parser of Home Assistant.

    The panel asks while the code is typed: the answer is the card as
    configuration or an error with its line (at most POPUP_CARD_MAX bytes).
    """
    connection.send_result(msg["id"], parse_card_yaml(msg["yaml"]))
