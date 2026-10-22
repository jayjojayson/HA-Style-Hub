"""The HA Style Hub integration.

HA Style Hub makes the Home Assistant sidebar configurable from a GUI:
order, names, icons, visibility, a multi column grid layout and the complete
look (colors, gradients, fonts, borders).

The integration has two halves:

* this Python backend, which stores the configuration in ``.storage``,
  exposes it over the websocket API and serves the two JavaScript files
* the frontend module ``www/ha-style-hub.js``, which is loaded on every page
  and applies the configuration to the (shadow DOM) sidebar at runtime
"""

from __future__ import annotations

import logging

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    INJECTOR_FILE,
    MEDIA_URL,
    PANEL_COMPONENT_NAME,
    PANEL_FILE,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    URL_BASE,
    VERSION,
)
from .media import BackgroundUploadView, ensure_dir, media_dir, remove_all
from .store import SidebarHubStore
from .theme import SidebarHubTheme
from .websocket_api import async_register as async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

# hass.data keys
DATA_STORE = "store"
DATA_THEME = "theme"
DATA_STATIC = "static_registered"
DATA_WS = "websocket_registered"

# Der Schalter, mit dem sich die Kopfzeile von einem Dashboard aus ausblenden
# laesst - siehe switch.py.
PLATFORMS: list[Platform] = [Platform.SWITCH]

INJECTOR_URL = f"{URL_BASE}/{INJECTOR_FILE}?v={VERSION}"
PANEL_MODULE_URL = f"{URL_BASE}/{PANEL_FILE}?v={VERSION}"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA Style Hub from a config entry."""
    data = hass.data.setdefault(DOMAIN, {})

    # 1. Configuration store -------------------------------------------------
    store: SidebarHubStore = data.get(DATA_STORE) or SidebarHubStore(hass)
    data[DATA_STORE] = store
    await store.async_load()

    # 2. Serve the JavaScript files ------------------------------------------
    # Static paths cannot be removed again while Home Assistant runs, so they
    # are only registered once per start.
    if not data.get(DATA_STATIC):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    URL_BASE,
                    hass.config.path(f"custom_components/{DOMAIN}/www"),
                    cache_headers=False,
                )
            ]
        )
        # Der Ordner fuer hochgeladene Hintergrundbilder. Er muss existieren,
        # bevor der Pfad registriert wird - sonst lehnt ihn der Webserver ab.
        # Eigener Pfad statt /local: /local gibt es nur, wenn www schon beim
        # Start des Systems da war.
        images = media_dir(hass)
        try:
            await hass.async_add_executor_job(ensure_dir, images)
            await hass.http.async_register_static_paths(
                [StaticPathConfig(MEDIA_URL, images, cache_headers=True)]
            )
            hass.http.register_view(BackgroundUploadView(hass))
        except Exception:  # noqa: BLE001 - the images are a bonus, the rest must load
            _LOGGER.exception("Could not set up the background image folder")
        data[DATA_STATIC] = True

    # 3. Load the injector on every page -------------------------------------
    frontend.add_extra_js_url(hass, INJECTOR_URL)

    # 4. Register the configuration panel ------------------------------------
    if not frontend.async_panel_exists(hass, PANEL_URL_PATH):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=PANEL_COMPONENT_NAME,
            module_url=PANEL_MODULE_URL,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            require_admin=True,
            config_panel_domain=DOMAIN,
        )

    # 5. Websocket API -------------------------------------------------------
    if not data.get(DATA_WS):
        async_register_websocket_api(hass)
        data[DATA_WS] = True

    # 6. Theme ---------------------------------------------------------------
    # Registers the theme from the theme page with the frontend and keeps it
    # registered, see theme.py.
    theme: SidebarHubTheme = data.get(DATA_THEME) or SidebarHubTheme(hass)
    data[DATA_THEME] = theme
    theme.async_listen()
    await theme.async_apply(store.config)

    # 7. Entitaeten ----------------------------------------------------------
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    _LOGGER.debug("HA Style Hub %s set up", VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)

    data = hass.data.get(DOMAIN) or {}
    theme = data.pop(DATA_THEME, None)
    if isinstance(theme, SidebarHubTheme):
        theme.async_stop()

    try:
        frontend.remove_extra_js_url(hass, INJECTOR_URL)
    except KeyError:
        pass

    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Delete the stored configuration when the integration is removed."""
    data = hass.data.get(DOMAIN) or {}
    store = data.get(DATA_STORE)
    if isinstance(store, SidebarHubStore):
        await store.async_remove()
    try:
        await hass.async_add_executor_job(remove_all, media_dir(hass))
    except Exception:  # noqa: BLE001 - never block removing the integration
        _LOGGER.exception("Could not remove the background images")
