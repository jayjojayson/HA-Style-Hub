# Changelog

All changes of every version of **HA Style Hub** (until 1.1.6 the project was
called *Sidebar Hub*), newest first. A German version is in
[changelog_de.md](changelog_de.md).

Version numbers count up to `.9` and then move on to the next minor (1.2.9 →
1.3.0 → 1.3.1 → 1.3.2 → 1.3.3 → 1.3.4 → 1.3.5 → 1.3.6 → 1.3.7 →
1.3.8 → 1.3.9 → 1.4.0 → 1.4.1 → 1.4.2 → 1.4.3 → 1.4.4 → 1.4.5 →
1.4.6 → 1.4.7 → 1.4.8 → 1.4.9 → 1.5.0 → 1.5.1 → 1.5.2 → 1.5.3 → 1.5.4 → 1.5.5 → 1.5.6).

## 1.5.6

* **Header at the bottom.** New field *Position of the header* (*Top* /
  *Bottom*) at the bottom of the Header page, key `header.position`
  (`"top"` / `"bottom"`, anything else becomes `"top"` in `store.py`). With
  *Bottom* the injector moves `.header` of `hui-root` to the lower edge
  (`position: fixed; bottom: 0`, safe area at the bottom), and
  `hui-view-container` keeps its distance of `--header-height` at the bottom
  instead of the top; the line of `--app-header-border-bottom` moves to the
  top and the shadow while scrolling points up. All rules hang on `:host >
  div:not(.edit-mode)`, so the edit mode keeps Home Assistant's toolbar at
  the top. Templates and import keep the position like *hidden*; the
  preview of the Header page shows the bar at the bottom.
* **Restart dialog in the look of the theme.** The restart entry of the
  sidebar and the restart button of the header no longer use the small
  window of the browser (`window.confirm`). A dialog in the style of the
  popups (card background, corners and primary color of the theme, or the
  icon color of the restart entry) explains what happens and checks the
  configuration as soon as it opens - the same request as *Check
  configuration* (`POST /api/config/core/check_config`):
  * *checking* - spinner, *Restart* locked;
  * *valid* - green message, *Restart* calls `homeassistant.restart`;
  * *invalid* - red message with the errors (and warnings) as text,
    *Restart* stays locked (Home Assistant would refuse the restart anyway),
    *Check again* repeats the check after a fix;
  * *check not possible* (e.g. the `config` integration is not loaded) -
    a hint, a restart is still possible.

  *Cancel*, the X, Escape and a click next to it close it; *Cancel* has the
  focus, so Enter does not restart by accident. If Home Assistant refuses the
  restart, its message is shown in the dialog.

## 1.5.5

* **Preview of the page of an integration.** On the HA-Settings page, area
  *Devices & services*, a model of an integration page appears below the list
  as long as *Use the list view* and *Style the page of an integration as
  well* are on: section *Needs attention* with an entry with a setup error
  (two devices) and one that is not loaded, then a normal hub. It takes the
  same values as Home Assistant: border width, corners, border and problem
  color, row background, gap, row height of the integration page, and the
  backgrounds for errors / not loaded with their opacity. It is as wide as the
  list above it. A click on it opens the fields of the list.
* **Own icon for a menu entry of the Settings page.** The pencil under *Order
  and visibility* has an **Icon** field with Home Assistant's icon picker
  (`settings.menu_items[path].icon`, checked as an icon name in `store.py`).
  On the page an `<ha-icon>` takes the place of Home Assistant's symbol, with
  the same size and padding; sizes and colors of the icon boxes apply to it.
* **Own links of the sidebar** get a real address (`href`): a right-click
  offers *Open link in new tab*; a normal click still changes the page
  without a reload.

## 1.5.4

* **Sensors in the header.** The dialog behind the plus of *Links* (Header →
  *Buttons on the right side*) has a choice *Page* / *Sensor / entity*. A
  sensor is stored as `{"path": "", "entity": "sensor.x", name, icon, color}`
  in `header.links` (checked in `store.py`, each entity once; favourites and
  popups take no entities). In Home Assistant it is a pill-shaped button with
  icon (own or `ha-state-icon` of the entity) and the value from
  `hass.formatEntityState`. It is refreshed when Home Assistant reports a
  change (`subscribe_entities` for exactly these entities; without it every
  30 s) and without touching the observer of the header; a click fires
  `hass-more-info`. Per sensor: `color` (icon), `value_color` (value, empty =
  icon color) and `value_only`; the row of a sensor folds open like a
  favourite. The preview of the header shows value and colors as well.
* The link lists (header, favourites) get Home Assistant's icon picker also
  when it is loaded after the page.
* **Tooltips in the collapsed sidebar.** Own links, popups and the restart
  entry get an `<ha-tooltip for="…" placement="right">` with their name, like
  Home Assistant's entries - only while Home Assistant shows tooltips itself
  (collapsed, not on a phone).
* **Settings page:** system monitor, backup and counter boxes use the card
  shadow of the theme (`--ha-card-box-shadow`).
* **Page of an integration:** own backgrounds for entries with an error
  (`.state-error`) and for not loaded / failed unload
  (`settings.list_error_background`, `settings.list_warning_background`) with
  one opacity for both (`settings.list_problem_opacity`).

## 1.5.3

* **A Lovelace card in the popup.** A popup shows either links or a card -
  chosen under *Content of the window* in the dialog *Popup link* and at the
  entry. The card is pasted as YAML (the code editor of a dashboard card) and
  stored twice: as typed (`card_yaml`, for editing) and as configuration
  (`card`, for Home Assistant), each at most 50 KB (checked in the panel and
  in `store.py`). The YAML is read by Home Assistant's own parser
  (`homeassistant.util.yaml`) through the new websocket command
  `ha_style_hub/card_yaml` while typing (after a short pause), and once more
  when saving; errors come with their line. Tags (`!include`, `!secret`, ...)
  and references (`*name`) are refused - an include could read files of the
  configuration folder into a card every user can see. In Home Assistant the card is built with
  `loadCardHelpers().createCardElement`, receives every new `hass` while the
  window is open, and custom cards that are not loaded yet get the dashboard
  resources (`lovelace/resources`) first. The window now sits inside
  `home-assistant`, so events of the card (more-info, actions) reach Home
  Assistant; a more-info dialog closes the popup.
* **Window size** per popup: width and height in px (0 = automatic, at most
  4000); automatic height follows the content up to 85 % of the screen, a
  fixed height (at most the screen) is filled by the card (`ha-card` at 100 %
  height). No scroll bar in the window, scrolling still works.
* The preview on the Sidebar page shows the real card and the size.

## 1.5.2

* **Popup window:** the tiles fill every row - up to four per row on a
  computer, the rows as even as possible (5 → 3 + 2, 7 → 4 + 3), two per row
  on a phone (below 600 px); a shorter last row is filled by wider tiles. The
  preview on the Sidebar page uses the same rule.
* **How the popup is used** is written in the dialog *Popup link* and below the
  links of the entry: click, Ctrl-/⌘-click or middle mouse button for a new
  tab, `Esc`, cross or a click next to it closes the window.
* **Sidebar page:** the dashboard next to the sidebar shows suggested cards
  like the Header page (Light, Climate, Energy, History, Media); a click on
  them still leads to the Theme page.

## 1.5.1

* **Popup links in the sidebar.** The plus under *Sidebar → Entries* is now
  called *Heading, link, popup*; its dialog has a third part *Popup link*: a
  name and pages picked one by one (dashboards and pages of the sidebar first,
  then the pages of Home Assistant, or an own path). The popup is stored as
  `items["popup:<id>"]` with `links: [{path, name, icon}]` (at most 24,
  checked like the links of the header) and is one entry in the sidebar; a
  click opens a window with the pages as tiles (`<body>` > `.sh-popup-host`
  with its own shadow root, colors from the theme). Closes with the cross, a
  click next to it, `Esc`, a change of page or the choice of a page. Under
  *Entries* the popup has the fields of a link plus its list of links (rename,
  icon, move, add, remove); the preview of the Sidebar page shows the window
  while the popup is selected.
* **Quick colors:** *transparent* is always offered (*No color*).

## 1.5.0

* **Every element of the theme preview can be clicked.** What 1.4.9 brought
  for the tile *Controls* now works in all tiles: card title, icons on / off,
  switches, badge, slider, chips, every state color (devices, climate,
  security, weather), table header and rows, input field and drop-down, the
  four status colors, the area behind the dialog, the dialog, the code editor
  and every color of the code, scrollbar and buttons, heading, body text,
  small text, link and inline code, chart lines, history line, the 54 chart
  colors, energy bars and legend. All groups with the variables of the element
  open and the fields are marked; the tile shows the name of the element.
  Only the innermost element under the mouse is outlined.
* **Info page.** The texts of the four areas (Sidebar, Theme, Header,
  HA-Settings) describe all functions again, including those of 1.4.x.
* **Fixed: error of the backup button.** Since 1.4.8 two texts used the same
  key, so a failed start showed *"Failed::"* - and the message was cleared at
  once. Now *"The backup could not be started: …"* stays until the next try;
  a running backup is shown again after a change of page.
* **Clean-up.** 67 texts and 33 CSS rules of the old preview (before 1.4.0)
  that nothing used any more, unused key constants in `const.py`, and comments
  that no longer stood next to their code.

## 1.4.9

* **Menu preview with subtitles.** The menu entries in the preview of the
  Settings page show their second line as in Home Assistant; *hide the
  subtitle* removes it there as well. The injector remembers the real
  subtitles of your page (until then the English texts of the frontend, or a
  German translation).
* **Show only own entities** (`settings.monitor_sensors_only`) under *Own
  values* of the system monitor: processor, memory and storage disappear, the
  hardware values are no longer fetched. Without own values nothing changes.
* **Row height on the integration page** (`settings.list_entries_row_height`,
  0 = like Home Assistant, 32-120 px) below *Style the page of an
  integration as well*; it sets `--ha-row-item-min-height` and
  `--ha-row-item-padding-block` for the entries, devices and sub-entries.
* **Controls one by one.** Every element in the tile *Controls* of the theme
  preview can be clicked: all groups with its variables open at once (even
  with the accordion on) and the fields are marked.
* **Ctrl+Z / Cmd+Z** goes one step back, **Ctrl+Y** or **Ctrl+Shift+Z** one
  step forward again; *Discard* can be taken back as well.
* **Sidebar page** button moved into the preview (bottom left, arrow to the
  left) on the Theme and Header pages; on HA-Settings it is gone - a click on
  the sidebar in the preview still leads there.
* The hint of the Header page names the theme colors of the header instead of
  "only three theme variables".

## 1.4.8

* **Unsaved changes as a list.** A click on *n unsaved* at the top opens a
  dialog with every change, field by field and grouped by page: name and
  place of the field, old → new value (colors with a swatch). *Show* jumps to
  the field (switching dark / light when needed), *Reset* takes back this one
  change only; *Discard* takes back everything.
* **Contrast check** below text colors of the theme (WCAG AA, 4.5 : 1) - see
  *The theme*.
* **Quick colors** at every color field: colors in use and recently used ones.
* **Ctrl+S / Cmd+S saves** (when something changed).
* **Menu entries of the Settings page.** The pencil under *Order and
  visibility* opens an entry: own name, hide the subtitle, own background of
  the icon box and icon color (`settings.menu_items`). The injector writes the
  name into the text node Lit rendered (the markers of Lit stay untouched;
  when Home Assistant sets the text anew, the original is taken over again),
  subtitle and colors come as CSS. The preview shows name and colors.
* **Own values in the system monitor** (`settings.monitor_sensors`, up to
  six entities with an optional name): value with unit, "x min. ago" below, a
  click opens the more-info dialog. With own values the fields flow in rows.
* **Button "Create backup now"** below the backup box
  (`settings.monitor_backup_button`, on by default, administrators only):
  asks first, then starts `backup/generate_with_automatic_settings` - like the
  button on Home Assistant's backup page - and checks every 15 seconds until
  the new backup is there.
* **Profile page.** Since Home Assistant 2026.10 the profile page uses the menu
  list of the Settings page; icon boxes, colors, border, hover, columns and
  tiles apply there as well (`settings.profile_page`, on by default).
* **Page of an integration.** With the list view, the entries on the page of a
  single integration (`ha-config-entry-row`, Home Assistant 2026.10) get
  border width, corners, border and problem color, background and gap of the
  rows (`settings.list_entries`, on by default). Entries with a problem keep
  their warning background.
* **229 new theme variables** (now 309): chart colors 1-54 and the history
  line, energy (8), weather state colors (15), code editor syntax colors (the
  13 the editor uses), more for tables and inputs (table header, input label,
  dropdown arrow), label badge colors (5), the filter behind dialogs, the header
  in edit mode and the filter behind the header (*Theme colors of the header*;
  the blur of the Header page is taken over as `blur(…)`), Home Assistant's
  design tokens (91 `--ha-color-…` that the 2026.10 frontend uses, corners,
  border widths, shadows) and the switch variables (`--ha-switch-…`). Not
  taken over because the 2026.10 frontend no longer reads them:
  `--sidebar-selected-text-color`, `--slider-secondary-color`, most of the old
  `--input-…` line and border colors, and 12 design tokens without a single
  use. All new variables are stored, registered, exported and imported with the
  theme.
* **Theme preview:** new tiles *Chart* (five lines in colors 1-5, the history
  line, all 54 colors), *Energy* (bars and legend) and *Controls* (buttons,
  chips, checkboxes, switches, input field and surface from the design
  tokens), a weather row in *State colors*, syntax colors in the code of
  *Dialog and code*. The switches follow `--ha-switch-…` and the design tokens
  when they are set.
* **Info page:** the text about the theme names the number of variables.

## 1.4.7

* **Theme preview: groups of Card design and Cards.** A click on *Card design*
  opens *Cards* and also lists *Base colors* (collapsed) above it; *Cards*
  (the light card) lists *Base colors* too; *Sliders and badges* no longer
  does.
* **Shadow designer.** Below the field *Shadow* of the group *Cards*
  (`--ha-card-box-shadow`): six templates and sliders for direction (eight
  directions or all around), distance, blur, spread, color, opacity and inset.
  The result is written into the field as a normal `box-shadow`; a single
  shadow typed by hand (hex or `rgb()`/`rgba()` color) is read back into the
  sliders, for several shadows a note says that a slider replaces them. The
  designer opens with the checkbox *Design the shadow* and stays closed by
  default; the browser remembers it like the open groups.
* **Switch in the theme preview like Home Assistant 2026.10.** The toggles in
  the light card are drawn like `ha-switch`: a track with a border and a thumb
  with a small shadow, colored from the scale of the primary color (dark: track
  step 10, border 40, thumb 60; light: 90 / 40 / 40) - with Home Assistant's
  own scale while the theme has no primary color.
* **Settings page on a phone.** CPU, memory and storage of the system monitor
  stay side by side (a little smaller) instead of below each other. The
  favourites bar fills the width in equal columns: up to three favourites in
  one row, more in two even rows, at most four columns.
* **Overview box: second line for more counters.** Devices: unreachable (all
  entities unavailable) and disabled. Integrations: entries and how many fail
  to set up (`setup_error`, `setup_retry`, `failed_unload`,
  `migration_error`; disabled entries do not count). Apps: memory of the
  running apps (`/addons/<slug>/stats`) and disk space of app data and
  configuration (`/host/disks/default/usage`, depth 1, every 30 minutes; asked
  only once when the Supervisor does not know it). Scenes: last activation.
  Scripts: running, else last run. Blueprints: automation / script. Users:
  administrators. Tokens: last use. On a phone a long line is shortened; it is
  complete in the tooltip. The preview on the HA-Settings page shows the
  second lines with example values too. Not checked against a real
  Supervisor.

## 1.4.6

* **Fix: list view of Devices & services on Home Assistant 2026.10.** The
  integration card has a new structure since frontend 20260930
  (`ha-integration-card > ha-card > a.ripple-anchor > .card-content >
  ha-integration-card-header + ha-integration-card-footer`, no `.card-actions`
  any more). The injector only styled cards of the old structure, so row
  height, row background, border and corners no longer applied (columns and
  gap did, they sit on the container). Now both structures are recognised:
  `.card-content` becomes the row (name left, count and symbols right, without
  padding top and bottom), the header and the footer get their own small
  style sheet in their shadow roots. Since 2026.10 Home Assistant also tints
  the card on hover; with an own hover colour the row keeps its normal
  background underneath. Checked against the frontend source (tag
  20260930.3); not tested on a real 2026.10 installation.
* **Simple / All fields without hidden fields.** On the Header page and on
  *HA-Settings › Settings page* no field is hidden any more (e.g. icon size
  under *Dimensions*, box size under *Menu entries*). Header: *Simple* shows
  the group selected in the preview expanded and collapses the others,
  *All fields* expands all groups - a click in the preview then only scrolls,
  the accordion switch is hidden meanwhile. Settings page: *Simple* shows the
  clicked topic, *All fields* all topics one below the other, as before.
* **Theme: scale of the primary color.** Newer controls of Home Assistant
  (`ha-button`, `ha-switch`, checkboxes, radio buttons, progress bars, links)
  are colored from `--ha-color-primary-05` … `-95`. Home Assistant computes
  that scale only for the default theme from the profile color
  (`apply_themes_on_element.ts`); in a custom theme it stayed blue even with a
  different `primary-color`. The theme now gets the eleven steps from the
  primary color of each mode - backend (`theme.py`) and export (panel) use the
  formula of `generateColorPalette` with the constants of culori 4.0.2, which
  the frontend uses; checked against culori for 5,000 colors without a single
  difference. Only hex and `rgb()` values; named colors or `var(...)` leave
  Home Assistant's scale in place. The Theme page shows the scale below the
  primary color. Not checked on a real installation.
* **Header: colour of the right side.** New field in the group *View tabs*
  (`header.actions_color`): buttons of Home Assistant, own links and
  restart button, CPU/RAM/storage. *Tab colour* still colours the tabs only.
  An own colour set on a single link stays. Not taken over into the theme
  (the theme has only *Text and icons* for the whole header).

## 1.4.5

* **Accordion on Sidebar › Appearance.** The accordion switch also stands next
  to the title of the Appearance page (on by default, the same setting as on
  the other pages); Layout and Entries keep their groups as they are.
* **Panel colors go into the theme.** When a color changes on the Header page
  or on *Sidebar › Appearance*, the matching theme variable follows - in dark
  and light: header background (`--app-header-background-color`, with the
  background opacity as `color-mix()`; with a gradient the first color) and as
  `--app-theme-color` when it is a plain color, header text color
  (`--app-header-text-color`), border width and color
  (`--app-header-border-bottom`, the bottom side when set per side); sidebar
  background, text color, icon color, active icon color (or active text
  color), header background and title color (`--sidebar-...`). A theme
  variable only follows while it is empty or still holds the taken-over
  value - a value set in the theme by hand stays. Clearing the color clears
  the variable it filled. Nothing is taken over when the panel loads; after
  *Discard*, a restore from the history or an import the take-over starts
  fresh. *Take over colors* in both groups copies all colors of the page at
  once (for configurations from before 1.4.5).

## 1.4.4

* **HA-Settings › All fields.** On the Settings page *All fields* shows the
  three topics menu entries, favourites bar and system monitor one below the
  other, each with its title and separated by a line; a click in the preview
  scrolls to its topic. *Simple* shows the clicked topic only, as before.
* **Favourites: look in full width.** The fields of a favourite no longer
  start indented: text, background and icon colour as rows, the icon field on
  its own row, height, border and corner radius in one row, the border colour
  below.
* **Theme colors of the sidebar.** New group on *Sidebar › Appearance* with
  the six theme variables of the Home Assistant sidebar:
  `--sidebar-background-color`, `--sidebar-text-color`, `--sidebar-icon-color`,
  `--sidebar-selected-icon-color` (icon, text and highlight of the selected
  entry), `--sidebar-menu-button-background-color` and
  `--sidebar-menu-button-text-color` (the top area with the title). Dark and
  light, part of the theme (`THEME_VARIABLES`, now 80), so they are registered,
  exported and imported with it; changes count for the Sidebar area. The
  injector sets the values of the Appearance page on the sidebar itself, so
  they take precedence. The sidebar preview follows these variables.
* **Overview box (counters).** `settings.monitor_counts` (default off),
  `monitor_counts_place` (`top` / `end`) and `monitor_counts_items` (the
  counters shown, default all eleven). Counted: devices (`hass.devices`, else
  `config/device_registry/list`), entities (states; below: unavailable),
  integrations (`config_entries/get`, distinct domains; below: entries), apps
  (Supervisor `/addons`), automations (below: on), scenes, scripts, custom
  cards (`lovelace/resources` of type `module`; below: all resources),
  blueprints (`blueprint/list` for automation and script), users
  (`config/auth/list` without system users) and tokens (`auth/refresh_tokens`,
  type `long_lived_access_token` - the tokens of the signed-in user). Each
  question on its own; a missing value stays "–". At the top the box stands
  behind system monitor and backup box, at the end before the tip. Cells flow
  in rows (at least 116 px each). A click opens the page of the counter.
* **Calmer highlight boxes.** *Developed by* (Info) and *Complete
  configuration* (Export / Import) are tinted with the primary colour of the
  theme instead of being drawn in the text colour (white on a dark theme).

## 1.4.3

* **HA-Settings: Simple / All fields.** Next to the title of the HA-Settings
  column, shown on the Settings page (not on *Devices & services* and
  *Tables*). *Simple* hides box and icon size, *Border and corners of the menu
  entries*, the mouse hover and the graphs of the system monitor as long as
  they are on their default.
* **Accordion switch.** An icon switch next to *Simple / All* on the Theme,
  Header and HA-Settings pages. Accordion (the default): opening a group - by
  a click in the column or in the preview - closes the other groups of the
  same column; when a page is built only one group per column is open. Off:
  groups open individually as before. Stored per browser (`localStorage`
  `ha-style-hub-accordion`).
* **Menu icon centred.** In the collapsed sidebar of the preview the menu icon
  at the top is centred, as the injector does it in Home Assistant (also with a
  wider *Width collapsed*).
* **Fixed height.** The panel takes the height of the window (`100dvh`, or the
  height Home Assistant gives it, whichever is smaller). The preview keeps its
  size whatever groups are open; the field column scrolls in itself. This also
  removes the edge below the panel when it was shorter than the window.

## 1.4.2

* **Sidebar preview: mouse hover and scrollbar.** The hover colours from
  *Appearance* (background with opacity, text, icon) now show when the mouse
  is over an entry in the preview - as in the injector, an own hover
  background replaces the entry background. With *Hide the scrollbars*
  (*Layout › Behaviour*) the preview has no scrollbar either.
* **Theme colors of the header on the Header page.** The four theme
  variables of the header (`--app-header-background-color`,
  `--app-header-text-color`, `--app-header-border-bottom`, `--app-theme-color`)
  left the Theme page (*Simple / All 14 groups*) and are now the group *Theme
  colors of the header* on the Header page, with its own *Dark / Light* switch
  (the same mode as on the Theme page). They still belong to the theme and are
  stored, exported and imported with it; changes count for the Header area.
* **Theme: card *Card design*.** A new card in the preview (below *Sliders and
  badges*) opens the group *Cards*: border, colour, corners, shadow and title
  size of all cards.
* **Choose a palette.** The button *Palette from one color* is now called
  *Choose a palette* and fits in one line.
* **HA-Settings › Tables: Row color.** New `settings.table_row_background`
  (default empty): the background of every data row of the tables
  (`.mdc-data-table__row[aria-rowindex]`, selected rows excepted); *Colour of
  every second row* lies on top of it. Works without registering the theme.
* **Group titles stand out.** The titles of the foldable groups in the field
  column are tinted with the primary colour of the Home Assistant theme, a
  little stronger while the group is open.
* **Field column 438 px** on a PC (was 418 px).
* **Background of the theme.** The area around the preview uses the page
  background of the Home Assistant theme (`--primary-background-color`)
  instead of a slightly lighter shade, so the panel no longer shows an edge
  where it ends.

## 1.4.1

* **Sidebar in the previews.** On *Theme*, *Header* and *HA-Settings* the
  sidebar stands collapsed next to the model (as wide as *Width collapsed*,
  headings hidden, inner padding at most 4 px - as the injector draws it). A
  click on it, or on the new sign *Sidebar page ↗* below the preview, leads to
  the Sidebar page; *Expanded / Collapsed* only remains there.
* **Sidebar page: header and cards lead on.** The header bar and the cards of
  the sketched dashboard next to the sidebar are clickable (*Header page ↗*,
  *Cards and background · Theme ↗*) and open the Header page or the Theme page
  with the cards selected.
* **Sidebar preview closer to the injector.** Gap and inner padding of the
  list, the gap between icon and text of tiles (`tile_gap`), tile padding
  6 px 2 px, labels on two lines, headings as the injector draws them (14 px 12 px
  4 px, 11 px, weight 500, `.06em` upper case unless switched off, opacity .75,
  icon 16 px, caret on the right; height, background, colours, borders and
  corners of a heading), the default border colour of the entries
  (`--divider-color`) and Home Assistant's 1 px divider on the right of the
  sidebar as long as no own border is set.
* **The panel fits the window.** The preview is flexible in height (at least
  300 px), so its foot with *Before* and the switches below it stays in view;
  the field column is 418 px wide on a PC (was 404 px).
* **Theme: one element at a time.** With *All 15 groups* a click on another
  element closes the groups of the previous one before its own group opens.
* **Header preview like a dashboard.** Five icon tabs, two text tabs and two
  tabs with icon and text, no title; CPU and memory stacked (small label above
  the value); the four buttons of Home Assistant - add (+), search, Assist and
  edit (pencil) - each follows its *hide* switch.
* **Header: Show storage space.** New `header.show_disk` (default off) below
  *Show CPU and memory in the header*: the free and the used disk space
  (*Free* / *Used*, GB with one decimal) in the same block in front of the
  buttons. The values come from the Supervisor (`/host/info`) or, without one,
  from `ha_style_hub/disk` - both administrators only - and are refreshed every
  minute; a value that is missing is left out. A click opens the hardware page
  (with CPU / memory) or the storage page. Header templates keep CPU / memory
  and storage space. The card *Buttons and links on the right* is now *Buttons
  on the right side*.
* **HA-Settings: page switch at the top.** *Settings page / Devices & services /
  Tables* moved from below the preview to the top of the field column, in the
  style of *Layout / Entries / Appearance*; the topic below it names what is
  shown.
* **HA-Settings preview.** System monitor and backup are two boxes of their own
  with the same gap as to the menu blocks; favourites in the header bar are
  centred (as the injector places them); the tip line below the menu is shown
  and opens the menu entries.
* **Hover for system monitor and backup.** The *Mouse Hover* of the menu entries
  (`menu_hover_background`, `menu_hover_opacity`) also applies to the fields of
  the system monitor and of the backup box (`.shm-cell:hover`), in the preview
  as well.
* **Hide the tip below the menu.** New `settings.hide_tip` (default off) in the
  menu entries: hides `ha-tip` on the Settings page.
* **Devices & services: columns as buttons.** *1 / 2 / 3* instead of the two
  checkboxes *Two columns* / *Three columns*; stored as before in
  `list_two_columns` / `list_three_columns`, so existing configurations keep
  working. *Background colour of the rows* now sits next to *Maximum width of
  the list*.
* **Bigger previews for Devices & services and tables.** The list shows 15
  integrations, the table four areas with 13 rows and a *State* column.
* **Kiosk mode at the bottom of the column.** *Hide the sidebar completely
  (kiosk mode)* moved from the box *Advanced* to the bottom of the *Layout*
  column, styled like *Hide the header completely (kiosk mode)* on the Header
  page (the box *Advanced* is gone). The header switch got *(kiosk mode)* in
  its name.
* **Colour fields next to number fields** (e.g. *Border and corners of the menu
  entries*) take the width of their column instead of running into the next
  field. The fields of a section heading under *Entries*: height, border and
  corner radius in one row, the border colour below as a row of its own.

## 1.4.0

* **New layout of the panel ("stage").** A bar at the top instead of tabs: the
  four areas *Sidebar / Theme / Header / HA-Settings*, the search over all
  settings, the counter of unsaved changes, *Discard*, *Save*, the history and
  two icons for *Export / Import* and *Info*. Each page shows a model of Home
  Assistant on the left and a fixed column with the fields on the right (404 px
  on a PC). The panel uses the font and the colours of the active Home
  Assistant theme; text on the primary colour is chosen light or dark by its
  contrast (WCAG). The last opened page is remembered per browser
  (`localStorage` `ha-style-hub-page`); the very first visit opens the info
  page.
* **Click in the preview.** What is clicked in the model opens its fields; the
  chosen part is outlined and labelled (*"... · selected"*). *Before* below the
  preview shows the saved state (all previews at once), any change switches it
  off.
* **Changes are visible.** A changed field carries a dot and *"changed, before
  X"*; groups show *"n changed"*, the areas in the bar count along. Fields sit
  in groups that fold open and closed; what you fold yourself is remembered
  (`localStorage` `ha-style-hub-groups`).
* **Sidebar:** *Layout / Entries / Appearance* at the top of the field column.
  *Entries:* the chosen entry folds open in the list (name, icon, column width,
  colours as tiles, hide, up / down, remove, *Reset*); a click in the preview
  selects an entry, dragging it there reorders it. *Appearance:* a click on
  title, entries, badge, notifications or background opens the group.
  *Expanded / Collapsed* below the preview.
* **Theme:** the preview shows all colourable elements; each opens its groups
  from `THEME_GROUPS` (`THEME_SPOTS`). *Simple / All 15 groups*; *Palette from
  one color* and *Templates* as dialogs; *Dark / Light*, *Copy to light* and
  *Clear this mode* below the preview; name, *register* and *default* at the
  bottom of the column. Sidebar and header in the preview lead to their pages.
* **Header:** the header bar is selected; view tabs, title and buttons open
  their group. *Simple / All fields* hides rarely used fields that are still on
  their default. *Templates* (*Glass / Slim / Detached*) as a dialog, *Hide the
  header completely* at the bottom. Opacity and blur are sliders.
* **HA-Settings:** the preview shows the Settings page, *Devices & services*
  or a table (switch below the preview); menu entries, favourites bar and system
  monitor are clickable. *Border and corners* and *Mouse Hover* of the menu
  entries are open from the start.
* **Export / Import** on one page. New: **export and import of the sidebar
  alone** (`{version, sidebar: {layout, appearance, order, items}}`,
  `ha-style-hub-sidebar-DATE.json`); a complete export is accepted too, and the
  complete import also takes a sidebar file. *Hide the sidebar* stays as it is.
* **Info** page: welcome text in four areas, author and links (GitHub, issues,
  documentation), support (Ko-fi, PayPal), *HA Style Hub active*, debug output
  and *Reset everything* (moved here from the box *HA Style Hub Settings*).
* **Tablet** (panel narrower than 1180 px): search as an icon, narrower field
  column, *Entries* shows the entry or the list. **Phone** (narrower than
  700 px): areas in a bar at the bottom, counter / *Discard* / *Save* / history
  above it. Decided by the width of the panel (container queries), not of the
  window.
* Unchanged: configuration, keys, storage, injector and backend. Tests adapted
  to the new structure, new `v140.mjs`.

## 1.3.9

* **Page *Settings › System*.** `ha-config-system-navigation` is recognised like
  the Settings page: its navigation list sits directly in the page (without
  `ha-config-navigation` in between). It gets the width of `ha-config-section`
  and the columns and tiles of `settings.menu_columns` / `settings.menu_tiles`
  (`buildMenuLayoutCss(s, true)` leaves out order and hidden entries). The
  element is hooked like the others, so the layout is there with the first
  drawing.
* **Favourites.** Centred (`justify-content: center`). New
  `settings.favorites_place` (`page` / `header`): with `header` the bar hangs
  in the slot `title` of `ha-top-app-bar-fixed` and is positioned absolutely in
  the middle of the header bar; a second bar in the old place is only visible
  below 1000 px. Each favourite now carries its look (`DEFAULT_FAVORITE`:
  `text_color`, `background`, `height`, `border_color`, `border_width`,
  `border_split` + four sides, `radius`, `radius_split` + four corners,
  `uppercase`, `icon_only`; `color` stays the icon colour). The values become CSS variables
  on the button (`favoriteStyle()`), the defaults per place are in the
  stylesheet. Checked in `store.py` (`_clean_favorites`), injector and panel
  (`cleanFavorites`): colours as short strings, sizes -1 to 80 (corners to
  200), switches only as booleans; the first entry of a path wins.
* **System monitor** (`settings.monitor`, `monitor_place` `top` / `end`,
  `monitor_graphs`): a `<div class="sh-monitor">` in `ha-config-section` -
  first child (before Lit's markers) or before `ha-tip`. CPU and memory from
  `hardware/subscribe_system_status`, subscribed only while a monitor or the
  header needs the values and released 20 s after the last one is gone; the
  last 60 values are kept in the `sessionStorage` of the tab
  (`ha-style-hub-system`). Storage from `supervisor/api` `/host/info` when
  `hassio` is loaded, otherwise from the new command `ha_style_hub/disk`
  (administrators, `shutil.disk_usage` of the configuration folder, GB =
  1024³ bytes). Graphs as SVG paths, the layout follows its own width
  (container query). If the subscription fails (for example while Home
  Assistant is still starting), it is tried again at most every 30 s; a value
  older than 30 s is not shown as current.
* **Last backup** (`settings.monitor_backup`, `monitor_backup_place`): a
  `<div class="sh-backup">` with four fields, placed like the monitor (behind it
  when both are at the same place). Data from `backup/info` (newest backup by
  date, `next_automatic_backup`) and `backup/agents/info` (names of the
  locations), both for administrators; read when the page is shown and every
  5 minutes. Size: the largest file of all locations, 1024-based.
* **Menu entries: hover** (`settings.menu_hover_background`,
  `menu_hover_opacity`): `ha-list-item-button:hover::part(base)` gets the
  colour, the ripple of Home Assistant is muted.
* **Header:** `header.show_system` - CPU and memory in `.action-items` in front
  of the own buttons; new values only change text nodes, so the observer of
  the header is not woken up.
* The bar above the cards keeps 12 px from the header bar and sits closer to
  the first card (`margin: 44px 0 -24px`).
* 64 settings keys, 43 header keys. The panel has a new card *System monitor*
  (top of the right column) and a position selection for the favourites; each
  favourite folds out like a section heading. Columns and tiles moved to the
  end of the card *Menu entries of the Settings page*; the card for order and
  favourites is now called *Settings page: order and favourites*.

## 1.3.8

* **The Settings page itself (`ha-config-dashboard`).** Four new parts, all in
  the group `settings` (56 settings keys):
  * `settings.menu_order` / `settings.menu_hidden`: lists of paths. Every
    `ha-list-item-button` of the navigation lists gets its path as
    `data-sh-menu`; the order is a CSS `order` on the entry, hiding is
    `display: none`. Nothing is moved in the DOM, so Lit keeps drawing as
    before. Home Assistant draws the entries in several cards with a list
    each - an order therefore only works inside a block. A card whose entries
    are all hidden gets `data-sh-empty` and is hidden as well. The lists are
    checked in `store.py` (`_clean_paths`), in the injector and in the panel:
    only paths inside Home Assistant, each once, at most 80.
  * `settings.menu_columns` (1-3) and `settings.menu_tiles`: a grid on
    `ha-list-nav::part(base)`, the page width on `ha-config-section` (960 /
    1280 px), tiles through the parts of `ha-list-item-button`.
  * `settings.favorites`: a list like `header.links` (`{path, name, icon,
    color}`, at most 12). The injector puts a `<div class="sh-favorites">`
    into the `header` slot of `ha-config-section`.
  * The injector remembers the menu entries it finds (path and name, per
    block) in the `localStorage` of the browser (`ha-style-hub-menu`); the
    panel reads them for its list and falls back to a standard list.
* **Tables: rows.** `settings.table_zebra`, `settings.table_hover_background`,
  `settings.table_hover_opacity` and `settings.table_font_size` for
  `ha-data-table`. Stripes go by `aria-rowindex` (group headers have none), the
  hover colour is a `background-image`, so stripes and the selection stay
  underneath.
* Panel: new card *Settings page: order, columns and favourites* (since 1.3.9
  *Settings page: order and favourites*); the card of
  the tables is now called *Tables: group headers and rows*. The dialog of the
  links has a third mode for favourites. Export and import of the HA-Settings
  include the new lists.
* **New logo.** `www/ha-style-hub-logo.png` (100 × 88 px), `brand/icon.png`
  (256 × 256 px) and `brand/logo.png` (290 × 256 px), made from
  `docs/logo.png`.

## 1.3.7

* **Own buttons in the dashboard header.** `applyHeaderButtons()` appends
  plain `<button class="sh-header-button">` elements to `.action-items` of
  `hui-root` - at the end, behind Lit's markers - and moves them in front of
  Home Assistant's buttons with `order` (the bar is a flex container). The
  observer over the header puts them back when Home Assistant redraws the bar.
  They are hidden in edit mode and not created while the header is hidden or
  the integration is switched off. Icon colour, icon size and the border
  around the buttons apply to them too.
  * `header.show_restart`: the restart button (administrators only, with the
    confirmation of the sidebar entry; name and icon are taken from the item
    `action:restart` if set).
  * `header.links`: a list of `{path, name, icon, color}` - the first value of
    the configuration that is a list. It is checked in `store.py`
    (`_clean_header_links`), in the injector and in the panel
    (`cleanHeaderLinks`): only paths inside Home Assistant (`LINK_PATH`), each
    path once, at most 12, a valid icon name, short strings. Links below
    `/config` are only created for administrators. `default_config()` and
    every `normalize()` hand out a fresh list, never the one of the defaults.
  * Panel: the box *Buttons on the right* has the new checkbox and a list of
    the links with a plus. The plus opens the dialog of the sidebar entries in
    a header mode (link only). A header preset and the import of an older
    header export keep restart button and links.
* **Hover for the view tabs.** `header.tab_hover_background` and
  `header.tab_hover_opacity`: a background on `ha-tab-group-tab:hover` (and the
  older tab elements), mixed with `color-mix` as in the sidebar.
* 42 header keys.

## 1.3.6

* **List view in two or three columns.** New `settings.list_two_columns` and
  `settings.list_three_columns` (47 settings keys). Only one applies; the panel
  unchecks the other one, and if both arrive set (an edited import) three
  columns win. The container gets
  `repeat(auto-fill, minmax(max(min(100%, 260px), calc((100% - gaps) / N - 0.5px)), 1fr))`:
  at most N columns of equal width, fewer as soon as a column would get
  narrower than 260 px. Row height, gap, maximum width, border, background and
  hover work as before; with `list_apps` the Apps page follows. The preview in
  the panel shows the columns.
* **Links as sidebar entries.** A third kind of entry the injector adds itself,
  next to the section headings and the restart button. The key carries the
  target: `link:/config/automation`. There is no new field - the entry uses the
  defaults of a normal entry (`name`, `icon`, `hidden`, `span`, colours,
  `parent`), so order, hiding, renaming, colours and headings need no special
  case.
  * Injector: `applyLinks()` creates one element of the running sidebar
    generation per link (`data-sh-key`, `data-sh-link`). A click writes the
    address into the history and fires `location-changed`, the way Home
    Assistant navigates itself - no page reload; Ctrl/Cmd/Shift click and the
    middle button open a new tab. The link of the current page (or of a page
    below it) gets the class `selected`. In the narrow layout the drawer is
    closed afterwards (`hass-toggle-menu`).
  * Only paths inside Home Assistant are accepted: `LINK_PATH` asks for a
    leading `/`, no second one, and plain URL characters. Anything else in the
    configuration is ignored. Links below `/config` are not created for users
    without admin rights.
  * Panel: the plus opens the dialog `#add-modal` with the section heading and
    a grouped `<select>` (`LINK_GROUPS`, 36 pages; paths and icons as in
    `config-sections.ts` and the tools tabs of the current frontend) plus *Own
    path*. A full address pasted from the browser is reduced to its path. Name
    and icon are written into the entry when it is created; links that already
    exist are disabled in the list. A link row has the eye and a bin.

## 1.3.5

* **Styles are written while the element is drawn.** Until now the injector
  looked for the elements of the settings pages after a navigation and again
  every 150 ms; in between the browser painted the original design. Now it
  hooks into the element classes, the same way
  [UIX](https://github.com/Lint-Free-Technology/uix) (the successor of
  card-mod) does: `customElements.whenDefined(tag)`, then the method `updated`
  of the class is wrapped. Lit calls it after every render, in the same task,
  so the stylesheet is in place before the browser paints. UIX is not needed
  and nothing of it is used - only the approach is the same.
  * Hooked: `ha-integration-card`, `ha-integration-header`,
    `ha-config-navigation-list`, `ha-data-table`, `ha-config-apps-installed`,
    `supervisor-apps-card-content` (`styleSettingsElement()`) and `hui-root`
    (`styleHeaderElement()`). The container of the integration cards is found
    through the card (its root node), so its tag name does not matter.
  * The original `updated` always runs first and unchanged; an error in the
    integration's part is swallowed. Each element reports its first three
    renders only. The state lives in `window.__haStyleHubHooked`, so a second
    copy of the script does not wrap a class twice, and the call always goes to
    the copy loaded last.
  * The polling (`scheduleSettingsPage()`, `scheduleHeader()`) stays as a
    fallback - for elements that already existed and in case a frontend update
    changes how the elements render. Both paths share
    `classifySettingsRoot()` / `putSettingsSheets()`; the CSS of the settings
    pages is cached until the configuration changes.
  * Debug: the `[settings]` line now also shows `writtenWhileDrawing` and which
    classes are hooked.
* **Remembered configuration.** The configuration read from the server is kept
  in `localStorage` (`ha-style-hub-config`) and used until the server has
  answered after a reload. The live preview of the panel is not stored. If the
  server does not know the command (integration removed), the remembered state
  is dropped.
* **"HA Style Hub active".** `advanced.enabled` switches off sidebar, header
  and HA settings (only a registered theme stays), so it is called *HA Style Hub
  active* again and sits in *HA Style Hub Settings*, above the debug switch.
  *Advanced* only holds *Hide the sidebar (kiosk mode)*. No key changed.
* **The box *HA Style Hub Settings* folds.** A click on its heading closes or
  opens it (`data-fold="hub-settings"`), like the welcome box. The state is
  kept per browser, not in the configuration. The triangle that marks a
  foldable box is larger (24 px instead of 13 px) and takes the color of the
  heading.
* **New logo.** `www/ha-style-hub-logo.png` (101 × 88 px), `brand/icon.png`
  (256 × 256 px) and `brand/logo.png` (293 × 256 px), made from
  `docs/logo.png`.

## 1.3.4

* **Sidebar › Layout, right column.** Three boxes instead of two: *Advanced*
  (`advanced.enabled` and `layout.hide_sidebar`, moved here from the layout
  box), *Export and import (JSON)*, and *HA Style Hub Settings* (debug switch
  and the reset of the whole configuration, orange heading). No key changed -
  only where the fields sit.
* **Debug output for all four areas.** `debug(area, text, detail)` in the
  injector writes `[HA Style Hub] [sidebar|theme|header|settings]` lines. A
  line is written once per area until it changes, so the polling of the
  settings pages and the sidebar observer do not flood the console.
  * `sidebar`: structure generation, expanded, entries, hidden entries,
    columns, look - or "switched off" / "hidden (kiosk mode)".
  * `theme`: name, whether Home Assistant knows the theme, which theme this
    browser uses, the server default, dark mode, number of values per mode.
  * `header`: whether a dashboard (`hui-root`) was found and the stylesheet
    written.
  * `settings`: the path, what is wanted (menu icons, rows, table groups, list
    view, apps list) and how many matching elements were found.

## 1.3.3

* **Collapsed sidebar: own tile and row height.** New layout keys
  `tile_height_collapsed` and `row_height_collapsed` (`0` = same as
  `tile_height` / `row_height`). The injector passes the height per scope
  (`:host([expanded])` / `:host(:not([expanded]))`) into `tileRules()` /
  `rowRules()`; expanded keeps the old keys.
* **List view: row background.** New `settings.list_background` (colour or
  gradient, empty = Home Assistant). A colour goes into `background-color`, a
  gradient into `background` and is layered under the hover tint. Applies to
  Devices & services and, with `list_apps`, to the Apps page. Part of the
  preview, the JSON export/import and the key checks (45 settings keys).
* **Reset.** `ha_style_hub/reset` replaces the stored configuration with
  `default_config()` - sidebar (layout, appearance, entries, order), theme (and
  its registered HA theme), header, HA settings, both kiosk-mode switches - and
  writes a history entry. The button now sits in its own box (`.danger-zone`,
  orange) with an info text and a clearer confirmation.
* **Theme page.** The label *Bearbeiteter Modus* is now *Modus* (*Mode*), and
  the mode bar (switch, copy, clear) stays in one row from a card width of
  about 440 px.
* **Wording.** *Sidebar ausblenden (kiosk-mode)*, *Header ausblenden
  (kiosk-mode)*, *Headermenu des Dashboards*; the same in English and in the
  names of the two switch entities.

## 1.3.2

A review of the whole code, no new functions. Every fix has a check in
`bugs132.mjs` / `bugs_py.py` that fails on 1.3.1.

* **Panel: saving without a loaded configuration.** `_save()` had no guard, and
  a failed `ha_style_hub/get` fell back to the defaults and marked them as
  loaded - the next save would have replaced the stored configuration. Saving
  is now refused (`_loadFailed`), with a message.
* **Panel: save takes over what the server stored.** `store.py` turns theme
  numbers into text and an empty theme name into the default; the page kept its
  own values, so the history did not recognise the newest entry as the current
  state. Number fields of the theme now write text as well.
* **Panel: the two switches.** `header.hidden` and `layout.hide_sidebar` are
  also switch entities. Before saving, the page reads them again and takes the
  server value unless they were changed on the page (`_takeSwitches()`).
* **Panel: imports.** The main import wrote its error into the theme dialog
  (first `.modal-error` in the document); it accepted any object and reset
  everything the file did not contain - it now needs at least one known section
  and replaces only the sections present. A theme import with no known
  variable emptied both modes before reporting the error. The header import
  treated `"false"` as true, an empty number as 0 and accepted a file holding
  only `hidden`. The YAML reader dropped `primary-color: #03a9f4 # comment`.
  An empty theme is no longer exported as a name without a body.
* **Panel: entry list.** `_move()` let an entry jump above its own heading and
  never updated `parent` (`_leaveGroup()` now clears it when the entry is no
  longer directly inside its group); `_dropBefore()` moved a heading dropped on
  its own child to the end; `_childrenOf()` created default item configs as a
  side effect. The delegated `input` handler stored `"on"` for check boxes and a
  key `undefined` for the icon picker.
* **Panel: empty number fields** go back to the default of the field instead of
  0 (`_defaultOf()`); 0 is a real value for the opacities.
* **Panel: small things.** One timer for the status message (errors stay 5 s),
  feedback when a reset fails, header and history dialog close on a click on
  the backdrop, built in panels are named through `panel.<title>` like the
  sidebar does (not verified against a running Home Assistant).
* **Injector: values in CSS.** A new `css()` drops values with `;`, braces,
  comments, a backslash, a line break or unbalanced brackets / quotes before
  they reach a declaration; names, icons and the free CSS field are not
  affected. `color-mix()` is only used for real colors (`CSS.supports`).
* **Injector: stylesheets.** `bindSidebar()` no longer forgets the sheets of
  roots that survive a new sidebar (`<home-assistant>`, drawer, `hui-root`,
  notification drawer) - their old CSS stayed adopted and could not be changed
  any more. The list of sheets is pruned of detached roots. The header CSS
  respects `advanced.enabled`.
* **Injector: sidebar.** Collapsed headings only hide their entries while the
  heading exists, is visible and collapsible; headings react to Enter / Space;
  `applyName()` notices when Home Assistant changes a label and writes into the
  existing text node (`setText()`), so Lit can keep updating it; unlisted
  entries get `order: 100000` instead of 500; stale `data-sh-action` marks are
  removed; the old-version warning is logged once; `/config` is matched from
  the start of the path.
* **Backend.** New websocket command `ha_style_hub/subscribe` forwards saved
  configurations to every user - Home Assistant only lets administrators
  subscribe to the event directly; the injector falls back to the event when
  the command is missing. The upload view no longer prunes images (an unsaved
  earlier upload could be deleted) and takes `hass` from its constructor.
  `_with_unit()` / `_length()` use the same plain-number test as the panel
  (`nan`, `inf`, `1e3` no longer get `px`).
* **Removed:** four unused texts (`settings_preview`,
  `settings_icon_radius_hint`, `no_admin`, `copied`), two CSS rules that matched
  nothing, a duplicate key in `THEME_FALLBACK`, the unused `ownFallback`
  parameter, a dead `::part(end)` rule in the tile look.

## 1.3.1

* **Theme: dashboard background and state colors.** 22 new variables
  (`THEME_VARIABLES` in `const.py` and `THEME_GROUPS` in the panel, kept in step
  by `keys.py`). `--lovelace-background` is read by `hui-view-background`
  (`background: var(--view-background, var(--lovelace-background,
  var(--primary-background-color)))`), so any CSS background value is valid.
  The state colors are the names the frontend looks up for an entity:
  `--state-<domain>-<state>-color`, then `--state-<domain>-active|inactive-color`,
  then `--state-active|inactive-color`. Home Assistant defines a color for most
  domains in its own CSS (for example `--state-light-active-color:
  var(--amber-color)`), so the generic `--state-active-color` is never reached
  for them - hence one field per type. Variable names with an underscore
  (`media_player`, `fan_only`, `alarm_control_panel`) are allowed now, also in
  the YAML import. Checked against frontend 20260826. The preview got a
  background for the dashboard view and twelve state icons whose fallback is
  Home Assistant's own color.
* **Theme: gradient for the dashboard background.** A tick box *Use a gradient*
  under the dashboard background shows a second color and a direction (the same
  nine choices as the sidebar and the header). Stored per mode as the extras
  `dash_gradient`, `dash_color2`, `dash_direction`; the field
  `--lovelace-background` stays "color 1". `theme.background_value()` composes
  the final CSS (`linear-gradient(<direction>, <color 1>, <color 2>)`, or
  `radial-gradient(circle at 50% 0%, ...)`), the panel does the same in
  `backgroundValue()` for the preview and the YAML export, and `keys.py` plus a
  test with 13 cases make sure both produce the same string. A missing color
  falls back to `var(--primary-background-color)` / `var(--secondary-background-color)`.
* **Theme: background image upload.** A file dialog instead of a typed path. The
  panel POSTs the raw bytes to `/api/ha_style_hub/background` (authenticated,
  admin only, up to 8 MB, type detected from the first bytes: PNG, JPEG, GIF,
  WebP). The file is stored as `<config>/www/ha_style_hub/background-<12 hex of
  the sha256>.<ext>` and answered with its URL `/ha_style_hub-media/<name>`,
  which the integration serves through its own static path (created at setup;
  `/local` is not used because it only exists when `www` was there at start).
  Only that exact URL shape is accepted into the theme (`is_media_url()`),
  because it ends up inside `url('...')`. Extras: `dash_image`,
  `dash_image_size` (empty = cover, `contain`, `tile`), `dash_image_scroll`
  (default: `fixed`). The image is the top layer of the background, the
  gradient or color below it. Unused files are pruned on save, reset and upload
  (never files younger than ten minutes, never files that the config or the
  history still refer to, never files that do not match our name pattern);
  uninstalling the integration removes the images. In the panel preview the
  image uses `scroll` instead of `fixed`, because `fixed` would be positioned
  against the browser window, not the little preview.
* **HA-Settings: group headers of tables.** Four new keys
  (`table_group_background`, `table_group_color`, `table_group_size`,
  `table_group_weight`). The stylesheet goes into the shadow root of every
  `ha-data-table` below `/config` and styles `.group-header` (a
  `div.mdc-data-table__cell.group-header`; Home Assistant gives it the page
  background and `--ha-font-weight-medium`). Size is limited to 8-40 px, weight
  to `normal`, `bold` or 100-900; anything else is ignored. A table that appears
  later is picked up by the same polling as the other settings pages.
* **HA-Settings: list view for apps.** New key `list_apps`. The *Apps* page is
  `ha-config-apps-installed`: a grid (`.content`) of `ha-card[role=button]`, each
  with a `supervisor-apps-card-content` that has its own shadow root (`.app` with
  icon, title and description, `.footer` with the state and the tags). Two
  stylesheets are written: one into the page (single column, row height, gap,
  maximum width, border, corners, hover) and one into each card content (one
  flex row, description with ellipsis, tags in front of the state, no footer
  line). The `supervisor-apps-card-content` elements of the page *Install app*
  are left alone because the check goes by the host of the surrounding root.
  The hover of Home Assistant (`ha-card:hover { background-color }`) is reset to
  the card color while a hover color is set, otherwise both would be visible.
* **Fix: color field after the reset button.** The small color field next to a
  text field was not reset when the field was cleared with the cross - the text
  and the saved value were, the swatch kept the old color. It now goes back to
  neutral gray, and it follows when a hex value is typed (also for the colors of
  the sidebar entries). A value the swatch cannot show (`rgb(...)`, a gradient)
  leaves it gray instead of black.
* **Fix: spacing below "Settings" in the tile look.** An entry with a counter
  bubble (Settings with updates, Notifications) makes Home Assistant show the
  `end` area of the row item (the list item base class `ha-row-item` hides it
  only while nothing is slotted into it). The bubble inside is hidden in the tile look, but the empty
  area stayed a third row of the tile: icon and label moved up by half a gap, so
  there was more room below the label than on tiles without a bubble. The area is
  now hidden in the tile look. In the row look it is still shown.
* **HA-Settings: new arrangement.** On a wide screen the card *Tables: group
  headers* now stands in the left column under the menu entries, the list view
  and the export in the right one (`break-before: column` on the list view
  card). On a narrow screen the cards stay in one column in the same order.
* **Theme: new arrangement.** The *Typography* group (font, scale, weight) sits
  directly after *Cards* instead of at the very end, so the two columns of the
  page end at about the same height. In `THEME_GROUPS` (panel) and
  `THEME_VARIABLES` (`const.py`) the three variables moved accordingly - `keys.py`
  checks that both orders stay the same.

## 1.3.0

* **List view of Devices & services: border.** Four new fields on the
  HA-Settings page: **border width** (0-8 px), **corner radius** (0-60 px),
  **border color** and **border color for problems**. Width and radius are
  stored as -1 when the field is empty (= as Home Assistant draws it), so that
  0 can mean "no border" and "sharp corners". Home Assistant marks integrations
  with a setup error, a failed unload or that are not loaded through the state
  classes `state-error`, `state-failed-unload` and `state-not-loaded` on the
  card; the problem color is set for exactly those. The normal border color is
  deliberately not applied to them, otherwise it would hide the red border. The
  fields only take effect while the list view is on. The preview contains one
  row in the problem state.
* **HA-Settings: border and corners per side, hover.** 26 new keys. The
  menu entries (`menu_*`) get a border and corners: the stylesheet goes into the
  root of `ha-config-navigation-list` and styles
  `ha-list-item-button::part(base)`, so the row is meant, not the icon. The rows
  of the list view (`list_*`) can set each side (`*_side_*`) and each corner
  (`*_corner_*`) separately; a side or corner left empty takes the overall
  value, or Home Assistant's own (1 px, `--ha-border-radius-lg`). The hover is
  laid over the whole card (`ha-card:hover`, a gradient of one color with
  `color-mix` for the opacity) and the ripple of Home Assistant, which only
  covers the left part of the row, is switched off while a hover color is set.
  The German labels "Abstand zw. den Zeilen (px)" and "Maximale Breite Liste
  (px)" are shorter so that the fields sit on one line.
* **Logo.** The panel header now starts with the logo (transparent, 44 px high,
  cropped copy of 128 × 88 px in `www/ha-style-hub-logo.png`, served next to the
  panel; if the file is missing the header simply stays without it). The same
  logo is shipped as `brand/icon.png` (256 × 256 px, square) and
  `brand/logo.png` (373 × 256 px), the local brand images that Home Assistant
  2026.3 and later prefer over the brands repository. The original stays in
  `docs/logo.png`.
* **HA-Settings: export and import (JSON).** A new card at the bottom of the
  page, like the one on the header page. Export writes
  `{ "version", "settings" }`; import accepts that, a complete configuration
  export (only `settings` is read) or the bare settings object. Values are
  brought to the type of the field (a hand-written `"60"` becomes 60, nonsense
  falls back to the default), missing keys take the default, unknown keys are
  dropped. The dialog can be closed with Cancel, Escape or a click beside it;
  nothing is saved before *Save*.

## 1.2.9

* **Fix: list view of Devices & services.** In 1.2.8 the card styles were
  written against an assumed structure of the integration card and were not
  applied on Home Assistant 2026.9, so every entry stayed two-line and the row
  height had no effect. The list view now follows the real markup of
  `ha-integration-card` (frontend 20260826.7): the card is a single row with
  the clickable header (logo and name) on the left and the action bar on the
  right: the integration symbols first, the count (such as "10 devices") at the
  far right. The count
  remains a link to the devices, the name a link to the integration. The
  injector puts one stylesheet each into the roots of the container, the card
  and the card's header, and leaves other pages that use the header untouched.
  The arrow at the end of the row and the divider above the action bar are
  hidden; the logo shrinks with small row heights (minimum row height 32 px).

## 1.2.8

* **HA-Settings - menu entries of the Settings page.** Besides the rounded boxes
  there are now fields for the **box color** (one color for all entries - handy
  for a one-color scheme), the **icon color**, the **box size** and the **icon
  size**. Home Assistant sets the background of every icon inline, so the box
  color is applied with `!important`; the size works through the padding around
  the icon, because the box has no size of its own.
* **New: list view for Devices & services.** The integration cards are laid out
  as slim rows (header left, count and symbols right) instead of the grid of
  cards. Row height, gap and maximum width can be set. The injector finds the
  page in the shadow DOM, puts a stylesheet into the roots of the container,
  the cards and their footers, and watches the container so that cards loaded
  later get the same treatment. Cards whose structure is not recognised keep
  their normal height.
* **Reworked HA-Settings page** in the style of the Layout page: folding
  introduction, one card per topic, a preview next to each.
* **Theme page:** a folding box across the full width holds *Basics*,
  *Templates* and *Color palette* next to each other. Below it the fields stay
  on the left, preview and export on the right.
* **Welcome text:** the tip is a green callout like *Important* and *Note*; the
  missing colon after *Wichtig* is back.
* Renamed: *"Einstellungen (Site) von Home Assistant"* and *"Menüpunkte als
  abgerundete Boxen"*. The English Import button on the theme page said
  *"Importieren"*; fixed.

## 1.2.7

* **Fix - the red dot in the header.** A small dot appeared in front of the
  first header entry as soon as a border around single elements was set. Home
  Assistant keeps an empty menu button (0 x 0 px) in the bar, and a real
  border, even a thin one, draws a dot on an element without a size. The
  borders of the buttons are now drawn as an inner shadow, which paints
  nothing on an empty element and cannot overwrite the line under the active
  tab. The spacing between the buttons comes from `gap` instead of margins.
* **New menu entry HA-Settings** with the first function *Icons as rounded
  boxes* for the Settings page, including a corner radius and a preview. The
  panel now has four sections. See [HA-Settings](../README.md#ha-settings).
* **Color palette from one color** on the Theme page - see
  [Choose a palette](../README.md#choose-a-palette).
* **History of the last saved states** with a restore function - see
  [The history](../README.md#the-history). It needs a second storage file
  (`ha_style_hub.history`) and a new websocket command (`ha_style_hub/history`,
  administrators only). Switching the header or the sidebar on or off through
  the switch entities is not recorded.
* The welcome text names the new menu entry, the palette and the history.

## 1.2.6

* **Fix - title size and font weight on the header page.** Home Assistant shows
  *either* the dashboard title *or* the view tabs in the header, never both.
  As soon as a dashboard has more than one view there is no title, and the tabs
  set their own font, so both fields seemed to do nothing. They now apply to
  the title **and** the view tabs. (The label reads *"Title and tab size"*.)
* **Background opacity (%)** for the header. The blur behind the bar was
  working, but it only blurs what is *behind* the bar - with a solid colour
  there is nothing to see. Set the opacity below 100 and it becomes visible; an
  empty background uses the colour of the theme. The hint for this used to
  exist only in the code and is now shown under the fields.
* **A border around each element of the header** - the buttons (menu, +,
  search, assist, pencil) and the view tabs - with colour, width and corner
  radius, each group switchable. The tabs get their border as an inner shadow,
  so the line under the active view stays where it is.
* The welcome text is 15 px.
* Two labels on the header page were borrowed from the sidebar (*"Border of the
  entries"*, *"Sidebar border color"*) and now say what they mean.
* New file [changelog.md](changelog.md).

## 1.2.5

* The **welcome text** is one pixel larger, and the *Important* and *Note*
  paragraphs sit in a callout box - a coloured bar on the left and a hint of
  background, the way GitHub marks a note. Visible, without pushing itself in
  front of the rest.
* **Save and Discard show their label again** when the mouse rests on them.
  The label is drawn by the panel itself rather than left to the browser's own
  tooltip: that one cannot be styled, takes its time and stays away entirely
  in some setups. Under the buttons in the header, above them in the footer,
  where there is no room below.
* Wording: the checkbox now reads *"Sidebar ausblenden"*, and the box on the
  header page is called *"HA Button rechts"* (German only - the English texts
  were already using "buttons").

## 1.2.4

* **The four buttons Home Assistant puts at the right end of the header** -
  *Add* (+), *Search*, *Assist* and *Edit dashboard* - can be switched off
  individually. Home Assistant only gives those buttons a running number
  (`button-0`, `button-1`, …), and which number is which depends on how many
  are visible, so each one is recognised by its icon instead. A button whose
  icon is not one of the four is left alone, and if Home Assistant ever
  changes an icon the matching checkbox simply stops having an effect -
  nothing breaks.
* **The welcome card and the theme card can be folded away.** The state is
  remembered per browser, so the welcome text only has to be read once and
  the preview on the theme page moves up.
* **Save and Discard are icons now** - a floppy disk and a curved arrow. They
  take less width and need no translation; the wording stays as a tooltip and
  for screen readers.
* The **welcome text** was rewritten and now explains the three areas, the two
  switch entities and how saving, discarding and resetting work.
* The **Export / Import / Reset** buttons under *Sidebar → Layout* got the same
  explaining line the theme and header boxes already had.

## 1.2.3

* **The whole sidebar can be hidden**, with a checkbox under *Sidebar →
  Layout* and as a second switch entity. The content beside it gets the space.
  You cannot lock yourself out: the panel stays reachable at `/ha-style-hub`,
  and the switch is in Home Assistant.
* **The header page fills the width** now, laid out like the theme page:
  the settings on the left, preview, templates and export on the right, with
  the preview staying in view while you scroll.
* **Three templates for the header** - *Glass*, *Slim* and *Detached* - that
  fill the fields with one click. Whether the bar is hidden is left alone:
  that is a separate decision, not a question of looks.
* **Export and import of the header settings as a `.json` file**, so a look can
  be passed on to somebody else. The import also reads a complete HA Style Hub
  export and takes only the header part out of it; the sidebar and the theme
  stay untouched.
* The **menu** shows the active item in the primary colour, the same accent the
  submenu uses, and the top level is two pixels larger than the submenu so the
  two levels are easy to tell apart. The menu bar itself moved off the Home
  Assistant header colour onto the card background - in the default theme that
  colour *is* the primary colour, and the active item would have been invisible
  on it.
* The **welcome text** mentions the header page and the two switch entities.

## 1.2.2

* **The menu was rebuilt.** *Sidebar*, *Theme* and *Header* sit next to each
  other at the top; *Sidebar* opens a submenu with *Layout*, *Entries* and
  *Appearance*. Switching away from the sidebar and back returns to the page
  that was last open there.
* **The header settings moved to a page of their own**, next to *Theme*. They
  never were part of the theme - the theme page splits everything into light
  and dark, the header settings apply to both modes at once - so a page of
  their own is where they belong.
* **Hiding the header is now a switch entity.** It appears under the device
  *HA Style Hub* and can be put on a dashboard as a button or used in an
  automation, instead of having to open the panel for it. The checkbox in the
  panel and the switch are two views of the same value and always agree: both
  save through exactly the same path, and every open browser updates at once.
* The subtitle of the panel now reads *"Configure your Sidebar, Theme &
  Header"*.

## 1.2.1

* **The dashboard header can be styled**, in a box of its own at the top of the
  *Theme* page, with a small live preview next to the fields: background
  (including a gradient), a blur behind it, height, text and icon colour, icon
  and title size, title weight, the colours of the view tabs, and a border and
  corner radius - one value or one per side and corner, like everywhere else.
* **The header can be hidden** with one switch. The content below moves up by
  itself: the height is set through `--header-height`, and Home Assistant
  computes the offset of the view from that same variable.
* While a dashboard is being **edited**, Home Assistant shows its own toolbar
  with Save and Exit. None of the above touches it, and hiding never applies
  there - without that toolbar there would be no way out of the editor. To open
  the editor while the bar is hidden, add `?edit=1` to the dashboard address.
* These settings are **not part of the theme** and therefore not split into
  light and dark: Home Assistant only offers three theme variables for the
  header, so everything else is done with CSS that the integration writes into
  the header's own shadow DOM. One set of values applies to both modes.

## 1.2.0

* **Theme templates.** Four finished looks - *Glass*, *Contrast*, *Flat* and
  *Warm* - each filling both modes with one click. A template only writes into
  the fields of the theme page: afterwards every value is editable as usual and
  nothing is stored until you press Save. It runs through the same code as the
  YAML import, so a template replaces the current values instead of mixing into
  them.
* **Optional restart button in the grid.** Home Assistant has no such button in
  its sidebar, this one is created by the integration. It is off by default,
  only administrators ever see it (nobody else may call the service behind it),
  and it always asks before it restarts (since 1.5.6 in its own dialog with a
  check of the configuration). It is a regular entry: name, icon,
  colours, column span, position and heading are set under *Entries* like for
  any other one.
* The **icon field moved into the expandable part** of an entry row, which now
  holds text colour and background in one line and icon colour and the icon
  picker below it. Home Assistant's icon picker brings its own height of about
  56 px and offers no lever to change it - in the main row it had undone the
  compaction of 1.1.9. Closed rows are 38 px again.
* **Section headings got a height and a capital-letters switch.** The height
  field is empty (0) by default, which keeps the old behaviour: the text
  decides the height, and the heading sits closer to its own entries than to
  the ones above. Any other value gives the line exactly that height and
  centres the text in it. Capital letters are still the default and can be
  switched off per heading, which also drops the letter spacing that only
  makes sense for them.
* **Fix:** a heading could change its height when its group was folded open or
  shut. A heading is a grid cell, and a grid cell grows to the height of its
  row - which depends on whatever sits next to it. Folding a group changes how
  the rows are laid out, and the heading grew or shrank with them. It now keeps
  its own height whatever its neighbours do.
* The theme page's export box is now **"Export and import (YAML)"** - importing
  has been in there since 1.1.5, the heading had not caught up.
* A theme still carrying the old project name *"Sidebar Hub"* is **renamed to
  "HA Style Hub"** when the configuration is loaded. Only that exact legacy
  name; a name of your own stays untouched. If you had selected the old theme in
  your user profile, pick it again there under its new name.

## 1.1.9

* **Fix:** the entry directly below a heading could not be filed under it. To
  assign an entry you had to drop it on a *different* row, and the natural
  gesture for that first entry is to pull it right where it already is - which
  the code treated as "nothing happened". Pulling right in place now works for
  every entry, and dropping an entry onto the heading itself files it directly
  behind that heading.
* The entry list is **considerably more compact**: rows went from 54 to 38 px
  and the gap between them was halved.
* `--dark-primary-color` is **back**, and both it and `--light-primary-color`
  are relabelled *"Primary color, dark shade"* and *"light shade"*. They are not
  the primary colour for dark and light mode - they are a darker and a lighter
  shade of the same colour, used side by side within one mode. Removing the
  dark one in 1.1.8 was done on a wrong assumption.

## 1.1.8

* **Entries can be filed under a heading.** Drag an entry a little to the right
  and it snaps in under the heading above it; drag it back to the left to take
  it out. A heading always takes its group along when it is moved.
* **Headings can be folded.** Switch *"Can be collapsed"* on in the heading row
  and a click on the heading in the sidebar folds its entries away. Which
  headings are folded is remembered **per browser** - it is a view, not a
  setting: storing it in the configuration would apply it to every user and
  every device at once, and saving is reserved for administrators, so a normal
  user could not fold anything.
* Headings got a **border and a corner radius**, each as one value or one per
  side and per corner.
* The **icon fields offer Home Assistant's own icon picker** when it can be
  loaded; otherwise they stay plain text fields.
* *"HA Style Hub active"* is now called **"Sidebar active"** - it only switches
  off what happens to the sidebar. A registered theme is untouched by it.
* `--dark-primary-color` is gone from the theme page. With a separate dark and
  light mode right there, the primary color is already set per mode.

## 1.1.7

* **The project is now called HA Style Hub.** It does more than the sidebar by
  now - the theme editor styles Home Assistant itself - and the old name no
  longer said that. The integration folder and the domain are called
  `ha_style_hub`, so Home Assistant sees a **new integration**: remove the old
  one, add the new one. Export your configuration first and import it after,
  nothing is carried over automatically.
* **Section headings.** The `+` in the *Entries* box adds a divider. It has a
  name, an icon and its own colors, runs across the full width, has no target,
  and disappears while the sidebar is collapsed. Drag it wherever it belongs;
  the bin icon removes it again.
* The **Theme** tab no longer has a second scrollbar. The right hand column
  stays on the right and only stays put while it fits on screen - when it does
  not, it simply scrolls along with the page.
* A GitHub workflow validates the repository with hassfest and HACS on every
  push, and a second one attaches a zip to every release so downloads are
  counted.

## 1.1.6

* A third preview card on the **Theme** tab shows a dialog on its scrim, a
  markdown code snippet and a code editor, so the *Dialogs and code* group is
  visible while it is being set instead of only in Home Assistant itself.
* Empty fields there follow Home Assistant's own fallbacks: the dialog surface
  and the code editor fall back to the card background, markdown code to the
  page background. Without a scrim color of its own, the preview darkens the
  backdrop the way Home Assistant does.
* The *Cards* group keeps its English name in German too - that is what these
  are called throughout Home Assistant.

## 1.1.5

* **Themes can be imported.** Pick a theme file on the **Theme** tab, or paste
  its contents: an export from here, a file out of your `themes` folder, or the
  `themes` block of a `configuration.yaml`. The values land in the fields and
  can be worked on right away, which is the point - bring an existing theme in
  and keep refining it here.
* Only the variables this page offers are taken over; anything else is left
  behind and counted, so it is clear what did not make it. `rgb-*` variables
  are not counted, Home Assistant derives those itself.
* A border or radius written as a four value shorthand
  (`0px 3px 3px 0px`) is split back into the four fields with the switch
  turned on, so it stays editable instead of sitting in one box as a string.
* If the file holds several themes, a dropdown appears to pick one.
* The import replaces the current theme rather than merging into it. The theme
  name stays as it is, and nothing is stored until **Save**.

## 1.1.4

* The wide layout is the default now - the switch for it is gone. Appearance,
  Theme and Layout use the full width and fall back to one column on a narrow
  screen by themselves.
* **The Advanced tab is gone.** Its two boxes moved to where they belong: the
  *Advanced* box to **Layout**, *Additional CSS* to **Appearance**. Four tabs
  are left: Layout, Entries, Appearance, Theme.
* A short introduction at the top of the **Layout** tab explains what the four
  tabs do and how saving works.
* **Fix:** font scale and font weight had no effect in the theme preview. The
  preview used fixed pixel sizes, so only the font family came through. It now
  starts from Home Assistant's own base (14 px times the scale) and everything
  inside it follows.
* **Fix:** a border width or corner radius typed as a plain number did nothing.
  CSS throws away a length without a unit, so "5" was simply dropped - it now
  becomes "5px". A value that already has a unit (`1rem`, a `var()`) is left
  alone, and the labels say px.
* The four values for the sides and the corners always sit in one row now,
  on the theme tab as well as on the appearance tab.
* The `rgb-*` variables are no longer written into the theme. Home Assistant
  derives them itself, from every hex value rather than the six that were
  hard coded here.

## 1.1.3

* The wide layout is now a setting of its own, in the **Advanced** box, and it
  only applies where it helps: **Appearance**, **Theme** and **Advanced**.
  Layout and Entries stay in one column.
* The cards no longer sit in a grid but flow like newspaper columns, so they
  follow each other directly instead of leaving a gap whenever the card next
  to them happens to be taller.
* **Theme:** the preview, the theme box and the export stay anchored on the
  right while the variables scroll on the left - no more scrolling back up to
  see what a color did.
* **Theme:** the *Sidebar* box is gone. The sidebar has its own tab, with far
  more settings than five theme variables.
* **Theme:** card border and corner radius can be set per side and per corner,
  with the same switches as on the appearance page.
* **Theme:** font, scale and weight are dropdowns now instead of free text.

## 1.1.2

* **New: a theme editor.** The new **Theme** tab builds a real Home Assistant
  theme from 57 variables in twelve groups, separately for dark and light. The
  theme is registered at runtime, so it shows up in the theme picker of every
  user profile without touching `configuration.yaml`. On request it is set as
  the default theme straight away.
* A **live preview** with two mock cards - a dashboard and a settings page -
  shows the values of the mode being edited. Empty fields are drawn the way
  Home Assistant itself would draw them.
* *"Copy to light / dark"* takes every value of one mode over to the other,
  *"Clear this mode"* empties it.
* **Theme export** as a `.yaml` file, ready for `configuration.yaml`.
* The `rgb-*` variants Home Assistant uses for transparent colors are derived
  from the hex values automatically.
* `frontend.reload_themes` replaces the whole theme list with what is in the
  YAML. HA Style Hub listens for that event and registers its theme again, so it
  cannot silently disappear.

## 1.1.1

* **Fix:** the info badge colors were lost again after a while. The panel did
  not know those two keys, so it dropped them every time it reloaded the
  configuration and then wrote that gap back on the next save. A check now
  compares the key sets of all three files against each other.
* **Fix:** the font weight had no effect. A dropdown hands its value back as a
  number, and the number was discarded further down the line.
* A menu button sits next to save and discard. It appears whenever Home
  Assistant hides the sidebar itself - on a narrow screen or with *"always
  hide the sidebar"* - so the sidebar stays reachable from this page.
* The configuration page can be shown in two columns on wide screens.
* A font can be picked for the sidebar, and the *"Text and icons"* box is
  rearranged: colors and icon size first, then the three font fields.
* Hover: a background opacity in percent, and the box is now called
  *"Mouse hover"*.

## 1.1.0

* New option *"Hide the scrollbar"* under **Layout**. The list still scrolls,
  only the bar disappears.
* Hover colors are configurable: background, text and icon while the mouse is
  over an entry. Setting a hover background switches off the stock ripple tint
  so the chosen color is the one on screen.
* The background gradient can be built from the GUI - a switch, a second color
  and a direction from a dropdown (eight linear directions plus radial). A
  gradient written by hand into the background field still works unchanged.

## 1.0.9

* The notification drawer got its own text colors - one for the body and one
  for the header text and icons. They only appear once the drawer option is
  switched on and fall back to the sidebar text color while empty. A dark
  header background no longer forces an unreadable title.
* Renamed *"Counter bubble"* to *"Info badge"*, which says more plainly what
  it is.

## 1.0.8

* In the tile look the counter bubble of *Settings* and *Notifications* now
  sits on the icon instead of below the label. Its background and text color
  can be set under *Appearance*.
* **Export** now saves a `.json` file instead of opening a browser prompt.
  **Import** opens a dialog with a file picker and a text box, and reports
  broken JSON inline instead of throwing away what was pasted.

## 1.0.7

* Save and discard moved into the header bar, where they are always in reach.
  The bottom bar now only appears when the page is long enough to scroll, so it
  no longer sits empty under short pages.
* New field *"Gap between icon and label"* for the tile look. It only shows up
  while the tile look can actually apply - in the row look the two sit side by
  side and need no extra room.
* **Fix:** hidden entries reappeared in the sidebar. Since 1.0.4 the tile and
  row rules set `display: flex` on a state-scoped selector, which outweighed
  the `display: none` of a hidden entry. The entry is now made a flex container
  once, in the general rule, where it cannot win over that.

## 1.0.6

* New field *"Title color"* in the header section - the sidebar title took the
  color of the header block and could not be set on its own.

## 1.0.5

* Entry borders can be set per side and the corner radius per corner, so a
  single line at the bottom or one rounded corner is possible. A switch next to
  each field opens the four individual values; with the switch off the single
  value applies to all sides as before.
* New option *"Style the notification drawer to match"*: the background, the
  header background and the text color carry over to the panel that opens from
  the notifications entry. Off by default.

## 1.0.4

* **Fix:** in the tile look the configured tile height was applied to the inner
  box of an entry instead of the entry itself. The entry is the grid item, so
  the grid row could end up shorter than its own content and the label was
  clipped - most visible while collapsed with *"Move Settings, Notifications
  and the user entry into the grid"* switched on. Tile and row height now sit
  on the entry, which is what sizes the row.

## 1.0.3

* The icons are now centred in the collapsed sidebar whenever the labels are
  hidden - previously they stayed at the left edge of the cell in the row look,
  with empty space next to them.
* The header block now follows a custom collapsed width. Home Assistant hard
  codes it to 56px while collapsed, so its background stopped short of the
  sidebar edge; the menu button is centred in it as well.
* Header subtitle changed, footer rearranged: buttons on the left, the status
  message on the right.
* The *"Additional CSS"* box shows a greyed out example while it is empty.

## 1.0.2

* **Fix:** *"Hide the labels while collapsed"* had no effect as soon as the
  collapsed sidebar used more than one column. The tile rules forced the label
  visible again, after the option had already been evaluated. The decision is
  now passed into those rules instead of being layered on top.
* Removed the option *"Keep the fixed block pinned to the bottom"*. It only
  ever did anything while *"Move Settings, Notifications and the user entry
  into the grid"* was off, and there Home Assistant's own behaviour is the
  sensible one anyway. Existing configurations simply drop the value.
* The *"Columns (collapsed)"* field now points out that more than one column
  needs a wider collapsed sidebar.

## 1.0.1

* **Fix:** the frontend module could give up with *"home-assistant element not
  found"* and then apply nothing at all. It looked up the `home-assistant`
  element before Home Assistant had upgraded it, so its shadow root was still
  missing. Every lookup now waits for the shadow root, and the module keeps
  retrying instead of giving up once.
* Startup messages are quieter: waiting is logged as debug, a warning only
  appears after several failed attempts.

## 1.0.0

* First release.
