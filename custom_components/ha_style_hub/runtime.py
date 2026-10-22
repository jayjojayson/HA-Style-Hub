"""Shared access to the running integration.

The store and the theme manager live in ``hass.data[DOMAIN]``. Both the
websocket API and the switch platform need them, and both have to save a
configuration in exactly the same way - otherwise a change made from a
dashboard would reach the browsers differently from one made in the panel.
That common path lives here.
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .const import DOMAIN, EVENT_UPDATED
from .store import SidebarHubStore
from .theme import SidebarHubTheme


def get_store(hass: HomeAssistant) -> SidebarHubStore | None:
    """Return the store instance if the integration is loaded."""
    data = hass.data.get(DOMAIN)
    if isinstance(data, dict):
        store = data.get("store")
        if isinstance(store, SidebarHubStore):
            return store
    return None


def get_theme(hass: HomeAssistant) -> SidebarHubTheme | None:
    """Return the theme manager if the integration is loaded."""
    data = hass.data.get(DOMAIN)
    if isinstance(data, dict):
        theme = data.get("theme")
        if isinstance(theme, SidebarHubTheme):
            return theme
    return None


async def async_save_config(
    hass: HomeAssistant,
    config: Any,
    *,
    user: str | None = None,
    record: bool = True,
) -> dict[str, Any] | None:
    """Store a configuration, update the theme and notify every browser.

    ``user`` is the name that shows up in the history; ``record=False`` keeps
    the change out of it (the switch entities do that).

    Returns the stored (sanitised) configuration, or ``None`` when the
    integration is not loaded.
    """
    store = get_store(hass)
    if store is None:
        return None

    stored = await store.async_save(config, user=user, record=record)

    # The theme is part of the configuration, so a save has to update the
    # registered theme as well.
    theme = get_theme(hass)
    if theme is not None:
        await theme.async_apply(stored)

    hass.bus.async_fire(EVENT_UPDATED, {"config": stored})
    return stored
