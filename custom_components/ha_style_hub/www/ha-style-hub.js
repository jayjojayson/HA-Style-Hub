/*
 * HA Style Hub - ha-style-hub.js
 * Version: 1.5.7
 *
 * Runtime patcher for the Home Assistant sidebar (ha-sidebar).
 *
 * The file is registered by the Python part of the integration via
 * frontend.add_extra_js_url() and therefore runs on every page load.
 *
 * What it does
 * ------------
 * 1. walks the shadow DOM down to <ha-sidebar>
 * 2. reads the configuration over the websocket API (ha_style_hub/get)
 * 3. adopts generated stylesheets into the relevant shadow roots
 *    (sidebar, the two navigation lists, ha-drawer, home-assistant)
 * 4. tags every sidebar entry with data-sh-key so CSS can address it
 * 5. renames entries / swaps icons in the DOM
 * 6. re-applies everything whenever Home Assistant re-renders,
 *    and whenever the configuration changes (event ha_style_hub_updated)
 *
 * Nothing is moved in the DOM for sorting - the order is done with the CSS
 * "order" property on grid items. That keeps Lit's rendering intact and
 * survives every re-render on its own.
 */

(() => {
  "use strict";

  const VERSION = "1.5.7";
  const TAG = "[HA Style Hub]";

  const EVENT_UPDATED = "ha_style_hub_updated";
  const WS_SUBSCRIBE = "ha_style_hub/subscribe";
  const EVENT_PREVIEW = "ha-style-hub-preview";
  const EVENT_RELOAD = "ha-style-hub-reload";

  if (window.__sidebarHub) {
    return;
  }

  /* ------------------------------------------------------------------ *
   * Defaults - keep in sync with custom_components/ha_style_hub/const.py
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

  // Die Zaehler-Box der Einstellungsseite (1.4.4): was gezaehlt werden kann,
  // in dieser Reihenfolge, und wohin ein Klick fuehrt.
  const COUNT_ITEMS = [
    "devices", "entities", "integrations", "apps", "automations", "scenes",
    "scripts", "cards", "blueprints", "users", "tokens",
  ];
  // Zustaende eines Integrations-Eintrags, die Home Assistant als Problem zeigt.
  const COUNT_FAILED_STATES = ["setup_error", "setup_retry", "failed_unload", "migration_error"];
  const COUNT_LINKS = {
    devices: "/config/devices/dashboard",
    entities: "/config/entities",
    integrations: "/config/integrations",
    automations: "/config/automation/dashboard",
    scenes: "/config/scene/dashboard",
    scripts: "/config/script/dashboard",
    cards: "/config/lovelace/resources",
    blueprints: "/config/blueprint/dashboard",
    users: "/config/users",
    tokens: "/profile/security",
  };
  const cleanCountItems = (raw) =>
    Array.isArray(raw) ? COUNT_ITEMS.filter((key) => raw.indexOf(key) >= 0) : COUNT_ITEMS.slice();

  // Einstellungen fuer Home Assistant selbst (Menuepunkt "HA-Settings") - siehe
  // const.py. icon_box: Symbole der Einstellungsseite als Boxen statt Kreise.
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
    list_shadow: "",
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
    hide_tip: false,
    table_row_background: "",
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

  // Das Symbol-Element der Einstellungsseite von Home Assistant.
  const ICON_BOX_SELECTOR = ".icon-background";
  // Die Karte einer Integration auf "Geraete & Dienste".
  const LIST_CARD = "ha-integration-card";
  const LIST_HEADER = "ha-integration-header";
  // Seit Home Assistant 2026.10 hat die Karte einen neuen Aufbau: Kopf und
  // Fuss sind eigene Elemente (mit Shadow Root) in .card-content.
  const LIST_CARD_HEADER = "ha-integration-card-header";
  const LIST_CARD_FOOTER = "ha-integration-card-footer";
  // Schmaler wird eine Spalte der mehrspaltigen Liste nicht (px).
  const LIST_COLUMN_MIN = 260;
  const MENU_LIST = "ha-config-navigation-list";
  // Die Einstellungsseite selbst. Nur ihre Menuelisten werden sortiert und
  // in Spalten gesetzt - dieselbe Liste gibt es auch auf Unterseiten (System).
  const DASH_PAGE = "ha-config-dashboard";
  // Die Unterseite "System" (Einstellungen > System). Sie bekommt dieselben
  // Spalten und Kacheln wie die Einstellungsseite - Reihenfolge und
  // Ausblenden gelten nur dort.
  const SYSTEM_PAGE = "ha-config-system-navigation";
  // Die Profilseite (seit HA 2026.10 mit derselben Menueliste) und die Seite
  // einer Integration mit ihren Eintraegen (1.4.8).
  const PROFILE_PAGE = "ha-profile-dashboard";
  const ENTRY_PAGE = "ha-config-integration-page";
  const ENTRY_ROW = "ha-config-entry-row";
  // Die Geraetezeilen eines Eintrags (1.5.7, fuer den Hover) - direkt im
  // Eintrag oder in einem Untereintrag.
  const ENTRY_DEVICE_ROW = "ha-config-entry-device-row";
  const ENTRY_SUB_ROW = "ha-config-sub-entry-row";
  // Welche Menuepunkte die Einstellungsseite in diesem Browser zuletzt
  // gezeigt hat. Das Panel liest die Liste, um sie zum Sortieren anzubieten:
  // so stimmen Namen (Sprache) und Bestand (Version von Home Assistant).
  const MENU_SEEN_KEY = "ha-style-hub-menu";
  const MENU_PATHS_MAX = 80;
  // Schmaler wird eine Spalte der Menuepunkte nicht (px).
  const MENU_COLUMN_MIN = 220;
  // Die Tabellen von Home Assistant (Automatisierungen, Entitaeten, Helfer, ...).
  const DATA_TABLE = "ha-data-table";
  // Die Seite "Apps" (installiert) und der Inhalt ihrer Karten.
  const APPS_PAGE = "ha-config-apps-installed";
  const APPS_CARD = "supervisor-apps-card-content";

  const HEADING_PREFIX = "heading:";
  const RESTART_KEY = "action:restart";
  // Ein Link auf eine Seite von Home Assistant (Automationen, Entitaeten,
  // Werkzeuge, ...). Wie der Neustart-Knopf ein Eintrag, den es in Home
  // Assistant nicht gibt: der Injector haengt ihn in die Liste. Das Ziel
  // steht im Schluessel selbst ("link:/config/automation"), damit braucht es
  // kein eigenes Feld, und derselbe Link kann nicht doppelt vorkommen.
  const LINK_PREFIX = "link:";
  // Nur Pfade innerhalb von Home Assistant: ein "/" am Anfang, kein zweites
  // (das waere eine fremde Adresse), und nur Zeichen, die in einer Adresse
  // ohne Maskierung vorkommen.
  const LINK_PATH = /^\/(?!\/)[A-Za-z0-9_\-./?=&%#~+]*$/;
  const linkPath = (key) => {
    const text = String(key || "");
    if (text.indexOf(LINK_PREFIX) !== 0) {
      return "";
    }
    const path = text.slice(LINK_PREFIX.length);
    return LINK_PATH.test(path) && path.length <= 200 ? path : "";
  };
  // Externe Adressen (1.5.7): ein Link der Seitenleiste oder eines PopUps darf
  // auch auf eine fremde Webseite zeigen ("link:https://example.com"). Nur
  // http(s), ein Rechnername und danach Zeichen, die in einer Adresse ohne
  // Maskierung vorkommen - keine Anfuehrungszeichen, Leerzeichen, spitzen
  // Klammern oder Backslashes. Wie _EXTERNAL_URL in store.py.
  const EXTERNAL_URL = /^https?:\/\/[A-Za-z0-9][A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]*$/i;
  const EXTERNAL_URL_MAX = 500;
  const isExternalUrl = (value) => typeof value === "string" && value.length <= EXTERNAL_URL_MAX && EXTERNAL_URL.test(value);
  // Der Rechnername einer externen Adresse - als Name, solange es keinen eigenen gibt.
  const externalHost = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./i, "") || url;
    } catch (err) {
      return url;
    }
  };
  const EXTERNAL_ICON = "mdi:open-in-new";
  // Das Ziel eines Link-Eintrags: ein Pfad in Home Assistant oder eine externe Adresse.
  const linkTarget = (key) => {
    const text = String(key || "");
    if (text.indexOf(LINK_PREFIX) !== 0) {
      return "";
    }
    const rest = text.slice(LINK_PREFIX.length);
    return isExternalUrl(rest) ? rest : linkPath(key);
  };
  // Die Einstellungen stehen nur Administratoren offen.
  const linkNeedsAdmin = (path) => /^\/config(\/|$|\?|#)/.test(path);

  // PopUp-Links (1.5.1): ein Eintrag der Seitenleiste, der beim Anklicken ein
  // Fenster mit mehreren Links oeffnet. Schluessel "popup:<id>", die Links
  // stehen in items[key].links als {path, name, icon}.
  const POPUP_PREFIX = "popup:";
  const POPUP_ICON = "mdi:view-grid-outline";
  const POPUP_LINKS_MAX = 24;
  const isPopupKey = (key) => String(key || "").indexOf(POPUP_PREFIX) === 0;
  // Spalten des Fensters (1.5.2): hoechstens max je Zeile, die Zeilen so
  // gleichmaessig wie moeglich (5 -> 3 + 2, 7 -> 4 + 3). Was in der letzten
  // Zeile fehlt, fuellen die Kacheln dort durch ihre Breite auf.
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
      const inside = LINK_PATH.test(path) && path !== "/" && path.length <= 200;
      if ((!inside && !isExternalUrl(path)) || seen.has(path)) {
        return;
      }
      seen.add(path);
      links.push({
        path,
        name: typeof one.name === "string" ? one.name.trim().slice(0, 60) : "",
        icon: typeof one.icon === "string" && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(one.icon) ? one.icon : "",
      });
    });
    return links;
  };
  const POPUP_TEXT = {
    de: { label: "PopUp", close: "Schlie\u00dfen", empty: "Keine Links", noCard: "Keine Karte hinterlegt", cardError: "Die Karte konnte nicht angezeigt werden",
      openTab: "In neuem Tab \u00f6ffnen", noUrl: "Keine Webadresse hinterlegt",
      webNote: "Bleibt die Seite leer? Manche Webseiten erlauben keine Einbettung \u2013 dann oben \"In neuem Tab \u00f6ffnen\" w\u00e4hlen." },
    en: { label: "Popup", close: "Close", empty: "No links", noCard: "No card configured", cardError: "The card could not be shown",
      openTab: "Open in a new tab", noUrl: "No web address configured",
      webNote: "Page stays empty? Some websites do not allow being embedded - use \"Open in a new tab\" above." },
  };
  const popupText = (hass) => {
    const language = String((hass && hass.language) || "en").slice(0, 2);
    return POPUP_TEXT[language] || POPUP_TEXT.en;
  };

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
  // Eine Liste von Pfaden innerhalb von Home Assistant, jeder einmal.
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

  // Die Links der Kopfzeile (und die Favoriten der Einstellungsseite) sind
  // Werte der Konfiguration, die eine Liste sind. Sie wird hier geprueft wie in store.py: nur Pfade innerhalb
  // von Home Assistant, jeder Pfad einmal, Name / Icon / Farbe als kurzer Text.
  const HEADER_LINKS_MAX = 12;
  const ICON_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/i;
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
      // 1.5.4: nur in der Kopfzeile - der Zustand einer Entitaet statt einer Seite
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
            // Farbe des Werts (color ist das Icon) und "nur der Wert"
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
   * Aussehen. Wie _clean_favorites() in store.py.
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

  /**
   * Die vier Knoepfe rechts in der Kopfzeile eines Dashboards.
   *
   * Home Assistant baut sie aus einer Liste und gibt ihnen nur eine
   * durchlaufende Kennung (id="button-0", "button-1", ...) - welche Nummer
   * welcher Knopf ist, haengt davon ab, welche gerade sichtbar sind. Eine
   * Klasse oder ein sprechendes Attribut gibt es nicht. Was bleibt, ist das
   * Icon: es steht als Eigenschaft "path" am Element. Die Werte hier sind
   * die Pfaddaten aus @mdi/js (mdiPlus, mdiMagnify, mdiCommentProcessingOutline,
   * mdiPencil).
   *
   * Aendert Home Assistant eines dieser Icons, greift der zugehoerige Haken
   * nicht mehr - der Knopf bleibt dann einfach stehen. Kaputt geht dabei
   * nichts.
   */
  const HEADER_ACTIONS = {
    add: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
    search:
      "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
    assist:
      "M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9M10,16V19.08L13.08,16H20V4H4V16H10M17,11H15V9H17V11M13,11H11V9H13V11M9,11H7V9H9V11Z",
    edit:
      "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
  };

  /**
   * Beschriftung des Neustart-Knopfes. Home Assistant hat keinen solchen
   * Knopf in der Seitenleiste, es gibt also auch keinen uebersetzten Text,
   * den man uebernehmen koennte. Deutsch und Englisch reichen: wer eine
   * andere Sprache benutzt, traegt unter "Eintraege" einfach einen eigenen
   * Namen ein, genau wie bei jedem anderen Eintrag.
   */
  // Das Fenster eines PopUp-Links (1.5.1) - im eigenen Shadow Root am <body>.
  const POPUP_CSS = [
    ":host { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;",
    "  font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif); --sh-pc-own: var(--sh-pc, var(--primary-color, #03a9f4)); }",
    ".scrim { position: absolute; inset: 0; background: var(--mdc-dialog-scrim-color, rgba(0, 0, 0, .45));",
    "  -webkit-backdrop-filter: var(--ha-dialog-scrim-backdrop-filter, blur(2px)); backdrop-filter: var(--ha-dialog-scrim-backdrop-filter, blur(2px));",
    "  animation: sh-fade .16s ease; }",
    ".card { position: relative; box-sizing: border-box; width: min(var(--sh-w, 560px), calc(100vw - 32px)); max-height: 85vh; overflow: auto;",
    "  scrollbar-width: none;",
    "  padding: 18px 18px 20px; border-radius: var(--ha-dialog-border-radius, 24px);",
    "  background: var(--ha-dialog-surface-background, var(--card-background-color, #fff)); color: var(--primary-text-color, #212121);",
    "  box-shadow: 0 24px 48px rgba(0, 0, 0, .35); animation: sh-pop .18s ease; }",
    ".head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }",
    ".ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;",
    "  color: var(--sh-pc-own); background: color-mix(in srgb, var(--sh-pc-own) 16%, transparent); }",
    "h2 { flex: 1; min-width: 0; margin: 0; font-size: 20px; font-weight: 500; line-height: 1.3;",
    "  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    ".x { flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: inherit;",
    "  display: flex; align-items: center; justify-content: center; cursor: pointer; }",
    ".x:hover, .x:focus-visible { background: color-mix(in srgb, currentColor 10%, transparent); outline: none; }",
    // Kacheln fuellen jede Zeile ganz: --c Spalten, am Handy --cm (hoechstens 2)
    ".grid { display: flex; flex-wrap: wrap; gap: 10px; }",
    ".tile { flex: 1 1 calc((100% - (var(--c, 3) - 1) * 10px) / var(--c, 3)); min-width: 0;",
    "  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px;",
    "  box-sizing: border-box; padding: 12px 8px; border-radius: var(--ha-card-border-radius, 12px);",
    "  border: 1px solid var(--divider-color, rgba(0, 0, 0, .12));",
    "  background: color-mix(in srgb, var(--primary-text-color, #212121) 4%, transparent);",
    "  color: inherit; text-decoration: none; text-align: center; font-size: 13px; line-height: 1.3; cursor: pointer;",
    "  transition: transform .12s ease, border-color .12s ease, background-color .12s ease; }",
    ".tile:hover, .tile:focus-visible { outline: none; transform: translateY(-1px); border-color: var(--sh-pc-own);",
    "  background: color-mix(in srgb, var(--sh-pc-own) 12%, transparent); }",
    ".ti { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;",
    "  color: var(--sh-pc-own); background: color-mix(in srgb, var(--sh-pc-own) 16%, transparent); }",
    ".tn { overflow-wrap: anywhere; }",
    ".empty { grid-column: 1 / -1; margin: 6px 0; opacity: .7; }",
    // 1.5.3: kein Scrollbalken - gescrollt wird trotzdem (Rad, Wischen)
    ".card::-webkit-scrollbar, .cardbox::-webkit-scrollbar { display: none; }",
    // Feste Hoehe auf Wunsch (hoechstens der Bildschirm); die Karte fuellt
    // dann den Platz unter dem Kopf ganz aus.
    ":host([data-height]) .card { height: min(var(--sh-h), calc(100vh - 32px)); max-height: none; }",
    ":host([data-card]) .card { display: grid; grid-template-rows: auto minmax(0, 1fr); }",
    ".cardbox { display: grid; min-height: 40px; overflow: auto; scrollbar-width: none; }",
    ".cardbox > * { display: block; min-width: 0; }",
    ":host([data-height]) .cardbox > * { height: 100%; }",
    ":host([data-card]) .head { margin-bottom: 12px; }",
    // 1.5.7: Webseite im Fenster - der Rahmen fuellt den Platz, darunter ein Hinweis
    ":host([data-web]) .card { grid-template-rows: auto minmax(0, 1fr) auto; }",
    ".webbox { overflow: hidden; border-radius: var(--ha-card-border-radius, 12px); }",
    ".webbox iframe { display: block; width: 100%; height: min(70vh, 640px); border: 0; background: #fff; }",
    ":host([data-height]) .webbox iframe { height: 100%; }",
    ".webnote { margin: 8px 2px 0; font-size: 12px; line-height: 1.4; opacity: .65; }",
    "a.x { text-decoration: none; }",
    "@keyframes sh-fade { from { opacity: 0; } }",
    "@keyframes sh-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }",
    "@media (max-width: 600px) { .card { padding: 14px 14px 16px; } .grid { gap: 8px; }",
    "  .tile { flex-basis: calc((100% - (var(--cm, 2) - 1) * 8px) / var(--cm, 2)); min-height: 92px; } }",
    "@media (prefers-reduced-motion: reduce) { .scrim, .card { animation: none; } .tile { transition: none; } }",
  ].join("\n");

  const RESTART_TEXT = {
    de: {
      label: "Neustart",
      title: "Home Assistant neu starten",
      what: "Was passiert?",
      info: [
        "Home Assistant pr\u00fcft configuration.yaml und alle eingebundenen Dateien \u2013 genau wie \u201eKonfiguration pr\u00fcfen\u201c vor einem Neustart.",
        "Erst \u201eNeu starten\u201c startet Home Assistant neu. Die Oberfl\u00e4che ist dann kurz nicht erreichbar und verbindet sich danach von selbst wieder.",
      ],
      checking: "Konfiguration wird gepr\u00fcft \u2026",
      valid: "Konfiguration ist g\u00fcltig \u2013 ein Neustart ist sicher.",
      invalid: "Konfiguration ist ung\u00fcltig \u2013 Home Assistant startet so nicht neu. Bitte zuerst die Fehler beheben.",
      warnings: "Warnungen",
      failed: "Die Konfiguration konnte nicht gepr\u00fcft werden. Ein Neustart ist trotzdem m\u00f6glich.",
      cancel: "Abbrechen",
      again: "Erneut pr\u00fcfen",
      restart: "Neu starten",
      restarting: "Neustart wird ausgel\u00f6st \u2026",
      restartFailed: "Der Neustart konnte nicht ausgel\u00f6st werden.",
      close: "Schlie\u00dfen",
    },
    en: {
      label: "Restart",
      title: "Restart Home Assistant",
      what: "What happens?",
      info: [
        "Home Assistant checks configuration.yaml and all included files \u2013 just like \u201cCheck configuration\u201d before a restart.",
        "Only \u201cRestart\u201d restarts Home Assistant. The interface is unreachable for a moment and reconnects by itself afterwards.",
      ],
      checking: "Checking the configuration \u2026",
      valid: "Configuration is valid \u2013 a restart is safe.",
      invalid: "Configuration is invalid \u2013 Home Assistant will not restart like this. Please fix the errors first.",
      warnings: "Warnings",
      failed: "The configuration could not be checked. A restart is still possible.",
      cancel: "Cancel",
      again: "Check again",
      restart: "Restart",
      restarting: "Restarting \u2026",
      restartFailed: "The restart could not be started.",
      close: "Close",
    },
  };

  // Zusatz fuer den Neustart-Dialog (1.5.6) - baut auf POPUP_CSS auf
  const RESTART_CSS = [
    ".info { box-sizing: border-box; padding: 12px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5;",
    "  border: 1px solid color-mix(in srgb, var(--sh-pc-own) 40%, transparent);",
    "  background: color-mix(in srgb, var(--sh-pc-own) 9%, transparent); }",
    ".info b { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-weight: 600; }",
    ".info b ha-icon { --mdc-icon-size: 18px; color: var(--sh-pc-own); }",
    ".info ul { margin: 0; padding-left: 20px; }",
    ".info li + li { margin-top: 2px; }",
    ".state { display: flex; align-items: flex-start; gap: 10px; margin: 16px 2px 0; font-size: 14px; font-weight: 500; line-height: 1.45; }",
    ".state ha-icon { flex: none; --mdc-icon-size: 20px; margin-top: -1px; }",
    ".state[data-s=valid] { color: var(--success-color, #43a047); }",
    ".state[data-s=invalid] { color: var(--error-color, #db4437); }",
    ".state[data-s=failed] { color: var(--warning-color, #ffa600); }",
    ".spin { flex: none; box-sizing: border-box; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%;",
    "  border: 2px solid color-mix(in srgb, var(--sh-pc-own) 25%, transparent); border-top-color: var(--sh-pc-own);",
    "  animation: sh-spin .8s linear infinite; }",
    "@keyframes sh-spin { to { transform: rotate(360deg); } }",
    ".log { margin: 10px 0 0; padding: 10px 12px; max-height: 30vh; overflow: auto; border-radius: 10px;",
    "  background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent); color: var(--primary-text-color, #212121);",
    "  font: 12px/1.45 var(--ha-font-family-code, ui-monospace, monospace); white-space: pre-wrap; overflow-wrap: anywhere; }",
    ".log::-webkit-scrollbar { display: none; }",
    ".log[hidden], .btn[hidden] { display: none; }",
    ".sub { margin: 12px 2px 0; font-size: 13px; font-weight: 600; opacity: .8; }",
    ".foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin: 18px -18px 0; padding: 14px 18px 0;",
    "  border-top: 1px solid var(--divider-color, rgba(0, 0, 0, .12)); }",
    ".btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 18px; border-radius: 20px; cursor: pointer;",
    "  border: 1px solid var(--divider-color, rgba(0, 0, 0, .12)); background: transparent; color: inherit;",
    "  font: inherit; font-size: 14px; font-weight: 500; transition: background-color .12s ease, opacity .12s ease; }",
    ".btn ha-icon { --mdc-icon-size: 18px; }",
    ".btn:hover:not(:disabled), .btn:focus-visible { outline: none; background: color-mix(in srgb, currentColor 10%, transparent); }",
    ".btn.go { border-color: transparent; background: var(--sh-pc-own); color: var(--text-primary-color, #fff); }",
    ".btn.go:hover:not(:disabled), .btn.go:focus-visible { background: color-mix(in srgb, var(--sh-pc-own) 85%, #000); }",
    ".btn:disabled { opacity: .45; cursor: default; }",
    "@media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2s; } }",
  ].join("\n");
  const restartText = (hass) => {
    const language = String((hass && hass.language) || "en").slice(0, 2);
    return RESTART_TEXT[language] || RESTART_TEXT.en;
  };

  /* ------------------------------------------------- Systemwerte */

  // Die letzten Werte von CPU und Arbeitsspeicher, im Tab gemerkt
  // (sessionStorage): 60 Werte im Abstand von 5 Sekunden = 5 Minuten, wie
  // auf der Hardware-Seite von Home Assistant.
  const SYSTEM_STORE_KEY = "ha-style-hub-system";
  const SYSTEM_POINTS = 60;

  const SYSTEM_TEXT = {
    de: {
      title: "Systemmonitor",
      cpu: "Prozessor",
      ram: "Arbeitsspeicher",
      disk: "Speicher",
      cpuShort: "CPU",
      ramShort: "RAM",
      freeShort: "Frei",
      usedShort: "Belegt",
      avg: "Ø",
      max: "max.",
      of: "von",
      free: "frei",
      used: "belegt",
      total: "gesamt",
      wait: "Warte auf Werte …",
      none: "nicht verfügbar",
      backupTitle: "Letztes Backup",
      backupLast: "Letztes Backup",
      backupSize: "Größe",
      backupNow: "Backup jetzt erstellen",
      backupConfirm: "Backup mit den automatischen Einstellungen starten?",
      backupStart: "Starten",
      backupCancel: "Abbrechen",
      backupRunning: "Backup läuft …",
      backupStartFailed: "Backup konnte nicht gestartet werden",
      sensorUnavailable: "nicht verfügbar",
      backupName: "Name",
      backupPlace: "Speicherort",
      backupAuto: "Automatisch",
      backupManual: "Manuell",
      backupApp: "Vor einem App-Update",
      backupOne: "Backup vorhanden",
      backupMany: "Backups vorhanden",
      backupNext: "Nächstes:",
      backupFailed: "Fehlgeschlagen:",
      backupNone: "noch kein Backup",
      backupLocal: "Dieses System",
      countsTitle: "Übersicht",
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
      countUnavailable: "nicht verfügbar",
      countOn: "aktiv",
      countEntries: "Einträge",
      countResources: "Ressourcen",
      countOwn: "deine Langzeit-Token",
      countNoApps: "ohne Supervisor",
      countUnreachable: "nicht erreichbar",
      countDisabled: "deaktiviert",
      countFailing: "mit Fehler",
      countRam: "RAM",
      countDisk: "Speicher",
      countLast: "zuletzt",
      countRunning: "laufen",
      countAutomation: "Automation",
      countScript: "Skript",
      countAdmins: "Admins",
      countUsed: "zuletzt genutzt",
    },
    en: {
      title: "System monitor",
      cpu: "Processor",
      ram: "Memory",
      disk: "Storage",
      cpuShort: "CPU",
      ramShort: "RAM",
      freeShort: "Free",
      usedShort: "Used",
      avg: "avg",
      max: "max",
      of: "of",
      free: "free",
      used: "used",
      total: "total",
      wait: "Waiting for values …",
      none: "not available",
      backupTitle: "Last backup",
      backupLast: "Last backup",
      backupSize: "Size",
      backupNow: "Create backup now",
      backupConfirm: "Start a backup with the automatic settings?",
      backupStart: "Start",
      backupCancel: "Cancel",
      backupRunning: "Backup running …",
      backupStartFailed: "The backup could not be started",
      sensorUnavailable: "unavailable",
      backupName: "Name",
      backupPlace: "Location",
      backupAuto: "Automatic",
      backupManual: "Manual",
      backupApp: "Before an app update",
      backupOne: "backup stored",
      backupMany: "backups stored",
      backupNext: "Next:",
      backupFailed: "Failed:",
      backupNone: "no backup yet",
      backupLocal: "This system",
      countsTitle: "Overview",
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
      countUnavailable: "unavailable",
      countOn: "on",
      countEntries: "entries",
      countResources: "resources",
      countOwn: "your long-lived tokens",
      countNoApps: "no Supervisor",
      countUnreachable: "unreachable",
      countDisabled: "disabled",
      countFailing: "failing",
      countRam: "RAM",
      countDisk: "disk",
      countLast: "last",
      countRunning: "running",
      countAutomation: "automation",
      countScript: "script",
      countAdmins: "admins",
      countUsed: "last used",
    },
  };

  /** "vor 19 Std." / "in 4 Std." in der Sprache von Home Assistant. */
  const relativeTime = (hass, time) => {
    const language = (hass && hass.language) || undefined;
    const diff = (time - Date.now()) / 1000;
    const steps = [
      [60, "second", 1],
      [3600, "minute", 60],
      [86400, "hour", 3600],
      [86400 * 30, "day", 86400],
      [86400 * 365, "month", 86400 * 30],
      [Infinity, "year", 86400 * 365],
    ];
    const step = steps.find((one) => Math.abs(diff) < one[0]);
    try {
      return new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" }).format(
        Math.round(diff / step[2]),
        step[1]
      );
    } catch (err) {
      return new Date(time).toLocaleString();
    }
  };

  /** "8.10.2026, 05:08:46" in der Sprache von Home Assistant. */
  const dateTime = (hass, time) => {
    try {
      return new Date(time).toLocaleString((hass && hass.language) || undefined);
    } catch (err) {
      return new Date(time).toLocaleString();
    }
  };

  /** Bytes als [Zahl, Einheit] - wie Home Assistant mit 1024er-Schritten. */
  const byteSize = (bytes, fmt) => {
    if (!(bytes > 0)) {
      return ["–", ""];
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let index = 0;
    let size = bytes;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return [index >= 3 ? fmt.one(size) : fmt.whole(size), units[index]];
  };

  /**
   * Der Name eines Speicherorts wie auf der Backup-Seite: die lokalen heissen
   * "Dieses System", Netzwerkspeicher (hassio.<name>) tragen ihren eigenen
   * Namen, die Cloud heisst Home Assistant Cloud, sonst der Name aus
   * backup/agents/info.
   */
  const backupAgentName = (id, agents, text) => {
    const agentId = String(id || "");
    if (agentId === "backup.local" || agentId === "hassio.local") {
      return text.backupLocal;
    }
    if (agentId === "cloud.cloud") {
      return "Home Assistant Cloud";
    }
    const agent = (agents || []).find((one) => one && one.agent_id === agentId);
    if (agent && agent.name) {
      return String(agent.name);
    }
    return agentId.split(".").pop() || agentId;
  };

  const systemText = (hass) => {
    const language = String((hass && hass.language) || "en").slice(0, 2);
    return SYSTEM_TEXT[language] || SYSTEM_TEXT.en;
  };

  /**
   * Der neueste Wert - aber nur, solange er frisch ist (Werte kommen alle
   * 5 Sekunden). Ein alter Wert aus dem Verlauf wird nicht als aktuell
   * gezeigt.
   */
  const freshPoint = (feed) => {
    const last = feed.points[feed.points.length - 1];
    return last && Date.now() - last.t < 30000 ? last : null;
  };

  /** Zahlen in der Sprache von Home Assistant (1,5 statt 1.5). */
  const numberFormat = (hass) => {
    const language = (hass && hass.language) || undefined;
    let whole;
    let one;
    try {
      whole = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });
      one = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } catch (err) {
      whole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
      one = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return { whole: (n) => whole.format(Math.round(n)), one: (n) => one.format(n) };
  };

  /**
   * Fläche und Linie des Verlaufs (0-100 %) fuer ein SVG mit der viewBox
   * 0 0 59 100. Der neueste Wert steht rechts; solange es weniger als 60
   * Werte gibt, beginnt der Verlauf weiter rechts.
   */
  const graphPaths = (values) => {
    if (values.length < 2) {
      return ["", ""];
    }
    const start = SYSTEM_POINTS - values.length;
    const points = values.map((one, index) => {
      const x = start + index;
      const y = 100 - clamp(one, 0, 100);
      return `${x},${y.toFixed(1)}`;
    });
    const line = `M${points.join(" L")}`;
    const first = points[0].split(",")[0];
    const last = points[points.length - 1].split(",")[0];
    return [`${line} L${last},100 L${first},100 Z`, line];
  };

  /**
   * Das Aussehen eines Favoriten als CSS-Variablen fuer seinen Knopf. Was
   * leer bzw. -1 ist, fehlt - dann gilt die Vorgabe aus buildDashboardCss
   * (ueber den Karten wie eine Karte, in der Kopfleiste passend zur Leiste).
   */
  const favoriteStyle = (link) => {
    const out = {};
    const px = (raw, fallback) => {
      const n = Math.round(number(raw, -1));
      return n >= 0 ? `${n}px` : fallback;
    };
    const color = (name, raw) => {
      const text = css(raw);
      if (text) {
        out[name] = text;
      }
    };
    color("--sh-fav-color", link.color);
    color("--sh-fav-text", link.text_color);
    color("--sh-fav-bg", link.background);
    color("--sh-fav-bc", link.border_color);
    const height = Math.round(number(link.height, -1));
    if (height >= 16) {
      out["--sh-fav-h"] = `${height}px`;
    }
    if (link.border_split === true) {
      const side = "var(--sh-fav-bw0)";
      out["--sh-fav-bw"] = ["border_top", "border_right", "border_bottom", "border_left"]
        .map((key) => px(link[key], side))
        .join(" ");
    } else if (number(link.border_width, -1) >= 0) {
      out["--sh-fav-bw"] = px(link.border_width, "");
    }
    if (link.radius_split === true) {
      const corner = "var(--sh-fav-r0)";
      out["--sh-fav-r"] = ["radius_tl", "radius_tr", "radius_br", "radius_bl"]
        .map((key) => px(link[key], corner))
        .join(" ");
    } else if (number(link.radius, -1) >= 0) {
      out["--sh-fav-r"] = px(link.radius, "");
    }
    if (link.uppercase === true) {
      out["--sh-fav-tt"] = "uppercase";
      out["--sh-fav-ls"] = ".04em";
    }
    return out;
  };

  /**
   * Welche Ueberschriften sind zugeklappt.
   *
   * Bewusst im localStorage und nicht in der Konfiguration: das Zuklappen ist
   * eine Ansichtssache, keine Einstellung. Sie in der Konfiguration abzulegen
   * haette zwei Haken - sie wuerde fuer alle Benutzer und alle Geraete
   * gleichzeitig gelten, und das Speichern ueber die Websocket-API ist
   * Administratoren vorbehalten, ein normaler Benutzer koennte also gar nicht
   * zuklappen.
   */
  const COLLAPSE_KEY = "ha-style-hub-collapsed";

  const readCollapsed = () => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((one) => typeof one === "string") : [];
    } catch (err) {
      return [];
    }
  };

  const writeCollapsed = (list) => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(list));
    } catch (err) {
      /* privates Fenster, voller Speicher - dann eben nur fuer diese Sitzung */
    }
  };

  /**
   * Die zuletzt vom Server gelesene Konfiguration, pro Browser.
   *
   * Nach einem Neuladen der Seite dauert es einen Moment, bis die
   * Websocket-Verbindung steht und die Konfiguration da ist. Zeichnet Home
   * Assistant in dieser Zeit schon eine Einstellungsseite oder ein Dashboard,
   * waere kurz das Original zu sehen. Mit dem gemerkten Stand kann das
   * Stylesheet sofort geschrieben werden; die Antwort des Servers ersetzt ihn
   * gleich danach.
   */
  const CONFIG_KEY = "ha-style-hub-config";

  const readCachedConfig = () => {
    try {
      const raw = window.localStorage.getItem(CONFIG_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return isObject(data) ? data : null;
    } catch (err) {
      return null;
    }
  };

  const writeCachedConfig = (config) => {
    try {
      if (isObject(config)) {
        window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      } else {
        window.localStorage.removeItem(CONFIG_KEY);
      }
    } catch (err) {
      /* privates Fenster, voller Speicher - dann eben ohne */
    }
  };

  /**
   * Elemente von Home Assistant, die sich nach dem Zeichnen selbst melden.
   *
   * Derselbe Weg, den UIX (der Nachfolger von card-mod) geht: warten, bis
   * das Element registriert ist (customElements.whenDefined), und dann die
   * Methode "updated" seiner Klasse umhuellen. Lit ruft sie nach jedem
   * Zeichnen auf - im selben Arbeitsschritt, also bevor der Browser das Bild
   * ausgibt. Das Original laeuft immer zuerst und unveraendert; ein Fehler
   * im eigenen Teil wird geschluckt, damit Home Assistant nie daran haengt.
   *
   * Der Stand liegt an window, damit ein zweites Laden dieses Skripts (alte
   * und neue Fassung nach einem Update) dieselbe Klasse nicht doppelt
   * umhuellt. Aufgerufen wird deshalb immer window.__sidebarHub - die
   * zuletzt geladene Fassung.
   */
  const HOOKED = (window.__haStyleHubHooked = window.__haStyleHubHooked || {});
  // So oft meldet sich ein einzelnes Element; danach steht sein Aufbau fest.
  const HOOK_RUNS = 3;

  const hookElement = (tag, method) => {
    if (HOOKED[tag] || !window.customElements || !window.customElements.whenDefined) {
      return;
    }
    HOOKED[tag] = "waiting";
    window.customElements
      .whenDefined(tag)
      .then(() => {
        const cls = window.customElements.get(tag);
        const proto = cls && cls.prototype;
        if (!proto) {
          return;
        }
        const runs = new WeakMap();
        const original = proto.updated;
        proto.updated = function (...args) {
          const result =
            typeof original === "function" ? original.apply(this, args) : undefined;
          try {
            const count = runs.get(this) || 0;
            const hub = window.__sidebarHub;
            if (count < HOOK_RUNS && hub && typeof hub[method] === "function") {
              // "false" heisst: das Element hat noch keinen Inhalt - dieser
              // Durchlauf zaehlt nicht, beim naechsten Zeichnen noch einmal.
              if (hub[method](this) !== false) {
                runs.set(this, count + 1);
              }
            }
          } catch (err) {
            /* darf Home Assistant nie stoeren */
          }
          return result;
        };
        HOOKED[tag] = "active";
      })
      .catch(() => {
        HOOKED[tag] = "";
      });
  };

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

  // Ein PopUp-Link (1.5.1): wie ein Eintrag, dazu seine Links.
  const DEFAULT_POPUP_LINKS = [];
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
  const DEFAULT_POPUP = Object.assign({}, DEFAULT_ITEM, {
    links: DEFAULT_POPUP_LINKS,
    // 1.5.3: Inhalt (Links oder Karte), Karte als YAML und als Konfiguration,
    // Fenstergroesse in px (0 = automatisch)
    content: "links",
    card_yaml: "",
    card: {},
    // 1.5.7: Inhalt "web" - die Adresse der Seite im Fenster
    url: "",
    width: 0,
    height: 0,
  });
  const POPUP_CARD_MAX = 51200;
  const POPUP_SIZE_MAX = 4000;
  /**
   * Bei fester Fensterhoehe (1.5.3): die Karte soll den Platz ausfuellen.
   * Viele Karten haben "ha-card { height: 100% }" schon selbst; fuer die
   * anderen kommt diese Regel in ihren Shadow Root, sobald er da ist.
   */
  const FILL_CSS = "ha-card { height: 100%; box-sizing: border-box; }";
  let fillSheet = null;
  const fillHeight = (element) => {
    const add = () => {
      const root = element.shadowRoot;
      if (!root) {
        return;
      }
      // Als eigenes Stylesheet (wie Lit selbst) - ein neues Rendern der
      // Karte nimmt es nicht wieder weg.
      try {
        if (!fillSheet) {
          fillSheet = new CSSStyleSheet();
          fillSheet.replaceSync(FILL_CSS);
        }
        if (root.adoptedStyleSheets.indexOf(fillSheet) < 0) {
          root.adoptedStyleSheets = root.adoptedStyleSheets.concat(fillSheet);
        }
      } catch (err) {
        if (!root.querySelector("style[data-sh-fill]")) {
          const style = document.createElement("style");
          style.setAttribute("data-sh-fill", "");
          style.textContent = FILL_CSS;
          root.appendChild(style);
        }
      }
    };
    Promise.resolve(element.updateComplete).then(add, add);
    window.setTimeout(add, 300);
  };
  /** Inhalt, Karte und Groesse eines PopUps pruefen - wie store.py. */
  const cleanPopupCard = (entry) => {
    if (entry.content !== "card" && entry.content !== "web") {
      entry.content = "links";
    }
    // 1.5.7: Inhalt "web" - die Adresse der Seite, die das Fenster zeigt
    if (!isExternalUrl(entry.url)) {
      entry.url = "";
    }
    if (typeof entry.card_yaml !== "string" || new Blob([entry.card_yaml]).size > POPUP_CARD_MAX) {
      entry.card_yaml = "";
    }
    let card = {};
    try {
      const text = JSON.stringify(entry.card);
      if (isObject(entry.card) && typeof entry.card.type === "string" && entry.card.type.trim() &&
          new Blob([text]).size <= POPUP_CARD_MAX) {
        card = JSON.parse(text);
      }
    } catch (err) {
      card = {};
    }
    entry.card = card;
    ["width", "height"].forEach((key) => {
      const n = Number(entry[key]);
      entry[key] = typeof entry[key] === "number" && Number.isFinite(n) ? Math.max(0, Math.min(POPUP_SIZE_MAX, Math.round(n))) : 0;
    });
    return entry;
  };

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  const isObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

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

  const themeSummary = (raw) => {
    const theme = isObject(raw) ? raw : {};
    const count = (mode) =>
      isObject(mode)
        ? Object.keys(mode).filter((key) => mode[key] !== "" && mode[key] !== null && mode[key] !== false).length
        : 0;
    return {
      enabled: theme.enabled === true,
      name: typeof theme.name === "string" ? theme.name.trim() : "",
      dark: count(theme.dark),
      light: count(theme.light),
    };
  };

  const normalize = (raw) => {
    const data = isObject(raw) ? raw : {};
    const items = {};
    if (isObject(data.items)) {
      Object.keys(data.items).forEach((key) => {
        items[key] = section(
          key.indexOf(HEADING_PREFIX) === 0 ? DEFAULT_HEADING : isPopupKey(key) ? DEFAULT_POPUP : DEFAULT_ITEM,
          data.items[key]
        );
        if (isPopupKey(key)) {
          items[key].links = cleanPopupLinks(isObject(data.items[key]) ? data.items[key].links : null);
          cleanPopupCard(items[key]);
        }
      });
    }
    return {
      layout: section(DEFAULT_LAYOUT, data.layout),
      appearance: section(DEFAULT_APPEARANCE, data.appearance),
      advanced: section(DEFAULT_ADVANCED, data.advanced),
      header: Object.assign(section(DEFAULT_HEADER, data.header), {
        links: cleanHeaderLinks(isObject(data.header) ? data.header.links : null, true),
      }),
      settings: Object.assign(section(DEFAULT_SETTINGS, data.settings), {
        menu_order: cleanPaths(isObject(data.settings) ? data.settings.menu_order : null),
        menu_hidden: cleanPaths(isObject(data.settings) ? data.settings.menu_hidden : null),
        favorites: cleanFavorites(isObject(data.settings) ? data.settings.favorites : null),
        favorites_place:
          isObject(data.settings) && FAVORITES_PLACES.indexOf(data.settings.favorites_place) >= 0
            ? data.settings.favorites_place
            : DEFAULT_SETTINGS.favorites_place,
        monitor_place:
          isObject(data.settings) && MONITOR_PLACES.indexOf(data.settings.monitor_place) >= 0
            ? data.settings.monitor_place
            : DEFAULT_SETTINGS.monitor_place,
        monitor_backup_place:
          isObject(data.settings) && MONITOR_PLACES.indexOf(data.settings.monitor_backup_place) >= 0
            ? data.settings.monitor_backup_place
            : DEFAULT_SETTINGS.monitor_backup_place,
        monitor_counts_place:
          isObject(data.settings) && MONITOR_PLACES.indexOf(data.settings.monitor_counts_place) >= 0
            ? data.settings.monitor_counts_place
            : DEFAULT_SETTINGS.monitor_counts_place,
        monitor_counts_items: cleanCountItems(isObject(data.settings) ? data.settings.monitor_counts_items : null),
        menu_items: cleanMenuItems(isObject(data.settings) ? data.settings.menu_items : null),
        monitor_sensors: cleanSensors(isObject(data.settings) ? data.settings.monitor_sensors : null),
      }),
      // Das Theme setzt Home Assistant selbst; hier reicht fuer die
      // Debug-Ausgabe, ob es eingetragen wird, wie es heisst und wie viele
      // Werte je Modus gesetzt sind.
      theme: themeSummary(data.theme),
      order: Array.isArray(data.order)
        ? data.order.filter((key) => typeof key === "string")
        : [],
      items: items,
    };
  };

  /**
   * Return a trimmed CSS value or "" when nothing usable was configured.
   * Numbers count too: a <select> hands back "500" as a number, and the font
   * weight would silently fall back to the default if that were ignored.
   */
  const value = (raw) => {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw);
    }
    return typeof raw === "string" ? raw.trim() : "";
  };

  /**
   * A value that goes into a CSS declaration. Same as value(), but anything
   * that would break out of the declaration - or leave it open - is dropped:
   * a ";", a brace, an unclosed bracket or quote. The color fields are free
   * text with a live preview, and a half typed "rgba(0,0,0" would otherwise
   * swallow every rule that follows it in the stylesheet (hidden entries come
   * back, the order is lost) until the bracket is closed.
   */
  const css = (raw) => {
    const text = value(raw);
    if (!text) {
      return "";
    }
    if (/[;{}\\\n\r]/.test(text) || text.indexOf("*/") >= 0 || text.indexOf("/*") >= 0) {
      return "";
    }
    let depth = 0;
    let quoteChar = "";
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = "";
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth < 0) {
          return "";
        }
      }
    }
    return depth === 0 && !quoteChar ? text : "";
  };

  /**
   * The sidebar background: either the plain value, or a gradient assembled
   * from the two colors and the direction. Anything the user typed by hand
   * still comes through unchanged while the gradient switch is off.
   */
  const backgroundOf = (look) => {
    const first = css(look.background);
    if (!first || !look.background_gradient) {
      return first;
    }
    const second = css(look.background_color2) || first;
    const direction = css(look.gradient_direction) || "to bottom";
    return direction === "radial"
      ? `radial-gradient(circle at 50% 0%, ${first}, ${second})`
      : `linear-gradient(${direction}, ${first}, ${second})`;
  };

  /** Return a number, or the fallback when the input is not usable. */
  const number = (raw, fallback) => {
    const parsed = typeof raw === "number" ? raw : parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const clamp = (input, min, max) => Math.min(max, Math.max(min, input));

  /**
   * True when the value is a color (or empty). color-mix() only takes colors;
   * a gradient typed into a color field has to be left alone.
   */
  const isColor = (raw) => {
    const text = css(raw);
    if (!text) {
      return true;
    }
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
      return true;
    }
    return CSS.supports("color", text);
  };

  /** Escape a string so it can be used inside a CSS attribute selector. */
  const quote = (raw) =>
    String(raw).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ").replace(/\r/g, "");

  /**
   * Change the text of a label Home Assistant renders. The text node that is
   * already there is reused: Home Assistant (Lit) keeps a reference to it and
   * writes later changes into exactly that node. Replacing it through
   * textContent would cut that link, and the label could never follow a
   * renamed dashboard again.
   */
  const setText = (element, text) => {
    const nodes = Array.from(element.childNodes).filter((node) => node.nodeType === 3);
    if (!nodes.length || element.children.length) {
      element.textContent = text;
      return;
    }
    const target = nodes.find((node) => node.data.trim() !== "") || nodes[0];
    nodes.forEach((node) => {
      const next = node === target ? text : "";
      if (node.data !== next) {
        node.data = next;
      }
    });
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Poll a getter until it returns a custom element that already has its
   * shadow root.
   *
   * Asking for the element alone is not enough: <home-assistant> and its
   * children sit in the document before their classes are registered, and
   * only the upgrade attaches the shadow root. Without this check the very
   * first lookup can win a race it should have lost and hand back an element
   * whose shadowRoot is still null.
   */
  const waitForShadow = async (getter, timeout, interval) =>
    waitFor(
      () => {
        const element = getter();
        return element && element.shadowRoot ? element : null;
      },
      timeout,
      interval
    );

  /**
   * Poll a getter until it returns something truthy.
   * Used instead of a hard querySelector chain because Home Assistant loads
   * large parts of the frontend asynchronously.
   */
  const waitFor = async (getter, timeout = 30000, interval = 50) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      let found;
      try {
        found = getter();
      } catch (err) {
        found = null;
      }
      if (found) {
        return found;
      }
      if (Date.now() > deadline) {
        return null;
      }
      await sleep(interval);
    }
  };

  /* ------------------------------------------------------------------ *
   * Stylesheet handling
   *
   * Constructable stylesheets are appended to adoptedStyleSheets, so they
   * always come after the styles of the component itself and win a
   * specificity tie. A <style> element inside the shadow root would lose
   * that tie, so it is only used as a fallback on very old browsers.
   * ------------------------------------------------------------------ */

  const SUPPORTS_ADOPTED =
    typeof CSSStyleSheet === "function" &&
    (() => {
      try {
        new CSSStyleSheet();
        return "adoptedStyleSheets" in Document.prototype;
      } catch (err) {
        return false;
      }
    })();

  class Sheet {
    constructor(root, id) {
      this.root = root;
      this.id = id;
      this.css = null;
      this.sheet = null;
      this.element = null;
    }

    /** Write new CSS. Identical CSS is skipped so nothing is recalculated. */
    write(css) {
      if (css === this.css) {
        return;
      }
      this.css = css;

      if (SUPPORTS_ADOPTED) {
        if (!this.sheet) {
          this.sheet = new CSSStyleSheet();
          this.root.adoptedStyleSheets = [
            ...this.root.adoptedStyleSheets,
            this.sheet,
          ];
        }
        try {
          this.sheet.replaceSync(css);
        } catch (err) {
          console.error(TAG, "invalid CSS", err);
        }
        return;
      }

      if (!this.element) {
        this.element = document.createElement("style");
        this.element.setAttribute("data-ha-style-hub", this.id);
        this.root.appendChild(this.element);
      }
      this.element.textContent = css;
    }

    /** Remove the stylesheet again. */
    clear() {
      this.write("");
    }

    /** True when the sheet is still attached to its root. */
    get alive() {
      if (this.sheet) {
        return this.root.adoptedStyleSheets.includes(this.sheet);
      }
      return !!this.element && this.element.isConnected;
    }
  }

  /* ------------------------------------------------------------------ *
   * Sidebar generations
   *
   * gen 3  HA >= 2026.5   ha-list-nav  + ha-list-item-button  (::part)
   * gen 2  HA >= 2025.3   ha-md-list   + ha-md-list-item
   * gen 1  HA <= 2025.2   paper-listbox + paper-icon-item     (styling only)
   * ------------------------------------------------------------------ */

  const GENERATIONS = [
    { gen: 3, list: "ha-list-nav", item: "ha-list-item-button", parts: true },
    { gen: 2, list: "ha-md-list", item: "ha-md-list-item", parts: false },
    { gen: 1, list: "paper-listbox", item: "paper-icon-item", parts: false },
  ];

  const detectGeneration = (root) => {
    for (const candidate of GENERATIONS) {
      if (root.querySelector(candidate.list)) {
        return candidate;
      }
    }
    return null;
  };

  /* ------------------------------------------------------------------ *
   * Item keys
   *
   * panel:<url_path>   every dashboard / panel
   * config             Settings
   * notifications      Notifications
   * profile            the user entry at the bottom
   * external-config    settings entry of the companion app
   * ------------------------------------------------------------------ */

  const FIXED_BY_CLASS = {
    configuration: "config",
    notifications: "notifications",
    user: "profile",
  };

  const FIXED_BY_ID = {
    "sidebar-config": "config",
    "sidebar-notifications": "notifications",
    "sidebar-profile": "profile",
    "sidebar-external-config": "external-config",
  };

  const panelKeyFromHref = (href) => {
    if (!href || typeof href !== "string") {
      return null;
    }
    const path = href.split("?")[0].split("#")[0].replace(/^\/+/, "");
    const first = path.split("/")[0];
    return first ? `panel:${first}` : null;
  };

  /** Work out the HA Style Hub key of a rendered sidebar entry. */
  const keyOfItem = (item) => {
    // Eigene Links tragen seit 1.5.5 ein href (Rechtsklick) - ihr Schluessel
    // ist link:<pfad> und bleibt, sie sind kein Panel von Home Assistant.
    if (item.hasAttribute("data-sh-link")) {
      return null;
    }
    const id = item.getAttribute("id") || "";
    if (FIXED_BY_ID[id]) {
      return FIXED_BY_ID[id];
    }
    for (const cls of Object.keys(FIXED_BY_CLASS)) {
      if (item.classList.contains(cls)) {
        return FIXED_BY_CLASS[cls];
      }
    }
    if (id.startsWith("sidebar-panel-")) {
      return `panel:${id.slice("sidebar-panel-".length)}`;
    }
    // gen 2 sets href as a property, gen 1 wraps the item in an <a>
    const href =
      item.href ||
      item.getAttribute("href") ||
      (item.closest && item.closest("a") ? item.closest("a").getAttribute("href") : null);
    return panelKeyFromHref(href);
  };

  /** The id Home Assistant gives an entry, or null when it has none. */
  const idOfKey = (key) => {
    if (key === "config") return "sidebar-config";
    if (key === "notifications") return "sidebar-notifications";
    if (key === "profile") return "sidebar-profile";
    if (key === "external-config") return "sidebar-external-config";
    if (key.startsWith("panel:")) return `sidebar-panel-${key.slice(6)}`;
    return null;
  };

  /** All CSS selectors that address one entry (data attribute plus the id). */
  const selectorListOfKey = (key) => {
    const list = [`[data-sh-key="${quote(key)}"]`];
    const id = idOfKey(key);
    if (id) {
      list.push(`[id="${quote(id)}"]`);
    }
    return list;
  };

  /**
   * Build a selector for one entry.
   * Important: a prefix or suffix has to be applied to *every* selector of the
   * list - ":host([expanded]) a, b" would only scope the first one.
   */
  const selectorsOfKey = (key, prefix, suffix) =>
    selectorListOfKey(key)
      .map((one) => `${prefix ? prefix + " " : ""}${one}${suffix || ""}`)
      .join(", ");

  /* ------------------------------------------------------------------ *
   * CSS builders
   * ------------------------------------------------------------------ */

  /** Stylesheet for the shadow root of home-assistant (sidebar width). */
  const buildRootCss = (config) => {
    const layout = config.layout;

    // Ausgeblendete Seitenleiste: die Breite auf null, damit der Inhalt
    // daneben den Platz bekommt. Die Leiste selbst verschwindet ueber
    // :host { display: none } in ihrem eigenen Stylesheet.
    if (layout.hide_sidebar) {
      return [
        "home-assistant-main:not([modal]),",
        "home-assistant-main[expanded]:not([modal]) {",
        "  --ha-sidebar-width: 0px !important;",
        "}",
      ].join("\n");
    }

    const wide = clamp(number(layout.width, 256), 56, 1000);
    const narrow = clamp(number(layout.width_collapsed, 56), 40, 400);

    return [
      "home-assistant-main:not([modal]) {",
      `  --ha-sidebar-width: calc(${narrow}px + var(--safe-area-inset-left, 0px));`,
      "}",
      "home-assistant-main[expanded]:not([modal]) {",
      `  --ha-sidebar-width: calc(${wide}px + var(--safe-area-inset-left, 0px));`,
      "}",
    ].join("\n");
  };

  /** Stylesheet for the shadow root of ha-drawer (the divider line). */
  const buildDrawerCss = (config) => {
    const look = config.appearance;
    const width = clamp(number(look.border_width, 0), 0, 20);
    const color = css(look.border_color);
    if (!width && !color) {
      return "";
    }
    return [
      ".sidebar-shell {",
      `  border-inline-end: ${width}px solid ${color || "transparent"} !important;`,
      "}",
    ].join("\n");
  };

  /**
   * Stylesheet for the shadow root of <notification-drawer>, the panel that
   * slides in when the notifications entry is clicked.
   *
   * It is a separate dialog, not part of the sidebar, so it is only touched
   * when the user asks for it. The drawer is built lazily on the first open
   * and then kept around, which is why the injector re-checks for it.
   */
  const buildNotificationCss = (config) => {
    const look = config.appearance;
    if (!look.style_notifications) {
      return "";
    }
    const out = [];

    // own colors take precedence, otherwise the sidebar text color is used
    const bodyColor = css(look.notif_text_color) || css(look.text_color);
    const headerColor = css(look.notif_header_color) || css(look.text_color);

    const body = [];
    const drawerBackground = backgroundOf(look);
    if (drawerBackground) {
      body.push(`  background: ${drawerBackground} !important;`);
    }
    if (bodyColor) {
      body.push(`  color: ${bodyColor} !important;`);
      // the notification entries are separate components - the custom
      // property reaches into their shadow roots, the color alone would not
      body.push(`  --primary-text-color: ${bodyColor};`);
    }
    if (body.length) {
      out.push(".notifications {", ...body, "}");
    }

    const header = [];
    if (css(look.header_background)) {
      header.push(
        `  --app-header-background-color: ${css(look.header_background)};`
      );
    }
    if (headerColor) {
      // drives the title and, through currentColor, the close icon as well
      header.push(`  --app-header-text-color: ${headerColor};`);
    }
    if (header.length) {
      out.push("ha-header-bar {", ...header, "}");
    }
    return out.join("\n");
  };

  /**
   * Stylesheet for the shadow root of a navigation list.
   *
   * merge = true   the list dissolves (display: contents) so that every entry
   *                becomes a direct grid item of .panels-list. This is what
   *                makes Settings / Notifications / the user entry freely
   *                sortable together with the dashboards.
   * merge = false  each list becomes its own grid.
   */
  const buildListCss = (config, merge) => {
    // The scrolling container lives inside the list's shadow root, so the
    // ::-webkit-scrollbar rule has to be written into that tree as well - a
    // pseudo element can only be styled from the tree its element is in.
    const noScrollbar = config.layout.hide_scrollbar
      ? [
          ":host, .base, .list, .ha-scrollbar, [role='list'] {",
          "  scrollbar-width: none !important;",
          "}",
          ":host::-webkit-scrollbar,",
          ".base::-webkit-scrollbar,",
          ".list::-webkit-scrollbar,",
          ".ha-scrollbar::-webkit-scrollbar {",
          "  width: 0 !important;",
          "  height: 0 !important;",
          "  display: none !important;",
          "}",
        ]
      : [];

    if (merge) {
      return [
        ":host, nav, .base, .list, [role='list'] {",
        "  display: contents !important;",
        "}",
        ...noScrollbar,
      ].join("\n");
    }

    // --sh-cols and --sh-gap are set on the sidebar host and inherit into
    // this shadow root, so the same sheet works for both sidebar states.
    return [
      ":host { display: block; }",
      "nav { display: block; }",
      ".base, .list, [role='list'] {",
      "  display: grid !important;",
      "  grid-template-columns: repeat(var(--sh-cols, 1), minmax(0, 1fr)) !important;",
      "  gap: var(--sh-gap, 6px) !important;",
      "  padding: var(--sh-pad, 4px) !important;",
      "  box-sizing: border-box;",
      "  align-content: start;",
      "}",
      ...noScrollbar,
    ].join("\n");
  };

  /**
   * Hintergrund der Kopfzeile, wenn er durchscheinen soll.
   *
   * Der Weichzeichner (backdrop-filter) zeichnet nur das weich, was hinter
   * der Leiste liegt. Bei deckender Farbe sieht man davon nichts - darum
   * gibt es die Deckkraft. Ohne eigene Farbe wird die Farbe des Themes
   * genommen (--app-header-background-color, die Home Assistant selbst
   * benutzt).
   */
  const headerBackground = (head) => {
    const percent = clamp(Math.round(number(head.background_opacity, 100)), 0, 100);
    // A hand written gradient or image in the color field cannot be mixed
    // with transparent - the whole declaration would be invalid and the
    // header would lose its background. It is then used as it is.
    if (
      percent >= 100 ||
      !isColor(head.background) ||
      (head.background_gradient && !isColor(head.background_color2))
    ) {
      return backgroundOf(head);
    }
    const fade = (color) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
    const first =
      css(head.background) || "var(--app-header-background-color, var(--primary-color))";
    if (!head.background_gradient) {
      return fade(first);
    }
    const second = css(head.background_color2) || first;
    const direction = css(head.gradient_direction) || "to bottom";
    return direction === "radial"
      ? `radial-gradient(circle at 50% 0%, ${fade(first)}, ${fade(second)})`
      : `linear-gradient(${direction}, ${fade(first)}, ${fade(second)})`;
  };

  /**
   * Rahmen und Ecken: eine Zahl fuer alle oder, wenn "einzeln" gewaehlt ist,
   * vier. -1 heisst "wie Home Assistant" (null = nichts anfassen), 0 ist ein
   * echter Wert. Fehlt in der Einzelansicht eine Seite, gilt der Gesamtwert,
   * sonst der Wert, den Home Assistant selbst benutzt.
   */
  const SIDE_KEYS = ["top", "right", "bottom", "left"];
  const CORNER_KEYS = ["tl", "tr", "br", "bl"];
  const HA_CARD_RADIUS = "var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px))";
  const HA_ITEM_RADIUS = "var(--ha-list-item-focus-radius, var(--ha-border-radius-sm, 4px))";

  const frameWidths = (s, prefix, fallback) => {
    const one = number(s[`${prefix}_border_width`], -1);
    if (s[`${prefix}_border_split`] === true) {
      const each = SIDE_KEYS.map((key) => number(s[`${prefix}_side_${key}`], -1));
      if (one < 0 && each.every((side) => side < 0)) {
        return null;
      }
      return each
        .map((side) => `${clamp(Math.round(side >= 0 ? side : one >= 0 ? one : fallback), 0, 20)}px`)
        .join(" ");
    }
    return one >= 0 ? `${clamp(Math.round(one), 0, 20)}px` : null;
  };

  const frameRadii = (s, prefix, fallback) => {
    const one = number(s[`${prefix}_border_radius`], -1);
    if (s[`${prefix}_corner_split`] === true) {
      const each = CORNER_KEYS.map((key) => number(s[`${prefix}_corner_${key}`], -1));
      if (one < 0 && each.every((corner) => corner < 0)) {
        return null;
      }
      return each
        .map((corner) =>
          corner >= 0 ? `${clamp(Math.round(corner), 0, 60)}px` : one >= 0 ? `${clamp(Math.round(one), 0, 60)}px` : fallback
        )
        .join(" ");
    }
    return one >= 0 ? `${clamp(Math.round(one), 0, 60)}px` : null;
  };

  /** Rahmen und Ecken der Menuepunkte (die Zeilen der Einstellungsseite). */
  const buildMenuCss = (s) => {
    const widths = frameWidths(s, "menu", 0);
    const radii = frameRadii(s, "menu", HA_ITEM_RADIUS);
    // Maus hover: eine eigene Farbe ueber dem Punkt; die Welle von Home
    // Assistant (ha-ripple) wird dann still gestellt, sonst laege ihr Grau
    // zusaetzlich darueber.
    const hover = css(s.menu_hover_background);
    let hoverCss = "";
    if (hover) {
      const opacity = clamp(Math.round(number(s.menu_hover_opacity, 100)), 0, 100);
      const tint =
        opacity >= 100 || !isColor(hover) ? hover : `color-mix(in srgb, ${hover} ${opacity}%, transparent)`;
      hoverCss =
        `ha-list-item-button:hover::part(base) { background-image: linear-gradient(${tint}, ${tint}) !important; }\n` +
        "ha-list-item-button { --ha-ripple-hover-opacity: 0 !important; }";
    }
    if (!widths && !radii) {
      return hoverCss;
    }
    const rule = ["box-sizing: border-box !important;"];
    if (widths) {
      const color = css(s.menu_border_color) || "var(--divider-color, #e0e0e0)";
      rule.push(`border-style: solid !important; border-width: ${widths} !important; border-color: ${color} !important;`);
    }
    if (radii) {
      rule.push(`border-radius: ${radii} !important; overflow: hidden !important;`);
    }
    return `ha-list-item-button::part(base) { ${rule.join(" ")} }${hoverCss ? `\n${hoverCss}` : ""}`;
  };

  /**
   * CSS fuer die Symbole der Einstellungsseite. Jede Angabe ist einzeln
   * optional; was leer oder 0 ist, bleibt, wie Home Assistant es zeichnet.
   *
   * Zur Groesse: .icon-background hat selbst keine Masse, die Box ergibt sich
   * aus dem Symbol (ha-svg-icon, 24 px) plus dessen Innenabstand (8 px). Die
   * Boxgroesse wird deshalb ueber den Innenabstand des Symbols eingestellt.
   * Der Hintergrund steht bei Home Assistant als style="" am Element, darum
   * braucht die Farbe !important.
   */
  const buildIconCss = (s) => {
    const out = [];
    const box = [];
    if (s.icon_box === true) {
      box.push(`border-radius: ${clamp(Math.round(number(s.icon_radius, 12)), 0, 60)}px !important;`);
    }
    const background = css(s.icon_background);
    if (background) {
      box.push(`background-color: ${background} !important;`);
    }
    if (box.length) {
      out.push(`${ICON_BOX_SELECTOR} { ${box.join(" ")} }`);
    }
    const glyph = clamp(Math.round(number(s.icon_size, 0)), 0, 64);
    const size = clamp(Math.round(number(s.icon_box_size, 0)), 0, 96);
    const color = css(s.icon_color);
    const inner = [];
    if (glyph > 0) {
      inner.push(
        `width: ${glyph}px !important; height: ${glyph}px !important; --mdc-icon-size: ${glyph}px !important;`
      );
    }
    if (size > 0) {
      const base = glyph > 0 ? glyph : 24;
      inner.push(
        `box-sizing: content-box !important; padding: ${Math.max(0, (size - base) / 2)}px !important;`
      );
    }
    if (color) {
      inner.push(`color: ${color} !important;`);
    }
    if (inner.length) {
      out.push(`${ICON_BOX_SELECTOR} ha-svg-icon, ${ICON_BOX_SELECTOR} ha-icon { ${inner.join(" ")} }`);
    }
    return out.join("\n");
  };

  /**
   * CSS fuer die Listenansicht von "Geraete & Dienste", aufgeteilt nach dem
   * Shadow Root, in dem es stehen muss: der Behaelter der Karten (ein Raster
   * mit auto-fill), die Karte selbst (Kopf und Fuss nebeneinander statt
   * untereinander) und der Fuss (Anzahl und Symbole).
   */
  const buildIntegrationListCss = (s) => {
    if (s.list_view !== true) {
      return null;
    }
    const wanted = number(s.list_row_height, 0);
    const height = wanted > 0 ? clamp(Math.round(wanted), 32, 200) : 56;
    const gap = clamp(Math.round(number(s.list_gap, 8)), 0, 48);
    const width = clamp(Math.round(number(s.list_max_width, 0)), 0, 4000);
    const narrow = width > 0 ? ` max-width: ${width}px !important; margin-inline: auto !important;` : "";
    // Eine, zwei oder drei Spalten. Mehrspaltig bekommt jede Spalte mindestens
    // LIST_COLUMN_MIN px - auf einem schmalen Bildschirm werden es dadurch von
    // selbst weniger Spalten, statt dass die Zeilen unlesbar schmal werden.
    // Das halbe Pixel Abzug faengt Rundungen ab, sonst fiele die letzte
    // Spalte gelegentlich in die naechste Zeile.
    const columns = s.list_three_columns === true ? 3 : s.list_two_columns === true ? 2 : 1;
    const tracks =
      columns > 1
        ? `repeat(auto-fill, minmax(max(min(100%, ${LIST_COLUMN_MIN}px), ` +
          `calc((100% - ${(columns - 1) * gap}px) / ${columns} - 0.5px)), 1fr))`
        : "minmax(0, 1fr)";
    // Rahmen: -1 / leer heisst "wie Home Assistant"; 0 ist ein echter Wert.
    const borderWidth = frameWidths(s, "list", 1);
    const borderRadius = frameRadii(s, "list", HA_CARD_RADIUS);
    const borderColor = css(s.list_border_color);
    const errorColor = css(s.list_error_color);
    // Hintergrund der Zeilen. Leer heisst: wie Home Assistant. Eine Farbe
    // geht in background-color, ein Verlauf in background - und liegt dann
    // auch beim Hover unter der Hover-Farbe, statt von ihr ersetzt zu werden.
    const rowBackground = css(s.list_background);
    const rowIsColor = !!rowBackground && isColor(rowBackground);
    const rowRule = rowBackground
      ? rowIsColor
        ? `background-color: ${rowBackground} !important;`
        : `background: ${rowBackground} !important;`
      : "";
    // Schatten der Zeilen (1.5.7): leer heisst wie das Theme
    // (--ha-card-box-shadow), "none" nimmt ihn weg - etwa fuer eine
    // Spaltenansicht aus schlichten Listen.
    const shadow = css(s.list_shadow);
    const shadowRule = shadow ? `box-shadow: ${shadow} !important;` : "";
    const frame = [];
    if (borderWidth) {
      frame.push(`border-width: ${borderWidth} !important;`);
    }
    if (borderRadius) {
      frame.push(`border-radius: ${borderRadius} !important;`);
    }
    const cardFrame = [];
    if (frame.length) {
      cardFrame.push(`ha-card { ${frame.join(" ")} }`);
    }
    if (rowRule) {
      cardFrame.push(`ha-card { ${rowRule} }`);
    }
    if (shadowRule) {
      cardFrame.push(`ha-card, ha-card:hover { ${shadowRule} }`);
    }
    if (borderColor) {
      // Nicht fuer Karten mit Problem: deren roter Rand bleibt, solange keine
      // eigene Problemfarbe gesetzt ist.
      cardFrame.push(
        `ha-card:not(.state-error):not(.state-failed-unload):not(.state-not-loaded) { ` +
          `--ha-card-border-color: ${borderColor} !important; border-color: ${borderColor} !important; }`
      );
    }
    if (errorColor) {
      // Dieselben Zustaende, in denen Home Assistant selbst einen farbigen Rand setzt.
      cardFrame.push(
        `ha-card.state-error, ha-card.state-failed-unload, ha-card.state-not-loaded { ` +
          `--ha-card-border-color: ${errorColor} !important; border-color: ${errorColor} !important; }`
      );
    }
    // Maus hover ueber der ganzen Zeile. Die Welle von Home Assistant deckt nur
    // die linke Seite ab, darum wird sie hier still gestellt, sobald eine
    // eigene Farbe da ist - sonst laege ihr Grau doppelt darueber.
    const hover = css(s.list_hover_background);
    let tint = "";
    if (hover) {
      const opacity = clamp(Math.round(number(s.list_hover_opacity, 100)), 0, 100);
      tint =
        opacity >= 100 || !isColor(hover)
          ? hover
          : `color-mix(in srgb, ${hover} ${opacity}%, transparent)`;
      // Ab 2026.10 legt Home Assistant beim Hover selbst eine Hintergrundfarbe
      // unter die Karte; sie wird auf die normale Farbe zurueckgesetzt, sonst
      // laege sie doppelt unter der eigenen Hover-Farbe.
      cardFrame.push(
        "ha-card:hover { background-color: " +
          (rowIsColor ? rowBackground : "var(--ha-card-background, var(--card-background-color, #fff))") +
          " !important; " +
          `background-image: linear-gradient(${tint}, ${tint})${
            rowBackground && !rowIsColor ? `, ${rowBackground}` : ""
          } !important; }`,
        "ha-ripple { --ha-ripple-hover-opacity: 0 !important; }"
      );
    }
    // Die Seite "Apps": gleiche Zeile, gleicher Rahmen, gleiches Hover - nur
    // andere Elemente. Die Karte ist eine ha-card mit einem eigenen Inhalt
    // (supervisor-apps-card-content, mit Shadow Root): links Symbol, Name und
    // Beschreibung in einer Zeile, rechts Marken und Status.
    let apps = null;
    if (s.list_apps === true) {
      const logo = `min(40px, ${Math.max(height - 12, 16)}px)`;
      const frameRules = [];
      if (frame.length) {
        frameRules.push(`ha-card { ${frame.join(" ")} }`);
      }
      if (rowRule) {
        frameRules.push(`ha-card { ${rowRule} }`);
      }
      if (shadowRule) {
        frameRules.push(`ha-card, ha-card:hover { ${shadowRule} }`);
      }
      if (borderColor) {
        frameRules.push(
          `ha-card { --ha-card-border-color: ${borderColor} !important; border-color: ${borderColor} !important; }`
        );
      }
      if (tint) {
        // Home Assistant legt beim Hover selbst eine Hintergrundfarbe darunter;
        // sie wird auf die normale Kartenfarbe zurueckgesetzt, sonst laege sie doppelt.
        frameRules.push(
          "ha-card:hover { background-color: " +
            (rowIsColor
              ? rowBackground
              : "var(--ha-card-background, var(--card-background-color, #fff))") +
            " !important; " +
            `background-image: linear-gradient(${tint}, ${tint})${
              rowBackground && !rowIsColor ? `, ${rowBackground}` : ""
            } !important; }`
        );
      }
      apps = {
        page: [
          `.content { grid-template-columns: ${tracks} !important; gap: ${gap}px !important;${narrow} }`,
          `ha-card[role="button"] { display: flex !important; align-items: center !important; ` +
            `height: ${height}px !important; min-height: 0 !important; }`,
          "ha-card[role=\"button\"] .card-content { flex: 1 1 auto !important; min-width: 0 !important; " +
            "padding: 0 16px !important; margin: 0 !important; }",
          ...frameRules,
        ].join("\n"),
        content: [
          ":host { display: flex !important; align-items: center !important; gap: 16px !important; }",
          ".app { flex: 1 1 auto !important; min-width: 0 !important; margin-bottom: 0 !important; " +
            "align-items: center !important; }",
          `.icon-wrapper { display: flex !important; align-items: center !important; ` +
            `justify-content: center !important; width: ${logo} !important; height: ${logo} !important; ` +
            "margin-top: 0 !important; }",
          ".icon-image { max-width: 100% !important; max-height: 100% !important; }",
          ".app-icon { margin: 0 !important; }",
          ".app > div:last-child { display: flex !important; align-items: baseline !important; " +
            "gap: 16px !important; min-width: 0 !important; flex: 1 1 auto !important; }",
          ".title-row { flex: 0 1 auto !important; }",
          ".addition { flex: 1 1 0 !important; min-width: 0 !important; height: auto !important; " +
            "margin: 0 !important; white-space: nowrap !important; overflow: hidden !important; " +
            "text-overflow: ellipsis !important; }",
          ".footer { flex: 0 0 auto !important; flex-wrap: nowrap !important; align-items: center !important; " +
            "justify-content: flex-end !important; border-top: none !important; padding-top: 0 !important; }",
          // Marken (Update, Vorabversion) vor den Status: der Status steht ganz rechts.
          ".tags { order: -1 !important; }",
        ].join("\n"),
      };
    }
    // Die Seite einer Integration (1.4.8): ihre Eintraege bekommen Rahmen,
    // Ecken, Hintergrund und Abstand der Zeilen. Eintraege mit Problem
    // behalten ihre Warnfarbe als Hintergrund.
    let entries = null;
    if (s.list_entries === true) {
      const wrap = [];
      if (frame.length) {
        wrap.push(`.config-entry-wrapper, .devices { ${frame.join(" ")} border-style: solid !important; }`);
      }
      if (borderColor) {
        wrap.push(
          `.config-entry-wrapper:not(.state-error):not(.state-failed-unload):not(.state-not-loaded), .devices { ` +
            `border-color: ${borderColor} !important; }`
        );
      }
      if (errorColor) {
        wrap.push(
          `.config-entry-wrapper.state-error, .config-entry-wrapper.state-failed-unload, .config-entry-wrapper.state-not-loaded { ` +
            `border-color: ${errorColor} !important; }`
        );
      }
      if (rowRule) {
        wrap.push(`.config-entry-wrapper:not(.state-error):not(.state-failed-unload):not(.state-not-loaded), .devices { ${rowRule} }`);
      }
      // 1.5.7: derselbe Schatten fuer den Rahmen eines Eintrags (nicht fuer
      // den inneren Kasten der Geraete, sonst laege er doppelt).
      if (shadowRule) {
        wrap.push(`.config-entry-wrapper { ${shadowRule} }`);
      }
      // 1.5.7: Maus hover auf der Seite einer Integration. Anklickbar sind
      // dort die Zeile "x Geraete" und die Geraetezeilen (ha-list-item-button);
      // die Zeile des Eintrags selbst ist es nicht und bleibt ohne Hover.
      // Die Farbe liegt als Hintergrund unter dem Inhalt, die Welle von Home
      // Assistant wird still gestellt - sonst laege ihr Grau darueber.
      let itemHover = "";
      if (tint) {
        const layer = isColor(hover) ? `linear-gradient(${tint}, ${tint})` : tint;
        itemHover =
          "ha-list-item-button { --ha-ripple-hover-opacity: 0 !important; }\n" +
          `ha-list-item-button:hover { background-image: ${layer} !important; }`;
        wrap.push(
          ".toggle-devices-row { --ha-ripple-hover-opacity: 0 !important; }",
          `.toggle-devices-row:hover { background-image: ${layer} !important; }`
        );
      }
      // 1.5.4: Hintergrund der Eintraege mit Problem - Home Assistant nimmt
      // rot (Fehler, z. B. Einrichtungsfehler) bzw. orange (nicht geladen,
      // Entladen fehlgeschlagen).
      // Deckkraft fuer beide (1.5.4): eine Farbe wird durchsichtig, ueber
      // einen Verlauf legt sich die Kartenfarbe.
      const problemOpacity = clamp(Math.round(number(s.list_problem_opacity, 100)), 0, 100);
      const problemRule = (raw) => {
        const color = css(raw);
        if (!color) {
          return "";
        }
        if (problemOpacity >= 100) {
          return isColor(color) ? `background-color: ${color} !important;` : `background: ${color} !important;`;
        }
        if (isColor(color)) {
          return `background-color: color-mix(in srgb, ${color} ${problemOpacity}%, transparent) !important;`;
        }
        const veil = `color-mix(in srgb, var(--card-background-color, #fff) ${100 - problemOpacity}%, transparent)`;
        return `background: linear-gradient(${veil}, ${veil}), ${color} !important;`;
      };
      const errorBackground = problemRule(s.list_error_background);
      const warningBackground = problemRule(s.list_warning_background);
      if (errorBackground) {
        wrap.push(`.config-entry-wrapper.state-error { ${errorBackground} }`);
      }
      if (warningBackground) {
        wrap.push(`.config-entry-wrapper.state-failed-unload:not(.state-error), .config-entry-wrapper.state-not-loaded:not(.state-error) { ${warningBackground} }`);
      }
      if (borderRadius) {
        wrap.push(`.toggle-devices-row { border-radius: ${borderRadius} !important; }`);
      }
      // Eigene Zeilenhoehe (1.4.9): Eintrag, Geraete und Untereintraege sind
      // ha-row-item bzw. ha-list-item-button - beide lesen ihre Mindesthoehe
      // und den Innenabstand aus Variablen, die von hier aus vererbt werden.
      // 0 heisst: wie Home Assistant.
      const rowWanted = Math.round(number(s.list_entries_row_height, 0));
      let rowVars = "";
      if (rowWanted > 0) {
        const rowHeight = clamp(rowWanted, 32, 120);
        const pad = clamp(Math.round((rowHeight - 40) / 2), 2, 12);
        rowVars = ` --ha-row-item-min-height: ${rowHeight}px !important; --ha-row-item-padding-block: ${pad}px !important;`;
      }
      entries = {
        row: wrap.join("\n"),
        item: itemHover,
        page: `ha-config-entry-row { margin-bottom: ${Math.max(gap, 4)}px !important;${rowVars} }`,
      };
    }
    return {
      apps,
      entries,
      container:
        `div:has(> ${LIST_CARD}) { grid-template-columns: ${tracks} !important; ` +
        `gap: ${gap}px !important;${narrow} }`,
      // Die Karte selbst (Shadow Root von ha-integration-card): Kopf links,
      // Anzahl und Symbole rechts in einer Zeile.
      card: [
        `:host { height: ${height}px !important; min-height: 0 !important; }`,
        "ha-card { flex-direction: row !important; align-items: stretch !important; " +
          "justify-content: flex-start !important; height: 100% !important; }",
        ".ripple-anchor { display: flex !important; flex-direction: row !important; " +
          "align-items: center !important; flex: 1 1 auto !important; min-width: 0 !important; }",
        // Ab 2026.10: .card-content traegt Kopf und Fuss - nebeneinander statt
        // untereinander, ohne Polster oben und unten.
        ".card-content { flex: 1 1 auto !important; flex-direction: row !important; " +
          "align-items: center !important; min-width: 0 !important; height: 100% !important; " +
          "box-sizing: border-box !important; padding-block: 0 !important; " +
          "padding-inline: 16px 8px !important; gap: 8px !important; }",
        `${LIST_CARD_HEADER} { flex: 1 1 auto !important; min-width: 0 !important; ` +
          "padding-bottom: 0 !important; }",
        `${LIST_CARD_FOOTER} { flex: 0 0 auto !important; }`,
        "ha-integration-header { flex: 1 1 auto !important; min-width: 0 !important; " +
          "height: 100% !important; }",
        ".card-actions { flex: 0 0 auto !important; align-items: center !important; " +
          "border-top: none !important; padding-block: 0 !important; " +
          "padding-inline: 4px 8px !important; gap: 4px !important; }",
        ".spacer { display: none !important; }",
        ...cardFrame,
        // Symbole vor die Anzahl: die Anzahl steht ganz rechts.
        ".icons { order: -1 !important; }",
      ].join("\n"),
      // Der Kopf (Shadow Root von ha-integration-header): ohne Polster oben
      // und unten, Logo passend zur Zeilenhoehe, ohne Pfeil am Ende.
      header: [
        ".header { padding-block: 0 !important; height: 100% !important; min-height: 0 !important; }",
        `.header img { width: min(40px, ${Math.max(height - 12, 16)}px) !important; ` +
          `height: min(40px, ${Math.max(height - 12, 16)}px) !important; }`,
        "ha-icon-next { display: none !important; }",
      ].join("\n"),
      // Der Fuss ab 2026.10 (Shadow Root von ha-integration-card-footer):
      // Anzahl und Symbole ohne Polster, die Anzahl ganz rechts.
      footer: [
        ".footer { padding-top: 0 !important; min-height: 0 !important; flex-wrap: nowrap !important; }",
        ".count-badge { white-space: nowrap !important; }",
        ".icons { order: -1 !important; margin-inline-start: 0 !important; margin-inline-end: 4px !important; }",
      ].join("\n"),
    };
  };

  /**
   * Gruppenkoepfe der Tabellen ("Nicht gruppiert", Name eines Bereichs, ...).
   * Home Assistant zeichnet sie als .group-header im Shadow Root von
   * ha-data-table: Seitenhintergrund, Schrift "medium". Leer / 0 bleibt so.
   */
  const buildTableCss = (s) => {
    const rule = [];
    const background = css(s.table_group_background);
    if (background) {
      rule.push(`background-color: ${background} !important;`);
    }
    const color = css(s.table_group_color);
    if (color) {
      // Der Pfeil ist ein ha-icon-button und nimmt seine Farbe von dort.
      rule.push(`color: ${color} !important; --icon-primary-color: ${color} !important;`);
    }
    const size = clamp(Math.round(number(s.table_group_size, 0)), 0, 40);
    if (size > 0) {
      rule.push(`font-size: ${size}px !important;`);
    }
    const weight = css(s.table_group_weight);
    if (/^(normal|bold|[1-9]00)$/.test(weight)) {
      rule.push(`font-weight: ${weight} !important;`);
    }
    const out = [];
    // Die Zeilen. Home Assistant gibt jeder Datenzeile ihre Nummer mit
    // (aria-rowindex); die Tabelle zeichnet nur die sichtbaren Zeilen und
    // tauscht sie beim Scrollen aus - ueber die Nummer bleiben die Streifen
    // trotzdem an ihrer Zeile. Gruppenkoepfe haben keine Nummer und bleiben
    // unberuehrt.
    const fontSize = clamp(Math.round(number(s.table_font_size, 0)), 0, 24);
    if (fontSize > 0) {
      out.push(
        `.mdc-data-table__content, .mdc-data-table__cell { font-size: ${Math.max(fontSize, 10)}px !important; }`
      );
    }
    // Farbe aller Datenzeilen; die Streifen darunter liegen darueber.
    const rowColor = css(s.table_row_background);
    if (rowColor) {
      out.push(
        `.mdc-data-table__row[aria-rowindex]:not(.mdc-data-table__row--selected) { background: ${rowColor} !important; }`
      );
    }
    const zebra = css(s.table_zebra);
    if (zebra) {
      out.push(
        `${["0", "2", "4", "6", "8"]
          .map(
            (digit) =>
              `.mdc-data-table__row[aria-rowindex$="${digit}"]:not(.mdc-data-table__row--selected)`
          )
          .join(",\n")} { background: ${zebra} !important; }`
      );
    }
    const hover = css(s.table_hover_background);
    if (hover) {
      const opacity = clamp(Math.round(number(s.table_hover_opacity, 100)), 0, 100);
      const tint =
        opacity >= 100 || !isColor(hover)
          ? hover
          : `color-mix(in srgb, ${hover} ${opacity}%, transparent)`;
      // Als Bild ueber der Zeilenfarbe: so bleibt ein Streifen darunter
      // sichtbar, wenn die Hover-Farbe durchscheint.
      out.push(
        ".mdc-data-table__row[aria-rowindex]:not(.mdc-data-table__row--selected):hover { " +
          `background-image: linear-gradient(${tint}, ${tint}) !important; }`
      );
    }
    if (rule.length) {
      out.push(`.group-header { ${rule.join(" ")} }`);
    }
    return out.join("\n");
  };

  /** Breite von ha-config-section bei zwei oder drei Spalten (sonst ""). */
  const sectionWidthCss = (s) => {
    const columns = clamp(Math.round(number(s.menu_columns, 1)), 1, 3);
    // Home Assistant begrenzt die Seite auf 600 px - zu schmal fuer Spalten.
    return columns > 1
      ? `ha-config-section { max-width: min(100%, ${columns === 2 ? 960 : 1280}px) !important; }`
      : "";
  };

  /** Die Unterseite "System": nur die Breite (Spalten und Kacheln haengen an der Liste). */
  const buildSystemPageCss = (s) => sectionWidthCss(s);

  /** Die Profilseite (1.4.8): ihre Karten so breit wie die Spalten der Menueliste. */
  const buildProfilePageCss = (s) => {
    const columns = clamp(Math.round(number(s.menu_columns, 1)), 1, 3);
    return columns > 1 ? `ha-card { max-width: min(100%, ${columns === 2 ? 960 : 1280}px) !important; }` : "";
  };

  // Ab dieser Fensterbreite stehen die Favoriten mittig in der Kopfleiste;
  // darunter waere dort neben Titel und Knoepfen kein Platz, dann stehen sie
  // ueber den Karten.
  const FAVORITES_HEADER_MIN = 1000;

  /**
   * Die Einstellungsseite (Shadow Root von ha-config-dashboard): breiter,
   * sobald die Menuepunkte in Spalten stehen, leere Karten weg, das Aussehen
   * der Favoriten-Leiste und des Systemmonitors.
   *
   * Das Aussehen eines einzelnen Favoriten steht als CSS-Variablen an seinem
   * Knopf (siehe favoriteStyle); hier stehen die Vorgaben dafuer.
   */
  const buildDashboardCss = (s) => {
    const out = [];
    const width = sectionWidthCss(s);
    if (width) {
      out.push(width);
    }
    if (s.menu_hidden.length) {
      // Sind alle Punkte einer Karte ausgeblendet, bliebe ein leerer Rahmen.
      out.push("ha-card[data-sh-empty] { display: none !important; }");
    }
    if (s.favorites.length) {
      out.push(
        // Ueber den Karten: im Platz "header" von ha-config-section. Die
        // Seite zieht ihren Inhalt 32 px nach oben (margin-top: -32px an
        // ha-config-section); die Leiste gleicht das aus und haelt dazu
        // 12 px Abstand zur Kopfleiste. Nach unten zieht sie den Abstand zur
        // ersten Karte zusammen, sonst stuende sie verloren ueber den Karten.
        ".sh-favorites { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; " +
          "margin: 44px 0 -24px; font-size: 14px; line-height: 1.2; " +
          "--sh-fav-bw0: var(--ha-card-border-width, 1px); " +
          "--sh-fav-r0: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px)); }",
        ".sh-favorites button { display: inline-flex; align-items: center; gap: 8px; " +
          "margin: 0; padding: 0 14px 0 10px; min-height: var(--sh-fav-h, 36px); height: var(--sh-fav-h, auto); " +
          "box-sizing: border-box; cursor: pointer; font: inherit; white-space: nowrap; " +
          "color: var(--sh-fav-text, var(--primary-text-color)); " +
          "background: var(--sh-fav-bg, var(--ha-card-background, var(--card-background-color, #fff))); " +
          "border-style: solid; " +
          "border-color: var(--sh-fav-bc, var(--ha-card-border-color, var(--divider-color, #e0e0e0))); " +
          "border-width: var(--sh-fav-bw, var(--sh-fav-bw0)); " +
          "border-radius: var(--sh-fav-r, var(--sh-fav-r0)); " +
          "text-transform: var(--sh-fav-tt, none); letter-spacing: var(--sh-fav-ls, normal); " +
          "-webkit-tap-highlight-color: transparent; }",
        // Nur das Icon: ein quadratischer Knopf, der Name steht als Tooltip daran.
        ".sh-favorites button[data-icon-only] { justify-content: center; gap: 0; padding: 0 8px; " +
          "min-width: var(--sh-fav-h, 36px); }",
        ".sh-favorites button:hover { background-image: linear-gradient(" +
          "color-mix(in srgb, currentColor 8%, transparent), color-mix(in srgb, currentColor 8%, transparent)); }",
        ".sh-favorites button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }",
        ".sh-favorites ha-icon { display: flex; --mdc-icon-size: 20px; " +
          "color: var(--sh-fav-color, var(--secondary-text-color)); pointer-events: none; }",
        // Handy (1.4.7): die Knoepfe fuellen die ganze Breite in gleich
        // breiten Spalten (--sh-fav-cols setzt fillFavorites), lange Namen
        // werden gekuerzt statt die Reihe zu sprengen.
        "@media (max-width: 600px) {",
        "  .sh-favorites:not([data-place=\"header\"]) { display: grid; margin-inline: 12px; " +
          "grid-template-columns: repeat(var(--sh-fav-cols, 2), minmax(0, 1fr)); }",
        "  .sh-favorites:not([data-place=\"header\"]) button { justify-content: center; min-width: 0; " +
          "padding-inline: 8px; }",
        "  .sh-favorites:not([data-place=\"header\"]) button > span { min-width: 0; overflow: hidden; " +
          "text-overflow: ellipsis; }",
        "}",
        // In der Kopfleiste: mittig ueber die ganze Breite der Leiste. Die
        // Leiste haengt im Platz "title" von ha-top-app-bar-fixed; absolut
        // positioniert richtet sie sich an der Kopfleiste selbst aus, nicht
        // am Titel. Knoepfe ohne eigene Farben passen sich der Kopfleiste an.
        '.sh-favorites[data-place="header"] { position: absolute; left: 50%; ' +
          "top: calc(var(--safe-area-inset-top, 0px) + var(--header-height, 56px) / 2); " +
          "transform: translate(-50%, -50%); margin: 0; flex-wrap: nowrap; " +
          "max-width: calc(100% - 400px); overflow-x: auto; scrollbar-width: none; z-index: 1; " +
          "font-size: 14px; line-height: 1.2; --sh-fav-bw0: 1px; --sh-fav-r0: 999px; }",
        '.sh-favorites[data-place="header"]::-webkit-scrollbar { display: none; }',
        '.sh-favorites[data-place="header"] button { min-height: var(--sh-fav-h, 34px); ' +
          "color: var(--sh-fav-text, inherit); background: var(--sh-fav-bg, transparent); " +
          "border-color: var(--sh-fav-bc, color-mix(in srgb, currentColor 35%, transparent)); }",
        '.sh-favorites[data-place="header"] ha-icon { color: var(--sh-fav-color, inherit); }',
        // Der Ersatz ueber den Karten, solange das Fenster zu schmal ist.
        ".sh-favorites[data-fallback] { display: none; }",
        `@media (max-width: ${FAVORITES_HEADER_MIN - 1}px) {`,
        '  .sh-favorites[data-place="header"] { display: none; }',
        "  .sh-favorites[data-fallback] { display: flex; }",
        "}",
        "@media (max-width: 600px) {",
        "  .sh-favorites[data-fallback] { display: grid; }",
        "}"
      );
    }
    if (s.monitor === true || s.monitor_backup === true || s.monitor_counts === true) {
      out.push(...MONITOR_CSS);
      // Der Maus-Hover der Menuepunkte gilt auch fuer die Felder des
      // Systemmonitors und der Backup-Box.
      const hover = css(s.menu_hover_background);
      if (hover) {
        const opacity = clamp(Math.round(number(s.menu_hover_opacity, 100)), 0, 100);
        const tint =
          opacity >= 100 || !isColor(hover) ? hover : `color-mix(in srgb, ${hover} ${opacity}%, transparent)`;
        out.push(`.shm-cell:hover { background: linear-gradient(${tint}, ${tint}) !important; }`);
      }
    }
    if (s.hide_tip === true) {
      // Der Tipp von Home Assistant unter den Menuepunkten
      out.push("ha-config-section > ha-tip, ha-tip { display: none !important; }");
    }
    if (s.monitor_backup === true) {
      out.push(...BACKUP_CSS);
    }
    if (s.monitor_counts === true) {
      out.push(...COUNTS_CSS);
    }
    return out.join("\n");
  };

  /**
   * Der Systemmonitor: eine Karte wie die von Home Assistant, darin drei
   * Felder (CPU, Arbeitsspeicher, Speicher). Unter 520 px Breite stehen sie
   * untereinander - die Karte richtet sich nach ihrer eigenen Breite
   * (Container-Abfrage), also nach den Spalten der Seite.
   */
  const MONITOR_CSS = [
    ".sh-monitor, .sh-backup, .sh-counts { display: block; container-type: inline-size; overflow: hidden; " +
      "color: var(--primary-text-color); " +
      "background: var(--ha-card-background, var(--card-background-color, #fff)); " +
      "border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); " +
      "border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px)); " +
      // 1.5.4: der Schatten der Karten (Theme: ha-card-box-shadow) wie bei ha-card
      "box-shadow: var(--ha-card-box-shadow, none); }",
    ".shm-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }",
    ".shm-cell { --shm-c: var(--primary-color); display: flex; flex-direction: column; gap: 2px; " +
      "min-width: 0; margin: 0; padding: 14px 18px 16px; box-sizing: border-box; " +
      "font: inherit; color: inherit; text-align: start; cursor: pointer; " +
      "background: none; border: 0; border-inline-start: 1px solid var(--divider-color, #e0e0e0); " +
      "-webkit-tap-highlight-color: transparent; }",
    ".shm-cell:first-child { border-inline-start: 0; }",
    ".shm-cell:hover { background: color-mix(in srgb, currentColor 4%, transparent); }",
    ".shm-cell:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }",
    '.shm-cell[data-level="warn"] { --shm-c: var(--warning-color, #ffa600); }',
    '.shm-cell[data-level="crit"] { --shm-c: var(--error-color, #db4437); }',
    ".shm-label { display: block; font-size: 12px; font-weight: 500; letter-spacing: .06em; " +
      "text-transform: uppercase; color: var(--secondary-text-color); }",
    ".shm-value { display: block; font-size: 28px; line-height: 1.15; font-weight: 400; " +
      "font-variant-numeric: tabular-nums; white-space: nowrap; }",
    ".shm-cell[data-level] .shm-num { color: var(--shm-c); }",
    ".shm-unit { font-size: 15px; margin-inline-start: 3px; color: var(--secondary-text-color); }",
    ".shm-sub { display: block; font-size: 12px; color: var(--secondary-text-color); " +
      "font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    ".shm-viz { display: none; height: 40px; margin-top: 10px; }",
    ".sh-monitor[data-graphs] .shm-viz { display: flex; flex-direction: column; justify-content: flex-end; }",
    ".shm-graph { display: block; width: 100%; height: 100%; overflow: visible; }",
    ".shm-graph .shm-area { fill: var(--shm-c); opacity: .14; }",
    ".shm-graph .shm-line { fill: none; stroke: var(--shm-c); stroke-width: 1.5px; " +
      "vector-effect: non-scaling-stroke; stroke-linejoin: round; }",
    ".shm-scale { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; " +
      "font-size: 11px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }",
    ".shm-bar { display: block; height: 8px; border-radius: 4px; overflow: hidden; " +
      "background: color-mix(in srgb, var(--primary-text-color, #000) 10%, transparent); }",
    ".shm-fill { display: block; height: 100%; width: 0; border-radius: inherit; background: var(--shm-c); " +
      "transition: width .4s ease; }",
    // Schmal (Handy): die drei Felder bleiben nebeneinander (1.4.7), nur
    // etwas enger und kleiner geschrieben.
    "@container (max-width: 519px) {",
    "  .sh-monitor .shm-cell { padding: 12px 12px 14px; }",
    "  .sh-monitor .shm-value { font-size: 22px; }",
    "  .sh-monitor .shm-unit { font-size: 13px; margin-inline-start: 2px; }",
    "  .sh-monitor .shm-label { font-size: 11px; letter-spacing: .04em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    "  .sh-monitor .shm-sub { font-size: 11px; }",
    "  .sh-monitor .shm-scale { font-size: 10px; overflow: hidden; }",
    "}",
    "@container (max-width: 299px) {",
    "  .sh-monitor .shm-cell { padding: 10px 8px 12px; }",
    "  .sh-monitor .shm-value { font-size: 18px; }",
    "}",
    // Mit eigenen Werten (1.4.8): die Felder fliessen in Zeilen wie die Zaehler.
    ".sh-monitor[data-many] .shm-grid { display: flex; flex-wrap: wrap; margin: 0 -1px -1px 0; }",
    ".sh-monitor[data-many] .shm-cell { flex: 1 1 120px; border-inline-start: 0; " +
      "border-inline-end: 1px solid var(--divider-color, #e0e0e0); " +
      "border-bottom: 1px solid var(--divider-color, #e0e0e0); }",
    ".shm-cell[data-kind=\"sensor\"] .shm-num { overflow: hidden; text-overflow: ellipsis; }",
    ".shm-cell[data-kind=\"sensor\"] .shm-value { overflow: hidden; text-overflow: ellipsis; }",
    // Nur eigene Werte (1.4.9)
    ".sh-monitor[data-own-only] .shm-cell:not([data-kind=\"sensor\"]) { display: none !important; }",
  ];

  /**
   * Die Box mit dem letzten Backup: dieselbe Karte und dieselben Felder wie
   * der Monitor, aber vier Felder. Unter 720 px zwei je Zeile, unter 400 px
   * untereinander. Name und Speicherort sind Text und stehen kleiner als die
   * Zahlen.
   */
  const BACKUP_CSS = [
    ".sh-backup .shm-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }",
    // Knopf "Backup jetzt erstellen" (1.4.8) in einer schmalen Leiste darunter
    ".shb-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; " +
      "padding: 8px 12px; border-top: 1px solid var(--divider-color, #e0e0e0); font-size: 13px; }",
    ".shb-actions[hidden] { display: none; }",
    ".shb-msg { flex: 1 1 auto; min-width: 0; color: var(--secondary-text-color); }",
    ".shb-msg[data-error] { color: var(--error-color, #db4437); }",
    ".shb-btn { height: 32px; padding: 0 14px; border-radius: 999px; cursor: pointer; font: inherit; font-weight: 500; " +
      "color: var(--primary-color); background: transparent; border: 1px solid color-mix(in srgb, var(--primary-color) 55%, transparent); }",
    ".shb-btn[data-primary] { color: var(--text-primary-color, #fff); background: var(--primary-color); border-color: var(--primary-color); }",
    ".shb-btn:disabled { opacity: .5; cursor: default; }",
    ".shb-btn[hidden] { display: none; }",
    ".shm-text { display: block; font-size: 16px; line-height: 1.35; padding-top: 7px; " +
      "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
    "@container (max-width: 719px) {",
    "  .sh-backup .shm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
    "  .sh-backup .shm-cell:nth-child(3) { border-inline-start: 0; }",
    "  .sh-backup .shm-cell:nth-child(n + 3) { border-top: 1px solid var(--divider-color, #e0e0e0); }",
    "}",
    "@container (max-width: 399px) {",
    "  .sh-backup .shm-grid { grid-template-columns: minmax(0, 1fr); }",
    "  .sh-backup .shm-cell { border-inline-start: 0; border-top: 1px solid var(--divider-color, #e0e0e0); }",
    "  .sh-backup .shm-cell:first-child { border-top: 0; }",
    "}",
  ];

  /**
   * Die Zaehler-Box: dieselben Felder wie der Monitor, so viele, wie gewaehlt
   * sind. Sie fliessen in Zeilen (mindestens 116 px je Feld); Trennlinien
   * nur zwischen den Feldern - die Linien am Rand schneidet die Karte ab.
   */
  const COUNTS_CSS = [
    ".sh-counts .shm-grid { display: flex; flex-wrap: wrap; margin: 0 -1px -1px 0; }",
    ".sh-counts .shm-cell { flex: 1 1 116px; border-inline-start: 0; " +
      "border-inline-end: 1px solid var(--divider-color, #e0e0e0); " +
      "border-bottom: 1px solid var(--divider-color, #e0e0e0); padding: 12px 16px 14px; }",
    ".sh-counts .shm-cell[hidden] { display: none; }",
    ".sh-counts .shm-value { font-size: 26px; }",
  ];

  /**
   * Die Menuelisten der Einstellungsseite (Shadow Root von
   * ha-config-navigation-list): Reihenfolge, ausgeblendete Punkte, Spalten
   * und die Kachel-Darstellung. Die Punkte tragen ihren Pfad als
   * data-sh-menu - das setzt tagMenuItems().
   */
  const buildMenuLayoutCss = (s, systemPage) => {
    // Eigenes Icon eines Menuepunkts (1.5.5): so gross und mit demselben
    // Innenabstand wie das Symbol von Home Assistant, das verschwindet.
    const out = [];
    const items = s.menu_items || {};
    if (Object.keys(items).some((path) => items[path] && items[path].icon)) {
      out.push(
        "[data-sh-own-icon] > ha-svg-icon { display: none !important; }",
        "ha-icon[data-sh-menu-icon] { display: block; width: 24px; height: 24px; padding: 8px; " +
          "--mdc-icon-size: 24px; color: var(--secondary-text-color); }",
        `${ICON_BOX_SELECTOR} > ha-icon[data-sh-menu-icon] { color: #fff; }`
      );
    }
    // Auf der Unterseite "System" nur Spalten und Kacheln.
    const order = systemPage ? [] : s.menu_order;
    const hidden = systemPage ? [] : s.menu_hidden;
    if (order.length) {
      // Was nicht in der Liste steht, kommt dahinter.
      out.push("ha-list-item-button { order: 1000; }");
      order.forEach((path, index) => {
        out.push(`ha-list-item-button[data-sh-menu="${quote(path)}"] { order: ${index + 1}; }`);
      });
    }
    hidden.forEach((path) => {
      out.push(`ha-list-item-button[data-sh-menu="${quote(path)}"] { display: none !important; }`);
    });
    const columns = clamp(Math.round(number(s.menu_columns, 1)), 1, 3);
    if (columns > 1) {
      out.push(
        "ha-list-nav::part(base) { display: grid !important; " +
          `grid-template-columns: repeat(auto-fill, minmax(max(min(100%, ${MENU_COLUMN_MIN}px), ` +
          `calc(100% / ${columns} - 0.5px)), 1fr)) !important; }`
      );
    }
    if (s.menu_tiles === true) {
      out.push(
        "ha-list-item-button::part(base) { flex-direction: column !important; align-items: center !important; " +
          "justify-content: center !important; gap: 6px !important; text-align: center !important; " +
          "height: 100% !important; padding-block: 14px !important; box-sizing: border-box !important; }",
        "ha-list-item-button::part(start) { justify-content: center !important; margin: 0 !important; }",
        "ha-list-item-button::part(content) { flex: 0 0 auto !important; width: 100% !important; align-items: center !important; }",
        "ha-list-item-button::part(headline) { text-align: center !important; white-space: normal !important; }",
        "ha-list-item-button::part(supporting-text), ha-list-item-button::part(end) { display: none !important; }",
        'ha-list-item-button > [slot="supporting-text"], ha-list-item-button > [slot="end"] { display: none !important; }'
      );
    }
    // Einzelne Menuepunkte (1.4.8): Untertitel aus, eigene Symbolfarben. Den
    // Namen setzt renameMenuItem() direkt in den Text des Punkts.
    if (!systemPage) {
      const items = s.menu_items || {};
      Object.keys(items).forEach((path) => {
        const one = items[path];
        const item = `ha-list-item-button[data-sh-menu="${quote(path)}"]`;
        if (one.hide_sub === true) {
          out.push(`${item} > [slot="supporting-text"] { display: none !important; }`);
        }
        const background = css(one.icon_background);
        if (background) {
          out.push(`${item} ${ICON_BOX_SELECTOR} { background-color: ${background} !important; }`);
        }
        const color = css(one.icon_color);
        if (color) {
          out.push(`${item} ${ICON_BOX_SELECTOR} ha-svg-icon, ${item} ${ICON_BOX_SELECTOR} ha-icon { color: ${color} !important; }`);
        }
      });
    }
    return out.join("\n");
  };

  /**
   * Stylesheet fuer den Shadow Root von <hui-root> - die Kopfzeile eines
   * Dashboards.
   *
   * Home Assistant baut sie so auf (hui-root.ts):
   *
   *   <div class="edit-mode? narrow?">      <- aeussere Huelle
   *     <div class="header">
   *       <slot name="toolbar">
   *         <div class="toolbar">
   *           <ha-menu-button> | <ha-icon-button-arrow-prev>
   *           <ha-tab-group>                <- die Reiter der Ansichten
   *           <div class="main-title">
   *           <div class="action-items">
   *     <hui-view-container>                <- der Inhalt darunter
   *
   * Zwei Dinge sind dabei wichtig:
   *
   * 1. Alles wird auf ":host > div:not(.edit-mode)" gehaengt. Im
   *    Bearbeitungsmodus zeigt Home Assistant eine eigene Werkzeugleiste mit
   *    Speichern und Verlassen - die faerben wir nicht um, und ausblenden
   *    duerfen wir sie erst recht nicht, sonst kaeme man aus dem Editor nicht
   *    mehr heraus. Das ":host >" ist noetig: ".main-title" ist auch ein div
   *    ohne diese Klasse und wuerde sonst mitgefangen.
   * 2. Die Hoehe wird ueber --header-height gesetzt und nicht ueber "height".
   *    Home Assistant rechnet den Abstand des Inhalts darunter aus derselben
   *    Variablen (hui-view-container: padding-top: calc(var(--header-height)
   *    + ...)), damit rueckt alles von selbst mit.
   */
  const buildHeaderCss = (config) => {
    const head = config.header || DEFAULT_HEADER;
    const out = [];
    const push = (...lines) => out.push(...lines);
    const scope = ":host > div:not(.edit-mode)";

    if (head.hidden) {
      push(
        `${scope} {`,
        "  --header-height: 0px !important;",
        "}",
        `${scope} .header { display: none !important; }`
      );
      return out.join("\n");
    }

    const height = Math.round(number(head.height, 0));
    if (height > 0) {
      push(`${scope} { --header-height: ${clamp(height, 24, 200)}px !important; }`);
    }

    /* --- Kopfzeile unten (1.5.6) ---------------------------------------- */
    // Die Leiste ist bei Home Assistant fest oben angeheftet (position:
    // fixed; top: 0), der Inhalt (hui-view-container) haelt oben um
    // --header-height Abstand. Unten: Leiste an den unteren Rand, der Abstand
    // wandert nach unten. Die sichere Zone (Notch oben, Home-Leiste unten)
    // geht mit. Die Linie unter der Leiste (--app-header-border-bottom)
    // steht dann oben, der Schatten beim Scrollen faellt nach oben. Im
    // Bearbeitungsmodus bleibt alles, wie Home Assistant es zeigt (scope).
    if (head.position === "bottom") {
      push(
        `${scope} .header {`,
        "  position: fixed !important;",
        "  top: auto !important;",
        "  bottom: 0 !important;",
        "  padding-top: 0 !important;",
        "  padding-bottom: var(--safe-area-inset-bottom, 0px) !important;",
        "  border-bottom: none !important;",
        "  border-top: var(--app-header-border-bottom, none) !important;",
        "}",
        `${scope} hui-view-container {`,
        "  padding-top: var(--safe-area-inset-top, 0px) !important;",
        "  padding-bottom: calc(var(--header-height, 56px) + var(--safe-area-inset-bottom, 0px)) !important;",
        "}",
        `:host([scrolled]) > div:not(.edit-mode) .header {`,
        "  box-shadow: 0 -2px 4px -1px rgba(0, 0, 0, .2), 0 -4px 5px 0 rgba(0, 0, 0, .14), 0 -1px 10px 0 rgba(0, 0, 0, .12) !important;",
        "}"
      );
    }

    /* --- die Kopfzeile selbst ----------------------------------------- */
    const headerRules = [];
    const background = headerBackground(head);
    if (background) {
      headerRules.push(`  background: ${background} !important;`);
    }
    const blur = Math.round(number(head.blur, 0));
    if (blur > 0) {
      headerRules.push(`  backdrop-filter: blur(${clamp(blur, 1, 60)}px) !important;`);
      headerRules.push(
        `  -webkit-backdrop-filter: blur(${clamp(blur, 1, 60)}px) !important;`
      );
    }
    if (css(head.text_color)) {
      headerRules.push(`  color: ${css(head.text_color)} !important;`);
    }

    // Rahmen: eine Breite fuer alle Seiten, oder vier einzelne. Die Kurzform
    // border-width nimmt beides, deshalb reicht ein Feld. Wichtig ist, die
    // Kurzform "border" NICHT zu benutzen - die kennt nur eine Breite.
    const borders = head.border_split
      ? [head.border_top, head.border_right, head.border_bottom, head.border_left]
          .map((one) => `${Math.max(0, Math.round(number(one, 0)))}px`)
          .join(" ")
      : number(head.border_width, 0) > 0
        ? `${Math.max(0, Math.round(number(head.border_width, 0)))}px`
        : "";
    if (borders && borders !== "0px" && borders !== "0px 0px 0px 0px") {
      headerRules.push("  border-style: solid !important;");
      headerRules.push(`  border-width: ${borders} !important;`);
      headerRules.push(
        `  border-color: ${css(head.border_color) || "currentColor"} !important;`
      );
    }

    const radius = head.radius_split
      ? [head.radius_tl, head.radius_tr, head.radius_br, head.radius_bl]
          .map((one) => `${Math.max(0, Math.round(number(one, 0)))}px`)
          .join(" ")
      : number(head.radius, 0) > 0
        ? `${Math.max(0, Math.round(number(head.radius, 0)))}px`
        : "";
    if (radius && radius !== "0px" && radius !== "0px 0px 0px 0px") {
      headerRules.push(`  border-radius: ${radius} !important;`);
      // Ohne das schneiden die Ecken den Inhalt nicht mit ab.
      headerRules.push("  overflow: hidden !important;");
    }

    if (headerRules.length) {
      push(`${scope} .header {`, ...headerRules, "}");
    }

    /* --- Titel und Reiter ----------------------------------------------- */
    // Home Assistant zeigt in der Kopfzeile ENTWEDER den Titel (.main-title)
    // ODER die Reiter der Ansichten - nie beides (hui-root.ts). Hat ein
    // Dashboard mehrere Ansichten, gibt es keinen Titel, und die Reiter
    // setzen ihre Schrift selbst (ha-tab-group-tab, font-size auf dem Host).
    // Groesse und Staerke muessen deshalb auf beide.
    const fontSize = Math.round(number(head.font_size, 0));
    const weight = css(head.font_weight);
    const tabTypes = ["ha-tab-group-tab", "ha-tab", "paper-tab", "sl-tab", "wa-tab"];
    const titleRules = [];
    const tabFont = [];
    if (fontSize > 0) {
      const px = `${clamp(fontSize, 8, 60)}px`;
      titleRules.push(`  font-size: ${px} !important;`);
      tabFont.push(`  font-size: ${px} !important;`, `  --ha-font-size-m: ${px} !important;`);
    }
    if (weight) {
      titleRules.push(`  font-weight: ${weight} !important;`);
      tabFont.push(`  font-weight: ${weight} !important;`, `  --wa-font-weight-action: ${weight} !important;`);
    }
    if (titleRules.length) {
      push(`${scope} .main-title {`, ...titleRules, "}");
      push(`${tabTypes.map((name) => `${scope} ${name}`).join(",\n")} {`, ...tabFont, "}");
    }

    /* --- Icons --------------------------------------------------------- */
    // Die Groesse steckt in --mdc-icon-size; sie vererbt sich in die eigenen
    // Shadow Roots von ha-menu-button und ha-icon-button hinein.
    const iconRules = [];
    const iconSize = Math.round(number(head.icon_size, 0));
    if (iconSize > 0) {
      iconRules.push(`  --mdc-icon-size: ${clamp(iconSize, 8, 64)}px !important;`);
    }
    if (css(head.icon_color)) {
      iconRules.push(`  color: ${css(head.icon_color)} !important;`);
      iconRules.push(`  --icon-primary-color: ${css(head.icon_color)} !important;`);
    }
    if (iconRules.length) {
      push(
        `${scope} .toolbar ha-menu-button,`,
        `${scope} .toolbar ha-icon-button,`,
        `${scope} .toolbar .sh-header-button,`,
        `${scope} .toolbar ha-icon-button-arrow-prev {`,
        ...iconRules,
        "}"
      );
    }

    /* --- Farbe der rechten Seite ---------------------------------------- */
    // Knoepfe von Home Assistant, eigene Knoepfe und CPU/RAM/Speicher in der
    // Leiste rechts. Steht hinter den Icon-Regeln und gewinnt deshalb bei
    // gleicher Spezifitaet; eine eigene Farbe an einem Link (inline,
    // !important) bleibt.
    const rightColor = css(head.actions_color);
    if (rightColor) {
      push(
        `${scope} .action-items,`,
        `${scope} .action-items ha-icon-button,`,
        `${scope} .action-items .sh-header-button,`,
        `${scope} .action-items .sh-header-system {`,
        `  color: ${rightColor} !important;`,
        `  --icon-primary-color: ${rightColor} !important;`,
        "}"
      );
    }

    /* --- die vier Knoepfe rechts --------------------------------------- */
    // Welcher Knopf welcher ist, steht als data-sh-action am Element - das
    // setzt tagHeaderActions(), siehe dort.
    Object.keys(HEADER_ACTIONS).forEach((name) => {
      const key = `hide_${name}`;
      if (head[key]) {
        push(
          `${scope} .action-items [data-sh-action="${name}"] {`,
          "  display: none !important;",
          "}"
        );
      }
    });

    /* --- Reiter der Ansichten ------------------------------------------ */
    // ha-tab-group gibt genau diese Variablen heraus (hui-root.ts).
    const tabRules = [];
    if (css(head.tab_color)) {
      tabRules.push(`  color: ${css(head.tab_color)} !important;`);
      tabRules.push(`  --ha-tab-text-color: ${css(head.tab_color)} !important;`);
    }
    if (css(head.tab_color_active)) {
      tabRules.push(
        `  --ha-tab-active-text-color: ${css(head.tab_color_active)} !important;`
      );
    }
    if (css(head.tab_indicator_color)) {
      tabRules.push(
        `  --ha-tab-indicator-color: ${css(head.tab_indicator_color)} !important;`
      );
    }
    if (tabRules.length) {
      push(`${scope} ha-tab-group, ${scope} ha-tabs, ${scope} sl-tab-group {`, ...tabRules, "}");
    }
    // Maus hover ueber einem Reiter. Die Farbe liegt auf dem Reiter selbst;
    // color-mix macht aus Farbe und Deckkraft eine durchscheinende Farbe,
    // ohne den eingegebenen Wert umschreiben zu muessen (wie in der Sidebar).
    const tabHover = css(head.tab_hover_background);
    if (tabHover) {
      const opacity = clamp(Math.round(number(head.tab_hover_opacity, 100)), 0, 100);
      const tint =
        opacity >= 100 || !isColor(tabHover)
          ? tabHover
          : `color-mix(in srgb, ${tabHover} ${opacity}%, transparent)`;
      push(
        `${tabTypes.map((name) => `${scope} ${name}:hover`).join(",\n")} {`,
        `  background: ${tint} !important;`,
        "}"
      );
    }

    /* --- eigene Knoepfe: Neustart und Links ----------------------------- */
    // Die Elemente haengt applyHeaderButtons() in die Leiste rechts. Sie
    // stehen im DOM hinter den Knoepfen von Home Assistant (dort hat Lit
    // seine Marker) und kommen ueber "order" nach vorn. Groesse und Form wie
    // ein ha-icon-button; im Bearbeitungsmodus sind sie weg.
    if (head.show_restart === true || (Array.isArray(head.links) && head.links.length)) {
      push(
        ":host > div.edit-mode .sh-header-button { display: none !important; }",
        `${scope} .sh-header-button {`,
        "  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;",
        "  width: var(--ha-icon-button-size, var(--mdc-icon-button-size, 48px));",
        "  height: var(--ha-icon-button-size, var(--mdc-icon-button-size, 48px));",
        "  margin: 0; padding: 0; border: 0; border-radius: 50%; box-sizing: border-box;",
        "  background: transparent; color: inherit; font: inherit; cursor: pointer;",
        "  -webkit-tap-highlight-color: transparent;",
        "}",
        `${scope} .sh-header-button:hover {`,
        "  background: color-mix(in srgb, currentColor 12%, transparent);",
        "}",
        `${scope} .sh-header-button:focus-visible {`,
        "  outline: 2px solid currentColor; outline-offset: -2px;",
        "}",
        `${scope} .sh-header-button ha-icon { display: flex; pointer-events: none; }`,
        `${scope} .sh-header-button ha-icon[hidden] { display: none; }`,
        // 1.5.4: Sensor - Icon und Wert, so breit wie noetig
        `${scope} .sh-header-button.sh-header-sensor {`,
        "  width: auto; gap: 6px; padding: 0 12px 0 10px; border-radius: 999px;",
        "  white-space: nowrap; font-size: 14px; font-variant-numeric: tabular-nums;",
        "}",
        `${scope} .sh-header-sensor ha-state-icon { display: flex; pointer-events: none; --mdc-icon-size: 22px; }`,
        // Eigene Icon-Farbe: am Icon selbst, damit der Wert seine eigene behalten kann
        `${scope} .sh-header-button[style*="--sh-own-icon"] ha-icon,`,
        `${scope} .sh-header-button[style*="--sh-own-icon"] ha-state-icon { color: var(--sh-own-icon) !important; }`,
        `${scope} .sh-header-sensor .sh-hv { font-weight: 500; pointer-events: none; }`
      );
    }

    /* --- CPU und Arbeitsspeicher ---------------------------------------- */
    // Zwei kleine Werte vor den Knoepfen, Name klein darueber. Auf einem
    // sehr schmalen Bildschirm ist dafuer kein Platz.
    if (head.show_system === true || head.show_disk === true) {
      push(
        ":host > div.edit-mode .sh-header-system { display: none !important; }",
        `${scope} .sh-header-system {`,
        "  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 12px;",
        "  margin: 0 6px 0 2px; padding: 0 6px; border: 0; background: none;",
        "  color: inherit; font: inherit; line-height: 1.1; cursor: default;",
        "  font-variant-numeric: tabular-nums; -webkit-tap-highlight-color: transparent;",
        "}",
        `${scope} .sh-header-system[data-link] { cursor: pointer; border-radius: 8px; }`,
        `${scope} .sh-header-system[data-link]:hover { background: color-mix(in srgb, currentColor 10%, transparent); }`,
        `${scope} .sh-header-system[hidden] { display: none; }`,
        `${scope} .shs-item { display: flex; flex-direction: column; align-items: flex-end; min-width: 36px; }`,
        `${scope} .shs-item[hidden] { display: none; }`,
        `${scope} .shs-key { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }`,
        `${scope} .shs-val { font-size: 14px; font-weight: 500; white-space: nowrap; }`,
        `@media (max-width: 450px) { ${scope} .sh-header-system { display: none; } }`
      );
    }

    /* --- Rahmen um die einzelnen Elemente ------------------------------- */
    const edge = Math.max(0, Math.round(number(head.element_border_width, 0)));
    const edgeRadius = Math.max(0, Math.round(number(head.element_radius, 0)));
    const edgeColor = css(head.element_border_color) || "currentColor";
    if (edge > 0 || edgeRadius > 0) {
      // Auch die Button bekommen den Rahmen als innerer Schatten und nicht
      // als echten Rahmen. Grund (1.2.7): Home Assistant legt ha-menu-button
      // auch dann in die Kopfzeile, wenn die Seitenleiste daneben steht - dann
      // ist er leer und null Pixel gross. Ein echter Rahmen macht aus einem
      // leeren Element trotzdem einen sichtbaren Punkt (2 px Rand je Seite);
      // ein innerer Schatten hat ohne Flaeche nichts, wo er hinmalen koennte.
      // Der Abstand zwischen den Button kommt aus "gap" der Leiste rechts,
      // nicht aus einem Aussenabstand am Button - der wuerde ein leeres
      // Element ebenfalls verschieben.
      if (head.element_border_buttons !== false) {
        const rules = [];
        if (edge > 0) {
          rules.push(`  box-shadow: inset 0 0 0 ${edge}px ${edgeColor} !important;`);
        }
        if (edgeRadius > 0) {
          rules.push(`  border-radius: ${edgeRadius}px !important;`);
        }
        push(
          `${scope} .toolbar ha-menu-button,`,
          `${scope} .toolbar ha-icon-button-arrow-prev,`,
          `${scope} .action-items .sh-header-button,`,
          `${scope} .action-items ha-icon-button {`,
          ...rules,
          "}",
          `${scope} .action-items { gap: 4px !important; }`
        );
      }
      // Bei den Reitern liegt der Strich der aktiven Ansicht an der Unterkante.
      // Ein echter Rahmen wuerde ihn ueberschreiben, deshalb wird der Rahmen
      // als innerer Schatten gezeichnet: gleiches Bild, keine Kollision.
      if (head.element_border_tabs !== false) {
        const rules = ["  margin-inline: 2px !important;"];
        if (edge > 0) {
          rules.push(`  box-shadow: inset 0 0 0 ${edge}px ${edgeColor} !important;`);
        }
        if (edgeRadius > 0) {
          rules.push(`  border-radius: ${edgeRadius}px !important;`);
        }
        push(`${tabTypes.map((name) => `${scope} ${name}`).join(",\n")} {`, ...rules, "}");
      }
    }

    return out.join("\n");
  };

  /** The big one: stylesheet for the shadow root of ha-sidebar. */
  const buildSidebarCss = (config, generation, merge) => {
    const layout = config.layout;

    // Ist die Seitenleiste ausgeblendet, braucht der ganze Rest nicht gebaut
    // zu werden. Das :host trifft <ha-sidebar> selbst - dieses Stylesheet
    // liegt in dessen Schattenwurzel -, und zwar in jedem Zustand: auch im
    // schmalen Modus, wo die Leiste als Schublade ueber dem Inhalt liegt.
    if (layout.hide_sidebar) {
      return ":host { display: none !important; }";
    }

    const look = config.appearance;
    const parts = !!generation.parts;
    const item = generation.item;
    const list = generation.list;

    const gap = clamp(number(layout.gap, 6), 0, 64);
    const cols = clamp(Math.round(number(layout.columns, 1)), 1, 4);
    const colsNarrow = clamp(
      Math.round(number(layout.columns_collapsed, 1)),
      1,
      3
    );
    const tileHeight = clamp(number(layout.tile_height, 74), 28, 300);
    const tileGap = clamp(number(layout.tile_gap, 2), 0, 60);
    const rowHeight = clamp(number(layout.row_height, 40), 24, 200);
    // Eingeklappt darf es niedriger (oder hoeher) sein; 0 heisst: wie
    // ausgeklappt.
    const tileHeightNarrow = number(layout.tile_height_collapsed, 0) > 0
      ? clamp(number(layout.tile_height_collapsed, 0), 28, 300)
      : tileHeight;
    const rowHeightNarrow = number(layout.row_height_collapsed, 0) > 0
      ? clamp(number(layout.row_height_collapsed, 0), 24, 200)
      : rowHeight;
    // Radius: ein Wert fuer alle Ecken, oder vier einzelne.
    // Reihenfolge wie in CSS: oben links, oben rechts, unten rechts, unten links
    const oneRadius = clamp(number(look.item_radius, 12), 0, 60);
    const radii = look.item_radius_split
      ? [
          look.item_radius_tl,
          look.item_radius_tr,
          look.item_radius_br,
          look.item_radius_bl,
        ].map((corner) => clamp(number(corner, 0), 0, 60))
      : [oneRadius, oneRadius, oneRadius, oneRadius];
    const radius = radii.map((corner) => `${corner}px`).join(" ");
    const iconSize = clamp(number(look.icon_size, 24), 8, 96);
    const fontSize = clamp(number(look.font_size, 12), 6, 40);
    const wide = clamp(number(layout.width, 256), 56, 1000);
    const narrowWidth = clamp(number(layout.width_collapsed, 56), 40, 400);

    const style = value(layout.item_style) || "auto";
    const tiles = style === "tile" || (style === "auto" && cols > 1);
    const tilesNarrow = style === "tile" || (style === "auto" && colsNarrow > 1);

    const out = [];
    const push = (...lines) => out.push(...lines);

    push(`/* HA Style Hub ${VERSION} - generated, do not edit */`);

    /* --- tokens ------------------------------------------------------ */
    push(":host {", `  --sh-gap: ${gap}px;`, `  --sh-radius: ${radius};`);
    push(`  --ha-sidebar-expanded-width: ${wide}px;`);
    push("  --ha-sidebar-expanded-item-width: auto;");
    if (css(look.icon_color)) {
      push(`  --sidebar-icon-color: ${css(look.icon_color)};`);
    }
    if (css(look.text_color)) {
      push(`  --sidebar-text-color: ${css(look.text_color)};`);
    }
    if (css(look.icon_color_selected)) {
      push(
        `  --sidebar-selected-icon-color: ${css(look.icon_color_selected)};`
      );
    }
    const background = backgroundOf(look);
    if (background) {
      // Works for plain colors as well as for gradients.
      push(`  background: ${background} !important;`);
    }
    push("}");

    // --sh-cols and --sh-pad inherit into the shadow roots of the
    // navigation lists, so one sheet covers both sidebar states.
    // Collapsed the padding is capped, otherwise the icons get squeezed
    // inside the narrow 56 px strip.
    push(
      `:host { --sh-cols: ${colsNarrow}; --sh-pad: min(var(--sh-gap), 4px); }`,
      `:host([expanded]) { --sh-cols: ${cols}; --sh-pad: var(--sh-gap); }`
    );

    /* --- header ------------------------------------------------------ */

    // Home Assistant hard codes the header block to 56px while the sidebar is
    // collapsed, so it does not follow a custom collapsed width - the block
    // (and its background) would end before the sidebar does. The expanded
    // state needs nothing here, it already follows
    // --ha-sidebar-expanded-width, which is set further up.
    // The menu button is centred at the same time: collapsed there is nothing
    // else in that row to align it to, the title is invisible.
    push(
      ":host(:not([expanded])) .menu {",
      `  width: calc(${narrowWidth}px + var(--safe-area-inset-left, 0px)) !important;`,
      "  justify-content: center !important;",
      "  padding-inline: var(--safe-area-inset-left, 0px) 0 !important;",
      "}"
    );

    if (css(look.header_background)) {
      push(".menu {", `  background: ${css(look.header_background)} !important;`, "}");
    }
    if (css(look.title_color)) {
      // the title inherits the color of .menu, so it needs its own rule
      push(
        ".menu .title {",
        `  color: ${css(look.title_color)} !important;`,
        "}"
      );
    }
    if (look.hide_title) {
      push(".menu .title { display: none !important; }");
    }
    if (look.hide_toggle) {
      push(".menu ha-icon-button { display: none !important; }");
    }

    /* --- grid -------------------------------------------------------- */
    if (merge) {
      push(
        ".panels-list {",
        "  display: grid !important;",
        "  grid-template-columns: repeat(var(--sh-cols, 1), minmax(0, 1fr)) !important;",
        "  gap: var(--sh-gap) !important;",
        "  padding: var(--sh-pad) !important;",
        "  align-content: start !important;",
        "  overflow-y: auto !important;",
        "  overflow-x: hidden !important;",
        "  box-sizing: border-box !important;",
        "}",
        // dissolve everything between .panels-list and the entries
        ".wrapper { display: contents !important; }",
        `${list} { display: contents !important; }`,
        // the flexible spacer and the scroll shadows have no place in a grid
        ".spacer { display: none !important; }",
        ".fade-top, .fade-bottom { display: none !important; }",
        // tooltips are popups, they must not take a grid cell
        "ha-tooltip { display: contents !important; }",
        // loading spinner
        "ha-fade-in { grid-column: 1 / -1; }",
        // gen 1 / gen 2 leftovers
        ".bottom-actions { display: contents !important; }",
        ".divider { display: none !important; }"
      );
    } else {
      push(
        ".panels-list { display: flex !important; flex-direction: column !important; }",
        `${list} { display: block !important; }`,
        "ha-tooltip { display: contents !important; }"
      );
    }

    /* --- entries ----------------------------------------------------- */
    push(
      `${item} {`,
      // Higher than any position an entry can get from the saved order
      // (index + 1), so unlisted entries always come after the listed ones.
      "  order: 100000;",
      // The entry is a flex container so its inner box fills the height set
      // further down. This belongs here and not in the tile/row rules: those
      // are scoped with :host(...), which outweighs the display: none of a
      // hidden entry and would bring it back on screen.
      "  display: flex !important;",
      "  width: auto !important;",
      "  min-width: 0 !important;",
      "  margin: 0 !important;",
      "  box-sizing: border-box !important;",
      "  border-radius: var(--sh-radius) !important;",
      "  overflow: hidden;",
      "}"
    );

    if (css(look.item_background)) {
      push(`${item} { background: ${css(look.item_background)} !important; }`);
    }
    if (css(look.item_background_selected)) {
      push(
        `${item}.selected {`,
        `  background: ${css(look.item_background_selected)} !important;`,
        "}",
        // the stock highlight overlay would sit on top of our color
        `${item}.selected::before { display: none !important; }`
      );
    }
    // Rahmen: eine Breite fuer alle Seiten, oder vier einzelne.
    // Reihenfolge wie in CSS: oben, rechts, unten, links
    const oneBorder = clamp(number(look.item_border_width, 0), 0, 20);
    const borders = look.item_border_split
      ? [
          look.item_border_top,
          look.item_border_right,
          look.item_border_bottom,
          look.item_border_left,
        ].map((side) => clamp(number(side, 0), 0, 20))
      : [oneBorder, oneBorder, oneBorder, oneBorder];
    if (borders.some((side) => side > 0)) {
      push(
        `${item} {`,
        "  border-style: solid !important;",
        `  border-width: ${borders.map((side) => `${side}px`).join(" ")} !important;`,
        `  border-color: ${
          css(look.item_border_color) || "var(--divider-color)"
        } !important;`,
        "}"
      );
    }

    push(
      `${item} ha-icon[slot="start"],`,
      `${item} ha-svg-icon[slot="start"] {`,
      `  --mdc-icon-size: ${iconSize}px;`,
      `  width: ${iconSize}px !important;`,
      `  height: ${iconSize}px !important;`,
      "}",
      `${item} ha-user-badge[slot="start"] {`,
      `  width: ${iconSize}px !important;`,
      `  height: ${iconSize}px !important;`,
      "}"
    );

    if (css(look.font_family)) {
      // on :host so the sidebar title follows the same font
      push(
        ":host {",
        `  font-family: ${css(look.font_family)} !important;`,
        "}",
        `${item} .item-text, .menu .title {`,
        `  font-family: ${css(look.font_family)} !important;`,
        "}"
      );
    }

    const textRules = [
      `  font-size: ${fontSize}px !important;`,
      `  font-weight: ${css(look.font_weight) || "500"} !important;`,
    ];
    if (css(look.text_color)) {
      textRules.push(`  color: ${css(look.text_color)} !important;`);
    }
    push(`${item} .item-text {`, ...textRules, "}");

    // Hover: the stock look is a translucent ripple overlay. As soon as an own
    // hover background is set that overlay is switched off, otherwise the two
    // would blend and the chosen color would never be the one on screen.
    if (css(look.hover_background)) {
      const opacity = clamp(number(look.hover_opacity, 100), 0, 100);
      // color-mix keeps this working for every color notation - mixing the
      // chosen color with transparent is the same as an alpha channel, but
      // without having to rewrite the value the user typed
      const hoverBackground =
        opacity >= 100 || !isColor(look.hover_background)
          ? css(look.hover_background)
          : `color-mix(in srgb, ${css(look.hover_background)} ${opacity}%, transparent)`;
      push(
        `${item} { --ha-ripple-hover-opacity: 0; }`,
        `${item}:hover {`,
        `  background: ${hoverBackground} !important;`,
        "}"
      );
    }
    if (css(look.hover_text_color)) {
      push(
        `${item}:hover .item-text {`,
        `  color: ${css(look.hover_text_color)} !important;`,
        "}"
      );
      if (parts) {
        push(
          `${item}:hover::part(headline) {`,
          `  color: ${css(look.hover_text_color)} !important;`,
          "}"
        );
      }
    }
    if (css(look.hover_icon_color)) {
      push(
        `${item}:hover ha-icon[slot="start"],`,
        `${item}:hover ha-svg-icon[slot="start"] {`,
        `  color: ${css(look.hover_icon_color)} !important;`,
        "}"
      );
    }

    // ------------------------------------------------------------ scrollbar
    if (layout.hide_scrollbar) {
      push(
        ".panels-list, .ha-scrollbar {",
        "  scrollbar-width: none !important;",
        "}",
        ".panels-list::-webkit-scrollbar,",
        ".ha-scrollbar::-webkit-scrollbar {",
        "  width: 0 !important;",
        "  height: 0 !important;",
        "  display: none !important;",
        "}"
      );
    }

    const badgeRules = [];
    if (css(look.badge_background)) {
      badgeRules.push(
        `  background-color: ${css(look.badge_background)} !important;`
      );
    }
    if (css(look.badge_color)) {
      badgeRules.push(`  color: ${css(look.badge_color)} !important;`);
    }
    if (badgeRules.length) {
      push(`${item} .badge {`, ...badgeRules, "}");
    }

    if (css(look.text_color_selected)) {
      push(
        `${item}.selected .item-text {`,
        `  color: ${css(look.text_color_selected)} !important;`,
        "}"
      );
      if (parts) {
        push(
          `${item}.selected::part(headline) {`,
          `  color: ${css(look.text_color_selected)} !important;`,
          "}"
        );
      }
    }

    /* --- row / tile look --------------------------------------------- */
    // Labels in the collapsed sidebar: Home Assistant hides them itself, but
    // the tile rules below would force them visible again. So the decision has
    // to be passed down instead of being layered on top afterwards.
    const showLabelCollapsed = !look.hide_labels_collapsed;

    const tileRules = (scope, showLabel, tileHeight) => {
      const rules = [];
      // The height belongs on the entry itself, not only on its inner box:
      // the entry is the grid item, so it is what sizes the row. A min-height
      // that only lives inside the shadow root leaves the row smaller than
      // the content, and the label gets clipped.
      rules.push(
        `${scope} ${item} {`,
        `  min-height: ${tileHeight}px !important;`,
        "}"
      );
      if (parts) {
        rules.push(
          `${scope} ${item}::part(base) {`,
          // the entry is a flex container now, so the inner box simply fills it
          "  flex: 1 1 auto !important;",
          "  min-height: 0 !important;",
          "  flex-direction: column !important;",
          "  align-items: center !important;",
          "  justify-content: center !important;",
          `  gap: ${tileGap}px !important;`,
          "  padding-inline: 2px !important;",
          "  padding-block: 6px !important;",
          "  text-align: center;",
          "}",
          `${scope} ${item}::part(content) {`,
          "  flex: 0 0 auto !important;",
          "  width: 100%;",
          "  align-items: center !important;",
          "}",
          `${scope} ${item}::part(headline) {`,
          "  text-align: center;",
          "  white-space: normal !important;",
          "  overflow: visible !important;",
          "}",
          `${scope} ${item}::part(start) {`,
          "  justify-content: center;",
          "}",
          // Hat ein Eintrag eine Zaehlblase (Einstellungen, Benachrichtigungen),
          // zeigt Home Assistant den Bereich "end" an - die Blase darin ist hier
          // zwar ausgeblendet, der leere Bereich aber bliebe eine dritte Zeile
          // der Kachel und schoebe Symbol und Text samt Zeilenabstand nach oben.
          `${scope} ${item}::part(end) {`,
          "  display: none !important;",
          "}"
        );
      }
      // The counter bubble: Home Assistant renders it twice, once next to the
      // icon (slot="start", shown while collapsed) and once at the end of the
      // row (slot="end", shown while expanded). In a column layout the second
      // one ends up below the label, so the first one is used instead and
      // anchored to the icon.
      rules.push(
        `${scope} ${item} .badge[slot="end"] {`,
        "  display: none !important;",
        "}",
        `${scope} ${item} .badge[slot="start"] {`,
        "  opacity: 1 !important;",
        "  transform: none !important;",
        "  pointer-events: auto !important;",
        "  top: -6px !important;",
        "  left: auto !important;",
        "  right: -8px !important;",
        "}"
      );
      if (parts) {
        rules.push(
          // positioned, so the bubble sits on the icon instead of somewhere
          // in the tile - and the icon itself stays centred
          `${scope} ${item}::part(start) {`,
          "  position: relative !important;",
          "  overflow: visible !important;",
          "}"
        );
      }
      if (showLabel) {
        rules.push(
          `${scope} ${item} .item-text {`,
          "  max-width: 100% !important;",
          "  opacity: 1 !important;",
          "  white-space: normal !important;",
          "  text-align: center;",
          "  line-height: 1.15;",
          "  overflow-wrap: anywhere;",
          "  display: -webkit-box;",
          "  -webkit-line-clamp: 2;",
          "  -webkit-box-orient: vertical;",
          "  overflow: hidden;",
          "}"
        );
      }
      return rules;
    };

    const rowRules = (scope, rowHeight) => {
      // same reasoning as in tileRules: the height goes on the grid item
      const rules = [
        `${scope} ${item} {`,
        `  min-height: ${rowHeight}px !important;`,
        "}",
      ];
      if (parts) {
        rules.push(
          `${scope} ${item}::part(base) {`,
          "  flex: 1 1 auto !important;",
          "  min-height: 0 !important;",
          "  padding-inline: 10px !important;",
          "  gap: 10px !important;",
          "}"
        );
      }
      return rules;
    };

    push(
      ...(tiles
        ? tileRules(":host([expanded])", true, tileHeight)
        : rowRules(":host([expanded])", rowHeight))
    );
    push(
      ...(tilesNarrow
        ? tileRules(":host(:not([expanded]))", showLabelCollapsed, tileHeightNarrow)
        : rowRules(":host(:not([expanded]))", rowHeightNarrow))
    );

    if (showLabelCollapsed) {
      push(
        `:host(:not([expanded])) ${item} .item-text {`,
        "  max-width: 100% !important;",
        "  opacity: 1 !important;",
        "}"
      );
    } else {
      // display:none instead of the stock max-width:0 - in the tile look the
      // label is a flex child and a zero width span would still take up a row
      push(
        `:host(:not([expanded])) ${item} .item-text {`,
        "  display: none !important;",
        "}"
      );
      if (parts) {
        push(
          // Without a label there is nothing left to align to, so the icon is
          // centred in the cell. This matters in the row look above all: there
          // the icon would otherwise sit at the left edge of a wide cell with
          // empty space next to it.
          `:host(:not([expanded])) ${item}::part(content) {`,
          "  display: none !important;",
          "}",
          // the trailing badge is invisible while collapsed but would still
          // take up space and push the icon off centre
          `:host(:not([expanded])) ${item}::part(end) {`,
          "  display: none !important;",
          "}",
          `:host(:not([expanded])) ${item}::part(base) {`,
          "  justify-content: center !important;",
          "  padding-inline: 0 !important;",
          "  gap: 0 !important;",
          "}",
          // positioned, so the counter bubble follows the centred icon instead
          // of staying anchored to the left edge of the entry
          `:host(:not([expanded])) ${item}::part(start) {`,
          "  justify-content: center !important;",
          "  position: relative !important;",
          "  overflow: visible !important;",
          "}",
          `:host(:not([expanded])) ${item} .badge[slot="start"] {`,
          "  top: -6px !important;",
          "  left: auto !important;",
          "  right: -8px !important;",
          "}"
        );
      }
    }

    /* --- Zwischenueberschriften --------------------------------------- */
    // Sie laufen immer ueber die ganze Breite und verschwinden im
    // eingeklappten Zustand: dort ist kein Platz fuer Text, und ein Icon
    // allein wuerde wie ein weiterer Eintrag aussehen.
    push(
      ".sh-heading {",
      "  grid-column: 1 / -1 !important;",
      // Ein Rasterfeld waechst von sich aus auf die Hoehe seiner Zeile - es
      // wuerde sich also an einer Kachel daneben ausrichten und mit ihr
      // mitwachsen. Eine Ueberschrift soll aber immer genau so hoch sein wie
      // sie selbst, egal was gerade neben oder unter ihr steht: sonst
      // veraendert sich ihre Hoehe beim Auf- und Zuklappen.
      "  align-self: start !important;",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  gap: 8px !important;",
      "  box-sizing: border-box !important;",
      "  padding: 14px 12px 4px !important;",
      "  margin: 0 !important;",
      "  font-size: 11px !important;",
      "  font-weight: 500 !important;",
      "  letter-spacing: .06em !important;",
      "  text-transform: uppercase !important;",
      "  line-height: 1.2 !important;",
      "  white-space: nowrap !important;",
      "  overflow: hidden !important;",
      "  text-overflow: ellipsis !important;",
      "  opacity: .75 !important;",
      "  pointer-events: none !important;",
      "}",
      ".sh-heading ha-icon { --mdc-icon-size: 16px !important; flex: 0 0 auto !important; }",
      ":host(:not([expanded])) .sh-heading { display: none !important; }",
      // Nur zusammenklappbare Ueberschriften nehmen Klicks an.
      ".sh-heading[data-sh-collapsible] {",
      "  pointer-events: auto !important;",
      "  cursor: pointer !important;",
      "}",
      ".sh-heading .sh-caret {",
      "  margin-left: auto !important;",
      "  flex: 0 0 auto !important;",
      "  transition: transform .15s ease !important;",
      "  font-size: 10px !important;",
      "  line-height: 1 !important;",
      "}",
      ".sh-heading[data-sh-collapsed] .sh-caret { transform: rotate(-90deg) !important; }"
    );

    // Eintraege einer zugeklappten Ueberschrift ausblenden. Nur im
    // ausgeklappten Zustand: eingeklappt ist die Ueberschrift selbst weg, dort
    // gaebe es keine Moeglichkeit mehr, die Eintraege wieder sichtbar zu
    // machen.
    (config.collapsed || []).forEach((head) => {
      // Only a heading that is there and can be clicked may hide its entries.
      // Otherwise (heading deleted, hidden or no longer collapsible) they
      // would stay hidden in this browser with no way to bring them back.
      const heading = config.items[head];
      if (
        !heading ||
        !heading.collapsible ||
        heading.hidden ||
        !Array.isArray(config.order) ||
        config.order.indexOf(head) < 0
      ) {
        return;
      }
      Object.keys(config.items).forEach((key) => {
        if (key.indexOf(HEADING_PREFIX) === 0) {
          return;
        }
        if (config.items[key].parent !== head) {
          return;
        }
        push(
          `${selectorsOfKey(key, ":host([expanded])")} { display: none !important; }`
        );
      });
    });

    /* --- per entry --------------------------------------------------- */
    const order = Array.isArray(config.order) ? config.order : [];
    order.forEach((key, index) => {
      push(`${selectorsOfKey(key)} { order: ${index + 1}; }`);
    });

    Object.keys(config.items).forEach((key) => {
      const entry = config.items[key];

      if (key.indexOf(HEADING_PREFIX) === 0) {
        const scope = `.sh-heading[data-sh-key="${quote(key)}"]`;
        if (entry.hidden) {
          push(`${scope} { display: none !important; }`);
          return;
        }
        const rules = [];

        // Hoehe der Zeile. Ohne Angabe bestimmt der Text sie, und die
        // Grundregel setzt oben mehr Polsterung als unten - so sitzt eine
        // Ueberschrift dicht ueber "ihren" Eintraegen und mit Abstand zu
        // denen darueber. Wird eine Hoehe gesetzt, faellt die Polsterung
        // weg und der Text steht mittig darin (align-items: center steht
        // schon in der Grundregel).
        const height = Math.max(0, Math.round(number(entry.height, 0)));
        if (height > 0) {
          rules.push(`  height: ${height}px !important;`);
          rules.push("  padding-top: 0 !important;");
          rules.push("  padding-bottom: 0 !important;");
        }

        // Grossbuchstaben sind der Normalfall. Beim Abschalten geht die
        // Laufweite mit: die ist fuer Versalien gedacht und reisst gemischte
        // Schrift unnoetig auseinander.
        if (entry.uppercase === false) {
          rules.push("  text-transform: none !important;");
          rules.push("  letter-spacing: normal !important;");
        }

        if (css(entry.background)) {
          rules.push(`  background: ${css(entry.background)} !important;`);
        }
        if (css(entry.text_color)) {
          rules.push(`  color: ${css(entry.text_color)} !important;`);
          rules.push("  opacity: 1 !important;");
        }

        // Rahmen: ein Wert oder vier. Die Kurzform border-width nimmt beides,
        // deshalb reicht ein Feld.
        const borders = entry.border_split
          ? [entry.border_top, entry.border_right, entry.border_bottom, entry.border_left]
              .map((one) => `${Math.max(0, Math.round(number(one, 0)))}px`)
              .join(" ")
          : number(entry.border_width, 0) > 0
            ? `${Math.max(0, Math.round(number(entry.border_width, 0)))}px`
            : "";
        if (borders && borders !== "0px" && borders !== "0px 0px 0px 0px") {
          rules.push("  border-style: solid !important;");
          rules.push(`  border-width: ${borders} !important;`);
          rules.push(
            `  border-color: ${css(entry.border_color) || "currentColor"} !important;`
          );
        }

        const radius = entry.radius_split
          ? [entry.radius_tl, entry.radius_tr, entry.radius_br, entry.radius_bl]
              .map((one) => `${Math.max(0, Math.round(number(one, 0)))}px`)
              .join(" ")
          : number(entry.radius, 0) > 0
            ? `${Math.max(0, Math.round(number(entry.radius, 0)))}px`
            : "";
        if (radius && radius !== "0px" && radius !== "0px 0px 0px 0px") {
          rules.push(`  border-radius: ${radius} !important;`);
        }
        if (rules.length) {
          push(`${scope} {`, ...rules, "}");
        }
        if (css(entry.icon_color)) {
          push(
            `${scope} ha-icon {`,
            `  color: ${css(entry.icon_color)} !important;`,
            "}"
          );
        }
        return;
      }

      if (entry.hidden) {
        // The tag name is part of the selector so this always outweighs the
        // generic entry rule that sets display: flex.
        const hidden = selectorListOfKey(key)
          .map((one) => `${item}${one}`)
          .join(", ");
        push(`${hidden} { display: none !important; }`);
        return;
      }

      // A span must never exceed the column count of the current state,
      // otherwise the browser creates implicit columns and the grid breaks.
      const span = clamp(Math.round(number(entry.span, 1)), 1, 4);
      if (span > 1) {
        const wide = Math.min(span, cols);
        const narrow = Math.min(span, colsNarrow);
        if (wide > 1) {
          push(
            `${selectorsOfKey(key, ":host([expanded])")} {`,
            `  grid-column: span ${wide} !important;`,
            "}"
          );
        }
        if (narrow > 1) {
          push(
            `${selectorsOfKey(key, ":host(:not([expanded]))")} {`,
            `  grid-column: span ${narrow} !important;`,
            "}"
          );
        }
      }

      if (css(entry.background)) {
        push(
          `${selectorsOfKey(key)} {`,
          `  background: ${css(entry.background)} !important;`,
          "}"
        );
      }
      if (css(entry.icon_color)) {
        const iconSelectors = [
          selectorsOfKey(key, "", ' ha-icon[slot="start"]'),
          selectorsOfKey(key, "", ' ha-svg-icon[slot="start"]'),
        ].join(", ");
        push(
          `${iconSelectors} {`,
          `  color: ${css(entry.icon_color)} !important;`,
          "}"
        );
      }
      if (css(entry.text_color)) {
        push(
          `${selectorsOfKey(key, "", " .item-text")} {`,
          `  color: ${css(entry.text_color)} !important;`,
          "}"
        );
        if (parts) {
          push(
            `${selectorsOfKey(key, "", "::part(headline)")} {`,
            `  color: ${css(entry.text_color)} !important;`,
            "}"
          );
        }
      }
    });

    return out.join("\n");
  };

  /* ------------------------------------------------------------------ *
   * Controller
   * ------------------------------------------------------------------ */

  class SidebarHub {
    constructor() {
      // Bis der Server antwortet, gilt der zuletzt gemerkte Stand.
      this.config = normalize(readCachedConfig());
      // Zugeklappte Ueberschriften - pro Browser, siehe COLLAPSE_KEY
      this.collapsed = readCollapsed();
      this.generation = null;
      this.sheets = new WeakMap();
      this.activeSheets = [];
      this.sidebar = null;
      this.applying = false;
      this.pending = false;
      this.observer = null;
      this.mainObserver = null;
      this.dialogObserver = null;
      this.unsubscribe = null;
      this.titleOriginal = null;
    }

    log(...args) {
      if (this.config.advanced.debug) {
        console.info(TAG, ...args);
      }
    }

    /**
     * Debug-Zeile fuer einen der vier Bereiche (sidebar, theme, header,
     * settings). Dieselbe Zeile wird je Bereich nur einmal geschrieben:
     * apply() laeuft bei jeder Aenderung der Seitenleiste, und die
     * Einstellungsseite wird nach einem Seitenwechsel mehrfach abgefragt -
     * die Konsole wuerde sonst volllaufen.
     */
    debug(area, text, detail) {
      if (!this.config.advanced.debug) {
        this.debugSeen = null;
        return;
      }
      let key = text;
      try {
        key += detail === undefined ? "" : JSON.stringify(detail);
      } catch (err) {
        // nicht darstellbar - dann zaehlt nur der Text
      }
      if (!this.debugSeen) {
        this.debugSeen = {};
      }
      if (this.debugSeen[area] === key) {
        return;
      }
      this.debugSeen[area] = key;
      if (detail === undefined) {
        console.info(TAG, `[${area}]`, text);
      } else {
        console.info(TAG, `[${area}]`, text, detail);
      }
    }

    /**
     * Das Theme setzt Home Assistant selbst (theme.py traegt es ein), hier
     * gibt es dafuer kein CSS. Fuer die Fehlersuche zaehlt deshalb: Ist es
     * eingetragen, und ist es das, was dieser Browser gerade benutzt?
     */
    debugTheme() {
      if (!this.config.advanced.debug) {
        return;
      }
      const theme = this.config.theme || {};
      const hass = (this.root && this.root.hass) || {};
      const themes = hass.themes || {};
      const name = value(theme.name) || "HA Style Hub";
      const selected = hass.selectedTheme && hass.selectedTheme.theme;
      const count = (mode) => theme[mode] || 0;
      this.debug("theme", theme.enabled ? "is registered in Home Assistant by the server" : "not registered (switched off on the Theme tab)", {
        name,
        knownToHomeAssistant: !!(themes.themes && themes.themes[name]),
        usedInThisBrowser: selected || themes.theme || "(default)",
        serverDefault: themes.default_theme || "",
        darkMode: themes.darkMode === true,
        values: { dark: count("dark"), light: count("light") },
      });
    }

    /* -------------------------------------------------- bootstrapping */

    /**
     * Start, and keep trying until Home Assistant is actually there.
     *
     * This must never give up permanently. <home-assistant> is part of the
     * static HTML of index.html, so it exists in the document long before its
     * custom element class is registered and the element is upgraded - and
     * only the upgrade attaches the shadow root. Whoever wins that race
     * decides whether the sidebar gets styled, which is why every wait below
     * asks for the shadow root and not just for the element.
     *
     * The same applies to pages without an app at all (login, onboarding):
     * there we simply keep waiting quietly instead of writing an error.
     */
    async start() {
      if (await this.connect()) {
        return;
      }
      this.retryLater();
    }

    async connect() {
      this.attempts = (this.attempts || 0) + 1;

      const root = await waitForShadow(
        () => document.querySelector("home-assistant"),
        15000
      );
      if (!root) {
        this.miss("home-assistant is not ready yet");
        return false;
      }
      this.root = root;

      const main = await waitForShadow(
        () => root.shadowRoot.querySelector("home-assistant-main"),
        15000
      );
      if (!main) {
        // normal while the login screen or the onboarding is showing
        this.miss("home-assistant-main is not ready yet");
        return false;
      }
      this.main = main;

      if (!(await this.loadConfig())) {
        this.miss("no websocket connection yet");
        return false;
      }

      this.listen();
      this.watchDialogs();

      if (!(await this.bindSidebar())) {
        this.miss("ha-sidebar is not ready yet");
        return false;
      }

      console.info(TAG, `${VERSION} active`);
      this.attempts = 0;
      return true;
    }

    /** Log a missed attempt - quietly at first, this is usually just timing. */
    miss(reason) {
      this.log(reason);
      if (this.attempts === 3) {
        console.warn(
          TAG,
          `${reason} - still trying (this is only a problem if the sidebar never changes)`
        );
      }
    }

    retryLater() {
      if (this.retryTimer) {
        return;
      }
      const delay = Math.min(2000 * this.attempts, 30000);
      this.retryTimer = window.setTimeout(async () => {
        this.retryTimer = null;
        if (!(await this.connect())) {
          this.retryLater();
        }
      }, delay);
    }

    /** Read the configuration over the websocket API. */
    async loadConfig() {
      const connection = await waitFor(
        () => this.root.hass && this.root.hass.connection,
        15000
      );
      if (!connection) {
        return false;
      }
      try {
        const result = await connection.sendMessagePromise({
          type: "ha_style_hub/get",
        });
        this.config = normalize(result && result.config);
        this.fromServer = true;
        writeCachedConfig(result && result.config);
        this.log("configuration loaded", this.config);
        return true;
      } catch (err) {
        // Der gemerkte Stand gilt nur, bis der Server geantwortet hat. Kennt
        // er den Befehl nicht, gibt es die Integration dort nicht (mehr) -
        // dann darf auch ihr Aussehen nicht stehen bleiben. Ein Stand, der
        // schon einmal vom Server kam, bleibt dagegen, wie er ist.
        if (!this.fromServer) {
          this.config = normalize(null);
          writeCachedConfig(null);
        }
        // "unknown command" means the integration is not (yet) loaded on the
        // server - keep the defaults and carry on rather than block the start
        console.warn(TAG, "could not read the configuration", err);
        return true;
      }
    }

    /** React to configuration changes and to the panel's live preview. */
    listen() {
      const connection = this.root.hass && this.root.hass.connection;
      if (connection && !this.unsubscribe && !this.subscribing) {
        this.subscribing = true;
        const onConfig = (config) => {
          if (config) {
            this.config = normalize(config);
            this.fromServer = true;
            writeCachedConfig(config);
            this.log("configuration updated by the server");
            this.apply();
          } else {
            this.reload();
          }
        };
        // Older backend (or a connection object without subscribeMessage):
        // listen to the event itself. Home Assistant only allows that for
        // administrators.
        const viaEvents = () =>
          connection.subscribeEvents(
            (event) => onConfig(event && event.data && event.data.config),
            EVENT_UPDATED
          );
        // The command of this integration works for every user.
        const start =
          typeof connection.subscribeMessage === "function"
            ? connection
                .subscribeMessage((message) => onConfig(message && message.config), {
                  type: WS_SUBSCRIBE,
                })
                .catch(() => viaEvents())
            : viaEvents();
        start
          .then((unsub) => {
            this.unsubscribe = unsub;
            this.subscribing = false;
          })
          .catch((err) => {
            this.subscribing = false;
            console.warn(TAG, "event subscription failed", err);
          });
      }

      // connect() can run more than once, the window listeners only once
      if (this.windowListeners) {
        return;
      }
      this.windowListeners = true;

      // live preview coming from the configuration panel
      window.addEventListener(EVENT_PREVIEW, (event) => {
        this.config = normalize(event.detail);
        this.apply();
      });
      window.addEventListener(EVENT_RELOAD, () => this.reload());
      // Innerhalb von Home Assistant wechselt der Router die Seite, ohne dass
      // die Seite neu geladen wird - darauf lauscht die Einstellungsseite.
      window.addEventListener("location-changed", () => {
        this.checkSettingsPage(true);
        this.markLinks();
      });
      window.addEventListener("popstate", () => {
        this.checkSettingsPage(true);
        this.markLinks();
      });
    }

    async reload() {
      await this.loadConfig();
      this.apply();
    }

    /** Find ha-sidebar and keep it bound even when it is re-created. */
    async bindSidebar() {
      const sidebar = await waitForShadow(
        () => this.main.shadowRoot.querySelector("ha-sidebar"),
        15000
      );
      if (!sidebar) {
        return false;
      }

      this.sidebar = sidebar;
      // The sheets are NOT thrown away here: the ones on <home-assistant>,
      // the drawer, <hui-root> and the notification drawer live in roots that
      // survive a new sidebar. Forgetting them would leave their old CSS
      // adopted with nobody able to change or clear it any more (a hidden
      // header or a zero wide sidebar would stay until a reload). They are
      // keyed by root, so the new sidebar gets fresh ones on its own.
      this.generation = null;
      this.titleOriginal = null;

      // ha-sidebar is re-created when the drawer switches between the docked
      // and the modal variant.
      if (!this.mainObserver) {
        this.mainObserver = new MutationObserver(() => {
          const current = this.main.shadowRoot.querySelector("ha-sidebar");
          if (current && current !== this.sidebar) {
            this.log("ha-sidebar was replaced, rebinding");
            this.bindSidebar();
          }
          // Beim Wechsel auf ein Dashboard wird das Panel hier ausgetauscht.
          // <hui-root> entsteht aber erst danach und in einem eigenen Shadow
          // Root, den dieser Beobachter nicht sieht - deshalb wird kurz
          // nachgefasst statt einmal nachgesehen.
          this.scheduleHeader();
          this.checkSettingsPage();
        });
        this.mainObserver.observe(this.main.shadowRoot, {
          childList: true,
          subtree: true,
        });
      }

      if (this.observer) {
        this.observer.disconnect();
      }
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(sidebar.shadowRoot, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "id"],
      });

      this.apply();
      // Beim ersten Laden ist das Dashboard oft noch nicht gerendert.
      this.scheduleHeader();
      return true;
    }

    /**
     * Watch the shadow root of <home-assistant> for dialogs being added.
     * The notification drawer is only built the first time it is opened, so
     * there is nothing to style until then. Only direct children are watched,
     * which keeps this to a handful of callbacks per session.
     */
    watchDialogs() {
      if (this.dialogObserver || !this.root.shadowRoot) {
        return;
      }
      this.dialogObserver = new MutationObserver(() => this.schedule());
      this.dialogObserver.observe(this.root.shadowRoot, { childList: true });
    }

    /** Coalesce many mutations into one apply() per frame. */
    schedule() {
      if (this.applying || this.pending) {
        return;
      }
      this.pending = true;
      requestAnimationFrame(() => {
        this.pending = false;
        this.apply();
      });
    }

    /* ------------------------------------------------------------ apply */

    apply() {
      this.debugTheme();
      if (!this.sidebar || !this.sidebar.shadowRoot) {
        return;
      }
      this.applying = true;
      try {
        if (this.config.advanced.enabled === false) {
          this.reset();
          this.debug("sidebar", "switched off (\"HA Style Hub active\" is unchecked) - nothing is applied");
          this.debug("header", "switched off - nothing is applied");
          this.debug("settings", "switched off - nothing is applied");
          return;
        }

        // Der CSS-Bau braucht den Klappzustand; er kommt nicht aus der
        // gespeicherten Konfiguration, sondern aus diesem Browser.
        this.config.collapsed = this.collapsed;

        const root = this.sidebar.shadowRoot;
        const generation = detectGeneration(root) || this.generation;
        if (!generation) {
          this.log("sidebar structure not recognised yet");
          return;
        }
        if (generation.gen === 1 && !this.warnedOld) {
          this.warnedOld = true;
          console.warn(
            TAG,
            "this Home Assistant version is too old for the grid layout, only the colors are applied"
          );
        }
        this.generation = generation;

        this.tagItems(root, generation);
        this.applyHeadings(root, generation);
        this.applyRestart(root, generation);
        this.applyLinks(root, generation);
        this.applyPopups(root, generation);
        this.applyTooltips(root, generation);
        this.applySheets(root, generation);
        this.applyContent(root, generation);
        this.applyHeader();
        this.checkSettingsPage();
        if (this.config.advanced.debug) {
          const layout = this.config.layout;
          const entries = Array.from(root.querySelectorAll("[data-sh-key]"));
          this.debug("sidebar", layout.hide_sidebar ? "hidden (kiosk mode)" : "applied", {
            structure: `generation ${generation.gen}`,
            expanded: this.sidebar.hasAttribute("expanded"),
            entries: entries.length,
            hiddenEntries: Object.keys(this.config.items || {}).filter(
              (key) => this.config.items[key] && this.config.items[key].hidden
            ).length,
            columns: `${layout.columns} / ${layout.columns_collapsed} (expanded / collapsed)`,
            look: layout.item_style,
          });
        }
      } catch (err) {
        console.error(TAG, "apply failed", err);
      } finally {
        this.applying = false;
      }
    }

    /**
     * Zwischenueberschriften in die Liste haengen.
     *
     * Home Assistant kennt sie nicht, es gibt also kein Element, das man
     * umfaerben koennte - sie muessen erzeugt werden. Zwei Dinge sind dabei
     * wichtig:
     *
     * 1. Sie werden ans ENDE der Liste gehaengt, hinter die Marker, mit denen
     *    Lit seinen Bereich absteckt. Dazwischen einzufuegen wuerde Lit beim
     *    naechsten Neuzeichnen durcheinanderbringen. Ihre Position im Raster
     *    macht ohnehin nur die CSS-Eigenschaft "order", nicht die
     *    Reihenfolge im DOM - dieselbe Mechanik wie beim Sortieren.
     * 2. Die Methode aendert nur, was wirklich abweicht. Der MutationObserver
     *    ueber der Seitenleiste sieht jede eigene Einfuegung und ruft apply()
     *    erneut auf; ohne diese Bedingung liefe das endlos.
     */
    applyHeadings(root, generation) {
      const list = root.querySelector(generation.list);
      if (!list) {
        return;
      }

      const wanted = (Array.isArray(this.config.order) ? this.config.order : [])
        .filter((key) => key.indexOf(HEADING_PREFIX) === 0);
      const present = new Map();
      root.querySelectorAll(".sh-heading").forEach((node) => {
        present.set(node.dataset.shKey, node);
      });

      // was nicht mehr gewuenscht ist, verschwindet
      present.forEach((node, key) => {
        if (wanted.indexOf(key) < 0) {
          node.remove();
        }
      });

      wanted.forEach((key) => {
        const entry = this.config.items[key] || DEFAULT_HEADING;
        let node = present.get(key);
        if (!node || !node.isConnected) {
          node = document.createElement("div");
          node.className = "sh-heading";
          node.dataset.shKey = key;
          // Vorlesesoftware soll die Eintraege vorlesen, nicht die Trenner
          node.setAttribute("aria-hidden", "true");
          list.appendChild(node);
        } else if (node.parentElement !== list) {
          list.appendChild(node);
        }

        const icon = value(entry.icon);
        let iconNode = node.querySelector("ha-icon");
        if (icon) {
          if (!iconNode) {
            iconNode = document.createElement("ha-icon");
            node.insertBefore(iconNode, node.firstChild);
          }
          if (iconNode.getAttribute("icon") !== icon) {
            iconNode.setAttribute("icon", icon);
          }
        } else if (iconNode) {
          iconNode.remove();
        }

        let label = node.querySelector(".sh-heading-text");
        if (!label) {
          label = document.createElement("span");
          label.className = "sh-heading-text";
          node.appendChild(label);
        }
        const text = value(entry.name);
        if (label.textContent !== text) {
          label.textContent = text;
        }

        // Pfeil und Klickverhalten, wenn die Ueberschrift zusammenklappbar ist
        const collapsible = !!entry.collapsible;
        let caret = node.querySelector(".sh-caret");
        if (collapsible) {
          if (!caret) {
            caret = document.createElement("span");
            caret.className = "sh-caret";
            caret.textContent = "\u25BC";
            node.appendChild(caret);
          } else if (caret !== node.lastElementChild) {
            node.appendChild(caret);
          }
          if (!node.hasAttribute("data-sh-collapsible")) {
            node.setAttribute("data-sh-collapsible", "");
          }
          if (!node.dataset.shBound) {
            node.dataset.shBound = "1";
            node.addEventListener("click", () => this.toggleHeading(key));
            node.addEventListener("keydown", (event) => {
              if (
                (event.key === "Enter" || event.key === " ") &&
                node.hasAttribute("data-sh-collapsible")
              ) {
                event.preventDefault();
                this.toggleHeading(key);
              }
            });
          }
          // Ein Trenner wird durch den Klick zur Bedienelement
          node.setAttribute("aria-hidden", "false");
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", "0");
        } else {
          if (caret) {
            caret.remove();
          }
          if (node.hasAttribute("data-sh-collapsible")) {
            node.removeAttribute("data-sh-collapsible");
          }
          node.setAttribute("aria-hidden", "true");
          node.removeAttribute("role");
          node.removeAttribute("tabindex");
        }

        const collapsed = collapsible && this.collapsed.indexOf(key) >= 0;
        if (collapsed !== node.hasAttribute("data-sh-collapsed")) {
          node.toggleAttribute("data-sh-collapsed", collapsed);
        }
      });
    }

    /**
     * Eine Ueberschrift auf- oder zuklappen. Der Zustand landet im
     * localStorage und wird beim naechsten Laden wieder gelesen.
     */
    toggleHeading(key) {
      const index = this.collapsed.indexOf(key);
      if (index >= 0) {
        this.collapsed.splice(index, 1);
      } else {
        this.collapsed.push(key);
      }
      writeCollapsed(this.collapsed);
      // Mit eingeschalteten Debug-Ausgaben steht in der Konsole, welche
      // Eintraege zu dieser Ueberschrift gehoeren. Bleibt beim Zuklappen
      // etwas stehen, das hier nicht auftaucht, ist es dieser Ueberschrift
      // schlicht nicht zugeordnet.
      const kinder = Object.keys(this.config.items).filter(
        (one) =>
          one.indexOf(HEADING_PREFIX) !== 0 && this.config.items[one].parent === key
      );
      this.log(
        "heading",
        key,
        index >= 0 ? "opened" : "collapsed",
        `${kinder.length} zugeordnete Eintraege:`,
        kinder.join(", ") || "(keine)"
      );
      this.apply();
    }

    /**
     * Den Neustart-Knopf in die Liste haengen.
     *
     * Er wird bewusst als Element der gerade laufenden Seitenleisten-
     * Generation erzeugt (ha-list-item-button bzw. ha-md-list-item): damit
     * greifen alle Regeln, die ohnehin fuer Eintraege gebaut werden - Groesse,
     * Kachel- oder Zeilenoptik, Farben, Rahmen - ohne eine einzige Sonderregel.
     * Ueber data-sh-key laeuft er ausserdem durch dieselbe Sortierung wie
     * jeder andere Eintrag und laesst sich einer Ueberschrift zuordnen.
     *
     * Wie bei den Ueberschriften gilt: ans Ende der Liste haengen (Lit hat
     * davor seine Marker) und nur aendern, was wirklich abweicht.
     */
    applyRestart(root, generation) {
      const existing = root.querySelector(`[data-sh-key="${RESTART_KEY}"]`);
      const hass = this.root && this.root.hass;
      // Nur fuer Administratoren: der Dienst homeassistant.restart steht
      // niemandem sonst offen, ein Knopf waere dort nur eine Fehlermeldung.
      // gen 1 kennt kein Raster, dort wuerde er zwischen den Eintraegen
      // stranden.
      const wanted =
        this.config.layout.show_restart === true &&
        generation.gen > 1 &&
        !!(hass && hass.user && hass.user.is_admin);

      if (!wanted) {
        if (existing) {
          existing.remove();
        }
        return;
      }

      const list = root.querySelector(generation.list);
      if (!list) {
        return;
      }

      let node = existing;
      if (!node || !node.isConnected) {
        try {
          node = document.createElement(generation.item);
        } catch (err) {
          console.error(TAG, "could not create the restart entry", err);
          return;
        }
        node.dataset.shKey = RESTART_KEY;
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");

        const icon = document.createElement("ha-icon");
        icon.setAttribute("slot", "start");
        icon.setAttribute("icon", "mdi:restart");
        node.appendChild(icon);

        const label = document.createElement("span");
        label.className = "item-text";
        label.setAttribute("slot", "headline");
        label.textContent = restartText(hass).label;
        node.appendChild(label);

        node.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.restart();
        });
        node.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.restart();
          }
        });

        list.appendChild(node);
      } else if (node.parentElement !== list) {
        list.appendChild(node);
      }
    }

    /**
     * Die Links in die Liste haengen - ein Eintrag je "link:<Pfad>" in der
     * Konfiguration. Gleiche Bauweise wie der Neustart-Knopf: ein Element der
     * laufenden Seitenleisten-Generation mit data-sh-key, damit Sortierung,
     * Ausblenden, Name, Icon, Farben und Ueberschriften ohne Sonderregel
     * greifen. Name und Icon stehen wie bei jedem Eintrag in "items"; ohne
     * Angabe zeigt der Link seinen Pfad und ein Ketten-Symbol.
     */
    applyLinks(root, generation) {
      const hass = this.root && this.root.hass;
      const admin = !!(hass && hass.user && hass.user.is_admin);
      const wanted = new Map();
      if (generation.gen > 1) {
        Object.keys(this.config.items || {}).forEach((key) => {
          const path = linkTarget(key);
          // Ein Link in die Einstellungen waere fuer alle anderen eine
          // Sackgasse - Home Assistant zeigt ihnen diese Seiten nicht.
          // Externe Adressen (1.5.7) kennen diese Grenze nicht.
          if (path && (admin || !linkNeedsAdmin(path))) {
            wanted.set(key, path);
          }
        });
      }

      root.querySelectorAll("[data-sh-link]").forEach((node) => {
        if (!wanted.has(node.dataset.shKey)) {
          node.remove();
        }
      });
      if (!wanted.size) {
        return;
      }
      const list = root.querySelector(generation.list);
      if (!list) {
        return;
      }

      wanted.forEach((path, key) => {
        let node = null;
        root.querySelectorAll("[data-sh-link]").forEach((one) => {
          if (one.dataset.shKey === key) {
            node = one;
          }
        });
        if (!node || !node.isConnected) {
          try {
            node = document.createElement(generation.item);
          } catch (err) {
            console.error(TAG, "could not create a link entry", err);
            return;
          }
          node.dataset.shKey = key;
          node.dataset.shLink = path;
          // Mit href zeichnet ha-list-item-button ein echtes <a> - so bietet
          // der Browser beim Rechtsklick "Link in neuem Tab oeffnen" an, wie
          // bei den Eintraegen von Home Assistant (1.5.5). Der Klick bleibt
          // abgefangen: er wechselt die Seite ohne Neuladen.
          node.href = path;
          node.setAttribute("role", "link");
          node.setAttribute("tabindex", "0");

          // Externe Adresse (1.5.7): oeffnet immer in einem neuen Tab, ohne
          // Verbindung zu dieser Seite (noopener); Name = Rechnername.
          const external = isExternalUrl(path);
          if (external) {
            node.dataset.shExternal = "";
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }

          const icon = document.createElement("ha-icon");
          icon.setAttribute("slot", "start");
          icon.setAttribute("icon", external ? EXTERNAL_ICON : "mdi:link-variant");
          node.appendChild(icon);

          const label = document.createElement("span");
          label.className = "item-text";
          label.setAttribute("slot", "headline");
          label.textContent = external ? externalHost(path) : path;
          node.appendChild(label);

          node.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openLink(path, event.ctrlKey || event.metaKey || event.shiftKey);
          });
          // Mittlere Maustaste: wie bei jedem Link in einem neuen Tab.
          node.addEventListener("auxclick", (event) => {
            if (event.button === 1) {
              event.preventDefault();
              this.openLink(path, true);
            }
          });
          node.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              this.openLink(path, false);
            }
          });
          list.appendChild(node);
        } else if (node.parentElement !== list) {
          list.appendChild(node);
        }
      });
      this.markLinks();
    }

    /**
     * Zu einer Seite von Home Assistant wechseln, ohne die Seite neu zu
     * laden - derselbe Weg, den Home Assistant selbst geht: Adresse in den
     * Verlauf schreiben und "location-changed" melden.
     */
    openLink(path, newTab) {
      // Eine fremde Webseite (1.5.7) geht immer in einen neuen Tab: die
      // Oberflaeche von Home Assistant bleibt, wie sie ist.
      if (isExternalUrl(path)) {
        this.log("link", path);
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }
      if (!LINK_PATH.test(path)) {
        return;
      }
      if (newTab) {
        window.open(path, "_blank", "noopener");
        return;
      }
      this.log("link", path);
      if (window.location.pathname + window.location.search + window.location.hash !== path) {
        window.history.pushState(null, "", path);
      }
      window.dispatchEvent(
        new CustomEvent("location-changed", {
          detail: { replace: false },
          bubbles: true,
          composed: true,
        })
      );
      // Auf dem Handy liegt die Seitenleiste ueber dem Inhalt: nach der Wahl
      // schliesst Home Assistant sie - das uebernimmt dieses Ereignis.
      if (this.main && this.main.hasAttribute("modal")) {
        this.main.dispatchEvent(
          new CustomEvent("hass-toggle-menu", {
            detail: { open: false },
            bubbles: true,
            composed: true,
          })
        );
      }
    }

    /** Hat das PopUp etwas zu zeigen - eine Karte bzw. Links fuer diesen Benutzer? */
    popupHasContent(key) {
      const entry = (this.config.items || {})[key] || {};
      if (entry.content === "card") {
        return isObject(entry.card) && typeof entry.card.type === "string";
      }
      if (entry.content === "web") {
        return isExternalUrl(entry.url);
      }
      return this.popupLinks(key).length > 0;
    }

    /** Die Links eines PopUps, die dieser Benutzer oeffnen darf. */
    popupLinks(key) {
      const hass = this.root && this.root.hass;
      const admin = !!(hass && hass.user && hass.user.is_admin);
      const entry = (this.config.items || {})[key] || {};
      return cleanPopupLinks(entry.links).filter((link) => admin || !linkNeedsAdmin(link.path));
    }

    /**
     * PopUp-Links in die Liste haengen (1.5.1) - gleiche Bauweise wie die
     * Links: ein Element der laufenden Generation mit data-sh-key, damit
     * Sortierung, Ausblenden, Name, Icon, Farben und Ueberschriften ohne
     * Sonderregel greifen. Ein Klick oeffnet das Fenster mit den Links.
     * Hat ein Benutzer keinen der Links offen, fehlt der Eintrag fuer ihn.
     */
    applyPopups(root, generation) {
      const wanted = new Set();
      if (generation.gen > 1) {
        Object.keys(this.config.items || {}).forEach((key) => {
          if (isPopupKey(key) && this.popupHasContent(key)) {
            wanted.add(key);
          }
        });
      }
      root.querySelectorAll("[data-sh-popup]").forEach((node) => {
        if (!wanted.has(node.dataset.shKey)) {
          node.remove();
        }
      });
      if (this.popupKey && !wanted.has(this.popupKey)) {
        this.closePopup();
      }
      if (!wanted.size) {
        return;
      }
      const list = root.querySelector(generation.list);
      if (!list) {
        return;
      }
      const hass = this.root && this.root.hass;
      wanted.forEach((key) => {
        let node = null;
        root.querySelectorAll("[data-sh-popup]").forEach((one) => {
          if (one.dataset.shKey === key) {
            node = one;
          }
        });
        if (!node || !node.isConnected) {
          try {
            node = document.createElement(generation.item);
          } catch (err) {
            console.error(TAG, "could not create a popup entry", err);
            return;
          }
          node.dataset.shKey = key;
          node.dataset.shPopup = "";
          node.setAttribute("role", "button");
          node.setAttribute("aria-haspopup", "dialog");
          node.setAttribute("tabindex", "0");

          const icon = document.createElement("ha-icon");
          icon.setAttribute("slot", "start");
          icon.setAttribute("icon", POPUP_ICON);
          node.appendChild(icon);

          const label = document.createElement("span");
          label.className = "item-text";
          label.setAttribute("slot", "headline");
          label.textContent = popupText(hass).label;
          node.appendChild(label);

          node.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openPopup(key);
          });
          node.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              this.openPopup(key);
            }
          });
          list.appendChild(node);
        } else if (node.parentElement !== list) {
          list.appendChild(node);
        }
      });
    }

    /**
     * Das Fenster eines PopUp-Links (1.5.1). Es haengt am <body>, mit eigenem
     * Shadow Root: die Farben kommen ueber die Variablen des Themes, die
     * Home Assistant auf <html> setzt. Schliessen: Kreuz, Klick daneben,
     * Escape, ein Seitenwechsel - und natuerlich die Wahl eines Links.
     */
    openPopup(key) {
      this.closePopup();
      const hass = this.root && this.root.hass;
      const text = popupText(hass);
      const entry = (this.config.items || {})[key] || {};
      const links = this.popupLinks(key);
      const host = document.createElement("div");
      host.className = "sh-popup-host";
      const isWeb = entry.content === "web";
      const isCard = entry.content === "card";
      // Fenstergroesse (1.5.3): 0 = automatisch - Breite je nach Inhalt, die
      // Hoehe richtet sich nach dem Inhalt (hoechstens 85 % des Bildschirms).
      const width = Number(entry.width) > 0 ? Math.max(240, Number(entry.width)) : isWeb ? 900 : isCard ? 600 : 560;
      host.style.setProperty("--sh-w", `${width}px`);
      if (Number(entry.height) > 0) {
        host.style.setProperty("--sh-h", `${Math.max(120, Number(entry.height))}px`);
        host.setAttribute("data-height", "");
      }
      if (isCard || isWeb) {
        host.setAttribute("data-card", "");
      }
      if (isWeb) {
        host.setAttribute("data-web", "");
      }
      const accent = value(entry.icon_color);
      if (accent) {
        host.style.setProperty("--sh-pc", accent);
      }
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = POPUP_CSS;
      shadow.appendChild(style);
      const scrim = document.createElement("div");
      scrim.className = "scrim";
      shadow.appendChild(scrim);
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      const name = value(entry.name) || text.label;
      card.setAttribute("aria-label", name);
      const head = document.createElement("div");
      head.className = "head";
      const badge = document.createElement("span");
      badge.className = "ic";
      const headIcon = document.createElement("ha-icon");
      headIcon.setAttribute("icon", ICON_NAME.test(value(entry.icon)) ? value(entry.icon) : POPUP_ICON);
      badge.appendChild(headIcon);
      const title = document.createElement("h2");
      title.textContent = name;
      const close = document.createElement("button");
      close.type = "button";
      close.className = "x";
      close.setAttribute("aria-label", text.close);
      close.title = text.close;
      const closeIcon = document.createElement("ha-icon");
      closeIcon.setAttribute("icon", "mdi:close");
      close.appendChild(closeIcon);
      // 1.5.7: bei einer Webseite ein Knopf "In neuem Tab oeffnen" - falls die
      // Seite sich nicht einbetten laesst oder gross gebraucht wird.
      if (isWeb && isExternalUrl(entry.url)) {
        const outside = document.createElement("a");
        outside.className = "x ext";
        outside.href = entry.url;
        outside.target = "_blank";
        outside.rel = "noopener noreferrer";
        outside.setAttribute("aria-label", text.openTab);
        outside.title = text.openTab;
        const outsideIcon = document.createElement("ha-icon");
        outsideIcon.setAttribute("icon", EXTERNAL_ICON);
        outside.appendChild(outsideIcon);
        head.append(badge, title, outside, close);
      } else {
        head.append(badge, title, close);
      }
      card.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "grid";
      grid.style.setProperty("--c", String(popupColumns(links.length, 4)));
      grid.style.setProperty("--cm", String(popupColumns(links.length, 2)));
      links.forEach((link) => {
        const tile = document.createElement("a");
        tile.className = "tile";
        tile.href = link.path;
        tile.dataset.path = link.path;
        const external = isExternalUrl(link.path);
        if (external) {
          tile.target = "_blank";
          tile.rel = "noopener noreferrer";
        }
        const circle = document.createElement("span");
        circle.className = "ti";
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", link.icon || (external ? EXTERNAL_ICON : "mdi:link-variant"));
        circle.appendChild(icon);
        const label = document.createElement("span");
        label.className = "tn";
        label.textContent = link.name || (external ? externalHost(link.path) : link.path);
        tile.append(circle, label);
        tile.addEventListener("click", (event) => {
          event.preventDefault();
          this.closePopup();
          this.openLink(link.path, event.ctrlKey || event.metaKey || event.shiftKey);
        });
        tile.addEventListener("auxclick", (event) => {
          if (event.button === 1) {
            event.preventDefault();
            this.openLink(link.path, true);
          }
        });
        grid.appendChild(tile);
      });
      if (!links.length) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = text.empty;
        grid.appendChild(empty);
      }
      let cardBox = null;
      if (isWeb) {
        // Eine Webseite statt der Links (1.5.7). Der Rahmen darf Skripte und
        // Formulare nutzen und Links in neuen Tabs oeffnen, aber nie die Seite
        // von Home Assistant umleiten (kein allow-top-navigation).
        const box = document.createElement("div");
        box.className = "cardbox webbox";
        if (isExternalUrl(entry.url)) {
          const frame = document.createElement("iframe");
          frame.src = entry.url;
          frame.title = name;
          frame.setAttribute("referrerpolicy", "no-referrer");
          frame.setAttribute("allow", "fullscreen");
          frame.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          );
          box.appendChild(frame);
        } else {
          const empty = document.createElement("p");
          empty.className = "empty";
          empty.textContent = text.noUrl;
          box.appendChild(empty);
        }
        card.appendChild(box);
        const note = document.createElement("p");
        note.className = "webnote";
        note.textContent = text.webNote;
        card.appendChild(note);
      } else if (isCard) {
        // Eine Lovelace-Karte statt der Links (1.5.3)
        cardBox = document.createElement("div");
        cardBox.className = "cardbox";
        card.appendChild(cardBox);
      } else {
        card.appendChild(grid);
      }
      shadow.appendChild(card);
      scrim.addEventListener("click", () => this.closePopup());
      close.addEventListener("click", () => this.closePopup());
      this.popupKeyHandler = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.closePopup();
        }
      };
      this.popupRouteHandler = () => this.closePopup();
      document.addEventListener("keydown", this.popupKeyHandler, true);
      window.addEventListener("location-changed", this.popupRouteHandler);
      window.addEventListener("popstate", this.popupRouteHandler);
      // In home-assistant einhaengen (1.5.3): so erreichen die Ereignisse der
      // Karten (Mehr-Info-Dialog, Aktionen) Home Assistant. Ohne Shadow Root
      // (sehr alte Fassungen, Tests) am <body>.
      const mount = (this.root && this.root.shadowRoot) || document.body;
      mount.appendChild(host);
      // Oeffnet eine Karte den Mehr-Info-Dialog, macht das Fenster Platz.
      host.addEventListener("hass-more-info", () => window.setTimeout(() => this.closePopup(), 0));
      this.popupHost = host;
      this.popupKey = key;
      this.log("popup", key, isWeb ? `web ${entry.url}` : isCard ? `card ${entry.card && entry.card.type}` : links.length);
      if (isWeb) {
        window.requestAnimationFrame(() => close.focus({ preventScroll: true }));
        return;
      }
      if (isCard) {
        this.renderPopupCard(cardBox, entry.card, key);
        window.requestAnimationFrame(() => close.focus({ preventScroll: true }));
        return;
      }
      const first = grid.querySelector(".tile") || close;
      window.requestAnimationFrame(() => first.focus({ preventScroll: true }));
    }

    /**
     * Die Karte eines PopUps (1.5.3) - gebaut von Home Assistant selbst
     * (loadCardHelpers().createCardElement), wie im Dashboard. Custom Cards
     * brauchen ihre Dateien; ist eine noch nicht geladen (z. B. auf einer
     * Einstellungsseite), werden die Ressourcen der Dashboards nachgeladen.
     * Solange das Fenster offen ist, bekommt die Karte den aktuellen hass.
     */
    async renderPopupCard(box, config, key) {
      const text = popupText(this.root && this.root.hass);
      const show = (message) => {
        const note = document.createElement("p");
        note.className = "empty";
        note.textContent = message;
        box.replaceChildren(note);
      };
      if (!isObject(config) || typeof config.type !== "string") {
        show(text.noCard);
        return;
      }
      try {
        const tags = [];
        const walk = (node) => {
          if (Array.isArray(node)) {
            node.forEach(walk);
          } else if (isObject(node)) {
            if (typeof node.type === "string" && node.type.indexOf("custom:") === 0) {
              tags.push(node.type.slice(7));
            }
            Object.keys(node).forEach((one) => walk(node[one]));
          }
        };
        walk(config);
        const missing = tags.filter((tag) => !customElements.get(tag));
        if (missing.length) {
          await this.loadLovelaceResources();
          await Promise.race([
            Promise.all(missing.map((tag) => customElements.whenDefined(tag))),
            new Promise((resolve) => window.setTimeout(resolve, 4000)),
          ]);
        }
        if (typeof window.loadCardHelpers !== "function") {
          throw new Error("loadCardHelpers");
        }
        const helpers = await window.loadCardHelpers();
        if (this.popupKey !== key || !box.isConnected) {
          return;
        }
        const host = box.getRootNode().host;
        const build = () => {
          const element = helpers.createCardElement(config);
          element.hass = this.root && this.root.hass;
          if (host && host.hasAttribute("data-height")) {
            fillHeight(element);
          }
          return element;
        };
        box.replaceChildren(build());
        // Eine Custom Card, die erst spaeter fertig wird, meldet sich so
        box.addEventListener("ll-rebuild", (event) => {
          event.stopPropagation();
          box.replaceChildren(build());
        });
        window.clearInterval(this.popupHassTimer);
        this.popupHassTimer = window.setInterval(() => {
          const element = box.firstElementChild;
          const hass = this.root && this.root.hass;
          if (!box.isConnected) {
            window.clearInterval(this.popupHassTimer);
            return;
          }
          if (element && hass && element.hass !== hass) {
            element.hass = hass;
          }
        }, 500);
      } catch (err) {
        console.error(TAG, "popup card failed", err);
        show(text.cardError);
      }
    }

    /**
     * Die Ressourcen der Dashboards (Custom Cards) laden - einmal je Seite,
     * so wie Home Assistant es beim Oeffnen eines Dashboards tut. Was schon
     * geladen ist, laedt der Browser nicht noch einmal.
     */
    loadLovelaceResources() {
      if (!this.resourcesLoading) {
        const hass = this.root && this.root.hass;
        this.resourcesLoading = (async () => {
          const list = await hass.connection.sendMessagePromise({ type: "lovelace/resources" });
          await Promise.all((Array.isArray(list) ? list : []).map((one) => {
            const url = one && typeof one.url === "string" ? one.url : "";
            if (!url) {
              return null;
            }
            if (one.type === "css") {
              if (!document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(url)}"]`)) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                document.head.appendChild(link);
              }
              return null;
            }
            if (one.type === "js") {
              if (!document.querySelector(`script[src="${CSS.escape(url)}"]`)) {
                const script = document.createElement("script");
                script.src = url;
                document.head.appendChild(script);
              }
              return null;
            }
            return import(/* webpackIgnore: true */ url).catch((err) => console.warn(TAG, "resource", url, err));
          }));
        })().catch((err) => {
          console.warn(TAG, "could not load the dashboard resources", err);
          this.resourcesLoading = null;
        });
      }
      return this.resourcesLoading;
    }

    closePopup() {
      window.clearInterval(this.popupHassTimer);
      this.popupHassTimer = null;
      if (this.popupHost) {
        this.popupHost.remove();
      }
      if (this.popupKeyHandler) {
        document.removeEventListener("keydown", this.popupKeyHandler, true);
      }
      if (this.popupRouteHandler) {
        window.removeEventListener("location-changed", this.popupRouteHandler);
        window.removeEventListener("popstate", this.popupRouteHandler);
      }
      this.popupHost = null;
      this.popupKey = null;
      this.popupKeyHandler = null;
      this.popupRouteHandler = null;
    }

    /** Den Link hervorheben, auf dessen Seite man gerade ist. */
    markLinks() {
      const root = this.sidebar && this.sidebar.shadowRoot;
      if (!root) {
        return;
      }
      const here = window.location.pathname;
      root.querySelectorAll("[data-sh-link]").forEach((node) => {
        const path = node.hasAttribute("data-sh-external") ? "" : String(node.dataset.shLink || "").split(/[?#]/)[0];
        const on = !!path && (here === path || here.indexOf(`${path}/`) === 0);
        if (node.classList.contains("selected") !== on) {
          node.classList.toggle("selected", on);
        }
      });
    }

    /**
     * Nachfragen, dann neu starten (1.5.6: eigener Dialog statt des
     * Browser-Fensters). Ein Neustart wirft jeden im Haus aus der
     * Oberflaeche - das darf kein unabsichtlicher Klick ausloesen. Beim
     * Oeffnen prueft Home Assistant die Konfiguration (wie "Konfiguration
     * pruefen"); ist sie ungueltig, bleibt "Neu starten" gesperrt - Home
     * Assistant selbst wuerde den Neustart dann ohnehin ablehnen.
     */
    restart() {
      const hass = this.root && this.root.hass;
      if (!hass || typeof hass.callService !== "function") {
        return;
      }
      this.closePopup();
      const text = restartText(hass);
      const own = (this.config.items && this.config.items[RESTART_KEY]) || {};
      const host = document.createElement("div");
      host.className = "sh-popup-host sh-restart-host";
      host.style.setProperty("--sh-w", "540px");
      const accent = value(own.icon_color);
      if (accent) {
        host.style.setProperty("--sh-pc", accent);
      }
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `${POPUP_CSS}\n${RESTART_CSS}`;
      shadow.appendChild(style);
      const scrim = document.createElement("div");
      scrim.className = "scrim";
      shadow.appendChild(scrim);
      const el = (tag, cls, txt) => {
        const node = document.createElement(tag);
        if (cls) {
          node.className = cls;
        }
        if (txt !== undefined) {
          node.textContent = txt;
        }
        return node;
      };
      const icon = (name) => {
        const node = document.createElement("ha-icon");
        node.setAttribute("icon", name);
        return node;
      };
      const card = el("div", "card");
      card.setAttribute("role", "alertdialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-label", text.title);
      const head = el("div", "head");
      const badge = el("span", "ic");
      badge.appendChild(icon(ICON_NAME.test(value(own.icon)) ? value(own.icon) : "mdi:restart"));
      const title = el("h2", "", text.title);
      const close = el("button", "x");
      close.type = "button";
      close.title = text.close;
      close.setAttribute("aria-label", text.close);
      close.appendChild(icon("mdi:close"));
      head.append(badge, title, close);
      const info = el("div", "info");
      const what = el("b");
      what.append(icon("mdi:information-outline"), document.createTextNode(text.what));
      const list = el("ul");
      text.info.forEach((line) => list.appendChild(el("li", "", line)));
      info.append(what, list);
      const state = el("div", "state");
      state.setAttribute("role", "status");
      state.setAttribute("aria-live", "polite");
      const errLog = el("pre", "log");
      const warnHead = el("div", "sub", text.warnings);
      const warnLog = el("pre", "log");
      const foot = el("div", "foot");
      const cancel = el("button", "btn", text.cancel);
      cancel.type = "button";
      const again = el("button", "btn");
      again.type = "button";
      again.append(icon("mdi:refresh"), document.createTextNode(text.again));
      const go = el("button", "btn go");
      go.type = "button";
      go.append(icon("mdi:restart"), document.createTextNode(text.restart));
      foot.append(again, cancel, go);
      card.append(head, info, state, errLog, warnHead, warnLog, foot);
      shadow.appendChild(card);

      const show = (kind, message, errors, warnings) => {
        state.dataset.s = kind;
        state.replaceChildren();
        if (kind === "checking" || kind === "restarting") {
          state.appendChild(el("span", "spin"));
        } else {
          state.appendChild(icon(kind === "valid" ? "mdi:check-circle" : kind === "invalid" ? "mdi:alert-circle" : "mdi:alert"));
        }
        state.appendChild(el("span", "", message));
        errLog.textContent = errors || "";
        errLog.hidden = !errors;
        warnLog.textContent = warnings || "";
        warnLog.hidden = !warnings;
        warnHead.hidden = !warnings;
        go.disabled = kind === "checking" || kind === "invalid" || kind === "restarting";
        again.hidden = !(kind === "invalid" || kind === "failed");
        cancel.disabled = kind === "restarting";
      };
      // Fehlertext aus dem, was Home Assistant liefert: callApi wirft
      // { status_code, body, error }, ein Dienst { code, message }.
      const message = (err) => {
        if (typeof err === "string") {
          return err.trim();
        }
        if (!err || typeof err !== "object") {
          return "";
        }
        const body = err.body;
        const found = [body && typeof body === "object" ? body.message : body, err.message, err.error]
          .find((one) => typeof one === "string" && one.trim());
        if (!found) {
          return "";
        }
        return err.status_code ? `${err.status_code}: ${found.trim()}` : found.trim();
      };

      // Pruefung wie in den Entwicklerwerkzeugen (POST /api/config/core/check_config)
      let token = 0;
      const check = async () => {
        token += 1;
        const mine = token;
        show("checking", text.checking);
        try {
          if (typeof hass.callApi !== "function") {
            throw new Error("callApi");
          }
          const result = (await hass.callApi("POST", "config/core/check_config")) || {};
          if (mine !== token || this.popupHost !== host) {
            return;
          }
          const errors = typeof result.errors === "string" ? result.errors.trim() : "";
          const warnings = typeof result.warnings === "string" ? result.warnings.trim() : "";
          if (result.result === "valid") {
            show("valid", text.valid, "", warnings);
          } else if (result.result === "invalid") {
            show("invalid", text.invalid, errors, warnings);
          } else {
            show("failed", text.failed, errors, warnings);
          }
        } catch (err) {
          if (mine !== token || this.popupHost !== host) {
            return;
          }
          console.warn(TAG, "configuration check failed", err);
          show("failed", text.failed, message(err));
        }
      };

      go.addEventListener("click", async () => {
        if (go.disabled) {
          return;
        }
        token += 1;
        show("restarting", text.restarting);
        this.log("restarting Home Assistant");
        try {
          await hass.callService("homeassistant", "restart");
        } catch (err) {
          // Code 3 = Verbindung verloren: der Neustart laeuft schon.
          if (err && err.code !== 3 && this.popupHost === host) {
            console.error(TAG, "restart failed", err);
            show("failed", text.restartFailed, message(err));
            again.hidden = true;
            return;
          }
        }
        if (this.popupHost === host) {
          this.closePopup();
        }
      });
      again.addEventListener("click", () => check());
      cancel.addEventListener("click", () => this.closePopup());
      close.addEventListener("click", () => this.closePopup());
      scrim.addEventListener("click", () => {
        if (state.dataset.s !== "restarting") {
          this.closePopup();
        }
      });
      this.popupKeyHandler = (event) => {
        if (event.key === "Escape" && state.dataset.s !== "restarting") {
          event.preventDefault();
          this.closePopup();
        }
      };
      this.popupRouteHandler = () => this.closePopup();
      document.addEventListener("keydown", this.popupKeyHandler, true);
      window.addEventListener("location-changed", this.popupRouteHandler);
      window.addEventListener("popstate", this.popupRouteHandler);
      const mount = (this.root && this.root.shadowRoot) || document.body;
      mount.appendChild(host);
      // popupKey bleibt leer: der Abgleich der PopUp-Eintraege schliesst
      // diesen Dialog so nicht.
      this.popupHost = host;
      this.popupKey = null;
      this.log("restart dialog");
      window.requestAnimationFrame(() => cancel.focus({ preventScroll: true }));
      check();
    }

    /**
     * Den Shadow Root der Dashboard-Kopfzeile suchen.
     *
     * Weg dorthin: <home-assistant-main> -> (Schattenwurzel) das gerade
     * angezeigte Panel <ha-panel-lovelace> -> (dessen Schattenwurzel)
     * <hui-root>. Steht gerade kein Dashboard offen - etwa die
     * Einstellungen oder der Verlauf -, gibt es nichts zu tun.
     */
    huiRoot() {
      if (!this.main || !this.main.shadowRoot) {
        return null;
      }
      const panel = this.main.shadowRoot.querySelector("ha-panel-lovelace");
      if (!panel || !panel.shadowRoot) {
        return null;
      }
      const hui = panel.shadowRoot.querySelector("hui-root");
      return hui && hui.shadowRoot ? hui.shadowRoot : null;
    }

    /**
     * Jedem der vier Knoepfe rechts ansehen, welcher er ist, und das als
     * data-sh-action hinterlegen - damit kann das CSS ihn ansprechen.
     *
     * Markiert wird nicht der Knopf selbst, sondern das Element, das direkt
     * in .action-items haengt: der Knopf steckt je nach Version in einer
     * Huelle (Kurzhinweis, Auswahlmenue), und die wuerde sonst als leere
     * Luecke stehen bleiben.
     *
     * Die Methode aendert nur, was abweicht - der Beobachter darueber sieht
     * sonst jede eigene Aenderung wieder.
     */
    tagHeaderActions(root) {
      const box = root.querySelector(".action-items");
      if (!box) {
        return;
      }
      const seen = new Set();
      box.querySelectorAll("ha-icon-button").forEach((button) => {
        const path = typeof button.path === "string" ? button.path : "";
        if (!path) {
          return;
        }
        const name = Object.keys(HEADER_ACTIONS).find(
          (one) => HEADER_ACTIONS[one] === path
        );
        if (!name) {
          return;
        }
        let node = button;
        while (node.parentElement && node.parentElement !== box) {
          node = node.parentElement;
        }
        seen.add(node);
        if (node.dataset.shAction !== name) {
          node.dataset.shAction = name;
        }
      });
      // A wrapper Home Assistant reuses for another button must not keep the
      // old mark - it would be hidden as the button it used to be.
      box.querySelectorAll("[data-sh-action]").forEach((node) => {
        if (!seen.has(node)) {
          node.removeAttribute("data-sh-action");
        }
      });
    }

    /* ------------------------------ Einstellungen und Geraete & Dienste */

    /**
     * Zwei Stellen von Home Assistant, die tief in verschachtelten Shadow Roots
     * stecken und erst nach einem Routenwechsel entstehen:
     *
     * - die Symbole der Einstellungsseite (.icon-background),
     * - die Integrationskarten auf "Geraete & Dienste" (ha-integration-card).
     *
     * Beide werden ab <home-assistant> gesucht; in jedem Root, in dem etwas
     * vorkommt, haengt ein Stylesheet. Andere Seiten und Karten bleiben
     * unberuehrt. Nach jedem Wechsel wird ein paar Sekunden lang nachgefasst,
     * und ein Beobachter meldet sich, wenn Karten nachgeladen werden.
     */
    settingsWanted() {
      const cfg = this.config.settings || DEFAULT_SETTINGS;
      const enabled = this.config.advanced.enabled !== false;
      // Das CSS wird nur neu gebaut, wenn sich die Konfiguration geaendert
      // hat: seit die Elemente sich beim Zeichnen selbst melden (siehe
      // hookElement), wird hier sehr oft gefragt.
      const last = this.wantBuilt;
      if (!last || last.cfg !== cfg || last.enabled !== enabled) {
        this.wantBuilt = {
          cfg,
          enabled,
          icon: enabled ? buildIconCss(cfg) : "",
          list: enabled ? buildIntegrationListCss(cfg) : null,
          menu: enabled ? buildMenuCss(cfg) : "",
          table: enabled ? buildTableCss(cfg) : "",
          dash: enabled ? buildDashboardCss(cfg) : "",
          layout: enabled ? buildMenuLayoutCss(cfg) : "",
          sysPage: enabled ? buildSystemPageCss(cfg) : "",
          sysLayout: enabled ? buildMenuLayoutCss(cfg, true) : "",
          profile: enabled && cfg.profile_page === true,
          profilePage: enabled && cfg.profile_page === true ? buildProfilePageCss(cfg) : "",
          monitorSensors: cleanSensors(cfg.monitor_sensors),
          backupButton: cfg.monitor_backup_button === true,
          sensorsOnly: cfg.monitor_sensors_only === true,
          favorites: enabled ? cfg.favorites : [],
          favoritesPlace: cfg.favorites_place === "header" ? "header" : "page",
          monitor: enabled && cfg.monitor === true,
          monitorPlace: cfg.monitor_place === "end" ? "end" : "top",
          monitorGraphs: cfg.monitor_graphs === true,
          backup: enabled && cfg.monitor_backup === true,
          backupPlace: cfg.monitor_backup_place === "end" ? "end" : "top",
          counts: enabled && cfg.monitor_counts === true && cleanCountItems(cfg.monitor_counts_items).length > 0,
          countsPlace: cfg.monitor_counts_place === "end" ? "end" : "top",
          countsItems: cleanCountItems(cfg.monitor_counts_items),
        };
      }
      const built = this.wantBuilt;
      return {
        icon: built.icon,
        list: built.list,
        menu: built.menu,
        table: built.table,
        dash: built.dash,
        layout: built.layout,
        sysPage: built.sysPage,
        sysLayout: built.sysLayout,
        profile: built.profile,
        profilePage: built.profilePage,
        monitorSensors: built.monitorSensors,
        backupButton: built.backupButton,
        sensorsOnly: built.sensorsOnly,
        favorites: built.favorites,
        favoritesPlace: built.favoritesPlace,
        monitor: built.monitor,
        monitorPlace: built.monitorPlace,
        monitorGraphs: built.monitorGraphs,
        backup: built.backup,
        backupPlace: built.backupPlace,
        counts: built.counts,
        countsPlace: built.countsPlace,
        countsItems: built.countsItems,
        // Ist ueberhaupt etwas zu tun?
        any: !!(
          built.icon ||
          built.list ||
          built.menu ||
          built.table ||
          built.dash ||
          built.layout ||
          built.sysPage ||
          built.sysLayout ||
          built.favorites.length ||
          built.monitor ||
          built.backup ||
          built.counts
        ),
        // Seit 1.4.8 auch die Profilseite
        inConfig: /^\/(config|profile)(\/|$)/.test(window.location.pathname),
      };
    }

    /** Nachfassen, wenn sich Einstellung oder Seite geaendert haben. */
    checkSettingsPage(force) {
      const want = this.settingsWanted();
      const key = `${want.icon}|${want.menu}|${want.table}|${want.dash}|${want.layout}|${want.sysPage}|${want.sysLayout}|${JSON.stringify(want.favorites)}|${want.favoritesPlace}|${want.monitor}|${want.monitorPlace}|${want.monitorGraphs}|${want.backup}|${want.backupPlace}|${want.counts}|${want.countsPlace}|${want.countsItems.join(",")}|${want.profile}|${JSON.stringify(want.monitorSensors)}|${want.backupButton}|${want.sensorsOnly}|${want.list ? JSON.stringify(want.list) : ""}|${window.location.pathname}|${this.config.advanced.debug === true}`;
      if (!force && key === this.pageKey) {
        return;
      }
      this.pageKey = key;
      this.scheduleSettingsPage();
    }

    scheduleSettingsPage(tries) {
      window.clearTimeout(this.pageTimer);
      const left = typeof tries === "number" ? tries : 30;
      this.pagePolling = false;
      this.applySettingsPage();
      const want = this.settingsWanted();
      if (left <= 0 || !want.inConfig || !want.any) {
        return;
      }
      this.pagePolling = true;
      this.pageTimer = window.setTimeout(
        () => this.scheduleSettingsPage(left - 1),
        left > 15 ? 150 : 500
      );
    }

    /** Leere Fundliste - ein Eintrag je Art von Shadow Root. */
    emptySettingsRoots() {
      return {
        icons: [],
        menus: [],
        containers: [],
        cards: [],
        headers: [],
        footers: [],
        tables: [],
        appPages: [],
        appCards: [],
        dashPages: [],
        dashMenus: [],
        systemPages: [],
        systemMenus: [],
        profilePages: [],
        profileMenus: [],
        entryPages: [],
        entryRows: [],
        entryItems: [],
      };
    }

    /** Gehoert diese Menueliste zur Einstellungsseite selbst? */
    isDashboardMenu(root) {
      const navigation = root && root.host && root.host.getRootNode();
      const page = navigation && navigation.host && navigation.host.getRootNode();
      return !!(page && page.host && page.host.localName === DASH_PAGE);
    }

    /**
     * Gehoert diese Menueliste zur Unterseite "System"? Dort steckt sie ohne
     * ha-config-navigation dazwischen direkt in der Seite.
     */
    isProfileMenu(root) {
      const page = root && root.host && root.host.getRootNode();
      return !!(page && page.host && page.host.localName === PROFILE_PAGE);
    }

    isSystemMenu(root) {
      const page = root && root.host && root.host.getRootNode();
      return !!(page && page.host && page.host.localName === SYSTEM_PAGE);
    }

    /**
     * Jedem Menuepunkt seinen Pfad als data-sh-menu mitgeben - daran haengen
     * Reihenfolge und Ausblenden. Nebenbei wird festgehalten, welche Punkte
     * es gibt (siehe MENU_SEEN_KEY). Aendert nur, was abweicht.
     */
    tagMenuItems(root) {
      const seen = [];
      root.querySelectorAll("ha-list-item-button").forEach((item) => {
        let path = typeof item.href === "string" ? item.href : item.getAttribute("href") || "";
        if (/^https?:\/\//i.test(path)) {
          try {
            path = new URL(path).pathname;
          } catch (err) {
            path = "";
          }
        }
        if (!LINK_PATH.test(path) || path === "/") {
          if (item.hasAttribute("data-sh-menu")) {
            item.removeAttribute("data-sh-menu");
          }
          return;
        }
        if (item.dataset.shMenu !== path) {
          item.dataset.shMenu = path;
        }
        const headline = item.querySelector('[slot="headline"]');
        const own = this.config.advanced.enabled !== false ? (this.config.settings.menu_items || {})[path] : null;
        const original = this.renameMenuItem(headline, own && own.name);
        this.applyMenuIcon(item, own && own.icon);
        // Den Untertitel merkt sich das Panel fuer seine Vorschau (1.4.9).
        const support = item.querySelector('[slot="supporting-text"]');
        const sub = support ? String(support.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120) : "";
        seen.push(sub ? { path, name: original.slice(0, 60), sub } : { path, name: original.slice(0, 60) });
      });
      // Die Karte, in der die Liste steckt: <ha-card> um <ha-config-navigation>.
      const navigation = root.host.getRootNode().host;
      const card = navigation && navigation.parentElement;
      const page = navigation && navigation.getRootNode();
      if (card && page) {
        const cards = Array.from(page.querySelectorAll("ha-card")).filter((one) =>
          one.querySelector("ha-config-navigation")
        );
        this.rememberMenu(cards.indexOf(card), seen);
        const hidden = this.config.settings.menu_hidden || [];
        const empty =
          this.config.advanced.enabled !== false &&
          seen.length > 0 &&
          seen.every((one) => hidden.indexOf(one.path) >= 0);
        if (card.hasAttribute("data-sh-empty") !== empty) {
          card.toggleAttribute("data-sh-empty", empty);
        }
      }
    }

    /**
     * Ein Menuepunkt bekommt ein eigenes Icon (1.5.5): ein <ha-icon> neben
     * dem Symbol von Home Assistant, das dann ausgeblendet wird (CSS ueber
     * data-sh-own-icon). Lit zeichnet das Symbol weiter - es bleibt nur
     * unsichtbar, und ohne eigenes Icon ist alles wie vorher.
     */
    applyMenuIcon(item, icon) {
      const box = Array.from(item.children).find((one) => one.getAttribute("slot") === "start");
      if (!box) {
        return;
      }
      let own = Array.from(box.children).find((one) => one.hasAttribute("data-sh-menu-icon"));
      const wanted = typeof icon === "string" && ICON_NAME.test(icon) ? icon : "";
      if (!wanted) {
        if (own) {
          own.remove();
        }
        if (box.hasAttribute("data-sh-own-icon")) {
          box.removeAttribute("data-sh-own-icon");
        }
        return;
      }
      if (!own) {
        own = document.createElement("ha-icon");
        own.setAttribute("data-sh-menu-icon", "");
        box.appendChild(own);
      }
      if (own.getAttribute("icon") !== wanted) {
        own.setAttribute("icon", wanted);
      }
      if (!box.hasAttribute("data-sh-own-icon")) {
        box.setAttribute("data-sh-own-icon", "");
      }
    }

    /**
     * Ein Menuepunkt bekommt einen eigenen Namen (1.4.8). Geaendert wird nur
     * der Inhalt des Textknotens, den Lit dort gesetzt hat - so bleiben die
     * Marker von Lit unangetastet. Setzt Home Assistant den Text neu (z. B.
     * andere Sprache), merkt sich die Funktion den neuen Originaltext.
     * Rueckgabe: der Originalname (fuer das Panel).
     */
    renameMenuItem(headline, wanted) {
      if (!headline) {
        return "";
      }
      const node = Array.from(headline.childNodes).find((one) => one.nodeType === 3 && one.data.trim());
      const shown = node ? node.data : headline.textContent || "";
      let original = headline.dataset.shOrig;
      if (original === undefined || (shown.trim() !== original.trim() && shown !== headline.dataset.shName)) {
        original = shown;
      }
      const name = String(wanted || "").trim();
      if (name && node) {
        headline.dataset.shOrig = original;
        headline.dataset.shName = name;
        if (node.data !== name) {
          node.data = name;
        }
      } else if (headline.dataset.shOrig !== undefined) {
        if (node && node.data !== original) {
          node.data = original;
        }
        delete headline.dataset.shOrig;
        delete headline.dataset.shName;
      }
      return original.trim();
    }

    /** Die Menuepunkte eines Blocks fuer das Panel merken (pro Browser). */
    rememberMenu(group, entries) {
      if (group < 0 || !entries.length) {
        return;
      }
      if (!this.menuSeen) {
        this.menuSeen = {};
      }
      const text = JSON.stringify(entries);
      if (this.menuSeen[group] === text) {
        return;
      }
      this.menuSeen[group] = text;
      try {
        const groups = Object.keys(this.menuSeen)
          .map(Number)
          .sort((a, b) => a - b)
          .map((index) => JSON.parse(this.menuSeen[index]));
        window.localStorage.setItem(MENU_SEEN_KEY, JSON.stringify(groups));
      } catch (err) {
        /* privates Fenster, voller Speicher - dann zeigt das Panel seine Vorgabe */
      }
    }

    /**
     * Die Favoriten-Leiste der Einstellungsseite.
     *
     * - "page": als Kind von <ha-config-section> im Platz "header" - der
     *   steht ueber den Karten, egal an welcher Stelle im DOM das Element
     *   haengt (am Ende, hinter den Markern von Lit).
     * - "header": als Kind von <ha-top-app-bar-fixed> im Platz "title",
     *   per CSS mittig in der Kopfleiste. Dazu eine zweite Leiste ueber den
     *   Karten, die nur in einem schmalen Fenster zu sehen ist.
     */
    applyFavorites(root, links, place) {
      const section = root.querySelector("ha-config-section");
      const bar = root.querySelector("ha-top-app-bar-fixed");
      const wanted = section ? links.filter((link) => LINK_PATH.test(link.path)) : [];
      const inHeader = place === "header" && !!bar;
      const spots = wanted.length
        ? inHeader
          ? [
              { parent: bar, slot: "title", place: "header" },
              { parent: section, slot: "header", place: "page", fallback: true },
            ]
          : [{ parent: section, slot: "header", place: "page" }]
        : [];
      const existing = Array.from(root.querySelectorAll(".sh-favorites"));
      const keep = new Set();
      spots.forEach((spot) => {
        let node = existing.find(
          (one) =>
            !keep.has(one) &&
            one.parentElement === spot.parent &&
            one.dataset.place === spot.place
        );
        if (!node) {
          node = document.createElement("div");
          node.className = "sh-favorites";
          node.setAttribute("role", "navigation");
          node.dataset.place = spot.place;
          spot.parent.appendChild(node);
        }
        if (node.getAttribute("slot") !== spot.slot) {
          node.setAttribute("slot", spot.slot);
        }
        node.toggleAttribute("data-fallback", !!spot.fallback);
        keep.add(node);
        this.fillFavorites(node, wanted);
      });
      existing.forEach((one) => {
        if (!keep.has(one)) {
          one.remove();
        }
      });
    }

    /** Die Knoepfe einer Favoriten-Leiste - nur neu, wenn sich etwas geaendert hat. */
    fillFavorites(bar, wanted) {
      const signature = JSON.stringify(wanted);
      if (bar.dataset.shSignature === signature) {
        return;
      }
      bar.dataset.shSignature = signature;
      bar.textContent = "";
      // Spalten fuer schmale Bildschirme (1.4.7): bis drei Knoepfe eine Reihe,
      // sonst lieber zwei gleich volle Reihen, hoechstens vier Spalten.
      const count = wanted.length;
      bar.style.setProperty("--sh-fav-cols", String(count <= 3 ? Math.max(count, 1) : Math.min(Math.ceil(count / 2), 4)));
      wanted.forEach((link) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.shPath = link.path;
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", link.icon || "mdi:link-variant");
        const text = link.name || link.path;
        if (link.icon_only === true) {
          // Nur das Icon - der Name bleibt als Tooltip und fuer Screenreader.
          button.dataset.iconOnly = "";
          button.title = text;
          button.setAttribute("aria-label", text);
          button.append(icon);
        } else {
          const label = document.createElement("span");
          label.textContent = text;
          button.append(icon, label);
        }
        const look = favoriteStyle(link);
        Object.keys(look).forEach((name) => button.style.setProperty(name, look[name]));
        button.addEventListener("click", (event) => {
          event.preventDefault();
          this.openLink(link.path, event.ctrlKey || event.metaKey || event.shiftKey);
        });
        button.addEventListener("auxclick", (event) => {
          if (event.button === 1) {
            event.preventDefault();
            this.openLink(link.path, true);
          }
        });
        bar.appendChild(button);
      });
    }

    /* ------------------------------------------------- Systemmonitor */

    /**
     * Der Systemmonitor der Einstellungsseite: "top" als erstes Element der
     * Seite (unter einer Favoriten-Leiste ueber den Karten), "end" unter den
     * Menuepunkten, vor dem Tipp von Home Assistant.
     */
    applyMonitor(root, want) {
      const section = root.querySelector("ha-config-section");
      let node = root.querySelector(".sh-monitor");
      if (!want.monitor || !section) {
        if (node) {
          node.remove();
        }
        this.syncMonitorUse();
        return;
      }
      if (!node) {
        node = this.buildMonitor();
      }
      if (want.monitorPlace === "end") {
        const tip = Array.from(section.children).find((one) => one.localName === "ha-tip");
        if (tip) {
          if (node.nextElementSibling !== tip || node.parentElement !== section) {
            section.insertBefore(node, tip);
          }
        } else if (node.parentElement !== section || section.lastElementChild !== node) {
          section.appendChild(node);
        }
      } else if (node.parentElement !== section || section.firstChild !== node) {
        // Vor die Marker von Lit: so bleibt alles, was Lit dort zeichnet,
        // hinter dem Monitor.
        section.insertBefore(node, section.firstChild);
      }
      node.dataset.place = want.monitorPlace;
      node.toggleAttribute("data-graphs", want.monitorGraphs);
      this.syncSensorCells(node, want.monitorSensors || []);
      // Nur eigene Werte (1.4.9): Prozessor, Arbeitsspeicher und Speicher
      // bleiben weg - aber nur, wenn es eigene Werte gibt.
      const ownOnly = want.sensorsOnly === true && (want.monitorSensors || []).length > 0;
      if (node.hasAttribute("data-own-only") !== ownOnly) {
        node.toggleAttribute("data-own-only", ownOnly);
      }
      this.syncMonitorUse();
      this.renderMonitor(node);
      this.syncSensorTimer();
    }

    /** Die Felder fuer eigene Werte (1.4.8) hinter CPU, RAM und Speicher. */
    syncSensorCells(node, sensors) {
      const signature = JSON.stringify(sensors);
      if (node.dataset.sensors === signature) {
        return;
      }
      node.dataset.sensors = signature;
      node.querySelectorAll('.shm-cell[data-kind="sensor"]').forEach((cell) => cell.remove());
      node.toggleAttribute("data-many", sensors.length > 0);
      const grid = node.querySelector(".shm-grid");
      sensors.forEach((sensor) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "shm-cell";
        cell.dataset.kind = "sensor";
        cell.dataset.entity = sensor.entity;
        cell.dataset.name = sensor.name || "";
        cell.innerHTML =
          '<span class="shm-label"></span>' +
          '<span class="shm-value"><span class="shm-num">–</span><span class="shm-unit"></span></span>' +
          '<span class="shm-sub"> </span>';
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          // Wie ein Klick auf eine Entitaet: der Mehr-Info-Dialog von Home Assistant
          cell.dispatchEvent(new CustomEvent("hass-more-info", {
            detail: { entityId: sensor.entity }, bubbles: true, composed: true,
          }));
        });
        grid.appendChild(cell);
      });
    }

    /** Eigene Werte alle 5 Sekunden nachziehen - auch ohne Hardware-Werte. */
    syncSensorTimer() {
      const wanted = this.monitorNodes().some((node) => node.querySelector('.shm-cell[data-kind="sensor"]'));
      if (wanted && !this.sensorTimer) {
        this.sensorTimer = window.setInterval(() => {
          const nodes = this.monitorNodes();
          if (!nodes.length) {
            window.clearInterval(this.sensorTimer);
            this.sensorTimer = null;
            return;
          }
          nodes.forEach((node) => this.renderSensors(node));
        }, 5000);
      } else if (!wanted && this.sensorTimer) {
        window.clearInterval(this.sensorTimer);
        this.sensorTimer = null;
      }
    }

    /** Wert, Einheit und "vor ..." eines eigenen Werts aus hass.states. */
    renderSensors(node) {
      const hass = this.root && this.root.hass;
      const text = systemText(hass);
      const fmt = numberFormat(hass);
      node.querySelectorAll('.shm-cell[data-kind="sensor"]').forEach((cell) => {
        const state = hass && hass.states ? hass.states[cell.dataset.entity] : null;
        const attrs = (state && state.attributes) || {};
        const label = cell.dataset.name || attrs.friendly_name || cell.dataset.entity;
        const set = (selector, value) => {
          const element = cell.querySelector(selector);
          if (element && element.textContent !== value) {
            element.textContent = value;
          }
        };
        set(".shm-label", label);
        cell.title = `${label} (${cell.dataset.entity})`;
        if (!state || state.state === "unavailable" || state.state === "unknown") {
          set(".shm-num", "–");
          set(".shm-unit", "");
          set(".shm-sub", state ? text.sensorUnavailable : cell.dataset.entity);
          return;
        }
        const number = Number(state.state);
        const shown = state.state !== "" && Number.isFinite(number)
          ? (Math.abs(number) >= 100 || Number.isInteger(number) ? fmt.whole(number) : fmt.one(number))
          : String(state.state);
        set(".shm-num", shown);
        set(".shm-unit", typeof attrs.unit_of_measurement === "string" ? attrs.unit_of_measurement : "");
        const changed = Date.parse(state.last_changed || state.last_updated || "");
        set(".shm-sub", Number.isFinite(changed) ? relativeTime(hass, changed) : " ");
      });
    }

    /** Das Geruest des Monitors: drei Felder, die renderMonitor() fuellt. */
    buildMonitor() {
      const hass = this.root && this.root.hass;
      const text = systemText(hass);
      const node = document.createElement("div");
      node.className = "sh-monitor";
      node.setAttribute("role", "group");
      node.setAttribute("aria-label", text.title);
      const grid = document.createElement("div");
      grid.className = "shm-grid";
      [
        ["cpu", text.cpu, "/config/hardware"],
        ["ram", text.ram, "/config/hardware"],
        ["disk", text.disk, "/config/storage"],
      ].forEach(([kind, label, path]) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "shm-cell";
        cell.dataset.kind = kind;
        cell.title = label;
        const viz =
          kind === "disk"
            ? '<span class="shm-scale"><span class="shm-used"></span><span class="shm-total"></span></span>' +
              '<span class="shm-bar"><span class="shm-fill"></span></span>'
            : '<svg class="shm-graph" viewBox="0 0 59 100" preserveAspectRatio="none" aria-hidden="true">' +
              '<path class="shm-area" d=""></path><path class="shm-line" d=""></path></svg>';
        cell.innerHTML =
          '<span class="shm-label"></span>' +
          '<span class="shm-value"><span class="shm-num">–</span><span class="shm-unit">%</span></span>' +
          '<span class="shm-sub"> </span>' +
          `<span class="shm-viz">${viz}</span>`;
        cell.querySelector(".shm-label").textContent = label;
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          this.openLink(path, event.ctrlKey || event.metaKey || event.shiftKey);
        });
        grid.appendChild(cell);
      });
      node.appendChild(grid);
      return node;
    }

    /** Alle Monitore, die gerade auf einer Seite stehen. */
    monitorNodes() {
      const nodes = [];
      (this.dashRoots || []).forEach((root) => {
        const node = root.querySelector(".sh-monitor");
        if (node && node.isConnected) {
          nodes.push(node);
        }
      });
      return nodes;
    }

    /** Braucht gerade ein Monitor Werte? Dann laeuft das Abo, sonst nicht. */
    syncMonitorUse() {
      // Zeigt ein Monitor nur eigene Werte, braucht er die Hardware-Werte nicht.
      this.useSystem("monitor", this.monitorNodes().some((node) => !node.hasAttribute("data-own-only")));
    }

    /** Die Werte in einen Monitor schreiben. */
    renderMonitor(node) {
      this.renderSensors(node);
      const hass = this.root && this.root.hass;
      const text = systemText(hass);
      const fmt = numberFormat(hass);
      const feed = this.systemFeed();
      const last = freshPoint(feed);
      const cells = {};
      node.querySelectorAll(".shm-cell").forEach((cell) => {
        cells[cell.dataset.kind] = cell;
      });
      const set = (element, value) => {
        if (element && element.textContent !== value) {
          element.textContent = value;
        }
      };
      const level = (cell, percent, warn) => {
        const wanted =
          typeof percent !== "number" ? "" : percent >= 95 ? "crit" : percent >= warn ? "warn" : "";
        if ((cell.dataset.level || "") !== wanted) {
          if (wanted) {
            cell.dataset.level = wanted;
          } else {
            delete cell.dataset.level;
          }
        }
      };
      ["cpu", "ram"].forEach((kind) => {
        const cell = cells[kind];
        if (!cell) {
          return;
        }
        const key = kind === "cpu" ? "cpu" : "mem";
        if (!last) {
          set(cell.querySelector(".shm-num"), "–");
          set(cell.querySelector(".shm-sub"), feed.state === "unavailable" ? text.none : text.wait);
          level(cell, null);
        } else {
          const percent = last[key];
          set(cell.querySelector(".shm-num"), fmt.whole(percent));
          if (kind === "cpu") {
            const values = feed.points.map((one) => one.cpu);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            set(
              cell.querySelector(".shm-sub"),
              `${text.avg} ${fmt.whole(avg)} % · ${text.max} ${fmt.whole(Math.max(...values))} %`
            );
          } else {
            set(
              cell.querySelector(".shm-sub"),
              `${fmt.one(last.used / 1024)} ${text.of} ${fmt.one((last.used + last.free) / 1024)} GB`
            );
          }
          level(cell, percent, 80);
        }
        const [area, line] = graphPaths(feed.points.map((one) => one[key]));
        const svg = cell.querySelector(".shm-graph");
        if (svg) {
          const paths = svg.querySelectorAll("path");
          if (paths[0].getAttribute("d") !== area) {
            paths[0].setAttribute("d", area);
            paths[1].setAttribute("d", line);
          }
        }
      });
      const disk = cells.disk;
      if (disk) {
        const info = feed.disk;
        if (!info || !info.total) {
          set(disk.querySelector(".shm-num"), "–");
          set(disk.querySelector(".shm-sub"), info && info.error ? text.none : text.wait);
          set(disk.querySelector(".shm-used"), "");
          set(disk.querySelector(".shm-total"), "");
          disk.querySelector(".shm-fill").style.width = "0%";
          level(disk, null);
        } else {
          const percent = (info.used / info.total) * 100;
          set(disk.querySelector(".shm-num"), fmt.whole(percent));
          set(
            disk.querySelector(".shm-sub"),
            node.hasAttribute("data-graphs")
              ? `${fmt.one(info.free)} GB ${text.free}`
              : `${fmt.one(info.used)} ${text.of} ${fmt.one(info.total)} GB`
          );
          set(disk.querySelector(".shm-used"), `${fmt.one(info.used)} GB ${text.used}`);
          set(disk.querySelector(".shm-total"), `${fmt.one(info.total)} GB ${text.total}`);
          const width = `${clamp(percent, 0, 100).toFixed(1)}%`;
          const fill = disk.querySelector(".shm-fill");
          if (fill.style.width !== width) {
            fill.style.width = width;
          }
          level(disk, percent, 85);
        }
      }
    }

    /**
     * Die Werte von CPU und Arbeitsspeicher kommen von der Integration
     * "hardware" von Home Assistant: hardware/subscribe_system_status meldet
     * sich alle 5 Sekunden. Abonniert wird nur, solange jemand die Werte
     * braucht (Monitor, Kopfzeile); die letzten 60 Werte (5 Minuten) bleiben
     * im Tab gespeichert, damit der Verlauf nach einem Seitenwechsel nicht
     * wieder bei null anfaengt.
     */
    systemFeed() {
      if (!this.feed) {
        this.feed = { points: [], disk: null, diskAt: 0, state: "idle", users: new Set() };
        try {
          const saved = JSON.parse(window.sessionStorage.getItem(SYSTEM_STORE_KEY) || "[]");
          const since = Date.now() - SYSTEM_POINTS * 5000 - 10000;
          if (Array.isArray(saved)) {
            this.feed.points = saved
              .filter(
                (one) =>
                  one &&
                  typeof one.t === "number" &&
                  one.t > since &&
                  ["cpu", "mem", "used", "free"].every((key) => typeof one[key] === "number")
              )
              .slice(-SYSTEM_POINTS);
          }
        } catch (err) {
          /* kein Speicher im Tab - dann beginnt der Verlauf leer */
        }
      }
      return this.feed;
    }

    /** "monitor" / "header" braucht die Werte (oder nicht mehr). */
    useSystem(user, on) {
      const feed = this.systemFeed();
      if (on === feed.users.has(user)) {
        // Schon angemeldet, aber das Abo kam nicht zustande (Home Assistant
        // startete noch, Verbindung weg): hoechstens alle 30 Sekunden neu
        // versuchen.
        if (on && user !== "headerdisk" && feed.state === "unavailable" && Date.now() - (feed.failedAt || 0) > 30000) {
          this.startSystemFeed();
        }
        return;
      }
      if (on) {
        feed.users.add(user);
      } else {
        feed.users.delete(user);
      }
      window.clearTimeout(this.feedStop);
      if (feed.users.has("monitor") || feed.users.has("header")) {
        this.startSystemFeed();
      } else {
        // Kurz warten: wer zwischen zwei Seiten wechselt, braucht die Werte
        // gleich wieder.
        this.feedStop = window.setTimeout(() => this.stopSystemFeed(), 20000);
      }
      if (feed.users.has("monitor") || feed.users.has("headerdisk")) {
        this.startDiskPolling();
      } else {
        window.clearInterval(this.diskTimer);
        this.diskTimer = null;
      }
    }

    async startSystemFeed() {
      const feed = this.systemFeed();
      if (feed.unsubscribe || feed.starting) {
        return;
      }
      const hass = this.root && this.root.hass;
      const connection = hass && hass.connection;
      const components = hass && hass.config && hass.config.components;
      if (
        !connection ||
        typeof connection.subscribeMessage !== "function" ||
        (Array.isArray(components) && components.indexOf("hardware") < 0)
      ) {
        feed.state = "unavailable";
        feed.failedAt = Date.now();
        this.renderSystem();
        return;
      }
      // Was aelter als 5 Minuten ist, gehoert nicht mehr in den Verlauf.
      const since = Date.now() - SYSTEM_POINTS * 5000 - 10000;
      feed.points = feed.points.filter((one) => one.t > since);
      feed.starting = true;
      try {
        const unsubscribe = await connection.subscribeMessage(
          (message) => this.onSystemStatus(message),
          { type: "hardware/subscribe_system_status" }
        );
        feed.starting = false;
        if (!feed.users.has("monitor") && !feed.users.has("header")) {
          Promise.resolve(unsubscribe()).catch(() => {});
          return;
        }
        feed.unsubscribe = unsubscribe;
        feed.state = "live";
      } catch (err) {
        feed.starting = false;
        feed.state = "unavailable";
        feed.failedAt = Date.now();
        this.debug("settings", "system values not available", {
          error: (err && (err.message || err.code)) || String(err),
        });
        this.renderSystem();
      }
    }

    stopSystemFeed() {
      const feed = this.systemFeed();
      if (feed.users.has("monitor") || feed.users.has("header")) {
        return;
      }
      if (feed.unsubscribe) {
        try {
          // Liefert ein Promise; ist die Verbindung gerade weg, wird es abgelehnt.
          Promise.resolve(feed.unsubscribe()).catch(() => {});
        } catch (err) {
          /* Verbindung schon weg */
        }
      }
      feed.unsubscribe = null;
      feed.state = "idle";
    }

    onSystemStatus(message) {
      if (!message || typeof message.cpu_percent !== "number") {
        return;
      }
      const feed = this.systemFeed();
      feed.points.push({
        // Uhrzeit dieses Browsers - verglichen wird nur damit.
        t: Date.now(),
        cpu: clamp(number(message.cpu_percent, 0), 0, 100),
        mem: clamp(number(message.memory_used_percent, 0), 0, 100),
        used: Math.max(0, number(message.memory_used_mb, 0)),
        free: Math.max(0, number(message.memory_free_mb, 0)),
      });
      if (feed.points.length > SYSTEM_POINTS) {
        feed.points.splice(0, feed.points.length - SYSTEM_POINTS);
      }
      feed.state = "live";
      try {
        window.sessionStorage.setItem(SYSTEM_STORE_KEY, JSON.stringify(feed.points));
      } catch (err) {
        /* egal - dann eben ohne gemerkten Verlauf */
      }
      this.renderSystem();
    }

    /** Monitor und Kopfzeile nachziehen; wer nicht mehr da ist, braucht keine Werte. */
    renderSystem() {
      const monitors = this.monitorNodes();
      monitors.forEach((node) => this.renderMonitor(node));
      if (!monitors.length) {
        this.useSystem("monitor", false);
      }
      const head = this.headerRoot && this.headerRoot.querySelector(".sh-header-system");
      if (head && head.isConnected) {
        this.renderHeaderSystem(head);
      } else if (this.feed && (this.feed.users.has("header") || this.feed.users.has("headerdisk"))) {
        this.useSystem("header", false);
        this.useSystem("headerdisk", false);
      }
    }

    /**
     * Die Belegung des Speichers: mit Supervisor wie auf der Seite "System"
     * von Home Assistant (supervisor/api /host/info), sonst ueber den eigenen
     * Befehl der Integration (Datentraeger mit der Konfiguration). Jede
     * Minute neu, solange ein Monitor zu sehen ist.
     */
    startDiskPolling() {
      if (!this.diskTimer) {
        this.diskTimer = window.setInterval(() => this.fetchDisk(), 60000);
      }
      if (Date.now() - this.systemFeed().diskAt > 55000) {
        this.fetchDisk();
      }
    }

    async fetchDisk() {
      const feed = this.systemFeed();
      const hass = this.root && this.root.hass;
      const connection = hass && hass.connection;
      if (!connection || feed.diskLoading) {
        return;
      }
      feed.diskLoading = true;
      feed.diskAt = Date.now();
      const components = (hass.config && hass.config.components) || [];
      try {
        let info;
        if (components.indexOf("hassio") >= 0) {
          const host = await connection.sendMessagePromise({
            type: "supervisor/api",
            endpoint: "/host/info",
            method: "get",
          });
          info = { total: host.disk_total, used: host.disk_used, free: host.disk_free };
        } else {
          info = await connection.sendMessagePromise({ type: "ha_style_hub/disk" });
        }
        const total = number(info && info.total, 0);
        const used = number(info && info.used, 0);
        feed.disk =
          total > 0
            ? { total, used: clamp(used, 0, total), free: Math.max(0, number(info.free, total - used)) }
            : { error: true };
      } catch (err) {
        feed.disk = { error: true };
        this.debug("settings", "disk usage not available", {
          error: (err && (err.message || err.code)) || String(err),
        });
      }
      feed.diskLoading = false;
      this.monitorNodes().forEach((node) => this.renderMonitor(node));
      const head = this.headerRoot && this.headerRoot.querySelector(".sh-header-system");
      if (head && head.isConnected) {
        this.renderHeaderSystem(head);
      }
      // Steht kein Monitor mehr auf einer Seite, braucht es auch keine Abfrage.
      this.syncMonitorUse();
    }

    /* ------------------------------------------------ Letztes Backup */

    /**
     * Die Box mit dem letzten Backup (gehoert zum Systemmonitor, steht aber
     * fuer sich). "top": oben - hinter dem Monitor, wenn der auch oben steht;
     * "end": vor dem Tipp von Home Assistant, hinter einem Monitor am Ende.
     */
    applyBackup(root, want) {
      const section = root.querySelector("ha-config-section");
      let node = root.querySelector(".sh-backup");
      if (!want.backup || !section) {
        if (node) {
          node.remove();
        }
        return;
      }
      if (!node) {
        node = this.buildBackup();
      }
      const monitor = root.querySelector(".sh-monitor");
      const besideMonitor = monitor && monitor.parentElement === section && monitor.dataset.place === want.backupPlace;
      if (want.backupPlace === "end") {
        const tip = Array.from(section.children).find((one) => one.localName === "ha-tip");
        if (tip) {
          if (node.nextElementSibling !== tip || node.parentElement !== section) {
            section.insertBefore(node, tip);
          }
        } else if (node.parentElement !== section || section.lastElementChild !== node) {
          section.appendChild(node);
        }
      } else if (besideMonitor) {
        if (monitor.nextSibling !== node) {
          section.insertBefore(node, monitor.nextSibling);
        }
      } else if (node.parentElement !== section || section.firstChild !== node) {
        section.insertBefore(node, section.firstChild);
      }
      node.dataset.place = want.backupPlace;
      this.syncBackupButton(node, want.backupButton);
      this.renderBackup(node);
      // Jede Minute nachsehen, ob die Box noch steht - alle 5 Minuten neu laden.
      if (Date.now() - ((this.backupData && this.backupData.at) || 0) > 60000) {
        this.fetchBackup();
      }
      if (!this.backupTimer) {
        this.backupTimer = window.setInterval(() => {
          if (!this.backupNodes().length) {
            window.clearInterval(this.backupTimer);
            this.backupTimer = null;
            return;
          }
          if (Date.now() - ((this.backupData && this.backupData.at) || 0) > 290000) {
            this.fetchBackup();
          } else {
            // Die "vor ..."-Angabe nachziehen.
            this.backupNodes().forEach((one) => this.renderBackup(one));
          }
        }, 60000);
      }
    }

    buildBackup() {
      const text = systemText(this.root && this.root.hass);
      const node = document.createElement("div");
      node.className = "sh-backup";
      node.setAttribute("role", "group");
      node.setAttribute("aria-label", text.backupTitle);
      const grid = document.createElement("div");
      grid.className = "shm-grid";
      [
        ["last", text.backupLast, "num"],
        ["size", text.backupSize, "num"],
        ["name", text.backupName, "text"],
        ["place", text.backupPlace, "text"],
      ].forEach(([kind, label, look]) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "shm-cell";
        cell.dataset.kind = kind;
        cell.innerHTML =
          '<span class="shm-label"></span>' +
          (look === "num"
            ? '<span class="shm-value"><span class="shm-num">–</span><span class="shm-unit"></span></span>'
            : '<span class="shm-text">–</span>') +
          '<span class="shm-sub"> </span>';
        cell.querySelector(".shm-label").textContent = label;
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          this.openLink("/config/backup", event.ctrlKey || event.metaKey || event.shiftKey);
        });
        grid.appendChild(cell);
      });
      node.appendChild(grid);
      return node;
    }

    /**
     * Knopf "Backup jetzt erstellen" (1.4.8): nur fuer Administratoren, mit
     * Rueckfrage. Startet ein Backup mit den automatischen Einstellungen
     * (backup/generate_with_automatic_settings) - wie der gleichnamige Knopf
     * auf der Backup-Seite von Home Assistant.
     */
    syncBackupButton(node, wanted) {
      const hass = this.root && this.root.hass;
      const admin = !!(hass && hass.user && hass.user.is_admin);
      let bar = node.querySelector(".shb-actions");
      if (!wanted || !admin) {
        if (bar) {
          bar.remove();
        }
        return;
      }
      if (bar) {
        return;
      }
      const text = systemText(hass);
      bar = document.createElement("div");
      bar.className = "shb-actions";
      bar.innerHTML =
        '<span class="shb-msg" aria-live="polite"></span>' +
        '<button type="button" class="shb-btn" data-act="ask"></button>' +
        '<button type="button" class="shb-btn" data-act="cancel" hidden></button>' +
        '<button type="button" class="shb-btn" data-primary data-act="start" hidden></button>';
      const msg = bar.querySelector(".shb-msg");
      const ask = bar.querySelector('[data-act="ask"]');
      const cancel = bar.querySelector('[data-act="cancel"]');
      const start = bar.querySelector('[data-act="start"]');
      ask.textContent = text.backupNow;
      cancel.textContent = text.backupCancel;
      start.textContent = text.backupStart;
      const mode = (step) => {
        ask.hidden = step !== "idle";
        cancel.hidden = start.hidden = step !== "ask";
        if (step === "ask") {
          msg.textContent = text.backupConfirm;
          msg.removeAttribute("data-error");
          start.focus();
        } else if (step === "idle") {
          // Laeuft ein Backup, steht das da - auch nach einem Seitenwechsel.
          // Eine Fehlermeldung bleibt stehen, bis man es erneut versucht
          // (bis 1.4.9 wurde sie sofort wieder geleert).
          if (this.backupRunning) {
            msg.textContent = text.backupRunning;
          } else if (!msg.hasAttribute("data-error")) {
            msg.textContent = "";
          }
        }
      };
      ask.addEventListener("click", () => mode("ask"));
      cancel.addEventListener("click", () => mode("idle"));
      start.addEventListener("click", async () => {
        start.disabled = true;
        try {
          await hass.connection.sendMessagePromise({ type: "backup/generate_with_automatic_settings" });
          this.backupRunning = Date.now();
          msg.textContent = text.backupRunning;
          msg.removeAttribute("data-error");
          this.watchBackupRun();
        } catch (err) {
          msg.textContent = `${text.backupStartFailed}: ${(err && (err.message || err.code)) || err}`;
          msg.setAttribute("data-error", "");
        }
        start.disabled = false;
        mode("idle");
      });
      mode("idle");
      node.appendChild(bar);
    }

    /** Nach dem Start alle 15 Sekunden nachsehen, bis das neue Backup da ist (hoechstens 30 Minuten). */
    watchBackupRun() {
      window.clearInterval(this.backupRunTimer);
      const since = this.backupRunning;
      const known = this.backupData && this.backupData.latest ? this.backupData.latest.time : 0;
      this.backupRunTimer = window.setInterval(async () => {
        await this.fetchBackup();
        const latest = this.backupData && this.backupData.latest ? this.backupData.latest.time : 0;
        const done = latest > known && latest >= since - 60000;
        if (done || Date.now() - since > 1800000) {
          window.clearInterval(this.backupRunTimer);
          this.backupRunTimer = null;
          this.backupRunning = 0;
          this.backupNodes().forEach((one) => {
            const msg = one.querySelector(".shb-msg");
            if (msg) {
              msg.textContent = "";
            }
          });
        }
      }, 15000);
    }

    backupNodes() {
      const nodes = [];
      (this.dashRoots || []).forEach((root) => {
        const node = root.querySelector(".sh-backup");
        if (node && node.isConnected) {
          nodes.push(node);
        }
      });
      return nodes;
    }

    /**
     * Die Backups wie auf der Backup-Seite von Home Assistant: backup/info
     * (Liste, naechstes automatisches Backup) und backup/agents/info (Namen
     * der Speicherorte). Beides nur fuer Administratoren - die
     * Einstellungsseite ist es ohnehin.
     */
    async fetchBackup() {
      const hass = this.root && this.root.hass;
      const connection = hass && hass.connection;
      if (!connection || this.backupLoading) {
        return;
      }
      const components = hass.config && hass.config.components;
      this.backupLoading = true;
      const data = { at: Date.now(), latest: null, count: 0, next: null, agents: [], error: false };
      try {
        if (Array.isArray(components) && components.indexOf("backup") < 0) {
          throw new Error("backup integration not loaded");
        }
        const info = await connection.sendMessagePromise({ type: "backup/info" });
        const backups = Array.isArray(info && info.backups) ? info.backups : [];
        data.count = backups.length;
        backups.forEach((one) => {
          const time = Date.parse(one && one.date);
          if (Number.isFinite(time) && (!data.latest || time > data.latest.time)) {
            data.latest = Object.assign({}, one, { time });
          }
        });
        const next = Date.parse(info && info.next_automatic_backup);
        data.next = Number.isFinite(next) ? next : null;
        if (!this.backupAgents) {
          try {
            const agents = await connection.sendMessagePromise({ type: "backup/agents/info" });
            this.backupAgents = Array.isArray(agents && agents.agents) ? agents.agents : [];
          } catch (err) {
            this.backupAgents = [];
          }
        }
        data.agents = this.backupAgents;
      } catch (err) {
        data.error = true;
        this.debug("settings", "backup info not available", {
          error: (err && (err.message || err.code)) || String(err),
        });
      }
      this.backupData = data;
      this.backupLoading = false;
      this.backupNodes().forEach((node) => this.renderBackup(node));
    }

    /** Die Werte in die Backup-Box schreiben. */
    renderBackup(node) {
      const hass = this.root && this.root.hass;
      const text = systemText(hass);
      const fmt = numberFormat(hass);
      const data = this.backupData;
      const cells = {};
      node.querySelectorAll(".shm-cell").forEach((cell) => {
        cells[cell.dataset.kind] = cell;
      });
      const set = (cell, selector, value) => {
        const element = cell && cell.querySelector(selector);
        if (element && element.textContent !== value) {
          element.textContent = value;
        }
      };
      const level = (cell, wanted) => {
        if ((cell.dataset.level || "") !== wanted) {
          if (wanted) {
            cell.dataset.level = wanted;
          } else {
            delete cell.dataset.level;
          }
        }
      };
      const latest = data && data.latest;
      if (!latest) {
        const empty = !data ? text.wait : data.error ? text.none : text.backupNone;
        set(cells.last, ".shm-num", "–");
        set(cells.last, ".shm-sub", empty);
        set(cells.size, ".shm-num", "–");
        set(cells.size, ".shm-unit", "");
        set(cells.size, ".shm-sub", " ");
        set(cells.name, ".shm-text", "–");
        set(cells.name, ".shm-sub", " ");
        set(cells.place, ".shm-text", "–");
        set(cells.place, ".shm-sub", data && data.next ? `${text.backupNext} ${dateTime(hass, data.next)}` : " ");
        level(cells.last, data && !data.error ? "crit" : "");
        return;
      }
      // Wann: "vor 19 Std." gross, Datum und Uhrzeit darunter.
      set(cells.last, ".shm-num", relativeTime(hass, latest.time));
      set(cells.last, ".shm-sub", dateTime(hass, latest.time));
      // Aelter als 7 Tage: orange.
      level(cells.last, Date.now() - latest.time > 7 * 86400000 ? "warn" : "");
      // Groesse: die groesste Datei aller Speicherorte, wie Home Assistant.
      const sizes = Object.values(latest.agents || {})
        .map((one) => number(one && one.size, 0))
        .filter((one) => one > 0);
      const bytes = sizes.length ? Math.max(...sizes) : 0;
      const size = byteSize(bytes, fmt);
      set(cells.size, ".shm-num", size[0]);
      set(cells.size, ".shm-unit", size[1]);
      const extra = latest.extra_metadata || {};
      set(
        cells.size,
        ".shm-sub",
        latest.with_automatic_settings
          ? text.backupAuto
          : extra["supervisor.addon_update"] != null || extra["supervisor.app_update"] != null
          ? text.backupApp
          : text.backupManual
      );
      set(cells.name, ".shm-text", latest.name || "–");
      if (cells.name) {
        cells.name.title = latest.name || "";
      }
      set(cells.name, ".shm-sub", `${data.count} ${data.count === 1 ? text.backupOne : text.backupMany}`);
      // Wo: die Speicherorte mit ihren Namen.
      const places = Object.keys(latest.agents || {})
        .map((id) => backupAgentName(id, data.agents, text))
        .filter((one, index, all) => one && all.indexOf(one) === index);
      set(cells.place, ".shm-text", places.join(" · ") || "–");
      if (cells.place) {
        cells.place.title = places.join(", ");
      }
      const failed = Array.isArray(latest.failed_agent_ids) ? latest.failed_agent_ids : [];
      set(
        cells.place,
        ".shm-sub",
        failed.length
          ? `${text.backupFailed} ${failed.map((id) => backupAgentName(id, data.agents, text)).join(", ")}`
          : data.next
          ? `${text.backupNext} ${dateTime(hass, data.next)}`
          : " "
      );
      level(cells.place, failed.length ? "warn" : "");
    }

    /* ------------------------------------------------ Zaehler-Box */

    /**
     * Die Box mit den Zaehlern (Geraete, Entitaeten, ...). Steht oben hinter
     * Monitor und Backup-Box, wenn die auch oben stehen, oder am Ende vor dem
     * Tipp von Home Assistant.
     */
    applyCounts(root, want) {
      const section = root.querySelector("ha-config-section");
      let node = root.querySelector(".sh-counts");
      if (!want.counts || !section) {
        if (node) {
          node.remove();
        }
        return;
      }
      if (!node || node.dataset.items !== want.countsItems.join(",")) {
        if (node) {
          node.remove();
        }
        node = this.buildCounts(want.countsItems);
      }
      if (want.countsPlace === "end") {
        const tip = Array.from(section.children).find((one) => one.localName === "ha-tip");
        if (tip) {
          if (node.nextElementSibling !== tip || node.parentElement !== section) {
            section.insertBefore(node, tip);
          }
        } else if (node.parentElement !== section || section.lastElementChild !== node) {
          section.appendChild(node);
        }
      } else {
        // Hinter die letzte Box, die auch oben steht (Backup, sonst Monitor)
        const before = [".sh-backup", ".sh-monitor"]
          .map((selector) => section.querySelector(`:scope > ${selector}[data-place="top"]`))
          .find(Boolean);
        if (before) {
          if (before.nextSibling !== node) {
            section.insertBefore(node, before.nextSibling);
          }
        } else if (node.parentElement !== section || section.firstChild !== node) {
          section.insertBefore(node, section.firstChild);
        }
      }
      node.dataset.place = want.countsPlace;
      this.renderCounts(node);
      if (Date.now() - ((this.countsData && this.countsData.at) || 0) > 60000) {
        this.fetchCounts();
      }
      if (!this.countsTimer) {
        // Alle 5 Minuten neu zaehlen, solange die Box steht.
        this.countsTimer = window.setInterval(() => {
          if (!this.countsNodes().length) {
            window.clearInterval(this.countsTimer);
            this.countsTimer = null;
            return;
          }
          this.fetchCounts();
        }, 300000);
      }
    }

    buildCounts(items) {
      const text = systemText(this.root && this.root.hass);
      const node = document.createElement("div");
      node.className = "sh-counts";
      node.dataset.items = items.join(",");
      node.setAttribute("role", "group");
      node.setAttribute("aria-label", text.countsTitle);
      const grid = document.createElement("div");
      grid.className = "shm-grid";
      items.forEach((kind) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "shm-cell";
        cell.dataset.kind = kind;
        cell.innerHTML =
          '<span class="shm-label"></span>' +
          '<span class="shm-value"><span class="shm-num">–</span></span>' +
          '<span class="shm-sub"> </span>';
        cell.querySelector(".shm-label").textContent = text[`count_${kind}`] || kind;
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          this.openLink(this.countLink(kind), event.ctrlKey || event.metaKey || event.shiftKey);
        });
        grid.appendChild(cell);
      });
      node.appendChild(grid);
      return node;
    }

    /** Wohin ein Feld fuehrt. Apps: wie Home Assistant den Menuepunkt nennt. */
    countLink(kind) {
      if (kind !== "apps") {
        return COUNT_LINKS[kind] || "/config";
      }
      const seen = Object.values(this.menuSeen || {})
        .map((text) => {
          try {
            return JSON.parse(text);
          } catch (err) {
            return [];
          }
        })
        .reduce((all, one) => all.concat(Array.isArray(one) ? one : []), [])
        .map((entry) => (entry && typeof entry === "object" ? entry.path : entry))
        .find((path) => typeof path === "string" && /\/(apps|hassio)(\/|$)/.test(path));
      return seen || "/config/apps";
    }

    countsNodes() {
      const nodes = [];
      (this.dashRoots || []).forEach((root) => {
        const node = root.querySelector(".sh-counts");
        if (node && node.isConnected) {
          nodes.push(node);
        }
      });
      return nodes;
    }

    /**
     * Was nicht schon in hass steht, fragt die Box bei Home Assistant ab -
     * jede Zahl fuer sich, eine fehlende (keine Rechte, Integration nicht
     * geladen) bleibt "–". Geraete, Entitaeten, Automationen, Szenen und
     * Skripte zaehlt renderCounts() direkt aus hass.
     */
    async fetchCounts() {
      const hass = this.root && this.root.hass;
      const connection = hass && hass.connection;
      if (!connection || this.countsLoading) {
        return;
      }
      this.countsLoading = true;
      const components = (hass.config && hass.config.components) || [];
      const ask = async (message) => {
        try {
          return await connection.sendMessagePromise(message);
        } catch (err) {
          this.debug("settings", `count not available: ${message.type}`, {
            error: (err && (err.message || err.code)) || String(err),
          });
          return undefined;
        }
      };
      const data = { at: Date.now() };
      const entries = await ask({ type: "config_entries/get" });
      if (Array.isArray(entries)) {
        data.integrations = new Set(entries.map((one) => one && one.domain).filter(Boolean)).size;
        data.entries = entries.length;
        // Eintraege mit Problem (wie die rote Markierung auf "Geraete & Dienste")
        data.failing = entries.filter(
          (one) => one && !one.disabled_by && COUNT_FAILED_STATES.indexOf(one.state) >= 0
        ).length;
      }
      if (!hass.devices) {
        const devices = await ask({ type: "config/device_registry/list" });
        if (Array.isArray(devices)) {
          data.devices = devices.length;
          data.devicesDisabled = devices.filter((one) => one && one.disabled_by).length;
        }
      }
      if (components.indexOf("hassio") >= 0) {
        const apps = await ask({ type: "supervisor/api", endpoint: "/addons", method: "get" });
        if (apps && Array.isArray(apps.addons)) {
          data.apps = apps.addons.length;
          // Arbeitsspeicher: Summe der laufenden Apps (wie auf ihrer Info-Seite)
          const running = apps.addons.filter((one) => one && one.slug && one.state === "started");
          const stats = await Promise.all(
            running.map((one) => ask({ type: "supervisor/api", endpoint: `/addons/${one.slug}/stats`, method: "get" }))
          );
          const known = stats.filter((one) => one && typeof one.memory_usage === "number");
          if (known.length || !running.length) {
            data.appsRam = known.reduce((sum, one) => sum + Math.max(0, one.memory_usage), 0);
          }
        }
        // Speicher der Apps (Daten + Konfiguration) aus der Speicher-Aufteilung
        // des Supervisors - das Durchzaehlen dauert, darum nur alle 30 Minuten.
        const old = this.countsData || {};
        if (this.appsDiskUnsupported) {
          // Aeltere Supervisor kennen die Aufteilung nicht - nicht jedes Mal
          // erneut fragen (das schriebe jedes Mal einen Fehler ins Protokoll).
        } else if (old.appsDiskAt && Date.now() - old.appsDiskAt < 1800000) {
          data.appsDisk = old.appsDisk;
          data.appsDiskAt = old.appsDiskAt;
        } else {
          const usage = await ask({
            type: "supervisor/api",
            endpoint: "/host/disks/default/usage",
            method: "get",
            params: { max_depth: 1 },
            timeout: 600,
          });
          data.appsDiskAt = Date.now();
          if (usage === undefined) {
            this.appsDiskUnsupported = true;
          }
          if (usage && Array.isArray(usage.children)) {
            const parts = usage.children.filter((one) => one && (one.id === "addons_data" || one.id === "addons_config"));
            if (parts.length) {
              data.appsDisk = parts.reduce((sum, one) => sum + (Number(one.used_bytes) || 0), 0);
            }
          }
        }
      } else {
        data.noApps = true;
      }
      const resources = await ask({ type: "lovelace/resources" });
      if (Array.isArray(resources)) {
        data.cards = resources.filter((one) => one && one.type === "module").length;
        data.resources = resources.length;
      }
      let blueprints = 0;
      let blueprintsKnown = false;
      data.blueprintsBy = {};
      for (const domain of ["automation", "script"]) {
        const list = await ask({ type: "blueprint/list", domain });
        if (list && typeof list === "object") {
          blueprints += Object.keys(list).length;
          data.blueprintsBy[domain] = Object.keys(list).length;
          blueprintsKnown = true;
        }
      }
      if (blueprintsKnown) {
        data.blueprints = blueprints;
      }
      const users = await ask({ type: "config/auth/list" });
      if (Array.isArray(users)) {
        const people = users.filter((one) => one && !one.system_generated);
        data.users = people.length;
        data.admins = people.filter((one) => Array.isArray(one.group_ids) && one.group_ids.indexOf("system-admin") >= 0).length;
      }
      const tokens = await ask({ type: "auth/refresh_tokens" });
      if (Array.isArray(tokens)) {
        const own = tokens.filter((one) => one && one.type === "long_lived_access_token");
        data.tokens = own.length;
        const used = own.map((one) => Date.parse(one.last_used_at || "")).filter((t) => Number.isFinite(t));
        data.tokensUsed = used.length ? Math.max(...used) : null;
      }
      this.countsData = data;
      this.countsLoading = false;
      this.countsNodes().forEach((node) => this.renderCounts(node));
    }

    /** Die Zahlen in die Box schreiben (Zustaende direkt aus hass). */
    renderCounts(node) {
      const hass = this.root && this.root.hass;
      const text = systemText(hass);
      const fmt = numberFormat(hass);
      const data = this.countsData || {};
      const states = Object.values((hass && hass.states) || {});
      const domain = (name) => states.filter((one) => one && typeof one.entity_id === "string" && one.entity_id.indexOf(`${name}.`) === 0);
      const join = (...parts) => parts.filter(Boolean).join(" · ");
      const ago = (time) => (Number.isFinite(time) && time > 0 ? `${text.countLast} ${relativeTime(hass, time)}` : "");
      const latest = (list) => {
        const times = list.filter((t) => Number.isFinite(t));
        return times.length ? Math.max(...times) : NaN;
      };
      const gb = (bytes) => {
        const [num, unit] = byteSize(bytes, fmt);
        return num === "–" ? "" : `${num} ${unit}`;
      };
      // Geraete: nicht erreichbar = alle Entitaeten "unavailable";
      // deaktiviert aus dem Geraete-Register.
      const deviceLine = () => {
        const devices = hass && hass.devices ? Object.values(hass.devices) : null;
        const disabled = devices ? devices.filter((one) => one && one.disabled_by).length : data.devicesDisabled;
        let unreachable = 0;
        if (devices && hass.entities && hass.states) {
          const byDevice = {};
          Object.values(hass.entities).forEach((entity) => {
            if (entity && entity.device_id && hass.states[entity.entity_id]) {
              (byDevice[entity.device_id] = byDevice[entity.device_id] || []).push(hass.states[entity.entity_id].state);
            }
          });
          devices.forEach((device) => {
            const list = device && !device.disabled_by ? byDevice[device.id] : null;
            if (list && list.length && list.every((state) => state === "unavailable")) {
              unreachable += 1;
            }
          });
        }
        return join(
          unreachable ? `${fmt.whole(unreachable)} ${text.countUnreachable}` : "",
          disabled ? `${fmt.whole(disabled)} ${text.countDisabled}` : ""
        );
      };
      const values = {
        devices: hass && hass.devices ? [Object.keys(hass.devices).length, deviceLine()] : [data.devices, deviceLine()],
        entities: [states.length, `${states.filter((one) => one && one.state === "unavailable").length} ${text.countUnavailable}`],
        integrations: [data.integrations, join(
          data.entries !== undefined ? `${fmt.whole(data.entries)} ${text.countEntries}` : "",
          data.failing ? `${fmt.whole(data.failing)} ${text.countFailing}` : ""
        )],
        apps: [data.apps, data.noApps ? text.countNoApps : join(
          data.appsRam > 0 ? `${gb(data.appsRam)} ${text.countRam}` : "",
          data.appsDisk > 0 ? `${gb(data.appsDisk)} ${text.countDisk}` : ""
        )],
        automations: (() => {
          const all = domain("automation");
          return [all.length, `${all.filter((one) => one.state === "on").length} ${text.countOn}`];
        })(),
        // Szenen: der Zustand ist der Zeitpunkt der letzten Aktivierung.
        scenes: (() => {
          const all = domain("scene");
          return [all.length, ago(latest(all.map((one) => Date.parse(one.state))))];
        })(),
        // Skripte: laufen gerade welche, sonst wann zuletzt.
        scripts: (() => {
          const all = domain("script");
          const running = all.filter((one) => one.state === "on").length;
          return [all.length, running
            ? `${fmt.whole(running)} ${text.countRunning}`
            : ago(latest(all.map((one) => Date.parse((one.attributes && one.attributes.last_triggered) || ""))))];
        })(),
        cards: [data.cards, data.resources !== undefined ? `${fmt.whole(data.resources)} ${text.countResources}` : ""],
        blueprints: [data.blueprints, data.blueprintsBy ? join(
          data.blueprintsBy.automation !== undefined ? `${fmt.whole(data.blueprintsBy.automation)} ${text.countAutomation}` : "",
          data.blueprintsBy.script !== undefined ? `${fmt.whole(data.blueprintsBy.script)} ${text.countScript}` : ""
        ) : ""],
        users: [data.users, data.admins !== undefined ? `${fmt.whole(data.admins)} ${text.countAdmins}` : ""],
        tokens: [data.tokens, data.tokensUsed ? `${text.countUsed} ${relativeTime(hass, data.tokensUsed)}`
          : data.tokens !== undefined ? text.countOwn : ""],
      };
      node.querySelectorAll(".shm-cell").forEach((cell) => {
        const [value, sub] = values[cell.dataset.kind] || [];
        const num = typeof value === "number" && Number.isFinite(value) ? fmt.whole(value) : "–";
        const numNode = cell.querySelector(".shm-num");
        if (numNode.textContent !== num) {
          numNode.textContent = num;
        }
        const subText = sub || " ";
        const subNode = cell.querySelector(".shm-sub");
        if (subNode.textContent !== subText) {
          subNode.textContent = subText;
          // Auf dem Handy wird die Zeile gekuerzt - ganz steht sie im Tooltip.
          subNode.title = sub || "";
        }
      });
    }

    /** Was an Elementen und Markierungen auf der Einstellungsseite haengt, wieder weg. */
    clearDashboardDom() {
      (this.dashRoots || []).forEach((root) => {
        root.querySelectorAll(".sh-favorites, .sh-monitor, .sh-backup, .sh-counts").forEach((node) => node.remove());
        root.querySelectorAll("[data-sh-empty]").forEach((node) => node.removeAttribute("data-sh-empty"));
      });
      this.dashRoots = [];
      this.useSystem("monitor", false);
      window.clearInterval(this.backupTimer);
      this.backupTimer = null;
      window.clearInterval(this.countsTimer);
      this.countsTimer = null;
      window.clearInterval(this.sensorTimer);
      this.sensorTimer = null;
    }

    /** Einen Shadow Root einordnen: Was ist er, und was ist darin zu tun? */
    classifySettingsRoot(node, found) {
      const tag = node.host ? node.host.localName : "";
      if (node.querySelector(ICON_BOX_SELECTOR)) {
        found.icons.push(node);
      }
      if (tag === MENU_LIST) {
        found.menus.push(node);
        if (this.isDashboardMenu(node)) {
          found.dashMenus.push(node);
        } else if (this.isSystemMenu(node)) {
          found.systemMenus.push(node);
        } else if (this.isProfileMenu(node)) {
          found.profileMenus.push(node);
        }
      }
      if (tag === DASH_PAGE) {
        found.dashPages.push(node);
      }
      if (tag === SYSTEM_PAGE) {
        found.systemPages.push(node);
      }
      if (tag === PROFILE_PAGE) {
        found.profilePages.push(node);
      }
      if (tag === ENTRY_PAGE) {
        found.entryPages.push(node);
      }
      if (tag === ENTRY_ROW) {
        found.entryRows.push(node);
      }
      if (tag === ENTRY_DEVICE_ROW) {
        // Nur die Geraetezeilen auf der Seite einer Integration.
        const outer = node.host.getRootNode();
        const outerTag = outer && outer.host ? outer.host.localName : "";
        if (outerTag === ENTRY_ROW || outerTag === ENTRY_SUB_ROW) {
          found.entryItems.push(node);
        }
      }
      if (tag === DATA_TABLE) {
        found.tables.push(node);
      }
      if (tag === APPS_PAGE) {
        found.appPages.push(node);
      } else if (tag === APPS_CARD) {
        // Nur die Karten der Seite "Apps", nicht die der Liste zum Installieren.
        const outer = node.host.getRootNode();
        if (outer && outer.host && outer.host.localName === APPS_PAGE) {
          found.appCards.push(node);
        }
      }
      if (tag === LIST_CARD) {
        found.cards.push(node);
      } else if (tag === LIST_HEADER || tag === LIST_CARD_HEADER || tag === LIST_CARD_FOOTER) {
        // Nur Kopf und Fuss innerhalb einer Integrationskarte, nicht auf anderen Seiten.
        const outer = node.host.getRootNode();
        if (outer && outer.host && outer.host.localName === LIST_CARD) {
          (tag === LIST_CARD_FOOTER ? found.footers : found.headers).push(node);
        }
      } else if (node.querySelector(LIST_CARD)) {
        found.containers.push(node);
      }
    }

    /** Alle Shadow Roots unterhalb von <home-assistant>, in denen etwas zu tun ist. */
    findSettingsRoots() {
      const found = this.emptySettingsRoots();
      const seen = new Set();
      let budget = 30000;
      const walk = (node) => {
        if (!node || seen.has(node) || budget <= 0) {
          return;
        }
        seen.add(node);
        this.classifySettingsRoot(node, found);
        node.querySelectorAll("*").forEach((element) => {
          budget -= 1;
          if (element.shadowRoot && element.localName !== "ha-sidebar") {
            walk(element.shadowRoot);
          }
        });
      };
      walk(this.root && this.root.shadowRoot);
      return found;
    }

    /**
     * Die Stylesheets in die gefundenen Shadow Roots schreiben. "used" sammelt
     * die Stylesheets, die dabei gebraucht wurden.
     */
    putSettingsSheets(found, want, used) {
      if (!this.pageSheets) {
        this.pageSheets = new WeakMap();
      }
      const put = (root, id, css) => {
        let per = this.pageSheets.get(root);
        if (!per) {
          per = new Map();
          this.pageSheets.set(root, per);
        }
        let sheet = per.get(id);
        if (!sheet || !sheet.alive) {
          sheet = new Sheet(root, id);
          per.set(id, sheet);
        }
        sheet.write(css);
        used.add(sheet);
      };
      // Die Profilseite nur, wenn sie mitmachen soll (1.4.8)
      const allowed = (root) => want.profile || found.profileMenus.indexOf(root) < 0;
      if (want.icon) {
        found.icons.filter(allowed).forEach((root) => put(root, "iconbox", want.icon));
      }
      if (want.menu) {
        found.menus.filter(allowed).forEach((root) => put(root, "menurows", want.menu));
      }
      if (want.profile) {
        if (want.sysLayout) {
          found.profileMenus.forEach((root) => put(root, "menulayout", want.sysLayout));
        }
        if (want.profilePage) {
          found.profilePages.forEach((root) => put(root, "profilepage", want.profilePage));
        }
      }
      if (want.table) {
        found.tables.forEach((root) => put(root, "groupheader", want.table));
      }
      // Die Einstellungsseite: Breite und Favoriten an der Seite, Reihenfolge,
      // Ausblenden, Spalten und Kacheln an ihren Menuelisten.
      found.dashPages.forEach((root) => {
        if (want.dash) {
          put(root, "dashpage", want.dash);
        }
        if (!this.dashRoots) {
          this.dashRoots = [];
        }
        if (this.dashRoots.indexOf(root) < 0) {
          this.dashRoots.push(root);
        }
        this.applyFavorites(root, want.favorites, want.favoritesPlace);
        this.applyMonitor(root, want);
        this.applyBackup(root, want);
        this.applyCounts(root, want);
      });
      found.dashMenus.forEach((root) => {
        this.tagMenuItems(root);
        if (want.layout) {
          put(root, "menulayout", want.layout);
        }
      });
      // Die Unterseite "System": dieselbe Breite, Spalten und Kacheln.
      if (want.sysPage) {
        found.systemPages.forEach((root) => put(root, "syspage", want.sysPage));
      }
      if (want.sysLayout) {
        found.systemMenus.forEach((root) => put(root, "menulayout", want.sysLayout));
      }
      if (want.list) {
        found.containers.forEach((root) => {
          put(root, "listview", want.list.container);
          this.watchSettingsRoot(root);
        });
        // Nur wo der Aufbau der Karte bekannt ist; sonst bleibt sie, wie sie ist.
        // Bis 2026.9: Kopf im Link, Fuss (.card-actions) daneben in der Karte.
        // Ab 2026.10: Kopf und Fuss als eigene Elemente in .card-content.
        found.cards.forEach((root) => {
          if (
            root.querySelector("ha-card .ripple-anchor") &&
            (root.querySelector(".card-actions") ||
              root.querySelector(`.card-content > ${LIST_CARD_HEADER}`))
          ) {
            put(root, "listcard", want.list.card);
          }
        });
        found.headers.forEach((root) => {
          if (root.querySelector(".header")) {
            put(root, "listhead", want.list.header);
          }
        });
        found.footers.forEach((root) => {
          // Der Fuss zeichnet sich erst leer und bekommt seinen Inhalt danach;
          // das Stylesheet schadet einem leeren Fuss nicht.
          put(root, "listfoot", want.list.footer);
        });
        if (want.list.entries) {
          found.entryPages.forEach((root) => put(root, "listentrypage", want.list.entries.page));
          found.entryRows.forEach((root) => {
            if (root.querySelector(".config-entry-wrapper")) {
              put(root, "listentry", want.list.entries.row);
            }
          });
          if (want.list.entries.item) {
            found.entryItems.forEach((root) => {
              if (root.querySelector("ha-list-item-button")) {
                put(root, "listentryitem", want.list.entries.item);
              }
            });
          }
        }
        if (want.list.apps) {
          found.appPages.forEach((root) => {
            put(root, "listapps", want.list.apps.page);
            this.watchSettingsRoot(root);
          });
          found.appCards.forEach((root) => {
            if (root.querySelector(".app")) {
              put(root, "listappcard", want.list.apps.content);
            }
          });
        }
      }
    }

    /**
     * Ein Element von Home Assistant hat sich gerade gezeichnet (siehe
     * hookElement): sein Stylesheet sofort schreiben, noch bevor der Browser
     * das Bild ausgibt. So ist das Original-Design gar nicht erst zu sehen.
     * Das Nachfassen in scheduleSettingsPage() bleibt als Rueckfall bestehen.
     */
    styleSettingsElement(element) {
      const root = element && element.shadowRoot;
      if (!root) {
        return;
      }
      const want = this.settingsWanted();
      // Die Menuepunkte der Einstellungsseite fuer das Panel festhalten - auch
      // wenn sonst nichts eingestellt ist: nur so kann das Panel sie zum
      // Sortieren anbieten.
      let ready;
      if (element.localName === MENU_LIST && this.isDashboardMenu(root)) {
        this.tagMenuItems(root);
        // Die Liste zeichnet sich erst leer und bekommt ihre Punkte danach.
        if (!root.querySelector("ha-list-item-button")) {
          ready = false;
        }
      }
      if (!want.inConfig || !want.any) {
        return ready;
      }
      const found = this.emptySettingsRoots();
      this.classifySettingsRoot(root, found);
      if (element.localName === LIST_CARD || element.localName === APPS_CARD) {
        // Der Behaelter der Karten heisst je nach Seite anders - er ist
        // einfach der Shadow Root, in dem die Karte haengt.
        const outer = element.getRootNode();
        if (outer && outer.host && outer !== root) {
          this.classifySettingsRoot(outer, found);
        }
      }
      const used = new Set(this.pageUsed || []);
      const before = used.size;
      this.putSettingsSheets(found, want, used);
      if (used.size !== before) {
        this.pageUsed = Array.from(used);
        this.earlyCount = (this.earlyCount || 0) + (used.size - before);
      }
      return ready;
    }

    applySettingsPage() {
      const want = this.settingsWanted();
      if (!want.inConfig || !want.any) {
        this.clearSettingsPage();
        this.debug(
          "settings",
          !want.inConfig
            ? "not a settings page - nothing to do"
            : this.config.advanced.enabled === false
            ? "switched off - nothing is applied"
            : "settings page, but no HA setting is set",
          { path: window.location.pathname }
        );
        return;
      }
      const found = this.findSettingsRoots();
      const used = new Set();
      this.putSettingsSheets(found, want, used);
      if (!want.list) {
        this.unwatchSettingsRoots();
      }
      // Was vorher ein Stylesheet hatte und jetzt nicht mehr gebraucht wird.
      (this.pageUsed || []).forEach((sheet) => {
        if (!used.has(sheet)) {
          sheet.clear();
        }
      });
      this.pageUsed = Array.from(used);
      this.debug("settings", "applied", {
        path: window.location.pathname,
        wanted: {
          menuIcons: !!want.icon,
          menuRows: !!want.menu,
          tableGroups: !!want.table,
          settingsPage: !!(want.dash || want.layout || want.favorites.length),
          systemPage: !!(want.sysPage || want.sysLayout),
          monitor: want.monitor,
          listView: !!want.list,
          appsList: !!(want.list && want.list.apps),
        },
        found: {
          iconRoots: found.icons.length,
          menuLists: found.menus.length,
          tables: found.tables.length,
          settingsPages: found.dashPages.length,
          settingsMenus: found.dashMenus.length,
          systemPages: found.systemPages.length,
          systemMenus: found.systemMenus.length,
          integrationLists: found.containers.length,
          integrationCards: found.cards.length,
          appPages: found.appPages.length,
          appCards: found.appCards.length,
        },
        stylesheets: used.size,
        writtenWhileDrawing: this.earlyCount || 0,
        hooked: Object.keys(HOOKED).filter((tag) => HOOKED[tag] === "active"),
      });
    }

    /** Karten werden nachgeladen oder neu gebaut (Suche, Filter): dann erneut nachsehen. */
    watchSettingsRoot(root) {
      if (!this.pageObservers) {
        this.pageObservers = new Map();
      }
      if (this.pageObservers.has(root)) {
        return;
      }
      const observer = new MutationObserver(() => {
        window.clearTimeout(this.pageKick);
        this.pageKick = window.setTimeout(() => {
          if (!this.pagePolling) {
            this.scheduleSettingsPage(4);
          }
        }, 150);
      });
      observer.observe(root, { childList: true, subtree: true });
      this.pageObservers.set(root, observer);
    }

    unwatchSettingsRoots() {
      (this.pageObservers || new Map()).forEach((observer) => observer.disconnect());
      this.pageObservers = new Map();
    }

    clearSettingsPage() {
      window.clearTimeout(this.pageTimer);
      window.clearTimeout(this.pageKick);
      this.pagePolling = false;
      this.unwatchSettingsRoots();
      (this.pageUsed || []).forEach((sheet) => sheet.clear());
      this.pageUsed = [];
      this.clearDashboardDom();
    }

    /**
     * Die eigenen Knoepfe der Kopfzeile: der Neustart-Knopf und die Links.
     *
     * Sie haengen in der Leiste rechts (.action-items) - am Ende, hinter den
     * Markern von Lit, wie die eigenen Eintraege der Seitenleiste. Nach vorn,
     * vor die Knoepfe von Home Assistant, bringt sie die CSS-Eigenschaft
     * "order". Die Methode aendert nur, was abweicht: der Beobachter ueber der
     * Kopfzeile ruft sie nach jeder eigenen Aenderung wieder auf.
     */
    applyHeaderButtons(root) {
      const box = root && root.querySelector(".action-items");
      const head = this.config.header || DEFAULT_HEADER;
      const hass = this.root && this.root.hass;
      const admin = !!(hass && hass.user && hass.user.is_admin);
      const wanted = [];
      if (box && this.config.advanced.enabled !== false && !head.hidden) {
        if (head.show_restart === true && admin) {
          // Name und Icon wie beim Neustart-Eintrag der Seitenleiste, falls
          // dort etwas eingetragen ist.
          const own = (this.config.items && this.config.items[RESTART_KEY]) || {};
          wanted.push({
            id: "restart",
            name: value(own.name) || restartText(hass).label,
            icon: ICON_NAME.test(value(own.icon)) ? value(own.icon) : "mdi:restart",
            color: "",
          });
        }
        (Array.isArray(head.links) ? head.links : []).forEach((link) => {
          if (link.entity && ENTITY_ID.test(link.entity)) {
            // 1.5.4: Zustand einer Entitaet - fuer jeden Benutzer
            const stateObj = hass && hass.states ? hass.states[link.entity] : null;
            const friendly = stateObj && stateObj.attributes ? value(stateObj.attributes.friendly_name) : "";
            wanted.push({
              id: `entity:${link.entity}`,
              entity: link.entity,
              name: link.name || friendly || link.entity,
              icon: link.value_only ? "" : link.icon || "",
              // color: das Icon; der Wert hat seine eigene Farbe, sonst die des Icons
              color: css(link.color),
              valueColor: css(link.value_color) || css(link.color),
              valueOnly: link.value_only === true,
            });
            return;
          }
          if (LINK_PATH.test(link.path) && (admin || !linkNeedsAdmin(link.path))) {
            wanted.push({
              id: LINK_PREFIX + link.path,
              path: link.path,
              name: link.name || link.path,
              icon: link.icon || "mdi:link-variant",
              color: css(link.color),
            });
          }
        });
      }

      const ids = new Set(wanted.map((one) => one.id));
      root.querySelectorAll(".sh-header-button").forEach((node) => {
        if (!ids.has(node.dataset.shHeader) || node.parentElement !== box) {
          node.remove();
        }
      });

      wanted.forEach((one, index) => {
        let node = null;
        box.querySelectorAll(".sh-header-button").forEach((candidate) => {
          if (candidate.dataset.shHeader === one.id) {
            node = candidate;
          }
        });
        if (!node) {
          node = document.createElement("button");
          node.type = "button";
          node.className = "sh-header-button";
          node.dataset.shHeader = one.id;
          node.appendChild(document.createElement("ha-icon"));
          if (one.entity) {
            // Ein Sensor: Icon und Wert, ein Klick oeffnet den Mehr-Info-Dialog
            node.classList.add("sh-header-sensor");
            node.dataset.shEntity = one.entity;
            const val = document.createElement("span");
            val.className = "sh-hv";
            val.appendChild(document.createTextNode(""));
            node.appendChild(val);
          }
          node.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (node.dataset.shEntity) {
              node.dispatchEvent(new CustomEvent("hass-more-info", {
                detail: { entityId: node.dataset.shEntity },
                bubbles: true,
                composed: true,
              }));
            } else if (one.id === "restart") {
              this.restart();
            } else {
              this.openLink(node.dataset.shPath, event.ctrlKey || event.metaKey || event.shiftKey);
            }
          });
          node.addEventListener("auxclick", (event) => {
            if (event.button === 1 && one.id !== "restart" && !node.dataset.shEntity) {
              event.preventDefault();
              this.openLink(node.dataset.shPath, true);
            }
          });
          box.appendChild(node);
        }
        if (one.path && node.dataset.shPath !== one.path) {
          node.dataset.shPath = one.path;
        }
        const icon = node.querySelector("ha-icon");
        if (icon.getAttribute("icon") !== one.icon) {
          icon.setAttribute("icon", one.icon);
        }
        if (one.entity) {
          // Ohne eigenes Icon: das Icon der Entitaet (ha-state-icon); "nur der Wert": keins
          node.dataset.shIcon = one.valueOnly ? "none" : one.icon ? "own" : "";
          if (icon.hidden !== !one.icon) {
            icon.hidden = !one.icon;
          }
          this.renderHeaderSensor(node);
        }
        if (node.getAttribute("title") !== one.name) {
          node.setAttribute("title", one.name);
          node.setAttribute("aria-label", one.name);
        }
        // Vor die Knoepfe von Home Assistant (order 0), in der Reihenfolge
        // der Liste.
        const order = String(index - wanted.length);
        if (node.style.order !== order) {
          node.style.order = order;
        }
        // Der Browser gibt eine Farbe anders zurueck, als sie gesetzt wurde
        // (#f00 -> rgb(...)); verglichen wird deshalb mit dem gemerkten Wert.
        const colors = `${one.color}|${one.entity ? one.valueColor : one.color}`;
        if ((node.dataset.shColor || "") !== colors) {
          node.dataset.shColor = colors;
          // "important", damit die eigene Farbe auch gegen die Icon-Farbe und
          // die Farbe der rechten Seite gewinnt (beide ebenfalls !important).
          // Die Icons von Home Assistant malen mit --icon-primary-color - die
          // Variable braucht die Farbe also auch (1.5.4).
          const text = one.entity ? one.valueColor : one.color;
          if (text) {
            node.style.setProperty("color", text, "important");
          } else {
            node.style.removeProperty("color");
          }
          if (one.color) {
            node.style.setProperty("--sh-own-icon", one.color);
            node.style.setProperty("--icon-primary-color", one.color, "important");
          } else {
            node.style.removeProperty("--sh-own-icon");
            node.style.removeProperty("--icon-primary-color");
          }
        }
      });
      if (root) {
        this.applyHeaderSystem(root, box);
      }
      this.watchHeaderSensors();
    }

    /**
     * Die Sensoren der Kopfzeile (1.5.4) aktualisieren, wenn Home Assistant
     * einen neuen Wert hat - nicht in einem festen Takt. subscribe_entities
     * meldet genau die Aenderungen dieser Entitaeten (alle 5 Minuten, jede
     * Minute oder jede Sekunde - wie der Sensor eben liefert). Gelesen wird
     * dann aus hass, das die Oberflaeche ueber ihr eigenes Abo nachzieht.
     * Klappt das Abo nicht, wird alle 30 Sekunden nachgesehen.
     */
    watchHeaderSensors() {
      const root = this.headerRoot;
      const ids = root
        ? [...new Set([...root.querySelectorAll(".sh-header-sensor")].map((node) => node.dataset.shEntity))].sort()
        : [];
      const key = ids.join(",");
      if (key === (this.sensorFeed ? this.sensorFeed.key : "")) {
        return;
      }
      this.stopHeaderSensors();
      if (!ids.length) {
        return;
      }
      const feed = { key, unsub: null, timer: null, stop: false };
      this.sensorFeed = feed;
      const render = () => {
        const now = this.headerRoot;
        if (now && !feed.stop) {
          now.querySelectorAll(".sh-header-sensor").forEach((node) => this.renderHeaderSensor(node));
        }
      };
      const poll = () => {
        if (!feed.stop && !feed.timer) {
          feed.timer = window.setInterval(render, 30000);
        }
      };
      const hass = this.root && this.root.hass;
      const connection = hass && hass.connection;
      if (!connection || typeof connection.subscribeMessage !== "function") {
        poll();
        return;
      }
      connection
        .subscribeMessage(() => {
          window.clearTimeout(feed.kick);
          window.clearTimeout(feed.late);
          feed.kick = window.setTimeout(render, 250);
          feed.late = window.setTimeout(render, 1500);
        }, { type: "subscribe_entities", entity_ids: ids })
        .then((unsub) => {
          if (feed.stop) {
            unsub();
          } else {
            feed.unsub = unsub;
          }
        })
        .catch((err) => {
          this.log("header sensors: no subscription, checking every 30 s", err);
          poll();
        });
    }

    stopHeaderSensors() {
      const feed = this.sensorFeed;
      if (!feed) {
        return;
      }
      feed.stop = true;
      window.clearInterval(feed.timer);
      window.clearTimeout(feed.kick);
      window.clearTimeout(feed.late);
      if (feed.unsub) {
        try {
          const result = feed.unsub();
          if (result && typeof result.catch === "function") {
            result.catch(() => {});
          }
        } catch (err) {
          /* Verbindung schon zu */
        }
      }
      this.sensorFeed = null;
    }

    /** Wert (wie Home Assistant ihn anzeigt) und Icon eines Sensors der Kopfzeile. */
    renderHeaderSensor(node) {
      const hass = this.root && this.root.hass;
      const stateObj = hass && hass.states ? hass.states[node.dataset.shEntity] : null;
      let text = "\u2013";
      if (stateObj) {
        const unit = stateObj.attributes ? value(stateObj.attributes.unit_of_measurement) : "";
        text = unit ? `${stateObj.state} ${unit}` : String(stateObj.state);
        if (typeof hass.formatEntityState === "function") {
          try {
            text = hass.formatEntityState(stateObj) || text;
          } catch (err) {
            /* aeltere Fassung: Rohwert mit Einheit */
          }
        }
      }
      const textNode = node.querySelector(".sh-hv") && node.querySelector(".sh-hv").firstChild;
      if (textNode && textNode.data !== text) {
        textNode.data = text;
      }
      // Ohne eigenes Icon das der Entitaet - so wie Home Assistant es zeigt
      let stateIcon = node.querySelector("ha-state-icon");
      const wantIcon = node.dataset.shIcon === "" && !!stateObj && !!customElements.get("ha-state-icon");
      if (!wantIcon) {
        if (stateIcon) {
          stateIcon.remove();
        }
        return;
      }
      if (!stateIcon) {
        stateIcon = document.createElement("ha-state-icon");
        node.insertBefore(stateIcon, node.querySelector(".sh-hv"));
      }
      if (stateIcon.hass !== hass) {
        stateIcon.hass = hass;
      }
      if (stateIcon.stateObj !== stateObj) {
        stateIcon.stateObj = stateObj;
      }
    }

    /**
     * CPU und Arbeitsspeicher in der Kopfzeile (header.show_system). Das
     * Element steht vor den eigenen Knoepfen; die Werte schreibt
     * renderHeaderSystem() alle 5 Sekunden in die vorhandenen Textknoten -
     * so meldet der Beobachter der Kopfzeile dabei nichts.
     */
    applyHeaderSystem(root, box) {
      const head = this.config.header || DEFAULT_HEADER;
      const wanted =
        !!box && this.config.advanced.enabled !== false && !head.hidden &&
        (head.show_system === true || head.show_disk === true);
      const kinds = (head.show_system === true ? ["cpu", "ram"] : []).concat(
        head.show_disk === true ? ["free", "used"] : []
      );
      let node = root.querySelector(".sh-header-system");
      if (!wanted) {
        if (node) {
          node.remove();
        }
        this.useSystem("header", false);
        this.useSystem("headerdisk", false);
        return;
      }
      // Andere Werte gewuenscht (CPU/RAM, Speicher): neu aufbauen.
      if (node && node.dataset.kinds !== kinds.join(",")) {
        node.remove();
        node = null;
      }
      if (!node || node.parentElement !== box) {
        if (node) {
          node.remove();
        }
        const hass = this.root && this.root.hass;
        const text = systemText(hass);
        node = document.createElement("button");
        node.type = "button";
        node.className = "sh-header-system";
        node.setAttribute("aria-label", text.title);
        node.hidden = true;
        node.dataset.kinds = kinds.join(",");
        const labels = { cpu: text.cpuShort, ram: text.ramShort, free: text.freeShort, used: text.usedShort };
        kinds.map((kind) => [kind, labels[kind]]).forEach(([kind, label]) => {
          const item = document.createElement("span");
          item.className = "shs-item";
          item.dataset.kind = kind;
          const key = document.createElement("span");
          key.className = "shs-key";
          key.textContent = label;
          const val = document.createElement("span");
          val.className = "shs-val";
          val.appendChild(document.createTextNode("\u2013"));
          item.append(key, val);
          node.appendChild(item);
        });
        node.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (node.hasAttribute("data-link")) {
            const target = node.dataset.kinds.indexOf("cpu") >= 0 ? "/config/hardware" : "/config/storage";
            this.openLink(target, event.ctrlKey || event.metaKey || event.shiftKey);
          }
        });
        box.appendChild(node);
      }
      const hass = this.root && this.root.hass;
      const admin = !!(hass && hass.user && hass.user.is_admin);
      if (node.hasAttribute("data-link") !== admin) {
        node.toggleAttribute("data-link", admin);
      }
      if (node.style.order !== "-99") {
        node.style.order = "-99";
      }
      this.useSystem("header", head.show_system === true);
      this.useSystem("headerdisk", head.show_disk === true);
      this.renderHeaderSystem(node);
    }

    /** Die beiden Werte in der Kopfzeile nachziehen. */
    renderHeaderSystem(node) {
      const feed = this.systemFeed();
      const last = freshPoint(feed);
      const disk = feed.disk && !feed.disk.error ? feed.disk : null;
      const fmt = numberFormat(this.root && this.root.hass);
      let shown = false;
      node.querySelectorAll(".shs-item").forEach((item) => {
        const kind = item.dataset.kind;
        let wanted = null;
        if ((kind === "cpu" || kind === "ram") && last) {
          wanted = `${fmt.whole(kind === "cpu" ? last.cpu : last.mem)} %`;
        } else if ((kind === "free" || kind === "used") && disk) {
          wanted = `${fmt.one(kind === "free" ? disk.free : disk.used)} GB`;
        }
        // Ein Wert, der (noch) fehlt, bleibt weg - der andere steht trotzdem.
        if (item.hidden !== (wanted === null)) {
          item.hidden = wanted === null;
        }
        if (wanted === null) {
          return;
        }
        shown = true;
        const textNode = item.querySelector(".shs-val").firstChild;
        if (textNode && textNode.data !== wanted) {
          textNode.data = wanted;
        }
      });
      if (node.hidden !== !shown) {
        node.hidden = !shown;
      }
    }

    /** <hui-root> hat sich gerade gezeichnet (siehe hookElement). */
    styleHeaderElement(element) {
      this.applyHeader(element && element.shadowRoot);
    }

    /** Das Stylesheet der Kopfzeile schreiben. */
    applyHeader(given) {
      const root = given || this.huiRoot();
      if (!root) {
        return false;
      }
      // "Completely disabled" has to include the header: without this check
      // the next navigation would write the header CSS again.
      const enabled = this.config.advanced.enabled !== false;
      this.tagHeaderActions(root);
      this.applyHeaderButtons(root);
      const headerCss = enabled ? buildHeaderCss(this.config) : "";
      this.sheet(root, "header").write(headerCss);
      this.debug(
        "header",
        !enabled
          ? "switched off - nothing is applied"
          : headerCss
          ? "stylesheet written to the dashboard (hui-root)"
          : "dashboard found, no header setting is set",
        {
          path: window.location.pathname,
          hidden: this.config.header.hidden === true,
          cssLength: headerCss.length,
        }
      );

      // Lit baut die Werkzeugleiste neu, wenn sich am Dashboard etwas
      // aendert - dann sind die Markierungen weg. Der Beobachter setzt sie
      // wieder. Er horcht bewusst nur auf childList/subtree: die eigenen
      // Attribute loesen ihn damit nicht aus, und eine Schleife kann nicht
      // entstehen.
      if (this.headerRoot !== root) {
        if (this.headerObserver) {
          this.headerObserver.disconnect();
        }
        this.headerRoot = root;
        this.headerObserver = new MutationObserver(() => {
          this.tagHeaderActions(root);
          this.applyHeaderButtons(root);
        });
        this.headerObserver.observe(root, { childList: true, subtree: true });
      }
      return true;
    }

    /**
     * Nach einem Panelwechsel ein paar Mal nachfassen, bis <hui-root> da ist.
     * Nach gut drei Sekunden wird aufgegeben - dann ist es kein Dashboard.
     */
    scheduleHeader(tries) {
      window.clearTimeout(this.headerTimer);
      const left = typeof tries === "number" ? tries : 12;
      if (this.applyHeader()) {
        return;
      }
      if (left <= 0) {
        this.debug("header", "no dashboard on this page (hui-root not found)", {
          path: window.location.pathname,
        });
        return;
      }
      this.headerTimer = window.setTimeout(() => this.scheduleHeader(left - 1), 250);
    }

    /** Write data-sh-key on every entry so the CSS can address it. */
    tagItems(root, generation) {
      root.querySelectorAll(generation.item).forEach((item) => {
        const key = keyOfItem(item);
        if (key && item.dataset.shKey !== key) {
          item.dataset.shKey = key;
        }
      });
    }

    /**
     * Return the stylesheet with the given id for a shadow root.
     * Keyed by the root itself, so a re-created element simply gets a fresh
     * sheet instead of us writing into a detached one.
     */
    sheet(root, id) {
      let perRoot = this.sheets.get(root);
      if (!perRoot) {
        perRoot = new Map();
        this.sheets.set(root, perRoot);
      }
      let existing = perRoot.get(id);
      if (!existing || !existing.alive) {
        existing = new Sheet(root, id);
        perRoot.set(id, existing);
        // Drop the sheets of roots that are gone, otherwise this list keeps
        // every dashboard that was ever open alive.
        this.activeSheets = this.activeSheets.filter(
          (one) => one.root && one.root.host && one.root.host.isConnected
        );
        this.activeSheets.push(existing);
      }
      return existing;
    }

    /**
     * Tooltips fuer die eigenen Eintraege (1.5.4): Links, PopUps und der
     * Neustart-Knopf. Home Assistant gibt jedem seiner Eintraege bei
     * eingeklappter Seitenleiste ein <ha-tooltip for="id"> mit dem Namen -
     * die eigenen bekommen dasselbe, aber nur, wenn Home Assistant gerade
     * selbst Tooltips zeigt (eingeklappt, nicht auf dem Handy). Geaendert
     * wird nur, was abweicht - der Beobachter der Seitenleiste sieht jede
     * Aenderung.
     */
    applyTooltips(root, generation) {
      const list = root.querySelector(generation.list);
      const haTips = root.querySelectorAll("ha-tooltip:not([data-sh-tip])").length > 0;
      const expanded = !!(this.sidebar && (this.sidebar.alwaysExpand === true || this.sidebar.hasAttribute("expanded")));
      const wanted = new Map();
      if (list && generation.gen > 1 && haTips && !expanded) {
        root.querySelectorAll(`[data-sh-link], [data-sh-popup], [data-sh-key="${RESTART_KEY}"]`).forEach((node) => {
          const label = node.querySelector(".item-text");
          const text = label ? label.textContent.trim() : "";
          if (!text || !node.dataset.shKey) {
            return;
          }
          const id = `sh-item-${node.dataset.shKey.replace(/[^A-Za-z0-9_-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`)}`;
          if (node.id !== id) {
            node.id = id;
          }
          wanted.set(id, text);
        });
      }
      root.querySelectorAll("ha-tooltip[data-sh-tip]").forEach((tip) => {
        const id = tip.getAttribute("for");
        if (!wanted.has(id)) {
          tip.remove();
          return;
        }
        if (tip.textContent !== wanted.get(id)) {
          tip.textContent = wanted.get(id);
        }
        if (tip.parentElement !== list) {
          list.appendChild(tip);
        }
        wanted.delete(id);
      });
      wanted.forEach((text, id) => {
        const tip = document.createElement("ha-tooltip");
        tip.setAttribute("data-sh-tip", "");
        tip.setAttribute("for", id);
        tip.setAttribute("placement", "right");
        tip.setAttribute("show-delay", "0");
        tip.setAttribute("hide-delay", "0");
        tip.textContent = text;
        list.appendChild(tip);
      });
    }

    applySheets(root, generation) {
      const merge = this.config.layout.merge_fixed !== false && generation.gen > 1;

      // 1. the sidebar itself
      this.sheet(root, "sidebar").write(
        buildSidebarCss(this.config, generation, merge)
      );

      // 1b. free CSS in a sheet of its own - a typo in there must not be able
      //     to break the generated rules
      this.sheet(root, "custom").write(value(this.config.appearance.custom_css));

      // 2. the navigation lists - their inner container has to dissolve
      //    (merge) or become the grid itself
      const listCss = buildListCss(this.config, merge);
      const lists = root.querySelectorAll(generation.list);
      lists.forEach((list, index) => {
        if (!list.shadowRoot) {
          return;
        }
        this.sheet(list.shadowRoot, `list-${index}`).write(listCss);
      });

      // 3. sidebar width, on the shadow root of <home-assistant>
      this.sheet(this.root.shadowRoot, "root").write(buildRootCss(this.config));

      // 4. the divider line lives in ha-drawer
      const drawer = this.main.shadowRoot.querySelector("ha-drawer");
      if (drawer && drawer.shadowRoot) {
        this.sheet(drawer.shadowRoot, "drawer").write(
          buildDrawerCss(this.config)
        );
      }

      // 5. the notification drawer, if the user asked for it. It is appended
      //    to the shadow root of <home-assistant> by the dialog manager the
      //    first time the notifications entry is clicked.
      const notifications =
        this.root.shadowRoot.querySelector("notification-drawer");
      if (notifications && notifications.shadowRoot) {
        this.sheet(notifications.shadowRoot, "notifications").write(
          buildNotificationCss(this.config)
        );
      }
    }

    /** Names, icons and the sidebar title. */
    applyContent(root, generation) {
      // sidebar title
      const titleElement = root.querySelector(".menu .title");
      if (titleElement) {
        if (this.titleOriginal === null) {
          this.titleOriginal = titleElement.textContent;
        }
        const wanted = value(this.config.appearance.title) || this.titleOriginal;
        if (titleElement.textContent !== wanted) {
          titleElement.textContent = wanted;
        }
      }

      root.querySelectorAll(generation.item).forEach((item) => {
        const key = item.dataset.shKey;
        const entry = (key && this.config.items[key]) || null;
        this.applyName(item, entry);
        this.applyIcon(item, entry);
      });
    }

    applyName(item, entry) {
      const label =
        item.querySelector(".item-text") ||
        item.querySelector('[slot="headline"]');
      if (!label) {
        return;
      }
      const current = label.textContent || "";
      if (!("shName" in label.dataset)) {
        label.dataset.shName = current;
      } else if (current !== label.dataset.shName && current !== label.dataset.shSet) {
        // Neither the original nor what was written here: Home Assistant has
        // changed the text (dashboard renamed, other language). That is the
        // new original - writing the remembered one back would show the old
        // name until the page is reloaded.
        label.dataset.shName = current;
      }
      const custom = entry ? value(entry.name) : "";
      const wanted = custom || label.dataset.shName;
      if (current !== wanted) {
        setText(label, wanted);
      }
      if (custom) {
        label.dataset.shSet = wanted;
      } else {
        delete label.dataset.shSet;
      }
    }

    applyIcon(item, entry) {
      const wanted = entry ? value(entry.icon) : "";
      const own = item.querySelector("ha-icon[data-sh-icon]");
      const original = item.querySelector(
        'ha-icon[slot="start"]:not([data-sh-icon]), ha-svg-icon[slot="start"], ha-user-badge[slot="start"]'
      );

      if (!wanted) {
        if (own) {
          own.remove();
        }
        if (original && original.hasAttribute("data-sh-hidden")) {
          original.removeAttribute("data-sh-hidden");
          original.style.removeProperty("display");
        }
        return;
      }

      // The element Home Assistant rendered is only hidden, never removed -
      // Lit keeps a reference to it and would break if it disappeared.
      if (original && !original.hasAttribute("data-sh-hidden")) {
        original.setAttribute("data-sh-hidden", "");
        original.style.display = "none";
      }

      let icon = own;
      if (!icon) {
        icon = document.createElement("ha-icon");
        icon.setAttribute("slot", "start");
        icon.setAttribute("data-sh-icon", "");
        item.insertBefore(icon, item.firstChild);
      }
      if (icon.getAttribute("icon") !== wanted) {
        icon.setAttribute("icon", wanted);
        icon.icon = wanted;
      }
    }

    /** Undo everything (used when the integration is switched off). */
    reset() {
      this.clearSettingsPage();
      this.pageKey = null;
      if (this.headerRoot) {
        this.headerRoot
          .querySelectorAll(".sh-header-button, .sh-header-system")
          .forEach((node) => node.remove());
      }
      if (this.feed) {
        this.useSystem("header", false);
      }
      if (this.sidebar && this.sidebar.shadowRoot) {
        this.sidebar.shadowRoot
          .querySelectorAll(`.sh-heading, [data-sh-key="${RESTART_KEY}"], [data-sh-link], [data-sh-popup]`)
          .forEach((node) => node.remove());
        this.closePopup();
      }

      (this.activeSheets || []).forEach((sheet) => sheet.clear());
      if (!this.sidebar || !this.sidebar.shadowRoot) {
        return;
      }
      const root = this.sidebar.shadowRoot;
      root.querySelectorAll("ha-icon[data-sh-icon]").forEach((el) => el.remove());
      root.querySelectorAll("[data-sh-hidden]").forEach((el) => {
        el.removeAttribute("data-sh-hidden");
        el.style.removeProperty("display");
      });
      root.querySelectorAll("[data-sh-name]").forEach((el) => {
        if (el.textContent !== el.dataset.shName) {
          setText(el, el.dataset.shName);
        }
        delete el.dataset.shSet;
      });
      const titleElement = root.querySelector(".menu .title");
      if (titleElement && this.titleOriginal !== null) {
        titleElement.textContent = this.titleOriginal;
      }
    }
  }

  const hub = new SidebarHub();
  window.__sidebarHub = hub;

  // Die Elemente der Einstellungsseiten und die Kopfzeile des Dashboards
  // melden sich beim Zeichnen selbst - siehe hookElement.
  [LIST_CARD, LIST_HEADER, LIST_CARD_HEADER, LIST_CARD_FOOTER, ENTRY_ROW, ENTRY_DEVICE_ROW, ENTRY_PAGE, PROFILE_PAGE, MENU_LIST, DATA_TABLE, APPS_PAGE, APPS_CARD, DASH_PAGE, SYSTEM_PAGE].forEach((tag) =>
    hookElement(tag, "styleSettingsElement")
  );
  hookElement("hui-root", "styleHeaderElement");

  const boot = () => hub.start();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
