# HA Style Hub

<p align="center">
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-custom-orange.svg" alt="HACS"></a>
  <a href="https://github.com/jayjojayson/HA-Style-Hub/releases"><img src="https://img.shields.io/badge/version-1.5.6-blue.svg" alt="Version"></a>
  <a href="https://github.com/jayjojayson/HA-Style-Hub/actions/workflows/validate.yml"><img src="https://github.com/jayjojayson/HA-Style-Hub/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <a href="https://github.com/jayjojayson/HA-Style-Hub/releases"><img src="https://img.shields.io/github/downloads/jayjojayson/HA-Style-Hub/total.svg" alt="Downloads"></a>
  <a href="https://github.com/jayjojayson/HA-Style-Hub/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jayjojayson/HA-Style-Hub.svg" alt="License"></a>
  <a href="docs/README_de.md"><img src="https://img.shields.io/badge/Sprache-Deutsch-red.svg" alt="Deutsch"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/language-English-blue.svg" alt="English"></a>
</p>

<p align="center">
If you like the app, I would be happy about a star rating ⭐. 🤗
</p>

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Ko--fi-Buy%20Me%20a%20Coffee-darkgreen?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/jayjojayson)
[![Support](https://img.shields.io/badge/%20-Support%20Me-darkgreen?style=flat&logo=paypal&logoColor=white)](https://www.paypal.me/quadFlyerFW)
</div>

Style Home Assistant from a graphical panel. The **sidebar** first: order, names,
icons, visibility, a multi column grid layout, section headings and the complete
look — including *Settings*, *Notifications* and the *user entry*, which Home
Assistant normally keeps pinned to the bottom. And then **Home Assistant itself**,
through a real theme built in the same panel.

📖 **Documentation: <https://jayjojayson.github.io/ha_style_hub/>** (English / Deutsch) · 🇩🇪 **Deutsche Anleitung: [README_de.md](docs/README_de.md)**

---

## Features

| | |
|---|---|
| 🧱 **Grid layout** | 1 to 4 columns while the sidebar is expanded, 1 to 3 while it is collapsed |
| 🔀 **Free order** | drag and drop, including Settings, Notifications and the user entry |
| 🏷️ **Section headings** | own dividers with a name, an icon, a border, a radius, a height and capital letters on or off, hidden while the sidebar is collapsed |
| 🗂️ **Groups** | drag an entry to the right to file it under a heading, then fold the whole block away with a click |
| 🪟 **Popup links** | one sidebar entry that opens a window with several pages - dashboards, panels or pages of the settings - or with a Lovelace card from your dashboard (YAML) |
| ✏️ **Rename** | give every entry your own label |
| 🎨 **Own icons** | any `mdi:` icon per entry |
| 👁️ **Hide** | switch entries off without removing the dashboard |
| 📐 **Width** | separate widths for the expanded and the collapsed sidebar |
| 🌈 **Appearance** | background and gradients (built from the GUI), hover colors, text and icon colors, font, size and weight, icon size, corner radius, borders |
| 🖼️ **Per entry styling** | own text, icon and background color, and a column span |
| 📐 **Borders per side** | border width per side and corner radius per corner |
| 🔔 **Notification drawer** | optionally styled to match the sidebar |
| 🌓 **Theme editor** | builds a real Home Assistant theme with 309 variables, dark and light - including the dashboard background (color, gradient or image) and the state colors per device type - with an anchored live preview, YAML export and import of existing themes |
| 🧭 **Dashboard header** | colours, gradient, opacity and blur, height, border, corners, a border around each button and tab, icon and title size, tab colours, the four buttons on the right, the bar at the top or at the bottom - and a switch that hides the bar completely |
| 🏠 **HA-Settings** | settings for Home Assistant itself: the menu entries of the Settings page as rounded boxes with your own colors and sizes, Devices & services (and optionally Apps) as a slim list instead of a grid, own colors and fonts for the group headers of the tables, striped rows, and the Settings page itself: order, hidden entries, own names, subtitles and icon colors per entry, columns, tiles, a favourites bar, a system monitor with own entities, the last backup with *Create backup now* and an overview with counters - the profile page and the page of an integration follow along |
| 🎨 **Choose a palette** | pick a main color and both theme modes are worked out from it - with text that stays readable |
| 🕘 **History** | the last 10 saved states with what changed and who saved; one click loads an earlier state back into the page |
| 🎚️ **Switch entities** | hiding the header and hiding the sidebar are real `switch` entities, so they can be put on a dashboard or used in an automation |
| 🙈 **Hide the sidebar** | the whole sidebar can disappear; the panel stays reachable at `/ha-style-hub` |
| 🖌️ **Theme templates** | four finished looks that fill both modes with one click, then stay editable |
| ⏻ **Restart button** | optional entry in the grid that restarts Home Assistant, for administrators only; a window in the look of your theme asks first and checks the configuration |
| 💾 **Export / import** | one page for everything: the complete configuration, or sidebar, theme (`.yaml`), header and HA-Settings on their own - as a file or pasted into a dialog |
| ⚡ **Live preview** | every change is visible immediately, saved only on demand; *Before* shows the saved state for comparison |
| 👆 **Click in the preview** | every page shows a model of Home Assistant - click what you want to change and its fields open next to it; on the Theme page down to a single element (a switch, a table row, a chart color) |
| 🔎 **Search** | finds every setting by its label (or theme variable) and jumps right to it - `Ctrl K` |
| 🔢 **Change counter** | unsaved changes counted per area, changed fields marked with their previous value |
| 🔄 **Instant sync** | after saving, every open browser updates through the event bus |
| 🧩 **No build step** | plain JavaScript, no npm, no bundler |

## Requirements

* Home Assistant **2025.3 or newer** (the grid needs the `ha-md-list` sidebar)
* Home Assistant **2026.5 or newer** for the full tile look (icon above the label)

The integration detects the sidebar generation at runtime and falls back
gracefully on older versions.

## Installation

### HACS (custom repository)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jayjojayson&repository=HA-Style-Hub&category=integration)

1. HACS → ⋮ → *Custom repositories*
2. Add `https://github.com/jayjojayson/HA-Style-Hub`, category *Integration*
3. Install **HA Style Hub**, then restart Home Assistant
4. *Settings → Devices & services → Add integration → HA Style Hub*

### Manual

1. Copy `custom_components/ha_style_hub` into your `config/custom_components/`
2. Restart Home Assistant
3. *Settings → Devices & services → Add integration → HA Style Hub*

Afterwards a **HA Style Hub** entry appears in the sidebar. It opens the
configuration panel.

## Usage

Since 1.4.0 every page of the panel is a **stage**: on the left a model of
Home Assistant, on the right a column with the fields. You click in the model
on what you want to change - an entry of the sidebar, the header bar, a card,
the menu entries of the Settings page - and its fields open on the right. The
chosen part is outlined and labelled (*"Cards · selected"*).

* **Bar at the top.** The four areas **Sidebar**, **Theme**, **Header** and
  **HA-Settings**, next to them the search over all settings. On the right the
  counter of unsaved changes (*"3 unsaved"*, or *"All saved"*), **Discard**,
  **Save** and the **clock icon** for the [history](#the-history), then the
  icons for **Export / Import** and **Info**.
* **Search.** Searches every setting by its label - on the theme page also by
  the CSS variable name (`Ctrl K`, on a Mac `⌘ K`). A hit opens the page,
  unfolds the group and marks the field.
* **Keyboard.** `Ctrl S` saves, `Ctrl Z` goes one step back (also after
  *Discard*), `Ctrl Y` or `Ctrl Shift Z` one step forward again - on a Mac with
  `⌘`. Typing in one field counts as one step. In the search and in open
  dialogs the browser's own undo stays.
* **Changes are visible.** A changed field carries a dot and the value it had
  before (*"changed, before 2"*); groups show *"2 changed"*, the areas in the
  bar count along. Groups fold open and closed; the browser remembers it.
* **Accordion.** The small icon switch next to *Simple / All* (Theme, Header,
  HA-Settings) and next to the title on *Sidebar › Appearance* chooses how groups open: as an accordion (default) only one
  group is open at a time - the one you clicked in the preview or in the
  column - or individually, so several can stay open. The browser remembers
  the choice.
* **Before.** The switch below every preview shows the saved state for
  comparison. Changing a field switches it off again.
* **Sidebar.** *Layout*, *Entries* and *Appearance* sit at the top of the
  field column. On *Entries* the chosen entry folds open right in the list:
  name, icon, column width, the colours as three tiles (icon, text,
  background - a click opens the field), hide, up / down, remove for headings
  and links, *Reset* back to the saved state. A click on an entry in the
  preview selects it, dragging it there reorders it; in the list you can drag
  as before (to the right to file it under a heading). On *Appearance* a click
  on a part of the sidebar (title, entries, badge, notifications, background)
  opens its group. Below the preview: *Expanded / Collapsed*; at the bottom of
  the *Layout* column **Hide the sidebar completely (kiosk mode)**. A click on the
  header or the cards of the dashboard next to it leads to the Header page or
  to the Theme page (cards). On the other pages the sidebar stands collapsed
  next to the model, as in Home Assistant; a click on it or on *↖ Sidebar page*
  at the bottom left of the preview (Theme, Header) leads to the Sidebar page.
* **Theme.** The preview shows every colourable element: cards, sliders and
  badges, state colours (devices, climate, security, weather), table, input
  fields, status colours, dialog and code, text and font, chart, energy,
  controls, dashboard background. A click opens the matching groups on the
  right; *Simple* shows only those, *All 24 groups* all of them. **Choose a palette** and **Templates** open a
  dialog. Below the preview *Dark / Light*, *Copy to light* and *Clear this
  mode*; at the bottom of the column the name of the theme, *Register the theme
  in Home Assistant* and *Use it as the default theme right away*. A click on
  the sidebar or the header bar in the preview leads to their own page; the
  card *Card design* opens the group *Cards* (border, colour, corners, shadow,
  title size of all cards). Inside the tiles every element can be clicked on
  its own - icons and switches, badge, slider and chips, every state color,
  table header and rows, input fields, status colors, the parts of the dialog
  and every color of the code, heading, text and link, chart lines, the 54
  chart colors, the energy bars and legend, the controls: all groups with its
  variables open (even with the accordion on) and its fields are marked
  briefly, like a hit of the search. The tile carries the name of the element
  (*"Dialog and code: Property · selected"*); a click next to the elements
  selects the whole tile as before.
* **Header.** The header bar is selected in the preview - like most dashboards
  with view tabs of icons, text and icon plus text; a click on the view tabs or
  the buttons opens their group. *Simple* shows only the group selected in
  the preview expanded, *All fields* expands all groups (a click in the
  preview then only scrolls to its group). **Templates**
  (*Glass / Slim / Detached*) as a dialog, **Position of the header**
  (*Top* / *Bottom*, since 1.5.6) and **Hide the header completely (kiosk
  mode)** at the bottom. *Bottom* puts the bar at the lower edge of the
  dashboard - handy on a tablet or phone; the content keeps its distance at
  the bottom instead. While a dashboard is being edited, Home Assistant shows
  its toolbar at the top as usual. The group *Theme colors of the header* holds the theme
  variables of the header (`--app-header-background-color`,
  `--app-header-text-color`, `--app-header-border-bottom`, `--app-theme-color`)
  for dark and light; they only apply while the theme is registered, and own
  values under *Color and gradient* take precedence.
* **HA-Settings.** The preview shows the Settings page, *Devices & services*
  or a table - picked at the top of the field column (*Settings page / Devices
  & services / Tables*, like *Layout / Entries / Appearance* on the Sidebar
  page). On the Settings page the menu entries, the favourites bar, the system
  monitor and the tip line are clickable. On the Settings page *Simple* shows
  the topic clicked in the preview with all its fields; *All fields* puts the
  topics - menu entries, favourites bar, system monitor - one below the other,
  independent of the preview.
* **Export / Import.** One page for everything: the complete configuration,
  and sidebar, theme (`.yaml`), header and HA-Settings on their own.
* **Info.** Welcome text, author and links, support, the master switch **HA
  Style Hub active** (off: the integration no longer changes the sidebar, the
  header and the HA-Settings pages; a registered theme stays), *Write debug
  output to the browser console* and **Reset everything**.

On a tablet the search becomes an icon and the field column gets narrower; on
*Entries* the column shows either the chosen entry or, via *All entries*, the
list. On a phone the four areas sit in a bar at the bottom with the counter,
*Discard*, *Save* and the history above it; the preview stands on top, the
fields below it.

Changes are applied immediately. They are only written to `.storage` when you
press **Save**; **Discard** returns to the stored state.

**Links in the sidebar:** under *Sidebar → Entries* the **plus** opens a dialog
with two choices: a **section heading** or a **link**. A link is a shortcut to
a page of Home Assistant - automations, scenes, scripts, blueprints, devices,
entities, helpers, areas, the system pages, the tools (states, actions,
template, ...) and more. Pick the page from the list or enter one yourself with
*Own path* (for example `/config/tools/state`; a full address copied from the
browser works too). After that the link is a normal entry: name, icon, colours,
position, column span, hiding and section headings work as for every other
entry, and the bin removes it again. Links into the settings are only shown to
administrators. Ctrl-click or the middle mouse button open the page in a new
tab; since 1.5.5 a right-click offers *Open link in new tab* as well, like on
the entries of Home Assistant. While the sidebar is collapsed, links, popups and the restart entry show
their name as a tooltip on hover, like the entries of Home Assistant (1.5.4).

**Popup links in the sidebar** (1.5.1): the third choice of the dialog,
*Popup link*. Give it a name, pick pages one after the other - first the
dashboards and pages of your sidebar, then the pages of Home Assistant as for a
link, or an own path - and *Create popup*. The popup is one entry in the
sidebar; a click on it in Home Assistant opens a window with the chosen pages
as tiles, a click on a tile opens the page without a reload (Ctrl-click,
⌘-click on a Mac, or the middle mouse button: new tab - the dialog and the
entry say so as well). The tiles always fill the window row by row: up to four
per row on a computer (5 → 3 + 2, 7 → 4 + 3), two per row on a phone; a last
row with fewer tiles is filled by wider tiles. The window
closes with the cross, a click next to it, `Esc` or a change of page. Under
*Entries* the popup works like every entry (name, icon, column span, colors,
hide, heading); in addition its links can be renamed, get an own icon, be
moved, added (at most 24) and removed. The icon color of the entry also colors
the window. While a popup is selected under *Entries*, the preview shows its
window above the dashboard. Pages that sit in a popup can be hidden in the
sidebar with the eye. Links into the settings are only shown to
administrators; a popup with nothing left for a user does not appear for them.

**A card in the popup** (1.5.3): instead of links a popup can show a Lovelace
card - built by Home Assistant itself, exactly as on a dashboard. Choose
*Card (YAML)* under *Content of the window* (in the dialog or later at the
entry) and paste the code of a card: on a dashboard *Edit card → ⋮ → Edit in
code editor*, copy everything. Several cards go into a `vertical-stack` or
`grid`; custom cards work as long as they are installed (HACS) - if one is not
loaded yet on the page where the popup is opened, the resources of the
dashboards are loaded first. The code is read by the YAML parser of Home
Assistant itself - the one that reads `configuration.yaml` and dashboards in
YAML mode; values like `on`, `off`, `yes`, `no` therefore belong in quotes
(`"on"`), otherwise they become `true`/`false`. Tags such as `!include` or
`!secret` and references (`*name`) are refused. Below the field a line tells
whether the code is valid (with the line of an error); while it is not, the
last valid card stays active. At most 50 KB of code. Buttons and switches of the card work as on the
dashboard; if the card opens a more-info dialog, the popup makes way for it.
Links and card are kept side by side - switching back to *Links* loses
nothing. **Window size:** *Window width* and *Window height* in px, `0` =
automatic: 560 px wide with links, 600 px with a card, the height follows the
content up to 85 % of the screen. A fixed height (at most the height of the
screen) makes the card fill the whole window below the title. The window never
shows a scroll bar; a card that is taller than the window can still be
scrolled with the wheel or a swipe. On a phone the window is never wider than
the screen. The preview on the
Sidebar page shows the real card and the chosen size.

**Buttons and links in the header:** on the **Header** page, the card *Buttons
on the right side* hides Home Assistant's own buttons and adds your own in front of
them. *Show the restart button in the header* puts the restart button there
(administrators only). Like the restart entry of the sidebar it opens a
window in the look of your theme: Home Assistant checks `configuration.yaml`
and all included files right away (like *Check configuration*), shows the
result - errors and warnings as text - and only *Restart* restarts; with an
invalid configuration the button stays locked. The **plus** next to *Links*
adds a link to a page of Home Assistant, from the same list as in the sidebar
or as an own path. Each link is a row in the box: the name is shown as tooltip,
icon and colour can be changed, the arrows change the order and the bin removes
it. **Sensors** (1.5.4): in the dialog of the plus, *Sensor / entity* instead
of *Page* puts the state of any entity into the header - e.g. the outside
temperature. Type the entity ID or its name (sensors are suggested first); the
button shows icon and value as Home Assistant formats them (*12.3 °C*,
*Closed*) and opens the more-info dialog on a click. The value changes as soon
as Home Assistant reports a new one - every 5 minutes, every minute or every
second, just as the sensor delivers (subscription to exactly these entities,
no polling). The tune button of the row opens icon (picker of Home Assistant),
**icon color**, **value color** (empty = like the icon) and **Show the value
only** (no icon). Without an own icon it uses the icon of the entity, without
an own name the tooltip shows the name of the entity. Sensors are shown to every user and
count towards the 12 entries. *Show CPU and memory in the header* adds two small values in front of the
buttons, updated every 5 seconds (for administrators a click opens the
hardware page; on very narrow screens they are not shown). *Show storage space*
(below it) adds the free and the used disk space in the same style (e.g. *FREE
7.5 GB*, *USED 50.5 GB*), refreshed every minute - administrators only, as Home
Assistant only gives the values to them. The box *View tabs*
additionally has a **hover** background with opacity for the tabs of the views
and the field **Colour of the right side**: it colours the buttons, own links
and CPU/RAM/storage on the right of the header, while *Tab colour* keeps
colouring the tabs. The theme has only one variable for this
(`--app-header-text-color`, *Text and icons* under *Theme colors of the
header*); it applies to the whole header.

> **Settings, Notifications and the user entry**
> They only become sortable when *"Move Settings, Notifications and the user
> entry into the grid"* is switched on in the **Layout** tab. Without it, Home
> Assistant keeps them pinned to the bottom of the sidebar.

### The theme

The **Theme** tab does not style the sidebar - it styles Home Assistant itself:
dashboards, dialogs and the settings pages. What is entered there is registered
as a real Home Assistant theme, exactly like a theme from `configuration.yaml`.

* **309 variables** in 26 groups, each one with its CSS variable name below
  the field, so it can be checked against the Home Assistant documentation -
  plus the 11 steps of the primary color scale that are computed. 24 groups
  are on the Theme page; since 1.4.8 among them the chart colors
  (`--color-1` … `--color-54` and the history line), energy, the weather state
  colors, the syntax colors of the code editor, Home Assistant's design tokens
  (`--ha-color-…` for text, surfaces, borders, fills and the content on them;
  corners, border widths and shadows) and the switches (`--ha-switch-…`). Big
  groups show their fields in two columns; the theme variables of the header are
  on the Header page (*Theme colors of the header*), those of the sidebar on
  *Sidebar › Appearance* (*Theme colors of the sidebar*). They are stored,
  registered, exported and imported with the theme; own values of the Header
  and Sidebar pages take precedence over them. Colors set on those pages are
  taken over into these variables automatically (both modes) as far as Home
  Assistant has a variable for them; a value set in the theme by hand stays.
  *Take over colors* in both groups copies all colors of the page at once
* **Dark and light** are kept separately. A switch decides which one is being
  edited, and *"Copy to light / dark"* takes one over to the other
* **Empty means untouched.** Only the fields that are filled in end up in the
  theme, everything else keeps the value Home Assistant brings along
* **Contrast check.** Below a text color a note appears when its contrast to
  its background is below 4.5 : 1 (WCAG AA) - e.g. text on the card
  background, header text on the header, sidebar text on the sidebar, text on
  a button fill. Only when one of the two colors is set by you
* **Quick colors.** A click into a color field shows the colors already in use
  (theme, header, sidebar) and the recently used ones as small swatches - one
  click takes a color over. *transparent* is always offered at the top (*No
  color*)
* **Scale of the primary color.** Newer controls of Home Assistant (buttons,
  switches, checkboxes, radio buttons, progress bars, links) take their color
  from the scale `--ha-color-primary-05` … `-95` and not from
  `--primary-color`. Home Assistant only computes that scale for its default
  theme, from the primary color of the user profile - a custom theme would
  keep Home Assistant's blue there. HA Style Hub computes the eleven steps
  from the primary color of each mode with the same formula as Home Assistant
  (OKLCH, `generateColorPalette`) and writes them into the registered and the
  exported theme. Nothing to set: the scale follows the primary color and is
  shown below the field. Only from a hex or `rgb()` color; with an empty field
  Home Assistant's scale stays
* **The preview** shows three mock cards - a dashboard, a settings page and a
  dialog with a code editor - with the values of the mode being edited. Empty fields are shown the way Home
  Assistant would show them, not the way this page happens to look. On a wide
  screen it stays anchored on the right while the fields scroll. It also picks
  up the font, the scale and the weight
* **Card border and radius** can be set per side and per corner, exactly like
  the sidebar entries on the appearance tab
* **Shadow of the cards** without CSS: below the field, the checkbox *Design
  the shadow* opens (like *Set each side separately*) templates (no shadow,
  hint, soft, medium, strong, all around) and sliders for direction,
  distance, blur, spread, color, opacity and an inset shadow. They fill the field; a value typed by hand is read back into the
  sliders
* **Dashboard background** (`--lovelace-background`) - the background of every
  dashboard view that does not have one of its own. Three building blocks that
  can be combined:
  * a **color** (the field itself),
  * a **gradient** - tick *Use a gradient*, then pick the **second color** and
    the **direction** (down, up, right, left, the four diagonals, or radial from
    the top middle). The field above becomes the first color. A color left
    empty falls back to the page background / second background of the theme,
  * an **image** - *Choose image...* opens the file dialog of your computer.
    The integration stores the file for you (see below), so no path has to be
    typed. The image sits on top of the color or gradient; it can fill the
    view (cropping the edges), fit completely or be tiled, and it stays put
    while the dashboard scrolls unless *Let the image scroll with the page* is
    ticked.

  Dark and light have their own settings, including their own image. While no
  gradient and no image is active, the field may still hold any ready made CSS
  background. The preview shows the result behind the cards.

  **Where the image goes.** PNG, JPEG, GIF or WebP up to 8 MB (the content is
  checked, not the file name; SVG is refused because it can carry scripts). The
  file is stored as `www/ha_style_hub/background-<hash>.<ext>` in the Home
  Assistant configuration folder and is served by the integration itself at
  `/ha_style_hub-media/...` - deliberately not under `/local`, which only exists
  when `www` was already there at start. Like everything in `www` it can be
  fetched without logging in if someone knows the address, so do not use a
  private photo. Only admins can upload. Files that no saved state (current or
  history) refers to any more are deleted on the next save or upload; files
  younger than ten minutes are kept; files in that folder that this integration
  did not create are never touched. Removing the integration deletes its images.
* **State colors per device type** - three groups (devices, climate, security)
  with the colors Home Assistant uses for an active light, switch, fan, media
  player, cover, vacuum, binary sensor, a person at home, heating, cooling,
  drying, fan only, auto, locked / unlocked / jammed locks and the alarm states.
  Home Assistant gives each of these types a color of its own, so
  *Icon, active* above does **not** change a light - that is what these fields
  are for. The preview shows twelve of them as round icons. Empty fields keep
  Home Assistant's color.
* **Register the theme in Home Assistant** is what actually publishes it. It
  then appears in the theme picker of every user profile. *"Use it as the
  default theme right away"* additionally sets it for everybody who follows the
  theme selected by the server
* **Export** (page *Export / Import*) writes the theme as a `.yaml` file - as a backup, or to put it
  into `configuration.yaml` by hand
* **Import** reads such a file back in: an export from here, a file from the
  `themes` folder, or the `themes` block of a `configuration.yaml`. Only the
  variables above are taken over, the rest is left behind and counted

Lengths may be entered as a plain number, the unit `px` is added where CSS
needs one. The `rgb-*` variables Home Assistant needs for transparent colors do
not appear in the theme at all - Home Assistant derives them itself from every
hex value.

> The theme is registered at runtime and lives in `.storage`, not in
> `configuration.yaml`. Calling `frontend.reload_themes` replaces the whole
> theme list with what is in the YAML - HA Style Hub notices that and registers
> its theme again by itself.

### Choose a palette

On the **Theme** page, the button **Choose a palette** opens a dialog that
builds the colors of both modes from a single main color: primary color, backgrounds, text, header,
icons, sliders and badges. Three choices shape the result - how strongly the
backgrounds are tinted, which accent color is used (same, neighbouring hue,
opposite hue or triad) and, of course, the main color itself.

* Text is chosen so that it stays readable: it is checked against its
  background with the contrast rule of the WCAG (7:1 for the main text, 4.5:1
  for secondary text and for text on the primary color). If the main color is
  too light or too dark for that, it is nudged - the result is therefore not
  always exactly the color you typed.
* Borders, shadows, fonts and the status colors (error, warning, success, info)
  are left as they are.
* Nothing is saved until you press **Save**; **Discard** brings the old colors
  back. Since the result is only a starting point, everything stays editable
  afterwards.

### The history

The **clock icon** at the top right opens the last **10 saved states**, newest
first. Every entry shows when it was saved, who saved it (or that it was a
reset) and - counted by area - what changed compared to the state before, for
example *"Header: 3 values"*.

* **Restore** loads that state into the page. It is *not* stored yet: **Save**
  keeps it, **Discard** takes it back. If there are unsaved changes, you are
  asked first.
* Hiding the header and hiding the sidebar are not touched by a restore - they
  are switches (also available as entities), not part of a look, and they are
  not recorded in the history either.
* A save that changes nothing is not recorded. A reset is.
* The history lives in its own file, `.storage/ha_style_hub.history`, and is
  only readable by administrators.

### HA-Settings

The **HA-Settings** page is for Home Assistant itself - not the sidebar, not a
dashboard. Five topics are listed on the left with their state; the middle
shows the fields of the chosen topic and the right column the matching preview
(the Settings page with favourites and system monitor, Devices & services, or
the tables). *Before* shows the saved state in the preview.

**Menu entries of the Settings page.** On the Settings page Home Assistant draws
a colored circle behind every icon.

* **Menu entries as rounded boxes** - switched on, the circle becomes a box
  with rounded corners. The **corner radius** decides how round (0 is sharp,
  large values give the circle back).
* **Box color** - one color for all entries. Left empty, every entry keeps the
  color Home Assistant gives it.
* **Icon color**, **box size** and **icon size** in px. The box is never
  smaller than the icon; 0 means "as Home Assistant draws it".
* **Border and corners of the entries** - each menu entry (the whole row) can
  get a border with a color and rounded corners. Like on the Appearance page
  you can set one value for all, or tick *Set each side separately* /
  *Set each corner separately* for four values. Empty means "as Home Assistant
  draws it" (no border), 0 is a real value.
* **Mouse Hover** and **Hover opacity (%)** - the colour of a menu entry under
  the mouse, on the Settings page and its sub-pages. Empty keeps Home
  Assistant's own effect. The same colour applies to the fields of the system
  monitor and of the backup box.
* **Hide the tip below the menu** - removes the changing tip line Home
  Assistant shows below the menu entries of the Settings page.
* **Columns and tiles** (at the end of the card):
  * **Columns** - one, two or three. With two or three columns the page gets
    wider (960 px with two columns instead of 600 px; with three columns as wide
    as Home Assistant lets the content of a settings page get, 1040 px). On a
    narrow screen there are fewer columns by themselves; a column never gets
    narrower than 220 px. Columns and tiles apply to the page *Settings › System*
    as well, so both pages look the same; order and hidden entries only apply to
    the Settings page.
  * **Show the entries as tiles** - the icon stands above the name, description
    and arrow are left out.

**Settings page: order and favourites.** This card is about the Settings
page of Home Assistant itself (`/config`).

* **Order and visibility** - Home Assistant shows the menu entries in several
  blocks (cards). The list shows them block by block: the arrows move an entry
  inside its block, the eye hides it, the pencil opens the entry: an own
  **name**, an own **icon** (Home Assistant's icon picker, 1.5.5), **hide the
  subtitle**, **background of the icon box** and **icon color** (they win
  over the colors for all entries). The preview shows the
  entries with their second line (the subtitle) as on the real page - without
  it when *hide the subtitle* is set. An entry cannot move into another block.
  When every entry of a block is hidden, the block disappears. A hidden entry
  is only hidden - the page behind it stays reachable through its address.
* The list shows the entries your Settings page had when it was last open in
  this browser, with their names. Until then it shows a standard list; open
  the Settings page once and come back.
* **Favourites bar** - own links as a row of buttons, centred at the top of
  the Settings page. The plus opens the same dialog as for the sidebar links (a
  page from the list or an own path). In the list the name can be changed, the
  arrows change the order, the bin removes a favourite. At most 12.
* **Position** - *Above the cards* or *Centred in the header bar* of the
  Settings page. In the header bar the favourites take on the colours of the
  bar unless they have their own. In a window narrower than 1000 px there is no
  room next to title and buttons; then they stand above the cards.
* **Edit the look** - the button at the end of each favourite folds out its
  look, as for the section headings of the sidebar: text colour, background,
  icon colour, icon, height, border colour, border, corner radius (each side
  and each corner separately if you like), capital letters and *Show the icon
  only, hide the text* (the name stays as tooltip). Empty means as
  given - above the cards like a card of Home Assistant, in the header bar
  matching the bar; 0 is a real value.

**System monitor.** A card of its own puts processor, memory and storage on the
Settings page - the values Home Assistant shows on its *Hardware* and *Storage*
pages. A click on a value opens that page. Like the cards of Home Assistant,
the boxes of the Settings page (system monitor, backup, counters) carry the
card shadow of the theme (`ha-card-box-shadow`, 1.5.4).

* **Show the system monitor on the Settings page** switches it on.
* **Position** - *At the top, below the favourites* or *At the end, below the
  menu entries*.
* **Show graphs** - processor and memory additionally as a curve of the last
  5 minutes, storage as a bar with used and total space. The curve starts when
  the browser tab first fetches the values; within the tab it survives a change
  of page.
* The monitor is as wide as the cards of the page, so it follows the columns.
  The three values always stand side by side; on a narrow screen (phone) they
  are written a little smaller.
* **Own values** - up to six entities of your own next to processor, memory
  and storage (e.g. CPU temperature or uptime), with value, unit and when it
  last changed; an own name is optional. A click opens the entity.
  **Show only own entities** hides processor, memory and storage; then only
  the own values stand there (and the hardware values are not fetched).
* From 80 % (storage 85 %) a value turns orange, from 95 % red (the warning
  and error colours of the theme).
* Processor and memory come every 5 seconds from Home Assistant's *hardware*
  integration, storage once a minute from the Supervisor - or, without a
  Supervisor (Container, Core), from the disk that holds the configuration.
  Without the hardware integration the monitor shows "not available".
* **Show the last backup (box of its own)** - belongs to the system monitor but
  stands in a box of its own, as wide as the page, with its own **position**
  (at the top - below the system monitor - or at the end). It works with or
  without the system monitor and shows the newest backup like the backup page
  of Home Assistant: **when** (for example "19 hr. ago", date and time below;
  orange when it is older than 7 days, red when there is no backup at all),
  **size** (and whether it was automatic or manual), **name** (and how many
  backups are stored) and **location** (for example "This system · NAS", with
  the next automatic backup below, or the locations where it failed). It is
  read once a minute at most and every 5 minutes while the page is open. A click
  opens the backup page. At 600 px width the four values stand two by two.
* **Show an overview box (counters)** - a third box in the style of the system
  monitor, with its own **position** (at the top - below system monitor and
  backup - or at the end). Under **What is counted** you pick the counters:
  devices (below: how many are unreachable - all their entities unavailable -
  and how many are disabled), entities (below: how many are unavailable),
  integrations (below: the number of entries and how many fail to set up),
  apps (only with the Supervisor; below: the memory of the running apps and
  the disk space of app data and configuration, read every 30 minutes),
  automations (below: how many are on), scenes (below: when one was last
  activated), scripts (below: how many are running, else when one last ran),
  custom cards (dashboard resources of type JavaScript module; below: all
  resources), blueprints (below: automation and script), users (without the
  system users; below: the administrators) and tokens (your own long-lived
  access tokens; below: when one was last used). Devices, entities, automations, scenes and scripts come
  straight from Home Assistant; the rest is asked once when the page opens and
  every 5 minutes - administrators only, a value Home Assistant does not hand
  out stays "–". A click on a counter opens its page.

**Devices & services as a list.** *Settings › Devices & services* shows the
integrations as a grid of cards. With **Show the integrations as a list instead
of a grid**, each integration gets a slim row of its own: name on the left,
count and symbols on the right.

* **Row height** (56 px by default, at least 32) and **gap between rows**
  (8 px by default). A row with an error message needs a little more room.
* **Maximum width of the list** - 0 means the full width, a value centers a
  narrower list.
* **Columns** *1 / 2 / 3* - the rows stand side by side in two or three columns
  of equal width; 1 is Home Assistant's normal list. On a narrow screen
  the list drops to fewer columns by itself; a column never gets narrower than
  260 px. Also applies to the Apps list.
* **Border width**, **corner radius** and **border color** of the rows. Left
  empty, the row looks as Home Assistant draws it; 0 is a real value (no
  border, sharp corners). *Set each side separately* and *Set each corner
  separately* give four values each; a side or corner left empty takes the
  overall value, or Home Assistant's own if there is none.
* **Border color for problems** - integrations with a setup error or that are
  not loaded get a colored border from Home Assistant (red or orange). Here
  you pick your own color for them. The normal border color does not touch
  these rows, so a problem stays visible.
* **Mouse hover** - the color the whole row takes on under the mouse, and its
  opacity (0-100 %). Left empty, Home Assistant's own effect stays.
* The preview shows grid and list side by side in miniature, including one row
  with a problem.

**Apps as a list.** Under the list view there is a checkbox **Use the list view
for apps as well**. Switched on, the *Apps* page (formerly add-ons) turns into
the same slim rows: icon, name and description on the left (the description is
cut off with "..." when the row is narrow), update / pre-release tags and the
status on the right. Height, gap, maximum width, border, corners and hover are
the ones of the list above - there is no second set of fields. The checkbox only
has an effect while the list view is on. The page *Install app* is not touched.

**Page of an integration.** Also under the list view: **Style the page of an
integration as well** (on by default). The entries on the page of a single
integration (Home Assistant 2026.10) get border, corners, border and problem
color, background and gap of the list. Below it **Row height on the integration
page** sets the height of the entries, devices and sub-entries there on its own
(32-120 px, 0 = like Home Assistant). **Background on errors** and **Background
when not loaded** (1.5.4) color the entries that need attention: Home Assistant
fills an entry with an error (e.g. a failed setup) red and one that is not
loaded or failed to unload orange - here you pick your own color or gradient;
empty keeps Home Assistant's. **Opacity of both backgrounds** (0-100 %) tones
a strong color down for both at once. While the checkbox is on, the preview of
*Devices & services* shows a small integration page below the list (1.5.5):
an entry with an error and two devices, one that is not loaded and a normal
hub - with border, corners, colors, background, gap, row height and the
backgrounds for problems as set.

**Tables: group headers and rows.** Tables in Home Assistant (automations, entities,
helpers, devices, ...) can be grouped, and the group header ("Ungrouped", the
name of an area, ...) is a row of its own. A card of its own sets how that row
looks: **background**, **text color**, **font size** (px) and **font weight**.
Empty and 0 mean "as Home Assistant draws it" (page background, medium weight).
With a color of its own the groups are easy to tell apart in a long list. The
preview shows a small table with two groups. Grouping itself is switched on in
the table.

Below that, under **Rows**, the rows of all tables:

* **Row color** - the background of every row. Empty keeps Home Assistant's.
* **Colour of every second row** - stripes make a long table easier to read.
  Empty means no stripes.
* **Mouse Hover** and **Hover opacity (%)** - the colour of the row under the
  mouse (0-100 %). Empty leaves Home Assistant's own effect.
* **Font size (px)** - 0 means as Home Assistant draws it, otherwise 10 to
  24 px. The row height does not change.
* A selected row keeps the colour Home Assistant gives it.

**Export and import.** The card *HA-Settings* on the page *Export / Import*
saves all HA-Settings as a
`.json` file (`ha-style-hub-settings-DATE.json`) and reads such a file back in -
by choosing the file or by pasting its text. A complete HA Style Hub export
works too; only its `settings` part is read. Keys that are missing fall back to
the default, unknown ones are ignored, and nothing is saved until you press
*Save*. Sidebar, theme and header are not touched.

> These functions work on the structure of the pages as found in the Home
> Assistant source (a `.icon-background` element in the navigation list; the
> integration cards with a header and an action bar; the cards of the Apps page;
> the `.group-header` row and the rows inside `ha-data-table`; the cards and
> the navigation list of `ha-config-dashboard`). They only touch those
> elements, only on pages under `/config`, and only in the browser where the
> page is open. Should a later Home Assistant version change the structure,
> nothing breaks - the pages simply stay as Home Assistant draws them.
> A card whose inner structure is not recognised keeps its normal height.

## How it works

HA Style Hub has two halves:

* a **Python backend** that stores the configuration in `.storage`, serves it
  over the websocket API and delivers the two JavaScript files
* a **frontend module** that is loaded on every page, walks the shadow DOM down
  to `ha-sidebar` and adopts generated stylesheets into the relevant shadow roots

The order is **not** produced by moving DOM nodes — the entries are laid out in a
CSS grid and sorted with the `order` property. That keeps Home Assistant's own
rendering intact and survives every re-render without further work.

## Uninstall

Remove the integration under *Settings → Devices & services*. The stored
configuration is deleted with it and the sidebar returns to its stock state
after a reload.

---

## Changelog

All changes of every version are in [docs/changelog.md](docs/changelog.md) (German: [docs/changelog_de.md](docs/changelog_de.md)).

## License

MIT — see [LICENSE](LICENSE).
