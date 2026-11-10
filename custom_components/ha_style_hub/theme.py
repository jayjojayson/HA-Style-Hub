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
    CUSTOM_VAR_VALUE_MAX,
    CUSTOM_VARS_MAX,
    DASH_DIRECTIONS,
    DASH_IMAGE_SIZES,
    THEME_COMPOSED,
    THEME_PX,
    THEME_VARIABLES,
    is_media_url,
)

_LOGGER = logging.getLogger(__name__)

# 1.6.0: Name einer eigenen Variable (ohne "--") und was im Wert nicht stehen
# darf - der Wert wird zu CSS, deshalb kein ; { } < > \ und keine Zeilen.
_CUSTOM_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}")
_CUSTOM_BAD = re.compile(r"[;{}<>\\\r\n]")
# Die Skala der Primaerfarbe rechnet das Theme selbst aus.
_CUSTOM_DERIVED = re.compile(r"(rgb-.*|ha-color-(primary|red|orange|green)-\d{2})")


def clean_custom_vars(raw: Any) -> list[dict[str, str]]:
    """Return the own variables of one mode as a clean list.

    Accepts the stored list ``[{"name": ..., "value": ...}]`` (and, to be
    forgiving, a plain ``{name: value}`` mapping). Invalid names, names the
    theme page has a field for, derived names, empty or unsafe values and
    duplicates (the first one wins) are dropped.
    """
    if isinstance(raw, dict):
        pairs = [{"name": key, "value": value} for key, value in raw.items()]
    elif isinstance(raw, list):
        pairs = [one for one in raw if isinstance(one, dict)]
    else:
        return []
    known = set(THEME_VARIABLES)
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for pair in pairs:
        name = pair.get("name")
        value = pair.get("value")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            value = str(value)
        if not isinstance(name, str) or not isinstance(value, str):
            continue
        name = name.strip()
        if name.startswith("--"):
            name = name[2:]
        value = value.strip()
        if (
            not _CUSTOM_NAME.fullmatch(name)
            or name in known
            or _CUSTOM_DERIVED.fullmatch(name)
            or name in seen
            or not value
            or len(value) > CUSTOM_VAR_VALUE_MAX
            or _CUSTOM_BAD.search(value)
        ):
            continue
        seen.add(name)
        out.append({"name": name, "value": value})
        if len(out) >= CUSTOM_VARS_MAX:
            break
    return out

# Both belong to the frontend integration. They are used as literals on
# purpose: hass.data keys are plain strings (HassKey is a str subclass), and a
# renamed constant in a future Home Assistant release should not stop the whole
# integration from loading - the theme is simply not registered then.
DATA_THEMES_KEY = "frontend_themes"
# Das Standard-Theme des Servers (frontend/helpers.py: DATA_DEFAULT_THEME) und
# der Name, der "kein eigenes Theme" bedeutet (DEFAULT_THEME).
DATA_DEFAULT_THEME_KEY = "frontend_default_theme"
DEFAULT_THEME_NAME = "default"
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


# 1.6.0: Die Skalen von Rot, Orange und Gruen aus Home Assistant
# (src/resources/theme/color/core.globals.ts, Stand 11/2026). Home Assistant
# stimmt sie von Hand ab; aus ihnen kommen die Flaechen, Raender und Texte
# fuer Fehler, Warnung und Erfolg (semantic.globals.ts).
ROLE_SCALES: dict[str, tuple[str, ...]] = {
    "red": ("#2a040b", "#3e0913", "#631323", "#8a132c", "#b30532", "#dc3146",
            "#f3676c", "#fd8f90", "#ffb8b6", "#ffdedc", "#fff0ef"),
    "orange": ("#280700", "#3b0f00", "#5e1c00", "#7e2900", "#9d3800", "#c94e00",
               "#f36d00", "#ff9342", "#ffbb89", "#ffe0c8", "#fff0e4"),
    "green": ("#031608", "#052310", "#0a3a1d", "#0a5027", "#036730", "#00883c",
              "#00ac49", "#5dc36f", "#93da98", "#c2f2c1", "#e3f9e3"),
}
# Welches Feld welche Skala faerbt
ROLE_FIELDS: tuple[tuple[str, str], ...] = (
    ("red", "error-color"),
    ("orange", "warning-color"),
    ("green", "success-color"),
)


def _oklab_in_gamut(lightness: float, a: float, b: float) -> bool:
    big_l = (lightness * 0.99999999845051981432 + 0.39633779217376785678 * a + 0.21580375806075880339 * b) ** 3
    big_m = (lightness * 1.0000000088817607767 - 0.1055613423236563494 * a - 0.063854174771705903402 * b) ** 3
    big_s = (lightness * 1.0000000546724109177 - 0.089484182094965759684 * a - 1.2914855378640917399 * b) ** 3
    linear = (
        4.076741661347994 * big_l - 3.307711590408193 * big_m + 0.230969928729428 * big_s,
        -1.2684380040921763 * big_l + 2.6097573492876887 * big_m - 0.3413193760026573 * big_s,
        -0.0041960761386756 * big_l - 0.7034186179359362 * big_m + 1.7076146940746117 * big_s,
    )
    return all(-0.0005 <= value <= 1.0005 for value in linear)


def role_palette(role: str, raw: Any) -> dict[str, str]:
    """Return --ha-color-<role>-05 ... -95 for an own status color, {} if unknown.

    Keeps the hand made lightness and chroma of Home Assistant per step and
    moves it to the own color: step 50 is exactly that color, the steps
    around it follow its lightness, chroma and hue - towards 05 and 95 less
    and less, so the darkest and lightest steps stay close to the original.
    Colors outside sRGB lose chroma until they fit.
    """
    base = ROLE_SCALES.get(role)
    rgb = _parse_color(raw)
    if not base or rgb is None:
        return {}
    lab_user = _to_oklab(rgb)
    user_c = math.hypot(lab_user[1], lab_user[2])
    user_h = math.atan2(lab_user[2], lab_user[1])
    lab_mid = _to_oklab(_parse_color(base[5]))  # type: ignore[arg-type]
    mid_c = math.hypot(lab_mid[1], lab_mid[2])
    mid_h = math.atan2(lab_mid[2], lab_mid[1])
    ratio = user_c / mid_c if mid_c > 1e-6 else 1.0
    shift_l = lab_user[0] - lab_mid[0]
    shift_h = user_h - mid_h
    palette: dict[str, str] = {}
    for index, step in enumerate(PALETTE_STEPS):
        key = f"ha-color-{role}-{step:02d}"
        if step == 50:
            palette[key] = _oklab_hex(*lab_user)
            continue
        # Helligkeit: an den Enden (05, 95) gar nicht verschoben, damit die
        # dunkelste und hellste Stufe nicht schwarz oder weiss werden.
        weight_l = max(0.0, 1 - abs(step - 50) / 45)
        weight = 1 - abs(step - 50) / 50 * 0.9
        lab = _to_oklab(_parse_color(base[index]))  # type: ignore[arg-type]
        chroma = math.hypot(lab[1], lab[2]) * (1 + (ratio - 1) * weight)
        hue = math.atan2(lab[2], lab[1]) + shift_h
        level = max(0.0, min(1.0, lab[0] + shift_l * weight_l))
        # in sRGB holen: Buntheit halbieren, bis es passt (12 Schritte)
        low, high = 0.0, max(0.0, chroma)
        if not _oklab_in_gamut(level, high * math.cos(hue), high * math.sin(hue)):
            for _ in range(12):
                middle = (low + high) / 2
                if _oklab_in_gamut(level, middle * math.cos(hue), middle * math.sin(hue)):
                    low = middle
                else:
                    high = middle
            high = low
        palette[key] = _oklab_hex(level, high * math.cos(hue), high * math.sin(hue))
    return palette


# 1.6.0: Bubble Card und Mushroom ans Theme anbinden. Beide Karten lesen
# eigene Variablen (--bubble-*, --mush-*) und haben eigene Vorgaben (Bubble:
# blauer Akzent und runde Formen, Mushroom: eigene Statusfarben). Die
# Zuordnung verweist nur auf Variablen von Home Assistant - damit folgen die
# Karten dem Theme in Hell und Dunkel. Gelesen aus den Quellen der Karten
# (Bubble Card und lovelace-mushroom, Stand 10/2026); was ein Feld oder eine
# eigene Variable setzt, geht vor.
BIND_BUBBLE: tuple[tuple[str, str], ...] = (
    ("bubble-accent-color", "var(--primary-color)"),
    ("bubble-main-background-color", "var(--ha-card-background, var(--card-background-color))"),
    ("bubble-secondary-background-color", "var(--secondary-background-color)"),
    ("bubble-pop-up-background-color", "var(--primary-background-color)"),
    ("bubble-border-radius", "var(--ha-card-border-radius, var(--ha-border-radius-lg))"),
    ("bubble-icon-border-radius", "var(--ha-border-radius-circle)"),
    ("bubble-border", "var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color))"),
)

BIND_MUSHROOM: tuple[tuple[str, str], ...] = (
    ("mush-rgb-state-entity", "var(--rgb-primary-color)"),
    ("mush-rgb-info", "var(--rgb-info-color)"),
    ("mush-rgb-success", "var(--rgb-success-color)"),
    ("mush-rgb-warning", "var(--rgb-warning-color)"),
    ("mush-rgb-danger", "var(--rgb-error-color)"),
    ("mush-card-secondary-color", "var(--secondary-text-color)"),
    ("mush-card-primary-font-size", "var(--ha-font-size-m)"),
    ("mush-card-secondary-font-size", "var(--ha-font-size-s)"),
    ("mush-card-primary-font-weight", "var(--ha-font-weight-medium)"),
    ("mush-card-secondary-font-weight", "var(--ha-font-weight-normal)"),
    ("mush-title-font-size", "var(--ha-font-size-2xl)"),
    ("mush-subtitle-font-size", "var(--ha-font-size-l)"),
    ("mush-control-border-radius", "var(--ha-border-radius-lg)"),
    ("mush-chip-border-radius", "var(--ha-border-radius-pill)"),
    ("mush-icon-border-radius", "var(--ha-border-radius-circle)"),
)


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

    # 1.6.0: dasselbe fuer Fehler, Warnung und Erfolg - aus den Feldern
    # error-color, warning-color und success-color.
    for role, field in ROLE_FIELDS:
        if values.get(field):
            for key, value in role_palette(role, values[field]).items():
                values.setdefault(key, value)

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
    # 1.6.0: eigene Variablen dazu. Was die Felder setzen, geht vor.
    custom = theme_config.get("custom")
    custom = custom if isinstance(custom, dict) else {}
    for name, values in (("dark", dark), ("light", light)):
        for pair in clean_custom_vars(custom.get(name)):
            values.setdefault(pair["name"], pair["value"])
        # 1.6.0: Bubble Card / Mushroom anbinden
        if theme_config.get("bind_bubble"):
            for key, value in BIND_BUBBLE:
                values.setdefault(key, value)
        if theme_config.get("bind_mushroom"):
            for key, value in BIND_MUSHROOM:
                values.setdefault(key, value)
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
            # 1.5.9: War dieses Theme das Standard-Theme von Home Assistant,
            # geht der Standard zurueck auf "default" - sonst zeigte er auf
            # ein Theme, das es nicht mehr gibt. Nur hier (ausgeschaltet oder
            # geloescht und gespeichert), nicht beim Entladen der Integration.
            name = self._registered
            self.async_remove()
            await self._async_reset_default(name)
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

    async def _async_reset_default(self, name: str | None) -> None:
        """Point Home Assistant's default theme back to "default" if it was ours."""
        if not name or self._hass.data.get(DATA_DEFAULT_THEME_KEY) != name:
            return
        try:
            await self._hass.services.async_call(
                FRONTEND_DOMAIN,
                SERVICE_SET_THEME,
                {"name": DEFAULT_THEME_NAME},
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001 - never break saving over this
            _LOGGER.warning("Could not reset the default theme: %s", err)

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
