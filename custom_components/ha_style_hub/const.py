"""Constants for the HA Style Hub integration."""

from __future__ import annotations

import re
from typing import Any, Final

DOMAIN: Final = "ha_style_hub"
NAME: Final = "HA Style Hub"
VERSION: Final = "1.5.6"

# Storage
STORAGE_KEY: Final = f"{DOMAIN}.config"
STORAGE_VERSION: Final = 1

# Verlauf der Speicherstaende: eigene Datei, damit die Konfiguration selbst
# unveraendert bleibt (und eine aeltere Version sie weiter lesen kann).
HISTORY_STORAGE_KEY: Final = f"{DOMAIN}.history"
HISTORY_STORAGE_VERSION: Final = 1
# So viele Staende werden aufgehoben; der aelteste faellt zuerst heraus.
HISTORY_MAX: Final = 10

# Frontend
URL_BASE: Final = f"/{DOMAIN}-static"
INJECTOR_FILE: Final = "ha-style-hub.js"
PANEL_FILE: Final = "ha-style-hub-panel.js"
PANEL_URL_PATH: Final = "ha-style-hub"
PANEL_TITLE: Final = "HA Style Hub"
PANEL_ICON: Final = "mdi:dock-left"
PANEL_COMPONENT_NAME: Final = "ha-style-hub-panel"

# Event fired on the HA event bus whenever the configuration changed.
# The injector listens for it so every open browser updates instantly.
EVENT_UPDATED: Final = f"{DOMAIN}_updated"

# Websocket commands
WS_TYPE_GET: Final = f"{DOMAIN}/get"
WS_TYPE_SAVE: Final = f"{DOMAIN}/save"
WS_TYPE_RESET: Final = f"{DOMAIN}/reset"
WS_TYPE_HISTORY: Final = f"{DOMAIN}/history"
# Belegung des Datentraegers mit der Konfiguration (Systemmonitor), fuer
# Installationen ohne Supervisor.
WS_TYPE_DISK: Final = f"{DOMAIN}/disk"
# 1.5.3: YAML of a popup card, read by the YAML parser of Home Assistant
WS_TYPE_CARD_YAML: Final = f"{DOMAIN}/card_yaml"
# Live updates for every user. Listening to EVENT_UPDATED directly is only
# allowed for administrators, so the injector subscribes through this command.
WS_TYPE_SUBSCRIBE: Final = f"{DOMAIN}/subscribe"

# Keys of the sidebar entries in "order" and "items" (the injector and the
# panel build them, the backend only stores them):
#   "panel:<url_path>"   dashboards and panels Home Assistant renders itself
#   "heading:<id>"       own section headings (KEY_PREFIX_HEADING, below)
#   "link:<path>"        own links to a page of Home Assistant
#   "popup:<id>"         own popup entries with several links (1.5.1)
#   "action:restart"     the restart button
#   "config", "notifications", "profile", "external-config" for the fixed
#   entries at the bottom of the sidebar.
# Zwischenueberschriften sind keine Eintraege von Home Assistant, sondern
# eigene Elemente, die der Injector in die Liste haengt. Sie stehen mit diesem
# Praefix in "order" und "items" und laufen damit durch dieselbe Sortier- und
# Farbmechanik wie alles andere.
KEY_PREFIX_HEADING: Final = "heading:"
# PopUp-Links (1.5.1): ein Eintrag, der beim Anklicken ein Fenster mit
# mehreren Links oeffnet. Die Links stehen in items[key]["links"].
KEY_PREFIX_POPUP: Final = "popup:"
POPUP_LINKS_MAX: Final = 24
# Eine Lovelace-Karte im PopUp (1.5.3): YAML und daraus die Konfiguration,
# beides hoechstens so viele Bytes. Fenstergroesse in px, 0 = automatisch.
POPUP_CARD_MAX: Final = 51200
POPUP_CONTENTS: Final = ("links", "card")
POPUP_SIZE_MAX: Final = 4000

# Layout ----------------------------------------------------------------------
DEFAULT_LAYOUT: Final[dict[str, Any]] = {
    # Number of columns while the sidebar is expanded (1-4).
    # The default is 1 on purpose: a fresh installation must not restructure
    # anybody's sidebar. The grid starts as soon as the user picks 2 or more.
    "columns": 1,
    # Number of columns while the sidebar is collapsed (1-3).
    "columns_collapsed": 1,
    # "auto" -> tile look (icon above label) as soon as columns > 1
    # "tile" -> always icon above label
    # "row"  -> always the stock look (icon left of the label)
    "item_style": "auto",
    # Gap between the grid cells in px.
    "gap": 6,
    # Sidebar width in px (expanded / collapsed).
    "width": 256,
    "width_collapsed": 56,
    # Height of a grid cell in px (only used for the tile look).
    "tile_height": 74,
    # Height of a grid cell while the sidebar is collapsed. 0 -> the same as
    # tile_height, so nothing changes until the user asks for it.
    "tile_height_collapsed": 0,
    # Distance between the icon and the label in px (only for the tile look -
    # in the row look the two sit side by side and need no extra room).
    "tile_gap": 2,
    # Height of a row in px (only used for the row look).
    "row_height": 40,
    # Height of a row while the sidebar is collapsed. 0 -> same as row_height.
    "row_height_collapsed": 0,
    # Pull "Settings", "Notifications" and the user entry out of the fixed
    # bottom block so they become part of the sortable grid.
    # Off by default, see the note on "columns" above.
    # When it is off, Home Assistant keeps its own spacer and the three entries
    # stay pinned to the bottom, exactly as without this integration.
    "merge_fixed": False,
    # Hide the scrollbar of the entry list. Scrolling still works, only the
    # bar itself disappears.
    "hide_scrollbar": False,
    # Die ganze Seitenleiste ausblenden. Das Panel bleibt ueber seine
    # Adresse erreichbar (/ha-style-hub), und in Home Assistant gibt es dafuer
    # einen Schalter - man sperrt sich also nicht aus.
    "hide_sidebar": False,
    # Put a "Restart Home Assistant" entry into the grid. Home Assistant has
    # no such button in its sidebar, this one is created by the injector.
    # It only ever appears for administrators - nobody else is allowed to call
    # the service behind it - and it always asks before it restarts.
    "show_restart": False,
}

# Dashboard header ------------------------------------------------------------
# Die Kopfzeile eines Dashboards gehoert nicht der Seitenleiste und auch nicht
# dem Theme: Home Assistant baut sie in <hui-root> und gibt dafuer nur drei
# Theme-Variablen heraus (Hintergrund, Textfarbe, Linie darunter). Alles
# weitere - Hoehe, Rahmen, Ecken, Icongroesse, Ausblenden - geht nur ueber
# eigenes CSS, das der Injector in den Shadow Root von <hui-root> schreibt.
# Deshalb ein eigener Abschnitt und nicht ein paar Felder mehr im Theme.
#
# Wie ueberall gilt: ein leerer Wert bzw. 0 heisst "nicht anfassen".
DEFAULT_HEADER: Final[dict[str, Any]] = {
    # Die ganze Kopfzeile ausblenden. Im Bearbeitungsmodus bleibt sie stehen -
    # ohne sie kaeme man aus dem Editor nicht mehr heraus.
    "hidden": False,
    # Wo die Kopfzeile steht (1.5.6): "top" wie bei Home Assistant oder
    # "bottom" am unteren Rand des Dashboards. Im Bearbeitungsmodus steht sie
    # immer oben.
    "position": "top",
    # Hoehe in px. Gesetzt wird --header-height, damit rueckt der Inhalt
    # darunter automatisch mit: Home Assistant rechnet seinen Abstand aus
    # derselben Variablen.
    "height": 0,
    # Hintergrund, wahlweise als Verlauf aus zwei Farben.
    "background": "",
    "background_gradient": False,
    "background_color2": "",
    "gradient_direction": "to bottom",
    # Weichzeichner hinter der Kopfzeile in px (nur sichtbar, wenn der
    # Hintergrund durchscheinend ist).
    "blur": 0,
    # Deckkraft des Hintergrunds in Prozent. Ohne ein Durchscheinen ist der
    # Weichzeichner nicht zu sehen; 100 laesst den Hintergrund, wie er ist.
    "background_opacity": 100,
    # Titel und Icons.
    "text_color": "",
    "font_size": 0,
    "font_weight": "",
    "icon_color": "",
    "icon_size": 0,
    # Die vier Knoepfe rechts in der Kopfzeile, die Home Assistant selbst
    # setzt: Hinzufuegen (+), Suche, Assist und Dashboard bearbeiten. Sie
    # werden am Icon erkannt, siehe HEADER_ACTIONS im Injector.
    "hide_add": False,
    "hide_search": False,
    "hide_assist": False,
    "hide_edit": False,
    # Die Reiter der Ansichten.
    "tab_color": "",
    "tab_color_active": "",
    "tab_indicator_color": "",
    "actions_color": "",
    # Rahmen und Ecken, gleiche Mechanik wie bei den Eintraegen.
    "border_color": "",
    "border_width": 0,
    "border_split": False,
    "border_top": 0,
    "border_right": 0,
    "border_bottom": 0,
    "border_left": 0,
    "radius": 0,
    "radius_split": False,
    "radius_tl": 0,
    "radius_tr": 0,
    "radius_br": 0,
    "radius_bl": 0,
    # Rahmen um die einzelnen Elemente der Kopfzeile: die Button (Menue,
    # Zurueck, +, Suche, Assist, Stift, Drei-Punkte-Menue) und die Reiter der
    # Ansichten. Breite 0 heisst kein Rahmen.
    "element_border_width": 0,
    "element_border_color": "",
    "element_radius": 0,
    "element_border_buttons": True,
    "element_border_tabs": True,
    # Maus hover ueber einem Reiter: Hintergrundfarbe (leer = wie Home
    # Assistant) und Deckkraft 0-100.
    "tab_hover_background": "",
    "tab_hover_opacity": 100,
    # Der Neustart-Knopf auch in der Kopfzeile, vor den Knoepfen von Home
    # Assistant. Nur fuer Administratoren, und er fragt vor dem Neustart nach.
    "show_restart": False,
    # Eigene Links in der Kopfzeile, ebenfalls vor den Knoepfen von Home
    # Assistant: eine Liste aus {path, name, icon, color}. Die Reihenfolge der
    # Liste ist die Reihenfolge in der Kopfzeile.
    "links": [],
    # CPU und Arbeitsspeicher als kleine Werte in der Kopfzeile, vor den
    # Knoepfen. Die Werte kommen von der Integration "hardware" von Home
    # Assistant (alle 5 Sekunden).
    "show_system": False,
    # Freier und belegter Speicherplatz als zwei weitere kleine Werte daneben
    # (dieselbe Quelle wie der Systemmonitor, jede Minute neu).
    "show_disk": False,
}

# Hoechstens so viele Links in der Kopfzeile - mehr passt dort nicht hin.
HEADER_LINKS_MAX: Final = 12
# Hoechstens so viele Pfade in menu_order / menu_hidden.
MENU_PATHS_MAX: Final = 80

# Einstellungen von Home Assistant selbst ------------------------------------
# Alles, was nicht die Sidebar, das Theme oder die Kopfzeile eines Dashboards
# ist, sondern eine andere Stelle von Home Assistant (Menuepunkt
# "HA-Settings" im Panel).
DEFAULT_SETTINGS: Final[dict[str, Any]] = {
    # Die Symbole auf den Einstellungsseiten (Geraete, Automatisierungen, ...)
    # sitzen in einem runden farbigen Kreis. Mit "icon_box" bekommt er statt
    # der Kreisform den Eckenradius "icon_radius" (px).
    "icon_box": False,
    "icon_radius": 12,
    # Farbe des Hintergrunds (leer = jeder Menuepunkt behaelt die Farbe, die
    # Home Assistant ihm gibt), Farbe des Symbols, Groesse der Box und des
    # Symbols in px (0 = wie Home Assistant).
    "icon_background": "",
    "icon_color": "",
    "icon_box_size": 0,
    "icon_size": 0,
    # Geraete & Dienste als Liste statt als Raster aus Karten: Zeilenhoehe,
    # Abstand und groesste Breite der Liste (0 = volle Breite), alles in px.
    "list_view": False,
    "list_row_height": 56,
    "list_gap": 8,
    "list_max_width": 0,
    # Die Liste in zwei oder drei Spalten statt einer. Es gilt immer nur eine
    # der beiden Angaben; sind beide gesetzt, gewinnt die dreispaltige.
    "list_two_columns": False,
    "list_three_columns": False,
    # Rahmen der Zeilen: Staerke und Eckenradius in px (-1 = wie Home
    # Assistant, 0 ist ein echter Wert), Farbe des Rahmens und Farbe bei
    # Problemen (Einrichtungsfehler, nicht geladen). Leer = wie Home Assistant.
    "list_border_width": -1,
    "list_border_radius": -1,
    "list_border_color": "",
    "list_error_color": "",
    # 1.5.4: Hintergrund der Eintraege mit Problem auf der Seite einer
    # Integration - Fehler (Home Assistant: rot) und nicht geladen bzw.
    # Entladen fehlgeschlagen (orange). Leer = wie Home Assistant.
    "list_error_background": "",
    "list_warning_background": "",
    # Deckkraft beider Hintergruende in Prozent (100 = Farbe wie gewaehlt).
    "list_problem_opacity": 100,
    # Hintergrund der Zeilen (Farbe oder Verlauf, leer = wie Home Assistant).
    "list_background": "",
    # Maus hover ueber einer Zeile der Liste: Farbe (leer = wie Home Assistant)
    # und Deckkraft 0-100.
    "list_hover_background": "",
    "list_hover_opacity": 100,
    # Rahmen und Ecken je Seite / je Ecke (-1 = wie Home Assistant), fuer die
    # Zeilen der Liste (list_*) und fuer die Menuepunkte der Einstellungsseite
    # (menu_*).
    "list_border_split": False,
    "list_side_top": -1,
    "list_side_right": -1,
    "list_side_bottom": -1,
    "list_side_left": -1,
    "list_corner_split": False,
    "list_corner_tl": -1,
    "list_corner_tr": -1,
    "list_corner_br": -1,
    "list_corner_bl": -1,
    "menu_border_width": -1,
    "menu_border_split": False,
    "menu_side_top": -1,
    "menu_side_right": -1,
    "menu_side_bottom": -1,
    "menu_side_left": -1,
    "menu_border_color": "",
    "menu_border_radius": -1,
    "menu_corner_split": False,
    "menu_corner_tl": -1,
    "menu_corner_tr": -1,
    "menu_corner_br": -1,
    "menu_corner_bl": -1,
    # Maus hover ueber einem Menuepunkt der Einstellungsseiten: Farbe (leer =
    # wie Home Assistant) und Deckkraft 0-100.
    "menu_hover_background": "",
    "menu_hover_opacity": 100,
    # Apps (frueher Add-ons): auf Wunsch dieselbe Listenansicht wie bei
    # Geraete & Dienste, mit denselben list_*-Werten.
    "list_apps": False,
    # Gruppenkoepfe der Tabellen (Automatisierungen, Entitaeten, Helfer, ...):
    # Hintergrund, Textfarbe (leer = wie Home Assistant), Schriftgroesse in px
    # (0 = wie Home Assistant) und Schriftstaerke (leer = wie Home Assistant).
    "table_group_background": "",
    "table_group_color": "",
    "table_group_size": 0,
    "table_group_weight": "",
    # Zeilen der Tabellen: Farbe jeder zweiten Zeile (leer = keine Streifen),
    # Farbe und Deckkraft unter der Maus (leer = wie Home Assistant) und
    # Schriftgroesse in px (0 = wie Home Assistant).
    "table_zebra": "",
    "table_hover_background": "",
    "table_hover_opacity": 100,
    "table_font_size": 0,
    # Die Menuepunkte der Einstellungsseite: eigene Reihenfolge und
    # ausgeblendete Punkte, jeweils als Liste von Pfaden ("/config/system").
    # Home Assistant zeigt die Punkte in mehreren Bloecken; sortiert wird
    # innerhalb eines Blocks.
    "menu_order": [],
    "menu_hidden": [],
    # Die Punkte in einer, zwei oder drei Spalten, auf Wunsch als Kacheln
    # (Symbol ueber dem Text, ohne Beschreibung).
    "menu_columns": 1,
    "menu_tiles": False,
    # Eigene Links oben auf der Einstellungsseite, eine Liste aus
    # {path, name, icon, color} wie die Links der Kopfzeile, dazu je Link sein
    # Aussehen (siehe DEFAULT_FAVORITE).
    "favorites": [],
    # Wo die Favoriten stehen: "page" = ueber den Karten der Seite,
    # "header" = mittig in der Kopfleiste der Einstellungsseite.
    "favorites_place": "page",
    # Systemmonitor auf der Einstellungsseite: CPU, Arbeitsspeicher und
    # belegter Speicher. "top" = oben (unter den Favoriten), "end" = unter den
    # Menuepunkten. Mit "monitor_graphs" kommen Verlaeufe fuer CPU und
    # Arbeitsspeicher und ein Balken fuer den Speicher dazu.
    "monitor": False,
    "monitor_place": "top",
    "monitor_graphs": False,
    # Das letzte Backup als eigene Box (gehoert zum Systemmonitor), mit
    # eigener Position.
    "monitor_backup": False,
    "monitor_backup_place": "top",
    # Zaehler-Box (1.4.4): an/aus, Position und welche Zaehler (COUNT_ITEMS).
    "monitor_counts": False,
    "monitor_counts_place": "top",
    "monitor_counts_items": [
        "devices", "entities", "integrations", "apps", "automations", "scenes",
        "scripts", "cards", "blueprints", "users", "tokens",
    ],
    # Den Tipp von Home Assistant unter den Menuepunkten ausblenden.
    "hide_tip": False,
    # 1.4.8: Menuepunkte einzeln (Pfad -> name, hide_sub, icon_color,
    # icon_background), eigene Werte im Systemmonitor (entity, name), Knopf
    # "Backup jetzt erstellen", Profilseite wie die Einstellungsseite, Seite
    # einer Integration wie die Listenansicht.
    "menu_items": {},
    "monitor_sensors": [],
    "monitor_backup_button": True,
    "profile_page": True,
    "list_entries": True,
    # 1.4.9: nur die eigenen Werte im Systemmonitor, eigene Zeilenhoehe der
    # Integrationsseite (0 = wie Home Assistant).
    "monitor_sensors_only": False,
    "list_entries_row_height": 0,
    # Farbe der Tabellenzeilen (1.4.2); jede zweite bekommt table_zebra.
    "table_row_background": "",
}

#: Wo die Favoriten und der Systemmonitor stehen koennen.
FAVORITES_PLACES: Final = ("page", "header")
MONITOR_PLACES: Final = ("top", "end")
#: Hoechstens so viele eigene Werte im Systemmonitor (1.4.8).
MONITOR_SENSORS_MAX: Final = 6
# Was die Zaehler-Box zaehlen kann, in dieser Reihenfolge.
COUNT_ITEMS: Final = (
    "devices", "entities", "integrations", "apps", "automations", "scenes",
    "scripts", "cards", "blueprints", "users", "tokens",
)

# Ein Favorit der Einstellungsseite. Pfad, Name, Icon und "color" (Farbe des
# Icons) wie bei den Links der Kopfzeile; der Rest ist sein Aussehen, mit
# derselben Mechanik wie bei den Zwischenueberschriften der Seitenleiste.
# Leere Farben und -1 heissen "wie vorgegeben", 0 ist ein echter Wert.
DEFAULT_FAVORITE: Final[dict[str, Any]] = {
    "path": "",
    "name": "",
    "icon": "",
    "color": "",
    "text_color": "",
    "background": "",
    "height": -1,
    "border_color": "",
    "border_width": -1,
    "border_split": False,
    "border_top": -1,
    "border_right": -1,
    "border_bottom": -1,
    "border_left": -1,
    "radius": -1,
    "radius_split": False,
    "radius_tl": -1,
    "radius_tr": -1,
    "radius_br": -1,
    "radius_bl": -1,
    "uppercase": False,
    # Nur das Icon zeigen, den Namen ausblenden (er bleibt als Tooltip).
    "icon_only": False,
}

# Appearance -----------------------------------------------------------------
DEFAULT_APPEARANCE: Final[dict[str, Any]] = {
    # Empty string always means "do not touch, keep the theme value".
    "background": "",
    # Gradient built from the GUI: background is the first color, the second
    # one and the direction come from these. Off means "background" is used
    # verbatim, so a hand written CSS gradient still works.
    "background_gradient": False,
    "background_color2": "",
    "gradient_direction": "to bottom",
    "header_background": "",
    "border_color": "",
    "border_width": 0,
    "text_color": "",
    "text_color_selected": "",
    "icon_color": "",
    "icon_color_selected": "",
    "font_size": 12,
    "font_weight": "500",
    # Empty keeps the font of the active theme.
    "font_family": "",
    "icon_size": 24,
    "item_background": "",
    "item_background_selected": "",
    # Colors while the mouse is over an entry. Empty keeps the stock ripple.
    "hover_background": "",
    # Opacity of that background in percent, so a subtle tint is possible
    # without writing an rgba() value by hand.
    "hover_opacity": 100,
    "hover_text_color": "",
    "hover_icon_color": "",
    "item_border_color": "",
    # Border: one value for all sides, or - with item_border_split - one per
    # side. The split values are only read when the switch is on, so turning it
    # off always brings the single value back unchanged.
    "item_border_width": 0,
    "item_border_split": False,
    "item_border_top": 0,
    "item_border_right": 0,
    "item_border_bottom": 0,
    "item_border_left": 0,
    # Corner radius, same idea: one value, or one per corner.
    "item_radius": 12,
    "item_radius_split": False,
    "item_radius_tl": 12,
    "item_radius_tr": 12,
    "item_radius_br": 12,
    "item_radius_bl": 12,
    # The small info badge on "Settings" and "Notifications".
    "badge_background": "",
    "badge_color": "",
    "title": "",
    "title_color": "",
    "hide_title": False,
    "hide_toggle": False,
    "hide_labels_collapsed": True,
    # Carry the background and header colors over to the notification drawer
    # that opens from the sidebar. Off by default - it is a separate surface,
    # nobody should get it restyled without asking.
    "style_notifications": False,
    # Text colors for that drawer. Empty means "use the sidebar text color" -
    # they exist because a dark header background can leave the stock text
    # unreadable, and that has to be fixable without changing the sidebar.
    "notif_text_color": "",
    "notif_header_color": "",
    "custom_css": "",
}

# Theme ----------------------------------------------------------------------
# HA Style Hub can register a real Home Assistant theme at runtime. The theme is
# written into hass.data["frontend_themes"], exactly where the themes from
# configuration.yaml end up, so Home Assistant picks it up on its own and it
# shows up in the theme picker of every user profile.
# Bis v1.1.6 hiess das Projekt "Sidebar Hub", und so hiess auch das Theme.
# Wer damals gespeichert hat, traegt den alten Namen weiterhin in seiner
# Konfiguration - er wird beim Laden einmalig nachgezogen.
LEGACY_THEME_NAME: Final = "Sidebar Hub"

DEFAULT_THEME: Final[dict[str, Any]] = {
    # Off by default: a fresh installation must not add a theme nobody asked
    # for. Switching it on is what registers the theme.
    "enabled": False,
    # Name under which the theme appears in Home Assistant.
    "name": "HA Style Hub",
    # Also make it the default theme for everybody who follows the backend
    # selected theme (calls frontend.set_theme once after saving).
    "set_default": False,
    # The two modes. Keys are the variable names without the leading "--",
    # values are plain CSS. An empty value is not written to the theme at all,
    # so Home Assistant keeps its own value for it.
    "dark": {},
    "light": {},
}

# Every variable the theme page offers, in the order of the groups on that
# page. Only names listed here survive normalize(), so nothing unexpected can
# end up in a registered theme.
THEME_VARIABLES: Final[tuple[str, ...]] = (
    # base colors
    "primary-color",
    "light-primary-color",
    "dark-primary-color",
    "accent-color",
    "divider-color",
    "outline-color",
    # backgrounds
    "primary-background-color",
    "secondary-background-color",
    "card-background-color",
    "clear-background-color",
    "ha-card-background",
    # dashboard background (any CSS background: color, gradient or image)
    "lovelace-background",
    # text
    "primary-text-color",
    "secondary-text-color",
    "text-primary-color",
    "disabled-text-color",
    # app header
    "app-header-background-color",
    "app-header-text-color",
    "app-header-border-bottom",
    "app-theme-color",
    # app header, edit mode and backdrop filter (1.4.8)
    "app-header-edit-background-color",
    "app-header-edit-text-color",
    "app-header-backdrop-filter",
    # sidebar (shown on Sidebar > Appearance since 1.4.4)
    "sidebar-background-color",
    "sidebar-text-color",
    "sidebar-icon-color",
    "sidebar-selected-icon-color",
    "sidebar-menu-button-background-color",
    "sidebar-menu-button-text-color",
    # cards
    "ha-card-border-color",
    "ha-card-box-shadow",
    "ha-card-header-color",
    "ha-card-header-font-size",
    "ha-card-border-width",
    "ha-card-border-radius",
    # typography
    "ha-font-family-body",
    "ha-font-size-scale",
    "ha-font-weight-body",
    # states and icons
    "state-icon-color",
    "state-active-color",
    "state-inactive-color",
    "state-unavailable-color",
    # state colors per device type (names as the frontend looks them up:
    # --state-<domain>-<state>-color; checked against frontend 20260826)
    "state-light-active-color",
    "state-switch-active-color",
    "state-fan-active-color",
    "state-media_player-active-color",
    "state-cover-active-color",
    "state-vacuum-active-color",
    "state-binary_sensor-active-color",
    "state-person-home-color",
    "state-climate-heat-color",
    "state-climate-cool-color",
    "state-climate-dry-color",
    "state-climate-fan_only-color",
    "state-climate-auto-color",
    "state-lock-locked-color",
    "state-lock-unlocked-color",
    "state-lock-jammed-color",
    "state-alarm_control_panel-armed_home-color",
    "state-alarm_control_panel-armed_away-color",
    "state-alarm_control_panel-armed_night-color",
    "state-alarm_control_panel-pending-color",
    "state-alarm_control_panel-triggered-color",
    # state colors: weather (1.4.8)
    "state-weather-clear_night-color",
    "state-weather-cloudy-color",
    "state-weather-exceptional-color",
    "state-weather-fog-color",
    "state-weather-hail-color",
    "state-weather-lightning-color",
    "state-weather-lightning_rainy-color",
    "state-weather-partlycloudy-color",
    "state-weather-pouring-color",
    "state-weather-rainy-color",
    "state-weather-snowy-color",
    "state-weather-snowy_rainy-color",
    "state-weather-sunny-color",
    "state-weather-windy-color",
    "state-weather-windy_variant-color",
    # status colors
    "error-color",
    "warning-color",
    "success-color",
    "info-color",
    # tables and inputs
    "table-row-background-color",
    "table-row-alternative-background-color",
    "data-table-background-color",
    "input-fill-color",
    "input-ink-color",
    "input-idle-line-color",
    # more tables and inputs (1.4.8)
    "table-header-background-color",
    "input-label-ink-color",
    "input-dropdown-icon-color",
    # dialogs, code, scrollbar
    "ha-dialog-surface-background",
    "mdc-dialog-scrim-color",
    "markdown-code-background-color",
    "code-editor-background-color",
    "scrollbar-thumb-color",
    # dialog backdrop filter and code editor syntax colors (1.4.8)
    "ha-dialog-scrim-backdrop-filter",
    "codemirror-keyword",
    "codemirror-operator",
    "codemirror-variable",
    "codemirror-variable-2",
    "codemirror-def",
    "codemirror-atom",
    "codemirror-number",
    "codemirror-string",
    "codemirror-string2",
    "codemirror-comment",
    "codemirror-meta",
    "codemirror-property",
    "codemirror-qualifier",
    # sliders and badges
    "slider-color",
    "slider-track-color",
    "label-badge-background-color",
    "label-badge-text-color",
    "chip-background-color",
    # label badges, charts, energy, design tokens, switches (1.4.8)
    "label-badge-red",
    "label-badge-blue",
    "label-badge-green",
    "label-badge-yellow",
    "label-badge-grey",
    "history-unavailable-color",
    "history-unknown-color",
    "color-1",
    "color-2",
    "color-3",
    "color-4",
    "color-5",
    "color-6",
    "color-7",
    "color-8",
    "color-9",
    "color-10",
    "color-11",
    "color-12",
    "color-13",
    "color-14",
    "color-15",
    "color-16",
    "color-17",
    "color-18",
    "color-19",
    "color-20",
    "color-21",
    "color-22",
    "color-23",
    "color-24",
    "color-25",
    "color-26",
    "color-27",
    "color-28",
    "color-29",
    "color-30",
    "color-31",
    "color-32",
    "color-33",
    "color-34",
    "color-35",
    "color-36",
    "color-37",
    "color-38",
    "color-39",
    "color-40",
    "color-41",
    "color-42",
    "color-43",
    "color-44",
    "color-45",
    "color-46",
    "color-47",
    "color-48",
    "color-49",
    "color-50",
    "color-51",
    "color-52",
    "color-53",
    "color-54",
    "energy-grid-consumption-color",
    "energy-grid-return-color",
    "energy-solar-color",
    "energy-battery-out-color",
    "energy-battery-in-color",
    "energy-non-fossil-color",
    "energy-gas-color",
    "energy-water-color",
    "ha-color-text-primary",
    "ha-color-text-secondary",
    "ha-color-text-disabled",
    "ha-color-surface-default",
    "ha-color-surface-low",
    "ha-color-on-surface-default",
    "ha-color-form-background",
    "ha-color-form-background-hover",
    "ha-color-form-background-disabled",
    "ha-color-focus",
    "ha-color-shadow-scrollable-fade",
    "ha-color-border-primary-quiet",
    "ha-color-border-primary-loud",
    "ha-color-border-neutral-quiet",
    "ha-color-border-neutral-normal",
    "ha-color-border-neutral-loud",
    "ha-color-border-danger-quiet",
    "ha-color-border-danger-normal",
    "ha-color-border-danger-loud",
    "ha-color-border-warning-quiet",
    "ha-color-border-warning-normal",
    "ha-color-border-warning-loud",
    "ha-color-border-success-quiet",
    "ha-color-border-success-normal",
    "ha-color-border-success-loud",
    "ha-color-fill-primary-quiet-resting",
    "ha-color-fill-primary-quiet-hover",
    "ha-color-fill-primary-quiet-active",
    "ha-color-fill-primary-normal-resting",
    "ha-color-fill-primary-normal-hover",
    "ha-color-fill-primary-normal-active",
    "ha-color-fill-primary-loud-resting",
    "ha-color-fill-primary-loud-hover",
    "ha-color-fill-primary-loud-active",
    "ha-color-fill-neutral-quiet-resting",
    "ha-color-fill-neutral-quiet-hover",
    "ha-color-fill-neutral-normal-resting",
    "ha-color-fill-neutral-normal-hover",
    "ha-color-fill-neutral-normal-active",
    "ha-color-fill-neutral-loud-resting",
    "ha-color-fill-neutral-loud-hover",
    "ha-color-fill-neutral-loud-active",
    "ha-color-fill-disabled-quiet-resting",
    "ha-color-fill-disabled-quiet-hover",
    "ha-color-fill-disabled-normal-resting",
    "ha-color-fill-disabled-loud-resting",
    "ha-color-fill-danger-quiet-resting",
    "ha-color-fill-danger-quiet-hover",
    "ha-color-fill-danger-quiet-active",
    "ha-color-fill-danger-normal-resting",
    "ha-color-fill-danger-normal-hover",
    "ha-color-fill-danger-normal-active",
    "ha-color-fill-danger-loud-resting",
    "ha-color-fill-danger-loud-hover",
    "ha-color-fill-danger-loud-active",
    "ha-color-fill-warning-quiet-resting",
    "ha-color-fill-warning-quiet-hover",
    "ha-color-fill-warning-quiet-active",
    "ha-color-fill-warning-normal-resting",
    "ha-color-fill-warning-normal-hover",
    "ha-color-fill-warning-normal-active",
    "ha-color-fill-warning-loud-resting",
    "ha-color-fill-warning-loud-hover",
    "ha-color-fill-warning-loud-active",
    "ha-color-fill-success-quiet-resting",
    "ha-color-fill-success-quiet-hover",
    "ha-color-fill-success-quiet-active",
    "ha-color-fill-success-normal-resting",
    "ha-color-fill-success-normal-hover",
    "ha-color-fill-success-normal-active",
    "ha-color-fill-success-loud-resting",
    "ha-color-fill-success-loud-hover",
    "ha-color-fill-success-loud-active",
    "ha-color-on-primary-quiet",
    "ha-color-on-primary-normal",
    "ha-color-on-primary-loud",
    "ha-color-on-neutral-quiet",
    "ha-color-on-neutral-normal",
    "ha-color-on-neutral-loud",
    "ha-color-on-disabled-quiet",
    "ha-color-on-disabled-normal",
    "ha-color-on-disabled-loud",
    "ha-color-on-danger-quiet",
    "ha-color-on-danger-normal",
    "ha-color-on-danger-loud",
    "ha-color-on-warning-quiet",
    "ha-color-on-warning-normal",
    "ha-color-on-warning-loud",
    "ha-color-on-success-quiet",
    "ha-color-on-success-normal",
    "ha-color-on-success-loud",
    "ha-border-radius-sm",
    "ha-border-radius-md",
    "ha-border-radius-lg",
    "ha-border-radius-xl",
    "ha-border-radius-2xl",
    "ha-border-radius-3xl",
    "ha-border-radius-4xl",
    "ha-border-radius-6xl",
    "ha-border-radius-pill",
    "ha-border-width-sm",
    "ha-border-width-md",
    "ha-border-width-lg",
    "ha-box-shadow-s",
    "ha-box-shadow-m",
    "ha-box-shadow-l",
    "ha-switch-checked-background-color",
    "ha-switch-checked-background-color-hover",
    "ha-switch-checked-border-color",
    "ha-switch-checked-border-color-hover",
    "ha-switch-checked-thumb-background-color",
    "ha-switch-checked-thumb-background-color-hover",
    "ha-switch-checked-thumb-border-color",
    "ha-switch-checked-thumb-border-color-hover",
    "ha-switch-background-color",
    "ha-switch-background-color-hover",
    "ha-switch-border-color",
    "ha-switch-thumb-background-color",
    "ha-switch-thumb-background-color-hover",
    "ha-switch-thumb-border-color",
    "ha-switch-thumb-border-color-hover",
    "ha-switch-thumb-box-shadow",
    "ha-switch-size",
    "ha-switch-width",
    "ha-switch-thumb-size",
)

# Per mode, next to the variables above, the theme page keeps a few values
# that are not CSS variables of their own: the card border and the card corner
# radius can be set per side / per corner, and the four values are composed
# into the single variable Home Assistant knows
# (--ha-card-border-width / --ha-card-border-radius both feed a CSS shorthand,
# so "0px 1px 1px 0px" is a valid value for them).
# Empty means "not set", exactly like the variables themselves.
THEME_EXTRAS: Final[dict[str, Any]] = {
    "card_border_split": False,
    "card_border_top": "",
    "card_border_right": "",
    "card_border_bottom": "",
    "card_border_left": "",
    "card_radius_split": False,
    "card_radius_tl": "",
    "card_radius_tr": "",
    "card_radius_br": "",
    "card_radius_bl": "",
    # Dashboard-Hintergrund: Farbverlauf und Bild. Die Variable
    # --lovelace-background selbst bleibt das Feld "Farbe 1"; aus ihr und den
    # Werten hier wird der fertige CSS-Hintergrund zusammengesetzt (theme.py,
    # background_value()).
    "dash_gradient": False,
    "dash_color2": "",
    "dash_direction": "",
    "dash_image": "",
    "dash_image_size": "",
    "dash_image_scroll": False,
}

# Erlaubte Richtungen des Verlaufs (leer = "to bottom") und Darstellungen des
# Bildes (leer = "cover"). "radial" ist ein Kreis von oben Mitte aus, wie bei
# der Seitenleiste.
DASH_DIRECTIONS: Final[tuple[str, ...]] = (
    "to bottom",
    "to top",
    "to right",
    "to left",
    "to bottom right",
    "to bottom left",
    "to top right",
    "to top left",
    "radial",
)
DASH_IMAGE_SIZES: Final[tuple[str, ...]] = ("cover", "contain", "tile")

# Hochgeladene Hintergrundbilder ------------------------------------------------
# Ordner in der Home-Assistant-Konfiguration (im bekannten Ordner www) und der
# eigene URL-Pfad, unter dem er ausgeliefert wird. Der eigene Pfad ist absicht-
# lich nicht /local: /local gibt es nur, wenn www beim Start schon existierte.
MEDIA_DIR_PARTS: Final[tuple[str, ...]] = ("www", DOMAIN)
MEDIA_URL: Final = f"/{DOMAIN}-media"
MEDIA_UPLOAD_URL: Final = f"/api/{DOMAIN}/background"
MEDIA_MAX_BYTES: Final = 8 * 1024 * 1024
MEDIA_FILE_PREFIX: Final = "background-"
MEDIA_EXTENSIONS: Final[tuple[str, ...]] = ("png", "jpg", "gif", "webp")
_MEDIA_URL_RE: Final = re.compile(
    rf"{re.escape(MEDIA_URL)}/{re.escape(MEDIA_FILE_PREFIX)}[0-9a-f]{{12}}"
    rf"\.({'|'.join(MEDIA_EXTENSIONS)})"
)


def is_media_url(value: Any) -> bool:
    """Return True for the URL of an image this integration stored itself.

    The value ends up inside ``url('...')`` of a CSS background, so only the
    exact shape the upload produces is accepted - nothing a user could use to
    break out of the quotes or point somewhere else.
    """
    return isinstance(value, str) and _MEDIA_URL_RE.fullmatch(value) is not None


# Which variable each of the two groups feeds, and in which order.
THEME_COMPOSED: Final[dict[str, tuple[str, tuple[str, ...]]]] = {
    "ha-card-border-width": (
        "card_border_split",
        ("card_border_top", "card_border_right", "card_border_bottom", "card_border_left"),
    ),
    "ha-card-border-radius": (
        "card_radius_split",
        ("card_radius_tl", "card_radius_tr", "card_radius_br", "card_radius_bl"),
    ),
}

# Variables that are a plain length. Home Assistant puts them straight into a
# CSS property, and CSS needs a unit: "5" is invalid and is thrown away, "5px"
# is not. Whoever types a bare number means pixels, so the unit is added here
# rather than silently doing nothing.
THEME_PX: Final[tuple[str, ...]] = (
    "ha-card-border-width",
    "ha-card-border-radius",
    "ha-card-header-font-size",
    "ha-border-radius-sm",
    "ha-border-radius-md",
    "ha-border-radius-lg",
    "ha-border-radius-xl",
    "ha-border-radius-2xl",
    "ha-border-radius-3xl",
    "ha-border-radius-4xl",
    "ha-border-radius-6xl",
    "ha-border-radius-pill",
    "ha-border-width-sm",
    "ha-border-width-md",
    "ha-border-width-lg",
    "ha-switch-size",
    "ha-switch-width",
    "ha-switch-thumb-size",
)

DEFAULT_ADVANCED: Final[dict[str, Any]] = {
    # Log what the injector does to the browser console.
    "debug": False,
    # Completely disable the frontend patching without uninstalling.
    "enabled": True,
}

# Eine Zwischenueberschrift. Absichtlich ein eigener Satz Vorgaben: sie hat
# keine Spaltenbreite (sie laeuft immer ueber die ganze Breite) und kein Ziel,
# sie unterteilt nur.
DEFAULT_HEADING: Final[dict[str, Any]] = {
    "name": "",
    "icon": "",
    "hidden": False,
    "text_color": "",
    "icon_color": "",
    "background": "",
    # Rahmen und Ecken, gleiche Mechanik wie bei den Eintraegen: ein Wert fuer
    # alles, oder - mit dem Schalter - einer je Seite bzw. je Ecke.
    "border_color": "",
    "border_width": 0,
    "border_split": False,
    "border_top": 0,
    "border_right": 0,
    "border_bottom": 0,
    "border_left": 0,
    "radius": 0,
    "radius_split": False,
    "radius_tl": 0,
    "radius_tr": 0,
    "radius_br": 0,
    "radius_bl": 0,
    # Hoehe der Ueberschriftenzeile in px. 0 bedeutet "automatisch": dann
    # bestimmt der Text die Hoehe, und die Zeile sitzt mit mehr Luft nach oben
    # als nach unten unter den Eintraegen davor. Ein gesetzter Wert richtet den
    # Text stattdessen mittig darin aus.
    "height": 0,
    # Ueberschriften werden in Home Assistant ueblicherweise in Grossbuchstaben
    # gesetzt. Das laesst sich abschalten, dann steht der Name so da, wie er
    # eingegeben wurde.
    "uppercase": True,
    # Eintraege, die dieser Ueberschrift zugeordnet sind, lassen sich mit
    # einem Klick auf sie zusammenklappen.
    "collapsible": False,
}

DEFAULT_ITEM: Final[dict[str, Any]] = {
    "name": "",
    "icon": "",
    "hidden": False,
    "span": 1,
    "text_color": "",
    "icon_color": "",
    "background": "",
    # Schluessel der Zwischenueberschrift, unter der dieser Eintrag einsortiert
    # ist. Leer heisst: gehoert zu keiner.
    "parent": "",
}


# Ein PopUp-Link: wie ein Eintrag, dazu seine Links ({path, name, icon}).
DEFAULT_POPUP: Final[dict[str, Any]] = {
    **DEFAULT_ITEM,
    "links": [],
    # 1.5.3: Inhalt "links" oder "card", die Karte als YAML (zum Bearbeiten)
    # und als Konfiguration (fuer Home Assistant), Breite und Hoehe in px.
    "content": "links",
    "card_yaml": "",
    "card": {},
    "width": 0,
    "height": 0,
}


def default_config() -> dict[str, Any]:
    """Return a fresh default configuration."""
    return {
        "version": STORAGE_VERSION,
        "layout": dict(DEFAULT_LAYOUT),
        "appearance": dict(DEFAULT_APPEARANCE),
        "advanced": dict(DEFAULT_ADVANCED),
        # The links are a list - a fresh one, never the one of the defaults.
        "header": {**DEFAULT_HEADER, "links": []},
        # Fresh lists here as well, never the ones of the defaults.
        "settings": {
            **DEFAULT_SETTINGS,
            "menu_order": [],
            "menu_hidden": [],
            "favorites": [],
            "monitor_counts_items": list(COUNT_ITEMS),
            "menu_items": {},
            "monitor_sensors": [],
        },
        "theme": {
            "enabled": DEFAULT_THEME["enabled"],
            "name": DEFAULT_THEME["name"],
            "set_default": DEFAULT_THEME["set_default"],
            "dark": {},
            "light": {},
        },
        # Ordered list of item keys. The order in this list is the order in
        # the sidebar. Keys that are not listed keep their original position
        # after all listed ones.
        "order": [],
        # Per item overrides, keyed by item key.
        "items": {},
    }
