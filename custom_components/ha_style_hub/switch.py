"""Switch entities for the HA Style Hub integration.

Two switches, both of them a second view of a checkbox in the panel:

* "Hide the header" flips ``header.hidden``
* "Hide the sidebar" flips ``layout.hide_sidebar``

That makes both options reachable from a dashboard button or an automation
instead of only from the panel.

The state is not kept in the entities. It is read from the store, and they
listen for the update event that every save fires, no matter whether the save
came from here, from the panel or from another browser.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DEFAULT_HEADER,
    DEFAULT_LAYOUT,
    DOMAIN,
    EVENT_UPDATED,
    NAME,
    VERSION,
)
from .runtime import async_save_config, get_store


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the switches."""
    async_add_entities(
        [
            HeaderHiddenSwitch(hass, entry),
            SidebarHiddenSwitch(hass, entry),
        ]
    )


class _HubSwitch(SwitchEntity):
    """One boolean of the stored configuration, as a switch.

    Subclasses only say which section and which key they belong to.
    """

    _attr_has_entity_name = True
    _attr_should_poll = False

    #: Section of the configuration and the key inside it.
    _section: str = ""
    _key: str = ""
    #: What the value is when nothing is stored yet.
    _fallback: bool = False

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialise the switch."""
        self.hass = hass
        self._attr_unique_id = f"{entry.entry_id}_{self._section}_{self._key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=NAME,
            manufacturer="jayjojayson",
            model=NAME,
            sw_version=VERSION,
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def is_on(self) -> bool:
        """Return the stored value."""
        store = get_store(self.hass)
        if store is None:
            return self._fallback
        section = store.config.get(self._section) or {}
        return bool(section.get(self._key, self._fallback))

    @property
    def available(self) -> bool:
        """The switch needs the store, which is gone while unloading."""
        return get_store(self.hass) is not None

    async def async_added_to_hass(self) -> None:
        """Follow every change of the configuration, wherever it came from."""

        @callback
        def _updated(_event: Any) -> None:
            self.async_write_ha_state()

        self.async_on_remove(self.hass.bus.async_listen(EVENT_UPDATED, _updated))

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Set the value."""
        await self._async_set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Clear the value."""
        await self._async_set(False)

    async def _async_set(self, value: bool) -> None:
        """Write the new value through the same path the panel uses.

        The whole configuration is written back, not just the one value: the
        store normalises what it is given, and handing it a fragment would
        reset everything else to the defaults.
        """
        store = get_store(self.hass)
        if store is None:
            return
        config = dict(await store.async_load())
        section = dict(config.get(self._section) or {})
        if bool(section.get(self._key)) == value:
            return
        section[self._key] = value
        config[self._section] = section
        # Ein Schalter ist kein neuer Entwurf - nicht in den Verlauf.
        await async_save_config(self.hass, config, record=False)
        self.async_write_ha_state()


class HeaderHiddenSwitch(_HubSwitch):
    """Hide or show the header of the dashboards."""

    _attr_translation_key = "header_hidden"
    _attr_icon = "mdi:page-layout-header"
    _section = "header"
    _key = "hidden"
    _fallback = bool(DEFAULT_HEADER["hidden"])


class SidebarHiddenSwitch(_HubSwitch):
    """Hide or show the sidebar."""

    _attr_translation_key = "sidebar_hidden"
    _attr_icon = "mdi:dock-left"
    _section = "layout"
    _key = "hide_sidebar"
    _fallback = bool(DEFAULT_LAYOUT["hide_sidebar"])
