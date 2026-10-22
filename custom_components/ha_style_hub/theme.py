"""Register the HA Style Hub theme with Home Assistant.

Home Assistant keeps every theme it knows in a single dictionary in
``hass.data["frontend_themes"]`` - the themes from ``configuration.yaml`` end up
there, and nothing stops an integration from adding one more entry at runtime.
That is what happens here: the values from the theme page are turned into a
normal theme dictionary, written into that store and announced with the
``themes_updated`` event. From that moment on the theme behaves like any other
one: it is in the theme picker of every user profile, it survives a page reload
and it can be set as the default theme.

One thing has to be caught: the service ``frontend.reload_themes`` does not
merge, it replaces the whole dictionary with what is in ``configuration.yaml``.
Our theme would be gone. Since that service fires ``themes_updated`` when it is
done, we listen for exactly that event and put ourselves back in. The listener
compares first and only writes when the theme is really missing or out of date,
so the event we fire ourselves cannot start a loop.
"""

from __future__ import annotations

import logging
import math
import re
from typing import Any

from homeassistant.core import HomeAssistant, callback

from .const import (
    DASH_DIRECTIONS,
    DASH_IMAGE_SIZES,
    THEME_COMPOSED,
    THEME_PX,
    THEME_VARIABLES,
    is_media_url,
)

_LOGGER = logging.getLogger(__name__)

# Both belong to the frontend integration. They are used as literals on
# purpose: hass.data keys are plain strings (HassKey is a str subclass), and a
# renamed constant in a future Home Assistant release should not stop the whole
# integration from loading - the theme is simply not registered then.
DATA_THEMES_KEY = "frontend_themes"
EVENT_THEMES_UPDATED = "themes_updated"

# Service used to make the theme the backend selected default.
FRONTEND_DOMAIN = "frontend"
SERVICE_SET_THEME = "set_theme"


# A plain decimal number, the only thing that gets "px" appended.
_PLAIN_NUMBER = re.compile(r"-?\d*\.?\d+\Z")


def _with_unit(key: str, value: str) -> str:
    """Add "px" when a length variable was given as a bare number.

    Home Assistant hands the value straight to CSS, and CSS drops a length
    without a unit. Typing 5 into "border width" has to mean 5 pixels, not
    nothing at all.
    """
    if key not in THEME_PX:
        return value
    # Same test as withUnit() in the panel. float() would also accept "nan",
    # "inf" or "1e3" and turn them into "nanpx" - the preview and the theme
    # Home Assistant gets would then differ.
    return f"{value}px" if _PLAIN_NUMBER.match(value) else value


def _length(value: Any) -> str:
    """Return a plain number for a per side / per corner field, or "0"."""
    if isinstance(value, bool):
        return "0"
    if isinstance(value, (int, float)):
        value = str(value)
    if not isinstance(value, str):
        return "0"
    text = value.strip().removesuffix("px").strip()
    if not _PLAIN_NUMBER.match(text):
        return "0"
    number = float(text)
    return str(int(number)) if number.is_integer() else str(number)


#: Wird verwendet, wenn eine der beiden Verlaufsfarben leer ist.
_DASH_FIRST = "var(--primary-background-color)"
_DASH_SECOND = "var(--secondary-background-color)"

# Wie das Bild den Hintergrund fuellt: Position / Groesse und Wiederholung.
_DASH_IMAGE_LAYOUT = {
    "cover": "center / cover no-repeat",
    "contain": "center / contain no-repeat",
    "tile": "top left / auto repeat",
}


def background_value(raw: dict[str, Any], base: str) -> str | None:
    """Compose the CSS background of the dashboard views, or None.

    ``base`` is what stands in the field of --lovelace-background and acts as
    "color 1". Without a gradient and without an image there is nothing to
    compose - the field is used as it is (None). Otherwise the layers are, from
    top to bottom, the image and then the gradient or the plain color. Only the
    last layer of a CSS background may be a color, which is why the color goes
    last.
    """
    gradient = bool(raw.get("dash_gradient"))
    image = raw.get("dash_image")
    image = image if is_media_url(image) else None
    if not gradient and not image:
        return None

    layers: list[str] = []
    if image:
        size = raw.get("dash_image_size")
        size = size if size in DASH_IMAGE_SIZES else "cover"
        attachment = "scroll" if raw.get("dash_image_scroll") else "fixed"
        layers.append(f"url('{image}') {_DASH_IMAGE_LAYOUT[size]} {attachment}")

    if gradient:
        first = base or _DASH_FIRST
        second = str(raw.get("dash_color2") or "").strip() or _DASH_SECOND
        direction = raw.get("dash_direction")
        direction = direction if direction in DASH_DIRECTIONS else "to bottom"
        if direction == "radial":
            layers.append(f"radial-gradient(circle at 50% 0%, {first}, {second})")
        else:
            layers.append(f"linear-gradient({direction}, {first}, {second})")
    elif base:
        layers.append(base)

    return ", ".join(layers)


# --- Primary palette ---------------------------------------------------------
#
# Newer parts of the frontend (ha-button, ha-switch, checkboxes, links, ...)
# take their color from the scale --ha-color-primary-05 ... -95 instead of
# --primary-color. Home Assistant only computes that scale for the default
# theme from the primary color of the user profile (apply_themes_on_element.ts,
# generateColorPalette in src/common/color/palette.ts); a custom theme keeps
# the blue of Home Assistant. The same calculation is done here, from the
# primary-color of each mode. Same formulas and constants as culori 4.0.2,
# which the frontend uses, so the values match to the last digit.

PALETTE_STEPS = (5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95)
_HEX = re.compile(r"^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$")
_RGB = re.compile(
    r"^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)"
    r"(?:\s*[,/]\s*[\d.]+%?)?\s*\)$"
)


def _parse_color(raw: Any) -> tuple[float, float, float] | None:
    """Return r, g, b (0..1) of a hex or rgb() color, None for anything else."""
    text = str(raw or "").strip().lower()
    match = _HEX.match(text)
    if match:
        digits = match.group(1)
        if len(digits) <= 4:
            digits = "".join(char * 2 for char in digits)
        return tuple(int(digits[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]
    match = _RGB.match(text)
    if match:
        parts = []
        for part in match.groups():
            value = float(part[:-1]) / 100 if part.endswith("%") else float(part) / 255
            parts.append(max(0.0, min(1.0, value)))
        return tuple(parts)  # type: ignore[return-value]
    return None


def _to_linear(value: float) -> float:
    if abs(value) <= 0.04045:
        return value / 12.92
    return math.copysign(((abs(value) + 0.055) / 1.055) ** 2.4, value)


def _to_gamma(value: float) -> float:
    if abs(value) > 0.0031308:
        return math.copysign(1.055 * abs(value) ** (1 / 2.4) - 0.055, value)
    return value * 12.92


def _to_oklab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    r, g, b = (_to_linear(value) for value in rgb)
    big_l = math.cbrt(0.41222147079999993 * r + 0.5363325363 * g + 0.0514459929 * b)
    big_m = math.cbrt(0.2119034981999999 * r + 0.6806995450999999 * g + 0.1073969566 * b)
    big_s = math.cbrt(0.08830246189999998 * r + 0.2817188376 * g + 0.6299787005000002 * b)
    return (
        0.2104542553 * big_l + 0.793617785 * big_m - 0.0040720468 * big_s,
        1.9779984951 * big_l - 2.428592205 * big_m + 0.4505937099 * big_s,
        0.0259040371 * big_l + 0.7827717662 * big_m - 0.808675766 * big_s,
    )


def _oklab_hex(lightness: float, a: float, b: float) -> str:
    big_l = (lightness * 0.99999999845051981432 + 0.39633779217376785678 * a + 0.21580375806075880339 * b) ** 3
    big_m = (lightness * 1.0000000088817607767 - 0.1055613423236563494 * a - 0.063854174771705903402 * b) ** 3
    big_s = (lightness * 1.0000000546724109177 - 0.089484182094965759684 * a - 1.2914855378640917399 * b) ** 3
    linear = (
        4.076741661347994 * big_l - 3.307711590408193 * big_m + 0.230969928729428 * big_s,
        -1.2684380040921763 * big_l + 2.6097573492876887 * big_m - 0.3413193760026573 * big_s,
        -0.0041960761386756 * big_l - 0.7034186179359362 * big_m + 1.7076146940746117 * big_s,
    )
    out = "#"
    for value in linear:
        channel = max(0.0, min(1.0, _to_gamma(value)))
        # JavaScript Math.round: .5 rounds up (Python round() would not).
        out += f"{math.floor(channel * 255 + 0.5):02x}"
    return out


def primary_palette(raw: Any) -> dict[str, str]:
    """Return --ha-color-primary-05 ... -95 for a primary color, {} if unknown.

    Darker steps: lightness times step/50, chroma slightly reduced. Lighter
    steps: lightness towards 1 and chroma reduced by up to 70 %. Scaling
    a and b of OKLab is the same as scaling the chroma of OKLCH.
    """
    rgb = _parse_color(raw)
    if rgb is None:
        return {}
    lightness, a, b = _to_oklab(rgb)
    palette: dict[str, str] = {}
    for step in PALETTE_STEPS:
        if step == 50:
            level, factor = lightness, 1.0
        elif step < 50:
            dark = step / 50
            level, factor = lightness * dark, 0.9 + 0.1 * dark
        else:
            light = (step - 50) / 45
            level = min(1.0, lightness + (1 - lightness) * light)
            factor = max(0.0, 1 - light * 0.7)
        palette[f"ha-color-primary-{step:02d}"] = _oklab_hex(level, a * factor, b * factor)
    return palette


def _mode_values(raw: Any) -> dict[str, str]:
    """Return the CSS variables of one mode, including the derived rgb ones."""
    if not isinstance(raw, dict):
        return {}

    values: dict[str, str] = {}
    for key in THEME_VARIABLES:
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            values[key] = _with_unit(key, value.strip())

    # Per side / per corner values. Both variables feed a CSS shorthand
    # (border-width / border-radius), so four values separated by spaces are
    # a perfectly valid value for them. A side that was left empty becomes 0,
    # otherwise the shorthand would be incomplete.
    for target, (switch, parts) in THEME_COMPOSED.items():
        if not raw.get(switch):
            continue
        pieces = [_length(raw.get(part)) for part in parts]
        if any(piece != "0" for piece in pieces):
            values[target] = " ".join(f"{piece}px" for piece in pieces)
        else:
            values[target] = "0"

    # Dashboard background: gradient and / or an uploaded image on top of the
    # color from the field. Beats the plain field, exactly like the per side
    # values beat the single border width.
    background = background_value(raw, values.get("lovelace-background", ""))
    if background:
        values["lovelace-background"] = background

    # The scale of the primary color for the newer parts of the frontend
    # (see primary_palette). Only from a hex or rgb() value; with anything
    # else the scale of Home Assistant stays.
    if values.get("primary-color"):
        values.update(primary_palette(values["primary-color"]))

    # No rgb-* variants are built here on purpose: Home Assistant derives them
    # itself for every hex value (apply_themes_on_element.ts, processTheme),
    # for all variables and not just a handful. Doing it twice would only
    # blow up the theme and the export.

    return values


def build(theme_config: Any) -> dict[str, Any]:
    """Return the Home Assistant theme dictionary for the stored configuration.

    The shape is the one from ``configuration.yaml``::

        HA Style Hub:
          modes:
            dark:  { primary-color: ... }
            light: { primary-color: ... }

    Variables that are set in both modes are additionally written to the top
    level, which is what Home Assistant falls back to while it has not decided
    on a mode yet.
    """
    if not isinstance(theme_config, dict):
        return {}

    dark = _mode_values(theme_config.get("dark"))
    light = _mode_values(theme_config.get("light"))
    if not dark and not light:
        return {}

    theme: dict[str, Any] = {}

    # Shared base: everything the two modes agree on. Keeps the theme usable
    # even before the frontend knows whether it is showing light or dark.
    for key, value in light.items():
        if dark.get(key) == value:
            theme[key] = value

    modes: dict[str, dict[str, str]] = {}
    if light:
        modes["light"] = light
    if dark:
        modes["dark"] = dark
    if modes:
        theme["modes"] = modes

    return theme


class SidebarHubTheme:
    """Keeps the HA Style Hub theme registered with the frontend."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialise the manager."""
        self._hass = hass
        self._unsub: Any = None
        # Name the theme is currently registered under. Needed to remove the
        # old entry when the user renames it.
        self._registered: str | None = None
        self._config: dict[str, Any] = {}
        # Set while we write ourselves, so the event we fire is ignored.
        self._writing = False

    # ------------------------------------------------------------------ #

    @property
    def _store(self) -> dict[str, Any] | None:
        """Return the theme store of the frontend integration."""
        store = self._hass.data.get(DATA_THEMES_KEY)
        return store if isinstance(store, dict) else None

    @callback
    def _fire(self) -> None:
        """Tell every browser to fetch the themes again."""
        self._writing = True
        try:
            self._hass.bus.async_fire(EVENT_THEMES_UPDATED)
        finally:
            self._writing = False

    # ------------------------------------------------------------------ #

    async def async_apply(self, config: Any) -> None:
        """Register, update or remove the theme for a configuration."""
        theme_config = config.get("theme") if isinstance(config, dict) else None
        self._config = theme_config if isinstance(theme_config, dict) else {}

        if not self._config.get("enabled"):
            self.async_remove()
            return

        if self._async_write():
            self._fire()
            await self._async_set_default()

    @callback
    def _async_write(self) -> bool:
        """Put the theme into the store. Returns True when something changed."""
        store = self._store
        if store is None:
            # The frontend integration has not set up its themes yet. It is a
            # dependency of this integration, so this really should not happen
            # - but an unavailable theme must never break the sidebar.
            _LOGGER.debug("Theme store not available yet, skipping registration")
            return False

        name = str(self._config.get("name") or "HA Style Hub").strip()
        theme = build(self._config)
        if not theme:
            # Switched on but nothing filled in: nothing to register.
            return self._async_drop(store)

        changed = False

        # Renamed: the entry under the old name has to go.
        if self._registered and self._registered != name:
            if store.pop(self._registered, None) is not None:
                changed = True

        if store.get(name) != theme:
            store[name] = theme
            changed = True

        self._registered = name
        return changed

    @callback
    def _async_drop(self, store: dict[str, Any]) -> bool:
        """Remove our entry from the store. Returns True when it was there."""
        if self._registered and store.pop(self._registered, None) is not None:
            self._registered = None
            return True
        self._registered = None
        return False

    @callback
    def async_remove(self) -> None:
        """Remove the theme again, e.g. after switching it off or unloading."""
        store = self._store
        if store is not None and self._async_drop(store):
            self._fire()

    async def _async_set_default(self) -> None:
        """Make the theme the backend selected default, if that was asked for."""
        if not self._config.get("set_default") or not self._registered:
            return
        try:
            await self._hass.services.async_call(
                FRONTEND_DOMAIN,
                SERVICE_SET_THEME,
                {"name": self._registered},
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001 - never break saving over this
            _LOGGER.warning("Could not set %s as default theme: %s", self._registered, err)

    # ------------------------------------------------------------------ #

    @callback
    def async_listen(self) -> None:
        """Watch themes_updated and put the theme back when it disappeared.

        ``frontend.reload_themes`` replaces the whole theme store with what is
        in configuration.yaml and then fires this event, which is the one case
        where our entry silently vanishes.
        """
        if self._unsub is not None:
            return

        @callback
        def handle(_event: Any) -> None:
            if self._writing or not self._config.get("enabled"):
                return
            store = self._store
            if store is None:
                return
            name = str(self._config.get("name") or "HA Style Hub").strip()
            theme = build(self._config)
            if not theme or store.get(name) == theme:
                # Still there and unchanged - nothing to do. This is also what
                # stops the event we fire ourselves from coming back around.
                return
            _LOGGER.debug("Theme %s was removed, registering it again", name)
            if self._async_write():
                self._fire()
                self._hass.async_create_task(self._async_set_default())

        self._unsub = self._hass.bus.async_listen(EVENT_THEMES_UPDATED, handle)

    @callback
    def async_stop(self) -> None:
        """Stop listening and take the theme out again."""
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        self.async_remove()
