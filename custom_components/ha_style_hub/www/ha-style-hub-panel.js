/*
 * HA Style Hub - ha-style-hub-panel.js
 * Version: 1.5.6
 *
 * Configuration panel for the sidebar. Registered by the Python part of the
 * integration through panel_custom, so Home Assistant sets the properties
 * hass, narrow, route and panel on this element.
 *
 * Deliberately written as a plain custom element without Lit or any other
 * dependency: the file is delivered as is, there is no build step.
 *
 * Structure
 * ---------
 * _renderShell()   builds the static markup once
 * _renderItems()   rebuilds the entry list (only when the set of entries
 *                  changed, so typing never loses the input focus)
 * _preview()       sends the current configuration to the injector
 *                  (window event "ha-style-hub-preview") without saving
 * _save()          writes the configuration over the websocket API
 */

(() => {
  "use strict";

  const VERSION = "1.5.6";
  // Das Logo liegt neben dieser Datei im Ordner www (siehe URL_BASE in const.py).
  const LOGO_URL = `/ha_style_hub-static/ha-style-hub-logo.png?v=${VERSION}`;
  const EVENT_PREVIEW = "ha-style-hub-preview";
  const EVENT_RELOAD = "ha-style-hub-reload";

  if (customElements.get("ha-style-hub-panel")) {
    return;
  }

  /* ------------------------------------------------------------------ *
   * Defaults - keep in sync with const.py and ha-style-hub.js
   * ------------------------------------------------------------------ */

  const DEFAULT_LAYOUT = {
    // columns 1 and merge_fixed false keep a fresh installation looking
    // exactly like the stock sidebar, see const.py
    columns: 1,
    columns_collapsed: 1,
    item_style: "auto",
    gap: 6,
    width: 256,
    width_collapsed: 56,
    tile_height: 74,
    tile_height_collapsed: 0,
    tile_gap: 2,
    row_height: 40,
    row_height_collapsed: 0,
    merge_fixed: false,
    hide_scrollbar: false,
    hide_sidebar: false,
    show_restart: false,
  };

  const DEFAULT_APPEARANCE = {
    background: "",
    background_gradient: false,
    background_color2: "",
    gradient_direction: "to bottom",
    header_background: "",
    border_color: "",
    border_width: 0,
    text_color: "",
    text_color_selected: "",
    icon_color: "",
    icon_color_selected: "",
    font_size: 12,
    font_weight: "500",
    font_family: "",
    icon_size: 24,
    item_background: "",
    item_background_selected: "",
    hover_background: "",
    hover_opacity: 100,
    hover_text_color: "",
    hover_icon_color: "",
    item_border_color: "",
    item_border_width: 0,
    item_border_split: false,
    item_border_top: 0,
    item_border_right: 0,
    item_border_bottom: 0,
    item_border_left: 0,
    item_radius: 12,
    item_radius_split: false,
    item_radius_tl: 12,
    item_radius_tr: 12,
    item_radius_br: 12,
    item_radius_bl: 12,
    badge_background: "",
    badge_color: "",
    title: "",
    title_color: "",
    hide_title: false,
    hide_toggle: false,
    hide_labels_collapsed: true,
    style_notifications: false,
    notif_text_color: "",
    notif_header_color: "",
    custom_css: "",
  };

  const DEFAULT_ADVANCED = { debug: false, enabled: true };

  /**
   * Rahmen (kind "border") oder Ecken (kind "corner") einer Gruppe als CSS-Wert
   * fuer die Vorschau: "" = nichts gesetzt, sonst ein bis vier Werte in px.
   * Gleiche Regeln wie im Injektor; max verkleinert fuer die kleine Vorschau.
   */
  const frameValues = (cfg, prefix, kind, limit, cssFallback, max) => {
    const read = (key) => {
      const value = Number(cfg[key]);
      return cfg[key] === "" || cfg[key] === null || !Number.isFinite(value) ? -1 : value;
    };
    const px = (value) => `${Math.min(max, Math.max(0, Math.round(Math.min(limit, value))))}px`;
    const one = read(kind === "border" ? `${prefix}_border_width` : `${prefix}_border_radius`);
    const split = cfg[kind === "border" ? `${prefix}_border_split` : `${prefix}_corner_split`] === true;
    if (!split) {
      return one >= 0 ? px(one) : "";
    }
    const keys = kind === "border" ? ["top", "right", "bottom", "left"] : ["tl", "tr", "br", "bl"];
    const each = keys.map((key) => read(`${prefix}_${kind === "border" ? "side" : "corner"}_${key}`));
    if (one < 0 && each.every((value) => value < 0)) {
      return "";
    }
    return each
      .map((value) => (value >= 0 ? px(value) : one >= 0 ? px(one) : cssFallback))
      .join(" ");
  };

  // Einstellungen fuer Home Assistant selbst (Menuepunkt "HA-Settings") - siehe
  // const.py. icon_box: Symbole der Einstellungsseite als Boxen statt Kreise.
  // Zaehler-Box der Einstellungsseite (1.4.4), Reihenfolge wie im Injector
  const COUNT_ITEMS = [
    "devices", "entities", "integrations", "apps", "automations", "scenes",
    "scripts", "cards", "blueprints", "users", "tokens",
  ];

  const DEFAULT_SETTINGS = {
    icon_box: false,
    icon_radius: 12,
    icon_background: "",
    icon_color: "",
    icon_box_size: 0,
    icon_size: 0,
    list_view: false,
    list_row_height: 56,
    list_gap: 8,
    list_max_width: 0,
    list_two_columns: false,
    list_three_columns: false,
    list_border_width: -1,
    list_border_radius: -1,
    list_border_color: "",
    list_error_color: "",
    list_error_background: "",
    list_warning_background: "",
    list_problem_opacity: 100,
    list_background: "",
    list_hover_background: "",
    list_hover_opacity: 100,
    list_border_split: false,
    list_side_top: -1,
    list_side_right: -1,
    list_side_bottom: -1,
    list_side_left: -1,
    list_corner_split: false,
    list_corner_tl: -1,
    list_corner_tr: -1,
    list_corner_br: -1,
    list_corner_bl: -1,
    menu_border_width: -1,
    menu_border_split: false,
    menu_side_top: -1,
    menu_side_right: -1,
    menu_side_bottom: -1,
    menu_side_left: -1,
    menu_border_color: "",
    menu_border_radius: -1,
    menu_corner_split: false,
    menu_corner_tl: -1,
    menu_corner_tr: -1,
    menu_corner_br: -1,
    menu_corner_bl: -1,
    menu_hover_background: "",
    menu_hover_opacity: 100,
    list_apps: false,
    table_group_background: "",
    table_group_color: "",
    table_group_size: 0,
    table_group_weight: "",
    table_zebra: "",
    table_hover_background: "",
    table_hover_opacity: 100,
    table_font_size: 0,
    menu_order: [],
    menu_hidden: [],
    menu_columns: 1,
    menu_tiles: false,
    favorites: [],
    favorites_place: "page",
    monitor: false,
    monitor_place: "top",
    monitor_graphs: false,
    monitor_backup: false,
    monitor_backup_place: "top",
    hide_tip: false,
    table_row_background: "",
    monitor_counts: false,
    monitor_counts_place: "top",
    monitor_counts_items: COUNT_ITEMS.slice(),
    menu_items: {},
    monitor_sensors: [],
    monitor_backup_button: true,
    profile_page: true,
    list_entries: true,
    monitor_sensors_only: false,
    list_entries_row_height: 0,
  };

  // Ein Favorit der Einstellungsseite - siehe DEFAULT_FAVORITE in const.py.
  // Leere Farben und -1 heissen "wie vorgegeben", 0 ist ein echter Wert.
  const DEFAULT_FAVORITE = {
    path: "",
    name: "",
    icon: "",
    color: "",
    text_color: "",
    background: "",
    height: -1,
    border_color: "",
    border_width: -1,
    border_split: false,
    border_top: -1,
    border_right: -1,
    border_bottom: -1,
    border_left: -1,
    radius: -1,
    radius_split: false,
    radius_tl: -1,
    radius_tr: -1,
    radius_br: -1,
    radius_bl: -1,
    uppercase: false,
    icon_only: false,
  };
  const FAVORITES_PLACES = ["page", "header"];
  const MONITOR_PLACES = ["top", "end"];

  // Die Kopfzeile eines Dashboards - siehe const.py. Leer bzw. 0 heisst
  // immer "nicht anfassen".
  const DEFAULT_HEADER = {
    hidden: false,
    // 1.5.6: "top" (wie Home Assistant) oder "bottom"
    position: "top",
    height: 0,
    background: "",
    background_gradient: false,
    background_color2: "",
    gradient_direction: "to bottom",
    blur: 0,
    background_opacity: 100,
    text_color: "",
    font_size: 0,
    font_weight: "",
    icon_color: "",
    icon_size: 0,
    hide_add: false,
    hide_search: false,
    hide_assist: false,
    hide_edit: false,
    tab_color: "",
    tab_color_active: "",
    tab_indicator_color: "",
    actions_color: "",
    border_color: "",
    border_width: 0,
    border_split: false,
    border_top: 0,
    border_right: 0,
    border_bottom: 0,
    border_left: 0,
    radius: 0,
    radius_split: false,
    radius_tl: 0,
    radius_tr: 0,
    radius_br: 0,
    radius_bl: 0,
    element_border_width: 0,
    element_border_color: "",
    element_radius: 0,
    element_border_buttons: true,
    element_border_tabs: true,
    tab_hover_background: "",
    tab_hover_opacity: 100,
    show_restart: false,
    links: [],
    show_system: false,
    show_disk: false,
  };

  const DEFAULT_ITEM = {
    name: "",
    icon: "",
    hidden: false,
    span: 1,
    text_color: "",
    icon_color: "",
    background: "",
    parent: "",
  };

  const DEFAULT_THEME = {
    enabled: false,
    name: "HA Style Hub",
    set_default: false,
    dark: {},
    light: {},
  };

  /**
   * Fertige Looks fuer die Kopfzeile - dasselbe Prinzip wie die
   * Theme-Vorlagen: ein Satz Werte, der einmal in die Felder geschrieben
   * wird. "hidden" gehoert bewusst nicht dazu: ob die Leiste ueberhaupt zu
   * sehen ist, ist eine eigene Entscheidung und keine Frage des Aussehens.
   */
  const HEADER_PRESETS = [
    {
      id: "glass",
      de: "Glas",
      en: "Glass",
      de_hint: "Durchscheinend mit Weichzeichner",
      en_hint: "See-through with a blur",
      values: {
        background: "rgba(0,0,0,0.35)",
        blur: 14,
        text_color: "#ffffff",
        icon_color: "#ffffff",
        tab_color: "rgba(255,255,255,0.70)",
        tab_color_active: "#ffffff",
        tab_indicator_color: "#ffffff",
        border_color: "rgba(255,255,255,0.18)",
        border_split: true,
        border_top: 0,
        border_right: 0,
        border_bottom: 1,
        border_left: 0,
      },
    },
    {
      id: "slim",
      de: "Schlank",
      en: "Slim",
      de_hint: "Niedrig, kleine Icons",
      en_hint: "Low, small icons",
      values: {
        height: 44,
        icon_size: 20,
        font_size: 16,
        font_weight: "500",
        border_color: "rgba(127,127,127,0.35)",
        border_split: true,
        border_top: 0,
        border_right: 0,
        border_bottom: 1,
        border_left: 0,
      },
    },
    {
      id: "rounded",
      de: "Abgesetzt",
      en: "Detached",
      de_hint: "Farbige Leiste mit runden Ecken unten",
      en_hint: "Coloured bar with rounded bottom corners",
      values: {
        height: 60,
        background: "#1f2430",
        text_color: "#ffffff",
        icon_color: "#ffffff",
        tab_color: "rgba(255,255,255,0.65)",
        tab_color_active: "#ffffff",
        tab_indicator_color: "#ffffff",
        radius_split: true,
        radius_tl: 0,
        radius_tr: 0,
        radius_br: 18,
        radius_bl: 18,
      },
    },
  ];

  /**
   * Fertige Looks fuer die Theme-Seite.
   *
   * Eine Vorlage ist nichts weiter als ein Satz Werte fuer beide Modi - genau
   * das, was auch beim Import einer YAML-Datei in den Feldern landet. Sie wird
   * also nicht "aktiv", sondern einmal in die Felder geschrieben; ab da ist
   * alles ganz normal von Hand aenderbar.
   *
   * Nur Variablen, die wirklich etwas ausmachen, stehen hier drin. Alles, was
   * eine Vorlage nicht setzt, bleibt leer und damit bei dem Wert, den Home
   * Assistant selbst mitbringt.
   */
  const THEME_PRESETS = [
    {
      id: "glass",
      de: "Glas",
      en: "Glass",
      de_hint: "Durchscheinende Karten, weiche Kanten",
      en_hint: "Translucent cards, soft edges",
      dark: {
        "primary-color": "#4fc3f7",
        "light-primary-color": "#8bd4fa",
        "dark-primary-color": "#0288d1",
        "accent-color": "#4fc3f7",
        "divider-color": "rgba(255,255,255,0.10)",
        "outline-color": "rgba(255,255,255,0.14)",
        "primary-background-color": "#0e1116",
        "secondary-background-color": "#141922",
        "card-background-color": "rgba(255,255,255,0.06)",
        "ha-card-background": "rgba(255,255,255,0.06)",
        "clear-background-color": "#0e1116",
        "primary-text-color": "#e8edf5",
        "secondary-text-color": "#9fb0c4",
        "text-primary-color": "#0e1116",
        "disabled-text-color": "#5a6675",
        "app-header-background-color": "rgba(14,17,22,0.72)",
        "app-header-text-color": "#e8edf5",
        "ha-card-border-color": "rgba(255,255,255,0.14)",
        "ha-card-border-width": "1",
        "ha-card-border-radius": "18",
        "ha-card-box-shadow": "0 8px 28px rgba(0,0,0,0.35)",
        "state-icon-color": "#cfe3f5",
        "state-active-color": "#4fc3f7",
        "state-inactive-color": "#6b7a8c",
        "input-fill-color": "rgba(255,255,255,0.06)",
        "input-ink-color": "#e8edf5",
        "input-idle-line-color": "rgba(255,255,255,0.22)",
        "ha-dialog-surface-background": "#141922",
        "markdown-code-background-color": "rgba(255,255,255,0.08)",
        "code-editor-background-color": "#10151c",
        "scrollbar-thumb-color": "rgba(255,255,255,0.18)",
        "table-row-background-color": "rgba(255,255,255,0.03)",
        "table-row-alternative-background-color": "rgba(255,255,255,0.06)",
        "data-table-background-color": "rgba(255,255,255,0.04)",
        "slider-color": "#4fc3f7",
        "slider-track-color": "rgba(255,255,255,0.16)",
        "label-badge-background-color": "rgba(255,255,255,0.10)",
        "label-badge-text-color": "#e8edf5",
        "chip-background-color": "rgba(255,255,255,0.08)",
      },
      light: {
        "primary-color": "#0288d1",
        "light-primary-color": "#5eb8e8",
        "dark-primary-color": "#01579b",
        "accent-color": "#0288d1",
        "divider-color": "rgba(15,30,50,0.10)",
        "outline-color": "rgba(15,30,50,0.16)",
        "primary-background-color": "#eef3f8",
        "secondary-background-color": "#e3ebf3",
        "card-background-color": "rgba(255,255,255,0.72)",
        "ha-card-background": "rgba(255,255,255,0.72)",
        "clear-background-color": "#eef3f8",
        "primary-text-color": "#17222e",
        "secondary-text-color": "#5b6b7c",
        "text-primary-color": "#ffffff",
        "disabled-text-color": "#9aa7b4",
        "app-header-background-color": "rgba(238,243,248,0.78)",
        "app-header-text-color": "#17222e",
        "ha-card-border-color": "rgba(255,255,255,0.90)",
        "ha-card-border-width": "1",
        "ha-card-border-radius": "18",
        "ha-card-box-shadow": "0 8px 24px rgba(23,34,46,0.10)",
        "state-icon-color": "#44566a",
        "state-active-color": "#0288d1",
        "state-inactive-color": "#9aa7b4",
        "input-fill-color": "rgba(255,255,255,0.70)",
        "input-ink-color": "#17222e",
        "input-idle-line-color": "rgba(15,30,50,0.22)",
        "ha-dialog-surface-background": "#f7fafc",
        "markdown-code-background-color": "rgba(15,30,50,0.06)",
        "code-editor-background-color": "#f2f6fa",
        "scrollbar-thumb-color": "rgba(15,30,50,0.20)",
        "table-row-background-color": "rgba(255,255,255,0.60)",
        "table-row-alternative-background-color": "rgba(255,255,255,0.85)",
        "data-table-background-color": "rgba(255,255,255,0.70)",
        "slider-color": "#0288d1",
        "slider-track-color": "rgba(15,30,50,0.16)",
        "label-badge-background-color": "rgba(255,255,255,0.85)",
        "label-badge-text-color": "#17222e",
        "chip-background-color": "rgba(15,30,50,0.06)",
      },
    },
    {
      id: "contrast",
      de: "Kontrast",
      en: "Contrast",
      de_hint: "Kr\u00e4ftige Kanten, gut lesbar",
      en_hint: "Strong edges, easy to read",
      dark: {
        "primary-color": "#ffd60a",
        "light-primary-color": "#ffe566",
        "dark-primary-color": "#c9a800",
        "accent-color": "#ffd60a",
        "divider-color": "#ffffff",
        "outline-color": "#ffffff",
        "primary-background-color": "#000000",
        "secondary-background-color": "#0a0a0a",
        "card-background-color": "#101010",
        "ha-card-background": "#101010",
        "clear-background-color": "#000000",
        "primary-text-color": "#ffffff",
        "secondary-text-color": "#d6d6d6",
        "text-primary-color": "#000000",
        "disabled-text-color": "#7a7a7a",
        "app-header-background-color": "#000000",
        "app-header-text-color": "#ffffff",
        "app-header-border-bottom": "2px solid #ffffff",
        "ha-card-border-color": "#ffffff",
        "ha-card-border-width": "2",
        "ha-card-border-radius": "4",
        "ha-card-box-shadow": "none",
        "ha-card-header-color": "#ffd60a",
        "state-icon-color": "#ffffff",
        "state-active-color": "#ffd60a",
        "state-inactive-color": "#7a7a7a",
        "error-color": "#ff5252",
        "warning-color": "#ffb300",
        "success-color": "#00e676",
        "info-color": "#40c4ff",
        "input-fill-color": "#101010",
        "input-ink-color": "#ffffff",
        "input-idle-line-color": "#ffffff",
        "ha-dialog-surface-background": "#0a0a0a",
        "markdown-code-background-color": "#1a1a1a",
        "code-editor-background-color": "#0a0a0a",
        "scrollbar-thumb-color": "#ffffff",
        "table-row-background-color": "#000000",
        "table-row-alternative-background-color": "#141414",
        "data-table-background-color": "#000000",
        "slider-color": "#ffd60a",
        "slider-track-color": "#3a3a3a",
        "label-badge-background-color": "#ffd60a",
        "label-badge-text-color": "#000000",
        "chip-background-color": "#1a1a1a",
        "ha-font-weight-body": "500",
      },
      light: {
        "primary-color": "#0b3d91",
        "light-primary-color": "#4a6fbf",
        "dark-primary-color": "#06255c",
        "accent-color": "#0b3d91",
        "divider-color": "#000000",
        "outline-color": "#000000",
        "primary-background-color": "#ffffff",
        "secondary-background-color": "#f2f2f2",
        "card-background-color": "#ffffff",
        "ha-card-background": "#ffffff",
        "clear-background-color": "#ffffff",
        "primary-text-color": "#000000",
        "secondary-text-color": "#333333",
        "text-primary-color": "#ffffff",
        "disabled-text-color": "#8a8a8a",
        "app-header-background-color": "#ffffff",
        "app-header-text-color": "#000000",
        "app-header-border-bottom": "2px solid #000000",
        "ha-card-border-color": "#000000",
        "ha-card-border-width": "2",
        "ha-card-border-radius": "4",
        "ha-card-box-shadow": "none",
        "ha-card-header-color": "#0b3d91",
        "state-icon-color": "#000000",
        "state-active-color": "#0b3d91",
        "state-inactive-color": "#8a8a8a",
        "error-color": "#c62828",
        "warning-color": "#e65100",
        "success-color": "#1b5e20",
        "info-color": "#01579b",
        "input-fill-color": "#ffffff",
        "input-ink-color": "#000000",
        "input-idle-line-color": "#000000",
        "ha-dialog-surface-background": "#ffffff",
        "markdown-code-background-color": "#f2f2f2",
        "code-editor-background-color": "#f8f8f8",
        "scrollbar-thumb-color": "#000000",
        "table-row-background-color": "#ffffff",
        "table-row-alternative-background-color": "#f2f2f2",
        "data-table-background-color": "#ffffff",
        "slider-color": "#0b3d91",
        "slider-track-color": "#c4c4c4",
        "label-badge-background-color": "#0b3d91",
        "label-badge-text-color": "#ffffff",
        "chip-background-color": "#f2f2f2",
        "ha-font-weight-body": "500",
      },
    },
    {
      id: "flat",
      de: "Flach",
      en: "Flat",
      de_hint: "Ohne Schatten, ohne Rundungen",
      en_hint: "No shadows, no rounded corners",
      dark: {
        "primary-color": "#26a69a",
        "light-primary-color": "#64d8cb",
        "dark-primary-color": "#00766c",
        "accent-color": "#26a69a",
        "divider-color": "#2b3238",
        "outline-color": "#2b3238",
        "primary-background-color": "#1b2024",
        "secondary-background-color": "#222930",
        "card-background-color": "#222930",
        "ha-card-background": "#222930",
        "clear-background-color": "#1b2024",
        "primary-text-color": "#eceff1",
        "secondary-text-color": "#9aa5ad",
        "text-primary-color": "#10151a",
        "disabled-text-color": "#68757e",
        "app-header-background-color": "#1b2024",
        "app-header-text-color": "#eceff1",
        "ha-card-border-color": "#2b3238",
        "ha-card-border-width": "0",
        "ha-card-border-radius": "0",
        "ha-card-box-shadow": "none",
        "state-icon-color": "#b0bec5",
        "state-active-color": "#26a69a",
        "state-inactive-color": "#68757e",
        "input-fill-color": "#2a3138",
        "input-ink-color": "#eceff1",
        "input-idle-line-color": "#3c454d",
        "ha-dialog-surface-background": "#222930",
        "markdown-code-background-color": "#2a3138",
        "code-editor-background-color": "#1b2024",
        "scrollbar-thumb-color": "#3c454d",
        "table-row-background-color": "#222930",
        "table-row-alternative-background-color": "#262e35",
        "data-table-background-color": "#222930",
        "slider-color": "#26a69a",
        "slider-track-color": "#3c454d",
        "label-badge-background-color": "#26a69a",
        "label-badge-text-color": "#10151a",
        "chip-background-color": "#2a3138",
      },
      light: {
        "primary-color": "#00897b",
        "light-primary-color": "#4ebaaa",
        "dark-primary-color": "#005b4f",
        "accent-color": "#00897b",
        "divider-color": "#e0e0e0",
        "outline-color": "#e0e0e0",
        "primary-background-color": "#f5f5f5",
        "secondary-background-color": "#ffffff",
        "card-background-color": "#ffffff",
        "ha-card-background": "#ffffff",
        "clear-background-color": "#f5f5f5",
        "primary-text-color": "#212121",
        "secondary-text-color": "#616161",
        "text-primary-color": "#ffffff",
        "disabled-text-color": "#9e9e9e",
        "app-header-background-color": "#ffffff",
        "app-header-text-color": "#212121",
        "ha-card-border-color": "#e0e0e0",
        "ha-card-border-width": "0",
        "ha-card-border-radius": "0",
        "ha-card-box-shadow": "none",
        "state-icon-color": "#616161",
        "state-active-color": "#00897b",
        "state-inactive-color": "#9e9e9e",
        "input-fill-color": "#f0f0f0",
        "input-ink-color": "#212121",
        "input-idle-line-color": "#d0d0d0",
        "ha-dialog-surface-background": "#ffffff",
        "markdown-code-background-color": "#f0f0f0",
        "code-editor-background-color": "#fafafa",
        "scrollbar-thumb-color": "#c4c4c4",
        "table-row-background-color": "#ffffff",
        "table-row-alternative-background-color": "#f5f5f5",
        "data-table-background-color": "#ffffff",
        "slider-color": "#00897b",
        "slider-track-color": "#d0d0d0",
        "label-badge-background-color": "#00897b",
        "label-badge-text-color": "#ffffff",
        "chip-background-color": "#f0f0f0",
      },
    },
    {
      id: "warm",
      de: "Warm",
      en: "Warm",
      de_hint: "Erdige T\u00f6ne, weiches Licht",
      en_hint: "Earthy tones, soft light",
      dark: {
        "primary-color": "#e8833a",
        "light-primary-color": "#ffb066",
        "dark-primary-color": "#b05a15",
        "accent-color": "#e8b33a",
        "divider-color": "#3a322c",
        "outline-color": "#463d35",
        "primary-background-color": "#1a1614",
        "secondary-background-color": "#241f1b",
        "card-background-color": "#241f1b",
        "ha-card-background": "#241f1b",
        "clear-background-color": "#1a1614",
        "primary-text-color": "#f3ece4",
        "secondary-text-color": "#b6a595",
        "text-primary-color": "#1a1614",
        "disabled-text-color": "#7d6d5f",
        "app-header-background-color": "#1a1614",
        "app-header-text-color": "#f3ece4",
        "ha-card-border-color": "#3a322c",
        "ha-card-border-width": "1",
        "ha-card-border-radius": "14",
        "ha-card-box-shadow": "0 4px 16px rgba(0,0,0,0.30)",
        "ha-card-header-color": "#e8b33a",
        "state-icon-color": "#d8c4ae",
        "state-active-color": "#e8833a",
        "state-inactive-color": "#7d6d5f",
        "input-fill-color": "#2c2621",
        "input-ink-color": "#f3ece4",
        "input-idle-line-color": "#463d35",
        "ha-dialog-surface-background": "#241f1b",
        "markdown-code-background-color": "#2c2621",
        "code-editor-background-color": "#1a1614",
        "scrollbar-thumb-color": "#463d35",
        "table-row-background-color": "#241f1b",
        "table-row-alternative-background-color": "#2a2420",
        "data-table-background-color": "#241f1b",
        "slider-color": "#e8833a",
        "slider-track-color": "#463d35",
        "label-badge-background-color": "#e8833a",
        "label-badge-text-color": "#1a1614",
        "chip-background-color": "#2c2621",
      },
      light: {
        "primary-color": "#c2621b",
        "light-primary-color": "#e2955a",
        "dark-primary-color": "#8a4310",
        "accent-color": "#c28a1b",
        "divider-color": "#e6ddd2",
        "outline-color": "#ddd2c4",
        "primary-background-color": "#faf5ee",
        "secondary-background-color": "#fffbf6",
        "card-background-color": "#fffbf6",
        "ha-card-background": "#fffbf6",
        "clear-background-color": "#faf5ee",
        "primary-text-color": "#2e241c",
        "secondary-text-color": "#6d5c4c",
        "text-primary-color": "#fffbf6",
        "disabled-text-color": "#a89583",
        "app-header-background-color": "#faf5ee",
        "app-header-text-color": "#2e241c",
        "ha-card-border-color": "#e6ddd2",
        "ha-card-border-width": "1",
        "ha-card-border-radius": "14",
        "ha-card-box-shadow": "0 4px 14px rgba(46,36,28,0.08)",
        "ha-card-header-color": "#c2621b",
        "state-icon-color": "#6d5c4c",
        "state-active-color": "#c2621b",
        "state-inactive-color": "#a89583",
        "input-fill-color": "#f4ece1",
        "input-ink-color": "#2e241c",
        "input-idle-line-color": "#ddd2c4",
        "ha-dialog-surface-background": "#fffbf6",
        "markdown-code-background-color": "#f4ece1",
        "code-editor-background-color": "#faf5ee",
        "scrollbar-thumb-color": "#ccbcab",
        "table-row-background-color": "#fffbf6",
        "table-row-alternative-background-color": "#f7f0e7",
        "data-table-background-color": "#fffbf6",
        "slider-color": "#c2621b",
        "slider-track-color": "#ddd2c4",
        "label-badge-background-color": "#c2621b",
        "label-badge-text-color": "#fffbf6",
        "chip-background-color": "#f4ece1",
      },
    },
  ];

  /**
   * Every variable of the theme page, grouped exactly as it is shown.
   * Entry: [variable, german label, english label, type]
   * The type defaults to "color"; "text" is for everything that is not a
   * color (a radius, a shadow, a font stack).
   *
   * The variable names have to match THEME_VARIABLES in const.py - the backend
   * drops anything else, so a typo here would silently do nothing.
   */
  const THEME_GROUPS = [
    {
      de: "Grundfarben",
      en: "Base colors",
      fields: [
        ["primary-color", "Primärfarbe", "Primary color"],
        // Keine Hell-/Dunkel-Modus-Varianten, sondern ein hellerer und ein
        // dunklerer Ton derselben Primaerfarbe. Der helle ist der Hintergrund
        // der Benutzer-Abzeichen und die zweite Reglerfarbe, beide werden im
        // hellen wie im dunklen Modus gebraucht.
        ["light-primary-color", "Primärfarbe, heller Ton", "Primary color, light shade"],
        ["dark-primary-color", "Primärfarbe, dunkler Ton", "Primary color, dark shade"],
        ["accent-color", "Akzentfarbe", "Accent color"],
        ["divider-color", "Trennlinien", "Dividers"],
        ["outline-color", "Umrandungen", "Outlines"],
      ],
    },
    {
      de: "Hintergründe",
      en: "Backgrounds",
      fields: [
        ["primary-background-color", "Seitenhintergrund", "Page background"],
        ["secondary-background-color", "Zweiter Hintergrund", "Secondary background"],
        ["card-background-color", "Kartenhintergrund", "Card background"],
        ["clear-background-color", "Freie Fläche", "Clear background"],
        ["ha-card-background", "Karten, abweichend", "Cards, override"],
      ],
    },
    {
      // Rendered by _themeDashboard(): gradient and image upload come on top
      // of the one variable.
      id: "dashboard",
      de: "Dashboard-Hintergrund",
      en: "Dashboard background",
      hint_de:
        "Hintergrund der Dashboard-Ansichten, die keinen eigenen haben: eine Farbe, ein Farbverlauf aus zwei Farben oder ein Bild, das du hier direkt auswählst. Ein Bild liegt über der Farbe bzw. dem Verlauf. Solange weder Verlauf noch Bild aktiv sind, darf das Feld auch ein fertiger CSS-Hintergrund sein. Leer heißt: Seitenhintergrund.",
      hint_en:
        "Background of the dashboard views that do not have their own: a color, a two color gradient or an image you pick right here. An image sits on top of the color or gradient. While neither a gradient nor an image is active, the field may also hold a ready made CSS background. Empty means: page background.",
      fields: [
        ["lovelace-background", "Farbe (beim Verlauf: erste Farbe)", "Color (first color of a gradient)"],
      ],
    },
    {
      de: "Text",
      en: "Text",
      fields: [
        ["primary-text-color", "Textfarbe", "Text color"],
        ["secondary-text-color", "Textfarbe, zweite", "Text color, secondary"],
        ["text-primary-color", "Text auf Primärfarbe", "Text on primary color"],
        ["disabled-text-color", "Text, inaktiv", "Text, disabled"],
      ],
    },
    {
      de: "Kopfzeile",
      en: "Header",
      fields: [
        ["app-header-background-color", "Hintergrund", "Background"],
        ["app-header-text-color", "Text und Icons", "Text and icons"],
        ["app-header-border-bottom", "Linie darunter", "Border below", "text"],
        ["app-theme-color", "Browser-Farbe", "Browser color"],
        ["app-header-edit-background-color", "Bearbeiten: Hintergrund", "Edit mode: background"],
        ["app-header-edit-text-color", "Bearbeiten: Text und Icons", "Edit mode: text and icons"],
        ["app-header-backdrop-filter", "Filter hinter der Kopfzeile (CSS)", "Filter behind the header (CSS)", "text"],
      ],
    },
    {
      de: "Seitenleiste",
      en: "Sidebar",
      fields: [
        ["sidebar-background-color", "Hintergrund", "Background"],
        ["sidebar-text-color", "Text der Einträge", "Entry text"],
        ["sidebar-icon-color", "Icons", "Icons"],
        ["sidebar-selected-icon-color", "Gewählter Eintrag (Icon, Text, Markierung)", "Selected entry (icon, text, highlight)"],
        ["sidebar-menu-button-background-color", "Kopfbereich: Hintergrund", "Top area: background"],
        ["sidebar-menu-button-text-color", "Kopfbereich: Titel", "Top area: title"],
      ],
    },
    {
      // Rendered by _themeCards(): border and radius can be set per side and
      // per corner, which needs more than the plain field grid.
      id: "cards",
      // "Cards" auch auf Deutsch: so heissen sie in Home Assistant ueberall.
      de: "Cards",
      en: "Cards",
      fields: [
        ["ha-card-border-color", "Rahmenfarbe", "Border color"],
        ["ha-card-box-shadow", "Schatten", "Shadow", "text"],
        ["ha-card-header-color", "Kartentitel", "Card title"],
        ["ha-card-header-font-size", "Titelgröße (px)", "Title size (px)", "text"],
        ["ha-card-border-width", "Rahmenbreite (px)", "Border width (px)", "text"],
        ["ha-card-border-radius", "Eckenradius (px)", "Corner radius (px)", "text"],
      ],
    },
    {
      de: "Schrift",
      en: "Typography",
      fields: [
        ["ha-font-family-body", "Schriftart", "Font family", "select"],
        ["ha-font-size-scale", "Schriftskalierung", "Font scale", "select"],
        ["ha-font-weight-body", "Schriftstärke", "Font weight", "select"],
      ],
    },
    {
      de: "Zustände und Icons",
      en: "States and icons",
      fields: [
        ["state-icon-color", "Icon, normal", "Icon, normal"],
        ["state-active-color", "Icon, aktiv", "Icon, active"],
        ["state-inactive-color", "Icon, inaktiv", "Icon, inactive"],
        ["state-unavailable-color", "Icon, nicht verfügbar", "Icon, unavailable"],
      ],
    },
    {
      de: "Zustandsfarben: Geräte",
      en: "State colors: devices",
      hint_de:
        "Farbe von Icon und Kachel, solange das Gerät aktiv ist. Leer heißt: Farbe von Home Assistant. Licht, Schalter und die anderen Typen hier haben bei Home Assistant eine eigene Standardfarbe und folgen „Icon, aktiv“ aus der Gruppe darüber nicht; diese Farbe gilt nur für Typen ohne eigene.",
      hint_en:
        "Color of icon and tile while the device is active. Empty means: Home Assistant's own color. Lights, switches and the other types here have a default color of their own in Home Assistant and do not follow “Icon, active” from the group above; that one only applies to types without their own.",
      fields: [
        ["state-light-active-color", "Licht an", "Light on"],
        ["state-switch-active-color", "Schalter an", "Switch on"],
        ["state-fan-active-color", "Lüfter an", "Fan on"],
        ["state-media_player-active-color", "Mediaplayer aktiv", "Media player active"],
        ["state-cover-active-color", "Rollladen / Abdeckung offen", "Cover open"],
        ["state-vacuum-active-color", "Saugroboter aktiv", "Vacuum active"],
        ["state-binary_sensor-active-color", "Binärsensor aktiv", "Binary sensor active"],
        ["state-person-home-color", "Person zu Hause", "Person at home"],
      ],
    },
    {
      de: "Zustandsfarben: Klima",
      en: "State colors: climate",
      fields: [
        ["state-climate-heat-color", "Heizen", "Heating"],
        ["state-climate-cool-color", "Kühlen", "Cooling"],
        ["state-climate-dry-color", "Entfeuchten", "Drying"],
        ["state-climate-fan_only-color", "Nur Lüfter", "Fan only"],
        ["state-climate-auto-color", "Automatik", "Auto"],
      ],
    },
    {
      de: "Zustandsfarben: Sicherheit",
      en: "State colors: security",
      fields: [
        ["state-lock-locked-color", "Schloss verriegelt", "Lock locked"],
        ["state-lock-unlocked-color", "Schloss entriegelt", "Lock unlocked"],
        ["state-lock-jammed-color", "Schloss klemmt", "Lock jammed"],
        ["state-alarm_control_panel-armed_home-color", "Alarm scharf, zu Hause", "Alarm armed, home"],
        ["state-alarm_control_panel-armed_away-color", "Alarm scharf, abwesend", "Alarm armed, away"],
        ["state-alarm_control_panel-armed_night-color", "Alarm scharf, Nacht", "Alarm armed, night"],
        ["state-alarm_control_panel-pending-color", "Alarm wartet", "Alarm pending"],
        ["state-alarm_control_panel-triggered-color", "Alarm ausgelöst", "Alarm triggered"],
      ],
    },
    {
      de: "Zustandsfarben: Wetter",
      en: "State colors: weather",
      hint_de: "Farbe des Wetter-Icons je Zustand (Wetterkarte, Kacheln, Badges).",
      hint_en: "Color of the weather icon per condition (weather card, tiles, badges).",
      fields: [
        ["state-weather-clear_night-color", "Klare Nacht", "Clear night"],
        ["state-weather-cloudy-color", "Bewölkt", "Cloudy"],
        ["state-weather-exceptional-color", "Außergewöhnlich", "Exceptional"],
        ["state-weather-fog-color", "Nebel", "Fog"],
        ["state-weather-hail-color", "Hagel", "Hail"],
        ["state-weather-lightning-color", "Gewitter", "Lightning"],
        ["state-weather-lightning_rainy-color", "Gewitter mit Regen", "Lightning, rainy"],
        ["state-weather-partlycloudy-color", "Teilweise bewölkt", "Partly cloudy"],
        ["state-weather-pouring-color", "Starkregen", "Pouring"],
        ["state-weather-rainy-color", "Regen", "Rainy"],
        ["state-weather-snowy-color", "Schnee", "Snowy"],
        ["state-weather-snowy_rainy-color", "Schneeregen", "Snowy, rainy"],
        ["state-weather-sunny-color", "Sonnig", "Sunny"],
        ["state-weather-windy-color", "Windig", "Windy"],
        ["state-weather-windy_variant-color", "Windig und bewölkt", "Windy, cloudy"],
      ],
    },
    {
      de: "Statusfarben",
      en: "Status colors",
      fields: [
        ["error-color", "Fehler", "Error"],
        ["warning-color", "Warnung", "Warning"],
        ["success-color", "Erfolg", "Success"],
        ["info-color", "Hinweis", "Info"],
      ],
    },
    {
      de: "Tabellen und Eingaben",
      en: "Tables and inputs",
      fields: [
        ["table-row-background-color", "Tabellenzeile", "Table row"],
        ["table-row-alternative-background-color", "Tabellenzeile, zweite", "Table row, alternate"],
        ["data-table-background-color", "Tabellenhintergrund", "Table background"],
        ["input-fill-color", "Eingabefeld", "Input field"],
        ["input-ink-color", "Eingabetext", "Input text"],
        ["input-idle-line-color", "Eingabelinie", "Input line"],
        ["table-header-background-color", "Tabellenkopf", "Table header"],
        ["input-label-ink-color", "Beschriftung im Eingabefeld", "Input label"],
        ["input-dropdown-icon-color", "Pfeil der Auswahlliste", "Dropdown arrow"],
      ],
    },
    {
      de: "Dialoge und Code",
      en: "Dialogs and code",
      fields: [
        ["ha-dialog-surface-background", "Dialogfläche", "Dialog surface"],
        ["mdc-dialog-scrim-color", "Hintergrund hinter Dialogen", "Backdrop behind dialogs"],
        ["markdown-code-background-color", "Code in Markdown", "Code in markdown"],
        ["code-editor-background-color", "Code-Editor", "Code editor"],
        ["scrollbar-thumb-color", "Scrollbalken", "Scrollbar"],
        ["ha-dialog-scrim-backdrop-filter", "Filter hinter Dialogen (CSS)", "Filter behind dialogs (CSS)", "text"],
      ],
    },
    {
      de: "Code-Editor",
      en: "Code editor",
      hint_de: "Syntaxfarben im YAML- und Template-Editor. Home Assistant setzt sie nur im dunklen Modus selbst, im hellen gelten die Farben des Editors.",
      hint_en: "Syntax colors of the YAML and template editor. Home Assistant only sets them itself in dark mode; in light mode the editor's own colors apply.",
      fields: [
        ["codemirror-keyword", "Schlüsselwort", "Keyword"],
        ["codemirror-operator", "Operator", "Operator"],
        ["codemirror-variable", "Variable", "Variable"],
        ["codemirror-variable-2", "Variable 2", "Variable 2"],
        ["codemirror-def", "Definition", "Definition"],
        ["codemirror-atom", "Atom (true, null …)", "Atom (true, null …)"],
        ["codemirror-number", "Zahl", "Number"],
        ["codemirror-string", "Text", "String"],
        ["codemirror-string2", "Eingefügter Text", "Inserted text"],
        ["codemirror-comment", "Kommentar", "Comment"],
        ["codemirror-meta", "Meta", "Meta"],
        ["codemirror-property", "Eigenschaft", "Property"],
        ["codemirror-qualifier", "Qualifier", "Qualifier"],
      ],
    },
    {
      de: "Regler und Badges",
      en: "Sliders and badges",
      fields: [
        ["slider-color", "Regler", "Slider"],
        ["slider-track-color", "Reglerschiene", "Slider track"],
        ["label-badge-background-color", "Badge Hintergrund", "Badge background"],
        ["label-badge-text-color", "Badge Text", "Badge text"],
        ["chip-background-color", "Chip Hintergrund", "Chip background"],
        ["label-badge-red", "Badge rot", "Badge red"],
        ["label-badge-blue", "Badge blau", "Badge blue"],
        ["label-badge-green", "Badge grün", "Badge green"],
        ["label-badge-yellow", "Badge gelb", "Badge yellow"],
        ["label-badge-grey", "Badge grau", "Badge grey"],
      ],
    },
    {
      id: "charts",
      de: "Diagramme",
      en: "Charts",
      compact: true,
      hint_de: "Farben der Verlaufs- und Statistik-Diagramme (Linien, Balken, Energie-Grafiken nutzen eigene Farben). Home Assistant nimmt sie der Reihe nach für jede Linie; ab Farbe 55 beginnt es wieder bei 1.",
      hint_en: "Colors of the history and statistics charts (the energy charts have their own colors below). Home Assistant takes them in order, one per line; after color 54 it starts again with 1.",
      fields: [
        ["history-unavailable-color", "Verlauf: nicht verfügbar", "History: unavailable"],
        ["history-unknown-color", "Verlauf: unbekannt", "History: unknown"],
        ["color-1", "Farbe 1", "Color 1"],
        ["color-2", "Farbe 2", "Color 2"],
        ["color-3", "Farbe 3", "Color 3"],
        ["color-4", "Farbe 4", "Color 4"],
        ["color-5", "Farbe 5", "Color 5"],
        ["color-6", "Farbe 6", "Color 6"],
        ["color-7", "Farbe 7", "Color 7"],
        ["color-8", "Farbe 8", "Color 8"],
        ["color-9", "Farbe 9", "Color 9"],
        ["color-10", "Farbe 10", "Color 10"],
        ["color-11", "Farbe 11", "Color 11"],
        ["color-12", "Farbe 12", "Color 12"],
        ["color-13", "Farbe 13", "Color 13"],
        ["color-14", "Farbe 14", "Color 14"],
        ["color-15", "Farbe 15", "Color 15"],
        ["color-16", "Farbe 16", "Color 16"],
        ["color-17", "Farbe 17", "Color 17"],
        ["color-18", "Farbe 18", "Color 18"],
        ["color-19", "Farbe 19", "Color 19"],
        ["color-20", "Farbe 20", "Color 20"],
        ["color-21", "Farbe 21", "Color 21"],
        ["color-22", "Farbe 22", "Color 22"],
        ["color-23", "Farbe 23", "Color 23"],
        ["color-24", "Farbe 24", "Color 24"],
        ["color-25", "Farbe 25", "Color 25"],
        ["color-26", "Farbe 26", "Color 26"],
        ["color-27", "Farbe 27", "Color 27"],
        ["color-28", "Farbe 28", "Color 28"],
        ["color-29", "Farbe 29", "Color 29"],
        ["color-30", "Farbe 30", "Color 30"],
        ["color-31", "Farbe 31", "Color 31"],
        ["color-32", "Farbe 32", "Color 32"],
        ["color-33", "Farbe 33", "Color 33"],
        ["color-34", "Farbe 34", "Color 34"],
        ["color-35", "Farbe 35", "Color 35"],
        ["color-36", "Farbe 36", "Color 36"],
        ["color-37", "Farbe 37", "Color 37"],
        ["color-38", "Farbe 38", "Color 38"],
        ["color-39", "Farbe 39", "Color 39"],
        ["color-40", "Farbe 40", "Color 40"],
        ["color-41", "Farbe 41", "Color 41"],
        ["color-42", "Farbe 42", "Color 42"],
        ["color-43", "Farbe 43", "Color 43"],
        ["color-44", "Farbe 44", "Color 44"],
        ["color-45", "Farbe 45", "Color 45"],
        ["color-46", "Farbe 46", "Color 46"],
        ["color-47", "Farbe 47", "Color 47"],
        ["color-48", "Farbe 48", "Color 48"],
        ["color-49", "Farbe 49", "Color 49"],
        ["color-50", "Farbe 50", "Color 50"],
        ["color-51", "Farbe 51", "Color 51"],
        ["color-52", "Farbe 52", "Color 52"],
        ["color-53", "Farbe 53", "Color 53"],
        ["color-54", "Farbe 54", "Color 54"],
      ],
    },
    {
      de: "Energie",
      en: "Energy",
      hint_de: "Farben im Energie-Dashboard: Verteilung, Diagramme und Quellen.",
      hint_en: "Colors of the energy dashboard: distribution, charts and sources.",
      fields: [
        ["energy-grid-consumption-color", "Netzbezug", "Grid consumption"],
        ["energy-grid-return-color", "Einspeisung", "Grid return"],
        ["energy-solar-color", "Solar", "Solar"],
        ["energy-battery-out-color", "Batterie entladen", "Battery out"],
        ["energy-battery-in-color", "Batterie laden", "Battery in"],
        ["energy-non-fossil-color", "Nicht-fossil", "Non-fossil"],
        ["energy-gas-color", "Gas", "Gas"],
        ["energy-water-color", "Wasser", "Water"],
      ],
    },
    {
      de: "Design-Tokens: Text und Flächen",
      en: "Design tokens: text and surfaces",
      hint_de: "Die neue Farbebene von Home Assistant (--ha-color-…): neuere Bedienelemente wie Eingabefelder, Buttons und Dialoge nehmen ihre Farben von hier. Leer heißt: abgeleitet aus der Skala der Primärfarbe und den Grautönen.",
      hint_en: "Home Assistant's new color layer (--ha-color-…): newer controls such as input fields, buttons and dialogs take their colors from here. Empty means: derived from the primary color scale and the greys.",
      fields: [
        ["ha-color-text-primary", "Text", "Text"],
        ["ha-color-text-secondary", "Text, zweitrangig", "Text, secondary"],
        ["ha-color-text-disabled", "Text, deaktiviert", "Text, disabled"],
        ["ha-color-surface-default", "Fläche", "Surface"],
        ["ha-color-surface-low", "Fläche, tiefer", "Surface, low"],
        ["ha-color-on-surface-default", "Inhalt auf Fläche", "Content on surface"],
        ["ha-color-form-background", "Eingabefeld", "Input field"],
        ["ha-color-form-background-hover", "Eingabefeld, Hover", "Input field, hover"],
        ["ha-color-form-background-disabled", "Eingabefeld, deaktiviert", "Input field, disabled"],
        ["ha-color-focus", "Fokus", "Focus"],
        ["ha-color-shadow-scrollable-fade", "Schatten beim Scrollen", "Scroll shadow"],
      ],
    },
    {
      de: "Design-Tokens: Rahmen",
      en: "Design tokens: borders",
      compact: true,
      fields: [
        ["ha-color-border-primary-quiet", "Rahmen Primär, leise", "Border primary, quiet"],
        ["ha-color-border-primary-loud", "Rahmen Primär, kräftig", "Border primary, loud"],
        ["ha-color-border-neutral-quiet", "Rahmen Neutral, leise", "Border neutral, quiet"],
        ["ha-color-border-neutral-normal", "Rahmen Neutral, normal", "Border neutral, normal"],
        ["ha-color-border-neutral-loud", "Rahmen Neutral, kräftig", "Border neutral, loud"],
        ["ha-color-border-danger-quiet", "Rahmen Gefahr, leise", "Border danger, quiet"],
        ["ha-color-border-danger-normal", "Rahmen Gefahr, normal", "Border danger, normal"],
        ["ha-color-border-danger-loud", "Rahmen Gefahr, kräftig", "Border danger, loud"],
        ["ha-color-border-warning-quiet", "Rahmen Warnung, leise", "Border warning, quiet"],
        ["ha-color-border-warning-normal", "Rahmen Warnung, normal", "Border warning, normal"],
        ["ha-color-border-warning-loud", "Rahmen Warnung, kräftig", "Border warning, loud"],
        ["ha-color-border-success-quiet", "Rahmen Erfolg, leise", "Border success, quiet"],
        ["ha-color-border-success-normal", "Rahmen Erfolg, normal", "Border success, normal"],
        ["ha-color-border-success-loud", "Rahmen Erfolg, kräftig", "Border success, loud"],
      ],
    },
    {
      de: "Design-Tokens: Füllungen",
      en: "Design tokens: fills",
      compact: true,
      hint_de: "Flächen von Buttons, Chips und Schaltern je Bedeutung (Primär, Neutral, Gefahr …), in drei Stärken und den Zuständen Ruhe, Hover und gedrückt.",
      hint_en: "Fills of buttons, chips and switches per meaning (primary, neutral, danger …), in three strengths and the states resting, hover and pressed.",
      fields: [
        ["ha-color-fill-primary-quiet-resting", "Primär, leise, Ruhe", "Primary, quiet, resting"],
        ["ha-color-fill-primary-quiet-hover", "Primär, leise, Hover", "Primary, quiet, hover"],
        ["ha-color-fill-primary-quiet-active", "Primär, leise, gedrückt", "Primary, quiet, pressed"],
        ["ha-color-fill-primary-normal-resting", "Primär, normal, Ruhe", "Primary, normal, resting"],
        ["ha-color-fill-primary-normal-hover", "Primär, normal, Hover", "Primary, normal, hover"],
        ["ha-color-fill-primary-normal-active", "Primär, normal, gedrückt", "Primary, normal, pressed"],
        ["ha-color-fill-primary-loud-resting", "Primär, kräftig, Ruhe", "Primary, loud, resting"],
        ["ha-color-fill-primary-loud-hover", "Primär, kräftig, Hover", "Primary, loud, hover"],
        ["ha-color-fill-primary-loud-active", "Primär, kräftig, gedrückt", "Primary, loud, pressed"],
        ["ha-color-fill-neutral-quiet-resting", "Neutral, leise, Ruhe", "Neutral, quiet, resting"],
        ["ha-color-fill-neutral-quiet-hover", "Neutral, leise, Hover", "Neutral, quiet, hover"],
        ["ha-color-fill-neutral-normal-resting", "Neutral, normal, Ruhe", "Neutral, normal, resting"],
        ["ha-color-fill-neutral-normal-hover", "Neutral, normal, Hover", "Neutral, normal, hover"],
        ["ha-color-fill-neutral-normal-active", "Neutral, normal, gedrückt", "Neutral, normal, pressed"],
        ["ha-color-fill-neutral-loud-resting", "Neutral, kräftig, Ruhe", "Neutral, loud, resting"],
        ["ha-color-fill-neutral-loud-hover", "Neutral, kräftig, Hover", "Neutral, loud, hover"],
        ["ha-color-fill-neutral-loud-active", "Neutral, kräftig, gedrückt", "Neutral, loud, pressed"],
        ["ha-color-fill-disabled-quiet-resting", "Deaktiviert, leise, Ruhe", "Disabled, quiet, resting"],
        ["ha-color-fill-disabled-quiet-hover", "Deaktiviert, leise, Hover", "Disabled, quiet, hover"],
        ["ha-color-fill-disabled-normal-resting", "Deaktiviert, normal, Ruhe", "Disabled, normal, resting"],
        ["ha-color-fill-disabled-loud-resting", "Deaktiviert, kräftig, Ruhe", "Disabled, loud, resting"],
        ["ha-color-fill-danger-quiet-resting", "Gefahr, leise, Ruhe", "Danger, quiet, resting"],
        ["ha-color-fill-danger-quiet-hover", "Gefahr, leise, Hover", "Danger, quiet, hover"],
        ["ha-color-fill-danger-quiet-active", "Gefahr, leise, gedrückt", "Danger, quiet, pressed"],
        ["ha-color-fill-danger-normal-resting", "Gefahr, normal, Ruhe", "Danger, normal, resting"],
        ["ha-color-fill-danger-normal-hover", "Gefahr, normal, Hover", "Danger, normal, hover"],
        ["ha-color-fill-danger-normal-active", "Gefahr, normal, gedrückt", "Danger, normal, pressed"],
        ["ha-color-fill-danger-loud-resting", "Gefahr, kräftig, Ruhe", "Danger, loud, resting"],
        ["ha-color-fill-danger-loud-hover", "Gefahr, kräftig, Hover", "Danger, loud, hover"],
        ["ha-color-fill-danger-loud-active", "Gefahr, kräftig, gedrückt", "Danger, loud, pressed"],
        ["ha-color-fill-warning-quiet-resting", "Warnung, leise, Ruhe", "Warning, quiet, resting"],
        ["ha-color-fill-warning-quiet-hover", "Warnung, leise, Hover", "Warning, quiet, hover"],
        ["ha-color-fill-warning-quiet-active", "Warnung, leise, gedrückt", "Warning, quiet, pressed"],
        ["ha-color-fill-warning-normal-resting", "Warnung, normal, Ruhe", "Warning, normal, resting"],
        ["ha-color-fill-warning-normal-hover", "Warnung, normal, Hover", "Warning, normal, hover"],
        ["ha-color-fill-warning-normal-active", "Warnung, normal, gedrückt", "Warning, normal, pressed"],
        ["ha-color-fill-warning-loud-resting", "Warnung, kräftig, Ruhe", "Warning, loud, resting"],
        ["ha-color-fill-warning-loud-hover", "Warnung, kräftig, Hover", "Warning, loud, hover"],
        ["ha-color-fill-warning-loud-active", "Warnung, kräftig, gedrückt", "Warning, loud, pressed"],
        ["ha-color-fill-success-quiet-resting", "Erfolg, leise, Ruhe", "Success, quiet, resting"],
        ["ha-color-fill-success-quiet-hover", "Erfolg, leise, Hover", "Success, quiet, hover"],
        ["ha-color-fill-success-quiet-active", "Erfolg, leise, gedrückt", "Success, quiet, pressed"],
        ["ha-color-fill-success-normal-resting", "Erfolg, normal, Ruhe", "Success, normal, resting"],
        ["ha-color-fill-success-normal-hover", "Erfolg, normal, Hover", "Success, normal, hover"],
        ["ha-color-fill-success-normal-active", "Erfolg, normal, gedrückt", "Success, normal, pressed"],
        ["ha-color-fill-success-loud-resting", "Erfolg, kräftig, Ruhe", "Success, loud, resting"],
        ["ha-color-fill-success-loud-hover", "Erfolg, kräftig, Hover", "Success, loud, hover"],
        ["ha-color-fill-success-loud-active", "Erfolg, kräftig, gedrückt", "Success, loud, pressed"],
      ],
    },
    {
      de: "Design-Tokens: Inhalt auf Füllungen",
      en: "Design tokens: content on fills",
      compact: true,
      hint_de: "Text- und Icon-Farbe auf den Füllungen darüber.",
      hint_en: "Text and icon color on the fills above.",
      fields: [
        ["ha-color-on-primary-quiet", "Auf Primär, leise", "On primary, quiet"],
        ["ha-color-on-primary-normal", "Auf Primär, normal", "On primary, normal"],
        ["ha-color-on-primary-loud", "Auf Primär, kräftig", "On primary, loud"],
        ["ha-color-on-neutral-quiet", "Auf Neutral, leise", "On neutral, quiet"],
        ["ha-color-on-neutral-normal", "Auf Neutral, normal", "On neutral, normal"],
        ["ha-color-on-neutral-loud", "Auf Neutral, kräftig", "On neutral, loud"],
        ["ha-color-on-disabled-quiet", "Auf Deaktiviert, leise", "On disabled, quiet"],
        ["ha-color-on-disabled-normal", "Auf Deaktiviert, normal", "On disabled, normal"],
        ["ha-color-on-disabled-loud", "Auf Deaktiviert, kräftig", "On disabled, loud"],
        ["ha-color-on-danger-quiet", "Auf Gefahr, leise", "On danger, quiet"],
        ["ha-color-on-danger-normal", "Auf Gefahr, normal", "On danger, normal"],
        ["ha-color-on-danger-loud", "Auf Gefahr, kräftig", "On danger, loud"],
        ["ha-color-on-warning-quiet", "Auf Warnung, leise", "On warning, quiet"],
        ["ha-color-on-warning-normal", "Auf Warnung, normal", "On warning, normal"],
        ["ha-color-on-warning-loud", "Auf Warnung, kräftig", "On warning, loud"],
        ["ha-color-on-success-quiet", "Auf Erfolg, leise", "On success, quiet"],
        ["ha-color-on-success-normal", "Auf Erfolg, normal", "On success, normal"],
        ["ha-color-on-success-loud", "Auf Erfolg, kräftig", "On success, loud"],
      ],
    },
    {
      de: "Design-Tokens: Ecken und Schatten",
      en: "Design tokens: corners and shadows",
      hint_de: "Eckenradien, Rahmenbreiten und Schatten, die Home Assistant für seine Bausteine nutzt. Eine Zahl heißt Pixel.",
      hint_en: "Corner radii, border widths and shadows Home Assistant uses for its building blocks. A plain number means pixels.",
      fields: [
        ["ha-border-radius-sm", "Ecken SM (px)", "Corners SM (px)", "text"],
        ["ha-border-radius-md", "Ecken MD (px)", "Corners MD (px)", "text"],
        ["ha-border-radius-lg", "Ecken LG (px)", "Corners LG (px)", "text"],
        ["ha-border-radius-xl", "Ecken XL (px)", "Corners XL (px)", "text"],
        ["ha-border-radius-2xl", "Ecken 2XL (px)", "Corners 2XL (px)", "text"],
        ["ha-border-radius-3xl", "Ecken 3XL (px)", "Corners 3XL (px)", "text"],
        ["ha-border-radius-4xl", "Ecken 4XL (px)", "Corners 4XL (px)", "text"],
        ["ha-border-radius-6xl", "Ecken 6XL (px)", "Corners 6XL (px)", "text"],
        ["ha-border-radius-pill", "Ecken „Pille“ (px)", "Corners “pill” (px)", "text"],
        ["ha-border-width-sm", "Rahmenbreite SM (px)", "Border width SM (px)", "text"],
        ["ha-border-width-md", "Rahmenbreite MD (px)", "Border width MD (px)", "text"],
        ["ha-border-width-lg", "Rahmenbreite LG (px)", "Border width LG (px)", "text"],
        ["ha-box-shadow-s", "Schatten S", "Shadow S", "text"],
        ["ha-box-shadow-m", "Schatten M", "Shadow M", "text"],
        ["ha-box-shadow-l", "Schatten L", "Shadow L", "text"],
      ],
    },
    {
      de: "Schalter",
      en: "Switches",
      hint_de: "Die Schalter (ha-switch) unabhängig von den Design-Tokens. Leer heißt: aus der Skala der Primärfarbe.",
      hint_en: "The switches (ha-switch) independent of the design tokens. Empty means: from the primary color scale.",
      fields: [
        ["ha-switch-checked-background-color", "An: Fläche", "On: track"],
        ["ha-switch-checked-background-color-hover", "An: Fläche, Hover", "On: track, hover"],
        ["ha-switch-checked-border-color", "An: Rand", "On: border"],
        ["ha-switch-checked-border-color-hover", "An: Rand, Hover", "On: border, hover"],
        ["ha-switch-checked-thumb-background-color", "An: Knopf", "On: thumb"],
        ["ha-switch-checked-thumb-background-color-hover", "An: Knopf, Hover", "On: thumb, hover"],
        ["ha-switch-checked-thumb-border-color", "An: Knopfrand", "On: thumb border"],
        ["ha-switch-checked-thumb-border-color-hover", "An: Knopfrand, Hover", "On: thumb border, hover"],
        ["ha-switch-background-color", "Aus: Fläche", "Off: track"],
        ["ha-switch-background-color-hover", "Aus: Fläche, Hover", "Off: track, hover"],
        ["ha-switch-border-color", "Aus: Rand", "Off: border"],
        ["ha-switch-thumb-background-color", "Aus: Knopf", "Off: thumb"],
        ["ha-switch-thumb-background-color-hover", "Aus: Knopf, Hover", "Off: thumb, hover"],
        ["ha-switch-thumb-border-color", "Aus: Knopfrand", "Off: thumb border"],
        ["ha-switch-thumb-border-color-hover", "Aus: Knopfrand, Hover", "Off: thumb border, hover"],
        ["ha-switch-thumb-box-shadow", "Knopf-Schatten", "Thumb shadow", "text"],
        ["ha-switch-size", "Höhe (px)", "Height (px)", "text"],
        ["ha-switch-width", "Breite (px)", "Width (px)", "text"],
        ["ha-switch-thumb-size", "Knopfgröße (px)", "Thumb size (px)", "text"],
      ],
    },
  ];

  /**
   * What Home Assistant itself uses when a variable is not set. Only needed
   * for the preview: an empty field has to look the way Home Assistant would
   * look, not the way this configuration page happens to look.
   * Taken from the frontend (resources/theme/color).
   */
  const THEME_FALLBACK = {
    light: {
      "primary-color": "#009ac7",
      "light-primary-color": "#b3e5fc",
      "dark-primary-color": "#0288d1",
      "accent-color": "#ff9800",
      "divider-color": "rgba(0, 0, 0, .12)",
      "outline-color": "rgba(0, 0, 0, .12)",
      "primary-background-color": "#fafafa",
      "secondary-background-color": "#e5e5e5",
      "card-background-color": "#ffffff",
      "clear-background-color": "#ffffff",
      "primary-text-color": "#212121",
      "secondary-text-color": "#727272",
      "text-primary-color": "#ffffff",
      "disabled-text-color": "#bdbdbd",
      "state-icon-color": "#44739e",
      "state-active-color": "#ffc107",
      "state-inactive-color": "#9e9e9e",
      "state-unavailable-color": "#bdbdbd",
      "error-color": "#db4437",
      "warning-color": "#ffa600",
      "success-color": "#43a047",
      "info-color": "#039be5",
      "table-row-background-color": "#fafafa",
      "table-row-alternative-background-color": "#e5e5e5",
      "input-fill-color": "rgb(245, 245, 245)",
      "input-ink-color": "rgba(0, 0, 0, .87)",
      "input-idle-line-color": "rgba(0, 0, 0, .42)",
      "scrollbar-thumb-color": "rgb(194, 194, 194)",
      "label-badge-text-color": "rgba(33, 33, 33, .8)",
      "chip-background-color": "rgba(33, 33, 33, .15)",
      "state-weather-clear_night-color": "#6e41ab",
      "state-weather-cloudy-color": "#bdbdbd",
      "state-weather-exceptional-color": "#f44336",
      "state-weather-fog-color": "#9e9e9e",
      "state-weather-hail-color": "#00bcd4",
      "state-weather-lightning-color": "#ffeb3b",
      "state-weather-lightning_rainy-color": "#cddc39",
      "state-weather-partlycloudy-color": "#607d8b",
      "state-weather-pouring-color": "#3f51b5",
      "state-weather-rainy-color": "#2196f3",
      "state-weather-snowy-color": "#c0e0ff",
      "state-weather-snowy_rainy-color": "#03a9f4",
      "state-weather-sunny-color": "#ffc107",
      "state-weather-windy-color": "#4caf50",
      "state-weather-windy_variant-color": "#4caf50",
      "table-header-background-color": "rgb(245, 245, 245)",
      "input-label-ink-color": "rgba(0, 0, 0, 0.6)",
      "input-dropdown-icon-color": "rgba(0, 0, 0, 0.54)",
      "ha-dialog-scrim-backdrop-filter": "brightness(68%)",
      "codemirror-keyword": "#6262FF",
      "codemirror-operator": "#cda869",
      "codemirror-variable": "#07a",
      "codemirror-variable-2": "#690",
      "codemirror-def": "#8DA6CE",
      "codemirror-atom": "#F90",
      "codemirror-number": "#ca7841",
      "codemirror-string": "#07a",
      "codemirror-string2": "#07a",
      "codemirror-comment": "#777",
      "codemirror-meta": "var(--primary-text-color)",
      "codemirror-property": "#905",
      "codemirror-qualifier": "#690",
      "label-badge-red": "#db4437",
      "label-badge-blue": "#039be5",
      "label-badge-green": "#43a047",
      "label-badge-yellow": "#ffa600",
      "label-badge-grey": "#9e9e9e",
      "history-unavailable-color": "transparent",
      "history-unknown-color": "#606060",
      "color-1": "#4269d0",
      "color-2": "#f4bd4a",
      "color-3": "#ff725c",
      "color-4": "#6cc5b0",
      "color-5": "#a463f2",
      "color-6": "#ff8ab7",
      "color-7": "#9c6b4e",
      "color-8": "#97bbf5",
      "color-9": "#01ab63",
      "color-10": "#094bad",
      "color-11": "#c99000",
      "color-12": "#d84f3e",
      "color-13": "#49a28f",
      "color-14": "#048732",
      "color-15": "#d96895",
      "color-16": "#8043ce",
      "color-17": "#7599d1",
      "color-18": "#7a4c31",
      "color-19": "#6989f4",
      "color-20": "#ffd444",
      "color-21": "#ff957c",
      "color-22": "#8fe9d3",
      "color-23": "#62cc71",
      "color-24": "#ffadda",
      "color-25": "#c884ff",
      "color-26": "#badeff",
      "color-27": "#bf8b6d",
      "color-28": "#927acc",
      "color-29": "#97ee3f",
      "color-30": "#bf3947",
      "color-31": "#9f5b00",
      "color-32": "#f48758",
      "color-33": "#8caed6",
      "color-34": "#f2b94f",
      "color-35": "#eff26e",
      "color-36": "#e43872",
      "color-37": "#d9b100",
      "color-38": "#9d7a00",
      "color-39": "#698cff",
      "color-40": "#00d27e",
      "color-41": "#d06800",
      "color-42": "#009f82",
      "color-43": "#c49200",
      "color-44": "#cbe8ff",
      "color-45": "#fecddf",
      "color-46": "#c27eb6",
      "color-47": "#8cd2ce",
      "color-48": "#c4b8d9",
      "color-49": "#f883b0",
      "color-50": "#a49100",
      "color-51": "#f48800",
      "color-52": "#27d0df",
      "color-53": "#a04a9b",
      "color-54": "#4269d0",
      "energy-grid-consumption-color": "#488fc2",
      "energy-grid-return-color": "#8353d1",
      "energy-solar-color": "#ff9800",
      "energy-battery-out-color": "#4db6ac",
      "energy-battery-in-color": "#f06292",
      "energy-non-fossil-color": "#0f9d58",
      "energy-gas-color": "#8e021b",
      "energy-water-color": "#00bcd4",
      "ha-color-text-primary": "#141414",
      "ha-color-text-secondary": "#5e5e5e",
      "ha-color-text-disabled": "#989898",
      "ha-color-surface-default": "#ffffff",
      "ha-color-surface-low": "#f3f3f3",
      "ha-color-on-surface-default": "#141414",
      "ha-color-form-background": "#f3f3f3",
      "ha-color-form-background-hover": "#e6e6e6",
      "ha-color-form-background-disabled": "#cccccc",
      "ha-color-focus": "#989898",
      "ha-color-shadow-scrollable-fade": "rgba(0, 0, 0, 0.08)",
      "ha-color-border-primary-quiet": "#dff3fc",
      "ha-color-border-primary-loud": "#009ac7",
      "ha-color-border-neutral-quiet": "#e6e6e6",
      "ha-color-border-neutral-normal": "#989898",
      "ha-color-border-neutral-loud": "#5e5e5e",
      "ha-color-border-danger-quiet": "#ffdedc",
      "ha-color-border-danger-normal": "#fd8f90",
      "ha-color-border-danger-loud": "#b30532",
      "ha-color-border-warning-quiet": "#ffe0c8",
      "ha-color-border-warning-normal": "#ff9342",
      "ha-color-border-warning-loud": "#9d3800",
      "ha-color-border-success-quiet": "#c2f2c1",
      "ha-color-border-success-normal": "#5dc36f",
      "ha-color-border-success-loud": "#036730",
      "ha-color-fill-primary-quiet-resting": "#eff9fe",
      "ha-color-fill-primary-quiet-hover": "#dff3fc",
      "ha-color-fill-primary-quiet-active": "#eff9fe",
      "ha-color-fill-primary-normal-resting": "#dff3fc",
      "ha-color-fill-primary-normal-hover": "#b9e6fc",
      "ha-color-fill-primary-normal-active": "#dff3fc",
      "ha-color-fill-primary-loud-resting": "#009ac7",
      "ha-color-fill-primary-loud-hover": "#006787",
      "ha-color-fill-primary-loud-active": "#009ac7",
      "ha-color-fill-neutral-quiet-resting": "#f3f3f3",
      "ha-color-fill-neutral-quiet-hover": "#e6e6e6",
      "ha-color-fill-neutral-normal-resting": "#e6e6e6",
      "ha-color-fill-neutral-normal-hover": "#cccccc",
      "ha-color-fill-neutral-normal-active": "#e6e6e6",
      "ha-color-fill-neutral-loud-resting": "#5e5e5e",
      "ha-color-fill-neutral-loud-hover": "#4a4a4a",
      "ha-color-fill-neutral-loud-active": "#5e5e5e",
      "ha-color-fill-disabled-quiet-resting": "#f3f3f3",
      "ha-color-fill-disabled-quiet-hover": "#e6e6e6",
      "ha-color-fill-disabled-normal-resting": "#f3f3f3",
      "ha-color-fill-disabled-loud-resting": "#cccccc",
      "ha-color-fill-danger-quiet-resting": "#fff0ef",
      "ha-color-fill-danger-quiet-hover": "#ffdedc",
      "ha-color-fill-danger-quiet-active": "#fff0ef",
      "ha-color-fill-danger-normal-resting": "#ffdedc",
      "ha-color-fill-danger-normal-hover": "#ffb8b6",
      "ha-color-fill-danger-normal-active": "#ffdedc",
      "ha-color-fill-danger-loud-resting": "#dc3146",
      "ha-color-fill-danger-loud-hover": "#b30532",
      "ha-color-fill-danger-loud-active": "#dc3146",
      "ha-color-fill-warning-quiet-resting": "#fff0e4",
      "ha-color-fill-warning-quiet-hover": "#ffe0c8",
      "ha-color-fill-warning-quiet-active": "#fff0e4",
      "ha-color-fill-warning-normal-resting": "#ffe0c8",
      "ha-color-fill-warning-normal-hover": "#ffbb89",
      "ha-color-fill-warning-normal-active": "#ffe0c8",
      "ha-color-fill-warning-loud-resting": "#ff9342",
      "ha-color-fill-warning-loud-hover": "#c94e00",
      "ha-color-fill-warning-loud-active": "#ff9342",
      "ha-color-fill-success-quiet-resting": "#e3f9e3",
      "ha-color-fill-success-quiet-hover": "#c2f2c1",
      "ha-color-fill-success-quiet-active": "#e3f9e3",
      "ha-color-fill-success-normal-resting": "#c2f2c1",
      "ha-color-fill-success-normal-hover": "#93da98",
      "ha-color-fill-success-normal-active": "#c2f2c1",
      "ha-color-fill-success-loud-resting": "#00883c",
      "ha-color-fill-success-loud-hover": "#036730",
      "ha-color-fill-success-loud-active": "#00883c",
      "ha-color-on-primary-quiet": "#18bcf2",
      "ha-color-on-primary-normal": "#009ac7",
      "ha-color-on-primary-loud": "#ffffff",
      "ha-color-on-neutral-quiet": "#7a7a7a",
      "ha-color-on-neutral-normal": "#5e5e5e",
      "ha-color-on-neutral-loud": "#ffffff",
      "ha-color-on-disabled-quiet": "#cccccc",
      "ha-color-on-disabled-normal": "#b1b1b1",
      "ha-color-on-disabled-loud": "#f3f3f3",
      "ha-color-on-danger-quiet": "#dc3146",
      "ha-color-on-danger-normal": "#b30532",
      "ha-color-on-danger-loud": "#ffffff",
      "ha-color-on-warning-quiet": "#c94e00",
      "ha-color-on-warning-normal": "#9d3800",
      "ha-color-on-warning-loud": "#ffffff",
      "ha-color-on-success-quiet": "#00883c",
      "ha-color-on-success-normal": "#036730",
      "ha-color-on-success-loud": "#ffffff",
      "ha-border-radius-sm": "4px",
      "ha-border-radius-md": "8px",
      "ha-border-radius-lg": "12px",
      "ha-border-radius-xl": "16px",
      "ha-border-radius-2xl": "20px",
      "ha-border-radius-3xl": "24px",
      "ha-border-radius-4xl": "28px",
      "ha-border-radius-6xl": "36px",
      "ha-border-radius-pill": "9999px",
      "ha-border-width-sm": "1px",
      "ha-border-width-md": "2px",
      "ha-border-width-lg": "3px",
      "ha-box-shadow-s": "0 1px 2px 0 rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.12)",
      "ha-box-shadow-m": "0 3px 6px -1px rgba(0, 0, 0, 0.1), 0 8px 16px -2px rgba(0, 0, 0, 0.15)",
      "ha-box-shadow-l": "0 6px 12px -3px rgba(0, 0, 0, 0.12), 0 16px 32px -6px rgba(0, 0, 0, 0.2)",
    },
    dark: {
      "primary-color": "#009ac7",
      "light-primary-color": "#b3e5fc",
      "accent-color": "#ff9800",
      "divider-color": "rgba(225, 225, 225, .12)",
      "outline-color": "rgba(225, 225, 225, .12)",
      "primary-background-color": "#111111",
      "secondary-background-color": "#282828",
      "card-background-color": "#1c1c1c",
      "clear-background-color": "#111111",
      "primary-text-color": "#e1e1e1",
      "secondary-text-color": "#9b9b9b",
      "text-primary-color": "#ffffff",
      "disabled-text-color": "#6f6f6f",
      "state-icon-color": "#44739e",
      "state-active-color": "#ffc107",
      "state-inactive-color": "#9e9e9e",
      "state-unavailable-color": "#6f6f6f",
      "error-color": "#db4437",
      "warning-color": "#ffa600",
      "success-color": "#43a047",
      "info-color": "#039be5",
      "table-row-background-color": "#111111",
      "table-row-alternative-background-color": "#282828",
      "input-fill-color": "rgba(255, 255, 255, .05)",
      "input-ink-color": "rgba(255, 255, 255, .87)",
      "input-idle-line-color": "rgba(255, 255, 255, .42)",
      "scrollbar-thumb-color": "rgb(110, 110, 110)",
      "label-badge-text-color": "rgba(225, 225, 225, .8)",
      "chip-background-color": "rgba(225, 225, 225, .15)",
      "state-weather-clear_night-color": "#6e41ab",
      "state-weather-cloudy-color": "#bdbdbd",
      "state-weather-exceptional-color": "#f44336",
      "state-weather-fog-color": "#9e9e9e",
      "state-weather-hail-color": "#00bcd4",
      "state-weather-lightning-color": "#ffeb3b",
      "state-weather-lightning_rainy-color": "#cddc39",
      "state-weather-partlycloudy-color": "#607d8b",
      "state-weather-pouring-color": "#3f51b5",
      "state-weather-rainy-color": "#2196f3",
      "state-weather-snowy-color": "#c0e0ff",
      "state-weather-snowy_rainy-color": "#03a9f4",
      "state-weather-sunny-color": "#ffc107",
      "state-weather-windy-color": "#4caf50",
      "state-weather-windy_variant-color": "#4caf50",
      "table-header-background-color": "rgba(255, 255, 255, 0.05)",
      "input-label-ink-color": "rgba(255, 255, 255, 0.6)",
      "input-dropdown-icon-color": "rgba(255, 255, 255, 0.54)",
      "ha-dialog-scrim-backdrop-filter": "brightness(68%)",
      "codemirror-keyword": "#c792ea",
      "codemirror-operator": "#89ddff",
      "codemirror-variable": "#f07178",
      "codemirror-variable-2": "#eeffff",
      "codemirror-def": "#82aaff",
      "codemirror-atom": "#f78c6c",
      "codemirror-number": "#ff5370",
      "codemirror-string": "#c3e88d",
      "codemirror-string2": "#07a",
      "codemirror-comment": "#545454",
      "codemirror-meta": "#ffcb6b",
      "codemirror-property": "#c792ea",
      "codemirror-qualifier": "#decb6b",
      "label-badge-red": "#db4437",
      "label-badge-blue": "#039be5",
      "label-badge-green": "#43a047",
      "label-badge-yellow": "#ffa600",
      "label-badge-grey": "#9e9e9e",
      "history-unavailable-color": "transparent",
      "history-unknown-color": "#606060",
      "color-1": "#4269d0",
      "color-2": "#f4bd4a",
      "color-3": "#ff725c",
      "color-4": "#6cc5b0",
      "color-5": "#a463f2",
      "color-6": "#ff8ab7",
      "color-7": "#9c6b4e",
      "color-8": "#97bbf5",
      "color-9": "#01ab63",
      "color-10": "#094bad",
      "color-11": "#c99000",
      "color-12": "#d84f3e",
      "color-13": "#49a28f",
      "color-14": "#048732",
      "color-15": "#d96895",
      "color-16": "#8043ce",
      "color-17": "#7599d1",
      "color-18": "#7a4c31",
      "color-19": "#6989f4",
      "color-20": "#ffd444",
      "color-21": "#ff957c",
      "color-22": "#8fe9d3",
      "color-23": "#62cc71",
      "color-24": "#ffadda",
      "color-25": "#c884ff",
      "color-26": "#badeff",
      "color-27": "#bf8b6d",
      "color-28": "#927acc",
      "color-29": "#97ee3f",
      "color-30": "#bf3947",
      "color-31": "#9f5b00",
      "color-32": "#f48758",
      "color-33": "#8caed6",
      "color-34": "#f2b94f",
      "color-35": "#eff26e",
      "color-36": "#e43872",
      "color-37": "#d9b100",
      "color-38": "#9d7a00",
      "color-39": "#698cff",
      "color-40": "#00d27e",
      "color-41": "#d06800",
      "color-42": "#009f82",
      "color-43": "#c49200",
      "color-44": "#cbe8ff",
      "color-45": "#fecddf",
      "color-46": "#c27eb6",
      "color-47": "#8cd2ce",
      "color-48": "#c4b8d9",
      "color-49": "#f883b0",
      "color-50": "#a49100",
      "color-51": "#f48800",
      "color-52": "#27d0df",
      "color-53": "#a04a9b",
      "color-54": "#4269d0",
      "energy-grid-consumption-color": "#488fc2",
      "energy-grid-return-color": "#a280db",
      "energy-solar-color": "#ff9800",
      "energy-battery-out-color": "#4db6ac",
      "energy-battery-in-color": "#f06292",
      "energy-non-fossil-color": "#0f9d58",
      "energy-gas-color": "#8e021b",
      "energy-water-color": "#00bcd4",
      "ha-color-text-primary": "#ffffff",
      "ha-color-text-secondary": "#cccccc",
      "ha-color-text-disabled": "#989898",
      "ha-color-surface-default": "#202020",
      "ha-color-surface-low": "#141414",
      "ha-color-on-surface-default": "#f3f3f3",
      "ha-color-form-background": "#363636",
      "ha-color-form-background-hover": "#4a4a4a",
      "ha-color-form-background-disabled": "#363636",
      "ha-color-focus": "#989898",
      "ha-color-shadow-scrollable-fade": "rgba(0, 0, 0, 0.08)",
      "ha-color-border-primary-quiet": "#dff3fc",
      "ha-color-border-primary-loud": "#009ac7",
      "ha-color-border-neutral-quiet": "#5e5e5e",
      "ha-color-border-neutral-normal": "#7a7a7a",
      "ha-color-border-neutral-loud": "#b1b1b1",
      "ha-color-border-danger-quiet": "#ffdedc",
      "ha-color-border-danger-normal": "#dc3146",
      "ha-color-border-danger-loud": "#dc3146",
      "ha-color-border-warning-quiet": "#ffe0c8",
      "ha-color-border-warning-normal": "#c94e00",
      "ha-color-border-warning-loud": "#c94e00",
      "ha-color-border-success-quiet": "#c2f2c1",
      "ha-color-border-success-normal": "#5dc36f",
      "ha-color-border-success-loud": "#036730",
      "ha-color-fill-primary-quiet-resting": "#001721",
      "ha-color-fill-primary-quiet-hover": "#002e3e",
      "ha-color-fill-primary-quiet-active": "#001721",
      "ha-color-fill-primary-normal-resting": "#002e3e",
      "ha-color-fill-primary-normal-hover": "#004156",
      "ha-color-fill-primary-normal-active": "#002e3e",
      "ha-color-fill-primary-loud-resting": "#009ac7",
      "ha-color-fill-primary-loud-hover": "#006787",
      "ha-color-fill-primary-loud-active": "#009ac7",
      "ha-color-fill-neutral-quiet-resting": "#141414",
      "ha-color-fill-neutral-quiet-hover": "#202020",
      "ha-color-fill-neutral-normal-resting": "#202020",
      "ha-color-fill-neutral-normal-hover": "#363636",
      "ha-color-fill-neutral-normal-active": "#202020",
      "ha-color-fill-neutral-loud-resting": "#989898",
      "ha-color-fill-neutral-loud-hover": "#b1b1b1",
      "ha-color-fill-neutral-loud-active": "#989898",
      "ha-color-fill-disabled-quiet-resting": "#202020",
      "ha-color-fill-disabled-quiet-hover": "#363636",
      "ha-color-fill-disabled-normal-resting": "#363636",
      "ha-color-fill-disabled-loud-resting": "#4a4a4a",
      "ha-color-fill-danger-quiet-resting": "#2a040b",
      "ha-color-fill-danger-quiet-hover": "#3e0913",
      "ha-color-fill-danger-quiet-active": "#2a040b",
      "ha-color-fill-danger-normal-resting": "#3e0913",
      "ha-color-fill-danger-normal-hover": "#631323",
      "ha-color-fill-danger-normal-active": "#3e0913",
      "ha-color-fill-danger-loud-resting": "#b30532",
      "ha-color-fill-danger-loud-hover": "#8a132c",
      "ha-color-fill-danger-loud-active": "#b30532",
      "ha-color-fill-warning-quiet-resting": "#280700",
      "ha-color-fill-warning-quiet-hover": "#3b0f00",
      "ha-color-fill-warning-quiet-active": "#280700",
      "ha-color-fill-warning-normal-resting": "#3b0f00",
      "ha-color-fill-warning-normal-hover": "#5e1c00",
      "ha-color-fill-warning-normal-active": "#3b0f00",
      "ha-color-fill-warning-loud-resting": "#9d3800",
      "ha-color-fill-warning-loud-hover": "#7e2900",
      "ha-color-fill-warning-loud-active": "#9d3800",
      "ha-color-fill-success-quiet-resting": "#031608",
      "ha-color-fill-success-quiet-hover": "#052310",
      "ha-color-fill-success-quiet-active": "#031608",
      "ha-color-fill-success-normal-resting": "#052310",
      "ha-color-fill-success-normal-hover": "#0a3a1d",
      "ha-color-fill-success-normal-active": "#052310",
      "ha-color-fill-success-loud-resting": "#036730",
      "ha-color-fill-success-loud-hover": "#0a5027",
      "ha-color-fill-success-loud-active": "#036730",
      "ha-color-on-primary-quiet": "#7bd4fb",
      "ha-color-on-primary-normal": "#37c8fd",
      "ha-color-on-primary-loud": "#ffffff",
      "ha-color-on-neutral-quiet": "#b1b1b1",
      "ha-color-on-neutral-normal": "#989898",
      "ha-color-on-neutral-loud": "#ffffff",
      "ha-color-on-disabled-quiet": "#5e5e5e",
      "ha-color-on-disabled-normal": "#7a7a7a",
      "ha-color-on-disabled-loud": "#7a7a7a",
      "ha-color-on-danger-quiet": "#fd8f90",
      "ha-color-on-danger-normal": "#f3676c",
      "ha-color-on-danger-loud": "#ffffff",
      "ha-color-on-warning-quiet": "#ff9342",
      "ha-color-on-warning-normal": "#f36d00",
      "ha-color-on-warning-loud": "#ffffff",
      "ha-color-on-success-quiet": "#5dc36f",
      "ha-color-on-success-normal": "#00ac49",
      "ha-color-on-success-loud": "#ffffff",
      "ha-border-radius-sm": "4px",
      "ha-border-radius-md": "8px",
      "ha-border-radius-lg": "12px",
      "ha-border-radius-xl": "16px",
      "ha-border-radius-2xl": "20px",
      "ha-border-radius-3xl": "24px",
      "ha-border-radius-4xl": "28px",
      "ha-border-radius-6xl": "36px",
      "ha-border-radius-pill": "9999px",
      "ha-border-width-sm": "1px",
      "ha-border-width-md": "2px",
      "ha-border-width-lg": "3px",
      "ha-box-shadow-s": "0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.5)",
      "ha-box-shadow-m": "0 3px 6px -1px rgba(0, 0, 0, 0.35), 0 8px 16px -2px rgba(0, 0, 0, 0.45)",
      "ha-box-shadow-l": "0 6px 12px -3px rgba(0, 0, 0, 0.4), 0 16px 32px -6px rgba(0, 0, 0, 0.55)",
    },
  };

  /**
   * Mirror of THEME_EXTRAS in const.py. These are not CSS variables: they are
   * the per side / per corner values the two card variables are composed from.
   */
  const THEME_EXTRAS = {
    card_border_split: false,
    card_border_top: "",
    card_border_right: "",
    card_border_bottom: "",
    card_border_left: "",
    card_radius_split: false,
    card_radius_tl: "",
    card_radius_tr: "",
    card_radius_br: "",
    card_radius_bl: "",
    // Dashboard background: gradient and uploaded image (see backgroundValue).
    dash_gradient: false,
    dash_color2: "",
    dash_direction: "",
    dash_image: "",
    dash_image_size: "",
    dash_image_scroll: false,
  };

  /** Mirror of THEME_COMPOSED in const.py: variable -> [switch, four parts]. */
  const THEME_COMPOSED = {
    "ha-card-border-width": [
      "card_border_split",
      ["card_border_top", "card_border_right", "card_border_bottom", "card_border_left"],
    ],
    "ha-card-border-radius": [
      "card_radius_split",
      ["card_radius_tl", "card_radius_tr", "card_radius_br", "card_radius_bl"],
    ],
  };

  /**
   * Turn the four per side / per corner values into the CSS shorthand both
   * variables understand. Same rule as theme.py, so preview, export and what
   * Home Assistant gets can never drift apart.
   */
  const composedValue = (values, parts) => {
    const pieces = parts.map((part) => {
      const raw = String(values[part] === undefined ? "" : values[part])
        .trim()
        .replace(/px$/, "")
        .trim();
      // Same rule as _length() in theme.py: a plain number or nothing.
      return /^-?\d*\.?\d+$/.test(raw) ? String(parseFloat(raw)) : "0";
    });
    return pieces.some((piece) => piece !== "0")
      ? pieces.map((piece) => piece + "px").join(" ")
      : "0";
  };

  /** Mirror of MEDIA_URL / MEDIA_UPLOAD_URL / MEDIA_MAX_BYTES in const.py. */
  const MEDIA_URL = "/ha_style_hub-media";
  const MEDIA_UPLOAD_URL = "/api/ha_style_hub/background";
  const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
  const MEDIA_URL_RE = new RegExp(
    "^" + MEDIA_URL + "/background-[0-9a-f]{12}\\.(png|jpg|gif|webp)$"
  );
  const DASH_DIRECTIONS = [
    "to bottom", "to top", "to right", "to left", "to bottom right",
    "to bottom left", "to top right", "to top left", "radial",
  ];
  const DASH_IMAGE_LAYOUT = {
    cover: "center / cover no-repeat",
    contain: "center / contain no-repeat",
    tile: "top left / auto repeat",
  };

  /**
   * Compose the CSS background of the dashboard views, or "" when there is
   * nothing to compose (no gradient, no image: the plain field is used). Same
   * rule as background_value() in theme.py, so preview, export and what Home
   * Assistant gets cannot drift apart. The preview passes inPreview: a
   * "fixed" image would be placed against the browser window, not against the
   * little preview box.
   */
  const backgroundValue = (values, inPreview) => {
    const text = (key) => String(values[key] === undefined || values[key] === null ? "" : values[key]).trim();
    const gradient = !!values.dash_gradient;
    const image = MEDIA_URL_RE.test(text("dash_image")) ? text("dash_image") : "";
    if (!gradient && !image) {
      return "";
    }
    const base = text("lovelace-background");
    const layers = [];
    if (image) {
      const size = DASH_IMAGE_LAYOUT[text("dash_image_size")] || DASH_IMAGE_LAYOUT.cover;
      const attachment = values.dash_image_scroll || inPreview ? "scroll" : "fixed";
      layers.push(`url('${image}') ${size} ${attachment}`);
    }
    if (gradient) {
      const first = base || "var(--primary-background-color)";
      const second = text("dash_color2") || "var(--secondary-background-color)";
      const direction = DASH_DIRECTIONS.indexOf(text("dash_direction")) >= 0 ? text("dash_direction") : "to bottom";
      layers.push(
        direction === "radial"
          ? `radial-gradient(circle at 50% 0%, ${first}, ${second})`
          : `linear-gradient(${direction}, ${first}, ${second})`
      );
    } else if (base) {
      layers.push(base);
    }
    return layers.join(", ");
  };

  /**
   * Mirror of THEME_PX in const.py: variables that are a plain length. A bare
   * number gets "px" - without a unit CSS throws the value away and the field
   * looks broken.
   */
  const THEME_PX = [
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
  ];

  /* ------------------------------------------------------------------ *
   * Primaerpalette (seit 1.4.6). Neuere Teile von Home Assistant
   * (ha-button, ha-switch, Checkboxen, Links, ...) nehmen ihre Farbe aus
   * --ha-color-primary-05 ... -95 statt aus --primary-color. Home
   * Assistant rechnet diese Skala nur fuer das Standard-Theme aus der
   * Profilfarbe aus (generateColorPalette, src/common/color/palette.ts);
   * ein eigenes Theme bliebe blau. Gleiche Formel und Konstanten wie
   * culori 4.0.2 im Frontend - und wie theme.py im Backend.
   * ------------------------------------------------------------------ */
  const PALETTE_STEPS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95];
  const parsePaletteColor = (raw) => {
    const text = String(raw || "").trim().toLowerCase();
    let match = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (match) {
      let digits = match[1];
      if (digits.length <= 4) {
        digits = digits.split("").map((c) => c + c).join("");
      }
      return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
    }
    match = text.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/);
    if (match) {
      return [match[1], match[2], match[3]].map((part) =>
        Math.max(0, Math.min(1, part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part) / 255))
      );
    }
    return null;
  };
  const primaryPalette = (raw) => {
    const rgb = parsePaletteColor(raw);
    if (!rgb) {
      return {};
    }
    const linear = (c) => {
      const a = Math.abs(c);
      return a <= 0.04045 ? c / 12.92 : (Math.sign(c) || 1) * Math.pow((a + 0.055) / 1.055, 2.4);
    };
    const gamma = (c) => {
      const a = Math.abs(c);
      return a > 0.0031308 ? (Math.sign(c) || 1) * (1.055 * Math.pow(a, 1 / 2.4) - 0.055) : c * 12.92;
    };
    const [r, g, b] = rgb.map(linear);
    const L = Math.cbrt(0.41222147079999993 * r + 0.5363325363 * g + 0.0514459929 * b);
    const M = Math.cbrt(0.2119034981999999 * r + 0.6806995450999999 * g + 0.1073969566 * b);
    const S = Math.cbrt(0.08830246189999998 * r + 0.2817188376 * g + 0.6299787005000002 * b);
    const lab = [
      0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S,
      1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S,
      0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S,
    ];
    const hex = (l, a, bb) => {
      const l3 = Math.pow(l * 0.99999999845051981432 + 0.39633779217376785678 * a + 0.21580375806075880339 * bb, 3);
      const m3 = Math.pow(l * 1.0000000088817607767 - 0.1055613423236563494 * a - 0.063854174771705903402 * bb, 3);
      const s3 = Math.pow(l * 1.0000000546724109177 - 0.089484182094965759684 * a - 1.2914855378640917399 * bb, 3);
      return "#" + [
        4.076741661347994 * l3 - 3.307711590408193 * m3 + 0.230969928729428 * s3,
        -1.2684380040921763 * l3 + 2.6097573492876887 * m3 - 0.3413193760026573 * s3,
        -0.0041960761386756 * l3 - 0.7034186179359362 * m3 + 1.7076146940746117 * s3,
      ].map((c) => Math.round(Math.max(0, Math.min(1, gamma(c) || 0)) * 255).toString(16).padStart(2, "0")).join("");
    };
    const out = {};
    PALETTE_STEPS.forEach((step) => {
      let level = lab[0];
      let factor = 1;
      if (step < 50) {
        const dark = step / 50;
        level = lab[0] * dark;
        factor = 0.9 + 0.1 * dark;
      } else if (step > 50) {
        const light = (step - 50) / 45;
        level = Math.min(1, lab[0] + (1 - lab[0]) * light);
        factor = Math.max(0, 1 - light * 0.7);
      }
      out[`ha-color-primary-${String(step).padStart(2, "0")}`] = hex(level, lab[1] * factor, lab[2] * factor);
    });
    return out;
  };

  // Die Skala von Home Assistant selbst (resources/theme/color/core.globals.ts),
  // solange das Theme keine eigene Primaerfarbe hat - nur fuer die Vorschau.
  const HA_PRIMARY_SCALE = {
    "ha-color-primary-05": "#001721", "ha-color-primary-10": "#002e3e", "ha-color-primary-20": "#004156",
    "ha-color-primary-30": "#006787", "ha-color-primary-40": "#009ac7", "ha-color-primary-50": "#18bcf2",
    "ha-color-primary-60": "#37c8fd", "ha-color-primary-70": "#7bd4fb", "ha-color-primary-80": "#b9e6fc",
    "ha-color-primary-90": "#dff3fc", "ha-color-primary-95": "#eff9fe",
  };

  /* ------------------------------------------------------------------ *
   * Schatten-Baukasten (seit 1.4.7): aus Richtung, Abstand, Weichheit,
   * Ausdehnung, Farbe und Deckkraft wird ein box-shadow - und ein
   * vorhandener Wert wird zurueck in die Regler gelesen.
   * ------------------------------------------------------------------ */
  const SHADOW_DIRS = [
    ["down", 0, 1], ["down_right", 1, 1], ["right", 1, 0], ["up_right", 1, -1],
    ["up", 0, -1], ["up_left", -1, -1], ["left", -1, 0], ["down_left", -1, 1], ["around", 0, 0],
  ];
  const SHADOW_PRESETS = [
    ["none", "none"],
    ["breath", "0 1px 3px rgba(0, 0, 0, 0.12)"],
    ["soft", "0 2px 8px rgba(0, 0, 0, 0.16)"],
    ["medium", "0 6px 16px rgba(0, 0, 0, 0.24)"],
    ["strong", "0 12px 32px rgba(0, 0, 0, 0.38)"],
    ["around", "0 0 14px rgba(0, 0, 0, 0.30)"],
  ];
  /** Kommas trennen Schatten - aber nicht die in rgba(...). */
  const splitShadows = (text) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (c === "(") depth += 1;
      else if (c === ")") depth -= 1;
      else if (c === "," && depth === 0) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(text.slice(start));
    return parts.map((one) => one.trim()).filter(Boolean);
  };
  /** Farbe in [r, g, b, alpha] - nur Hex und rgb()/rgba(); sonst null. */
  const shadowColor = (raw) => {
    const text = String(raw || "").trim().toLowerCase();
    let m = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat([a]);
    }
    m = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      const alpha = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Math.round(parseFloat(v))))).concat([Math.max(0, Math.min(1, alpha))]);
    }
    return null;
  };
  /**
   * Einen box-shadow lesen. Ergebnis: { empty } / { none } / { custom } oder
   * { inset, dir, dist, blur, spread, hex, opacity }.
   */
  const parseShadow = (raw) => {
    const text = String(raw || "").trim();
    if (!text) return { empty: true };
    if (/^none$/i.test(text)) return { none: true };
    const parts = splitShadows(text);
    if (parts.length !== 1) return { custom: true };
    let rest = parts[0];
    const inset = /\binset\b/i.test(rest);
    rest = rest.replace(/\binset\b/i, " ");
    const colorMatch = rest.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8}\b)/i);
    const color = colorMatch ? shadowColor(colorMatch[1]) : [0, 0, 0, 1];
    if (colorMatch) rest = rest.replace(colorMatch[1], " ");
    const lengths = rest.trim().split(/\s+/).filter(Boolean);
    if (!color || lengths.length < 2 || lengths.length > 4) return { custom: true };
    const nums = lengths.map((one) => (/^-?\d*\.?\d+(px)?$/i.test(one) ? parseFloat(one) : NaN));
    if (nums.some((n) => !Number.isFinite(n))) return { custom: true };
    const [x, y, blur = 0, spread = 0] = nums;
    const dist = Math.round(Math.hypot(x, y));
    let dir = "around";
    if (dist > 0) {
      const sx = Math.abs(x) * 2.4 < Math.abs(y) ? 0 : Math.sign(x);
      const sy = Math.abs(y) * 2.4 < Math.abs(x) ? 0 : Math.sign(y);
      dir = (SHADOW_DIRS.find((d) => d[1] === sx && d[2] === sy) || SHADOW_DIRS[0])[0];
    }
    const hex = "#" + color.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");
    return { inset, dir, dist, blur: Math.round(blur), spread: Math.round(spread), hex, opacity: Math.round(color[3] * 100) };
  };
  /** Aus den Reglern wieder einen box-shadow machen. */
  const composeShadow = (o) => {
    const d = SHADOW_DIRS.find((one) => one[0] === o.dir) || SHADOW_DIRS[0];
    const diag = d[1] !== 0 && d[2] !== 0 ? Math.SQRT1_2 : 1;
    const x = Math.round(d[1] * o.dist * diag);
    const y = Math.round(d[2] * o.dist * diag);
    const c = shadowColor(o.hex) || [0, 0, 0, 1];
    const alpha = Math.round(Math.max(0, Math.min(100, o.opacity))) / 100;
    const px = (n) => (n === 0 ? "0" : `${n}px`);
    const lengths = [px(x), px(y), px(o.blur)].concat(o.spread ? [px(o.spread)] : []);
    return `${o.inset ? "inset " : ""}${lengths.join(" ")} rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
  };

  // Design-Tokens, die Home Assistant aus der Skala der Primaerfarbe ableitet
  // (resources/theme/color/semantic.globals.ts): Variable -> Stufe.
  const TOKEN_PRIMARY_REFS = {
    "light": {"ha-color-border-primary-quiet": "90", "ha-color-border-primary-loud": "40", "ha-color-fill-primary-quiet-resting": "95", "ha-color-fill-primary-quiet-hover": "90", "ha-color-fill-primary-quiet-active": "95", "ha-color-fill-primary-normal-resting": "90", "ha-color-fill-primary-normal-hover": "80", "ha-color-fill-primary-normal-active": "90", "ha-color-fill-primary-loud-resting": "40", "ha-color-fill-primary-loud-hover": "30", "ha-color-fill-primary-loud-active": "40", "ha-color-on-primary-quiet": "50", "ha-color-on-primary-normal": "40"},
    "dark": {"ha-color-border-primary-quiet": "90", "ha-color-border-primary-loud": "40", "ha-color-fill-primary-quiet-resting": "05", "ha-color-fill-primary-quiet-hover": "10", "ha-color-fill-primary-quiet-active": "05", "ha-color-fill-primary-normal-resting": "10", "ha-color-fill-primary-normal-hover": "20", "ha-color-fill-primary-normal-active": "10", "ha-color-fill-primary-loud-resting": "40", "ha-color-fill-primary-loud-hover": "30", "ha-color-fill-primary-loud-active": "40", "ha-color-on-primary-quiet": "70", "ha-color-on-primary-normal": "60"},
  };

  /* ------------------------------------------------------------------ *
   * Kontrast (1.4.8): Text auf Hintergrund, WCAG-Verhaeltnis.
   * [Text, Hintergrund, Untergrund fuer durchscheinende Hintergruende]
   * ------------------------------------------------------------------ */
  const CONTRAST_PAIRS = [
    ["primary-text-color", "card-background-color"],
    ["secondary-text-color", "card-background-color"],
    ["primary-text-color", "primary-background-color"],
    ["text-primary-color", "primary-color"],
    ["ha-card-header-color", "card-background-color"],
    ["app-header-text-color", "app-header-background-color", "primary-background-color"],
    ["app-header-edit-text-color", "app-header-edit-background-color", "primary-background-color"],
    ["sidebar-text-color", "sidebar-background-color", "primary-background-color"],
    ["sidebar-menu-button-text-color", "sidebar-menu-button-background-color", "sidebar-background-color"],
    ["input-ink-color", "input-fill-color"],
    ["label-badge-text-color", "label-badge-background-color"],
    ["ha-color-text-primary", "ha-color-surface-default"],
    ["ha-color-on-primary-loud", "ha-color-fill-primary-loud-resting"],
    ["ha-color-on-danger-loud", "ha-color-fill-danger-loud-resting"],
    ["ha-color-on-neutral-loud", "ha-color-fill-neutral-loud-resting"],
  ];
  /** Eine Farbe (Hex, rgb/rgba) ueber einen deckenden Grund legen -> [r, g, b]. */
  const colorOver = (raw, ground) => {
    const c = shadowColor(raw);
    if (!c) return null;
    const a = c[3];
    return [0, 1, 2].map((i) => c[i] * a + (ground ? ground[i] : 255) * (1 - a));
  };
  const relLuminance = (rgb) => {
    const lin = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const contrastRatio = (a, b) => {
    const la = relLuminance(a);
    const lb = relLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  // Zuletzt benutzte Farben - eine Ansichtssache des Browsers
  const RECENT_COLORS_KEY = "ha-style-hub-recent-colors";
  const readRecentColors = () => {
    try {
      const list = JSON.parse(window.localStorage.getItem(RECENT_COLORS_KEY) || "[]");
      return Array.isArray(list) ? list.filter((one) => typeof one === "string").slice(0, 12) : [];
    } catch (err) {
      return [];
    }
  };
  const writeRecentColors = (list) => {
    try {
      window.localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(list));
    } catch (err) {
      /* privates Fenster */
    }
  };

  // Rueckgaengig (1.4.9): so viele Schritte merkt sich die Seite.
  const UNDO_MAX = 60;
  // Die Bedienelemente im Vorschaubild der Theme-Seite (1.4.9) und die
  // Variablen, aus denen Home Assistant sie zeichnet. Ein Klick oeffnet rechts
  // die Gruppen dieser Variablen und markiert die Felder.
  const CONTROL_FIELDS = {
    btn_primary: ["ha-color-fill-primary-loud-resting", "ha-color-fill-primary-loud-hover", "ha-color-fill-primary-loud-active",
      "ha-color-on-primary-loud", "ha-border-radius-pill"],
    btn_more: ["ha-color-fill-primary-quiet-resting", "ha-color-fill-primary-quiet-hover", "ha-color-fill-primary-quiet-active",
      "ha-color-on-primary-quiet", "ha-border-radius-pill"],
    btn_cancel: ["ha-color-fill-neutral-quiet-resting", "ha-color-fill-neutral-quiet-hover", "ha-color-on-neutral-quiet",
      "ha-border-radius-pill"],
    btn_delete: ["ha-color-fill-danger-loud-resting", "ha-color-fill-danger-loud-hover", "ha-color-fill-danger-loud-active",
      "ha-color-on-danger-loud", "ha-border-radius-pill"],
    chip_success: ["ha-color-fill-success-quiet-resting", "ha-color-fill-success-quiet-hover", "ha-color-fill-success-quiet-active",
      "ha-color-on-success-quiet", "ha-color-border-success-quiet", "ha-border-radius-md"],
    chip_warning: ["ha-color-fill-warning-quiet-resting", "ha-color-fill-warning-quiet-hover", "ha-color-fill-warning-quiet-active",
      "ha-color-on-warning-quiet", "ha-color-border-warning-quiet", "ha-border-radius-md"],
    check_on: ["ha-color-fill-primary-loud-resting", "ha-color-on-primary-loud", "ha-border-radius-sm", "ha-border-width-md"],
    check_off: ["ha-color-border-neutral-normal", "ha-border-radius-sm", "ha-border-width-md"],
    switch_on: ["ha-switch-checked-background-color", "ha-switch-checked-background-color-hover", "ha-switch-checked-border-color",
      "ha-switch-checked-border-color-hover", "ha-switch-checked-thumb-background-color", "ha-switch-checked-thumb-background-color-hover",
      "ha-switch-checked-thumb-border-color", "ha-switch-checked-thumb-border-color-hover", "ha-switch-thumb-box-shadow",
      "ha-switch-size", "ha-switch-width", "ha-switch-thumb-size",
      "ha-color-fill-primary-normal-resting", "ha-color-border-primary-loud", "ha-color-on-primary-normal"],
    switch_off: ["ha-switch-background-color", "ha-switch-background-color-hover", "ha-switch-border-color",
      "ha-switch-thumb-background-color", "ha-switch-thumb-background-color-hover", "ha-switch-thumb-border-color",
      "ha-switch-thumb-border-color-hover", "ha-switch-thumb-box-shadow", "ha-switch-size", "ha-switch-width", "ha-switch-thumb-size",
      "ha-color-fill-disabled-quiet-resting", "ha-color-border-neutral-normal", "ha-color-on-neutral-normal"],
    input: ["ha-color-form-background", "ha-color-form-background-hover", "ha-color-form-background-disabled", "ha-color-text-primary",
      "ha-color-text-secondary", "ha-color-border-neutral-loud", "ha-color-focus", "ha-border-radius-sm", "input-label-ink-color"],
    surface: ["ha-color-surface-default", "ha-color-surface-low", "ha-color-on-surface-default", "ha-color-text-secondary",
      "ha-color-border-neutral-quiet", "ha-border-width-sm", "ha-border-radius-lg", "ha-box-shadow-m"],
  };
  // Weitere Elemente des Vorschaubilds (1.5.0), die aus mehreren Variablen
  // gezeichnet werden. Einzelne Variablen stehen direkt am Element als
  // data-ctl="v:<variable>[,<variable>]".
  Object.assign(CONTROL_FIELDS, {
    card_head: ["ha-card-header-color", "ha-card-header-font-size"],
    icon_on: ["state-active-color", "state-icon-color"],
    icon_off: ["state-inactive-color", "state-icon-color"],
    badge: ["label-badge-background-color", "label-badge-text-color", "label-badge-red", "label-badge-blue",
      "label-badge-green", "label-badge-yellow", "label-badge-grey"],
    slider: ["slider-color", "slider-track-color"],
    table_head: ["table-header-background-color", "secondary-text-color"],
    input_text: ["input-fill-color", "input-ink-color", "input-label-ink-color", "input-idle-line-color", "primary-color"],
    input_select: ["input-fill-color", "input-ink-color", "input-dropdown-icon-color", "input-idle-line-color"],
    scrim: ["mdc-dialog-scrim-color", "ha-dialog-scrim-backdrop-filter"],
    editor: ["code-editor-background-color", "codemirror-keyword", "codemirror-operator", "codemirror-variable",
      "codemirror-variable-2", "codemirror-def", "codemirror-atom", "codemirror-number", "codemirror-string",
      "codemirror-string2", "codemirror-comment", "codemirror-meta", "codemirror-property", "codemirror-qualifier"],
    heading: ["primary-text-color", "ha-font-family-body", "ha-font-weight-body"],
    body_text: ["primary-text-color", "ha-font-family-body", "ha-font-size-scale", "ha-font-weight-body"],
    chart_lines: ["color-1", "color-2", "color-3", "color-4", "color-5"],
    timeline: ["state-active-color", "state-inactive-color", "history-unknown-color", "history-unavailable-color"],
  });
  /** Die Variablen eines anklickbaren Elements im Vorschaubild. */
  const controlFields = (key) =>
    String(key || "").indexOf("v:") === 0 ? key.slice(2).split(",").filter(Boolean) : CONTROL_FIELDS[key] || [];
  /** Beschriftung einer Theme-Variablen (wie rechts in den Feldern). */
  const themeFieldLabel = (name, de) => {
    for (const group of THEME_GROUPS) {
      const field = group.fields.find((one) => one[0] === name);
      if (field) {
        return de ? field[1] : field[2];
      }
    }
    return name;
  };
  const withUnit = (key, value) => {
    const text = String(value === undefined || value === null ? "" : value).trim();
    if (!text || THEME_PX.indexOf(key) < 0) {
      return text;
    }
    return /^-?\d*\.?\d+$/.test(text) ? text + "px" : text;
  };
  /**
   * Preset values for the fields of the theme page that are a dropdown.
   * Free text would work too, but hardly anybody knows off hand what belongs
   * in a font scale - a list of sensible values is the friendlier answer.
   */
  const THEME_SELECTS = (t) => ({
    "ha-font-family-body": [["", t.theme_default]].concat(FONTS(t).slice(1)),
    "ha-font-size-scale": [
      ["", t.theme_default],
      ["0.8", "80 %"],
      ["0.9", "90 %"],
      ["1", "100 %"],
      ["1.1", "110 %"],
      ["1.2", "120 %"],
      ["1.3", "130 %"],
      ["1.5", "150 %"],
    ],
    "ha-font-weight-body": [
      ["", t.theme_default],
      ["300", "300 - Light"],
      ["400", "400 - Normal"],
      ["500", "500 - Medium"],
      ["600", "600 - Semibold"],
      ["700", "700 - Bold"],
    ],
  });

  /** Flat list of every variable, in the order of the groups. */
  const THEME_VARIABLES = THEME_GROUPS.reduce(
    (all, group) => all.concat(group.fields.map((field) => field[0])),
    []
  );

  /**
   * The name of a panel as the sidebar shows it. Built in panels carry a
   * translation key as their title ("energy", "map", "todo"); Home Assistant
   * looks it up as "panel.<title>", and the default dashboard as
   * "panel.states". Dashboards the user made have no translation, there the
   * title itself is the name.
   */
  const panelLabel = (hass, panel, urlPath) => {
    const lookup = (key) => {
      if (!hass || typeof hass.localize !== "function") {
        return "";
      }
      const text = hass.localize(key);
      return typeof text === "string" && text && text !== key ? text : "";
    };
    return (
      (panel.title ? lookup(`panel.${panel.title}`) : "") ||
      (urlPath === "lovelace" ? lookup("panel.states") : "") ||
      panel.title ||
      lookup(`panel.${panel.component_name}`) ||
      urlPath
    );
  };

  const HEADING_PREFIX = "heading:";

  /** Eine Zwischenueberschrift - kein Ziel, keine Spaltenbreite. */
  const DEFAULT_HEADING = {
    name: "",
    icon: "",
    hidden: false,
    text_color: "",
    icon_color: "",
    background: "",
    border_color: "",
    border_width: 0,
    border_split: false,
    border_top: 0,
    border_right: 0,
    border_bottom: 0,
    border_left: 0,
    radius: 0,
    radius_split: false,
    radius_tl: 0,
    radius_tr: 0,
    radius_br: 0,
    radius_bl: 0,
    height: 0,
    uppercase: true,
    collapsible: false,
  };

  const isHeading = (key) => String(key).indexOf(HEADING_PREFIX) === 0;

  /**
   * Ab wie vielen Pixeln vom linken Rand der Liste gilt ein Eintrag als
   * eingerueckt. Grosszuegig gewaehlt: versehentlich schraeg ziehen soll
   * keine Zuordnung ausloesen.
   */
  const INDENT_THRESHOLD = 60;

  const FIXED_ENTRIES = [
    { key: "config", icon: "mdi:cog", fallback: "Settings" },
    { key: "notifications", icon: "mdi:bell", fallback: "Notifications" },
    { key: "profile", icon: "mdi:account", fallback: "User" },
  ];

  // Der Neustart-Knopf - siehe const.py. Er taucht in dieser Liste nur auf,
  // wenn er unter Layout eingeschaltet ist, verhaelt sich dann aber wie jeder
  // andere Eintrag.
  const RESTART_KEY = "action:restart";

  // Links auf Seiten von Home Assistant - siehe den Injector. Das Ziel steht
  // im Schluessel ("link:/config/automation"); Name und Icon werden beim
  // Anlegen in den Eintrag geschrieben und lassen sich danach aendern wie bei
  // jedem anderen.
  const LINK_PREFIX = "link:";
  const LINK_PATH = /^\/(?!\/)[A-Za-z0-9_\-./?=&%#~+]*$/;
  const isLink = (key) => String(key).indexOf(LINK_PREFIX) === 0;
  const LINK_ICON = "mdi:link-variant";
  // PopUp-Links (1.5.1): ein Eintrag, der beim Anklicken ein Fenster mit
  // mehreren Links oeffnet - siehe den Injector. Schluessel "popup:<id>",
  // die Links stehen in items[key].links als {path, name, icon}.
  const POPUP_PREFIX = "popup:";
  const POPUP_ICON = "mdi:view-grid-outline";
  const POPUP_LINKS_MAX = 24;
  // 1.5.3: PopUp mit einer Lovelace-Karte - Code als YAML (hoechstens 50 KB,
  // wie store.py), Fenstergroesse in px (0 = automatisch)
  const POPUP_CARD_ICON = "mdi:card-text-outline";
  const POPUP_CARD_MAX = 51200;
  const POPUP_SIZE_MAX = 4000;
  const byteSize = (text) => new Blob([String(text)]).size;
  const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);
  /**
   * Bei fester Fensterhoehe soll die Karte den Platz ausfuellen - wie im
   * Injector: "ha-card { height: 100% }" als eigenes Stylesheet in ihren
   * Shadow Root (wirkt nur, solange die Box eine feste Hoehe hat).
   */
  const FILL_CSS = "ha-card { height: 100%; box-sizing: border-box; }";
  let fillSheet = null;
  const fillCardHeight = (element) => {
    const add = () => {
      const root = element.shadowRoot;
      if (!root) {
        return;
      }
      try {
        if (!fillSheet) {
          fillSheet = new CSSStyleSheet();
          fillSheet.replaceSync(FILL_CSS);
        }
        if (root.adoptedStyleSheets.indexOf(fillSheet) < 0) {
          root.adoptedStyleSheets = root.adoptedStyleSheets.concat(fillSheet);
        }
      } catch (err) {
        // ohne Constructable Stylesheets: dann eben in natuerlicher Hoehe
      }
    };
    Promise.resolve(element.updateComplete).then(add, add);
    window.setTimeout(add, 300);
  };
  /** Inhalt, Karte und Groesse eines PopUps pruefen - wie store.py. */
  const cleanPopupCard = (entry) => {
    entry.content = entry.content === "card" ? "card" : "links";
    if (typeof entry.card_yaml !== "string" || byteSize(entry.card_yaml) > POPUP_CARD_MAX) {
      entry.card_yaml = "";
    }
    let card = {};
    try {
      const text = JSON.stringify(entry.card);
      if (isObject(entry.card) && typeof entry.card.type === "string" && entry.card.type.trim() && byteSize(text) <= POPUP_CARD_MAX) {
        card = JSON.parse(text);
      }
    } catch (err) {
      card = {};
    }
    entry.card = card;
    ["width", "height"].forEach((prop) => {
      const n = Number(entry[prop]);
      entry[prop] = typeof entry[prop] === "number" && Number.isFinite(n) ? Math.max(0, Math.min(POPUP_SIZE_MAX, Math.round(n))) : 0;
    });
    return entry;
  };
  /**
   * Was das Panel am YAML einer Karte selbst prueft (1.5.3): leer oder zu
   * lang. Gelesen wird der Code vom YAML-Parser von Home Assistant
   * (ha_style_hub/card_yaml) - so wie configuration.yaml und Dashboards im
   * YAML-Modus. null: Code an Home Assistant geben.
   */
  const popupCardPrecheck = (raw, t) => {
    const text = typeof raw === "string" ? raw : "";
    if (!text.trim()) {
      return { ok: false, error: "empty", message: t.popup_card_empty };
    }
    const bytes = byteSize(text);
    if (bytes > POPUP_CARD_MAX) {
      return { ok: false, error: "too_big", tooBig: true, message: t.popup_card_toobig.replace("{size}", sizeText(bytes)) };
    }
    return null;
  };
  /** Die Antwort von Home Assistant als Zeile unter dem Feld. */
  const popupCardMessage = (res, text, t) => {
    if (res.ok) {
      return t.popup_card_ok.replace("{type}", res.card.type).replace("{size}", sizeText(byteSize(text)));
    }
    const line = Number(res.line) > 0 ? Number(res.line) : 0;
    const withLine = (message) => (line ? t.popup_card_error.replace("{line}", line).replace("{message}", message) : message);
    if (res.error === "tag") {
      return withLine(t.popup_card_tag);
    }
    if (res.error === "alias") {
      return withLine(t.popup_card_alias);
    }
    if (res.error === "no_type") {
      return t.popup_card_notype;
    }
    if (res.error === "too_big") {
      return t.popup_card_toobig.replace("{size}", sizeText(byteSize(text)));
    }
    return withLine(String(res.message || t.popup_card_check_failed));
  };
  const isPopup = (key) => String(key).indexOf(POPUP_PREFIX) === 0;
  // Spalten des PopUp-Fensters (1.5.2) - wie im Injector: hoechstens max je
  // Zeile, die Zeilen gleichmaessig, die letzte Zeile fuellen die Kacheln auf.
  const popupColumns = (count, max) => {
    const n = Math.max(1, count);
    return n <= max ? n : Math.ceil(n / Math.ceil(n / max));
  };
  const cleanPopupLinks = (raw) => {
    const links = [];
    const seen = new Set();
    (Array.isArray(raw) ? raw : []).forEach((one) => {
      if (!one || typeof one !== "object" || links.length >= POPUP_LINKS_MAX) {
        return;
      }
      const path = typeof one.path === "string" ? one.path : "";
      if (!LINK_PATH.test(path) || path === "/" || path.length > 200 || seen.has(path)) {
        return;
      }
      seen.add(path);
      links.push({
        path,
        name: typeof one.name === "string" ? one.name.trim().slice(0, 60) : "",
        icon: typeof one.icon === "string" && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(one.icon.trim()) ? one.icon.trim() : "",
      });
    });
    return links;
  };
  /** Die Vorgaben eines Eintrags je nach Art (PopUp mit eigener, frischer Liste). */
  const itemDefaults = (key) =>
    isHeading(key) ? DEFAULT_HEADING : isPopup(key)
      ? Object.assign({}, DEFAULT_ITEM, { links: [], content: "links", card_yaml: "", card: {}, width: 0, height: 0 })
      : DEFAULT_ITEM;
  // Die Menuepunkte der Einstellungsseite, wie der Injector sie zuletzt
  // gesehen hat (pro Browser) - siehe MENU_SEEN_KEY dort.
  const MENU_SEEN_KEY = "ha-style-hub-menu";
  const MENU_PATHS_MAX = 80;
  // Menuepunkte der Einstellungsseite (1.4.8): je Pfad ein eigener Name,
  // Untertitel aus, Symbolfarbe und Hintergrund der Symbol-Box.
  const MENU_ITEM_KEYS = { name: 60, icon: 60, icon_color: 80, icon_background: 80 };
  const cleanMenuItems = (raw) => {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return out;
    }
    Object.keys(raw).slice(0, MENU_PATHS_MAX).forEach((path) => {
      const one = raw[path];
      if (path === "/" || path.length > 200 || !LINK_PATH.test(path) || !one || typeof one !== "object" || Array.isArray(one)) {
        return;
      }
      const clean = {};
      Object.keys(MENU_ITEM_KEYS).forEach((key) => {
        const value = typeof one[key] === "string" ? one[key].trim().slice(0, MENU_ITEM_KEYS[key]) : "";
        if (key === "icon" && value && !ICON_NAME.test(value)) {
          return;
        }
        if (value) {
          clean[key] = value;
        }
      });
      if (one.hide_sub === true) {
        clean.hide_sub = true;
      }
      if (Object.keys(clean).length) {
        out[path] = clean;
      }
    });
    return out;
  };
  // Eigene Werte im Systemmonitor (1.4.8): Entitaet und optional ein Name.
  const MONITOR_SENSORS_MAX = 6;
  const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
  const cleanSensors = (raw) => {
    const out = [];
    (Array.isArray(raw) ? raw : []).forEach((one) => {
      const entity = one && typeof one === "object" && typeof one.entity === "string" ? one.entity.trim() : "";
      if (!entity || !ENTITY_ID.test(entity) || out.length >= MONITOR_SENSORS_MAX || out.some((x) => x.entity === entity)) {
        return;
      }
      out.push({ entity, name: typeof one.name === "string" ? one.name.trim().slice(0, 40) : "" });
    });
    return out;
  };
  const cleanPaths = (raw) => {
    const paths = [];
    if (!Array.isArray(raw)) {
      return paths;
    }
    raw.forEach((one) => {
      if (
        typeof one === "string" &&
        paths.length < MENU_PATHS_MAX &&
        one !== "/" &&
        one.length <= 200 &&
        LINK_PATH.test(one) &&
        paths.indexOf(one) < 0
      ) {
        paths.push(one);
      }
    });
    return paths;
  };
  /**
   * Die Bloecke der Einstellungsseite, solange der Injector sie in diesem
   * Browser noch nicht gesehen hat. Pfade wie in config-sections.ts des
   * Frontends; was es in der installierten Fassung nicht gibt, bleibt einfach
   * ohne Wirkung.
   */
  const MENU_FALLBACK = [
    [
      ["/config/integrations", "Ger\u00e4te & Dienste", "Devices & services",
        "Integrationen, Ger\u00e4te, Entit\u00e4ten und Helfer", "Integrations, devices, entities, and helpers"],
      ["/config/automation", "Automationen & Szenen", "Automations & scenes",
        "Automationen, Szenen, Skripte und Blueprints", "Automations, scenes, scripts, and blueprints"],
      ["/config/areas", "Bereiche, Labels & Zonen", "Areas, labels & zones",
        "Orte in und um dein Zuhause verwalten", "Manage locations in and around your house"],
      ["/config/apps", "Apps", "Apps",
        "Zus\u00e4tzliche Anwendungen neben Home Assistant", "Run extra applications next to Home Assistant"],
      ["/config/lovelace/dashboards", "Dashboards", "Dashboards",
        "Lege fest, wie du dein Zuhause bedienst", "Organize how you interact with your home"],
    ],
    [["/config/voice-assistants", "Sprachassistenten", "Voice assistants",
      "Sprachassistenten verwalten", "Manage your voice assistants"]],
    [
      ["/config/person", "Personen", "People",
        "Verwalte, wer Zugriff auf dein Zuhause hat", "Manage who can access your home"],
      ["/config/system", "System", "System",
        "Backups erstellen, Logs pr\u00fcfen oder neu starten", "Create backups, check logs, or reboot your system"],
      ["/config/tools", "Werkzeuge", "Tools",
        "System untersuchen und Fehler suchen", "Inspect and debug your system"],
      ["/config/info", "\u00dcber", "About",
        "Versionsinfos, Mitwirkende und mehr", "Version information, credit, and more"],
    ],
  ];

  // Die Links der Kopfzeile: eine Liste aus {path, name, icon, color} in
  // header.links - siehe const.py und cleanHeaderLinks() im Injector. Die
  // Favoriten der Einstellungsseite (settings.favorites) sind gleich gebaut.
  const HEADER_LINKS_MAX = 12;
  const ICON_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/i;
  // 1.5.4: in der Kopfzeile auch der Zustand einer Entitaet (entities = true):
  // {path: "", entity: "sensor.x", name, icon, color} - wie store.py.
  const SENSOR_ICON = "mdi:gauge";
  const cleanHeaderLinks = (raw, entities) => {
    const links = [];
    if (!Array.isArray(raw)) {
      return links;
    }
    const seen = new Set();
    raw.forEach((one) => {
      if (!one || typeof one !== "object" || links.length >= HEADER_LINKS_MAX) {
        return;
      }
      const entity = entities === true && typeof one.entity === "string" ? one.entity.trim() : "";
      if (entity) {
        if (ENTITY_ID.test(entity) && !seen.has(`entity:${entity}`)) {
          seen.add(`entity:${entity}`);
          links.push({
            path: "",
            entity,
            name: typeof one.name === "string" ? one.name.trim().slice(0, 60) : "",
            icon: typeof one.icon === "string" && ICON_NAME.test(one.icon) ? one.icon : "",
            color: typeof one.color === "string" ? one.color.trim().slice(0, 80) : "",
            value_color: typeof one.value_color === "string" ? one.value_color.trim().slice(0, 80) : "",
            value_only: one.value_only === true,
          });
        }
        return;
      }
      const path = typeof one.path === "string" ? one.path : "";
      if (!LINK_PATH.test(path) || path === "/" || path.length > 200 || seen.has(path)) {
        return;
      }
      seen.add(path);
      links.push({
        path,
        name: typeof one.name === "string" ? one.name.trim().slice(0, 60) : "",
        icon: typeof one.icon === "string" && ICON_NAME.test(one.icon) ? one.icon : "",
        color: typeof one.color === "string" ? one.color.trim().slice(0, 80) : "",
      });
    });
    return links;
  };
  /**
   * Die Favoriten: wie die Links der Kopfzeile, dazu je Favorit sein
   * Aussehen. Wie _clean_favorites() in store.py und im Injector.
   */
  const cleanFavorites = (raw) => {
    const list = Array.isArray(raw) ? raw : [];
    return cleanHeaderLinks(list).map((link) => {
      const source = list.find((one) => one && typeof one === "object" && one.path === link.path) || {};
      const clean = Object.assign({}, DEFAULT_FAVORITE, link);
      Object.keys(DEFAULT_FAVORITE).forEach((key) => {
        if (key in link) {
          return;
        }
        const fallback = DEFAULT_FAVORITE[key];
        const one = source[key];
        if (typeof fallback === "boolean") {
          clean[key] = typeof one === "boolean" ? one : fallback;
        } else if (typeof fallback === "number") {
          const limit = key.indexOf("radius") === 0 ? 200 : 80;
          clean[key] =
            typeof one === "number" && Number.isFinite(one) && one >= -1 && one <= limit
              ? Math.trunc(one)
              : fallback;
        } else {
          clean[key] = typeof one === "string" ? one.trim().slice(0, 80) : fallback;
        }
      });
      return clean;
    });
  };
  const placeOf = (raw, allowed) => (allowed.indexOf(raw) >= 0 ? raw : allowed[0]);

  /**
   * Die Auswahl im Dialog "Eintrag hinzufuegen". Pfade und Icons wie in den
   * Einstellungen von Home Assistant (config-sections.ts und die Reiter der
   * Werkzeuge im Frontend); die Namen sind eigene, weil der Link ohnehin
   * umbenannt werden kann.
   */
  const LINK_GROUPS = [
    {
      de: "Automationen & Szenen",
      en: "Automations & scenes",
      links: [
        ["/config/automation", "mdi:robot", "Automatisierungen", "Automations"],
        ["/config/scene", "mdi:palette", "Szenen", "Scenes"],
        ["/config/script", "mdi:script-text", "Skripte", "Scripts"],
        ["/config/blueprint", "mdi:palette-swatch", "Blueprints", "Blueprints"],
      ],
    },
    {
      de: "Ger\u00e4te & Dienste",
      en: "Devices & services",
      links: [
        ["/config/integrations", "mdi:puzzle", "Integrationen", "Integrations"],
        ["/config/devices", "mdi:devices", "Ger\u00e4te", "Devices"],
        ["/config/entities", "mdi:shape", "Entit\u00e4ten", "Entities"],
        ["/config/helpers", "mdi:tools", "Helfer", "Helpers"],
      ],
    },
    {
      de: "Bereiche, Labels & Zonen",
      en: "Areas, labels & zones",
      links: [
        ["/config/areas", "mdi:sofa", "Bereiche", "Areas"],
        ["/config/labels", "mdi:label", "Labels", "Labels"],
        ["/config/zone", "mdi:map-marker-radius", "Zonen", "Zones"],
      ],
    },
    {
      de: "Werkzeuge",
      en: "Tools",
      links: [
        ["/config/tools", "mdi:hammer", "Werkzeuge", "Tools"],
        ["/config/tools/state", "mdi:format-list-bulleted", "Zust\u00e4nde", "States"],
        ["/config/tools/action", "mdi:play-circle-outline", "Aktionen", "Actions"],
        ["/config/tools/template", "mdi:code-braces", "Template", "Template"],
        ["/config/tools/event", "mdi:broadcast", "Ereignisse", "Events"],
        ["/config/tools/statistics", "mdi:chart-line", "Statistiken", "Statistics"],
        ["/config/tools/yaml", "mdi:file-code-outline", "YAML", "YAML"],
        ["/config/tools/assist", "mdi:microphone-message", "Assist", "Assist"],
      ],
    },
    {
      de: "System",
      en: "System",
      links: [
        ["/config/system", "mdi:cog", "System", "System"],
        ["/config/general", "mdi:cog-outline", "Allgemein", "General"],
        ["/config/updates", "mdi:update", "Updates", "Updates"],
        ["/config/repairs", "mdi:screwdriver", "Reparaturen", "Repairs"],
        ["/config/logs", "mdi:text-box-outline", "Protokolle", "Logs"],
        ["/config/backup", "mdi:backup-restore", "Backups", "Backups"],
        ["/config/network", "mdi:network", "Netzwerk", "Network"],
        ["/config/storage", "mdi:database", "Speicher", "Storage"],
        ["/config/hardware", "mdi:memory", "Hardware", "Hardware"],
        ["/config/info", "mdi:information-outline", "\u00dcber", "About"],
      ],
    },
    {
      de: "Weitere",
      en: "More",
      links: [
        ["/config/apps", "mdi:puzzle-outline", "Apps", "Apps"],
        ["/config/lovelace/dashboards", "mdi:view-dashboard", "Dashboards", "Dashboards"],
        ["/config/voice-assistants", "mdi:microphone", "Sprachassistenten", "Voice assistants"],
        ["/config/person", "mdi:account", "Personen", "People"],
        ["/config/users", "mdi:badge-account-horizontal", "Benutzer", "Users"],
        ["/config/tags", "mdi:nfc-variant", "Tags", "Tags"],
        ["/config/energy", "mdi:lightning-bolt", "Energie", "Energy"],
      ],
    },
  ];

  /* ------------------------------------------------------------------ *
   * Translations
   * ------------------------------------------------------------------ */

  const STRINGS = {
    en: {
      page_info: "Info",
      search_placeholder: "Search settings",
      search_none: "Nothing found.",
      nav_transfer: "Export / Import",
      import_paste: "or paste the contents",
      sidebar_import_title: "Import the sidebar",
      sidebar_import_hint: "Choose a file or paste its contents - an export of the sidebar from here, or a complete HA Style Hub export, of which only layout, entries and appearance are read. Whether the sidebar is hidden is left as it is, and nothing is saved until you press “Save”.",
      sidebar_import_empty: "The file holds no sidebar settings.",
      sidebar_import_done: "Sidebar taken over - save to keep it",
      preset_apply: "Apply template",
      preset_apply_name: "Apply template {name}",
      sbp_open: "Expanded",
      sbp_closed: "Collapsed",
      sbp_empty: "No visible entries.",
      layout_grid: "Grid",
      layout_sizes: "Sizes",
      layout_behaviour: "Behaviour",
      entry_add_short: "Heading, link, popup",
      inspector_empty: "Pick an entry.",
      heading_meta: "Heading · {n}",
      hidden_short: "hidden",
      span_label: "Column width",
      item_style_auto_short: "Automatic",
      item_style_tile_short: "Tiles",
      item_style_row_short: "Rows",
      item_style_hint: "Automatic: tiles from 2 columns on. Tiles: icon above the text. Rows: icon next to the text.",
      span_one: "1 column",
      span_many: "{n} columns",
      span_hint: "More than one column is set under Layout.",
      like_appearance: "as Appearance",
      entry_reset: "Reset",
      text_short: "Text",
      item_background_short: "Background",
      hide_in_sidebar: "Hide in the sidebar",
      move_up: "Up",
      move_down: "Down",
      theme_empty: "empty",
      theme_empty_hint: "Empty means: Home Assistant keeps its value.",
      group_clear: "Clear group",
      hsec_color: "Color and gradient",
      hsec_size: "Sizes",
      hsec_frame: "Border and corners",
      hsec_tabs: "View tabs",
      hsec_buttons: "Buttons on the right side",
      header_view_three: "Garden",
      settings_icons_title_short: "Menu entries",
      topic_tables_title: "Tables",
      settings_icon_radius_short: "Corner radius",
      settings_box_placeholder: "empty · each keeps its color",
      table_groups_title: "Group headers",
      pane_page: "Settings page",
      pane_list: "Devices & services",
      pane_tables: "Tables",
      preview_before: "Before",
      transfer_all: "Complete configuration",
      sidebar_transfer_hint: "Export saves layout, entries and appearance of the sidebar as a .json file. Import reads such a file back in. Only the sidebar is affected; theme, header and HA-Settings stay as they are.",
      transfer_foot: "An import is taken into the page straight away and only stored with “Save”. Until then, “Discard” brings back the saved state.",
      eyebrow_theme: "Colors of Home Assistant",
      eyebrow_header: "Header of the dashboards",
      eyebrow_settings: "Pages of Home Assistant itself",
      eyebrow_transfer: "Back up and share",
      eyebrow_info: "Introduction, tools, support",
      page_transfer: "Export and import",
      area_general: "General",
      all_saved: "All saved",
      was_empty: "empty",
      was_on: "on",
      was_off: "off",
      changed_short: "changed",
      before_value: "before {v}",
      changed_before: "changed, before {v}",
      links_of: "{n} of {max}",
      n_changed: "{n} changed",
      info_lead: "Make your Home Assistant look exactly the way you like it. With HA Style Hub you adapt the interface and your dashboards to your own taste, without having to write code.",
      info_areas: "Style Hub is split into four areas, and together they cover the design of the system and of your dashboards:",
      info_sidebar: "<p>This is where you set up the sidebar the way you want it:</p><p><strong>Layout</strong>: 1 to 4 columns (1 to 3 collapsed), gap, width expanded and collapsed, size of the entries, an optional restart button, Settings, Notifications and the user entry inside the grid, and hiding the whole sidebar (kiosk mode).</p><p><strong>Entries</strong>: sort by dragging - right in the preview as well -, rename, own icons, colors and column width per entry, hide, section headings as groups that fold away, links to any page of Home Assistant and popup links that open a window with several pages or a Lovelace card from your dashboard.</p><p><strong>Appearance</strong>: background and gradient, hover, text and icon colors, font, borders per side, corners per corner, the notification drawer and the theme colors of the sidebar.</p>",
      info_theme: "<p>Colors Home Assistant itself - dashboards, dialogs and the settings pages - as a real theme with {n} variables, dark and light kept separately, plus the {p} steps of the primary color scale that are worked out automatically.</p><p><strong>Preview</strong>: every tile and every element in it can be clicked - switches, buttons, state colors, table rows, chart colors, code … - and opens exactly the matching fields on the right.</p><p><strong>Range</strong>: cards, fonts, state and status colors, tables, input fields, dialogs and code editor up to charts, energy, weather and the design tokens and switches of Home Assistant 2026.10.</p><p><strong>Tools</strong>: a palette from one main color, ready-made templates, the shadow designer, contrast check, quick colors, the dashboard background as color, gradient or image, and YAML export and import.</p>",
      info_header: "<p>Takes care of the bar at the top of the dashboards, up to hiding it completely (kiosk mode, also as a switch entity).</p><p><strong>Look</strong>: color or gradient, opacity and blur, height, border and corners, title and icon size, colors and borders of the view tabs and buttons - or one of the templates <em>Glass</em>, <em>Slim</em> and <em>Detached</em>.</p><p><strong>Buttons</strong>: hide Home Assistant's four buttons one by one, and put your own in front of them: restart, links, sensors (the state of any entity) and CPU, memory and storage.</p><p><strong>Theme colors of the header</strong>: the theme variables of the bar, also for the edit mode of a dashboard.</p>",
      info_settings: "<p>Styles the pages of Home Assistant itself:</p><p><strong>Settings page</strong>: the menu entries as boxes in your own colors, in columns or as tiles, in your own order and with an own name, subtitle and colors per entry - on the profile page as well. Plus a favourites bar, a system monitor with processor, memory, storage and up to six own entities, the last backup with <em>Create backup now</em> and an overview with counters.</p><p><strong>Devices &amp; services</strong>: integrations and apps as a slim list in 1 to 3 columns; the page of a single integration follows with its own row height.</p><p><strong>Tables</strong>: group headers, stripes, row background, font size and mouse hover.</p>",
      info_tip: "<strong>Tip:</strong> on the Theme page, <strong>Choose a palette</strong> builds a complete set of colors from a single main color. The clock icon at the top right opens the <strong>History</strong> of the last saved states - one click brings an earlier look back into the page.",
      info_important: "<strong>Important:</strong> two of these switches are also available as entities in Home Assistant, under the device <strong>HA Style Hub</strong>: hiding the header and hiding the sidebar (kiosk mode). That lets you put them on a dashboard as a button or use them directly in automations.",
      info_note: "<strong>Note:</strong> every change is visible in the preview straight away – it is only stored when you click <strong>Save</strong>. <strong>Discard</strong> brings back the state that was last saved. Empty fields always mean “leave it as it is” – so you only fill in what you really want to change. If something does go wrong, <strong>Reset everything</strong> on the right of this page puts everything back to the defaults. With the <strong>Export / Import</strong> icon at the top right you back up each area on its own or everything together.",
      info_by: "Developed by",
      info_issue: "Report a problem",
      info_docs: "Open the documentation",
      info_support_title: "Support the project",
      info_support: "Every little bit of support helps and motivates. Thank you.",
      brand_short: "Style Hub",
      all_entries: "All entries",
      before_badge: "Saved state",
      favorites_empty_stage: "No favourites yet · click to set them up",
      monitor_off_stage: "System monitor is off · click to set it up",
      goto_sidebar: "Sidebar page",
      goto_header: "Header page",
      goto_theme_cards: "Cards and background · Theme",
      header_hidden_full: "Hide the header completely (kiosk mode)",
      hide_sidebar_full: "Hide the sidebar completely (kiosk mode)",
      header_hidden_stage: "The header is hidden.",
      show_hidden_short: "Hidden ones",
      stage_home: "Home",
      stage_sidebar_title: "Your sidebar.",
      stage_sidebar_hint_layout: "Columns, width and gaps take effect right away.",
      stage_sidebar_hint_items: "Click an entry to edit it, drag it to reorder.",
      stage_sidebar_hint_look: "Click a part of the sidebar to open its fields.",
      stage_header_title: "Click what you want to change.",
      stage_header_hint: "Its fields are on the right.",
      stage_theme_title: "The colors of Home Assistant.",
      stage_theme_hint: "Click what you want to recolor.",
      stage_settings_title: "The pages of Home Assistant.",
      stage_settings_hint: "Pick a page at the top right, then click what you want to change.",
      stage_transfer_title: "Back up and share.",
      stage_transfer_hint: "Everything at once or each area on its own.",
      tag_selected: "{name} · selected",
      tag_selected_short: "selected",
      unsaved_n: "{n} unsaved",
      unsaved_short: "{n} open",
      view_simple: "Simple",
      view_all_fields: "All fields",
      view_all_groups: "All {n} groups",
      spot_cards: "Cards",
      spot_sliders: "Sliders and badges",
      spot_states: "State colors",
      spot_devices: "Devices",
      spot_climate: "Climate",
      spot_security: "Security",
      spot_table: "Table",
      spot_inputs: "Input fields",
      spot_status: "Status colors",
      spot_dialog: "Dialog and code",
      spot_text: "Text and font",
      spot_dash: "Dashboard background",
      ts_light: "Light",
      ts_lamp: "Floor lamp",
      ts_ceiling: "Ceiling",
      ts_sliders: "Sliders and badges",
      ts_states: "State colors",
      ts_devices: "Devices",
      ts_climate: "Climate",
      ts_security: "Security",
      ts_light_on: "Light on",
      ts_table: "Table",
      ts_state: "State",
      ts_on: "on",
      ts_heating: "Heating",
      ts_door: "Front door",
      ts_hall: "Hall",
      ts_locked_state: "locked",
      ts_inputs: "Input fields",
      ts_pick_area: "Choose an area",
      ts_status: "Status colors",
      ts_error: "Error",
      ts_warning: "Warning",
      ts_success: "Success",
      ts_info: "Info",
      ts_dialog: "Dialog and code",
      ts_text: "Text and font",
      ts_heading: "Heading",
      ts_body: "Body text at normal size",
      ts_small: "Secondary text, a bit smaller",
      ts_link: "A link",
      ts_dash: "Dashboard background",
      ts_energy: "Energy",
      ts_history: "History",
      ts_media: "Media",
      header_show_disk: "Show storage space",
      monitor_sensors: "Own values",
      monitor_sensors_hint: "Up to six entities of your own next to processor, memory and storage - e.g. CPU temperature, uptime or the power of the house. A click opens the entity.",
      monitor_sensors_empty: "No own values yet - the plus adds one.",
      monitor_sensor_add: "Add a value",
      monitor_sensor_remove: "Remove this value",
      monitor_sensor_entity: "Entity",
      monitor_sensor_name: "Name",
      monitor_sensor_name_auto: "name of the entity",
      monitor_sensor_missing: "entity not found",
      monitor_backup_button: "Button “Create backup now”",
      monitor_backup_now: "Create backup now",
      monitor_backup_button_hint: "Below the backup box, for administrators: starts a backup with the automatic settings of the backup page, after a confirmation.",
      settings_profile_page: "Use it on the profile page too",
      settings_profile_page_hint: "Since Home Assistant 2026.10 the profile page has the same menu: icon boxes, colors, columns, tiles, border and mouse hover apply there as well.",
      settings_list_entries: "Style the page of an integration as well",
      settings_list_entries_hint: "The entries on the page of a single integration get border, corners, background and gap of the rows (Home Assistant 2026.10 and later).",
      menu_item_edit: "Edit this menu entry",
      menu_item_name: "Name",
      menu_item_hide_sub: "Hide the subtitle",
      menu_item_icon_background: "Background of the icon box",
      menu_item_icon_color: "Icon color",
      menu_item_hint: "Empty: as Home Assistant shows it. Overrides the colors of all entries above.",
      menu_item_reset: "Reset entry",
      changes_title: "Unsaved changes",
      changes_hint: "Everything that differs from the saved state, field by field. Show jumps to the field, Reset takes back just this one change.",
      changes_show: "Show",
      changes_reset: "Reset",
      changes_order: "Order of the entries",
      changes_entry: "Entry",
      changes_list_n: "list ({n})",
      contrast_warn: "Contrast {r} : 1 to “{bg}” - hard to read (recommended: 4.5 : 1 or more).",
      qc_theme: "Colors in use",
      qc_recent: "Recently used",
      ts_weather: "Weather",
      ts_w_sunny: "Sunny",
      ts_w_partly: "Partly cloudy",
      ts_w_cloudy: "Cloudy",
      ts_w_rainy: "Rainy",
      ts_w_lightning: "Lightning",
      ts_w_snowy: "Snowy",
      ts_w_night: "Clear night",
      ts_code_comment: "Light in the evening",
      ts_charts: "Chart",
      ts_charts_sub: "History · colors 1–54",
      ts_history_line: "History line: on, unknown, off, unavailable",
      ts_controls: "Controls",
      ts_controls_sub: "Design tokens · switches",
      ts_btn_more: "More",
      ts_btn_delete: "Delete",
      ts_surface: "Surface",
      spot_weather: "Weather",
      spot_charts: "Chart",
      spot_energy: "Energy",
      spot_controls: "Controls",
      shadow_title: "Design the shadow",
      shadow_hint: "Templates and sliders fill the field Shadow above - if you know CSS you can still type it there.",
      shadow_p_none: "No shadow",
      shadow_p_breath: "Hint",
      shadow_p_soft: "Soft",
      shadow_p_medium: "Medium",
      shadow_p_strong: "Strong",
      shadow_p_around: "All around",
      shadow_dir: "Direction",
      shadow_d_down: "Down",
      shadow_d_down_right: "Down right",
      shadow_d_right: "Right",
      shadow_d_up_right: "Up right",
      shadow_d_up: "Up",
      shadow_d_up_left: "Up left",
      shadow_d_left: "Left",
      shadow_d_down_left: "Down left",
      shadow_d_around: "All around (no offset)",
      shadow_dist: "Distance",
      shadow_blur: "Blur",
      shadow_spread: "Spread",
      shadow_opacity: "Opacity",
      shadow_color: "Color",
      shadow_inset: "Inset",
      shadow_custom: "The field holds a value the sliders cannot show (several shadows or a special color). Moving a slider replaces it.",
      primary_scale: "Scale for newer controls",
      primary_scale_hint: "Computed from the primary color (--ha-color-primary-05 … 95), like Home Assistant does for its default theme: buttons, switches, checkboxes and links follow the theme. Hex or rgb() colors only.",
      header_actions_color: "Colour of the right side",
      header_actions_color_hint: "Buttons, your own links and CPU/RAM/storage on the right of the header. The tabs keep their own colour. Empty: like the icons and text of the header.",
      header_show_disk_hint: "Free and used disk space in front of the buttons, styled like CPU and RAM and refreshed every minute. Only visible to administrators; hidden on very narrow screens.",
      header_disk_free: "Free",
      header_disk_used: "Used",
      header_disk_free_value: "7.5 GB",
      header_disk_used_value: "50.5 GB",
      hsec_theme: "Theme colors of the header",
      monitor_counts: "Show an overview box (counters)",
      monitor_counts_hint: "How many devices, entities, integrations, apps, automations, scenes, scripts, custom cards, blueprints, users and long-lived tokens there are - in a box of its own, styled like the system monitor. A click on a number opens its page. Counted for administrators; what Home Assistant does not hand out stays empty.",
      monitor_counts_place: "Position of the overview box",
      monitor_counts_place_top: "At the top (below system monitor and backup)",
      monitor_counts_items: "What is counted",
      count_devices: "Devices",
      count_entities: "Entities",
      count_integrations: "Integrations",
      count_apps: "Apps",
      count_automations: "Automations",
      count_scenes: "Scenes",
      count_scripts: "Scripts",
      count_cards: "Custom cards",
      count_blueprints: "Blueprints",
      count_users: "Users",
      count_tokens: "Tokens",
      count_demo_entities: "4 unavailable",
      count_demo_integrations: "57 entries · 1 failing",
      monitor_note: "Processor and memory come from Home Assistant's hardware integration every 5 seconds, storage from the Supervisor (without one: the disk with the configuration) once a minute. The width follows the columns of the Settings page; the three values always stand side by side, on a phone a little smaller. From 80 % (storage 85 %) a value turns orange, from 95 % red. The preview is a model with fixed values.",
      count_demo_devices: "3 unreachable · 2 disabled",
      count_demo_apps: "1.4 GB RAM · 6.2 GB disk",
      count_demo_scenes: "last 2 hr. ago",
      count_demo_scripts: "last 25 min. ago",
      count_demo_blueprints: "5 automation · 2 script",
      count_demo_users: "1 admins",
      count_demo_automations: "58 on",
      count_demo_cards: "33 resources",
      count_demo_tokens: "last used 3 days ago",
      lsec_theme: "Theme colors of the sidebar",
      sidebar_theme_hint: "These variables belong to the theme (dark / light) and only apply while the theme is registered in Home Assistant. Colors you set above (background, text, icons, active entry, top area, title) are taken over automatically for both modes; a value you set here yourself stays. Your own values above take precedence in Home Assistant.",
      accordion_label: "Groups as accordion",
      accordion_on: "Accordion: only one group open at a time (click to open groups individually)",
      accordion_off: "Groups open individually (click for accordion: only one open at a time)",
      table_row_background: "Row color",
      table_rows_hint: "Row color: the background of every row, empty keeps Home Assistant's. Stripes make long tables easier to read: every second row gets its color, empty means no stripes. Hover: the color under the mouse, empty keeps Home Assistant's own effect. Font size: 0 means as Home Assistant (10 to 24 px). The row height stays the same.",
      ts_design: "Card design",
      ts_design_sub: "Border, corners, shadow, title",
      spot_design: "Card design",
      header_theme_hint: "These variables belong to the theme (dark / light) and only apply while the theme is registered in Home Assistant. Colors you set above (background, text, line below) are taken over automatically for both modes as far as Home Assistant has a variable for them; a value you set here yourself stays. Your own values above take precedence in Home Assistant.",
      theme_pull: "Take over colors",
      theme_pull_done: "{n} colors taken over into the theme (dark and light).",
      theme_pull_none: "No colors set on this page yet.",
      palette_title: "Choose a palette",
      list_meta_devices: "{n} devices",
      list_meta_service: "1 service",
      table_col_state: "State",
      table_state_on: "on",
      table_state_off: "off",
      table_state_locked: "locked",
      table_state_clear: "clear",
      table_state_ok: "OK",
      table_row_tv: "Television",
      table_row_thermostat: "Thermostat",
      table_row_fridge: "Fridge",
      table_row_coffee: "Coffee machine",
      table_group_hall: "Hallway",
      table_row_door: "Front door",
      table_row_motion: "Motion sensor",
      table_row_smoke: "Smoke detector",
      table_group_garden: "Garden",
      table_row_pump: "Pond pump",
      table_row_garden_light: "Path lights",
      heading_border_width: "Border (px)",
      settings_hide_tip: "Hide the tip below the menu",
      settings_hide_tip_hint: "Home Assistant shows a changing tip line below the menu items of the settings page.",
      stage_tip: "Tip: you can also search the settings.",
      settings_list_columns_hint: "1 is the normal list of Home Assistant. On a narrow screen the list drops to fewer columns by itself - a column never gets narrower than 260 px.",
      pane_switch: "Page in the preview",
      monitor_sensors_only: "Show only own entities",
      monitor_sensors_only_hint: "Hides processor, memory and storage - only your own values stay. Without own values nothing changes.",
      settings_list_entries_row_height: "Row height on the integration page (px)",
      settings_list_entries_row_height_hint: "Entries, devices and sub-entries on the page of an integration. 0 = like Home Assistant; between 32 and 120 px.",
      undo_done: "One step back",
      undo_none: "Nothing left to undo",
      redo_done: "One step forward again",
      redo_none: "Nothing to redo",
      ctl_btn_primary: "Button, loud",
      ctl_btn_more: "Button, quiet",
      ctl_btn_cancel: "Button, neutral",
      ctl_btn_delete: "Button, danger",
      ctl_chip_success: "Chip, success",
      ctl_chip_warning: "Chip, warning",
      ctl_check_on: "Checkbox, checked",
      ctl_check_off: "Checkbox, empty",
      ctl_switch_on: "Switch, on",
      ctl_switch_off: "Switch, off",
      ctl_input: "Input field",
      ctl_surface: "Surface",
      header_hint: "The bar of a dashboard, at the top or at the bottom. Home Assistant only offers a few theme variables for it (below under “Theme colors of the header”) - so HA Style Hub styles it with its own CSS. These settings apply to both modes at once, not per light and dark. While a dashboard is being edited Home Assistant shows its own toolbar; its colors are in the theme colors of the header as well.",
      ctl_card_head: "Card title",
      ctl_icon_on: "Icon, on",
      ctl_icon_off: "Icon, off",
      ctl_badge: "Badge",
      ctl_slider: "Slider",
      ctl_table_head: "Table header",
      ctl_input_text: "Input field",
      ctl_input_select: "Drop-down",
      ctl_scrim: "Behind the dialog",
      ctl_editor: "Code editor",
      ctl_heading: "Heading",
      ctl_body_text: "Body text",
      ctl_chart_lines: "Chart lines",
      ctl_timeline: "History line",
      entry_add: "Add a section heading, a link or a popup",
      add_popup_title: "Popup link",
      add_popup_hint: "One entry in the sidebar that opens a window - with several pages as tiles, or with a card from your dashboard.",
      add_popup_name: "Name of the popup",
      add_popup_pick: "Add page to the popup",
      add_popup_button: "Create popup",
      add_popup_empty: "No page chosen yet - pick one above and add it.",
      add_popup_none: "Add at least one page first.",
      popup: "Popup",
      popup_sub: "Window with links",
      popup_remove: "Remove popup",
      popup_links: "Links in the popup",
      popup_links_empty: "No links yet - choose a page below.",
      popup_add: "Add",
      popup_link_remove: "Remove this link",
      popup_full: "A popup holds at most 24 links.",
      popup_group_panels: "Dashboards and pages of the sidebar",
      popup_hint_hide: "Tip: entries that now sit in the popup can be hidden in the sidebar (eye).",
      popup_preview_tag: "Popup · preview",
      qc_special: "No color",
      popup_use_hint: "In Home Assistant a click on the entry opens the window. A click on a tile opens the page without reloading; Ctrl-click (⌘-click on a Mac) or the middle mouse button opens it in a new tab. Esc, the cross or a click next to the window closes it.",
      popup_content: "Content of the window",
      popup_content_links: "Links",
      popup_content_card: "Card (YAML)",
      popup_width: "Window width (px)",
      popup_height: "Window height (px)",
      popup_size_hint: "0 = automatic: width 560 px with links, 600 px with a card; the height follows the content up to 85 % of the screen, more scrolls. On a phone the window is never wider than the screen.",
      popup_card_yaml: "Card code (YAML)",
      popup_card_placeholder: "type: entities\nentities:\n  - light.living_room",
      popup_card_hint: "Take the code from a dashboard: edit the card → ⋮ → Edit in code editor, copy everything and paste it here. Several cards: put them into a vertical-stack or grid. Custom cards work if they are installed (HACS). The code is read by Home Assistant's YAML parser, as in configuration.yaml: put on/off/yes/no in quotes (\"on\"), otherwise they become true/false. At most 50 KB.",
      popup_card_use_hint: "In Home Assistant a click on the entry opens the window with the card. Buttons and switches of the card work as on the dashboard; if the card opens a more-info dialog, the window closes. Esc, the cross or a click next to the window closes it.",
      popup_card_none: "No card yet - paste the code of a card under Entries.",
      popup_card_preview: "Card: {type}",
      popup_card_empty: "No code yet.",
      popup_card_error: "Line {line}: {message}",
      popup_card_notype: "The code needs a \"type:\" at the top level, e.g. type: entities.",
      popup_card_ok: "OK - card \"{type}\", {size}.",
      popup_card_toobig: "Too long: {size} - at most 50 KB. The last valid code stays stored.",
      popup_sub_card: "Window with a card",
      popup_card_checking: "Home Assistant is checking the code …",
      popup_card_check_failed: "The code could not be checked - is HA Style Hub up to date and loaded?",
      popup_card_tag: "Tags like !include or !secret are not possible in a card",
      popup_card_alias: "References (*name) are not possible in a card",
      add_popup_card_hint: "After creating it, paste the code of a card (YAML) under Entries - copied from the code editor of a dashboard card.",
      add_link_kind: "What should the button show?",
      add_link_kind_page: "Page",
      add_link_kind_entity: "Sensor / entity",
      add_link_entity: "Entity",
      add_link_entity_intro: "The current state of an entity as a button in the header - e.g. the outside temperature. A click opens the more-info dialog of Home Assistant.",
      add_link_entity_hint: "Type to search (entity ID or name). Sensors come first, every other entity works as well. Value and unit are shown as on a dashboard.",
      add_link_entity_button: "Add sensor",
      add_link_entity_invalid: "Please choose an existing entity, e.g. sensor.outside_temperature.",
      header_link_sensor: "Sensor",
      header_sensor_icon_auto: "icon of the entity",
      settings_list_error_background: "Background on errors",
      settings_list_warning_background: "Background when not loaded",
      settings_list_problem_background_hint: "Entries that need attention on the page of an integration: errors such as a failed setup (Home Assistant: red) and not loaded / failed unload (orange). Color or gradient; empty = like Home Assistant. The opacity (0-100 %) applies to both - lower values tone a strong color down.",
      header_links_hint: "Shortcuts to pages of Home Assistant - or the state of a sensor - as buttons in the header, in front of Home Assistant's buttons. The plus adds one; name (shown as tooltip), icon and colour can be changed here. Links into the settings are only shown to administrators; a sensor shows its value and opens the more-info dialog.",
      header_sensor_look: "Icon and colors of the sensor",
      header_sensor_icon_color: "Icon color",
      header_sensor_value_color: "Value color",
      header_sensor_value_color_auto: "like the icon",
      header_sensor_value_only: "Show the value only (no icon)",
      header_sensor_look_hint: "Without an own icon the button shows the icon of the entity. Empty colors: the color of the right side of the header; an empty value color takes the icon color.",
      settings_list_problem_opacity: "Opacity of both backgrounds (%)",
      epv_caption: "Page of an integration",
      epv_name: "Solar system",
      epv_meta: "4 devices · 124 entities",
      epv_attention: "Needs attention",
      epv_entry_error: "Battery",
      epv_msg_error: "Setup error: login failed",
      epv_device_a: "Battery total",
      epv_device_meta_a: "Basement · 6 entities",
      epv_device_b: "Inverter",
      epv_device_meta_b: "Basement · 63 entities",
      epv_entry_warn: "Second account",
      epv_msg_warn: "Not loaded",
      epv_hubs: "Hubs",
      epv_entry_ok: "Roof system",
      epv_meta_ok: "2 devices",
      epv_device_c: "Roof total",
      epv_device_meta_c: "Roof · 6 entities",
      menu_item_icon: "Icon",
      menu_item_icon_auto: "Icon of Home Assistant",
      header_position: "Position of the header",
      header_pos_top: "Top",
      header_pos_bottom: "Bottom",
      header_position_hint: "Bottom puts the bar at the lower edge of the dashboard - handy on a tablet or phone. The content moves up by the same height. While a dashboard is being edited, Home Assistant shows its toolbar at the top as usual.",
      title: "HA Style Hub",
      tab_layout: "Layout",
      tab_items: "Entries",
      tab_look: "Appearance",
      intro_title: "Welcome to HA Style Hub",
      tab_theme: "Theme",
      tab_sidebar: "Sidebar",
      tab_header: "Header",
      theme_import_title: "Import a theme",
      theme_import_hint:
        "Pick a theme file or paste its contents - an export from here, a file from your themes folder, or the themes block of your configuration.yaml. Only the variables this page offers are taken over, everything else is left behind. The current theme is replaced; the name stays as it is, and nothing is stored until you press \u201eSave\u201c.",
      theme_import_file: "Choose file",
      theme_import_pick: "Theme in the file",
      theme_import_empty: "No theme found in there.",
      theme_import_none: "That theme has no variable this page knows.",
      theme_import_done: "{taken} values taken over",
      theme_import_done_one: "One value taken over",
      theme_import_skipped: ", {skipped} unknown variables left behind",
      theme_import_skipped_one: ", one unknown variable left behind",
      theme_default: "Home Assistant",
      theme_enabled: "Register the theme in Home Assistant",
      theme_enabled_hint:
        "The theme then appears in the theme picker of every user profile, exactly like a theme from configuration.yaml.",
      theme_name: "Theme name",
      theme_set_default: "Use it as the default theme right away",
      theme_set_default_hint:
        "Sets the theme for everybody who follows the theme selected by the server. Without it, everyone picks it themselves in their profile.",
      theme_intro:
        "Sets the colors of Home Assistant itself - dashboards, dialogs and the settings pages. Empty fields are left alone, so Home Assistant keeps its own value for them.",
      theme_mode_dark: "Dark",
      theme_mode_light: "Light",
      theme_copy_to_light: "Copy to light",
      theme_copy_to_dark: "Copy to dark",
      theme_copied: "Values copied",
      theme_clear: "Clear this mode",
      theme_clear_confirm: "Clear every value of this mode?",
      header_hidden_hint:
        "The bar disappears and the content moves up. It stays visible while a dashboard is being edited - without it there would be no way out of the editor. To open the editor without the bar, add ?edit=1 to the dashboard address. The same setting exists as a switch in Home Assistant (device \u201cHA Style Hub\u201d), so it can be put on a dashboard as a button.",
      header_height: "Height (px)",
      header_height_hint:
        "0 keeps the height of Home Assistant. The content below moves along by itself.",
      header_blur: "Blur behind the bar (px)",
      header_blur_hint:
        "Title size and weight apply to the title and to the view tabs. The blur is only visible when the background shows through: set the opacity below 100 for that.",
      header_opacity: "Background opacity (%)",
      header_title_size: "Title and tab size (px)",
      header_border_width: "Border width (px)",
      header_border_color: "Border color",
      header_items_frame: "Border around single elements",
      header_items_hint:
        "A border around each button (menu, +, search, assist, pencil) and each view tab, instead of one around the whole bar. Width 0 means no border. Changing only the corner radius rounds the shapes without a border.",
      header_items_buttons: "Around the buttons",
      header_items_tabs: "Around the view tabs",
      header_icon_size: "Icon size (px)",
      tab_hover_background: "Hover background",
      tab_hover_opacity: "Hover opacity (%)",
      header_show_restart: "Show the restart button in the header",
      header_show_restart_hint:
        "Appears in front of Home Assistant's buttons. Only administrators see it. Before it restarts, a window in the look of your theme asks and checks the configuration first (like “Check configuration”); with errors it does not restart. Name and icon are taken from the restart entry of the sidebar if something is set there.",
      header_links: "Links",
      header_link_add: "Add a link to the header",
      header_link_add_hint:
        "The page gets a button on the right of the header, in front of Home Assistant's buttons.",
      header_links_empty: "No links yet - the plus adds one.",
      header_links_full: "The header holds at most 12 links.",
      header_link_color: "Icon colour",
      header_link_up: "Move forward",
      header_link_down: "Move back",
      header_presets_hint:
        "A finished look with one click. It fills the fields of this page; whether the bar is hidden stays as it is, and nothing is saved until you press Save.",
      header_preset_confirm:
        "Fill the header fields with this template? What is in there now is lost.",
      header_preset_done: "Template {name} taken over",
      header_transfer_hint:
        "Export saves these header settings as a .json file - handy as a backup or to pass a look on to somebody else. Import reads such a file back in. Only the header is touched; the sidebar and the theme stay as they are.",
      header_import_title: "Import header settings",
      header_import_hint:
        "Choose a file or paste its contents - an export from here, or a complete HA Style Hub export, of which only the header part is read. Whether the bar is hidden is left as it is, and nothing is saved until you press Save.",
      header_import_empty: "No header settings in there.",
      header_import_done: "{taken} values taken over",
      header_import_done_one: "One value taken over",
      header_buttons_hint:
        "The four buttons Home Assistant puts at the right end of the header. Switch off what you do not need - each one is recognised by its icon, so the rest keeps working even if Home Assistant adds more.",
      hide_add: "Hide \u201cAdd\u201d (+)",
      hide_search: "Hide the search",
      hide_assist: "Hide Assist",
      hide_edit: "Hide \u201cEdit dashboard\u201d",
      hide_edit_hint:
        "Without it the dashboard editor is only reachable by adding ?edit=1 to the address.",
      header_view_one: "Overview",
      header_view_two: "Rooms",
      tab_color: "Tab colour",
      tab_color_active: "Tab colour, selected",
      tab_indicator_color: "Line under the selected tab",
      theme_presets: "Templates",
      theme_presets_hint:
        "A finished look for both modes with one click. It only fills the fields of this page - every value stays editable afterwards, and nothing is saved until you press Save.",
      theme_preset_confirm:
        "Fill every field of both modes with this template? What is in there now is lost.",
      theme_preset_done: "Template {name} taken over",
      palette_hint:
        "Pick a main color and the colors for both modes are worked out from it: primary color, backgrounds, text, header, icons, sliders and badges. Text is chosen so that it stays readable. Borders, shadows, fonts and the status colors (error, warning, success, info) are left as they are. Nothing is saved until you press Save.",
      palette_main: "Main color",
      palette_tint: "Backgrounds",
      palette_tint_neutral: "Neutral (almost grey)",
      palette_tint_tint: "Lightly tinted",
      palette_tint_strong: "Strongly tinted",
      palette_accent: "Accent color",
      palette_accent_same: "Same as the main color",
      palette_accent_analogous: "Neighbouring hue",
      palette_accent_complementary: "Opposite hue",
      palette_accent_triad: "Triad",
      palette_dark: "Dark",
      palette_light: "Light",
      palette_apply: "Apply palette",
      palette_bad: "That is not a hex color - use something like #03a9f4.",
      palette_confirm:
        "Overwrite the colors of both modes with this palette? Borders, shadows, fonts and the status colors stay. Until you save, Discard brings the old colors back.",
      palette_done: "Palette applied to both modes",
      history_button: "History",
      history_title: "History",
      history_hint:
        "The last saved states, newest first. \u201cRestore\u201d loads a state into the page - it is only stored when you press Save, and Discard takes it back. Hiding the header and the sidebar stays as it is right now: those are switches, not part of a look.",
      history_loading: "Loading ...",
      history_empty: "Nothing here yet - the list fills up with every save.",
      tab_settings: "HA-Settings",
      settings_hint:
        "Here you change things about Home Assistant itself - not the sidebar and not a dashboard: look, hover, columns and tiles of the menu entries (on the System page as well), their order, a favourites bar, the system monitor with processor, memory, storage and the last backup, Devices & services and Apps as a slim list, and the group headers and rows of the tables.",
      settings_note:
        "Takes effect in every browser that loads HA Style Hub, as soon as you open the Settings page. Home Assistant may change those pages in a later version - if this stops matching, they simply stay the way Home Assistant draws them.",
      settings_icon_box: "Menu entries as rounded boxes",
      settings_icon_box_hint:
        "Instead of the colored circle behind each icon, show a box with rounded corners.",
      settings_icon_background: "Box color",
      settings_icon_color: "Icon color",
      settings_icon_box_size: "Box size (px)",
      settings_icon_size: "Icon size (px)",
      settings_icons_hint:
        "Empty colors and 0 mean “as Home Assistant draws it”. With a box color every entry gets the same color instead of its own. The box is never smaller than the icon.",
      settings_list_title: "Devices & services: list view",
      settings_list_hint:
        "Settings › Devices & services shows the integrations as a grid of cards. As a list, each one gets a slim row of its own: name on the left, count and symbols on the right.",
      settings_list_view: "Show the integrations as a list instead of a grid",
      settings_list_row_height: "Row height (px)",
      settings_list_gap: "Gap between rows (px)",
      settings_list_max_width: "Max. width of the list (px)",
      settings_menu_frame: "Border and corners of the entries",
      settings_list_frame: "Border and corners of the rows",
      settings_menu_border_width: "Border (px)",
      settings_menu_border_color: "Border color",
      settings_menu_border_radius: "Corner radius (px)",
      settings_hover_background: "Hover color",
      settings_hover_opacity: "Hover opacity (%)",
      settings_standard: "default",
      settings_transfer_hint:
        "Export saves the HA-Settings as a .json file - handy as a backup or to pass them on. Import reads such a file back in. Only these settings are touched; the sidebar, the theme and the header stay as they are.",
      settings_import_title: "Import HA-Settings",
      settings_import_hint:
        "Choose a file or paste its contents - an export from here, or a complete HA Style Hub export, of which only the HA-Settings part is read. Nothing is saved until you press Save.",
      settings_import_empty: "No HA-Settings in there.",
      settings_import_done: "{taken} values taken over",
      settings_import_done_one: "One value taken over",
      settings_list_border_width: "Border width (px)",
      settings_list_border_radius: "Corner radius (px)",
      settings_list_border_color: "Border color",
      settings_list_error_color: "Border color for problems",
      settings_list_background: "Row background",
      settings_list_fields_hint:
        "Row height: 56 by default, at least 32 - a row with an error message needs a little more room. Width: 0 means the full width. Border width and corner radius: empty means as Home Assistant draws it, 0 is a real value (no border, square corners). The problem color is used for integrations with a setup error or that are not loaded - the red row in the preview. Row background: color or gradient of the row, empty keeps Home Assistant's card color. Hover: the color the whole row takes on under the mouse; empty leaves Home Assistant's own effect.",
      settings_list_note:
        "The list view works on the structure of the page as found in the Home Assistant source (integration cards with a header and an action bar). If a later version changes it, the page simply stays a grid.",
      settings_list_a: "Weather service",
      settings_list_a_meta: "1 service",
      settings_list_b: "Media player",
      settings_list_b_meta: "3 devices",
      settings_list_c: "Lights",
      settings_list_c_meta: "12 devices",
      settings_list_d: "Backup",
      settings_list_d_meta: "1 service",
      settings_list_e: "Heating",
      settings_list_e_meta: "4 devices",
      settings_list_f: "Mobile app",
      settings_list_f_meta: "2 devices",
      settings_list_two_columns: "Two columns",
      settings_list_three_columns: "Three columns",
      settings_list_apps: "Use the list view for apps as well",
      settings_list_apps_hint:
        "The “Apps” page (formerly add-ons) is then shown as a list too: one app per row with icon, name, description and status. Row height, gap, width, border and hover of the list apply there as well.",
      table_rows_title: "Rows",
      table_zebra: "Colour of every second row",
      table_hover: "Mouse Hover",
      table_font_size: "Font size (px)",
      favorite_icon_only: "Show the icon only, hide the text",
      menu_columns: "Columns",
      menu_tiles: "Show the entries as tiles",
      menu_tiles_hint:
        "Icon above the name, without the description and the arrow. With two or three columns the page gets wider; on a narrow screen the columns drop by themselves.",
      menu_entries_title: "Order and visibility",
      menu_entries_hint:
        "Home Assistant shows the entries in several blocks (cards). The arrows move an entry within its block, the eye hides it. If every entry of a block is hidden, the block disappears.",
      menu_block: "Block {n}",
      menu_entries_seen: "The list shows the entries your Settings page had the last time it was open in this browser.",
      menu_entries_fallback:
        "This is a standard list. Open the Settings page of Home Assistant once and come back - then the entries of your installation are listed here, with their names.",
      favorites_title: "Favourites bar",
      favorites_hint:
        "Your own shortcuts as a row of buttons at the top of the Settings page - for the pages you need most. Name, icon and colour can be changed here.",
      favorites_empty: "No favourites yet - the plus adds one.",
      favorite_add: "Add a favourite",
      favorite_add_hint: "The page gets a button at the top of the Settings page.",
      header_show_system: "Show CPU and memory in the header",
      header_show_system_hint: "Two small values in front of the buttons, updated every 5 seconds by Home Assistant's hardware integration. Not shown on very narrow screens. For administrators a click opens the hardware page.",
      favorites_place: "Position",
      favorites_place_page: "Above the cards",
      favorites_place_header: "Centred in the header bar",
      favorites_place_hint: "In the header bar the favourites take on the colours of the bar unless they have their own. In a window narrower than 1000 px there is no room next to title and buttons - then they stand above the cards.",
      favorite_look: "Edit the look",
      favorite_look_hint: "Empty means as given: above the cards like a card of Home Assistant, in the header bar matching the bar. 0 is a real value. Height: empty or below 16 px fits the text.",
      monitor_title: "System monitor",
      monitor_hint: "Processor, memory and storage at a glance on the Settings page - the values Home Assistant shows on its Hardware and Storage pages. A click on a value opens that page.",
      monitor_show: "Show the system monitor on the Settings page",
      monitor_place: "Position",
      monitor_place_top: "At the top, below the favourites",
      monitor_place_end: "At the end, below the menu entries",
      monitor_graphs: "Show graphs",
      monitor_graphs_hint: "Processor and memory as a curve of the last 5 minutes, storage as a bar with used and total space. The curve starts when this browser tab first fetches the values.",
      menu_hover_hint: "The colour of a menu entry under the mouse, on the Settings page and its sub-pages. Empty keeps Home Assistant's own effect.",
      monitor_backup: "Show the last backup (box of its own)",
      monitor_backup_hint: "When, how large, which name and where the newest backup is stored - in a box of its own, as wide as the page. Works with or without the system monitor. A click opens the backup page.",
      monitor_backup_place: "Position of the backup box",
      monitor_backup_place_top: "At the top (below the system monitor)",
      monitor_backup_place_end: "At the end, below the menu entries",
      monitor_backup_last: "Last backup",
      monitor_backup_size: "Size",
      monitor_backup_name: "Name",
      monitor_backup_where: "Location",
      monitor_demo_ago: "19 hr. ago",
      monitor_demo_when: "10/8/2026, 5:08:46 AM",
      monitor_demo_auto: "Automatic",
      monitor_demo_count: "12 backups stored",
      monitor_demo_where: "This system \u00b7 NAS",
      monitor_demo_next: "Next: 10/9/2026, 4:45:00 AM",
      monitor_cpu: "Processor",
      monitor_ram: "Memory",
      monitor_disk: "Storage",
      monitor_demo_cpu: "avg 14 % \u00b7 max 41 %",
      monitor_demo_ram: "3.8 of 7.8 GB",
      monitor_demo_disk: "50.5 of 58.0 GB",
      monitor_demo_free: "7.5 GB free",
      monitor_demo_used: "50.5 GB used",
      monitor_demo_total: "58.0 GB total",
      settings_table_hint:
        "In the tables of Home Assistant (automations, entities, helpers, devices, ...) group headers such as “Ungrouped” or the name of an area separate the entries. Give them a color and a font of their own and the list is easier to scan.",
      settings_table_background: "Background",
      settings_table_color: "Text color",
      settings_table_size: "Font size (px)",
      settings_table_weight: "Font weight",
      settings_table_note:
        "Empty and 0 mean “as Home Assistant draws it”. The preview is a model. Grouping itself is switched on in the table (“Group by” in the toolbar).",
      settings_table_col_name: "Name",
      settings_table_col_area: "Area",
      settings_table_group_a: "Living room",
      settings_table_group_b: "Kitchen",
      settings_table_row_a: "Floor lamp",
      settings_table_row_b: "Ceiling light",
      settings_table_row_c: "Dishwasher",
      settings_table_row_d: "Extractor hood",
      history_error: "The history could not be loaded.",
      history_current: "Current",
      history_start: "Starting point (before the history began)",
      history_saved: "Saved",
      history_reset: "Reset to defaults",
      history_by: "by {name}",
      history_restore: "Restore",
      history_close: "Close",
      history_nothing: "No design change (only hiding or showing)",
      history_today: "Today",
      history_yesterday: "Yesterday",
      history_restored: "State from {date} loaded - Save keeps it, Discard undoes it",
      history_unsaved: "There are unsaved changes. Restoring replaces them. Continue?",
      history_area_layout: "Sidebar \u203a Layout",
      history_area_items: "Sidebar \u203a Entries",
      history_area_look: "Sidebar \u203a Appearance",
      history_area_theme: "Theme",
      history_area_header: "Header",
      history_area_settings: "HA-Settings",
      history_value: "{n} value",
      history_values: "{n} values",
      history_entry: "{n} entry",
      history_entries: "{n} entries",
      history_order: "order",
      history_dark: "dark",
      history_light: "light",
      theme_export_hint:
        "Export saves the theme as a .yaml file - useful as a backup or to put it into configuration.yaml by hand. Import reads such a file back in and fills the fields of this page with it; variables this page does not know are left behind.",
      theme_disabled_hint:
        "The theme is not registered yet. The preview already shows what it would look like.",
      preview_settings: "Settings",
      preview_living: "Living room",
      preview_brightness: "Brightness",
      preview_state_light: "Light on",
      preview_state_switch: "Switch on",
      preview_state_fan: "Fan on",
      preview_state_media: "Media player active",
      preview_state_cover: "Cover open",
      preview_state_heat: "Heating",
      preview_state_cool: "Cooling",
      preview_state_locked: "Lock locked",
      preview_state_unlocked: "Lock unlocked",
      preview_state_armed: "Alarm armed",
      preview_state_triggered: "Alarm triggered",
      preview_state_person: "Person at home",
      save: "Save",
      saved: "Saved",
      revert: "Discard",
      reset: "Reset everything",
      reset_confirm: "Reset the WHOLE HA Style Hub configuration (sidebar, theme, header and HA settings) to the defaults?",
      preview_hint:
        "Every change is shown in the sidebar right away. It is only stored permanently after „Save“.",
      columns: "Columns (expanded)",
      columns_collapsed: "Columns (collapsed)",
      columns_collapsed_hint:
        "More than one column needs a wider collapsed sidebar - 56 px only fits a single icon.",
      item_style: "Entry look",
      gap: "Gap (px)",
      width: "Sidebar width, expanded (px)",
      width_collapsed: "Sidebar width, collapsed (px)",
      tile_height: "Tile height, expanded (px)",
      tile_height_collapsed: "Tile height, collapsed (px)",
      tile_gap: "Gap between icon and label (px)",
      row_height: "Row height, expanded (px)",
      row_height_collapsed: "Row height, collapsed (px)",
      hide_scrollbar: "Hide the scrollbar",
      hide_scrollbar_hint:
        "The list still scrolls, only the bar itself disappears.",
      merge_fixed: "Move Settings, Notifications and the user entry into the grid",
      merge_fixed_hint:
        "Only then can those three entries be sorted freely. Without it Home Assistant keeps them pinned to the bottom of the sidebar.",
      heading_height: "Height (px)",
      heading_height_hint:
        "0 lets the text decide the height. A heading then sits close above its own entries and further away from the ones before them. Any other value gives the line exactly that height and centres the text in it.",
      heading_uppercase: "Capital letters",
      hide_sidebar: "Hide the sidebar (kiosk mode)",
      hide_sidebar_hint:
        "The whole sidebar disappears and the content beside it gets the space. This panel stays reachable at /ha-style-hub, and the same setting exists as a switch in Home Assistant (device \u201cHA Style Hub\u201d) - so there is no way of locking yourself out.",
      advanced_transfer_hint:
        "Export saves the complete configuration - sidebar, header, theme and HA settings - as a .json file. Import reads such a file back in.",
      reset_title: "Reset everything",
      reset_hint:
        "Puts the <strong>whole</strong> HA Style Hub configuration back to the defaults, not just this page: Sidebar (layout, entries, order, appearance), Theme (including the theme registered in Home Assistant), Header, HA settings, and the two kiosk-mode switches. It is saved right away. The state from before stays in the history (clock icon), so it can be restored.",
      show_restart: "Show a restart button in the grid",
      show_restart_hint:
        "Home Assistant has no such button in its sidebar, this one is added by the integration. Only administrators see it. Before it restarts, a window in the look of your theme asks and checks the configuration first (like “Check configuration”); with errors it does not restart. Name, icon, colours and position are set under Entries like any other one.",
      restart_entry: "Restart",
      order_hint:
        "Drag the entries into the order you want, or use the arrows.",
      name: "Name",
      icon: "Icon",
      icon_placeholder: "e.g. mdi:home",
      span: "Width",
      heading: "Section heading",
      heading_sub: "divider only, no link",
      add_hint: "The plus adds a section heading or a link to a page of Home Assistant (automations, entities, tools, ...).",
      add_title: "Add an entry",
      add_heading_title: "Section heading",
      add_heading_hint: "Divides the list. It has no target, entries can be assigned to it.",
      add_heading_button: "Add a section heading",
      add_link_title: "Link",
      add_link_hint:
        "A shortcut to a page of Home Assistant, straight in the sidebar - no detour through the settings. Name, icon, colours and position are set afterwards like for any other entry. Links into the settings are only shown to administrators.",
      add_link_page: "Page",
      add_link_custom: "Own path \u2026",
      add_link_path: "Path",
      add_link_button: "Add the link",
      add_link_invalid: "The path has to start with / and must not contain spaces or special characters, e.g. /config/tools/state",
      add_link_exists: "This link is already in the list.",
      link: "Link",
      link_remove: "Remove this link",
      close: "Close",
      heading_collapsible: "Can be collapsed",
      heading_collapsible_hint:
        "A click on the heading in the sidebar then folds the entries below it away. Which headings are folded is remembered per browser.",
      heading_indent_hint:
        "Drag an entry a little to the right to file it under the heading above it. Drag it back to the left to take it out again.",
      heading_remove: "Remove this heading",
      heading_hint:
        "A section heading divides the sidebar into blocks. It has no target, it runs across the full width, and while the sidebar is collapsed it is hidden. Drag it to the place it belongs.",
      hidden: "Hidden",
      more: "More",
      text_color: "Text color",
      icon_color: "Icon color",
      item_background: "Background",
      background: "Background color",
      background_gradient: "Use a gradient",
      background_color2: "Second color",
      gradient_direction: "Direction",
      dir_bottom: "downwards",
      dir_top: "upwards",
      dir_right: "to the right",
      dir_left: "to the left",
      dir_br: "down and right",
      dir_bl: "down and left",
      dir_tr: "up and right",
      dir_tl: "up and left",
      dir_radial: "radial, from the middle",
      dash_image_title: "Background image",
      dash_image_none: "No image selected",
      dash_image_choose: "Choose image\u2026",
      dash_image_replace: "Replace image\u2026",
      dash_image_remove: "Remove",
      dash_image_size: "Display",
      dash_size_cover: "Fill (crop the edges)",
      dash_size_contain: "Fit completely",
      dash_size_tile: "Tile",
      dash_image_scroll: "Let the image scroll with the page",
      dash_image_hint:
        "PNG, JPEG, GIF or WebP, up to 8 MB. The integration stores the file in the folder www/ha_style_hub of your Home Assistant configuration and serves it itself - no path to type. The image is public like anything in www: do not use a private photo. It only takes effect after Save.",
      dash_uploading: "Uploading\u2026",
      dash_upload_done: "Image uploaded - save to apply it",
      dash_upload_failed: "Upload failed",
      dash_upload_big: "The image is larger than 8 MB",
      dash_upload_type: "That is not an image",
      load_failed: "The configuration could not be loaded - saving is blocked. Please reload the page.",
      theme_export_empty: "Nothing to export - the theme is empty",
      section_hover: "Mouse hover",
      hover_background: "Background",
      hover_opacity: "Background opacity (%)",
      hover_text_color: "Text color",
      hover_icon_color: "Icon color",
      header_background: "Header background",
      border_width: "Sidebar border (px)",
      border_color: "Sidebar border color",
      text_color_selected: "Text color, active",
      icon_color_selected: "Icon color, active",
      font_size: "Font size (px)",
      font_weight: "Font weight",
      font_family: "Font",
      font_theme: "Theme default",
      open_sidebar: "Show the sidebar",
      icon_size: "Icon size (px)",
      item_background_selected: "Entry background, active",
      item_border_width: "Entry border (px)",
      item_border_color: "Entry border color",
      item_border_split: "Set each side separately",
      side_top: "Top (px)",
      side_right: "Right (px)",
      side_bottom: "Bottom (px)",
      side_left: "Left (px)",
      item_radius_split: "Set each corner separately",
      corner_tl: "Top left (px)",
      corner_tr: "Top right (px)",
      corner_br: "Bottom right (px)",
      corner_bl: "Bottom left (px)",
      style_notifications: "Style the notification drawer to match",
      style_notifications_hint:
        "Carries the background, the header background and the text color over to the panel that opens from the notifications entry.",
      item_radius: "Corner radius (px)",
      sidebar_title: "Sidebar title",
      sidebar_title_placeholder: "keep original",
      title_color: "Title color",
      hide_title: "Hide the title",
      hide_toggle: "Hide the menu button",
      hide_labels_collapsed: "Hide the labels while collapsed",
      custom_css: "Additional CSS",
      custom_css_hint:
        "Inserted into the shadow root of ha-sidebar. Use :host for the sidebar itself.",
      css_example_head: "example - not active, only to show what is possible",
      css_example_all: "every entry",
      css_example_one: "a single dashboard",
      css_example_user: "the user entry",
      css_example_expanded: "only while the sidebar is expanded",
      enabled: "HA Style Hub active",
      enabled_hint:
        "The master switch: off means the integration changes nothing on the sidebar, the dashboard header and the HA settings pages. A theme registered on the Theme tab stays untouched - it belongs to Home Assistant once it is registered, and whoever picked it in their profile keeps it.",
      debug: "Write debug output to the browser console",
      debug_hint:
        "For Sidebar, Theme, Header and HA settings: the browser console (F12) shows what the integration found on the page and what it applied. Useful when something does not look as configured.",
      export: "Export",
      import: "Import",
      import_title: "Import configuration",
      import_hint:
        "Pick an exported file or paste its contents. The configuration is applied straight away and is only stored after \u201eSave\u201c.",
      import_file: "Choose file",
      import_apply: "Import",
      cancel: "Cancel",
      import_error: "That is not valid JSON.",
      import_empty: "Nothing to import yet.",
      export_done: "File saved",
      badge_background: "Info badge background",
      badge_color: "Info badge text color",
      section_badge: "Info badge",
      notif_text_color: "Text color",
      notif_header_color: "Header text and icons",
      section_colors: "Colors",
      section_text: "Text and icons",
      section_items: "Entries",
      section_header: "Header",
      section_notifications: "Notification drawer",
      unsaved: "Unsaved changes",
    },
    de: {
      page_info: "Info",
      search_placeholder: "Einstellung suchen",
      search_none: "Nichts gefunden.",
      nav_transfer: "Export / Import",
      import_paste: "oder Inhalt einfügen",
      sidebar_import_title: "Seitenleiste importieren",
      sidebar_import_hint: "Datei wählen oder ihren Inhalt einfügen - ein Export der Seitenleiste von hier oder ein kompletter HA Style Hub-Export, von dem nur Layout, Einträge und Aussehen gelesen werden. Ob die Seitenleiste ausgeblendet ist, bleibt, wie es ist, und gespeichert wird erst mit „Speichern“.",
      sidebar_import_empty: "Die Datei enthält keine Einstellungen der Seitenleiste.",
      sidebar_import_done: "Seitenleiste übernommen - zum Behalten speichern",
      preset_apply: "Vorlage übernehmen",
      preset_apply_name: "Vorlage {name} übernehmen",
      sbp_open: "Ausgeklappt",
      sbp_closed: "Eingeklappt",
      sbp_empty: "Keine sichtbaren Einträge.",
      layout_grid: "Raster",
      layout_sizes: "Größen",
      layout_behaviour: "Verhalten",
      entry_add_short: "Überschrift, Link, PopUp",
      inspector_empty: "Wähle einen Eintrag aus.",
      heading_meta: "Überschrift · {n}",
      hidden_short: "ausgeblendet",
      span_label: "Spaltenbreite",
      item_style_auto_short: "Automatisch",
      item_style_tile_short: "Kacheln",
      item_style_row_short: "Zeilen",
      item_style_hint: "Automatisch: Kacheln ab 2 Spalten. Kacheln: Icon über dem Text. Zeilen: Icon neben dem Text.",
      span_one: "1 Spalte",
      span_many: "{n} Spalten",
      span_hint: "Mehr als eine Spalte stellst du unter Layout ein.",
      like_appearance: "wie Aussehen",
      entry_reset: "Zurücksetzen",
      text_short: "Text",
      item_background_short: "Hintergrund",
      hide_in_sidebar: "In der Seitenleiste ausblenden",
      move_up: "Nach oben",
      move_down: "Nach unten",
      theme_empty: "leer",
      theme_empty_hint: "Leer heißt: Wert von Home Assistant bleibt.",
      group_clear: "Gruppe leeren",
      hsec_color: "Farbe und Verlauf",
      hsec_size: "Maße",
      hsec_frame: "Rahmen und Ecken",
      hsec_tabs: "Reiter der Ansichten",
      hsec_buttons: "Buttons rechte Seite",
      header_view_three: "Garten",
      settings_icons_title_short: "Menüpunkte",
      topic_tables_title: "Tabellen",
      settings_icon_radius_short: "Eckenradius",
      settings_box_placeholder: "leer · jede behält ihre Farbe",
      table_groups_title: "Gruppenköpfe",
      pane_page: "Einstellungsseite",
      pane_list: "Geräte & Dienste",
      pane_tables: "Tabellen",
      preview_before: "Vorher",
      transfer_all: "Komplette Konfiguration",
      sidebar_transfer_hint: "Exportieren speichert Layout, Einträge und Aussehen der Seitenleiste als .json-Datei. Importieren liest so eine Datei wieder ein. Betroffen ist nur die Seitenleiste, Theme, Header und HA-Settings bleiben unberührt.",
      transfer_foot: "Ein Import wird sofort in die Seite übernommen und erst mit „Speichern“ abgelegt. Bis dahin holt „Verwerfen“ den gespeicherten Stand zurück.",
      eyebrow_theme: "Farben von Home Assistant",
      eyebrow_header: "Kopfzeile der Dashboards",
      eyebrow_settings: "Seiten von Home Assistant selbst",
      eyebrow_transfer: "Sichern und weitergeben",
      eyebrow_info: "Einführung, Werkzeuge, Support",
      page_transfer: "Export und Import",
      area_general: "Allgemein",
      all_saved: "Alles gespeichert",
      was_empty: "leer",
      was_on: "an",
      was_off: "aus",
      changed_short: "geändert",
      before_value: "vorher {v}",
      changed_before: "geändert, vorher {v}",
      links_of: "{n} von {max}",
      n_changed: "{n} geändert",
      info_lead: "Gestalte dein Home Assistant genau so, wie es dir gefällt! Mit dem HA Style Hub passt du die Benutzeroberfläche und deine Dashboards ganz ohne tiefes Coding individuell an.",
      info_areas: "Das Style Hub ist aktuell in vier Bereiche unterteilt und bietet dir die Möglichkeit, das Design für das System und deine Dashboards anzupassen:",
      info_sidebar: "<p>Hier richtest du die Seitenleiste nach deinen Wünschen ein:</p><p><strong>Layout</strong>: 1 bis 4 Spalten (eingeklappt 1 bis 3), Abstand, Breite ausgeklappt und eingeklappt, Größe der Einträge, ein Neustart-Button, Einstellungen, Benachrichtigungen und Benutzer im Raster sowie das Ausblenden der ganzen Sidebar (kiosk-mode).</p><p><strong>Einträge</strong>: per Ziehen sortieren – auch direkt im Vorschaubild –, umbenennen, eigene Icons, Farben und Spaltenbreite je Eintrag, ausblenden, Zwischenüberschriften als Gruppen zum Zuklappen, Links zu beliebigen Seiten von Home Assistant und PopUp-Links, die ein Fenster mit mehreren Seiten oder einer Lovelace-Karte aus deinem Dashboard öffnen.</p><p><strong>Aussehen</strong>: Hintergrund und Verlauf, Hover, Text- und Iconfarben, Schrift, Rahmen je Seite, Ecken je Ecke, die Benachrichtigungsleiste und die Theme-Farben der Sidebar.</p>",
      info_theme: "<p>Färbt Home Assistant selbst ein – Dashboards, Dialoge und Einstellungsseiten – als echtes Theme mit {n} Variablen, getrennt für Hell und Dunkel, dazu die {p} Stufen der Primärfarbe, die automatisch berechnet werden.</p><p><strong>Vorschau</strong>: Jede Kachel und jedes Element darin ist anklickbar – Schalter, Buttons, Zustandsfarben, Tabellenzeilen, Diagrammfarben, Code … – und öffnet rechts genau die passenden Felder.</p><p><strong>Umfang</strong>: Karten, Schrift, Zustands- und Statusfarben, Tabellen, Eingabefelder, Dialoge und Code-Editor bis hin zu Diagrammen, Energie, Wetter sowie den Design-Tokens und Schaltern von Home Assistant 2026.10.</p><p><strong>Werkzeuge</strong>: Farbpalette aus einer Hauptfarbe, fertige Vorlagen, Schatten-Baukasten, Kontrast-Prüfung, Schnellfarben, Dashboard-Hintergrund als Farbe, Verlauf oder Bild sowie YAML-Export und -Import.</p>",
      info_header: "<p>Kümmert sich um das Headermenu der Dashboards, bis hin zum kompletten Ausblenden (kiosk-mode, auch als Schalter-Entität).</p><p><strong>Aussehen</strong>: Farbe oder Verlauf, Deckkraft und Weichzeichner, Höhe, Rahmen und Ecken, Titel- und Icongröße, Farben und Rahmen der Reiter und Buttons – oder eine der Vorlagen <em>Glas</em>, <em>Schlank</em> und <em>Abgesetzt</em>.</p><p><strong>Buttons</strong>: die vier Buttons von Home Assistant einzeln ausblenden, davor eigene: Neustart, Links, Sensoren (der Zustand einer beliebigen Entität) sowie CPU, RAM und Speicher.</p><p><strong>Theme-Farben der Kopfzeile</strong>: die Theme-Variablen der Leiste, auch für den Bearbeiten-Modus eines Dashboards.</p>",
      info_settings: "<p>Gestaltet die Seiten von Home Assistant selbst:</p><p><strong>Einstellungsseite</strong>: die Menüpunkte als Boxen in eigenen Farben, in Spalten oder als Kacheln, in eigener Reihenfolge und mit eigenem Namen, Untertitel und Farben je Punkt – auch auf der Profilseite. Dazu eine Favoriten-Leiste, ein Systemmonitor mit Prozessor, Arbeitsspeicher, Speicher und bis zu sechs eigenen Entitäten, das letzte Backup mit <em>Backup jetzt erstellen</em> und eine Übersicht mit Zählern.</p><p><strong>Geräte &amp; Dienste</strong>: Integrationen und Apps als schmale Liste in 1 bis 3 Spalten; die Seite einer einzelnen Integration zieht mit eigener Zeilenhöhe mit.</p><p><strong>Tabellen</strong>: Gruppenköpfe, Streifen, Zeilenhintergrund, Schriftgröße und Maus-Hover.</p>",
      info_tip: "<strong>Tipp:</strong> Auf der Theme-Seite erzeugt <strong>Farbpalette wählen</strong> aus einer einzigen Hauptfarbe einen kompletten Farbsatz. Das Uhr-Symbol oben rechts öffnet den <strong>Verlauf</strong> der letzten gespeicherten Stände – mit einem Klick holst du einen früheren Stand zurück in die Seite.",
      info_important: "<strong>Wichtig:</strong> Zwei Schalter stehen dir auch als Entitäten in Home Assistant unter dem Gerät <strong>HA Style Hub</strong> zur Verfügung: das Ausblenden von Header und Sidebar (kiosk-mode). Damit kannst du diese Funktionen als Button auf ein Dashboard legen oder direkt in Automationen nutzen.",
      info_note: "<strong>Info:</strong> Jede Änderung ist sofort in der Vorschau zu sehen – gespeichert wird sie erst mit klick auf <strong>Speichern</strong>. Mit <strong>Verwerfen</strong> holst du den zuletzt gespeicherten Stand zurück. Leere Felder bedeuten immer „Lass es, wie es ist“ – du füllst also nur aus, was du wirklich ändern willst. Sollte doch mal etwas schiefgehen, setzt <strong>Alles zurücksetzen</strong> rechts auf dieser Seite alles wieder auf den Standard zurück. Über das <strong>Export/Import-Symbol</strong> oben rechts sicherst du jeden Bereich einzeln oder alles zusammen.",
      info_by: "Entwickelt von",
      info_issue: "Problem melden",
      info_docs: "Dokumentation öffnen",
      info_support_title: "Projekt unterstützen",
      info_support: "Jede kleine Unterstützung hilft und motiviert. Danke.",
      brand_short: "Style Hub",
      all_entries: "Alle Einträge",
      before_badge: "Gespeicherter Stand",
      favorites_empty_stage: "Noch keine Favoriten · anklicken zum Einrichten",
      monitor_off_stage: "Systemmonitor ist aus · anklicken zum Einrichten",
      goto_sidebar: "Seite Sidebar",
      goto_header: "Seite Header",
      goto_theme_cards: "Karten und Hintergrund · Theme",
      header_hidden_full: "Kopfzeile ganz ausblenden (kiosk-mode)",
      hide_sidebar_full: "Sidebar ganz ausblenden (kiosk-mode)",
      header_hidden_stage: "Die Kopfzeile ist ausgeblendet.",
      show_hidden_short: "Ausgeblendete",
      stage_home: "Zuhause",
      stage_sidebar_title: "Deine Seitenleiste.",
      stage_sidebar_hint_layout: "Spalten, Breite und Abstände wirken sofort.",
      stage_sidebar_hint_items: "Eintrag anklicken zum Bearbeiten, ziehen zum Umsortieren.",
      stage_sidebar_hint_look: "Klick auf einen Teil der Seitenleiste öffnet seine Felder.",
      stage_header_title: "Klick an, was du ändern willst.",
      stage_header_hint: "Die Felder dazu stehen rechts.",
      stage_theme_title: "Die Farben von Home Assistant.",
      stage_theme_hint: "Klick an, was du umfärben willst.",
      stage_settings_title: "Die Seiten von Home Assistant.",
      stage_settings_hint: "Seite rechts oben wählen, dann anklicken, was du ändern willst.",
      stage_transfer_title: "Sichern und weitergeben.",
      stage_transfer_hint: "Alles auf einmal oder jede Rubrik für sich.",
      tag_selected: "{name} · ausgewählt",
      tag_selected_short: "ausgewählt",
      unsaved_n: "{n} ungespeichert",
      unsaved_short: "{n} offen",
      view_simple: "Einfach",
      view_all_fields: "Alle Felder",
      view_all_groups: "Alle {n} Gruppen",
      spot_cards: "Karten",
      spot_sliders: "Regler und Badges",
      spot_states: "Zustandsfarben",
      spot_devices: "Geräte",
      spot_climate: "Klima",
      spot_security: "Sicherheit",
      spot_table: "Tabelle",
      spot_inputs: "Eingabefelder",
      spot_status: "Statusfarben",
      spot_dialog: "Dialog und Code",
      spot_text: "Text und Schrift",
      spot_dash: "Dashboard-Hintergrund",
      ts_light: "Licht",
      ts_lamp: "Stehlampe",
      ts_ceiling: "Decke",
      ts_sliders: "Regler und Badges",
      ts_states: "Zustandsfarben",
      ts_devices: "Geräte",
      ts_climate: "Klima",
      ts_security: "Sicherheit",
      ts_light_on: "Licht an",
      ts_table: "Tabelle",
      ts_state: "Zustand",
      ts_on: "an",
      ts_heating: "Heizung",
      ts_door: "Haustür",
      ts_hall: "Flur",
      ts_locked_state: "verriegelt",
      ts_inputs: "Eingabefelder",
      ts_pick_area: "Bereich wählen",
      ts_status: "Statusfarben",
      ts_error: "Fehler",
      ts_warning: "Warnung",
      ts_success: "Erfolg",
      ts_info: "Hinweis",
      ts_dialog: "Dialog und Code",
      ts_text: "Text und Schrift",
      ts_heading: "Überschrift",
      ts_body: "Haupttext in normaler Größe",
      ts_small: "Nebentext, etwas kleiner",
      ts_link: "Ein Link",
      ts_dash: "Dashboard-Hintergrund",
      ts_energy: "Energie",
      ts_history: "Verlauf",
      ts_media: "Medien",
      header_show_disk: "Speicherplatz anzeigen",
      monitor_sensors: "Eigene Werte",
      monitor_sensors_hint: "Bis zu sechs eigene Entitäten neben Prozessor, Arbeitsspeicher und Speicher – z. B. CPU-Temperatur, Laufzeit oder die Leistung des Hauses. Ein Klick öffnet die Entität.",
      monitor_sensors_empty: "Noch keine eigenen Werte – das Plus fügt einen hinzu.",
      monitor_sensor_add: "Wert hinzufügen",
      monitor_sensor_remove: "Diesen Wert entfernen",
      monitor_sensor_entity: "Entität",
      monitor_sensor_name: "Name",
      monitor_sensor_name_auto: "Name der Entität",
      monitor_sensor_missing: "Entität nicht gefunden",
      monitor_backup_button: "Knopf „Backup jetzt erstellen“",
      monitor_backup_now: "Backup jetzt erstellen",
      monitor_backup_button_hint: "Unter der Backup-Box, für Administratoren: startet nach einer Rückfrage ein Backup mit den automatischen Einstellungen der Backup-Seite.",
      settings_profile_page: "Auch auf der Profilseite anwenden",
      settings_profile_page_hint: "Seit Home Assistant 2026.10 hat die Profilseite dasselbe Menü: Symbol-Boxen, Farben, Spalten, Kacheln, Rahmen und Maus-Hover gelten dort ebenfalls.",
      settings_list_entries: "Auch die Seite einer Integration gestalten",
      settings_list_entries_hint: "Die Einträge auf der Seite einer einzelnen Integration bekommen Rahmen, Ecken, Hintergrund und Abstand der Zeilen (ab Home Assistant 2026.10).",
      menu_item_edit: "Menüpunkt bearbeiten",
      menu_item_name: "Name",
      menu_item_hide_sub: "Untertitel ausblenden",
      menu_item_icon_background: "Hintergrund der Symbol-Box",
      menu_item_icon_color: "Symbolfarbe",
      menu_item_hint: "Leer: wie Home Assistant. Geht den Farben für alle Menüpunkte vor.",
      menu_item_reset: "Punkt zurücksetzen",
      changes_title: "Ungespeicherte Änderungen",
      changes_hint: "Alles, was vom gespeicherten Stand abweicht, Feld für Feld. „Anzeigen“ springt zum Feld, „Zurücksetzen“ nimmt nur diese eine Änderung zurück.",
      changes_show: "Anzeigen",
      changes_reset: "Zurücksetzen",
      changes_order: "Reihenfolge der Einträge",
      changes_entry: "Eintrag",
      changes_list_n: "Liste ({n})",
      contrast_warn: "Kontrast {r} : 1 zu „{bg}“ – schwer lesbar (empfohlen ab 4,5 : 1).",
      qc_theme: "Farben im Einsatz",
      qc_recent: "Zuletzt benutzt",
      ts_weather: "Wetter",
      ts_w_sunny: "Sonnig",
      ts_w_partly: "Teilweise bewölkt",
      ts_w_cloudy: "Bewölkt",
      ts_w_rainy: "Regen",
      ts_w_lightning: "Gewitter",
      ts_w_snowy: "Schnee",
      ts_w_night: "Klare Nacht",
      ts_code_comment: "Licht am Abend",
      ts_charts: "Diagramm",
      ts_charts_sub: "Verlauf · Farben 1–54",
      ts_history_line: "Verlaufslinie: an, unbekannt, aus, nicht verfügbar",
      ts_controls: "Bedienelemente",
      ts_controls_sub: "Design-Tokens · Schalter",
      ts_btn_more: "Mehr",
      ts_btn_delete: "Löschen",
      ts_surface: "Fläche",
      spot_weather: "Wetter",
      spot_charts: "Diagramm",
      spot_energy: "Energie",
      spot_controls: "Bedienelemente",
      shadow_title: "Schatten gestalten",
      shadow_hint: "Vorlagen und Regler füllen das Feld „Schatten“ darüber – wer CSS kennt, kann es dort weiter direkt eintragen.",
      shadow_p_none: "Kein Schatten",
      shadow_p_breath: "Hauch",
      shadow_p_soft: "Sanft",
      shadow_p_medium: "Mittel",
      shadow_p_strong: "Stark",
      shadow_p_around: "Rundum",
      shadow_dir: "Richtung",
      shadow_d_down: "Nach unten",
      shadow_d_down_right: "Unten rechts",
      shadow_d_right: "Nach rechts",
      shadow_d_up_right: "Oben rechts",
      shadow_d_up: "Nach oben",
      shadow_d_up_left: "Oben links",
      shadow_d_left: "Nach links",
      shadow_d_down_left: "Unten links",
      shadow_d_around: "Rundum (ohne Versatz)",
      shadow_dist: "Abstand",
      shadow_blur: "Unschärfe",
      shadow_spread: "Ausdehnung",
      shadow_opacity: "Deckkraft",
      shadow_color: "Farbe",
      shadow_inset: "Innenschatten",
      shadow_custom: "Im Feld steht ein Wert, den die Regler nicht abbilden können (mehrere Schatten oder eine besondere Farbe). Ein Regler ersetzt ihn.",
      primary_scale: "Abstufungen für neuere Bedienelemente",
      primary_scale_hint: "Automatisch aus der Primärfarbe (--ha-color-primary-05 … 95), wie beim Standard-Theme von Home Assistant: Buttons, Schalter, Checkboxen und Links folgen dem Theme. Nur aus Hex- oder rgb()-Farben.",
      header_actions_color: "Farbe der rechten Seite",
      header_actions_color_hint: "Buttons, eigene Links und CPU/RAM/Speicher rechts in der Kopfzeile. Die Reiter behalten ihre eigene Farbe. Leer: wie Icons und Text der Kopfzeile.",
      header_show_disk_hint: "Freier und belegter Speicherplatz vor den Buttons, im Stil von CPU und RAM, jede Minute aktualisiert. Nur für Administratoren sichtbar; auf sehr schmalen Bildschirmen ausgeblendet.",
      header_disk_free: "Frei",
      header_disk_used: "Belegt",
      header_disk_free_value: "7,5 GB",
      header_disk_used_value: "50,5 GB",
      hsec_theme: "Theme-Farben der Kopfzeile",
      monitor_counts: "Übersicht anzeigen (Zähler)",
      monitor_counts_hint: "Wie viele Geräte, Entitäten, Integrationen, Apps, Automationen, Szenen, Skripte, Custom Cards, Blueprints, Benutzer und Langzeit-Token es gibt – in einer eigenen Box im Stil des Systemmonitors. Ein Klick auf eine Zahl öffnet ihre Seite. Gezählt wird für Administratoren; was Home Assistant nicht herausgibt, bleibt leer.",
      monitor_counts_place: "Position der Übersicht",
      monitor_counts_place_top: "Oben (unter Systemmonitor und Backup)",
      monitor_counts_items: "Was gezählt wird",
      count_devices: "Geräte",
      count_entities: "Entitäten",
      count_integrations: "Integrationen",
      count_apps: "Apps",
      count_automations: "Automationen",
      count_scenes: "Szenen",
      count_scripts: "Skripte",
      count_cards: "Custom Cards",
      count_blueprints: "Blueprints",
      count_users: "Benutzer",
      count_tokens: "Token",
      count_demo_entities: "4 nicht verfügbar",
      count_demo_integrations: "57 Einträge · 1 mit Fehler",
      monitor_note: "Prozessor und Arbeitsspeicher kommen alle 5 Sekunden aus der Hardware-Integration von Home Assistant, der Speicher einmal pro Minute vom Supervisor (ohne Supervisor: vom Datenträger mit der Konfiguration). Die Breite folgt den Spalten der Einstellungsseite; die drei Werte stehen immer nebeneinander, auf dem Handy etwas kleiner. Ab 80 % (Speicher 85 %) wird ein Wert orange, ab 95 % rot. Die Vorschau ist ein Modell mit festen Werten.",
      count_demo_devices: "3 nicht erreichbar · 2 deaktiviert",
      count_demo_apps: "1,4 GB RAM · 6,2 GB Speicher",
      count_demo_scenes: "zuletzt vor 2 Std.",
      count_demo_scripts: "zuletzt vor 25 Min.",
      count_demo_blueprints: "5 Automation · 2 Skript",
      count_demo_users: "1 Admins",
      count_demo_automations: "58 aktiv",
      count_demo_cards: "33 Ressourcen",
      count_demo_tokens: "zuletzt genutzt vor 3 Tagen",
      lsec_theme: "Theme-Farben der Sidebar",
      sidebar_theme_hint: "Diese Variablen gehören zum Theme (Dunkel / Hell) und wirken nur, solange das Theme in Home Assistant eingetragen ist. Farben, die du oben setzt (Hintergrund, Text, Icons, aktiver Eintrag, Kopfbereich, Titel), werden automatisch für beide Modi übernommen; einen Wert, den du hier selbst gesetzt hast, lassen sie stehen. In Home Assistant haben deine Werte von oben Vorrang.",
      accordion_label: "Gruppen als Akkordeon",
      accordion_on: "Akkordeon: immer nur eine Gruppe offen (Klick: Gruppen einzeln öffnen)",
      accordion_off: "Gruppen einzeln öffnen (Klick: Akkordeon, immer nur eine offen)",
      table_row_background: "Farbe der Zeilen",
      table_rows_hint: "Farbe der Zeilen: der Hintergrund jeder Zeile, leer lässt den von Home Assistant. Streifen machen lange Tabellen lesbarer: Jede zweite Zeile bekommt ihre Farbe, leer heißt keine Streifen. Hover: die Farbe unter der Maus, leer lässt Home Assistants eigenen Effekt. Schriftgröße: 0 heißt wie Home Assistant (10 bis 24 px). Die Zeilenhöhe bleibt unverändert.",
      ts_design: "Card-Design",
      ts_design_sub: "Rahmen, Ecken, Schatten, Titel",
      spot_design: "Card-Design",
      header_theme_hint: "Diese Variablen gehören zum Theme (Dunkel / Hell) und wirken nur, solange das Theme in Home Assistant eingetragen ist. Farben, die du oben setzt (Hintergrund, Text, Linie darunter), werden automatisch für beide Modi übernommen, soweit Home Assistant dafür eine Variable hat; einen Wert, den du hier selbst gesetzt hast, lassen sie stehen. In Home Assistant haben deine Werte von oben Vorrang.",
      theme_pull: "Farben übernehmen",
      theme_pull_done: "{n} Farben ins Theme übernommen (Dunkel und Hell).",
      theme_pull_none: "Auf dieser Seite sind noch keine Farben gesetzt.",
      palette_title: "Farbpalette wählen",
      list_meta_devices: "{n} Geräte",
      list_meta_service: "1 Dienst",
      table_col_state: "Zustand",
      table_state_on: "an",
      table_state_off: "aus",
      table_state_locked: "verriegelt",
      table_state_clear: "frei",
      table_state_ok: "OK",
      table_row_tv: "Fernseher",
      table_row_thermostat: "Thermostat",
      table_row_fridge: "Kühlschrank",
      table_row_coffee: "Kaffeemaschine",
      table_group_hall: "Flur",
      table_row_door: "Haustür",
      table_row_motion: "Bewegungsmelder",
      table_row_smoke: "Rauchmelder",
      table_group_garden: "Garten",
      table_row_pump: "Teichpumpe",
      table_row_garden_light: "Wegbeleuchtung",
      heading_border_width: "Rahmen (px)",
      settings_hide_tip: "Tipp unter dem Menü ausblenden",
      settings_hide_tip_hint: "Home Assistant zeigt unter den Menüpunkten der Einstellungsseite eine wechselnde Tipp-Zeile.",
      stage_tip: "Tipp: Du kannst die Einstellungen auch durchsuchen.",
      settings_list_columns_hint: "1 ist die normale Liste von Home Assistant. Auf einem schmalen Bildschirm werden es von selbst weniger Spalten – schmaler als 260 px wird eine Spalte nicht.",
      pane_switch: "Seite im Vorschaubild",
      monitor_sensors_only: "Nur eigene Entitäten anzeigen",
      monitor_sensors_only_hint: "Blendet Prozessor, Arbeitsspeicher und Speicher aus – es bleiben nur die eigenen Werte. Ohne eigene Werte ändert sich nichts.",
      settings_list_entries_row_height: "Zeilenhöhe auf der Integrationsseite (px)",
      settings_list_entries_row_height_hint: "Einträge, Geräte und Untereinträge auf der Seite einer Integration. 0 = wie Home Assistant; zwischen 32 und 120 px.",
      undo_done: "Einen Schritt zurück",
      undo_none: "Nichts mehr rückgängig zu machen",
      redo_done: "Wieder einen Schritt vor",
      redo_none: "Nichts zum Wiederholen",
      ctl_btn_primary: "Button, kräftig",
      ctl_btn_more: "Button, leise",
      ctl_btn_cancel: "Button, neutral",
      ctl_btn_delete: "Button, Gefahr",
      ctl_chip_success: "Chip, Erfolg",
      ctl_chip_warning: "Chip, Warnung",
      ctl_check_on: "Checkbox, angehakt",
      ctl_check_off: "Checkbox, leer",
      ctl_switch_on: "Schalter, an",
      ctl_switch_off: "Schalter, aus",
      ctl_input: "Eingabefeld",
      ctl_surface: "Fläche",
      header_hint: "Die Leiste eines Dashboards, oben oder unten. Home Assistant gibt dafür nur wenige Theme-Variablen heraus (unten bei „Theme-Farben der Kopfzeile“) – deshalb gestaltet HA Style Hub sie mit eigenem CSS. Diese Einstellungen gelten für beide Modi gleichzeitig und nicht getrennt nach Hell und Dunkel. Während ein Dashboard bearbeitet wird, zeigt Home Assistant seine eigene Werkzeugleiste; ihre Farben stehen ebenfalls bei den Theme-Farben der Kopfzeile.",
      ctl_card_head: "Kartentitel",
      ctl_icon_on: "Icon, an",
      ctl_icon_off: "Icon, aus",
      ctl_badge: "Badge",
      ctl_slider: "Regler",
      ctl_table_head: "Tabellenkopf",
      ctl_input_text: "Eingabefeld",
      ctl_input_select: "Auswahlfeld",
      ctl_scrim: "Hinter dem Dialog",
      ctl_editor: "Code-Editor",
      ctl_heading: "Überschrift",
      ctl_body_text: "Haupttext",
      ctl_chart_lines: "Diagrammlinien",
      ctl_timeline: "Verlaufsleiste",
      entry_add: "Zwischenüberschrift, Link oder PopUp hinzufügen",
      add_popup_title: "PopUp Link",
      add_popup_hint: "Ein Eintrag in der Seitenleiste, der ein Fenster öffnet – mit mehreren Seiten als Kacheln oder mit einer Karte aus deinem Dashboard.",
      add_popup_name: "Name des PopUps",
      add_popup_pick: "Seite ins PopUp aufnehmen",
      add_popup_button: "PopUp anlegen",
      add_popup_empty: "Noch keine Seite gewählt – oben eine auswählen und aufnehmen.",
      add_popup_none: "Bitte zuerst mindestens eine Seite aufnehmen.",
      popup: "PopUp",
      popup_sub: "Fenster mit Links",
      popup_remove: "PopUp entfernen",
      popup_links: "Links im PopUp",
      popup_links_empty: "Noch keine Links – unten eine Seite wählen.",
      popup_add: "Hinzufügen",
      popup_link_remove: "Diesen Link entfernen",
      popup_full: "Ein PopUp fasst höchstens 24 Links.",
      popup_group_panels: "Dashboards und Seiten der Seitenleiste",
      popup_hint_hide: "Tipp: Einträge, die jetzt im PopUp stehen, kannst du in der Seitenleiste ausblenden (Auge).",
      popup_preview_tag: "PopUp · Vorschau",
      qc_special: "Ohne Farbe",
      popup_use_hint: "In Home Assistant öffnet ein Klick auf den Eintrag das Fenster. Ein Klick auf eine Kachel wechselt die Seite ohne Neuladen; Strg-Klick (am Mac ⌘-Klick) oder die mittlere Maustaste öffnet sie in einem neuen Tab. Esc, das Kreuz oder ein Klick daneben schließt das Fenster.",
      popup_content: "Inhalt des Fensters",
      popup_content_links: "Links",
      popup_content_card: "Karte (YAML)",
      popup_width: "Fensterbreite (px)",
      popup_height: "Fensterhöhe (px)",
      popup_size_hint: "0 = automatisch: Breite 560 px mit Links, 600 px mit Karte; die Höhe richtet sich nach dem Inhalt, höchstens 85 % des Bildschirms, darüber wird gescrollt. Auf dem Handy ist das Fenster nie breiter als der Bildschirm.",
      popup_card_yaml: "Code der Karte (YAML)",
      popup_card_placeholder: "type: entities\nentities:\n  - light.wohnzimmer",
      popup_card_hint: "Den Code aus einem Dashboard holen: Karte bearbeiten → ⋮ → Im Code-Editor bearbeiten, alles kopieren und hier einfügen. Mehrere Karten: in einen vertical-stack oder grid packen. Custom Cards funktionieren, wenn sie installiert sind (HACS). Gelesen wird der Code vom YAML-Parser von Home Assistant wie in der configuration.yaml: on/off/yes/no in Anführungszeichen setzen (\"on\"), sonst werden sie zu true/false. Höchstens 50 KB.",
      popup_card_use_hint: "In Home Assistant öffnet ein Klick auf den Eintrag das Fenster mit der Karte. Knöpfe und Schalter der Karte funktionieren wie im Dashboard; öffnet die Karte einen Mehr-Info-Dialog, schließt sich das Fenster. Esc, das Kreuz oder ein Klick daneben schließt es.",
      popup_card_none: "Noch keine Karte – unter Einträge den Code einer Karte einfügen.",
      popup_card_preview: "Karte: {type}",
      popup_card_empty: "Noch kein Code.",
      popup_card_error: "Zeile {line}: {message}",
      popup_card_notype: "Der Code braucht ganz oben ein \"type:\", z. B. type: entities.",
      popup_card_ok: "OK – Karte \"{type}\", {size}.",
      popup_card_toobig: "Zu lang: {size} – höchstens 50 KB. Gespeichert bleibt der letzte gültige Code.",
      popup_sub_card: "Fenster mit Karte",
      popup_card_checking: "Home Assistant prüft den Code …",
      popup_card_check_failed: "Der Code konnte nicht geprüft werden – ist HA Style Hub aktuell und geladen?",
      popup_card_tag: "Tags wie !include oder !secret gehen in einer Karte nicht",
      popup_card_alias: "Verweise (*name) gehen in einer Karte nicht",
      add_popup_card_hint: "Nach dem Anlegen unter Einträge den Code einer Karte (YAML) einfügen – kopiert aus dem Code-Editor einer Dashboard-Karte.",
      add_link_kind: "Was soll der Knopf zeigen?",
      add_link_kind_page: "Seite",
      add_link_kind_entity: "Sensor / Entität",
      add_link_entity: "Entität",
      add_link_entity_intro: "Der aktuelle Zustand einer Entität als Knopf in der Kopfzeile – z. B. die Außentemperatur. Ein Klick öffnet den Mehr-Info-Dialog von Home Assistant.",
      add_link_entity_hint: "Zum Suchen tippen (Entitäts-ID oder Name). Sensoren stehen zuerst, jede andere Entität geht auch. Wert und Einheit erscheinen wie im Dashboard.",
      add_link_entity_button: "Sensor hinzufügen",
      add_link_entity_invalid: "Bitte eine vorhandene Entität wählen, z. B. sensor.aussentemperatur.",
      header_link_sensor: "Sensor",
      header_sensor_icon_auto: "Icon der Entität",
      settings_list_error_background: "Hintergrund bei Fehlern",
      settings_list_warning_background: "Hintergrund wenn nicht geladen",
      settings_list_problem_background_hint: "Einträge, die Aufmerksamkeit brauchen, auf der Seite einer Integration: Fehler wie ein Einrichtungsfehler (Home Assistant: rot) sowie nicht geladen / Entladen fehlgeschlagen (orange). Farbe oder Verlauf; leer = wie Home Assistant. Die Deckkraft (0–100 %) gilt für beide – kleinere Werte nehmen einer kräftigen Farbe die Wucht.",
      header_links_hint: "Abkürzungen zu Seiten von Home Assistant – oder der Zustand eines Sensors – als Buttons im Header, vor den Buttons von Home Assistant. Über das Plus kommt einer dazu; Name (erscheint als Tooltip), Icon und Farbe lassen sich hier ändern. Links in die Einstellungen sehen nur Administratoren; ein Sensor zeigt seinen Wert und öffnet den Mehr-Info-Dialog.",
      header_sensor_look: "Icon und Farben des Sensors",
      header_sensor_icon_color: "Farbe des Icons",
      header_sensor_value_color: "Farbe des Werts",
      header_sensor_value_color_auto: "wie das Icon",
      header_sensor_value_only: "Nur den Wert anzeigen (ohne Icon)",
      header_sensor_look_hint: "Ohne eigenes Icon zeigt der Button das Icon der Entität. Leere Farben: die Farbe der rechten Seite des Headers; eine leere Farbe des Werts nimmt die des Icons.",
      settings_list_problem_opacity: "Deckkraft beider Hintergründe (%)",
      epv_caption: "Seite einer Integration",
      epv_name: "Solaranlage",
      epv_meta: "4 Geräte · 124 Entitäten",
      epv_attention: "Benötigt Aufmerksamkeit",
      epv_entry_error: "Batterie",
      epv_msg_error: "Einrichtungsfehler: Anmeldung fehlgeschlagen",
      epv_device_a: "Batterie gesamt",
      epv_device_meta_a: "Keller · 6 Entitäten",
      epv_device_b: "Wechselrichter",
      epv_device_meta_b: "Keller · 63 Entitäten",
      epv_entry_warn: "Zweites Konto",
      epv_msg_warn: "Nicht geladen",
      epv_hubs: "Hubs",
      epv_entry_ok: "Dachanlage",
      epv_meta_ok: "2 Geräte",
      epv_device_c: "Dach gesamt",
      epv_device_meta_c: "Dach · 6 Entitäten",
      menu_item_icon: "Icon",
      menu_item_icon_auto: "Icon von Home Assistant",
      header_position: "Position der Kopfzeile",
      header_pos_top: "Oben",
      header_pos_bottom: "Unten",
      header_position_hint: "Unten setzt die Leiste an den unteren Rand des Dashboards – praktisch auf Tablet oder Handy. Der Inhalt rückt um dieselbe Höhe nach oben. Beim Bearbeiten eines Dashboards zeigt Home Assistant seine Werkzeugleiste wie gewohnt oben.",
      title: "HA Style Hub",
      tab_layout: "Layout",
      tab_items: "Einträge",
      tab_look: "Aussehen",
      intro_title: "Willkommen bei HA Style Hub",
      tab_theme: "Theme",
      tab_sidebar: "Sidebar",
      tab_header: "Header",
      theme_import_title: "Theme importieren",
      theme_import_hint:
        "Theme-Datei w\u00e4hlen oder ihren Inhalt einf\u00fcgen - ein Export von hier, eine Datei aus deinem themes-Ordner oder der themes-Block der configuration.yaml. \u00dcbernommen wird nur, was diese Seite auch anbietet, alles andere bleibt liegen. Das aktuelle Theme wird ersetzt, der Name bleibt stehen, und gespeichert wird erst mit \u201eSpeichern\u201c.",
      theme_import_file: "Datei w\u00e4hlen",
      theme_import_pick: "Theme in der Datei",
      theme_import_empty: "Darin steckt kein Theme.",
      theme_import_none: "Dieses Theme enth\u00e4lt keine Variable, die diese Seite kennt.",
      theme_import_done: "{taken} Werte \u00fcbernommen",
      theme_import_done_one: "Ein Wert \u00fcbernommen",
      theme_import_skipped: ", {skipped} unbekannte Variablen liegen gelassen",
      theme_import_skipped_one: ", eine unbekannte Variable liegen gelassen",
      theme_default: "Home Assistant",
      theme_enabled: "Theme in Home Assistant eintragen",
      theme_enabled_hint:
        "Das Theme steht danach in der Theme-Auswahl jedes Benutzerprofils, genau wie ein Theme aus der configuration.yaml.",
      theme_name: "Name des Themes",
      theme_set_default: "Gleich als Standard-Theme verwenden",
      theme_set_default_hint:
        "Setzt das Theme f\u00fcr alle, die dem vom Server gew\u00e4hlten Theme folgen. Ohne die Option w\u00e4hlt es jeder selbst im Profil.",
      theme_intro:
        "Bestimmt die Farben von Home Assistant selbst - Dashboards, Dialoge und die Einstellungsseiten. Leere Felder werden nicht angefasst, dort bleibt der Wert von Home Assistant.",
      theme_mode_dark: "Dunkel",
      theme_mode_light: "Hell",
      theme_copy_to_light: "Nach Hell kopieren",
      theme_copy_to_dark: "Nach Dunkel kopieren",
      theme_copied: "Werte kopiert",
      theme_clear: "Diesen Modus leeren",
      theme_clear_confirm: "Alle Werte dieses Modus leeren?",
      header_hidden_hint:
        "Die Leiste verschwindet und der Inhalt r\u00fcckt nach oben. Beim Bearbeiten eines Dashboards bleibt sie stehen - ohne sie k\u00e4me man aus dem Editor nicht mehr heraus. Um den Editor ohne die Leiste zu \u00f6ffnen, h\u00e4nge ?edit=1 an die Adresse des Dashboards. Dieselbe Einstellung gibt es als Schalter in Home Assistant (Ger\u00e4t \u201eHA Style Hub\u201c) und l\u00e4sst sich damit als Knopf auf ein Dashboard legen.",
      header_height: "H\u00f6he (px)",
      header_height_hint:
        "Bei 0 bleibt die H\u00f6he von Home Assistant. Der Inhalt darunter r\u00fcckt von selbst mit.",
      header_blur: "Weichzeichner dahinter (px)",
      header_blur_hint:
        "Titelgr\u00f6\u00dfe und Schriftst\u00e4rke gelten f\u00fcr den Titel und f\u00fcr die Reiter der Ansichten. Der Weichzeichner ist nur zu sehen, wenn der Hintergrund durchscheint: stelle daf\u00fcr die Deckkraft unter 100.",
      header_opacity: "Deckkraft des Hintergrunds (%)",
      header_title_size: "Titel- und Reitergr\u00f6\u00dfe (px)",
      header_border_width: "Rahmenbreite (px)",
      header_border_color: "Rahmenfarbe",
      header_items_frame: "Rahmen um einzelne Elemente",
      header_items_hint:
        "Ein Rahmen um jeden Button (Men\u00fc, +, Suche, Assist, Stift) und jeden Reiter der Ansichten, statt eines einzigen um die ganze Leiste. Breite 0 hei\u00dft kein Rahmen. Stellst du nur den Eckenradius ein, werden die Formen ohne Rahmen abgerundet.",
      header_items_buttons: "Um die Button",
      header_items_tabs: "Um die Reiter der Ansichten",
      header_icon_size: "Icongr\u00f6\u00dfe (px)",
      tab_hover_background: "Hintergrund beim \u00dcberfahren",
      tab_hover_opacity: "Deckkraft beim \u00dcberfahren (%)",
      header_show_restart: "Neustart-Button im Header anzeigen",
      header_show_restart_hint:
        "Er steht vor den Buttons von Home Assistant. Nur Administratoren sehen ihn. Vor dem Neustart fragt ein Fenster in der Optik deines Themes nach und prüft zuerst die Konfiguration (wie „Konfiguration prüfen“); bei Fehlern startet er nicht neu. Name und Icon kommen vom Neustart-Eintrag der Sidebar, falls dort etwas eingetragen ist.",
      header_links: "Links",
      header_link_add: "Link zum Header hinzuf\u00fcgen",
      header_link_add_hint:
        "Die Seite bekommt einen Button rechts im Header, vor den Buttons von Home Assistant.",
      header_links_empty: "Noch keine Links \u2013 \u00fcber das Plus kommt einer dazu.",
      header_links_full: "Im Header haben h\u00f6chstens 12 Links Platz.",
      header_link_color: "Icon-Farbe",
      header_link_up: "Nach vorn",
      header_link_down: "Nach hinten",
      header_presets_hint:
        "Ein fertiges Aussehen mit einem Klick. Die Vorlage f\u00fcllt die Felder dieser Seite; ob die Leiste ausgeblendet ist, bleibt wie es ist, und gespeichert wird erst mit \u201eSpeichern\u201c.",
      header_preset_confirm:
        "Die Felder der Kopfzeile mit dieser Vorlage f\u00fcllen? Was jetzt drinsteht, geht dabei verloren.",
      header_preset_done: "Vorlage {name} \u00fcbernommen",
      header_transfer_hint:
        "Exportieren speichert diese Einstellungen als .json-Datei - praktisch als Sicherung oder um ein Aussehen weiterzugeben. Importieren liest so eine Datei wieder ein. Betroffen ist nur die Kopfzeile, Seitenleiste und Theme bleiben unber\u00fchrt.",
      header_import_title: "Kopfzeile importieren",
      header_import_hint:
        "Datei w\u00e4hlen oder ihren Inhalt einf\u00fcgen - ein Export von hier oder ein vollst\u00e4ndiger HA-Style-Hub-Export, aus dem nur der Kopfzeilen-Teil gelesen wird. Ob die Leiste ausgeblendet ist, bleibt unver\u00e4ndert, und gespeichert wird erst mit \u201eSpeichern\u201c.",
      header_import_empty: "Darin stecken keine Kopfzeilen-Einstellungen.",
      header_import_done: "{taken} Werte \u00fcbernommen",
      header_import_done_one: "Ein Wert \u00fcbernommen",
      header_buttons_hint:
        "Die vier Button, die Home Assistant rechts in die Kopfzeile setzt. Schalte ab, was du nicht brauchst - jeder wird an seinem Icon erkannt, der Rest funktioniert also weiter, auch wenn Home Assistant weitere hinzuf\u00fcgt.",
      hide_add: "\u201eHinzuf\u00fcgen\u201c (+) ausblenden",
      hide_search: "Suche ausblenden",
      hide_assist: "Assist ausblenden",
      hide_edit: "\u201eDashboard bearbeiten\u201c ausblenden",
      hide_edit_hint:
        "Ohne ihn kommt man an den Dashboard-Editor nur noch, indem man ?edit=1 an die Adresse h\u00e4ngt.",
      header_view_one: "\u00dcbersicht",
      header_view_two: "R\u00e4ume",
      tab_color: "Farbe der Reiter",
      tab_color_active: "Farbe des gew\u00e4hlten Reiters",
      tab_indicator_color: "Strich unter dem gew\u00e4hlten Reiter",
      theme_presets: "Vorlagen",
      theme_presets_hint:
        "Ein fertiges Aussehen f\u00fcr beide Modi mit einem Klick. Die Vorlage f\u00fcllt nur die Felder dieser Seite - danach bleibt jeder Wert \u00e4nderbar, und gespeichert wird erst mit \u201eSpeichern\u201c.",
      theme_preset_confirm:
        "Alle Felder beider Modi mit dieser Vorlage f\u00fcllen? Was jetzt drinsteht, geht dabei verloren.",
      theme_preset_done: "Vorlage {name} \u00fcbernommen",
      palette_hint:
        "W\u00e4hle eine Hauptfarbe, und die Farben f\u00fcr beide Modi werden daraus abgeleitet: Prim\u00e4rfarbe, Hintergr\u00fcnde, Text, Kopfzeile, Icons, Regler und Badges. Die Texte werden so gew\u00e4hlt, dass sie lesbar bleiben. Rahmen, Schatten, Schrift und die Statusfarben (Fehler, Warnung, Erfolg, Hinweis) bleiben, wie sie sind. Gespeichert wird erst mit \u201eSpeichern\u201c.",
      palette_main: "Hauptfarbe",
      palette_tint: "Hintergr\u00fcnde",
      palette_tint_neutral: "Neutral (fast grau)",
      palette_tint_tint: "Leicht get\u00f6nt",
      palette_tint_strong: "Kr\u00e4ftig get\u00f6nt",
      palette_accent: "Akzentfarbe",
      palette_accent_same: "Wie die Hauptfarbe",
      palette_accent_analogous: "Benachbarter Farbton",
      palette_accent_complementary: "Gegenfarbe",
      palette_accent_triad: "Dreiklang",
      palette_dark: "Dunkel",
      palette_light: "Hell",
      palette_apply: "Palette \u00fcbernehmen",
      palette_bad: "Das ist keine Hex-Farbe - nimm etwas wie #03a9f4.",
      palette_confirm:
        "Die Farben beider Modi mit dieser Palette \u00fcberschreiben? Rahmen, Schatten, Schrift und die Statusfarben bleiben. Bis zum Speichern holt \u201eVerwerfen\u201c die alten Farben zur\u00fcck.",
      palette_done: "Palette in beide Modi \u00fcbernommen",
      history_button: "Verlauf",
      history_title: "Verlauf",
      history_hint:
        "Die zuletzt gespeicherten St\u00e4nde, der neueste oben. \u201eWiederherstellen\u201c l\u00e4dt einen Stand in die Seite - gespeichert wird erst mit \u201eSpeichern\u201c, und \u201eVerwerfen\u201c nimmt es zur\u00fcck. Das Ausblenden von Kopfzeile und Sidebar bleibt, wie es gerade ist: das sind Schalter und kein Teil eines Aussehens.",
      history_loading: "Lade ...",
      history_empty: "Noch nichts da - die Liste f\u00fcllt sich mit jedem Speichern.",
      tab_settings: "HA-Settings",
      settings_hint:
        "Hier stellst du Dinge ein, die Home Assistant selbst betreffen – nicht die Seitenleiste und kein Dashboard: Aussehen, Maus-Hover, Spalten und Kacheln der Menüpunkte (auch auf der Seite System), ihre Reihenfolge, eine Favoriten-Leiste, den Systemmonitor mit Prozessor, Arbeitsspeicher, Speicher und letztem Backup, Geräte & Dienste und Apps als schmale Liste sowie die Gruppenköpfe und Zeilen der Tabellen.",
      settings_note:
        "Wirkt in jedem Browser, in dem HA Style Hub geladen ist, sobald du die Einstellungen öffnest. Home Assistant kann diese Seiten in einer späteren Version ändern – passt es dann nicht mehr, bleiben sie einfach so, wie Home Assistant sie zeichnet.",
      settings_icon_box: "Menüpunkte als abgerundete Boxen",
      settings_icon_box_hint:
        "Statt des farbigen Kreises hinter jedem Symbol eine Box mit abgerundeten Ecken zeigen.",
      settings_icon_background: "Farbe der Box",
      settings_icon_color: "Farbe des Symbols",
      settings_icon_box_size: "Größe der Box (px)",
      settings_icon_size: "Größe des Symbols (px)",
      settings_icons_hint:
        "Leere Farben und 0 heißen „wie Home Assistant es zeichnet“. Mit einer Boxfarbe bekommen alle Menüpunkte dieselbe Farbe statt jeder seine eigene. Die Box ist nie kleiner als das Symbol.",
      settings_list_title: "Geräte & Dienste: Listenansicht",
      settings_list_hint:
        "Einstellungen › Geräte & Dienste zeigt die Integrationen als Raster aus Karten. Als Liste bekommt jede eine eigene schmale Zeile: der Name links, Anzahl und Symbole rechts.",
      settings_list_view: "Integrationen als Liste statt als Raster anzeigen",
      settings_list_row_height: "Höhe einer Zeile (px)",
      settings_list_gap: "Abstand zw. den Zeilen (px)",
      settings_list_max_width: "Maximale Breite Liste (px)",
      settings_menu_frame: "Rahmen und Ecken der Menüpunkte",
      settings_list_frame: "Rahmen und Ecken der Zeilen",
      settings_menu_border_width: "Rahmen (px)",
      settings_menu_border_color: "Rahmenfarbe",
      settings_menu_border_radius: "Eckenradius (px)",
      settings_hover_background: "Farbe beim Überfahren",
      settings_hover_opacity: "Deckkraft beim Überfahren (%)",
      settings_standard: "Standard",
      settings_transfer_hint:
        "Der Export speichert die HA-Settings als .json-Datei – praktisch als Sicherung oder zum Weitergeben. Der Import liest eine solche Datei wieder ein. Angefasst werden nur diese Einstellungen; Seitenleiste, Theme und Header bleiben, wie sie sind.",
      settings_import_title: "HA-Settings importieren",
      settings_import_hint:
        "Datei wählen oder den Inhalt einfügen – ein Export von hier oder ein vollständiger HA-Style-Hub-Export, aus dem nur der Teil der HA-Settings gelesen wird. Gespeichert wird erst, wenn du auf Speichern drückst.",
      settings_import_empty: "Darin stecken keine HA-Settings.",
      settings_import_done: "{taken} Werte übernommen",
      settings_import_done_one: "Ein Wert übernommen",
      settings_list_border_width: "Rahmenstärke (px)",
      settings_list_border_radius: "Eckenradius (px)",
      settings_list_border_color: "Rahmenfarbe",
      settings_list_error_color: "Rahmenfarbe bei Problemen",
      settings_list_background: "Hintergrundfarbe der Zeilen",
      settings_list_fields_hint:
        "Zeilenhöhe: Standard 56, mindestens 32 – eine Zeile mit Fehlermeldung braucht etwas mehr Platz. Breite: 0 heißt volle Breite. Rahmenstärke und Eckenradius: leer heißt wie Home Assistant, 0 ist ein echter Wert (kein Rahmen, eckig). Die Problemfarbe gilt für Integrationen mit Einrichtungsfehler oder die nicht geladen sind – die rote Zeile in der Vorschau. Zeilenhintergrund: Farbe oder Verlauf der Zeile, leer behält die Kartenfarbe von Home Assistant. Hover: die Farbe, die die ganze Zeile unter der Maus annimmt; leer lässt Home Assistants eigenen Effekt.",
      settings_list_note:
        "Die Listenansicht arbeitet mit dem Aufbau der Seite, wie er im Quelltext von Home Assistant steht (Integrationskarten mit Kopf und Aktionsleiste). Ändert eine spätere Version ihn, bleibt die Seite einfach ein Raster.",
      settings_list_a: "Wetterdienst",
      settings_list_a_meta: "1 Dienst",
      settings_list_b: "Mediaplayer",
      settings_list_b_meta: "3 Geräte",
      settings_list_c: "Lichter",
      settings_list_c_meta: "12 Geräte",
      settings_list_d: "Backup",
      settings_list_d_meta: "1 Dienst",
      settings_list_e: "Heizung",
      settings_list_e_meta: "4 Geräte",
      settings_list_f: "Mobile-App",
      settings_list_f_meta: "2 Geräte",
      settings_list_two_columns: "Zweispaltige Liste",
      settings_list_three_columns: "Dreispaltige Liste",
      settings_list_apps: "Ansicht auch für Apps übernehmen",
      settings_list_apps_hint:
        "Die Seite „Apps“ (früher Add-ons) wird dann ebenfalls als Liste angezeigt: eine App pro Zeile mit Symbol, Name, Beschreibung und Status. Höhe, Abstand, Breite, Rahmen und Hover der Liste gelten dort mit.",
      table_rows_title: "Zeilen",
      table_zebra: "Farbe jeder zweiten Zeile",
      table_hover: "Mouse Hover",
      table_font_size: "Schriftgr\u00f6\u00dfe (px)",
      favorite_icon_only: "Nur Icon anzeigen, Text ausblenden",
      menu_columns: "Spalten",
      menu_tiles: "Men\u00fcpunkte als Kacheln anzeigen",
      menu_tiles_hint:
        "Symbol \u00fcber dem Namen, ohne Beschreibung und Pfeil. Mit zwei oder drei Spalten wird die Seite breiter; auf einem schmalen Bildschirm werden es von selbst weniger Spalten.",
      menu_entries_title: "Reihenfolge und Sichtbarkeit",
      menu_entries_hint:
        "Home Assistant zeigt die Men\u00fcpunkte in mehreren Bl\u00f6cken (Karten). Die Pfeile verschieben einen Punkt innerhalb seines Blocks, das Auge blendet ihn aus. Sind alle Punkte eines Blocks ausgeblendet, verschwindet der Block.",
      menu_block: "Block {n}",
      menu_entries_seen: "Die Liste zeigt die Men\u00fcpunkte, die deine Einstellungsseite hatte, als sie zuletzt in diesem Browser ge\u00f6ffnet war.",
      menu_entries_fallback:
        "Das ist eine Standardliste. \u00d6ffne einmal die Einstellungsseite von Home Assistant und komm zur\u00fcck \u2013 dann stehen hier die Men\u00fcpunkte deiner Installation, mit ihren Namen.",
      favorites_title: "Favoriten-Leiste",
      favorites_hint:
        "Eigene Abk\u00fcrzungen als Reihe von Buttons oben auf der Einstellungsseite \u2013 f\u00fcr die Seiten, die du am h\u00e4ufigsten brauchst. Name, Icon und Farbe lassen sich hier \u00e4ndern.",
      favorites_empty: "Noch keine Favoriten \u2013 \u00fcber das Plus kommt einer dazu.",
      favorite_add: "Favorit hinzuf\u00fcgen",
      favorite_add_hint: "Die Seite bekommt einen Button oben auf der Einstellungsseite.",
      header_show_system: "CPU und RAM im Header anzeigen",
      header_show_system_hint: "Zwei kleine Werte vor den Buttons, alle 5 Sekunden aus der Hardware-Integration von Home Assistant. Auf sehr schmalen Bildschirmen ausgeblendet. F\u00fcr Administratoren \u00f6ffnet ein Klick die Hardware-Seite.",
      favorites_place: "Position",
      favorites_place_page: "\u00dcber den Karten",
      favorites_place_header: "Mittig in der Kopfleiste",
      favorites_place_hint: "In der Kopfleiste \u00fcbernehmen die Favoriten die Farben der Leiste, solange sie keine eigenen haben. In einem Fenster schmaler als 1000 px ist neben Titel und Buttons kein Platz \u2013 dann stehen sie \u00fcber den Karten.",
      favorite_look: "Aussehen bearbeiten",
      favorite_look_hint: "Leer hei\u00dft wie vorgegeben: \u00fcber den Karten wie eine Karte von Home Assistant, in der Kopfleiste passend zur Leiste. 0 ist ein echter Wert. H\u00f6he: leer oder unter 16 px richtet sich nach dem Text.",
      monitor_title: "Systemmonitor",
      monitor_hint: "Prozessor, Arbeitsspeicher und Speicher auf einen Blick auf der Einstellungsseite \u2013 die Werte, die Home Assistant auf den Seiten Hardware und Speicher zeigt. Ein Klick auf einen Wert \u00f6ffnet die passende Seite.",
      monitor_show: "Systemmonitor auf der Einstellungsseite anzeigen",
      monitor_place: "Position",
      monitor_place_top: "Oben, unter der Favoriten-Leiste",
      monitor_place_end: "Am Ende, unter den Men\u00fcpunkten",
      monitor_graphs: "Graphen anzeigen",
      monitor_graphs_hint: "Prozessor und Arbeitsspeicher als Verlauf der letzten 5 Minuten, der Speicher als Balken mit belegtem und gesamtem Platz. Der Verlauf beginnt, sobald dieser Browser-Tab die Werte zum ersten Mal abruft.",
      menu_hover_hint: "Die Farbe eines Men\u00fcpunkts unter der Maus, auf der Einstellungsseite und ihren Unterseiten. Leer bleibt der eigene Effekt von Home Assistant.",
      monitor_backup: "Letztes Backup anzeigen (eigene Box)",
      monitor_backup_hint: "Wann, wie gro\u00df, unter welchem Namen und wo das neueste Backup liegt \u2013 in einer eigenen Box \u00fcber die ganze Breite. Geht mit oder ohne Systemmonitor. Ein Klick \u00f6ffnet die Backup-Seite.",
      monitor_backup_place: "Position der Backup-Box",
      monitor_backup_place_top: "Oben (unter dem Systemmonitor)",
      monitor_backup_place_end: "Am Ende, unter den Men\u00fcpunkten",
      monitor_backup_last: "Letztes Backup",
      monitor_backup_size: "Gr\u00f6\u00dfe",
      monitor_backup_name: "Name",
      monitor_backup_where: "Speicherort",
      monitor_demo_ago: "vor 19 Std.",
      monitor_demo_when: "8.10.2026, 05:08:46",
      monitor_demo_auto: "Automatisch",
      monitor_demo_count: "12 Backups vorhanden",
      monitor_demo_where: "Dieses System \u00b7 NAS",
      monitor_demo_next: "N\u00e4chstes: 9.10.2026, 04:45:00",
      monitor_cpu: "Prozessor",
      monitor_ram: "Arbeitsspeicher",
      monitor_disk: "Speicher",
      monitor_demo_cpu: "\u00d8 14 % \u00b7 max. 41 %",
      monitor_demo_ram: "3,8 von 7,8 GB",
      monitor_demo_disk: "50,5 von 58,0 GB",
      monitor_demo_free: "7,5 GB frei",
      monitor_demo_used: "50,5 GB belegt",
      monitor_demo_total: "58,0 GB gesamt",
      settings_table_hint:
        "In den Tabellen von Home Assistant (Automatisierungen, Entitäten, Helfer, Geräte, ...) trennen Gruppenköpfe wie „Nicht gruppiert“ oder der Name eines Bereichs die Einträge. Mit eigener Farbe und Schrift wird die Liste übersichtlicher.",
      settings_table_background: "Hintergrund",
      settings_table_color: "Textfarbe",
      settings_table_size: "Schriftgröße (px)",
      settings_table_weight: "Schriftstärke",
      settings_table_note:
        "Leer und 0 heißen „wie Home Assistant“. Die Vorschau ist ein Modell. Die Gruppierung selbst schaltest du in der Tabelle ein („Gruppieren nach“ in der Werkzeugleiste).",
      settings_table_col_name: "Name",
      settings_table_col_area: "Bereich",
      settings_table_group_a: "Wohnzimmer",
      settings_table_group_b: "Küche",
      settings_table_row_a: "Stehlampe",
      settings_table_row_b: "Deckenlicht",
      settings_table_row_c: "Spülmaschine",
      settings_table_row_d: "Dunstabzug",
      history_error: "Der Verlauf konnte nicht geladen werden.",
      history_current: "Aktuell",
      history_start: "Ausgangspunkt (vor Beginn des Verlaufs)",
      history_saved: "Gespeichert",
      history_reset: "Auf Standard zur\u00fcckgesetzt",
      history_by: "von {name}",
      history_restore: "Wiederherstellen",
      history_close: "Schlie\u00dfen",
      history_nothing: "Keine \u00c4nderung am Aussehen (nur Aus- oder Einblenden)",
      history_today: "Heute",
      history_yesterday: "Gestern",
      history_restored: "Stand vom {date} geladen - \u201eSpeichern\u201c beh\u00e4lt ihn, \u201eVerwerfen\u201c macht es r\u00fcckg\u00e4ngig",
      history_unsaved: "Es gibt ungespeicherte \u00c4nderungen. Beim Wiederherstellen gehen sie verloren. Fortfahren?",
      history_area_layout: "Sidebar \u203a Layout",
      history_area_items: "Sidebar \u203a Eintr\u00e4ge",
      history_area_look: "Sidebar \u203a Aussehen",
      history_area_theme: "Theme",
      history_area_header: "Header",
      history_area_settings: "HA-Settings",
      history_value: "{n} Wert",
      history_values: "{n} Werte",
      history_entry: "{n} Eintrag",
      history_entries: "{n} Eintr\u00e4ge",
      history_order: "Reihenfolge",
      history_dark: "dunkel",
      history_light: "hell",
      theme_export_hint:
        "Exportieren speichert das Theme als .yaml-Datei - praktisch als Sicherung oder um es von Hand in die configuration.yaml zu \u00fcbernehmen. Importieren liest so eine Datei wieder ein und f\u00fcllt damit die Felder dieser Seite; Variablen, die diese Seite nicht kennt, bleiben liegen.",
      theme_disabled_hint:
        "Das Theme ist noch nicht eingetragen. Die Vorschau zeigt trotzdem schon, wie es aussehen w\u00fcrde.",
      preview_settings: "Einstellungen",
      preview_living: "Wohnzimmer",
      preview_brightness: "Helligkeit",
      preview_state_light: "Licht an",
      preview_state_switch: "Schalter an",
      preview_state_fan: "Lüfter an",
      preview_state_media: "Mediaplayer aktiv",
      preview_state_cover: "Rollladen offen",
      preview_state_heat: "Heizen",
      preview_state_cool: "Kühlen",
      preview_state_locked: "Schloss verriegelt",
      preview_state_unlocked: "Schloss entriegelt",
      preview_state_armed: "Alarm scharf",
      preview_state_triggered: "Alarm ausgelöst",
      preview_state_person: "Person zu Hause",
      save: "Speichern",
      saved: "Gespeichert",
      revert: "Verwerfen",
      reset: "Alles zurücksetzen",
      reset_confirm: "Die GESAMTE HA Style Hub-Konfiguration (Sidebar, Theme, Header und HA-Settings) auf die Standardwerte zurücksetzen?",
      preview_hint:
        "Jede Änderung ist sofort in der Seitenleiste zu sehen. Dauerhaft gespeichert wird sie erst mit „Speichern“.",
      columns: "Spalten (ausgeklappt)",
      columns_collapsed: "Spalten (eingeklappt)",
      columns_collapsed_hint:
        "Mehr als eine Spalte braucht eine gr\u00f6\u00dfere eingeklappte Breite \u2013 in 56 px passt nur ein Icon.",
      item_style: "Darstellung der Einträge",
      gap: "Abstand (px)",
      width: "Breite ausgeklappt (px)",
      width_collapsed: "Breite eingeklappt (px)",
      tile_height: "Kachelhöhe ausgeklappt (px)",
      tile_height_collapsed: "Kachelhöhe eingeklappt (px)",
      tile_gap: "Abstand Icon zu Text (px)",
      row_height: "Zeilenhöhe ausgeklappt (px)",
      row_height_collapsed: "Zeilenhöhe eingeklappt (px)",
      hide_scrollbar: "Scrollbalken ausblenden",
      hide_scrollbar_hint:
        "Die Liste lässt sich weiterhin scrollen, nur der Balken verschwindet.",
      merge_fixed:
        "Einstellungen, Benachrichtigungen und Profil ins Raster übernehmen",
      merge_fixed_hint:
        "Nur so lassen sich diese drei Einträge frei sortieren. Ohne die Option bleiben sie unten verankert.",
      heading_height: "H\u00f6he (px)",
      heading_height_hint:
        "Bei 0 bestimmt der Text die H\u00f6he. Die \u00dcberschrift sitzt dann dicht \u00fcber ihren eigenen Eintr\u00e4gen und mit mehr Abstand zu denen dar\u00fcber. Jeder andere Wert gibt der Zeile genau diese H\u00f6he und stellt den Text mittig hinein.",
      heading_uppercase: "Gro\u00dfbuchstaben",
      hide_sidebar: "Sidebar ausblenden (kiosk-mode)",
      hide_sidebar_hint:
        "Die ganze Seitenleiste verschwindet und der Inhalt daneben bekommt den Platz. Dieses Panel bleibt unter /ha-style-hub erreichbar, und dieselbe Einstellung gibt es als Schalter in Home Assistant (Ger\u00e4t \u201eHA Style Hub\u201c) - aussperren kann man sich damit also nicht.",
      advanced_transfer_hint:
        "Exportieren speichert die komplette Konfiguration - Seitenleiste, Theme, Header und HA-Settings - als .json-Datei. Importieren liest so eine Datei wieder ein.",
      reset_title: "Alles zur\u00fccksetzen",
      reset_hint:
        "Setzt die <strong>gesamte</strong> HA Style Hub-Konfiguration auf die Standardwerte zur\u00fcck, nicht nur diese Seite: Sidebar (Layout, Eintr\u00e4ge, Reihenfolge, Aussehen), Theme (samt dem in Home Assistant eingetragenen Theme), Header, HA-Settings und die beiden kiosk-mode-Schalter. Es wird sofort gespeichert. Der Stand davor bleibt im Verlauf (Uhr-Symbol) und l\u00e4sst sich von dort wiederherstellen.",
      show_restart: "Neustart-Knopf im Raster anzeigen",
      show_restart_hint:
        "Home Assistant hat keinen solchen Knopf in der Seitenleiste, dieser kommt von der Integration. Nur Administratoren sehen ihn. Vor dem Neustart fragt ein Fenster in der Optik deines Themes nach und prüft zuerst die Konfiguration (wie „Konfiguration prüfen“); bei Fehlern startet er nicht neu. Name, Icon, Farben und Position stellst du unter Einträge ein wie bei jedem anderen.",
      restart_entry: "Neustart",
      order_hint:
        "Einträge in die gewünschte Reihenfolge ziehen oder die Pfeile benutzen.",
      name: "Name",
      icon: "Icon",
      icon_placeholder: "z. B. mdi:home",
      span: "Breite",
      heading: "Zwischen\u00fcberschrift",
      heading_sub: "nur Unterteilung, kein Ziel",
      add_hint: "\u00dcber das Plus kommt eine Zwischen\u00fcberschrift oder ein Link zu einer Seite von Home Assistant dazu (Automatisierungen, Entit\u00e4ten, Werkzeuge, ...).",
      add_title: "Eintrag hinzuf\u00fcgen",
      add_heading_title: "Zwischen\u00fcberschrift",
      add_heading_hint: "Unterteilt die Liste. Sie hat kein Ziel, Eintr\u00e4ge lassen sich ihr zuordnen.",
      add_heading_button: "Zwischen\u00fcberschrift hinzuf\u00fcgen",
      add_link_title: "Link",
      add_link_hint:
        "Eine Abk\u00fcrzung zu einer Seite von Home Assistant, direkt in der Sidebar \u2013 ohne Umweg \u00fcber die Einstellungen. Name, Icon, Farben und Position stellst du danach ein wie bei jedem anderen Eintrag. Links in die Einstellungen sehen nur Administratoren.",
      add_link_page: "Seite",
      add_link_custom: "Eigener Pfad \u2026",
      add_link_path: "Pfad",
      add_link_button: "Link hinzuf\u00fcgen",
      add_link_invalid: "Der Pfad muss mit / beginnen und darf keine Leer- oder Sonderzeichen enthalten, z. B. /config/tools/state",
      add_link_exists: "Diesen Link gibt es in der Liste schon.",
      link: "Link",
      link_remove: "Diesen Link entfernen",
      close: "Schlie\u00dfen",
      heading_collapsible: "L\u00e4sst sich zusammenklappen",
      heading_collapsible_hint:
        "Ein Klick auf die \u00dcberschrift in der Seitenleiste klappt die darunter einsortierten Eintr\u00e4ge weg. Welche \u00dcberschriften zugeklappt sind, merkt sich jeder Browser selbst.",
      heading_indent_hint:
        "Zieh einen Eintrag etwas nach rechts, um ihn unter der \u00dcberschrift dar\u00fcber einzusortieren. Nach links ziehen l\u00f6st die Zuordnung wieder.",
      heading_remove: "Diese \u00dcberschrift entfernen",
      heading_hint:
        "Eine Zwischen\u00fcberschrift unterteilt die Seitenleiste in Bl\u00f6cke. Sie hat kein Ziel, l\u00e4uft \u00fcber die ganze Breite und ist im eingeklappten Zustand ausgeblendet. Zieh sie an die Stelle, wo sie hingeh\u00f6rt.",
      hidden: "Ausgeblendet",
      more: "Mehr",
      text_color: "Textfarbe",
      icon_color: "Iconfarbe",
      item_background: "Hintergrund",
      background: "Hintergrundfarbe",
      background_gradient: "Farbverlauf verwenden",
      background_color2: "Zweite Farbe",
      gradient_direction: "Richtung",
      dir_bottom: "nach unten",
      dir_top: "nach oben",
      dir_right: "nach rechts",
      dir_left: "nach links",
      dir_br: "nach unten rechts",
      dir_bl: "nach unten links",
      dir_tr: "nach oben rechts",
      dir_tl: "nach oben links",
      dir_radial: "radial, aus der Mitte",
      dash_image_title: "Hintergrundbild",
      dash_image_none: "Kein Bild gewählt",
      dash_image_choose: "Bild auswählen\u2026",
      dash_image_replace: "Bild ersetzen\u2026",
      dash_image_remove: "Entfernen",
      dash_image_size: "Darstellung",
      dash_size_cover: "Ausfüllen (Ränder beschneiden)",
      dash_size_contain: "Ganz einpassen",
      dash_size_tile: "Kacheln",
      dash_image_scroll: "Bild beim Scrollen mitlaufen lassen",
      dash_image_hint:
        "PNG, JPEG, GIF oder WebP, bis 8 MB. Die Integration legt die Datei im Ordner www/ha_style_hub deiner Home-Assistant-Konfiguration ab und liefert sie selbst aus - ein Pfad muss nicht eingetippt werden. Das Bild ist wie alles in www öffentlich abrufbar: kein privates Foto verwenden. Wirksam wird es erst nach dem Speichern.",
      dash_uploading: "Wird hochgeladen\u2026",
      dash_upload_done: "Bild hochgeladen - zum Übernehmen speichern",
      dash_upload_failed: "Hochladen fehlgeschlagen",
      dash_upload_big: "Das Bild ist größer als 8 MB",
      dash_upload_type: "Das ist kein Bild",
      load_failed: "Die Konfiguration konnte nicht geladen werden - Speichern ist gesperrt. Bitte die Seite neu laden.",
      theme_export_empty: "Nichts zu exportieren - das Theme ist leer",
      section_hover: "Maus hover",
      hover_background: "Hintergrund",
      hover_opacity: "Deckkraft des Hintergrunds (%)",
      hover_text_color: "Textfarbe",
      hover_icon_color: "Iconfarbe",
      header_background: "Kopfbereich Hintergrund",
      border_width: "Rahmen der Seitenleiste (px)",
      border_color: "Rahmenfarbe der Seitenleiste",
      text_color_selected: "Textfarbe, aktiv",
      icon_color_selected: "Iconfarbe, aktiv",
      font_size: "Schriftgröße (px)",
      font_weight: "Schriftstärke",
      font_family: "Schriftart",
      font_theme: "Theme-Standard",
      open_sidebar: "Seitenleiste einblenden",
      icon_size: "Icongröße (px)",
      item_background_selected: "Hintergrund Eintrag, aktiv",
      item_border_width: "Rahmen der Einträge (px)",
      item_border_color: "Rahmenfarbe der Einträge",
      item_border_split: "Seiten einzeln festlegen",
      side_top: "Oben (px)",
      side_right: "Rechts (px)",
      side_bottom: "Unten (px)",
      side_left: "Links (px)",
      item_radius_split: "Ecken einzeln festlegen",
      corner_tl: "Oben links (px)",
      corner_tr: "Oben rechts (px)",
      corner_br: "Unten rechts (px)",
      corner_bl: "Unten links (px)",
      style_notifications: "Benachrichtigungsfenster mitgestalten",
      style_notifications_hint:
        "Übernimmt Hintergrund, Kopfbereich und Textfarbe auch für das Fenster, das über den Eintrag Benachrichtigungen aufgeht.",
      item_radius: "Eckenradius (px)",
      sidebar_title: "Titel der Seitenleiste",
      sidebar_title_placeholder: "Original behalten",
      title_color: "Titelfarbe",
      hide_title: "Titel ausblenden",
      hide_toggle: "Menüknopf ausblenden",
      hide_labels_collapsed: "Beschriftung im eingeklappten Zustand ausblenden",
      custom_css: "Zusätzliches CSS",
      custom_css_hint:
        "Wird in den Shadow Root von ha-sidebar eingefügt. :host meint die Seitenleiste selbst.",
      css_example_head: "Beispiel - nicht aktiv, zeigt nur, was möglich ist",
      css_example_all: "alle Einträge",
      css_example_one: "ein einzelnes Dashboard",
      css_example_user: "der Benutzereintrag",
      css_example_expanded: "nur im ausgeklappten Zustand",
      enabled: "HA Style Hub aktiv",
      enabled_hint:
        "Der Hauptschalter: Aus hei\u00dft, die Integration \u00e4ndert nichts mehr an Sidebar, Header und den HA-Settings-Seiten. Ein unter Theme eingetragenes Theme bleibt davon unberührt - es gehört nach dem Eintragen Home Assistant, und wer es im Profil gewählt hat, behält es.",
      debug: "Debug-Ausgaben in der Browser-Konsole",
      debug_hint:
        "F\u00fcr Sidebar, Theme, Header und HA-Settings: Die Browser-Konsole (F12) zeigt, was die Integration auf der Seite gefunden und angewendet hat. Hilfreich, wenn etwas nicht so aussieht wie eingestellt.",
      export: "Exportieren",
      import: "Importieren",
      import_title: "Konfiguration importieren",
      import_hint:
        "Exportierte Datei auswählen oder ihren Inhalt einfügen. Die Konfiguration wird sofort übernommen und erst mit „Speichern“ abgelegt.",
      import_file: "Datei wählen",
      import_apply: "Importieren",
      cancel: "Abbrechen",
      import_error: "Das ist kein gültiges JSON.",
      import_empty: "Es ist noch nichts zum Importieren da.",
      export_done: "Datei gespeichert",
      badge_background: "Info-Badge Hintergrund",
      badge_color: "Info-Badge Textfarbe",
      section_badge: "Info-Badge",
      notif_text_color: "Textfarbe",
      notif_header_color: "Kopfbereich Text und Icons",
      section_colors: "Farben",
      section_text: "Text und Icons",
      section_items: "Einträge",
      section_header: "Kopfbereich",
      section_notifications: "Benachrichtigungsfenster",
      unsaved: "Nicht gespeicherte Änderungen",
    },
  };

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

  const section = (defaults, data) => {
    const out = Object.assign({}, defaults);
    if (isObject(data)) {
      Object.keys(data).forEach((key) => {
        if (key in out) {
          out[key] = data[key];
        }
      });
    }
    return out;
  };

  /**
   * The theme section. Every known variable is present as a string, so the
   * inputs can bind to it directly; empty values are dropped again on the way
   * to the backend (store.py) and never end up in a registered theme.
   */
  const themeSection = (raw) => {
    const data = isObject(raw) ? raw : {};
    const out = {
      enabled: !!data.enabled,
      name:
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : DEFAULT_THEME.name,
      set_default: !!data.set_default,
      dark: {},
      light: {},
    };
    ["dark", "light"].forEach((mode) => {
      const values = isObject(data[mode]) ? data[mode] : {};
      THEME_VARIABLES.forEach((key) => {
        const value = values[key];
        out[mode][key] =
          typeof value === "number"
            ? String(value)
            : typeof value === "string"
              ? value
              : "";
      });
      Object.keys(THEME_EXTRAS).forEach((key) => {
        const value = values[key];
        if (typeof THEME_EXTRAS[key] === "boolean") {
          out[mode][key] = !!value;
        } else {
          out[mode][key] =
            typeof value === "number"
              ? String(value)
              : typeof value === "string"
                ? value
                : "";
        }
      });
    });
    return out;
  };

  const normalize = (raw) => {
    const data = isObject(raw) ? raw : {};
    const items = {};
    if (isObject(data.items)) {
      Object.keys(data.items).forEach((key) => {
        items[key] = section(itemDefaults(key), data.items[key]);
        if (isPopup(key)) {
          items[key].links = cleanPopupLinks(isObject(data.items[key]) ? data.items[key].links : null);
          cleanPopupCard(items[key]);
        }
      });
    }
    return {
      layout: section(DEFAULT_LAYOUT, data.layout),
      appearance: section(DEFAULT_APPEARANCE, data.appearance),
      advanced: section(DEFAULT_ADVANCED, data.advanced),
      // Die Links immer als eigene, frische Liste - nie die der Vorgaben.
      header: Object.assign(section(DEFAULT_HEADER, data.header), {
        links: cleanHeaderLinks(isObject(data.header) ? data.header.links : null, true),
      }),
      settings: Object.assign(section(DEFAULT_SETTINGS, data.settings), {
        menu_order: cleanPaths(isObject(data.settings) ? data.settings.menu_order : null),
        menu_hidden: cleanPaths(isObject(data.settings) ? data.settings.menu_hidden : null),
        favorites: cleanFavorites(isObject(data.settings) ? data.settings.favorites : null),
        favorites_place: placeOf(isObject(data.settings) ? data.settings.favorites_place : "", FAVORITES_PLACES),
        monitor_place: placeOf(isObject(data.settings) ? data.settings.monitor_place : "", MONITOR_PLACES),
        monitor_backup_place: placeOf(isObject(data.settings) ? data.settings.monitor_backup_place : "", MONITOR_PLACES),
        monitor_counts_place: placeOf(isObject(data.settings) ? data.settings.monitor_counts_place : "", MONITOR_PLACES),
        monitor_counts_items: isObject(data.settings) && Array.isArray(data.settings.monitor_counts_items)
          ? COUNT_ITEMS.filter((one) => data.settings.monitor_counts_items.indexOf(one) >= 0)
          : COUNT_ITEMS.slice(),
        menu_items: cleanMenuItems(isObject(data.settings) ? data.settings.menu_items : null),
        monitor_sensors: cleanSensors(isObject(data.settings) ? data.settings.monitor_sensors : null),
      }),
      theme: themeSection(data.theme),
      order: Array.isArray(data.order)
        ? data.order.filter((k) => typeof k === "string")
        : [],
      items: items,
    };
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  // Die beiden Haken fuer die mehrspaltige Liste, jeweils mit ihrem Gegenstueck.
  const LIST_COLUMN_PAIR = {
    "settings.list_two_columns": "settings.list_three_columns",
    "settings.list_three_columns": "settings.list_two_columns",
  };

  /**
   * Hintergrund aus einem Abschnitt: entweder der einfache Wert oder ein
   * Verlauf aus den zwei Farben und der Richtung. Gleiche Regel wie im
   * Injector (backgroundOf dort), damit Vorschau und Seitenleiste dasselbe
   * zeigen.
   */
  const backgroundOf = (look) => {
    const first = String((look && look.background) || "").trim();
    if (!first || !look.background_gradient) {
      return first;
    }
    const second = String(look.background_color2 || "").trim() || first;
    const direction = String(look.gradient_direction || "").trim() || "to bottom";
    return direction === "radial"
      ? `radial-gradient(circle at 50% 0%, ${first}, ${second})`
      : `linear-gradient(${direction}, ${first}, ${second})`;
  };

  /** Wie backgroundOf, aber mit Deckkraft - dasselbe wie im Injector. */
  const headerBackgroundOf = (head) => {
    const percent = Math.min(100, Math.max(0, Math.round(Number(head.background_opacity ?? 100))));
    if (!Number.isFinite(percent) || percent >= 100) {
      return backgroundOf(head);
    }
    const fade = (color) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
    const first =
      String(head.background || "").trim() ||
      "var(--app-header-background-color, #03a9f4)";
    if (!head.background_gradient) {
      return fade(first);
    }
    const second = String(head.background_color2 || "").trim() || first;
    const direction = String(head.gradient_direction || "").trim() || "to bottom";
    return direction === "radial"
      ? `radial-gradient(circle at 50% 0%, ${fade(first)}, ${fade(second)})`
      : `linear-gradient(${direction}, ${fade(first)}, ${fade(second)})`;
  };

  /* ------------------------------------------------------------------ *
   * Palette aus einer Hauptfarbe
   *
   * Reine Funktionen, ohne DOM. Alle Farben kommen als #rrggbb heraus: Home
   * Assistant leitet die rgb-* Variablen nur aus Hex-Werten ab, und ein Wert
   * mit Deckkraft haette keine.
   * ------------------------------------------------------------------ */
  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  const parseHex = (raw) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(raw || "").trim());
    if (!m) {
      return null;
    }
    let hex = m[1];
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  };

  const toHex = (rgb) =>
    "#" +
    rgb
      .map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0"))
      .join("");

  const rgbToHsl = ([r, g, b]) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) {
      return [0, 0, l];
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    return [h * 60, s, l];
  };

  const hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] =
      h < 60 ? [c, x, 0]
      : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c]
      : h < 300 ? [x, 0, c]
      : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };

  const fromHsl = (h, s, l) => toHex(hslToRgb(h, clamp01(s), clamp01(l)));

  /** Relative Helligkeit nach WCAG 2.x. */
  const luminance = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  /** Kontrastverhaeltnis zweier Hex-Farben (1 bis 21). */
  const contrastOf = (a, b) => {
    const la = luminance(parseHex(a));
    const lb = luminance(parseHex(b));
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /** t = 0 ergibt a, t = 1 ergibt b. */
  const mixHex = (a, b, t) => {
    const ra = parseHex(a);
    const rb = parseHex(b);
    return toHex(ra.map((v, i) => v + (rb[i] - v) * t));
  };

  // Saettigung der Hintergruende und Drehung der Akzentfarbe auf dem Farbkreis.
  const PALETTE_TINT = { neutral: 0.05, tint: 0.14, strong: 0.32 };
  const PALETTE_ACCENT = { same: 0, analogous: 30, complementary: 180, triad: 120 };

  /**
   * Aus einer Hauptfarbe die Farben fuer beide Modi ableiten.
   *
   * Die Hauptfarbe bleibt, wie sie ist, solange sie sich vom Hintergrund
   * abhebt (Kontrast mindestens 3:1); sonst wird nur ihre Helligkeit
   * verschoben, Farbton und Saettigung bleiben. Texte werden so gewaehlt, dass
   * sie lesbar sind: Haupttext gegen die Seite, zweiter Text gegen die Karte,
   * Schrift auf der Primaerfarbe schwarz oder weiss, je nachdem, was besser
   * absetzt. Fehler-, Warn-, Erfolgs- und Hinweisfarben, Rahmen, Schatten und
   * Schrift gehoeren nicht dazu.
   *
   * Gibt null zurueck, wenn die Eingabe keine Hex-Farbe ist.
   */
  const generatePalette = (mainColor, options) => {
    const rgb = parseHex(mainColor);
    if (!rgb) {
      return null;
    }
    const opt = options || {};
    const [hue, sat] = rgbToHsl(rgb);
    const main = toHex(rgb);
    const lightness = rgbToHsl(rgb)[2];
    // Ein Grau hat keinen Farbton, der sich zum Tonen lohnt.
    const bgSat = sat < 0.08 ? 0 : PALETTE_TINT[opt.tint] !== undefined ? PALETTE_TINT[opt.tint] : PALETTE_TINT.tint;
    const shift = PALETTE_ACCENT[opt.accent] || 0;

    const build = (dark) => {
      const page = fromHsl(hue, bgSat, dark ? 0.085 : 0.955);
      const second = fromHsl(hue, bgSat, dark ? 0.125 : 0.925);
      const card = fromHsl(hue, bgSat, dark ? 0.165 : 0.99);
      const textOf = (start, against, min) => {
        let l = start;
        let color = fromHsl(hue, bgSat * 0.6, l);
        for (let i = 0; i < 60 && contrastOf(color, against) < min; i += 1) {
          l = clamp01(l + (dark ? 0.01 : -0.01));
          color = fromHsl(hue, bgSat * 0.6, l);
        }
        return color;
      };
      const text = textOf(dark ? 0.93 : 0.12, page, 7);
      const text2 = textOf(dark ? 0.72 : 0.38, card, 4.5);
      const disabled = fromHsl(hue, bgSat * 0.6, dark ? 0.5 : 0.62);

      let pl = lightness;
      let primary = main;
      for (let i = 0; i < 50 && contrastOf(primary, page) < 3; i += 1) {
        pl = clamp01(pl + (dark ? 0.02 : -0.02));
        primary = fromHsl(hue, sat, pl);
      }
      const onPrimary =
        contrastOf(primary, "#ffffff") >= contrastOf(primary, "#111111") ? "#ffffff" : "#111111";

      let accent = primary;
      if (shift) {
        let al = dark ? 0.62 : 0.46;
        accent = fromHsl(hue + shift, Math.max(sat, 0.55), al);
        for (let i = 0; i < 50 && contrastOf(accent, page) < 3; i += 1) {
          al = clamp01(al + (dark ? 0.02 : -0.02));
          accent = fromHsl(hue + shift, Math.max(sat, 0.55), al);
        }
      }

      const divider = mixHex(card, text, dark ? 0.16 : 0.12);
      const outline = mixHex(card, text, 0.22);
      return {
        "primary-color": primary,
        "light-primary-color": fromHsl(hue, sat, Math.min(0.9, pl + 0.14)),
        "dark-primary-color": fromHsl(hue, sat, Math.max(0.1, pl - 0.14)),
        "accent-color": accent,
        "divider-color": divider,
        "outline-color": outline,
        "primary-background-color": page,
        "secondary-background-color": second,
        "card-background-color": card,
        "clear-background-color": page,
        "ha-card-background": card,
        "primary-text-color": text,
        "secondary-text-color": text2,
        "text-primary-color": onPrimary,
        "disabled-text-color": disabled,
        "app-header-background-color": primary,
        "app-header-text-color": onPrimary,
        "app-theme-color": primary,
        "state-icon-color": text2,
        "state-active-color": primary,
        "state-inactive-color": disabled,
        "state-unavailable-color": mixHex(disabled, page, 0.35),
        "input-fill-color": mixHex(card, text, 0.05),
        "input-ink-color": text,
        "input-idle-line-color": outline,
        "ha-dialog-surface-background": dark ? second : card,
        "markdown-code-background-color": mixHex(page, text, 0.08),
        "code-editor-background-color": dark ? mixHex(page, "#000000", 0.3) : mixHex(card, text, 0.04),
        "scrollbar-thumb-color": mixHex(card, text, 0.25),
        "table-row-background-color": card,
        "table-row-alternative-background-color": mixHex(card, text, 0.04),
        "data-table-background-color": card,
        "slider-color": primary,
        "slider-track-color": mixHex(card, text, 0.2),
        "label-badge-background-color": primary,
        "label-badge-text-color": onPrimary,
        "chip-background-color": second,
      };
    };
    return { dark: build(true), light: build(false) };
  };

  /* ------------------------------------------------------------------ *
   * Verlauf der Speicherstaende
   * ------------------------------------------------------------------ */

  /** JSON mit sortierten Schluesseln, damit gleiche Inhalte gleich aussehen. */
  const stableJson = (value) =>
    JSON.stringify(value, (key, val) =>
      val && typeof val === "object" && !Array.isArray(val)
        ? Object.keys(val).sort().reduce((sorted, k) => {
            sorted[k] = val[k];
            return sorted;
          }, {})
        : val
    );

  /**
   * Ein Stand ohne die beiden Schalter (Kopfzeile / Sidebar ausblenden).
   * Die gibt es auch als Entitaeten in Home Assistant und aendern sich, ohne
   * dass gespeichert wird - sie gehoeren nicht zum "Aussehen" eines Standes.
   */
  const withoutSwitches = (config) => {
    const copy = JSON.parse(JSON.stringify(config));
    copy.header.hidden = false;
    copy.layout.hide_sidebar = false;
    return copy;
  };

  const sameState = (a, b) => stableJson(withoutSwitches(a)) === stableJson(withoutSwitches(b));

  /** Wie viele Schluessel zweier Abschnitte sich unterscheiden. */
  const countDiff = (a, b, skip) => {
    a = a || {};
    b = b || {};
    const keys = new Set(Object.keys(a).concat(Object.keys(b)));
    let n = 0;
    keys.forEach((key) => {
      if ((skip || []).indexOf(key) < 0 && stableJson(a[key]) !== stableJson(b[key])) {
        n += 1;
      }
    });
    return n;
  };

  /**
   * Was sich zwischen zwei Staenden geaendert hat, nach den Bereichen der
   * Oberflaeche sortiert: [{ area: "header", n: 3 }, ...]. Nur Zaehlungen -
   * die Feldnamen des Speichers sind fuer niemanden ein Text zum Lesen.
   */
  const diffAreas = (before, after) => {
    const found = [];
    const add = (area, n, extra) => {
      if (n > 0 || extra) {
        found.push({ area, n, extra: extra || "" });
      }
    };
    add("layout",
      countDiff(before.layout, after.layout, ["hide_sidebar"]) + countDiff(before.advanced, after.advanced));
    const entriesChanged = countDiff(before.items, after.items);
    add("items", entriesChanged, stableJson(before.order) !== stableJson(after.order) ? "order" : "");
    add("look", countDiff(before.appearance, after.appearance));
    const bt = before.theme || {};
    const at = after.theme || {};
    const themeNames = countDiff(bt, at, ["dark", "light"]);
    const dark = countDiff(bt.dark, at.dark);
    const light = countDiff(bt.light, at.light);
    if (themeNames + dark + light > 0) {
      found.push({ area: "theme", n: themeNames + dark + light, dark, light, names: themeNames });
    }
    add("header", countDiff(before.header, after.header, ["hidden"]));
    add("settings", countDiff(before.settings, after.settings));
    return found;
  };

  const escapeHtml = (raw) =>
    String(raw === undefined || raw === null ? "" : raw).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );

  /**
   * Fonts for the dropdown. Only stacks every system brings along, so nothing
   * has to be downloaded and the sidebar never waits for a web font.
   */
  const FONTS = (t) => [
    ["", t.font_theme],
    ['system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', "System"],
    ["Roboto, Arial, sans-serif", "Roboto"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ['"Helvetica Neue", Helvetica, Arial, sans-serif', "Helvetica"],
    ["Verdana, Geneva, sans-serif", "Verdana"],
    ["Tahoma, Geneva, sans-serif", "Tahoma"],
    ['"Trebuchet MS", sans-serif', "Trebuchet MS"],
    ['Georgia, "Times New Roman", serif', "Georgia"],
    ['"Times New Roman", Times, serif', "Times New Roman"],
    ['"Courier New", ui-monospace, monospace', "Courier New"],
    ["ui-monospace, Menlo, Consolas, monospace", "Monospace"],
  ];

  /**
   * Shown greyed out in the "Additional CSS" box as long as it is empty.
   * It is only a placeholder - nothing of this is active.
   */
  const cssExample = (t) =>
    [
      `/* ${t.css_example_head} */`,
      "",
      `/* ${t.css_example_all} */`,
      "ha-list-item-button {",
      "  text-transform: uppercase;",
      "}",
      "",
      `/* ${t.css_example_one} */`,
      '[data-sh-key="panel:lovelace"] {',
      "  outline: 2px solid var(--accent-color);",
      "}",
      "",
      `/* ${t.css_example_user} */`,
      '[data-sh-key="profile"] ha-user-badge {',
      "  filter: grayscale(1);",
      "}",
      "",
      `/* ${t.css_example_expanded} */`,
      ":host([expanded]) .panels-list {",
      "  padding-top: 16px;",
      "}",
    ].join("\n");

  /**
   * Small button label: an mdi icon when ha-icon is available (it always is
   * inside Home Assistant), otherwise a plain character.
   */
  const glyph = (icon, fallback) =>
    customElements.get("ha-icon")
      ? `<ha-icon icon="${icon}"></ha-icon>`
      : fallback;

  /** A CSS color a <input type="color"> can show, or a neutral fallback. */
  /** Ein Wert fuer eine CSS-Variable: nur dieser eine Wert, keine weiteren Angaben. */
  const cssValue = (raw) => String(raw === undefined || raw === null ? "" : raw).replace(/[;{}<>]/g, "").trim();

  const asHexColor = (raw) => {
    const text = String(raw || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(text) ? text : "#888888";
  };

  /* ------------------------------------------------------------------ *
   * Styles
   * ------------------------------------------------------------------ */

  const PANEL_CSS = `
    .hpv { border: 1px solid var(--sh-line); border-radius: 10px; overflow: hidden;
      margin-bottom: 14px; }
    .hpv-bar {
      display: flex; align-items: center; gap: 10px; box-sizing: border-box;
      height: 56px; padding: 0 12px;
      background: var(--app-header-background-color, #03a9f4);
      color: var(--app-header-text-color, #fff);
      font-size: 20px;
    }
    .hpv-icon, .hpv-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
      font-size: 24px; line-height: 1; }
    .hpv-tabs { display: flex; align-items: center; gap: 14px; font-size: 13px; opacity: .85; }
    .hpv-tab { padding-bottom: 2px; border-bottom: 2px solid transparent; }
    .hpv-tab:hover { background: var(--tab-hover, transparent); }
    .hpv-own { display: inline-flex; --mdc-icon-size: 1em; }
    /* Die Links der Kopfzeile: eine Zeile je Link, wie die Eintragsliste. */
    .hlinks-head { margin-top: 18px; }
    .hlinks-head h3 { flex: 1; min-width: 0; margin: 0; }
    .hlinks-head + .hint { margin: 6px 0 10px; font-size: 13px; color: var(--sh-muted); }
    .hlinks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .hlinks li.empty { font-size: 13px; color: var(--sh-muted); }
    .hlinks li.hlink {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      border: 1px solid var(--sh-line); border-radius: 10px; padding: 8px 10px;
    }
    .hlinks .row-icon { flex: 0 0 auto; display: inline-flex; width: 24px; justify-content: center; }
    .hlinks .row-title { flex: 1 1 140px; min-width: 0; display: flex; flex-direction: column; }
    .hlinks .row-title small { color: var(--sh-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hlinks input[type="text"] { flex: 1 1 110px; min-width: 0; }
    .hlinks .color-field { flex: 1 1 150px; min-width: 0; }
    .hlinks .color-field input[type="text"] { flex: 1 1 60px; }
    .hlinks ha-icon-picker { flex: 1 1 150px; min-width: 0; }
    .hpv-tab[data-on] { border-bottom-color: currentColor; opacity: 1; }
    /* Favoriten: Hauptzeile wie die Links der Kopfzeile, darunter zum
       Aufklappen das Aussehen (wie bei den Zwischenueberschriften). */
    .hlinks li.hlink.fav { display: block; padding: 6px 10px; }
    .fav-main { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .fav-extra { display: none; padding: 10px 0 4px 32px; }
    .hlinks li.hlink.fav[data-open] .fav-extra { display: block; }
    .fav-colors { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 10px; }
    .fav-extra .color-field { display: flex; }
    .fav-extra ha-icon-picker { display: block; width: 100%; --text-field-padding: 0 8px; }
    .fav-extra input[type="number"] { width: 100%; box-sizing: border-box; }
    .fav-extra .head-block label.check { margin: 10px 0 0; font-size: 13px; }
    @media (max-width: 600px) {
      .fav-colors { grid-template-columns: minmax(0, 1fr); }
      .fav-extra { padding-left: 0; }
    }
    /* Vorschau des Systemmonitors - ein Modell mit festen Werten, im Stil
       der Karten von Home Assistant. */
    .mpv {
      margin-top: 14px; overflow: hidden; container-type: inline-size;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      border: 1px solid var(--sh-line); border-radius: 12px;
    }
    .mpv[data-off] { opacity: .45; }
    .mpv-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .mpv-cell {
      --c: var(--primary-color, #03a9f4); display: flex; flex-direction: column; gap: 2px;
      min-width: 0; padding: 12px 14px 14px; border-inline-start: 1px solid var(--sh-line);
    }
    .mpv-cell:first-child { border-inline-start: 0; }
    .mpv-cell[data-level="warn"] { --c: var(--warning-color, #ffa600); }
    .mpv-label { font-size: 11px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--sh-muted); }
    .mpv-value { font-size: 24px; line-height: 1.15; font-variant-numeric: tabular-nums; }
    .mpv-cell[data-level] .mpv-value { color: var(--c); }
    .mpv-unit { font-size: 13px; margin-inline-start: 3px; color: var(--sh-muted); }
    .mpv-sub { font-size: 11px; color: var(--sh-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mpv-viz { display: none; height: 34px; margin-top: 8px; flex-direction: column; justify-content: flex-end; }
    .mpv[data-graphs] .mpv-viz { display: flex; }
    .mpv-viz svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .mpv-area { fill: var(--c); opacity: .14; }
    .mpv-line { fill: none; stroke: var(--c); stroke-width: 1.5px; vector-effect: non-scaling-stroke; }
    .mpv-scale { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 5px;
      font-size: 10px; color: var(--sh-muted); white-space: nowrap; }
    .mpv-bar { display: block; height: 7px; border-radius: 4px; overflow: hidden;
      background: color-mix(in srgb, currentColor 12%, transparent); }
    .mpv-bar span { display: block; height: 100%; width: 87%; background: var(--c); border-radius: inherit; }
    .mpv-backup { margin-top: 10px; }
    .mpv-backup .mpv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .mpv-text { display: block; font-size: 14px; line-height: 1.3; padding-top: 6px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @container (max-width: 599px) {
      .mpv-backup .mpv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .mpv-backup .mpv-cell:nth-child(3) { border-inline-start: 0; }
      .mpv-backup .mpv-cell:nth-child(n + 3) { border-top: 1px solid var(--sh-line); }
    }
    @container (max-width: 459px) {
      .mpv-grid, .mpv-backup .mpv-grid { grid-template-columns: minmax(0, 1fr); }
      .mpv-cell { border-inline-start: 0; border-top: 1px solid var(--sh-line); }
      .mpv-cell:first-child { border-top: 0; }
    }
    .hpv-title { flex: 1 1 auto; min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; }
    .hpv-body {
      padding: 12px; display: grid; gap: 10px; grid-template-columns: 1fr 1fr;
      background: var(--primary-background-color, #111);
    }
    .hpv-card {
      height: 46px; border-radius: var(--ha-card-border-radius, 12px);
      background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
      border: 1px solid var(--ha-card-border-color, transparent);
    }
    /* Vorschau der Menuepunkte: Groesse, Farben und Eckenradius kommen als
       Variablen aus _updateSettingsPreview(). */
    .spv-row { display: flex; align-items: center; gap: 14px; padding: 8px 4px; }
    .spv-row + .spv-row { border-top: 1px solid var(--sh-line); }
    .spv[data-tiles] .spv-row { flex-direction: column; justify-content: center; text-align: center; gap: 6px; }
    .spv[data-tiles] .spv-text small { display: none; }
    /* Die Menuepunkte der Einstellungsseite zum Sortieren und Ausblenden. */
    .mlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .mlist li.mgroup {
      margin-top: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em;
      color: var(--sh-muted);
    }
    .mlist li.mentry {
      display: flex; align-items: center; gap: 8px;
      border: 1px solid var(--sh-line); border-radius: 10px; padding: 6px 10px;
    }
    .mlist li.mentry[data-hidden] .row-title { opacity: .45; }
    .mlist .row-title { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
    .mlist .row-title small { color: var(--sh-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tpv-row[data-even] { background: var(--tz, none); }
    .tpv-row:hover { background-image: var(--th, none); }
    .spv-row:hover { background-image: var(--mh, none); }
    .spv[data-frame] .spv-row {
      border: 1px solid var(--mbc, var(--sh-line)); border-width: var(--mbw, 0px);
      border-radius: var(--mbr, 0px); padding-inline: 8px;
    }
    .spv-icon {
      width: var(--box, 40px); height: var(--box, 40px); flex: 0 0 auto;
      box-sizing: border-box; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg, var(--c, #1e88e5)); color: var(--fg, #fff);
      font-size: var(--ico, 24px); line-height: 1;
    }
    .spv-icon ha-icon { --mdc-icon-size: var(--ico, 24px); }
    .spv[data-box] .spv-icon { border-radius: var(--r, 12px); }
    .spv-text { display: flex; flex-direction: column; min-width: 0; }
    .spv-text small { color: var(--sh-muted); }
    /* Vorschau der Geraete-&-Dienste-Seite: Raster oder Liste. */
    .lpv {
      display: grid; gap: 8px; margin-top: 14px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .lpv-card {
      display: grid; gap: 2px 8px; align-items: center; box-sizing: border-box;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-areas: "logo name" "meta meta";
      border: 1px solid var(--sh-line); border-radius: 10px; padding: 10px;
      min-height: 64px;
    }
    .lpv-logo { grid-area: logo; width: 22px; height: 22px; border-radius: 6px;
      background: var(--c, #888); }
    .lpv-name { grid-area: name; font-size: 13px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; }
    .lpv-meta { grid-area: meta; font-size: 12px; color: var(--primary-color, #03a9f4); }
    .lpv[data-list] {
      grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); gap: var(--gap, 6px);
      max-width: var(--maxw, none); margin-inline: auto;
    }
    .lpv[data-list] .lpv-card {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: "logo name meta";
      height: var(--row, 40px); min-height: 0; padding-block: 0;
      border-width: var(--bw, 1px); border-radius: var(--br, 10px);
      border-color: var(--bc, var(--sh-line));
      background: var(--rbg, none);
    }
    .lpv[data-list] .lpv-card:hover { background-image: var(--hv, none); }
    /* Vorschau der Tabellen mit Gruppenkoepfen. Ohne eigene Werte so, wie
       Home Assistant sie zeichnet: Seitenhintergrund, Schrift Medium. */
    .tpv {
      margin-top: 14px; border: 1px solid var(--sh-line); border-radius: 10px;
      overflow: hidden; font-size: var(--ts, 13px);
    }
    .tpv-head, .tpv-row, .tpv-group {
      display: flex; align-items: center; min-height: 36px; padding: 0 12px;
    }
    .tpv-head { color: var(--sh-muted); border-bottom: 1px solid var(--sh-line); }
    .tpv-head span, .tpv-row span { flex: 1 1 0; min-width: 0; }
    .tpv-row { border-bottom: 1px solid var(--sh-line); }
    .tpv-group {
      gap: 6px; cursor: default;
      background: var(--tg-bg, var(--primary-background-color, #fafafa));
      color: var(--tg-fg, inherit);
      font-size: var(--tg-size, 13px);
      font-weight: var(--tg-weight, 500);
      border-bottom: 1px solid var(--sh-line);
    }
    .lpv-problem { border-color: var(--error-color, #db4437); }
    .lpv[data-list] .lpv-problem { border-color: var(--ec, var(--error-color, #db4437)); }
    .head-block label.check { margin: 10px 0 0; font-size: 13px; }
    .head-block label.check input { width: 16px; height: 16px; }

    /* ---------------------------------------------------- theme page */
    .var-name {
      display: block; font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 10px; color: var(--sh-muted); opacity: .75; margin-top: 3px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* only the fields of the mode being edited are visible */
    .theme-mode[hidden] { display: none !important; }
    .dash-image { display: flex; align-items: center; gap: 14px; margin: 6px 0 10px; }
    .dash-thumb {
      flex: none; width: 112px; height: 70px; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--divider-color, rgba(128,128,128,.4));
      background: repeating-conic-gradient(rgba(128,128,128,.25) 0% 25%, transparent 0% 50%) 0 0 / 14px 14px;
    }
    .dash-thumb i { display: block; width: 100%; height: 100%; background: center / cover no-repeat; }
    .dash-file { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .dash-file small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .8; }

    /* ------------------------------------------------------- preview */
    /* Deliberately built by hand instead of with real Home Assistant cards:
       the preview has to show unsaved values, and a real card would follow
       the theme that is currently active, not the one being edited. */
    .preview {
      display: grid; gap: 16px; align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      /* Basisgroesse wie in Home Assistant: 14px mal Skalierung. Alles
         darunter rechnet in em, damit die Skalierung wirklich alles mitnimmt
         und nicht nur die Schriftart wirkt. */
      font-size: calc(14px * var(--ha-font-size-scale, 1));
      font-weight: var(--ha-font-weight-body, 400);
    }
    .pv-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; font-size: 1em; font-weight: 500;
      background: var(--app-header-background-color, var(--card-background-color));
      color: var(--app-header-text-color, var(--primary-text-color));
      border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color));
    }
    .pv-header .grow { flex: 1; }
    .pv-header .thin { opacity: .7; font-weight: 400; }
    .pv-card {
      background: var(--ha-card-background, var(--card-background-color));
      border-radius: var(--ha-card-border-radius, 12px);
      /* Einzeln und nicht als border-Kurzform: die Kurzform nimmt nur EINE
         Breite an, "0px 2px 2px 0px" waere dort ungueltig. Home Assistant
         schreibt es in ha-card.ts aus demselben Grund genauso. */
      border-style: solid;
      border-width: var(--ha-card-border-width, 1px);
      border-color: var(--ha-card-border-color, var(--divider-color));
      box-shadow: var(--ha-card-box-shadow, none);
      padding: 12px 14px;
    }
    .pv-card-head {
      font-size: var(--ha-card-header-font-size, 1.15em);
      font-weight: 400; margin-bottom: 8px;
      color: var(--ha-card-header-color, var(--primary-text-color));
    }
    .pv-row {
      display: flex; align-items: center; gap: 10px; padding: 7px 0;
      font-size: 0.93em;
    }
    .pv-ico {
      width: 28px; height: 28px; flex: 0 0 auto; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: var(--state-icon-color); font-size: 1em; overflow: hidden;
    }
    .pv-ico ha-icon { --mdc-icon-size: 20px; }
    .pv-ico[data-on] { color: var(--state-active-color); }
    .pv-ico[data-off] { color: var(--state-inactive-color); }
    .pv-ico[data-na] { color: var(--state-unavailable-color); }
    .pv-name { flex: 1; min-width: 0; }
    .pv-name small {
      display: block; font-size: 0.79em; color: var(--secondary-text-color);
    }
    .pv-badge {
      min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.79em; font-weight: 500;
      background: var(--label-badge-background-color, var(--card-background-color));
      color: var(--label-badge-text-color, var(--primary-text-color));
      border: 1px solid var(--divider-color);
    }
    .pv-track {
      display: block; height: 6px; border-radius: 3px;
      background: var(--slider-track-color, var(--scrollbar-thumb-color));
    }
    .pv-track i {
      display: block; width: 60%; height: 100%; border-radius: 3px;
      background: var(--slider-color, var(--primary-color));
    }
    .pv-chip {
      padding: 5px 12px; border-radius: 16px; font-size: 0.86em;
      background: var(--chip-background-color);
      color: var(--primary-text-color);
    }
    /* Dashboard-Hintergrund: gilt fuer die Ansicht, nicht fuer die Karte. */
    /* Zustandsfarben nach Typ. Der Rueckfall ist die Standardfarbe von Home
       Assistant (aus dem Frontend), nicht die von "Icon, aktiv". */
    .pv-st {
      width: 30px; height: 30px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center;
      background: color-mix(in srgb, currentColor 16%, var(--card-background-color));
    }
    .pv-st ha-icon { --mdc-icon-size: 18px; }
    .pv-st[data-s="light"] { color: var(--state-light-active-color, #ffc107); }
    .pv-st[data-s="switch"] { color: var(--state-switch-active-color, #ffc107); }
    .pv-st[data-s="fan"] { color: var(--state-fan-active-color, #00bcd4); }
    .pv-st[data-s="media"] { color: var(--state-media_player-active-color, #03a9f4); }
    .pv-st[data-s="cover"] { color: var(--state-cover-active-color, #926bc7); }
    .pv-st[data-s="heat"] { color: var(--state-climate-heat-color, #ff6f22); }
    .pv-st[data-s="cool"] { color: var(--state-climate-cool-color, #2196f3); }
    .pv-st[data-s="locked"] { color: var(--state-lock-locked-color, #4caf50); }
    .pv-st[data-s="unlocked"] { color: var(--state-lock-unlocked-color, #f44336); }
    .pv-st[data-s="armed"] { color: var(--state-alarm_control_panel-armed_home-color, #4caf50); }
    .pv-st[data-s="triggered"] { color: var(--state-alarm_control_panel-triggered-color, #f44336); }
    .pv-st[data-s="person"] { color: var(--state-person-home-color, #4caf50); }
    .pv-input {
      margin-top: 10px; padding: 9px 12px; font-size: 0.86em;
      border-radius: 8px;
      background: var(--input-fill-color);
      color: var(--input-ink-color);
      border-bottom: 1px solid var(--input-idle-line-color);
    }
    .pv-table {
      margin-top: 12px; border-radius: 8px; overflow: hidden;
      background: var(--data-table-background-color, var(--card-background-color));
      font-size: 0.86em;
    }
    .pv-tr {
      display: flex; gap: 8px; padding: 8px 10px;
      background: var(--table-row-background-color);
      color: var(--primary-text-color);
    }
    .pv-tr[data-alt] { background: var(--table-row-alternative-background-color); }
    .pv-tr span:last-child { margin-left: auto; color: var(--secondary-text-color); }
    .pv-scroll {
      margin-top: 12px; height: 6px; border-radius: 3px;
      background: var(--divider-color);
    }

    /* Dialog und Code. Die Rueckfallketten sind dieselben wie in Home
       Assistant: die Dialogflaeche faellt auf den Kartenhintergrund zurueck
       (ha-dialog.ts), der Code-Editor ebenso, Markdown-Code auf den
       Seitenhintergrund (color.globals.ts). */
    .pv-scrim {
      padding: 14px 12px;
      /* HA setzt von Haus aus keine Scrim-Farbe, sondern verdunkelt mit
         brightness(68 %). Ein Schwarz mit 32 % kommt dem sehr nahe und zeigt
         sofort, sobald eine eigene Farbe gesetzt wird. */
      background: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, .32));
    }
    .pv-dialog {
      border-radius: 14px; overflow: hidden;
      background: var(--ha-dialog-surface-background, var(--card-background-color));
      color: var(--primary-text-color);
      box-shadow: 0 6px 18px rgba(0, 0, 0, .35);
    }
    .pv-dialog-actions {
      display: flex; align-items: center; justify-content: flex-end; gap: 8px;
      padding: 8px 12px 10px; border-top: 1px solid var(--divider-color);
    }
    .pv-text-btn {
      padding: 6px 10px; border-radius: 8px; font-size: 0.86em; font-weight: 500;
      color: var(--primary-color);
    }
    .pv-code {
      padding: 1px 5px; border-radius: 4px;
      font-family: var(--ha-font-family-code, ui-monospace, Menlo, monospace);
      font-size: 0.95em;
      background: var(--markdown-code-background-color, var(--primary-background-color));
    }
    .pv-editor {
      margin-top: 6px; padding: 8px 10px; border-radius: 8px;
      font-family: var(--ha-font-family-code, ui-monospace, Menlo, monospace);
      font-size: 0.79em; line-height: 1.5;
      background: var(--code-editor-background-color, var(--card-background-color));
      border: 1px solid var(--divider-color);
    }
    .pv-editor span { display: block; white-space: nowrap; overflow: hidden; }
    .pv-editor .pv-scroll { margin-top: 8px; }
    .pv-scroll i {
      display: block; width: 35%; height: 100%; border-radius: 3px;
      background: var(--scrollbar-thumb-color);
    }

    /* ================================================================ *
     * Buehnen-Layout (1.4.0)
     *
     * Oben die Kopfleiste mit den vier Bereichen, darunter je Seite links
     * ein nachgebautes Home Assistant ("Buehne"), in dem man anklickt, was
     * man aendern will, rechts eine feste Spalte mit den Feldern. Alle
     * Farben der Oberflaeche kommen aus dem aktiven Theme von Home
     * Assistant; das Vorschaubild zeigt die Werte, die bearbeitet werden.
     * Die Breite des Panels (nicht die des Fensters) entscheidet ueber PC,
     * Tablet und Handy - :host ist dafuer der Container.
     * ================================================================ */
    :host {
      display: block;
      /* Feste Hoehe: das Fenster. Gibt Home Assistant eine eigene Hoehe vor,
         gilt die (max-height). So waechst das Vorschaubild nicht mit der
         Feldspalte - die scrollt in sich. */
      height: 100vh;
      height: 100dvh;
      max-height: 100%;
      container-type: inline-size;
      background: var(--primary-background-color, #f5f5f5);
      color: var(--primary-text-color, #212121);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      font-size: 14px;
      line-height: 1.35;
      --sh-bg: var(--primary-background-color, #f5f5f5);
      --sh-card: var(--card-background-color, #fff);
      --sh-text: var(--primary-text-color, #212121);
      --sh-muted: var(--secondary-text-color, #727272);
      --sh-line: var(--divider-color, rgba(0, 0, 0, .12));
      --sh-line-strong: color-mix(in srgb, var(--sh-text) 22%, transparent);
      --sh-accent: var(--primary-color, #03a9f4);
      --sh-on-accent: var(--text-primary-color, #fff);
      --sh-accent-soft: color-mix(in srgb, var(--sh-accent) 14%, transparent);
      /* Um das Vorschaubild herum der Seitenhintergrund von Home Assistant */
      --sh-page: var(--sh-bg);
      --sh-ink: var(--sh-text);
      --sh-paper: var(--sh-card);
      --sh-row: color-mix(in srgb, var(--sh-text) 4%, var(--sh-card));
      --sh-row-hover: color-mix(in srgb, var(--sh-text) 7%, var(--sh-card));
      --sh-sel: color-mix(in srgb, var(--sh-text) 9%, var(--sh-card));
      --sh-field: var(--input-fill-color, var(--sh-card));
      --sh-seg: color-mix(in srgb, var(--sh-text) 7%, var(--sh-card));
      --sh-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sh-warn: var(--warning-color, #ff9800);
      --sh-err: var(--error-color, #db4437);
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button { font: inherit; color: inherit; }
    .mono { font-family: var(--sh-mono); }
    .grow { flex: 1; }

    .app {
      display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative;
      background: var(--sh-page);
    }

    /* ---------------------------------------------------- Kopfleiste */
    .topbar {
      flex: 0 0 auto; min-height: 60px; display: flex; align-items: center; gap: 10px;
      padding: 8px 20px; background: var(--sh-card); border-bottom: 1px solid var(--sh-line);
      position: relative; z-index: 20;
    }
    .brand { display: flex; align-items: center; gap: 8px; margin-right: 8px; min-width: 0; }
    .brand .logo { width: 26px; height: 26px; object-fit: contain; flex: 0 0 auto; }
    .brand-name { font-weight: 800; font-size: 19px; letter-spacing: -0.01em; white-space: nowrap; }
    .brand-short { display: none; font-weight: 800; font-size: 17px; line-height: 1.1; }
    nav.areas { display: flex; gap: 2px; }
    nav.areas.top { padding: 4px; border-radius: 10px; background: var(--sh-seg); }
    nav.areas button {
      position: relative; height: 34px; padding: 0 14px; border: 0; border-radius: 7px; background: transparent;
      cursor: pointer; white-space: nowrap; color: var(--sh-muted); font-size: 15px; font-weight: 500;
    }
    nav.areas button:hover { color: var(--sh-text); }
    nav.areas button[data-active] { background: var(--sh-ink); color: var(--sh-paper); font-weight: 700; }
    .area-count {
      position: absolute; top: 2px; right: 3px; font-family: var(--sh-mono); font-size: 10px; line-height: 1;
      color: var(--sh-accent); font-weight: 600;
    }
    nav.areas button[data-active] .area-count { color: inherit; opacity: .8; }
    .area-count:empty { display: none; }
    .search {
      display: flex; align-items: center; gap: 8px; height: 38px; width: 230px; padding: 0 12px;
      border: 1px solid var(--sh-line-strong); border-radius: 8px; background: var(--sh-field);
      color: var(--sh-muted); cursor: text; flex: 0 1 auto; min-width: 0;
    }
    .search ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; }
    .search input {
      flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; padding: 0;
      color: var(--sh-text); font: inherit; height: 100%;
    }
    .search input::-webkit-search-cancel-button { display: none; }
    .search:focus-within { border-color: var(--sh-accent); }
    .search-results {
      position: absolute; left: 12px; top: 60px; width: 380px; max-height: 60vh; overflow: auto;
      z-index: 65; background: var(--sh-card); border: 1px solid var(--sh-line-strong);
      border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, .35); padding: 6px;
    }
    .search-results button {
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%;
      border: 0; background: transparent; text-align: left; padding: 8px 10px;
      border-radius: 7px; cursor: pointer;
    }
    .search-results button small { color: var(--sh-muted); font-size: 12px; }
    .search-results button[data-active], .search-results button:hover { background: var(--sh-sel); }
    .search-results .empty { padding: 10px; color: var(--sh-muted); font-size: 13px; }
    .changes {
      font-family: var(--sh-mono); font-size: 12px; color: var(--sh-accent); white-space: nowrap;
    }
    .changes[data-clean] { color: var(--sh-muted); font-family: inherit; font-size: 13px; }
    .changes .short { display: none; }
    .state { font-size: 13px; color: var(--sh-muted); white-space: nowrap; min-width: 0; max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
    .state:empty { display: none; }
    .state.warn { color: var(--sh-err); }
    .state:not(:empty) ~ .changes { display: none; }
    .tb-sep { width: 1px; height: 26px; background: var(--sh-line-strong); margin: 0 4px; }
    .tb-icon {
      width: 36px; height: 36px; border: 1px solid var(--sh-line-strong); border-radius: 8px;
      background: transparent; display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; padding: 0; flex: 0 0 auto; color: var(--sh-text);
    }
    .tb-icon ha-icon { --mdc-icon-size: 20px; display: block; }
    .tb-icon:hover { background: var(--sh-row-hover); }
    .tb-icon[data-active] { background: var(--sh-ink); color: var(--sh-paper); border-color: var(--sh-ink); }
    [data-search-icon] { display: none; }
    .menu-button { margin-right: 4px; }

    /* ---------------------------------------------------- Knoepfe */
    .btn {
      height: 38px; padding: 0 14px; border: 1px solid var(--sh-line-strong); border-radius: 8px;
      background: transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
      white-space: nowrap; color: var(--sh-text); font-size: 15px;
    }
    .btn:hover { background: var(--sh-row-hover); }
    .btn.primary { border-color: var(--sh-accent); background: var(--sh-accent); color: var(--sh-on-accent); font-weight: 700; padding: 0 18px; }
    .btn.primary:hover { filter: brightness(1.06); }
    .app[data-clean] .btn.primary[data-action="save"] {
      background: var(--sh-seg); border-color: var(--sh-line); color: var(--sh-muted);
    }
    .btn:disabled { opacity: .5; cursor: default; }
    .btn ha-icon { --mdc-icon-size: 18px; display: block; }
    .btn.sm { height: 32px; padding: 0 12px; font-size: 13px; }
    .btn.wide { width: 100%; justify-content: center; }
    .btn.danger { color: var(--sh-warn); border-color: color-mix(in srgb, var(--sh-warn) 60%, transparent); }
    .link-btn {
      border: 0; background: transparent; padding: 0 4px; cursor: pointer; color: var(--sh-muted);
      text-decoration: underline; text-underline-offset: 3px; height: 30px; font-size: 14px;
    }
    .link-btn:hover { color: var(--sh-text); }
    .link-btn.accent { color: var(--sh-accent); }
    button.primary, button.flat {
      height: 40px; padding: 0 18px; border-radius: 8px; font-size: 15px; font-weight: 700;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      white-space: nowrap;
    }
    button.primary { border: 0; background: var(--sh-accent); color: var(--sh-on-accent); }
    button.primary:hover { filter: brightness(1.06); }
    button.flat { border: 1px solid var(--sh-line-strong); background: transparent; color: var(--sh-text); font-weight: 500; }
    button.flat:hover { background: var(--sh-row-hover); }
    button.primary:disabled, button.flat:disabled { opacity: .5; cursor: default; }
    .warn { color: var(--sh-err); }
    .icon-btn {
      border: 1px solid var(--sh-line-strong); background: transparent; color: inherit;
      width: 30px; height: 30px; border-radius: 7px; cursor: pointer; flex: 0 0 auto; padding: 0;
      font-size: 13px; line-height: 1; display: inline-flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: var(--sh-row-hover); }
    .icon-btn[data-on] { background: var(--sh-accent); color: var(--sh-on-accent); border-color: transparent; }
    .icon-btn:disabled { opacity: .35; cursor: default; }
    .icon-btn.warn { color: var(--sh-err); }
    .icon-btn ha-icon, .handle ha-icon { --mdc-icon-size: 17px; display: block; }
    .badge-ext {
      font-family: var(--sh-mono); font-size: 11px; padding: 1px 6px; border-radius: 5px;
      border: 1px solid var(--sh-line-strong); color: var(--sh-muted); font-weight: 400; white-space: nowrap;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sh-accent); flex: 0 0 auto; display: inline-block; }
    .dot[hidden] { display: none !important; }

    /* Segmentierte Auswahl. .seg (Werte): Akzentfarbe. .seg.inline (Umschalter
       unter dem Vorschaubild): dunkel gefuellt. Unterseiten und Einfach/Alle:
       erhabene Flaeche. */
    .seg-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .seg {
      display: flex; gap: 2px; padding: 3px; border-radius: 9px; background: var(--sh-seg);
    }
    .seg button {
      flex: 1; min-width: 0; height: 34px; border: 0; border-radius: 7px; background: transparent;
      cursor: pointer; padding: 0 10px; white-space: nowrap; color: var(--sh-text); font-size: 14px;
      overflow: hidden; text-overflow: ellipsis;
    }
    .seg button:hover { background: var(--sh-row-hover); }
    .seg button[data-active] { background: var(--sh-accent); color: var(--sh-on-accent); font-weight: 700; }
    .seg.inline { display: inline-flex; background: var(--sh-card); border: 1px solid var(--sh-line); }
    .seg.inline button { flex: 0 0 auto; padding: 0 12px; color: var(--sh-muted); }
    .seg.inline button[data-active] { background: var(--sh-ink); color: var(--sh-paper); }
    .seg.subtabs, .seg[data-view] { background: var(--sh-seg); border: 0; }
    .seg.subtabs button, .seg[data-view] button { color: var(--sh-muted); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .seg.subtabs button[data-active], .seg[data-view] button[data-active] {
      background: var(--sh-card); color: var(--sh-text); box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
    }
    .seg.subtabs { width: 100%; }
    .seg.subtabs button { flex: 1; height: 36px; }
    .seg.subtabs[data-panes] button { flex: 1 1 auto; padding: 0 8px; white-space: nowrap; font-size: 13px; }
    .seg.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }

    /* ---------------------------------------------------- Seiten */
    main { flex: 1; min-height: 0; overflow: hidden; position: relative; }
    .page { display: none; }
    .stage-page[data-active] {
      display: grid; grid-template-columns: minmax(0, 1fr) 438px; height: 100%; min-height: 0;
    }
    .doc-page[data-active] { display: block; height: 100%; overflow: auto; }
    .stage-col {
      display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: auto;
      padding: 22px 28px 14px;
    }
    .stage-head { display: flex; align-items: baseline; gap: 6px 14px; flex-wrap: wrap; margin-bottom: 16px; }
    .stage-title { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
    .stage-hint { color: var(--sh-muted); font-size: 14px; }
    /* Die Buehne fuellt, was die Hoehe hergibt - ihr Inhalt scrollt darin,
       sie waechst nicht mit (sonst rutschen die Schalter darunter aus dem Bild). */
    .stage-frame { flex: 1 1 0; min-height: 300px; display: flex; min-width: 0; }
    .stage-foot { display: flex; align-items: center; gap: 10px 16px; padding-top: 14px; flex-wrap: wrap; }
    .stage-note { font-size: 13px; color: var(--sh-muted); line-height: 1.4; flex: 1 1 260px; min-width: 0; }
    .before-check { display: inline-flex; align-items: center; gap: 8px; color: var(--sh-muted); cursor: pointer; white-space: nowrap; }
    .before-check input { width: 18px; height: 18px; margin: 0; accent-color: var(--sh-accent); }

    /* ---------------------------------------------------- Buehne */
    .stage {
      flex: 1; min-width: 0; display: flex; position: relative; overflow: hidden; border-radius: 14px;
      border: 1px solid var(--sh-line); box-shadow: 0 12px 32px rgba(0, 0, 0, .18);
    }
    .ha-mock {
      background: var(--primary-background-color); color: var(--primary-text-color);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    }
    .stage[data-before]::after {
      content: attr(data-before-label); position: absolute; top: 10px; right: 10px; z-index: 6;
      padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700;
      background: var(--sh-ink); color: var(--sh-paper); pointer-events: none;
    }
    .hm-side { flex: 0 0 auto; max-width: 46%; position: relative; display: flex; min-height: 0; cursor: pointer; }
    .hm-side .sbp-host { display: flex; min-height: 0; max-width: 100%; }
    .hm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; min-height: 0; }
    .hm-dim > :not(.goto) { opacity: .55; transition: opacity .15s; }
    .hm-dim:hover > :not(.goto) { opacity: .85; }
    .hm-sketch > .hpv-goto { z-index: 2; }
    .hm-bar {
      flex: 0 0 auto; height: 56px; display: flex; align-items: center; gap: 22px; padding: 0 18px;
      background: var(--app-header-background-color, var(--primary-background-color));
      color: var(--app-header-text-color, var(--primary-text-color)); font-size: 15px;
      border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color));
    }
    .hm-bar strong { font-size: 18px; font-weight: 600; }
    .hm-tab { opacity: .75; padding-bottom: 3px; border-bottom: 2px solid transparent; }
    .hm-tab[data-on] { opacity: 1; border-bottom-color: currentColor; }
    .goto {
      display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 12px; border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--primary-text-color) 45%, transparent);
      background: color-mix(in srgb, var(--primary-background-color) 80%, transparent);
      color: var(--primary-text-color); font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .goto:hover { border-color: var(--sh-accent); }
    .stage [data-spot], .stage [data-zone], .stage [data-goto-zone], .stage .sbp-it, .stage .sbp-hd { cursor: pointer; }
    .stage [tabindex]:focus-visible, li.item:focus-visible { outline: 2px solid var(--sh-accent); outline-offset: 2px; }
    .stage [data-spot]:hover:not([data-sel]),
    .stage .hpv-zone:hover {
      outline: 1px dashed color-mix(in srgb, var(--sh-accent) 70%, transparent); outline-offset: 2px;
    }
    .stage [data-sel] { outline: 2px solid var(--sh-accent); outline-offset: 2px; position: relative; }
    .stage [data-sel][data-tag]::before {
      content: attr(data-tag); position: absolute; left: 6px; top: -12px; z-index: 4; pointer-events: none;
      font: 700 11px/1 var(--ha-font-family-body, Roboto, system-ui, sans-serif); letter-spacing: 0;
      padding: 4px 7px; border-radius: 6px; background: var(--sh-accent); color: var(--sh-on-accent);
      white-space: nowrap; text-transform: none;
    }

    /* Seitenleiste im Vorschaubild */
    .sbp {
      width: var(--w, 256px); max-width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden;
      background: var(--sbp-bg, var(--sidebar-background-color, var(--card-background-color, var(--sh-card))));
      color: var(--sbp-text, var(--sidebar-text-color, var(--primary-text-color, var(--sh-text))));
      border-right: var(--sbp-bw, 0px) solid var(--sbp-bc, var(--divider-color, var(--sh-line)));
      font-family: var(--sbp-font, inherit); display: flex; flex-direction: column; scrollbar-width: thin;
    }
    .sbp-head {
      display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 16px; flex: 0 0 auto;
      font-weight: 700; font-size: 15px; background: var(--sbp-head-bg, var(--sidebar-menu-button-background-color, transparent));
      color: var(--sbp-title, var(--sidebar-menu-button-text-color, inherit));
    }
    /* Eingeklappt: das Menue-Symbol mittig, wie der Injector es setzt */
    .sbp[data-closed] .sbp-head { justify-content: center; padding: 0; }
    .sbp-head ha-icon { --mdc-icon-size: 22px; color: var(--sbp-icon, var(--sidebar-icon-color, var(--secondary-text-color))); }
    .sbp-head span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sbp-grid, .sbp-fixed {
      display: grid; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
      gap: var(--gap, 6px); padding: var(--pad, 6px); align-content: start;
    }
    .sbp-fixed { border-top: 1px solid var(--divider-color, var(--sh-line)); margin-top: auto; }
    .sbp-it {
      position: relative; display: flex; align-items: center; gap: 10px; min-width: 0;
      min-height: var(--rowh, 40px); padding: 0 10px; border-radius: var(--rad, 12px);
      background: var(--ibg, var(--sbp-ibg, transparent));
      border-style: solid; border-width: var(--sbp-ibw, 0px);
      border-color: var(--sbp-ibc, var(--divider-color, rgba(127, 127, 127, .3)));
      color: var(--tc, inherit); font-size: var(--fs, 12px); font-weight: var(--fw, 500);
    }
    .sbp-it ha-icon { --mdc-icon-size: var(--is, 22px); color: var(--ic, var(--sbp-icon, var(--sidebar-icon-color, var(--secondary-text-color)))); flex: 0 0 auto; }
    .sbp-it .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .sbp[data-tiles] .sbp-it {
      flex-direction: column; justify-content: center; text-align: center; gap: var(--tgap, 2px);
      min-height: var(--tileh, 60px); padding: 6px 2px;
    }
    /* Wie im Injector: zwei Zeilen Text, dann abgeschnitten */
    .sbp[data-tiles] .sbp-it .lbl {
      white-space: normal; line-height: 1.15; overflow-wrap: anywhere; max-width: 100%;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    /* Eingeklappt blendet der Injector die Ueberschriften aus */
    .sbp[data-closed] .sbp-hd { display: none; }
    .sbp[data-nolabels] .sbp-it .lbl { display: none; }
    .sbp[data-nolabels] .sbp-it { justify-content: center; }
    .sbp-it[data-current] {
      background: var(--sbp-sel-bg, color-mix(in srgb, var(--sidebar-selected-icon-color, var(--primary-color, var(--sh-accent))) 14%, transparent));
      color: var(--sbp-sel-text, var(--sidebar-selected-icon-color, var(--primary-color, var(--sh-accent))));
    }
    .sbp-it[data-current] ha-icon { color: var(--sbp-sel-icon, var(--sidebar-selected-icon-color, var(--primary-color, var(--sh-accent)))); }
    /* Maus-Hover wie in Home Assistant (eigene Farben aus Aussehen > Hover) */
    .sbp-it:hover, .sbp-it[data-hover] { background-image: var(--sbp-hover, none); }
    .sbp[data-hover-text] .sbp-it:hover, .sbp[data-hover-text] .sbp-it[data-hover] { color: var(--sbp-hover-text); }
    .sbp[data-hover-icon] .sbp-it:hover ha-icon, .sbp[data-hover-icon] .sbp-it[data-hover] ha-icon { color: var(--sbp-hover-icon); }
    .sbp[data-own-hover] .sbp-it:hover, .sbp[data-own-hover] .sbp-it[data-hover] { background: var(--sbp-hover-bg); }
    /* Scrollbalken ausblenden (Layout > Verhalten) */
    .sbp[data-noscroll] { scrollbar-width: none; }
    .sbp[data-noscroll]::-webkit-scrollbar { display: none; }
    .sbp-it[data-mark], .sbp-hd[data-mark] { outline: 2px solid var(--sh-accent); outline-offset: 1px; }
    .sbp-it[data-dragging], .sbp-hd[data-dragging] { opacity: .4; }
    .sbp-it[data-over], .sbp-hd[data-over] { box-shadow: -3px 0 0 var(--sh-accent); }
    .sbp-badge {
      position: absolute; top: 4px; left: 26px; min-width: 16px; height: 16px; padding: 0 4px;
      border-radius: 8px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
      background: var(--sbp-badge-bg, var(--accent-color, #ff9800)); color: var(--sbp-badge-fg, #fff);
    }
    .sbp-badge[data-mark] { outline: 2px solid var(--sh-accent); outline-offset: 1px; }
    .sbp[data-tiles] .sbp-badge { left: calc(50% + 4px); }
    .sbp-hd {
      grid-column: 1 / -1; align-self: start; display: flex; align-items: center; gap: 8px;
      box-sizing: border-box; padding: 14px 12px 4px; font-size: 11px; font-weight: 500; line-height: 1.2;
      white-space: nowrap; overflow: hidden; opacity: .75; color: var(--hc, inherit);
      background: var(--hbg, transparent); border-radius: var(--hr, 0);
      border-style: solid; border-width: var(--hbw, 0px); border-color: var(--hbc, currentColor);
      position: relative;
    }
    .sbp-hd[data-color] { opacity: 1; }
    .sbp-hd[data-height] { height: var(--hh); padding-top: 0; padding-bottom: 0; }
    .sbp-hd[data-upper] { text-transform: uppercase; letter-spacing: .06em; }
    .sbp-hd ha-icon { --mdc-icon-size: 16px; flex: 0 0 auto; color: var(--hic, inherit); }
    .sbp-hd .hd-text { overflow: hidden; text-overflow: ellipsis; }
    .sbp-hd .hd-caret { margin-left: auto; font-size: 10px; line-height: 1; flex: 0 0 auto; }
    .sbp[data-zone="head"] .sbp-head, .sbp[data-zone="all"] { outline: 2px solid var(--sh-accent); outline-offset: -2px; }
    .sbp[data-zone="items"] .sbp-it:not([data-current]) { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sh-accent) 55%, transparent); }

    /* Theme-Vorschau: alle faerbbaren Elemente */
    .theme-stage { font-size: calc(14px * var(--ha-font-size-scale, 1)); font-weight: var(--ha-font-weight-body, 400); }
    .ts-dash {
      flex: 1; min-height: 0; position: relative; padding: 22px 22px 56px; overflow: auto;
      background: var(--lovelace-background, var(--primary-background-color));
    }
    .ts-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .ts-card { padding: 12px 14px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .ts-card .pv-card-head { font-size: 1em; font-weight: 700; margin: 0; }
    .ts-wide { grid-column: span 2; }
    /* Zwei Karten uebereinander in einer Spalte (Regler, Card-Design) */
    .ts-stack { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .ts-stack > .ts-card { flex: 0 0 auto; }
    .ts-stack > .ts-design { flex: 1 1 auto; gap: 4px; }
    .ts-head-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ts-line { display: flex; justify-content: space-between; font-size: .93em; }
    .ts-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .ts-chips .pv-chip { border: 1px solid var(--divider-color); }
    /* Schalter wie ha-switch (HA 2026.10): Flaeche mit Rand, Knopf mit Schatten */
    .ts-toggle {
      width: 32px; height: 16px; border-radius: 999px; flex: 0 0 auto; position: relative; box-sizing: border-box;
      border: 1px solid var(--sh-sw-off-border, #7a7a7a); background: var(--sh-sw-off-track, #202020);
    }
    .ts-toggle i {
      position: absolute; top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 50%;
      background: var(--sh-sw-off-thumb, #989898); box-shadow: var(--sh-sw-thumb-shadow, 0 1px 2px rgba(0, 0, 0, .35));
    }
    .ts-toggle[data-on] { border-color: var(--sh-sw-on-border, #009ac7); background: var(--sh-sw-on-track, #002e3e); }
    .ts-toggle[data-on] i { left: 17px; background: var(--sh-sw-on-thumb, #37c8fd); }
    .ts-card .pv-row { padding: 3px 0; }
    .ts-card .pv-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ts-st { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: .8em; }
    .ts-st > span { width: 70px; color: var(--secondary-text-color); }
    .ts-st .pv-st { width: 26px; height: 26px; }
    .ts-st .pv-st ha-icon { --mdc-icon-size: 16px; }
    .ts-card .pv-table { margin: 0; }
    .ts-card .pv-tr span { flex: 1 1 0; min-width: 0; margin: 0; color: inherit; }
    .ts-card .pv-tr span:last-child { margin: 0; color: inherit; }
    .pv-tr.ts-th { background: transparent; color: var(--secondary-text-color); font-size: .86em; border-bottom: 1px solid var(--divider-color); }
    .ts-in { display: flex; flex-direction: column; gap: 2px; margin-top: 0; border-bottom: 2px solid var(--primary-color); }
    .ts-in small { font-size: .78em; color: var(--primary-color); }
    .ts-sel { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .ts-sel ha-icon { --mdc-icon-size: 16px; }
    .ts-status { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .ts-status b { padding: 9px 6px; border-radius: 8px; text-align: center; font-size: .93em; color: #111; }
    .ts-status b[data-k="error"] { background: var(--error-color, #db4437); }
    .ts-status b[data-k="warning"] { background: var(--warning-color, #ffa600); }
    .ts-status b[data-k="success"] { background: var(--success-color, #43a047); }
    .ts-status b[data-k="info"] { background: var(--info-color, #039be5); }
    .ts-card .pv-scrim { padding: 8px; border-radius: 8px; }
    .ts-card .pv-dialog .pv-editor { margin: 8px 8px 0; }
    .ts-card .pv-dialog-actions { border-top: 0; padding: 6px 8px 8px; }
    .ts-h { font-size: 1.4em; font-weight: 700; line-height: 1.2; }
    .ts-p { font-size: 1em; }
    .ts-s { font-size: .86em; color: var(--secondary-text-color); }
    .ts-a { color: var(--primary-color); text-decoration: underline; font-size: .93em; }
    .ts-dash-tag { position: absolute; right: 14px; bottom: 14px; }

    /* Kopfzeile im Vorschaubild */
    #header-preview .hm-main { background: var(--lovelace-background, var(--primary-background-color)); }
    .stage .hpv-bar {
      height: 56px; padding: 0 18px; gap: 20px; position: relative; flex: 0 0 auto; font-size: 18px;
    }
    .stage .hpv-bar[data-sel] { outline-offset: -2px; }
    .stage .hpv-bar[data-sel][data-tag]::before { top: auto; bottom: -12px; left: 12px; }
    /* Die Tabelle schneidet an ihren runden Ecken ab: Schild innen oben rechts */
    .stage .tpv[data-sel][data-tag]::before { top: 8px; left: auto; right: 10px; }
    .stage .hpv-icon { display: none !important; }
    .stage .hpv-tabs { font-size: 14px; gap: 18px; }
    .hpv-off { padding: 18px; color: var(--secondary-text-color); font-size: 13px; border-bottom: 1px dashed var(--divider-color); }
    .stage .hpv-body {
      flex: 1; min-height: 0; padding: 26px 22px 56px; display: grid; gap: 14px; align-content: start;
      grid-template-columns: repeat(3, minmax(0, 1fr)); position: relative; background: transparent; overflow: auto;
    }
    .stage .hpv-card {
      height: auto; min-height: 150px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      color: var(--primary-text-color);
    }
    .stage .hpv-card b { font-weight: 600; }
    .stage .hpv-card i { display: block; height: 9px; border-radius: 5px; background: color-mix(in srgb, var(--primary-text-color) 16%, transparent); }
    .stage .hpv-card i.short { width: 60%; }
    .stage .hpv-card i.block { flex: 1; min-height: 80px; border-radius: 8px; }
    .stage .hpv-card i.tall { min-height: 130px; }
    .stage .hpv-card.wide { grid-column: span 2; }
    .hpv-goto { position: absolute; right: 14px; bottom: 14px; }
    #header-preview[data-hbottom] .hpv-bar { order: 3; }
    #header-preview[data-hbottom] .hpv-body { order: 2; padding-bottom: 60px; }
    #header-preview[data-hbottom] .hpv-goto,
    #header-preview[data-hbottom] .hm-main > .stage-side-goto { bottom: calc(var(--hpv-h, 56px) + 14px); }
    #header-preview[data-hbottom] .hpv-bar[data-sel][data-tag]::before { top: -12px; bottom: auto; }
    #header-preview .hpv-zone { border-radius: 8px; outline: 2px solid transparent; outline-offset: 3px; }
    #header-preview[data-mark="tabs"] .hpv-tabs,
    #header-preview[data-mark="buttons"] .hpv-right,
    #header-preview[data-mark="size"] .hpv-title { outline-color: var(--sh-accent); }
    .hpv-right { display: flex; align-items: center; gap: 12px; margin-left: auto; flex: 0 0 auto; padding: 2px 4px; }
    .hpv-sys { display: flex; align-items: center; gap: 12px; font-variant-numeric: tabular-nums; line-height: 1.1; }
    .hpv-sys[hidden], .hpv-si[hidden] { display: none; }
    .hpv-si { display: flex; flex-direction: column; align-items: flex-end; min-width: 36px; }
    .hpv-si .k { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
    .hpv-si .v { font-size: 14px; font-weight: 500; white-space: nowrap; }
    .stage .hpv-title { display: none; }
    .stage .hpv-tabs { gap: 2px; align-self: stretch; flex: 0 1 auto; min-width: 0; overflow: hidden; outline-offset: -2px !important; padding: 0 0 3px; box-sizing: border-box; }
    .stage .hpv-tab { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 100%; box-sizing: border-box; white-space: nowrap; border-top: 2px solid transparent; }
    .stage .hpv-tab-icon { padding: 0 11px; }
    .stage .hpv-tab ha-icon { --mdc-icon-size: 22px; }
    .stage .hpv-tab-both ha-icon { --mdc-icon-size: 20px; }
    .hpv-btn { display: inline-flex; }
    .hpv-btn ha-icon { --mdc-icon-size: 1em; }

    /* HA-Settings im Vorschaubild */
    .stage .spm-head { gap: 12px; position: relative; }
    /* Favoriten in der Kopfzeile: mittig, wie der Injector sie setzt */
    .stage .spm-head .spm-fav {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; gap: 6px;
      max-width: calc(100% - 280px); overflow: hidden; flex-wrap: nowrap;
    }
    .stage .spm-head .spm-fav-chip {
      background: var(--fbg, transparent); border: var(--fbw, 1px) solid var(--fbc, color-mix(in srgb, currentColor 35%, transparent));
      border-radius: var(--fr, 999px); height: var(--fh, 34px); white-space: nowrap; font-size: 14px;
    }
    /* Systemmonitor und Backup: zwei eigene Kaesten, Abstand wie zu den Menue-Bloecken */
    [data-mon-slot] { display: flex; flex-direction: column; gap: 14px; }
    /* Zaehler-Box im Vorschaubild: Felder fliessen in Zeilen, Linien nur dazwischen */
    .mpv-counts .mpv-grid { display: flex; flex-wrap: wrap; margin: 0 -1px -1px 0; }
    .mpv-counts .mpv-cell { flex: 1 1 118px; border-inline-start: 0; border-inline-end: 1px solid var(--divider-color);
      border-bottom: 1px solid var(--divider-color); padding: 10px 12px 12px; }
    .mpv-counts .mpv-cell[hidden] { display: none; }
    .mpv-counts .mpv-value { font-size: 22px; }
    .mpv-counts .mpv-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Auswahl der Zaehler in der Feldspalte */
    .count-items { display: flex; flex-direction: column; gap: 6px; }
    .count-items .cap { font-weight: 700; font-size: 13px; }
    .count-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 14px; }
    .count-grid label.check { margin: 0; padding: 5px 0; font-size: 14px; }
    .count-items[data-changed] > .cap::after { content: " •"; color: var(--sh-accent); }
    .stage [data-mon-slot] .mpv-backup { margin-top: 0; }
    .stage .mpv-cell:hover { background-image: var(--mh, linear-gradient(color-mix(in srgb, currentColor 4%, transparent), color-mix(in srgb, currentColor 4%, transparent))); }
    .spm-tip { font-size: 14px; color: var(--secondary-text-color); text-align: center; padding: 4px 16px 8px; border-radius: 8px; }
    .spm-tip[hidden] { display: none; }
    .sp-pane { display: none; }
    .sp-pane[data-current] {
      display: flex; flex-direction: column; gap: 14px; padding: 20px 22px; overflow: auto; flex: 1; min-height: 0;
    }
    .spm-favs { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 4px; border-radius: 12px; }
    .spm-fav-chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: var(--fh, 34px);
      border-radius: var(--fr, 17px); background: var(--fbg, var(--ha-card-background, var(--card-background-color)));
      color: var(--ftc, inherit); border: var(--fbw, 0px) solid var(--fbc, var(--divider-color)); font-size: 13px;
    }
    .spm-fav-chip[data-upper] { text-transform: uppercase; }
    .spm-fav-chip ha-icon { --mdc-icon-size: 18px; color: var(--fic, var(--primary-color)); }
    .spm-empty { font-size: 13px; color: var(--secondary-text-color); text-align: center; padding: 6px 10px; }
    .spm-off {
      padding: 14px; border: 1px dashed color-mix(in srgb, var(--primary-text-color) 35%, transparent);
      border-radius: 12px; text-align: center; color: var(--secondary-text-color); font-size: 14px;
    }
    .stage .spm-block { background: var(--ha-card-background, var(--card-background-color)); border-radius: 12px; padding: 6px 10px; }
    .stage .mpv { margin-top: 0; border-color: var(--divider-color); }
    .stage .lpv, .stage .tpv { margin-top: 0; }
    .tpv-row { background: var(--trb, none); }
    .tpv-row[data-even] { background: var(--tz, var(--trb, none)); }
    .stage .tpv { border-color: var(--divider-color); background: var(--card-background-color); }
    .stage .lpv-card { background: var(--card-background-color); border-color: var(--divider-color); }
    .spv { display: flex; flex-direction: column; gap: 10px; border-radius: 12px; }
    .spv .spm-block { display: flex; flex-direction: column; }
    .spv[data-cols] .spm-block { display: grid; grid-template-columns: repeat(var(--mcols, 1), minmax(0, 1fr)); column-gap: 6px; }
    .spv[data-cols] .spv-row + .spv-row { border-top: 0; }
    .spv-text strong { font-weight: 400; font-size: 14px; }
    .stage .spv-row + .spv-row { border-top-color: var(--divider-color); }
    [data-mon-slot]:empty { display: none; }

    /* ---------------------------------------------------- Feldspalte */
    .fields {
      display: flex; flex-direction: column; min-height: 0; min-width: 0; background: var(--sh-card);
      border-left: 1px solid var(--sh-line);
    }
    .fields-head { padding: 22px 22px 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .fields-topic { flex: 1 0 100%; margin: 4px 0 0; font-size: 15px; font-weight: 700; color: var(--sh-muted); }
    .fields-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; flex: 1; min-width: 0; }
    .fields-tools { display: flex; gap: 10px; flex: 1 0 100%; }
    .fields-tools .btn { flex: 1; justify-content: center; min-width: 0; }
    .fields-tools .btn { white-space: normal; height: auto; min-height: 38px; padding: 4px 12px; line-height: 1.15; text-align: center; }
    .fields-body { flex: 1; min-height: 0; overflow: auto; padding: 4px 22px 22px; }
    .fields-foot { padding: 14px 22px 16px; border-top: 1px solid var(--sh-line); display: flex; flex-direction: column; gap: 10px; }
    .fields-note { font-size: 12px; color: var(--sh-muted); line-height: 1.45; margin: 16px 0 0; }
    .fields-note p { margin: 0 0 8px; }
    .topic-panel { display: none; }
    .topic-panel[data-current] { display: flex; flex-direction: column; gap: 14px; }
    /* Einstellungsseite, "Alle Felder": die drei Themen untereinander */
    .topic-head { display: none; margin: 0; font-size: 16px; font-weight: 800; }
    [data-fields="settings"][data-view="all"][data-pane="page"] .topic-panel[data-page-topic] {
      display: flex; flex-direction: column; gap: 14px;
    }
    [data-fields="settings"][data-view="all"][data-pane="page"] .topic-panel[data-page-topic] + .topic-panel[data-page-topic] {
      margin-top: 22px; padding-top: 20px; border-top: 2px solid var(--sh-line-strong);
    }
    [data-fields="settings"][data-view="all"][data-pane="page"] .topic-head { display: block; }
    [data-fields="settings"][data-view="all"][data-pane="page"] #settings-topic-title { display: none; }
    .topic-panel > label.check:first-child { font-weight: 700; margin-top: 0; }

    /* Gruppen zum Auf- und Zuklappen */
    .grp { border-bottom: 1px solid var(--sh-line); }
    .grp-head {
      width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 0; border: 0;
      background: transparent; cursor: pointer; font-weight: 700; font-size: 15px; text-align: left; color: var(--sh-text);
    }
    .grp-head .chev {
      width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
      transform: rotate(-45deg); margin: 0 4px 0 2px; flex: 0 0 auto; transition: transform .15s ease;
    }
    .grp[data-open] > .grp-head .chev { transform: rotate(45deg); margin-top: -4px; }
    /* Titel der Gruppen leicht in der Akzentfarbe: hebt sich vom Inhalt ab */
    .grp-title { flex: 1; min-width: 0; color: color-mix(in srgb, var(--sh-accent) 55%, var(--sh-text)); }
    .grp[data-open] > .grp-head .grp-title { color: color-mix(in srgb, var(--sh-accent) 75%, var(--sh-text)); }
    .grp-count { font-family: var(--sh-mono); font-size: 12px; color: var(--sh-accent); font-weight: 500; white-space: nowrap; }
    .grp-body { display: none; padding: 0 0 18px; }
    .grp[data-open] > .grp-body { display: flex; flex-direction: column; gap: 14px; }
    .grp-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .grp-foot small { flex: 1; color: var(--sh-muted); font-size: 12px; }
    .grp .grp { border-bottom: 0; border-top: 1px solid var(--sh-line); }
    .grp .grp > .grp-head { padding: 12px 0; font-size: 14px; }
    .topic-panel > .grp { border-top: 1px solid var(--sh-line); border-bottom: 0; }
    [data-fields="theme"][data-view="simple"] .grp[data-sec-group="theme"]:not([data-related]) { display: none; }
    /* Header "Alle Felder": alle Gruppen offen - das Akkordeon hat dort nichts zu tun. */
    [data-fields="header"][data-view="all"] .acc-btn { display: none; }
    /* Akkordeon-Schalter neben Einfach / Alle */
    /* Titel, Einfach / Alle und Schalter passen in eine Zeile */
    .fields-head .seg[data-view] button { padding: 0 10px; font-size: 13px; }
    .fields-head .fields-title { white-space: nowrap; }
    .acc-btn { width: 34px; height: 34px; border-radius: 8px; color: var(--sh-muted); }
    .acc-btn[data-active] { color: var(--sh-accent); border-color: color-mix(in srgb, var(--sh-accent) 55%, transparent); }
    .acc-btn ha-icon { --mdc-icon-size: 20px; }

    /* ---------------------------------------------------- Felder */
    .stack { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .stack.sub, .grid.sub { padding-left: 12px; border-left: 2px solid var(--sh-line); }
    .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: end; }
    .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: end; }
    .fields .grid3 > label.field:has(> .color-field), .fields .grid2 > label.field:has(> .color-field) { flex-direction: column; align-items: stretch; gap: 6px; }
    .fields .grid3 > label.field:has(> .color-field) > span:first-child,
    .fields .grid2 > label.field:has(> .color-field) > span:first-child { font-weight: 700; font-size: 13px; flex: 0 0 auto; }
    .fields .grid3 > label.field > .color-field, .fields .grid2 > label.field > .color-field { width: auto; gap: 4px; }
    .fields .grid3 > label.field > .color-field input[type="color"] { width: 30px; }
    .fields .grid3 > label.field > .color-field button.clear { display: none; }
    .fields .grid3 > label.field > .color-field input[type="text"] { padding: 0 6px; height: 40px; }
    /* Farbfeld in einer Reihe mit Zahlenfeldern: Beschriftung oben, so breit wie die Spalte */
    .fields .grid3 > label.field:has(> .color-field) > .color-field,
    .fields .grid2 > label.field:has(> .color-field) > .color-field { width: auto; min-width: 0; }
    .fields .grid2 > label.field:has(> .color-field) > .color-field input[type="text"],
    .fields .grid3 > label.field:has(> .color-field) > .color-field input[type="text"] { min-width: 0; width: 100%; height: 40px; }
    .grid2 + .field-hint, .grid3 + .field-hint { margin-top: 2px; }
    /* Hinweis unter segmentierten Knoepfen: nicht unter die Knoepfe ruecken */
    .seg-field + .field-hint { margin-top: 1px; }
    /* Zwischenueberschrift im Inspektor: Zahlen in einer Reihe, Farbe darunter */
    .insp-body .hd-nums { grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); align-items: end; }
    .insp-body .hd-color { margin-top: 12px; }
    .grid-mini { align-items: end; }
    .grid-mini + .field-hint { margin-top: 2px; }
    .head-block label.check + .grid-mini { margin-top: 8px; }
    .head-block label.check + .field-hint { margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .grid.sub.four, .grid-mini.four { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .grid-mini { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
    .sub-box { border: 1px solid var(--sh-line); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .sub-box label.check { margin: 0; }
    .button-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
    label.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; min-width: 0; }
    label.field > span:not(.color-field):first-child, .cap {
      font-size: 13px; font-weight: 700; color: var(--sh-text);
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px;
    }
    input[type="text"], input[type="number"], input[type="search"]:not(#search), select, textarea {
      width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--sh-line-strong);
      border-radius: 8px; background: var(--sh-field); color: var(--input-ink-color, var(--sh-text)); font: inherit; font-size: 15px;
    }
    textarea { height: auto; min-height: 200px; padding: 10px 12px; font-family: var(--sh-mono); font-size: 13px; }
    select { padding: 0 8px; }
    input:focus, select:focus, textarea:focus { outline: 2px solid var(--sh-accent); outline-offset: -1px; }
    input[type="number"], .color-field input[type="text"] { font-family: var(--sh-mono); font-size: 13px; }
    input::placeholder, textarea::placeholder { color: var(--sh-muted); opacity: .75; }
    .color-field { display: flex; gap: 8px; align-items: center; margin: 0; min-width: 0; }
    .color-field input[type="text"] { flex: 1; min-width: 0; order: 1; }
    .color-field input[type="color"] { order: 2; }
    .color-field button.clear { order: 3; }
    .color-field input[type="color"] {
      width: 36px; height: 36px; padding: 2px; border: 1px solid var(--sh-line-strong);
      border-radius: 8px; background: transparent; cursor: pointer; flex: 0 0 auto;
    }
    .color-field button.clear {
      border: 0; background: transparent; color: var(--sh-muted); opacity: .7;
      border-radius: 8px; height: 36px; width: 24px; cursor: pointer; font-size: 13px; flex: 0 0 auto; padding: 0;
    }
    .color-field button.clear:hover { opacity: 1; color: var(--sh-text); }
    /* Farbfelder in der Feldspalte als Zeile: Beschriftung links, Wert rechts */
    .fields label.field:has(> .color-field) { flex-direction: row; align-items: center; gap: 10px; }
    .fields label.field:has(> .color-field) > span:first-child { flex: 1; min-width: 0; font-weight: 500; font-size: 14px; }
    .fields label.field:has(> .color-field) > .color-field { flex: 0 0 auto; width: 186px; }
    .fields label.field:has(> .color-field) > .color-field input[type="text"] { height: 36px; }
    label.check {
      display: flex; gap: 12px; align-items: flex-start; justify-content: space-between;
      font-size: 15px; margin: 4px 0; cursor: pointer;
    }
    label.check > span { flex: 1; min-width: 0; order: -1; }
    label.check input { margin: 2px 0 0; width: 20px; height: 20px; flex: 0 0 auto; accent-color: var(--sh-accent); }
    label.check .sub { display: block; font-size: 12px; color: var(--sh-muted); margin-top: 3px; font-weight: 400; }
    label.check.boxed { padding: 12px 14px; border: 1px solid var(--sh-line); border-radius: 10px; margin: 0; align-items: center; }
    label.check.boxed input { margin: 0; }
    label.check.inline { margin: 0; gap: 8px; align-items: center; color: var(--sh-text); font-size: 14px; }
    label.check.inline > span { order: 1; }
    label.check.inline input { margin: 0; }
    label.check.strong { font-weight: 700; font-size: 17px; margin: 0 0 8px; }
    .field-hint { display: block; font-size: 12px; color: var(--sh-muted); margin-top: -4px; line-height: 1.4; }
    .hint { margin: 0; font-size: 13px; color: var(--sh-muted); line-height: 1.45; }
    .was { font-weight: 500; color: var(--sh-accent); font-size: 12px; text-transform: none; letter-spacing: 0; }
    .was::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: var(--sh-accent); margin-right: 6px; vertical-align: 1px; }
    [data-changed] > input[type="color"], [data-changed] .color-field input[type="color"] { outline: 1px solid var(--sh-accent); }
    [data-changed] input[type="text"], [data-changed] input[type="number"], [data-changed] select {
      border-color: var(--sh-accent);
    }
    .flash-hit { animation: shHit 1.6s ease; border-radius: 8px; }
    @keyframes shHit { 0%, 40% { box-shadow: 0 0 0 3px var(--sh-accent); } 100% { box-shadow: 0 0 0 0 transparent; } }
    label.range { display: flex; flex-direction: column; gap: 2px; }
    label.range .cap { font-weight: 500; font-size: 14px; }
    label.range .cap output { margin-left: auto; font-family: var(--sh-mono); font-weight: 500; font-size: 13px; color: var(--sh-text); }
    label.range input[type="range"] { width: 100%; accent-color: var(--sh-accent); margin: 4px 0; }
    .rows { display: flex; flex-direction: column; gap: 4px; }
    .rows label.field { flex-direction: row; align-items: center; gap: 10px; padding: 6px 0; margin: 0; }
    .rows label.field > span:first-child {
      flex: 1; min-width: 0; color: var(--sh-text); font-size: 14px; font-weight: 500;
      flex-direction: column; align-items: flex-start; gap: 1px;
    }
    .rows label.field .color-field { flex: 0 0 auto; width: 186px; }
    .rows label.field > select, .rows label.field > input { flex: 0 0 186px; width: 186px; }
    .var-name {
      display: block; font-family: var(--sh-mono); font-size: 11px; color: var(--sh-muted); opacity: .85;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; max-width: 100%;
    }
    .theme-mode[hidden] { display: none !important; }
    .theme-mode { display: flex; flex-direction: column; gap: 12px; }
    .dot-sw { width: 14px; height: 14px; border-radius: 50%; background: var(--sh-accent); display: inline-block; flex: 0 0 auto; }
    .btn-toggle {
      display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 8px;
      border: 2px solid var(--sh-accent); color: var(--sh-accent); font-weight: 700; cursor: pointer; padding: 0 12px;
      font-size: 15px;
    }
    .btn-toggle input { width: 16px; height: 16px; margin: 0; accent-color: var(--sh-accent); }
    .btn-toggle:has(input:checked) { background: var(--sh-accent); color: var(--sh-on-accent); }
    .theme-set { display: flex; flex-direction: column; gap: 10px; }
    .theme-set label.field { flex-direction: row; align-items: center; gap: 10px; }
    .theme-set label.field > span:first-child { flex: 0 0 auto; font-weight: 500; }
    .theme-set label.field input { height: 34px; }
    .theme-set label.check { margin: 0; }
    .theme-set label.check > span { order: 1; }
    .theme-set .fields-note { margin: 0; }
    .hidden-note { padding: 6px 0 12px; }
    .dash-image { display: flex; align-items: center; gap: 14px; margin: 6px 0 4px; }
    .dash-thumb {
      flex: none; width: 96px; height: 60px; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--sh-line);
      background: repeating-conic-gradient(rgba(128,128,128,.25) 0% 25%, transparent 0% 50%) 0 0 / 14px 14px;
    }
    .dash-thumb i { display: block; width: 100%; height: 100%; background: center / cover no-repeat; }
    .dash-file { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .dash-file small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .8; }
    .card-head { display: flex; align-items: center; gap: 8px; }
    .card-head h2, .card-head h3 { flex: 1; min-width: 0; }
    .hlinks-head { margin-top: 6px; }
    .hlinks-head h3 { margin: 0; font-size: 14px; font-weight: 700; }

    /* ---------------------------------------------------- Eintraege */
    .items-bar { display: flex; align-items: center; gap: 12px; margin: 4px 0 12px; flex-wrap: wrap; }
    ul.items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    li.item {
      display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 4px 8px 4px 10px;
      border: 1px solid transparent; border-radius: 9px; background: var(--sh-row); cursor: pointer;
    }
    li.item:hover { background: var(--sh-row-hover); }
    li.item[data-child] { margin-left: 18px; }
    li.item[data-hidden] { background: transparent; border: 1px dashed var(--sh-line-strong); }
    li.item[data-hidden] .row-name, li.item[data-hidden] .row-icon { opacity: .55; }
    li.item[data-dragging] { opacity: .4; }
    li.item[data-over] { box-shadow: inset 0 2px 0 var(--sh-accent); }
    li.item[data-over-indent] { margin-left: 18px; }
    li.item .row-name { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-size: 15px; }
    li.item .row-name > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    li.item .row-meta { font-family: var(--sh-mono); font-size: 12px; color: var(--sh-muted); white-space: nowrap; }
    li.item .eye {
      border: 0; background: transparent; color: var(--sh-muted); width: 28px; height: 28px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
    }
    li.item .eye:hover { background: var(--sh-row-hover); color: var(--sh-text); }
    li.item .eye ha-icon { --mdc-icon-size: 18px; display: block; }
    li.item[data-heading] { background: transparent; min-height: 36px; margin-top: 6px; }
    li.item[data-heading] .row-name {
      text-transform: uppercase; letter-spacing: .1em; font-size: 12px; font-weight: 700; color: var(--sh-muted);
    }
    li.item[data-heading] .row-name::after { content: ""; flex: 1; height: 1px; background: var(--sh-line); min-width: 16px; }
    li.item .chev { color: var(--sh-muted); display: inline-flex; }
    li.item .chev ha-icon { --mdc-icon-size: 16px; }
    .handle {
      cursor: grab; color: var(--sh-muted); line-height: 1; padding: 2px; user-select: none;
      flex: 0 0 auto; display: flex; align-items: center; opacity: .7;
    }
    .row-icon {
      width: 24px; height: 24px; flex: 0 0 auto; color: var(--sh-text);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .row-icon ha-icon { --mdc-icon-size: 20px; }
    .row-title { flex: 1 1 140px; min-width: 0; }
    .row-title strong { display: block; font-size: 14px; font-weight: 500; line-height: 1.25; }
    .row-title small { display: block; font-size: 11px; color: var(--sh-muted); line-height: 1.3; font-family: var(--sh-mono); }
    .row-link {
      font-family: var(--sh-mono); font-size: 11px; padding: 0 6px; border-radius: 5px;
      border: 1px solid var(--sh-line-strong); color: var(--sh-muted); font-weight: 400;
    }
    /* Der gewaehlte Eintrag: Zeile und Felder bilden eine Karte */
    li.item[data-selected] {
      border: 2px solid var(--sh-accent); border-bottom: 0; border-radius: 10px 10px 0 0; background: var(--sh-card);
      padding-top: 8px;
    }
    li.item[data-selected] .row-name { font-weight: 700; }
    li.item[data-heading][data-selected] .row-name { color: var(--sh-text); }
    li.insp-li {
      list-style: none; border: 2px solid var(--sh-accent); border-top: 0; border-radius: 0 0 10px 10px;
      padding: 6px 12px 14px; margin-top: -6px; background: var(--sh-card);
    }
    li.insp-li[data-child-of] { margin-left: 18px; }
    .insp-head { display: none; align-items: center; gap: 12px; margin-bottom: 14px; }
    .insp-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .insp-title strong { font-size: 20px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .insp-title small { font-family: var(--sh-mono); font-size: 12px; color: var(--sh-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .insp-body { display: flex; flex-direction: column; gap: 14px; }
    .insp-body ha-icon-picker { display: block; width: 100%; --text-field-padding: 0 8px; }
    .insp-body input[data-prop="icon"] { font-family: var(--sh-mono); font-size: 13px; }
    .insp-body .head-block { border: 1px solid var(--sh-line); border-radius: 10px; padding: 12px; margin: 0; }
    .insp-body .row-extra-2 { display: block; padding: 0; }
    .insp-moves { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .insp-moves .grow { flex: 1; }
    .insp-empty { color: var(--sh-muted); font-size: 13px; }
    .ctiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .ctile {
      display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px 8px;
      border: 1px solid var(--sh-line-strong); border-radius: 10px; background: transparent; cursor: pointer;
      font-size: 13px; position: relative;
    }
    .ctile:hover { background: var(--sh-row-hover); }
    .ctile[data-open] { border-color: var(--sh-accent); box-shadow: 0 0 0 1px var(--sh-accent); }
    .ctile i { display: block; width: 34px; height: 14px; border-radius: 4px; border: 1px solid rgba(127, 127, 127, .35); }
    .ctile i[data-empty] { border-style: dashed; background: transparent; }
    .ctile[data-changed]::after {
      content: ""; position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--sh-accent);
    }
    .ctile-edit .color-field input[type="text"] { height: 36px; }
    .head-block label.check { margin: 10px 0 0; font-size: 14px; }

    /* Link-Listen (Kopfzeile, Favoriten) und Menuepunkte */
    .hlinks li.hlink { background: var(--sh-card); }
    /* Aussehen eines Favoriten: volle Breite der Karte */
    .hlinks li.hlink.fav .fav-extra { padding: 12px 0 4px; }
    .fav-extra .fav-colors { display: flex; flex-direction: column; gap: 4px; margin: 0 0 8px; }
    .fav-extra .fav-icon { margin: 4px 0 12px; }
    .fav-extra .head-block .rows { margin-top: 10px; }
    .fav-extra .hd-nums { grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); align-items: end; }

    /* ---------------------------------------------------- Export / Import, Info */
    .doc { max-width: 1160px; margin: 0 auto; padding: 26px 28px 40px; }
    .card {
      background: var(--sh-card); border: 1px solid var(--sh-line); border-radius: 14px;
      padding: 20px 22px; margin: 0; min-width: 0;
    }
    .card > h2 { margin: 0 0 10px; font-size: 18px; font-weight: 800; line-height: 1.25; }
    /* Hervorgehobene Karten (Info: Entwickelt von, Export: Komplette
       Konfiguration): dezent in der Primaerfarbe getoent statt weiss */
    .card.inverse {
      background: color-mix(in srgb, var(--sh-accent) 10%, var(--sh-card)); color: var(--sh-text);
      border-color: color-mix(in srgb, var(--sh-accent) 38%, var(--sh-line));
    }
    .card.inverse .badge-ext { color: inherit; border-color: color-mix(in srgb, var(--sh-text) 30%, transparent); opacity: .85; }
    .card.inverse .btn { color: var(--sh-text); border-color: color-mix(in srgb, var(--sh-text) 30%, transparent); }
    .card.inverse .btn:hover { background: color-mix(in srgb, var(--sh-accent) 14%, transparent); }
    .card.inverse .btn.solid { background: var(--sh-accent); color: var(--sh-on-accent); border-color: var(--sh-accent); font-weight: 700; }
    .xfer-main { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 18px; }
    .xfer-main .xfer-text { flex: 1 1 420px; min-width: 0; }
    .xfer-main .button-row { margin: 0; }
    .xfer-title { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 20px; font-weight: 800; }
    .xfer-title .grow { flex: 1; }
    .xfer-main p, .xfer-card p { margin: 0; line-height: 1.5; font-size: 15px; }
    .xfer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .xfer-card { display: flex; flex-direction: column; gap: 10px; }
    .xfer-card .button-row { margin-top: auto; padding-top: 10px; }
    .xfer-foot { margin: 18px 2px 0; font-size: 13px; color: var(--sh-muted); }
    .info-grid { display: grid; grid-template-columns: minmax(0, 1fr) 392px; gap: 22px; align-items: start; max-width: 1440px; }
    .welcome { padding: 28px 30px 26px; }
    .welcome h2 { font-size: 32px; margin: 0 0 14px; letter-spacing: -0.02em; }
    .welcome .lead { font-size: 17px; line-height: 1.5; margin: 0 0 14px; }
    .welcome > p { line-height: 1.5; }
    .areas-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    .area { border-radius: 12px; padding: 16px 18px; font-size: 14px; line-height: 1.5; background: var(--sh-row); }
    .area h3 { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
    .area p { margin: 0 0 6px; }
    .note { margin: 14px 0 0; font-size: 14px; line-height: 1.55; }
    .note strong:first-child { color: var(--sh-accent); }
    .note.tip strong:first-child { color: var(--success-color, #43a047); }
    .note.important strong:first-child { color: var(--sh-warn); }
    .author-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .avatar {
      width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 18px; flex: 0 0 auto; background: color-mix(in srgb, var(--sh-accent) 22%, transparent);
    }
    .author-head .who { flex: 1; display: flex; flex-direction: column; }
    .author-head .who small { font-size: 12px; opacity: .75; }
    .author-head .who strong { font-size: 20px; }
    .link-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .link-grid .wide { grid-column: 1 / -1; }
    a.btn { text-decoration: none; justify-content: center; height: 42px; }
    .rule-title {
      display: flex; align-items: center; gap: 12px; margin: 20px 0 12px; font-size: 12px; font-weight: 700;
      letter-spacing: .1em; text-transform: uppercase; opacity: .75;
    }
    .rule-title::after { content: ""; flex: 1; height: 1px; background: currentColor; opacity: .3; }
    .support-text { margin: 0 0 12px; line-height: 1.5; }
    .info-switch .hint { line-height: 1.5; }
    .card.danger { border-color: color-mix(in srgb, var(--sh-warn) 65%, transparent); }
    .card.danger > h2 { color: var(--sh-warn); }
    .card.danger .hint { margin-bottom: 14px; color: var(--sh-text); opacity: .85; }
    .card.danger .btn.danger { font-weight: 700; }

    /* ---------------------------------------------------- Dialoge */
    .modal {
      position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, .5); padding: 16px;
    }
    .modal[hidden] { display: none; }
    .modal-card {
      background: var(--sh-card); color: var(--sh-text); border: 1px solid var(--sh-line-strong);
      border-radius: 18px; box-shadow: 0 16px 48px rgba(0, 0, 0, .4);
      padding: 24px; width: min(640px, 100%); max-height: 90vh; overflow: auto;
    }
    .modal-card.wide { width: min(560px, 100%); }
    .modal-card.xwide { width: min(760px, 100%); }
    .modal-card h2 { margin: 0 0 12px; font-size: 22px; font-weight: 800; display: flex; align-items: baseline; gap: 10px; }
    .modal-card h2 ha-icon { --mdc-icon-size: 20px; color: var(--sh-accent); }
    .modal-card h2 .grow { flex: 1; }
    .h2-sub { font-size: 14px; font-weight: 400; color: var(--sh-muted); }
    .modal-card .hint { margin: 0 0 16px; font-size: 15px; color: var(--sh-text); opacity: .85; line-height: 1.5; }
    .modal-card textarea { min-height: 150px; }
    .modal-card h3.add-title {
      margin: 20px 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: var(--sh-muted);
    }
    .modal-card h3.add-title + .hint { margin-bottom: 10px; }
    #add-modal label.field { margin-top: 10px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .modal-error, .palette-error, .history-error { margin: 12px 0 0; font-size: 13px; color: var(--sh-err); }
    .file-pick {
      display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; margin-bottom: 14px;
      border: 1px dashed var(--sh-line-strong); border-radius: 10px; cursor: pointer; font-size: 15px; background: var(--sh-row);
    }
    .file-pick:hover { border-color: var(--sh-accent); color: var(--sh-accent); }
    .file-pick ha-icon { --mdc-icon-size: 18px; }
    .file-pick input[type="file"] { display: none; }
    .paste-label { font-size: 13px; font-weight: 700; color: var(--sh-muted); margin: 0 0 6px; display: block; }
    .hist-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .hist { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px;
      border: 1px solid var(--sh-line); border-radius: 10px; }
    .hist[data-current] { border-color: var(--sh-accent); }
    .hist-main { flex: 1; min-width: 0; }
    .hist-main strong { font-weight: 600; }
    .hist-badge { margin-left: 8px; font-size: 11px; padding: 1px 8px; border-radius: 999px;
      background: var(--sh-accent); color: var(--sh-on-accent); vertical-align: 1px; }
    .hist-meta { display: block; font-size: 12px; color: var(--sh-muted); }
    .hist-changes { margin: 6px 0 0; padding-left: 18px; font-size: 13px; }
    .hist-changes li { margin: 0 0 2px; }
    .hist .flat { flex: 0 0 auto; }
    .pal-row { display: flex; gap: 10px; align-items: center; }
    .pal-row input[type="color"] { width: 48px; height: 40px; border-radius: 8px; border: 1px solid var(--sh-line-strong); padding: 2px; background: transparent; }
    .pal-row input[type="text"] { flex: 1; font-family: var(--sh-mono); }
    .modal-card .seg-field { margin-top: 14px; }
    .modal-card .seg-field .cap { color: var(--sh-muted); }
    .modal-card .cap { color: var(--sh-muted); }
    .palette-rows { display: grid; gap: 8px; margin: 16px 0 4px; }
    .palette-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--sh-muted); }
    .palette-row > span:first-child { width: 52px; flex: 0 0 auto; }
    .palette-row .chips { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; flex: 1; height: auto; border: 0; overflow: visible; }
    .palette-row .chips i { display: block; height: 22px; border-radius: 6px; border: 1px solid rgba(127, 127, 127, .35); }
    .presets { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .presets.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .preset {
      display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 10px 10px 12px;
      border: 1px solid var(--sh-line); border-radius: 12px; background: transparent;
      color: inherit; cursor: pointer; text-align: left; font: inherit;
    }
    .preset:hover { border-color: var(--sh-line-strong); }
    .preset[data-active] { border-color: var(--sh-accent); box-shadow: 0 0 0 1px var(--sh-accent); }
    .preset strong { display: block; font-size: 15px; font-weight: 700; margin-top: 4px; }
    .preset small { display: block; font-size: 12px; color: var(--sh-muted); line-height: 1.35; }
    .preset .swatch { display: block; height: auto; padding: 0; border: 0; }
    .preset .sw-in {
      display: flex; align-items: center; justify-content: center; gap: 10px; height: 72px; border-radius: 8px;
      border: 1px solid rgba(127, 127, 127, .25); margin-bottom: 4px;
    }
    .preset .sw-in i { width: 62px; height: 40px; display: block; }
    .preset .sw-in.hp {
      flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 8px; padding: 10px;
      background: #15181e; height: 86px;
    }
    .preset .sw-in.hp i { width: auto; }
    .preset .sw-in.hp .hp-body { flex: 1; border-radius: 6px; background: #252a33; }
    .preset[data-current] strong::after { content: " ✓"; color: var(--sh-accent); }
    .preset-confirm { margin: 14px 0 0; padding: 12px 14px; border-radius: 10px; background: var(--sh-row); font-size: 14px; line-height: 1.45; }

    /* ---------------------------------------------------- Handy-Leiste */
    .dock { display: none; }

    /* ================================================== Tablet (< 1180) */
    @container (max-width: 1179px) {
      /* Schmale Feldspalte: Titel in eigener Zeile, Einfach/Alle und der
         Akkordeon-Schalter darunter */
      .fields-head .fields-title { flex: 1 0 100%; }
      .fields-head .seg[data-view] { flex: 1 1 auto; }
      .fields-head .seg[data-view] button { flex: 1 1 auto; }
      .seg.subtabs[data-panes] button { font-size: 12px; padding: 0 5px; }
      .topbar { padding: 8px 14px; gap: 8px; }
      /* Rechts muss alles erreichbar bleiben: die Bereiche duerfen schrumpfen
         und seitlich scrollen, die Knoepfe nicht. */
      .topbar > * { flex-shrink: 0; }
      .topbar .grow { flex: 1 1 0; min-width: 0; }
      .topbar nav.areas.top { flex-shrink: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
      .brand-name { display: none; }
      .brand-short { display: block; max-width: 70px; }
      .brand .logo { display: none; }
      [data-search-icon] { display: inline-flex; }
      .search { display: none; }
      .app[data-searching] .search {
        display: flex; position: absolute; left: 12px; right: 12px; top: 11px; width: auto; z-index: 30;
        background: var(--sh-card); box-shadow: 0 0 0 4px var(--sh-card);
      }
      nav.areas button { padding: 0 10px; font-size: 14px; }
      .changes .long { display: none; }
      .changes .short { display: inline; }
      .changes { white-space: normal; max-width: 52px; line-height: 1.2; }
      .topbar .changes[data-clean] { display: none; }
      .stage-page[data-active] { grid-template-columns: minmax(0, 1fr) 346px; }
      .stage-col { padding: 16px 18px 12px; }
      .stage-title { font-size: 22px; }
      .stage-hint { display: none; }
      .stage-frame { min-height: 380px; }
      .stage-note { display: none; }
      .hm-side { max-width: 50%; }
      .ts-grid, .stage .hpv-body { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .stage .hpv-card.wide { grid-column: span 2; }
      .fields-head { padding: 18px 18px 8px; }
      .fields-body { padding: 4px 18px 18px; }
      .fields-foot { padding: 12px 18px 14px; }
      .fields label.field:has(> .color-field) > .color-field, .rows label.field .color-field { width: 160px; }
      .rows label.field > select, .rows label.field > input { flex-basis: 160px; width: 160px; }
      /* Eintraege: entweder der gewaehlte Eintrag oder die Liste */
      .items-pane[data-view="entry"] .items-bar,
      .items-pane[data-view="entry"] > .fields-note,
      .items-pane[data-view="entry"] li.item { display: none; }
      .items-pane[data-view="entry"] li.insp-li { border: 0; padding: 0; margin: 0; background: transparent; }
      .items-pane[data-view="entry"] .insp-head { display: flex; }
      .items-pane[data-view="list"] li.insp-li { display: none; }
      .items-pane[data-view="list"] li.item[data-selected] { border: 1px solid var(--sh-accent); border-radius: 9px; padding-top: 4px; }
      .info-grid { grid-template-columns: minmax(0, 1fr); }
    }

    /* ======================================= schmales Tablet (< 920) */
    @container (max-width: 919px) {
      .topbar .brand { display: none; }
      .topbar .btn { padding: 0 10px; font-size: 14px; }
      .topbar .btn.primary { padding: 0 12px; }
      .topbar .changes { display: none; }
      nav.areas button { padding: 0 8px; }
      /* Wenig Platz: ausser auf der Seite Sidebar nur der Inhalt rechts der Seitenleiste */
      .stage:not([data-stage="sidebar"]) .hm-side { display: none; }
    }

    /* ================================================== Handy (< 700) */
    @container (max-width: 699px) {
      /* wie der Injector: auf sehr schmalen Bildschirmen ohne CPU/RAM und Speicherplatz */
      .stage .hpv-sys { display: none; }
      .topbar { min-height: 54px; padding: 6px 12px; }
      .brand-short { max-width: none; font-size: 18px; }
      nav.areas.top, .topbar .tb-save, .topbar [data-tb-save], .topbar .changes, .topbar .state, .tb-sep { display: none; }
      .topbar .grow { order: 0; }
      .topbar .brand { display: flex; order: -1; flex: 1 1 0; min-width: 0; overflow: hidden; }
      .brand-short { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .stage .hm-bar { gap: 14px; }
      .stage .hm-bar .hm-tab:nth-of-type(n+2) { display: none; }
      .stage-foot .seg.inline button { font-size: 13px; padding: 0 8px; }
      .app[data-searching] .search { top: 8px; }
      .search-results { left: 8px !important; right: 8px; width: auto !important; }
      .dock { display: block; flex: 0 0 auto; position: relative; z-index: 22; background: var(--sh-card); border-top: 1px solid var(--sh-line); }
      .savebar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
      .savebar .changes, .savebar .state { flex: 1; }
      .savebar .changes .long { display: none; }
      .savebar .changes .short { display: inline; }
      .savebar .btn { height: 40px; padding: 0 12px; }
      .savebar .tb-icon { width: 40px; height: 40px; }
      nav.areas.bottom { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 6px 8px 8px; }
      nav.areas.bottom button { height: 44px; font-size: 13px; padding: 0 4px; }
      main { overflow: auto; }
      .stage-page[data-active] { display: flex; flex-direction: column; height: auto; min-height: 100%; }
      .stage-col { flex: 0 0 auto; padding: 12px 12px 8px; overflow: visible; }
      .stage-head { display: none; }
      .stage-frame { flex: 0 0 auto; min-height: 0; height: 300px; }
      .stage { border-radius: 12px; }
      .stage-foot { padding-top: 10px; gap: 8px 12px; }
      .stage[data-stage="sidebar"] .hm-main { display: none; }
      .stage[data-stage="sidebar"] .hm-side { max-width: 100%; flex: 1; }
      .stage[data-stage="sidebar"] .sbp { width: 100%; }
      .stage:not([data-stage="sidebar"]) .hm-side { display: none; }
      .stage .hpv-icon { display: inline-flex !important; }
      .ts-dash, .stage .hpv-body { padding: 14px 14px 52px; }
      .fields { border-left: 0; border-top: 1px solid var(--sh-line); border-radius: 18px 18px 0 0; flex: 1 0 auto; }
      .fields-body { overflow: visible; padding: 4px 16px 18px; }
      .fields-head { padding: 16px 16px 8px; }
      .fields-foot { padding: 12px 16px 14px; }
      .fields label.field:has(> .color-field) > .color-field, .rows label.field .color-field { width: 172px; }
      .rows label.field > select, .rows label.field > input { flex-basis: 172px; width: 172px; }
      .stage-foot .seg.inline { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
      .stage-foot .seg.inline button { padding: 0 10px; }
      .doc { padding: 16px 14px 28px; }
      .xfer-grid, .areas-grid { grid-template-columns: minmax(0, 1fr); }
      .welcome { padding: 20px 18px; }
      .welcome h2 { font-size: 24px; }
      .modal-card { padding: 18px; }
      .presets, .presets.three { grid-template-columns: minmax(0, 1fr); }
    }

    /* 1.4.6: Skala der Primaerfarbe unter dem Feld (Theme-Seite) */
    .primary-scale { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 10px; padding: 2px 0 8px; }
    .rows > .primary-scale { border-top: 0; }
    .primary-scale .ps-label { font-size: 12px; color: var(--sh-muted); }
    .primary-scale .ps-chips { display: flex; justify-content: flex-end; gap: 2px; width: min(240px, 52vw); }
    .primary-scale .ps-chips i { flex: 1 1 0; max-width: 22px; height: 14px; border-radius: 3px; background: var(--sh-line); box-shadow: inset 0 0 0 1px rgba(127,127,127,.25); }
    .primary-scale .ps-hint { grid-column: 1 / -1; font-size: 11.5px; color: var(--sh-muted); line-height: 1.35; }
    .primary-scale[data-empty] .ps-chips i { opacity: .35; }

    /* 1.4.7: Schatten-Baukasten */
    .shadow-box { display: flex; flex-direction: column; gap: 8px; }
    .shadow-box .shadow-body { display: none; flex-direction: column; gap: 8px; }
    .shadow-box[data-open] .shadow-body { display: flex; }
    .shadow-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .shadow-head .hint { margin: 0; }
    .shadow-demo { flex: 0 0 auto; width: 54px; height: 30px; border-radius: 8px; margin: 6px 10px 10px 0;
      background: var(--sh-card); border: 1px solid var(--sh-line); }
    .shadow-presets { display: flex; flex-wrap: wrap; gap: 6px; }
    .shadow-presets .chip { height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--sh-line);
      background: transparent; color: var(--sh-text); font: inherit; font-size: 13px; cursor: pointer; }
    .shadow-presets .chip:hover { border-color: var(--sh-accent); }
    .shadow-presets .chip[data-active] { border-color: var(--sh-accent); background: color-mix(in srgb, var(--sh-accent) 16%, transparent); }
    .shadow-controls { display: flex; flex-direction: column; gap: 8px; }
    .shadow-controls .grid2 { column-gap: 16px; }
    .shadow-controls select { min-width: 0; }
    .shadow-last { align-items: end; }
    .shadow-last input[type="color"] { width: 100%; height: 34px; padding: 2px; border-radius: 8px;
      border: 1px solid var(--sh-line); background: transparent; }
    .shadow-last label.check { padding-bottom: 6px; }

    /* 1.4.8: kompakte Gruppen (Diagrammfarben, Design-Tokens): zwei Spalten,
       Beschriftung ueber dem Feld */
    .rows.compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; border: 0; background: transparent; }
    .rows.compact > * + * { border-top: 0; }
    .rows.compact label.field { flex-direction: column; align-items: stretch; gap: 4px; padding: 6px 0; }
    .rows.compact label.field > span:first-child { font-size: 13px; }
    .rows.compact label.field .var-name { font-size: 10.5px; }
    .rows.compact label.field .color-field { width: 100%; }
    @container (max-width: 360px) { .rows.compact { grid-template-columns: minmax(0, 1fr); } }

    /* 1.4.8: weitere Kacheln der Theme-Vorschau */
    .ts-full { grid-column: 1 / -1; }
    .ts-chart { display: block; width: 100%; height: 92px; margin: 4px 0 6px; overflow: visible; }
    .ts-chart path { fill: none; stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    .ts-chart .ts-grid-line { stroke: var(--divider-color); stroke-width: 1px; }
    .ts-timeline { display: flex; height: 12px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;
      border: 1px solid var(--divider-color); }
    .ts-timeline .ts-unav { background-image: repeating-linear-gradient(45deg, transparent 0 3px, var(--divider-color) 3px 4px) !important; }
    .ts-swatches { display: grid; grid-template-columns: repeat(27, minmax(0, 1fr)); gap: 2px; }
    .ts-swatches i { height: 9px; border-radius: 2px; }
    .ts-energy { display: flex; align-items: stretch; gap: 6px; height: 96px; margin: 4px 0 8px; }
    .te-col { flex: 1 1 0; display: flex; flex-direction: column; gap: 2px; }
    .te-up { flex: 2 1 0; display: flex; flex-direction: column-reverse; border-bottom: 1px solid var(--divider-color); }
    .te-down { flex: 1 1 0; display: flex; flex-direction: column; }
    .te-up i, .te-down i { display: block; border-radius: 2px; margin: 1px 0; }
    .ts-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: .78em; color: var(--secondary-text-color); }
    .ts-legend span { display: inline-flex; align-items: center; gap: 4px; }
    .ts-legend i { width: 9px; height: 9px; border-radius: 50%; }
    .pv-editor .cm-comment { color: var(--codemirror-comment); }
    .pv-editor i { font-style: normal; }
    .pv-editor .cm-prop { color: var(--codemirror-property); }
    .pv-editor .cm-def { color: var(--codemirror-def); }
    .pv-editor .cm-str { color: var(--codemirror-string); }
    .pv-editor .cm-num { color: var(--codemirror-number); }
    .pv-editor .cm-atom { color: var(--codemirror-atom); }
    .pv-st[data-s="w-sunny"] { color: var(--state-weather-sunny-color); }
    .pv-st[data-s="w-partlycloudy"] { color: var(--state-weather-partlycloudy-color); }
    .pv-st[data-s="w-cloudy"] { color: var(--state-weather-cloudy-color); }
    .pv-st[data-s="w-rainy"] { color: var(--state-weather-rainy-color); }
    .pv-st[data-s="w-lightning"] { color: var(--state-weather-lightning-color); }
    .pv-st[data-s="w-snowy"] { color: var(--state-weather-snowy-color); }
    .pv-st[data-s="w-clear_night"] { color: var(--state-weather-clear_night-color); }
    .tc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
    .tc-btn { display: inline-flex; align-items: center; height: 30px; padding: 0 14px; font-size: .86em; font-weight: 500;
      border-radius: var(--ha-border-radius-pill, 9999px); }
    .tc-btn[data-v="primary-loud"] { background: var(--ha-color-fill-primary-loud-resting); color: var(--ha-color-on-primary-loud); }
    .tc-btn[data-v="primary-quiet"] { background: var(--ha-color-fill-primary-quiet-resting); color: var(--ha-color-on-primary-quiet); }
    .tc-btn[data-v="neutral-quiet"] { background: var(--ha-color-fill-neutral-quiet-resting); color: var(--ha-color-on-neutral-quiet); }
    .tc-btn[data-v="danger-loud"] { background: var(--ha-color-fill-danger-loud-resting); color: var(--ha-color-on-danger-loud); }
    .tc-chip { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; font-size: .8em;
      border-radius: var(--ha-border-radius-md, 8px); }
    .tc-chip ha-icon { --mdc-icon-size: 14px; }
    .tc-chip[data-v="success"] { background: var(--ha-color-fill-success-quiet-resting); color: var(--ha-color-on-success-quiet);
      border: 1px solid var(--ha-color-border-success-quiet); }
    .tc-chip[data-v="warning"] { background: var(--ha-color-fill-warning-quiet-resting); color: var(--ha-color-on-warning-quiet);
      border: 1px solid var(--ha-color-border-warning-quiet); }
    .tc-check { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; box-sizing: border-box;
      border-radius: var(--ha-border-radius-sm, 4px); border: var(--ha-border-width-md, 2px) solid var(--ha-color-border-neutral-normal); }
    .tc-check ha-icon { --mdc-icon-size: 14px; display: none; }
    .tc-check[data-on] { background: var(--ha-color-fill-primary-loud-resting); border-color: var(--ha-color-fill-primary-loud-resting);
      color: var(--ha-color-on-primary-loud); }
    .tc-check[data-on] ha-icon { display: flex; }
    .tc-input { display: inline-flex; flex-direction: column; justify-content: center; min-width: 120px; height: 38px; padding: 0 10px;
      box-sizing: border-box; background: var(--ha-color-form-background); color: var(--ha-color-text-primary);
      border-radius: var(--ha-border-radius-sm, 4px) var(--ha-border-radius-sm, 4px) 0 0;
      border-bottom: 1px solid var(--ha-color-border-neutral-loud); font-size: .86em; }
    .tc-input small { color: var(--ha-color-text-secondary); font-size: .78em; }
    .tc-surface { display: inline-flex; flex-direction: column; padding: 6px 12px; background: var(--ha-color-surface-default);
      border: var(--ha-border-width-sm, 1px) solid var(--ha-color-border-neutral-quiet); border-radius: var(--ha-border-radius-lg, 12px);
      box-shadow: var(--ha-box-shadow-m); color: var(--ha-color-on-surface-default); font-size: .86em; }
    .tc-surface span { color: var(--ha-color-text-secondary); font-size: .85em; }

    /* 1.4.8: Liste der Aenderungen */
    [data-changes]:not([data-clean]) { cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
    .chg-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
    .chg-page h3 { margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sh-muted); }
    .chg-page ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .chg-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr) auto; align-items: center; gap: 10px;
      padding: 8px 12px; border: 1px solid var(--sh-line); border-radius: 10px; }
    .chg-main { min-width: 0; display: flex; flex-direction: column; }
    .chg-main strong { font-weight: 600; font-size: 14px; line-height: 1.3; }
    .chg-where { font-size: 12px; color: var(--sh-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chg-vals { display: flex; align-items: center; gap: 6px; min-width: 0; font-family: var(--sh-mono); font-size: 12px; }
    .chg-vals > span { display: inline-flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; white-space: nowrap; }
    .chg-vals span span { overflow: hidden; text-overflow: ellipsis; }
    .chg-old { color: var(--sh-muted); }
    .chg-arrow { flex: 0 0 auto; color: var(--sh-muted); }
    .chg-empty { font-style: italic; }
    .chg-sw { flex: 0 0 auto; width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--sh-line-strong); }
    .chg-act { display: flex; gap: 4px; }
    .chg-act .flat { height: 30px; padding: 0 10px; font-size: 13px; }
    .chg-none { color: var(--sh-muted); }
    @media (max-width: 640px) {
      .chg-row { grid-template-columns: minmax(0, 1fr); }
    }
    /* 1.4.8: Kontrast-Hinweis unter einem Textfeld */
    .contrast-warn { margin: -2px 0 6px; padding: 6px 10px; border-radius: 8px; font-size: 12.5px; line-height: 1.4;
      color: var(--sh-text); background: color-mix(in srgb, var(--sh-warn) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--sh-warn) 45%, transparent); }
    .contrast-warn::before { content: "⚠ "; color: var(--sh-warn); }
    .rows .contrast-warn { margin: 0 0 8px; }
    .rows.compact .contrast-warn { grid-column: 1 / -1; }
    .rows > .contrast-warn { border-top: 1px solid color-mix(in srgb, var(--sh-warn) 45%, transparent); }
    /* 1.4.8: Farb-Schnellwahl */
    .qc-pop { position: fixed; z-index: 80; box-sizing: border-box; padding: 8px 10px 10px; border-radius: 12px;
      background: var(--sh-card); border: 1px solid var(--sh-line-strong); box-shadow: 0 10px 30px rgba(0, 0, 0, .35); }
    .qc-pop[hidden] { display: none; }
    .qc-cap { display: block; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--sh-muted); margin: 2px 0 6px; }
    .qc-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
    .qc { width: 22px; height: 22px; padding: 0; border-radius: 6px; cursor: pointer;
      background: linear-gradient(var(--qc), var(--qc)), repeating-conic-gradient(#bbb 0 25%, #fff 0 50%) 50% / 8px 8px;
      border: 1px solid var(--sh-line-strong); }
    .qc:hover { outline: 2px solid var(--sh-accent); outline-offset: 1px; }

    /* 1.4.8: Menuepunkte bearbeiten */
    .mlist li.mentry[data-custom] .row-title strong::after { content: " •"; color: var(--sh-accent); }
    .mlist li.mentry-edit { display: flex; flex-direction: column; gap: 6px; margin: -4px 0 4px; padding: 10px 12px 12px;
      border: 1px solid var(--sh-accent); border-top: 0; border-radius: 0 0 10px 10px; background: var(--sh-card); }
    .mlist li.mentry-edit .rows { margin-top: 4px; }
    .mentry-edit-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px; }
    .mentry-edit-foot .flat { height: 30px; padding: 0 12px; font-size: 13px; flex: 0 0 auto; }
    .mlist li.mentry:has(+ li.mentry-edit) { border-color: var(--sh-accent); border-radius: 10px 10px 0 0; }

    /* 1.4.8: eigene Werte im Systemmonitor */
    .sensor-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .sensor-list .sensor-row { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 6px 10px; padding: 10px 12px;
      border: 1px solid var(--sh-line); border-radius: 10px; background: var(--sh-card); }
    .sensor-list .sensor-row label.field { flex-direction: column; align-items: stretch; gap: 4px; }
    .sensor-list .sensor-row label.field > span { font-size: 13px; }
    .sensor-list .sensor-row input { width: 100%; min-width: 0; }
    .sensor-list .sensor-row label.field { margin: 0; }
    .sensor-list .sensor-foot { grid-column: 1 / -1; display: flex; align-items: center; gap: 4px; }
    .sensor-list .sensor-now { flex: 1 1 auto; color: var(--sh-muted); font-family: var(--sh-mono); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sensor-list .sensor-empty { color: var(--sh-muted); font-size: 13px; padding: 4px 2px; }
    .mpv[data-many] .mpv-grid { display: flex; flex-wrap: wrap; margin: 0 -1px -1px 0; }
    .mpv[data-many] .mpv-cell { flex: 1 1 110px; border-inline-start: 0; border-inline-end: 1px solid var(--divider-color);
      border-bottom: 1px solid var(--divider-color); }
    .mpv-actions { display: flex; justify-content: flex-end; padding: 6px 10px; border-top: 1px solid var(--divider-color); }
    .mpv-actions[hidden] { display: none; }
    .mpv-btn { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 500;
      color: var(--primary-color); border: 1px solid color-mix(in srgb, var(--primary-color) 55%, transparent); }

    /* 1.4.9: Weg zur Seite Sidebar unten links im Vorschaubild */
    .stage-side-goto { position: absolute; left: 14px; bottom: 14px; z-index: 2; }
    /* 1.4.9: Untertitel der Menuepunkte in der Vorschau */
    .spv-text small { font-size: 12px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* 1.4.9: nur eigene Werte im Systemmonitor */
    .mpv[data-own-only] .mpv-cell:not([data-kind="sensor"]) { display: none; }
    /* 1.4.9: einzelne Bedienelemente anklickbar */
    .stage [data-ctl] { cursor: pointer; outline: 2px solid transparent; outline-offset: 2px; transition: outline-color .15s; }
    /* 1.5.0: nur das innerste Element unter der Maus umranden */
    .stage [data-ctl]:hover:not(:has([data-ctl]:hover)) { outline-color: color-mix(in srgb, var(--sh-accent) 55%, transparent); }
    .stage .pv-table [data-ctl], .stage .pv-scrim > [data-ctl], .stage .ts-timeline[data-ctl], .stage .ts-swatches [data-ctl],
    .stage .ts-energy [data-ctl] { outline-offset: -2px; }
    .stage [data-ctl][data-ctl-on] { outline-color: var(--sh-accent); }

    /* 1.5.1: Schnellwahl "transparent" */
    .qc-named { display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 10px 0 4px; border-radius: 8px; cursor: pointer;
      border: 1px solid var(--sh-line); background: transparent; color: inherit; font: inherit; font-size: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; }
    .qc-named:hover { border-color: var(--sh-accent); }
    .qc-named .qc { pointer-events: none; }

    /* 1.5.1: PopUp-Links - Dialog, Eintrag, Vorschau */
    #add-modal .add-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    #add-popup-part { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--sh-line); }
    #add-popup-part[hidden] { display: none; }
    .add-popup-list, .pe-list { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
    .apl { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 10px; border: 1px solid var(--sh-line); border-radius: 10px; }
    .apl-icon, .pe-icon { flex: none; display: flex; color: var(--sh-accent); }
    .apl-icon ha-icon, .pe-icon ha-icon { --mdc-icon-size: 20px; }
    .apl-name { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 13px; }
    .apl-name small, .pe-path { color: var(--sh-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .apl-empty, .pe-empty { color: var(--sh-muted); font-size: 13px; padding: 4px 2px; }
    .add-popup-error, .pe-error { margin: 8px 0 0; font-size: 13px; }
    .popup-edit { margin: 4px 0 14px; padding: 12px; border: 1px solid var(--sh-line); border-radius: 12px; }
    .pe-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .pe-head h4 { margin: 0; font-size: 14px; }
    .pe-row { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; grid-template-areas: "ic name name" "ic icon btns" "ic path path";
      align-items: center; gap: 6px 10px; padding: 8px 8px 6px; border: 1px solid var(--sh-line); border-radius: 10px; }
    .pe-row .pe-icon { grid-area: ic; align-self: start; margin-top: 8px; }
    .pe-row .pe-name { grid-area: name; }
    .pe-row .pe-ic { grid-area: icon; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
    .pe-row .pe-btns { grid-area: btns; display: flex; gap: 2px; }
    .pe-row .pe-path { grid-area: path; }
    .pe-row input { min-width: 0; width: 100%; box-sizing: border-box; }
    .pe-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 10px; align-items: center; }
    .pe-add select, .pe-add input { min-width: 0; width: 100%; box-sizing: border-box; }
    .pe-add input { grid-column: 1 / -1; grid-row: 2; }
    .pe-add input[hidden] { display: none; }
    .popup-edit .field-hint { display: block; margin-top: 10px; }
    /* Vorschau des PopUp-Fensters ueber dem angedeuteten Dashboard */
    .ppv { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; padding: 16px;
      --ppv-c: var(--primary-color, #03a9f4); }
    .ppv-scrim { position: absolute; inset: 0; background: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, .45)); }
    .ppv-card { position: relative; box-sizing: border-box; width: min(440px, 100%); max-height: calc(100% - 24px); overflow: auto;
      padding: 14px 14px 16px; border-radius: 20px; background: var(--ha-dialog-surface-background, var(--card-background-color));
      color: var(--primary-text-color); box-shadow: 0 18px 40px rgba(0, 0, 0, .35); }
    .ppv-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .ppv-head strong { flex: 1; min-width: 0; font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ppv-ic { flex: none; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      color: var(--ppv-c); background: color-mix(in srgb, var(--ppv-c) 16%, transparent); }
    .ppv-x { opacity: .7; display: flex; }
    .ppv-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .ppv-tile { flex: 1 1 calc((100% - (var(--ppv-cols, 3) - 1) * 8px) / var(--ppv-cols, 3)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 80px; padding: 8px 6px;
      box-sizing: border-box; border-radius: var(--ha-card-border-radius, 12px); border: 1px solid var(--divider-color);
      background: color-mix(in srgb, var(--primary-text-color) 4%, transparent); text-align: center; font-size: 11.5px; line-height: 1.25; }
    .ppv-ti { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: var(--ppv-c); background: color-mix(in srgb, var(--ppv-c) 16%, transparent); }
    .ppv-ti ha-icon, .ppv-ic ha-icon { --mdc-icon-size: 20px; }
    .ppv-tn { overflow-wrap: anywhere; }
    .ppv-empty { grid-column: 1 / -1; margin: 4px 0; opacity: .7; font-size: 12px; }
    .ppv-tag { position: absolute; left: 14px; bottom: 14px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700;
      background: var(--sh-accent); color: var(--sh-on-accent, #fff); }
    /* Einblenden nur beim ersten Erscheinen - der Inhalt wird bei jeder Aenderung neu gebaut */
    .ppv { animation: ppv-in .16s ease; }
    @keyframes ppv-in { from { opacity: 0; } }

    /* 1.5.2: Seite Sidebar - Dashboard-Karten angedeutet wie auf der Seite Header */
    .hm-sketch { background: var(--lovelace-background, var(--primary-background-color)); }
    .stage .hm-sketch-cards { cursor: pointer; }
    .stage .hm-sketch-cards .hpv-card { opacity: .8; transition: opacity .15s; }
    .stage .hm-sketch-cards:hover .hpv-card { opacity: 1; }
    /* 1.5.2: Bedienhinweis im Dialog "PopUp Link" */
    .modal-card .hint.add-popup-use { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px;
      background: color-mix(in srgb, var(--sh-accent) 10%, transparent); font-size: 14px; }
    .add-popup-use ha-icon { --mdc-icon-size: 20px; color: var(--sh-accent); flex: none; margin-top: 1px; }
    /* 1.5.3: PopUp mit Karte - Inhalt, Fenstergroesse, YAML-Feld */
    .add-popup-kind { margin-top: 12px; }
    #add-popup-links[hidden], .modal-card .hint.add-popup-use[hidden] { display: none; }
    .pe-top { margin: 4px 0 10px; display: grid; gap: 10px; }
    .pe-top .field > .cap { display: block; margin-bottom: 6px; }
    .add-popup-kind > .cap { display: block; margin-bottom: 6px; }
    .pe-top .field-hint { margin-top: -4px; }
    .pe-kind { max-width: 100%; }
    .pe-yaml { display: block; width: 100%; box-sizing: border-box; min-height: 220px; resize: vertical; tab-size: 2;
      font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.45; white-space: pre; overflow: auto; }
    .pe-yaml-state { margin-top: 8px; padding: 6px 10px; border-radius: 8px; font-size: 13px; color: var(--sh-muted);
      background: color-mix(in srgb, var(--sh-text) 5%, transparent); overflow-wrap: anywhere; }
    .pe-yaml-state[data-ok] { color: var(--sh-text); background: color-mix(in srgb, #2e7d32 16%, transparent); }
    .pe-yaml-state[data-error] { color: var(--sh-text); background: color-mix(in srgb, #c62828 16%, transparent); }
    /* Vorschau: Breite/Hoehe wie eingestellt, verkleinert wie das Vorschaubild */
    .ppv .ppv-card { width: min(calc(var(--ppv-w, 560px) * .8), 100%); }
    .ppv[data-height] .ppv-card { height: min(calc(var(--ppv-h) * .8), calc(100% - 24px)); }
    .ppv .ppv-card { scrollbar-width: none; }
    .ppv .ppv-card::-webkit-scrollbar, .ppv-cardbox::-webkit-scrollbar { display: none; }
    .ppv[data-card] .ppv-card { display: grid; grid-template-rows: auto minmax(0, 1fr); }
    .ppv-cardbox { display: grid; min-height: 40px; overflow: auto; scrollbar-width: none; }
    .ppv-cardbox > * { display: block; min-width: 0; }
    .ppv[data-height] .ppv-cardbox > * { height: 100%; }
    .ppv-cardph { padding: 18px 8px; text-align: center; border: 1px dashed var(--divider-color); border-radius: 12px; }
    /* 1.5.4: Sensor in der Kopfzeile (Vorschau), Seite oder Sensor im Dialog */
    .hpv-own.hpv-sensor { align-items: center; gap: .3em; white-space: nowrap; }
    .hpv-own.hpv-sensor b { font-size: .62em; font-weight: 600; font-variant-numeric: tabular-nums; }
    .add-link-kind { margin: 10px 0 2px; }
    .add-link-kind > .cap { display: block; margin-bottom: 6px; }
    .add-link-kind[hidden], #add-link-entity-part[hidden], #add-link-page-part[hidden] { display: none; }
    #add-link-entity-part .field-hint { display: block; margin-top: 6px; }
    .hlinks li.hlink.fav.sensor .fav-extra label.check { margin: 6px 0 4px; font-size: 14px; }
    .hlinks li.hlink.fav.sensor .fav-extra .field-hint { display: block; margin-top: 4px; }
    /* aufgeklappte Zeile: Felder untereinander - die Flex-Basis der Zeile (110 px) waere sonst ihre Hoehe */
    .hlinks .fav-extra label.field > input[type="text"], .hlinks .fav-extra label.field > ha-icon-picker { flex: 0 0 auto; }
    /* 1.5.5: Vorschau der Seite einer Integration (HA-Settings, Listenansicht) */
    .epv { box-sizing: border-box; width: 100%; max-width: 880px; margin: 18px auto 0; font-size: 12px; color: var(--primary-text-color); }
    .epv[hidden] { display: none; }
    .epv-cap { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--secondary-text-color); margin-bottom: 8px; }
    .epv-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .epv-head strong { display: block; font-size: 15px; font-weight: 500; }
    .epv-head small, .epv-row small { display: block; color: var(--secondary-text-color); font-size: 10.5px; }
    .epv-logo { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #7cb342, #33691e); flex: none; }
    .epv-sec { margin: 10px 0 5px 6px; font-size: 11px; font-weight: 500; color: var(--secondary-text-color); }
    .epv-entry { margin-bottom: var(--egap, 6px); overflow: hidden; box-sizing: border-box;
      border: var(--ebw, 1px) solid var(--ebc, var(--divider-color)); border-radius: var(--ebr, 10px);
      background: var(--ebg, var(--card-background-color)); }
    .epv-entry.epv-error { border-color: var(--eec, var(--divider-color));
      background: var(--eerr, color-mix(in srgb, var(--error-color, #db4437) 16%, var(--card-background-color))); }
    .epv-entry.epv-warn { border-color: var(--eec, var(--divider-color));
      background: var(--ewarn, color-mix(in srgb, var(--warning-color, #ffa600) 16%, var(--card-background-color))); }
    .epv-row { display: flex; align-items: center; gap: 10px; min-height: var(--erow, 40px); padding: 3px 12px; box-sizing: border-box; }
    .epv-row b { font-weight: 500; }
    .epv-dev { padding-left: 26px; border-top: 1px solid color-mix(in srgb, var(--divider-color) 60%, transparent); }
    .epv-dev-ic { width: 14px; height: 11px; border: 1.5px solid var(--secondary-text-color); border-radius: 2px; flex: none; opacity: .8; }
    .epv-msg { display: flex !important; align-items: center; gap: 4px; font-weight: 700; }
    .epv-msg i { display: inline-flex; align-items: center; justify-content: center; width: 11px; height: 11px; border-radius: 50%;
      background: var(--error-color, #db4437); color: #fff; font-style: normal; font-size: 8px; }

  `;

  /* ------------------------------------------------------------------ *
   * YAML - nur so viel davon, wie ein Home-Assistant-Theme braucht
   * ------------------------------------------------------------------ */

  /**
   * Ein Theme ist eine flache Liste "variable: wert", optional mit einem
   * modes-Block. Mehr muss hier nicht verstanden werden, und eine echte
   * YAML-Bibliothek kommt nicht in Frage: die Integration wird ohne
   * Build-Schritt ausgeliefert.
   *
   * Beherrscht wird: verschachtelte Bloecke ueber die Einrueckung, Kommentare,
   * einfache und doppelte Anfuehrungszeichen, Anker (&name) und Verweise
   * (*name), sowie Blockskalare (| und >), deren Inhalt uebersprungen wird -
   * darin steht bei card-mod-Themes fertiges CSS, das sonst als Schluessel
   * missverstanden wuerde.
   */
  const parseYaml = (text) => {
    const lines = String(text || "").replace(/\t/g, "  ").split(/\r?\n/);
    const root = {};
    // Jeder Eintrag: das Objekt, in das auf dieser Einrueckung geschrieben wird
    const stack = [{ indent: -1, node: root }];
    const anchors = {};
    let skipIndent = null;

    const unquote = (raw) => {
      const value = raw.trim();
      if (value.length > 1 && value[0] === '"' && value[value.length - 1] === '"') {
        return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      if (value.length > 1 && value[0] === "'" && value[value.length - 1] === "'") {
        return value.slice(1, -1).replace(/''/g, "'");
      }
      return value;
    };

    /** Kommentar abschneiden, aber nur ausserhalb von Anfuehrungszeichen. */
    const stripComment = (raw) => {
      let quote = null;
      for (let i = 0; i < raw.length; i += 1) {
        const char = raw[i];
        if (quote) {
          if (char === quote) {
            quote = null;
          }
        } else if (char === '"' || char === "'") {
          quote = char;
        } else if (char === "#" && (i === 0 || /\s/.test(raw[i - 1]))) {
          return raw.slice(0, i);
        }
      }
      return raw;
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) {
        continue;
      }
      const indent = line.length - line.replace(/^ +/, "").length;

      // Rumpf eines Blockskalars - alles Eingerueckte gehoert dazu
      if (skipIndent !== null) {
        if (indent > skipIndent) {
          continue;
        }
        skipIndent = null;
      }

      const trimmed = line.trim();
      if (trimmed[0] === "#" || trimmed[0] === "-") {
        // Kommentarzeile oder Listeneintrag - Themes haben keine Listen
        continue;
      }

      const colon = trimmed.indexOf(":");
      if (colon < 0) {
        continue;
      }
      const key = unquote(trimmed.slice(0, colon)).trim();
      if (!key) {
        continue;
      }
      // Kommentar sofort abschneiden: sonst wird aus "Mein Theme:   # Name"
      // ein leerer Wert statt des Beginns eines Blocks.
      const rawRest = trimmed.slice(colon + 1).trim();
      let rest = stripComment(rawRest).trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].node;

      // Anker merken / Verweis aufloesen
      let anchor = null;
      const anchorMatch = rest.match(/^&([^\s]+)\s*(.*)$/);
      if (anchorMatch) {
        anchor = anchorMatch[1];
        rest = anchorMatch[2].trim();
      }
      const aliasMatch = rest.match(/^\*([^\s]+)\s*$/);
      if (aliasMatch) {
        rest = anchors[aliasMatch[1]] === undefined ? "" : anchors[aliasMatch[1]];
        parent[key] = rest;
        continue;
      }

      if (rest === "|" || rest === ">" || /^[|>][-+]?\d*$/.test(rest)) {
        // Blockskalar: Inhalt ueberspringen, der Schluessel selbst bleibt leer
        skipIndent = indent;
        parent[key] = "";
        continue;
      }

      // "primary-color: #03a9f4" ist in YAML streng genommen ein Kommentar und
      // damit ein leerer Wert. Von Hand geschriebene Themes machen das
      // staendig, und gemeint ist offensichtlich die Farbe - also vor dem
      // Block-Zweig abfangen.
      const bareColor = rest === "" && rawRest.match(/^(#[0-9a-fA-F]{3,8})(?:\s+#.*)?\s*$/);
      if (bareColor) {
        if (anchor) {
          anchors[anchor] = bareColor[1];
        }
        parent[key] = bareColor[1];
        continue;
      }

      if (rest === "") {
        // Beginn eines verschachtelten Blocks
        const node = {};
        parent[key] = node;
        stack.push({ indent: indent, node: node });
        continue;
      }

      const value = unquote(rest);
      if (anchor) {
        anchors[anchor] = value;
      }
      parent[key] = value;
    }

    return root;
  };

  const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

  /**
   * Aus dem geparsten Baum die Themes herausziehen. Erlaubt sind:
   *   frontend: -> themes: -> <Name>: ...     (configuration.yaml)
   *   themes:   -> <Name>: ...
   *   <Name>:   ...                           (eine themes/*.yaml)
   *   primary-color: ...                      (nur der Rumpf eines Themes)
   */
  const themesFromYaml = (tree, fallbackName) => {
    let container = tree;
    if (isPlainObject(container.frontend) && isPlainObject(container.frontend.themes)) {
      container = container.frontend.themes;
    } else if (isPlainObject(container.themes)) {
      container = container.themes;
    }

    const keys = Object.keys(container);
    const scalars = keys.filter((k) => !isPlainObject(container[k]));
    // Ein leerer Block ("default_config:") ist kein Theme.
    const objects = keys.filter(
      (k) => isPlainObject(container[k]) && Object.keys(container[k]).length > 0
    );

    const build = (name, body) => {
      const base = {};
      Object.keys(body).forEach((key) => {
        if (key !== "modes" && !isPlainObject(body[key])) {
          base[key] = body[key];
        }
      });
      const modes = isPlainObject(body.modes) ? body.modes : {};
      const mode = (which) => {
        const out = {};
        if (isPlainObject(modes[which])) {
          Object.keys(modes[which]).forEach((key) => {
            if (!isPlainObject(modes[which][key])) {
              out[key] = modes[which][key];
            }
          });
        }
        return out;
      };
      return { name: name, base: base, light: mode("light"), dark: mode("dark") };
    };

    // Stehen direkt CSS-Variablen auf der obersten Ebene, ist die Datei der
    // Rumpf eines einzelnen Themes und hat gar keinen Namen. Ein einzelner
    // Streuwert neben echten Theme-Bloecken soll das aber nicht ausloesen,
    // deshalb muss der Schluessel wie ein Variablenname aussehen.
    const looksLikeVariable = (key) => /^[a-z][a-z0-9_-]*$/.test(key) && key.indexOf("-") > 0;
    if (scalars.some(looksLikeVariable) && !objects.length) {
      return [build(fallbackName, container)];
    }
    if (scalars.some(looksLikeVariable) && objects.every((k) => k === "modes")) {
      return [build(fallbackName, container)];
    }
    return objects
      .filter((name) => name !== "modes")
      .map((name) => build(name, container[name]));
  };

  /* ------------------------------------------------------------------ *
   * Buehnen-Layout: Seiten, Elemente der Theme-Vorschau, Links
   * ------------------------------------------------------------------ */

  const PAGES = ["layout", "items", "look", "theme", "header", "settings", "transfer", "info"];
  // Theme-Seite: welches Element im Vorschaubild welche Gruppen oeffnet
  // (Namen wie in THEME_GROUPS.en, die erste ist die aufgeklappte).
  const THEME_SPOTS = {
    // Die erste Gruppe wird aufgeklappt, die anderen stehen zugeklappt mit zur
    // Auswahl (Reihenfolge rechts wie in THEME_GROUPS). Grundfarben (1.4.7):
    // bei Karten und Card-Design, nicht mehr bei Regler und Badges.
    cards: ["Backgrounds", "Cards", "States and icons", "Base colors"],
    sliders: ["Sliders and badges"],
    states: ["State colors: devices", "State colors: climate", "State colors: security", "State colors: weather"],
    weather: ["State colors: weather"],
    charts: ["Charts"],
    energy: ["Energy"],
    controls: ["Design tokens: fills", "Design tokens: content on fills", "Design tokens: text and surfaces",
      "Design tokens: borders", "Design tokens: corners and shadows", "Switches"],
    devices: ["State colors: devices"],
    climate: ["State colors: climate"],
    security: ["State colors: security"],
    table: ["Tables and inputs"],
    inputs: ["Tables and inputs"],
    status: ["Status colors"],
    dialog: ["Dialogs and code", "Code editor"],
    text: ["Text", "Typography"],
    dash: ["Dashboard background", "Backgrounds"],
    design: ["Cards", "Base colors"],
  };
  const PROJECT_LINKS = {
    github: "https://github.com/jayjojayson/ha_style_hub",
    issues: "https://github.com/jayjojayson/ha_style_hub/issues",
    docs: "https://jayjojayson.github.io/ha_style_hub/",
    kofi: "https://ko-fi.com/jayjojayson",
    paypal: "https://www.paypal.me/quadFlyerFW",
  };
  // Die zuletzt offene Seite - wie der Klappzustand eine Ansichtssache des
  // Browsers, keine Einstellung.
  const PAGE_KEY = "ha-style-hub-page";
  const readPage = () => {
    try {
      const page = window.localStorage.getItem(PAGE_KEY);
      return PAGES.indexOf(page) >= 0 ? page : "";
    } catch (err) {
      return "";
    }
  };
  const writePage = (page) => {
    try {
      window.localStorage.setItem(PAGE_KEY, page);
    } catch (err) {
      // Privater Modus - dann eben nicht gemerkt.
    }
  };
  // Gruppen, die man per Hand auf- oder zugeklappt hat: {id: offen}
  const GROUPS_KEY = "ha-style-hub-groups";
  const readGroups = () => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(GROUPS_KEY) || "{}");
      const out = {};
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        Object.keys(raw).forEach((id) => {
          if (typeof raw[id] === "boolean") {
            out[id] = raw[id];
          }
        });
      }
      return out;
    } catch (err) {
      return {};
    }
  };
  // Akkordeon an (Standard) oder aus - eine Ansichtssache des Browsers
  const ACCORDION_KEY = "ha-style-hub-accordion";
  // Wo der Schalter steht und das Akkordeon gilt
  const ACCORDION_FIELDS = '[data-fields="theme"], [data-fields="header"], [data-fields="settings"], [data-fields="look"]';
  const readAccordion = () => {
    try {
      return window.localStorage.getItem(ACCORDION_KEY) !== "off";
    } catch (err) {
      return true;
    }
  };
  const writeAccordion = (on) => {
    try {
      window.localStorage.setItem(ACCORDION_KEY, on ? "on" : "off");
    } catch (err) {
      // Privater Modus - dann eben nicht gemerkt.
    }
  };
  const writeGroups = (map) => {
    try {
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify(map));
    } catch (err) {
      // Privater Modus - dann eben nicht gemerkt.
    }
  };

  class SidebarHubPanel extends HTMLElement {
    static generatePalette(color, options) {
      return generatePalette(color, options);
    }
    static contrast(a, b) {
      return contrastOf(a, b);
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = normalize(null);
      this._saved = normalize(null);
      this._entries = [];
      this._entrySignature = "";
      // Merkt sich, welche Seite der Seitenleiste zuletzt offen war.
      this._sidebarTab = "layout";
      this._ready = false;
      this._dirty = false;
      this._loaded = false;
      this._dragKey = null;
      // Mode being edited on the theme page.
      this._mode = "dark";
      // Themes, die im Import-Dialog gefunden wurden
      this._themeCandidates = [];
      // Wurde beim Ziehen weit genug nach rechts gegangen?
      this._dragIndent = false;
      // Steht das Icon-Auswahlfeld von Home Assistant zur Verfuegung?
      this._iconPicker = false;
      // Zuletzt offene Seite (Ansichtssache des Browsers), sonst die Info.
      this._tab = readPage() || "info";
      if (this._groupOf(this._tab) === "sidebar") {
        this._sidebarTab = this._tab;
      }
      // Gewaehlter Abschnitt je Seite
      this._secs = {
        look: "colors",
        theme: String(Math.max(0, THEME_GROUPS.findIndex((group) => group.en === "Backgrounds"))),
        header: "color",
        settings: "menu",
      };
      // Gewaehlter Eintrag, Ansicht der Vorschau, "Vorher"
      this._selKey = null;
      this._showHidden = true;
      this._sbpState = "open";
      this._before = false;
      // Gruppen auf/zu, Einfach/Alle, gewaehltes Element im Theme-Bild
      this._grpOpen = {};
      this._grpUser = readGroups();
      this._headerView = "simple";
      this._themeView = "simple";
      this._settingsView = "simple";
      // Akkordeon: immer nur eine Gruppe offen (Standard), siehe ACCORDION_KEY
      this._accordion = readAccordion();
      this._themeSpot = "cards";
      this._pageTopic = "menu";
      // Eintraege auf Tablet und Handy: der gewaehlte Eintrag oder die Liste
      this._itemsView = "entry";
      this._ctile = "";
    }

    /* ------------------------------------------------ properties from HA */

    set hass(hass) {
      const first = !this._hass;
      const panelsChanged = !first && this._lastPanels !== hass.panels;
      this._hass = hass;
      this._lastPanels = hass && hass.panels;
      if (first) {
        this._renderShell();
        this._load();
      } else if (this._ready) {
        if (this._lastDock !== hass.dockedSidebar) {
          this._lastDock = hass.dockedSidebar;
          this._applyNarrow();
        }
      }
      if (this._ready && hass && hass.themes !== this._lastThemes) {
        // Anderes Theme oder Hell/Dunkel gewechselt: die Schrift auf der
        // Primaerfarbe neu bestimmen, sobald die Variablen gesetzt sind.
        this._lastThemes = hass.themes;
        window.requestAnimationFrame(() => this._applyAccentInk());
      }
      if (!first && this._ready && panelsChanged) {
        // hass is handed over on every state change - only rebuild the entry
        // list when the set of panels itself changed.
        this._syncEntries();
      }
    }

    get hass() {
      return this._hass;
    }

    set narrow(value) {
      this._narrow = !!value;
      this._applyNarrow();
    }

    /**
     * The button is needed whenever Home Assistant does not show the sidebar
     * by itself: on a narrow screen, or with "always hide the sidebar" turned
     * on in the profile. Same condition Home Assistant uses for its own menu
     * button (components/ha-menu-button.ts).
     */
    _applyNarrow() {
      const hidden =
        this._hass && this._hass.dockedSidebar === "always_hidden";
      this.shadowRoot.querySelectorAll(".menu-button").forEach((button) => {
        button.hidden = !(this._narrow || hidden);
      });
    }

    set panel(value) {
      this._panel = value;
    }

    set route(value) {
      this._route = value;
    }

    /* ------------------------------------------------------------ i18n */

    get _t() {
      const language = (this._hass && this._hass.language) || "en";
      return language.toLowerCase().startsWith("de") ? STRINGS.de : STRINGS.en;
    }

    get _de() {
      const language = (this._hass && this._hass.language) || "en";
      return language.toLowerCase().startsWith("de");
    }

    /* ------------------------------------------------------- data flow */

    async _load() {
      try {
        const result = await this._hass.connection.sendMessagePromise({
          type: "ha_style_hub/get",
        });
        this._config = normalize(result && result.config);
        // Nebenher, ohne das Laden der Seite aufzuhalten
        this._loadIconPicker().then((ok) => {
          this._iconPicker = ok;
          if (ok && this._ready) {
            this._renderItems();
            // Auch die Link-Listen bekommen das Auswahlfeld (1.5.4)
            this._renderLinkList("header");
            this._renderLinkList("favorites");
            this._renderMenuEntries();
          }
        });
        this._loadFailed = false;
      } catch (err) {
        // The page shows the defaults, but they must never be saved: that
        // would replace the real configuration with an empty one.
        console.error("[HA Style Hub]", "could not read the configuration", err);
        this._config = normalize(null);
        this._loadFailed = true;
        this._flash(this._t.load_failed, true);
      }
      this._loaded = true;
      this._dirty = false;
      // Erst die Liste aufbauen: _tidyParents() raeumt unmoegliche Zuordnungen
      // auf. Der gespeicherte Stand nimmt das mit, sonst zeigte der Zaehler
      // eine Aenderung, die "Verwerfen" nie wegbekommt.
      this._syncEntries(true);
      this._saved = clone(this._config);
      this._undoStack = [];
      this._redoStack = [];
      this._undoReset();
      this._fillInputs();
      this._updateFooter();
    }

    async _save() {
      // Nothing was loaded (yet): what is on the page are the defaults, and
      // saving them would wipe the stored configuration.
      if (!this._loaded || this._loadFailed) {
        this._flash(this._t.load_failed, true);
        return;
      }
      const buttons = this.shadowRoot.querySelectorAll('[data-action="save"]');
      buttons.forEach((button) => {
        button.disabled = true;
      });
      try {
        this._config.order = this._entries.map((entry) => entry.key);
        await this._takeSwitches();
        const result = await this._hass.connection.sendMessagePromise({
          type: "ha_style_hub/save",
          config: this._config,
        });
        // The server answers with what it really stored (numbers of the theme
        // as text, an empty theme name replaced by the default, ...). Working
        // on with that keeps this page and the history in step - otherwise the
        // newest entry of the history would not be recognised as the current
        // state.
        if (result && isObject(result.config)) {
          this._config = normalize(result.config);
          this._fillInputs();
        }
        this._saved = clone(this._config);
        this._dirty = false;
        this._undoReset();
        this._flash(this._t.saved);
      } catch (err) {
        console.error("[HA Style Hub]", "saving failed", err);
        this._flash(String((err && err.message) || err), true);
      }
      buttons.forEach((button) => {
        button.disabled = false;
      });
      this._updateFooter();
    }

    /**
     * "Hide the header" and "hide the sidebar" are also switch entities. They
     * can change on the server while this page is open; saving the value the
     * page loaded earlier would silently switch them back. So right before a
     * save the two are read again and taken over - unless they were changed
     * on this page, then the page wins.
     */
    async _takeSwitches() {
      try {
        const result = await this._hass.connection.sendMessagePromise({
          type: "ha_style_hub/get",
        });
        const server = result && isObject(result.config) ? result.config : null;
        if (!server) {
          return;
        }
        [
          ["header", "hidden"],
          ["layout", "hide_sidebar"],
        ].forEach(([section, key]) => {
          const remote = isObject(server[section]) ? server[section][key] : undefined;
          if (typeof remote !== "boolean") {
            return;
          }
          if (!!this._config[section][key] === !!this._saved[section][key]) {
            this._config[section][key] = remote;
          }
        });
      } catch (err) {
        // Without the answer the page saves what it has, as before.
      }
    }

    async _reset() {
      if (!window.confirm(this._t.reset_confirm)) {
        return;
      }
      try {
        const result = await this._hass.connection.sendMessagePromise({
          type: "ha_style_hub/reset",
        });
        this._config = normalize(result && result.config);
        this._dirty = false;
        this._syncEntries(true);
        this._saved = clone(this._config);
        this._undoStack = [];
        this._redoStack = [];
        this._undoReset();
        this._fillInputs();
        this._updateFooter();
      } catch (err) {
        console.error("[HA Style Hub]", "reset failed", err);
        this._flash(String((err && err.message) || err), true);
      }
    }

    _revert() {
      // Auch "Verwerfen" laesst sich mit Strg+Z zuruecknehmen (1.4.9).
      this._undoStack = (this._undoStack || []).concat([JSON.stringify(this._config)]).slice(-UNDO_MAX);
      this._redoStack = [];
      this._config = clone(this._saved);
      this._undoReset();
      this._themeSynced = null;
      this._dirty = false;
      this._syncEntries(true);
      this._fillInputs();
      this._preview();
      this._updateFooter();
    }

    /** Hand the current configuration to the injector without saving. */
    _preview() {
      this._config.order = this._entries.map((entry) => entry.key);
      window.dispatchEvent(
        new CustomEvent(EVENT_PREVIEW, { detail: clone(this._config) })
      );
    }

    _touch() {
      this._undoRecord();
      this._syncPanelTheme();
      this._updatePrimaryScales();
      this._syncShadowBoxes();
      this._checkContrast();
      if (this._before) {
        // Wer etwas aendert, will das Ergebnis sehen und nicht den alten Stand.
        this._setBefore(false);
      }
      this._dirty = true;
      this._preview();
      this._updatePreview();
      this._updateFooter();
    }

    /* --------------------------------------------------------- entries */

    /** Collect every entry the sidebar can show, in the configured order. */
    _collectEntries() {
      const hass = this._hass;
      const panels = (hass && hass.panels) || {};
      const defaultPanel = (hass && hass.defaultPanel) || "lovelace";
      const found = [];

      Object.keys(panels).forEach((urlPath) => {
        const panel = panels[urlPath];
        if (!panel || urlPath === "profile" || urlPath === "config") {
          return;
        }
        if (panel.show_in_sidebar === false) {
          return;
        }
        if (!panel.title && urlPath !== defaultPanel) {
          return;
        }
        found.push({
          key: `panel:${urlPath}`,
          label: panelLabel(hass, panel, urlPath),
          sub: `/${urlPath}`,
          icon: panel.icon || "mdi:view-dashboard-outline",
        });
      });

      found.sort((a, b) => a.label.localeCompare(b.label));

      FIXED_ENTRIES.forEach((fixed) => {
        let label = fixed.fallback;
        if (fixed.key === "config") {
          label =
            (hass.localize && hass.localize("panel.config")) || fixed.fallback;
        } else if (fixed.key === "profile") {
          label = (hass.user && hass.user.name) || fixed.fallback;
        } else if (hass.localize) {
          label = hass.localize("ui.notification_drawer.title") || fixed.fallback;
        }
        found.push({
          key: fixed.key,
          label: label,
          sub: this._t.section_items,
          icon: fixed.icon,
        });
      });

      if (this._config.layout.show_restart === true) {
        found.push({
          key: RESTART_KEY,
          label: this._t.restart_entry,
          sub: this._t.section_items,
          icon: "mdi:restart",
        });
      }

      // Zwischenueberschriften stehen nicht in hass.panels, sie kommen aus
      // der Konfiguration. Als Bezeichnung dient bewusst ein fester Text und
      // nicht der eingegebene Name: die Bezeichnung geht in die Signatur ein,
      // mit der _syncEntries entscheidet, ob die Liste neu gebaut wird -
      // beim Tippen wuerde sonst bei jedem Zeichen der Fokus verloren gehen.
      Object.keys(this._config.items).forEach((key) => {
        if (isHeading(key)) {
          found.push({
            key: key,
            label: this._t.heading,
            sub: this._t.heading_sub,
            icon: this._config.items[key].icon || "mdi:format-text",
            heading: true,
          });
        }
      });

      // Links: wie die Ueberschriften aus der Konfiguration, nicht aus
      // hass.panels. Unter der Bezeichnung steht das Ziel.
      Object.keys(this._config.items).forEach((key) => {
        if (isLink(key)) {
          found.push({
            key: key,
            label: this._t.link,
            sub: key.slice(LINK_PREFIX.length),
            icon: this._config.items[key].icon || LINK_ICON,
            link: true,
          });
        }
      });

      // PopUp-Links (1.5.1): ebenfalls aus der Konfiguration
      Object.keys(this._config.items).forEach((key) => {
        if (isPopup(key)) {
          found.push({
            key: key,
            label: this._t.popup,
            sub: this._config.items[key].content === "card" ? this._t.popup_sub_card : this._t.popup_sub,
            icon: this._config.items[key].icon || (this._config.items[key].content === "card" ? POPUP_CARD_ICON : POPUP_ICON),
            popup: true,
          });
        }
      });

      // apply the stored order, unknown entries keep their position at the end
      const order = this._config.order || [];
      const byKey = new Map(found.map((entry) => [entry.key, entry]));
      const sorted = [];
      order.forEach((key) => {
        if (byKey.has(key)) {
          sorted.push(byKey.get(key));
          byKey.delete(key);
        }
      });
      byKey.forEach((entry) => sorted.push(entry));
      return sorted;
    }

    /** Rebuild the entry list, but only when something actually changed. */
    _syncEntries(force) {
      if (!this._loaded) {
        return;
      }
      const entries = this._collectEntries();
      const signature = entries.map((entry) => entry.key + entry.label).join("|");
      if (!force && signature === this._entrySignature) {
        return;
      }
      this._entries = entries;
      this._entrySignature = signature;
      this._tidyParents();
      this._renderItems();
    }

    _itemConfig(key) {
      if (!this._config.items[key]) {
        this._config.items[key] = Object.assign(
          {},
          itemDefaults(key)
        );
      }
      return this._config.items[key];
    }

    /** Steht ueber dieser Zeile ueberhaupt eine Ueberschrift? */
    _hasHeadingAbove(key) {
      const index = this._entries.findIndex((entry) => entry.key === key);
      for (let i = index - 1; i >= 0; i -= 1) {
        if (this._entries[i].heading) {
          return true;
        }
      }
      return false;
    }

    /**
     * Die Eintraege, die einer Ueberschrift zugeordnet sind - in der
     * Reihenfolge, in der sie gerade stehen.
     */
    _childrenOf(key) {
      return this._entries.filter(
        (entry) => !entry.heading && (this._config.items[entry.key] || {}).parent === key
      );
    }

    /**
     * Einen Eintrag samt seiner zugeordneten Eintraege herausnehmen.
     * Wird eine Ueberschrift verschoben, wandert ihre Gruppe mit - sonst
     * bliebe eine Zuordnung stehen, die man in der Liste nicht mehr sieht.
     */
    _takeBlock(key) {
      const entry = this._entries.find((one) => one.key === key);
      if (!entry) {
        return [];
      }
      const block = [entry].concat(entry.heading ? this._childrenOf(key) : []);
      this._entries = this._entries.filter((one) => block.indexOf(one) < 0);
      return block;
    }

    _move(key, delta) {
      const index = this._entries.findIndex((entry) => entry.key === key);
      if (index < 0) {
        return;
      }
      const block = this._takeBlock(key);
      // Beim Schritt nach unten muss ueber den ganzen naechsten Block hinweg
      // gesprungen werden, nicht nur ueber eine Zeile.
      let target = index;
      if (delta > 0) {
        const next = this._entries[index];
        if (!next) {
          this._entries = this._entries
            .slice(0, index)
            .concat(block, this._entries.slice(index));
          return;
        }
        const skip = next.heading ? 1 + this._childrenOf(next.key).length : 1;
        target = index + skip;
      } else {
        target = Math.max(0, index - 1);
        // Steht davor das Ende einer fremden Gruppe, vor deren Ueberschrift
        // springen. Innerhalb der eigenen Gruppe wird nur getauscht - sonst
        // landete ein Eintrag ueber seiner eigenen Ueberschrift.
        const own = block[0].heading ? "" : (this._config.items[key] || {}).parent || "";
        const before = this._entries[target];
        if (before && !before.heading) {
          const parent = (this._config.items[before.key] || {}).parent;
          if (parent && parent !== own) {
            const head = this._entries.findIndex((one) => one.key === parent);
            if (head >= 0) {
              target = head;
            }
          }
        }
      }
      this._entries = this._entries
        .slice(0, target)
        .concat(block, this._entries.slice(target));
      this._leaveGroup(key);
      this._renderItems();
      this._touch();
    }

    /**
     * Nach einem Schritt mit den Pfeilen: steht der Eintrag nicht mehr direkt
     * in seiner Gruppe (ueber der Ueberschrift, oder ein fremder Eintrag liegt
     * dazwischen), verliert er die Zuordnung. Sonst bliebe er einer
     * Ueberschrift zugeordnet, unter der er gar nicht mehr steht - und wuerde
     * mit ihr zugeklappt.
     */
    _leaveGroup(key) {
      const cfg = this._config.items[key];
      if (!cfg || !cfg.parent || isHeading(key)) {
        return;
      }
      const at = this._entries.findIndex((entry) => entry.key === key);
      const head = this._entries.findIndex((entry) => entry.key === cfg.parent);
      const together =
        head >= 0 &&
        head < at &&
        this._entries
          .slice(head + 1, at)
          .every(
            (entry) =>
              !entry.heading && (this._config.items[entry.key] || {}).parent === cfg.parent
          );
      if (!together) {
        cfg.parent = "";
      }
    }

    /**
     * Ablegen: vor das Ziel schieben und dabei die Zuordnung setzen.
     * indent = true heisst, der Zeiger war beim Loslassen weit genug rechts -
     * dann gehoert der Eintrag zur naechsten Ueberschrift darueber.
     */
    _dropBefore(dragKey, targetKey, indent) {
      const dragged = this._entries.find((entry) => entry.key === dragKey);
      if (!dragged) {
        return;
      }

      // Auf der eigenen Zeile losgelassen: der Eintrag bleibt, wo er ist, nur
      // die Zuordnung aendert sich. Genau so fasst man den Eintrag direkt
      // unter einer Ueberschrift an - ihn woanders hin zu ziehen, nur um ihn
      // einzusortieren, waere unsinnig.
      if (dragKey === targetKey) {
        if (!dragged.heading) {
          this._assign(dragKey, indent);
          this._renderItems();
          this._touch();
        }
        return;
      }

      const target = this._entries.find((entry) => entry.key === targetKey);
      if (!target) {
        return;
      }

      // Eingerueckt auf einer Ueberschrift abgelegt heisst "dort hinein",
      // also direkt dahinter - nicht davor, sonst stuende der Eintrag ueber
      // der Ueberschrift und gehoerte gar nicht mehr zu ihr.
      const intoHeading = indent && target.heading && !dragged.heading;

      // Eine Ueberschrift auf einen ihrer eigenen Eintraege gezogen: das Ziel
      // wandert mit der Gruppe mit, es gibt also nichts zu verschieben.
      if (
        dragged.heading &&
        this._childrenOf(dragKey).some((entry) => entry.key === targetKey)
      ) {
        return;
      }

      const block = this._takeBlock(dragKey);
      let at = this._entries.findIndex((entry) => entry.key === targetKey);
      if (at < 0) {
        at = this._entries.length;
      } else if (intoHeading) {
        at += 1;
      }
      this._entries = this._entries
        .slice(0, at)
        .concat(block, this._entries.slice(at));

      if (!block[0].heading) {
        this._assign(dragKey, indent);
      }
      this._renderItems();
      this._touch();
    }

    /**
     * Die Zuordnung eines Eintrags anhand seiner neuen Position setzen.
     * Eingerueckt: die naechste Ueberschrift oberhalb. Sonst: keine.
     */
    _assign(key, indent) {
      const cfg = this._itemConfig(key);
      if (!indent) {
        cfg.parent = "";
        return;
      }
      const index = this._entries.findIndex((entry) => entry.key === key);
      let parent = "";
      for (let i = index - 1; i >= 0; i -= 1) {
        if (this._entries[i].heading) {
          parent = this._entries[i].key;
          break;
        }
      }
      cfg.parent = parent;
    }

    /**
     * Zuordnungen aufraeumen: ein Eintrag kann nur zu einer Ueberschrift
     * gehoeren, die es noch gibt und die ueber ihm steht.
     */
    _tidyParents() {
      const position = new Map(this._entries.map((entry, i) => [entry.key, i]));
      this._entries.forEach((entry) => {
        if (entry.heading) {
          return;
        }
        const cfg = this._config.items[entry.key];
        if (!cfg || !cfg.parent) {
          return;
        }
        const head = position.get(cfg.parent);
        if (head === undefined || head > position.get(entry.key)) {
          cfg.parent = "";
        }
      });
    }

    /* ---------------------------------------------------------- markup */
    /* ---------------------------------------------------------- markup */

    /**
     * Das Grundgeruest: oben die Kopfleiste mit den vier Bereichen, darunter
     * die Seite. Jede Seite ist eine "Buehne": links ein nachgebautes Home
     * Assistant, in dem man anklickt, was man aendern will, rechts die
     * Felder dazu. Wird einmal gebaut; danach aendern sich nur Werte, Listen
     * und die Attribute, die Seiten und Ansichten umschalten.
     */
    _renderShell() {
      const t = this._t;
      const area = (group, label) => `
        <button type="button" data-group="${group}">${escapeHtml(label)}<span class="area-count" data-count="${group}"></span></button>`;
      const areas = (extra) => `
        <nav class="areas${extra ? ` ${extra}` : ""}">
          ${area("sidebar", t.tab_sidebar)}
          ${area("theme", t.tab_theme)}
          ${area("header", t.tab_header)}
          ${area("settings", t.tab_settings)}
        </nav>`;
      const icon = (attrs, name, fallback, label) =>
        `<button type="button" class="tb-icon" ${attrs} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${glyph(name, fallback)}</button>`;
      this.shadowRoot.innerHTML = `
        <style>${PANEL_CSS}</style>
        <div class="app" id="app">
          <header class="topbar" id="topbar">
            <button type="button" class="tb-icon menu-button" hidden
              title="${escapeHtml(t.open_sidebar)}">${glyph("mdi:menu", "&#9776;")}</button>
            <div class="brand">
              <img class="logo" alt="" src="${LOGO_URL}" />
              <span class="brand-name">${escapeHtml(t.title)}</span>
              <span class="brand-short">${escapeHtml(t.brand_short)}</span>
            </div>
            ${icon('data-action="search" data-search-icon', "mdi:magnify", "&#128269;", t.search_placeholder)}
            ${areas("top")}
            <label class="search" id="search-box">
              ${glyph("mdi:magnify", "")}
              <input type="search" id="search" autocomplete="off" spellcheck="false"
                placeholder="${escapeHtml(t.search_placeholder)}" aria-label="${escapeHtml(t.search_placeholder)}" />
            </label>
            <span class="grow"></span>
            <span class="state"></span>
            <span class="changes tb-save" data-changes></span>
            <button type="button" class="btn tb-save" data-action="revert">${escapeHtml(t.revert)}</button>
            <button type="button" class="btn primary tb-save" data-action="save">${escapeHtml(t.save)}</button>
            ${icon('data-action="history" data-tb-save', "mdi:history", "&#8986;", t.history_button)}
            <span class="tb-sep"></span>
            ${icon('id="transfer-btn" data-tab="transfer"', "mdi:tray-arrow-down", "&#8645;", t.nav_transfer)}
            ${icon('id="info-btn" data-tab="info"', "mdi:information-outline", "i", t.page_info)}
          </header>
          <main id="main-col">
            ${this._pageLayout()}
            ${this._pageItems()}
            ${this._pageLook()}
            ${this._pageTheme()}
            ${this._pageHeader()}
            ${this._pageSettings()}
            ${this._pageTransfer()}
            ${this._pageInfo()}
          </main>
          <div class="dock" id="dock">
            <div class="savebar">
              <span class="state"></span>
              <span class="changes" data-changes></span>
              <button type="button" class="btn" data-action="revert">${escapeHtml(t.revert)}</button>
              <button type="button" class="btn primary" data-action="save">${escapeHtml(t.save)}</button>
              ${icon('data-action="history"', "mdi:history", "&#8986;", t.history_button)}
            </div>
            ${areas("bottom")}
          </div>
          <div class="search-results" id="search-results" hidden></div>
        </div>
        ${this._modals()}`;

      this._ready = true;
      // Was man im Vorschaubild anklicken kann, ist auch per Tastatur erreichbar.
      this.shadowRoot.querySelectorAll(".stage [data-spot], .stage [data-zone], .stage .sbp-head").forEach((el) => {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
      });
      this._bind();
      this._applyMode();
      this._applyNarrow();
      this._selectTab(this._tab);
      Object.keys(this._secs).forEach((group) => this._selectSection(group, this._secs[group], false));
      this._accordionTidy();
      this._applyViews();
      this._applyHeaderView();
      this._watchOverflow();
      this._updateOverflow();
      this._applyAccentInk();
      this._buildSearch();
    }


    /**
     * hideWhen is the path of a switch that replaces this field with the
     * per side / per corner ones, so only one of the two is ever visible.
     */
    _field(key, labelText, type, extra, hideWhen, showWhen) {
      // showWhen is either "<path>" (truthy) or "<path>:<value>|<value>"
      let showAttrs = "";
      if (showWhen) {
        const [path, values] = showWhen.split(":");
        showAttrs = ` data-show-when="${path}"${
          values ? ` data-show-values="${values}"` : ""
        }`;
      }
      return `
        <label class="field"${
          hideWhen ? ` data-hide-when="${hideWhen}"` : ""
        }${showAttrs}>
          <span>${escapeHtml(labelText)}</span>
          <input type="${type}" data-bind="${key}" ${extra || ""} />
        </label>`;
    }

    _select(key, labelText, options, hint) {
      const opts = options
        .map(
          (option) =>
            `<option value="${escapeHtml(option[0])}">${escapeHtml(
              option[1]
            )}</option>`
        )
        .join("");
      return `
        <label class="field">
          <span>${escapeHtml(labelText)}</span>
          <select data-bind="${key}">${opts}</select>
          ${hint ? `<small class="field-hint">${escapeHtml(hint)}</small>` : ""}
        </label>`;
    }

    _color(key, labelText, showWhen, placeholder) {
      return `
        <label class="field"${
          showWhen ? ` data-show-when="${showWhen}"` : ""
        }>
          <span>${escapeHtml(labelText)}</span>
          <span class="color-field">
            <input type="color" data-color-for="${key}" />
            <input type="text" data-bind="${key}" placeholder="${escapeHtml(placeholder || "theme")}" />
            <button class="clear" data-clear-for="${key}" title="reset">&#10005;</button>
          </span>
        </label>`;
    }

    _check(key, labelText, hint) {
      return `
        <label class="check">
          <input type="checkbox" data-bind="${key}" />
          <span>${escapeHtml(labelText)}${
            hint ? `<span class="sub">${escapeHtml(hint)}</span>` : ""
          }</span>
        </label>`;
    }

    _pageLayout() {
      const t = this._t;
      const cols = (n) => Array.from({ length: n }, (x, i) => [String(i + 1), String(i + 1)]);
      const body = `
        ${this._grp("layout:grid", t.layout_grid, `
          <div class="stack">
            ${this._seg("layout.columns", t.columns, cols(4))}
            ${this._seg("layout.columns_collapsed", t.columns_collapsed, cols(3), t.columns_collapsed_hint)}
            ${this._seg("layout.item_style", t.item_style, [
              ["auto", t.item_style_auto_short],
              ["tile", t.item_style_tile_short],
              ["row", t.item_style_row_short],
            ], t.item_style_hint)}
            <div class="grid2">
              ${this._field("layout.gap", t.gap, "number", 'min="0" max="40"')}
              ${this._field("layout.tile_gap", t.tile_gap, "number", 'min="0" max="60"', null, "layout.item_style:tile|auto")}
            </div>
          </div>`, { open: true })}
        ${this._grp("layout:sizes", t.layout_sizes, `
          <div class="grid2">
            ${this._field("layout.width", t.width, "number", 'min="56" max="1000"')}
            ${this._field("layout.width_collapsed", t.width_collapsed, "number", 'min="40" max="400"')}
            ${this._field("layout.tile_height", t.tile_height, "number", 'min="28" max="300"')}
            ${this._field("layout.tile_height_collapsed", t.tile_height_collapsed, "number", 'min="0" max="300"')}
            ${this._field("layout.row_height", t.row_height, "number", 'min="24" max="200"')}
            ${this._field("layout.row_height_collapsed", t.row_height_collapsed, "number", 'min="0" max="200"')}
          </div>`, { open: true })}
        ${this._grp("layout:behaviour", t.layout_behaviour, `
          ${this._check("layout.hide_scrollbar", t.hide_scrollbar, t.hide_scrollbar_hint)}
          ${this._check("layout.merge_fixed", t.merge_fixed, t.merge_fixed_hint)}
          ${this._check("layout.show_restart", t.show_restart, t.show_restart_hint)}`, { open: true })}
        <p class="hint hidden-note" data-show-when="layout.hide_sidebar">${escapeHtml(t.hide_sidebar_hint)}</p>
        <p class="fields-note">${escapeHtml(t.preview_hint)}</p>`;
      // Wie "Kopfzeile ganz ausblenden" auf der Seite Header: unten in der Spalte
      const foot = `
        <label class="check boxed">
          <input type="checkbox" data-bind="layout.hide_sidebar" />
          <span>${escapeHtml(t.hide_sidebar_full)}</span>
        </label>`;
      return `
        <section class="page stage-page" data-page="layout">
          ${this._sidebarStage("layout")}
          ${this._fieldsCol(this._sidebarHead(), body, foot)}
        </section>`;
    }

    _pageItems() {
      const t = this._t;
      const body = `
        <div class="items-pane" id="items-pane">
          <div class="items-bar">
            <button type="button" class="btn" id="add-heading" title="${escapeHtml(t.entry_add)}">${glyph("mdi:plus", "+")}${escapeHtml(t.entry_add_short)}</button>
            <span class="grow"></span>
            <label class="check inline">
              <input type="checkbox" id="show-hidden" checked />
              <span>${escapeHtml(t.show_hidden_short)}</span>
            </label>
          </div>
          <ul class="items" id="items"></ul>
          <div id="inspector" class="inspector"></div>
          <div class="fields-note">
            <p>${escapeHtml(t.order_hint)} ${escapeHtml(t.add_hint)}</p>
            <p>${escapeHtml(t.heading_hint)} ${escapeHtml(t.heading_indent_hint)}</p>
          </div>
        </div>`;
      return `
        <section class="page stage-page" data-page="items">
          ${this._sidebarStage("items")}
          ${this._fieldsCol(this._sidebarHead(), body)}
        </section>`;
    }

    _pageLook() {
      const sections = this._lookSections();
      const body = sections
        .map((s) => this._grp(`look:${s[0]}`, s[1], s[3], { open: s[0] === "colors", sec: ["look", s[0]], zone: s[2] }))
        .join("") +
        // Theme-Variablen der Seitenleiste (Teil des Themes, Dunkel / Hell)
        this._themeVarGroup("Sidebar", "look:theme", this._t.lsec_theme, this._t.sidebar_theme_hint, ["look", "theme"]);
      return `
        <section class="page stage-page" data-page="look">
          ${this._sidebarStage("look")}
          ${this._fieldsCol(this._sidebarHead(true), body, "", ' data-fields="look"')}
        </section>`;
    }

    /* -------------------------------------------------------- theme page */
    /* -------------------------------------------------------- theme page */

    /**
     * One field of the theme page. The path carries the mode, so both modes
     * exist in the markup at the same time and only one of them is visible -
     * that way every input keeps its own binding and nothing has to be
     * rewritten when the mode is switched.
     */
    _themeField(mode, field, hideWhen) {
      const [variable, labelDe, labelEn, type] = field;
      const label = this._de ? labelDe : labelEn;
      const path = `theme.${mode}.${variable}`;
      const name = `<small class="var-name" title="--${variable}">--${escapeHtml(variable)}</small>`;
      const hide = hideWhen ? ` data-hide-when="theme.${mode}.${hideWhen}"` : "";
      const caption = `<span>${escapeHtml(label)}${name}</span>`;
      if (type === "select") {
        const options = (THEME_SELECTS(this._t)[variable] || [])
          .map((option) => `<option value="${escapeHtml(option[0])}">${escapeHtml(option[1])}</option>`)
          .join("");
        return `
          <label class="field"${hide}>
            ${caption}
            <select data-bind="${path}">${options}</select>
          </label>`;
      }
      if (type === "text") {
        return `
          <label class="field"${hide}>
            ${caption}
            <input type="text" data-bind="${path}" placeholder="${escapeHtml(this._t.theme_empty)}" />
          </label>`;
      }
      // Unter der Primaerfarbe: die daraus berechnete Skala (seit 1.4.6).
      const scale = variable === "primary-color"
        ? `
        <div class="primary-scale" data-scale-for="${path}">
          <span class="ps-label">${escapeHtml(this._t.primary_scale)}</span>
          <span class="ps-chips">${PALETTE_STEPS.map((step) => `<i data-step="${step}"></i>`).join("")}</span>
          <small class="ps-hint">${escapeHtml(this._t.primary_scale_hint)}</small>
        </div>`
        : "";
      return `
        <label class="field"${hide}>
          ${caption}
          <span class="color-field">
            <input type="text" data-bind="${path}" placeholder="${escapeHtml(this._t.theme_empty)}" />
            <input type="color" data-color-for="${path}" />
            <button class="clear" data-clear-for="${path}" title="reset">&#10005;</button>
          </span>
        </label>${scale}`;
    }

    /**
     * The card box. Border and radius work like on the appearance page: one
     * value for everything, or - with the switch - one per side and per
     * corner. The four values are composed into the single variable Home
     * Assistant knows, see composedValue().
     */
    _themeCards(mode, group) {
      const t = this._t;
      const field = (name) => group.fields.find((entry) => entry[0] === name);
      const side = (key, label) =>
        this._field(`theme.${mode}.${key}`, label, "number", 'min="0" max="80"');
      return `
        <div class="rows">
          ${this._themeField(mode, field("ha-card-border-color"))}
          ${this._themeField(mode, field("ha-card-box-shadow"))}
          ${this._themeField(mode, field("ha-card-header-color"))}
          ${this._themeField(mode, field("ha-card-header-font-size"))}
          ${this._themeField(mode, field("ha-card-border-width"), "card_border_split")}
          ${this._themeField(mode, field("ha-card-border-radius"), "card_radius_split")}
        </div>
        ${this._shadowBox(`theme.${mode}.ha-card-box-shadow`)}
        <div class="sub-box">
          ${this._check(`theme.${mode}.card_border_split`, t.item_border_split)}
          <div class="grid sub four" data-show-when="theme.${mode}.card_border_split">
            ${side("card_border_top", t.side_top)}
            ${side("card_border_right", t.side_right)}
            ${side("card_border_bottom", t.side_bottom)}
            ${side("card_border_left", t.side_left)}
          </div>
          ${this._check(`theme.${mode}.card_radius_split`, t.item_radius_split)}
          <div class="grid sub four" data-show-when="theme.${mode}.card_radius_split">
            ${side("card_radius_tl", t.corner_tl)}
            ${side("card_radius_tr", t.corner_tr)}
            ${side("card_radius_br", t.corner_br)}
            ${side("card_radius_bl", t.corner_bl)}
          </div>
        </div>`;
    }

    /**
     * The dashboard background: the color field, a gradient (second color and
     * direction) and an image the user picks from disk. The image is sent to
     * the integration, which stores it - see _uploadDashImage().
     */
    _themeDashboard(mode, group) {
      const t = this._t;
      const p = (key) => `theme.${mode}.${key}`;
      return `
        <div class="rows">
          ${this._themeField(mode, group.fields[0])}
        </div>
        <div class="sub-box">
          ${this._check(p("dash_gradient"), t.background_gradient)}
          <div class="stack sub" data-show-when="${p("dash_gradient")}">
            ${this._color(p("dash_color2"), t.background_color2)}
            ${this._select(p("dash_direction"), t.gradient_direction, this._directions(true))}
          </div>
        </div>
        <div class="sub-box">
          <span class="cap">${escapeHtml(t.dash_image_title)}</span>
          <div class="dash-image" data-dash-image="${mode}">
            <span class="dash-thumb"><i data-dash-thumb></i></span>
            <span class="dash-file">
              <small data-dash-name></small>
              <span class="button-row" style="margin-top:0">
                <button class="flat" data-dash-upload="${mode}"></button>
                <button class="flat" data-dash-remove="${mode}">${escapeHtml(t.dash_image_remove)}</button>
              </span>
            </span>
            <input type="file" hidden data-dash-file="${mode}"
              accept="image/png,image/jpeg,image/gif,image/webp" />
          </div>
          <div data-show-when="${p("dash_image")}">
            ${this._select(p("dash_image_size"), t.dash_image_size, [
              ["", t.dash_size_cover],
              ["contain", t.dash_size_contain],
              ["tile", t.dash_size_tile],
            ])}
          </div>
          <div data-show-when="${p("dash_image")}">
            ${this._check(p("dash_image_scroll"), t.dash_image_scroll)}
          </div>
          <small class="field-hint">${escapeHtml(t.dash_image_hint)}</small>
        </div>`;
    }

    /** Thumbnail, file name and buttons of the image rows follow the config. */
    _syncDashImage() {
      const root = this.shadowRoot;
      if (!root) {
        return;
      }
      const t = this._t;
      ["dark", "light"].forEach((mode) => {
        const box = root.querySelector(`[data-dash-image="${mode}"]`);
        if (!box) {
          return;
        }
        const url = String(this._readPath(`theme.${mode}.dash_image`) || "");
        const valid = MEDIA_URL_RE.test(url);
        box.querySelector("[data-dash-thumb]").style.backgroundImage = valid ? `url('${url}')` : "";
        box.querySelector("[data-dash-name]").textContent = valid ? url.split("/").pop() : t.dash_image_none;
        box.querySelector("[data-dash-upload]").textContent = valid ? t.dash_image_replace : t.dash_image_choose;
        box.querySelector("[data-dash-remove]").hidden = !valid;
      });
    }

    /** fetch() with the login of the logged in user. */
    _authFetch(url, init) {
      const hass = this._hass;
      if (hass && typeof hass.fetchWithAuth === "function") {
        return hass.fetchWithAuth(url, init);
      }
      const auth = hass && hass.auth;
      const token = auth && (auth.accessToken || (auth.data && auth.data.access_token));
      const headers = Object.assign({}, init.headers, token ? { Authorization: `Bearer ${token}` } : {});
      return fetch(url, Object.assign({}, init, { headers }));
    }

    /**
     * Send the picked image to the integration (POST of the raw bytes). The
     * answer carries the URL it is served at; only that URL goes into the
     * theme. It is saved with the rest when the user presses Save.
     */
    async _uploadDashImage(mode, file) {
      const t = this._t;
      if (file.type && !/^image\//.test(file.type)) {
        this._flash(t.dash_upload_type, true);
        return;
      }
      if (file.size > MEDIA_MAX_BYTES) {
        this._flash(t.dash_upload_big, true);
        return;
      }
      this._flash(t.dash_uploading);
      try {
        const response = await this._authFetch(MEDIA_UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        let body = null;
        try {
          body = await response.json();
        } catch (err) {
          body = null;
        }
        if (!response.ok || !body || !MEDIA_URL_RE.test(String(body.url))) {
          throw new Error((body && body.message) || `HTTP ${response.status}`);
        }
        this._writePath(`theme.${mode}.dash_image`, body.url);
        this._applyConditionals();
        this._touch();
        this._flash(t.dash_upload_done);
      } catch (err) {
        this._flash(`${t.dash_upload_failed}: ${err && err.message ? err.message : err}`, true);
      }
    }

    _pageTheme() {
      const t = this._t;
      const body = (group, mode) =>
        group.id === "cards"
          ? this._themeCards(mode, group)
          : group.id === "dashboard"
            ? this._themeDashboard(mode, group)
            : `<div class="rows${group.compact ? " compact" : ""}">${group.fields.map((field) => this._themeField(mode, field)).join("")}</div>`;
      const name = (group) => (this._de ? group.de : group.en);
      // Die Kopfzeilen-Variablen stehen seit 1.4.2 auf der Seite Header
      const groups = THEME_GROUPS.map((group, index) => group.en === "Header" || group.en === "Sidebar" ? "" :
        this._grp(`theme:${index}`, name(group), `
          ${group.hint_de ? `<p class="hint">${escapeHtml(this._de ? group.hint_de : group.hint_en)}</p>` : ""}
          ${["dark", "light"]
            .map((mode) => `<div class="theme-mode" data-mode="${mode}">${body(group, mode)}</div>`)
            .join("")}
          <div class="grp-foot">
            <small>${escapeHtml(t.theme_empty_hint)}</small>
            <button type="button" class="link-btn" data-tg-clear="${index}">${escapeHtml(t.group_clear)}</button>
          </div>`, { sec: ["theme", index] })
      ).join("");
      const head = `
        <h2 class="fields-title">${escapeHtml(t.tab_theme)}</h2>
        <div class="seg inline" data-view="theme">
          <button type="button" data-value="simple">${escapeHtml(t.view_simple)}</button>
          <button type="button" data-value="all">${escapeHtml(t.view_all_groups.replace("{n}", THEME_GROUPS.length - 2))}</button>
        </div>
        ${this._accordionBtn()}
        <div class="fields-tools">
          <button type="button" class="btn" id="open-palette"><span class="dot-sw"></span><span>${escapeHtml(t.palette_title)}</span></button>
          <button type="button" class="btn" id="open-presets">${escapeHtml(t.theme_presets)}</button>
        </div>`;
      const foot = `
        <div class="theme-set">
          ${this._field("theme.name", t.theme_name, "text", 'placeholder="HA Style Hub"')}
          <label class="btn-toggle" title="${escapeHtml(t.theme_enabled_hint)}">
            <input type="checkbox" data-bind="theme.enabled" />
            <span>${escapeHtml(t.theme_enabled)}</span>
          </label>
          <div data-show-when="theme.enabled">
            ${this._check("theme.set_default", t.theme_set_default, t.theme_set_default_hint)}
          </div>
          <p class="fields-note" data-hide-when="theme.enabled">${escapeHtml(t.theme_disabled_hint)}</p>
        </div>`;
      return `
        <section class="page stage-page" data-page="theme">
          ${this._stageCol(
            t.stage_theme_title,
            t.stage_theme_hint,
            this._themeStage(),
            `<div class="seg inline" id="mode-seg">
              <button type="button" data-set-mode="dark">${escapeHtml(t.theme_mode_dark)}</button>
              <button type="button" data-set-mode="light">${escapeHtml(t.theme_mode_light)}</button>
            </div>
            <button type="button" class="link-btn accent" id="theme-copy"></button>
            <button type="button" class="link-btn" id="theme-clear">${escapeHtml(t.theme_clear)}</button>`
          )}
          ${this._fieldsCol(head, `<div class="theme-groups" id="theme-groups">${groups}</div>
            <p class="fields-note">${escapeHtml(t.theme_intro)}</p>`, foot, ' data-fields="theme"')}
        </section>`;
    }

    /**
     * Die Kopfzeile der Dashboards. Eigene Seite und nicht Teil des Themes:
     * Home Assistant gibt dafuer nur drei Theme-Variablen heraus, alles
     * weitere macht der Injector mit eigenem CSS - und das gilt fuer beide
     * Modi gleichzeitig, waehrend die Theme-Seite nach Hell und Dunkel
     * trennt. "Einfach" zeigt nur die Gruppe aufgeklappt, die im
     * Vorschaubild gewaehlt ist; "Alle Felder" klappt alle Gruppen auf.
     */
    _pageHeader() {
      const t = this._t;
      const num = (key, label, max) => this._field(key, label, "number", `min="0" max="${max}"`);
      const groups = [
        this._grp("header:color", t.hsec_color, `
          ${this._color("header.background", t.background)}
          ${this._range("header.background_opacity", t.header_opacity, 0, 100, "%")}
          ${this._range("header.blur", t.header_blur, 0, 60, "px")}
          <small class="field-hint">${escapeHtml(t.header_blur_hint)}</small>
          ${this._color("header.text_color", t.text_color)}
          ${this._color("header.icon_color", t.icon_color)}
          ${this._check("header.background_gradient", t.background_gradient)}
          <div class="stack sub" data-show-when="header.background_gradient">
            ${this._color("header.background_color2", t.background_color2)}
            ${this._select("header.gradient_direction", t.gradient_direction, this._directions(false))}
          </div>`, { open: true, sec: ["header", "color"] }),
        this._grp("header:size", t.hsec_size, `
          <div class="grid2">
            ${num("header.height", t.header_height, 200)}
            ${this._field("header.radius", t.item_radius, "number", 'min="0" max="60"', "header.radius_split")}
            ${num("header.icon_size", t.header_icon_size, 64)}
            ${num("header.font_size", t.header_title_size, 60)}
          </div>
          ${this._select("header.font_weight", t.font_weight, [
            ["", "–"], ["300", "300"], ["400", "400"], ["500", "500"], ["600", "600"], ["700", "700"],
          ])}
          <small class="field-hint">${escapeHtml(t.header_height_hint)}</small>`, { open: true, sec: ["header", "size"] }),
        this._grp("header:tabs", t.hsec_tabs, `
          <div class="stack">
            ${this._color("header.tab_color", t.tab_color)}
            ${this._color("header.tab_color_active", t.tab_color_active)}
            ${this._color("header.tab_indicator_color", t.tab_indicator_color)}
            ${this._color("header.actions_color", t.header_actions_color)}
            <small class="field-hint">${escapeHtml(t.header_actions_color_hint)}</small>
            ${this._color("header.tab_hover_background", t.tab_hover_background)}
            ${this._range("header.tab_hover_opacity", t.tab_hover_opacity, 0, 100, "%")}
          </div>`, { sec: ["header", "tabs"] }),
        this._grp("header:buttons", t.hsec_buttons, `
          <p class="hint">${escapeHtml(t.header_buttons_hint)}</p>
          ${this._check("header.hide_add", t.hide_add)}
          ${this._check("header.hide_search", t.hide_search)}
          ${this._check("header.hide_assist", t.hide_assist)}
          ${this._check("header.hide_edit", t.hide_edit, t.hide_edit_hint)}
          ${this._check("header.show_restart", t.header_show_restart, t.header_show_restart_hint)}
          ${this._check("header.show_system", t.header_show_system, t.header_show_system_hint)}
          ${this._check("header.show_disk", t.header_show_disk, t.header_show_disk_hint)}
          <div class="card-head hlinks-head">
            <h3>${escapeHtml(t.header_links)}</h3>
            <span class="badge-ext" id="header-links-count"></span>
            <button class="icon-btn" id="add-header-link"
              title="${escapeHtml(t.header_link_add)}">${glyph("mdi:plus", "+")}</button>
          </div>
          <p class="hint">${escapeHtml(t.header_links_hint)}</p>
          <ul class="hlinks" id="header-links"></ul>`, { sec: ["header", "buttons"] }),
        this._grp("header:frame", t.hsec_frame, `
          <div class="stack">
            ${this._color("header.border_color", t.header_border_color)}
            ${this._field("header.border_width", t.header_border_width, "number", 'min="0" max="20"', "header.border_split")}
          </div>
          ${this._check("header.border_split", t.item_border_split)}
          <div class="grid sub four" data-show-when="header.border_split">
            ${num("header.border_top", t.side_top, 20)}
            ${num("header.border_right", t.side_right, 20)}
            ${num("header.border_bottom", t.side_bottom, 20)}
            ${num("header.border_left", t.side_left, 20)}
          </div>
          ${this._check("header.radius_split", t.item_radius_split)}
          <div class="grid sub four" data-show-when="header.radius_split">
            ${num("header.radius_tl", t.corner_tl, 60)}
            ${num("header.radius_tr", t.corner_tr, 60)}
            ${num("header.radius_br", t.corner_br, 60)}
            ${num("header.radius_bl", t.corner_bl, 60)}
          </div>
          <div class="sub-box">
            <span class="cap">${escapeHtml(t.header_items_frame)}</span>
            <p class="hint">${escapeHtml(t.header_items_hint)}</p>
            <div class="grid2">
              ${this._color("header.element_border_color", t.header_border_color)}
              ${num("header.element_border_width", t.header_border_width, 20)}
              ${num("header.element_radius", t.item_radius, 60)}
            </div>
            ${this._check("header.element_border_buttons", t.header_items_buttons)}
            ${this._check("header.element_border_tabs", t.header_items_tabs)}
          </div>`, { sec: ["header", "frame"] }),
        this._headerThemeGroup(),
      ].join("");
      const head = `
        <h2 class="fields-title">${escapeHtml(t.tab_header)}</h2>
        <div class="seg inline" data-view="header">
          <button type="button" data-value="simple">${escapeHtml(t.view_simple)}</button>
          <button type="button" data-value="all">${escapeHtml(t.view_all_fields)}</button>
        </div>
        ${this._accordionBtn()}
        <div class="fields-tools">
          <button type="button" class="btn wide" id="open-header-presets">${escapeHtml(t.theme_presets)}</button>
        </div>`;
      const stage = `
        <div class="stage ha-mock" data-stage="header" id="header-preview" data-theme-vars>
          ${this._sidebarZone(true)}
          <div class="hm-main">
            <div class="hpv-bar" data-zone="color" data-tag="${escapeHtml(t.tag_selected.replace("{name}", t.tab_header))}">
              <span class="hpv-icon hpv-zone" data-zone="size">${glyph("mdi:menu", "&#9776;")}</span>
              <span class="hpv-title hpv-zone" data-zone="size">${escapeHtml(t.stage_home)}</span>
              <span class="hpv-tabs hpv-zone" data-zone="tabs">
                <span class="hpv-tab hpv-tab-icon" data-on>${glyph("mdi:home", "&#8962;")}</span>
                <span class="hpv-tab hpv-tab-icon">${glyph("mdi:lightbulb-outline", "&#9788;")}</span>
                <span class="hpv-tab hpv-tab-icon">${glyph("mdi:thermometer", "&#176;")}</span>
                <span class="hpv-tab hpv-tab-icon">${glyph("mdi:shield-home-outline", "&#9632;")}</span>
                <span class="hpv-tab hpv-tab-icon">${glyph("mdi:cctv", "&#9673;")}</span>
                <span class="hpv-tab">${escapeHtml(t.header_view_two)}</span>
                <span class="hpv-tab">${escapeHtml(t.header_view_three)}</span>
                <span class="hpv-tab hpv-tab-both">${glyph("mdi:lightning-bolt", "&#9889;")}<span>${escapeHtml(t.ts_energy)}</span></span>
                <span class="hpv-tab hpv-tab-both">${glyph("mdi:play-circle-outline", "&#9654;")}<span>${escapeHtml(t.ts_media)}</span></span>
              </span>
              <span class="hpv-right hpv-zone" data-zone="buttons">
                <span class="hpv-sys" hidden>
                  <span class="hpv-si" data-sys="cpu"><span class="k">CPU</span><span class="v">7 %</span></span>
                  <span class="hpv-si" data-sys="ram"><span class="k">RAM</span><span class="v">41 %</span></span>
                  <span class="hpv-si" data-sys="free"><span class="k">${escapeHtml(t.header_disk_free)}</span><span class="v">${escapeHtml(t.header_disk_free_value)}</span></span>
                  <span class="hpv-si" data-sys="used"><span class="k">${escapeHtml(t.header_disk_used)}</span><span class="v">${escapeHtml(t.header_disk_used_value)}</span></span>
                </span>
                <span class="hpv-actions">
                  <span class="hpv-btn" data-hpv="add">${glyph("mdi:plus", "+")}</span>
                  <span class="hpv-btn" data-hpv="search">${glyph("mdi:magnify", "&#128269;")}</span>
                  <span class="hpv-btn" data-hpv="assist">${glyph("mdi:comment-processing-outline", "&#9993;")}</span>
                  <span class="hpv-btn" data-hpv="edit">${glyph("mdi:pencil", "&#9998;")}</span>
                </span>
              </span>
            </div>
            <div class="hpv-off" hidden>${escapeHtml(t.header_hidden_stage)}</div>
            <div class="hpv-body" data-goto-zone="theme">
              <div class="hpv-card"><b>${escapeHtml(t.ts_light)}</b><i></i><i class="short"></i></div>
              <div class="hpv-card"><b>${escapeHtml(t.ts_climate)}</b><i></i></div>
              <div class="hpv-card"><b>${escapeHtml(t.ts_energy)}</b><i class="block"></i></div>
              <div class="hpv-card wide"><b>${escapeHtml(t.ts_history)}</b><i class="block tall"></i></div>
              <div class="hpv-card"><b>${escapeHtml(t.ts_media)}</b><i></i><i class="short"></i></div>
            </div>
            <button type="button" class="goto stage-side-goto" data-goto="layout">&#8598; ${escapeHtml(t.goto_sidebar)}</button>
            <button type="button" class="goto hpv-goto" data-goto="theme">${escapeHtml(t.goto_theme_cards)}</button>
          </div>
        </div>`;
      const foot = `
        <div class="stack hdr-pos" data-hide-when="header.hidden">
          ${this._seg("header.position", t.header_position, [["top", t.header_pos_top], ["bottom", t.header_pos_bottom]], t.header_position_hint)}
        </div>
        <label class="check boxed">
          <input type="checkbox" data-bind="header.hidden" />
          <span>${escapeHtml(t.header_hidden_full)}</span>
        </label>`;
      return `
        <section class="page stage-page" data-page="header">
          ${this._stageCol(t.stage_header_title, t.stage_header_hint, stage)}
          ${this._fieldsCol(head, `
            <p class="hint hidden-note" data-show-when="header.hidden">${escapeHtml(t.header_hidden_hint)}</p>
            <div class="hdr-groups" data-hide-when="header.hidden">${groups}</div>
            <p class="fields-note">${escapeHtml(t.header_hint)}</p>`, foot, ' data-fields="header"')}
        </section>`;
    }

    /**
     * HA-Settings: die Buehne zeigt die Einstellungsseite, Geraete & Dienste
     * oder eine Tabelle; angeklickt wird Menuepunkte, Favoriten-Leiste oder
     * Systemmonitor. Rechts die Felder des gewaehlten Themas.
     */
    _pageSettings() {
      const t = this._t;
      const blank = ' data-blank placeholder="' + escapeHtml(t.settings_standard) + '"';
      const frame = (p, widthLabel, radiusLabel, colors) => `
        <div class="grid3">
          ${this._field(`settings.${p}_border_width`, widthLabel, "number", 'min="0" max="20"' + blank, `settings.${p}_border_split`)}
          ${colors.join("")}
          ${this._field(`settings.${p}_border_radius`, radiusLabel, "number", 'min="0" max="60"' + blank, `settings.${p}_corner_split`)}
        </div>
        ${this._check(`settings.${p}_border_split`, t.item_border_split)}
        <div class="grid sub four" data-show-when="settings.${p}_border_split">
          ${["top", "right", "bottom", "left"]
            .map((k) => this._field(`settings.${p}_side_${k}`, t["side_" + k], "number", 'min="0" max="20"' + blank))
            .join("")}
        </div>
        ${this._check(`settings.${p}_corner_split`, t.item_radius_split)}
        <div class="grid sub four" data-show-when="settings.${p}_corner_split">
          ${["tl", "tr", "br", "bl"]
            .map((k) => this._field(`settings.${p}_corner_${k}`, t["corner_" + k], "number", 'min="0" max="60"' + blank))
            .join("")}
        </div>`;
      const colors = ["#1e88e5", "#43a047", "#e53935", "#8e24aa", "#fb8c00", "#00897b"];
      // Geraete & Dienste: 15 Integrationen wie in einer echten Installation
      const devices = (n) => t.list_meta_devices.replace("{n}", n);
      const lentries = ["a", "b", "c", "d", "e", "f"]
        .map((id) => [t["settings_list_" + id], t["settings_list_" + id + "_meta"], id === "d"])
        .concat([
          ["ESPHome", devices(6)],
          ["MQTT", devices(14)],
          ["Shelly", devices(9)],
          ["Zigbee Home Automation", devices(23)],
          ["Matter", devices(5)],
          ["Bluetooth", devices(2)],
          ["HACS", t.list_meta_service],
          ["Speedtest.net", t.list_meta_service],
          ["Spotify", t.list_meta_service],
        ]);
      const lcards = lentries
        .map(
          ([name, meta, problem], index) => `
          <div class="lpv-card${problem ? " lpv-problem" : ""}">
            <span class="lpv-logo" style="--c:${colors[index % colors.length]}"></span>
            <span class="lpv-name">${escapeHtml(name)}</span>
            <span class="lpv-meta">${escapeHtml(meta)}</span>
          </div>`
        )
        .join("");
      // 1.5.5: die Seite einer Integration im Kleinen - zu sehen, solange
      // "Auch die Seite einer Integration gestalten" an ist. Ein Eintrag mit
      // Fehler (zwei Geraete), einer "nicht geladen", ein normaler.
      const epvDevice = (name, meta) => `
              <div class="epv-row epv-dev"><span class="epv-dev-ic"></span><span><b>${escapeHtml(name)}</b><small>${escapeHtml(meta)}</small></span></div>`;
      const entriesPage = `
            <div class="epv" id="entries-preview" data-spot="list" hidden>
              <div class="epv-cap">${escapeHtml(t.epv_caption)}</div>
              <div class="epv-head"><span class="epv-logo"></span><span><strong>${escapeHtml(t.epv_name)}</strong><small>${escapeHtml(t.epv_meta)}</small></span></div>
              <div class="epv-sec">${escapeHtml(t.epv_attention)}</div>
              <div class="epv-entry epv-error">
                <div class="epv-row"><span><b>${escapeHtml(t.epv_entry_error)}</b><small class="epv-msg"><i>!</i>${escapeHtml(t.epv_msg_error)}</small></span></div>
                ${epvDevice(t.epv_device_a, t.epv_device_meta_a)}
                ${epvDevice(t.epv_device_b, t.epv_device_meta_b)}
              </div>
              <div class="epv-entry epv-warn">
                <div class="epv-row"><span><b>${escapeHtml(t.epv_entry_warn)}</b><small class="epv-msg">${escapeHtml(t.epv_msg_warn)}</small></span></div>
              </div>
              <div class="epv-sec">${escapeHtml(t.epv_hubs)}</div>
              <div class="epv-entry">
                <div class="epv-row"><span><b>${escapeHtml(t.epv_entry_ok)}</b><small>${escapeHtml(t.epv_meta_ok)}</small></span></div>
                ${epvDevice(t.epv_device_c, t.epv_device_meta_c)}
              </div>
            </div>`;
      // Tabellen: drei Bereiche mit mehreren Zeilen, wie eine echte Liste
      const tgroups = [
        [t.settings_table_group_a, [[t.settings_table_row_a, t.table_state_on], [t.settings_table_row_b, t.table_state_off], [t.table_row_tv, t.table_state_on], [t.table_row_thermostat, this._de ? "21,5 °C" : "21.5 °C"]]],
        [t.settings_table_group_b, [[t.settings_table_row_c, t.table_state_off], [t.settings_table_row_d, t.table_state_off], [t.table_row_fridge, "4 °C"], [t.table_row_coffee, t.table_state_on]]],
        [t.table_group_hall, [[t.table_row_door, t.table_state_locked], [t.table_row_motion, t.table_state_clear], [t.table_row_smoke, t.table_state_ok]]],
        [t.table_group_garden, [[t.table_row_pump, t.table_state_off], [t.table_row_garden_light, t.table_state_on]]],
      ];
      const trows = tgroups
        .map(([group, rows]) =>
          `<div class="tpv-group">${glyph("mdi:chevron-up", "&#8963;")}<span>${escapeHtml(group)}</span></div>` +
          rows
            .map(([name, state]) => `<div class="tpv-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(group)}</span><span>${escapeHtml(state)}</span></div>`)
            .join("")
        )
        .join("");
      // Die drei Themen der Einstellungsseite stehen bei "Alle Felder"
      // untereinander, jedes mit seinem Titel.
      const pageTopics = ["menu", "favorites", "monitor"];
      const panel = (id, title, body) => `
        <div class="topic-panel" data-sec-group="settings" data-sec="${id}" data-sec-label="${escapeHtml(title)}" data-topic-title="${escapeHtml(title)}"${pageTopics.indexOf(id) >= 0 ? " data-page-topic" : ""}>
          ${pageTopics.indexOf(id) >= 0 ? `<h3 class="topic-head">${escapeHtml(title)}</h3>` : ""}
          ${body}
        </div>`;
      const monitorBoxes = `
        <div class="mpv" id="monitor-preview">
          <div class="mpv-grid">
            <div class="mpv-cell" data-kind="cpu">
              <span class="mpv-label">${escapeHtml(t.monitor_cpu)}</span>
              <span class="mpv-value">23<span class="mpv-unit">%</span></span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_cpu)}</span>
              <span class="mpv-viz"><svg viewBox="0 0 59 100" preserveAspectRatio="none" aria-hidden="true"><path class="mpv-area" d="M0,82 L4,78 L8,84 L12,70 L16,74 L20,62 L24,79 L28,81 L32,66 L36,58 L40,72 L44,80 L48,69 L52,75 L56,64 L59,77 L59,100 L0,100 Z"></path><path class="mpv-line" d="M0,82 L4,78 L8,84 L12,70 L16,74 L20,62 L24,79 L28,81 L32,66 L36,58 L40,72 L44,80 L48,69 L52,75 L56,64 L59,77"></path></svg></span>
            </div>
            <div class="mpv-cell" data-kind="ram">
              <span class="mpv-label">${escapeHtml(t.monitor_ram)}</span>
              <span class="mpv-value">48<span class="mpv-unit">%</span></span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_ram)}</span>
              <span class="mpv-viz"><svg viewBox="0 0 59 100" preserveAspectRatio="none" aria-hidden="true"><path class="mpv-area" d="M0,55 L6,54 L12,53 L18,55 L24,52 L30,51 L36,52 L42,50 L48,51 L54,52 L59,52 L59,100 L0,100 Z"></path><path class="mpv-line" d="M0,55 L6,54 L12,53 L18,55 L24,52 L30,51 L36,52 L42,50 L48,51 L54,52 L59,52"></path></svg></span>
            </div>
            <div class="mpv-cell" data-kind="disk" data-level="warn">
              <span class="mpv-label">${escapeHtml(t.monitor_disk)}</span>
              <span class="mpv-value">87<span class="mpv-unit">%</span></span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_disk)}</span>
              <span class="mpv-viz"><span class="mpv-scale"><span>${escapeHtml(t.monitor_demo_used)}</span><span>${escapeHtml(t.monitor_demo_total)}</span></span><span class="mpv-bar"><span></span></span></span>
            </div>
          </div>
        </div>`;
      const backupBox = `
        <div class="mpv mpv-backup" id="backup-preview">
          <div class="mpv-grid">
            <div class="mpv-cell" data-kind="last">
              <span class="mpv-label">${escapeHtml(t.monitor_backup_last)}</span>
              <span class="mpv-value">${escapeHtml(t.monitor_demo_ago)}</span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_when)}</span>
            </div>
            <div class="mpv-cell" data-kind="size">
              <span class="mpv-label">${escapeHtml(t.monitor_backup_size)}</span>
              <span class="mpv-value">2,8<span class="mpv-unit">GB</span></span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_auto)}</span>
            </div>
            <div class="mpv-cell" data-kind="name">
              <span class="mpv-label">${escapeHtml(t.monitor_backup_name)}</span>
              <span class="mpv-text">Automatic backup 2026.9.4</span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_count)}</span>
            </div>
            <div class="mpv-cell" data-kind="place">
              <span class="mpv-label">${escapeHtml(t.monitor_backup_where)}</span>
              <span class="mpv-text">${escapeHtml(t.monitor_demo_where)}</span>
              <span class="mpv-sub">${escapeHtml(t.monitor_demo_next)}</span>
            </div>
          </div>
          <div class="mpv-actions" data-backup-button><span class="mpv-btn">${escapeHtml(t.monitor_backup_now)}</span></div>
        </div>`;
      // Zaehler-Box: Beispielzahlen je Zaehler
      const countDemo = { devices: "87", entities: "1.243", integrations: "42", apps: "9", automations: "64", scenes: "12",
        scripts: "23", cards: "31", blueprints: "7", users: "3", tokens: "2" };
      // Zweite Zeile wie auf der echten Seite (seit 1.4.7 bei fast allen Zaehlern)
      const countSub = {};
      COUNT_ITEMS.forEach((key) => {
        countSub[key] = t[`count_demo_${key}`] || "";
      });
      const countsBox = `
        <div class="mpv mpv-counts" id="counts-preview">
          <div class="mpv-grid">${COUNT_ITEMS.map((key) => `
            <div class="mpv-cell" data-kind="${key}">
              <span class="mpv-label">${escapeHtml(t[`count_${key}`])}</span>
              <span class="mpv-value">${escapeHtml(this._de ? countDemo[key] : countDemo[key].replace(".", ","))}</span>
              <span class="mpv-sub" title="${escapeHtml(countSub[key] || "")}">${escapeHtml(countSub[key] || "\u00a0")}</span>
            </div>`).join("")}
          </div>
        </div>`;
      const stage = `
        <div class="stage ha-mock" data-stage="settings" data-theme-vars>
          ${this._sidebarZone(true)}
          <div class="hm-main">
            <div class="hm-bar spm-head"><strong data-pane-title>${escapeHtml(t.preview_settings)}</strong><span class="spm-fav" data-fav-slot="header" data-spot="favorites"></span></div>
            <div class="sp-pane spm-body" data-pane="page">
              <div class="spm-favs" data-fav-slot="page" data-spot="favorites"></div>
              <div class="spm-off" data-spot="monitor" hidden>${escapeHtml(t.monitor_off_stage)}</div>
              <div data-mon-slot="top" data-spot="monitor"></div>
              <div class="spv" id="settings-preview" data-spot="menu"></div>
              <div data-mon-slot="end" data-spot="monitor"></div>
              <div class="spm-tip" data-spot="menu" data-tip>${escapeHtml(t.stage_tip)}</div>
              <div hidden>${monitorBoxes}${backupBox}${countsBox}</div>
            </div>
            <div class="sp-pane" data-pane="list"><div class="lpv" id="list-preview" data-spot="list">${lcards}</div>${entriesPage}</div>
            <div class="sp-pane" data-pane="tables">
              <div class="tpv" id="table-preview" data-spot="tables">
                <div class="tpv-head"><span>${escapeHtml(t.settings_table_col_name)}</span><span>${escapeHtml(t.settings_table_col_area)}</span><span>${escapeHtml(t.table_col_state)}</span></div>
                ${trows}
              </div>
            </div>
          </div>
        </div>`;
      const panels = `
        ${panel("menu", t.settings_icons_title_short, `
          ${this._check("settings.icon_box", t.settings_icon_box, t.settings_icon_box_hint)}
          ${this._range("settings.icon_radius", t.settings_icon_radius_short, 0, 60, "px", "settings.icon_box")}
          <div class="rows">
            ${this._color("settings.icon_background", t.settings_icon_background, null, t.settings_box_placeholder)}
            ${this._color("settings.icon_color", t.settings_icon_color)}
          </div>
          <div class="grid2">
            ${this._field("settings.icon_box_size", t.settings_icon_box_size, "number", 'min="0" max="96"')}
            ${this._field("settings.icon_size", t.settings_icon_size, "number", 'min="0" max="64"')}
          </div>
          ${this._seg("settings.menu_columns", t.menu_columns, [["1", "1"], ["2", "2"], ["3", "3"]])}
          ${this._check("settings.menu_tiles", t.menu_tiles, t.menu_tiles_hint)}
          ${this._check("settings.hide_tip", t.settings_hide_tip, t.settings_hide_tip_hint)}
          ${this._check("settings.profile_page", t.settings_profile_page, t.settings_profile_page_hint)}
          <small class="field-hint">${escapeHtml(t.settings_icons_hint)}</small>
          ${this._grp("settings:menu-frame", t.settings_menu_frame, frame("menu", t.settings_menu_border_width, t.settings_menu_border_radius, [
            this._color("settings.menu_border_color", t.settings_menu_border_color),
          ]), { open: true })}
          ${this._grp("settings:menu-hover", t.section_hover, `
            <div class="grid2">
              ${this._color("settings.menu_hover_background", t.table_hover)}
              ${this._field("settings.menu_hover_opacity", t.settings_hover_opacity, "number", 'min="0" max="100"')}
            </div>
            <small class="field-hint">${escapeHtml(t.menu_hover_hint)}</small>`, { open: true })}
          ${this._grp("settings:menu-order", t.menu_entries_title, `
            <p class="hint">${escapeHtml(t.menu_entries_hint)}</p>
            <ul class="mlist" id="menu-entries"></ul>
            <small class="field-hint" id="menu-entries-note"></small>`, { open: false })}`)}
        ${panel("favorites", t.favorites_title, `
          <p class="hint">${escapeHtml(t.favorites_hint)}</p>
          ${this._seg("settings.favorites_place", t.favorites_place, [
            ["page", t.favorites_place_page],
            ["header", t.favorites_place_header],
          ], t.favorites_place_hint)}
          <div class="card-head hlinks-head">
            <h3>${escapeHtml(t.favorites_title)}</h3>
            <button class="icon-btn" id="add-favorite"
              title="${escapeHtml(t.favorite_add)}">${glyph("mdi:plus", "+")}</button>
          </div>
          <ul class="hlinks" id="favorite-links"></ul>`)}
        ${panel("monitor", t.monitor_title, `
          <p class="hint">${escapeHtml(t.monitor_hint)}</p>
          ${this._check("settings.monitor", t.monitor_show)}
          <div class="stack sub" data-show-when="settings.monitor">
            ${this._seg("settings.monitor_place", t.monitor_place, [
              ["top", t.monitor_place_top],
              ["end", t.monitor_place_end],
            ])}
            ${this._check("settings.monitor_graphs", t.monitor_graphs, t.monitor_graphs_hint)}
            <div class="card-head hlinks-head">
              <h3>${escapeHtml(t.monitor_sensors)}</h3>
              <span class="badge-ext" id="sensor-count"></span>
              <button class="icon-btn" id="add-sensor" title="${escapeHtml(t.monitor_sensor_add)}">${glyph("mdi:plus", "+")}</button>
            </div>
            <p class="hint">${escapeHtml(t.monitor_sensors_hint)}</p>
            <ul class="sensor-list" id="sensor-list"></ul>
            <datalist id="sh-entities"></datalist>
            ${this._check("settings.monitor_sensors_only", t.monitor_sensors_only, t.monitor_sensors_only_hint)}
          </div>
          ${this._check("settings.monitor_backup", t.monitor_backup, t.monitor_backup_hint)}
          <div class="stack sub" data-show-when="settings.monitor_backup">
            ${this._seg("settings.monitor_backup_place", t.monitor_backup_place, [
              ["top", t.monitor_backup_place_top],
              ["end", t.monitor_backup_place_end],
            ])}
            ${this._check("settings.monitor_backup_button", t.monitor_backup_button, t.monitor_backup_button_hint)}
          </div>
          ${this._check("settings.monitor_counts", t.monitor_counts, t.monitor_counts_hint)}
          <div class="stack sub" data-show-when="settings.monitor_counts">
            ${this._seg("settings.monitor_counts_place", t.monitor_counts_place, [
              ["top", t.monitor_counts_place_top],
              ["end", t.monitor_backup_place_end],
            ])}
            <div class="count-items" data-count-items>
              <span class="cap">${escapeHtml(t.monitor_counts_items)}</span>
              <div class="count-grid">${COUNT_ITEMS.map((key) => `
                <label class="check count-item">
                  <input type="checkbox" data-count-item="${key}" />
                  <span>${escapeHtml(t[`count_${key}`])}</span>
                </label>`).join("")}</div>
            </div>
          </div>
          <small class="field-hint">${escapeHtml(t.monitor_note)}</small>`)}
        ${panel("list", t.settings_list_title, `
          <p class="hint">${escapeHtml(t.settings_list_hint)}</p>
          ${this._check("settings.list_view", t.settings_list_view)}
          <div data-show-when="settings.list_view">
            ${this._segSelect(`<select data-list-cols><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>`, t.menu_columns, "", " data-list-cols-field")}
            <small class="field-hint">${escapeHtml(t.settings_list_columns_hint)}</small>
            <div class="list-cols-boxes" hidden>
              ${this._check("settings.list_two_columns", t.settings_list_two_columns)}
              ${this._check("settings.list_three_columns", t.settings_list_three_columns)}
            </div>
            ${this._check("settings.list_apps", t.settings_list_apps, t.settings_list_apps_hint)}
            ${this._check("settings.list_entries", t.settings_list_entries, t.settings_list_entries_hint)}
            <div class="stack sub" data-show-when="settings.list_entries">
              ${this._field("settings.list_entries_row_height", t.settings_list_entries_row_height, "number", 'min="0" max="120"')}
              <small class="field-hint">${escapeHtml(t.settings_list_entries_row_height_hint)}</small>
              <div class="grid2">
                ${this._color("settings.list_error_background", t.settings_list_error_background)}
                ${this._color("settings.list_warning_background", t.settings_list_warning_background)}
              </div>
              ${this._field("settings.list_problem_opacity", t.settings_list_problem_opacity, "number", 'min="0" max="100"')}
              <small class="field-hint">${escapeHtml(t.settings_list_problem_background_hint)}</small>
            </div>
            <div class="grid2">
              ${this._field("settings.list_row_height", t.settings_list_row_height, "number", 'min="0" max="200"')}
              ${this._field("settings.list_gap", t.settings_list_gap, "number", 'min="0" max="48"')}
              ${this._field("settings.list_max_width", t.settings_list_max_width, "number", 'min="0" max="4000"')}
              ${this._color("settings.list_background", t.settings_list_background)}
            </div>
            <small class="field-hint">${escapeHtml(t.settings_list_fields_hint)}</small>
            ${this._grp("settings:list-frame", t.settings_list_frame, frame("list", t.settings_list_border_width, t.settings_list_border_radius, [
              this._color("settings.list_border_color", t.settings_list_border_color),
            ]) + this._color("settings.list_error_color", t.settings_list_error_color), { open: true })}
            ${this._grp("settings:list-hover", t.section_hover, `
              <div class="grid2">
                ${this._color("settings.list_hover_background", t.settings_hover_background)}
                ${this._field("settings.list_hover_opacity", t.settings_hover_opacity, "number", 'min="0" max="100"')}
              </div>`, { open: true })}
          </div>
          <small class="field-hint">${escapeHtml(t.settings_list_note)}</small>`)}
        ${panel("tables", t.topic_tables_title, `
          <p class="hint">${escapeHtml(t.settings_table_hint)}</p>
          ${this._grp("settings:table-groups", t.table_groups_title, `
            <div class="stack">
              ${this._color("settings.table_group_background", t.settings_table_background)}
              ${this._color("settings.table_group_color", t.settings_table_color)}
            </div>
            <div class="grid2">
              ${this._field("settings.table_group_size", t.settings_table_size, "number", 'min="0" max="40"')}
              ${this._select("settings.table_group_weight", t.settings_table_weight, [
                ["", "–"], ["400", "400"], ["500", "500"], ["600", "600"], ["700", "700"],
              ])}
            </div>`, { open: true })}
          ${this._grp("settings:table-rows", t.table_rows_title, `
            <div class="stack">
              ${this._color("settings.table_row_background", t.table_row_background)}
              ${this._color("settings.table_zebra", t.table_zebra)}
              ${this._color("settings.table_hover_background", t.table_hover)}
            </div>
            <div class="grid2">
              ${this._field("settings.table_font_size", t.table_font_size, "number", 'min="0" max="24"')}
              ${this._field("settings.table_hover_opacity", t.settings_hover_opacity, "number", 'min="0" max="100"')}
            </div>
            <small class="field-hint">${escapeHtml(t.table_rows_hint)}</small>`, { open: true })}
          <small class="field-hint">${escapeHtml(t.settings_table_note)}</small>`)}
        <div class="fields-note"><p>${escapeHtml(t.settings_hint)}</p><p>${escapeHtml(t.settings_note)}</p></div>`;
      const head = `
        <h2 class="fields-title">${escapeHtml(t.tab_settings)}</h2>
        <div class="seg inline" data-view="settings">
          <button type="button" data-value="simple">${escapeHtml(t.view_simple)}</button>
          <button type="button" data-value="all">${escapeHtml(t.view_all_fields)}</button>
        </div>
        ${this._accordionBtn("settings")}
        <div class="seg subtabs" data-panes role="group" aria-label="${escapeHtml(t.pane_switch)}">
          <button type="button" data-pane-btn="page"><span>${escapeHtml(t.pane_page)}</span></button>
          <button type="button" data-pane-btn="list"><span>${escapeHtml(t.pane_list)}</span></button>
          <button type="button" data-pane-btn="tables"><span>${escapeHtml(t.pane_tables)}</span></button>
        </div>
        <h3 class="fields-topic" id="settings-topic-title"></h3>`;
      return `
        <section class="page stage-page" data-page="settings">
          ${this._stageCol(
            t.stage_settings_title,
            t.stage_settings_hint,
            stage,
            "",
            "",
            "settings-before"
          )}
          ${this._fieldsCol(head, panels, "", ' data-fields="settings"')}
        </section>`;
    }


    /**
     * Push the values of the mode being edited into the previews. Empty
     * fields fall back to what Home Assistant itself uses, so the preview
     * shows the real result and not the colors of this configuration page.
     */
    _updatePreview() {
      this._syncDashImage();
      this._updateHeaderPreview();
      this._updateSettingsPreview();
      this._renderSidebarPreview();
      const targets = this.shadowRoot.querySelectorAll("[data-theme-vars]");
      if (!targets.length) {
        return;
      }
      const mode = this._mode;
      const view = this._view();
      const values = (view.theme && view.theme[mode]) || {};
      const fallback = THEME_FALLBACK[mode] || {};
      // Per side / per corner beats the single value, same rule as theme.py.
      const composed = {};
      Object.keys(THEME_COMPOSED).forEach((target) => {
        const [switchKey, parts] = THEME_COMPOSED[target];
        if (values[switchKey]) {
          composed[target] = composedValue(values, parts);
        }
      });
      const dashboard = backgroundValue(values, true);
      if (dashboard) {
        composed["lovelace-background"] = dashboard;
      }
      THEME_VARIABLES.forEach((key) => {
        const value =
          composed[key] || withUnit(key, values[key]) || fallback[key] || "";
        targets.forEach((target) => {
          if (value) {
            target.style.setProperty(`--${key}`, value);
          } else {
            target.style.removeProperty(`--${key}`);
          }
        });
      });
      // Schalter wie ha-switch seit 2026.10 (1.4.7): Flaeche, Rand und Knopf
      // aus der Skala der Primaerfarbe (eigene Primaerfarbe -> eigene Skala,
      // sonst die von Home Assistant) und den grauen Stufen.
      const own = primaryPalette(values["primary-color"]);
      const scale = Object.keys(own).length ? own : HA_PRIMARY_SCALE;
      const dark = mode === "dark";
      // Design-Tokens, die Home Assistant aus der Skala ableitet: leer ->
      // aus der eigenen Skala (1.4.8). Ein eigener Wert gewinnt.
      const refs = TOKEN_PRIMARY_REFS[mode] || {};
      const token = {};
      Object.keys(refs).forEach((key) => {
        token[key] = withUnit(key, values[key]) || scale[`ha-color-primary-${refs[key]}`];
        targets.forEach((target) => target.style.setProperty(`--${key}`, token[key]));
      });
      const mine = (key) => withUnit(key, values[key]);
      const sw = {
        "--sh-sw-on-track": mine("ha-switch-checked-background-color") || token["ha-color-fill-primary-normal-resting"],
        "--sh-sw-on-border": mine("ha-switch-checked-border-color") || token["ha-color-border-primary-loud"],
        "--sh-sw-on-thumb": mine("ha-switch-checked-thumb-background-color") || token["ha-color-on-primary-normal"],
        "--sh-sw-off-track": mine("ha-switch-background-color") || mine("ha-color-fill-disabled-quiet-resting") || (dark ? "#202020" : "#f3f3f3"),
        "--sh-sw-off-border": mine("ha-switch-border-color") || mine("ha-color-border-neutral-normal") || (dark ? "#7a7a7a" : "#989898"),
        "--sh-sw-off-thumb": mine("ha-switch-thumb-background-color") || mine("ha-color-on-neutral-normal") || (dark ? "#989898" : "#5e5e5e"),
        "--sh-sw-thumb-shadow": mine("ha-switch-thumb-box-shadow") || "",
      };
      targets.forEach((target) => {
        Object.keys(sw).forEach((key) => {
          if (sw[key]) {
            target.style.setProperty(key, sw[key]);
          } else {
            target.style.removeProperty(key);
          }
        });
      });
    }

    /* ----------------------------------------------- Vorschau HA-Settings */

    /**
     * Die Vorschauen von HA-Settings: die Einstellungsseite (Menuepunkte,
     * Favoriten, Systemmonitor), Geraete & Dienste und die Tabellen. Mit
     * "Vorher" zeigen sie den gespeicherten Stand.
     */
    _updateSettingsPreview() {
      const before = !!this._before;
      const cfg = (before ? this._saved.settings : this._config && this._config.settings) || DEFAULT_SETTINGS;
      const t = this._t;
      const root = this.shadowRoot;
      const num = (key, min, max) =>
        Math.max(min, Math.min(max, Math.round(Number(cfg[key]) || 0)));
      const set = (box, name, value) => {
        if (value) {
          box.style.setProperty(name, value);
        } else {
          box.style.removeProperty(name);
        }
      };

      const rows = root.getElementById("settings-preview");
      if (rows) {
        const hidden = cfg.menu_hidden || [];
        const groups = this._menuGroups(cfg);
        const icon = (name) =>
          customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(name)}"></ha-icon>` : "&#9679;";
        let counter = 0;
        rows.innerHTML = groups
          .map((group) => {
            const shown = group.filter((one) => hidden.indexOf(one.path) < 0);
            if (!shown.length) {
              return "";
            }
            return `<div class="spm-block">${shown
              .map((one) => {
                const look = this._menuLook(one.path, counter);
                counter += 1;
                const own = (cfg.menu_items || {})[one.path] || {};
                const style = [`--c:${look[1]}`];
                if (own.icon_background) style.push(`--bg:${cssValue(own.icon_background)}`);
                if (own.icon_color) style.push(`--fg:${cssValue(own.icon_color)}`);
                // Zweite Zeile wie in Home Assistant (1.4.9) - aus, wenn der
                // Punkt "Untertitel ausblenden" hat.
                const sub = own.hide_sub ? "" : one.sub || "";
                return `
                <div class="spv-row">
                  <span class="spv-icon" style="${escapeHtml(style.join(";"))}">${icon(own.icon && ICON_NAME.test(own.icon) ? own.icon : look[0])}</span>
                  <span class="spv-text"><strong>${escapeHtml(own.name || one.name)}</strong>${sub ? `<small>${escapeHtml(sub)}</small>` : ""}</span>
                </div>`;
              })
              .join("")}</div>`;
          })
          .join("");
        // Wie Home Assistant: die Box ist das Symbol plus Innenabstand, sie
        // wird nie kleiner als das Symbol.
        const glyphSize = num("icon_size", 0, 64) || 24;
        const wanted = num("icon_box_size", 0, 96);
        const boxSize = wanted > 0 ? Math.max(wanted, glyphSize) : glyphSize + 16;
        rows.toggleAttribute("data-box", cfg.icon_box === true);
        set(rows, "--r", `${num("icon_radius", 0, 60)}px`);
        set(rows, "--ico", `${glyphSize}px`);
        set(rows, "--box", `${boxSize}px`);
        set(rows, "--bg", String(cfg.icon_background || "").trim());
        set(rows, "--fg", String(cfg.icon_color || "").trim());
        const widths = frameValues(cfg, "menu", "border", 20, "0px", 8);
        const radii = frameValues(cfg, "menu", "corner", 60, "4px", 24);
        rows.toggleAttribute("data-frame", !!(widths || radii));
        set(rows, "--mbw", widths || "0px");
        set(rows, "--mbr", radii);
        set(rows, "--mbc", String(cfg.menu_border_color || "").trim());
        const menuHover = String(cfg.menu_hover_background || "").trim();
        const menuOpacity = num("menu_hover_opacity", 0, 100);
        const menuTint =
          menuOpacity >= 100 ? menuHover : `color-mix(in srgb, ${menuHover} ${menuOpacity}%, transparent)`;
        set(rows, "--mh", menuHover ? `linear-gradient(${menuTint}, ${menuTint})` : "");
        // Der Hover der Menuepunkte gilt auch fuer Systemmonitor und Backup
        root.querySelectorAll("[data-mon-slot]").forEach((one) =>
          set(one, "--mh", menuHover ? `linear-gradient(${menuTint}, ${menuTint})` : "")
        );
        const cols = Math.min(3, Math.max(1, Math.round(Number(cfg.menu_columns) || 1)));
        set(rows, "--mcols", cols > 1 ? String(cols) : "");
        rows.toggleAttribute("data-cols", cols > 1);
        rows.toggleAttribute("data-tiles", cfg.menu_tiles === true);
      }

      // Favoriten oben auf der Seite oder in der Kopfzeile. Leer steht oben
      // ein Platzhalter, damit man die Leiste anklicken kann.
      const favs = cfg.favorites || [];
      const topic = this._secs.settings;
      root.querySelectorAll("[data-fav-slot]").forEach((slot) => {
        const here = slot.dataset.favSlot === (cfg.favorites_place === "header" ? "header" : "page");
        if (!here) {
          slot.innerHTML = "";
          slot.hidden = slot.dataset.favSlot === "page";
          return;
        }
        slot.hidden = false;
        if (!favs.length) {
          slot.innerHTML = slot.dataset.favSlot === "page"
            ? `<span class="spm-empty">${escapeHtml(t.favorites_empty_stage)}</span>`
            : `<span class="spm-empty">${escapeHtml(t.favorites_title)}</span>`;
          return;
        }
        slot.innerHTML = favs
          .map((raw) => {
            const fav = Object.assign({}, DEFAULT_FAVORITE, raw);
            const s = [];
            const px = (value, max) => (Number(value) >= 0 ? `${Math.min(max, Number(value))}px` : "");
            if (String(fav.text_color || "").trim()) s.push(`--ftc:${cssValue(fav.text_color)}`);
            if (String(fav.background || "").trim()) s.push(`--fbg:${cssValue(fav.background)}`);
            if (String(fav.color || "").trim()) s.push(`--fic:${cssValue(fav.color)}`);
            if (String(fav.border_color || "").trim()) s.push(`--fbc:${cssValue(fav.border_color)}`);
            if (px(fav.height, 60)) s.push(`--fh:${px(fav.height, 60)}`);
            if (!fav.border_split && px(fav.border_width, 8)) s.push(`--fbw:${px(fav.border_width, 8)}`);
            if (!fav.radius_split && px(fav.radius, 30)) s.push(`--fr:${px(fav.radius, 30)}`);
            const icon = customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(fav.icon || LINK_ICON)}"></ha-icon>` : "";
            return `<span class="spm-fav-chip"${fav.uppercase ? " data-upper" : ""} style="${escapeHtml(s.join(";"))}">${icon}${
              fav.icon_only ? "" : `<span>${escapeHtml(fav.name || fav.path)}</span>`
            }</span>`;
          })
          .join("");
      });

      // Systemmonitor und letztes Backup an ihre Stelle im Modell. Beide aus:
      // ein Platzhalter zum Anklicken - ausser das Thema ist gerade offen,
      // dann zeigt das Modell die Kaesten blass.
      const monitor = root.getElementById("monitor-preview");
      const backupBox = root.getElementById("backup-preview");
      const slot = (place) => root.querySelector(`[data-mon-slot="${place === "end" ? "end" : "top"}"]`);
      const off = cfg.monitor !== true && cfg.monitor_backup !== true && cfg.monitor_counts !== true;
      // Die Tipp-Zeile von Home Assistant unter den Menuepunkten
      const tip = root.querySelector(".spm-tip");
      if (tip) {
        tip.hidden = cfg.hide_tip === true;
      }
      const placeholder = root.querySelector(".spm-off");
      if (placeholder) {
        placeholder.hidden = !off || topic === "monitor";
      }
      if (monitor) {
        monitor.toggleAttribute("data-graphs", cfg.monitor_graphs === true);
        monitor.toggleAttribute("data-off", cfg.monitor !== true);
        monitor.hidden = cfg.monitor !== true && topic !== "monitor";
        const target = slot(cfg.monitor_place);
        if (target && monitor.parentElement !== target) {
          target.appendChild(monitor);
        }
        const sub = monitor.querySelector('.mpv-cell[data-kind="disk"] .mpv-sub');
        if (sub) {
          sub.textContent = cfg.monitor_graphs === true ? t.monitor_demo_free : t.monitor_demo_disk;
        }
      }
      this._updateSensorPreview(cfg);
      if (backupBox) {
        const button = backupBox.querySelector("[data-backup-button]");
        if (button) {
          button.hidden = cfg.monitor_backup_button !== true;
        }
        backupBox.toggleAttribute("data-off", cfg.monitor_backup !== true);
        backupBox.hidden = cfg.monitor_backup !== true && topic !== "monitor";
        const target = slot(cfg.monitor_backup_place);
        if (target && backupBox.parentElement !== target) {
          target.appendChild(backupBox);
        }
      }
      // Zaehler-Box: nur die gewaehlten Zaehler
      const countsBox = root.getElementById("counts-preview");
      if (countsBox) {
        const items = Array.isArray(cfg.monitor_counts_items) ? cfg.monitor_counts_items : COUNT_ITEMS;
        countsBox.toggleAttribute("data-off", cfg.monitor_counts !== true);
        countsBox.hidden = (cfg.monitor_counts !== true || !items.length) && topic !== "monitor";
        countsBox.querySelectorAll(".mpv-cell[data-kind]").forEach((cell) => {
          cell.hidden = items.indexOf(cell.dataset.kind) < 0;
        });
        const target = slot(cfg.monitor_counts_place);
        if (target && countsBox.parentElement !== target) {
          target.appendChild(countsBox);
        }
      }
      // In jedem Platz dieselbe Reihenfolge: Monitor, Backup, Zaehler
      root.querySelectorAll("[data-mon-slot]").forEach((one) => {
        [monitor, backupBox, countsBox].forEach((box) => {
          if (box && box.parentElement === one) {
            one.appendChild(box);
          }
        });
      });

      const list = root.getElementById("list-preview");
      if (list) {
        // Nur ein Modell im Kleinen: die Vorschau ist schmaler als die Seite,
        // also werden Hoehe, Abstand und Breite verkleinert.
        const height = num("list_row_height", 0, 200) || 56;
        const scale = 0.7;
        list.toggleAttribute("data-list", cfg.list_view === true);
        set(list, "--cols", cfg.list_three_columns === true ? "3" : cfg.list_two_columns === true ? "2" : "");
        set(list, "--row", `${Math.max(24, Math.round(height * scale))}px`);
        set(list, "--gap", `${Math.round(num("list_gap", 0, 48) * scale)}px`);
        const width = num("list_max_width", 0, 4000);
        set(list, "--maxw", width > 0 ? `${Math.max(180, Math.round(width * 0.5))}px` : "");
        // Rahmen bis 8 px, Ecken bis 24 px.
        set(list, "--bw", frameValues(cfg, "list", "border", 20, "1px", 8));
        set(list, "--br", frameValues(cfg, "list", "corner", 60, "10px", 24));
        set(list, "--bc", String(cfg.list_border_color || "").trim());
        set(list, "--ec", String(cfg.list_error_color || "").trim());
        const rowBg = String(cfg.list_background || "").trim();
        set(list, "--rbg", rowBg);
        const hover = String(cfg.list_hover_background || "").trim();
        const hoverOpacity = num("list_hover_opacity", 0, 100);
        const tint = hoverOpacity >= 100 ? hover : `color-mix(in srgb, ${hover} ${hoverOpacity}%, transparent)`;
        // Ein Verlauf als Zeilenhintergrund bleibt unter der Hover-Farbe stehen.
        const under = rowBg && !(window.CSS && CSS.supports && CSS.supports("color", rowBg)) ? `, ${rowBg}` : "";
        set(list, "--hv", hover ? `linear-gradient(${tint}, ${tint})${under}` : "");
      }

      // 1.5.5: die Seite einer Integration - dieselben Werte wie im Injector
      const page = root.getElementById("entries-preview");
      if (page) {
        const shown = cfg.list_view === true && cfg.list_entries !== false;
        page.hidden = !shown;
        const scale = 0.7;
        set(page, "--ebw", frameValues(cfg, "list", "border", 20, "1px", 8));
        set(page, "--ebr", frameValues(cfg, "list", "corner", 60, "10px", 24));
        set(page, "--ebc", String(cfg.list_border_color || "").trim());
        set(page, "--eec", String(cfg.list_error_color || "").trim());
        set(page, "--ebg", String(cfg.list_background || "").trim());
        set(page, "--egap", `${Math.max(3, Math.round(Math.max(num("list_gap", 0, 48), 4) * scale))}px`);
        const rowHeight = num("list_entries_row_height", 0, 120);
        set(page, "--erow", rowHeight > 0 ? `${Math.round(Math.min(120, Math.max(32, rowHeight)) * scale)}px` : "");
        // Hintergrund bei Problemen mit der gemeinsamen Deckkraft
        const opacity = cfg.list_problem_opacity === "" || cfg.list_problem_opacity === undefined ? 100 : num("list_problem_opacity", 0, 100);
        const problem = (raw) => {
          const color = String(raw || "").trim();
          if (!color) {
            return "";
          }
          const plain = !!(window.CSS && CSS.supports && CSS.supports("color", color));
          if (opacity >= 100) {
            return plain ? `linear-gradient(${color}, ${color})` : color;
          }
          if (plain) {
            const mixed = `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
            return `linear-gradient(${mixed}, ${mixed})`;
          }
          const veil = `color-mix(in srgb, var(--card-background-color, #fff) ${100 - opacity}%, transparent)`;
          return `linear-gradient(${veil}, ${veil}), ${color}`;
        };
        set(page, "--eerr", problem(cfg.list_error_background));
        set(page, "--ewarn", problem(cfg.list_warning_background));
      }

      const table = root.getElementById("table-preview");
      if (table) {
        set(table, "--tg-bg", String(cfg.table_group_background || "").trim());
        set(table, "--tg-fg", String(cfg.table_group_color || "").trim());
        const tableSize = num("table_group_size", 0, 40);
        set(table, "--tg-size", tableSize > 0 ? `${tableSize}px` : "");
        set(table, "--tg-weight", String(cfg.table_group_weight || "").trim());
        // Zeilen: jede zweite gestreift (Zaehlung ueber die Datenzeilen, die
        // Gruppenkoepfe zaehlen nicht mit), Hover, Schriftgroesse.
        set(table, "--tz", String(cfg.table_zebra || "").trim());
        set(table, "--trb", String(cfg.table_row_background || "").trim());
        const rowHover = String(cfg.table_hover_background || "").trim();
        const rowOpacity = num("table_hover_opacity", 0, 100);
        const rowTint =
          rowOpacity >= 100 ? rowHover : `color-mix(in srgb, ${rowHover} ${rowOpacity}%, transparent)`;
        set(table, "--th", rowHover ? `linear-gradient(${rowTint}, ${rowTint})` : "");
        const rowSize = num("table_font_size", 0, 24);
        set(table, "--ts", rowSize > 0 ? `${Math.max(rowSize, 10)}px` : "");
        table.querySelectorAll(".tpv-row").forEach((row, index) => {
          row.toggleAttribute("data-even", index % 2 === 1);
        });
      }
      this._applyStageMarks();
    }

    /** Die Vorschau der Kopfzeile mit den Werten der Seite (oder "Vorher"). */
    _updateHeaderPreview() {
      const box = this.shadowRoot.getElementById("header-preview");
      if (!box) {
        return;
      }
      const view = this._view();
      const head = view.header || {};
      const bar = box.querySelector(".hpv-bar");
      const titel = box.querySelector(".hpv-title");
      // Die eigenen Knoepfe (Neustart, Links) stehen vor denen von Home
      // Assistant - wie im Injector.
      const actions = box.querySelector(".hpv-actions");
      actions.querySelectorAll(".hpv-own").forEach((one) => one.remove());
      const eigene = [];
      if (head.show_restart === true) {
        const own = (view.items && view.items[RESTART_KEY]) || {};
        eigene.push({ icon: ICON_NAME.test(own.icon || "") ? own.icon : "mdi:restart", color: "" });
      }
      (head.links || []).forEach((link) =>
        eigene.push({
          icon: link.entity && link.value_only ? "" : link.icon || this._linkIcon(link),
          color: String(link.color || "").trim(),
          // 1.5.4: ein Sensor zeigt seinen Wert wie in Home Assistant - in
          // seiner eigenen Farbe, sonst in der des Icons
          text: link.entity ? this._sensorText(link.entity) : "",
          textColor: link.entity ? String(link.value_color || link.color || "").trim() : "",
        })
      );
      eigene
        .slice()
        .reverse()
        .forEach((one) => {
          const span = document.createElement("span");
          span.className = "hpv-own";
          if (!one.icon) {
            // nur der Wert
          } else if (customElements.get("ha-icon")) {
            const icon = document.createElement("ha-icon");
            icon.setAttribute("icon", one.icon);
            if (one.color) {
              icon.style.color = one.color;
            }
            span.appendChild(icon);
          } else {
            span.textContent = "•";
          }
          if (one.text) {
            span.classList.add("hpv-sensor");
            const val = document.createElement("b");
            val.textContent = one.text;
            if (one.textColor) {
              val.style.color = one.textColor;
            }
            span.appendChild(val);
          }
          if (one.color && !one.text) {
            span.style.color = one.color;
          }
          actions.insertBefore(span, actions.firstChild);
        });
      const icons = box.querySelectorAll(".hpv-icon, .hpv-actions");
      const reiter = box.querySelectorAll(".hpv-tab");
      // Maus hover ueber einem Reiter
      const hover = String(head.tab_hover_background || "").trim();
      const hoverOpacity = Math.min(100, Math.max(0, Math.round(Number(head.tab_hover_opacity))));
      const hoverDeckt = !isFinite(hoverOpacity) || hoverOpacity >= 100;
      if (hover) {
        box.style.setProperty(
          "--tab-hover",
          hoverDeckt ? hover : `color-mix(in srgb, ${hover} ${hoverOpacity}%, transparent)`
        );
      } else {
        box.style.removeProperty("--tab-hover");
      }

      const px = (raw, min, max) => {
        const n = Math.round(Number(raw) || 0);
        return n > 0 ? `${Math.min(max, Math.max(min, n))}px` : "";
      };
      const setze = (element, prop, wert) => {
        if (wert) {
          element.style.setProperty(prop, wert);
        } else {
          element.style.removeProperty(prop);
        }
      };
      // CPU/RAM und die Knoepfe von Home Assistant wie eingestellt
      // CPU/RAM und Speicherplatz: jeweils ein kleiner Titel ueber dem Wert
      const sys = box.querySelector(".hpv-sys");
      if (sys) {
        const cpu = head.show_system === true;
        const disk = head.show_disk === true;
        sys.hidden = !cpu && !disk;
        sys.querySelectorAll("[data-sys]").forEach((item) => {
          const kind = item.dataset.sys;
          item.hidden = kind === "cpu" || kind === "ram" ? !cpu : !disk;
        });
      }
      box.querySelectorAll("[data-hpv]").forEach((button) => {
        const kind = button.dataset.hpv;
        button.hidden =
          (kind === "add" && head.hide_add === true) ||
          (kind === "search" && head.hide_search === true) ||
          (kind === "assist" && head.hide_assist === true) ||
          (kind === "edit" && head.hide_edit === true);
      });

      bar.style.display = head.hidden ? "none" : "";
      // 1.5.6: Kopfzeile unten - die Leiste rutscht unter die Karten
      box.toggleAttribute("data-hbottom", head.position === "bottom" && !head.hidden);
      const barHeight = Number(head.height) > 0 ? Math.min(200, Math.max(24, Math.round(Number(head.height)))) : 56;
      box.style.setProperty("--hpv-h", `${barHeight}px`);
      const off = box.querySelector(".hpv-off");
      if (off) {
        off.hidden = !head.hidden;
      }
      if (head.hidden) {
        return;
      }

      setze(bar, "height", px(head.height, 24, 200));
      setze(bar, "background", headerBackgroundOf(head));
      setze(bar, "color", String(head.text_color || "").trim());
      const blur = px(head.blur, 1, 60);
      setze(bar, "backdrop-filter", blur ? `blur(${blur})` : "");

      const breiten = head.border_split
        ? [head.border_top, head.border_right, head.border_bottom, head.border_left]
            .map((one) => `${Math.max(0, Math.round(Number(one) || 0))}px`)
            .join(" ")
        : px(head.border_width, 0, 20);
      const hatRahmen = breiten && breiten !== "0px" && breiten !== "0px 0px 0px 0px";
      setze(bar, "border-style", hatRahmen ? "solid" : "");
      setze(bar, "border-width", hatRahmen ? breiten : "");
      setze(bar, "border-color",
        hatRahmen ? String(head.border_color || "").trim() || "currentColor" : "");

      const ecken = head.radius_split
        ? [head.radius_tl, head.radius_tr, head.radius_br, head.radius_bl]
            .map((one) => `${Math.max(0, Math.round(Number(one) || 0))}px`)
            .join(" ")
        : px(head.radius, 0, 60);
      setze(bar, "border-radius",
        ecken && ecken !== "0px" && ecken !== "0px 0px 0px 0px" ? ecken : "");

      setze(titel, "font-size", px(head.font_size, 8, 60));
      setze(titel, "font-weight", String(head.font_weight || "").trim());
      // Groesse und Staerke gelten auch fuer die Reiter, wie im Injector.
      reiter.forEach((element) => {
        setze(element, "font-size", px(head.font_size, 8, 60));
        setze(element, "font-weight", String(head.font_weight || "").trim());
      });

      const iconGroesse = px(head.icon_size, 8, 64);
      const iconFarbe = String(head.icon_color || "").trim();
      icons.forEach((element) => {
        setze(element, "font-size", iconGroesse);
        setze(element, "--mdc-icon-size", iconGroesse);
        setze(element, "color", iconFarbe);
      });
      // Farbe der rechten Seite: Knoepfe und CPU/RAM/Speicher
      const rechts = String(head.actions_color || "").trim();
      const rechtsBox = box.querySelector(".hpv-right");
      if (rechtsBox) {
        setze(rechtsBox, "color", rechts);
      }
      const knoepfe = box.querySelector(".hpv-actions");
      if (knoepfe) {
        setze(knoepfe, "color", rechts || iconFarbe);
      }

      const reiterFarbe = String(head.tab_color || "").trim();
      const aktiv = String(head.tab_color_active || "").trim();
      const strich = String(head.tab_indicator_color || "").trim();
      reiter.forEach((element) => {
        const an = element.hasAttribute("data-on");
        setze(element, "color", an ? aktiv || reiterFarbe : reiterFarbe);
        setze(element, "border-bottom-color", an ? strich || "" : "");
      });

      // Rahmen um die Einzelelemente: Button und Reiter als innerer Schatten
      // (wie im Injector: leere Elemente bleiben unsichtbar, und der Strich der
      // aktiven Ansicht bleibt).
      const rand = Math.max(0, Math.round(Number(head.element_border_width) || 0));
      const rundung = Math.max(0, Math.round(Number(head.element_radius) || 0));
      const randFarbe = String(head.element_border_color || "").trim() || "currentColor";
      const buttons = box.querySelectorAll(".hpv-icon, .hpv-actions > *");
      const fuerButtons = head.element_border_buttons !== false;
      const fuerReiter = head.element_border_tabs !== false;
      buttons.forEach((element) => {
        const an = fuerButtons && (rand > 0 || rundung > 0);
        setze(element, "box-shadow", an && rand > 0 ? `inset 0 0 0 ${rand}px ${randFarbe}` : "");
        setze(element, "border-radius", an && rundung > 0 ? `${rundung}px` : "");
        setze(element, "padding", an ? "3px" : "");
        setze(element, "display", an ? "inline-flex" : "");
      });
      reiter.forEach((element) => {
        const an = fuerReiter && (rand > 0 || rundung > 0);
        setze(element, "box-shadow", an && rand > 0 ? `inset 0 0 0 ${rand}px ${randFarbe}` : "");
        setze(element, "border-radius", an && rundung > 0 ? `${rundung}px` : "");
        setze(element, "padding", an ? "3px 8px" : "");
      });
    }

    /** Show the fields of one mode, hide the other one. */
    _applyMode() {
      const root = this.shadowRoot;
      const t = this._t;
      root.querySelectorAll("[data-set-mode]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.setMode === this._mode);
      });
      root.querySelectorAll(".theme-mode").forEach((group) => {
        group.hidden = group.dataset.mode !== this._mode;
      });
      const copy = root.getElementById("theme-copy");
      if (copy) {
        copy.textContent =
          this._mode === "dark" ? t.theme_copy_to_light : t.theme_copy_to_dark;
      }
      this._markChanges();
      this._sectionCounts();
      this._updatePreview();
    }

    /** Copy every value of the mode being edited over to the other one. */
    _copyMode() {
      const from = this._mode;
      const to = from === "dark" ? "light" : "dark";
      THEME_VARIABLES.concat(Object.keys(THEME_EXTRAS)).forEach((key) => {
        this._config.theme[to][key] = this._config.theme[from][key];
      });
      this._fillInputs();
      this._touch();
      this._flash(this._t.theme_copied);
    }

    /** Empty every value of the mode being edited. */
    _clearMode() {
      if (!window.confirm(this._t.theme_clear_confirm)) {
        return;
      }
      THEME_VARIABLES.forEach((key) => {
        this._config.theme[this._mode][key] = "";
      });
      Object.keys(THEME_EXTRAS).forEach((key) => {
        this._config.theme[this._mode][key] = THEME_EXTRAS[key];
      });
      this._fillInputs();
      this._touch();
    }

    /**
     * Eine neue Zwischenueberschrift anlegen. Sie kommt an den Anfang der
     * Liste - von dort zieht man sie an die Stelle, wo sie hin soll. Sie ist
     * gleich ausgewaehlt, das Namensfeld hat den Fokus.
     */
    _addHeading() {
      const key =
        HEADING_PREFIX +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 6);
      this._config.items[key] = Object.assign({}, DEFAULT_HEADING);
      this._config.order = [key].concat(
        (this._config.order || []).filter((one) => one !== key)
      );
      this._selKey = key;
      this._itemsView = "entry";
      this._syncEntries(true);
      this._touch();
      this._focusInspectorName();
    }

    /* ------------------------------ Link-Listen (Kopfzeile, Favoriten) */

    /**
     * Wo eine Link-Liste gespeichert ist und in welcher <ul> sie steht:
     * "header" -> header.links, "favorites" -> settings.favorites.
     */
    _linkStore(kind) {
      return kind === "favorites"
        ? { section: this._config.settings, key: "favorites", list: "favorite-links", empty: this._t.favorites_empty }
        : { section: this._config.header, key: "links", list: "header-links", empty: this._t.header_links_empty };
    }

    /**
     * Eine Link-Liste neu aufbauen. Nur nach dem Laden und nach Hinzufuegen,
     * Entfernen oder Verschieben - beim Tippen bleibt sie stehen, sonst ginge
     * mit jedem Zeichen der Fokus verloren.
     */
    _renderLinkList(kind) {
      const store = this._linkStore(kind);
      const list = this.shadowRoot.getElementById(store.list);
      if (!list) {
        return;
      }
      const t = this._t;
      const links = (store.section && store.section[store.key]) || [];
      if (!links.length) {
        list.innerHTML = `<li class="empty">${escapeHtml(store.empty)}</li>`;
        return;
      }
      if (kind === "favorites") {
        list.innerHTML = links.map((link, index) => this._favoriteRow(link, index, links.length)).join("");
        this._upgradeLinkIcons(kind, list);
        return;
      }
      list.innerHTML = links
        .map(
          (link, index) => link.entity ? this._sensorRow(link, index, links.length) : `
          <li class="hlink" data-index="${index}">
            <span class="row-icon">${
              customElements.get("ha-icon")
                ? `<ha-icon icon="${escapeHtml(link.icon || this._linkIcon(link))}"${
                    link.color ? ` style="color:${escapeHtml(link.color)}"` : ""
                  }></ha-icon>`
                : ""
            }</span>
            <span class="row-title">
              <strong>${escapeHtml(link.entity ? t.header_link_sensor : t.link)}</strong>
              <small>${escapeHtml(link.entity || link.path)}</small>
            </span>
            <input type="text" data-hprop="name" value="${escapeHtml(link.name)}"
              maxlength="60" placeholder="${escapeHtml(link.entity ? this._entityName(link.entity) || t.name : t.name)}" title="${escapeHtml(t.name)}" />
            <input type="text" data-hprop="icon" value="${escapeHtml(link.icon)}"
              spellcheck="false" placeholder="${escapeHtml(link.entity ? t.header_sensor_icon_auto : "mdi:link-variant")}" title="${escapeHtml(t.icon)}" />
            <span class="color-field" title="${escapeHtml(t.header_link_color)}">
              <input type="color" data-hcolor value="${escapeHtml(asHexColor(link.color))}" />
              <input type="text" data-hprop="color" value="${escapeHtml(link.color)}"
                spellcheck="false" placeholder="theme" />
              <button class="clear" data-haction="clear" title="reset">&#10005;</button>
            </span>
            <button class="icon-btn" data-haction="up" ${index === 0 ? "disabled" : ""}
              title="${escapeHtml(t.header_link_up)}">${glyph("mdi:arrow-up", "&#9650;")}</button>
            <button class="icon-btn" data-haction="down" ${
              index === links.length - 1 ? "disabled" : ""
            } title="${escapeHtml(t.header_link_down)}">${glyph("mdi:arrow-down", "&#9660;")}</button>
            <button class="icon-btn warn" data-haction="remove"
              title="${escapeHtml(t.link_remove)}">${glyph("mdi:trash-can-outline", "&#10005;")}</button>
          </li>`
        )
        .join("");
      this._upgradeLinkIcons(kind, list);
    }

    /* 1.4.4: Aussehen eines Favoriten - Farben als Zeilen, Zahlen in einer Reihe */
    _favoriteRow(link, index, count) {
      const t = this._t;
      const look = Object.assign({}, DEFAULT_FAVORITE, link);
      const open = (this._favOpen || new Set()).has(link.path);
      const color = (prop, label) => `
        <label class="field"><span>${escapeHtml(label)}</span>
          <span class="color-field">
            <input type="color" data-hcolor="${prop}" value="${escapeHtml(asHexColor(look[prop]))}" />
            <input type="text" data-hprop="${prop}" value="${escapeHtml(look[prop])}"
              spellcheck="false" placeholder="theme" />
            <button class="clear" data-haction="clear" data-prop="${prop}" title="reset">&#10005;</button>
          </span>
        </label>`;
      const num = (prop, label, max) => `
        <label class="field"><span>${escapeHtml(label)}</span>
          <input type="number" min="0" max="${max || 80}" data-hnum="${prop}"
            value="${look[prop] >= 0 ? escapeHtml(look[prop]) : ""}" placeholder="${escapeHtml(t.settings_standard)}" />
        </label>`;
      const check = (prop, label) => `
        <label class="check">
          <input type="checkbox" data-hbool="${prop}"${look[prop] ? " checked" : ""} />
          <span>${escapeHtml(label)}</span>
        </label>`;
      return `
          <li class="hlink fav" data-index="${index}"${open ? " data-open" : ""}>
            <div class="fav-main">
              <span class="row-icon">${
                customElements.get("ha-icon")
                  ? `<ha-icon icon="${escapeHtml(look.icon || LINK_ICON)}"${
                      look.color ? ` style="color:${escapeHtml(look.color)}"` : ""
                    }></ha-icon>`
                  : ""
              }</span>
              <span class="row-title">
                <strong>${escapeHtml(t.link)}</strong>
                <small>${escapeHtml(look.path)}</small>
              </span>
              <input type="text" data-hprop="name" value="${escapeHtml(look.name)}"
                maxlength="60" placeholder="${escapeHtml(t.name)}" title="${escapeHtml(t.name)}" />
              <button class="icon-btn" data-haction="up" ${index === 0 ? "disabled" : ""}
                title="${escapeHtml(t.header_link_up)}">${glyph("mdi:arrow-up", "&#9650;")}</button>
              <button class="icon-btn" data-haction="down" ${index === count - 1 ? "disabled" : ""}
                title="${escapeHtml(t.header_link_down)}">${glyph("mdi:arrow-down", "&#9660;")}</button>
              <button class="icon-btn warn" data-haction="remove"
                title="${escapeHtml(t.link_remove)}">${glyph("mdi:trash-can-outline", "&#10005;")}</button>
              <button class="icon-btn" data-haction="more"${open ? " data-on" : ""}
                title="${escapeHtml(t.favorite_look)}">${glyph("mdi:tune-variant", "&#9998;")}</button>
            </div>
            <div class="fav-extra">
              <div class="rows fav-colors">
                ${color("text_color", t.text_color)}
                ${color("background", t.item_background)}
                ${color("color", t.icon_color)}
              </div>
              <label class="field fav-icon"><span>${escapeHtml(t.icon)}</span>
                <input type="text" data-hprop="icon" value="${escapeHtml(look.icon)}"
                  spellcheck="false" placeholder="mdi:link-variant" title="${escapeHtml(t.icon)}" />
              </label>
              <div class="head-block">
                <div class="grid-mini hd-nums" style="--n:${1 + (look.border_split ? 0 : 1) + (look.radius_split ? 0 : 1)}">
                  ${num("height", t.heading_height)}
                  ${look.border_split ? "" : num("border_width", t.settings_menu_border_width)}
                  ${look.radius_split ? "" : num("radius", t.settings_menu_border_radius, 200)}
                </div>
                <small class="field-hint">${escapeHtml(t.favorite_look_hint)}</small>
                <div class="rows">${color("border_color", t.settings_menu_border_color)}</div>
                ${check("border_split", t.item_border_split)}
                ${
                  look.border_split
                    ? `<div class="grid-mini four">
                        ${num("border_top", t.side_top)}
                        ${num("border_right", t.side_right)}
                        ${num("border_bottom", t.side_bottom)}
                        ${num("border_left", t.side_left)}
                      </div>`
                    : ""
                }
                ${check("radius_split", t.item_radius_split)}
                ${
                  look.radius_split
                    ? `<div class="grid-mini four">
                        ${num("radius_tl", t.corner_tl, 200)}
                        ${num("radius_tr", t.corner_tr, 200)}
                        ${num("radius_br", t.corner_br, 200)}
                        ${num("radius_bl", t.corner_bl, 200)}
                      </div>`
                    : ""
                }
                ${check("uppercase", t.heading_uppercase)}
                ${check("icon_only", t.favorite_icon_only)}
              </div>
            </div>
          </li>`;
    }

    /** Das Icon-Auswahlfeld von Home Assistant in einer Link-Liste. */
    _upgradeLinkIcons(kind, list) {
      // Das Icon-Auswahlfeld von Home Assistant, sobald es geladen ist - wie
      // in der Eintragsliste.
      if (this._iconPicker) {
        list.querySelectorAll('input[data-hprop="icon"]').forEach((input) => {
          const row = input.closest("li.hlink");
          const picker = document.createElement("ha-icon-picker");
          picker.hass = this._hass;
          picker.value = input.value || "";
          picker.label = "";
          picker.placeholder = input.placeholder;
          picker.addEventListener("value-changed", (event) => {
            event.stopPropagation();
            this._setLink(kind, row, "icon", (event.detail && event.detail.value) || "");
          });
          input.replaceWith(picker);
        });
      }
    }

    /** Einen Wert eines Links schreiben und die Zeile nachziehen. */
    _setLink(kind, row, prop, raw) {
      const store = this._linkStore(kind);
      const index = Number(row.dataset.index);
      const links = (store.section[store.key] || []).slice();
      if (!links[index]) {
        return;
      }
      if (prop === "value_only" && kind === "header") {
        // Sensor: nur der Wert, ohne Icon (1.5.4)
        links[index] = Object.assign({}, links[index], { value_only: raw === true });
        store.section[store.key] = links;
        this._touch();
        return;
      }
      if (typeof DEFAULT_FAVORITE[prop] === "boolean" && kind === "favorites") {
        links[index] = Object.assign({}, links[index], { [prop]: raw === true });
        store.section[store.key] = links;
        this._touch();
        return;
      }
      if (typeof DEFAULT_FAVORITE[prop] === "number" && kind === "favorites") {
        const text = String(raw === undefined || raw === null ? "" : raw).trim();
        const limit = prop.indexOf("radius") === 0 ? 200 : 80;
        const zahl = Math.round(Number(text));
        links[index] = Object.assign({}, links[index], {
          [prop]: text === "" || !Number.isFinite(zahl) ? -1 : Math.min(limit, Math.max(0, zahl)),
        });
        store.section[store.key] = links;
        this._touch();
        return;
      }
      let wert = String(raw === undefined || raw === null ? "" : raw).trim();
      if (prop === "icon" && wert && !ICON_NAME.test(wert)) {
        // halb getippt ("mdi:") - erst uebernehmen, wenn es ein Icon-Name ist
        return;
      }
      if (prop === "name") {
        wert = wert.slice(0, 60);
      }
      links[index] = Object.assign({}, links[index], { [prop]: wert });
      store.section[store.key] = links;
      const preview = row.querySelector(".row-icon ha-icon");
      if (preview) {
        preview.setAttribute("icon", links[index].icon || this._linkIcon(links[index]));
        preview.style.color = links[index].color || "";
      }
      const picker =
        row.querySelector(`input[data-hcolor="${prop}"]`) ||
        (prop === "color" ? row.querySelector('input[data-hcolor=""]') : null);
      if (picker) {
        picker.value = asHexColor(wert);
      }
      this._touch();
    }

    /** Verschieben oder entfernen - danach wird die Liste neu gebaut. */
    _moveLink(kind, index, action) {
      const store = this._linkStore(kind);
      const links = (store.section[store.key] || []).slice();
      if (!links[index]) {
        return;
      }
      if (action === "remove") {
        links.splice(index, 1);
      } else {
        const ziel = action === "up" ? index - 1 : index + 1;
        if (ziel < 0 || ziel >= links.length) {
          return;
        }
        const one = links[index];
        links[index] = links[ziel];
        links[ziel] = one;
      }
      store.section[store.key] = links;
      this._renderLinkList(kind);
      this._touch();
    }

    /** Beide Link-Listen an ihre Ereignisse haengen. */
    _wireLinkList(kind) {
      const list = this.shadowRoot.getElementById(this._linkStore(kind).list);
      list.addEventListener("input", (event) => {
        const row = event.target.closest("li.hlink");
        if (!row) {
          return;
        }
        if (event.target.hasAttribute("data-hcolor")) {
          const prop = event.target.dataset.hcolor || "color";
          const text = row.querySelector(`input[data-hprop="${prop}"]`);
          text.value = event.target.value;
          this._setLink(kind, row, prop, event.target.value);
        } else if (event.target.dataset.hprop) {
          this._setLink(kind, row, event.target.dataset.hprop, event.target.value);
        } else if (event.target.dataset.hnum) {
          this._setLink(kind, row, event.target.dataset.hnum, event.target.value);
        }
      });
      list.addEventListener("change", (event) => {
        const row = event.target.closest("li.hlink");
        const prop = event.target.dataset.hbool;
        if (!row || !prop) {
          return;
        }
        this._setLink(kind, row, prop, event.target.checked);
        // Mit "einzeln festlegen" kommen vier Felder dazu oder fallen weg.
        if (prop === "border_split" || prop === "radius_split") {
          this._renderLinkList(kind);
        }
      });
      list.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-haction]");
        const row = button && button.closest("li.hlink");
        if (!row) {
          return;
        }
        if (button.dataset.haction === "clear") {
          const prop = button.dataset.prop || "color";
          row.querySelector(`input[data-hprop="${prop}"]`).value = "";
          this._setLink(kind, row, prop, "");
        } else if (button.dataset.haction === "more") {
          const links = this._linkStore(kind).section[this._linkStore(kind).key] || [];
          const link = links[Number(row.dataset.index)];
          if (!this._favOpen) {
            this._favOpen = new Set();
          }
          const open = !row.hasAttribute("data-open");
          row.toggleAttribute("data-open", open);
          button.toggleAttribute("data-on", open);
          if (link) {
            if (open) {
              this._favOpen.add(link.entity ? `entity:${link.entity}` : link.path);
            } else {
              this._favOpen.delete(link.entity ? `entity:${link.entity}` : link.path);
            }
          }
        } else {
          this._moveLink(kind, Number(row.dataset.index), button.dataset.haction);
        }
      });
    }

    /* ------------------------------- Menuepunkte der Einstellungsseite */
    /**
     * Die Bloecke der Einstellungsseite: [[{path, name}, ...], ...]. Aus dem,
     * was der Injector zuletzt auf der Seite gesehen hat; sonst die Vorgabe.
     */
    _menuGroups(settings) {
      const source = settings || this._config.settings;
      let groups = null;
      try {
        const raw = JSON.parse(window.localStorage.getItem(MENU_SEEN_KEY) || "null");
        if (Array.isArray(raw)) {
          groups = raw
            .map((group) =>
              (Array.isArray(group) ? group : [])
                .filter((one) => one && typeof one.path === "string" && LINK_PATH.test(one.path))
                .map((one) => ({
                  path: one.path,
                  name: String(one.name || one.path).slice(0, 60),
                  sub: typeof one.sub === "string" ? one.sub.slice(0, 120) : "",
                }))
            )
            .filter((group) => group.length);
        }
      } catch (err) {
        groups = null;
      }
      this._menuSeen = !!(groups && groups.length);
      if (!this._menuSeen) {
        groups = MENU_FALLBACK.map((group) =>
          group.map((one) => ({ path: one[0], name: this._de ? one[1] : one[2], sub: this._de ? one[3] : one[4] }))
        );
      }
      // Hat der Injector (vor 1.4.9) noch keine Untertitel gemerkt, kommen
      // sie aus der Vorgabe - soweit es den Punkt dort gibt.
      const fallbackSub = {};
      MENU_FALLBACK.forEach((group) => group.forEach((one) => {
        fallbackSub[one[0]] = this._de ? one[3] : one[4];
      }));
      groups.forEach((group) => group.forEach((one) => {
        if (!one.sub && fallbackSub[one.path]) {
          one.sub = fallbackSub[one.path];
        }
      }));
      // Innerhalb eines Blocks in der gespeicherten Reihenfolge; was dort
      // nicht steht, behaelt seinen Platz dahinter.
      const order = source.menu_order || [];
      const rank = (path) => {
        const index = order.indexOf(path);
        return index < 0 ? 1000 : index;
      };
      return groups.map((group) =>
        group
          .map((one, index) => ({ one, index }))
          .sort((a, b) => rank(a.one.path) - rank(b.one.path) || a.index - b.index)
          .map((x) => x.one)
      );
    }

    /**
     * Die Menuepunkte unter "Reihenfolge und Sichtbarkeit" - seit 1.4.8 mit
     * Stift: er klappt unter dem Punkt Name, Untertitel und Symbolfarben auf.
     */
    _renderMenuEntries() {
      const list = this.shadowRoot.getElementById("menu-entries");
      if (!list) {
        return;
      }
      const t = this._t;
      const hidden = this._config.settings.menu_hidden || [];
      const custom = this._config.settings.menu_items || {};
      const groups = this._menuGroups();
      this.shadowRoot.getElementById("menu-entries-note").textContent = this._menuSeen
        ? t.menu_entries_seen
        : t.menu_entries_fallback;
      const colorField = (prop, label, value) => `
                <label class="field">
                  <span>${escapeHtml(label)}</span>
                  <span class="color-field">
                    <input type="text" data-mitem="${prop}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(t.theme_empty)}" />
                    <input type="color" data-mitem-color="${prop}" value="${escapeHtml(asHexColor(value || ""))}" />
                    <button class="clear" data-mitem-clear="${prop}" title="reset">&#10005;</button>
                  </span>
                </label>`;
      list.innerHTML = groups
        .map(
          (group, g) =>
            `<li class="mgroup">${escapeHtml(t.menu_block.replace("{n}", g + 1))}</li>` +
            group
              .map((one, index) => {
                const off = hidden.indexOf(one.path) >= 0;
                const own = custom[one.path] || {};
                const open = this._menuEdit === one.path;
                const changed = Object.keys(own).length > 0;
                const editor = open ? `
            <li class="mentry-edit" data-path="${escapeHtml(one.path)}">
              <label class="field">
                <span>${escapeHtml(t.menu_item_name)}</span>
                <input type="text" data-mitem="name" maxlength="60" value="${escapeHtml(own.name || "")}" placeholder="${escapeHtml(one.name)}" />
              </label>
              <label class="field mentry-icon">
                <span>${escapeHtml(t.menu_item_icon)}</span>
                <input type="text" data-mitem="icon" spellcheck="false" value="${escapeHtml(own.icon || "")}" placeholder="${escapeHtml(t.menu_item_icon_auto)}" />
              </label>
              <label class="check">
                <input type="checkbox" data-mitem="hide_sub"${own.hide_sub ? " checked" : ""} />
                <span>${escapeHtml(t.menu_item_hide_sub)}</span>
              </label>
              <div class="rows">
                ${colorField("icon_background", t.menu_item_icon_background, own.icon_background)}
                ${colorField("icon_color", t.menu_item_icon_color, own.icon_color)}
              </div>
              <div class="mentry-edit-foot">
                <small class="field-hint">${escapeHtml(t.menu_item_hint)}</small>
                <button type="button" class="flat" data-mitem-reset ${changed ? "" : "disabled"}>${escapeHtml(t.menu_item_reset)}</button>
              </div>
            </li>` : "";
                return `
            <li class="mentry" data-path="${escapeHtml(one.path)}" data-group="${g}"${off ? " data-hidden" : ""}${changed ? " data-custom" : ""}>
              <span class="row-title">
                <strong>${escapeHtml(own.name || one.name)}</strong>
                <small>${escapeHtml(own.name ? `${one.name} · ${one.path}` : one.path)}</small>
              </span>
              <button class="icon-btn" data-maction="edit" ${open ? "data-on" : ""}
                title="${escapeHtml(t.menu_item_edit)}">${glyph("mdi:pencil", "&#9998;")}</button>
              <button class="icon-btn" data-maction="up" ${index === 0 ? "disabled" : ""}
                title="up">${glyph("mdi:arrow-up", "&#9650;")}</button>
              <button class="icon-btn" data-maction="down" ${
                index === group.length - 1 ? "disabled" : ""
              } title="down">${glyph("mdi:arrow-down", "&#9660;")}</button>
              <button class="icon-btn" data-maction="hidden" ${off ? "data-on" : ""}
                title="${escapeHtml(t.hidden)}">${glyph(off ? "mdi:eye-off" : "mdi:eye", "&#9673;")}</button>
            </li>${editor}`;
              })
              .join("")
        )
        .join("");
      // 1.5.5: das Icon-Auswahlfeld von Home Assistant statt des Textfelds
      if (this._iconPicker) {
        list.querySelectorAll('li.mentry-edit input[data-mitem="icon"]').forEach((input) => {
          const path = input.closest("li.mentry-edit").dataset.path;
          const picker = document.createElement("ha-icon-picker");
          picker.hass = this._hass;
          picker.value = input.value || "";
          picker.label = "";
          picker.placeholder = input.placeholder;
          picker.addEventListener("value-changed", (event) => {
            event.stopPropagation();
            const value = (event.detail && event.detail.value) || "";
            if (!value || ICON_NAME.test(value)) {
              this._setMenuItem(path, "icon", value);
            }
          });
          input.replaceWith(picker);
        });
      }
    }

    /** Einen Menuepunkt verschieben, ein-/ausblenden oder bearbeiten. */
    _menuAction(path, action) {
      const settings = this._config.settings;
      if (action === "edit") {
        this._menuEdit = this._menuEdit === path ? null : path;
        this._renderMenuEntries();
        const field = this._menuEdit && this.shadowRoot.querySelector('.mentry-edit [data-mitem="name"]');
        if (field) {
          field.focus({ preventScroll: true });
        }
        return;
      }
      if (action === "hidden") {
        const hidden = (settings.menu_hidden || []).slice();
        const index = hidden.indexOf(path);
        if (index >= 0) {
          hidden.splice(index, 1);
        } else {
          hidden.push(path);
        }
        settings.menu_hidden = cleanPaths(hidden);
      } else {
        const groups = this._menuGroups().map((group) => group.map((one) => one.path));
        const group = groups.find((one) => one.indexOf(path) >= 0);
        if (!group) {
          return;
        }
        const index = group.indexOf(path);
        const ziel = action === "up" ? index - 1 : index + 1;
        if (ziel < 0 || ziel >= group.length) {
          return;
        }
        group[index] = group[ziel];
        group[ziel] = path;
        settings.menu_order = cleanPaths([].concat(...groups));
      }
      this._renderMenuEntries();
      this._touch();
    }

    /** Der Dialog hinter dem Plus: Zwischenueberschrift, Link oder PopUp. */
    _openAdd(target) {
      const root = this.shadowRoot;
      const modal = root.getElementById("add-modal");
      const select = root.getElementById("add-link-select");
      const t = this._t;
      // Derselbe Dialog dient der Seitenleiste (Ueberschrift, Link, PopUp),
      // der Kopfzeile und den Favoriten der Einstellungsseite (nur Link).
      const kind = target === "header" || target === "favorites" ? target : "sidebar";
      const header = kind !== "sidebar";
      this._addTarget = kind;
      root.getElementById("add-heading-part").hidden = header;
      root.getElementById("add-popup-part").hidden = header;
      root.getElementById("add-modal-title").textContent =
        kind === "header" ? t.header_link_add : kind === "favorites" ? t.favorite_add : t.add_title;
      root.getElementById("add-link-hint").textContent =
        kind === "header" ? t.header_link_add_hint : kind === "favorites" ? t.favorite_add_hint : t.add_link_hint;
      const store = header ? this._linkStore(kind) : null;
      const has = (path) =>
        store
          ? (store.section[store.key] || []).some((link) => link.path === path)
          : !!this._config.items[LINK_PREFIX + path];
      // Was schon in der Liste steht, laesst sich nicht noch einmal waehlen.
      let first = null;
      select.querySelectorAll("option").forEach((option) => {
        const taken = !!option.value && has(option.value);
        option.disabled = taken;
        if (!taken && first === null && option.value) {
          first = option.value;
        }
      });
      select.value = first === null ? "" : first;
      root.getElementById("add-link-path").value = "";
      // 1.5.4: in der Kopfzeile auch ein Sensor (Zustand einer Entitaet)
      root.getElementById("add-link-kind-field").hidden = kind !== "header";
      root.getElementById("add-link-entity").value = "";
      this._addLinkKind = "page";
      this._renderAddLinkKind();
      this._addError("");
      this._syncAdd();
      if (!header) {
        this._addPopupLinks = [];
        this._addPopupContent = "links";
        root.getElementById("add-popup-name").value = "";
        root.getElementById("add-popup-path").value = "";
        this._renderAddPopup();
      }
      modal.hidden = false;
      select.focus();
    }

    _closeAdd() {
      this.shadowRoot.getElementById("add-modal").hidden = true;
    }

    /** Das Pfad-Feld gibt es nur bei "Eigener Pfad". */
    _syncAdd() {
      const root = this.shadowRoot;
      root.getElementById("add-link-custom").hidden =
        root.getElementById("add-link-select").value !== "";
    }

    _addError(text) {
      const box = this.shadowRoot.querySelector("#add-modal .modal-error");
      box.textContent = text;
      box.hidden = !text;
    }

    /** Den im Dialog gewaehlten Link als Eintrag anlegen. */
    _addLink() {
      const root = this.shadowRoot;
      if (this._addTarget === "header" && this._addLinkKind === "entity") {
        this._addEntityLink();
        return;
      }
      const chosen = root.getElementById("add-link-select").value;
      let path = chosen || root.getElementById("add-link-path").value.trim();
      // Eine ganze Adresse aus der Adresszeile ist auch recht - gebraucht
      // wird nur der Teil hinter dem Rechnernamen.
      if (!chosen && /^https?:\/\//i.test(path)) {
        try {
          const url = new URL(path);
          path = url.pathname + url.search + url.hash;
        } catch (err) {
          path = "";
        }
      }
      if (!LINK_PATH.test(path) || path === "/" || path.length > 200) {
        this._addError(this._t.add_link_invalid);
        return;
      }
      let known = null;
      LINK_GROUPS.forEach((group) =>
        group.links.forEach((link) => {
          if (link[0] === path) {
            known = link;
          }
        })
      );
      const fallback = path.split(/[?#]/)[0].split("/").filter(Boolean).pop() || path;
      if (this._addTarget === "header" || this._addTarget === "favorites") {
        const store = this._linkStore(this._addTarget);
        const links = store.section[store.key] || [];
        if (links.some((link) => link.path === path)) {
          this._addError(this._t.add_link_exists);
          return;
        }
        if (links.length >= HEADER_LINKS_MAX) {
          this._addError(this._t.header_links_full);
          return;
        }
        // Immer eine neue Liste: die der Vorgaben darf nie veraendert werden.
        const fresh = {
          path,
          name: known ? (this._de ? known[2] : known[3]) : fallback,
          icon: known ? known[1] : LINK_ICON,
          color: "",
        };
        store.section[store.key] = links.concat([
          this._addTarget === "favorites" ? Object.assign({}, DEFAULT_FAVORITE, fresh) : fresh,
        ]);
        this._closeAdd();
        this._renderLinkList(this._addTarget);
        this._touch();
        return;
      }
      const key = LINK_PREFIX + path;
      if (this._config.items[key]) {
        this._addError(this._t.add_link_exists);
        return;
      }
      // Name und Icon stehen im Eintrag: der Injector kennt die Auswahlliste
      // nicht, und so bleibt der Name, wie er angelegt wurde, auch wenn die
      // Seite spaeter in einer anderen Sprache geoeffnet wird.
      this._config.items[key] = Object.assign({}, DEFAULT_ITEM, {
        name: known ? (this._de ? known[2] : known[3]) : fallback,
        icon: known ? known[1] : LINK_ICON,
      });
      this._config.order = [key].concat(
        (this._config.order || []).filter((one) => one !== key)
      );
      this._closeAdd();
      this._selKey = key;
      this._syncEntries(true);
      this._touch();
      this._focusInspectorName();
    }

    _removeHeading(key) {
      // Die zugeordneten Eintraege werden wieder frei, sonst zeigen sie auf
      // eine Ueberschrift, die es nicht mehr gibt.
      Object.keys(this._config.items).forEach((one) => {
        if (this._config.items[one].parent === key) {
          this._config.items[one].parent = "";
        }
      });
      delete this._config.items[key];
      this._config.order = (this._config.order || []).filter((one) => one !== key);
      this._entries = this._entries.filter((entry) => entry.key !== key);
      this._syncEntries(true);
      this._touch();
    }

    /**
     * Das Icon-Auswahlfeld von Home Assistant nachladen.
     *
     * <ha-icon-picker> ist Teil des Frontends, wird aber erst geladen, wenn
     * eine Seite es braucht - beim direkten Aufruf dieser Seite ist es also
     * meist noch nicht da. Der Umweg ueber loadCardHelpers ist der uebliche
     * Weg: der Editor der Button-Karte benutzt einen Icon-Selektor, und beim
     * Erzeugen dieses Editors zieht Home Assistant das Auswahlfeld mit.
     *
     * Klappt irgendetwas davon nicht, bleibt es beim Textfeld - lieber ein
     * schlichtes Eingabefeld als eine Seite, die auf ein fehlendes Element
     * wartet.
     */
    async _loadIconPicker() {
      if (customElements.get("ha-icon-picker")) {
        return true;
      }
      try {
        if (typeof window.loadCardHelpers !== "function") {
          return false;
        }
        const helpers = await window.loadCardHelpers();
        const card = await helpers.createCardElement({ type: "button" });
        if (card && card.constructor && card.constructor.getConfigElement) {
          await card.constructor.getConfigElement();
        }
        await Promise.race([
          customElements.whenDefined("ha-icon-picker"),
          new Promise((resolve) => window.setTimeout(resolve, 4000)),
        ]);
      } catch (err) {
        return false;
      }
      return !!customElements.get("ha-icon-picker");
    }

    /**
     * Die Icon-Textfelder durch das Auswahlfeld von Home Assistant ersetzen.
     * Wird nach jedem Neuaufbau des Inspektors aufgerufen.
     */
    _upgradeIconFields() {
      if (!this._iconPicker) {
        return;
      }
      const box = this._inspector;
      if (!box) {
        return;
      }
      box.querySelectorAll('input[data-prop="icon"]').forEach((input) => {
        const key = input.dataset.item;
        const picker = document.createElement("ha-icon-picker");
        picker.dataset.picker = "icon";
        picker.hass = this._hass;
        picker.value = input.value || "";
        // Die Beschriftung steht schon als <span> ueber dem Feld.
        picker.label = "";
        picker.placeholder = input.placeholder;
        picker.addEventListener("value-changed", (event) => {
          event.stopPropagation();
          const value = (event.detail && event.detail.value) || "";
          this._itemConfig(key).icon = value;
          this._showEntryIcon(key);
          this._touch();
        });
        input.replaceWith(picker);
      });
    }

    /* ------------------------------------------------------ entry rows */
    /**
     * Die Liste der Eintraege. Der gewaehlte Eintrag ist aufgeklappt: direkt
     * unter seiner Zeile stehen seine Felder (#inspector). Auf Tablet und
     * Handy zeigt die Spalte entweder den Eintrag oder die Liste.
     */
    _renderItems() {
      const list = this.shadowRoot.getElementById("items");
      const insp = this._inspector;
      if (!list || !insp) {
        return;
      }
      const t = this._t;
      if (!this._entries.some((entry) => entry.key === this._selKey)) {
        this._selKey = this._entries.length ? this._entries[0].key : null;
      }
      const showHidden = this._showHidden !== false;
      list.innerHTML = this._entries
        .map((entry) => {
          const cfg = this._config.items[entry.key] || (itemDefaults(entry.key));
          const selected = entry.key === this._selKey;
          if (cfg.hidden && !showHidden && !selected) {
            return "";
          }
          const icon = customElements.get("ha-icon")
            ? `<ha-icon icon="${escapeHtml(cfg.icon || entry.icon)}"></ha-icon>`
            : "";
          const changed = this._entryChanged(entry.key);
          const attrs = `data-key="${escapeHtml(entry.key)}" draggable="true" tabindex="0"${
            cfg.hidden ? " data-hidden" : ""
          }${entry.heading ? " data-heading" : ""}${
            !entry.heading && cfg.parent ? " data-child" : ""
          }${selected ? " data-selected" : ""}`;
          const after = selected ? '<li class="insp-li" data-insp-li></li>' : "";
          if (entry.heading) {
            const children = this._childrenOf(entry.key).length;
            return `
              <li class="item" ${attrs}>
                <span class="handle" title="drag">${glyph("mdi:drag", "&#8942;")}</span>
                ${cfg.collapsible ? `<span class="chev">${glyph("mdi:chevron-down", "&#8964;")}</span>` : ""}
                <span class="row-name"><span>${escapeHtml(this._entryName(entry))}</span><span class="dot" data-dot${changed ? "" : " hidden"}></span></span>
                <span class="row-meta">${escapeHtml(t.heading_meta.replace("{n}", children))}</span>
              </li>${after}`;
          }
          const span = Number(cfg.span || 1);
          const meta = selected
            ? entry.sub
            : cfg.hidden ? t.hidden_short : (span === 1 ? t.span_one : t.span_many).replace("{n}", span);
          return `
            <li class="item" ${attrs}>
              <span class="handle" title="drag">${glyph("mdi:drag", "&#8942;")}</span>
              <span class="row-icon">${icon}</span>
              <span class="row-name"><span>${escapeHtml(this._entryName(entry))}</span>${
                entry.link ? `<span class="row-link">${escapeHtml(t.link)}</span>` : entry.popup ? `<span class="row-link">${escapeHtml(t.popup)}</span>` : ""
              }<span class="dot" data-dot${changed ? "" : " hidden"}></span></span>
              <span class="row-meta">${escapeHtml(meta)}</span>
              <button class="eye" data-action="hidden" ${cfg.hidden ? "data-on" : ""}
                title="${escapeHtml(t.hidden)}">${glyph(cfg.hidden ? "mdi:eye-off-outline" : "mdi:eye-outline", "&#9673;")}</button>
            </li>${after}`;
        })
        .join("");
      const slot = list.querySelector("[data-insp-li]");
      if (slot) {
        slot.appendChild(insp);
      } else {
        list.after(insp);
      }
      const pane = this.shadowRoot.getElementById("items-pane");
      if (pane) {
        pane.dataset.view = this._itemsView === "list" ? "list" : "entry";
      }
      this._renderInspector();
      this._renderSidebarPreview();
    }

    /**
     * Die Felder einer Zwischenueberschrift im Inspektor: oben die Zahlen
     * (Hoehe, Rahmen, Eckenradius) in einer Reihe, darunter die Rahmenfarbe
     * als ganze Zeile wie bei allen Farbfeldern.
     */
    _headingExtra(key, cfg) {
      const t = this._t;
      const k = escapeHtml(key);
      const num = (prop, label) => `
        <label class="field"><span>${escapeHtml(label)}</span>
          <input type="number" min="0" max="80" data-item="${k}"
            data-prop="${prop}" value="${escapeHtml(cfg[prop])}" />
        </label>`;
      const check = (prop, label) => `
        <label class="check">
          <input type="checkbox" data-item="${k}" data-prop="${prop}"${cfg[prop] ? " checked" : ""} />
          <span>${escapeHtml(label)}</span>
        </label>`;
      const nums = [num("height", t.heading_height)];
      if (!cfg.border_split) {
        nums.push(num("border_width", t.heading_border_width));
      }
      if (!cfg.radius_split) {
        nums.push(num("radius", t.item_radius));
      }
      return `
        <div class="row-extra row-extra-2">
          <div class="head-block">
            <div class="grid-mini hd-nums" style="--n:${nums.length}">${nums.join("")}</div>
            <small class="field-hint">${escapeHtml(t.heading_height_hint)}</small>
            <label class="field hd-color"><span>${escapeHtml(t.header_border_color)}</span>
              <span class="color-field">
                <input type="color" data-item-color="${k}" data-prop="border_color" />
                <input type="text" data-item="${k}" data-prop="border_color"
                  value="${escapeHtml(cfg.border_color)}" placeholder="theme" />
              </span>
            </label>
            ${check("border_split", t.item_border_split)}
            ${
              cfg.border_split
                ? `<div class="grid-mini four">
                    ${num("border_top", t.side_top)}
                    ${num("border_right", t.side_right)}
                    ${num("border_bottom", t.side_bottom)}
                    ${num("border_left", t.side_left)}
                  </div>`
                : ""
            }
            ${check("radius_split", t.item_radius_split)}
            ${
              cfg.radius_split
                ? `<div class="grid-mini four">
                    ${num("radius_tl", t.corner_tl)}
                    ${num("radius_tr", t.corner_tr)}
                    ${num("radius_br", t.corner_br)}
                    ${num("radius_bl", t.corner_bl)}
                  </div>`
                : ""
            }
            ${check("uppercase", t.heading_uppercase)}
            ${check("collapsible", t.heading_collapsible)}
            <small class="field-hint">${escapeHtml(t.heading_collapsible_hint)}</small>
          </div>
        </div>`;
    }

    /* --------------------------------------------------------- binding */
    /* --------------------------------------------------------- binding */

    _bind() {
      const root = this.shadowRoot;
      const on = (id, type, handler) => {
        const element = root.getElementById(id);
        if (element) {
          element.addEventListener(type, handler);
        }
      };
      const readFile = (fileId, textId, after, error) => {
        on(fileId, "change", (event) => {
          const file = event.target.files && event.target.files[0];
          if (!file) {
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            root.getElementById(textId).value = String(reader.result || "");
            after();
          };
          reader.onerror = () => error(String(reader.error || "?"));
          reader.readAsText(file);
        });
      };
      this._inspector = root.getElementById("inspector");

      root.querySelectorAll(".menu-button").forEach((button) => {
        button.addEventListener("click", () => {
          // bubbles up to home-assistant-main, which opens the drawer
          this.dispatchEvent(
            new CustomEvent("hass-toggle-menu", {
              bubbles: true,
              composed: true,
            })
          );
        });
      });

      // Knoepfe, die es mehrfach gibt oder die neu gebaut werden: per Delegation
      root.addEventListener("click", (event) => {
        const target = event.target;
        if (!target.closest) {
          return;
        }
        // Segmentierte Auswahl: Wert ins <select>, change ausloesen
        const seg = target.closest(".seg[data-seg] button[data-value]");
        if (seg) {
          const field = seg.closest(".seg-field");
          const select = field && field.querySelector("select");
          if (select && select.value !== seg.dataset.value) {
            select.value = seg.dataset.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          this._syncSegs(field);
          return;
        }
        const state = target.closest("[data-sbp-state] button");
        if (state) {
          this._sbpState = state.dataset.value;
          this._renderSidebarPreview();
          return;
        }
        const view = target.closest(".seg[data-view] button[data-value]");
        if (view) {
          const kind = view.closest(".seg").dataset.view;
          if (kind === "header") {
            this._headerView = view.dataset.value;
            this._applyViews();
            this._applyHeaderView();
            this._scrollToGrp(`header:${this._secs.header || "color"}`);
            return;
          } else if (kind === "settings") {
            this._settingsView = view.dataset.value;
          } else {
            this._themeView = view.dataset.value;
          }
          this._applyViews();
          return;
        }
        const pull = target.closest("[data-theme-pull]");
        if (pull) {
          this._pullPanelTheme(pull.dataset.themePull);
          return;
        }
        if (target.closest("[data-accordion]")) {
          this._setAccordion(!this._accordion);
          return;
        }
        const pane = target.closest("[data-pane-btn]");
        if (pane) {
          const which = pane.dataset.paneBtn;
          this._selectSection("settings", which === "page" ? this._pageTopic || "menu" : which, true);
          return;
        }
        const grpHead = target.closest(".grp-head");
        if (grpHead) {
          const grp = grpHead.closest(".grp");
          this._setGrp(grp.dataset.grp, !grp.hasAttribute("data-open"), true);
          // Kopfzeile: die aufgeklappte Gruppe ist die gewaehlte - auch fuer
          // "Einfach" nach einem Wechsel zu "Alle Felder" und zurueck.
          if (grp.hasAttribute("data-open") && grp.matches('.hdr-groups > .grp[data-sec-group="header"]')) {
            this._secs.header = grp.dataset.sec;
            const preview = this.shadowRoot.getElementById("header-preview");
            if (preview) {
              preview.dataset.mark = grp.dataset.sec;
            }
          }
          return;
        }
        const clear = target.closest("[data-tg-clear]");
        if (clear) {
          this._clearGroup(Number(clear.dataset.tgClear));
          return;
        }
        const goto = target.closest("[data-goto]");
        if (goto) {
          this._goto(goto.dataset.goto);
          return;
        }
        if (this._stageClick(target)) {
          return;
        }
        if (target.classList && target.classList.contains("modal")) {
          target.hidden = true;
          return;
        }
        const area = target.closest("nav.areas button[data-group]");
        if (area) {
          this._selectGroup(area.dataset.group);
          return;
        }
        const tab = target.closest("button[data-tab]");
        if (tab && root.contains(tab)) {
          this._selectTab(tab.dataset.tab);
          return;
        }
        const button = target.closest("[data-action]");
        if (!button || !root.contains(button)) {
          return;
        }
        const action = button.dataset.action;
        if (action === "save") {
          this._save();
        } else if (action === "revert") {
          this._revert();
        } else if (action === "history") {
          this._openHistory();
        } else if (action === "search") {
          this._focusSearch();
        }
      });
      // Segmentierte Felder ziehen mit, wenn sich ihr <select> aendert.
      root.addEventListener("change", (event) => {
        const field = event.target.closest && event.target.closest(".seg-field");
        if (field) {
          this._syncSegs(field);
        }
        if (event.target.classList && event.target.classList.contains("before-toggle")) {
          this._setBefore(event.target.checked);
        }
      });

      // Eintraege im Vorschaubild ziehen (Seite Eintraege)
      root.addEventListener("dragstart", (event) => {
        const tile = event.target.closest && event.target.closest(".sbp-host [data-key][draggable]");
        if (!tile) {
          return;
        }
        this._stageDrag = tile.dataset.key;
        tile.setAttribute("data-dragging", "");
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", this._stageDrag);
        } catch (err) {
          /* Safari */
        }
      });
      root.addEventListener("dragover", (event) => {
        const tile = event.target.closest && event.target.closest(".sbp-host [data-key]");
        if (!tile || !this._stageDrag) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        root.querySelectorAll(".sbp-host [data-over]").forEach((one) => {
          if (one !== tile) {
            one.removeAttribute("data-over");
          }
        });
        tile.setAttribute("data-over", "");
      });
      root.addEventListener("drop", (event) => {
        const tile = event.target.closest && event.target.closest(".sbp-host [data-key]");
        if (!tile || !this._stageDrag) {
          return;
        }
        event.preventDefault();
        const dragKey = this._stageDrag;
        this._stageDrag = null;
        const dragged = this._entries.find((one) => one.key === dragKey);
        const into = !!dragged && !dragged.heading && !!(this._config.items[tile.dataset.key] || {}).parent;
        this._dropBefore(dragKey, tile.dataset.key, into);
      });
      root.addEventListener("dragend", () => {
        root.querySelectorAll(".sbp-host [data-over], .sbp-host [data-dragging]").forEach((one) => {
          one.removeAttribute("data-over");
          one.removeAttribute("data-dragging");
        });
        this._stageDrag = null;
      });

      // Suche
      const search = root.getElementById("search");
      search.addEventListener("input", () => this._search(search.value));
      search.addEventListener("focus", () => {
        if (search.value) {
          this._search(search.value);
        }
      });
      search.addEventListener("blur", () => window.setTimeout(() => this._closeSearch(), 150));
      search.addEventListener("keydown", (event) => {
        const box = root.getElementById("search-results");
        const hits = this._hits || [];
        if (event.key === "Escape") {
          search.value = "";
          search.blur();
          root.getElementById("app").removeAttribute("data-searching");
          this._closeSearch();
          return;
        }
        if (box.hidden || !hits.length) {
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          this._hitIndex = (this._hitIndex + (event.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
          box.querySelectorAll("[data-hit]").forEach((one) => {
            one.toggleAttribute("data-active", Number(one.dataset.hit) === this._hitIndex);
            if (Number(one.dataset.hit) === this._hitIndex) {
              one.scrollIntoView({ block: "nearest" });
            }
          });
        } else if (event.key === "Enter") {
          event.preventDefault();
          this._reveal(hits[this._hitIndex || 0]);
        }
      });
      const results = root.getElementById("search-results");
      results.addEventListener("mousedown", (event) => event.preventDefault());
      results.addEventListener("click", (event) => {
        const hit = event.target.closest("[data-hit]");
        if (hit && this._hits) {
          this._reveal(this._hits[Number(hit.dataset.hit)]);
        }
      });

      on("history-close", "click", () => this._closeHistory());
      // Liste der Aenderungen (1.4.8): Klick auf "n ungespeichert"
      root.querySelectorAll("[data-changes]").forEach((box) => {
        box.setAttribute("role", "button");
        box.setAttribute("tabindex", "0");
        const open = () => {
          if (!box.hasAttribute("data-clean")) {
            this._openChanges();
          }
        };
        box.addEventListener("click", open);
        box.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        });
      });
      on("changes-close", "click", () => this._closeChanges());
      // Eigene Werte im Systemmonitor (1.4.8)
      on("add-sensor", "click", () => this._sensorAction(-1, "add"));
      on("sensor-list", "click", (event) => {
        const button = event.target.closest && event.target.closest("button[data-saction]");
        const row = button && button.closest(".sensor-row");
        if (row) {
          this._sensorAction(Number(row.dataset.index), button.dataset.saction);
        }
      });
      on("sensor-list", "input", (event) => {
        const field = event.target;
        const row = field.closest && field.closest(".sensor-row");
        if (row && field.dataset.sensor) {
          this._setSensor(Number(row.dataset.index), field.dataset.sensor, field.value);
        }
      });
      on("sensor-list", "change", (event) => {
        if (event.target.dataset && event.target.dataset.sensor === "entity") {
          this._renderSensorList();
        }
      });
      on("changes-revert", "click", () => {
        this._closeChanges();
        this._revert();
      });
      on("changes-list", "click", (event) => {
        const reset = event.target.closest && event.target.closest("[data-chg-reset]");
        if (reset) {
          this._resetChange(Number(reset.dataset.chgReset));
          return;
        }
        const show = event.target.closest && event.target.closest("[data-chg-show]");
        if (show) {
          this._showChange(Number(show.dataset.chgShow));
        }
      });
      // Farb-Schnellwahl (1.4.8): unter jedem Farb-Textfeld
      root.addEventListener("focusin", (event) => {
        const input = event.target;
        if (input && input.matches && input.matches('.color-field input[type="text"]')) {
          this._showQuickColors(input);
        }
      });
      root.addEventListener("focusout", (event) => {
        if (event.target && event.target === this._qcInput) {
          window.setTimeout(() => {
            if (this._qcInput && this.shadowRoot.activeElement !== this._qcInput) {
              this._hideQuickColors();
            }
          }, 120);
        }
      });
      root.addEventListener("change", (event) => {
        const input = event.target;
        if (input && input.matches && (input.matches('.color-field input[type="text"]') || input.matches('.color-field input[type="color"]'))) {
          this._rememberColor(input.value);
        }
      });
      on("qc-pop", "mousedown", (event) => event.preventDefault());
      on("qc-pop", "click", (event) => {
        const chip = event.target.closest && event.target.closest("[data-qc]");
        const input = this._qcInput;
        if (!chip || !input) {
          return;
        }
        input.value = chip.dataset.qc;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        this._syncPicker && input.dataset.bind && this._syncPicker(input.dataset.bind);
        this._hideQuickColors();
      });
      // Strg+S / Cmd+S speichert (1.4.8), Strg+Z / Cmd+Z geht einen Schritt
      // zurueck, Strg+Y bzw. Strg+Umschalt+Z wieder vor (1.4.9).
      if (!this._keySave) {
        this._keySave = (event) => {
          const key = String(event.key).toLowerCase();
          if (!(event.ctrlKey || event.metaKey) || event.altKey || ["s", "z", "y"].indexOf(key) < 0) {
            return;
          }
          if (!this.isConnected || this.offsetParent === null) {
            return;
          }
          if (key === "s") {
            event.preventDefault();
            this._hideQuickColors();
            if (this._dirty) {
              this._save();
            }
            return;
          }
          // In der Suche, im Import und in offenen Dialogen bleibt das
          // Rueckgaengig des Browsers.
          const root = this.shadowRoot;
          const field = root && root.activeElement;
          if (field && (field.id === "search" || field.closest(".modal:not([hidden])"))) {
            return;
          }
          if (root && root.querySelector(".modal:not([hidden])")) {
            return;
          }
          event.preventDefault();
          this._hideQuickColors();
          this._undoStep(key === "z" && !event.shiftKey);
        };
        window.addEventListener("keydown", this._keySave);
      }
      on("history-list", "click", (event) => {
        const button = event.target.closest && event.target.closest("[data-restore]");
        if (button) {
          this._restoreHistory(parseInt(button.dataset.restore, 10));
        }
      });
      on("reset", "click", () => this._reset());
      on("add-heading", "click", () => this._openAdd());
      on("show-hidden", "change", (event) => {
        this._showHidden = event.target.checked;
        this._renderItems();
      });

      // theme page
      root.querySelectorAll("[data-set-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          this._mode = button.dataset.setMode;
          this._applyMode();
        });
      });
      on("theme-copy", "click", () => this._copyMode());
      on("theme-clear", "click", () => this._clearMode());
      on("open-palette", "click", () => this._openPalette());
      on("open-presets", "click", () => this._openPresets());
      on("palette-cancel", "click", () => {
        root.getElementById("palette-modal").hidden = true;
      });
      on("presets-cancel", "click", () => {
        root.getElementById("presets-modal").hidden = true;
      });
      root.querySelectorAll("#presets-modal [data-preset]").forEach((button) => {
        button.addEventListener("click", () => this._pickPreset(button.dataset.preset));
        button.addEventListener("dblclick", () => {
          root.getElementById("presets-modal").hidden = true;
          this._applyPreset(button.dataset.preset, true);
        });
      });
      on("preset-apply", "click", () => {
        if (!this._presetPick) {
          return;
        }
        root.getElementById("presets-modal").hidden = true;
        this._applyPreset(this._presetPick, true);
      });
      on("palette-color", "input", (event) => {
        root.getElementById("palette-hex").value = event.target.value;
        this._paletteShow();
      });
      on("palette-hex", "input", (event) => {
        const rgb = parseHex(event.target.value);
        if (rgb) {
          root.getElementById("palette-color").value = toHex(rgb);
        }
        this._paletteShow();
      });
      ["palette-tint", "palette-accent"].forEach((id) => on(id, "change", () => this._paletteShow()));
      on("palette-apply", "click", () => {
        const palette = this._paletteInput();
        if (!palette) {
          this._paletteShow();
          return;
        }
        root.getElementById("palette-modal").hidden = true;
        this._applyPalette(palette, true);
      });
      this._paletteShow();

      // Kopfzeile: Vorlagen-Dialog
      on("open-header-presets", "click", () => this._openHeaderPresets());
      on("hpresets-cancel", "click", () => {
        root.getElementById("hpresets-modal").hidden = true;
      });
      root.querySelectorAll("#hpresets-modal [data-hpreset]").forEach((button) => {
        button.addEventListener("click", () => this._pickHeaderPreset(button.dataset.hpreset));
        button.addEventListener("dblclick", () => {
          root.getElementById("hpresets-modal").hidden = true;
          this._applyHeaderPreset(button.dataset.hpreset, true);
        });
      });
      on("hpreset-apply", "click", () => {
        if (!this._hpresetPick) {
          return;
        }
        root.getElementById("hpresets-modal").hidden = true;
        this._applyHeaderPreset(this._hpresetPick, true);
      });
      // Ein Feld der Kopfzeile bekommt den Fokus: im Vorschaubild markieren
      const hdr = root.querySelector(".hdr-groups");
      if (hdr) {
        hdr.addEventListener("focusin", (event) => {
          const grp = event.target.closest("[data-sec-group='header']");
          const preview = root.getElementById("header-preview");
          if (grp && preview) {
            this._secs.header = grp.dataset.sec;
            preview.dataset.mark = grp.dataset.sec;
          }
        });
      }

      // Export / Import
      on("export", "click", () => this._export());
      on("import", "click", () => this._import());
      on("sidebar-export", "click", () => this._exportSidebar());
      on("sidebar-import", "click", () => this._importSidebar());
      on("theme-export", "click", () => this._exportTheme());
      on("theme-import", "click", () => this._importTheme());
      on("header-export", "click", () => this._exportHeader());
      on("header-import", "click", () => this._importHeader());
      on("settings-export", "click", () => this._exportSettings());
      on("settings-import", "click", () => this._importSettings());
      on("import-cancel", "click", () => this._closeImport());
      on("import-ok", "click", () => this._applyImport());
      on("theme-import-cancel", "click", () => this._closeThemeImport());
      on("theme-import-ok", "click", () => this._applyThemeImport());
      on("theme-text", "input", () => this._scanThemeText());
      on("header-import-cancel", "click", () => this._closeHeaderImport());
      on("header-import-ok", "click", () => this._applyHeaderImport());
      on("settings-import-cancel", "click", () => this._closeSettingsImport());
      on("settings-import-ok", "click", () => this._applySettingsImport());
      on("sidebar-import-cancel", "click", () => {
        root.getElementById("sidebar-modal").hidden = true;
      });
      on("sidebar-import-ok", "click", () => this._applySidebarImport());
      readFile("theme-file", "theme-text", () => this._scanThemeText(), (text) => this._themeError(text));
      readFile("header-file", "header-text", () => this._headerError(""), (text) => this._headerError(text));
      readFile("settings-file", "settings-text", () => this._settingsError(""), (text) => this._settingsError(text));
      readFile("sidebar-file", "sidebar-text", () => this._modalError("sidebar-modal", ""), (text) =>
        this._modalError("sidebar-modal", text)
      );
      readFile("import-file", "import-text", () => this._importError(""), (text) => this._importError(text));

      // Link-Listen: Kopfzeile und Favoriten der Einstellungsseite
      on("add-header-link", "click", () => this._openAdd("header"));
      on("add-favorite", "click", () => this._openAdd("favorites"));
      this._wireLinkList("header");
      this._wireLinkList("favorites");
      // Menuepunkte der Einstellungsseite
      on("menu-entries", "click", (event) => {
        const button = event.target.closest("button[data-maction]");
        const row = button && button.closest("li.mentry");
        if (row) {
          this._menuAction(row.dataset.path, button.dataset.maction);
          return;
        }
        // Aufgeklappter Menuepunkt (1.4.8): Farbe leeren, alles zuruecksetzen
        const edit = event.target.closest("li.mentry-edit");
        if (!edit) {
          return;
        }
        const clear = event.target.closest("[data-mitem-clear]");
        if (clear) {
          const prop = clear.dataset.mitemClear;
          edit.querySelector(`[data-mitem="${prop}"]`).value = "";
          this._setMenuItem(edit.dataset.path, prop, "");
          return;
        }
        if (event.target.closest("[data-mitem-reset]")) {
          const all = Object.assign({}, this._config.settings.menu_items || {});
          delete all[edit.dataset.path];
          this._config.settings.menu_items = all;
          this._renderMenuEntries();
          this._touch();
        }
      });
      const menuItemInput = (event) => {
        const edit = event.target.closest && event.target.closest("li.mentry-edit");
        if (!edit) {
          return;
        }
        const field = event.target;
        if (field.dataset.mitem) {
          const value = field.type === "checkbox" ? field.checked : field.value.trim();
          // Icon (1.5.5): halb getippt ("mdi:") erst uebernehmen, wenn es ein Name ist
          if (field.dataset.mitem === "icon" && value && !ICON_NAME.test(value)) {
            return;
          }
          this._setMenuItem(edit.dataset.path, field.dataset.mitem, value);
          if (field.dataset.mitem !== "name" && field.dataset.mitem !== "icon" && field.type !== "checkbox") {
            const picker = edit.querySelector(`[data-mitem-color="${field.dataset.mitem}"]`);
            if (picker) {
              picker.value = asHexColor(field.value);
            }
          }
        } else if (field.dataset.mitemColor) {
          const text = edit.querySelector(`[data-mitem="${field.dataset.mitemColor}"]`);
          text.value = field.value;
          this._setMenuItem(edit.dataset.path, field.dataset.mitemColor, field.value);
        }
      };
      on("menu-entries", "input", menuItemInput);
      on("menu-entries", "change", (event) => {
        if (event.target.type === "checkbox") {
          menuItemInput(event);
        }
      });

      // Dialog hinter dem Plus der Eintragsliste
      on("add-cancel", "click", () => this._closeAdd());
      on("add-heading-ok", "click", () => {
        this._closeAdd();
        this._addHeading();
      });
      on("add-link-select", "change", () => {
        this._addError("");
        this._syncAdd();
      });
      on("add-link-ok", "click", () => this._addLink());
      // 1.5.4: Seite oder Sensor (Kopfzeile)
      on("add-link-kind", "click", (event) => {
        const button = event.target.closest && event.target.closest("[data-alk]");
        if (button) {
          this._addLinkKind = button.dataset.alk === "entity" ? "entity" : "page";
          this._renderAddLinkKind();
          if (this._addLinkKind === "entity") {
            this.shadowRoot.getElementById("add-link-entity").focus();
          }
        }
      });
      on("add-link-entity", "keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this._addLink();
        }
      });
      // PopUp-Teil des Dialogs (1.5.1)
      on("add-popup-select", "change", () => {
        const root2 = this.shadowRoot;
        root2.getElementById("add-popup-custom").hidden = root2.getElementById("add-popup-select").value !== "";
        this._addPopupError("");
      });
      on("add-popup-pick", "click", () => this._addPopupPick());
      on("add-popup-path", "keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this._addPopupPick();
        }
      });
      on("add-popup-ok", "click", () => this._addPopup());
      on("add-popup-kind", "click", (event) => {
        const button = event.target.closest && event.target.closest("[data-apc]");
        if (button) {
          this._addPopupContent = button.dataset.apc === "card" ? "card" : "links";
          this._renderAddPopup();
        }
      });
      on("add-popup-list", "click", (event) => {
        const button = event.target.closest && event.target.closest("[data-apl-remove]");
        if (button) {
          (this._addPopupLinks || []).splice(Number(button.dataset.aplRemove), 1);
          this._renderAddPopup();
        }
      });
      on("add-link-path", "keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this._addLink();
        }
      });
      root.addEventListener("keydown", (event) => {
        // Enter / Leertaste auf einem Element im Vorschaubild oder einer Zeile
        // der Eintragsliste wirkt wie ein Klick.
        if ((event.key === "Enter" || event.key === " ") && event.target.matches &&
            event.target.matches(".stage [tabindex], li.item[tabindex]")) {
          event.preventDefault();
          event.target.click();
          return;
        }
        if (event.key !== "Escape") {
          return;
        }
        root.querySelectorAll(".modal").forEach((modal) => {
          if (!modal.hidden) {
            modal.hidden = true;
          }
        });
      });

      // Fehlt das Logo (z. B. alter Cache), bleibt der Kopf einfach ohne
      root.querySelectorAll("img").forEach((logo) => {
        logo.addEventListener("error", () => {
          logo.hidden = true;
        });
      });

      // Geraete & Dienste: 1, 2 oder 3 Spalten - schreibt die beiden Haken
      // list_two_columns / list_three_columns (es gilt immer nur einer).
      const listCols = root.querySelector("select[data-list-cols]");
      if (listCols) {
        listCols.addEventListener("change", () => {
          const value = listCols.value;
          this._writePath("settings.list_two_columns", value === "2");
          this._writePath("settings.list_three_columns", value === "3");
          ["two", "three"].forEach((name) => {
            const box = root.querySelector(`[data-bind="settings.list_${name}_columns"]`);
            if (box) {
              box.checked = value === (name === "two" ? "2" : "3");
            }
          });
          this._touch();
        });
      }

      // Zaehler-Box: welche Zaehler (eine Liste, kein einzelner Wert)
      root.querySelectorAll("[data-count-item]").forEach((box) => {
        box.addEventListener("change", () => {
          const chosen = [...root.querySelectorAll("[data-count-item]")]
            .filter((one) => one.checked)
            .map((one) => one.dataset.countItem);
          this._config.settings.monitor_counts_items = COUNT_ITEMS.filter((key) => chosen.indexOf(key) >= 0);
          this._touch();
        });
      });

      // global settings
      root.querySelectorAll("[data-bind]").forEach((input) => {
        const event = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input";
        input.addEventListener(event, () => {
          this._writePath(input.dataset.bind, this._readInput(input));
          // Zwei- und dreispaltige Liste schliessen sich aus: wer die eine
          // anhakt, nimmt den Haken der anderen weg.
          const other = LIST_COLUMN_PAIR[input.dataset.bind];
          if (other && input.checked) {
            this._writePath(other, false);
            const box = root.querySelector(`[data-bind="${other}"]`);
            if (box) {
              box.checked = false;
            }
          }
          // Das kleine Farbfeld neben dem Text zieht mit (auch beim Tippen).
          this._syncPicker(input.dataset.bind);
          if (input.type === "range") {
            this._syncRanges();
          }
          if (input.dataset.bind === "layout.columns") {
            this._renderItems();
          }
          // Der Neustart-Knopf kommt in die Eintragsliste oder verschwindet
          // daraus - die Liste muss also neu gebaut werden.
          if (input.dataset.bind === "layout.show_restart") {
            this._syncEntries(true);
          }
          if (input.type === "checkbox" || input.tagName === "SELECT") {
            this._applyConditionals();
          }
          if (/^header\./.test(input.dataset.bind)) {
            this._syncHeaderPresets();
          }
          this._touch();
        });
      });

      // Schatten-Baukasten: Regler und Vorlagen schreiben ins Feld (1.4.7)
      root.querySelectorAll(".shadow-box[data-shadow-for]").forEach((box) => {
        const fromControls = (event) => {
          if (event.target.matches && event.target.matches("[data-shadow-toggle]")) {
            if (event.type === "change") {
              this._setShadowOpen(event.target.checked);
            }
            return;
          }
          if (event.target.closest && event.target.closest("[data-sh-part]")) {
            this._shadowFromControls(box);
          }
        };
        box.addEventListener("input", fromControls);
        box.addEventListener("change", fromControls);
        box.addEventListener("click", (event) => {
          const preset = event.target.closest && event.target.closest("[data-shadow-preset]");
          if (preset) {
            this._setShadow(box, preset.dataset.shadowPreset);
            this._syncShadowBoxes();
          }
        });
      });

      root.querySelectorAll("input[data-color-for]").forEach((picker) => {
        picker.addEventListener("input", () => {
          const path = picker.dataset.colorFor;
          const text = root.querySelector(`[data-bind="${path}"]`);
          text.value = picker.value;
          this._writePath(path, picker.value);
          this._touch();
        });
      });

      // Dashboard background image: pick, replace, remove.
      root.querySelectorAll("button[data-dash-upload]").forEach((button) => {
        button.addEventListener("click", () => {
          const input = root.querySelector(`input[data-dash-file="${button.dataset.dashUpload}"]`);
          if (input) {
            input.click();
          }
        });
      });
      root.querySelectorAll("input[data-dash-file]").forEach((input) => {
        input.addEventListener("change", () => {
          const file = input.files && input.files[0];
          const mode = input.dataset.dashFile;
          input.value = "";
          if (file) {
            this._uploadDashImage(mode, file);
          }
        });
      });
      root.querySelectorAll("button[data-dash-remove]").forEach((button) => {
        button.addEventListener("click", () => {
          this._writePath(`theme.${button.dataset.dashRemove}.dash_image`, "");
          this._applyConditionals();
          this._touch();
        });
      });

      root.querySelectorAll("button[data-clear-for]").forEach((button) => {
        button.addEventListener("click", () => {
          const path = button.dataset.clearFor;
          root.querySelector(`[data-bind="${path}"]`).value = "";
          this._writePath(path, "");
          // Das Farbfeld zeigte sonst weiter die alte Farbe, obwohl der Wert weg ist.
          this._syncPicker(path);
          this._touch();
        });
      });

      // Eintraege: Liste (Auswahl, Ziehen, Auge) und Felder des Eintrags.
      const list = root.getElementById("items");
      const inspector = this._inspector;

      inspector.addEventListener("input", (event) => {
        const input = event.target;
        if (!input.dataset) {
          return;
        }
        if (input.dataset.item && input.dataset.prop && input.type !== "checkbox" && input.tagName !== "SELECT") {
          const key = input.dataset.item;
          const prop = input.dataset.prop;
          const cfg = this._itemConfig(key);
          cfg[prop] = input.type === "number" ? (input.value === "" ? 0 : Number(input.value)) : input.value;
          if (prop === "width" || prop === "height") {
            // Fenstergroesse eines PopUps (1.5.3): ganze px, 0 = automatisch
            cfg[prop] = Math.max(0, Math.min(POPUP_SIZE_MAX, Math.round(Number(cfg[prop]) || 0)));
          }
          // Farbfelder: das kleine Farbfeld zieht beim Tippen mit.
          if (["text_color", "background", "icon_color", "border_color"].indexOf(prop) >= 0) {
            const swatch = input.parentElement.querySelector(`input[type="color"][data-prop="${prop}"]`);
            if (swatch) {
              swatch.value = asHexColor(input.value);
            }
            this._syncCtiles();
          }
          if (prop === "icon") {
            this._showEntryIcon(key);
          }
          this._touch();
          return;
        }
        if (input.dataset.itemColor) {
          const cfg = this._itemConfig(input.dataset.itemColor);
          cfg[input.dataset.prop] = input.value;
          const text = input.parentElement.querySelector(`input[type="text"][data-prop="${input.dataset.prop}"]`);
          if (text) {
            text.value = input.value;
          }
          this._syncCtiles();
          this._touch();
        }
      });

      inspector.addEventListener("change", (event) => {
        const input = event.target;
        if (input.tagName === "SELECT" && input.dataset.item) {
          this._itemConfig(input.dataset.item).span = parseInt(input.value, 10) || 1;
          this._renderItems();
          this._touch();
          return;
        }
        if (input.type === "checkbox" && input.dataset.item) {
          this._itemConfig(input.dataset.item)[input.dataset.prop] = input.checked;
          // Liste und Felder neu: "ausblenden" aendert die Zeile, die
          // Schalter fuer die Einzelwerte blenden Felder ein und aus.
          this._renderItems();
          this._touch();
        }
      });

      this._bindPopupEditor(inspector);

      inspector.addEventListener("click", (event) => {
        const key = this._selKey;
        const tile = event.target.closest(".ctile[data-ctile]");
        if (tile && key) {
          this._ctile = this._ctile === tile.dataset.ctile ? "" : tile.dataset.ctile;
          this._renderInspector();
          const text = inspector.querySelector(".ctile-edit input[type='text']");
          if (text) {
            text.focus();
          }
          return;
        }
        const wipe = event.target.closest("[data-ctile-clear]");
        if (wipe && key) {
          this._itemConfig(key)[wipe.dataset.ctileClear] = "";
          this._renderInspector();
          this._touch();
          return;
        }
        const button = event.target.closest("button[data-action]");
        if (!button || !key) {
          return;
        }
        const action = button.dataset.action;
        if (action === "up") {
          this._move(key, -1);
        } else if (action === "down") {
          this._move(key, 1);
        } else if (action === "remove") {
          this._removeHeading(key);
        } else if (action === "reset-entry") {
          this._resetEntry(key);
        } else if (action === "all-entries") {
          this._itemsView = "list";
          this._renderItems();
        }
      });

      list.addEventListener("click", (event) => {
        const row = event.target.closest("li.item");
        if (!row) {
          return;
        }
        const button = event.target.closest("button[data-action]");
        if (button && button.dataset.action === "hidden") {
          const cfg = this._itemConfig(row.dataset.key);
          cfg.hidden = !cfg.hidden;
          this._renderItems();
          this._touch();
          return;
        }
        this._selectEntry(row.dataset.key);
      });

      // drag and drop
      list.addEventListener("dragstart", (event) => {
        const row = event.target.closest("li.item");
        if (!row) {
          return;
        }
        this._dragKey = row.dataset.key;
        row.setAttribute("data-dragging", "");
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", this._dragKey);
        } catch (err) {
          /* Safari */
        }
      });

      list.addEventListener("dragover", (event) => {
        const row = event.target.closest("li.item");
        if (!row || !this._dragKey) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        list.querySelectorAll("li.item[data-over]").forEach((other) => {
          if (other !== row) {
            other.removeAttribute("data-over");
            other.removeAttribute("data-over-indent");
          }
        });
        row.setAttribute("data-over", "");

        // Weit genug nach rechts gezogen? Dann rastet der Eintrag unter der
        // naechsten Ueberschrift darueber ein. Ueberschriften selbst lassen
        // sich nicht einruecken, sie sind immer die oberste Ebene.
        const dragged = this._entries.find((one) => one.key === this._dragKey);
        const overHeading =
          row.dataset.key !== this._dragKey && row.hasAttribute("data-heading");
        this._dragIndent =
          !!dragged &&
          !dragged.heading &&
          event.clientX - list.getBoundingClientRect().left > INDENT_THRESHOLD &&
          (overHeading || this._hasHeadingAbove(row.dataset.key));
        row.toggleAttribute("data-over-indent", this._dragIndent);
      });

      list.addEventListener("drop", (event) => {
        const row = event.target.closest("li.item");
        if (!row || !this._dragKey) {
          return;
        }
        event.preventDefault();
        this._dropBefore(this._dragKey, row.dataset.key, this._dragIndent);
        this._dragKey = null;
        this._dragIndent = false;
      });

      list.addEventListener("dragend", () => {
        list.querySelectorAll("li.item").forEach((row) => {
          row.removeAttribute("data-dragging");
          row.removeAttribute("data-over");
          row.removeAttribute("data-over-indent");
        });
        this._dragKey = null;
        this._dragIndent = false;
      });
    }

    _readInput(input) {
      if (input.type === "checkbox") {
        return input.checked;
      }
      if (input.type === "number" || input.type === "range") {
        // data-blank: leer heisst "wie Home Assistant" (-1), 0 ist ein echter Wert.
        if (input.value === "") {
          if (input.hasAttribute("data-blank")) {
            return -1;
          }
          // Emptied: back to the default of that field. A plain 0 would be
          // taken literally where 0 is a real value - an opacity of 0 makes
          // the header or the hover color invisible.
          const standard = this._defaultOf(input.dataset.bind);
          return typeof standard === "number" ? standard : typeof standard === "string" ? "" : 0;
        }
        // The values of the theme are text (the server stores them that way).
        return /^theme\./.test(input.dataset.bind || "") ? input.value : Number(input.value);
      }
      if (input.tagName === "SELECT") {
        // Only where the configuration really holds a number. The font weight
        // is a string ("500") and has to stay one - as a number it would be
        // dropped further down the line.
        const current = this._readPath(input.dataset.bind);
        return typeof current === "number" ? Number(input.value) : input.value;
      }
      return input.value;
    }

    /** The default value behind a data-bind path, or undefined. */
    _defaultOf(path) {
      const parts = String(path || "").split(".");
      const defaults = {
        layout: DEFAULT_LAYOUT,
        appearance: DEFAULT_APPEARANCE,
        advanced: DEFAULT_ADVANCED,
        header: DEFAULT_HEADER,
        settings: DEFAULT_SETTINGS,
      };
      if (parts[0] === "theme" && parts.length === 3) {
        return parts[2] in THEME_EXTRAS ? THEME_EXTRAS[parts[2]] : "";
      }
      const section = defaults[parts[0]];
      return section && parts.length === 2 ? section[parts[1]] : undefined;
    }

    _writePath(path, newValue) {
      const parts = path.split(".");
      let target = this._config;
      for (let i = 0; i < parts.length - 1; i += 1) {
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = newValue;
    }

    _readPath(path) {
      return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), this._config);
    }

    /* --------------------------------------------- einklappbare Karten */


    /**
     * Show or hide the groups that depend on a switch: data-show-when appears
     * while the switch is on, data-hide-when while it is off.
     */
    _applyConditionals() {
      const root = this.shadowRoot;
      root.querySelectorAll("[data-show-when]").forEach((element) => {
        const current = this._readPath(element.dataset.showWhen);
        element.hidden = element.dataset.showValues
          ? !element.dataset.showValues.split("|").includes(String(current))
          : !current;
      });
      root.querySelectorAll("[data-hide-when]").forEach((element) => {
        element.hidden = !!this._readPath(element.dataset.hideWhen);
      });
    }

    /**
     * Das Farbfeld (input type=color) zu einem Pfad auf den gespeicherten Wert
     * stellen: eine gueltige Farbe wird gezeigt, alles andere - auch ein leerer
     * Wert nach dem Zuruecksetzen - als neutrales Grau.
     */
    _syncPicker(path) {
      const picker = this.shadowRoot.querySelector(`input[data-color-for="${path}"]`);
      if (picker) {
        picker.value = asHexColor(this._readPath(path));
      }
    }

    /** Push the loaded configuration into every input of the shell. */
    _fillInputs() {
      const root = this.shadowRoot;
      root.querySelectorAll("[data-bind]").forEach((input) => {
        const current = this._readPath(input.dataset.bind);
        if (input.type === "checkbox") {
          input.checked = !!current;
        } else {
          const blank =
            current === undefined ||
            current === null ||
            (input.hasAttribute("data-blank") && Number(current) < 0);
          input.value = blank ? "" : current;
        }
      });
      root.querySelectorAll("input[data-color-for]").forEach((picker) => {
        picker.value = asHexColor(this._readPath(picker.dataset.colorFor));
      });
      this._updatePrimaryScales();
      this._syncShadowBoxes();
      this._checkContrast();
      this._syncSegs();
      this._syncRanges();
      this._syncHeaderPresets();
      this._applyConditionals();
      this._applyMode();
      this._syncDashImage();
      this._renderLinkList("header");
      this._renderLinkList("favorites");
      this._renderMenuEntries();
      this._renderSensorList();
      this._renderInspector();
      this._renderSidebarPreview();
      this._applyViews();
    }

    /* ----------------------------------------------------------- misc */
    /**
     * Zu welchem Bereich eine Seite gehoert. Layout, Eintraege und Aussehen
     * sind die drei Unterseiten der Seitenleiste; alle anderen stehen fuer
     * sich.
     */
    _groupOf(name) {
      return name === "layout" || name === "items" || name === "look" ? "sidebar" : name;
    }

    _selectTab(name) {
      if (PAGES.indexOf(name) < 0) {
        name = "layout";
      }
      this._tab = name;
      const group = this._groupOf(name);
      if (group === "sidebar") {
        // Beim Zurueckwechseln auf "Sidebar" soll die zuletzt benutzte
        // Unterseite wieder aufgehen, nicht immer Layout.
        this._sidebarTab = name;
      }
      writePage(name);
      const root = this.shadowRoot;
      root.querySelectorAll("nav.areas button[data-group]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.group === group);
      });
      root.querySelectorAll(".subtabs button[data-tab]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.tab === name);
      });
      root.querySelectorAll(".page").forEach((page) => {
        page.toggleAttribute("data-active", page.dataset.page === name);
      });
      const app = root.getElementById("app");
      if (app) {
        app.dataset.tab = name;
        app.dataset.group = group;
      }
      ["transfer", "info"].forEach((page) => {
        const button = root.getElementById(`${page}-btn`);
        if (button) {
          button.toggleAttribute("data-active", name === page);
        }
      });
      this._closeSearch();
      const page = root.querySelector(`.page[data-page="${name}"]`);
      if (page) {
        page.querySelectorAll(".fields-body, .stage-col").forEach((col) => {
          col.scrollTop = 0;
        });
        page.scrollTop = 0;
      }
      const main = root.querySelector("main");
      if (main) {
        main.scrollTop = 0;
      }
      this._renderSidebarPreview();
      if (name === "settings") {
        this._updateSettingsPreview();
      }
      this._applyStageMarks();
      this._updateOverflow();
    }

    /** Ein Klick auf einen der vier Bereiche. */
    _selectGroup(group) {
      if (group === "sidebar") {
        this._selectTab(this._sidebarTab || "layout");
        return;
      }
      this._selectTab(group);
    }

    /** Zaehler in der Kopfleiste, an den Bereichen, Gruppen und Feldern. */
    _updateFooter() {
      const root = this.shadowRoot;
      const t = this._t;
      const counts = this._changeCounts();
      this._dirty = counts.total > 0;
      const parts = [
        ["sidebar", t.tab_sidebar],
        ["theme", t.tab_theme],
        ["header", t.tab_header],
        ["settings", t.tab_settings],
        ["general", t.area_general],
      ]
        .filter((part) => counts[part[0]] > 0)
        .map((part) => `${part[1]} ${counts[part[0]]}`);
      root.querySelectorAll("[data-changes]").forEach((box) => {
        box.toggleAttribute("data-clean", !counts.total);
        box.title = parts.join(" · ");
        box.innerHTML = counts.total
          ? `<span class="long">${escapeHtml(t.unsaved_n.replace("{n}", counts.total))}</span><span class="short">${escapeHtml(t.unsaved_short.replace("{n}", counts.total))}</span>`
          : `<span>${escapeHtml(t.all_saved)}</span>`;
      });
      const app = root.getElementById("app");
      if (app) {
        app.toggleAttribute("data-clean", !counts.total);
      }
      root.querySelectorAll("[data-count]").forEach((badge) => {
        const n = counts[badge.dataset.count] || 0;
        badge.textContent = n ? String(n) : "";
      });
      root.querySelectorAll("[data-dot]").forEach((dot) => {
        if (dot.dataset.dot) {
          dot.hidden = !counts[dot.dataset.dot];
        }
      });
      root.querySelectorAll(".state").forEach((state) => {
        if (state.dataset.flash) {
          return;
        }
        state.textContent = "";
        state.classList.remove("warn");
      });
      this._markChanges();
      this._markEntries();
      this._sectionCounts();
    }

    /** Die Kopfzeile meldet kurz etwas (gespeichert, Fehler, ...). */
    _flash(text, isError) {
      const states = this.shadowRoot.querySelectorAll(".state");
      states.forEach((state) => {
        state.dataset.flash = "1";
        state.textContent = text;
        state.title = text;
        state.classList.toggle("warn", !!isError);
      });
      // One timer only: an earlier message must not wipe a later one early.
      window.clearTimeout(this._flashTimer);
      this._flashTimer = window.setTimeout(() => {
        states.forEach((state) => {
          delete state.dataset.flash;
        });
        this._updateFooter();
      }, isError ? 5000 : 2500);
    }

    /** Hoehe der Leisten unten (Handy). */
    _updateOverflow() {
      const dock = this.shadowRoot && this.shadowRoot.getElementById("dock");
      if (!dock) {
        return;
      }
      this.style.setProperty("--sh-dock-h", `${dock.offsetHeight || 0}px`);
    }

    /** Re-check the sizes whenever the panel changes size. */
    _watchOverflow() {
      const check = () => this._updateOverflow();
      if (typeof ResizeObserver === "function") {
        this._resizeObserver = new ResizeObserver(check);
        this._resizeObserver.observe(this);
        this._resizeObserver.observe(this.shadowRoot.getElementById("dock"));
      }
      window.addEventListener("resize", check);
      this._onWindowResize = check;
    }

    /* ------------------------------------------- Kopfzeile: Vorlagen usw. */
    /**
     * Eine Vorlage in die Felder der Kopfzeile schreiben. confirmed: der
     * Dialog hat schon gefragt (Text unter den Vorlagen).
     */
    _applyHeaderPreset(id, confirmed) {
      const preset = HEADER_PRESETS.find((one) => one.id === id);
      if (!preset) {
        return;
      }
      if (!confirmed && !window.confirm(this._t.header_preset_confirm)) {
        return;
      }
      // Erst alles auf die Standardwerte, dann die Vorlage darauf: sonst
      // bliebe stehen, was die Vorlage nicht setzt. "hidden" ueberlebt.
      // Neustart-Knopf, Links, CPU/RAM und Speicherplatz sind kein Aussehen -
      // sie bleiben.
      const hidden = !!this._config.header.hidden;
      this._config.header = Object.assign({}, DEFAULT_HEADER, preset.values, {
        hidden: hidden,
        position: this._config.header.position === "bottom" ? "bottom" : "top",
        show_restart: this._config.header.show_restart === true,
        show_system: this._config.header.show_system === true,
        show_disk: this._config.header.show_disk === true,
        links: cleanHeaderLinks(this._config.header.links, true),
      });
      this._fillInputs();
      this._applyConditionals();
      this._touch();
      this._flash(
        this._t.header_preset_done.replace("{name}", this._de ? preset.de : preset.en)
      );
    }

    /** Die Einstellungen der Kopfzeile als .json-Datei herausgeben. */
    _exportHeader() {
      const text = JSON.stringify(
        { version: VERSION, header: this._config.header },
        null,
        2
      );
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ha-style-hub-header-${stamp}.json`;
      // Safari folgt dem Klick nur, wenn der Link im Dokument haengt
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._flash(this._t.export_done);
    }

    _importHeader() {
      const root = this.shadowRoot;
      root.getElementById("header-text").value = "";
      root.getElementById("header-file").value = "";
      this._headerError("");
      root.getElementById("header-modal").hidden = false;
    }

    _closeHeaderImport() {
      this.shadowRoot.getElementById("header-modal").hidden = true;
    }

    _headerError(text) {
      const box = this.shadowRoot.querySelector("#header-modal .modal-error");
      box.textContent = text;
      box.hidden = !text;
    }

    /**
     * Den eingefuegten Text lesen und die Kopfzeile daraus fuellen.
     *
     * Angenommen wird beides: ein Export von dieser Seite ({version, header})
     * und ein vollstaendiger Export der ganzen Konfiguration - in beiden
     * Faellen wird nur der Abschnitt "header" gelesen. Liegt das Objekt ohne
     * Huelle vor, wird es selbst als Kopfzeile verstanden.
     */
    _applyHeaderImport() {
      const text = this.shadowRoot.getElementById("header-text").value.trim();
      if (!text) {
        this._headerError(this._t.header_import_empty);
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        this._headerError(String(err.message || err));
        return;
      }
      const roh = isObject(parsed) && isObject(parsed.header) ? parsed.header : parsed;
      if (!isObject(roh)) {
        this._headerError(this._t.header_import_empty);
        return;
      }
      // "hidden" is not part of a design (it stays as it is, see below), so a
      // file that holds nothing else has nothing to import.
      const bekannt = Object.keys(roh).filter(
        (key) => key in DEFAULT_HEADER && key !== "hidden"
      );
      if (!bekannt.length) {
        this._headerError(this._t.header_import_empty);
        return;
      }

      // Werte in den Typ bringen, den das Feld erwartet - eine Datei von Hand
      // geschrieben hat schnell "60" statt 60 stehen.
      const hidden = !!this._config.header.hidden;
      // Fehlen der Neustart-Knopf oder die Links in der Datei (Export einer
      // aelteren Fassung), bleibt, was eingestellt ist.
      const neu = Object.assign({}, DEFAULT_HEADER, {
        show_restart: this._config.header.show_restart === true,
        links: cleanHeaderLinks(this._config.header.links, true),
      });
      bekannt.forEach((key) => {
        const standard = DEFAULT_HEADER[key];
        const wert = roh[key];
        if (key === "links") {
          neu.links = cleanHeaderLinks(wert, true);
        } else if (typeof standard === "boolean") {
          neu[key] = wert === true || wert === "true" || wert === 1;
        } else if (typeof standard === "number") {
          const zahl = Number(wert);
          neu[key] =
            wert === "" || wert === null || typeof wert === "boolean" || !isFinite(zahl)
              ? standard
              : zahl;
        } else {
          neu[key] = String(wert === undefined || wert === null ? "" : wert);
        }
      });
      neu.hidden = hidden;
      this._config.header = neu;

      this._closeHeaderImport();
      this._fillInputs();
      this._applyConditionals();
      this._touch();
      const t = this._t;
      const zahl = bekannt.filter((key) => key !== "hidden").length;
      this._flash(
        zahl === 1
          ? t.header_import_done_one
          : t.header_import_done.replace("{taken}", zahl)
      );
    }

    /* --------------------------------------- HA-Settings: Export und Import */

    /** Die HA-Settings als .json-Datei herausgeben. */
    _exportSettings() {
      const text = JSON.stringify(
        { version: VERSION, settings: this._config.settings },
        null,
        2
      );
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ha-style-hub-settings-${stamp}.json`;
      // Safari folgt dem Klick nur, wenn der Link im Dokument haengt
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._flash(this._t.export_done);
    }

    _importSettings() {
      const root = this.shadowRoot;
      root.getElementById("settings-text").value = "";
      root.getElementById("settings-file").value = "";
      this._settingsError("");
      root.getElementById("settings-modal").hidden = false;
    }

    _closeSettingsImport() {
      this.shadowRoot.getElementById("settings-modal").hidden = true;
    }

    _settingsError(text) {
      const box = this.shadowRoot.querySelector("#settings-modal .modal-error");
      box.textContent = text;
      box.hidden = !text;
    }

    /**
     * Den eingefuegten Text lesen und die HA-Settings daraus fuellen.
     *
     * Angenommen wird ein Export von dieser Seite ({version, settings}) und
     * ein vollstaendiger Export der ganzen Konfiguration - gelesen wird nur
     * der Abschnitt "settings". Liegt das Objekt ohne Huelle vor, wird es
     * selbst als Einstellungen verstanden. Fehlende Schluessel fallen auf den
     * Standard zurueck, Unbekanntes wird verworfen.
     */
    _applySettingsImport() {
      const text = this.shadowRoot.getElementById("settings-text").value.trim();
      if (!text) {
        this._settingsError(this._t.settings_import_empty);
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        this._settingsError(String(err.message || err));
        return;
      }
      const roh = isObject(parsed) && isObject(parsed.settings) ? parsed.settings : parsed;
      if (!isObject(roh)) {
        this._settingsError(this._t.settings_import_empty);
        return;
      }
      const bekannt = Object.keys(roh).filter((key) => key in DEFAULT_SETTINGS);
      if (!bekannt.length) {
        this._settingsError(this._t.settings_import_empty);
        return;
      }

      // Werte in den Typ bringen, den das Feld erwartet - eine Datei von Hand
      // geschrieben hat schnell "60" statt 60 stehen.
      const neu = Object.assign({}, DEFAULT_SETTINGS, {
        menu_order: [],
        menu_hidden: [],
        favorites: [],
        monitor_counts_items: COUNT_ITEMS.slice(),
        menu_items: {},
        monitor_sensors: [],
      });
      bekannt.forEach((key) => {
        const standard = DEFAULT_SETTINGS[key];
        const wert = roh[key];
        if (key === "favorites") {
          neu[key] = cleanFavorites(wert);
        } else if (key === "favorites_place") {
          neu[key] = placeOf(wert, FAVORITES_PLACES);
        } else if (key === "monitor_place" || key === "monitor_backup_place" || key === "monitor_counts_place") {
          neu[key] = placeOf(wert, MONITOR_PLACES);
        } else if (key === "menu_items") {
          neu[key] = cleanMenuItems(wert);
        } else if (key === "monitor_sensors") {
          neu[key] = cleanSensors(wert);
        } else if (key === "monitor_counts_items") {
          neu[key] = Array.isArray(wert) ? COUNT_ITEMS.filter((one) => wert.indexOf(one) >= 0) : COUNT_ITEMS.slice();
        } else if (Array.isArray(standard)) {
          neu[key] = cleanPaths(wert);
        } else if (typeof standard === "boolean") {
          neu[key] = wert === true || wert === "true";
        } else if (typeof standard === "number") {
          const zahl = Number(wert);
          neu[key] = Number.isFinite(zahl) && wert !== "" && wert !== null ? zahl : standard;
        } else {
          neu[key] = String(wert === undefined || wert === null ? "" : wert);
        }
      });
      this._config.settings = neu;

      this._closeSettingsImport();
      this._fillInputs();
      this._applyConditionals();
      this._touch();
      const t = this._t;
      this._flash(
        bekannt.length === 1
          ? t.settings_import_done_one
          : t.settings_import_done.replace("{taken}", bekannt.length)
      );
    }

    /** Hand the configuration over as a .json file. */
    _export() {
      this._config.order = this._entries.map((entry) => entry.key);
      const text = JSON.stringify(this._config, null, 2);
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ha-style-hub-${stamp}.json`;
      // Safari only follows the click when the link is in the document
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._flash(this._t.export_done);
    }

    /**
     * Build the theme the same way the backend does (theme.py): values both
     * modes agree on move to the top level. No rgb-* variants are built here,
     * Home Assistant derives those itself from every hex value.
     */
    _themeData() {
      const theme = this._config.theme || {};
      const mode = (name) => {
        const values = theme[name] || {};
        const out = {};
        THEME_VARIABLES.forEach((key) => {
          const value = withUnit(key, values[key]);
          if (value) {
            out[key] = value;
          }
        });
        Object.keys(THEME_COMPOSED).forEach((target) => {
          const [switchKey, parts] = THEME_COMPOSED[target];
          if (values[switchKey]) {
            out[target] = composedValue(values, parts);
          }
        });
        const dashboard = backgroundValue(values, false);
        if (dashboard) {
          out["lovelace-background"] = dashboard;
        }
        // Die Skala der Primaerfarbe fuer die neueren Teile (wie theme.py).
        if (out["primary-color"]) {
          Object.assign(out, primaryPalette(out["primary-color"]));
        }
        return out;
      };

      const dark = mode("dark");
      const light = mode("light");
      const shared = {};
      Object.keys(light).forEach((key) => {
        if (dark[key] === light[key]) {
          shared[key] = light[key];
        }
      });
      return { name: theme.name || DEFAULT_THEME.name, shared, dark, light };
    }

    /* --------------------------------------------------- Theme-Import */

    /** Dialog oeffnen. */
    _importTheme() {
      const root = this.shadowRoot;
      root.getElementById("theme-text").value = "";
      root.getElementById("theme-file").value = "";
      root.getElementById("theme-pick-row").hidden = true;
      this._themeCandidates = [];
      this._themeError("");
      root.getElementById("theme-modal").hidden = false;
      root.getElementById("theme-text").focus();
    }

    _closeThemeImport() {
      this.shadowRoot.getElementById("theme-modal").hidden = true;
    }

    _themeError(message) {
      const box = this.shadowRoot.querySelector("#theme-modal .modal-error");
      box.textContent = message;
      box.hidden = !message;
    }

    /**
     * Den Text im Feld lesen und die Auswahlliste fuellen. Steckt nur ein
     * Theme in der Datei, bleibt die Liste versteckt.
     */
    _scanThemeText() {
      const root = this.shadowRoot;
      const text = root.getElementById("theme-text").value;
      const found = text.trim()
        ? themesFromYaml(parseYaml(text), this._t.theme_import_pick)
        : [];
      this._themeCandidates = found;
      const row = root.getElementById("theme-pick-row");
      const pick = root.getElementById("theme-pick");
      if (found.length > 1) {
        pick.innerHTML = found
          .map(
            (theme, index) =>
              `<option value="${index}">${escapeHtml(theme.name)}</option>`
          )
          .join("");
        row.hidden = false;
      } else {
        row.hidden = true;
      }
      this._themeError("");
      return found;
    }

    /**
     * Eine Vorlage in die Felder schreiben.
     *
     * Eine Vorlage ist fuer die Seite dasselbe wie eine importierte Datei -
     * ein Satz Werte fuer hell und dunkel. Deshalb laeuft sie durch genau
     * dieselbe Methode: _takeTheme leert beide Modi und fuellt sie neu.
     * confirmed: der Dialog hat schon gefragt (Text unter den Vorlagen).
     */
    _applyPreset(id, confirmed) {
      const preset = THEME_PRESETS.find((one) => one.id === id);
      if (!preset) {
        return;
      }
      // Die Vorlage raeumt beide Modi leer. Wer schon Farben gesetzt hat,
      // soll das nicht durch einen Fehlklick verlieren.
      if (!confirmed && !window.confirm(this._t.theme_preset_confirm)) {
        return;
      }
      this._takeTheme({ base: {}, dark: preset.dark, light: preset.light });
      this._fillInputs();
      this._touch();
      this._flash(
        this._t.theme_preset_done.replace("{name}", this._de ? preset.de : preset.en)
      );
    }

    /**
     * Eine erzeugte Palette in die Felder schreiben.
     *
     * Anders als eine Vorlage raeumt sie nichts leer: es werden nur die
     * Farbvariablen der Palette ueberschrieben, Rahmen, Schatten, Schrift und
     * Statusfarben bleiben stehen. Aus dem Dialog heraus ohne Rueckfrage -
     * der Dialog selbst sagt, was passiert.
     */
    _applyPalette(palette, confirmed) {
      if (!confirmed && !window.confirm(this._t.palette_confirm)) {
        return;
      }
      ["dark", "light"].forEach((mode) => {
        Object.keys(palette[mode]).forEach((key) => {
          this._config.theme[mode][key] = palette[mode][key];
        });
      });
      this._fillInputs();
      this._touch();
      this._flash(this._t.palette_done);
    }

    /** Das gewaehlte Theme in die Felder uebernehmen. */
    _applyThemeImport() {
      const root = this.shadowRoot;
      const found = this._themeCandidates && this._themeCandidates.length
        ? this._themeCandidates
        : this._scanThemeText();
      if (!found.length) {
        this._themeError(this._t.theme_import_empty);
        return;
      }
      const index = found.length > 1
        ? parseInt(root.getElementById("theme-pick").value, 10) || 0
        : 0;
      // _takeTheme() empties both modes first. When nothing of the file fits,
      // the theme has to be exactly what it was - not empty behind an error
      // message.
      const before = clone(this._config.theme);
      const result = this._takeTheme(found[index]);
      if (!result.taken) {
        this._config.theme = before;
        this._themeError(this._t.theme_import_none);
        return;
      }

      this._closeThemeImport();
      this._fillInputs();
      this._touch();
      const t = this._t;
      let text =
        result.taken === 1
          ? t.theme_import_done_one
          : t.theme_import_done.replace("{taken}", result.taken);
      if (result.skipped.length === 1) {
        text += t.theme_import_skipped_one;
      } else if (result.skipped.length > 1) {
        text += t.theme_import_skipped.replace("{skipped}", result.skipped.length);
      }
      this._flash(text);
      if (result.skipped.length && this._config.advanced.debug) {
        // eslint-disable-next-line no-console
        console.info("[HA Style Hub] nicht uebernommen:", result.skipped.join(", "));
      }
    }

    /**
     * Ein geparstes Theme in die Konfiguration schreiben. Das bisherige Theme
     * wird dabei geleert - ein Import ersetzt, er mischt nicht.
     *
     * Werte ausserhalb von modes gelten in Home Assistant fuer beide Modi,
     * also landen sie auch hier in beiden und werden von einem modus-eigenen
     * Wert ueberschrieben. Damit sieht das Formular genau das, was Home
     * Assistant aus der Datei machen wuerde.
     */
    _takeTheme(theme) {
      const skipped = [];
      // Gezaehlt werden Variablen, nicht Zuweisungen: ein Wert ausserhalb von
      // modes landet in beiden Modi, ist fuer den Benutzer aber eine Angabe.
      const taken = [];

      ["dark", "light"].forEach((mode) => {
        THEME_VARIABLES.forEach((key) => {
          this._config.theme[mode][key] = "";
        });
        Object.keys(THEME_EXTRAS).forEach((key) => {
          this._config.theme[mode][key] = THEME_EXTRAS[key];
        });
      });

      ["dark", "light"].forEach((mode) => {
        const merged = Object.assign({}, theme.base, theme[mode]);
        Object.keys(merged).forEach((key) => {
          const value = String(merged[key] === undefined ? "" : merged[key]).trim();
          if (!value) {
            return;
          }
          if (THEME_VARIABLES.indexOf(key) < 0) {
            // rgb-* baut Home Assistant selbst aus den Hex-Werten, die tauchen
            // deshalb nicht als "nicht uebernommen" auf.
            if (key.indexOf("rgb-") !== 0 && skipped.indexOf(key) < 0) {
              skipped.push(key);
            }
            return;
          }
          if (taken.indexOf(key) < 0) {
            taken.push(key);
          }
          if (this._takeShorthand(mode, key, value)) {
            return;
          }
          this._config.theme[mode][key] = value;
        });
      });

      return { taken: taken.length, skipped: skipped };
    }

    /**
     * "0px 2px 2px 0px" auf die vier Einzelfelder verteilen und den Schalter
     * setzen, damit ein importiertes Theme auf der Seite auch bearbeitbar ist
     * und nicht als unverstaendliche Zeichenkette in einem Feld liegt.
     */
    _takeShorthand(mode, key, value) {
      const composed = THEME_COMPOSED[key];
      if (!composed) {
        return false;
      }
      const parts = value.split(/\s+/);
      if (parts.length !== 4) {
        return false;
      }
      const numbers = parts.map((part) => {
        const plain = part.replace(/px$/, "").trim();
        return /^-?\d*\.?\d+$/.test(plain) ? plain : null;
      });
      if (numbers.some((n) => n === null)) {
        return false;
      }
      const [switchKey, fields] = composed;
      this._config.theme[mode][switchKey] = true;
      fields.forEach((field, index) => {
        this._config.theme[mode][field] = numbers[index];
      });
      return true;
    }

    /** Hand the theme over as a .yaml file. */
    _exportTheme() {
      const data = this._themeData();
      if (
        !Object.keys(data.shared).length &&
        !Object.keys(data.dark).length &&
        !Object.keys(data.light).length
      ) {
        // A name without a body is not a theme Home Assistant can load.
        this._flash(this._t.theme_export_empty, true);
        return;
      }
      const quote = (value) =>
        `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      const lines = [`# HA Style Hub v${VERSION}`, `${quote(data.name)}:`];
      Object.keys(data.shared).forEach((key) => {
        lines.push(`  ${key}: ${quote(data.shared[key])}`);
      });
      const modes = ["light", "dark"].filter(
        (name) => Object.keys(data[name]).length > 0
      );
      if (modes.length) {
        lines.push("  modes:");
        modes.forEach((name) => {
          lines.push(`    ${name}:`);
          Object.keys(data[name]).forEach((key) => {
            lines.push(`      ${key}: ${quote(data[name][key])}`);
          });
        });
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([lines.join("\n") + "\n"], {
        type: "application/yaml",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ha-style-hub-theme-${stamp}.yaml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._flash(this._t.export_done);
    }

    /* ------------------------------------------------------- history */

    /** "Heute, 16:31" / "Gestern, 09:12" / "28.09.2026, 20:05". */
    _when(stamp) {
      const date = new Date(stamp);
      if (!stamp || Number.isNaN(date.getTime())) {
        return "";
      }
      const lang = this._de ? "de-DE" : "en-GB";
      const time = date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
      const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const gap = Math.round((day(new Date()) - day(date)) / 86400000);
      if (gap === 0) {
        return `${this._t.history_today}, ${time}`;
      }
      if (gap === 1) {
        return `${this._t.history_yesterday}, ${time}`;
      }
      return `${date.toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "numeric" })}, ${time}`;
    }

    /** "3 Werte" / "1 Wert", "2 Eintraege" / "1 Eintrag". */
    _count(n, one, many) {
      return (n === 1 ? one : many).replace("{n}", String(n));
    }

    /** The changes of one entry as a list of short lines. */
    _changeLines(before, after) {
      const t = this._t;
      if (!before) {
        return [];
      }
      const lines = diffAreas(before, after).map((change) => {
        const label = t[`history_area_${change.area}`];
        let text;
        if (change.area === "theme") {
          const parts = [];
          if (change.dark) {
            parts.push(`${this._count(change.dark, t.history_value, t.history_values)} ${t.history_dark}`);
          }
          if (change.light) {
            parts.push(`${this._count(change.light, t.history_value, t.history_values)} ${t.history_light}`);
          }
          if (change.names) {
            parts.push(this._count(change.names, t.history_value, t.history_values));
          }
          text = parts.join(", ");
        } else if (change.area === "items") {
          const parts = [];
          if (change.n) {
            parts.push(this._count(change.n, t.history_entry, t.history_entries));
          }
          if (change.extra === "order") {
            parts.push(t.history_order);
          }
          text = parts.join(", ");
        } else {
          text = this._count(change.n, t.history_value, t.history_values);
        }
        return `${label}: ${text}`;
      });
      return lines.length ? lines : [t.history_nothing];
    }

    async _openHistory() {
      const root = this.shadowRoot;
      const list = root.getElementById("history-list");
      const error = root.getElementById("history-error");
      error.hidden = true;
      list.innerHTML = `<li class="hint">${escapeHtml(this._t.history_loading)}</li>`;
      root.getElementById("history-modal").hidden = false;
      try {
        const result = await this._hass.connection.sendMessagePromise({
          type: "ha_style_hub/history",
        });
        this._history = Array.isArray(result && result.entries) ? result.entries : [];
        this._renderHistory();
      } catch (err) {
        console.error("[HA Style Hub]", "could not read the history", err);
        list.innerHTML = "";
        error.textContent = this._t.history_error;
        error.hidden = false;
      }
    }

    _closeHistory() {
      this.shadowRoot.getElementById("history-modal").hidden = true;
    }

    _renderHistory() {
      const t = this._t;
      const list = this.shadowRoot.getElementById("history-list");
      const entries = this._history || [];
      if (!entries.length) {
        list.innerHTML = `<li class="hint">${escapeHtml(t.history_empty)}</li>`;
        return;
      }
      // Der Stand, der gerade gespeichert ist, wird markiert - egal, ob er der
      // neueste Eintrag ist.
      let currentId = null;
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        if (sameState(normalize(entries[i].config), this._saved)) {
          currentId = entries[i].id;
          break;
        }
      }
      list.innerHTML = entries
        .map((entry, index) => {
          const config = normalize(entry.config);
          const before = index > 0 ? normalize(entries[index - 1].config) : null;
          let title;
          if (entry.source === "start") {
            title = t.history_start;
          } else {
            title = this._when(entry.ts) || "?";
          }
          const meta = [];
          if (entry.source === "reset") {
            meta.push(t.history_reset);
          } else if (entry.source !== "start") {
            meta.push(t.history_saved);
          }
          if (entry.user) {
            meta.push(t.history_by.replace("{name}", () => entry.user));
          }
          const changes = this._changeLines(before, config);
          const isCurrent = entry.id === currentId;
          return `
            <li class="hist" data-id="${escapeHtml(entry.id)}"${isCurrent ? " data-current" : ""}>
              <div class="hist-main">
                <strong>${escapeHtml(title)}</strong>${
                  isCurrent ? `<span class="hist-badge">${escapeHtml(t.history_current)}</span>` : ""
                }
                ${meta.length ? `<span class="hist-meta">${escapeHtml(meta.join(" \u00b7 "))}</span>` : ""}
                ${changes.length ? `<ul class="hist-changes">${changes
                  .map((line) => `<li>${escapeHtml(line)}</li>`)
                  .join("")}</ul>` : ""}
              </div>
              ${isCurrent ? "" : `<button class="flat" data-restore="${escapeHtml(entry.id)}">${escapeHtml(t.history_restore)}</button>`}
            </li>`;
        })
        .reverse()
        .join("");
    }

    /**
     * Einen Stand in die Seite laden.
     *
     * Es wird nichts gespeichert: der Stand landet wie ein Import in den
     * Feldern, ist sofort im Browser zu sehen und wird mit "Speichern" zum
     * neuen Stand - oder mit "Verwerfen" wieder abgelegt. Die beiden
     * Schalter (Kopfzeile / Sidebar ausblenden) behalten ihren jetzigen Wert:
     * wer die Sidebar gerade ausgeblendet hat, soll durch einen alten Stand
     * nicht plotzlich vor einer anderen Ansicht sitzen.
     */
    _restoreHistory(id) {
      const entry = (this._history || []).find((one) => one.id === id);
      if (!entry) {
        return;
      }
      if (this._dirty && !window.confirm(this._t.history_unsaved)) {
        return;
      }
      const next = normalize(entry.config);
      next.header.hidden = this._config.header.hidden;
      next.layout.hide_sidebar = this._config.layout.hide_sidebar;
      this._config = next;
      this._themeSynced = null;
      this._closeHistory();
      this._syncEntries(true);
      this._fillInputs();
      this._touch();
      const when = entry.source === "start" ? this._t.history_start : this._when(entry.ts);
      this._flash(this._t.history_restored.replace("{date}", when));
    }

    /** Open the import dialog - file picker plus a text box. */
    _import() {
      const root = this.shadowRoot;
      root.getElementById("import-text").value = "";
      root.getElementById("import-file").value = "";
      this._importError("");
      root.getElementById("import-modal").hidden = false;
      root.getElementById("import-text").focus();
    }

    _closeImport() {
      this.shadowRoot.getElementById("import-modal").hidden = true;
    }

    _importError(message) {
      const box = this.shadowRoot.querySelector("#import-modal .modal-error");
      box.textContent = message;
      box.hidden = !message;
    }

    /** Read the text box and take it over. */
    _applyImport() {
      const text = this.shadowRoot.getElementById("import-text").value.trim();
      if (!text) {
        this._importError(this._t.import_empty);
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        this._importError(`${this._t.import_error} ${err.message}`);
        return;
      }
      if (!isObject(parsed)) {
        this._importError(this._t.import_error);
        return;
      }
      // Ein Export nur der Seitenleiste ({version, sidebar}) geht auch.
      if (isObject(parsed.sidebar)) {
        const sidebar = parsed.sidebar;
        parsed = Object.assign({}, parsed);
        ["layout", "appearance", "items", "order"].forEach((name) => {
          if (name in sidebar && !(name in parsed)) {
            parsed[name] = sidebar[name];
          }
        });
      }
      // A file with none of the sections is not a configuration (an export
      // of the header page alone still is: it has "header"). Taking it over
      // would reset everything to the defaults.
      const sections = ["layout", "appearance", "advanced", "header", "settings", "theme", "items", "order"];
      if (!sections.some((name) => name in parsed)) {
        this._importError(this._t.import_error);
        return;
      }
      // Only what the file contains is replaced, the rest stays as it is.
      const merged = clone(this._config);
      sections.forEach((name) => {
        if (name in parsed) {
          merged[name] = parsed[name];
        }
      });
      this._config = normalize(merged);
      this._themeSynced = null;
      this._closeImport();
      this._syncEntries(true);
      this._fillInputs();
      this._touch();
    }

    /** Ein Import-Dialog im gemeinsamen Aufbau (Datei, Textfeld, Knoepfe). */
    _importDialog(o) {
      const t = this._t;
      return `
        <div class="modal" id="${o.id}" hidden>
          <div class="modal-card" role="dialog" aria-modal="true">
            <h2><span class="grow">${escapeHtml(o.title)}</span><span class="badge-ext">${o.ext}</span></h2>
            <p class="hint">${escapeHtml(o.hint)}</p>
            <label class="file-pick">
              <input type="file" id="${o.file}" accept="${o.accept}" />
              ${glyph("mdi:tray-arrow-up", "")}<span>${escapeHtml(o.fileLabel || t.import_file)}</span>
            </label>
            ${o.extra || ""}
            <span class="paste-label">${escapeHtml(t.import_paste)}</span>
            <textarea id="${o.text}" spellcheck="false" placeholder="${o.placeholder}"></textarea>
            <p class="modal-error warn" hidden></p>
            <div class="modal-actions">
              <button class="flat" id="${o.cancel}">${escapeHtml(t.cancel)}</button>
              <button class="primary" id="${o.ok}">${escapeHtml(t.import_apply)}</button>
            </div>
          </div>
        </div>`;
    }

    /** Eine Kachel in den Vorlagen-Dialogen (Theme und Kopfzeile). */
    _presetTile(attr, id, name, hint, swatch) {
      return `
        <button type="button" class="preset" ${attr}="${escapeHtml(id)}">
          <span class="swatch">${swatch}</span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(hint)}</small>
        </button>`;
    }

    /** Alle Dialoge: Verlauf, Importe, Hinzufuegen, Palette, Vorlagen. */
    _modals() {
      const t = this._t;
      const json = "application/json,.json";
      const themeTiles = THEME_PRESETS.map((preset) => {
        const d = preset.dark || {};
        const card = d["ha-card-background"] || d["card-background-color"] || "#2a2a2a";
        const line = d["ha-card-border-color"] || "transparent";
        const width = d["ha-card-border-width"] ? `${parseInt(d["ha-card-border-width"], 10) || 0}px` : "1px";
        const radius = d["ha-card-border-radius"] ? `${Math.min(14, parseInt(d["ha-card-border-radius"], 10) || 0)}px` : "10px";
        const tile = `<i style="background:${escapeHtml(cssValue(card))};border:${escapeHtml(width)} solid ${escapeHtml(cssValue(line))};border-radius:${escapeHtml(radius)}"></i>`;
        return this._presetTile("data-preset", preset.id, this._de ? preset.de : preset.en,
          this._de ? preset.de_hint : preset.en_hint,
          `<span class="sw-in" style="background:${escapeHtml(cssValue(d["primary-background-color"] || "#111"))}">${tile}${tile}</span>`);
      }).join("");
      const headerTiles = HEADER_PRESETS.map((preset) => {
        const v = preset.values || {};
        const bg = cssValue(v.background || "#2b3240");
        const radius = v.radius_split
          ? ["tl", "tr", "br", "bl"].map((c) => `${Math.min(14, Number(v[`radius_${c}`]) || 0)}px`).join(" ")
          : `${Math.min(14, Number(v.radius) || 0)}px`;
        const height = Math.max(12, Math.min(30, Math.round((Number(v.height) || 56) / 2.4)));
        const bar = `<i class="hp-bar" style="background:${escapeHtml(bg)};height:${height}px;border-radius:${escapeHtml(radius)}"></i>`;
        return this._presetTile("data-hpreset", preset.id, this._de ? preset.de : preset.en,
          this._de ? preset.de_hint : preset.en_hint,
          `<span class="sw-in hp">${bar}<i class="hp-body"></i></span>`);
      }).join("");
      return `
        <div class="modal" id="changes-modal" hidden>
          <div class="modal-card xwide" role="dialog" aria-modal="true">
            <h2>${glyph("mdi:format-list-checks", "")}<span class="grow">${escapeHtml(t.changes_title)} <span class="h2-sub" id="changes-count"></span></span></h2>
            <p class="hint">${escapeHtml(t.changes_hint)}</p>
            <ul class="chg-list" id="changes-list"></ul>
            <div class="modal-actions">
              <button class="flat" id="changes-revert">${escapeHtml(t.revert)}</button>
              <button class="flat" id="changes-close">${escapeHtml(t.history_close)}</button>
            </div>
          </div>
        </div>
        <div class="qc-pop" id="qc-pop" hidden></div>
        <div class="modal" id="history-modal" hidden>
          <div class="modal-card" role="dialog" aria-modal="true">
            <h2>${glyph("mdi:history", "")}<span class="grow">${escapeHtml(t.history_title)}</span></h2>
            <p class="hint">${escapeHtml(t.history_hint)}</p>
            <ul class="hist-list" id="history-list"></ul>
            <p class="history-error warn" id="history-error" hidden></p>
            <div class="modal-actions">
              <button class="flat" id="history-close">${escapeHtml(t.history_close)}</button>
            </div>
          </div>
        </div>
        ${this._importDialog({
          id: "theme-modal", title: t.theme_import_title, ext: ".yaml",
          hint: t.theme_import_hint, file: "theme-file", accept: ".yaml,.yml,text/yaml,text/plain",
          fileLabel: t.theme_import_file, text: "theme-text", cancel: "theme-import-cancel", ok: "theme-import-ok",
          placeholder: "Mein Theme:&#10;  primary-color: &quot;#03a9f4&quot;&#10;  modes:&#10;    dark:&#10;      card-background-color: &quot;#1c1c1c&quot;",
          extra: `<label class="field" id="theme-pick-row" hidden style="margin-bottom:14px">
              <span>${escapeHtml(t.theme_import_pick)}</span>
              <select id="theme-pick"></select>
            </label>`,
        })}
        ${this._importDialog({
          id: "header-modal", title: t.header_import_title, ext: ".json",
          hint: t.header_import_hint, file: "header-file", accept: json, text: "header-text",
          cancel: "header-import-cancel", ok: "header-import-ok",
          placeholder: '{ "header": { "height": 60, "background": "#1f2430" } }',
        })}
        ${this._importDialog({
          id: "settings-modal", title: t.settings_import_title, ext: ".json",
          hint: t.settings_import_hint, file: "settings-file", accept: json, text: "settings-text",
          cancel: "settings-import-cancel", ok: "settings-import-ok",
          placeholder: '{ "settings": { "icon_box": true, "list_view": true } }',
        })}
        ${this._importDialog({
          id: "sidebar-modal", title: t.sidebar_import_title, ext: ".json",
          hint: t.sidebar_import_hint, file: "sidebar-file", accept: json, text: "sidebar-text",
          cancel: "sidebar-import-cancel", ok: "sidebar-import-ok",
          placeholder: '{ "sidebar": { "layout": { "columns": 2 }, "appearance": { ... } } }',
        })}
        ${this._importDialog({
          id: "import-modal", title: t.import_title, ext: ".json",
          hint: t.import_hint, file: "import-file", accept: json, text: "import-text",
          cancel: "import-cancel", ok: "import-ok",
          placeholder: '{ "layout": { ... }, "appearance": { ... } }',
        })}
        <div class="modal" id="add-modal" hidden>
          <div class="modal-card" role="dialog" aria-modal="true">
            <h2 id="add-modal-title">${escapeHtml(t.add_title)}</h2>
            <div id="add-heading-part">
              <h3 class="add-title">${escapeHtml(t.add_heading_title)}</h3>
              <p class="hint">${escapeHtml(t.add_heading_hint)}</p>
              <button class="flat" id="add-heading-ok">${escapeHtml(t.add_heading_button)}</button>
              <h3 class="add-title">${escapeHtml(t.add_link_title)}</h3>
            </div>
            <p class="hint" id="add-link-hint">${escapeHtml(t.add_link_hint)}</p>
            <div class="field add-link-kind" id="add-link-kind-field" hidden>
              <span class="cap">${escapeHtml(t.add_link_kind)}</span>
              <div class="seg inline" id="add-link-kind">
                <button type="button" data-alk="page">${escapeHtml(t.add_link_kind_page)}</button>
                <button type="button" data-alk="entity">${escapeHtml(t.add_link_kind_entity)}</button>
              </div>
            </div>
            <div id="add-link-entity-part" hidden>
              <label class="field">
                <span>${escapeHtml(t.add_link_entity)}</span>
                <input type="text" id="add-link-entity" list="add-entity-list" spellcheck="false" autocomplete="off" placeholder="sensor.aussentemperatur" />
              </label>
              <datalist id="add-entity-list"></datalist>
              <small class="field-hint">${escapeHtml(t.add_link_entity_hint)}</small>
            </div>
            <div id="add-link-page-part">
            <label class="field">
              <span>${escapeHtml(t.add_link_page)}</span>
              <select id="add-link-select">
                ${LINK_GROUPS.map(
                  (group) => `<optgroup label="${escapeHtml(this._de ? group.de : group.en)}">${group.links
                    .map(
                      (link) =>
                        `<option value="${escapeHtml(link[0])}">${escapeHtml(
                          this._de ? link[2] : link[3]
                        )} – ${escapeHtml(link[0])}</option>`
                    )
                    .join("")}</optgroup>`
                ).join("")}
                <option value="">${escapeHtml(t.add_link_custom)}</option>
              </select>
            </label>
            <label class="field" id="add-link-custom" hidden>
              <span>${escapeHtml(t.add_link_path)}</span>
              <input type="text" id="add-link-path" spellcheck="false" placeholder="/config/tools/state" />
            </label>
            </div>
            <p class="modal-error warn" hidden></p>
            <div class="add-actions">
              <button class="primary" id="add-link-ok">${escapeHtml(t.add_link_button)}</button>
            </div>
            <div id="add-popup-part">
              <h3 class="add-title">${escapeHtml(t.add_popup_title)}</h3>
              <p class="hint">${escapeHtml(t.add_popup_hint)}</p>
              <p class="hint add-popup-use">${glyph("mdi:gesture-tap", "&#9757;")}<span>${escapeHtml(t.popup_use_hint)}</span></p>
              <label class="field">
                <span>${escapeHtml(t.add_popup_name)}</span>
                <input type="text" id="add-popup-name" maxlength="60" placeholder="${escapeHtml(t.popup)}" />
              </label>
              <div class="field add-popup-kind">
                <span class="cap">${escapeHtml(t.popup_content)}</span>
                <div class="seg inline" id="add-popup-kind">
                  <button type="button" data-apc="links">${escapeHtml(t.popup_content_links)}</button>
                  <button type="button" data-apc="card">${escapeHtml(t.popup_content_card)}</button>
                </div>
              </div>
              <div id="add-popup-links">
                <label class="field">
                  <span>${escapeHtml(t.add_link_page)}</span>
                  <select id="add-popup-select"></select>
                </label>
                <label class="field" id="add-popup-custom" hidden>
                  <span>${escapeHtml(t.add_link_path)}</span>
                  <input type="text" id="add-popup-path" spellcheck="false" placeholder="/config/tools/state" />
                </label>
                <div class="add-actions">
                  <button class="flat" id="add-popup-pick">${glyph("mdi:plus", "+")}${escapeHtml(t.add_popup_pick)}</button>
                </div>
                <ul class="add-popup-list" id="add-popup-list"></ul>
              </div>
              <p class="hint" id="add-popup-card-hint" hidden>${escapeHtml(t.add_popup_card_hint)}</p>
              <p class="warn add-popup-error" id="add-popup-error" hidden></p>
              <div class="add-actions">
                <button class="primary" id="add-popup-ok">${escapeHtml(t.add_popup_button)}</button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="flat" id="add-cancel">${escapeHtml(t.close)}</button>
            </div>
          </div>
        </div>
        <div class="modal" id="palette-modal" hidden>
          <div class="modal-card wide" role="dialog" aria-modal="true">
            <h2>${escapeHtml(t.palette_title)}</h2>
            <p class="hint">${escapeHtml(t.palette_hint)}</p>
            <span class="cap">${escapeHtml(t.palette_main)}</span>
            <div class="pal-row" style="margin-top:6px">
              <input type="color" id="palette-color" value="#03a9f4" />
              <input type="text" id="palette-hex" value="#03a9f4" maxlength="7" spellcheck="false" />
            </div>
            ${this._segSelect(
              `<select id="palette-tint">
                <option value="neutral">${escapeHtml(t.palette_tint_neutral)}</option>
                <option value="tint" selected>${escapeHtml(t.palette_tint_tint)}</option>
                <option value="strong">${escapeHtml(t.palette_tint_strong)}</option>
              </select>`,
              t.palette_tint
            )}
            ${this._segSelect(
              `<select id="palette-accent">
                <option value="same">${escapeHtml(t.palette_accent_same)}</option>
                <option value="analogous">${escapeHtml(t.palette_accent_analogous)}</option>
                <option value="complementary">${escapeHtml(t.palette_accent_complementary)}</option>
                <option value="triad">${escapeHtml(t.palette_accent_triad)}</option>
              </select>`,
              t.palette_accent,
              "grid2"
            )}
            <div class="palette-rows" id="palette-swatches"></div>
            <p class="palette-error warn" id="palette-error" hidden></p>
            <div class="modal-actions">
              <button class="flat" id="palette-cancel">${escapeHtml(t.cancel)}</button>
              <button class="primary" id="palette-apply">${escapeHtml(t.palette_apply)}</button>
            </div>
          </div>
        </div>
        <div class="modal" id="presets-modal" hidden>
          <div class="modal-card wide" role="dialog" aria-modal="true">
            <h2>${escapeHtml(t.theme_presets)}</h2>
            <p class="hint">${escapeHtml(t.theme_presets_hint)}</p>
            <div class="presets">${themeTiles}</div>
            <p class="preset-confirm">${escapeHtml(t.theme_preset_confirm)}</p>
            <div class="modal-actions">
              <button class="flat" id="presets-cancel">${escapeHtml(t.cancel)}</button>
              <button class="primary" id="preset-apply" disabled>${escapeHtml(t.preset_apply)}</button>
            </div>
          </div>
        </div>
        <div class="modal" id="hpresets-modal" hidden>
          <div class="modal-card xwide" role="dialog" aria-modal="true">
            <h2><span>${escapeHtml(t.theme_presets)}</span><small class="h2-sub">${escapeHtml(t.tab_header)}</small></h2>
            <p class="hint">${escapeHtml(t.header_presets_hint)}</p>
            <div class="presets three">${headerTiles}</div>
            <p class="preset-confirm">${escapeHtml(t.header_preset_confirm)}</p>
            <div class="modal-actions">
              <button class="flat" id="hpresets-cancel">${escapeHtml(t.cancel)}</button>
              <button class="primary" id="hpreset-apply" disabled>${escapeHtml(t.preset_apply)}</button>
            </div>
          </div>
        </div>`;
    }

    /**
     * Segmentierte Auswahl. Der Wert steht weiter in einem (versteckten)
     * <select>: Knopf gedrueckt heisst, das <select> bekommt den Wert und
     * ein change-Ereignis - die vorhandene Logik merkt keinen Unterschied.
     */
    _segSelect(selectHtml, label, extraClass, attrs) {
      const options = [];
      selectHtml.replace(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g, (all, value, text) => {
        options.push([value, text]);
        return all;
      });
      return `
        <div class="seg-field"${attrs || ""}>
          ${label ? `<span class="cap">${escapeHtml(label)}</span>` : ""}
          <div class="seg${extraClass ? ` ${extraClass}` : ""}" data-seg>
            ${options.map((o) => `<button type="button" data-value="${o[0]}">${o[1]}</button>`).join("")}
          </div>
          <span hidden>${selectHtml}</span>
        </div>`;
    }

    /** Ein segmentiertes Feld, an einen Pfad der Konfiguration gebunden. */
    _seg(key, labelText, options, hint, attrs) {
      const opts = options
        .map((option) => `<option value="${escapeHtml(option[0])}">${escapeHtml(option[1])}</option>`)
        .join("");
      return (
        this._segSelect(`<select data-bind="${key}">${opts}</select>`, labelText, "", attrs) +
        (hint ? `<small class="field-hint">${escapeHtml(hint)}</small>` : "")
      );
    }

    /** Ein Schieberegler mit Zahl daneben (Deckkraft, Weichzeichner, Radius). */
    _range(key, labelText, min, max, unit, showWhen) {
      return `
        <label class="range"${showWhen ? ` data-show-when="${showWhen}"` : ""}>
          <span class="cap">${escapeHtml(labelText)}<output data-out-for="${key}"></output></span>
          <input type="range" min="${min}" max="${max}" step="1" data-bind="${key}" data-unit="${unit || ""}" />
        </label>`;
    }

    /**
     * Eine Gruppe zum Auf- und Zuklappen mit Zaehler der geaenderten Werte.
     * o: { open, sec: [Gruppe, id], zone, label }
     */
    _grp(id, title, body, o) {
      const opts = o || {};
      if (!(id in this._grpOpen)) {
        // Was man selbst auf- oder zugeklappt hat, merkt sich der Browser.
        this._grpOpen[id] = id in this._grpUser ? !!this._grpUser[id] : !!opts.open;
      }
      const sec = opts.sec
        ? ` data-sec-group="${opts.sec[0]}" data-sec="${escapeHtml(String(opts.sec[1]))}" data-sec-label="${escapeHtml(title)}"`
        : "";
      return `
        <section class="grp" data-grp="${escapeHtml(id)}"${this._grpOpen[id] ? " data-open" : ""}${sec}${
          opts.zone !== undefined ? ` data-zone="${escapeHtml(opts.zone)}"` : ""
        }>
          <button type="button" class="grp-head" aria-expanded="${this._grpOpen[id] ? "true" : "false"}">
            <span class="chev"></span><span class="grp-title">${escapeHtml(title)}</span>
            <span class="grp-count" data-grp-count></span>
          </button>
          <div class="grp-body">${body}</div>
        </section>`;
    }

    /** Der Schalter "Vorher" unter jedem Vorschaubild. */
    _beforeCheck(id) {
      return `
        <label class="before-check">
          <span>${escapeHtml(this._t.preview_before)}</span>
          <input type="checkbox" class="before-toggle"${id ? ` id="${id}"` : ""} />
        </label>`;
    }

    /**
     * Die linke Seite einer Seite: Ueberschrift, Vorschaubild, darunter die
     * Umschalter. stage: das nachgebaute Home Assistant.
     */
    _stageCol(title, hint, stage, footLeft, footNote, beforeId) {
      // Der Weg zur Seite Sidebar steht seit 1.4.9 im Vorschaubild selbst
      // (Theme, Header), auf HA-Settings genuegt ein Klick in die Seitenleiste.
      return `
        <div class="stage-col">
          <div class="stage-head">
            <h1 class="stage-title">${escapeHtml(title)}</h1>
            ${hint ? `<span class="stage-hint" data-stage-hint>${escapeHtml(hint)}</span>` : ""}
          </div>
          <div class="stage-frame">${stage}</div>
          <div class="stage-foot">
            ${footLeft || ""}
            ${footNote ? `<span class="stage-note">${escapeHtml(footNote)}</span>` : ""}
            <span class="grow"></span>
            ${this._beforeCheck(beforeId)}
          </div>
        </div>`;
    }

    /** Kleiner Schalter: Gruppen als Akkordeon (eine offen) oder einzeln. */
    _accordionBtn(which) {
      const t = this._t;
      const on = this._accordion;
      return `<button type="button" class="icon-btn acc-btn" data-accordion${which ? ` data-acc-for="${which}"` : ""}${on ? " data-active" : ""}
        aria-pressed="${on ? "true" : "false"}" title="${escapeHtml(on ? t.accordion_on : t.accordion_off)}"
        aria-label="${escapeHtml(t.accordion_label)}">${glyph(on ? "mdi:unfold-less-horizontal" : "mdi:unfold-more-horizontal", on ? "&#8661;" : "&#8693;")}</button>`;
    }

    /** Die rechte Spalte mit den Feldern. */
    _fieldsCol(head, body, foot, attrs) {
      return `
        <aside class="fields"${attrs || ""}>
          <div class="fields-head">${head}</div>
          <div class="fields-body">${body}</div>
          ${foot ? `<div class="fields-foot">${foot}</div>` : ""}
        </aside>`;
    }

    /** Kopf der Feldspalte der Seitenleiste: Titel und die drei Unterseiten. */
    _sidebarHead(withAccordion) {
      const t = this._t;
      const sub = (tab, label) =>
        `<button type="button" data-tab="${tab}"><span>${escapeHtml(label)}</span><span class="dot" data-dot="${tab}" hidden></span></button>`;
      return `
        <h2 class="fields-title">${escapeHtml(t.tab_sidebar)}</h2>
        ${withAccordion ? this._accordionBtn("look") : ""}
        <div class="seg subtabs">
          ${sub("layout", t.tab_layout)}
          ${sub("items", t.tab_items)}
          ${sub("look", t.tab_look)}
        </div>`;
    }

    /**
     * Das nachgebaute Home Assistant mit der Seitenleiste. Die Seitenleiste
     * selbst zeichnet _renderSidebarPreview() in .sbp-host.
     * goto: Seitenleiste fuehrt auf die Seite Sidebar (Header, Theme).
     */
    _sidebarZone(goto) {
      return `
        <div class="hm-side"${goto ? ' data-goto-zone="sidebar"' : ""}>
          <div class="sbp-host"></div>
        </div>`;
    }

    /** Die Dashboard-Flaeche neben der Seitenleiste (nur angedeutet). */
    _dashSketch() {
      const t = this._t;
      return `
        <div class="hm-main hm-sketch">
          <div class="hm-bar hm-dim" data-goto-zone="header" title="${escapeHtml(t.goto_header)}">
            <strong>${escapeHtml(t.stage_home)}</strong><span>${escapeHtml(t.header_view_one)}</span><span>${escapeHtml(t.header_view_two)}</span>
            <span class="grow"></span>
            <button type="button" class="goto" data-goto="header">${escapeHtml(t.goto_header)} &#8599;</button>
          </div>
          <div class="hpv-body hm-sketch-cards" data-goto-zone="theme" title="${escapeHtml(t.goto_theme_cards)}">
            <div class="hpv-card"><b>${escapeHtml(t.ts_light)}</b><i></i><i class="short"></i></div>
            <div class="hpv-card"><b>${escapeHtml(t.ts_climate)}</b><i></i></div>
            <div class="hpv-card"><b>${escapeHtml(t.ts_energy)}</b><i class="block"></i></div>
            <div class="hpv-card wide"><b>${escapeHtml(t.ts_history)}</b><i class="block tall"></i></div>
            <div class="hpv-card"><b>${escapeHtml(t.ts_media)}</b><i></i><i class="short"></i></div>
          </div>
          <button type="button" class="goto hpv-goto" data-goto="theme">${escapeHtml(t.goto_theme_cards)} &#8599;</button>
        </div>`;
    }

    /** Buehne der Seitenleiste (Layout, Eintraege, Aussehen). */
    _sidebarStage(tab) {
      const t = this._t;
      const hints = { layout: t.stage_sidebar_hint_layout, items: t.stage_sidebar_hint_items, look: t.stage_sidebar_hint_look };
      return this._stageCol(
        t.stage_sidebar_title,
        hints[tab],
        `<div class="stage ha-mock" data-stage="sidebar" data-theme-vars>${this._sidebarZone(false)}${this._dashSketch()}</div>`,
        `<div class="seg inline" data-sbp-state>
          <button type="button" data-value="open">${escapeHtml(t.sbp_open)}</button>
          <button type="button" data-value="closed">${escapeHtml(t.sbp_closed)}</button>
        </div>`
      );
    }

    /** Die Abschnitte der Seite "Aussehen": [id, Titel, Markierung in der Vorschau, Inhalt]. */
    _lookSections() {
      const t = this._t;
      const num = (key, label, max, min) =>
        this._field(key, label, "number", `min="${min || 0}" max="${max}"`);
      return [
        ["colors", t.section_colors, "all", `
          <div class="stack">
            ${this._color("appearance.background", t.background)}
            ${this._color("appearance.header_background", t.header_background)}
            ${this._color("appearance.border_color", t.border_color)}
            ${num("appearance.border_width", t.border_width, 20)}
          </div>
          ${this._check("appearance.background_gradient", t.background_gradient)}
          <div class="stack sub" data-show-when="appearance.background_gradient">
            ${this._color("appearance.background_color2", t.background_color2)}
            ${this._select("appearance.gradient_direction", t.gradient_direction, this._directions(false))}
          </div>`],
        ["text", t.section_text, "items", `
          <div class="stack">
            ${this._color("appearance.text_color", t.text_color)}
            ${this._color("appearance.text_color_selected", t.text_color_selected)}
            ${this._color("appearance.icon_color", t.icon_color)}
            ${this._color("appearance.icon_color_selected", t.icon_color_selected)}
            ${num("appearance.icon_size", t.icon_size, 96, 8)}
          </div>
          ${this._check("appearance.hide_labels_collapsed", t.hide_labels_collapsed)}
          <div class="grid2">
            ${num("appearance.font_size", t.font_size, 40, 6)}
            ${this._select("appearance.font_weight", t.font_weight, [
              ["300", "300"], ["400", "400"], ["500", "500"], ["600", "600"], ["700", "700"],
            ])}
          </div>
          <div class="stack" style="margin-top:14px">
            ${this._select("appearance.font_family", t.font_family, FONTS(t))}
          </div>`],
        ["items", t.section_items, "items", `
          <div class="stack">
            ${this._color("appearance.item_background", t.item_background)}
            ${this._color("appearance.item_background_selected", t.item_background_selected)}
            ${this._color("appearance.item_border_color", t.item_border_color)}
          </div>
          <div class="grid2" style="margin-top:14px">
            ${this._field("appearance.item_border_width", t.item_border_width, "number", 'min="0" max="20"', "appearance.item_border_split")}
            ${this._field("appearance.item_radius", t.item_radius, "number", 'min="0" max="60"', "appearance.item_radius_split")}
          </div>
          ${this._check("appearance.item_border_split", t.item_border_split)}
          <div class="grid sub four" data-show-when="appearance.item_border_split">
            ${num("appearance.item_border_top", t.side_top, 20)}
            ${num("appearance.item_border_right", t.side_right, 20)}
            ${num("appearance.item_border_bottom", t.side_bottom, 20)}
            ${num("appearance.item_border_left", t.side_left, 20)}
          </div>
          ${this._check("appearance.item_radius_split", t.item_radius_split)}
          <div class="grid sub four" data-show-when="appearance.item_radius_split">
            ${num("appearance.item_radius_tl", t.corner_tl, 60)}
            ${num("appearance.item_radius_tr", t.corner_tr, 60)}
            ${num("appearance.item_radius_br", t.corner_br, 60)}
            ${num("appearance.item_radius_bl", t.corner_bl, 60)}
          </div>`],
        ["hover", t.section_hover, "hover", `
          <div class="stack">
            ${this._color("appearance.hover_background", t.hover_background)}
            ${this._color("appearance.hover_text_color", t.hover_text_color)}
            ${this._color("appearance.hover_icon_color", t.hover_icon_color)}
          </div>
          <div style="margin-top:14px">${this._range("appearance.hover_opacity", t.hover_opacity, 0, 100, "%")}</div>`],
        ["badge", t.section_badge, "badge", `
          <div class="stack">
            ${this._color("appearance.badge_background", t.badge_background)}
            ${this._color("appearance.badge_color", t.badge_color)}
          </div>`],
        ["head", t.section_header, "head", `
          <div class="stack">
            ${this._field("appearance.title", t.sidebar_title, "text", `placeholder="${escapeHtml(t.sidebar_title_placeholder)}"`)}
            ${this._color("appearance.title_color", t.title_color)}
          </div>
          ${this._check("appearance.hide_title", t.hide_title)}
          ${this._check("appearance.hide_toggle", t.hide_toggle)}`],
        ["notifications", t.section_notifications, "notifications", `
          ${this._check("appearance.style_notifications", t.style_notifications, t.style_notifications_hint)}
          <div class="stack sub" data-show-when="appearance.style_notifications">
            ${this._color("appearance.notif_text_color", t.notif_text_color)}
            ${this._color("appearance.notif_header_color", t.notif_header_color)}
          </div>`],
        ["css", t.custom_css, "", `
          <p class="hint">${escapeHtml(t.custom_css_hint)}</p>
          <textarea data-bind="appearance.custom_css" spellcheck="false"
            placeholder="${escapeHtml(cssExample(t))}"></textarea>`],
      ];
    }

    _directions(themeStyle) {
      const t = this._t;
      return [
        [themeStyle ? "" : "to bottom", t.dir_bottom],
        ["to top", t.dir_top],
        ["to right", t.dir_right],
        ["to left", t.dir_left],
        ["to bottom right", t.dir_br],
        ["to bottom left", t.dir_bl],
        ["to top right", t.dir_tr],
        ["to top left", t.dir_tl],
        ["radial", t.dir_radial],
      ];
    }

    /**
     * Schatten-Baukasten unter einem box-shadow-Feld: Vorlagen und Regler.
     * Er hat keine eigene Bindung - er schreibt in das Feld (path), und
     * _syncShadowBoxes liest das Feld zurueck in die Regler.
     */
    _shadowBox(path) {
      const t = this._t;
      const range = (part, label, min, max, unit) => `
        <label class="range">
          <span class="cap">${escapeHtml(label)}<output data-sh-out="${part}" data-unit="${unit}"></output></span>
          <input type="range" min="${min}" max="${max}" step="1" data-sh-part="${part}" />
        </label>`;
      return `
        <div class="sub-box shadow-box" data-shadow-for="${path}"${this._shadowOpen() ? " data-open" : ""}>
          <label class="check">
            <input type="checkbox" data-shadow-toggle${this._shadowOpen() ? " checked" : ""} />
            <span>${escapeHtml(t.shadow_title)}</span>
          </label>
          <div class="shadow-body">
          <div class="shadow-head">
            <p class="hint">${escapeHtml(t.shadow_hint)}</p>
            <span class="shadow-demo" aria-hidden="true"></span>
          </div>
          <div class="shadow-presets">${SHADOW_PRESETS.map(([id, value]) =>
            `<button type="button" class="chip" data-shadow-preset="${escapeHtml(value)}">${escapeHtml(t[`shadow_p_${id}`])}</button>`).join("")}</div>
          <p class="hint shadow-note" hidden></p>
          <div class="shadow-controls">
            <label class="field">
              <span>${escapeHtml(t.shadow_dir)}</span>
              <select data-sh-part="dir">${SHADOW_DIRS.map(([id]) =>
                `<option value="${id}">${escapeHtml(t[`shadow_d_${id}`])}</option>`).join("")}</select>
            </label>
            <div class="grid2">
              ${range("dist", t.shadow_dist, 0, 40, "px")}
              ${range("blur", t.shadow_blur, 0, 80, "px")}
              ${range("spread", t.shadow_spread, -20, 30, "px")}
              ${range("opacity", t.shadow_opacity, 0, 100, "%")}
            </div>
            <div class="grid2 shadow-last">
              <label class="field">
                <span>${escapeHtml(t.shadow_color)}</span>
                <input type="color" data-sh-part="hex" />
              </label>
              <label class="check">
                <input type="checkbox" data-sh-part="inset" />
                <span>${escapeHtml(t.shadow_inset)}</span>
              </label>
            </div>
          </div>
          </div>
        </div>`;
    }

    /** Schatten-Baukasten auf- oder zugeklappt (wie die Gruppen im Browser gemerkt). */
    _shadowOpen() {
      return !!(this._grpUser && this._grpUser["shadow:designer"]);
    }

    _setShadowOpen(open) {
      this._grpUser["shadow:designer"] = !!open;
      writeGroups(this._grpUser);
      this.shadowRoot.querySelectorAll(".shadow-box").forEach((box) => {
        box.toggleAttribute("data-open", !!open);
        const toggle = box.querySelector("[data-shadow-toggle]");
        if (toggle) {
          toggle.checked = !!open;
        }
      });
    }

    /** Die Regler eines Schatten-Baukastens in einen box-shadow fassen. */
    _shadowFromControls(box) {
      const get = (part) => box.querySelector(`[data-sh-part="${part}"]`);
      const value = composeShadow({
        dir: get("dir").value,
        dist: Number(get("dist").value) || 0,
        blur: Number(get("blur").value) || 0,
        spread: Number(get("spread").value) || 0,
        opacity: Number(get("opacity").value),
        hex: get("hex").value,
        inset: get("inset").checked,
      });
      this._setShadow(box, value);
    }

    /** Einen Schatten ins Feld schreiben - wie eine Eingabe von Hand. */
    _setShadow(box, value) {
      const path = box.dataset.shadowFor;
      const input = this.shadowRoot.querySelector(`[data-bind="${CSS.escape(path)}"]`);
      if (input) {
        input.value = value;
      }
      this._writePath(path, value);
      this._shadowEditing = box;
      this._touch();
      this._shadowEditing = null;
    }

    /**
     * Den Wert jedes Schatten-Felds in seine Regler lesen. Der Baukasten,
     * an dem gerade geschoben wird, bleibt, wie er ist (Rundungen).
     */
    _syncShadowBoxes() {
      const root = this.shadowRoot;
      if (!root) {
        return;
      }
      const t = this._t;
      root.querySelectorAll(".shadow-box[data-shadow-for]").forEach((box) => {
        const raw = this._readPath(box.dataset.shadowFor);
        const demo = box.querySelector(".shadow-demo");
        if (demo) {
          demo.style.boxShadow = raw && String(raw).trim() ? String(raw) : "";
        }
        box.querySelectorAll("[data-shadow-preset]").forEach((chip) => {
          chip.toggleAttribute("data-active", String(raw || "").replace(/\s+/g, " ").trim() === chip.dataset.shadowPreset);
        });
        const parsed = parseShadow(raw);
        const note = box.querySelector(".shadow-note");
        if (note) {
          note.hidden = !parsed.custom;
          note.textContent = parsed.custom ? t.shadow_custom : "";
        }
        if (box === this._shadowEditing) {
          this._shadowOutputs(box);
          return;
        }
        const o = parsed.dir
          ? parsed
          : { dir: "down", dist: 2, blur: 8, spread: 0, hex: "#000000", opacity: parsed.none ? 0 : 16, inset: false };
        const get = (part) => box.querySelector(`[data-sh-part="${part}"]`);
        get("dir").value = o.dir;
        get("dist").value = String(o.dist);
        get("blur").value = String(o.blur);
        get("spread").value = String(o.spread);
        get("opacity").value = String(o.opacity);
        get("hex").value = o.hex;
        get("inset").checked = !!o.inset;
        this._shadowOutputs(box);
      });
    }

    _shadowOutputs(box) {
      box.querySelectorAll("output[data-sh-out]").forEach((out) => {
        const input = box.querySelector(`[data-sh-part="${out.dataset.shOut}"]`);
        out.textContent = input ? `${input.value} ${out.dataset.unit}` : "";
      });
    }

    /** Die Skala unter der Primaerfarbe (Theme-Seite) neu zeichnen. */
    _updatePrimaryScales() {
      const root = this.shadowRoot;
      if (!root) {
        return;
      }
      root.querySelectorAll(".primary-scale[data-scale-for]").forEach((box) => {
        const palette = primaryPalette(this._readPath(box.dataset.scaleFor));
        const has = Object.keys(palette).length > 0;
        box.toggleAttribute("data-empty", !has);
        box.querySelectorAll("[data-step]").forEach((chip) => {
          const key = `ha-color-primary-${String(chip.dataset.step).padStart(2, "0")}`;
          chip.style.background = has ? palette[key] : "";
          chip.title = has ? `--${key}: ${palette[key]}` : "";
        });
      });
    }

    /**
     * Das Vorschaubild der Theme-Seite: alle faerbbaren Elemente. Jedes
     * Element (data-spot) oeffnet rechts seine Gruppen (THEME_SPOTS). Die
     * Werte kommen als Variablen aus _updatePreview().
     */
    _themeStage() {
      const t = this._t;
      const icon = (name, fallback) => glyph(name, fallback);
      // Einzelne Elemente anklickbar (1.5.0): data-ctl mit Name als Tooltip
      const ctl = (key, title) => ` data-ctl="${escapeHtml(key)}"${title === false ? "" : ` title="${escapeHtml(title || this._ctlLabel(key))}"`}`;
      const STATE_VARS = {
        light: "state-light-active-color", switch: "state-switch-active-color", fan: "state-fan-active-color",
        media: "state-media_player-active-color", cover: "state-cover-active-color", person: "state-person-home-color",
        heat: "state-climate-heat-color", cool: "state-climate-cool-color", locked: "state-lock-locked-color",
        unlocked: "state-lock-unlocked-color", armed: "state-alarm_control_panel-armed_home-color",
        triggered: "state-alarm_control_panel-triggered-color",
      };
      const stateVar = (key) => STATE_VARS[key] || `state-weather-${key.replace(/^w-/, "")}-color`;
      return `
        <div class="stage ha-mock theme-stage" id="theme-preview" data-stage="theme" data-theme-vars>
          ${this._sidebarZone(true)}
          <div class="hm-main">
            <div class="hm-bar pv-header" data-goto-zone="header">
              <strong>${escapeHtml(t.stage_home)}</strong>
              <span class="hm-tab" data-on>${escapeHtml(t.header_view_one)}</span>
              <span class="hm-tab">${escapeHtml(t.header_view_two)}</span>
              <span class="hm-tab">${escapeHtml(t.header_view_three)}</span>
              <span class="grow"></span>
              <button type="button" class="goto" data-goto="header">${escapeHtml(t.goto_header)} &#8599;</button>
            </div>
            <div class="ts-dash" data-spot="dash">
              <div class="ts-grid">
                <div class="pv-card ts-card" data-spot="cards">
                  <div class="pv-card-head"${ctl("card_head")}>${escapeHtml(t.ts_light)}</div>
                  <div class="pv-row">
                    <span class="pv-ico" data-on${ctl("icon_on")}>${icon("mdi:floor-lamp", "&#9788;")}</span>
                    <span class="pv-name"${ctl("v:primary-text-color")}>${escapeHtml(t.ts_lamp)}</span>
                    <span class="ts-toggle" data-on${ctl("switch_on")}><i></i></span>
                  </div>
                  <div class="pv-row">
                    <span class="pv-ico" data-off${ctl("icon_off")}>${icon("mdi:ceiling-light", "&#9788;")}</span>
                    <span class="pv-name"${ctl("v:primary-text-color")}>${escapeHtml(t.ts_ceiling)}</span>
                    <span class="ts-toggle"${ctl("switch_off")}><i></i></span>
                  </div>
                </div>
                <div class="ts-stack">
                <div class="pv-card ts-card" data-spot="sliders">
                  <div class="pv-card-head ts-head-row"><span${ctl("card_head")}>${escapeHtml(t.ts_sliders)}</span><span class="pv-badge"${ctl("badge")}>3</span></div>
                  <div class="ts-line"><span>${escapeHtml(t.preview_brightness)}</span><span class="mono">70 %</span></div>
                  <span class="pv-track"${ctl("slider")}><i style="width:70%"></i></span>
                  <div class="ts-chips"><span class="pv-chip"${ctl("v:chip-background-color")}>21,5 °C</span><span class="pv-chip"${ctl("v:chip-background-color")}>48 %</span></div>
                </div>
                <div class="pv-card ts-card ts-design" data-spot="design">
                  <div class="pv-card-head">${escapeHtml(t.ts_design)}</div>
                  <div class="ts-s">${escapeHtml(t.ts_design_sub)}</div>
                </div>
                </div>
                <div class="pv-card ts-card" data-spot="states">
                  <div class="pv-card-head">${escapeHtml(t.ts_states)}</div>
${[
                    ["devices", t.ts_devices, [["light", "mdi:lightbulb", t.preview_state_light], ["switch", "mdi:toggle-switch", t.preview_state_switch],
                      ["fan", "mdi:fan", t.preview_state_fan], ["media", "mdi:play-circle", t.preview_state_media],
                      ["cover", "mdi:blinds", t.preview_state_cover], ["person", "mdi:account", t.preview_state_person]]],
                    ["climate", t.ts_climate, [["heat", "mdi:fire", t.preview_state_heat], ["cool", "mdi:snowflake", t.preview_state_cool]]],
                    ["security", t.ts_security, [["locked", "mdi:lock", t.preview_state_locked], ["unlocked", "mdi:lock-open", t.preview_state_unlocked],
                      ["armed", "mdi:shield-home", t.preview_state_armed], ["triggered", "mdi:shield-alert", t.preview_state_triggered]]],
                    ["weather", t.ts_weather, [["w-sunny", "mdi:weather-sunny", t.ts_w_sunny], ["w-partlycloudy", "mdi:weather-partly-cloudy", t.ts_w_partly],
                      ["w-cloudy", "mdi:weather-cloudy", t.ts_w_cloudy], ["w-rainy", "mdi:weather-rainy", t.ts_w_rainy],
                      ["w-lightning", "mdi:weather-lightning", t.ts_w_lightning],
                      ["w-snowy", "mdi:weather-snowy", t.ts_w_snowy], ["w-clear_night", "mdi:weather-night", t.ts_w_night]]],
                  ].map((row) => `
                  <div class="ts-st" data-spot="${row[0]}"><span>${escapeHtml(row[1])}</span>${row[2]
                    .map((one) => `<b class="pv-st" data-s="${one[0]}" title="${escapeHtml(one[2])}"${ctl(`v:${stateVar(one[0])}`, false)}>${icon(one[1], "&#9679;")}</b>`)
                    .join("")}</div>`).join("")}
                </div>
                <div class="pv-card ts-card ts-wide" data-spot="table">
                  <div class="pv-card-head">${escapeHtml(t.ts_table)}</div>
                  <div class="pv-table">
                    <div class="pv-tr ts-th"${ctl("table_head")}><span>${escapeHtml(t.name)}</span><span>${escapeHtml(t.settings_table_col_area)}</span><span>${escapeHtml(t.ts_state)}</span></div>
                    <div class="pv-tr"${ctl("v:table-row-background-color")}><span>${escapeHtml(t.ts_lamp)}</span><span>${escapeHtml(t.header_view_one)}</span><span>${escapeHtml(t.ts_on)}</span></div>
                    <div class="pv-tr" data-alt${ctl("v:table-row-alternative-background-color")}><span>${escapeHtml(t.ts_heating)}</span><span>${escapeHtml(t.header_view_two)}</span><span>21,5 °C</span></div>
                    <div class="pv-tr"${ctl("v:table-row-background-color")}><span>${escapeHtml(t.ts_door)}</span><span>${escapeHtml(t.ts_hall)}</span><span>${escapeHtml(t.ts_locked_state)}</span></div>
                  </div>
                </div>
                <div class="pv-card ts-card" data-spot="inputs">
                  <div class="pv-card-head">${escapeHtml(t.ts_inputs)}</div>
                  <div class="pv-input ts-in"${ctl("input_text")}><small>${escapeHtml(t.name)}</small><span>${escapeHtml(t.preview_living)}</span></div>
                  <div class="pv-input ts-sel"${ctl("input_select")}><span>${escapeHtml(t.ts_pick_area)}</span>${icon("mdi:chevron-down", "&#8964;")}</div>
                </div>
                <div class="pv-card ts-card" data-spot="status">
                  <div class="pv-card-head">${escapeHtml(t.ts_status)}</div>
                  <div class="ts-status">
                    <b data-k="error"${ctl("v:error-color")}>${escapeHtml(t.ts_error)}</b><b data-k="warning"${ctl("v:warning-color")}>${escapeHtml(t.ts_warning)}</b>
                    <b data-k="success"${ctl("v:success-color")}>${escapeHtml(t.ts_success)}</b><b data-k="info"${ctl("v:info-color")}>${escapeHtml(t.ts_info)}</b>
                  </div>
                </div>
                <div class="pv-card ts-card" data-spot="dialog">
                  <div class="pv-card-head">${escapeHtml(t.ts_dialog)}</div>
                  <div class="pv-scrim"${ctl("scrim")}>
                    <div class="pv-dialog"${ctl("v:ha-dialog-surface-background")}>
                      <div class="pv-editor"${ctl("editor")}>
                        <span class="cm-comment"${ctl("v:codemirror-comment")}># ${escapeHtml(t.ts_code_comment)}</span>
                        <span><i class="cm-prop"${ctl("v:codemirror-property")}>alias</i><i class="cm-def"${ctl("v:codemirror-def")}>:</i> <i class="cm-str"${ctl("v:codemirror-string")}>"${escapeHtml(t.ts_light_on)}"</i></span>
                        <span><i class="cm-prop"${ctl("v:codemirror-property")}>brightness</i><i class="cm-def"${ctl("v:codemirror-def")}>:</i> <i class="cm-num"${ctl("v:codemirror-number")}>80</i></span>
                        <span><i class="cm-prop"${ctl("v:codemirror-property")}>enabled</i><i class="cm-def"${ctl("v:codemirror-def")}>:</i> <i class="cm-atom"${ctl("v:codemirror-atom")}>true</i></span>
                        <div class="pv-scroll"${ctl("v:scrollbar-thumb-color")}><i></i></div></div>
                      <div class="pv-dialog-actions">
                        <span class="pv-text-btn"${ctl("v:primary-color")}>${escapeHtml(t.cancel)}</span>
                        <span class="pv-text-btn"${ctl("v:primary-color")}>${escapeHtml(t.save)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pv-card ts-card" data-spot="text">
                  <div class="pv-card-head">${escapeHtml(t.ts_text)}</div>
                  <div class="ts-h"${ctl("heading")}>${escapeHtml(t.ts_heading)}</div>
                  <div class="ts-p"${ctl("body_text")}>${escapeHtml(t.ts_body)}</div>
                  <div class="ts-s"${ctl("v:secondary-text-color")}>${escapeHtml(t.ts_small)}</div>
                  <span class="ts-a"${ctl("v:primary-color")}>${escapeHtml(t.ts_link)}</span> <code class="pv-code"${ctl("v:markdown-code-background-color")}>23 °C</code>
                </div>
                ${this._themeStageMore()}
              </div>
            </div>
            <button type="button" class="goto stage-side-goto" data-goto="layout">&#8598; ${escapeHtml(t.goto_sidebar)}</button>
            <button type="button" class="goto ts-dash-tag" data-spot-tag="dash">${escapeHtml(t.ts_dash)}</button>
          </div>
        </div>`;
    }

    /**
     * Weitere Kacheln im Vorschaubild der Theme-Seite (1.4.8): Diagramm,
     * Energie und Bedienelemente. Die Farben kommen als CSS-Variablen aus
     * _updatePreview, wie bei den anderen Kacheln.
     */
    _themeStageMore() {
      const t = this._t;
      const icon = (name, fallback) => glyph(name, fallback);
      const ctl = (key, title) => ` data-ctl="${escapeHtml(key)}"${title === false ? "" : ` title="${escapeHtml(title || this._ctlLabel(key))}"`}`;
      const label = (group, key) => {
        const g = THEME_GROUPS.find((one) => one.en === group);
        const f = g && g.fields.find((one) => one[0] === key);
        return f ? (this._de ? f[1] : f[2]) : key;
      };
      // Fuenf Linien ueber 12 Punkte - feste Werte, nur zum Anschauen
      const series = [
        [52, 48, 55, 60, 58, 66, 70, 64, 62, 68, 74, 72],
        [30, 34, 31, 28, 35, 38, 36, 42, 40, 37, 41, 45],
        [70, 72, 69, 74, 80, 78, 82, 85, 81, 79, 84, 88],
        [12, 18, 22, 19, 15, 20, 26, 24, 21, 25, 28, 23],
        [44, 40, 38, 42, 46, 43, 39, 35, 37, 40, 36, 33],
      ];
      const path = (values) => values.map((v, i) => `${i ? "L" : "M"}${(i * 300 / 11).toFixed(1)} ${(96 - v).toFixed(1)}`).join(" ");
      const lines = series.map((values, i) =>
        `<path d="${path(values)}" style="stroke: var(--color-${i + 1})" />`).join("");
      const swatches = Array.from({ length: 54 }, (_, i) => `<i style="background: var(--color-${i + 1})"${ctl(`v:color-${i + 1}`)}></i>`).join("");
      // Energie: Verbrauch je Stunde (Netz, Solar, Batterie) und Einspeisung
      const hours = [[2, 0, 1, 0], [3, 0, 1, 0], [1, 2, 0, 1], [0, 4, 0, 2], [0, 5, 0, 3], [1, 3, 0, 1], [2, 1, 2, 0], [3, 0, 2, 0]];
      const bars = hours.map(([grid, solar, battery, back]) => `
                    <span class="te-col">
                      <span class="te-up">${battery ? `<i style="flex:${battery}; background: var(--energy-battery-out-color)"${ctl("v:energy-battery-out-color")}></i>` : ""}${solar ? `<i style="flex:${solar}; background: var(--energy-solar-color)"${ctl("v:energy-solar-color")}></i>` : ""}${grid ? `<i style="flex:${grid}; background: var(--energy-grid-consumption-color)"${ctl("v:energy-grid-consumption-color")}></i>` : ""}<b style="flex:${8 - grid - solar - battery}"></b></span>
                      <span class="te-down">${back ? `<i style="flex:${back}; background: var(--energy-grid-return-color)"${ctl("v:energy-grid-return-color")}></i>` : ""}<b style="flex:${4 - back}"></b></span>
                    </span>`).join("");
      const legend = ["energy-grid-consumption-color", "energy-solar-color", "energy-battery-out-color", "energy-battery-in-color",
        "energy-grid-return-color", "energy-non-fossil-color", "energy-gas-color", "energy-water-color"]
        .map((key) => `<span${ctl(`v:${key}`, label("Energy", key))}><i style="background: var(--${key})"></i>${escapeHtml(label("Energy", key))}</span>`).join("");
      return `
                <div class="pv-card ts-card ts-wide" data-spot="charts">
                  <div class="pv-card-head ts-head-row"><span>${escapeHtml(t.ts_charts)}</span><span class="ts-s">${escapeHtml(t.ts_charts_sub)}</span></div>
                  <svg class="ts-chart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"${ctl("chart_lines")}>
                    <path class="ts-grid-line" d="M0 25 H300 M0 50 H300 M0 75 H300" />${lines}
                  </svg>
                  <div class="ts-timeline"${ctl("timeline", t.ts_history_line)}>
                    <i style="flex:3; background: var(--state-active-color)"></i><i style="flex:1; background: var(--history-unknown-color)"></i><i style="flex:2; background: var(--state-inactive-color)"></i><i class="ts-unav" style="flex:1; background: var(--history-unavailable-color)"></i><i style="flex:3; background: var(--state-active-color)"></i>
                  </div>
                  <div class="ts-swatches">${swatches}</div>
                </div>
                <div class="pv-card ts-card" data-spot="energy">
                  <div class="pv-card-head ts-head-row"><span>${escapeHtml(t.ts_energy)}</span><span class="ts-s">kWh</span></div>
                  <div class="ts-energy">${bars}
                  </div>
                  <div class="ts-legend">${legend}</div>
                </div>
                <div class="pv-card ts-card ts-full" data-spot="controls">
                  <div class="pv-card-head ts-head-row"><span>${escapeHtml(t.ts_controls)}</span><span class="ts-s">${escapeHtml(t.ts_controls_sub)}</span></div>
                  <div class="tc-row">
                    <span class="tc-btn" data-v="primary-loud" data-ctl="btn_primary" title="${escapeHtml(t.ctl_btn_primary)}">${escapeHtml(t.save)}</span>
                    <span class="tc-btn" data-v="primary-quiet" data-ctl="btn_more" title="${escapeHtml(t.ctl_btn_more)}">${escapeHtml(t.ts_btn_more)}</span>
                    <span class="tc-btn" data-v="neutral-quiet" data-ctl="btn_cancel" title="${escapeHtml(t.ctl_btn_cancel)}">${escapeHtml(t.cancel)}</span>
                    <span class="tc-btn" data-v="danger-loud" data-ctl="btn_delete" title="${escapeHtml(t.ctl_btn_delete)}">${escapeHtml(t.ts_btn_delete)}</span>
                    <span class="tc-chip" data-v="success" data-ctl="chip_success" title="${escapeHtml(t.ctl_chip_success)}">${icon("mdi:check-circle", "&#10003;")}${escapeHtml(t.ts_success)}</span>
                    <span class="tc-chip" data-v="warning" data-ctl="chip_warning" title="${escapeHtml(t.ctl_chip_warning)}">${icon("mdi:alert", "!")}${escapeHtml(t.ts_warning)}</span>
                  </div>
                  <div class="tc-row">
                    <span class="tc-check" data-on data-ctl="check_on" title="${escapeHtml(t.ctl_check_on)}">${icon("mdi:check", "&#10003;")}</span>
                    <span class="tc-check" data-ctl="check_off" title="${escapeHtml(t.ctl_check_off)}"></span>
                    <span class="ts-toggle" data-on data-ctl="switch_on" title="${escapeHtml(t.ctl_switch_on)}"><i></i></span>
                    <span class="ts-toggle" data-ctl="switch_off" title="${escapeHtml(t.ctl_switch_off)}"><i></i></span>
                    <span class="tc-input" data-ctl="input" title="${escapeHtml(t.ctl_input)}"><small>${escapeHtml(t.name)}</small><span>${escapeHtml(t.preview_living)}</span></span>
                    <span class="tc-surface" data-ctl="surface" title="${escapeHtml(t.ctl_surface)}"><b>${escapeHtml(t.ts_surface)}</b><span>${escapeHtml(t.ts_small)}</span></span>
                  </div>
                </div>`;
    }

    /**
     * Header-Seite: die Theme-Variablen der Kopfzeile (--app-header-...).
     * Sie gehoeren zum Theme (Dunkel / Hell) und stehen trotzdem hier, wo
     * man sie sucht. Gleiche Felder und Umschalter wie auf der Theme-Seite.
     */
    _headerThemeGroup() {
      const t = this._t;
      return this._themeVarGroup("Header", "header:theme", t.hsec_theme, t.header_theme_hint, ["header", "theme"]);
    }

    /**
     * Eine Gruppe Theme-Variablen auf einer anderen Seite (Header,
     * Sidebar > Aussehen). Gleiche Felder und Dunkel/Hell-Umschalter wie auf
     * der Theme-Seite; die Werte bleiben Teil des Themes.
     */
    _themeVarGroup(name, id, title, hint, sec) {
      const t = this._t;
      const index = THEME_GROUPS.findIndex((group) => group.en === name);
      const group = THEME_GROUPS[index];
      if (!group) {
        return "";
      }
      return this._grp(id, title, `
        <p class="hint">${escapeHtml(hint)}</p>
        <div class="seg inline hdr-mode">
          <button type="button" data-set-mode="dark">${escapeHtml(t.theme_mode_dark)}</button>
          <button type="button" data-set-mode="light">${escapeHtml(t.theme_mode_light)}</button>
        </div>
        ${["dark", "light"]
          .map((mode) => `<div class="theme-mode" data-mode="${mode}"><div class="rows">${group.fields.map((field) => this._themeField(mode, field)).join("")}</div></div>`)
          .join("")}
        <div class="grp-foot">
          <small>${escapeHtml(t.theme_empty_hint)}</small>
          <button type="button" class="link-btn accent" data-theme-pull="${escapeHtml(name)}">${escapeHtml(t.theme_pull)}</button>
          <button type="button" class="link-btn" data-tg-clear="${index}">${escapeHtml(t.group_clear)}</button>
        </div>`, sec ? { sec } : {});
    }

    /** Symbol und Farbe eines Menuepunkts der Einstellungsseite (nur Vorschau). */
    _menuLook(path, index) {
      const known = {
        "/config/integrations": ["mdi:devices", "#3f7fd8"],
        "/config/automation": ["mdi:robot", "#26897b"],
        "/config/areas": ["mdi:sofa", "#d0752a"],
        "/config/apps": ["mdi:puzzle", "#7a5bd6"],
        "/config/hassio": ["mdi:puzzle", "#7a5bd6"],
        "/config/lovelace/dashboards": ["mdi:view-dashboard", "#c2416f"],
        "/config/voice-assistants": ["mdi:microphone", "#2f86b7"],
        "/config/person": ["mdi:account", "#a37a12"],
        "/config/system": ["mdi:cog", "#5f6b7a"],
        "/config/tools": ["mdi:hammer", "#58708a"],
        "/config/info": ["mdi:information-outline", "#4c7a5a"],
      };
      const colors = ["#3f7fd8", "#26897b", "#d0752a", "#7a5bd6", "#c2416f", "#2f86b7"];
      return known[path] || ["mdi:cog-outline", colors[index % colors.length]];
    }

    /** Export und Import an einer Stelle: alles zusammen und jede Rubrik einzeln. */
    _pageTransfer() {
      const t = this._t;
      const card = (title, ext, hint, exportId, importId) => `
        <div class="card xfer-card">
          <h3 class="xfer-title"><span class="grow">${escapeHtml(title)}</span><span class="badge-ext">${ext}</span></h3>
          <p>${escapeHtml(hint)}</p>
          <div class="button-row">
            <button type="button" class="btn primary" id="${exportId}">${escapeHtml(t.export)}</button>
            <button type="button" class="btn" id="${importId}">${escapeHtml(t.import)}</button>
          </div>
        </div>`;
      return `
        <section class="page doc-page" data-page="transfer">
          <div class="doc">
            <div class="stage-head">
              <h1 class="stage-title">${escapeHtml(t.stage_transfer_title)}</h1>
              <span class="stage-hint">${escapeHtml(t.stage_transfer_hint)}</span>
            </div>
            <div class="card inverse xfer-main">
              <div class="xfer-text">
                <h3 class="xfer-title"><span>${escapeHtml(t.transfer_all)}</span><span class="badge-ext">.json</span></h3>
                <p>${escapeHtml(t.advanced_transfer_hint)}</p>
              </div>
              <div class="button-row">
                <button type="button" class="btn" id="import">${escapeHtml(t.import)}</button>
                <button type="button" class="btn solid" id="export">${escapeHtml(t.export)}</button>
              </div>
            </div>
            <div class="xfer-grid">
              ${card(t.tab_sidebar, ".json", t.sidebar_transfer_hint, "sidebar-export", "sidebar-import")}
              ${card(t.tab_theme, ".yaml", t.theme_export_hint, "theme-export", "theme-import")}
              ${card(t.tab_header, ".json", t.header_transfer_hint, "header-export", "header-import")}
              ${card(t.tab_settings, ".json", t.settings_transfer_hint, "settings-export", "settings-import")}
            </div>
            <p class="xfer-foot">${escapeHtml(t.transfer_foot)}</p>
          </div>
        </section>`;
    }

    /** Info: Willkommen, Autor und Links, Unterstuetzung, Schalter, Zuruecksetzen. */
    _pageInfo() {
      const t = this._t;
      const area = (title, html) => `
        <div class="area">
          <h3>${escapeHtml(title)}</h3>
          ${html}
        </div>`;
      const link = (url, icon, label, cls) =>
        `<a class="btn${cls ? ` ${cls}` : ""}" href="${url}" target="_blank" rel="noopener noreferrer">${icon ? glyph(icon, "") : ""}${escapeHtml(label)}</a>`;
      const toggle = (key, title, hint) => `
        <div class="card info-switch">
          <label class="check strong">
            <input type="checkbox" data-bind="${key}" />
            <span>${escapeHtml(title)}</span>
          </label>
          <p class="hint">${escapeHtml(hint)}</p>
        </div>`;
      return `
        <section class="page doc-page" data-page="info">
          <div class="doc info-grid">
            <div class="card welcome">
              <h2>${escapeHtml(t.intro_title)}</h2>
              <p class="lead">${escapeHtml(t.info_lead)}</p>
              <p>${escapeHtml(t.info_areas)}</p>
              <div class="areas-grid">
                ${area(t.tab_sidebar, t.info_sidebar)}
                ${area(t.tab_theme, t.info_theme.replace("{n}", THEME_VARIABLES.length).replace("{p}", PALETTE_STEPS.length))}
                ${area(t.tab_header, t.info_header)}
                ${area(t.tab_settings, t.info_settings)}
              </div>
              <p class="note tip">${t.info_tip}</p>
              <p class="note important">${t.info_important}</p>
              <p class="note">${t.info_note}</p>
            </div>
            <div class="stack">
              <div class="card inverse author">
                <div class="author-head">
                  <span class="avatar">J</span>
                  <span class="who"><small>${escapeHtml(t.info_by)}</small><strong>jayjojayson</strong></span>
                  <span class="badge-ext">v${VERSION} · MIT</span>
                </div>
                <div class="link-grid">
                  ${link(PROJECT_LINKS.github, "", "GitHub")}
                  ${link(PROJECT_LINKS.issues, "", t.info_issue)}
                  ${link(PROJECT_LINKS.docs, "", t.info_docs, "wide")}
                </div>
                <div class="rule-title">${escapeHtml(t.info_support_title)}</div>
                <p class="support-text">${escapeHtml(t.info_support)}</p>
                <div class="link-grid">
                  ${link(PROJECT_LINKS.kofi, "mdi:coffee-outline", "Ko-fi", "solid")}
                  ${link(PROJECT_LINKS.paypal, "", "PayPal", "")}
                </div>
              </div>
              ${toggle("advanced.enabled", t.enabled, t.enabled_hint)}
              ${toggle("advanced.debug", t.debug, t.debug_hint)}
              <div class="card danger">
                <h2>${escapeHtml(t.reset_title)}</h2>
                <p class="hint">${t.reset_hint}</p>
                <button type="button" class="btn danger" id="reset">${glyph("mdi:restore", "")}${escapeHtml(t.reset)}</button>
              </div>
            </div>
          </div>
        </section>`;
    }

    /* ------------------------------------------------------ entry rows */

    /** Die Bezeichnung eines Eintrags, wie die Seitenleiste sie zeigt. */
    _entryName(entry, items) {
      const cfg = (items || this._config.items)[entry.key] || {};
      const own = String(cfg.name || "").trim();
      if (own) {
        return own;
      }
      if (entry.heading) {
        return this._t.heading;
      }
      if (entry.link) {
        return entry.sub;
      }
      if (entry.popup) {
        return this._t.popup;
      }
      return entry.label;
    }

    /** Ist ein Eintrag gegenueber dem gespeicherten Stand geaendert? */
    _entryChanged(key) {
      const base = itemDefaults(key);
      const now = Object.assign({}, base, this._config.items[key] || {});
      const before = Object.assign({}, base, (this._saved.items || {})[key] || {});
      const known = !!(this._saved.items || {})[key] || !(isHeading(key) || isLink(key) || isPopup(key));
      return !known || stableJson(now) !== stableJson(before);
    }

    /** Der Stand, den die Vorschaubilder zeigen: mit "Vorher" der gespeicherte. */
    _view() {
      return this._before && this._saved ? this._saved : this._config;
    }

    /** Punkte und Namen in der Liste nachziehen, ohne sie neu zu bauen. */
    _markEntries() {
      const list = this.shadowRoot.getElementById("items");
      if (!list) {
        return;
      }
      list.querySelectorAll("li.item[data-key]").forEach((row) => {
        const entry = this._entries.find((one) => one.key === row.dataset.key);
        if (!entry) {
          return;
        }
        const dot = row.querySelector("[data-dot]");
        if (dot) {
          dot.hidden = !this._entryChanged(entry.key);
        }
        const name = row.querySelector(".row-name > span:first-child");
        if (name) {
          name.textContent = this._entryName(entry);
        }
      });
    }

    /**
     * Einen Eintrag auswaehlen: in der Liste aufklappen, im Vorschaubild
     * markieren. Auf Tablet und Handy zeigt die Spalte dann den Eintrag.
     */
    _selectEntry(key) {
      if (!this._entries.some((entry) => entry.key === key)) {
        return;
      }
      this._selKey = key;
      this._itemsView = "entry";
      this._ctile = "";
      this._renderItems();
      const row = this.shadowRoot.querySelector(`#items li.item[data-key="${CSS.escape(key)}"]`);
      if (row && row.scrollIntoView && row.offsetParent) {
        row.scrollIntoView({ block: "nearest" });
      }
    }

    /**
     * Die Felder des gewaehlten Eintrags. Dieselben Attribute wie frueher in
     * der Zeile (data-item, data-prop), damit dieselben Handler greifen.
     */
    _renderInspector() {
      const box = this._inspector;
      if (!box) {
        return;
      }
      const t = this._t;
      const entry = this._entries.find((one) => one.key === this._selKey);
      if (!entry) {
        box.innerHTML = `<p class="insp-empty">${escapeHtml(t.inspector_empty)}</p>`;
        return;
      }
      const key = entry.key;
      const k = escapeHtml(key);
      const cfg = Object.assign({}, itemDefaults(entry.key), this._config.items[key] || {});
      const columns = Math.max(1, parseInt(this._config.layout.columns, 10) || 1);
      const tiles = [
        ["icon_color", t.icon],
        ["text_color", t.text_short],
        ["background", t.item_background_short],
      ];
      if (tiles.every((one) => one[0] !== this._ctile)) {
        this._ctile = "";
      }
      const tile = (prop, label) => {
        const value = String(cfg[prop] || "").trim();
        return `
          <button type="button" class="ctile" data-ctile="${prop}"${this._ctile === prop ? " data-open" : ""}>
            <i${value ? ` style="background:${escapeHtml(cssValue(value))}"` : " data-empty"}></i>
            <span>${escapeHtml(label)}</span>
          </button>`;
      };
      const open = tiles.find((one) => one[0] === this._ctile);
      const color = open
        ? `
          <label class="field ctile-edit">
            <span>${escapeHtml(open[1])}</span>
            <span class="color-field">
              <input type="color" data-item-color="${k}" data-prop="${open[0]}" value="${escapeHtml(asHexColor(cfg[open[0]]))}" />
              <input type="text" data-item="${k}" data-prop="${open[0]}" value="${escapeHtml(cfg[open[0]])}"
                placeholder="${escapeHtml(t.like_appearance)}" />
              <button type="button" class="clear" data-ctile-clear="${open[0]}" title="reset">&#10005;</button>
            </span>
          </label>`
        : "";
      const spanOptions = [];
      for (let n = 1; n <= columns; n += 1) {
        spanOptions.push(`<option value="${n}"${Number(cfg.span || 1) === n ? " selected" : ""}>${n}</option>`);
      }
      const index = this._entries.indexOf(entry);
      box.innerHTML = `
        <div class="insp-head">
          <span class="insp-title"><strong>${escapeHtml(this._entryName(entry))}</strong><small>${escapeHtml(entry.sub)}</small></span>
          <button type="button" class="btn" data-action="all-entries">${escapeHtml(t.all_entries)}</button>
        </div>
        <div class="insp-body" data-insp="${k}">
          <div class="grid2">
            <label class="field">
              <span>${escapeHtml(t.name)}</span>
              <input type="text" data-item="${k}" data-prop="name" value="${escapeHtml(cfg.name)}"
                placeholder="${escapeHtml(entry.heading ? t.heading : entry.link ? entry.sub : entry.popup ? t.popup : entry.label)}" />
            </label>
            <label class="field">
              <span>${escapeHtml(t.icon)}</span>
              <input type="text" data-item="${k}" data-prop="icon" value="${escapeHtml(cfg.icon)}"
                placeholder="${escapeHtml(entry.icon || t.icon_placeholder)}" spellcheck="false" />
            </label>
          </div>
          ${
            entry.heading
              ? ""
              : this._segSelect(
                  `<select data-item="${k}" data-prop="span">${spanOptions.join("")}</select>`,
                  t.span_label
                ) + (columns === 1 ? `<small class="field-hint" style="margin-top:-8px">${escapeHtml(t.span_hint)}</small>` : "")
          }
          <div class="ctiles">${tiles.map((one) => tile(one[0], one[1])).join("")}</div>
          ${color}
          ${entry.popup ? this._popupEditor(key, cfg) : ""}
          ${entry.heading ? this._headingExtra(key, cfg) : `
          <label class="check boxed">
            <input type="checkbox" data-item="${k}" data-prop="hidden"${cfg.hidden ? " checked" : ""} />
            <span>${escapeHtml(t.hide_in_sidebar)}</span>
          </label>`}
          <div class="insp-moves">
            <button type="button" class="btn sm" data-action="up" ${index <= 0 ? "disabled" : ""}>${glyph("mdi:arrow-up", "&#9650;")}${escapeHtml(t.move_up)}</button>
            <button type="button" class="btn sm" data-action="down" ${index >= this._entries.length - 1 ? "disabled" : ""}>${glyph("mdi:arrow-down", "&#9660;")}${escapeHtml(t.move_down)}</button>
            <span class="grow"></span>
            <button type="button" class="link-btn" data-action="reset-entry"${this._entryChanged(key) ? "" : " hidden"}>${escapeHtml(t.entry_reset)}</button>
            ${
              entry.heading || entry.link || entry.popup
                ? `<button type="button" class="btn sm danger" data-action="remove">${glyph("mdi:trash-can-outline", "&#10005;")}${escapeHtml(
                    entry.heading ? t.heading_remove : entry.popup ? t.popup_remove : t.link_remove
                  )}</button>`
                : ""
            }
          </div>
        </div>`;
      // Farbfelder (auch die der Ueberschrift) auf den gespeicherten Wert
      box.querySelectorAll("input[data-item-color]").forEach((picker) => {
        picker.value = asHexColor(cfg[picker.dataset.prop]);
      });
      this._syncSegs(box);
      this._upgradeIconFields();
      this._markChanges();
    }

    /**
     * 1.5.4: Ein Sensor der Kopfzeile - oben Name, Pfeile, Papierkorb und der
     * Knopf zum Aufklappen; aufgeklappt Icon (Auswahl von Home Assistant),
     * Farbe des Icons, Farbe des Werts und "nur den Wert".
     */
    _sensorRow(link, index, count) {
      const t = this._t;
      const open = (this._favOpen || new Set()).has(`entity:${link.entity}`);
      const color = (prop, label, placeholder) => `
        <label class="field"><span>${escapeHtml(label)}</span>
          <span class="color-field">
            <input type="color" data-hcolor="${prop}" value="${escapeHtml(asHexColor(link[prop]))}" />
            <input type="text" data-hprop="${prop}" value="${escapeHtml(link[prop] || "")}"
              spellcheck="false" placeholder="${escapeHtml(placeholder)}" />
            <button class="clear" data-haction="clear" data-prop="${prop}" title="reset">&#10005;</button>
          </span>
        </label>`;
      return `
          <li class="hlink fav sensor" data-index="${index}"${open ? " data-open" : ""}>
            <div class="fav-main">
              <span class="row-icon">${
                customElements.get("ha-icon")
                  ? `<ha-icon icon="${escapeHtml(link.icon || this._linkIcon(link))}"${
                      link.color ? ` style="color:${escapeHtml(link.color)}"` : ""
                    }></ha-icon>`
                  : ""
              }</span>
              <span class="row-title">
                <strong>${escapeHtml(t.header_link_sensor)}</strong>
                <small>${escapeHtml(link.entity)}</small>
              </span>
              <input type="text" data-hprop="name" value="${escapeHtml(link.name)}"
                maxlength="60" placeholder="${escapeHtml(this._entityName(link.entity) || t.name)}" title="${escapeHtml(t.name)}" />
              <button class="icon-btn" data-haction="up" ${index === 0 ? "disabled" : ""}
                title="${escapeHtml(t.header_link_up)}">${glyph("mdi:arrow-up", "&#9650;")}</button>
              <button class="icon-btn" data-haction="down" ${index === count - 1 ? "disabled" : ""}
                title="${escapeHtml(t.header_link_down)}">${glyph("mdi:arrow-down", "&#9660;")}</button>
              <button class="icon-btn warn" data-haction="remove"
                title="${escapeHtml(t.link_remove)}">${glyph("mdi:trash-can-outline", "&#10005;")}</button>
              <button class="icon-btn" data-haction="more"${open ? " data-on" : ""}
                title="${escapeHtml(t.header_sensor_look)}">${glyph("mdi:tune-variant", "&#9998;")}</button>
            </div>
            <div class="fav-extra">
              <label class="field fav-icon"><span>${escapeHtml(t.icon)}</span>
                <input type="text" data-hprop="icon" value="${escapeHtml(link.icon)}"
                  spellcheck="false" placeholder="${escapeHtml(t.header_sensor_icon_auto)}" title="${escapeHtml(t.icon)}" />
              </label>
              <div class="rows fav-colors">
                ${color("color", t.header_sensor_icon_color, "theme")}
                ${color("value_color", t.header_sensor_value_color, t.header_sensor_value_color_auto)}
              </div>
              <label class="check">
                <input type="checkbox" data-hbool="value_only"${link.value_only ? " checked" : ""} />
                <span>${escapeHtml(t.header_sensor_value_only)}</span>
              </label>
              <small class="field-hint">${escapeHtml(t.header_sensor_look_hint)}</small>
            </div>
          </li>`;
    }

    /** Die Farbkacheln des Eintrags nachziehen (beim Tippen). */
    _syncCtiles() {
      const box = this._inspector;
      const key = this._selKey;
      if (!box || !key) {
        return;
      }
      const cfg = this._config.items[key] || {};
      box.querySelectorAll(".ctile[data-ctile]").forEach((tile) => {
        const value = String(cfg[tile.dataset.ctile] || "").trim();
        const swatch = tile.querySelector("i");
        swatch.style.background = value ? cssValue(value) : "";
        swatch.toggleAttribute("data-empty", !value);
      });
    }

    /** Das Icon eines Eintrags in der Liste nachziehen. */
    _showEntryIcon(key) {
      const entry = this._entries.find((one) => one.key === key);
      const cfg = this._config.items[key] || {};
      const icon = cfg.icon || (entry && entry.icon) || "";
      const row = this.shadowRoot.querySelector(`li.item[data-key="${CSS.escape(key)}"] .row-icon ha-icon`);
      if (row) {
        row.setAttribute("icon", icon);
      }
    }

    /** Einen Eintrag auf den gespeicherten Stand zuruecksetzen. */
    _resetEntry(key) {
      const saved = (this._saved.items || {})[key];
      if (saved) {
        this._config.items[key] = clone(saved);
      } else if (isHeading(key) || isLink(key) || isPopup(key)) {
        const cfg = this._config.items[key] || {};
        this._config.items[key] = Object.assign({}, itemDefaults(key), {
          name: cfg.name || "",
          icon: cfg.icon || "",
          parent: cfg.parent || "",
        }, isPopup(key) ? cleanPopupCard({
          links: cleanPopupLinks(cfg.links),
          content: cfg.content,
          card_yaml: cfg.card_yaml,
          card: cfg.card,
          width: 0,
          height: 0,
        }) : {});
      } else {
        delete this._config.items[key];
      }
      this._tidyParents();
      this._renderItems();
      this._touch();
    }

    /* ------------------------------------------- Vorschau Seitenleiste */

    /**
     * Ein Modell der Seitenleiste mit allen Werten von Layout, Eintraegen und
     * Aussehen. Kein Abbild Pixel fuer Pixel - es zeigt Raster, Reihenfolge,
     * Farben und Rahmen so, dass jede Aenderung sofort zu sehen ist. Steht
     * in jedem Vorschaubild; auf der Seite Sidebar ist es anklickbar.
     */
    _renderSidebarPreview() {
      const host = this.shadowRoot.querySelector(".page[data-active] .sbp-host");
      if (!host) {
        return;
      }
      const t = this._t;
      const view = this._view();
      const layout = view.layout || {};
      const look = view.appearance || {};
      const items = view.items || {};
      // Ein- und Ausklappen gibt es nur auf der Seite Sidebar; in den
      // anderen Vorschaubildern steht die Seitenleiste eingeklappt daneben.
      const closed = this._sbpState === "closed" || this._groupOf(this._tab) !== "sidebar";
      const num = (raw, fallback, min, max) => {
        const n = Number(raw);
        return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback));
      };
      const cols = Math.round(num(closed ? layout.columns_collapsed : layout.columns, 1, 1, 4));
      const style = layout.item_style || "auto";
      const tiles = style === "tile" || (style === "auto" && cols > 1);
      const text = (raw) => String(raw || "").trim();
      const vars = [];
      const put = (name, value) => {
        if (value !== "" && value !== undefined && value !== null) {
          vars.push(`${name}:${cssValue(value)}`);
        }
      };
      const width = closed ? num(layout.width_collapsed, 56, 40, 400) : num(layout.width, 256, 56, 1000);
      put("--w", `${width}px`);
      put("--cols", cols);
      const gap = num(layout.gap, 6, 0, 64);
      put("--gap", `${gap}px`);
      // Wie im Injector: Innenabstand der Liste = Abstand, eingeklappt hoechstens 4 px
      put("--pad", `${closed ? Math.min(gap, 4) : gap}px`);
      put("--tgap", `${num(layout.tile_gap, 2, 0, 60)}px`);
      const tileH = num(closed && layout.tile_height_collapsed > 0 ? layout.tile_height_collapsed : layout.tile_height, 74, 28, 300);
      const rowH = num(closed && layout.row_height_collapsed > 0 ? layout.row_height_collapsed : layout.row_height, 40, 24, 200);
      put("--tileh", `${tileH}px`);
      put("--rowh", `${rowH}px`);
      put("--sbp-bg", backgroundOf(look));
      put("--sbp-text", text(look.text_color));
      put("--sbp-icon", text(look.icon_color));
      put("--sbp-head-bg", text(look.header_background));
      put("--sbp-title", text(look.title_color));
      // Ohne Breite und Farbe bleibt die Trennlinie von Home Assistant (1 px)
      const edge = num(look.border_width, 0, 0, 20);
      put("--sbp-bw", `${edge > 0 || text(look.border_color) ? edge : 1}px`);
      put("--sbp-bc", text(look.border_color));
      put("--sbp-ibg", text(look.item_background));
      put("--sbp-ibc", text(look.item_border_color));
      put("--sbp-ibw", look.item_border_split
        ? ["top", "right", "bottom", "left"].map((s) => `${num(look[`item_border_${s}`], 0, 0, 20)}px`).join(" ")
        : `${num(look.item_border_width, 0, 0, 20)}px`);
      put("--rad", look.item_radius_split
        ? ["tl", "tr", "br", "bl"].map((c) => `${num(look[`item_radius_${c}`], 12, 0, 60)}px`).join(" ")
        : `${num(look.item_radius, 12, 0, 60)}px`);
      put("--fs", `${num(look.font_size, 12, 6, 40)}px`);
      put("--fw", text(look.font_weight));
      put("--is", `${num(look.icon_size, 24, 8, 96)}px`);
      put("--sbp-font", text(look.font_family));
      put("--sbp-sel-bg", text(look.item_background_selected));
      put("--sbp-sel-text", text(look.text_color_selected));
      put("--sbp-sel-icon", text(look.icon_color_selected));
      const hover = text(look.hover_background);
      if (hover) {
        const opacity = num(look.hover_opacity, 100, 0, 100);
        const tint = opacity >= 100 ? hover : `color-mix(in srgb, ${hover} ${opacity}%, transparent)`;
        put("--sbp-hover", `linear-gradient(${tint}, ${tint})`);
        // Wie der Injector: eine eigene Hover-Farbe ersetzt den Hintergrund
        put("--sbp-hover-bg", tint);
      } else {
        put("--sbp-hover", "linear-gradient(rgba(127,127,127,.18), rgba(127,127,127,.18))");
      }
      put("--sbp-hover-text", text(look.hover_text_color));
      put("--sbp-hover-icon", text(look.hover_icon_color));
      put("--sbp-badge-bg", text(look.badge_background));
      put("--sbp-badge-fg", text(look.badge_color));

      const zone = this._tab === "look" ? this._secZone("look") : "";
      const onItems = this._tab === "items";
      const fixedKeys = ["config", "notifications", "profile"];
      // Mit "Vorher": die gespeicherte Reihenfolge und die gespeicherten Werte
      const entries = this._before
        ? this._savedOrder()
            .map((key) => this._entries.find((entry) => entry.key === key))
            .filter((entry) => entry && (!(isHeading(entry.key) || isLink(entry.key) || isPopup(entry.key)) || items[entry.key]))
        : this._entries;
      const visible = entries.filter((entry) => !(items[entry.key] || {}).hidden);
      let current = null;
      const icon = (name) =>
        customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(name)}"></ha-icon>` : "";
      const drag = onItems && !this._before ? ' draggable="true"' : "";
      const selTag = escapeHtml(t.tag_selected_short);
      const tile = (entry) => {
        const cfg = Object.assign({}, itemDefaults(entry.key), items[entry.key] || {});
        const k = escapeHtml(entry.key);
        const mark = onItems && entry.key === this._selKey ? ` data-mark data-sel data-tag="${selTag}"` : "";
        if (entry.heading) {
          // Dieselben Regeln wie die Zwischenueberschrift im Injector
          const h = [];
          const flags = [];
          const px = (raw) => `${Math.max(0, Math.round(Number(raw) || 0))}px`;
          if (text(cfg.text_color)) {
            h.push(`--hc:${cssValue(cfg.text_color)}`);
            flags.push("data-color");
          }
          if (text(cfg.background)) h.push(`--hbg:${cssValue(cfg.background)}`);
          if (text(cfg.icon_color)) h.push(`--hic:${cssValue(cfg.icon_color)}`);
          if (Number(cfg.height) > 0) {
            h.push(`--hh:${Math.min(200, Number(cfg.height))}px`);
            flags.push("data-height");
          }
          const borders = cfg.border_split
            ? [cfg.border_top, cfg.border_right, cfg.border_bottom, cfg.border_left].map(px).join(" ")
            : Number(cfg.border_width) > 0 ? px(cfg.border_width) : "";
          if (borders && borders !== "0px" && borders !== "0px 0px 0px 0px") {
            h.push(`--hbw:${borders}`);
            h.push(`--hbc:${cssValue(cfg.border_color) || "currentColor"}`);
          }
          const radius = cfg.radius_split
            ? [cfg.radius_tl, cfg.radius_tr, cfg.radius_br, cfg.radius_bl].map(px).join(" ")
            : Number(cfg.radius) > 0 ? px(cfg.radius) : "";
          if (radius && radius !== "0px" && radius !== "0px 0px 0px 0px") h.push(`--hr:${radius}`);
          if (cfg.uppercase !== false) flags.push("data-upper");
          return `<div class="sbp-hd" tabindex="0" data-key="${k}"${mark}${drag} ${flags.join(" ")} style="${escapeHtml(h.join(";"))}">${
            text(cfg.icon) ? icon(cfg.icon) : ""
          }<span class="hd-text">${escapeHtml(this._entryName(entry, items))}</span>${
            cfg.collapsible ? '<span class="hd-caret">&#9660;</span>' : ""
          }</div>`;
        }
        const s = [];
        const span = Math.min(cols, Math.max(1, Number(cfg.span) || 1));
        if (span > 1) s.push(`grid-column: span ${span}`);
        if (text(cfg.text_color)) s.push(`--tc:${cssValue(cfg.text_color)}`);
        if (text(cfg.icon_color)) s.push(`--ic:${cssValue(cfg.icon_color)}`);
        if (text(cfg.background)) s.push(`--ibg:${cssValue(cfg.background)}`);
        let extra = "";
        if (!current && entry.key.indexOf("panel:") === 0) {
          current = entry.key;
          extra += " data-current";
        } else if (zone === "hover" && !this._sbpHoverDone) {
          this._sbpHoverDone = true;
          extra += " data-hover data-mark";
        }
        if (zone === "notifications" && entry.key === "notifications") {
          extra += " data-mark";
        }
        const name = entry.key === "profile" ? (this._hass && this._hass.user && this._hass.user.name) || entry.label : this._entryName(entry, items);
        const badge = entry.key === "notifications"
          ? `<span class="sbp-badge"${zone === "badge" ? " data-mark" : ""}>3</span>`
          : "";
        return `<div class="sbp-it" tabindex="0" data-key="${k}"${mark}${extra}${drag} style="${escapeHtml(s.join(";"))}">${icon(cfg.icon || entry.icon)}<span class="lbl">${escapeHtml(name)}</span>${badge}</div>`;
      };
      this._sbpHoverDone = false;
      const main = layout.merge_fixed ? visible : visible.filter((entry) => fixedKeys.indexOf(entry.key) < 0);
      const fixed = layout.merge_fixed ? [] : visible.filter((entry) => fixedKeys.indexOf(entry.key) >= 0);
      const title = text(look.title) || "Home Assistant";
      const nolabels = closed && look.hide_labels_collapsed !== false;
      host.innerHTML = `
        <div class="sbp"${tiles ? " data-tiles" : ""}${nolabels ? " data-nolabels" : ""}${closed ? " data-closed" : ""}${text(look.hover_background) ? " data-own-hover" : ""}${text(look.hover_text_color) ? " data-hover-text" : ""}${text(look.hover_icon_color) ? " data-hover-icon" : ""}${layout.hide_scrollbar ? " data-noscroll" : ""} data-zone="${escapeHtml(zone)}" style="${escapeHtml(vars.join(";"))}">
          ${look.hide_title && look.hide_toggle ? "" : `<div class="sbp-head">${look.hide_toggle ? "" : icon("mdi:menu")}${look.hide_title || closed ? "" : `<span>${escapeHtml(title)}</span>`}</div>`}
          <div class="sbp-grid">${main.map(tile).join("")}</div>
          ${fixed.length ? `<div class="sbp-fixed">${fixed.map(tile).join("")}</div>` : ""}
        </div>`;
      this.shadowRoot.querySelectorAll("[data-sbp-state] button").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.value === (closed ? "closed" : "open"));
      });
      if (!main.length && !fixed.length) {
        host.querySelector(".sbp-grid").innerHTML = `<span class="stage-note">${escapeHtml(t.sbp_empty)}</span>`;
      }
      this._renderPopupPreview();
    }

    /** Ein Feld im aufgeklappten Menuepunkt schreiben (ohne die Liste neu zu zeichnen). */
    _setMenuItem(path, prop, value) {
      const settings = this._config.settings;
      const all = Object.assign({}, settings.menu_items || {});
      const one = Object.assign({}, all[path] || {});
      if (value === "" || value === false || value === null || value === undefined) {
        delete one[prop];
      } else {
        one[prop] = value;
      }
      if (Object.keys(one).length) {
        all[path] = one;
      } else {
        delete all[path];
      }
      settings.menu_items = all;
      const row = this.shadowRoot.querySelector(`li.mentry[data-path="${CSS.escape(path)}"]`);
      if (row) {
        const entry = this._menuGroups().reduce((acc, g) => acc.concat(g), []).find((x) => x.path === path);
        row.querySelector(".row-title strong").textContent = one.name || (entry ? entry.name : path);
        row.toggleAttribute("data-custom", Object.keys(one).length > 0);
        const reset = this.shadowRoot.querySelector(`li.mentry-edit[data-path="${CSS.escape(path)}"] [data-mitem-reset]`);
        if (reset) {
          reset.disabled = !Object.keys(one).length;
        }
      }
      this._touch();
    }

    /* ----------------------------------------------------- Navigation */

    /** Titel einer Seite (fuer die Suche) und ihre Unterzeile. */
    _pageMeta(name) {
      const t = this._t;
      const meta = {
        layout: [t.tab_sidebar, t.tab_layout],
        items: [t.tab_sidebar, t.tab_items],
        look: [t.tab_sidebar, t.tab_look],
        theme: [t.eyebrow_theme, t.tab_theme],
        header: [t.eyebrow_header, t.tab_header],
        settings: [t.eyebrow_settings, t.tab_settings],
        transfer: [t.eyebrow_transfer, t.page_transfer],
        info: [t.eyebrow_info, t.page_info],
      }[name] || ["", ""];
      return { eyebrow: meta[0], title: meta[1] };
    }

    /** Eine Gruppe auf- oder zuklappen. remember: per Hand, also merken. */
    _setGrp(id, open, remember) {
      this._grpOpen[id] = !!open;
      if (remember) {
        this._grpUser[id] = !!open;
        writeGroups(this._grpUser);
      }
      if (open && this._accordion) {
        // Akkordeon: die Nachbarn dieser Gruppe zuklappen. Nicht auf der
        // Kopfzeilen-Seite in "Alle Felder" - dort sind alle Gruppen offen.
        this.shadowRoot.querySelectorAll(`.grp[data-grp="${CSS.escape(id)}"]`).forEach((grp) => {
          if (!grp.closest(ACCORDION_FIELDS) || !grp.parentElement) {
            return;
          }
          if (this._headerView === "all" && grp.closest('[data-fields="header"]')) {
            return;
          }
          [...grp.parentElement.children].forEach((other) => {
            if (other !== grp && other.matches(".grp[data-open]")) {
              const otherId = other.dataset.grp;
              this._setGrp(otherId, false, otherId in this._grpUser);
            }
          });
        });
      }
      this.shadowRoot.querySelectorAll(`.grp[data-grp="${CSS.escape(id)}"]`).forEach((grp) => {
        grp.toggleAttribute("data-open", !!open);
        const head = grp.querySelector(":scope > .grp-head");
        if (head) {
          head.setAttribute("aria-expanded", open ? "true" : "false");
        }
      });
    }

    /** Akkordeon an oder aus (Schalter neben Einfach / Alle). */
    _setAccordion(on) {
      this._accordion = !!on;
      writeAccordion(this._accordion);
      const t = this._t;
      this.shadowRoot.querySelectorAll("[data-accordion]").forEach((button) => {
        button.toggleAttribute("data-active", this._accordion);
        button.setAttribute("aria-pressed", this._accordion ? "true" : "false");
        button.title = this._accordion ? t.accordion_on : t.accordion_off;
        const icon = button.querySelector("ha-icon");
        if (icon) {
          icon.setAttribute("icon", this._accordion ? "mdi:unfold-less-horizontal" : "mdi:unfold-more-horizontal");
        }
      });
      if (this._accordion) {
        this._accordionTidy();
      }
    }

    /**
     * Akkordeon: je Spalte (und je Ebene) nur eine offene Gruppe - bevorzugt
     * die des gewaehlten Abschnitts, sonst die erste offene.
     */
    _accordionTidy() {
      if (!this._accordion) {
        return;
      }
      const root = this.shadowRoot;
      const parents = new Set();
      root.querySelectorAll(`${ACCORDION_FIELDS.split(",").map((s) => `${s.trim()} .grp[data-open]`).join(", ")}`).forEach((grp) => {
        parents.add(grp.parentElement);
      });
      parents.forEach((parent) => {
        const open = [...parent.children].filter((el) => el.matches(".grp[data-open]"));
        if (open.length < 2) {
          return;
        }
        const group = open[0].dataset.secGroup;
        const keep = open.find((el) => group && el.dataset.sec === String(this._secs[group])) || open[0];
        open.forEach((el) => {
          if (el !== keep) {
            this._setGrp(el.dataset.grp, false, el.dataset.grp in this._grpUser);
          }
        });
      });
    }

    /** Eine Gruppe in ihrer Spalte sichtbar machen. */
    _scrollToGrp(id) {
      const grp = this.shadowRoot.querySelector(`.page[data-active] .grp[data-grp="${CSS.escape(id)}"]`);
      if (grp && grp.offsetParent && grp.scrollIntoView) {
        grp.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    /**
     * Einen Abschnitt waehlen - meist per Klick ins Vorschaubild.
     * look/header: die Gruppe aufklappen und zeigen. theme: die Gruppe
     * sichtbar machen (passendes Element waehlen). settings: das Thema
     * zeigen und die passende Seite im Vorschaubild.
     */
    _selectSection(group, id, scroll) {
      const root = this.shadowRoot;
      const key = String(id);
      if (group === "settings") {
        const panels = root.querySelectorAll('[data-sec-group="settings"]');
        if (![...panels].some((panel) => panel.dataset.sec === key)) {
          return;
        }
        this._secs.settings = key;
        let title = "";
        panels.forEach((panel) => {
          const on = panel.dataset.sec === key;
          panel.toggleAttribute("data-current", on);
          if (on) {
            title = panel.dataset.topicTitle || "";
          }
        });
        const head = root.getElementById("settings-topic-title");
        if (head) {
          head.textContent = title;
        }
        const pane = key === "list" || key === "tables" ? key : "page";
        if (pane === "page") {
          this._pageTopic = key;
        }
        root.querySelectorAll(".sp-pane").forEach((one) => {
          one.toggleAttribute("data-current", one.dataset.pane === pane);
        });
        root.querySelectorAll("[data-pane-btn]").forEach((button) => {
          button.toggleAttribute("data-active", button.dataset.paneBtn === pane);
        });
        root.querySelectorAll('.seg[data-view="settings"], [data-acc-for="settings"]').forEach((el) => {
          el.hidden = pane !== "page";
        });
        const fieldsCol = root.querySelector('[data-fields="settings"]');
        if (fieldsCol) {
          fieldsCol.dataset.pane = pane;
        }
        const paneTitle = root.querySelector("[data-pane-title]");
        if (paneTitle) {
          const t = this._t;
          paneTitle.textContent = pane === "list" ? t.pane_list : pane === "tables" ? t.pane_tables : t.preview_settings;
        }
        if (scroll) {
          const body = root.querySelector('[data-fields="settings"] .fields-body');
          const current = root.querySelector(`[data-fields="settings"] .topic-panel[data-sec="${CSS.escape(key)}"]`);
          if (body && pane === "page" && this._settingsView === "all" && current && current.offsetParent) {
            body.scrollTop += current.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
          } else if (body) {
            body.scrollTop = 0;
          }
        }
        this._updateSettingsPreview();
        this._applyStageMarks();
        return;
      }
      if (group === "theme") {
        const index = Number(key);
        if (!THEME_GROUPS[index]) {
          return;
        }
        this._secs.theme = key;
        const spots = this._spotGroups(this._themeSpot);
        if (spots.indexOf(index) < 0) {
          const spot = Object.keys(THEME_SPOTS).find((name) => this._spotGroups(name).indexOf(index) >= 0);
          if (spot) {
            this._themeSpot = spot;
          } else {
            this._themeView = "all";
          }
        }
        if (scroll || !(`theme:${index}` in this._grpUser)) {
          this._setGrp(`theme:${index}`, true);
        }
        this._applyViews();
        this._applyStageMarks();
        if (scroll) {
          this._scrollToGrp(`theme:${index}`);
        }
        return;
      }
      const grp = root.querySelector(`.grp[data-sec-group="${group}"][data-sec="${CSS.escape(key)}"]`);
      if (!grp) {
        return;
      }
      this._secs[group] = key;
      if (group === "header" && scroll) {
        // Klick ins Vorschaubild der Kopfzeile: "Einfach" zeigt nur diese
        // Gruppe aufgeklappt, "Alle Felder" laesst alle offen.
        if (this._headerView === "all") {
          this._setGrp(grp.dataset.grp, true);
        } else {
          this._applyHeaderView();
        }
      } else if (scroll || !(grp.dataset.grp in this._grpUser)) {
        // Beim Aufbau (scroll false) nicht gegen den gemerkten Zustand aufklappen
        this._setGrp(grp.dataset.grp, true);
      }
      if (group === "header") {
        const preview = root.getElementById("header-preview");
        if (preview) {
          preview.dataset.mark = key;
        }
      }
      if (group === "look") {
        this._renderSidebarPreview();
      }
      if (scroll) {
        this._scrollToGrp(grp.dataset.grp);
      }
    }

    /** Die Gruppen (Index in THEME_GROUPS) eines Elements im Vorschaubild. */
    _spotGroups(spot) {
      // Ein einzelnes Bedienelement (1.4.9): die Gruppen seiner Variablen
      if (String(spot || "").indexOf("ctl:") === 0) {
        const groups = [];
        controlFields(spot.slice(4)).forEach((name) => {
          const index = THEME_GROUPS.findIndex((group) => group.fields.some((field) => field[0] === name));
          if (index >= 0 && groups.indexOf(index) < 0) {
            groups.push(index);
          }
        });
        return groups;
      }
      return (THEME_SPOTS[spot] || [])
        .map((name) => THEME_GROUPS.findIndex((group) => group.en === name))
        .filter((index) => index >= 0);
    }

    /** Ein Element im Vorschaubild der Theme-Seite anklicken. */
    _selectSpot(spot) {
      const groups = this._spotGroups(spot);
      if (!groups.length) {
        return;
      }
      this._themeSpot = spot;
      this._secs.theme = String(groups[0]);
      // Die Gruppen des vorher gewaehlten Elements wieder zuklappen
      THEME_GROUPS.forEach((_, index) => {
        if (index !== groups[0] && this._grpOpen[`theme:${index}`]) {
          this._setGrp(`theme:${index}`, false, `theme:${index}` in this._grpUser);
        }
      });
      this._setGrp(`theme:${groups[0]}`, true);
      this._applyViews();
      this._applyStageMarks();
      const body = this.shadowRoot.querySelector('[data-fields="theme"] .fields-body');
      if (body && this._themeView !== "all") {
        body.scrollTop = 0;
      } else {
        this._scrollToGrp(`theme:${groups[0]}`);
      }
    }

    /** Was in der Vorschau der Seitenleiste markiert wird (Seite Aussehen). */
    _secZone(group) {
      const grp = this.shadowRoot.querySelector(`.grp[data-sec-group="${group}"][data-sec="${CSS.escape(String(this._secs[group] || ""))}"]`);
      return (grp && grp.dataset.zone) || "";
    }

    /**
     * Die Markierung "... · ausgewaehlt" in den Vorschaubildern von Theme und
     * HA-Settings. (Seitenleiste: _renderSidebarPreview, Kopfzeile: fest.)
     */
    _applyStageMarks() {
      const root = this.shadowRoot;
      const t = this._t;
      const mark = (el, label) => {
        el.setAttribute("data-sel", "");
        el.setAttribute("data-tag", t.tag_selected.replace("{name}", label));
      };
      root.querySelectorAll('[data-stage="theme"] [data-sel], [data-stage="settings"] [data-sel]').forEach((el) => {
        el.removeAttribute("data-sel");
        el.removeAttribute("data-tag");
      });
      // Ein einzelnes Element (1.4.9 Bedienelemente, seit 1.5.0 alle Kacheln):
      // das Element wird umrandet, seine Kachel traegt das Schild.
      const ctl = String(this._themeSpot || "").indexOf("ctl:") === 0 ? this._themeSpot.slice(4) : "";
      root.querySelectorAll('[data-stage="theme"] [data-ctl][data-ctl-on]').forEach((el) => el.removeAttribute("data-ctl-on"));
      const one = ctl
        ? this._ctlEl && this._ctlEl.isConnected && this._ctlEl.dataset.ctl === ctl
          ? this._ctlEl
          : root.querySelector(`[data-stage="theme"] [data-ctl="${CSS.escape(ctl)}"]`)
        : null;
      const spot = ctl
        ? one && one.closest("[data-spot]")
        : root.querySelector(`[data-stage="theme"] [data-spot="${CSS.escape(this._themeSpot || "")}"]`);
      if (spot) {
        const tile = t[`spot_${spot.dataset.spot}`] || "";
        mark(spot, ctl ? `${tile}: ${this._ctlLabel(ctl)}` : t[`spot_${this._themeSpot}`] || "");
      }
      if (one) {
        one.setAttribute("data-ctl-on", "");
      }
      const topic = this._secs.settings;
      const labels = {
        menu: t.settings_icons_title_short,
        favorites: t.favorites_title,
        monitor: t.monitor_title,
        list: t.pane_list,
        tables: t.pane_tables,
      };
      const targets = [...root.querySelectorAll(`[data-stage="settings"] [data-spot="${CSS.escape(topic || "")}"]`)]
        .filter((el) => !el.hidden && el.childElementCount + (el.textContent.trim() ? 1 : 0) > 0);
      if (targets.length) {
        mark(targets[0], labels[topic] || "");
        targets.slice(1).forEach((el) => el.setAttribute("data-sel", ""));
      }
      const bar = root.querySelector("#header-preview .hpv-bar");
      if (bar) {
        bar.setAttribute("data-sel", "");
      }
    }

    /**
     * Einfach / Alle auf der Kopfzeilen-Seite: "Einfach" klappt nur die im
     * Vorschaubild gewaehlte Gruppe auf, "Alle Felder" alle Gruppen. Wird
     * beim Umschalten und beim Klick ins Vorschaubild aufgerufen, nicht bei
     * jeder Aenderung - sonst klappte es Gruppen zu, die man gerade
     * selbst geoeffnet hat.
     */
    _applyHeaderView() {
      const root = this.shadowRoot;
      const box = root && root.querySelector('[data-fields="header"]');
      if (!box) {
        return;
      }
      const all = this._headerView === "all";
      box.dataset.view = all ? "all" : "simple";
      const current = String(this._secs.header || "color");
      box.querySelectorAll('.hdr-groups > .grp[data-sec-group="header"]').forEach((grp) => {
        const open = all || grp.dataset.sec === current;
        if (open !== grp.hasAttribute("data-open")) {
          this._setGrp(grp.dataset.grp, open);
        }
      });
    }

    /**
     * Einfach / Alle: auf der Theme-Seite die Gruppen, die nicht zum
     * gewaehlten Element gehoeren. Kopfzeile: _applyHeaderView,
     * Einstellungsseite: alle Themen untereinander (CSS).
     */
    _applyViews() {
      const root = this.shadowRoot;
      if (!root || !this._ready) {
        return;
      }
      [["header", this._headerView], ["settings", this._settingsView]].forEach(([name, view]) => {
        const box = root.querySelector(`[data-fields="${name}"]`);
        if (box) {
          box.dataset.view = view === "all" ? "all" : "simple";
        }
      });
      const theme = root.querySelector('[data-fields="theme"]');
      if (theme) {
        theme.dataset.view = this._themeView === "all" ? "all" : "simple";
        const related = this._spotGroups(this._themeSpot);
        theme.querySelectorAll('.grp[data-sec-group="theme"]').forEach((grp) => {
          grp.toggleAttribute("data-related", related.indexOf(Number(grp.dataset.sec)) >= 0);
        });
      }
      root.querySelectorAll(".seg[data-view] button[data-value]").forEach((button) => {
        const kind = button.closest(".seg").dataset.view;
        const now = kind === "header" ? this._headerView : kind === "settings" ? this._settingsView : this._themeView;
        button.toggleAttribute("data-active", button.dataset.value === (now === "all" ? "all" : "simple"));
      });
    }

    /* -------------------------------------------- ungespeicherte Aenderungen */

    /** Wie die Eintraege nach dem gespeicherten Stand sortiert waeren. */
    _savedOrder() {
      const keys = this._entries.map((entry) => entry.key);
      const known = new Set(keys);
      const order = (this._saved.order || []).filter((key, i, all) => known.has(key) && all.indexOf(key) === i);
      return order.concat(keys.filter((key) => order.indexOf(key) < 0));
    }

    /** Zahl der geaenderten Werte je Bereich. */
    _changeCounts() {
      const now = this._config;
      const before = this._saved;
      const layout = countDiff(before.layout, now.layout);
      let look = countDiff(before.appearance, now.appearance);
      let items = 0;
      const shown = new Set(this._entries.map((entry) => entry.key));
      const keys = new Set(Object.keys(now.items || {}).concat(Object.keys(before.items || {})));
      keys.forEach((key) => {
        if (shown.has(key) ? this._entryChanged(key) : stableJson((now.items || {})[key]) !== stableJson((before.items || {})[key])) {
          items += 1;
        }
      });
      if (this._loaded && stableJson(this._entries.map((entry) => entry.key)) !== stableJson(this._savedOrder())) {
        items += 1;
      }
      const bt = before.theme || {};
      const at = now.theme || {};
      // Die Kopfzeilen- und Seitenleisten-Variablen des Themes stehen auf den
      // Seiten Header und Sidebar > Aussehen und zaehlen dort.
      const varsOf = (name) => (THEME_GROUPS.find((group) => group.en === name) || { fields: [] }).fields.map((field) => field[0]);
      const changedOf = (keys) => ["dark", "light"].reduce((n, mode) => n + keys.filter((key) =>
        stableJson((bt[mode] || {})[key]) !== stableJson((at[mode] || {})[key])).length, 0);
      const headTheme = changedOf(varsOf("Header"));
      const sideTheme = changedOf(varsOf("Sidebar"));
      const theme = countDiff(bt, at, ["dark", "light"]) + countDiff(bt.dark, at.dark) + countDiff(bt.light, at.light) - headTheme - sideTheme;
      const header = countDiff(before.header, now.header) + headTheme;
      const settings = countDiff(before.settings, now.settings);
      const general = countDiff(before.advanced, now.advanced);
      look += sideTheme;
      const sidebar = layout + items + look;
      return {
        layout, items, look, sidebar, theme, header, settings, general,
        total: sidebar + theme + header + settings + general,
      };
    }

    /** Den gespeicherten Wert eines Pfads lesen. */
    _readSaved(path) {
      return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), this._saved);
    }

    /** Ein Wert, wie er im Hinweis "vorher ..." steht. */
    _shownValue(input, value) {
      const t = this._t;
      if (value === undefined || value === null || value === "" || (input.hasAttribute("data-blank") && Number(value) < 0)) {
        return t.was_empty;
      }
      if (typeof value === "boolean") {
        return value ? t.was_on : t.was_off;
      }
      if (input.tagName === "SELECT") {
        const option = [...input.options].find((one) => one.value === String(value));
        if (option) {
          return option.textContent;
        }
      }
      const text = String(value);
      return text.length > 22 ? `${text.slice(0, 20)}…` : text;
    }

    /** Einen Feldhalter als geaendert markieren (Punkt, "vorher ..."). */
    _markHolder(holder, input, changed, before) {
      if (!holder) {
        return;
      }
      holder.toggleAttribute("data-changed", changed);
      let caption = null;
      if (holder.matches("label.check")) {
        caption = holder.querySelector(":scope > span");
      } else if (holder.matches(".seg-field, label.range")) {
        caption = holder.querySelector(".cap");
      } else if (holder.matches("label.field")) {
        caption = holder.querySelector(":scope > span:first-child");
      }
      if (!caption) {
        return;
      }
      let was = caption.querySelector(":scope > .was");
      if (!changed) {
        if (was) {
          was.remove();
        }
        return;
      }
      if (!was) {
        was = document.createElement("span");
        was.className = "was";
        const sub = caption.querySelector(":scope > .sub, :scope > .var-name, :scope > output");
        caption.insertBefore(was, sub || null);
      }
      const t = this._t;
      was.textContent = holder.matches("label.check") || input.type === "checkbox"
        ? t.changed_short
        : holder.closest(".rows")
          ? t.before_value.replace("{v}", this._shownValue(input, before))
          : t.changed_before.replace("{v}", this._shownValue(input, before));
    }

    /** Alle Felder mit dem gespeicherten Stand vergleichen. */
    _markChanges() {
      const root = this.shadowRoot;
      if (!root || !this._ready) {
        return;
      }
      root.querySelectorAll("[data-bind]").forEach((input) => {
        const path = input.dataset.bind;
        const before = this._readSaved(path);
        const changed = stableJson(this._readPath(path)) !== stableJson(before);
        const holder = input.closest(".seg-field, label.range, label.field, label.check, .btn-toggle");
        if (holder && holder.matches(".btn-toggle")) {
          holder.toggleAttribute("data-changed", changed);
          return;
        }
        this._markHolder(holder, input, changed, before);
      });
      const countsField = root.querySelector("[data-count-items]");
      if (countsField) {
        const now = stableJson((this._config.settings || {}).monitor_counts_items);
        const was = stableJson((this._saved.settings || {}).monitor_counts_items);
        countsField.toggleAttribute("data-changed", now !== was);
      }
      const listCols = root.querySelector("select[data-list-cols]");
      if (listCols) {
        const was = this._listCols(this._saved.settings || {});
        this._markHolder(listCols.closest(".seg-field"), listCols, this._listCols(this._config.settings || {}) !== was, was);
      }
      const box = this._inspector;
      if (box && this._selKey) {
        const key = this._selKey;
        const base = itemDefaults(key);
        const now = Object.assign({}, base, this._config.items[key] || {});
        const before = Object.assign({}, base, (this._saved.items || {})[key] || {});
        box.querySelectorAll("[data-item][data-prop]").forEach((input) => {
          if (input.type === "color") {
            return;
          }
          const prop = input.dataset.prop;
          const changed = stableJson(now[prop]) !== stableJson(before[prop]);
          this._markHolder(input.closest(".seg-field, label.field, label.check"), input, changed, before[prop]);
        });
        box.querySelectorAll(".ctile[data-ctile]").forEach((tile) => {
          const prop = tile.dataset.ctile;
          tile.toggleAttribute("data-changed", stableJson(now[prop]) !== stableJson(before[prop]));
        });
        // Das Icon-Auswahlfeld von Home Assistant traegt keine data-Attribute
        box.querySelectorAll("ha-icon-picker[data-picker]").forEach((picker) => {
          this._markHolder(picker.closest("label.field"), picker, stableJson(now.icon) !== stableJson(before.icon), before.icon);
        });
        const reset = box.querySelector('[data-action="reset-entry"]');
        if (reset) {
          reset.hidden = !this._entryChanged(key);
        }
        const title = box.querySelector(".insp-title strong");
        const entry = this._entries.find((one) => one.key === key);
        if (title && entry) {
          title.textContent = this._entryName(entry);
        }
      }
    }

    /** "n geaendert" an den Gruppen. */
    _sectionCounts() {
      const root = this.shadowRoot;
      const t = this._t;
      const s = this._config.settings;
      const before = this._saved.settings || {};
      const extra = {
        "header:buttons": stableJson(this._config.header.links) !== stableJson(this._saved.header.links) ? 1 : 0,
        "settings:menu-order": ["menu_order", "menu_hidden"].some((key) => stableJson(s[key]) !== stableJson(before[key])) ? 1 : 0,
      };
      root.querySelectorAll(".grp[data-grp]").forEach((grp) => {
        let n = [...grp.querySelectorAll("[data-changed]:not(.btn-toggle)")]
          .filter((el) => !el.closest(".theme-mode[hidden]")).length;
        n += extra[grp.dataset.grp] || 0;
        const badge = grp.querySelector(":scope > .grp-head [data-grp-count]");
        if (badge) {
          badge.textContent = n ? t.n_changed.replace("{n}", n) : "";
        }
      });
      const links = root.getElementById("header-links-count");
      if (links) {
        links.textContent = t.links_of.replace("{n}", (this._config.header.links || []).length).replace("{max}", HEADER_LINKS_MAX);
      }
    }

    /* ----------------------------------------------------- Kleinkram */

    /** Die segmentierten Felder auf den Wert ihres <select> stellen. */
    _syncSegs(scope) {
      const root = scope || this.shadowRoot;
      const listCols = this.shadowRoot.querySelector("select[data-list-cols]");
      if (listCols && this._config && this._config.settings) {
        listCols.value = this._listCols(this._config.settings);
      }
      if (this._config && this._config.settings) {
        const items = Array.isArray(this._config.settings.monitor_counts_items) ? this._config.settings.monitor_counts_items : COUNT_ITEMS;
        this.shadowRoot.querySelectorAll("[data-count-item]").forEach((box) => {
          box.checked = items.indexOf(box.dataset.countItem) >= 0;
        });
      }
      const fields = root.matches && root.matches(".seg-field") ? [root] : root.querySelectorAll(".seg-field");
      fields.forEach((field) => {
        const select = field.querySelector("select");
        if (!select) {
          return;
        }
        field.querySelectorAll(".seg[data-seg] button[data-value]").forEach((button) => {
          button.toggleAttribute("data-active", button.dataset.value === select.value);
        });
      });
    }

    /** Spalten der Liste Geraete & Dienste als "1", "2" oder "3". */
    _listCols(cfg) {
      return cfg && cfg.list_three_columns === true ? "3" : cfg && cfg.list_two_columns === true ? "2" : "1";
    }

    /** Die Zahl neben den Schiebereglern. */
    _syncRanges() {
      this.shadowRoot.querySelectorAll('input[type="range"][data-bind]').forEach((input) => {
        const out = this.shadowRoot.querySelector(`output[data-out-for="${input.dataset.bind}"]`);
        if (out) {
          out.textContent = `${input.value}${input.dataset.unit ? ` ${input.dataset.unit}` : ""}`;
        }
      });
    }

    /** Welche Vorlage der Kopfzeile gerade genau eingestellt ist (Dialog). */
    _syncHeaderPresets() {
      const head = this._config.header || {};
      this.shadowRoot.querySelectorAll("button[data-hpreset]").forEach((button) => {
        const preset = HEADER_PRESETS.find((one) => one.id === button.dataset.hpreset);
        const same =
          !!preset &&
          Object.keys(DEFAULT_HEADER)
            .filter((key) => ["hidden", "position", "links", "show_restart", "show_system", "show_disk"].indexOf(key) < 0)
            .every((key) => {
              const wanted = key in preset.values ? preset.values[key] : DEFAULT_HEADER[key];
              return stableJson(wanted) === stableJson(head[key]);
            });
        button.toggleAttribute("data-current", same);
      });
    }

    /**
     * Textfarbe fuer Flaechen in der Primaerfarbe. Je nach Helligkeit der
     * Primaerfarbe des aktiven Themes hell oder dunkel - --text-primary-color
     * ist nicht in jedem Theme dazu passend gesetzt.
     */
    _applyAccentInk() {
      const root = this.shadowRoot;
      if (!root) {
        return;
      }
      const probe = document.createElement("span");
      probe.style.color = "var(--primary-color, #03a9f4)";
      probe.hidden = true;
      root.appendChild(probe);
      const color = getComputedStyle(probe).color || "";
      probe.remove();
      let rgb = null;
      let m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color);
      if (m) {
        rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
      } else {
        m = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(color);
        if (m) {
          rgb = [Number(m[1]) * 255, Number(m[2]) * 255, Number(m[3]) * 255];
        }
      }
      if (!rgb || rgb.some((v) => !Number.isFinite(v))) {
        return;
      }
      const lum = luminance(rgb.map((v) => Math.min(255, Math.max(0, v))));
      const white = 1.05 / (lum + 0.05);
      const dark = (lum + 0.05) / (luminance([18, 18, 18]) + 0.05);
      this.style.setProperty("--sh-on-accent", white >= dark ? "#ffffff" : "#121212");
    }

    /* --------------------------------------------------------- Suche */

    /** Der reine Text einer Beschriftung, ohne Hinweise und Markierungen. */
    _labelText(el) {
      if (el.matches(".topic-panel")) {
        return el.dataset.topicTitle || "";
      }
      if (el.matches(".fields-tools .btn, .xfer-title")) {
        const first = el.matches(".xfer-title") ? el.querySelector("span") : el;
        return (first ? first.textContent : "").replace(/\s+/g, " ").trim();
      }
      let cap = el;
      if (el.matches("label.field, label.check")) {
        cap = el.querySelector(":scope > span");
      } else if (el.matches(".seg-field, label.range")) {
        cap = el.querySelector(".cap");
      }
      if (!cap) {
        return "";
      }
      return [...cap.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }

    /** Alle Beschriftungen der Seiten einmal einsammeln. */
    _buildSearch() {
      const root = this.shadowRoot;
      const t = this._t;
      const index = [];
      const seen = new Set();
      root.querySelectorAll(".page[data-page]").forEach((page) => {
        const name = page.dataset.page;
        const meta = this._pageMeta(name);
        const pageCrumb = this._groupOf(name) === "sidebar" ? `${t.tab_sidebar} › ${meta.title}` : meta.title;
        index.push({ el: page, page: name, text: meta.title, extra: meta.eyebrow, crumb: pageCrumb, isPage: true });
        page
          .querySelectorAll("label.field, label.check, .seg-field, label.range, .grp-title, .sub-box > .cap, .card > h2, .card h3, .fields-tools .btn, .topic-panel")
          .forEach((el) => {
            if (el.closest('.theme-mode[data-mode="light"], #inspector, #items, .hlinks, .mlist, .modal, .stage-col, .list-cols-boxes')) {
              return;
            }
            const text = this._labelText(el);
            if (!text) {
              return;
            }
            const variable = el.querySelector(".var-name");
            const sec = el.closest("[data-sec-label]");
            const own = sec === el || (el.matches(".grp-title") && sec && sec.matches(".grp") && el.closest(".grp") === sec);
            const crumb = sec && !own ? `${pageCrumb} › ${sec.dataset.secLabel}` : pageCrumb;
            const id = `${text}|${crumb}`;
            if (seen.has(id)) {
              return;
            }
            seen.add(id);
            index.push({ el, page: name, text, extra: variable ? variable.textContent : "", crumb });
          });
      });
      this._searchIndex = index;
    }

    _search(query) {
      const box = this.shadowRoot.getElementById("search-results");
      const q = String(query || "").trim().toLowerCase();
      if (!q) {
        this._closeSearch();
        return;
      }
      const words = q.split(/\s+/);
      const hits = (this._searchIndex || [])
        .map((hit) => {
          const text = hit.text.toLowerCase();
          const all = `${text} ${hit.extra.toLowerCase()} ${hit.crumb.toLowerCase()}`;
          if (!words.every((word) => all.indexOf(word) >= 0)) {
            return null;
          }
          const rank = text.indexOf(q) === 0 ? 0 : text.indexOf(q) > 0 ? 1 : hit.extra.toLowerCase().indexOf(q) >= 0 ? 2 : 3;
          return { hit, rank: rank + (hit.isPage ? -0.5 : 0) };
        })
        .filter(Boolean)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 30)
        .map((one) => one.hit);
      this._hits = hits;
      this._hitIndex = 0;
      box.innerHTML = hits.length
        ? hits
            .map(
              (hit, i) => `
          <button type="button" data-hit="${i}"${i === 0 ? " data-active" : ""}>
            <span>${escapeHtml(hit.text)}${hit.extra ? ` <small class="mono">${escapeHtml(hit.extra)}</small>` : ""}</span>
            <small>${escapeHtml(hit.crumb)}</small>
          </button>`
            )
            .join("")
        : `<div class="empty">${escapeHtml(this._t.search_none)}</div>`;
      const field = this.shadowRoot.getElementById("search-box");
      const app = this.shadowRoot.getElementById("app");
      if (field && app) {
        const r = field.getBoundingClientRect();
        const a = app.getBoundingClientRect();
        const width = Math.min(420, Math.max(r.width, 340), a.width - 16);
        box.style.left = `${Math.max(8, Math.min(r.left - a.left, a.width - width - 8))}px`;
        box.style.top = `${r.bottom - a.top + 6}px`;
        box.style.width = `${width}px`;
      }
      box.hidden = false;
    }

    _closeSearch() {
      const root = this.shadowRoot;
      const box = root && root.getElementById("search-results");
      if (box) {
        box.hidden = true;
      }
      const app = root && root.getElementById("app");
      if (app && !(root.activeElement && root.activeElement.id === "search")) {
        app.removeAttribute("data-searching");
      }
    }

    /** Suchfeld oeffnen - auf Tablet und Handy legt es sich ueber die Kopfleiste. */
    _focusSearch() {
      const root = this.shadowRoot;
      const input = root.getElementById("search");
      if (!input) {
        return;
      }
      root.getElementById("app").setAttribute("data-searching", "");
      window.requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }

    /** Zu einem Treffer springen: Seite, Abschnitt, aufklappen, markieren. */
    _reveal(hit) {
      const root = this.shadowRoot;
      let el = hit.el;
      const input = root.getElementById("search");
      if (input) {
        input.value = "";
        input.blur();
      }
      root.getElementById("app").removeAttribute("data-searching");
      this._closeSearch();
      this._selectTab(hit.page);
      if (hit.isPage) {
        return;
      }
      const bind = el.querySelector && el.querySelector('[data-bind^="theme."]');
      if (bind) {
        const path = bind.dataset.bind.replace(/^theme\.(dark|light)\./, `theme.${this._mode}.`);
        const other = root.querySelector(`[data-bind="${path}"]`);
        if (other) {
          el = other.closest("label.field, label.check, .seg-field, label.range") || el;
        }
      }
      const sec = el.closest("[data-sec-group]");
      if (sec) {
        this._selectSection(sec.dataset.secGroup, sec.dataset.sec, false);
      }
      let grp = el.closest(".grp:not([data-open])");
      while (grp) {
        this._setGrp(grp.dataset.grp, true);
        grp = el.closest(".grp:not([data-open])");
      }
      let target = el;
      while (target && target.closest("[hidden]")) {
        target = target.closest("[hidden]").parentElement;
      }
      if (!target) {
        return;
      }
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center" });
        target.classList.remove("flash-hit");
        void target.offsetWidth;
        target.classList.add("flash-hit");
        window.setTimeout(() => target.classList.remove("flash-hit"), 1700);
        const field = target.querySelector('input[type="text"], input[type="number"], textarea');
        if (field && field.offsetParent) {
          field.focus({ preventScroll: true });
        }
      });
    }

    /* --------------------------------------------- Theme: Gruppen, Dialoge */

    /** Alle Werte einer Gruppe im bearbeiteten Modus leeren. */
    _clearGroup(index) {
      const group = THEME_GROUPS[index];
      if (!group) {
        return;
      }
      const values = this._config.theme[this._mode];
      group.fields.forEach((field) => {
        values[field[0]] = "";
      });
      Object.keys(THEME_EXTRAS).forEach((key) => {
        if ((group.id === "cards" && key.indexOf("card_") === 0) || (group.id === "dashboard" && key.indexOf("dash_") === 0)) {
          values[key] = THEME_EXTRAS[key];
        }
      });
      this._fillInputs();
      this._touch();
    }

    _openPalette() {
      const root = this.shadowRoot;
      root.getElementById("palette-modal").hidden = false;
      this._paletteShow();
      root.getElementById("palette-hex").focus();
    }

    /** Die Farbstreifen der Palette nach den Eingaben im Dialog. */
    _paletteInput() {
      const root = this.shadowRoot;
      return generatePalette(root.getElementById("palette-hex").value, {
        tint: root.getElementById("palette-tint").value,
        accent: root.getElementById("palette-accent").value,
      });
    }

    _paletteShow() {
      const root = this.shadowRoot;
      const palette = this._paletteInput();
      const error = root.getElementById("palette-error");
      const rows = root.getElementById("palette-swatches");
      error.hidden = !!palette;
      error.textContent = palette ? "" : this._t.palette_bad;
      root.getElementById("palette-apply").disabled = !palette;
      if (!palette) {
        return;
      }
      const chips = ["primary-color", "accent-color", "primary-background-color", "card-background-color",
        "primary-text-color"];
      rows.innerHTML = ["dark", "light"].map((mode) => `
        <div class="palette-row" data-mode="${mode}">
          <span>${escapeHtml(mode === "dark" ? this._t.palette_dark : this._t.palette_light)}</span>
          <span class="chips">${chips.map((key) =>
            `<i data-key="${key}" title="${key}" style="background:${palette[mode][key]}"></i>`).join("")}</span>
        </div>`).join("");
      const dot = root.querySelector("#open-palette .dot-sw");
      if (dot) {
        dot.style.background = palette.dark["primary-color"] || "";
      }
    }

    _openPresets() {
      const root = this.shadowRoot;
      this._presetPick = null;
      root.querySelectorAll("#presets-modal [data-preset]").forEach((button) => button.removeAttribute("data-active"));
      const apply = root.getElementById("preset-apply");
      apply.disabled = true;
      apply.textContent = this._t.preset_apply;
      root.getElementById("presets-modal").hidden = false;
    }

    _pickPreset(id) {
      const preset = THEME_PRESETS.find((one) => one.id === id);
      if (!preset) {
        return;
      }
      this._presetPick = id;
      const root = this.shadowRoot;
      root.querySelectorAll("#presets-modal [data-preset]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.preset === id);
      });
      const apply = root.getElementById("preset-apply");
      apply.disabled = false;
      apply.textContent = this._t.preset_apply_name.replace("{name}", this._de ? preset.de : preset.en);
    }

    /* ------------------------------------------- Kopfzeile: Vorlagen */

    _openHeaderPresets() {
      const root = this.shadowRoot;
      this._hpresetPick = null;
      root.querySelectorAll("#hpresets-modal [data-hpreset]").forEach((button) => button.removeAttribute("data-active"));
      const apply = root.getElementById("hpreset-apply");
      apply.disabled = true;
      apply.textContent = this._t.preset_apply;
      this._syncHeaderPresets();
      root.getElementById("hpresets-modal").hidden = false;
    }

    _pickHeaderPreset(id) {
      const preset = HEADER_PRESETS.find((one) => one.id === id);
      if (!preset) {
        return;
      }
      this._hpresetPick = id;
      const root = this.shadowRoot;
      root.querySelectorAll("#hpresets-modal [data-hpreset]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.hpreset === id);
      });
      const apply = root.getElementById("hpreset-apply");
      apply.disabled = false;
      apply.textContent = this._t.preset_apply_name.replace("{name}", this._de ? preset.de : preset.en);
    }

    /** Der Wert einer Entitaet, wie Home Assistant ihn anzeigt (1.5.4). */
    _sensorText(entity) {
      const hass = this._hass;
      const stateObj = hass && hass.states ? hass.states[entity] : null;
      if (!stateObj) {
        return "\u2013";
      }
      const unit = stateObj.attributes && stateObj.attributes.unit_of_measurement;
      let text = unit ? `${stateObj.state} ${unit}` : String(stateObj.state);
      if (typeof hass.formatEntityState === "function") {
        try {
          text = hass.formatEntityState(stateObj) || text;
        } catch (err) {
          /* Rohwert */
        }
      }
      return text;
    }

    /* --------------------------------------- Seitenleiste: Export und Import */

    /** Layout, Eintraege und Aussehen der Seitenleiste als .json-Datei. */
    _exportSidebar() {
      this._config.order = this._entries.map((entry) => entry.key);
      const text = JSON.stringify(
        {
          version: VERSION,
          sidebar: {
            layout: this._config.layout,
            appearance: this._config.appearance,
            order: this._config.order,
            items: this._config.items,
          },
        },
        null,
        2
      );
      this._download(text, "application/json", `ha-style-hub-sidebar-${new Date().toISOString().slice(0, 10)}.json`);
      this._flash(this._t.export_done);
    }

    /** Eine Datei herausgeben (Safari folgt dem Klick nur im Dokument). */
    _download(text, type, name) {
      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    _importSidebar() {
      const root = this.shadowRoot;
      root.getElementById("sidebar-text").value = "";
      root.getElementById("sidebar-file").value = "";
      this._modalError("sidebar-modal", "");
      root.getElementById("sidebar-modal").hidden = false;
      root.getElementById("sidebar-text").focus();
    }

    _modalError(id, text) {
      const box = this.shadowRoot.querySelector(`#${id} .modal-error`);
      if (box) {
        box.textContent = text;
        box.hidden = !text;
      }
    }

    /**
     * Den eingefuegten Text lesen und die Seitenleiste daraus fuellen.
     * Angenommen wird ein Export von hier ({version, sidebar}) und ein
     * kompletter Export, von dem nur Layout, Aussehen, Eintraege und
     * Reihenfolge gelesen werden. "Sidebar ausblenden" bleibt, wie es ist -
     * es ist ein Schalter, kein Aussehen (wie "Kopfzeile ausblenden").
     */
    _applySidebarImport() {
      const t = this._t;
      const text = this.shadowRoot.getElementById("sidebar-text").value.trim();
      if (!text) {
        this._modalError("sidebar-modal", t.sidebar_import_empty);
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        this._modalError("sidebar-modal", String(err.message || err));
        return;
      }
      const raw = isObject(parsed) && isObject(parsed.sidebar) ? parsed.sidebar : parsed;
      const parts = ["layout", "appearance", "items", "order"];
      if (!isObject(raw) || !parts.some((name) => name in raw)) {
        this._modalError("sidebar-modal", t.sidebar_import_empty);
        return;
      }
      const merged = clone(this._config);
      parts.forEach((name) => {
        if (name in raw) {
          merged[name] = raw[name];
        }
      });
      const next = normalize(merged);
      next.layout.hide_sidebar = this._config.layout.hide_sidebar;
      this._config = next;
      this._themeSynced = null;
      this.shadowRoot.getElementById("sidebar-modal").hidden = true;
      this._syncEntries(true);
      this._fillInputs();
      this._touch();
      this._flash(t.sidebar_import_done);
    }

    /* ------------------------------------------- Liste der Aenderungen (1.4.8) */

    /** Die Beschriftung und der Ort eines Felds, so wie es im Panel steht. */
    _fieldInfo(path) {
      const root = this.shadowRoot;
      const t = this._t;
      const pageLabels = {
        layout: t.tab_sidebar, items: t.tab_sidebar, look: t.tab_sidebar,
        theme: t.tab_theme, header: t.tab_header, settings: t.tab_settings,
      };
      const input = root.querySelector(`[data-bind="${CSS.escape(path)}"]`);
      const holder = input && input.closest(".seg-field, label.range, label.field, label.check, .btn-toggle");
      let label = "";
      if (holder) {
        const caption = holder.matches("label.check")
          ? holder.querySelector(":scope > span")
          : holder.matches(".seg-field, label.range")
            ? holder.querySelector(".cap")
            : holder.querySelector(":scope > span:first-child") || holder;
        if (caption) {
          const copy = caption.cloneNode(true);
          copy.querySelectorAll(".was, .sub, .var-name, output").forEach((x) => x.remove());
          label = copy.textContent.replace(/\s+/g, " ").trim();
        }
      }
      const page = input && input.closest(".page[data-page]");
      const grp = input && input.closest(".grp[data-grp]");
      const topic = input && input.closest(".topic-panel[data-topic-title]");
      const where = grp
        ? grp.querySelector(":scope > .grp-head .grp-title").textContent.trim()
        : topic ? topic.dataset.topicTitle : "";
      const section = path.split(".")[0];
      const fallbackPage = { layout: "layout", appearance: "look", theme: "theme", header: "header", settings: "settings" }[section] || "";
      const pageName = page ? page.dataset.page : fallbackPage;
      return {
        label: label || path.split(".").slice(-1)[0],
        where,
        page: pageName,
        pageLabel: pageLabels[pageName] || t.area_general,
        holder,
      };
    }

    /** Alle Aenderungen gegenueber dem gespeicherten Stand, Feld fuer Feld. */
    _changeList() {
      const rows = [];
      const now = this._config;
      const before = this._saved;
      const differs = (a, b) => stableJson(a) !== stableJson(b);
      const walk = (section, prefix) => {
        const a = (before[section] || {});
        const b = (now[section] || {});
        new Set(Object.keys(a).concat(Object.keys(b))).forEach((key) => {
          if (prefix === "theme" && (key === "dark" || key === "light")) {
            return;
          }
          if (differs(a[key], b[key])) {
            rows.push({ kind: "path", path: `${prefix}.${key}`, before: a[key], now: b[key] });
          }
        });
      };
      walk("layout", "layout");
      walk("appearance", "appearance");
      walk("theme", "theme");
      ["dark", "light"].forEach((mode) => {
        const a = ((before.theme || {})[mode]) || {};
        const b = ((now.theme || {})[mode]) || {};
        new Set(Object.keys(a).concat(Object.keys(b))).forEach((key) => {
          if (differs(a[key], b[key])) {
            rows.push({ kind: "path", path: `theme.${mode}.${key}`, before: a[key], now: b[key], mode });
          }
        });
      });
      walk("header", "header");
      walk("settings", "settings");
      walk("advanced", "advanced");
      // Eintraege der Seitenleiste
      const shown = new Set(this._entries.map((entry) => entry.key));
      new Set(Object.keys(now.items || {}).concat(Object.keys(before.items || {}))).forEach((key) => {
        const changed = shown.has(key)
          ? this._entryChanged(key)
          : differs((now.items || {})[key], (before.items || {})[key]);
        if (changed) {
          const entry = this._entries.find((one) => one.key === key);
          rows.push({ kind: "entry", key, name: entry ? this._entryName(entry) : key });
        }
      });
      if (this._loaded && differs(this._entries.map((entry) => entry.key), this._savedOrder())) {
        rows.push({ kind: "order" });
      }
      return rows.map((row) => Object.assign(row, row.kind === "path" ? this._fieldInfo(row.path) : {
        label: row.kind === "entry" ? row.name : this._t.changes_order,
        where: row.kind === "entry" ? this._t.changes_entry : this._t.tab_items,
        page: "items",
        pageLabel: this._t.tab_sidebar,
      }));
    }

    /** Ein Wert fuer die Liste: Farbe mit Kaestchen, an/aus, leer, gekuerzt. */
    _changeValue(value) {
      const t = this._t;
      if (value === undefined || value === null || value === "") {
        return `<span class="chg-empty">${escapeHtml(t.was_empty)}</span>`;
      }
      if (typeof value === "boolean") {
        return escapeHtml(value ? t.was_on : t.was_off);
      }
      if (Array.isArray(value)) {
        return escapeHtml(t.changes_list_n.replace("{n}", value.length));
      }
      if (typeof value === "object") {
        return "…";
      }
      const text = String(value);
      const swatch = parsePaletteColor(text) || /^(rgba?|hsla?)\(/i.test(text)
        ? `<i class="chg-sw" style="background:${escapeHtml(cssValue(text))}"></i>` : "";
      return `${swatch}<span>${escapeHtml(text.length > 42 ? `${text.slice(0, 40)}…` : text)}</span>`;
    }

    /** Der Dialog mit allen ungespeicherten Aenderungen. */
    _openChanges() {
      const root = this.shadowRoot;
      const t = this._t;
      const rows = this._changeList();
      this._changeRows = rows;
      const list = root.getElementById("changes-list");
      const title = root.getElementById("changes-count");
      if (title) {
        title.textContent = rows.length ? `(${rows.length})` : "";
      }
      if (list) {
        const pages = [];
        rows.forEach((row, index) => {
          let page = pages.find((one) => one.label === row.pageLabel);
          if (!page) {
            page = { label: row.pageLabel, rows: [] };
            pages.push(page);
          }
          page.rows.push([row, index]);
        });
        list.innerHTML = rows.length
          ? pages.map((page) => `
            <li class="chg-page"><h3>${escapeHtml(page.label)}</h3><ul>${page.rows.map(([row, index]) => `
              <li class="chg-row">
                <div class="chg-main">
                  <strong>${escapeHtml(row.label)}</strong>
                  <span class="chg-where">${escapeHtml([row.where, row.mode ? (row.mode === "dark" ? t.theme_mode_dark : t.theme_mode_light) : ""].filter(Boolean).join(" · "))}</span>
                </div>
                <div class="chg-vals">${row.kind === "path"
                  ? `<span class="chg-old">${this._changeValue(row.before)}</span><span class="chg-arrow">→</span><span class="chg-new">${this._changeValue(row.now)}</span>`
                  : `<span class="chg-new">${escapeHtml(t.changed_short)}</span>`}</div>
                <div class="chg-act">
                  ${row.holder || row.kind !== "path" ? `<button type="button" class="flat" data-chg-show="${index}">${escapeHtml(t.changes_show)}</button>` : ""}
                  <button type="button" class="flat" data-chg-reset="${index}">${escapeHtml(t.changes_reset)}</button>
                </div>
              </li>`).join("")}</ul></li>`).join("")
          : `<li class="chg-none">${escapeHtml(t.all_saved)}</li>`;
      }
      const modal = root.getElementById("changes-modal");
      if (modal) {
        modal.hidden = false;
      }
    }

    _closeChanges() {
      const modal = this.shadowRoot.getElementById("changes-modal");
      if (modal) {
        modal.hidden = true;
      }
    }

    /** Eine Aenderung zuruecknehmen (nur sie). */
    _resetChange(index) {
      const row = (this._changeRows || [])[index];
      if (!row) {
        return;
      }
      if (row.kind === "entry") {
        this._resetEntry(row.key);
      } else if (row.kind === "order") {
        this._config.order = clone(this._saved.order || []);
        this._syncEntries(true);
        this._renderItems();
      } else {
        const parts = row.path.split(".");
        let target = this._config;
        for (let i = 0; i < parts.length - 1; i += 1) {
          target[parts[i]] = target[parts[i]] || {};
          target = target[parts[i]];
        }
        const key = parts[parts.length - 1];
        if (row.before === undefined) {
          delete target[key];
        } else {
          target[key] = clone(row.before);
        }
        // Listen (Links, Favoriten, Menuepunkte) neu zeichnen
        this._renderLinkList("header");
        this._renderLinkList("favorites");
        this._renderMenuEntries();
      }
      this._fillInputs();
      this._touch();
      this._openChanges();
    }

    /** Zu einer Aenderung springen. */
    _showChange(index) {
      const row = (this._changeRows || [])[index];
      if (!row) {
        return;
      }
      this._closeChanges();
      if (row.kind !== "path") {
        this._selectTab("items");
        if (row.kind === "entry" && typeof this._selectEntry === "function") {
          this._selectEntry(row.key);
        }
        return;
      }
      if (row.mode && row.mode !== this._mode && /^theme\./.test(row.path)) {
        this._mode = row.mode;
        this._applyMode();
        this._updatePreview();
      }
      const info = this._fieldInfo(row.path);
      if (info.holder) {
        this._reveal({ el: info.holder, page: info.page });
      }
    }

    /* ------------------------------------------------ Kontrast (1.4.8) */

    /**
     * Text auf Hintergrund: unter jedem Textfeld, dessen Kontrast zu seinem
     * Hintergrund unter 4,5 : 1 liegt (WCAG AA fuer normalen Text), steht
     * ein Hinweis. Nur, wenn eine der beiden Farben selbst gesetzt ist.
     */
    _checkContrast() {
      const root = this.shadowRoot;
      if (!root || !this._config || !this._config.theme) {
        return;
      }
      const t = this._t;
      ["dark", "light"].forEach((mode) => {
        const values = this._config.theme[mode] || {};
        const fallback = THEME_FALLBACK[mode] || {};
        const scale = (() => {
          const own = primaryPalette(values["primary-color"]);
          return Object.keys(own).length ? own : HA_PRIMARY_SCALE;
        })();
        const refs = TOKEN_PRIMARY_REFS[mode] || {};
        const value = (key) => {
          const own = String(values[key] || "").trim();
          if (own) return own;
          if (refs[key]) return scale[`ha-color-primary-${refs[key]}`];
          return fallback[key] || "";
        };
        const base = mode === "dark" ? [17, 17, 17] : [250, 250, 250];
        // Je Textfarbe der schlechteste Kontrast ueber alle ihre Hintergruende
        const worst = {};
        CONTRAST_PAIRS.forEach(([fg, bg, under]) => {
          if (!(fg in worst)) {
            worst[fg] = null;
          }
          const set = !!String(values[fg] || "").trim() || !!String(values[bg] || "").trim();
          if (!set) {
            return;
          }
          const ground = colorOver(value(under || "card-background-color"), base) || base;
          const back = colorOver(value(bg), ground);
          const front = back && colorOver(value(fg), back);
          const ratio = back && front ? contrastRatio(front, back) : null;
          if (ratio !== null && (!worst[fg] || ratio < worst[fg].ratio)) {
            worst[fg] = { ratio, bg };
          }
        });
        Object.keys(worst).forEach((fg) => {
          const hit = worst[fg];
          root.querySelectorAll(`[data-bind="theme.${mode}.${CSS.escape(fg)}"]`).forEach((input) => {
            const holder = input.closest("label.field");
            if (!holder) return;
            let warn = holder.nextElementSibling && holder.nextElementSibling.matches(".contrast-warn") ? holder.nextElementSibling : null;
            if (!hit || hit.ratio >= 4.5) {
              if (warn) warn.remove();
              return;
            }
            if (!warn) {
              warn = document.createElement("div");
              warn.className = "contrast-warn";
              holder.after(warn);
            }
            warn.textContent = t.contrast_warn
              .replace("{r}", hit.ratio.toFixed(1).replace(".", this._de ? "," : "."))
              .replace("{bg}", this._fieldInfo(`theme.${mode}.${hit.bg}`).label);
          });
        });
      });
    }

    /* --------------------------------------- Farben zur Schnellwahl (1.4.8) */

    /** Die Farben, die schon im Spiel sind: eigenes Theme, Seiten, zuletzt benutzt. */
    _quickColors() {
      const seen = new Set();
      const own = [];
      const add = (raw) => {
        const text = String(raw || "").trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key) || !(parsePaletteColor(text) || /^(rgba?|hsla?)\(/i.test(text))) return;
        seen.add(key);
        own.push(text);
      };
      const theme = (this._config.theme || {})[this._mode] || {};
      ["primary-color", "accent-color", "primary-background-color", "card-background-color", "primary-text-color",
        "secondary-text-color", "error-color", "warning-color", "success-color", "info-color"].forEach((key) => add(theme[key]));
      Object.keys(theme).forEach((key) => add(theme[key]));
      const look = this._config.appearance || {};
      Object.keys(look).forEach((key) => /color|background/.test(key) && add(look[key]));
      const head = this._config.header || {};
      Object.keys(head).forEach((key) => /color|background/.test(key) && add(head[key]));
      const recent = readRecentColors().filter((one) => !seen.has(one.toLowerCase()));
      return { own: own.slice(0, 16), recent: recent.slice(0, 8) };
    }

    /** Die Schnellwahl unter einem Farbfeld zeigen. */
    _showQuickColors(input) {
      const pop = this.shadowRoot.getElementById("qc-pop");
      if (!pop || !input) {
        return;
      }
      const t = this._t;
      const { own, recent } = this._quickColors();
      const chips = (list) => list.map((one) => `<button type="button" class="qc" data-qc="${escapeHtml(one)}" title="${escapeHtml(one)}" style="--qc:${escapeHtml(cssValue(one))}"></button>`).join("");
      // Immer dabei (1.5.1): "transparent" - nicht jeder weiss, dass ein
      // Farbfeld auch durchsichtig sein kann.
      const special = `<span class="qc-cap">${escapeHtml(t.qc_special)}</span><div class="qc-row"><button type="button" class="qc-named" data-qc="transparent" title="transparent"><i class="qc" style="--qc:transparent"></i><span>transparent</span></button></div>`;
      pop.innerHTML = special + (own.length ? `<span class="qc-cap">${escapeHtml(t.qc_theme)}</span><div class="qc-row">${chips(own)}</div>` : "") +
        (recent.length ? `<span class="qc-cap">${escapeHtml(t.qc_recent)}</span><div class="qc-row">${chips(recent)}</div>` : "");
      this._qcInput = input;
      pop.hidden = false;
      const r = input.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 16);
      pop.style.width = `${width}px`;
      pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`;
      const below = r.bottom + 6;
      const height = pop.offsetHeight;
      pop.style.top = `${below + height > window.innerHeight - 8 ? Math.max(8, r.top - height - 6) : below}px`;
    }

    _hideQuickColors() {
      const pop = this.shadowRoot && this.shadowRoot.getElementById("qc-pop");
      if (pop) {
        pop.hidden = true;
      }
      this._qcInput = null;
    }

    /** Eine Farbe in die Liste "zuletzt benutzt" aufnehmen. */
    _rememberColor(raw) {
      const text = String(raw || "").trim();
      if (!text || !(parsePaletteColor(text) || /^(rgba?|hsla?)\(/i.test(text))) {
        return;
      }
      const list = readRecentColors().filter((one) => one.toLowerCase() !== text.toLowerCase());
      list.unshift(text);
      writeRecentColors(list.slice(0, 12));
    }

    /* ---------------------------------- Systemmonitor: eigene Werte (1.4.8) */

    _renderSensorList() {
      const root = this.shadowRoot;
      const list = root.getElementById("sensor-list");
      if (!list) {
        return;
      }
      const t = this._t;
      const sensors = this._config.settings.monitor_sensors || [];
      const states = (this._hass && this._hass.states) || {};
      list.innerHTML = sensors.map((one, index) => {
        const state = states[one.entity];
        const unit = state && state.attributes && state.attributes.unit_of_measurement;
        const now = state ? `${state.state}${unit ? ` ${unit}` : ""}` : t.monitor_sensor_missing;
        return `
          <li class="sensor-row" data-index="${index}">
            <label class="field">
              <span>${escapeHtml(t.monitor_sensor_entity)}</span>
              <input type="text" list="sh-entities" data-sensor="entity" value="${escapeHtml(one.entity)}" placeholder="sensor.cpu_temperature" spellcheck="false" />
            </label>
            <label class="field">
              <span>${escapeHtml(t.monitor_sensor_name)}</span>
              <input type="text" data-sensor="name" maxlength="40" value="${escapeHtml(one.name || "")}"
                placeholder="${escapeHtml((state && state.attributes && state.attributes.friendly_name) || t.monitor_sensor_name_auto)}" />
            </label>
            <div class="sensor-foot">
              <small class="sensor-now">${escapeHtml(now)}</small>
              <button class="icon-btn" data-saction="up" ${index === 0 ? "disabled" : ""} title="up">${glyph("mdi:arrow-up", "&#9650;")}</button>
              <button class="icon-btn" data-saction="down" ${index === sensors.length - 1 ? "disabled" : ""} title="down">${glyph("mdi:arrow-down", "&#9660;")}</button>
              <button class="icon-btn warn" data-saction="remove" title="${escapeHtml(t.monitor_sensor_remove)}">${glyph("mdi:trash-can-outline", "&#10005;")}</button>
            </div>
          </li>`;
      }).join("") || `<li class="sensor-empty">${escapeHtml(t.monitor_sensors_empty)}</li>`;
      const count = root.getElementById("sensor-count");
      if (count) {
        count.textContent = `${sensors.length} / ${MONITOR_SENSORS_MAX}`;
      }
      const add = root.getElementById("add-sensor");
      if (add) {
        add.disabled = sensors.length >= MONITOR_SENSORS_MAX;
      }
      // Vorschlaege: Entitaeten mit Zahlenwerten zuerst
      const datalist = root.getElementById("sh-entities");
      if (datalist && !datalist.childElementCount && Object.keys(states).length) {
        const ids = Object.keys(states)
          .filter((id) => /^(sensor|binary_sensor|input_number|number|counter|input_text|climate|weather)\./.test(id))
          .sort();
        datalist.innerHTML = ids.slice(0, 3000).map((id) => {
          const name = states[id].attributes && states[id].attributes.friendly_name;
          return `<option value="${escapeHtml(id)}">${escapeHtml(name || "")}</option>`;
        }).join("");
      }
    }

    _sensorAction(index, action) {
      const list = (this._config.settings.monitor_sensors || []).slice();
      if (action === "add") {
        if (list.length >= MONITOR_SENSORS_MAX) {
          return;
        }
        list.push({ entity: "", name: "" });
      } else if (action === "remove") {
        list.splice(index, 1);
      } else {
        const to = action === "up" ? index - 1 : index + 1;
        if (to < 0 || to >= list.length) {
          return;
        }
        [list[index], list[to]] = [list[to], list[index]];
      }
      this._config.settings.monitor_sensors = list;
      this._renderSensorList();
      this._touch();
      if (action === "add") {
        const rows = this.shadowRoot.querySelectorAll("#sensor-list .sensor-row");
        const last = rows[rows.length - 1];
        const field = last && last.querySelector('[data-sensor="entity"]');
        if (field) {
          field.focus();
        }
      }
    }

    /** Ein Feld eines eigenen Werts: gespeichert wird nur eine gueltige Entitaet. */
    _setSensor(index, prop, value) {
      const list = (this._config.settings.monitor_sensors || []).slice();
      if (!list[index]) {
        return;
      }
      list[index] = Object.assign({}, list[index], { [prop]: value.trim() });
      this._config.settings.monitor_sensors = list;
      this._touch();
    }

    /** Die eigenen Werte in der Vorschau des Systemmonitors. */
    _updateSensorPreview(cfg) {
      const box = this.shadowRoot.getElementById("monitor-preview");
      const grid = box && box.querySelector(".mpv-grid");
      if (!grid) {
        return;
      }
      grid.querySelectorAll('.mpv-cell[data-kind="sensor"]').forEach((cell) => cell.remove());
      const sensors = (cfg.monitor_sensors || []).filter((one) => one && one.entity);
      box.toggleAttribute("data-many", sensors.length > 0);
      box.toggleAttribute("data-own-only", cfg.monitor_sensors_only === true && sensors.length > 0);
      const states = (this._hass && this._hass.states) || {};
      sensors.forEach((one) => {
        const state = states[one.entity];
        const attrs = (state && state.attributes) || {};
        const cell = document.createElement("div");
        cell.className = "mpv-cell";
        cell.dataset.kind = "sensor";
        const value = state ? state.state : "–";
        cell.innerHTML = `<span class="mpv-label"></span><span class="mpv-value"><span class="mpv-num"></span><span class="mpv-unit"></span></span><span class="mpv-sub"></span>`;
        cell.querySelector(".mpv-label").textContent = one.name || attrs.friendly_name || one.entity;
        cell.querySelector(".mpv-num").textContent = value;
        cell.querySelector(".mpv-unit").textContent = attrs.unit_of_measurement || "";
        cell.querySelector(".mpv-sub").textContent = one.entity;
        grid.appendChild(cell);
      });
    }

    /**
     * Ein Bedienelement im Vorschaubild anklicken (1.4.9): rechts gehen alle
     * Gruppen mit seinen Variablen auf, die Felder werden kurz markiert -
     * wie ein Treffer der Suche.
     */
    _selectControl(key, element) {
      const spot = `ctl:${key}`;
      this._ctlEl = element || null;
      const groups = this._spotGroups(spot);
      if (!groups.length) {
        return;
      }
      this._themeSpot = spot;
      this._secs.theme = String(groups[0]);
      THEME_GROUPS.forEach((_, index) => {
        const id = `theme:${index}`;
        if (groups.indexOf(index) < 0 && this._grpOpen[id]) {
          this._setGrp(id, false, id in this._grpUser);
        }
      });
      // Alle Gruppen des Elements offen - auch wenn sonst das Akkordeon nur
      // eine offen laesst.
      const accordion = this._accordion;
      this._accordion = false;
      groups.forEach((index) => this._setGrp(`theme:${index}`, true));
      this._accordion = accordion;
      this._applyViews();
      this._applyStageMarks();
      const root = this.shadowRoot;
      const fields = controlFields(key)
        .map((name) => root.querySelector(`[data-bind="theme.${this._mode}.${name}"]`))
        .filter(Boolean)
        .map((input) => input.closest("label.field, .field") || input);
      if (!fields.length) {
        return;
      }
      window.requestAnimationFrame(() => {
        const body = root.querySelector('[data-fields="theme"] .fields-body');
        const first = fields.find((el) => el.offsetParent);
        if (body && first) {
          body.scrollTop += first.getBoundingClientRect().top - body.getBoundingClientRect().top - 60;
        }
        root.querySelectorAll('[data-fields="theme"] .flash-hit').forEach((el) => el.classList.remove("flash-hit"));
        fields.forEach((el) => {
          el.classList.remove("flash-hit");
          void el.offsetWidth;
          el.classList.add("flash-hit");
        });
        window.clearTimeout(this._ctlTimer);
        this._ctlTimer = window.setTimeout(() => fields.forEach((el) => el.classList.remove("flash-hit")), 1700);
      });
    }

    /* ------------------------------------------- Rueckgaengig (Strg+Z, 1.4.9) */

    /**
     * Nach jeder Aenderung den vorherigen Stand merken. Schnell
     * aufeinanderfolgende Aenderungen im selben Feld (Tippen, Farbwaehler
     * ziehen) sind ein Schritt.
     */
    _undoRecord() {
      if (this._undoing || !this._config) {
        return;
      }
      const now = JSON.stringify(this._config);
      if (this._undoLast === undefined) {
        this._undoLast = JSON.stringify(this._saved || this._config);
      }
      if (now === this._undoLast) {
        return;
      }
      const root = this.shadowRoot;
      const field = root && root.activeElement;
      const at = Date.now();
      const same = field && field === this._undoField && at - (this._undoAt || 0) < 1200;
      if (!same) {
        this._undoStack = (this._undoStack || []).concat([this._undoLast]).slice(-UNDO_MAX);
      }
      this._redoStack = [];
      this._undoField = field || null;
      this._undoAt = at;
      this._undoLast = now;
    }

    /** Neuer Ausgangsstand (geladen, verworfen, zurueckgesetzt). */
    _undoReset() {
      this._undoLast = this._config ? JSON.stringify(this._config) : undefined;
      this._undoField = null;
    }

    /** Einen Schritt zurueck (back = true) oder wieder vor. */
    _undoStep(back) {
      const from = back ? this._undoStack || [] : this._redoStack || [];
      if (!from.length) {
        this._flash(back ? this._t.undo_none : this._t.redo_none);
        return;
      }
      const target = from.pop();
      const current = JSON.stringify(this._config);
      if (back) {
        this._redoStack = (this._redoStack || []).concat([current]).slice(-UNDO_MAX);
      } else {
        this._undoStack = (this._undoStack || []).concat([current]).slice(-UNDO_MAX);
      }
      this._undoing = true;
      try {
        this._config = normalize(JSON.parse(target));
        this._undoLast = target;
        this._undoField = null;
        this._syncEntries(true);
        this._fillInputs();
        this._renderItems && this._renderItems();
        this._touch();
      } finally {
        this._undoing = false;
      }
      this._flash(back ? this._t.undo_done : this._t.redo_done);
    }

    /** Name eines anklickbaren Elements fuer das Schild im Vorschaubild. */
    _ctlLabel(key) {
      if (String(key).indexOf("v:") === 0) {
        return controlFields(key).map((name) => themeFieldLabel(name, this._de)).join(", ");
      }
      return this._t[`ctl_${key}`] || key;
    }

    /** Ein Schild im Vorschaubild fuehrt auf eine andere Seite. */
    _goto(where) {
      if (where === "theme") {
        this._selectTab("theme");
        this._selectSpot("cards");
        return;
      }
      if (where === "layout" || where === "sidebar") {
        this._selectGroup("sidebar");
        return;
      }
      this._selectTab(where);
    }

    /**
     * Ein Klick ins Vorschaubild: das angeklickte Element waehlen und rechts
     * seine Felder zeigen. true, wenn der Klick dort verarbeitet wurde.
     */
    _stageClick(target) {
      const stage = target.closest(".stage[data-stage]");
      if (!stage) {
        return false;
      }
      const kind = stage.dataset.stage;
      const side = target.closest(".hm-side");
      if (side) {
        const tile = target.closest(".sbp-host [data-key]");
        if (kind !== "sidebar") {
          // Header, Theme, HA-Settings: die Seitenleiste fuehrt auf ihre Seite
          if (tile) {
            this._selectTab("items");
            this._selectEntry(tile.dataset.key);
          } else {
            this._selectGroup("sidebar");
          }
          return true;
        }
        if (this._tab === "look") {
          if (tile && tile.matches(".sbp-hd")) {
            this._selectTab("items");
            this._selectEntry(tile.dataset.key);
          } else if (target.closest(".sbp-badge")) {
            this._selectSection("look", "badge", true);
          } else if (tile && tile.dataset.key === "notifications") {
            this._selectSection("look", "notifications", true);
          } else if (tile) {
            this._selectSection("look", tile.hasAttribute("data-current") ? "text" : "items", true);
          } else if (target.closest(".sbp-head")) {
            this._selectSection("look", "head", true);
          } else if (target.closest(".sbp")) {
            this._selectSection("look", "colors", true);
          }
          return true;
        }
        if (tile) {
          if (this._tab !== "items") {
            this._selectTab("items");
          }
          this._selectEntry(tile.dataset.key);
          return true;
        }
        if (target.closest(".sbp-head")) {
          this._selectTab("look");
          this._selectSection("look", "head", true);
          return true;
        }
        return false;
      }
      if (kind === "sidebar") {
        // Das angedeutete Dashboard: Header fuehrt zum Header, Karten zum Theme
        if (target.closest('[data-goto-zone="header"]')) {
          this._selectTab("header");
          return true;
        }
        if (target.closest('[data-goto-zone="theme"]')) {
          this._goto("theme");
          return true;
        }
        return false;
      }
      if (kind === "theme") {
        // Ein einzelnes Bedienelement (1.4.9) vor seiner Kachel
        const control = target.closest("[data-ctl]");
        if (control) {
          this._selectControl(control.dataset.ctl, control);
          return true;
        }
        const spot = target.closest("[data-spot-tag], [data-spot]");
        if (spot) {
          this._selectSpot(spot.dataset.spotTag || spot.dataset.spot);
          return true;
        }
        if (target.closest('[data-goto-zone="header"]')) {
          this._selectTab("header");
          return true;
        }
        return false;
      }
      if (kind === "header") {
        if (target.closest('[data-goto-zone="theme"]')) {
          this._goto("theme");
          return true;
        }
        const zone = target.closest("#header-preview [data-zone]");
        if (zone) {
          this._selectSection("header", zone.dataset.zone, true);
          return true;
        }
        return false;
      }
      if (kind === "settings") {
        const spot = target.closest("[data-spot]");
        if (spot) {
          this._selectSection("settings", spot.dataset.spot, true);
          return true;
        }
      }
      return false;
    }

    /** "Vorher": die Vorschaubilder zeigen den gespeicherten Stand. */
    _setBefore(on) {
      this._before = !!on;
      const root = this.shadowRoot;
      root.querySelectorAll(".before-toggle").forEach((box) => {
        box.checked = this._before;
      });
      root.querySelectorAll(".stage").forEach((stage) => {
        stage.toggleAttribute("data-before", this._before);
        stage.dataset.beforeLabel = this._t.before_badge;
      });
      this._updatePreview();
    }

    /**
     * Die Theme-Variablen, die sich aus den Farben der Seiten Header und
     * Sidebar ergeben - soweit Home Assistant dafuer Variablen hat.
     * Leerer Wert: dort ist nichts gesetzt.
     */
    _panelThemeValues(cfg) {
      const head = (cfg && cfg.header) || {};
      const look = (cfg && cfg.appearance) || {};
      const text = (raw) => String(raw || "").trim();
      const bg = text(head.background);
      const opacity = Math.round(Number(head.background_opacity));
      const tinted = bg && Number.isFinite(opacity) && opacity < 100
        ? `color-mix(in srgb, ${bg} ${Math.max(0, opacity)}%, transparent)`
        : bg;
      const width = Math.max(0, Math.round(Number(head.border_split ? head.border_bottom : head.border_width) || 0));
      return {
        "app-header-background-color": tinted,
        "app-header-text-color": text(head.text_color),
        "app-header-border-bottom": width > 0 ? `${width}px solid ${text(head.border_color) || "currentColor"}` : "",
        // Die Browser-Farbe kann nur eine deckende Farbe sein
        "app-theme-color": /^(#[0-9a-f]{3,8}|rgb\(|hsl\(|[a-z]+$)/i.test(bg) ? bg : "",
        // Weichzeichner der Kopfzeile (seit 1.4.8 als Theme-Variable)
        "app-header-backdrop-filter": Math.round(Number(head.blur) || 0) > 0
          ? `blur(${Math.min(60, Math.round(Number(head.blur)))}px)` : "",
        "sidebar-background-color": text(look.background),
        "sidebar-text-color": text(look.text_color),
        "sidebar-icon-color": text(look.icon_color),
        "sidebar-selected-icon-color": text(look.icon_color_selected) || text(look.text_color_selected),
        "sidebar-menu-button-background-color": text(look.header_background),
        "sidebar-menu-button-text-color": text(look.title_color),
      };
    }

    /** Knopf "Farben übernehmen": alle gesetzten Farben der Seite ins Theme. */
    _pullPanelTheme(name) {
      const group = THEME_GROUPS.find((one) => one.en === name);
      if (!group) {
        return;
      }
      const now = this._panelThemeValues(this._config);
      let taken = 0;
      group.fields.forEach((field) => {
        const key = field[0];
        if (now[key]) {
          ["dark", "light"].forEach((mode) => {
            this._config.theme[mode] = this._config.theme[mode] || {};
            this._config.theme[mode][key] = now[key];
          });
          taken += 1;
        }
      });
      this._fillInputs();
      this._touch();
      this._flash(taken ? this._t.theme_pull_done.replace("{n}", taken) : this._t.theme_pull_none);
    }

    /**
     * Farben der Seiten Header und Sidebar ins Theme uebernehmen (beide
     * Modi). Eine Theme-Variable folgt nur, solange sie leer ist oder noch
     * den uebernommenen Wert traegt - einen eigenen Wert im Theme laesst sie
     * stehen.
     */
    _syncPanelTheme() {
      if (!this._config || !this._saved || !this._config.theme) {
        return;
      }
      const now = this._panelThemeValues(this._config);
      const saved = this._panelThemeValues(this._saved);
      // Nach dem Laden oder Speichern faengt die Uebernahme neu an
      if (!this._themeSynced || this._themeSyncedFor !== this._saved) {
        this._themeSynced = {};
        this._themeSyncedFor = this._saved;
      }
      const root = this.shadowRoot;
      Object.keys(now).forEach((key) => {
        const last = key in this._themeSynced ? this._themeSynced[key] : saved[key];
        if (now[key] === last) {
          return;
        }
        ["dark", "light"].forEach((mode) => {
          const values = this._config.theme[mode] || (this._config.theme[mode] = {});
          const before = String(((this._saved.theme || {})[mode] || {})[key] || "").trim();
          const current = String(values[key] || "").trim();
          let next = null;
          if (now[key] === saved[key]) {
            // Wieder wie gespeichert: eine Uebernahme zuruecknehmen
            if (current === last) {
              next = before;
            }
          } else if (current === "" || current === last || current === saved[key]) {
            next = now[key];
          }
          if (next === null || next === current) {
            return;
          }
          values[key] = next;
          const path = `theme.${mode}.${key}`;
          root.querySelectorAll(`[data-bind="${CSS.escape(path)}"]`).forEach((input) => {
            if (input.value !== next) {
              input.value = next;
            }
          });
          this._syncPicker(path);
        });
        this._themeSynced[key] = now[key];
      });
    }

    /** Das Namensfeld des gewaehlten Eintrags. */
    _focusInspectorName() {
      this._itemsView = "entry";
      const pane = this.shadowRoot.getElementById("items-pane");
      if (pane) {
        pane.dataset.view = "entry";
      }
      const input = this._inspector && this._inspector.querySelector('input[data-prop="name"]');
      if (input) {
        input.focus();
      }
    }

    /* ------------------------------------------------ PopUp-Links (1.5.1) */

    /**
     * Die Seiten fuer die Auswahl eines PopUps: zuerst die Dashboards und
     * Seiten der Seitenleiste (aus hass.panels), dann die Seiten von Home
     * Assistant wie beim Link. [{label, links: [[pfad, icon, name]]}]
     */
    _pageChoices() {
      const hass = this._hass;
      const panels = (hass && hass.panels) || {};
      const own = Object.keys(panels)
        .filter((urlPath) => {
          const panel = panels[urlPath];
          return panel && urlPath !== "profile" && urlPath !== "config" && panel.show_in_sidebar !== false &&
            (panel.title || urlPath === ((hass && hass.defaultPanel) || "lovelace"));
        })
        .map((urlPath) => [`/${urlPath}`, panels[urlPath].icon || "mdi:view-dashboard-outline", panelLabel(hass, panels[urlPath], urlPath)])
        .filter((one) => LINK_PATH.test(one[0]))
        .sort((a, b) => a[2].localeCompare(b[2]));
      const groups = own.length ? [{ label: this._t.popup_group_panels, links: own }] : [];
      LINK_GROUPS.forEach((group) => groups.push({
        label: this._de ? group.de : group.en,
        links: group.links.map((link) => [link[0], link[1], this._de ? link[2] : link[3]]),
      }));
      return groups;
    }

    /** Name und Icon einer Seite aus der Auswahl - sonst aus dem Pfad. */
    _pageLinkInfo(path) {
      let found = null;
      this._pageChoices().forEach((group) => group.links.forEach((link) => {
        if (!found && link[0] === path) {
          found = link;
        }
      }));
      const fallback = path.split(/[?#]/)[0].split("/").filter(Boolean).pop() || path;
      return { path, name: found ? found[2] : fallback, icon: found ? found[1] : LINK_ICON };
    }

    /** Die <option>s einer Seiten-Auswahl; was schon gewaehlt ist, ist gesperrt. */
    _pageOptions(taken) {
      const t = this._t;
      const used = new Set(taken || []);
      return this._pageChoices().map((group) => `<optgroup label="${escapeHtml(group.label)}">${group.links
        .map((link) => `<option value="${escapeHtml(link[0])}"${used.has(link[0]) ? " disabled" : ""}>${escapeHtml(link[2])} – ${escapeHtml(link[0])}</option>`)
        .join("")}</optgroup>`).join("") + `<option value="">${escapeHtml(t.add_link_custom)}</option>`;
    }

    /** Erste freie Seite einer Auswahl vorwaehlen. */
    _pickFirstFree(select) {
      const free = [...select.querySelectorAll("option")].find((option) => option.value && !option.disabled);
      select.value = free ? free.value : "";
    }

    /** Pfad aus Auswahl oder eigenem Feld - wie beim Link auch eine ganze Adresse. */
    _readPagePath(select, input) {
      const chosen = select ? select.value : "";
      let path = chosen || (input ? input.value.trim() : "");
      if (!chosen && /^https?:\/\//i.test(path)) {
        try {
          const url = new URL(path);
          path = url.pathname + url.search + url.hash;
        } catch (err) {
          path = "";
        }
      }
      return LINK_PATH.test(path) && path !== "/" && path.length <= 200 ? path : "";
    }

    /** Seite oder Sensor (nur Kopfzeile, 1.5.4): Teile und Knopf des Dialogs. */
    _renderAddLinkKind() {
      const root = this.shadowRoot;
      const t = this._t;
      const entity = this._addTarget === "header" && this._addLinkKind === "entity";
      root.querySelectorAll("#add-link-kind [data-alk]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.alk === (entity ? "entity" : "page"));
      });
      root.getElementById("add-link-page-part").hidden = entity;
      root.getElementById("add-link-entity-part").hidden = !entity;
      root.getElementById("add-link-ok").textContent = entity ? t.add_link_entity_button : t.add_link_button;
      if (this._addTarget === "header") {
        root.getElementById("add-link-hint").textContent = entity ? t.add_link_entity_intro : t.header_link_add_hint;
      }
      if (entity) {
        this._fillEntityList();
      }
      this._addError("");
    }

    /** Vorschlaege fuer das Entitaetsfeld: Sensoren zuerst, dann alle anderen. */
    _fillEntityList() {
      const list = this.shadowRoot.getElementById("add-entity-list");
      const states = (this._hass && this._hass.states) || {};
      if (!list || list.childElementCount || !Object.keys(states).length) {
        return;
      }
      const rank = (id) => (/^sensor\./.test(id) ? 0 : /^binary_sensor\./.test(id) ? 1 : 2);
      const ids = Object.keys(states).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
      list.innerHTML = ids.slice(0, 5000).map((id) => {
        const name = states[id].attributes && states[id].attributes.friendly_name;
        return `<option value="${escapeHtml(id)}">${escapeHtml(name || "")}</option>`;
      }).join("");
    }

    /** Der Name einer Entitaet, wie Home Assistant ihn zeigt. */
    _entityName(entity) {
      const stateObj = this._hass && this._hass.states ? this._hass.states[entity] : null;
      return stateObj && stateObj.attributes && typeof stateObj.attributes.friendly_name === "string"
        ? stateObj.attributes.friendly_name
        : "";
    }

    /** Das Icon eines Links ohne eigenes: Ketten-Symbol, beim Sensor das der Entitaet. */
    _linkIcon(link) {
      if (!link || !link.entity) {
        return LINK_ICON;
      }
      const stateObj = this._hass && this._hass.states ? this._hass.states[link.entity] : null;
      const own = stateObj && stateObj.attributes ? stateObj.attributes.icon : "";
      return typeof own === "string" && ICON_NAME.test(own) ? own : SENSOR_ICON;
    }

    /** Den gewaehlten Sensor in die Kopfzeile. */
    _addEntityLink() {
      const t = this._t;
      const entity = this.shadowRoot.getElementById("add-link-entity").value.trim();
      const states = (this._hass && this._hass.states) || {};
      if (!ENTITY_ID.test(entity) || (Object.keys(states).length && !states[entity])) {
        this._addError(t.add_link_entity_invalid);
        return;
      }
      const store = this._linkStore("header");
      const links = store.section[store.key] || [];
      if (links.some((link) => link.entity === entity)) {
        this._addError(t.add_link_exists);
        return;
      }
      if (links.length >= HEADER_LINKS_MAX) {
        this._addError(t.header_links_full);
        return;
      }
      // Name leer: der Injector nimmt den Namen der Entitaet
      store.section[store.key] = links.concat([{ path: "", entity, name: "", icon: "", color: "", value_color: "", value_only: false }]);
      this._closeAdd();
      this._renderLinkList("header");
      this._touch();
    }

    /** Liste, Auswahl und Knopf des PopUp-Teils im Dialog nachziehen. */
    _renderAddPopup() {
      const root = this.shadowRoot;
      const t = this._t;
      const links = this._addPopupLinks || [];
      const select = root.getElementById("add-popup-select");
      const before = select.value;
      select.innerHTML = this._pageOptions(links.map((link) => link.path));
      // Beim Oeffnen und nach dem Aufnehmen: die erste freie Seite; sonst
      // bleibt die Wahl stehen.
      const keep = before && [...select.querySelectorAll("option")].find((option) => option.value === before && !option.disabled);
      if (keep) {
        select.value = before;
      } else {
        this._pickFirstFree(select);
      }
      root.getElementById("add-popup-custom").hidden = select.value !== "";
      const icon = (name) => (customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(name)}"></ha-icon>` : "");
      root.getElementById("add-popup-list").innerHTML = links.length
        ? links.map((link, index) => `
          <li class="apl" data-index="${index}">
            <span class="apl-icon">${icon(link.icon || LINK_ICON)}</span>
            <span class="apl-name">${escapeHtml(link.name)}<small>${escapeHtml(link.path)}</small></span>
            <button type="button" class="icon-btn" data-apl-remove="${index}" title="${escapeHtml(t.popup_link_remove)}">${glyph("mdi:close", "&#10005;")}</button>
          </li>`).join("")
        : `<li class="apl-empty">${escapeHtml(t.add_popup_empty)}</li>`;
      root.getElementById("add-popup-pick").disabled = links.length >= POPUP_LINKS_MAX;
      // Links oder Karte (1.5.3): bei der Karte kommt der Code danach im Eintrag
      const card = this._addPopupContent === "card";
      root.querySelectorAll("#add-popup-kind [data-apc]").forEach((button) => {
        button.toggleAttribute("data-active", button.dataset.apc === (card ? "card" : "links"));
      });
      root.getElementById("add-popup-links").hidden = card;
      root.getElementById("add-popup-card-hint").hidden = !card;
      root.querySelector("#add-modal .add-popup-use").hidden = card;
      this._addPopupError("");
    }

    _addPopupError(text) {
      const box = this.shadowRoot.getElementById("add-popup-error");
      if (box) {
        box.textContent = text;
        box.hidden = !text;
      }
    }

    /** Die gewaehlte Seite in die Liste des neuen PopUps. */
    _addPopupPick() {
      const root = this.shadowRoot;
      const links = this._addPopupLinks || (this._addPopupLinks = []);
      const path = this._readPagePath(root.getElementById("add-popup-select"), root.getElementById("add-popup-path"));
      if (!path) {
        this._addPopupError(this._t.add_link_invalid);
        return;
      }
      if (links.some((link) => link.path === path)) {
        this._addPopupError(this._t.add_link_exists);
        return;
      }
      if (links.length >= POPUP_LINKS_MAX) {
        this._addPopupError(this._t.popup_full);
        return;
      }
      links.push(this._pageLinkInfo(path));
      root.getElementById("add-popup-path").value = "";
      this._renderAddPopup();
    }

    /** Das PopUp mit den gewaehlten Seiten als Eintrag anlegen. */
    _addPopup() {
      const root = this.shadowRoot;
      const card = this._addPopupContent === "card";
      const links = card ? [] : cleanPopupLinks(this._addPopupLinks);
      if (!card && !links.length) {
        this._addPopupError(this._t.add_popup_none);
        return;
      }
      const key = POPUP_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      // Der Name steht im Eintrag (wie bei den Links), damit die Seitenleiste
      // ihn auch in einer anderen Sprache so zeigt, wie er angelegt wurde.
      const name = root.getElementById("add-popup-name").value.trim().slice(0, 60) || this._t.popup;
      this._config.items[key] = Object.assign(itemDefaults(key), { name, icon: card ? POPUP_CARD_ICON : POPUP_ICON, links,
        content: card ? "card" : "links" });
      this._config.order = [key].concat((this._config.order || []).filter((one) => one !== key));
      this._addPopupLinks = [];
      this._closeAdd();
      this._selKey = key;
      this._itemsView = "entry";
      this._syncEntries(true);
      this._touch();
      this._focusInspectorName();
      if (card) {
        const area = this._inspector && this._inspector.querySelector("[data-pcard]");
        if (area) {
          area.focus();
        }
      }
    }

    /** Inhalt und Fenstergroesse eines PopUps (1.5.3), darunter Links oder Karte. */
    _popupEditor(key, cfg) {
      const t = this._t;
      const k = escapeHtml(key);
      const card = cfg.content === "card";
      const num = (prop, label) => `
        <label class="field"><span>${escapeHtml(label)}</span>
          <input type="number" min="0" max="${POPUP_SIZE_MAX}" step="10" data-item="${k}" data-prop="${prop}"
            value="${escapeHtml(cfg[prop] || 0)}" placeholder="0" />
        </label>`;
      return `
        <div class="pe-top">
          <div class="field">
            <span class="cap">${escapeHtml(t.popup_content)}</span>
            <div class="seg inline pe-kind">
              <button type="button" data-pcontent="links"${card ? "" : " data-active"}>${escapeHtml(t.popup_content_links)}</button>
              <button type="button" data-pcontent="card"${card ? " data-active" : ""}>${escapeHtml(t.popup_content_card)}</button>
            </div>
          </div>
          <div class="grid2">${num("width", t.popup_width)}${num("height", t.popup_height)}</div>
          <small class="field-hint">${escapeHtml(t.popup_size_hint)}</small>
        </div>
        ${card ? this._popupCardEditor(key, cfg) : this._popupLinksEditor(key, cfg)}`;
    }

    /** Die Karte eines PopUps als YAML (1.5.3). */
    _popupCardEditor(key, cfg) {
      const t = this._t;
      const state = this._popupCardView(cfg.card_yaml);
      return `
        <div class="popup-edit pe-card" data-popup="${escapeHtml(key)}">
          <label class="field">
            <span>${escapeHtml(t.popup_card_yaml)}</span>
            <textarea class="pe-yaml" data-pcard rows="12" spellcheck="false" autocomplete="off" autocapitalize="off"
              placeholder="${escapeHtml(t.popup_card_placeholder)}">${escapeHtml(cfg.card_yaml || "")}</textarea>
          </label>
          <div class="pe-yaml-state" data-pcard-state${this._popupCardFlag(state)}>${escapeHtml(state.message)}</div>
          <small class="field-hint">${escapeHtml(t.popup_card_hint)}</small>
          <small class="field-hint">${escapeHtml(t.popup_card_use_hint)}</small>
        </div>`;
    }

    /** Die Links eines PopUps im aufgeklappten Eintrag. */
    _popupLinksEditor(key, cfg) {
      const t = this._t;
      const links = cleanPopupLinks(cfg.links);
      const icon = (name) => (customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(name)}"></ha-icon>` : "");
      const rows = links.map((link, index) => `
            <li class="pe-row" data-pindex="${index}">
              <span class="pe-icon">${icon(link.icon || LINK_ICON)}</span>
              <input type="text" class="pe-name" data-plink="name" maxlength="60" value="${escapeHtml(link.name)}" placeholder="${escapeHtml(link.path)}" aria-label="${escapeHtml(t.name)}" title="${escapeHtml(t.name)}" />
              <input type="text" class="pe-ic" data-plink="icon" value="${escapeHtml(link.icon)}" placeholder="${LINK_ICON}" spellcheck="false" aria-label="${escapeHtml(t.icon)}" title="${escapeHtml(t.icon)}" />
              <small class="pe-path">${escapeHtml(link.path)}</small>
              <span class="pe-btns">
                <button type="button" class="icon-btn" data-paction="up" ${index === 0 ? "disabled" : ""} title="${escapeHtml(t.move_up)}">${glyph("mdi:arrow-up", "&#9650;")}</button>
                <button type="button" class="icon-btn" data-paction="down" ${index === links.length - 1 ? "disabled" : ""} title="${escapeHtml(t.move_down)}">${glyph("mdi:arrow-down", "&#9660;")}</button>
                <button type="button" class="icon-btn warn" data-paction="remove" title="${escapeHtml(t.popup_link_remove)}">${glyph("mdi:trash-can-outline", "&#10005;")}</button>
              </span>
            </li>`).join("");
      return `
        <div class="popup-edit" data-popup="${escapeHtml(key)}">
          <div class="pe-head">
            <h4>${escapeHtml(t.popup_links)}</h4>
            <span class="badge-ext">${links.length} / ${POPUP_LINKS_MAX}</span>
          </div>
          <ul class="pe-list">${rows || `<li class="pe-empty">${escapeHtml(t.popup_links_empty)}</li>`}</ul>
          <div class="pe-add">
            <select data-pe-select aria-label="${escapeHtml(t.add_link_page)}">${this._pageOptions(links.map((link) => link.path))}</select>
            <input type="text" data-pe-path hidden spellcheck="false" placeholder="/config/tools/state" aria-label="${escapeHtml(t.add_link_path)}" />
            <button type="button" class="btn sm" data-paction="add"${links.length >= POPUP_LINKS_MAX ? " disabled" : ""}>${glyph("mdi:plus", "+")}${escapeHtml(t.popup_add)}</button>
          </div>
          <p class="warn pe-error" data-pe-error hidden></p>
          <small class="field-hint">${escapeHtml(t.popup_use_hint)}</small>
          <small class="field-hint">${escapeHtml(t.popup_hint_hide)}</small>
        </div>`;
    }

    /** Ereignisse der PopUp-Felder im aufgeklappten Eintrag. */
    _bindPopupEditor(inspector) {
      inspector.addEventListener("input", (event) => {
        if (event.target.matches && event.target.matches("[data-pcard]")) {
          this._setPopupCard(event.target.value);
        }
      });
      inspector.addEventListener("keydown", (event) => {
        // Tab im YAML-Feld: zwei Leerzeichen statt zum naechsten Feld springen
        if (event.key === "Tab" && !event.shiftKey && event.target.matches && event.target.matches("[data-pcard]")) {
          event.preventDefault();
          const area = event.target;
          const start = area.selectionStart;
          area.setRangeText("  ", start, area.selectionEnd, "end");
          this._setPopupCard(area.value);
        }
      });
      inspector.addEventListener("input", (event) => {
        const input = event.target;
        if (!input.dataset || !input.dataset.plink) {
          return;
        }
        const row = input.closest("[data-pindex]");
        const key = this._selKey;
        if (!row || !isPopup(key)) {
          return;
        }
        const cfg = this._itemConfig(key);
        const links = cleanPopupLinks(cfg.links);
        const index = Number(row.dataset.pindex);
        if (!links[index]) {
          return;
        }
        const prop = input.dataset.plink;
        const raw = prop === "icon" ? input.value.trim() : input.value;
        // Ein halb getipptes Icon bleibt im Feld; ungueltig faellt es beim
        // Speichern weg (cleanPopupLinks), die Vorschau zeigt solange das Ketten-Icon.
        links[index] = Object.assign({}, links[index], { [prop]: raw });
        cfg.links = links;
        if (prop === "icon") {
          const glyphBox = row.querySelector(".pe-icon ha-icon");
          if (glyphBox) {
            glyphBox.setAttribute("icon", ICON_NAME.test(raw) ? raw : LINK_ICON);
          }
        }
        this._touch();
      });
      inspector.addEventListener("change", (event) => {
        if (event.target.matches && event.target.matches("[data-pe-select]")) {
          const path = inspector.querySelector("[data-pe-path]");
          if (path) {
            path.hidden = event.target.value !== "";
            if (!path.hidden) {
              path.focus();
            }
          }
          this._popupEditorError("");
        }
      });
      inspector.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.target.matches && event.target.matches("[data-pe-path]")) {
          event.preventDefault();
          this._popupAction("add");
        }
      });
      inspector.addEventListener("change", (event) => {
        // Fenstergroesse: nach der Eingabe den geprueften Wert zeigen (z. B. -5 -> 0)
        const input = event.target;
        if (input.matches && input.matches('input[type="number"][data-item][data-prop="width"], input[type="number"][data-item][data-prop="height"]')) {
          input.value = String(this._itemConfig(input.dataset.item)[input.dataset.prop] || 0);
        }
      });
      inspector.addEventListener("click", (event) => {
        const kind = event.target.closest && event.target.closest("button[data-pcontent]");
        if (kind && isPopup(this._selKey)) {
          const cfg = this._itemConfig(this._selKey);
          cfg.content = kind.dataset.pcontent === "card" ? "card" : "links";
          const entry = this._entries.find((one) => one.key === this._selKey);
          if (entry) {
            entry.sub = cfg.content === "card" ? this._t.popup_sub_card : this._t.popup_sub;
          }
          this._renderItems();
          this._touch();
        }
      });
      inspector.addEventListener("click", (event) => {
        const button = event.target.closest && event.target.closest("button[data-paction]");
        if (!button) {
          return;
        }
        const row = button.closest("[data-pindex]");
        this._popupAction(button.dataset.paction, row ? Number(row.dataset.pindex) : -1);
      });
    }

    /**
     * Der Stand des YAML-Codes fuer die Zeile unter dem Feld: aus dem
     * Panel selbst (leer, zu lang), aus der letzten Antwort von Home
     * Assistant oder "wird geprueft" - dann geht die Frage gleich los.
     */
    _popupCardView(text) {
      const t = this._t;
      const pre = popupCardPrecheck(text, t);
      if (pre) {
        return pre;
      }
      const known = this._cardChecks && this._cardChecks.get(text);
      if (known) {
        return { ok: known.ok, error: known.error, message: popupCardMessage(known, text, t) };
      }
      window.setTimeout(() => this._checkPopupCard(this._selKey, text), 0);
      return { ok: false, error: "", pending: true, message: t.popup_card_checking };
    }

    _popupCardFlag(state) {
      return state.ok ? " data-ok" : state.pending || state.error === "empty" ? "" : " data-error";
    }

    _showPopupCardState(state) {
      const box = this._inspector && this._inspector.querySelector("[data-pcard-state]");
      if (box) {
        box.textContent = state.message;
        box.toggleAttribute("data-ok", !!state.ok);
        box.toggleAttribute("data-error", this._popupCardFlag(state) === " data-error");
      }
    }

    /** Getippter YAML-Code: merken, nach einer kurzen Pause pruefen lassen. */
    _setPopupCard(text) {
      const key = this._selKey;
      if (!isPopup(key)) {
        return;
      }
      const cfg = this._itemConfig(key);
      const pre = popupCardPrecheck(text, this._t);
      window.clearTimeout(this._cardCheckTimer);
      if (pre && pre.tooBig) {
        // Zu lang: alles bleibt, wie es war
        this._showPopupCardState(pre);
        return;
      }
      cfg.card_yaml = text;
      if (pre) {
        cfg.card = {};
        this._showPopupCardState(pre);
      } else {
        const known = this._cardChecks && this._cardChecks.get(text);
        if (known) {
          this._applyPopupCard(key, text, known);
        } else {
          this._showPopupCardState({ pending: true, message: this._t.popup_card_checking });
          this._cardCheckTimer = window.setTimeout(() => this._checkPopupCard(key, text), 300);
        }
      }
      this._touch();
    }

    /**
     * Den Code vom YAML-Parser von Home Assistant lesen lassen
     * (ha_style_hub/card_yaml). Eine Antwort fuer einen inzwischen
     * geaenderten Code wird nur gemerkt, nicht mehr angewendet.
     */
    async _checkPopupCard(key, text) {
      if (!isPopup(key) || popupCardPrecheck(text, this._t)) {
        return;
      }
      this._cardChecks = this._cardChecks || new Map();
      let res = this._cardChecks.get(text);
      if (!res) {
        // Dieselbe Frage nur einmal unterwegs
        this._cardAsks = this._cardAsks || new Map();
        let ask = this._cardAsks.get(text);
        if (!ask) {
          ask = this._hass.connection.sendMessagePromise({ type: "ha_style_hub/card_yaml", yaml: text })
            .catch(() => ({ ok: false, error: "failed", line: 0, message: this._t.popup_card_check_failed }));
          this._cardAsks.set(text, ask);
        }
        res = await ask;
        this._cardAsks.delete(text);
        if (res.error !== "failed") {
          if (this._cardChecks.size > 30) {
            this._cardChecks.delete(this._cardChecks.keys().next().value);
          }
          this._cardChecks.set(text, res);
        }
      }
      this._applyPopupCard(key, text, res);
    }

    /** Antwort anwenden - gueltig: die Karte; Fehler: die letzte gueltige bleibt. */
    _applyPopupCard(key, text, res) {
      const cfg = (this._config.items || {})[key];
      if (!cfg || cfg.card_yaml !== text) {
        return;
      }
      if (res.ok && JSON.stringify(cfg.card) !== JSON.stringify(res.card)) {
        cfg.card = res.card;
        this._touch();
      }
      if (this._selKey === key) {
        this._showPopupCardState({ ok: res.ok, error: res.error, message: popupCardMessage(res, text, this._t) });
      }
    }

    _popupEditorError(text) {
      const box = this._inspector && this._inspector.querySelector("[data-pe-error]");
      if (box) {
        box.textContent = text;
        box.hidden = !text;
      }
    }

    /** Link hinzufuegen, verschieben, entfernen. */
    _popupAction(action, index) {
      const key = this._selKey;
      if (!isPopup(key)) {
        return;
      }
      const cfg = this._itemConfig(key);
      const links = cleanPopupLinks(cfg.links);
      if (action === "add") {
        const box = this._inspector;
        const path = this._readPagePath(box.querySelector("[data-pe-select]"), box.querySelector("[data-pe-path]"));
        if (!path) {
          this._popupEditorError(this._t.add_link_invalid);
          return;
        }
        if (links.some((link) => link.path === path)) {
          this._popupEditorError(this._t.add_link_exists);
          return;
        }
        if (links.length >= POPUP_LINKS_MAX) {
          this._popupEditorError(this._t.popup_full);
          return;
        }
        links.push(this._pageLinkInfo(path));
      } else if (action === "remove") {
        if (!links[index]) {
          return;
        }
        links.splice(index, 1);
      } else if (action === "up" || action === "down") {
        const to = action === "up" ? index - 1 : index + 1;
        if (!links[index] || to < 0 || to >= links.length) {
          return;
        }
        [links[index], links[to]] = [links[to], links[index]];
      } else {
        return;
      }
      cfg.links = links;
      this._renderInspector();
      const select = this._inspector && this._inspector.querySelector("[data-pe-select]");
      if (select) {
        this._pickFirstFree(select);
      }
      this._touch();
    }

    /**
     * Die Vorschau des PopUp-Fensters im Vorschaubild der Seite Sidebar:
     * solange unter Eintraege ein PopUp-Link gewaehlt ist, steht sein
     * Fenster ueber dem angedeuteten Dashboard - wie in Home Assistant.
     */
    _renderPopupPreview() {
      const root = this.shadowRoot;
      const page = root.querySelector(".page[data-active]");
      const main = page && page.querySelector('[data-stage="sidebar"] .hm-main');
      const key = this._tab === "items" && isPopup(this._selKey) ? this._selKey : "";
      const cfg = key ? (this._view().items || {})[key] : null;
      root.querySelectorAll(".ppv").forEach((box) => {
        if (!cfg || box.parentElement !== main) {
          box.remove();
        }
      });
      if (!main || !cfg) {
        return;
      }
      const t = this._t;
      const links = cleanPopupLinks(cfg.links);
      const icon = (name) => (customElements.get("ha-icon") ? `<ha-icon icon="${escapeHtml(name)}"></ha-icon>` : "");
      const accent = String(cfg.icon_color || "").trim();
      let box = main.querySelector(".ppv");
      if (!box) {
        box = document.createElement("div");
        box.className = "ppv";
        main.appendChild(box);
      }
      box.dataset.key = key;
      const card = cfg.content === "card";
      const width = Number(cfg.width) > 0 ? Math.max(240, Number(cfg.width)) : card ? 600 : 560;
      box.style.cssText = (accent ? `--ppv-c:${cssValue(accent)};` : "") + `--ppv-w:${width}px` +
        (Number(cfg.height) > 0 ? `;--ppv-h:${Math.max(120, Number(cfg.height))}px` : "");
      box.toggleAttribute("data-height", Number(cfg.height) > 0);
      box.toggleAttribute("data-card", card);
      box.innerHTML = `
        <div class="ppv-scrim"></div>
        <div class="ppv-card" role="presentation">
          <div class="ppv-head">
            <span class="ppv-ic">${icon(ICON_NAME.test(String(cfg.icon || "")) ? cfg.icon : POPUP_ICON)}</span>
            <strong>${escapeHtml(String(cfg.name || "").trim() || t.popup)}</strong>
            <span class="ppv-x">${icon("mdi:close")}</span>
          </div>
          ${card ? '<div class="ppv-cardbox"></div>' : `<div class="ppv-grid" style="--ppv-cols:${popupColumns(links.length, 4)}">${links.map((link) => `
            <div class="ppv-tile" title="${escapeHtml(link.path)}">
              <span class="ppv-ti">${icon(link.icon || LINK_ICON)}</span>
              <span class="ppv-tn">${escapeHtml(link.name || link.path)}</span>
            </div>`).join("") || `<p class="ppv-empty">${escapeHtml(t.popup_links_empty)}</p>`}
          </div>`}
        </div>
        <span class="ppv-tag">${escapeHtml(t.popup_preview_tag)}</span>`;
      if (card) {
        this._mountPreviewCard(box.querySelector(".ppv-cardbox"), cfg.card);
      }
    }

    /**
     * Die echte Karte in der Vorschau (1.5.3) - das Panel laeuft in Home
     * Assistant, also baut Home Assistant sie wie im Dashboard. Dieselbe
     * Karte bleibt erhalten, solange sich ihr Code nicht aendert; sonst ein
     * Platzhalter mit dem Typ.
     */
    _mountPreviewCard(slot, config) {
      const t = this._t;
      const json = JSON.stringify(config || {});
      const placeholder = (text) => {
        slot.innerHTML = `<p class="ppv-empty ppv-cardph">${escapeHtml(text)}</p>`;
      };
      if (!isObject(config) || typeof config.type !== "string") {
        placeholder(t.popup_card_none);
        return;
      }
      const cached = this._ppvCard;
      if (cached && cached.json === json && cached.el) {
        cached.el.hass = this._hass;
        slot.appendChild(cached.el);
        return;
      }
      placeholder(t.popup_card_preview.replace("{type}", config.type));
      if (typeof window.loadCardHelpers !== "function") {
        return;
      }
      const ticket = {};
      this._ppvTicket = ticket;
      window.loadCardHelpers().then((helpers) => {
        if (this._ppvTicket !== ticket) {
          return;
        }
        const element = helpers.createCardElement(config);
        element.hass = this._hass;
        fillCardHeight(element);
        this._ppvCard = { json, el: element };
        const now = this.shadowRoot.querySelector(".ppv .ppv-cardbox");
        if (now) {
          now.replaceChildren(element);
        }
      }).catch(() => {});
    }

    connectedCallback() {
      window.dispatchEvent(new CustomEvent(EVENT_RELOAD));
      // Wieder eingehaengt: die Groessen wieder beobachten
      if (this._ready && !this._resizeObserver) {
        this._watchOverflow();
        this._updateOverflow();
      }
      // Strg+K / Cmd+K oeffnet die Suche - nur solange dieses Panel offen ist.
      if (!this._onKey) {
        this._onKey = (event) => {
          // Escape schliesst einen offenen Dialog, auch wenn der Fokus nicht
          // im Panel liegt (Knopf per Tastatur oder Skript ausgeloest).
          if (event.key === "Escape" && this.isConnected && this._ready) {
            const open = [...this.shadowRoot.querySelectorAll(".modal")].filter((modal) => !modal.hidden);
            if (open.length) {
              open.forEach((modal) => {
                modal.hidden = true;
              });
              event.stopPropagation();
            }
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            !event.shiftKey &&
            String(event.key).toLowerCase() === "k" &&
            this.isConnected &&
            this._ready
          ) {
            event.preventDefault();
            event.stopPropagation();
            this._focusSearch();
          }
        };
      }
      window.addEventListener("keydown", this._onKey, true);
    }

    disconnectedCallback() {
      if (this._onKey) {
        window.removeEventListener("keydown", this._onKey, true);
      }
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      if (this._onWindowResize) {
        window.removeEventListener("resize", this._onWindowResize);
        this._onWindowResize = null;
      }
      // drop the preview and go back to what is stored
      window.dispatchEvent(new CustomEvent(EVENT_RELOAD));
    }
  }

  customElements.define("ha-style-hub-panel", SidebarHubPanel);
})();
